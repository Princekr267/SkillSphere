import React, { useState, useEffect, useCallback, useRef } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { useAuth } from '../context/AuthContext';
import { GigCard, type GigCardData } from '../components/GigCard';
import api from '../utils/api';
import { Search, SlidersHorizontal, MapPin, Loader2, X } from 'lucide-react';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Badge } from '../components/ui/Badge';

// Fix Leaflet default icon path issue with Vite bundler
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
});

// Custom teal marker for gig pins
const gigIcon = L.divIcon({
  className: '',
  html: `<div style="width:14px;height:14px;background:#0D9488;border:2.5px solid #22252A;border-radius:60% 40% 50% 50% / 40% 50% 60% 50%;"></div>`,
  iconSize: [14, 14],
  iconAnchor: [7, 7],
});

const userIcon = L.divIcon({
  className: '',
  html: `<div style="width:16px;height:16px;background:#F43F5E;border:3px solid #22252A;border-radius:40% 60% 50% 55% / 55% 45% 65% 45%;"></div>`,
  iconSize: [16, 16],
  iconAnchor: [8, 8],
});

// Helper: Haversine distance in km
function haversineKm(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

// Auto-centers map when center prop changes
const MapCentre: React.FC<{ center: [number, number]; zoom: number }> = ({ center, zoom }) => {
  const map = useMap();
  useEffect(() => { map.setView(center, zoom); }, [center, zoom]);
  return null;
};

const GIG_CATEGORIES = [
  'Technology & Development',
  'Design & Creative',
  'Home & Trades',
  'Writing & Translation',
  'Marketing & Sales',
  'Teaching & Tutoring',
  'Other',
];

export const BrowseGigs: React.FC = () => {
  const { user } = useAuth();

  // User's coordinate [lat, lng]
  const userLat = user?.location.coordinates[1] ?? 28.6139;
  const userLng = user?.location.coordinates[0] ?? 77.2090;

  const [gigs, setGigs] = useState<GigCardData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Filters
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('');
  const [radius, setRadius] = useState(50);
  const [skillFilter, setSkillFilter] = useState('');
  const [minPrice, setMinPrice] = useState('');
  const [maxPrice, setMaxPrice] = useState('');
  const [minRating, setMinRating] = useState('');

  // UI state
  const [highlightedId, setHighlightedId] = useState<string | null>(null);
  const [showFilters, setShowFilters] = useState(false);
  const searchTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  const fetchGigs = useCallback(async (searchVal: string, cat: string, rad: number, skills: string, minP: string, maxP: string, minR: string) => {
    setLoading(true);
    setError('');
    try {
      const params: any = { lat: userLat, lng: userLng, radius: rad };
      if (cat) params.category = cat;
      if (skills.trim()) params.skills = skills.trim();
      if (searchVal.trim()) params.search = searchVal.trim();
      if (minP) params.minPrice = minP;
      if (maxP) params.maxPrice = maxP;
      if (minR) params.minRating = minR;

      const res = await api.get('/gigs/nearby', { params });
      if (res.data.success) {
        const enriched: GigCardData[] = res.data.gigs.map((g: any) => ({
          ...g,
          distanceKm: haversineKm(
            userLat, userLng,
            g.location.coordinates[1], g.location.coordinates[0]
          ),
        }));
        setGigs(enriched);
      }
    } catch (err: any) {
      setError('Could not load gigs. Make sure the server is running.');
    } finally {
      setLoading(false);
    }
  }, [userLat, userLng]);

  // Initial load
  useEffect(() => { fetchGigs(search, category, radius, skillFilter, minPrice, maxPrice, minRating); }, []);

  // Debounce search changes
  const handleSearchChange = (val: string) => {
    setSearch(val);
    clearTimeout(searchTimer.current);
    searchTimer.current = setTimeout(() => fetchGigs(val, category, radius, skillFilter, minPrice, maxPrice, minRating), 400);
  };

  const handleFilterApply = () => {
    fetchGigs(search, category, radius, skillFilter, minPrice, maxPrice, minRating);
    setShowFilters(false);
  };

  return (
    <div className="flex-grow bg-cream flex flex-col animate-fade-in font-sans transition-colors duration-200" style={{ minHeight: 0 }}>
      
      {/* Top toolbar */}
      <div className="border-b-2 border-ink bg-cream px-4 py-3 flex items-center space-x-3 text-left">
        <div className="flex items-center space-x-2 flex-grow max-w-md relative">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-ink/50 z-10" />
          <Input
            type="text"
            value={search}
            onChange={e => handleSearchChange(e.target.value)}
            placeholder="Search gigs by title..."
            className="pl-10 pr-10"
          />
          {search && (
            <button onClick={() => { setSearch(''); fetchGigs('', category, radius, skillFilter, minPrice, maxPrice, minRating); }} className="absolute right-3.5 top-1/2 -translate-y-1/2 cursor-pointer">
              <X className="h-4 w-4 text-ink hover:text-accent-coral" />
            </button>
          )}
        </div>

        <Button
          onClick={() => setShowFilters(f => !f)}
          variant="outline"
          size="md"
        >
          <SlidersHorizontal className="h-4 w-4 mr-1" />
          <span>Filters</span>
        </Button>

        <span className="text-[10px] font-mono text-ink/60 ml-auto font-bold uppercase">
          {loading ? '...' : `${gigs.length} GIGS FOUND`}
        </span>
      </div>

      {/* Filter panel (collapsible) */}
      {showFilters && (
        <div className="bg-cream border-b-2 border-ink px-6 py-6 flex flex-wrap items-end gap-4 relative z-10 text-left animate-fade-in">
          <div className="space-y-1 text-left">
            <label className="text-[10px] font-bold font-display uppercase tracking-wider text-ink pl-1">Category</label>
            <select
              value={category}
              onChange={e => setCategory(e.target.value)}
              className="px-3 py-2 bg-cream border-2 border-ink rounded-lg text-ink text-xs focus:outline-none focus:bg-accent-amber/10 focus:border-accent-amber font-sans"
            >
              <option value="">All Categories</option>
              {GIG_CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>

          <div className="space-y-1 min-w-[150px] text-left">
            <label className="text-[10px] font-bold font-display uppercase tracking-wider text-ink pl-1">
              Radius: <span className="font-mono text-accent-teal font-bold">{radius}km</span>
            </label>
            <input
              type="range"
              min="5" max="200" step="5"
              value={radius}
              onChange={e => setRadius(Number(e.target.value))}
              className="w-full accent-accent-teal cursor-pointer"
            />
          </div>

          <div className="space-y-1 flex-grow min-w-[150px] text-left">
            <label className="text-[10px] font-bold font-display uppercase tracking-wider text-ink pl-1">Skills (comma-separated)</label>
            <Input
              type="text"
              value={skillFilter}
              onChange={e => setSkillFilter(e.target.value)}
              placeholder="e.g. React, Plumber, Figma"
              className="py-1.5"
            />
          </div>

          <div className="space-y-1 text-left">
            <label className="text-[10px] font-bold font-display uppercase tracking-wider text-ink pl-1">Min Price (₹)</label>
            <Input
              type="number"
              value={minPrice}
              onChange={e => setMinPrice(e.target.value)}
              placeholder="Min budget"
              className="w-24 py-1.5 font-mono"
            />
          </div>

          <div className="space-y-1 text-left">
            <label className="text-[10px] font-bold font-display uppercase tracking-wider text-ink pl-1">Max Price (₹)</label>
            <Input
              type="number"
              value={maxPrice}
              onChange={e => setMaxPrice(e.target.value)}
              placeholder="Max budget"
              className="w-24 py-1.5 font-mono"
            />
          </div>

          <div className="space-y-1 text-left">
            <label className="text-[10px] font-bold font-display uppercase tracking-wider text-ink pl-1">Min Rating</label>
            <select
              value={minRating}
              onChange={e => setMinRating(e.target.value)}
              className="px-3 py-2 bg-cream border-2 border-ink rounded-lg text-ink text-xs focus:outline-none focus:bg-accent-amber/10 focus:border-accent-amber font-sans"
            >
              <option value="">Any Rating</option>
              <option value="3">3.0+ ★</option>
              <option value="4">4.0+ ★</option>
              <option value="4.5">4.5+ ★</option>
            </select>
          </div>

          <Button
            onClick={handleFilterApply}
            variant="coral"
            className="py-2"
          >
            Apply Filters
          </Button>
        </div>
      )}

      {/* Main split view: map left, list right */}
      <div className="flex flex-col lg:flex-row flex-grow overflow-hidden">
        
        {/* Map Panel */}
        <div className="lg:w-[45%] h-64 lg:h-auto border-b-2 lg:border-b-0 lg:border-r-2 border-ink relative flex-shrink-0 z-0">
          <MapContainer
            center={[userLat, userLng]}
            zoom={11}
            style={{ width: '100%', height: '100%' }}
            zoomControl={false}
          >
            <TileLayer
              attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            />
            <MapCentre center={[userLat, userLng]} zoom={11} />

            {/* User's location */}
            <Marker position={[userLat, userLng]} icon={userIcon}>
              <Popup>
                <span className="text-xs font-mono">You are here: {user?.location.city}</span>
              </Popup>
            </Marker>

            {/* Gig pins */}
            {gigs.map(gig => {
              const [lng, lat] = gig.location.coordinates;
              const isHighlighted = gig._id === highlightedId;
              return (
                <Marker
                  key={gig._id}
                  position={[lat, lng]}
                  icon={isHighlighted ? userIcon : gigIcon}
                  eventHandlers={{ click: () => setHighlightedId(gig._id) }}
                >
                  <Popup>
                    <div className="text-xs text-left">
                      <strong className="block font-display uppercase">{gig.title}</strong>
                      <span className="font-mono text-[11px] font-bold">₹{gig.budget.toLocaleString()}</span>
                      <br />
                      <span className="text-ink/60 font-bold">{gig.location.city}</span>
                    </div>
                  </Popup>
                </Marker>
              );
            })}
          </MapContainer>

          {/* Map legend */}
          <div className="absolute bottom-3 left-3 bg-cream border-2 border-ink rounded-lg px-3.5 py-2 z-[1000] text-[9px] font-mono text-ink space-y-1.5 shadow-retro">
            <div className="flex items-center space-x-2">
              <span className="w-2.5 h-2.5 bg-accent-coral border border-ink inline-block flex-shrink-0 rounded-full"></span>
              <span className="font-bold">YOUR LOCATION</span>
            </div>
            <div className="flex items-center space-x-2">
              <span className="w-2.5 h-2.5 bg-accent-teal border border-ink inline-block flex-shrink-0 rounded-full"></span>
              <span className="font-bold">OPEN GIG</span>
            </div>
          </div>
        </div>

        {/* List Panel */}
        <div className="flex-grow overflow-y-auto p-4 lg:p-6 bg-cream">
          {loading ? (
            <div className="flex flex-col items-center justify-center h-48 space-y-3">
              <Loader2 className="h-7 w-7 text-accent-teal animate-spin" />
              <p className="text-xs font-mono text-ink/60 uppercase tracking-wider">Scanning nearby nodes…</p>
            </div>
          ) : error ? (
            <div className="text-center py-12 text-accent-coral text-sm font-sans font-bold">{error}</div>
          ) : gigs.length === 0 ? (
            <div className="text-center py-12 border-2 border-dashed border-ink rounded-xl bg-cream/50 shadow-retro-sm">
              <MapPin className="h-8 w-8 mx-auto text-ink/40 mb-3" />
              <h3 className="font-bold font-display text-ink uppercase tracking-tight mb-1">No Gigs Found</h3>
              <p className="text-xs text-ink/60 font-sans max-w-xs mx-auto leading-relaxed">
                No open gigs within {radius}km of {user?.location.city}. Try expanding the radius or removing filters.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
              {gigs.map(gig => (
                <div
                  key={gig._id}
                  onMouseEnter={() => setHighlightedId(gig._id)}
                  onMouseLeave={() => setHighlightedId(null)}
                >
                  <GigCard
                    gig={gig}
                    showApplyButton={false}
                  />
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
