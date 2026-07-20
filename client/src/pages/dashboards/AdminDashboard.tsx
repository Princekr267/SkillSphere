import React, { useState, useEffect } from 'react';
import api from '../../utils/api';
import {
  Users, Briefcase, CheckCircle2, TrendingUp,
  ShieldOff, Shield, Trash2, Loader2, RefreshCw,
  Star, AlertCircle
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
  type: 'gig' | 'message';
  targetId: string;
  offenderId: { _id: string; name: string; email: string; role: string };
  content: string;
  reason: string;
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

type Tab = 'stats' | 'users' | 'gigs' | 'disputes' | 'flagged-reviews' | 'warnings';

export const AdminDashboard: React.FC = () => {
  const [tab, setTab] = useState<Tab>('stats');
  const [stats, setStats] = useState<Stats | null>(null);
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [gigs, setGigs] = useState<AdminGig[]>([]);
  const [disputes, setDisputes] = useState<any[]>([]);
  const [flaggedReviews, setFlaggedReviews] = useState<any[]>([]);
  const [warnings, setWarnings] = useState<AdminWarning[]>([]);
  const [resolutionNotes, setResolutionNotes] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [msg, setMsg] = useState('');

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

  useEffect(() => {
    if (tab === 'stats') fetchStats();
    else if (tab === 'users') fetchUsers();
    else if (tab === 'gigs') fetchGigs();
    else if (tab === 'disputes') fetchDisputes();
    else if (tab === 'flagged-reviews') fetchFlaggedReviews();
    else if (tab === 'warnings') fetchWarnings();
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
    if (!note || !note.trim()) {
      alert('Please enter a resolution note');
      return;
    }
    setActionLoading(disputeId);
    try {
      await api.put(`/disputes/${disputeId}/resolve`, { resolutionNote: note.trim() });
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
      setMsg(e.response?.data?.message || 'Action failed.');
    } finally { setActionLoading(null); }
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
      <div className="mb-8 border-b-2 border-ink pb-0 flex items-end justify-between">
        <div className="pb-6 text-left">
          <span className="text-[10px] font-mono text-ink/60 uppercase tracking-widest block mb-1">Control Hub</span>
          <h1 className="text-2xl font-display font-black text-ink uppercase tracking-tight">Admin Dashboard</h1>
        </div>
        <div className="flex items-end space-x-2">
          {(['stats', 'users', 'gigs', 'disputes', 'flagged-reviews', 'warnings'] as Tab[]).map(t => (
            <button key={t} onClick={() => setTab(t)}
              className={`px-4 py-2.5 text-xs font-bold font-display uppercase tracking-wider border-2 border-b-0 border-ink transition-all cursor-pointer ${
                tab === t ? 'bg-accent-teal text-ink shadow-none translate-y-[2px]' : 'bg-cream text-ink hover:bg-accent-teal/10'
              }`}
              style={{ borderBottomLeftRadius: 0, borderBottomRightRadius: 0, borderTopLeftRadius: 8, borderTopRightRadius: 8 }}
            >
              {t === 'flagged-reviews' ? 'reviews' : t === 'warnings' ? 'warnings' : t}
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
                    {['User', 'Role', 'City', 'Rating', 'Status', 'Joined', 'Action'].map(h => (
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
                        <Badge variant={u.role === 'admin' ? 'coral' : u.role === 'client' ? 'amber' : 'teal'} className="shadow-none font-mono">
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
                        {u.role !== 'admin' && (
                          <Button
                            onClick={() => handleToggleUser(u._id)}
                            disabled={actionLoading === u._id}
                            variant={u.isActive === false ? 'primary' : 'coral'}
                            size="sm"
                            className="shadow-none py-1"
                          >
                            {u.isActive === false ? <Shield className="h-3 w-3 mr-1" /> : <ShieldOff className="h-3 w-3 mr-1" />}
                            <span>{u.isActive === false ? 'Unban' : 'Ban'}</span>
                          </Button>
                        )}
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
                    {['Title', 'Client', 'Category', 'Budget', 'Status', 'City', 'Action'].map(h => (
                      <th key={h} className="text-left px-4 py-3 text-[10px] font-bold font-display uppercase tracking-widest text-ink">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y-2 divide-ink/10">
                  {gigs.map(g => (
                    <tr key={g._id} className="hover:bg-accent-amber/5 transition-colors">
                      <td className="px-4 py-3 text-left font-bold text-ink font-display uppercase text-xs max-w-[160px] truncate">
                        <div className="flex flex-col">
                          <span>{g.title}</span>
                          {g.isFlagged && (
                            <span className="inline-block self-start text-[8px] bg-accent-coral/20 text-accent-coral border border-ink font-mono px-1 rounded-sm mt-0.5" title={g.flagReason}>
                              FLAGGED · {g.flagReason}
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-3 text-left text-[10px] text-ink/60 font-sans">{g.clientId?.name || '—'}</td>
                      <td className="px-4 py-3 text-left text-[10px] text-ink/60 font-mono">{g.category}</td>
                      <td className="px-4 py-3 text-left text-[10px] font-mono text-ink">₹{g.budget?.toLocaleString()}</td>
                      <td className="px-4 py-3 text-left">
                        <Badge variant="outline" className={`${STATUS_COLORS[g.status] || ''} shadow-none`}>
                          {g.status}
                        </Badge>
                      </td>
                      <td className="px-4 py-3 text-left text-[10px] font-mono text-ink/60">{g.location?.city || '—'}</td>
                      <td className="px-4 py-3 text-left">
                        <Button
                          onClick={() => handleDeleteGig(g._id)}
                          disabled={actionLoading === g._id}
                          variant="coral"
                          size="sm"
                          className="shadow-none py-1"
                        >
                          <Trash2 className="h-3 w-3 mr-1" />
                          <span>Delete</span>
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
            <div className="bg-cream border-2 border-ink rounded-xl p-0 overflow-hidden shadow-retro">
              <table className="w-full text-xs font-sans">
                <thead className="bg-cream border-b-2 border-ink">
                  <tr>
                    {['Gig / Reason', 'Raised By', 'Against', 'Evidence', 'Status / Resolution', 'Action'].map(h => (
                      <th key={h} className="text-left px-4 py-3 text-[10px] font-bold font-display uppercase tracking-widest text-ink">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y-2 divide-ink/10">
                  {disputes.map(d => (
                    <tr key={d._id} className="hover:bg-accent-amber/5 transition-colors">
                      <td className="px-4 py-3 text-left max-w-[200px]">
                        <p className="font-bold text-ink uppercase font-display text-xs">{d.gigId?.title || '—'}</p>
                        <p className="text-ink/60 font-sans mt-1">Reason: "{d.reason}"</p>
                      </td>
                      <td className="px-4 py-3 text-left">
                        <p className="font-bold text-ink uppercase font-display text-[10px]">{d.raisedById?.name}</p>
                        <p className="text-ink/60 text-[9px] font-mono">{d.raisedById?.role.toUpperCase()}</p>
                      </td>
                      <td className="px-4 py-3 text-left">
                        <p className="font-bold text-ink uppercase font-display text-[10px]">{d.againstId?.name}</p>
                        <p className="text-ink/60 text-[9px] font-mono">{d.againstId?.role.toUpperCase()}</p>
                      </td>
                      <td className="px-4 py-3 text-left">
                        {d.evidenceUrl ? (
                          <a
                            href={d.evidenceUrl.startsWith('http') ? d.evidenceUrl : `${api.defaults.baseURL?.replace('/api', '')}${d.evidenceUrl}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-accent-teal font-bold hover:underline font-mono text-[10px]"
                          >
                            View Evidence
                          </a>
                        ) : (
                          <span className="text-ink/60 font-mono text-[10px]">No Evidence</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-left">
                        <div className="space-y-1">
                          <Badge variant={d.status === 'resolved' ? 'teal' : 'coral'} className="shadow-none">
                            {d.status}
                          </Badge>
                          {d.resolutionNote && (
                            <p className="text-ink/60 text-[10px] italic">Note: "{d.resolutionNote}"</p>
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-3 text-left">
                        {d.status === 'open' ? (
                          <div className="space-y-2">
                            <textarea
                              placeholder="Resolution note..."
                              value={resolutionNotes[d._id] || ''}
                              onChange={e => setResolutionNotes(prev => ({ ...prev, [d._id]: e.target.value }))}
                              className="w-full p-2 bg-cream border-2 border-ink rounded-lg text-ink text-xs resize-none focus:outline-none focus:bg-accent-amber/10 focus:border-accent-amber font-sans"
                              rows={2}
                            />
                            <Button
                              onClick={() => handleResolveDispute(d._id)}
                              disabled={actionLoading === d._id}
                              variant="secondary"
                              size="sm"
                              className="w-full py-1 shadow-none"
                            >
                              Resolve
                            </Button>
                          </div>
                        ) : (
                          <span className="text-ink/60 text-[10px] italic font-mono">Resolved</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {disputes.length === 0 && (
                <div className="py-8 text-center text-xs text-ink/60 font-sans">No disputes logged.</div>
              )}
            </div>
          )}

          {/* ── FLAGGED REVIEWS ────────────────────────────────────────────────── */}
          {tab === 'flagged-reviews' && (
            <div className="bg-cream border-2 border-ink rounded-xl p-0 overflow-hidden shadow-retro">
              <table className="w-full text-xs font-sans">
                <thead className="bg-cream border-b-2 border-ink">
                  <tr>
                    {['Gig / Review details', 'Reviewer', 'Reviewee', 'Rating', 'Flags', 'Action'].map(h => (
                      <th key={h} className="text-left px-4 py-3 text-[10px] font-bold font-display uppercase tracking-widest text-ink">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y-2 divide-ink/10">
                  {flaggedReviews.map(r => (
                    <tr key={r._id} className="hover:bg-accent-amber/5 transition-colors">
                      <td className="px-4 py-3 text-left max-w-[220px]">
                        <p className="font-bold text-ink uppercase font-display text-[10px]">{r.gigId?.title || '—'}</p>
                        <p className="text-ink/60 font-sans mt-1">Comment: "{r.comment || 'no comment'}"</p>
                      </td>
                      <td className="px-4 py-3 text-left">
                        <p className="font-bold text-ink uppercase font-display text-[10px]">{r.reviewerId?.name}</p>
                        <p className="text-ink/60 text-[9px] font-mono">{r.reviewerId?.role.toUpperCase()}</p>
                      </td>
                      <td className="px-4 py-3 text-left">
                        <p className="font-bold text-ink uppercase font-display text-[10px]">{r.revieweeId?.name}</p>
                        <p className="text-ink/60 text-[9px] font-mono">{r.revieweeId?.role.toUpperCase()}</p>
                      </td>
                      <td className="px-4 py-3 text-left font-mono text-[10px] text-accent-amber font-bold">{r.rating} ★</td>
                      <td className="px-4 py-3 text-left">
                        <div className="flex flex-wrap gap-1">
                          {r.fraudFlags?.map((f: string) => (
                            <Badge key={f} variant="coral" className="shadow-none font-mono text-[8px] px-1.5 py-0">
                              {f.replace(/_/g, ' ')}
                            </Badge>
                          ))}
                        </div>
                      </td>
                      <td className="px-4 py-3 text-left">
                        <div className="flex flex-col sm:flex-row gap-2">
                          <Button
                            onClick={() => handleDismissFlag(r._id)}
                            disabled={actionLoading === r._id}
                            variant="secondary"
                            size="sm"
                            className="shadow-none py-1 text-[9px]"
                          >
                            Dismiss
                          </Button>
                          <Button
                            onClick={() => handleDeleteReview(r._id)}
                            disabled={actionLoading === r._id}
                            variant="coral"
                            size="sm"
                            className="shadow-none py-1 text-[9px]"
                          >
                            Delete
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {flaggedReviews.length === 0 && (
                <div className="py-8 text-center text-xs text-ink/60 font-sans">No flagged reviews in the queue.</div>
              )}
            </div>
          )}

          {/* ── SAFETY WARNINGS ────────────────────────────────────────────────── */}
          {tab === 'warnings' && (
            <div className="bg-cream border-2 border-ink rounded-xl p-0 overflow-hidden shadow-retro">
              <table className="w-full text-xs font-sans">
                <thead className="bg-cream border-b-2 border-ink">
                  <tr>
                    {['Date', 'Type', 'Target ID', 'Offender', 'Infracting Content', 'Reason'].map(h => (
                      <th key={h} className="text-left px-4 py-3 text-[10px] font-bold font-display uppercase tracking-widest text-ink">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y-2 divide-ink/10">
                  {warnings.map(w => (
                    <tr key={w._id} className="hover:bg-accent-amber/5 transition-colors">
                      <td className="px-4 py-3 text-left font-mono text-[10px] text-ink/60">{new Date(w.createdAt).toLocaleString('en-IN', { dateStyle: 'short', timeStyle: 'short' })}</td>
                      <td className="px-4 py-3 text-left">
                        <Badge variant={w.type === 'gig' ? 'amber' : 'coral'} className="shadow-none font-mono text-[8px]">
                          {w.type}
                        </Badge>
                      </td>
                      <td className="px-4 py-3 text-left font-mono text-[10px] text-ink/60">{w.targetId}</td>
                      <td className="px-4 py-3 text-left">
                        <p className="font-bold text-ink uppercase font-display text-[10px]">{w.offenderId?.name || '—'}</p>
                        <p className="text-ink/60 text-[9px] font-mono">{w.offenderId?.email} · {w.offenderId?.role.toUpperCase()}</p>
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
        </>
      )}
    </div>
  );
};
