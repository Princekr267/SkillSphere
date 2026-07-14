import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ReviewList } from '../components/ReviewList';
import { StarRating } from '../components/StarRating';
import api from '../utils/api';
import {
  ArrowLeft, MapPin, DollarSign, Award,
  Briefcase, Calendar, Loader2, AlertCircle
} from 'lucide-react';

interface PublicUser {
  _id: string;
  name: string;
  role: string;
  avatar?: string;
  location: { city: string };
  skills: Array<{ name: string; level: 'Beginner' | 'Intermediate' | 'Expert' }>;
  hourlyRate?: number;
  portfolio: Array<{ title: string; description: string; link?: string }>;
  certifications: string[];
  rating: number;
  reviewCount: number;
  createdAt: string;
  bio?: string;
  companyName?: string;
}

export const FreelancerProfile: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const [freelancer, setFreelancer] = useState<PublicUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchProfile = async () => {
      setLoading(true);
      setError('');
      try {
        const res = await api.get(`/users/${id}`);
        if (res.data.success) {
          setFreelancer(res.data.user);
        } else {
          setError('Profile not found.');
        }
      } catch (err: any) {
        setError(err.response?.data?.message || 'Could not fetch profile details.');
      } finally {
        setLoading(false);
      }
    };

    if (id) fetchProfile();
  }, [id]);

  if (loading) {
    return (
      <div className="flex-grow bg-paper flex flex-col items-center justify-center py-16">
        <Loader2 className="h-8 w-8 text-route-teal animate-spin" />
        <p className="text-xs font-mono text-slate uppercase mt-2">Loading Node Profile...</p>
      </div>
    );
  }

  if (error || !freelancer) {
    return (
      <div className="flex-grow bg-paper flex flex-col items-center justify-center py-16 space-y-3">
        <AlertCircle className="h-8 w-8 text-signal-coral" />
        <p className="text-sm text-ink">{error || 'Node profile not found.'}</p>
        <button onClick={() => navigate(-1)} className="text-xs text-route-teal font-bold hover:underline">
          ← Go Back
        </button>
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-10 flex-grow bg-paper font-sans">
      {/* Back button */}
      <button
        onClick={() => navigate(-1)}
        className="flex items-center space-x-1.5 text-xs text-slate hover:text-ink transition-colors mb-8 font-bold font-display uppercase tracking-wider"
      >
        <ArrowLeft className="h-3.5 w-3.5" />
        <span>Back</span>
      </button>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Left Column: Card Summary */}
        <div className="bg-white border border-line-gray rounded-sm p-6 lg:col-span-1 flex flex-col items-center text-center">
          <div className="h-24 w-24 rounded-full bg-slate/10 border border-slate/30 overflow-hidden flex items-center justify-center font-display text-3xl font-black text-ink uppercase mb-4">
            {freelancer.avatar ? (
              <img src={freelancer.avatar} alt={freelancer.name} className="h-full w-full object-cover" />
            ) : (
              freelancer.name.charAt(0)
            )}
          </div>

          <h1 className="text-xl font-black font-display text-ink uppercase tracking-tight">
            {freelancer.name}
          </h1>

          <span className="text-[10px] font-mono text-slate uppercase tracking-wider mt-1.5 bg-line-gray/25 px-2.5 py-0.5 rounded">
            {freelancer.role} node
          </span>

          <div className="w-full border-t border-line-gray mt-6 pt-6 space-y-4 text-left">
            <div className="flex items-center space-x-3 text-xs text-slate">
              <MapPin className="h-4 w-4 text-route-teal flex-shrink-0" />
              <span className="font-bold text-ink uppercase">{freelancer.location.city}</span>
            </div>

            {freelancer.hourlyRate !== undefined && (
              <div className="flex items-center space-x-3 text-xs text-slate">
                <DollarSign className="h-4 w-4 text-route-teal flex-shrink-0" />
                <span className="font-bold text-ink">₹{freelancer.hourlyRate} / hr</span>
              </div>
            )}

            <div className="flex items-center space-x-3 text-xs text-slate">
              <Calendar className="h-4 w-4 text-route-teal flex-shrink-0" />
              <span>Joined {new Date(freelancer.createdAt).toLocaleDateString('en-IN', { month: 'short', year: 'numeric' })}</span>
            </div>

            {/* Overall score */}
            <div className="border-t border-line-gray/40 pt-4 flex flex-col items-start space-y-1">
              <span className="text-[9px] font-mono text-slate uppercase tracking-widest">Node Rep Score</span>
              <div className="flex items-center space-x-2">
                <StarRating value={freelancer.rating} size="sm" />
                <span className="text-xs font-bold text-ink font-mono">({freelancer.reviewCount})</span>
              </div>
            </div>
          </div>
        </div>

        {/* Right Column: Bio, Skills, Reviews */}
        <div className="lg:col-span-2 space-y-8 text-left">
          
          {/* Bio */}
          <div className="bg-white border border-line-gray rounded-sm p-6">
            <h3 className="text-xs font-bold font-display text-ink uppercase tracking-widest mb-3">Bio / node description</h3>
            <p className="text-sm text-ink leading-relaxed font-sans">
              {freelancer.bio || 'No bio configured on this node.'}
            </p>
          </div>

          {/* Skills / Certs */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {/* Skills */}
            <div className="bg-white border border-line-gray rounded-sm p-6">
              <h3 className="text-xs font-bold font-display text-ink uppercase tracking-widest mb-4">Skills Matrix</h3>
              {freelancer.skills.length === 0 ? (
                <p className="text-xs text-slate font-sans">No skills listed.</p>
              ) : (
                <div className="flex flex-wrap gap-2">
                  {freelancer.skills.map((s, i) => (
                    <div key={i} className="flex items-center space-x-1 px-2.5 py-1 rounded-sm border border-line-gray bg-paper/20">
                      <span className="text-xs font-bold text-ink font-sans">{s.name}</span>
                      <span className="text-[9px] font-mono text-slate uppercase px-1.5 py-0.25 bg-line-gray/25 rounded">
                        {s.level.substring(0, 3)}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Certs */}
            <div className="bg-white border border-line-gray rounded-sm p-6">
              <h3 className="text-xs font-bold font-display text-ink uppercase tracking-widest mb-4">Node Credentials</h3>
              {freelancer.certifications.length === 0 ? (
                <p className="text-xs text-slate font-sans">No credentials listed.</p>
              ) : (
                <ul className="space-y-2">
                  {freelancer.certifications.map((c, i) => (
                    <li key={i} className="flex items-start space-x-2 text-xs text-ink font-sans">
                      <Award className="h-4 w-4 text-route-teal flex-shrink-0 mt-0.5" />
                      <span>{c}</span>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>

          {/* Portfolio */}
          <div className="bg-white border border-line-gray rounded-sm p-6">
            <h3 className="text-xs font-bold font-display text-ink uppercase tracking-widest mb-4">Portfolio nodes</h3>
            {freelancer.portfolio.length === 0 ? (
              <p className="text-xs text-slate font-sans">No portfolio items added.</p>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {freelancer.portfolio.map((p, i) => (
                  <div key={i} className="border border-line-gray p-4 rounded-sm bg-paper/10 hover:bg-paper/30 transition-colors">
                    <h4 className="font-bold text-ink text-sm font-display uppercase tracking-tight">{p.title}</h4>
                    <p className="text-xs text-slate mt-1.5 leading-relaxed font-sans">{p.description}</p>
                    {p.link && (
                      <a href={p.link} target="_blank" rel="noopener noreferrer" className="text-[10px] font-mono text-route-teal hover:underline uppercase block mt-3">
                        Visit project node →
                      </a>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Reviews section */}
          <div className="bg-white border border-line-gray rounded-sm p-6">
            <h3 className="text-xs font-bold font-display text-ink uppercase tracking-widest mb-4">Community Feedback</h3>
            <ReviewList userId={freelancer._id} limit={20} />
          </div>

        </div>

      </div>
    </div>
  );
};
