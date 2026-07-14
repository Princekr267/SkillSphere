import React from 'react';
import { useNavigate } from 'react-router-dom';
import { MapPin, DollarSign, Tag, Users } from 'lucide-react';

export interface GigCardData {
  _id: string;
  title: string;
  description: string;
  category: string;
  budget: number;
  budgetType: 'fixed' | 'hourly';
  skillsRequired: string[];
  location: {
    city: string;
    coordinates: [number, number];
  };
  status: string;
  applicants: any[];
  clientId: {
    name: string;
    companyName?: string;
    rating?: number;
    avatar?: string;
  };
  distanceKm?: number; // optional — injected by browse page
}


interface GigCardProps {
  gig: GigCardData;
  onApply?: (gig: GigCardData) => void;
  showApplyButton?: boolean;
  compact?: boolean;
}

const CATEGORY_COLORS: Record<string, string> = {
  'Technology & Development': 'bg-route-teal/10 text-route-teal border-route-teal/25',
  'Design & Creative':        'bg-transit-gold/10 text-transit-gold border-transit-gold/25',
  'Home & Trades':            'bg-slate/10 text-slate border-slate/25',
  'Writing & Translation':    'bg-ink/10 text-ink border-ink/25',
  'Marketing & Sales':        'bg-signal-coral/10 text-signal-coral border-signal-coral/25',
  'Teaching & Tutoring':      'bg-route-teal/10 text-route-teal border-route-teal/25',
  'Other':                    'bg-line-gray/40 text-slate border-line-gray',
};

export const GigCard: React.FC<GigCardProps> = ({ gig, onApply, showApplyButton = true, compact = false }) => {
  const navigate = useNavigate();
  const catColor = CATEGORY_COLORS[gig.category] || CATEGORY_COLORS['Other'];

  return (
    <div
      className="bg-white border border-line-gray rounded-sm p-5 hover:border-slate transition-colors flex flex-col group cursor-pointer"
      onClick={() => navigate(`/gigs/${gig._id}`)}
    >
      {/* Top row: category + distance */}
      <div className="flex items-center justify-between mb-3">
        <span className={`inline-flex items-center space-x-1.5 px-2.5 py-1 rounded-sm border text-[10px] font-bold font-display uppercase tracking-wider ${catColor}`}>
          <Tag className="h-3 w-3" />
          <span>{gig.category}</span>
        </span>
        {gig.distanceKm !== undefined && (
          <span className="text-[10px] font-mono text-slate bg-paper px-2 py-0.5 rounded-sm border border-line-gray">
            {gig.distanceKm < 1 ? `${(gig.distanceKm * 1000).toFixed(0)}m` : `${gig.distanceKm.toFixed(1)}km`} AWAY
          </span>
        )}
      </div>

      {/* Title */}
      <h3 className="font-black font-display text-ink uppercase tracking-tight text-sm leading-snug group-hover:text-route-teal transition-colors mb-1 line-clamp-2">
        {gig.title}
      </h3>

      {/* Client info with avatar */}
      <div className="flex items-center space-x-2 mb-3">
        <div className="h-5 w-5 rounded-full bg-slate/10 border border-slate/30 overflow-hidden flex items-center justify-center font-display text-[9px] font-black text-ink uppercase flex-shrink-0">
          {gig.clientId?.avatar ? (
            <img src={gig.clientId.avatar} alt={gig.clientId.name} className="h-full w-full object-cover" />
          ) : (
            (gig.clientId?.companyName || gig.clientId?.name || '?').charAt(0)
          )}
        </div>
        <span className="text-[11px] text-slate font-sans truncate">
          {gig.clientId?.companyName || gig.clientId?.name || 'Unknown Client'}
        </span>
      </div>


      {!compact && (
        <p className="text-xs text-slate/80 font-sans leading-relaxed mb-4 line-clamp-3 flex-grow">
          {gig.description}
        </p>
      )}

      {/* Skills */}
      {gig.skillsRequired.length > 0 && (
        <div className="flex flex-wrap gap-1.5 mb-4">
          {gig.skillsRequired.slice(0, 4).map((skill, i) => (
            <span key={i} className="px-2 py-0.5 rounded-sm bg-paper border border-line-gray text-[10px] font-mono text-slate uppercase">
              {skill}
            </span>
          ))}
          {gig.skillsRequired.length > 4 && (
            <span className="px-2 py-0.5 rounded-sm bg-paper border border-line-gray text-[10px] font-mono text-slate">
              +{gig.skillsRequired.length - 4}
            </span>
          )}
        </div>
      )}

      {/* Footer: budget + city + applicants */}
      <div className="flex items-center justify-between pt-3 border-t border-line-gray/60 mt-auto">
        <div className="flex items-center space-x-3">
          <span className="flex items-center space-x-1 font-mono text-sm font-bold text-ink">
            <DollarSign className="h-3.5 w-3.5 text-route-teal" />
            <span>₹{gig.budget.toLocaleString()}{gig.budgetType === 'hourly' ? '/hr' : ''}</span>
          </span>
          <span className="flex items-center space-x-1 text-[10px] font-mono text-slate">
            <MapPin className="h-3 w-3" />
            <span>{gig.location.city}</span>
          </span>
        </div>
        <span className="flex items-center space-x-1 text-[10px] font-mono text-slate">
          <Users className="h-3 w-3" />
          <span>{gig.applicants?.length || 0} applied</span>
        </span>
      </div>

      {showApplyButton && onApply && (
        <button
          onClick={(e) => {
            e.stopPropagation();
            onApply(gig);
          }}
          className="mt-4 w-full py-2 rounded-sm bg-signal-coral hover:bg-signal-coral/90 text-white text-xs font-bold font-display uppercase tracking-widest transition-colors"
        >
          View & Apply
        </button>
      )}
    </div>
  );
};
