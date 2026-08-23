import React, { useState, useEffect } from 'react';
import api from '../../utils/api';
import { useNavigate } from 'react-router-dom';
import { MapPin, DollarSign, Tag, Loader2, ExternalLink, MessageSquare } from 'lucide-react';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';

interface MyApplication {
  _id: string;
  title: string;
  category: string;
  budget: number;
  finalAgreedAmount?: number;
  budgetType: 'fixed' | 'hourly';
  location: { city: string };
  status: string;
  escrowStatus: string;
  clientId: {
    name: string;
    companyName?: string;
    currentCompanyName?: string;
  };
  myApplication: {
    _id?: string;
    message: string;
    status: 'pending' | 'accepted' | 'rejected';
    appliedAt: string;
  };
}

const APP_STATUS_STYLES: Record<string, string> = {
  pending:  'bg-accent-amber text-ink',
  accepted: 'bg-accent-teal text-ink',
  rejected: 'bg-accent-coral text-ink',
};

const GIG_STATUS_STYLES: Record<string, string> = {
  open:        'text-accent-teal',
  in_progress: 'text-accent-amber',
  completed:   'text-ink/60',
  cancelled:   'text-accent-coral',
};

export const FreelancerApplications: React.FC = () => {
  const navigate = useNavigate();
  const [applications, setApplications] = useState<MyApplication[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchApplications = async () => {
      try {
        const res = await api.get('/gigs/applications');
        if (res.data.success) setApplications(res.data.applications);
      } catch (err) {
        setError('Could not load your applications. Make sure the server is running.');
      } finally {
        setLoading(false);
      }
    };
    fetchApplications();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16">
        <Loader2 className="h-7 w-7 text-accent-teal animate-spin" />
      </div>
    );
  }

  if (error) {
    return <p className="text-xs text-accent-coral font-sans py-6">{error}</p>;
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="border-b-2 border-ink pb-4 text-left">
        <span className="text-[10px] font-mono text-ink/60 uppercase tracking-widest block">Track Record</span>
        <h2 className="text-lg font-display font-black text-ink uppercase tracking-tight">My Applications</h2>
      </div>

      {applications.length === 0 ? (
        <div className="text-center py-12 border-2 border-dashed border-ink rounded-xl bg-cream/50 shadow-retro-sm">
          <Tag className="h-8 w-8 mx-auto text-ink/40 mb-2" />
          <h3 className="font-bold font-display text-ink uppercase tracking-tight text-sm mb-1">No Applications Yet</h3>
          <p className="text-xs text-ink/60 font-sans max-w-xs mx-auto mb-4">
            Browse nearby gigs and submit applications to start building your track record.
          </p>
          <Button
            onClick={() => navigate('/gigs')}
            variant="primary"
            size="md"
          >
            Browse Gigs
          </Button>
        </div>
      ) : (
        <div className="space-y-5">
          {applications.map((app, aIdx) => {
            const variants: Array<'teal' | 'amber' | 'pink' | 'coral'> = ['teal', 'amber', 'pink', 'coral'];
            const variant = variants[aIdx % variants.length];

            return (
              <Card key={app._id} variant={variant} className="space-y-3">
                {/* Main Gig Details Box */}
                <div className="bg-cream border-2 border-ink rounded-xl p-4 shadow-retro-sm space-y-3">
                  <div className="flex items-start justify-between gap-4">
                    <div className="text-left min-w-0">
                      <h3 className="font-bold font-display text-ink uppercase tracking-tight text-sm leading-tight mb-1 truncate">
                        {app.title}
                      </h3>
                      <p className="text-[11px] text-ink/60 font-sans font-bold truncate">
                        {app.clientId?.currentCompanyName || app.clientId?.name || 'Client'}
                      </p>
                    </div>
                    <Badge variant="outline" className={`${APP_STATUS_STYLES[app.myApplication?.status] || APP_STATUS_STYLES.pending} shadow-none flex-shrink-0`}>
                      {app.myApplication?.status}
                    </Badge>
                  </div>

                  {/* Gig meta */}
                  <div className="flex flex-wrap items-center gap-3 font-mono text-[10px] text-ink/70 pt-2 border-t border-ink/10">
                    <span className="flex items-center space-x-1">
                      <Tag className="h-3 w-3 text-accent-teal" />
                      <span>{app.category}</span>
                    </span>
                    <span className="flex items-center space-x-1">
                      <DollarSign className="h-3 w-3 text-accent-teal" />
                      <span className="font-bold text-ink">₹{(app.finalAgreedAmount ?? app.budget).toLocaleString()}{app.budgetType === 'hourly' ? '/hr' : ''}</span>
                    </span>
                    <span className="flex items-center space-x-1">
                      <MapPin className="h-3 w-3 text-accent-teal" />
                      <span>{app.location.city}</span>
                    </span>
                    <span className={`uppercase font-bold ${GIG_STATUS_STYLES[app.status] || ''}`}>
                      GIG: {app.status.replace('_', ' ')}
                    </span>
                    {app.escrowStatus !== 'none' && (
                      <span className="text-accent-amber uppercase font-bold">
                        ESCROW: {app.escrowStatus.replace('_', ' ')}
                      </span>
                    )}
                  </div>
                </div>

                {/* My cover message */}
                {app.myApplication?.message && (
                  <div className="bg-cream border-2 border-ink rounded-xl p-3.5 shadow-retro-sm text-left">
                    <p className="text-[10px] font-mono text-ink/60 uppercase font-bold tracking-wider mb-1">Your Cover Message</p>
                    <p className="text-xs text-ink font-sans leading-relaxed line-clamp-3 font-medium">
                      {app.myApplication.message}
                    </p>
                  </div>
                )}

                {/* Applied at + view link */}
                <div className="bg-cream border-2 border-ink rounded-xl p-3 shadow-retro-sm flex flex-wrap sm:flex-nowrap items-center justify-between gap-2">
                  <span className="text-[10px] font-mono text-ink/70 font-bold min-w-0 truncate">
                    APPLIED: {new Date(app.myApplication?.appliedAt).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
                  </span>
                  <div className="flex items-center space-x-3">
                    {app.myApplication?._id && (
                      <button
                        onClick={() => navigate(`/gigs/${app.myApplication._id}/chat`, { state: { from: '/freelancer-dashboard?tab=applications' } })}
                        className="flex items-center space-x-1 text-xs text-accent-teal hover:underline font-bold font-display uppercase tracking-wider cursor-pointer"
                      >
                        <MessageSquare className="h-3.5 w-3.5" />
                        <span>Chat</span>
                      </button>
                    )}
                    <button
                      onClick={() => navigate(`/gigs/${app._id}`, { state: { from: '/freelancer-dashboard?tab=applications' } })}
                      className="flex items-center space-x-1 text-xs text-accent-teal hover:underline font-bold font-display uppercase tracking-wider cursor-pointer"
                    >
                      <ExternalLink className="h-3.5 w-3.5" />
                      <span>View Gig</span>
                    </button>
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
