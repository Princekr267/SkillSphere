import React, { useState, useEffect } from 'react';
import api from '../../utils/api';
import { useNavigate } from 'react-router-dom';
import { MapPin, DollarSign, Tag, Loader2, ExternalLink } from 'lucide-react';

interface MyApplication {
  _id: string;
  title: string;
  category: string;
  budget: number;
  budgetType: 'fixed' | 'hourly';
  location: { city: string };
  status: string;
  escrowStatus: string;
  clientId: {
    name: string;
    companyName?: string;
  };
  myApplication: {
    message: string;
    status: 'pending' | 'accepted' | 'rejected';
    appliedAt: string;
  };
}

const APP_STATUS_STYLES: Record<string, string> = {
  pending:  'bg-transit-gold/10 text-transit-gold border-transit-gold/30',
  accepted: 'bg-route-teal/10 text-route-teal border-route-teal/30',
  rejected: 'bg-signal-coral/10 text-signal-coral border-signal-coral/30',
};

const GIG_STATUS_STYLES: Record<string, string> = {
  open:        'text-route-teal',
  in_progress: 'text-transit-gold',
  completed:   'text-slate',
  cancelled:   'text-signal-coral',
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
        <Loader2 className="h-7 w-7 text-route-teal animate-spin" />
      </div>
    );
  }

  if (error) {
    return <p className="text-xs text-signal-coral font-sans py-6">{error}</p>;
  }

  return (
    <div className="space-y-6">
      <div className="border-b border-line-gray pb-4">
        <span className="text-[10px] font-mono text-slate uppercase tracking-widest block">Track Record</span>
        <h2 className="text-lg font-black font-display text-ink uppercase tracking-tight">My Applications</h2>
      </div>

      {applications.length === 0 ? (
        <div className="text-center py-12 border border-dashed border-line-gray rounded-sm">
          <Tag className="h-8 w-8 mx-auto text-slate mb-2" />
          <h3 className="font-bold font-display text-ink uppercase tracking-tight text-sm mb-1">No Applications Yet</h3>
          <p className="text-xs text-slate font-sans max-w-xs mx-auto mb-4">
            Browse nearby gigs and submit applications to start building your track record.
          </p>
          <button
            onClick={() => navigate('/gigs')}
            className="px-4 py-2 rounded-sm bg-route-teal hover:bg-route-teal/90 text-white text-xs font-bold font-display uppercase tracking-widest transition-colors"
          >
            Browse Gigs
          </button>
        </div>
      ) : (
        <div className="space-y-4">
          {applications.map(app => (
            <div
              key={app._id}
              className="bg-white border border-line-gray rounded-sm p-5 hover:border-slate transition-colors"
            >
              <div className="flex items-start justify-between gap-4 mb-4">
                <div>
                  <h3 className="font-bold font-display text-ink uppercase tracking-tight text-sm leading-tight mb-1">
                    {app.title}
                  </h3>
                  <p className="text-[11px] text-slate font-sans">
                    {app.clientId?.companyName || app.clientId?.name || 'Client'}
                  </p>
                </div>
                <span className={`flex-shrink-0 px-2.5 py-1 rounded-sm border text-[10px] font-bold font-mono uppercase ${APP_STATUS_STYLES[app.myApplication?.status] || APP_STATUS_STYLES.pending}`}>
                  {app.myApplication?.status?.toUpperCase()}
                </span>
              </div>

              {/* Gig meta */}
              <div className="flex flex-wrap items-center gap-4 font-mono text-[10px] text-slate mb-4">
                <span className="flex items-center space-x-1">
                  <Tag className="h-3 w-3" />
                  <span>{app.category}</span>
                </span>
                <span className="flex items-center space-x-1">
                  <DollarSign className="h-3 w-3 text-route-teal" />
                  <span className="font-bold text-ink">₹{app.budget.toLocaleString()}{app.budgetType === 'hourly' ? '/hr' : ''}</span>
                </span>
                <span className="flex items-center space-x-1">
                  <MapPin className="h-3 w-3" />
                  <span>{app.location.city}</span>
                </span>
                <span className={`uppercase font-bold ${GIG_STATUS_STYLES[app.status] || ''}`}>
                  GIG: {app.status.replace('_', ' ')}
                </span>
                {app.escrowStatus !== 'none' && (
                  <span className="text-transit-gold uppercase font-bold">
                    ESCROW: {app.escrowStatus.replace('_', ' ')}
                  </span>
                )}
              </div>

              {/* My cover message */}
              {app.myApplication?.message && (
                <div className="bg-paper/40 border border-line-gray p-3 rounded-sm mb-4">
                  <p className="text-[10px] font-mono text-slate uppercase tracking-wider mb-1">Your Cover Message</p>
                  <p className="text-xs text-ink font-sans leading-relaxed line-clamp-3">
                    {app.myApplication.message}
                  </p>
                </div>
              )}

              {/* Applied at + view link */}
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-mono text-slate">
                  APPLIED: {new Date(app.myApplication?.appliedAt).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
                </span>
                <button
                  onClick={() => navigate(`/gigs/${app._id}`)}
                  className="flex items-center space-x-1 text-xs text-route-teal hover:underline font-bold font-display uppercase tracking-wider"
                >
                  <ExternalLink className="h-3 w-3" />
                  <span>View Gig</span>
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
