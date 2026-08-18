import React, { useState, useEffect } from 'react';
import api from '../../utils/api';
import {
  Users, Briefcase, CheckCircle2, TrendingUp,
  ShieldOff, Shield, Trash2, Loader2, RefreshCw,
  Star, AlertCircle, Building, Check, X as XIcon, MapPin, Globe,
  Activity, AlertTriangle, Scale, Eye
} from 'lucide-react';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Badge } from '../../components/ui/Badge';

interface Stats {
  totalUsers: number;
  totalGigs: number;
  completedGigs: number;
  activeGigs: number;
  totalFreelancers: number;
  totalClients: number;
  simulatedRevenue: number;
  totalReviews: number;
}

interface AdminUser {
  _id: string;
  name: string;
  email: string;
  role: string;
  location: { city: string };
  rating: number;
  reviewCount: number;
  isActive?: boolean;
  createdAt: string;
}

interface AdminGig {
  _id: string;
  title: string;
  category: string;
  status: string;
  budget: number;
  budgetType: string;
  escrowStatus: string;
  location: { city: string };
  clientId: { name: string; email: string };
  isFlagged?: boolean;
  flagReason?: string;
  createdAt: string;
}

interface AdminWarning {
  _id: string;
  type: 'gig' | 'message' | 'manual';
  targetId?: string;
  offenderId: { _id: string; name: string; email: string; role: string };
  content: string;
  reason: string;
  createdAt: string;
}

interface AdminCompany {
  _id: string;
  name: string;
  industry: string;
  description?: string;
  website?: string;
  registrationDetails: { country: string; city: string; businessRegistrationNumber?: string; taxId?: string };
  createdBy: { _id: string; name: string; email: string };
  memberCount?: number;
  createdAt: string;
}

const STAT_COLORS = ['border-accent-teal', 'border-accent-amber', 'border-accent-coral', 'border-accent-pink'];

const StatCard: React.FC<{ label: string; value: string | number; icon: React.ReactNode; colorClass: string }> =
  ({ label, value, icon, colorClass }) => (
    <div className={`bg-cream border-2 border-ink border-l-8 ${colorClass} rounded-xl p-5 shadow-retro text-left transition-colors duration-200`}>
      <div className="flex items-center justify-between mb-2">
        <span className="text-[10px] font-bold font-display uppercase tracking-widest text-ink/60">{label}</span>
        <span className="text-ink/60">{icon}</span>
      </div>
      <p className="text-2xl font-black font-mono text-ink">{value}</p>
    </div>
  );

type Tab = 'stats' | 'users' | 'gigs' | 'disputes' | 'flagged-reviews' | 'warnings' | 'companies';

export const AdminDashboard: React.FC = () => {
  const [tab, setTab] = useState<Tab>('stats');
  const [stats, setStats] = useState<Stats | null>(null);
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [gigs, setGigs] = useState<AdminGig[]>([]);
  const [disputes, setDisputes] = useState<any[]>([]);
  const [flaggedReviews, setFlaggedReviews] = useState<any[]>([]);
  const [warnings, setWarnings] = useState<AdminWarning[]>([]);
  const [companies, setCompanies] = useState<AdminCompany[]>([]);
  const [resolutionNotes, setResolutionNotes] = useState<Record<string, string>>({});
  const [resolutionActions, setResolutionActions] = useState<Record<string, 'release' | 'refund' | 'partial'>>({});
  const [partialAmounts, setPartialAmounts] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [msg, setMsg] = useState('');

  // User Activity Modal State
  const [activityModalUser, setActivityModalUser] = useState<{ _id: string; name: string; email: string } | null>(null);
  const [activityLoading, setActivityLoading] = useState(false);
  const [activityData, setActivityData] = useState<{ role?: string; gigs?: any[]; proposals?: any[]; assignedGigs?: any[]; bookings?: any[]; disputes?: any[]; warnings?: any[] } | null>(null);

  // Warn User Modal State
  const [warnModalUser, setWarnModalUser] = useState<{ _id: string; name: string; email: string } | null>(null);
  const [warnReason, setWarnReason] = useState('');
  const [warnContent, setWarnContent] = useState('');
  const [warnSubmitting, setWarnSubmitting] = useState(false);

  const fetchStats = async () => {
    setLoading(true);
    try {
      const r = await api.get('/admin/stats');
      if (r.data.success) setStats(r.data.stats);
    } finally { setLoading(false); }
  };

  const fetchUsers = async () => {
    setLoading(true);
    try {
      const r = await api.get('/admin/users?limit=50');
      if (r.data.success) setUsers(r.data.users);
    } finally { setLoading(false); }
  };

  const fetchGigs = async () => {
    setLoading(true);
    try {
      const r = await api.get('/admin/gigs?limit=50');
      if (r.data.success) setGigs(r.data.gigs);
    } finally { setLoading(false); }
  };

  const fetchDisputes = async () => {
    setLoading(true);
    try {
      const r = await api.get('/disputes');
      if (r.data.success) setDisputes(r.data.disputes);
    } finally { setLoading(false); }
  };

  const fetchFlaggedReviews = async () => {
    setLoading(true);
    try {
      const r = await api.get('/admin/flagged-reviews');
      if (r.data.success) setFlaggedReviews(r.data.reviews);
    } finally { setLoading(false); }
  };

  const fetchWarnings = async () => {
    setLoading(true);
    try {
      const r = await api.get('/admin/warnings');
      if (r.data.success) setWarnings(r.data.warnings);
    } finally { setLoading(false); }
  };

  const fetchCompanies = async () => {
    setLoading(true);
    try {
      const r = await api.get('/admin/companies');
      if (r.data.success) setCompanies(r.data.companies);
    } finally { setLoading(false); }
  };

  useEffect(() => {
    if (tab === 'stats') fetchStats();
    else if (tab === 'users') fetchUsers();
    else if (tab === 'gigs') fetchGigs();
    else if (tab === 'disputes') fetchDisputes();
    else if (tab === 'flagged-reviews') fetchFlaggedReviews();
    else if (tab === 'warnings') fetchWarnings();
    else if (tab === 'companies') fetchCompanies();
  }, [tab]);

  const handleToggleUser = async (userId: string) => {
    setActionLoading(userId);
    try {
      await api.put(`/admin/users/${userId}/status`);
      setMsg('User status updated.');
      fetchUsers();
    } catch (e: any) {
      setMsg(e.response?.data?.message || 'Action failed.');
    } finally { setActionLoading(null); }
  };

  const handleDeleteGig = async (gigId: string) => {
    if (!window.confirm('Permanently delete this gig?')) return;
    setActionLoading(gigId);
    try {
      await api.delete(`/admin/gigs/${gigId}`);
      setGigs(prev => prev.filter(g => g._id !== gigId));
      setMsg('Gig deleted.');
    } catch (e: any) {
      setMsg(e.response?.data?.message || 'Delete failed.');
    } finally { setActionLoading(null); }
  };

  const handleResolveDispute = async (disputeId: string) => {
    const note = resolutionNotes[disputeId];
    const action = resolutionActions[disputeId];
    if (!note || !note.trim()) {
      alert('Please enter a resolution note');
      return;
    }
    if (!action) {
      alert('Please select a resolution action (Release / Refund / Partial)');
      return;
    }
    const body: Record<string, any> = { resolutionNote: note.trim(), resolutionAction: action };
    if (action === 'partial') {
      const amt = parseFloat(partialAmounts[disputeId] || '');
      if (!amt || amt <= 0) {
        alert('Please enter a valid partial amount for the freelancer');
        return;
      }
      body.partialAmount = amt;
    }
    setActionLoading(disputeId);
    try {
      await api.put(`/disputes/${disputeId}/resolve`, body);
      setMsg('Dispute marked as resolved.');
      fetchDisputes();
    } catch (e: any) {
      setMsg(e.response?.data?.message || 'Action failed.');
    } finally { setActionLoading(null); }
  };

  const handleDismissFlag = async (reviewId: string) => {
    setActionLoading(reviewId);
    try {
      await api.put(`/admin/reviews/${reviewId}/dismiss`);
      setMsg('Review flag dismissed.');
      fetchFlaggedReviews();
    } catch (e: any) {
      setMsg(e.response?.data?.message || 'Action failed.');
    } finally { setActionLoading(null); }
  };

  const handleDeleteReview = async (reviewId: string) => {
    if (!window.confirm('Permanently delete this review?')) return;
    setActionLoading(reviewId);
    try {
      await api.delete(`/admin/reviews/${reviewId}`);
      setMsg('Review deleted.');
      fetchFlaggedReviews();
    } catch (e: any) {
      setMsg(e.response?.data?.message || 'Delete failed.');
    } finally { setActionLoading(null); }
  };

  // Activity Modal handler
  const handleOpenActivity = async (u: { _id: string; name: string; email: string }) => {
    setActivityModalUser(u);
    setActivityLoading(true);
    try {
      const res = await api.get(`/admin/users/${u._id}/activity`);
      if (res.data.success) {
        setActivityData(res.data.activity);
      }
    } catch (err: any) {
      alert(err.response?.data?.message || 'Failed to fetch user activity');
      setActivityModalUser(null);
    } finally {
      setActivityLoading(false);
    }
  };

  // Warn Modal handler
  const handleOpenWarn = (u: { _id: string; name: string; email: string }) => {
    setWarnModalUser(u);
    setWarnReason('');
    setWarnContent('');
  };

  const handleSubmitWarn = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!warnModalUser) return;
    if (!warnReason.trim() || !warnContent.trim()) {
      alert('Please provide both reason and content for the warning.');
      return;
    }

    setWarnSubmitting(true);
    try {
      const res = await api.post(`/admin/users/${warnModalUser._id}/warn`, {
        reason: warnReason.trim(),
        content: warnContent.trim(),
      });
      if (res.data.success) {
        setMsg(`Warning issued to ${warnModalUser.name}.`);
        setWarnModalUser(null);
        if (tab === 'warnings') fetchWarnings();
      }
    } catch (err: any) {
      alert(err.response?.data?.message || 'Failed to issue warning');
    } finally {
      setWarnSubmitting(false);
    }
  };

  const STATUS_COLORS: Record<string, string> = {
    open:        'text-accent-teal bg-accent-teal/10',
    in_progress: 'text-accent-amber bg-accent-amber/10',
    completed:   'text-ink/60 bg-ink/5',
    cancelled:   'text-accent-coral bg-accent-coral/10',
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 flex-grow bg-cream font-sans transition-colors duration-200">

      {/* Header */}
      <div className="mb-8 border-b-2 border-ink pb-0 flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div className="pb-2 sm:pb-6 text-left">
          <span className="text-[10px] font-mono text-ink/60 uppercase tracking-widest block mb-1">Control Hub</span>
          <h1 className="text-2xl font-display font-black text-ink uppercase tracking-tight">Admin Dashboard</h1>
        </div>
        <div className="flex items-end space-x-1 sm:space-x-2 overflow-x-auto w-full sm:w-auto -mb-[2px] scrollbar-none flex-nowrap">
          {(['stats', 'users', 'gigs', 'disputes', 'flagged-reviews', 'warnings', 'companies'] as Tab[]).map(t => (
            <button key={t} onClick={() => setTab(t)}
              className={`px-3 sm:px-4 py-2.5 text-[10px] sm:text-xs font-bold font-display uppercase tracking-wider border-2 border-b-0 border-ink transition-all cursor-pointer flex-shrink-0 ${
                tab === t ? 'bg-accent-teal text-ink shadow-none translate-y-[2px]' : 'bg-cream text-ink hover:bg-accent-teal/10'
              }`}
              style={{ borderBottomLeftRadius: 0, borderBottomRightRadius: 0, borderTopLeftRadius: 8, borderTopRightRadius: 8 }}
            >
              {t === 'flagged-reviews' ? 'reviews' : t}
            </button>
          ))}
        </div>
      </div>

      {/* Alert */}
      {msg && (
        <div className="mb-4 p-3 bg-cream border-2 border-ink border-l-4 border-l-accent-teal text-xs text-ink flex items-center justify-between rounded-lg">
          <span>{msg}</span>
          <button onClick={() => setMsg('')} className="text-ink hover:text-accent-coral text-base leading-none cursor-pointer">×</button>
        </div>
      )}

      {loading ? (
        <div className="flex items-center justify-center py-16">
          <Loader2 className="h-7 w-7 text-accent-teal animate-spin" />
        </div>
      ) : (
        <>
          {/* ── STATS ─────────────────────────────────────────────────────────── */}
          {tab === 'stats' && stats && (
            <div className="space-y-6">
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                <StatCard label="Total Users"       value={stats.totalUsers}       icon={<Users className="h-5 w-5" />}       colorClass={STAT_COLORS[0]} />
                <StatCard label="Total Gigs"        value={stats.totalGigs}        icon={<Briefcase className="h-5 w-5" />}   colorClass={STAT_COLORS[1]} />
                <StatCard label="Completed Gigs"    value={stats.completedGigs}    icon={<CheckCircle2 className="h-5 w-5" />} colorClass={STAT_COLORS[2]} />
                <StatCard label="Simulated Revenue" value={`₹${stats.simulatedRevenue.toLocaleString()}`} icon={<TrendingUp className="h-5 w-5" />} colorClass={STAT_COLORS[3]} />
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                <StatCard label="Active Gigs"    value={stats.activeGigs}       icon={<Briefcase className="h-5 w-5" />}  colorClass={STAT_COLORS[0]} />
                <StatCard label="Freelancers"    value={stats.totalFreelancers} icon={<Users className="h-5 w-5" />}      colorClass={STAT_COLORS[1]} />
                <StatCard label="Clients"        value={stats.totalClients}     icon={<Users className="h-5 w-5" />}      colorClass={STAT_COLORS[2]} />
                <StatCard label="Total Reviews"  value={stats.totalReviews}     icon={<Star className="h-5 w-5" />}       colorClass={STAT_COLORS[3]} />
              </div>

              <div className="text-left">
                <button onClick={fetchStats} className="inline-flex items-center space-x-2 text-xs text-ink/60 hover:text-ink font-bold font-display uppercase tracking-wider cursor-pointer">
                  <RefreshCw className="h-3.5 w-3.5" />
                  <span>Refresh Stats</span>
                </button>
              </div>
            </div>
          )}

          {/* ── USERS ─────────────────────────────────────────────────────────── */}
          {tab === 'users' && (
            <div className="bg-cream border-2 border-ink rounded-xl p-0 overflow-hidden shadow-retro">
              <table className="w-full text-xs font-sans">
                <thead className="bg-cream border-b-2 border-ink">
                  <tr>
                    {['User', 'Role', 'City', 'Rating', 'Status', 'Joined', 'Actions'].map(h => (
                      <th key={h} className="text-left px-4 py-3 text-[10px] font-bold font-display uppercase tracking-widest text-ink">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y-2 divide-ink/10">
                  {users.map(u => (
                    <tr key={u._id} className="hover:bg-accent-amber/5 transition-colors">
                      <td className="px-4 py-3 text-left">
                        <div>
                          <p className="font-bold text-ink uppercase font-display text-xs">{u.name}</p>
                          <p className="text-ink/60 text-[10px] font-mono">{u.email}</p>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-left">
                        <Badge variant={u.role === 'super_admin' ? 'coral' : u.role === 'client' ? 'amber' : 'teal'} className="shadow-none font-mono">
                          {u.role}
                        </Badge>
                      </td>
                      <td className="px-4 py-3 text-left font-mono text-ink/60 text-[10px]">{u.location?.city || '—'}</td>
                      <td className="px-4 py-3 text-left font-mono text-[10px] text-accent-amber font-bold">{u.rating?.toFixed(1) || '—'} ★</td>
                      <td className="px-4 py-3 text-left">
                        <Badge variant={u.isActive === false ? 'coral' : 'teal'} className="shadow-none font-mono">
                          {u.isActive === false ? 'Banned' : 'Active'}
                        </Badge>
                      </td>
                      <td className="px-4 py-3 text-left font-mono text-[10px] text-ink/60">
                        {new Date(u.createdAt).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: '2-digit' })}
                      </td>
                      <td className="px-4 py-3 text-left">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <Button
                            onClick={() => handleOpenActivity({ _id: u._id, name: u.name, email: u.email })}
                            variant="outline"
                            size="sm"
                            className="py-1 px-2 text-[10px]"
                            title="Inspect User Activity"
                          >
                            <Activity className="h-3 w-3 sm:mr-1 text-accent-teal" />
                            <span className="hidden sm:inline">Activity</span>
                          </Button>

                          {u.role !== 'super_admin' && (
                            <>
                              <Button
                                onClick={() => handleOpenWarn({ _id: u._id, name: u.name, email: u.email })}
                                variant="outline"
                                size="sm"
                                className="py-1 px-2 text-[10px] border-accent-amber text-ink hover:bg-accent-amber/10"
                                title="Issue Warning"
                              >
                                <AlertTriangle className="h-3 w-3 sm:mr-1 text-accent-amber" />
                                <span className="hidden sm:inline">Warn</span>
                              </Button>

                              <Button
                                onClick={() => handleToggleUser(u._id)}
                                disabled={actionLoading === u._id}
                                variant={u.isActive === false ? 'primary' : 'coral'}
                                size="sm"
                                className="shadow-none py-1 px-2 text-[10px]"
                              >
                                {u.isActive === false ? <Shield className="h-3 w-3 sm:mr-1" /> : <ShieldOff className="h-3 w-3 sm:mr-1" />}
                                <span className="hidden sm:inline">{u.isActive === false ? 'Unban' : 'Ban'}</span>
                              </Button>
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {users.length === 0 && (
                <div className="py-8 text-center text-xs text-ink/60 font-sans">No users found.</div>
              )}
            </div>
          )}

          {/* ── GIGS ──────────────────────────────────────────────────────────── */}
          {tab === 'gigs' && (
            <div className="bg-cream border-2 border-ink rounded-xl p-0 overflow-hidden shadow-retro">
              <table className="w-full text-xs font-sans">
                <thead className="bg-cream border-b-2 border-ink">
                  <tr>
                    {['Title', 'Category', 'Budget', 'Status', 'Escrow', 'Client', 'Flagged', 'Action'].map(h => (
                      <th key={h} className="text-left px-4 py-3 text-[10px] font-bold font-display uppercase tracking-widest text-ink">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y-2 divide-ink/10">
                  {gigs.map(g => (
                    <tr key={g._id} className="hover:bg-accent-amber/5 transition-colors">
                      <td className="px-4 py-3 text-left max-w-xs truncate font-bold text-ink">{g.title}</td>
                      <td className="px-4 py-3 text-left font-mono text-[10px] text-ink/60">{g.category}</td>
                      <td className="px-4 py-3 text-left font-mono font-bold text-ink">₹{g.budget.toLocaleString()}{g.budgetType === 'hourly' ? '/hr' : ''}</td>
                      <td className="px-4 py-3 text-left">
                        <Badge variant={g.status === 'open' ? 'teal' : g.status === 'in_progress' ? 'amber' : 'coral'} className="shadow-none font-mono">
                          {g.status.replace('_', ' ')}
                        </Badge>
                      </td>
                      <td className="px-4 py-3 text-left font-mono text-[10px] capitalize text-ink/60">{g.escrowStatus}</td>
                      <td className="px-4 py-3 text-left font-mono text-[10px] text-ink/60">{g.clientId?.name || '—'}</td>
                      <td className="px-4 py-3 text-left">
                        {g.isFlagged ? (
                          <span className="text-accent-coral font-bold font-mono text-[10px] flex items-center space-x-1">
                            <AlertCircle className="h-3 w-3" />
                            <span>{g.flagReason || 'Flagged'}</span>
                          </span>
                        ) : (
                          <span className="text-ink/40 font-mono text-[10px]">—</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-left">
                        <Button
                          onClick={() => handleDeleteGig(g._id)}
                          disabled={actionLoading === g._id}
                          variant="coral"
                          size="sm"
                          className="shadow-none py-1"
                        >
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {gigs.length === 0 && (
                <div className="py-8 text-center text-xs text-ink/60 font-sans">No gigs found.</div>
              )}
            </div>
          )}

          {/* ── DISPUTES ──────────────────────────────────────────────────────── */}
          {tab === 'disputes' && (
            <div className="space-y-4">
              {disputes.map(d => (
                <Card key={d._id} className="p-5 text-left space-y-4">
                  <div className="flex items-start justify-between">
                    <div>
                      <span className="text-[10px] font-mono text-ink/60 uppercase tracking-widest">Dispute #{d._id.slice(-6)}</span>
                      <h3 className="text-sm font-display font-black text-ink uppercase tracking-tight mt-0.5">{d.gigId?.title || 'Unknown Gig'}</h3>
                    </div>
                    <Badge variant={d.status === 'open' ? 'coral' : 'teal'} className="font-mono shadow-none">
                      {d.status}
                    </Badge>
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-xs font-mono text-ink/70 bg-ink/5 p-3 rounded-lg">
                    <div><span className="text-ink/40">Raised By:</span> <span className="font-bold">{d.raisedById?.name}</span> ({d.raisedById?.role})</div>
                    <div><span className="text-ink/40">Against:</span> <span className="font-bold">{d.againstId?.name}</span> ({d.againstId?.role})</div>
                    <div><span className="text-ink/40">Gig Budget:</span> <span className="font-bold">₹{d.gigId?.budget?.toLocaleString()}</span></div>
                  </div>

                  <div>
                    <span className="text-[10px] font-bold font-display uppercase tracking-widest text-ink/60 block mb-1">Reason</span>
                    <p className="text-xs text-ink bg-cream border border-ink/20 p-3 rounded-lg leading-relaxed">{d.reason}</p>
                  </div>

                  {d.status === 'open' && (
                    <div className="border-t-2 border-ink pt-4 space-y-3">
                      <span className="text-[10px] font-bold font-display uppercase tracking-widest text-ink/60 block">Resolve Dispute</span>
                      <textarea
                        rows={2}
                        value={resolutionNotes[d._id] || ''}
                        onChange={e => setResolutionNotes(prev => ({ ...prev, [d._id]: e.target.value }))}
                        placeholder="Enter resolution explanation..."
                        className="w-full px-3 py-2 bg-cream border-2 border-ink rounded-lg text-xs text-ink resize-none outline-none focus:border-accent-teal placeholder:text-ink/40"
                      />

                      <div className="flex flex-wrap items-center gap-2">
                        {(['release', 'refund', 'partial'] as const).map(action => (
                          <label key={action} className="flex items-center space-x-1 text-xs text-ink cursor-pointer font-bold uppercase font-display">
                            <input
                              type="radio"
                              name={`action-${d._id}`}
                              value={action}
                              checked={resolutionActions[d._id] === action}
                              onChange={() => setResolutionActions(prev => ({ ...prev, [d._id]: action }))}
                              className="accent-accent-teal"
                            />
                            <span>{action === 'release' ? 'Pay Freelancer' : action === 'refund' ? 'Refund Client' : 'Partial Split'}</span>
                          </label>
                        ))}
                      </div>

                      {resolutionActions[d._id] === 'partial' && (
                        <div className="max-w-xs">
                          <Input
                            type="number"
                            placeholder="Freelancer share (₹)"
                            value={partialAmounts[d._id] || ''}
                            onChange={e => setPartialAmounts(prev => ({ ...prev, [d._id]: e.target.value }))}
                          />
                        </div>
                      )}

                      <Button
                        onClick={() => handleResolveDispute(d._id)}
                        disabled={actionLoading === d._id}
                        variant="primary"
                        size="sm"
                      >
                        Confirm Resolution
                      </Button>
                    </div>
                  )}
                </Card>
              ))}
              {disputes.length === 0 && (
                <div className="py-8 text-center text-xs text-ink/60 font-sans">No disputes recorded.</div>
              )}
            </div>
          )}

          {/* ── FLAGGED REVIEWS ────────────────────────────────────────────────── */}
          {tab === 'flagged-reviews' && (
            <div className="space-y-4">
              {flaggedReviews.map(r => (
                <Card key={r._id} className="p-5 text-left space-y-3">
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="text-xs font-bold text-ink uppercase font-display">Review for {r.revieweeId?.name}</p>
                      <p className="text-[10px] text-ink/60 font-mono">By {r.reviewerId?.name} · {r.rating} ★</p>
                    </div>
                    <Badge variant="coral" className="font-mono shadow-none">Flagged</Badge>
                  </div>
                  <p className="text-xs text-ink bg-cream border border-ink/20 p-3 rounded-lg leading-relaxed">{r.comment}</p>
                  <p className="text-[10px] text-accent-coral font-mono font-bold">Flag reason: {r.flagReason || 'Flagged by user'}</p>
                  <div className="flex space-x-2 pt-2 border-t border-ink/10">
                    <Button onClick={() => handleDismissFlag(r._id)} disabled={actionLoading === r._id} variant="outline" size="sm">Dismiss Flag</Button>
                    <Button onClick={() => handleDeleteReview(r._id)} disabled={actionLoading === r._id} variant="coral" size="sm">Delete Review</Button>
                  </div>
                </Card>
              ))}
              {flaggedReviews.length === 0 && (
                <div className="py-8 text-center text-xs text-ink/60 font-sans">No flagged reviews.</div>
              )}
            </div>
          )}

          {/* ── WARNINGS ──────────────────────────────────────────────────────── */}
          {tab === 'warnings' && (
            <div className="bg-cream border-2 border-ink rounded-xl p-0 overflow-hidden shadow-retro">
              <table className="w-full text-xs font-sans">
                <thead className="bg-cream border-b-2 border-ink">
                  <tr>
                    {['Timestamp', 'Type', 'Target / User', 'Offender', 'Content', 'Reason'].map(h => (
                      <th key={h} className="text-left px-4 py-3 text-[10px] font-bold font-display uppercase tracking-widest text-ink">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y-2 divide-ink/10">
                  {warnings.map(w => (
                    <tr key={w._id} className="hover:bg-accent-amber/5 transition-colors">
                      <td className="px-4 py-3 text-left font-mono text-[10px] text-ink/60">{new Date(w.createdAt).toLocaleString('en-IN', { dateStyle: 'short', timeStyle: 'short' })}</td>
                      <td className="px-4 py-3 text-left">
                        <Badge variant={w.type === 'manual' ? 'teal' : w.type === 'gig' ? 'amber' : 'coral'} className="shadow-none font-mono text-[8px] uppercase">
                          {w.type}
                        </Badge>
                      </td>
                      <td className="px-4 py-3 text-left font-mono text-[10px] text-ink/60">{w.targetId || 'Direct User'}</td>
                      <td className="px-4 py-3 text-left">
                        <p className="font-bold text-ink uppercase font-display text-[10px]">{w.offenderId?.name || '—'}</p>
                        <p className="text-ink/60 text-[9px] font-mono">{w.offenderId?.email} · {w.offenderId?.role?.toUpperCase()}</p>
                      </td>
                      <td className="px-4 py-3 text-left max-w-[250px] font-mono text-[10px] text-ink whitespace-pre-wrap break-all">{w.content}</td>
                      <td className="px-4 py-3 text-left font-mono text-[10px] text-accent-coral font-bold">{w.reason}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {warnings.length === 0 && (
                <div className="py-8 text-center text-xs text-ink/60 font-sans">No safety warnings logged.</div>
              )}
            </div>
          )}

          {/* ── COMPANIES (ALL COMPANIES OVERSIGHT) ────────────────────────────── */}
          {tab === 'companies' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <p className="text-xs text-ink/60 font-sans">
                  {companies.length} active organization{companies.length !== 1 ? 's' : ''} on SkillSphere
                </p>
                <button onClick={fetchCompanies} className="inline-flex items-center space-x-2 text-xs text-ink/60 hover:text-ink font-bold font-display uppercase tracking-wider cursor-pointer">
                  <RefreshCw className="h-3.5 w-3.5" />
                  <span>Refresh</span>
                </button>
              </div>

              {companies.length === 0 ? (
                <Card className="p-8 text-center">
                  <Building className="h-8 w-8 text-ink/30 mx-auto mb-2" />
                  <p className="text-sm text-ink/50 font-sans">No registered companies found.</p>
                </Card>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {companies.map((c) => (
                    <Card key={c._id} className="p-5 space-y-3 text-left">
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex items-start gap-3">
                          <div className="h-10 w-10 flex-shrink-0 bg-accent-teal/20 border-2 border-ink rounded-lg flex items-center justify-center">
                            <Building className="h-5 w-5 text-ink" />
                          </div>
                          <div>
                            <h3 className="text-sm font-display font-black text-ink uppercase tracking-tight">{c.name}</h3>
                            <p className="text-[10px] text-ink/60 font-sans">{c.industry}</p>
                          </div>
                        </div>
                        <Badge variant="teal" className="shadow-none font-mono text-[9px]">
                          {c.memberCount || 1} Member{(c.memberCount || 1) !== 1 ? 's' : ''}
                        </Badge>
                      </div>

                      {c.description && (
                        <p className="text-xs text-ink/70 font-sans leading-relaxed line-clamp-2">{c.description}</p>
                      )}

                      <div className="grid grid-cols-2 gap-2 text-[10px] font-mono text-ink/60 pt-2 border-t border-ink/10">
                        <div className="flex items-center gap-1">
                          <MapPin className="h-3 w-3" />
                          <span>{c.registrationDetails?.city}, {c.registrationDetails?.country}</span>
                        </div>
                        {c.website ? (
                          <div className="flex items-center gap-1 truncate">
                            <Globe className="h-3 w-3" />
                            <a
                              href={c.website.startsWith('http://') || c.website.startsWith('https://') ? c.website : `https://${c.website}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="hover:text-accent-teal truncate"
                            >
                              {c.website.replace(/^https?:\/\//, '')}
                            </a>
                          </div>
                        ) : (
                          <div className="text-ink/40">No website</div>
                        )}
                      </div>

                      {/* Owner info */}
                      <div className="flex items-center justify-between pt-2 border-t border-ink/10">
                        <div className="text-[10px]">
                          <span className="text-ink/40 font-mono">Owner: </span>
                          <span className="font-bold text-ink">{c.createdBy?.name || '—'}</span>
                          <span className="text-ink/50 font-mono block text-[9px]">{c.createdBy?.email}</span>
                        </div>
                        {c.createdBy?._id && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleOpenActivity({ _id: c.createdBy._id, name: c.createdBy.name, email: c.createdBy.email })}
                            className="py-1 px-2.5 text-[10px]"
                          >
                            <Activity className="h-3 w-3 mr-1 text-accent-teal" />
                            <span>Owner Activity</span>
                          </Button>
                        )}
                      </div>
                    </Card>
                  ))}
                </div>
              )}
            </div>
          )}
        </>
      )}

      {/* ── USER ACTIVITY MODAL ─────────────────────────────────────────────── */}
      {activityModalUser && (
        <div className="fixed inset-0 z-50 bg-ink/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-cream border-2 border-ink rounded-xl w-full max-w-2xl max-h-[85vh] overflow-hidden flex flex-col shadow-retro animate-slide-up text-left">
            {/* Modal Header */}
            <div className="p-4 border-b-2 border-ink flex items-center justify-between bg-accent-teal/10">
              <div className="flex items-center gap-2">
                <Activity className="h-5 w-5 text-accent-teal" />
                <div>
                  <h3 className="text-sm font-display font-black text-ink uppercase tracking-tight">
                    User Activity: {activityModalUser.name}
                  </h3>
                  <p className="text-[10px] font-mono text-ink/60">{activityModalUser.email}</p>
                </div>
              </div>
              <button
                onClick={() => setActivityModalUser(null)}
                className="text-ink hover:text-accent-coral font-bold text-lg cursor-pointer p-1"
              >
                ✕
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-5 overflow-y-auto space-y-6">
              {activityLoading ? (
                <div className="py-12 flex justify-center">
                  <Loader2 className="h-6 w-6 animate-spin text-accent-teal" />
                </div>
              ) : activityData ? (
                <>
                  {/* Client: Posted Gigs Section */}
                  {activityData.role === 'client' && (
                    <div>
                      <h4 className="text-[10px] font-bold font-display text-ink uppercase tracking-widest mb-2 flex items-center justify-between">
                        <span>Posted Gigs ({activityData.gigs?.length || 0})</span>
                      </h4>
                      {(!activityData.gigs || activityData.gigs.length === 0) ? (
                        <p className="text-xs text-ink/40 font-sans italic">No gigs posted by this client.</p>
                      ) : (
                        <div className="space-y-2">
                          {activityData.gigs.map((g: any) => (
                            <div key={g._id} className="p-3 bg-ink/5 border border-ink/10 rounded-lg flex items-center justify-between text-xs font-sans">
                              <div className="min-w-0 pr-2">
                                <p className="font-bold text-ink truncate">{g.title}</p>
                                <p className="text-[10px] text-ink/60 font-mono">
                                  ₹{g.budget?.toLocaleString()}{g.budgetType === 'hourly' ? '/hr' : ''} · {g.category}
                                </p>
                              </div>
                              <Badge variant={g.status === 'open' ? 'teal' : g.status === 'in_progress' ? 'amber' : 'coral'} className="text-[9px] shadow-none font-mono">
                                {g.status}
                              </Badge>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}

                  {/* Freelancer: Applications & Proposals Section */}
                  {activityData.role === 'freelancer' && (
                    <div className="space-y-4">
                      {/* Proposals */}
                      <div>
                        <h4 className="text-[10px] font-bold font-display text-ink uppercase tracking-widest mb-2 flex items-center justify-between">
                          <span>Proposals & Applications ({activityData.proposals?.length || 0})</span>
                        </h4>
                        {(!activityData.proposals || activityData.proposals.length === 0) ? (
                          <p className="text-xs text-ink/40 font-sans italic">No proposals submitted yet.</p>
                        ) : (
                          <div className="space-y-2">
                            {activityData.proposals.map((p: any) => (
                              <div key={p._id} className="p-3 bg-ink/5 border border-ink/10 rounded-lg flex items-center justify-between text-xs font-sans">
                                <div className="min-w-0 pr-2">
                                  <p className="font-bold text-ink truncate">{p.gigId?.title || 'Gig Opportunity'}</p>
                                  <p className="text-[10px] text-ink/60 font-mono">
                                    Bid: ₹{p.bidAmount?.toLocaleString()} · {p.completionTime} days · {p.gigId?.category || 'Category'}
                                  </p>
                                </div>
                                <Badge variant={p.status === 'accepted' ? 'teal' : p.status === 'rejected' ? 'coral' : 'amber'} className="text-[9px] shadow-none font-mono">
                                  {p.status}
                                </Badge>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>

                      {/* Assigned Contracts */}
                      <div>
                        <h4 className="text-[10px] font-bold font-display text-ink uppercase tracking-widest mb-2 flex items-center justify-between">
                          <span>Assigned Contracts / Jobs ({activityData.assignedGigs?.length || 0})</span>
                        </h4>
                        {(!activityData.assignedGigs || activityData.assignedGigs.length === 0) ? (
                          <p className="text-xs text-ink/40 font-sans italic">No active contracts assigned.</p>
                        ) : (
                          <div className="space-y-2">
                            {activityData.assignedGigs.map((g: any) => (
                              <div key={g._id} className="p-3 bg-accent-teal/5 border border-accent-teal/20 rounded-lg flex items-center justify-between text-xs font-sans">
                                <div className="min-w-0 pr-2">
                                  <p className="font-bold text-ink truncate">{g.title}</p>
                                  <p className="text-[10px] text-ink/60 font-mono">
                                    Client: {g.clientId?.name || '—'} · ₹{g.budget?.toLocaleString()} · Escrow: {g.escrowStatus}
                                  </p>
                                </div>
                                <Badge variant={g.status === 'completed' ? 'teal' : 'amber'} className="text-[9px] shadow-none font-mono">
                                  {g.status}
                                </Badge>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>

                      {/* Appointments */}
                      <div>
                        <h4 className="text-[10px] font-bold font-display text-ink uppercase tracking-widest mb-2 flex items-center justify-between">
                          <span>Consultation Appointments ({activityData.bookings?.length || 0})</span>
                        </h4>
                        {(!activityData.bookings || activityData.bookings.length === 0) ? (
                          <p className="text-xs text-ink/40 font-sans italic">No appointments booked.</p>
                        ) : (
                          <div className="space-y-2">
                            {activityData.bookings.map((b: any) => (
                              <div key={b._id} className="p-3 bg-ink/5 border border-ink/10 rounded-lg flex items-center justify-between text-xs font-sans">
                                <div className="min-w-0 pr-2">
                                  <p className="font-bold text-ink truncate">{b.gigId?.title || 'Appointment'}</p>
                                  <p className="text-[10px] text-ink/60 font-mono">
                                    Client: {b.clientId?.name} · {new Date(b.date).toLocaleDateString('en-IN')} ({b.startTime} - {b.endTime})
                                  </p>
                                </div>
                                <Badge variant={b.status === 'confirmed' ? 'teal' : b.status === 'cancelled' ? 'coral' : 'amber'} className="text-[9px] shadow-none font-mono">
                                  {b.status}
                                </Badge>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Disputes Section */}
                  <div>
                    <h4 className="text-[10px] font-bold font-display text-ink uppercase tracking-widest mb-2 flex items-center justify-between">
                      <span>Disputes Involved ({activityData.disputes?.length || 0})</span>
                    </h4>
                    {(!activityData.disputes || activityData.disputes.length === 0) ? (
                      <p className="text-xs text-ink/40 font-sans italic">No disputes on record.</p>
                    ) : (
                      <div className="space-y-2">
                        {activityData.disputes.map((d: any) => (
                          <div key={d._id} className="p-3 bg-ink/5 border border-ink/10 rounded-lg space-y-1 text-xs font-sans">
                            <div className="flex items-center justify-between">
                              <span className="font-bold text-ink">{d.gigId?.title || 'Dispute'}</span>
                              <Badge variant={d.status === 'open' ? 'coral' : 'teal'} className="text-[9px] shadow-none font-mono">
                                {d.status}
                              </Badge>
                            </div>
                            <p className="text-[10px] text-ink/60 font-mono">
                              By: {d.raisedById?.name} vs. {d.againstId?.name}
                            </p>
                            <p className="text-xs text-ink/80 bg-cream p-2 border border-ink/10 rounded mt-1">{d.reason}</p>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Warnings Section */}
                  <div>
                    <h4 className="text-[10px] font-bold font-display text-ink uppercase tracking-widest mb-2 flex items-center justify-between">
                      <span>Warnings Logged ({activityData.warnings?.length || 0})</span>
                    </h4>
                    {(!activityData.warnings || activityData.warnings.length === 0) ? (
                      <p className="text-xs text-ink/40 font-sans italic">No safety or admin warnings.</p>
                    ) : (
                      <div className="space-y-2">
                        {activityData.warnings.map((w: any) => (
                          <div key={w._id} className="p-3 bg-accent-coral/10 border-2 border-accent-coral/30 rounded-lg text-xs font-sans">
                            <div className="flex items-center justify-between mb-1">
                              <Badge variant="coral" className="text-[8px] font-mono shadow-none uppercase">{w.type}</Badge>
                              <span className="text-[10px] text-ink/50 font-mono">{new Date(w.createdAt).toLocaleDateString('en-IN')}</span>
                            </div>
                            <p className="font-bold text-accent-coral text-xs">{w.reason}</p>
                            <p className="text-xs text-ink/80 mt-0.5">{w.content}</p>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </>
              ) : null}
            </div>

            {/* Modal Footer */}
            <div className="p-4 border-t-2 border-ink flex justify-end bg-cream">
              <Button variant="outline" size="sm" onClick={() => setActivityModalUser(null)}>
                Close
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* ── WARN USER MODAL ─────────────────────────────────────────────────── */}
      {warnModalUser && (
        <div className="fixed inset-0 z-50 bg-ink/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-cream border-2 border-ink rounded-xl w-full max-w-md overflow-hidden flex flex-col shadow-retro animate-slide-up text-left">
            <div className="p-4 border-b-2 border-ink flex items-center justify-between bg-accent-amber/20">
              <div className="flex items-center gap-2">
                <AlertTriangle className="h-5 w-5 text-accent-coral" />
                <h3 className="text-sm font-display font-black text-ink uppercase tracking-tight">
                  Issue Warning: {warnModalUser.name}
                </h3>
              </div>
              <button
                onClick={() => setWarnModalUser(null)}
                className="text-ink hover:text-accent-coral font-bold text-lg cursor-pointer p-1"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSubmitWarn} className="p-5 space-y-4 font-sans text-xs">
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold font-display text-ink uppercase tracking-widest block">
                  Warning Reason <span className="text-accent-coral">*</span>
                </label>
                <Input
                  type="text"
                  required
                  value={warnReason}
                  onChange={(e) => setWarnReason(e.target.value)}
                  placeholder="e.g. Inappropriate behavior / Policy violation"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-[10px] font-bold font-display text-ink uppercase tracking-widest block">
                  Warning Content & Details <span className="text-accent-coral">*</span>
                </label>
                <textarea
                  rows={4}
                  required
                  value={warnContent}
                  onChange={(e) => setWarnContent(e.target.value)}
                  placeholder="Detailed explanation of the issue sent to the user..."
                  className="w-full px-3 py-2 bg-cream border-2 border-ink rounded-lg text-xs text-ink resize-none outline-none focus:border-accent-amber placeholder:text-ink/40"
                />
              </div>

              <div className="pt-2 flex gap-3">
                <Button type="button" variant="outline" className="flex-1" onClick={() => setWarnModalUser(null)}>
                  Cancel
                </Button>
                <Button type="submit" variant="coral" className="flex-1" disabled={warnSubmitting}>
                  {warnSubmitting ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Send Warning'}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
};
