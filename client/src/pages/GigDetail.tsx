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

  // Proposal and bidding states
  const [proposal, setProposal] = useState<any>(null);
  const [bidAmount, setBidAmount] = useState('');
  const [completionTime, setCompletionTime] = useState('');
  const [counterInput, setCounterInput] = useState('');

  // Dispute states
  const [showDisputeForm, setShowDisputeForm] = useState(false);
  const [disputeReason, setDisputeReason] = useState('');
  const [disputeFile, setDisputeFile] = useState<File | null>(null);
  const [disputeMsg, setDisputeMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [disputeSubmitting, setDisputeSubmitting] = useState(false);

  const loadData = async () => {
    try {
      const res = await api.get(`/gigs/${id}`);
      if (res.data.success) {
        setGig(res.data.gig);
        if (user?.role === 'freelancer') {
          const propRes = await api.get(`/proposals/gig/${id}`);
          if (propRes.data.success && propRes.data.proposals.length > 0) {
            setProposal(propRes.data.proposals[0]);
          } else {
            setProposal(null);
          }
        }
      } else {
        setError('Gig not found');
      }
    } catch (err) {
      setError('Failed to load gig details');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (id) {
      loadData();
    }
  }, [id, user]);

  const handleApply = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!message.trim() || !bidAmount || !completionTime) return;
    setApplying(true);
    setApplyMsg(null);
    try {
      await api.post(`/proposals/gig/${id}`, {
        coverLetter: message.trim(),
        bidAmount: Number(bidAmount),
        completionTime: Number(completionTime)
      });
      setApplyMsg({ type: 'success', text: 'Proposal bid submitted successfully!' });
      setMessage('');
      setBidAmount('');
      setCompletionTime('');
      await loadData();
    } catch (err: any) {
      setApplyMsg({ type: 'error', text: err.response?.data?.message || 'Could not submit proposal.' });
    } finally {
      setApplying(false);
    }
  };

  const handleProposalResponse = async (action: 'accepted' | 'rejected' | 'negotiate', counterAmount?: number) => {
    if (!proposal) return;
    setApplying(true);
    setApplyMsg(null);
    try {
      await api.put(`/proposals/${proposal._id}/respond`, {
        action,
        counterAmount
      });
      setApplyMsg({ type: 'success', text: `Proposal action "${action}" completed.` });
      setCounterInput('');
      await loadData();
    } catch (err: any) {
      setApplyMsg({ type: 'error', text: err.response?.data?.message || 'Action failed.' });
    } finally {
      setApplying(false);
    }
  };

  const handleRaiseDispute = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!disputeReason.trim()) return;
    setDisputeSubmitting(true);
    setDisputeMsg(null);
    try {
      const formData = new FormData();
      formData.append('gigId', id!);
      formData.append('reason', disputeReason.trim());
      if (disputeFile) {
        formData.append('evidence', disputeFile);
      }
      const res = await api.post('/disputes', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      if (res.data.success) {
        setDisputeMsg({ type: 'success', text: 'Dispute raised successfully!' });
        setDisputeReason('');
        setDisputeFile(null);
        setShowDisputeForm(false);
        await loadData();
      }
    } catch (err: any) {
      setDisputeMsg({ type: 'error', text: err.response?.data?.message || 'Could not raise dispute.' });
    } finally {
      setDisputeSubmitting(false);
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
          <div className="bg-paper border-2 border-ink sketch-card p-6 rotate-[0.3deg]">
            <div className="flex items-start justify-between gap-4 mb-4">
              <span className={`px-2.5 py-1 border border-ink text-[10px] font-bold font-display uppercase tracking-wider sketch-badge ${statusColors[gig.status] || statusColors.open}`}>
                {gig.status.replace('_', ' ')}
              </span>
              <span className={`px-2 py-0.5 border border-ink text-[10px] font-mono uppercase sketch-badge ${escrowColors[gig.escrowStatus]}`}>
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
                <span className="font-bold text-ink">{gig.location.city} · {gig.radiusKm}KM RADIUS</span>
              </span>
              <span className="flex items-center space-x-1.5">
                <Users className="h-3.5 w-3.5" />
                <span className="font-bold text-ink">{gig.applicants.length} APPLICANTS</span>
              </span>
            </div>
          </div>

          {/* Description */}
          <div className="bg-paper border-2 border-ink sketch-card p-6 rotate-[-0.3deg]">
            <h2 className="text-xs font-bold font-display text-ink uppercase tracking-widest mb-4">Project Description</h2>
            <p className="text-sm text-ink leading-relaxed whitespace-pre-wrap font-sans">{gig.description}</p>
          </div>

          {/* Skills Required */}
          {gig.skillsRequired.length > 0 && (
            <div className="bg-paper border-2 border-ink sketch-card p-6 rotate-[0.2deg]">
              <h2 className="text-xs font-bold font-display text-ink uppercase tracking-widest mb-4">Skills Required</h2>
              <div className="flex flex-wrap gap-2">
                {gig.skillsRequired.map((skill, i) => (
                  <span key={i} className="px-3 py-1.5 bg-paper border border-ink text-xs font-mono text-ink uppercase sketch-badge">
                    {skill}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Apply section — only for freelancers on open gigs */}
          {user?.role === 'freelancer' && gig.status === 'open' && (
            <div className="bg-paper border-2 border-ink sketch-card p-6 rotate-[-0.2deg]">
              <h2 className="text-xs font-bold font-display text-ink uppercase tracking-widest mb-4">
                {proposal ? 'Your Proposal Bid' : 'Submit Proposal Bid'}
              </h2>

              {applyMsg && (
                <div className={`p-3 border-2 border-ink text-xs flex items-center space-x-2 sketch-border mb-3 ${
                  applyMsg.type === 'success' ? 'border-l-4 border-l-route-teal bg-paper text-ink' : 'border-l-4 border-l-signal-coral bg-paper text-ink'
                }`}>
                  {applyMsg.type === 'success' ? <CheckCircle2 className="h-4 w-4 text-route-teal flex-shrink-0" /> : <AlertCircle className="h-4 w-4 text-signal-coral flex-shrink-0" />}
                  <span>{applyMsg.text}</span>
                </div>
              )}

              {proposal ? (
                <div className="space-y-4 font-sans text-xs">
                  <div className="flex flex-wrap items-center gap-3">
                    <span className={`px-2.5 py-1 border border-ink text-[10px] font-bold font-mono uppercase sketch-badge ${
                      proposal.status === 'accepted' ? 'bg-route-teal text-white shadow-none' :
                      proposal.status === 'rejected' ? 'bg-signal-coral text-white shadow-none' :
                      'bg-line-gray text-ink'
                    }`}>
                      Status: {proposal.status.toUpperCase()}
                    </span>
                    <span className="font-mono text-ink font-bold">Bid Amount: ₹{proposal.bidAmount}</span>
                    <span className="font-mono text-ink font-bold">Timeline: {proposal.completionTime} days</span>
                  </div>

                  <p className="text-xs text-ink font-sans border-2 border-ink p-3 sketch-border bg-paper/30 leading-relaxed font-bold">
                    <strong>Cover Letter:</strong> {proposal.coverLetter}
                  </p>

                  {/* Client Counter Offer Response UI */}
                  {proposal.status === 'negotiating' && proposal.lastProposedBy === 'client' && (
                    <div className="border-t-2 border-ink/20 pt-3 mt-3 space-y-3 bg-route-teal/5 p-3 sketch-border">
                      <p className="font-mono text-route-teal font-bold">
                        Client countered with an offer of: <strong>₹{proposal.bidAmount}</strong>
                      </p>
                      <div className="flex space-x-2">
                        <button
                          onClick={() => handleProposalResponse('accepted')}
                          disabled={applying}
                          className="px-3 py-1.5 bg-route-teal border-2 border-ink text-white text-xs font-bold font-display uppercase tracking-wider sketch-button disabled:opacity-50"
                        >
                          Accept Offer
                        </button>
                        <button
                          onClick={() => handleProposalResponse('rejected')}
                          disabled={applying}
                          className="px-3 py-1.5 border-2 border-ink bg-paper text-ink text-xs font-bold font-display uppercase tracking-wider sketch-button disabled:opacity-50"
                        >
                          Reject Offer
                        </button>
                      </div>

                      {/* Counter Back */}
                      <div className="flex items-center space-x-2 pt-1">
                        <input
                          type="number"
                          placeholder="Counter back (₹)..."
                          value={counterInput}
                          onChange={e => setCounterInput(e.target.value)}
                          className="px-2 py-1 text-xs bg-paper border-2 border-ink sketch-input text-ink font-mono focus:outline-none w-36"
                        />
                        <button
                          onClick={() => {
                            if (counterInput) handleProposalResponse('negotiate', Number(counterInput));
                          }}
                          disabled={applying || !counterInput}
                          className="px-3 py-1 bg-transit-gold text-ink border-2 border-ink text-xs font-bold font-display uppercase tracking-wider sketch-button disabled:opacity-50"
                        >
                          Counter Offer
                        </button>
                      </div>
                    </div>
                  )}

                  {proposal.status === 'negotiating' && proposal.lastProposedBy === 'freelancer' && (
                    <p className="font-mono text-slate italic">
                      Waiting for client response on your counter offer of ₹{proposal.bidAmount}...
                    </p>
                  )}
                </div>
              ) : (
                <form onSubmit={handleApply} className="space-y-4 font-sans">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-bold font-display uppercase tracking-widest text-ink pl-1">Bid Price (₹) *</label>
                      <input
                        required
                        type="number"
                        min="0"
                        placeholder="e.g. 4500"
                        value={bidAmount}
                        onChange={e => setBidAmount(e.target.value)}
                        className="w-full px-4 py-2.5 bg-paper border-2 border-ink sketch-input text-ink text-xs font-mono focus:outline-none focus:border-route-teal"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-bold font-display uppercase tracking-widest text-ink pl-1">Estimated Days *</label>
                      <input
                        required
                        type="number"
                        min="1"
                        placeholder="e.g. 5"
                        value={completionTime}
                        onChange={e => setCompletionTime(e.target.value)}
                        className="w-full px-4 py-2.5 bg-paper border-2 border-ink sketch-input text-ink text-xs font-mono focus:outline-none focus:border-route-teal"
                      />
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold font-display uppercase tracking-widest text-ink pl-1">Cover Letter *</label>
                    <textarea
                      required
                      rows={4}
                      value={message}
                      onChange={e => setMessage(e.target.value)}
                      placeholder="Explain your approach, why you're suited for this job..."
                      className="w-full px-4 py-3 bg-paper border-2 border-ink sketch-input text-ink text-xs font-sans resize-none focus:outline-none focus:border-route-teal"
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={applying || !message.trim() || !bidAmount || !completionTime}
                    className="flex items-center space-x-2 px-6 py-2.5 bg-signal-coral border-2 border-ink text-white text-xs font-bold font-display uppercase tracking-widest sketch-button disabled:opacity-50"
                  >
                    <Send className="h-3.5 w-3.5" />
                    <span>{applying ? 'Submitting…' : 'Submit Proposal'}</span>
                  </button>
                </form>
              )}
            </div>
          )}
        </div>

        {/* ── Right: Client info + budget ───────────────────────────────── */}
        <div className="space-y-6">

          {/* Budget card */}
          {/* Budget card */}
          <div className="bg-paper border-2 border-ink sketch-card p-6 rotate-[0.4deg]">
            <h3 className="text-xs font-bold font-display text-ink uppercase tracking-widest mb-4">Budget</h3>
            <div className="flex items-baseline space-x-1 font-mono">
              <DollarSign className="h-5 w-5 text-route-teal flex-shrink-0 mb-0.5 font-bold" />
              <span className="text-3xl font-black text-ink">₹{gig.budget.toLocaleString()}</span>
              <span className="text-sm text-slate font-bold">/{gig.budgetType === 'hourly' ? 'hr' : 'project'}</span>
            </div>
          </div>

          {/* Client card */}
          <div className="bg-paper border-2 border-ink sketch-card p-6 rotate-[-0.4deg]">
            <h3 className="text-xs font-bold font-display text-ink uppercase tracking-widest mb-4 pl-1">Posted By</h3>
            <div className="flex items-center space-x-3 mb-4">
              <div className="h-10 w-10 bg-paper border-2 border-ink flex items-center justify-center text-ink font-black font-display text-lg uppercase sketch-border">
                {gig.clientId.name.charAt(0)}
              </div>
              <div>
                <h4 className="font-bold text-ink text-sm uppercase font-display tracking-tight leading-none mb-1">{gig.clientId.name}</h4>
                {gig.clientId.companyName && (
                  <p className="text-xs text-slate font-sans flex items-center space-x-1 font-bold">
                    <Building className="h-3 w-3" />
                    <span>{gig.clientId.companyName}</span>
                  </p>
                )}
              </div>
            </div>
            <div className="space-y-2 text-xs font-mono text-slate border-t-2 border-ink pt-3">
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
                <div className="bg-paper border-2 border-ink sketch-card p-6 space-y-3 rotate-[0.3deg]">
                  <h3 className="text-xs font-bold font-display text-ink uppercase tracking-widest pl-1">Quick Actions</h3>
                  {gig.status === 'in_progress' && (
                    <>
                      <Link
                        to={`/gigs/${gig._id}/chat`}
                        className="flex items-center space-x-2 w-full px-4 py-2.5 bg-route-teal text-white text-xs font-bold font-display uppercase tracking-widest border-2 border-ink sketch-button"
                      >
                        <MessageSquare className="h-4 w-4" />
                        <span>Open Chat</span>
                      </Link>

                      <button
                        type="button"
                        onClick={() => setShowDisputeForm(prev => !prev)}
                        className="flex items-center space-x-2 w-full px-4 py-2.5 bg-signal-coral text-white text-xs font-bold font-display uppercase tracking-widest border-2 border-ink sketch-button"
                      >
                        <AlertCircle className="h-4 w-4" />
                        <span>{showDisputeForm ? 'Close Dispute' : 'Raise Dispute'}</span>
                      </button>

                      {showDisputeForm && (
                        <form onSubmit={handleRaiseDispute} className="space-y-3 pt-3 border-t border-ink/20 font-sans">
                          {disputeMsg && (
                            <div className={`p-2 border border-ink text-[10px] sketch-border ${
                              disputeMsg.type === 'success' ? 'bg-route-teal/10 text-route-teal' : 'bg-signal-coral/10 text-signal-coral'
                            }`}>
                              {disputeMsg.text}
                            </div>
                          )}
                          <div className="space-y-1">
                            <label className="text-[9px] font-bold font-display uppercase tracking-widest text-ink pl-1">Reason for Dispute *</label>
                            <textarea
                              required
                              rows={3}
                              value={disputeReason}
                              onChange={e => setDisputeReason(e.target.value)}
                              placeholder="Describe why you are raising a dispute..."
                              className="w-full p-2 bg-paper border border-ink sketch-input text-ink text-xs font-sans resize-none focus:outline-none focus:border-route-teal"
                            />
                          </div>
                          <div className="space-y-1">
                            <label className="text-[9px] font-bold font-display uppercase tracking-widest text-ink pl-1">Evidence (PDF/Image)</label>
                            <input
                              type="file"
                              accept=".pdf,.jpg,.jpeg,.png"
                              onChange={e => setDisputeFile(e.target.files?.[0] || null)}
                              className="w-full text-[10px] text-slate file:mr-2 file:py-1 file:px-2 file:border file:border-ink file:bg-paper file:text-ink file:text-[9px] file:font-mono file:uppercase file:sketch-badge"
                            />
                          </div>
                          <button
                            type="submit"
                            disabled={disputeSubmitting || !disputeReason.trim()}
                            className="w-full py-1.5 bg-signal-coral text-white text-xs font-bold font-display uppercase tracking-widest border border-ink sketch-button disabled:opacity-50"
                          >
                            {disputeSubmitting ? 'Raising Dispute…' : 'Submit Dispute'}
                          </button>
                        </form>
                      )}
                    </>
                  )}
                  {gig.status === 'completed' && otherUserId && (
                    <Link
                      to={`/review/${gig._id}/${otherUserId}`}
                      className="flex items-center space-x-2 w-full px-4 py-2.5 bg-paper text-ink text-xs font-bold font-display uppercase tracking-widest border-2 border-ink sketch-button"
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
