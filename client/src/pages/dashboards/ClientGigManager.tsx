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
      await api.put(`/gigs/${gigId}/release`);
      setMessage({ type: 'success', text: 'Funds released! Gig marked as completed.' });
      fetchGigs();
    } catch (err: any) {
      setMessage({ type: 'error', text: err.response?.data?.message || 'Could not release escrow.' });
    } finally {
      setActionLoading(null);
    }
  };

  return (
    <div className="space-y-6">

      {/* Header */}
      <div className="flex items-center justify-between border-b border-line-gray pb-4">
        <div>
          <span className="text-[10px] font-mono text-slate uppercase tracking-widest block">Active Station</span>
          <h2 className="text-lg font-black font-display text-ink uppercase tracking-tight">Gig Manager</h2>
        </div>
        <button
          onClick={() => setShowPostForm(f => !f)}
          className="flex items-center space-x-1.5 px-4 py-2 rounded-sm bg-signal-coral hover:bg-signal-coral/90 text-white text-xs font-bold font-display uppercase tracking-widest transition-colors"
        >
          <Plus className="h-4 w-4" />
          <span>Post Gig</span>
        </button>
      </div>

      {/* Alert banner */}
      {message && (
        <div className={`p-3 rounded-sm border-l-4 text-xs flex items-center space-x-2 ${
          message.type === 'success' ? 'border-l-route-teal bg-route-teal/5 text-ink' : 'border-l-signal-coral bg-signal-coral/5 text-ink'
        }`}>
          {message.type === 'success' ? <CheckCircle2 className="h-4 w-4 text-route-teal flex-shrink-0" /> : <XCircle className="h-4 w-4 text-signal-coral flex-shrink-0" />}
          <span className="flex-grow">{message.text}</span>
          <button onClick={() => setMessage(null)}><X className="h-3.5 w-3.5 text-slate hover:text-ink" /></button>
        </div>
      )}

      {/* Post New Gig Form */}
      {showPostForm && (
        <div className="bg-white border border-line-gray rounded-sm p-6">
          <h3 className="text-xs font-bold font-display text-ink uppercase tracking-widest mb-6">Post a New Gig</h3>
          <form onSubmit={handlePostGig} className="space-y-5">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5 sm:col-span-2">
                <label className="text-[10px] font-bold font-display uppercase tracking-widest text-ink">Gig Title *</label>
                <input required value={title} onChange={e => setTitle(e.target.value)}
                  placeholder="e.g. Need a React developer for dashboard rebuild"
                  className="w-full px-4 py-2.5 rounded-sm bg-paper/30 border border-line-gray text-ink text-sm focus:outline-none focus:border-route-teal font-sans"
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold font-display uppercase tracking-widest text-ink">Category *</label>
                <select required value={category} onChange={e => setCategory(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-sm bg-paper/30 border border-line-gray text-ink text-sm focus:outline-none focus:border-route-teal font-sans"
                >
                  {GIG_CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold font-display uppercase tracking-widest text-ink">Search Radius</label>
                <div className="flex items-center space-x-3">
                  <input type="range" min="5" max="200" step="5" value={radiusKm}
                    onChange={e => setRadiusKm(Number(e.target.value))} className="flex-grow accent-route-teal" />
                  <span className="text-xs font-mono text-route-teal w-12">{radiusKm}km</span>
                </div>
              </div>
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold font-display uppercase tracking-widest text-ink">Budget (₹) *</label>
                <input required type="number" min="0" value={budget} onChange={e => setBudget(e.target.value)}
                  placeholder="e.g. 5000"
                  className="w-full px-4 py-2.5 rounded-sm bg-paper/30 border border-line-gray text-ink text-sm focus:outline-none focus:border-route-teal font-mono"
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold font-display uppercase tracking-widest text-ink">Budget Type</label>
                <div className="flex space-x-3">
                  {(['fixed', 'hourly'] as const).map(type => (
                    <button key={type} type="button" onClick={() => setBudgetType(type)}
                      className={`flex-1 py-2.5 rounded-sm border text-xs font-bold font-display uppercase tracking-widest transition-colors ${
                        budgetType === type ? 'border-route-teal text-route-teal bg-route-teal/5' : 'border-line-gray text-slate hover:border-slate'
                      }`}>
                      {type}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-[10px] font-bold font-display uppercase tracking-widest text-ink">Description *</label>
              <textarea required rows={4} value={description} onChange={e => setDescription(e.target.value)}
                placeholder="Describe the work, deliverables, timeline, and any specific requirements..."
                className="w-full px-4 py-2.5 rounded-sm bg-paper/30 border border-line-gray text-ink text-sm resize-none focus:outline-none focus:border-route-teal font-sans"
              />
            </div>

            <div className="space-y-2">
              <label className="text-[10px] font-bold font-display uppercase tracking-widest text-ink">Skills Required (press Enter or comma to add)</label>
              <div className="flex flex-wrap gap-2 mb-2">
                {skills.map((s, i) => (
                  <span key={i} className="inline-flex items-center space-x-1.5 px-2.5 py-1 rounded-sm bg-paper border border-line-gray text-xs font-mono text-ink">
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
                className="w-full px-4 py-2.5 rounded-sm bg-paper/30 border border-line-gray text-ink text-sm focus:outline-none focus:border-route-teal font-sans"
              />
            </div>

            <div className="flex space-x-3 pt-4 border-t border-line-gray">
              <button type="submit" disabled={posting}
                className="px-6 py-2.5 rounded-sm bg-signal-coral hover:bg-signal-coral/90 text-white text-xs font-bold font-display uppercase tracking-widest disabled:opacity-50 transition-colors"
              >
                {posting ? 'Posting…' : 'Publish Gig'}
              </button>
              <button type="button" onClick={() => setShowPostForm(false)}
                className="px-6 py-2.5 rounded-sm border border-line-gray text-slate text-xs font-bold font-display uppercase tracking-widest hover:bg-paper/30 transition-colors"
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
        <div className="text-center py-12 border border-dashed border-line-gray rounded-sm">
          <Tag className="h-8 w-8 mx-auto text-slate mb-2" />
          <h3 className="font-bold font-display text-ink uppercase tracking-tight text-sm mb-1">No Gigs Yet</h3>
          <p className="text-xs text-slate font-sans max-w-xs mx-auto">Post your first gig to start receiving applications from nearby freelancers.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {gigs.map(gig => (
            <div key={gig._id} className="bg-white border border-line-gray rounded-sm overflow-hidden">
              {/* Gig header row */}
              <div
                className="p-5 flex items-center justify-between cursor-pointer hover:bg-paper/30 transition-colors"
                onClick={() => setExpandedGig(expandedGig === gig._id ? null : gig._id)}
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
                        <DollarSign className="h-3 w-3" />
                        <span>₹{gig.budget.toLocaleString()}/{gig.budgetType === 'hourly' ? 'hr' : 'project'}</span>
                      </span>
                      <span className="text-[10px] font-mono text-slate flex items-center space-x-1">
                        <MapPin className="h-3 w-3" />
                        <span>{gig.location.city}</span>
                      </span>
                      <span className="text-[10px] font-mono text-slate flex items-center space-x-1">
                        <Users className="h-3 w-3" />
                        <span>{gig.applicants.length} applied</span>
                      </span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center space-x-3 flex-shrink-0">
                  <span className={`px-2.5 py-1 rounded-sm border text-[10px] font-bold font-display uppercase tracking-wider ${STATUS_COLORS[gig.status] || STATUS_COLORS.open}`}>
                    {gig.status.replace('_', ' ')}
                  </span>
                  {gig.escrowStatus !== 'none' && (
                    <span className="text-[10px] font-mono text-transit-gold hidden sm:block">
                      {ESCROW_LABELS[gig.escrowStatus]}
                    </span>
                  )}
                  {gig.status === 'in_progress' && gig.escrowStatus === 'funds_deposited' && (
                    <button
                      onClick={e => { e.stopPropagation(); handleReleaseEscrow(gig._id); }}
                      disabled={actionLoading === `release-${gig._id}`}
                      className="flex items-center space-x-1 px-2.5 py-1 rounded-sm bg-route-teal text-white text-[10px] font-bold font-display uppercase tracking-wider hover:bg-route-teal/90 disabled:opacity-50"
                    >
                      <Banknote className="h-3 w-3" />
                      <span>Release Funds</span>
                    </button>
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

              {/* Expanded: Applicants */}
              {expandedGig === gig._id && (
                <div className="border-t border-line-gray px-5 py-4 bg-paper/20">
                  <h4 className="text-[10px] font-bold font-display uppercase tracking-widest text-ink mb-4">
                    Applicants ({gig.applicants.length})
                  </h4>
                  {gig.applicants.length === 0 ? (
                    <p className="text-xs text-slate font-sans italic">No applications yet. Your gig is visible to freelancers within {(gig as any).radiusKm || 25}km.</p>
                  ) : (
                    <div className="space-y-4">
                      {gig.applicants.map(app => (
                        <div key={app._id} className="bg-white border border-line-gray rounded-sm p-4">
                          <div className="flex items-start justify-between gap-4 mb-3">
                            <div>
                              <h5 className="text-sm font-display uppercase tracking-tight">
                                <Link
                                  to={`/profile/${app.freelancerId?._id}`}
                                  className="font-bold text-ink hover:text-route-teal hover:underline transition-colors"
                                >
                                  {app.freelancerId?.name || 'Freelancer'}
                                </Link>
                              </h5>

                              <div className="flex items-center space-x-3 mt-1 text-[10px] font-mono text-slate">
                                {app.freelancerId?.hourlyRate && (
                                  <span>₹{app.freelancerId.hourlyRate}/hr</span>
                                )}
                                {app.freelancerId?.rating && (
                                  <span>{app.freelancerId.rating.toFixed(1)} ★</span>
                                )}
                                {app.freelancerId?.location?.city && (
                                  <span className="flex items-center space-x-0.5">
                                    <MapPin className="h-2.5 w-2.5" />
                                    <span>{app.freelancerId.location.city}</span>
                                  </span>
                                )}
                              </div>
                            </div>
                            <span className={`px-2 py-1 rounded-sm border text-[10px] font-bold font-mono uppercase ${
                              app.status === 'accepted' ? 'bg-route-teal/10 text-route-teal border-route-teal/25' :
                              app.status === 'rejected' ? 'bg-signal-coral/10 text-signal-coral border-signal-coral/25' :
                              'bg-transit-gold/10 text-transit-gold border-transit-gold/25'
                            }`}>
                              {app.status}
                            </span>
                          </div>

                          {/* Cover message */}
                          <p className="text-xs text-ink font-sans leading-relaxed bg-paper/50 border border-line-gray p-3 rounded-sm mb-3">
                            {app.message}
                          </p>

                          {/* Freelancer skills */}
                          {app.freelancerId?.skills?.length > 0 && (
                            <div className="flex flex-wrap gap-1.5 mb-3">
                              {app.freelancerId.skills.slice(0, 5).map((s, i) => (
                                <span key={i} className="px-2 py-0.5 rounded-sm bg-paper border border-line-gray text-[9px] font-mono text-slate uppercase">
                                  {s.name}
                                </span>
                              ))}
                            </div>
                          )}

                          {/* Action buttons */}
                          {app.status === 'pending' && gig.status === 'open' && (
                            <div className="flex space-x-2">
                              <button
                                onClick={() => handleApplicantAction(gig._id, app._id, 'accepted')}
                                disabled={!!actionLoading}
                                className="flex items-center space-x-1.5 px-3 py-1.5 rounded-sm bg-route-teal hover:bg-route-teal/90 text-white text-xs font-bold font-display uppercase tracking-wider disabled:opacity-50"
                              >
                                <CheckCircle2 className="h-3.5 w-3.5" />
                                <span>Accept</span>
                              </button>
                              <button
                                onClick={() => handleApplicantAction(gig._id, app._id, 'rejected')}
                                disabled={!!actionLoading}
                                className="flex items-center space-x-1.5 px-3 py-1.5 rounded-sm bg-paper hover:bg-line-gray border border-line-gray text-slate text-xs font-bold font-display uppercase tracking-wider disabled:opacity-50"
                              >
                                <XCircle className="h-3.5 w-3.5" />
                                <span>Reject</span>
                              </button>
                            </div>
                          )}
                        </div>
                      ))}
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
