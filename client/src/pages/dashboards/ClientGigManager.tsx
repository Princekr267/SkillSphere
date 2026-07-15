import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import api from '../../utils/api';

import {
  Plus, Tag, DollarSign, MapPin, Users, ChevronDown,
  ChevronRight, CheckCircle2, XCircle, Loader2, Trash2, X,
  Banknote
} from 'lucide-react';

const GIG_CATEGORIES = [
  'Technology & Development',
  'Design & Creative',
  'Home & Trades',
  'Writing & Translation',
  'Marketing & Sales',
  'Teaching & Tutoring',
  'Other',
];

const STATUS_COLORS: Record<string, string> = {
  open:        'bg-route-teal/10 text-route-teal border-route-teal/30',
  in_progress: 'bg-transit-gold/10 text-transit-gold border-transit-gold/30',
  completed:   'bg-slate/10 text-slate border-slate/30',
  cancelled:   'bg-signal-coral/10 text-signal-coral border-signal-coral/30',
};

const ESCROW_LABELS: Record<string, string> = {
  none:            'No Escrow',
  funds_deposited: '💰 Funds Deposited',
  released:        '✅ Funds Released',
  refunded:        '↩ Refunded',
};

interface GigData {
  _id: string;
  title: string;
  category: string;
  budget: number;
  budgetType: 'fixed' | 'hourly';
  status: string;
  escrowStatus: string;
  location: { city: string };
  skillsRequired: string[];
  radiusKm?: number;
  applicants: Array<{
    _id: string;
    freelancerId: {
      _id: string;
      name: string;
      skills: Array<{ name: string; level: string }>;
      hourlyRate?: number;
      rating: number;
      location: { city: string };
    };
    message: string;
    status: string;
    appliedAt: string;
  }>;
}

export const ClientGigManager: React.FC = () => {
  const { user } = useAuth();
  const [gigs, setGigs] = useState<GigData[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedGig, setExpandedGig] = useState<string | null>(null);
  const [showPostForm, setShowPostForm] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  // New gig form state
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState(GIG_CATEGORIES[0]);
  const [budget, setBudget] = useState('');
  const [budgetType, setBudgetType] = useState<'fixed' | 'hourly'>('fixed');
  const [skillInput, setSkillInput] = useState('');
  const [skills, setSkills] = useState<string[]>([]);
  const [radiusKm, setRadiusKm] = useState(25);
  const [posting, setPosting] = useState(false);

  // Proposal negotiation state
  const [gigProposals, setGigProposals] = useState<Record<string, any[]>>({});
  const [counterOffers, setCounterOffers] = useState<Record<string, string>>({});

  // AI recommendations state
  const [recommendations, setRecommendations] = useState<Record<string, any[]>>({});
  const [recLoading, setRecLoading] = useState<Record<string, boolean>>({});

  const fetchGigs = async () => {
    setLoading(true);
    try {
      const res = await api.get('/gigs/my');
      if (res.data.success) setGigs(res.data.gigs);
    } catch (err) {
      setMessage({ type: 'error', text: 'Could not load your gigs. Make sure the server is running.' });
    } finally {
      setLoading(false);
    }
  };

  const fetchProposalsForGig = async (gigId: string) => {
    try {
      const res = await api.get(`/proposals/gig/${gigId}`);
      if (res.data.success) {
        setGigProposals(prev => ({ ...prev, [gigId]: res.data.proposals }));
      }
    } catch (err) {
      console.error('Error fetching proposals:', err);
    }
  };

  const fetchRecommendations = async (gigId: string) => {
    setRecLoading(prev => ({ ...prev, [gigId]: true }));
    try {
      const res = await api.get(`/ai/recommend/${gigId}`);
      if (res.data.success) {
        setRecommendations(prev => ({ ...prev, [gigId]: res.data.recommendations }));
      }
    } catch (err) {
      console.error('Error fetching recommendations:', err);
    } finally {
      setRecLoading(prev => ({ ...prev, [gigId]: false }));
    }
  };

  const handleToggleExpand = (gigId: string) => {
    if (expandedGig === gigId) {
      setExpandedGig(null);
    } else {
      setExpandedGig(gigId);
      fetchProposalsForGig(gigId);
      fetchRecommendations(gigId);
    }
  };

  const handleProposalAction = async (proposalId: string, gigId: string, action: 'accepted' | 'rejected' | 'negotiate', counterAmount?: number) => {
    setActionLoading(`${gigId}-${proposalId}-${action}`);
    setMessage(null);
    try {
      const res = await api.put(`/proposals/${proposalId}/respond`, { action, counterAmount });
      if (res.data.success) {
        setMessage({ type: 'success', text: `Proposal ${action} successfully.` });
        fetchProposalsForGig(gigId);
        fetchGigs();
      }
    } catch (err: any) {
      setMessage({ type: 'error', text: err.response?.data?.message || 'Action failed.' });
    } finally {
      setActionLoading(null);
    }
  };

  const loadRazorpayScript = () => {
    return new Promise((resolve) => {
      const script = document.createElement('script');
      script.src = 'https://checkout.razorpay.com/v1/checkout.js';
      script.onload = () => resolve(true);
      script.onerror = () => resolve(false);
      document.body.appendChild(script);
    });
  };

  const handleFundEscrow = async (proposal: any) => {
    setActionLoading(`fund-${proposal.gigId}`);
    setMessage(null);
    try {
      const res = await api.post('/payments/create-order', { proposalId: proposal._id });
      if (!res.data.success) throw new Error(res.data.message);

      const { mode, orderId, amount, key } = res.data;

      if (mode === 'simulation') {
        const verifyRes = await api.post('/payments/verify', {
          razorpay_order_id: orderId,
          proposalId: proposal._id,
          mode: 'simulation'
        });
        if (verifyRes.data.success) {
          setMessage({ type: 'success', text: 'Escrow funded successfully via developer simulation mode.' });
          fetchGigs();
        } else {
          setMessage({ type: 'error', text: 'Verification failed.' });
        }
      } else {
        const loaded = await loadRazorpayScript();
        if (!loaded) {
          setMessage({ type: 'error', text: 'Razorpay SDK failed to load.' });
          return;
        }

        const options = {
          key: key,
          amount: amount * 100,
          currency: 'INR',
          name: 'SkillSphere',
          description: 'Fund Escrow for Gig',
          order_id: orderId,
          handler: async function (response: any) {
            try {
              const verifyRes = await api.post('/payments/verify', {
                razorpay_order_id: response.razorpay_order_id,
                razorpay_payment_id: response.razorpay_payment_id,
                razorpay_signature: response.razorpay_signature,
                proposalId: proposal._id,
              });
              if (verifyRes.data.success) {
                setMessage({ type: 'success', text: 'Escrow funded successfully!' });
                fetchGigs();
              } else {
                setMessage({ type: 'error', text: 'Signature verification failed.' });
              }
            } catch (err: any) {
              setMessage({ type: 'error', text: err.response?.data?.message || 'Payment verification failed' });
            }
          },
          prefill: {
            name: user?.name,
            email: user?.email,
          },
          theme: {
            color: '#0F7A73',
          },
        };

        const rzp = new (window as any).Razorpay(options);
        rzp.open();
      }
    } catch (err: any) {
      setMessage({ type: 'error', text: err.response?.data?.message || err.message || 'Payment initiation failed' });
    } finally {
      setActionLoading(null);
    }
  };

  useEffect(() => { fetchGigs(); }, []);

  const handleAddSkill = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' || e.key === ',') {
      e.preventDefault();
      const s = skillInput.trim();
      if (s && !skills.includes(s)) setSkills(prev => [...prev, s]);
      setSkillInput('');
    }
  };

  const handlePostGig = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title || !description || !budget) return;
    setPosting(true);
    setMessage(null);
    try {
      await api.post('/gigs', { title, description, category, budget: Number(budget), budgetType, skillsRequired: skills, radiusKm });
      setMessage({ type: 'success', text: 'Gig posted successfully! Freelancers can now discover it.' });
      setShowPostForm(false);
      setTitle(''); setDescription(''); setBudget(''); setSkills([]); setSkillInput('');
      fetchGigs();
    } catch (err: any) {
      setMessage({ type: 'error', text: err.response?.data?.message || 'Failed to post gig.' });
    } finally {
      setPosting(false);
    }
  };

  const handleApplicantAction = async (gigId: string, applicantId: string, status: 'accepted' | 'rejected') => {
    setActionLoading(`${gigId}-${applicantId}-${status}`);
    setMessage(null);
    try {
      await api.put(`/gigs/${gigId}/applicants/${applicantId}`, { status });
      setMessage({ type: 'success', text: `Applicant ${status}. ${status === 'accepted' ? 'Simulated escrow funds deposited.' : ''}` });
      fetchGigs();
    } catch (err: any) {
      setMessage({ type: 'error', text: err.response?.data?.message || 'Action failed.' });
    } finally {
      setActionLoading(null);
    }
  };

  const handleDeleteGig = async (gigId: string) => {
    if (!window.confirm('Delete this gig permanently?')) return;
    setActionLoading(`delete-${gigId}`);
    try {
      await api.delete(`/gigs/${gigId}`);
      setGigs(prev => prev.filter(g => g._id !== gigId));
      setMessage({ type: 'success', text: 'Gig deleted.' });
    } catch (err: any) {
      setMessage({ type: 'error', text: err.response?.data?.message || 'Could not delete gig.' });
    } finally {
      setActionLoading(null);
    }
  };

  const handleReleaseEscrow = async (gigId: string) => {
    if (!window.confirm('Release funds? This marks the gig as completed.')) return;
    setActionLoading(`release-${gigId}`);
    try {
      await api.put(`/payments/release/${gigId}`);
      setMessage({ type: 'success', text: 'Funds released! Gig marked as completed.' });
      fetchGigs();
    } catch (err: any) {
      setMessage({ type: 'error', text: err.response?.data?.message || 'Could not release escrow.' });
    } finally {
      setActionLoading(null);
    }
  };

  const handleRefundEscrow = async (gigId: string) => {
    if (!window.confirm('Cancel this gig and refund escrow funds?')) return;
    setActionLoading(`refund-${gigId}`);
    try {
      await api.put(`/payments/refund/${gigId}`);
      setMessage({ type: 'success', text: 'Escrow funds refunded successfully! Gig cancelled.' });
      fetchGigs();
    } catch (err: any) {
      setMessage({ type: 'error', text: err.response?.data?.message || 'Could not refund escrow.' });
    } finally {
      setActionLoading(null);
    }
  };

  return (
    <div className="space-y-6">

      {/* Header */}
      <div className="flex items-center justify-between border-b-2 border-ink pb-4">
        <div>
          <span className="text-[10px] font-mono text-slate uppercase tracking-widest block">Active Station</span>
          <h2 className="text-lg font-black font-display text-ink uppercase tracking-tight">Gig Manager</h2>
        </div>
        <button
          onClick={() => setShowPostForm(f => !f)}
          className="flex items-center space-x-1.5 px-4 py-2.5 bg-signal-coral text-white text-xs font-bold font-display uppercase tracking-widest sketch-button"
        >
          <Plus className="h-4 w-4" />
          <span>Post Gig</span>
        </button>
      </div>

      {/* Alert banner */}
      {message && (
        <div className={`p-3 border-2 border-ink sketch-border text-xs flex items-center space-x-2 ${
          message.type === 'success' ? 'border-l-4 border-l-route-teal bg-paper text-ink' : 'border-l-4 border-l-signal-coral bg-paper text-ink'
        }`}>
          {message.type === 'success' ? <CheckCircle2 className="h-4 w-4 text-route-teal flex-shrink-0" /> : <XCircle className="h-4 w-4 text-signal-coral flex-shrink-0" />}
          <span className="flex-grow">{message.text}</span>
          <button onClick={() => setMessage(null)}><X className="h-3.5 w-3.5 text-slate hover:text-ink" /></button>
        </div>
      )}

      {/* Post New Gig Form */}
      {showPostForm && (
        <div className="bg-paper border-2 border-ink sketch-card p-6 rotate-[-0.5deg]">
          <h3 className="text-xs font-bold font-display text-ink uppercase tracking-widest mb-6 pl-1">Post a New Gig</h3>
          <form onSubmit={handlePostGig} className="space-y-5">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5 sm:col-span-2">
                <label className="text-[10px] font-bold font-display uppercase tracking-widest text-ink pl-1">Gig Title *</label>
                <input required value={title} onChange={e => setTitle(e.target.value)}
                  placeholder="e.g. Need a React developer for dashboard rebuild"
                  className="w-full px-4 py-2.5 bg-paper border-2 border-ink sketch-input text-ink text-sm focus:outline-none focus:border-route-teal font-sans"
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold font-display uppercase tracking-widest text-ink pl-1">Category *</label>
                <select required value={category} onChange={e => setCategory(e.target.value)}
                  className="w-full px-4 py-2.5 bg-paper border-2 border-ink sketch-input text-ink text-sm focus:outline-none focus:border-route-teal font-sans"
                >
                  {GIG_CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold font-display uppercase tracking-widest text-ink pl-1">Search Radius</label>
                <div className="flex items-center space-x-3">
                  <input type="range" min="5" max="200" step="5" value={radiusKm}
                    onChange={e => setRadiusKm(Number(e.target.value))} className="flex-grow accent-route-teal" />
                  <span className="text-xs font-mono text-route-teal w-12 font-bold">{radiusKm}km</span>
                </div>
              </div>
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold font-display uppercase tracking-widest text-ink pl-1">Budget (₹) *</label>
                <input required type="number" min="0" value={budget} onChange={e => setBudget(e.target.value)}
                  placeholder="e.g. 5000"
                  className="w-full px-4 py-2.5 bg-paper border-2 border-ink sketch-input text-ink text-sm focus:outline-none focus:border-route-teal font-mono"
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold font-display uppercase tracking-widest text-ink pl-1">Budget Type</label>
                <div className="flex space-x-3">
                  {(['fixed', 'hourly'] as const).map(type => (
                    <button key={type} type="button" onClick={() => setBudgetType(type)}
                      className={`flex-1 py-2 border-2 border-ink text-xs font-bold font-display uppercase tracking-widest sketch-button ${
                        budgetType === type ? 'bg-route-teal text-white shadow-none' : 'bg-paper text-ink'
                      }`}>
                      {type}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-[10px] font-bold font-display uppercase tracking-widest text-ink pl-1">Description *</label>
              <textarea required rows={4} value={description} onChange={e => setDescription(e.target.value)}
                placeholder="Describe the work, deliverables, timeline, and any specific requirements..."
                className="w-full px-4 py-2.5 bg-paper border-2 border-ink sketch-input text-ink text-sm resize-none focus:outline-none focus:border-route-teal font-sans"
              />
            </div>

            <div className="space-y-2">
              <label className="text-[10px] font-bold font-display uppercase tracking-widest text-ink pl-1">Skills Required (press Enter or comma to add)</label>
              <div className="flex flex-wrap gap-2 mb-2">
                {skills.map((s, i) => (
                  <span key={i} className="inline-flex items-center space-x-1.5 px-2.5 py-1 border border-ink bg-paper text-xs font-mono text-ink sketch-badge">
                    <span>{s}</span>
                    <button type="button" onClick={() => setSkills(prev => prev.filter((_, idx) => idx !== i))}>
                      <X className="h-3 w-3 text-slate hover:text-signal-coral" />
                    </button>
                  </span>
                ))}
              </div>
              <input type="text" value={skillInput} onChange={e => setSkillInput(e.target.value)}
                onKeyDown={handleAddSkill}
                placeholder="React.js, Electrician, Figma, etc."
                className="w-full px-4 py-2.5 bg-paper border-2 border-ink sketch-input text-ink text-sm focus:outline-none focus:border-route-teal font-sans"
              />
            </div>

            <div className="flex space-x-3 pt-4 border-t-2 border-ink">
              <button type="submit" disabled={posting}
                className="px-6 py-2.5 bg-signal-coral text-white text-xs font-bold font-display uppercase tracking-widest sketch-button disabled:opacity-50"
              >
                {posting ? 'Posting…' : 'Publish Gig'}
              </button>
              <button type="button" onClick={() => setShowPostForm(false)}
                className="px-6 py-2.5 border-2 border-ink bg-paper text-ink text-xs font-bold font-display uppercase tracking-widest sketch-button"
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Gig list */}
      {loading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-7 w-7 text-route-teal animate-spin" />
        </div>
      ) : gigs.length === 0 ? (
        <div className="text-center py-12 border-2 border-dashed border-ink sketch-border bg-paper/50">
          <Tag className="h-8 w-8 mx-auto text-slate mb-2" />
          <h3 className="font-bold font-display text-ink uppercase tracking-tight text-sm mb-1">No Gigs Yet</h3>
          <p className="text-xs text-slate font-sans max-w-xs mx-auto">Post your first gig to start receiving applications from nearby freelancers.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {gigs.map((gig, index) => (
            <div 
              key={gig._id} 
              className="bg-paper border-2 border-ink sketch-card p-0 overflow-hidden"
              style={{ transform: `rotate(${(index % 2 === 0 ? 0.3 : -0.3)}deg)` }}
            >
              {/* Gig header row */}
              <div
                className="p-5 flex items-center justify-between cursor-pointer hover:bg-line-gray/20 transition-colors"
                onClick={() => handleToggleExpand(gig._id)}
              >
                <div className="flex items-center space-x-4 min-w-0">
                  <div>
                    {expandedGig === gig._id
                      ? <ChevronDown className="h-4 w-4 text-slate" />
                      : <ChevronRight className="h-4 w-4 text-slate" />
                    }
                  </div>
                  <div className="min-w-0">
                    <h3 className="font-bold font-display text-ink text-sm uppercase tracking-tight truncate">{gig.title}</h3>
                    <div className="flex items-center space-x-3 mt-1">
                      <span className="text-[10px] font-mono text-slate flex items-center space-x-1">
                        <DollarSign className="h-3 w-3 text-route-teal" />
                        <span>₹{gig.budget.toLocaleString()}/{gig.budgetType === 'hourly' ? 'hr' : 'project'}</span>
                      </span>
                      <span className="text-[10px] font-mono text-slate flex items-center space-x-1">
                        <MapPin className="h-3 w-3 text-route-teal" />
                        <span>{gig.location.city}</span>
                      </span>
                      <span className="text-[10px] font-mono text-slate flex items-center space-x-1">
                        <Users className="h-3 w-3 text-route-teal" />
                        <span>{gigProposals[gig._id]?.length || gig.applicants.length} applied</span>
                      </span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center space-x-3 flex-shrink-0">
                  <span className={`px-2.5 py-1 border-2 border-ink text-[10px] font-bold font-display uppercase tracking-wider sketch-badge ${STATUS_COLORS[gig.status] || STATUS_COLORS.open}`}>
                    {gig.status.replace('_', ' ')}
                  </span>
                  {gig.escrowStatus !== 'none' && (
                    <span className="text-[10px] font-mono text-transit-gold font-bold hidden sm:block">
                      {ESCROW_LABELS[gig.escrowStatus]}
                    </span>
                  )}
                  {gig.status === 'in_progress' && gig.escrowStatus === 'funds_deposited' && (
                    <div className="flex space-x-2">
                      <button
                        onClick={e => { e.stopPropagation(); handleReleaseEscrow(gig._id); }}
                        disabled={!!actionLoading}
                        className="flex items-center space-x-1 px-2.5 py-1 border-2 border-ink bg-route-teal text-white text-[10px] font-bold font-display uppercase tracking-wider sketch-button disabled:opacity-50"
                      >
                        <Banknote className="h-3 w-3" />
                        <span>Release Funds</span>
                      </button>
                      <button
                        onClick={e => { e.stopPropagation(); handleRefundEscrow(gig._id); }}
                        disabled={!!actionLoading}
                        className="flex items-center space-x-1 px-2.5 py-1 border-2 border-ink bg-signal-coral text-white text-[10px] font-bold font-display uppercase tracking-wider sketch-button disabled:opacity-50"
                      >
                        <XCircle className="h-3 w-3" />
                        <span>Refund</span>
                      </button>
                    </div>
                  )}
                  {gig.status === 'open' && (
                    <button
                      onClick={e => { e.stopPropagation(); handleDeleteGig(gig._id); }}
                      disabled={actionLoading === `delete-${gig._id}`}
                      className="text-slate hover:text-signal-coral transition-colors p-1"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  )}
                </div>
              </div>

              {/* Expanded: Proposals */}
              {expandedGig === gig._id && (
                <div className="border-t-2 border-ink px-5 py-4 bg-paper/50">
                  <h4 className="text-[10px] font-bold font-display uppercase tracking-widest text-ink mb-4">
                    Proposals Received ({gigProposals[gig._id]?.length || 0})
                  </h4>
                  {!gigProposals[gig._id] ? (
                    <div className="flex justify-center py-4"><Loader2 className="h-5 w-5 animate-spin text-route-teal" /></div>
                  ) : gigProposals[gig._id].length === 0 ? (
                    <p className="text-xs text-slate font-sans italic">No proposals yet. Your gig is visible to freelancers within {gig.radiusKm}km.</p>
                  ) : (
                    <div className="space-y-4">
                      {gigProposals[gig._id].map((prop, propIdx) => (
                        <div 
                          key={prop._id} 
                          className="bg-paper border-2 border-ink sketch-card p-4"
                          style={{ transform: `rotate(${(propIdx % 2 === 0 ? -0.4 : 0.4)}deg)` }}
                        >
                          <div className="flex items-start justify-between gap-4 mb-3">
                            <div>
                              <h5 className="text-sm font-display uppercase tracking-tight">
                                <Link
                                  to={`/profile/${prop.freelancerId?._id}`}
                                  className="font-bold text-ink hover:text-route-teal hover:underline transition-colors"
                                >
                                  {prop.freelancerId?.name || 'Freelancer'}
                                </Link>
                              </h5>

                              <div className="flex items-center space-x-3 mt-1 text-[10px] font-mono text-slate">
                                <span>Bid: ₹{prop.bidAmount}</span>
                                <span>Time: {prop.completionTime} days</span>
                                {prop.freelancerId?.rating && (
                                  <span>{prop.freelancerId.rating.toFixed(1)} ★</span>
                                )}
                                {prop.freelancerId?.location?.city && (
                                  <span className="flex items-center space-x-0.5">
                                    <MapPin className="h-2.5 w-2.5" />
                                    <span>{prop.freelancerId.location.city}</span>
                                  </span>
                                )}
                              </div>
                            </div>
                            <span className={`px-2 py-1 border border-ink text-[10px] font-bold font-mono uppercase sketch-badge ${
                              prop.status === 'accepted' ? 'bg-route-teal text-white shadow-none' :
                              prop.status === 'rejected' ? 'bg-signal-coral text-white shadow-none' :
                              'bg-line-gray text-ink'
                            }`}>
                              {prop.status.toUpperCase()}
                            </span>
                          </div>

                          <p className="text-xs text-ink font-sans leading-relaxed bg-paper border-2 border-ink sketch-border p-3 mb-3">
                            {prop.coverLetter}
                          </p>

                          {/* Negotiation context */}
                          {prop.status === 'negotiating' && (
                            <p className="text-[10px] font-mono text-route-teal font-bold mb-3">
                              Last proposed by {prop.lastProposedBy === 'client' ? 'you' : 'freelancer'}: ₹{prop.bidAmount}
                            </p>
                          )}

                          {/* Action controls */}
                          {gig.status === 'open' && (prop.status === 'pending' || prop.status === 'negotiating') && (
                            <div className="flex flex-col space-y-2 mt-3 pt-3 border-t border-ink/20">
                              <div className="flex space-x-2">
                                {(prop.status === 'pending' || (prop.status === 'negotiating' && prop.lastProposedBy === 'freelancer')) && (
                                  <button
                                    onClick={() => handleProposalAction(prop._id, gig._id, 'accepted')}
                                    disabled={!!actionLoading}
                                    className="flex items-center space-x-1.5 px-3 py-1.5 bg-route-teal border-2 border-ink text-white text-xs font-bold font-display uppercase tracking-wider sketch-button disabled:opacity-50"
                                  >
                                    <CheckCircle2 className="h-3.5 w-3.5" />
                                    <span>Accept Bid</span>
                                  </button>
                                )}
                                <button
                                  onClick={() => handleProposalAction(prop._id, gig._id, 'rejected')}
                                  disabled={!!actionLoading}
                                  className="flex items-center space-x-1.5 px-3 py-1.5 border-2 border-ink bg-paper text-ink text-xs font-bold font-display uppercase tracking-wider sketch-button disabled:opacity-50"
                                >
                                  <XCircle className="h-3.5 w-3.5" />
                                  <span>Reject</span>
                                </button>
                              </div>

                              {/* Counter Offer Input */}
                              <div className="flex items-center space-x-2 pt-2">
                                <input
                                  type="number"
                                  placeholder="Counter offer (₹)..."
                                  value={counterOffers[prop._id] || ''}
                                  onChange={e => setCounterOffers(prev => ({ ...prev, [prop._id]: e.target.value }))}
                                  className="px-2.5 py-1 text-xs bg-paper border-2 border-ink sketch-input text-ink font-mono focus:outline-none w-40"
                                />
                                <button
                                  onClick={() => {
                                    const val = counterOffers[prop._id];
                                    if (val) handleProposalAction(prop._id, gig._id, 'negotiate', Number(val));
                                  }}
                                  disabled={!!actionLoading || !counterOffers[prop._id]}
                                  className="px-3 py-1 bg-transit-gold text-ink border-2 border-ink text-xs font-bold font-display uppercase tracking-wider sketch-button disabled:opacity-50"
                                >
                                  Counter Offer
                                </button>
                              </div>
                            </div>
                          )}

                          {/* Escrow payment trigger */}
                          {prop.status === 'accepted' && gig.status === 'open' && gig.escrowStatus === 'none' && (
                            <div className="mt-3 pt-3 border-t border-ink/20">
                              <p className="text-[10px] font-mono text-slate mb-2">Proposal accepted. Fund the escrow to launch project:</p>
                              <button
                                onClick={() => handleFundEscrow(prop)}
                                disabled={!!actionLoading}
                                className="flex items-center space-x-2 px-4 py-2 bg-signal-coral border-2 border-ink text-white text-xs font-bold font-display uppercase tracking-wider sketch-button disabled:opacity-50"
                              >
                                <Banknote className="h-4 w-4" />
                                <span>Pay & Fund Escrow (₹{prop.bidAmount})</span>
                              </button>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  )}

                  {/* AI recommendations section */}
                  {gig.status === 'open' && (
                    <div className="mt-6 pt-6 border-t-2 border-dashed border-ink/30">
                      <h4 className="text-[10px] font-bold font-display uppercase tracking-widest text-route-teal mb-3 flex items-center space-x-1.5">
                        <Users className="h-3.5 w-3.5" />
                        <span>AI-Recommended Candidates (Smart Match)</span>
                      </h4>
                      {recLoading[gig._id] ? (
                        <div className="flex items-center space-x-2 py-2 text-xs text-slate font-sans">
                          <Loader2 className="h-4 w-4 animate-spin text-route-teal animate-spin" />
                          <span>Finding matches...</span>
                        </div>
                      ) : !recommendations[gig._id] || recommendations[gig._id].length === 0 ? (
                        <p className="text-xs text-slate font-sans italic">No top recommendation matches found within your parameters.</p>
                      ) : (
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                          {recommendations[gig._id].map((rec, recIdx) => (
                            <div key={rec.freelancer._id} className="bg-paper border-2 border-ink sketch-card p-3 flex flex-col justify-between" style={{ transform: `rotate(${(recIdx % 2 === 0 ? 0.3 : -0.3)}deg)` }}>
                              <div>
                                <div className="flex items-center justify-between">
                                  <Link to={`/profile/${rec.freelancer._id}`} className="font-bold text-xs uppercase font-display text-ink hover:text-route-teal hover:underline">
                                    {rec.freelancer.name}
                                  </Link>
                                  <span className="text-[10px] font-mono font-bold text-route-teal bg-route-teal/10 border border-ink px-1.5 py-0.5 sketch-badge">
                                    Score: {Math.round(rec.finalScore * 100)}%
                                  </span>
                                </div>
                                <p className="text-[9px] font-mono text-slate mt-1">
                                  Rating: {rec.freelancer.rating?.toFixed(1) || '—'} ★ ({rec.freelancer.reviewCount || 0} reviews)
                                </p>
                                <p className="text-[9px] font-mono text-slate">
                                  Distance: {rec.scores.distanceKm} km away
                                </p>
                                <div className="flex flex-wrap gap-1 mt-2">
                                  {rec.freelancer.skills.map((s: any) => (
                                    <span key={s.name} className="text-[8px] font-mono bg-paper border border-ink/40 px-1 py-0.2 sketch-badge">
                                      {s.name}
                                    </span>
                                  ))}
                                </div>
                              </div>
                              <div className="mt-3 pt-2 border-t border-ink/10 flex items-center justify-between">
                                <span className="text-[10px] font-mono font-bold text-ink">
                                  {rec.freelancer.hourlyRate ? `₹${rec.freelancer.hourlyRate}/hr` : 'No Rate'}
                                </span>
                                <Link
                                  to={`/profile/${rec.freelancer._id}`}
                                  className="text-[9px] font-bold font-display uppercase tracking-wider text-route-teal hover:underline"
                                >
                                  View Profile →
                                </Link>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
