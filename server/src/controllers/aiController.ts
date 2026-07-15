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
