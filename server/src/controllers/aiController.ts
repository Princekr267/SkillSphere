import { Response } from 'express';
import Gig from '../models/Gig';
import User from '../models/User';
import { AuthRequest } from '../middleware/auth';

const HF_API_URL = 'https://api-inference.huggingface.co/models/sentence-transformers/all-MiniLM-L6-v2';

const haversineDistance = (lon1: number, lat1: number, lon2: number, lat2: number): number => {
  const R = 6371; // Earth radius in km
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
};

// Calculate skill similarity via Huggingface or fall back to Jaccard intersection
const getSkillSimilarities = async (
  gigSkills: string[],
  freelancersSkills: string[][]
): Promise<number[]> => {
  const apiKey = process.env.HUGGINGFACE_API_KEY;
  const sourceSentence = gigSkills.join(', ');
  const targetSentences = freelancersSkills.map(fs => fs.join(', ') || 'No skills listed');

  if (apiKey && !apiKey.includes('placeholder') && gigSkills.length > 0) {
    try {
      const response = await fetch(HF_API_URL, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          inputs: {
            source_sentence: sourceSentence,
            sentences: targetSentences,
          },
        }),
      });

      if (response.ok) {
        const scores = await response.json();
        if (Array.isArray(scores)) {
          return scores.map(s => (typeof s === 'number' ? Math.max(0, Math.min(1, s)) : 0));
        }
      } else {
        const errText = await response.text();
        console.warn('Huggingface API failed, falling back to Jaccard. Error:', errText);
      }
    } catch (err) {
      console.warn('Huggingface request failed, falling back to Jaccard:', err);
    }
  }

  // Fallback: Jaccard similarity metric
  const gigSet = new Set(gigSkills.map(s => s.toLowerCase()));
  return targetSentences.map((_, idx) => {
    if (gigSet.size === 0) return 0;
    const freeSkills = freelancersSkills[idx].map(s => s.toLowerCase());
    const intersection = freeSkills.filter(s => gigSet.has(s)).length;
    const union = new Set([...gigSet, ...freeSkills]).size;
    return union > 0 ? intersection / union : 0;
  });
};

// @desc    Get recommended freelancers for a gig
// @route   GET /api/ai/recommend/:gigId
// @access  Private (Client owner only)
export const getRecommendedFreelancers = async (req: AuthRequest, res: Response) => {
  try {
    const { gigId } = req.params;

    const gig = await Gig.findById(gigId);
    if (!gig) return res.status(404).json({ success: false, message: 'Gig not found' });

    // Client verification
    if (gig.clientId.toString() !== req.user?._id.toString()) {
      return res.status(403).json({ success: false, message: 'Not authorised to view recommendations for this gig' });
    }

    const freelancers = await User.find({ role: 'freelancer', isActive: { $ne: false } });
    if (freelancers.length === 0) {
      return res.status(200).json({ success: true, recommendations: [] });
    }

    const freelancersSkills = freelancers.map(f => f.skills.map(s => s.name));
    const skillSimilarities = await getSkillSimilarities(gig.skillsRequired, freelancersSkills);

    const [gigLng, gigLat] = gig.location.coordinates;

    const recommendations = freelancers.map((f, idx) => {
      const [fLng, fLat] = f.location.coordinates;
      const distance = haversineDistance(gigLng, gigLat, fLng, fLat);

      const skillScore = skillSimilarities[idx];
      const ratingScore = f.rating / 5.0;
      const proximityScore = 1.0 / (1.0 + distance / 10.0); // decay score

      // Weighted Recommendation Score: 50% Skills, 30% Rating, 20% Proximity
      const finalScore = skillScore * 0.5 + ratingScore * 0.3 + proximityScore * 0.2;

      return {
        freelancer: {
          _id: f._id,
          name: f.name,
          skills: f.skills,
          rating: f.rating,
          reviewCount: f.reviewCount,
          hourlyRate: f.hourlyRate,
          location: f.location,
          avatar: f.avatar,
        },
        scores: {
          skillSimilarity: Math.round(skillScore * 100) / 100,
          proximity: Math.round(proximityScore * 100) / 100,
          rating: Math.round(ratingScore * 100) / 100,
          distanceKm: Math.round(distance * 10) / 10,
        },
        finalScore: Math.round(finalScore * 100) / 100,
      };
    });

    // Sort by final score descending
    recommendations.sort((a, b) => b.finalScore - a.finalScore);

    res.status(200).json({ success: true, recommendations: recommendations.slice(0, 10) });
  } catch (error: any) {
    console.error('getRecommendedFreelancers error:', error);
    res.status(500).json({ success: false, message: error.message || 'Server error computing job matching' });
  }
};

// @desc    Get trending skills aggregated across recent gigs
// @route   GET /api/ai/trending-skills
// @access  Public
export const getTrendingSkills = async (req: AuthRequest, res: Response) => {
  try {
    const recentGigs = await Gig.find().sort({ createdAt: -1 }).limit(100).select('skillsRequired');
    
    const skillCounts: Record<string, number> = {};

    recentGigs.forEach(g => {
      if (Array.isArray(g.skillsRequired)) {
        g.skillsRequired.forEach(s => {
          if (s && s.trim()) {
            const skillName = s.trim();
            skillCounts[skillName] = (skillCounts[skillName] || 0) + 1;
          }
        });
      }
    });

    const trending = Object.keys(skillCounts).map(skill => ({
      skill,
      count: skillCounts[skill],
    }));

    trending.sort((a, b) => b.count - a.count);

    res.status(200).json({ success: true, trending: trending.slice(0, 10) });
  } catch (error: any) {
    console.error('getTrendingSkills error:', error);
    res.status(500).json({ success: false, message: 'Server error fetching trending skills' });
  }
};

// @desc    Draft a cover letter using AI
// @route   POST /api/ai/draft-proposal
// @access  Private (Freelancers only)
export const draftProposalCoverLetter = async (req: AuthRequest, res: Response) => {
  try {
    const { gigId } = req.body;
    if (!gigId) {
      return res.status(400).json({ success: false, message: 'Gig ID is required' });
    }

    const gig = await Gig.findById(gigId);
    if (!gig) {
      return res.status(404).json({ success: false, message: 'Gig not found' });
    }

    const user = req.user;
    if (!user) {
      return res.status(401).json({ success: false, message: 'Not authenticated' });
    }

    const apiKey = process.env.HUGGINGFACE_API_KEY;
    const prompt = `Write a professional cover letter for a freelancer applying to this gig.
Gig Title: ${gig.title}
Gig Description: ${gig.description}
Freelancer Name: ${user.name}
Freelancer Skills: ${user.skills.map((s: any) => s.name).join(', ')}

Instructions: Write a short, engaging, and professional cover letter in the first person. Do not include placeholders, brackets, dates, or headers. Keep it under 200 words.`;

    if (apiKey && !apiKey.includes('placeholder')) {
      try {
        const hfUrl = 'https://api-inference.huggingface.co/models/meta-llama/Meta-Llama-3-8B-Instruct';
        const response = await fetch(hfUrl, {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${apiKey}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            inputs: prompt,
            parameters: {
              max_new_tokens: 250,
              temperature: 0.7,
            }
          }),
        });

        if (response.ok) {
          const data = await response.json();
          let draftedText = '';
          if (Array.isArray(data) && data[0]?.generated_text) {
            draftedText = data[0].generated_text;
            if (draftedText.startsWith(prompt)) {
              draftedText = draftedText.substring(prompt.length).trim();
            }
            draftedText = draftedText.replace(/^Cover Letter:\s*/i, '').trim();
            return res.status(200).json({ success: true, coverLetter: draftedText, source: 'ai' });
          }
        } else {
          const errText = await response.text();
          console.warn('Huggingface draft proposal API failed. Fallback to simulation. Error:', errText);
        }
      } catch (err) {
        console.warn('Huggingface draft proposal request failed. Fallback to simulation:', err);
      }
    }

    // Simulation fallback
    const skillsList = user.skills.map((s: any) => s.name).join(', ') || 'freelancing';
    const fallbackText = `Dear Client,

I am writing to express my strong interest in your gig "${gig.title}". 

As a professional freelancer with expertise in ${skillsList}, I am confident that I can deliver high-quality results for this project. Based on your description: "${gig.description.substring(0, 120)}...", I understand the requirements and am ready to start immediately.

I look forward to discussing how I can help you achieve your goals.

Best regards,
${user.name}`;

    return res.status(200).json({ success: true, coverLetter: fallbackText, source: 'simulation' });

  } catch (error: any) {
    console.error('draftProposalCoverLetter error:', error);
    res.status(500).json({ success: false, message: error.message || 'Server error drafting cover letter' });
  }
};
