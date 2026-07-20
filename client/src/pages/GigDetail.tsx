import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import api from '../utils/api';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Badge } from '../components/ui/Badge';
import {
  MapPin, DollarSign, Tag, Users, Star,
  Building, ArrowLeft, CheckCircle2, AlertCircle, Loader2, Send, MessageSquare, PenLine,
} from 'lucide-react';

interface IGigDetail {
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
  milestones?: Array<{
    _id: string;
    title: string;
    description: string;
    status: 'pending' | 'completed';
    fileUrl?: string;
    dueDate?: string;
    completedAt?: string;
  }>;
  progressLogs?: Array<{
    _id: string;
    message: string;
    createdAt: string;
  }>;
}

export const GigDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();

  const [gig, setGig] = useState<IGigDetail | null>(null);
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

  const [draftingAI, setDraftingAI] = useState(false);

  const handleAIDraft = async () => {
    setDraftingAI(true);
    try {
      const res = await api.post('/ai/draft-proposal', { gigId: id });
      if (res.data.success) {
        setMessage(res.data.coverLetter);
      }
    } catch (err: any) {
      console.error(err);
      alert('Failed to draft cover letter: ' + (err.response?.data?.message || 'Server error'));
    } finally {
      setDraftingAI(false);
    }
  };

  // Milestone Progress Tracker States
  const [newMilestones, setNewMilestones] = useState([{ title: '', description: '', dueDate: '' }]);
  const [progressLogMsg, setProgressLogMsg] = useState('');
  const [submittingMilestones, setSubmittingMilestones] = useState(false);
  const [submittingLog, setSubmittingLog] = useState(false);
  const [completingMilestoneId, setCompletingMilestoneId] = useState<string | null>(null);
  const [deliverableFile, setDeliverableFile] = useState<File | null>(null);

  const handleSaveMilestones = async () => {
    if (newMilestones.some(m => !m.title || !m.description)) {
      alert('Please fill out all milestone fields.');
      return;
    }
    setSubmittingMilestones(true);
    try {
      const res = await api.post(`/gigs/${id}/milestones`, { milestones: newMilestones });
      if (res.data.success) {
        await loadData();
      }
    } catch (err: any) {
      alert(err.response?.data?.message || 'Failed to save milestones.');
    } finally {
      setSubmittingMilestones(false);
    }
  };

  const handleCompleteMilestone = async (milestoneId: string) => {
    setCompletingMilestoneId(milestoneId);
    try {
      const formData = new FormData();
      if (deliverableFile) {
        formData.append('deliverable', deliverableFile);
      }
      const res = await api.put(`/gigs/${id}/milestones/${milestoneId}`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      if (res.data.success) {
        setDeliverableFile(null);
        await loadData();
      }
    } catch (err: any) {
      alert(err.response?.data?.message || 'Failed to complete milestone.');
    } finally {
      setCompletingMilestoneId(null);
    }
  };

  const handlePostProgressLog = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!progressLogMsg.trim()) return;
    setSubmittingLog(true);
    try {
      const res = await api.post(`/gigs/${id}/progress-logs`, { message: progressLogMsg.trim() });
      if (res.data.success) {
        setProgressLogMsg('');
        await loadData();
      }
    } catch (err: any) {
      alert(err.response?.data?.message || 'Failed to submit log entry.');
    } finally {
      setSubmittingLog(false);
    }
  };

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

    if (disputeFile) {
      const allowedTypes = ['image/jpeg', 'image/png', 'application/pdf'];
      if (!allowedTypes.includes(disputeFile.type)) {
        setDisputeMsg({ type: 'error', text: 'Only PDF, JPG, or PNG files are allowed as evidence.' });
        return;
      }
      if (disputeFile.size > 5 * 1024 * 1024) {
        setDisputeMsg({ type: 'error', text: 'Evidence file size must be less than 5MB.' });
        return;
      }
    }

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
      <div className="flex-grow bg-cream flex items-center justify-center min-h-[50vh]">
        <Loader2 className="h-8 w-8 text-accent-teal animate-spin" />
      </div>
    );
  }

  if (error || !gig) {
    return (
      <div className="flex-grow bg-cream flex flex-col items-center justify-center space-y-3 min-h-[50vh] text-center px-4">
        <AlertCircle className="h-8 w-8 text-accent-coral" />
        <p className="text-sm font-sans text-ink">{error || 'Gig not found'}</p>
        <button onClick={() => navigate('/gigs')} className="text-xs text-accent-teal hover:underline font-bold cursor-pointer">
          ← Back to Browse
        </button>
      </div>
    );
  }

  const statusColors: Record<string, string> = {
    open: 'bg-accent-teal text-ink border-ink',
    in_progress: 'bg-accent-amber text-ink border-ink',
    completed: 'bg-cream text-ink border-ink',
    cancelled: 'bg-accent-coral text-ink border-ink',
  };

  const escrowColors: Record<string, string> = {
    none: 'bg-cream text-ink/60 border-ink/30',
    funds_deposited: 'bg-accent-amber text-ink border-ink',
    released: 'bg-accent-teal text-ink border-ink',
    refunded: 'bg-accent-coral text-ink border-ink',
  };

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8 flex-grow bg-cream font-sans transition-colors duration-200">

      {/* Back button */}
      <div className="text-left">
        <button
          onClick={() => navigate('/gigs')}
          className="inline-flex items-center space-x-1.5 text-xs text-ink/60 hover:text-ink transition-colors mb-6 font-bold font-display uppercase tracking-wider cursor-pointer"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          <span>Browse Gigs</span>
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">

        {/* ── Left: Main detail ─────────────────────────────────────────── */}
        <div className="lg:col-span-2 space-y-6">

          {/* Header */}
          <Card className="text-left">
            <div className="flex items-start justify-between gap-4 mb-4">
              <Badge variant="outline" className={`${statusColors[gig.status] || statusColors.open} shadow-none`}>
                {gig.status.replace('_', ' ')}
              </Badge>
              <Badge variant="outline" className={`${escrowColors[gig.escrowStatus]} shadow-none`}>
                ESCROW: {gig.escrowStatus.replace('_', ' ')}
              </Badge>
            </div>

            <h1 className="text-xl font-black font-display text-ink uppercase tracking-tight leading-tight mb-2">
              {gig.title}
            </h1>

            <div className="flex flex-wrap items-center gap-4 font-mono text-xs text-ink/60">
              <span className="flex items-center space-x-1.5">
                <Tag className="h-3.5 w-3.5 text-accent-teal" />
                <span>{gig.category}</span>
              </span>
              <span className="flex items-center space-x-1.5">
                <MapPin className="h-3.5 w-3.5 text-accent-teal" />
                <span className="font-bold text-ink">{gig.location.city} · {gig.radiusKm}KM RADIUS</span>
              </span>
              <span className="flex items-center space-x-1.5">
                <Users className="h-3.5 w-3.5 text-accent-teal" />
                <span className="font-bold text-ink">{gig.applicants.length} APPLICANTS</span>
              </span>
            </div>
          </Card>

          {/* Description */}
          <Card className="text-left">
            <h2 className="text-xs font-bold font-display text-ink uppercase tracking-widest mb-4">Project Description</h2>
            <p className="text-sm text-ink leading-relaxed whitespace-pre-wrap font-sans">{gig.description}</p>
          </Card>

          {/* Skills Required */}
          {gig.skillsRequired.length > 0 && (
            <Card className="text-left">
              <h2 className="text-xs font-bold font-display text-ink uppercase tracking-widest mb-4">Skills Required</h2>
              <div className="flex flex-wrap gap-2">
                {gig.skillsRequired.map((skill, i) => (
                  <Badge key={i} variant="outline" className="text-xs font-mono bg-cream border-ink/40 shadow-none">
                    {skill}
                  </Badge>
                ))}
              </div>
            </Card>
          )}

          {/* Apply section — only for freelancers on open gigs */}
          {user?.role === 'freelancer' && gig.status === 'open' && (
            <Card className="text-left">
              <h2 className="text-xs font-bold font-display text-ink uppercase tracking-widest mb-4">
                {proposal ? 'Your Proposal Bid' : 'Submit Proposal Bid'}
              </h2>

              {applyMsg && (
                <div className={`p-3 border-2 border-ink text-xs flex items-center space-x-2 rounded-lg mb-3 ${
                  applyMsg.type === 'success' ? 'border-l-4 border-l-accent-teal bg-cream text-ink' : 'border-l-4 border-l-accent-coral bg-cream text-ink'
                }`}>
                  {applyMsg.type === 'success' ? <CheckCircle2 className="h-4 w-4 text-accent-teal flex-shrink-0" /> : <AlertCircle className="h-4 w-4 text-accent-coral flex-shrink-0" />}
                  <span>{applyMsg.text}</span>
                </div>
              )}

              {proposal ? (
                <div className="space-y-4 font-sans text-xs">
                  <div className="flex flex-wrap items-center gap-3">
                    <Badge variant="outline" className={proposal.status === 'accepted' ? 'bg-accent-teal' : proposal.status === 'rejected' ? 'bg-accent-coral' : 'bg-accent-amber'}>
                      Status: {proposal.status.toUpperCase()}
                    </Badge>
                    <span className="font-mono text-ink font-bold">Bid Amount: ₹{proposal.bidAmount}</span>
                    <span className="font-mono text-ink font-bold">Timeline: {proposal.completionTime} days</span>
                  </div>

                  <p className="text-xs text-ink font-sans border-2 border-ink p-3 rounded-lg bg-cream/50 leading-relaxed font-bold">
                    <strong>Cover Letter:</strong> {proposal.coverLetter}
                  </p>

                  {/* Client Counter Offer Response UI */}
                  {proposal.status === 'negotiating' && proposal.lastProposedBy === 'client' && (
                    <div className="border-t border-ink/20 pt-3 mt-3 space-y-3 bg-accent-teal/5 p-3 rounded-lg border-2">
                      <p className="font-mono text-accent-teal font-bold">
                        Client countered with an offer of: <strong>₹{proposal.bidAmount}</strong>
                      </p>
                      <div className="flex space-x-2">
                        <Button
                          onClick={() => handleProposalResponse('accepted')}
                          disabled={applying}
                          variant="secondary"
                          size="sm"
                        >
                          Accept Offer
                        </Button>
                        <Button
                          onClick={() => handleProposalResponse('rejected')}
                          disabled={applying}
                          variant="outline"
                          size="sm"
                        >
                          Reject Offer
                        </Button>
                      </div>

                      {/* Counter Back */}
                      <div className="flex items-center space-x-2 pt-1">
                        <Input
                          type="number"
                          placeholder="Counter back (₹)..."
                          value={counterInput}
                          onChange={e => setCounterInput(e.target.value)}
                          className="px-2 py-1 text-xs font-mono w-36"
                        />
                        <Button
                          onClick={() => {
                            if (counterInput) handleProposalResponse('negotiate', Number(counterInput));
                          }}
                          disabled={applying || !counterInput}
                          variant="primary"
                          size="sm"
                          className="py-1"
                        >
                          Counter Offer
                        </Button>
                      </div>
                    </div>
                  )}

                  {proposal.status === 'negotiating' && proposal.lastProposedBy === 'freelancer' && (
                    <p className="font-mono text-ink/60 italic">
                      Waiting for client response on your counter offer of ₹{proposal.bidAmount}...
                    </p>
                  )}
                </div>
              ) : (
                <form onSubmit={handleApply} className="space-y-4 font-sans">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-bold font-display uppercase tracking-widest text-ink block pl-1">Bid Price (₹) *</label>
                      <Input
                        required
                        type="number"
                        min="0"
                        placeholder="e.g. 4500"
                        value={bidAmount}
                        onChange={e => setBidAmount(e.target.value)}
                        className="font-mono"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-bold font-display uppercase tracking-widest text-ink block pl-1">Estimated Days *</label>
                      <Input
                        required
                        type="number"
                        min="1"
                        placeholder="e.g. 5"
                        value={completionTime}
                        onChange={e => setCompletionTime(e.target.value)}
                        className="font-mono"
                      />
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between pl-1">
                      <label className="text-[10px] font-bold font-display uppercase tracking-widest text-ink">Cover Letter *</label>
                      <button
                        type="button"
                        onClick={handleAIDraft}
                        disabled={draftingAI}
                        className="text-[9px] font-mono text-accent-teal hover:underline uppercase tracking-wider flex items-center space-x-1 disabled:opacity-50 cursor-pointer"
                      >
                        {draftingAI ? (
                          <>
                            <Loader2 className="h-3 w-3 animate-spin" />
                            <span>Drafting...</span>
                          </>
                        ) : (
                          <span>✨ AI Draft Letter</span>
                        )}
                      </button>
                    </div>
                    <textarea
                      required
                      rows={4}
                      value={message}
                      onChange={e => setMessage(e.target.value)}
                      placeholder="Explain your approach, why you're suited for this job..."
                      className="w-full px-4 py-3 bg-cream border-2 border-ink rounded-lg text-ink text-xs font-sans resize-none focus:outline-none focus:bg-accent-amber/10 focus:border-accent-amber"
                    />
                  </div>

                  <Button
                    type="submit"
                    disabled={applying || !message.trim() || !bidAmount || !completionTime}
                    variant="coral"
                  >
                    <Send className="h-3.5 w-3.5 mr-1" />
                    <span>{applying ? 'Submitting…' : 'Submit Proposal'}</span>
                  </Button>
                </form>
              )}
            </Card>
          )}

          {/* Progress Tracking Section */}
          {(gig.status === 'in_progress' || gig.status === 'completed') && (
            <div className="space-y-6">
              
              {/* 1. Progress Bar Card */}
              <Card className="text-left">
                <div className="flex items-center justify-between mb-2">
                  <h2 className="text-xs font-bold font-display text-ink uppercase tracking-widest">Project Progress</h2>
                  <span className="font-mono text-xs font-bold text-ink">
                    {(() => {
                      const completedCount = gig.milestones?.filter((m: any) => m.status === 'completed').length || 0;
                      const totalCount = gig.milestones?.length || 0;
                      return totalCount > 0 ? `${Math.round((completedCount / totalCount) * 100)}%` : '0%';
                    })()}
                  </span>
                </div>
                <div className="w-full bg-cream border-2 border-ink h-4 rounded-full overflow-hidden shadow-retro-sm">
                  <div
                    className="bg-accent-teal h-full transition-all duration-500"
                    style={{
                      width: `${(() => {
                        const completedCount = gig.milestones?.filter((m: any) => m.status === 'completed').length || 0;
                        const totalCount = gig.milestones?.length || 0;
                        return totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0;
                      })()}%`
                    }}
                  />
                </div>
              </Card>

              {/* 2. Milestones Card */}
              <Card className="text-left">
                <h2 className="text-xs font-bold font-display text-ink uppercase tracking-widest mb-4">Milestones Tracker</h2>
                
                {(!gig.milestones || gig.milestones.length === 0) ? (
                  /* 0 Milestones Setup Interface */
                  <div className="space-y-4 font-sans text-xs">
                    <p className="text-xs text-ink/60 pl-1 italic">No milestones defined yet for this gig.</p>
                    {(user?._id === gig.clientId?._id || user?._id === gig.acceptedFreelancerId) && (
                      <div className="border border-dashed border-ink p-4 bg-cream/50 rounded-xl space-y-4">
                        <span className="text-[10px] font-mono font-bold text-ink uppercase tracking-wider block text-left">Set milestones checklist</span>
                        
                        {newMilestones.map((m, idx) => (
                          <div key={idx} className="space-y-2 border-b border-ink/10 pb-3 last:border-0 last:pb-0">
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                              <Input
                                type="text"
                                placeholder="Milestone Title"
                                required
                                value={m.title}
                                onChange={e => {
                                  const updated = [...newMilestones];
                                  updated[idx].title = e.target.value;
                                  setNewMilestones(updated);
                                }}
                                className="py-1.5 text-xs"
                              />
                              <Input
                                type="date"
                                value={m.dueDate}
                                onChange={e => {
                                  const updated = [...newMilestones];
                                  updated[idx].dueDate = e.target.value;
                                  setNewMilestones(updated);
                                }}
                                className="py-1.5 text-xs font-mono"
                              />
                            </div>
                            <textarea
                              placeholder="Milestone Description / Deliverable detail"
                              required
                              rows={2}
                              value={m.description}
                              onChange={e => {
                                  const updated = [...newMilestones];
                                  updated[idx].description = e.target.value;
                                  setNewMilestones(updated);
                              }}
                              className="w-full px-3 py-1.5 bg-cream border-2 border-ink rounded-lg text-xs resize-none focus:outline-none focus:bg-accent-amber/10 focus:border-accent-amber"
                            />
                            {newMilestones.length > 1 && (
                              <button
                                type="button"
                                onClick={() => setNewMilestones(newMilestones.filter((_: any, i: number) => i !== idx))}
                                className="text-[9px] font-mono text-accent-coral hover:underline uppercase cursor-pointer"
                              >
                                Remove
                              </button>
                            )}
                          </div>
                        ))}

                        <div className="flex space-x-2 pt-2">
                          <Button
                            type="button"
                            onClick={() => setNewMilestones([...newMilestones, { title: '', description: '', dueDate: '' }])}
                            variant="outline"
                            size="sm"
                          >
                            + Add Item
                          </Button>
                          <Button
                            type="button"
                            onClick={handleSaveMilestones}
                            disabled={submittingMilestones}
                            variant="secondary"
                            size="sm"
                          >
                            {submittingMilestones ? 'Saving...' : 'Lock Checklist'}
                          </Button>
                        </div>
                      </div>
                    )}
                  </div>
                ) : (
                  /* Render List */
                  <div className="space-y-4 font-sans text-xs">
                    {gig.milestones.map((m: any) => (
                      <div key={m._id} className="border-2 border-ink p-4 bg-cream rounded-xl flex flex-col sm:flex-row sm:items-start justify-between gap-4 shadow-retro-sm">
                        <div className="space-y-1 text-left">
                          <div className="flex items-center space-x-2">
                            <Badge variant="outline" className={`${
                              m.status === 'completed' ? 'bg-accent-teal' : 'bg-accent-amber'
                            } shadow-none font-mono text-[8px]`}>
                              {m.status}
                            </Badge>
                            <span className="font-bold text-ink uppercase tracking-tight text-xs font-display">{m.title}</span>
                          </div>
                          <p className="text-ink/70 text-xs mt-1 font-sans">{m.description}</p>
                          {m.dueDate && (
                            <p className="text-[10px] font-mono text-ink/60 mt-1.5">
                              Due Date: {new Date(m.dueDate).toLocaleDateString('en-IN')}
                            </p>
                          )}
                          {m.completedAt && (
                            <p className="text-[10px] font-mono text-accent-teal font-bold">
                              Completed: {new Date(m.completedAt).toLocaleDateString('en-IN')}
                            </p>
                          )}
                          {m.fileUrl && (
                            <div className="pt-2">
                              <a
                                href={m.fileUrl.startsWith('http') ? m.fileUrl : `${api.defaults.baseURL?.replace('/api', '')}${m.fileUrl}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-block text-[10px] font-mono text-accent-teal hover:underline font-bold uppercase"
                              >
                                View Submitted Deliverable 📥
                              </a>
                            </div>
                          )}
                        </div>

                        {/* Complete action block for assigned freelancer */}
                        {user?._id === gig.acceptedFreelancerId && m.status === 'pending' && (
                          <div className="flex flex-col items-stretch space-y-2 border-t sm:border-t-0 sm:border-l border-ink/10 pt-3 sm:pt-0 sm:pl-4 min-w-[160px] text-left">
                            <label className="text-[9px] font-mono font-bold text-ink/60">Attach Deliverable (PDF/Image)</label>
                            <input
                              type="file"
                              accept="image/*,application/pdf"
                              onChange={e => {
                                if (e.target.files?.[0]) {
                                  setDeliverableFile(e.target.files[0]);
                                }
                              }}
                              className="text-[9px] w-full text-ink/60"
                            />
                            <Button
                              type="button"
                              onClick={() => handleCompleteMilestone(m._id)}
                              disabled={completingMilestoneId === m._id}
                              variant="secondary"
                              size="sm"
                              className="w-full"
                            >
                              {completingMilestoneId === m._id ? 'Submitting...' : 'Mark Completed'}
                            </Button>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </Card>

              {/* 3. Progress Log / Message timeline */}
              <Card className="text-left">
                <h2 className="text-xs font-bold font-display text-ink uppercase tracking-widest mb-4">Project Logs</h2>
                
                {/* Scrolling Logs */}
                <div className="border-2 border-ink p-3 bg-cream/50 max-h-48 overflow-y-auto space-y-2 font-mono text-[10px] text-ink rounded-lg mb-4 text-left shadow-retro-sm">
                  {(!gig.progressLogs || gig.progressLogs.length === 0) ? (
                    <p className="italic text-ink/60">No logs recorded yet.</p>
                  ) : (
                    gig.progressLogs.map((log: any) => (
                      <div key={log._id} className="border-b border-ink/5 pb-1 last:border-0 last:pb-0">
                        <span className="text-ink/60 text-[9px] font-bold mr-2">
                          [{new Date(log.createdAt).toLocaleDateString('en-IN')} {new Date(log.createdAt).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}]
                        </span>
                        <span className="font-bold">{log.message}</span>
                      </div>
                    ))
                  )}
                </div>

                {/* Add entry form */}
                <form onSubmit={handlePostProgressLog} className="flex items-center space-x-2">
                  <Input
                    type="text"
                    required
                    placeholder="Log progress updates message..."
                    value={progressLogMsg}
                    onChange={e => setProgressLogMsg(e.target.value)}
                    className="flex-grow w-full"
                  />
                  <Button
                    type="submit"
                    disabled={submittingLog || !progressLogMsg.trim()}
                    variant="primary"
                    className="px-4 flex-shrink-0"
                  >
                    {submittingLog ? 'Logging...' : 'Post Log'}
                  </Button>
                </form>
              </Card>

            </div>
          )}
        </div>

        {/* ── Right: Client info + budget ───────────────────────────────── */}
        <div className="space-y-6">

          {/* Budget card */}
          <Card className="text-left">
            <h3 className="text-xs font-bold font-display text-ink uppercase tracking-widest mb-4">Budget</h3>
            <div className="flex items-baseline space-x-1 font-mono">
              <DollarSign className="h-5 w-5 text-accent-teal flex-shrink-0 mb-0.5 font-bold" />
              <span className="text-3xl font-black text-ink">₹{gig.budget.toLocaleString()}</span>
              <span className="text-sm text-ink/60 font-bold">/{gig.budgetType === 'hourly' ? 'hr' : 'project'}</span>
            </div>
          </Card>

          {/* Client card */}
          <Card className="text-left">
            <h3 className="text-xs font-bold font-display text-ink uppercase tracking-widest mb-4 pl-1">Posted By</h3>
            <div className="flex items-center space-x-3 mb-4">
              <div className="h-10 w-10 bg-cream border-2 border-ink rounded-lg flex items-center justify-center text-ink font-black font-display text-lg uppercase shadow-retro-sm">
                {gig.clientId.name.charAt(0)}
              </div>
              <div>
                <h4 className="font-bold text-ink text-sm uppercase font-display tracking-tight leading-none mb-1 text-left">{gig.clientId.name}</h4>
                {gig.clientId.companyName && (
                  <p className="text-xs text-ink/60 font-sans flex items-center space-x-1 font-bold text-left">
                    <Building className="h-3 w-3" />
                    <span>{gig.clientId.companyName}</span>
                  </p>
                )}
              </div>
            </div>
            <div className="space-y-2 text-xs font-mono text-ink/60 border-t border-ink/10 pt-3">
              <div className="flex items-center justify-between">
                <span className="flex items-center space-x-1"><Star className="h-3.5 w-3.5 text-accent-amber" /><span>Rating</span></span>
                <span className="font-bold text-ink">{gig.clientId.rating?.toFixed(1) || '0.0'} ★</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="flex items-center space-x-1"><MapPin className="h-3.5 w-3.5" /><span>Location</span></span>
                <span className="font-bold text-ink uppercase">{gig.clientId.location?.city || 'Anywhere'}</span>
              </div>
            </div>
          </Card>

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
                <Card className="space-y-3 text-left">
                  <h3 className="text-xs font-bold font-display text-ink uppercase tracking-widest pl-1">Quick Actions</h3>
                  {gig.status === 'in_progress' && (
                    <>
                      <Link
                        to={`/gigs/${gig._id}/chat`}
                        className="block w-full"
                      >
                        <Button variant="primary" className="w-full">
                          <MessageSquare className="h-4 w-4 mr-2" />
                          <span>Open Chat</span>
                        </Button>
                      </Link>

                      <Button
                        type="button"
                        onClick={() => setShowDisputeForm(prev => !prev)}
                        variant="coral"
                        className="w-full"
                      >
                        <AlertCircle className="h-4 w-4 mr-2" />
                        <span>{showDisputeForm ? 'Close Dispute' : 'Raise Dispute'}</span>
                      </Button>

                      {showDisputeForm && (
                        <form onSubmit={handleRaiseDispute} className="space-y-3 pt-3 border-t border-ink/10 font-sans">
                          {disputeMsg && (
                            <div className={`p-2 border-2 border-ink text-[10px] rounded-lg ${
                              disputeMsg.type === 'success' ? 'bg-cream border-l-4 border-l-accent-teal text-ink' : 'bg-cream border-l-4 border-l-accent-coral text-ink'
                            }`}>
                              {disputeMsg.text}
                            </div>
                          )}
                          <div className="space-y-1">
                            <label className="text-[9px] font-bold font-display uppercase tracking-widest text-ink block pl-1">Reason for Dispute *</label>
                            <textarea
                              required
                              rows={3}
                              value={disputeReason}
                              onChange={e => setDisputeReason(e.target.value)}
                              placeholder="Describe why you are raising a dispute..."
                              className="w-full p-2.5 bg-cream border-2 border-ink rounded-lg text-ink text-xs font-sans resize-none focus:outline-none focus:bg-accent-amber/10 focus:border-accent-amber"
                            />
                          </div>
                          <div className="space-y-1">
                            <label className="text-[9px] font-bold font-display uppercase tracking-widest text-ink block pl-1">Evidence (PDF/Image · MAX 5MB)</label>
                            <input
                              type="file"
                              accept="image/jpeg,image/png,application/pdf"
                              onChange={e => setDisputeFile(e.target.files?.[0] || null)}
                              className="w-full text-[10px] text-ink/60"
                            />
                          </div>
                          <Button
                            type="submit"
                            disabled={disputeSubmitting || !disputeReason.trim()}
                            variant="coral"
                            className="w-full py-2.5"
                          >
                            {disputeSubmitting ? 'Raising Dispute…' : 'Submit Dispute'}
                          </Button>
                        </form>
                      )}
                    </>
                  )}
                  {gig.status === 'completed' && otherUserId && (
                    <Link
                      to={`/review/${gig._id}/${otherUserId}`}
                      className="block w-full"
                    >
                      <Button variant="outline" className="w-full">
                        <PenLine className="h-4 w-4 mr-2" />
                        <span>Leave a Review</span>
                      </Button>
                    </Link>
                  )}
                </Card>
              );
            })()
          )}

        </div>
      </div>
    </div>
  );
};
