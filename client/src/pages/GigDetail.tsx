import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import api from '../utils/api';
import {
  MapPin, DollarSign, Tag, Users, Star,
  Building, ArrowLeft, CheckCircle2, AlertCircle, Loader2, Send, MessageSquare, PenLine,
} from 'lucide-react';

interface GigDetail {
  _id: string;
  title: string;
  description: string;
  category: string;
  budget: number;
  budgetType: 'fixed' | 'hourly';
  skillsRequired: string[];
  location: { city: string; coordinates: [number, number] };
  status: string;
  escrowStatus: string;
  radiusKm: number;
  acceptedFreelancerId?: string;
  applicants: Array<{
    _id: string;
    freelancerId: { _id: string; name: string; rating: number; skills: any[] };
    message: string;
    status: string;
    appliedAt: string;
  }>;
  clientId: {
    _id: string;
    name: string;
    companyName?: string;
    rating: number;
    reviewCount: number;
    location: { city: string };
  };
}

export const GigDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();

  const [gig, setGig] = useState<GigDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Application state
  const [message, setMessage] = useState('');
  const [applying, setApplying] = useState(false);
  const [applyMsg, setApplyMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  useEffect(() => {
    const fetchGig = async () => {
      try {
        const res = await api.get(`/gigs/${id}`);
        if (res.data.success) setGig(res.data.gig);
        else setError('Gig not found');
      } catch (err) {
        setError('Failed to load gig details');
      } finally {
        setLoading(false);
      }
    };
    fetchGig();
  }, [id]);

  const myApplication = gig?.applicants.find(
    a => a.freelancerId?._id === user?._id || (a.freelancerId as any) === user?._id
  );

  const handleApply = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!message.trim()) return;
    setApplying(true);
    setApplyMsg(null);
    try {
      await api.post(`/gigs/${id}/apply`, { message });
      setApplyMsg({ type: 'success', text: 'Application submitted! The client will review your message.' });
      setMessage('');
      // Refresh gig to update applicant count
      const res = await api.get(`/gigs/${id}`);
      if (res.data.success) setGig(res.data.gig);
    } catch (err: any) {
      setApplyMsg({ type: 'error', text: err.response?.data?.message || 'Could not submit application.' });
    } finally {
      setApplying(false);
    }
  };

  if (loading) {
    return (
      <div className="flex-grow bg-paper flex items-center justify-center">
        <Loader2 className="h-8 w-8 text-route-teal animate-spin" />
      </div>
    );
  }

  if (error || !gig) {
    return (
      <div className="flex-grow bg-paper flex flex-col items-center justify-center space-y-3">
        <AlertCircle className="h-8 w-8 text-signal-coral" />
        <p className="text-sm font-sans text-ink">{error || 'Gig not found'}</p>
        <button onClick={() => navigate('/gigs')} className="text-xs text-route-teal hover:underline font-bold">
          ← Back to Browse
        </button>
      </div>
    );
  }

  const statusColors: Record<string, string> = {
    open: 'bg-route-teal/10 text-route-teal border-route-teal/25',
    in_progress: 'bg-transit-gold/10 text-transit-gold border-transit-gold/25',
    completed: 'bg-slate/10 text-slate border-slate/25',
    cancelled: 'bg-signal-coral/10 text-signal-coral border-signal-coral/25',
  };

  const escrowColors: Record<string, string> = {
    none: 'text-slate',
    funds_deposited: 'text-transit-gold',
    released: 'text-route-teal',
    refunded: 'text-signal-coral',
  };

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8 flex-grow bg-paper font-sans">

      {/* Back button */}
      <button
        onClick={() => navigate('/gigs')}
        className="flex items-center space-x-1.5 text-xs text-slate hover:text-ink transition-colors mb-6 font-bold font-display uppercase tracking-wider"
      >
        <ArrowLeft className="h-3.5 w-3.5" />
        <span>Browse Gigs</span>
      </button>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">

        {/* ── Left: Main detail ─────────────────────────────────────────── */}
        <div className="lg:col-span-2 space-y-6">

          {/* Header */}
          <div className="bg-white border border-line-gray rounded-sm p-6">
            <div className="flex items-start justify-between gap-4 mb-4">
              <span className={`px-2.5 py-1 rounded-sm border text-[10px] font-bold font-display uppercase tracking-wider ${statusColors[gig.status] || statusColors.open}`}>
                {gig.status.replace('_', ' ')}
              </span>
              <span className={`text-[10px] font-mono uppercase ${escrowColors[gig.escrowStatus]}`}>
                ESCROW: {gig.escrowStatus.replace('_', ' ')}
              </span>
            </div>

            <h1 className="text-xl font-black font-display text-ink uppercase tracking-tight leading-tight mb-2">
              {gig.title}
            </h1>

            <div className="flex flex-wrap items-center gap-4 font-mono text-xs text-slate">
              <span className="flex items-center space-x-1.5">
                <Tag className="h-3.5 w-3.5 text-route-teal" />
                <span>{gig.category}</span>
              </span>
              <span className="flex items-center space-x-1.5">
                <MapPin className="h-3.5 w-3.5 text-route-teal" />
                <span>{gig.location.city} · {gig.radiusKm}KM RADIUS</span>
              </span>
              <span className="flex items-center space-x-1.5">
                <Users className="h-3.5 w-3.5" />
                <span>{gig.applicants.length} APPLICANTS</span>
              </span>
            </div>
          </div>

          {/* Description */}
          <div className="bg-white border border-line-gray rounded-sm p-6">
            <h2 className="text-xs font-bold font-display text-ink uppercase tracking-widest mb-4">Project Description</h2>
            <p className="text-sm text-ink leading-relaxed whitespace-pre-wrap font-sans">{gig.description}</p>
          </div>

          {/* Skills Required */}
          {gig.skillsRequired.length > 0 && (
            <div className="bg-white border border-line-gray rounded-sm p-6">
              <h2 className="text-xs font-bold font-display text-ink uppercase tracking-widest mb-4">Skills Required</h2>
              <div className="flex flex-wrap gap-2">
                {gig.skillsRequired.map((skill, i) => (
                  <span key={i} className="px-3 py-1.5 rounded-sm bg-paper border border-line-gray text-xs font-mono text-ink uppercase">
                    {skill}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Apply section — only for freelancers on open gigs */}
          {user?.role === 'freelancer' && gig.status === 'open' && (
            <div className="bg-white border border-line-gray rounded-sm p-6">
              <h2 className="text-xs font-bold font-display text-ink uppercase tracking-widest mb-4">
                {myApplication ? 'Your Application' : 'Apply to this Gig'}
              </h2>

              {myApplication ? (
                <div className="space-y-3">
                  <div className={`inline-flex items-center space-x-2 px-3 py-1.5 rounded-sm border text-xs font-bold font-mono uppercase ${
                    myApplication.status === 'accepted' ? 'bg-route-teal/10 text-route-teal border-route-teal/25' :
                    myApplication.status === 'rejected' ? 'bg-signal-coral/10 text-signal-coral border-signal-coral/25' :
                    'bg-transit-gold/10 text-transit-gold border-transit-gold/25'
                  }`}>
                    <span>Status: {myApplication.status.toUpperCase()}</span>
                  </div>
                  <p className="text-xs text-slate font-sans border border-line-gray p-3 rounded-sm bg-paper/30 leading-relaxed">
                    {myApplication.message}
                  </p>
                </div>
              ) : (
                <form onSubmit={handleApply} className="space-y-4">
                  {applyMsg && (
                    <div className={`p-3 rounded-sm border-l-4 text-xs flex items-center space-x-2 ${
                      applyMsg.type === 'success' ? 'border-l-route-teal bg-route-teal/5 text-ink' : 'border-l-signal-coral bg-signal-coral/5 text-ink'
                    }`}>
                      {applyMsg.type === 'success' ? <CheckCircle2 className="h-4 w-4 text-route-teal flex-shrink-0" /> : <AlertCircle className="h-4 w-4 text-signal-coral flex-shrink-0" />}
                      <span>{applyMsg.text}</span>
                    </div>
                  )}
                  <textarea
                    required
                    rows={5}
                    value={message}
                    onChange={e => setMessage(e.target.value)}
                    placeholder="Tell the client why you're the right fit. Mention relevant experience, your approach, and estimated timeline..."
                    className="w-full px-4 py-3 rounded-sm bg-paper/30 border border-line-gray text-ink text-sm font-sans resize-none focus:outline-none focus:border-route-teal"
                  />
                  <button
                    type="submit"
                    disabled={applying || !message.trim()}
                    className="flex items-center space-x-2 px-6 py-2.5 rounded-sm bg-signal-coral hover:bg-signal-coral/90 text-white text-xs font-bold font-display uppercase tracking-widest disabled:opacity-50 transition-colors"
                  >
                    <Send className="h-3.5 w-3.5" />
                    <span>{applying ? 'Submitting…' : 'Submit Application'}</span>
                  </button>
                </form>
              )}
            </div>
          )}
        </div>

        {/* ── Right: Client info + budget ───────────────────────────────── */}
        <div className="space-y-6">

          {/* Budget card */}
          <div className="bg-white border border-line-gray rounded-sm p-6">
            <h3 className="text-xs font-bold font-display text-ink uppercase tracking-widest mb-4">Budget</h3>
            <div className="flex items-baseline space-x-1">
              <DollarSign className="h-5 w-5 text-route-teal flex-shrink-0 mb-0.5" />
              <span className="text-3xl font-black font-mono text-ink">₹{gig.budget.toLocaleString()}</span>
              <span className="text-sm text-slate font-mono">/{gig.budgetType === 'hourly' ? 'hr' : 'project'}</span>
            </div>
          </div>

          {/* Client card */}
          <div className="bg-white border border-line-gray rounded-sm p-6">
            <h3 className="text-xs font-bold font-display text-ink uppercase tracking-widest mb-4">Posted By</h3>
            <div className="flex items-center space-x-3 mb-4">
              <div className="h-10 w-10 bg-slate/10 border border-slate/25 rounded-sm flex items-center justify-center text-ink font-black font-display text-lg uppercase">
                {gig.clientId.name.charAt(0)}
              </div>
              <div>
                <h4 className="font-bold text-ink text-sm uppercase font-display tracking-tight">{gig.clientId.name}</h4>
                {gig.clientId.companyName && (
                  <p className="text-xs text-slate font-sans flex items-center space-x-1">
                    <Building className="h-3 w-3" />
                    <span>{gig.clientId.companyName}</span>
                  </p>
                )}
              </div>
            </div>
            <div className="space-y-2 text-xs font-mono text-slate border-t border-line-gray pt-3">
              <div className="flex items-center justify-between">
                <span className="flex items-center space-x-1"><Star className="h-3 w-3 text-transit-gold" /><span>Rating</span></span>
                <span className="font-bold text-ink">{gig.clientId.rating?.toFixed(1)} ★</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="flex items-center space-x-1"><MapPin className="h-3 w-3" /><span>Location</span></span>
                <span className="font-bold text-ink uppercase">{gig.clientId.location?.city}</span>
              </div>
            </div>
          </div>

          {/* Actions card: Chat + Review */}

          {(gig.status === 'in_progress' || gig.status === 'completed') && (
            (() => {
              const userId = user?._id;
              const isClient = userId === gig.clientId._id;
              const isFreelancer = userId === gig.acceptedFreelancerId;
              const isParticipant = isClient || isFreelancer;
              if (!isParticipant) return null;
              const otherUserId = isClient ? gig.acceptedFreelancerId : gig.clientId._id;
              return (
                <div className="bg-white border border-line-gray rounded-sm p-6 space-y-3">
                  <h3 className="text-xs font-bold font-display text-ink uppercase tracking-widest">Quick Actions</h3>
                  {gig.status === 'in_progress' && (
                    <Link
                      to={`/gigs/${gig._id}/chat`}
                      className="flex items-center space-x-2 w-full px-4 py-2.5 rounded-sm bg-route-teal hover:bg-route-teal/90 text-white text-xs font-bold font-display uppercase tracking-widest transition-colors"
                    >
                      <MessageSquare className="h-4 w-4" />
                      <span>Open Chat</span>
                    </Link>
                  )}
                  {gig.status === 'completed' && otherUserId && (
                    <Link
                      to={`/review/${gig._id}/${otherUserId}`}
                      className="flex items-center space-x-2 w-full px-4 py-2.5 rounded-sm border border-transit-gold text-transit-gold text-xs font-bold font-display uppercase tracking-widest hover:bg-transit-gold/5 transition-colors"
                    >
                      <PenLine className="h-4 w-4" />
                      <span>Leave a Review</span>
                    </Link>
                  )}
                </div>
              );
            })()
          )}

        </div>
      </div>
    </div>
  );
};
