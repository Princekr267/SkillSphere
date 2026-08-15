import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import {
  Building, Users, Briefcase, KeyRound, RefreshCw, Copy, Check,
  AlertTriangle, ChevronDown, ExternalLink, Loader2,
  Globe, MapPin, Hash, UserMinus, Trash2,
} from 'lucide-react';
import api from '../utils/api';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Badge } from '../components/ui/Badge';
import { useAuth } from '../context/AuthContext';

// ─── Types ────────────────────────────────────────────────────────────────────

interface RegistrationDetails {
  businessRegistrationNumber?: string;
  taxId?: string;
  country: string;
  city: string;
}

interface Company {
  _id: string;
  name: string;
  industry: string;
  description?: string;
  website?: string;
  registrationDetails: RegistrationDetails;
  inviteKey: string;
  createdBy: { _id: string; name: string; email: string };
  createdAt: string;
}

interface MyCompany {
  orgRole: 'owner' | 'member';
  joinedAt: string;
  company: Company;
}

interface Member {
  _id: string;
  orgRole: 'owner' | 'member';
  joinedAt: string;
  userId: {
    _id: string;
    name: string;
    email: string;
    avatar?: string;
    location?: { city: string };
  };
}

interface Gig {
  _id: string;
  title: string;
  category: string;
  budget: number;
  budgetType: 'fixed' | 'hourly';
  status: string;
  createdAt: string;
  clientId: { _id: string; name: string; email: string };
}

export const CompanyDashboard: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();

  const [company, setCompany] = useState<Company | null>(null);
  const [orgRole, setOrgRole] = useState<'owner' | 'member'>('member');
  const [myCompanies, setMyCompanies] = useState<MyCompany[]>([]);
  const [members, setMembers] = useState<Member[]>([]);
  const [gigs, setGigs] = useState<Gig[]>([]);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Sub-state
  const [keyCopied, setKeyCopied] = useState(false);
  const [regenerating, setRegenerating] = useState(false);
  const [switcherOpen, setSwitcherOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<'gigs' | 'members'>('gigs');
  const [memberActionLoading, setMemberActionLoading] = useState<string | null>(null);

  const loadCompany = useCallback(async () => {
    if (!id) return;
    try {
      setLoading(true);
      setError(null);

      const [detailRes, myRes, membersRes, gigsRes] = await Promise.all([
        api.get(`/companies/${id}`),
        api.get('/companies/mine'),
        api.get(`/companies/${id}/members`),
        api.get(`/companies/${id}/gigs`),
      ]);

      setCompany(detailRes.data.company);
      setOrgRole(detailRes.data.orgRole);
      setMyCompanies(myRes.data.companies);
      setMembers(membersRes.data.members);
      setGigs(gigsRes.data.gigs);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to load company details.');
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    loadCompany();
  }, [loadCompany]);

  const handleCopyKey = () => {
    if (!company?.inviteKey) return;
    navigator.clipboard.writeText(company.inviteKey);
    setKeyCopied(true);
    setTimeout(() => setKeyCopied(false), 2500);
  };

  const handleRegenerateKey = async () => {
    if (!company) return;
    if (!window.confirm('Regenerate invite key? The old key will immediately stop working.')) return;
    setRegenerating(true);
    try {
      const res = await api.post(`/companies/${company._id}/regenerate-key`);
      if (res.data.success) {
        setCompany((prev) => (prev ? { ...prev, inviteKey: res.data.inviteKey } : prev));
      }
    } catch (err: any) {
      alert(err.response?.data?.message || 'Failed to regenerate key.');
    } finally {
      setRegenerating(false);
    }
  };

  const handleRemoveMember = async (targetUserId: string, memberName: string) => {
    if (!company) return;
    if (!window.confirm(`Are you sure you want to remove "${memberName}" from this company?`)) {
      return;
    }

    setMemberActionLoading(targetUserId);
    try {
      const res = await api.delete(`/companies/${company._id}/members/${targetUserId}`);
      if (res.data.success) {
        setMembers((prev) => prev.filter((m) => m.userId?._id !== targetUserId));
      }
    } catch (err: any) {
      alert(err.response?.data?.message || 'Failed to remove member.');
    } finally {
      setMemberActionLoading(null);
    }
  };

  // ── Loading ────────────────────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="flex-grow flex items-center justify-center py-24 bg-cream">
        <Loader2 className="h-7 w-7 animate-spin text-ink/50" />
      </div>
    );
  }

  if (error || !company) {
    return (
      <div className="flex-grow flex items-center justify-center py-24 px-4 bg-cream">
        <Card className="max-w-md w-full p-8 text-center space-y-4">
          <AlertTriangle className="h-8 w-8 text-accent-coral mx-auto" />
          <p className="text-sm font-sans text-ink">{error || 'Company not found.'}</p>
          <Button variant="outline" onClick={() => navigate('/client-dashboard')}>
            Back to Dashboard
          </Button>
        </Card>
      </div>
    );
  }

  return (
    <div className="flex-grow bg-cream px-4 sm:px-8 py-8 max-w-5xl mx-auto w-full space-y-6">

      {/* ── Company Switcher ─────────────────────────────────────────────── */}
      {myCompanies.length > 1 && (
        <div className="relative inline-block">
          <button
            onClick={() => setSwitcherOpen((v) => !v)}
            className="flex items-center gap-2 px-4 py-2 bg-cream border-2 border-ink rounded-lg text-xs font-bold font-display uppercase tracking-widest text-ink hover:bg-ink/5 transition-colors cursor-pointer"
          >
            <Building className="h-3.5 w-3.5" />
            <span>Switch Company</span>
            <ChevronDown className={`h-3.5 w-3.5 transition-transform ${switcherOpen ? 'rotate-180' : ''}`} />
          </button>
          {switcherOpen && (
            <div className="absolute top-full left-0 mt-1 w-64 bg-cream border-2 border-ink rounded-lg shadow-retro z-20 py-1">
              {myCompanies.map(({ company: c, orgRole: r }) => (
                <button
                  key={c._id}
                  onClick={() => {
                    setSwitcherOpen(false);
                    navigate(`/company/${c._id}`);
                  }}
                  className={`w-full text-left px-4 py-2.5 text-xs font-sans hover:bg-ink/5 flex items-center gap-2 cursor-pointer ${
                    c._id === id ? 'font-bold bg-accent-amber/10' : ''
                  }`}
                >
                  <Building className="h-3.5 w-3.5 flex-shrink-0 text-ink/50" />
                  <div className="min-w-0">
                    <p className="truncate font-bold">{c.name}</p>
                    <p className="text-ink/50 capitalize text-[10px]">{r}</p>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ── Header Card ──────────────────────────────────────────────────── */}
      <Card className="p-6">
        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
          <div className="flex items-start gap-4">
            <div className="h-12 w-12 flex-shrink-0 bg-accent-teal border-2 border-ink rounded-xl flex items-center justify-center shadow-retro-sm">
              <Building className="h-6 w-6 text-ink" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h1 className="text-xl font-display font-black text-ink uppercase tracking-tight">{company.name}</h1>
                <Badge variant={orgRole === 'owner' ? 'coral' : 'teal'} className="font-mono text-[9px] shadow-none capitalize">
                  {orgRole}
                </Badge>
              </div>
              <p className="text-xs text-ink/60 font-sans mt-1">{company.industry}</p>
              {company.description && (
                <p className="text-xs text-ink/70 font-sans mt-2 max-w-lg leading-relaxed">{company.description}</p>
              )}
            </div>
          </div>
          <div className="text-xs font-mono text-ink/40 flex-shrink-0 text-right">
            <span>Created {new Date(company.createdAt).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}</span>
          </div>
        </div>

        {/* Meta row */}
        <div className="mt-4 flex flex-wrap gap-4 text-[10px] text-ink/50 font-mono">
          {company.website && (
            <a
              href={company.website}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1 hover:text-accent-teal transition-colors"
            >
              <Globe className="h-3 w-3" /> {company.website.replace(/^https?:\/\//, '')}
            </a>
          )}
          <span className="flex items-center gap-1">
            <MapPin className="h-3 w-3" /> {company.registrationDetails.city}, {company.registrationDetails.country}
          </span>
          {company.registrationDetails.businessRegistrationNumber && (
            <span className="flex items-center gap-1">
              <Hash className="h-3 w-3" /> Reg: {company.registrationDetails.businessRegistrationNumber}
            </span>
          )}
        </div>
      </Card>

      {/* ── Invite Key Card (Owner only) ─────────────────────────────────── */}
      {orgRole === 'owner' && (
        <Card className="p-6">
          <div className="flex items-center gap-2 mb-2">
            <KeyRound className="h-4.5 w-4.5 text-accent-teal" />
            <h3 className="text-sm font-display font-black text-ink uppercase tracking-tight">Organization Invite Key</h3>
          </div>
          <p className="text-xs text-ink/60 font-sans mb-4 leading-relaxed">
            Share this invite key with team members so they can join your company via the "Join Company" page.
          </p>
          <div className="flex items-center gap-3 flex-wrap">
            <div className="flex-grow flex items-center gap-3 px-4 py-3 bg-ink/5 border-2 border-ink rounded-lg font-mono text-lg tracking-widest text-ink font-bold">
              {company.inviteKey}
            </div>
            <div className="flex gap-2">
              <Button variant="outline" onClick={handleCopyKey} className="px-4" title="Copy Key">
                {keyCopied ? <Check className="h-4 w-4 text-accent-teal" /> : <Copy className="h-4 w-4" />}
              </Button>
              <Button
                variant="outline"
                onClick={handleRegenerateKey}
                disabled={regenerating}
                className="px-4"
                title="Regenerate Key"
              >
                {regenerating ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
              </Button>
            </div>
          </div>
        </Card>
      )}

      {/* ── Tab Navigation ───────────────────────────────────────────────── */}
      <div className="flex border-b-2 border-ink">
        {(['gigs', 'members'] as const).map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`px-5 py-2.5 text-[10px] font-bold font-display uppercase tracking-widest transition-colors cursor-pointer ${
              activeTab === tab
                ? 'border-b-2 border-ink text-ink -mb-0.5 bg-cream'
                : 'text-ink/50 hover:text-ink'
            }`}
          >
            {tab === 'gigs' ? `Company Gigs (${gigs.length})` : `Members (${members.length})`}
          </button>
        ))}
      </div>

      {/* ── Gigs Tab ─────────────────────────────────────────────────────── */}
      {activeTab === 'gigs' && (
        <div className="space-y-3">
          {gigs.length === 0 ? (
            <Card className="p-8 text-center">
              <Briefcase className="h-8 w-8 text-ink/30 mx-auto mb-2" />
              <p className="text-sm text-ink/50 font-sans">No gigs posted by company members yet.</p>
            </Card>
          ) : (
            gigs.map((gig) => (
              <Card key={gig._id} className="p-4 flex items-start justify-between gap-4 hover:shadow-retro transition-shadow">
                <div className="flex-grow min-w-0 text-left">
                  <div className="flex items-center gap-2 flex-wrap mb-1">
                    <span className="text-[9px] font-mono text-ink/40 uppercase">{gig.category}</span>
                    <Badge
                      variant={gig.status === 'open' ? 'teal' : gig.status === 'in_progress' ? 'amber' : 'coral'}
                      className="shadow-none text-[9px]"
                    >
                      {gig.status.replace('_', ' ')}
                    </Badge>
                  </div>
                  <h4 className="text-sm font-display font-bold text-ink truncate">{gig.title}</h4>
                  <p className="text-[10px] text-ink/50 font-sans mt-0.5">
                    Posted by <span className="font-bold text-ink">{gig.clientId?.name}</span> · ₹
                    {gig.budget.toLocaleString('en-IN')}/{gig.budgetType === 'fixed' ? 'project' : 'hr'} ·{' '}
                    {new Date(gig.createdAt).toLocaleDateString('en-IN', {
                      day: '2-digit',
                      month: 'short',
                      year: '2-digit',
                    })}
                  </p>
                </div>
                <Link to={`/gigs/${gig._id}`} className="flex-shrink-0">
                  <Button variant="outline" size="sm" className="px-3">
                    <ExternalLink className="h-3.5 w-3.5" />
                  </Button>
                </Link>
              </Card>
            ))
          )}
        </div>
      )}

      {/* ── Members Tab ──────────────────────────────────────────────────── */}
      {activeTab === 'members' && (
        <div className="space-y-3">
          {members.length === 0 ? (
            <Card className="p-8 text-center">
              <Users className="h-8 w-8 text-ink/30 mx-auto mb-2" />
              <p className="text-sm text-ink/50 font-sans">No members in this company yet.</p>
            </Card>
          ) : (
            members.map((m) => {
              const isOwner = orgRole === 'owner';
              const isSelf = m.userId?._id === user?._id;
              const canRemove = isOwner && !isSelf && m.orgRole !== 'owner';

              return (
                <Card key={m._id} className="p-4 flex items-center justify-between gap-4">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="h-10 w-10 flex-shrink-0 rounded-full border-2 border-ink bg-accent-amber/20 flex items-center justify-center text-xs font-bold text-ink overflow-hidden">
                      {m.userId?.avatar ? (
                        <img src={m.userId.avatar} alt={m.userId.name} className="h-full w-full object-cover" />
                      ) : (
                        m.userId?.name?.charAt(0)?.toUpperCase() || '?'
                      )}
                    </div>
                    <div className="min-w-0 text-left">
                      <p className="text-sm font-bold text-ink truncate">
                        {m.userId?.name} {isSelf && <span className="text-[10px] text-ink/50 font-normal">(You)</span>}
                      </p>
                      <p className="text-[10px] text-ink/50 font-mono truncate">{m.userId?.email}</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-3 flex-shrink-0">
                    <Badge variant={m.orgRole === 'owner' ? 'coral' : 'teal'} className="shadow-none font-mono text-[9px]">
                      {m.orgRole}
                    </Badge>

                    {canRemove && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleRemoveMember(m.userId._id, m.userId.name)}
                        disabled={memberActionLoading === m.userId._id}
                        className="border-accent-coral text-accent-coral hover:bg-accent-coral/10 py-1 px-2.5 text-xs"
                        title="Remove member"
                      >
                        {memberActionLoading === m.userId._id ? (
                          <Loader2 className="h-3.5 w-3.5 animate-spin" />
                        ) : (
                          <span className="flex items-center gap-1">
                            <UserMinus className="h-3.5 w-3.5" />
                            <span className="hidden sm:inline">Remove</span>
                          </span>
                        )}
                      </Button>
                    )}
                  </div>
                </Card>
              );
            })
          )}
        </div>
      )}
    </div>
  );
};
