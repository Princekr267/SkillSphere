import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import api from '../../utils/api';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Badge } from '../../components/ui/Badge';

import {
  Plus, Tag, DollarSign, MapPin, Users,
  ChevronRight, CheckCircle2, XCircle, Loader2, Trash2, X,
  Banknote, MessageSquare, User, ExternalLink
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
  open:        'bg-accent-teal text-ink border-ink',
  in_progress: 'bg-accent-amber text-ink border-ink',
  completed:   'bg-cream text-ink border-ink',
  cancelled:   'bg-accent-coral text-ink border-ink',
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
  finalAgreedAmount?: number;
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
            color: '#FFC940',
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
      <div className="flex items-center justify-between border-b-2 border-ink pb-4 text-left">
        <div>
          <span className="text-[10px] font-mono text-ink/60 uppercase tracking-widest block">Active Station</span>
          <h2 className="text-lg font-display font-black text-ink uppercase tracking-tight">Gig Manager</h2>
        </div>
        <Button
          onClick={() => setShowPostForm(f => !f)}
          variant="coral"
          size="md"
        >
          <Plus className="h-4 w-4 mr-1" />
          <span>Post Gig</span>
        </Button>
      </div>

      {/* Alert banner */}
      {message && (
        <div className={`p-3 border-2 border-ink text-xs flex items-center space-x-2 rounded-lg ${
          message.type === 'success' ? 'border-l-4 border-l-accent-teal bg-cream text-ink' : 'border-l-4 border-l-accent-coral bg-cream text-ink'
        }`}>
          {message.type === 'success' ? <CheckCircle2 className="h-4 w-4 text-accent-teal flex-shrink-0" /> : <XCircle className="h-4 w-4 text-accent-coral flex-shrink-0" />}
          <span className="flex-grow text-left">{message.text}</span>
          <button onClick={() => setMessage(null)} className="cursor-pointer">
            <X className="h-4 w-4 text-ink hover:text-accent-coral" />
          </button>
        </div>
      )}

      {/* Post New Gig Form */}
      {showPostForm && (
        <Card variant="amber" className="animate-fade-in space-y-4">
          <h3 className="text-xs font-bold font-display text-ink uppercase tracking-widest pl-1">Post a New Gig</h3>
          <form onSubmit={handlePostGig} className="bg-cream border-2 border-ink rounded-xl p-5 shadow-retro-sm space-y-5">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5 sm:col-span-2">
                <label className="text-[10px] font-bold font-display uppercase tracking-widest text-ink pl-1">Gig Title *</label>
                <Input required value={title} onChange={e => setTitle(e.target.value)}
                  placeholder="e.g. Need a React developer for dashboard rebuild"
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold font-display uppercase tracking-widest text-ink pl-1">Category *</label>
                <select required value={category} onChange={e => setCategory(e.target.value)}
                  className="w-full px-4 py-2.5 bg-cream border-2 border-ink rounded-lg text-ink text-sm focus:outline-none focus:bg-accent-amber/10 focus:border-accent-amber font-sans cursor-pointer"
                >
                  {GIG_CATEGORIES.map(c => <option key={c} value={c} className="bg-cream text-ink">{c}</option>)}
                </select>
              </div>
              <div className="space-y-2 sm:col-span-2">
                <label className="text-[10px] font-bold font-display uppercase tracking-widest text-ink pl-1">Target Area / Scope *</label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => { if (radiusKm >= 3000) setRadiusKm(25); }}
                    className={`p-3 rounded-lg border-2 text-left flex items-center justify-between transition-all cursor-pointer ${
                      radiusKm < 3000 ? 'border-accent-teal bg-accent-teal/10 text-ink font-bold shadow-retro-sm' : 'border-ink/20 bg-cream text-ink/70 hover:border-ink'
                    }`}
                  >
                    <div>
                      <p className="text-xs font-display font-black uppercase tracking-tight">Local Proximity Radius</p>
                      <p className="text-[10px] font-sans opacity-80">Limit applications to nearby freelancers ({radiusKm >= 3000 ? '25' : radiusKm}km)</p>
                    </div>
                    <span className="text-xs font-mono font-bold text-accent-teal">{radiusKm >= 3000 ? '25km' : `${radiusKm}km`}</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setRadiusKm(4000)}
                    className={`p-3 rounded-lg border-2 text-left flex items-center justify-between transition-all cursor-pointer ${
                      radiusKm >= 3000 ? 'border-accent-teal bg-accent-teal/10 text-ink font-bold shadow-retro-sm' : 'border-ink/20 bg-cream text-ink/70 hover:border-ink'
                    }`}
                  >
                    <div>
                      <p className="text-xs font-display font-black uppercase tracking-tight">🇮🇳 Full Country India (Pan-India)</p>
                      <p className="text-[10px] font-sans opacity-80">Open gig to freelancers across all of India</p>
                    </div>
                    <span className="text-[10px] font-mono font-extrabold bg-accent-amber text-ink px-2 py-0.5 rounded border border-ink">ALL INDIA</span>
                  </button>
                </div>

                {radiusKm < 3000 && (
                  <div className="pt-2 flex items-center space-x-3">
                    <input
                      type="range"
                      min="5"
                      max="200"
                      step="5"
                      value={radiusKm}
                      onChange={e => setRadiusKm(Number(e.target.value))}
                      className="flex-grow accent-accent-teal cursor-pointer"
                    />
                    <span className="text-xs font-mono text-accent-teal w-12 font-bold">{radiusKm}km</span>
                  </div>
                )}
              </div>
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold font-display uppercase tracking-widest text-ink pl-1">Budget (₹) *</label>
                <Input required type="number" min="0" value={budget} onChange={e => setBudget(e.target.value)}
                  placeholder="e.g. 5000" className="font-mono"
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold font-display uppercase tracking-widest text-ink pl-1">Budget Type</label>
                <div className="flex space-x-3">
                  {(['fixed', 'hourly'] as const).map(type => (
                    <Button key={type} type="button" onClick={() => setBudgetType(type)}
                      variant={budgetType === type ? 'primary' : 'outline'}
                      className="flex-grow py-2 shadow-none"
                    >
                      {type}
                    </Button>
                  ))}
                </div>
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-[10px] font-bold font-display uppercase tracking-widest text-ink pl-1">Description *</label>
              <textarea required rows={4} value={description} onChange={e => setDescription(e.target.value)}
                placeholder="Describe the work, deliverables, timeline, and any specific requirements..."
                className="w-full px-4 py-2.5 bg-cream border-2 border-ink rounded-lg text-ink text-sm resize-none focus:outline-none focus:bg-accent-amber/10 focus:border-accent-amber font-sans"
              />
            </div>

            <div className="space-y-2">
              <label className="text-[10px] font-bold font-display uppercase tracking-widest text-ink pl-1">Skills Required (press Enter or comma to add)</label>
              <div className="flex flex-wrap gap-2 mb-2">
                {skills.map((s, i) => (
                  <Badge key={i} variant="teal" className="flex items-center space-x-1 shadow-none">
                    <span>{s}</span>
                    <button type="button" onClick={() => setSkills(prev => prev.filter((_, idx) => idx !== i))} className="cursor-pointer">
                      <X className="h-3 w-3 text-ink hover:text-accent-coral" />
                    </button>
                  </Badge>
                ))}
              </div>
              <Input type="text" value={skillInput} onChange={e => setSkillInput(e.target.value)}
                onKeyDown={handleAddSkill}
                placeholder="React.js, Electrician, Figma, etc."
              />
            </div>

            <div className="flex space-x-3 pt-4 border-t-2 border-ink">
              <Button type="submit" disabled={posting} variant="coral">
                {posting ? 'Posting…' : 'Publish Gig'}
              </Button>
              <Button type="button" onClick={() => setShowPostForm(false)} variant="outline">
                Cancel
              </Button>
            </div>
          </form>
        </Card>
      )}

      {/* Gig list */}
      {loading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-7 w-7 text-accent-teal animate-spin" />
        </div>
      ) : gigs.length === 0 ? (
        <div className="text-center py-12 border-2 border-dashed border-ink rounded-xl bg-cream/50 shadow-retro-sm">
          <Tag className="h-8 w-8 mx-auto text-ink/40 mb-2" />
          <h3 className="font-bold font-display text-ink uppercase tracking-tight text-sm mb-1">No Gigs Yet</h3>
          <p className="text-xs text-ink/60 font-sans max-w-xs mx-auto">Post your first gig to start receiving applications from nearby freelancers.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {gigs.map((gig, gIdx) => {
            const cardVariants: Array<'teal' | 'amber' | 'pink' | 'coral'> = ['teal', 'amber', 'pink', 'coral'];
            const currentVariant = cardVariants[gIdx % cardVariants.length];
            return (
              <Card
                key={gig._id} 
                variant={currentVariant}
                className="p-0 overflow-hidden shadow-retro"
              >
                {/* Gig header row */}
                <div
                  className="p-5 flex items-center justify-between cursor-pointer bg-cream border-b-2 border-ink hover:bg-accent-amber/10 transition-colors"
                  onClick={() => handleToggleExpand(gig._id)}
                >
                  <div className="flex items-center space-x-4 min-w-0">
                    <div>
                      <ChevronRight
                        className={`h-4 w-4 text-ink transition-transform duration-300 ${
                          expandedGig === gig._id ? 'rotate-90' : 'rotate-0'
                        }`}
                      />
                    </div>
                    <div className="min-w-0 text-left">
                      <h3 className="font-bold font-display text-ink text-sm uppercase tracking-tight truncate">{gig.title}</h3>
                      <div className="flex items-center space-x-3 mt-1">
                        <span className="text-[10px] font-mono text-ink/60 flex items-center space-x-1">
                          <DollarSign className="h-3 w-3 text-accent-teal" />
                          <span>₹{(gig.finalAgreedAmount ?? gig.budget).toLocaleString()}/{gig.budgetType === 'hourly' ? 'hr' : 'project'}</span>
                        </span>
                        <span className="text-[10px] font-mono text-ink/60 flex items-center space-x-1">
                          <MapPin className="h-3 w-3 text-accent-teal" />
                          <span>{gig.location.city}</span>
                        </span>
                        <span className="text-[10px] font-mono text-ink/60 flex items-center space-x-1">
                          <Users className="h-3 w-3 text-accent-teal" />
                          <span>{gigProposals[gig._id]?.length || gig.applicants?.length || 0} applied</span>
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center space-x-3 flex-shrink-0">
                    <Badge variant="outline" className={`${STATUS_COLORS[gig.status] || STATUS_COLORS.open} shadow-none`}>
                      {gig.status.replace('_', ' ')}
                    </Badge>
                    {gig.escrowStatus !== 'none' && (
                      <Badge variant="amber" className="hidden sm:inline-flex shadow-none">
                        {ESCROW_LABELS[gig.escrowStatus]}
                      </Badge>
                    )}
                    {gig.status === 'in_progress' && (
                      <div className="flex flex-col sm:flex-row items-end sm:items-center gap-2">
                        <span className="text-[9px] font-mono text-ink/60 hidden xl:inline">
                          Review progress before releasing funds:
                        </span>
                        <Link
                          to={`/gigs/${gig._id}`}
                          onClick={e => e.stopPropagation()}
                          className="inline-flex"
                        >
                          <Button
                            variant="outline"
                            size="sm"
                            className="shadow-none py-1.5 bg-cream hover:bg-accent-teal/15 font-display font-bold text-xs"
                          >
                            <ExternalLink className="h-3.5 w-3.5 mr-1 text-accent-teal" />
                            <span>Progress & Milestones</span>
                          </Button>
                        </Link>
                        {gig.escrowStatus === 'funds_deposited' && (
                          <div className="flex space-x-2">
                            <Button
                              onClick={e => { e.stopPropagation(); handleReleaseEscrow(gig._id); }}
                              disabled={!!actionLoading}
                              variant="secondary"
                              size="sm"
                              className="shadow-none py-1.5 font-display font-bold text-xs"
                            >
                              <Banknote className="h-3.5 w-3.5 mr-1" />
                              <span>Release Funds</span>
                            </Button>
                            <Button
                              onClick={e => { e.stopPropagation(); handleRefundEscrow(gig._id); }}
                              disabled={!!actionLoading}
                              variant="coral"
                              size="sm"
                              className="shadow-none py-1.5 font-display font-bold text-xs"
                            >
                              <XCircle className="h-3.5 w-3.5 mr-1" />
                              <span>Refund</span>
                            </Button>
                          </div>
                        )}
                      </div>
                    )}
                    {gig.status === 'open' && (
                      <button
                        onClick={e => { e.stopPropagation(); handleDeleteGig(gig._id); }}
                        disabled={actionLoading === `delete-${gig._id}`}
                        className="text-ink/60 hover:text-accent-coral transition-colors p-1 cursor-pointer"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    )}
                  </div>
                </div>

                {/* Expanded: Proposals */}
                <div className={`grid transition-[grid-template-rows] duration-300 ease-in-out ${expandedGig === gig._id ? 'grid-rows-[1fr]' : 'grid-rows-[0fr]'}`}>
                  <div className="overflow-hidden">
                    <div className="p-5 space-y-4 bg-cream/40 border-t-2 border-ink">
                      <h4 className="text-[10px] font-bold font-display uppercase tracking-widest text-ink mb-4 text-left">
                        Proposals Received ({gigProposals[gig._id]?.length || 0})
                      </h4>
                    {!gigProposals[gig._id] ? (
                      <div className="flex justify-center py-4"><Loader2 className="h-5 w-5 animate-spin text-accent-teal" /></div>
                    ) : gigProposals[gig._id].length === 0 ? (
                      <p className="text-xs text-ink/60 font-sans italic text-left">
                        No proposals yet. Your gig is visible to freelancers {(gig.radiusKm ?? 25) >= 3000 ? 'across all of India (Full Country India)' : `within ${gig.radiusKm ?? 25}km`}.
                      </p>
                    ) : (
                      <div className="space-y-4">
                        {gigProposals[gig._id].map((prop) => (
                          <Card key={prop._id} className="p-4 shadow-retro-sm bg-cream">
                            <div className="flex items-start justify-between gap-4 mb-3">
                              <div className="text-left">
                                <div className="flex items-center gap-2 flex-wrap">
                                  <h5 className="text-sm font-display uppercase tracking-tight">
                                    <Link
                                      to={`/profile/${prop.freelancerId?._id}`}
                                      className="font-bold text-ink hover:text-accent-teal hover:underline transition-colors"
                                    >
                                      {prop.freelancerId?.name || 'Freelancer'}
                                    </Link>
                                  </h5>
                                  {prop.freelancerId?._id && (
                                    <Link to={`/profile/${prop.freelancerId._id}`} onClick={e => e.stopPropagation()}>
                                      <Button
                                        variant="outline"
                                        size="sm"
                                        className="py-0.5 px-2 text-[9px] font-mono font-bold uppercase tracking-wider h-auto border-ink/30 shadow-none bg-cream hover:bg-accent-amber/20"
                                      >
                                        <User className="h-2.5 w-2.5 mr-1 text-accent-teal" />
                                        <span>View Profile</span>
                                      </Button>
                                    </Link>
                                  )}
                                </div>

                                <div className="flex items-center space-x-3 mt-1 text-[10px] font-mono text-ink/60">
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
                              <Badge variant="outline" className={prop.status === 'accepted' ? 'bg-accent-teal' : prop.status === 'rejected' ? 'bg-accent-coral' : 'bg-accent-amber'}>
                                {prop.status}
                              </Badge>
                            </div>

                            <p className="text-xs text-ink font-sans leading-relaxed bg-cream border-2 border-ink rounded-lg p-3 mb-3 text-left">
                              {prop.coverLetter}
                            </p>

                            <div className="flex items-center justify-between mb-3 border-b border-ink/10 pb-3">
                              <span className="text-[10px] font-mono text-ink/55 font-bold uppercase tracking-wider">Direct Candidate</span>
                              <Link to={`/gigs/${prop._id}/chat`} state={{ from: '/client-dashboard?tab=gigs' }} onClick={e => e.stopPropagation()}>
                                <Button
                                  variant="outline"
                                  size="sm"
                                  className="bg-accent-teal/10 hover:bg-accent-teal/25 py-1 px-3 border border-ink shadow-none h-auto font-display text-[10px] uppercase tracking-wider font-bold cursor-pointer flex items-center"
                                >
                                  <MessageSquare className="h-3 w-3 mr-1 text-ink" />
                                  <span>Message Candidate</span>
                                </Button>
                              </Link>
                            </div>

                            {/* Negotiation context */}
                            {prop.status === 'negotiating' && (
                              <p className="text-[10px] font-mono text-accent-teal font-bold mb-3 text-left">
                                Last proposed by {prop.lastProposedBy === 'client' ? 'you' : 'freelancer'}: ₹{prop.bidAmount}
                              </p>
                            )}

                            {/* Action controls */}
                            {gig.status === 'open' && (prop.status === 'pending' || prop.status === 'negotiating') && (
                              <div className="flex flex-col space-y-2 mt-3 pt-3 border-t border-ink/20">
                                <div className="flex space-x-2">
                                  {(prop.status === 'pending' || (prop.status === 'negotiating' && prop.lastProposedBy === 'freelancer')) && (
                                    <Button
                                      onClick={() => handleProposalAction(prop._id, gig._id, 'accepted')}
                                      disabled={!!actionLoading}
                                      variant="secondary"
                                      size="sm"
                                    >
                                      <CheckCircle2 className="h-3.5 w-3.5 mr-1" />
                                      <span>Accept Bid</span>
                                    </Button>
                                  )}
                                  <Button
                                    onClick={() => handleProposalAction(prop._id, gig._id, 'rejected')}
                                    disabled={!!actionLoading}
                                    variant="outline"
                                    size="sm"
                                  >
                                    <XCircle className="h-3.5 w-3.5 mr-1" />
                                    <span>Reject</span>
                                  </Button>
                                </div>

                              {/* Counter Offer Input */}
                              <div className="flex items-center space-x-2 pt-2">
                                <Input
                                  type="number"
                                  placeholder="Counter offer (₹)..."
                                  value={counterOffers[prop._id] || ''}
                                  onChange={e => setCounterOffers(prev => ({ ...prev, [prop._id]: e.target.value }))}
                                  className="w-40 px-2.5 py-1 text-xs"
                                />
                                <Button
                                  onClick={() => {
                                    const val = counterOffers[prop._id];
                                    if (val) handleProposalAction(prop._id, gig._id, 'negotiate', Number(val));
                                  }}
                                  disabled={!!actionLoading || !counterOffers[prop._id]}
                                  variant="primary"
                                  size="sm"
                                  className="py-1"
                                >
                                  Counter Offer
                                </Button>
                              </div>
                            </div>
                          )}

                          {/* Escrow payment trigger */}
                          {prop.status === 'accepted' && gig.status === 'open' && gig.escrowStatus === 'none' && (
                            <div className="mt-3 pt-3 border-t border-ink/20 text-left">
                              <p className="text-[10px] font-mono text-ink/60 mb-2">Proposal accepted. Fund the escrow to launch project:</p>
                              <Button
                                onClick={() => handleFundEscrow(prop)}
                                disabled={!!actionLoading}
                                variant="coral"
                              >
                                <Banknote className="h-4 w-4 mr-1.5" />
                                <span>Pay & Fund Escrow (₹{prop.bidAmount})</span>
                              </Button>
                            </div>
                          )}
                        </Card>
                      ))}
                    </div>
                  )}

                  {/* AI recommendations section */}
                  {gig.status === 'open' && (
                    <div className="mt-6 pt-6 border-t-2 border-dashed border-ink/30 text-left">
                      <h4 className="text-[10px] font-bold font-display uppercase tracking-widest text-accent-teal mb-3 flex items-center space-x-1.5">
                        <Users className="h-3.5 w-3.5" />
                        <span>AI-Recommended Candidates (Smart Match)</span>
                      </h4>
                      {recLoading[gig._id] ? (
                        <div className="flex items-center space-x-2 py-2 text-xs text-ink/60 font-sans">
                          <Loader2 className="h-4 w-4 animate-spin text-accent-teal" />
                          <span>Finding matches...</span>
                        </div>
                      ) : !recommendations[gig._id] || recommendations[gig._id].length === 0 ? (
                        <p className="text-xs text-ink/60 font-sans italic">No top recommendation matches found within your parameters.</p>
                      ) : (
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                          {recommendations[gig._id].map((rec) => (
                            <Card key={rec.freelancer._id} className="p-3 flex flex-col justify-between shadow-retro-sm">
                              <div>
                                <div className="flex items-center justify-between">
                                  <Link to={`/profile/${rec.freelancer._id}`} className="font-bold text-xs uppercase font-display text-ink hover:text-accent-teal hover:underline">
                                    {rec.freelancer.name}
                                  </Link>
                                  <Badge variant="teal" className="text-[8px] font-mono shadow-none">
                                    Score: {Math.round(rec.finalScore * 100)}%
                                  </Badge>
                                </div>
                                <p className="text-[9px] font-mono text-ink/60 mt-1">
                                  Rating: {rec.freelancer.rating?.toFixed(1) || '—'} ★ ({rec.freelancer.reviewCount || 0} reviews)
                                </p>
                                <p className="text-[9px] font-mono text-ink/60">
                                  Distance: {rec.scores.distanceKm} km away
                                </p>
                                <div className="flex flex-wrap gap-1 mt-2">
                                  {rec.freelancer.skills.map((s: any) => (
                                    <Badge key={s.name} variant="outline" className="text-[7px] px-1 py-0.2 shadow-none border border-ink/40">
                                      {s.name}
                                    </Badge>
                                  ))}
                                </div>
                              </div>
                              <div className="mt-3 pt-2 border-t border-ink/10 flex items-center justify-between">
                                <span className="text-[10px] font-mono font-bold text-ink">
                                  {rec.freelancer.hourlyRate ? `₹${rec.freelancer.hourlyRate}/hr` : 'No Rate'}
                                </span>
                                <Link
                                  to={`/profile/${rec.freelancer._id}`}
                                  className="text-[9px] font-bold font-display uppercase tracking-wider text-accent-teal hover:underline"
                                >
                                  View Profile →
                                </Link>
                              </div>
                            </Card>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </div>
          </Card>
          );
        })}
        </div>
      )}
    </div>
  );
};
