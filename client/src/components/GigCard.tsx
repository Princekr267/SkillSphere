import React from 'react';
import { useNavigate } from 'react-router-dom';
import { MapPin, DollarSign, Tag, Users } from 'lucide-react';
import { Card } from './ui/Card';
import { Button } from './ui/Button';
import { Badge } from './ui/Badge';

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
  'Technology & Development': 'bg-accent-teal text-ink border-ink',
  'Design & Creative':        'bg-accent-amber text-ink border-ink',
  'Home & Trades':            'bg-accent-pink text-ink border-ink',
  'Writing & Translation':    'bg-cream text-ink border-ink',
  'Marketing & Sales':        'bg-accent-coral text-ink border-ink',
  'Teaching & Tutoring':      'bg-accent-teal text-ink border-ink',
  'Other':                    'bg-cream text-ink border-ink/40',
};

export const GigCard: React.FC<GigCardProps> = ({ gig, onApply, showApplyButton = true, compact = false }) => {
  const navigate = useNavigate();
  const catColor = CATEGORY_COLORS[gig.category] || CATEGORY_COLORS['Other'];

  return (
    <Card
      onClick={() => navigate(`/gigs/${gig._id}`)}
      className="transition-all flex flex-col group cursor-pointer h-full text-left"
    >
      {/* Top row: category + distance */}
      <div className="flex items-center justify-between mb-3 w-full">
        <Badge variant="outline" className={`${catColor} shadow-none`}>
          <Tag className="h-3 w-3 mr-1" />
          <span>{gig.category}</span>
        </Badge>
        {gig.distanceKm !== undefined && (
          <Badge variant="outline" className="font-mono shadow-none text-ink bg-cream">
            {gig.distanceKm < 1 ? `${(gig.distanceKm * 1000).toFixed(0)}m` : `${gig.distanceKm.toFixed(1)}km`} AWAY
          </Badge>
        )}
      </div>

      {/* Title */}
      <h3 className="font-black font-display text-ink uppercase tracking-tight text-sm leading-snug group-hover:text-accent-teal transition-colors mb-1 line-clamp-2">
        {gig.title}
      </h3>

      {/* Client info with avatar */}
      <div className="flex items-center space-x-2 mb-3">
        <div className="h-5 w-5 bg-cream border border-ink rounded overflow-hidden flex items-center justify-center font-display text-[9px] font-black text-ink uppercase flex-shrink-0 shadow-retro-sm">
          {gig.clientId?.avatar ? (
            <img src={gig.clientId.avatar} alt={gig.clientId.name} className="h-full w-full object-cover" />
          ) : (
            (gig.clientId?.companyName || gig.clientId?.name || '?').charAt(0)
          )}
        </div>
        <span className="text-[11px] text-ink/75 font-sans font-bold truncate">
          {gig.clientId?.companyName || gig.clientId?.name || 'Unknown Client'}
        </span>
      </div>

      {!compact && (
        <p className="text-xs text-ink/70 font-sans leading-relaxed mb-4 line-clamp-3 flex-grow">
          {gig.description}
        </p>
      )}

      {/* Skills */}
      {gig.skillsRequired.length > 0 && (
        <div className="flex flex-wrap gap-1.5 mb-4">
          {gig.skillsRequired.slice(0, 4).map((skill, i) => (
            <Badge key={i} variant="outline" className="text-[9px] font-mono shadow-none bg-cream border-ink/40">
              {skill}
            </Badge>
          ))}
          {gig.skillsRequired.length > 4 && (
            <Badge variant="outline" className="text-[9px] font-mono shadow-none bg-cream border-ink/40">
              +{gig.skillsRequired.length - 4}
            </Badge>
          )}
        </div>
      )}

      {/* Footer: budget + city + applicants */}
      <div className="flex items-center justify-between pt-3 border-t border-ink/10 mt-auto w-full">
        <div className="flex items-center space-x-3">
          <span className="flex items-center space-x-0.5 font-mono text-xs font-bold text-ink">
            <DollarSign className="h-3.5 w-3.5 text-accent-teal" />
            <span>₹{gig.budget.toLocaleString()}{gig.budgetType === 'hourly' ? '/hr' : ''}</span>
          </span>
          <span className="flex items-center space-x-1 text-[10px] font-mono text-ink/60">
            <MapPin className="h-3 w-3" />
            <span>{gig.location.city}</span>
          </span>
        </div>
        <span className="flex items-center space-x-1 text-[10px] font-mono text-ink/60">
          <Users className="h-3 w-3" />
          <span>{gig.applicants?.length || 0} applied</span>
        </span>
      </div>

      {showApplyButton && onApply && (
        <Button
          onClick={(e) => {
            e.stopPropagation();
            onApply(gig);
          }}
          variant="coral"
          size="sm"
          className="mt-4 w-full"
        >
          View & Apply
        </Button>
      )}
    </Card>
  );
};
