import React, { useState, useEffect } from 'react';
import api from '../../utils/api';
import {
  Users, Briefcase, CheckCircle2, TrendingUp,
  ShieldOff, Shield, Trash2, Loader2, RefreshCw,
  Star, AlertCircle
} from 'lucide-react';

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
  createdAt: string;
}

const STAT_COLORS = ['border-route-teal', 'border-transit-gold', 'border-signal-coral', 'border-slate'];

const StatCard: React.FC<{ label: string; value: string | number; icon: React.ReactNode; colorClass: string }> =
  ({ label, value, icon, colorClass }) => (
    <div className={`bg-paper border-2 border-ink border-l-4 ${colorClass} sketch-card p-5`}>
      <div className="flex items-center justify-between mb-2">
        <span className="text-[10px] font-bold font-display uppercase tracking-widest text-slate">{label}</span>
        <span className="text-slate">{icon}</span>
      </div>
      <p className="text-2xl font-black font-mono text-ink">{value}</p>
    </div>
  );

type Tab = 'stats' | 'users' | 'gigs' | 'disputes' | 'flagged-reviews';

export const AdminDashboard: React.FC = () => {
  const [tab, setTab] = useState<Tab>('stats');
  const [stats, setStats] = useState<Stats | null>(null);
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [gigs, setGigs] = useState<AdminGig[]>([]);
  const [disputes, setDisputes] = useState<any[]>([]);
  const [flaggedReviews, setFlaggedReviews] = useState<any[]>([]);
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

  useEffect(() => {
    if (tab === 'stats') fetchStats();
    else if (tab === 'users') fetchUsers();
    else if (tab === 'gigs') fetchGigs();
    else if (tab === 'disputes') fetchDisputes();
    else fetchFlaggedReviews();
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
    open:        'text-route-teal bg-route-teal/10',
    in_progress: 'text-transit-gold bg-transit-gold/10',
    completed:   'text-slate bg-slate/10',
    cancelled:   'text-signal-coral bg-signal-coral/10',
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 flex-grow bg-paper font-sans">

      {/* Header */}
      <div className="mb-8 border-b-2 border-ink pb-0 flex items-end justify-between">
        <div className="pb-6">
          <span className="text-[10px] font-mono text-slate uppercase tracking-widest block mb-1">Control Hub</span>
          <h1 className="text-2xl font-black font-display text-ink uppercase tracking-tight">Admin Dashboard</h1>
        </div>
        <div className="flex items-end space-x-2">
          {(['stats', 'users', 'gigs', 'disputes', 'flagged-reviews'] as Tab[]).map(t => (
            <button key={t} onClick={() => setTab(t)}
              className={`px-4 py-2 text-xs font-bold font-display uppercase tracking-widest border-2 border-b-0 border-ink transition-all ${
                tab === t ? 'bg-route-teal text-white translate-y-0.5' : 'bg-paper text-ink hover:bg-line-gray/20'
              } sketch-border`}
              style={{ borderBottomLeftRadius: 0, borderBottomRightRadius: 0 }}
            >
              {t === 'flagged-reviews' ? 'flagged reviews' : t}
            </button>
          ))}
        </div>
      </div>

      {/* Alert */}
      {msg && (
        <div className="mb-4 p-3 bg-paper border-2 border-ink border-l-4 border-l-route-teal text-xs text-ink flex items-center justify-between sketch-border">
          <span>{msg}</span>
          <button onClick={() => setMsg('')} className="text-slate hover:text-ink text-base leading-none">×</button>
        </div>
      )}

      {loading ? (
        <div className="flex items-center justify-center py-16">
          <Loader2 className="h-7 w-7 text-route-teal animate-spin" />
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

              <button onClick={fetchStats} className="flex items-center space-x-2 text-xs text-slate hover:text-ink font-bold font-display uppercase tracking-wider">
                <RefreshCw className="h-3.5 w-3.5" />
                <span>Refresh Stats</span>
              </button>
            </div>
          )}

          {/* ── USERS ─────────────────────────────────────────────────────────── */}
          {tab === 'users' && (
            <div className="bg-paper border-2 border-ink sketch-card p-0 overflow-hidden rotate-[0.3deg]">
              <table className="w-full text-xs font-sans">
                <thead className="bg-paper border-b-2 border-ink">
                  <tr>
                    {['User', 'Role', 'City', 'Rating', 'Status', 'Joined', 'Action'].map(h => (
                      <th key={h} className="text-left px-4 py-3 text-[10px] font-bold font-display uppercase tracking-widest text-ink">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y-2 divide-ink">
                  {users.map(u => (
                    <tr key={u._id} className="hover:bg-line-gray/20 transition-colors">
                      <td className="px-4 py-3">
                        <div>
                          <p className="font-bold text-ink uppercase font-display text-xs">{u.name}</p>
                          <p className="text-slate text-[10px] font-mono">{u.email}</p>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <span className={`px-2 py-0.5 border border-ink text-[10px] font-mono uppercase sketch-badge ${
                          u.role === 'admin' ? 'bg-signal-coral/10 text-signal-coral' :
                          u.role === 'client' ? 'bg-transit-gold/15 text-transit-gold' :
                          'bg-route-teal/10 text-route-teal'
                        }`}>{u.role}</span>
                      </td>
                      <td className="px-4 py-3 font-mono text-slate text-[10px]">{u.location?.city || '—'}</td>
                      <td className="px-4 py-3 font-mono text-[10px] text-transit-gold font-bold">{u.rating?.toFixed(1) || '—'} ★</td>
                      <td className="px-4 py-3">
                        <span className={`px-2 py-0.5 border border-ink text-[10px] font-mono uppercase sketch-badge ${
                          u.isActive === false ? 'text-signal-coral bg-signal-coral/10' : 'text-route-teal bg-route-teal/10'
                        }`}>
                          {u.isActive === false ? 'Banned' : 'Active'}
                        </span>
                      </td>
                      <td className="px-4 py-3 font-mono text-[10px] text-slate">
                        {new Date(u.createdAt).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: '2-digit' })}
                      </td>
                      <td className="px-4 py-3">
                        {u.role !== 'admin' && (
                          <button
                            onClick={() => handleToggleUser(u._id)}
                            disabled={actionLoading === u._id}
                            className={`flex items-center space-x-1 px-2.5 py-1 border-2 border-ink text-[10px] font-bold font-display uppercase tracking-wider bg-paper sketch-button`}
                          >
                            {u.isActive === false ? <Shield className="h-3 w-3" /> : <ShieldOff className="h-3 w-3" />}
                            <span>{u.isActive === false ? 'Unban' : 'Ban'}</span>
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {users.length === 0 && (
                <div className="py-8 text-center text-xs text-slate font-sans">No users found.</div>
              )}
            </div>
          )}

          {/* ── GIGS ──────────────────────────────────────────────────────────── */}
          {tab === 'gigs' && (
            <div className="bg-paper border-2 border-ink sketch-card p-0 overflow-hidden rotate-[-0.3deg]">
              <table className="w-full text-xs font-sans">
                <thead className="bg-paper border-b-2 border-ink">
                  <tr>
                    {['Title', 'Client', 'Category', 'Budget', 'Status', 'City', 'Action'].map(h => (
                      <th key={h} className="text-left px-4 py-3 text-[10px] font-bold font-display uppercase tracking-widest text-ink">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y-2 divide-ink">
                  {gigs.map(g => (
                    <tr key={g._id} className="hover:bg-line-gray/20 transition-colors">
                      <td className="px-4 py-3 font-bold text-ink font-display uppercase text-xs max-w-[160px] truncate">{g.title}</td>
                      <td className="px-4 py-3 text-[10px] text-slate font-sans">{g.clientId?.name || '—'}</td>
                      <td className="px-4 py-3 text-[10px] text-slate font-mono">{g.category}</td>
                      <td className="px-4 py-3 text-[10px] font-mono text-ink">₹{g.budget?.toLocaleString()}</td>
                      <td className="px-4 py-3">
                        <span className={`px-2 py-0.5 border border-ink text-[10px] font-mono uppercase sketch-badge ${STATUS_COLORS[g.status] || ''}`}>
                          {g.status}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-[10px] font-mono text-slate">{g.location?.city || '—'}</td>
                      <td className="px-4 py-3">
                        <button
                          onClick={() => handleDeleteGig(g._id)}
                          disabled={actionLoading === g._id}
                          className="flex items-center space-x-1 px-2.5 py-1 border-2 border-ink text-signal-coral bg-paper text-[10px] font-bold font-display uppercase tracking-wider sketch-button"
                        >
                          <Trash2 className="h-3 w-3" />
                          <span>Delete</span>
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {gigs.length === 0 && (
                <div className="py-8 text-center text-xs text-slate font-sans">No gigs found.</div>
              )}
            </div>
          )}

          {/* ── DISPUTES ──────────────────────────────────────────────────────── */}
          {tab === 'disputes' && (
            <div className="bg-paper border-2 border-ink sketch-card p-0 overflow-hidden rotate-[0.2deg]">
              <table className="w-full text-xs font-sans">
                <thead className="bg-paper border-b-2 border-ink">
                  <tr>
                    {['Gig / Reason', 'Raised By', 'Against', 'Evidence', 'Status / Resolution', 'Action'].map(h => (
                      <th key={h} className="text-left px-4 py-3 text-[10px] font-bold font-display uppercase tracking-widest text-ink">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y-2 divide-ink">
                  {disputes.map(d => (
                    <tr key={d._id} className="hover:bg-line-gray/20 transition-colors">
                      <td className="px-4 py-3 max-w-[200px]">
                        <p className="font-bold text-ink uppercase font-display text-xs">{d.gigId?.title || '—'}</p>
                        <p className="text-slate font-sans mt-1">Reason: "{d.reason}"</p>
                      </td>
                      <td className="px-4 py-3">
                        <p className="font-bold text-ink uppercase font-display text-[10px]">{d.raisedById?.name}</p>
                        <p className="text-slate text-[9px] font-mono">{d.raisedById?.role.toUpperCase()}</p>
                      </td>
                      <td className="px-4 py-3">
                        <p className="font-bold text-ink uppercase font-display text-[10px]">{d.againstId?.name}</p>
                        <p className="text-slate text-[9px] font-mono">{d.againstId?.role.toUpperCase()}</p>
                      </td>
                      <td className="px-4 py-3">
                        {d.evidenceUrl ? (
                          <a
                            href={d.evidenceUrl.startsWith('http') ? d.evidenceUrl : `${api.defaults.baseURL?.replace('/api', '')}${d.evidenceUrl}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-route-teal font-bold hover:underline font-mono text-[10px]"
                          >
                            View Evidence
                          </a>
                        ) : (
                          <span className="text-slate font-mono text-[10px]">No Evidence</span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <div className="space-y-1">
                          <span className={`px-2 py-0.5 border border-ink text-[10px] font-mono uppercase sketch-badge ${
                            d.status === 'resolved' ? 'text-route-teal bg-route-teal/10' : 'text-signal-coral bg-signal-coral/10'
                          }`}>
                            {d.status}
                          </span>
                          {d.resolutionNote && (
                            <p className="text-slate text-[10px] italic">Note: "{d.resolutionNote}"</p>
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        {d.status === 'open' ? (
                          <div className="space-y-2">
                            <textarea
                              placeholder="Resolution note..."
                              value={resolutionNotes[d._id] || ''}
                              onChange={e => setResolutionNotes(prev => ({ ...prev, [d._id]: e.target.value }))}
                              className="w-full p-2 text-[10px] bg-paper border border-ink sketch-input text-ink resize-none focus:outline-none focus:border-route-teal"
                              rows={2}
                            />
                            <button
                              onClick={() => handleResolveDispute(d._id)}
                              disabled={actionLoading === d._id}
                              className="w-full py-1 bg-route-teal text-white border border-ink text-[10px] font-bold font-display uppercase tracking-wider sketch-button disabled:opacity-50"
                            >
                              Resolve
                            </button>
                          </div>
                        ) : (
                          <span className="text-slate text-[10px] italic font-mono">Resolved</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {disputes.length === 0 && (
                <div className="py-8 text-center text-xs text-slate font-sans">No disputes logged.</div>
              )}
            </div>
          )}

          {/* ── FLAGGED REVIEWS ────────────────────────────────────────────────── */}
          {tab === 'flagged-reviews' && (
            <div className="bg-paper border-2 border-ink sketch-card p-0 overflow-hidden rotate-[-0.2deg]">
              <table className="w-full text-xs font-sans">
                <thead className="bg-paper border-b-2 border-ink">
                  <tr>
                    {['Gig / Review details', 'Reviewer', 'Reviewee', 'Rating', 'Flags', 'Action'].map(h => (
                      <th key={h} className="text-left px-4 py-3 text-[10px] font-bold font-display uppercase tracking-widest text-ink">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y-2 divide-ink">
                  {flaggedReviews.map(r => (
                    <tr key={r._id} className="hover:bg-line-gray/20 transition-colors">
                      <td className="px-4 py-3 max-w-[220px]">
                        <p className="font-bold text-ink uppercase font-display text-[10px]">{r.gigId?.title || '—'}</p>
                        <p className="text-slate font-sans mt-1">Comment: "{r.comment || 'no comment'}"</p>
                      </td>
                      <td className="px-4 py-3">
                        <p className="font-bold text-ink uppercase font-display text-[10px]">{r.reviewerId?.name}</p>
                        <p className="text-slate text-[9px] font-mono">{r.reviewerId?.role.toUpperCase()}</p>
                      </td>
                      <td className="px-4 py-3">
                        <p className="font-bold text-ink uppercase font-display text-[10px]">{r.revieweeId?.name}</p>
                        <p className="text-slate text-[9px] font-mono">{r.revieweeId?.role.toUpperCase()}</p>
                      </td>
                      <td className="px-4 py-3 font-mono text-[10px] text-transit-gold font-bold">{r.rating} ★</td>
                      <td className="px-4 py-3">
                        <div className="flex flex-wrap gap-1">
                          {r.fraudFlags?.map((f: string) => (
                            <span key={f} className="px-1.5 py-0.5 border border-ink text-[9px] font-mono font-bold text-signal-coral bg-signal-coral/10 sketch-badge uppercase">
                              {f.replace(/_/g, ' ')}
                            </span>
                          ))}
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex flex-col sm:flex-row gap-2">
                          <button
                            onClick={() => handleDismissFlag(r._id)}
                            disabled={actionLoading === r._id}
                            className="px-2 py-1 bg-route-teal text-white border-2 border-ink text-[10px] font-bold font-display uppercase tracking-wider sketch-button disabled:opacity-50"
                          >
                            Dismiss
                          </button>
                          <button
                            onClick={() => handleDeleteReview(r._id)}
                            disabled={actionLoading === r._id}
                            className="px-2 py-1 bg-signal-coral text-white border-2 border-ink text-[10px] font-bold font-display uppercase tracking-wider sketch-button disabled:opacity-50"
                          >
                            Delete
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {flaggedReviews.length === 0 && (
                <div className="py-8 text-center text-xs text-slate font-sans">No flagged reviews in the queue.</div>
              )}
            </div>
          )}
        </>
      )}
    </div>
  );
};
