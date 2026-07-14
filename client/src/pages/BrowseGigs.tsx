import React, { useState, useEffect, useCallback, useRef } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { useAuth } from '../context/AuthContext';
import { GigCard, type GigCardData } from '../components/GigCard';
import api from '../utils/api';
import { Search, SlidersHorizontal, MapPin, Loader2, X } from 'lucide-react';

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
  html: `<div style="width:14px;height:14px;background:#0F7A73;border:2px solid #1B2621;border-radius:50%;box-shadow:0 0 0 3px rgba(15,122,115,0.2)"></div>`,
  iconSize: [14, 14],
  iconAnchor: [7, 7],
});

const userIcon = L.divIcon({
  className: '',
  html: `<div style="width:16px;height:16px;background:#E2543C;border:2.5px solid #1B2621;border-radius:50%;box-shadow:0 0 0 4px rgba(226,84,60,0.2)"></div>`,
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

  // UI state
  const [highlightedId, setHighlightedId] = useState<string | null>(null);
  const [showFilters, setShowFilters] = useState(false);
  const searchTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);


  const fetchGigs = useCallback(async (searchVal: string, cat: string, rad: number, skills: string) => {
    setLoading(true);
    setError('');
    try {
      const params: any = { lat: userLat, lng: userLng, radius: rad };
      if (cat) params.category = cat;
      if (skills.trim()) params.skills = skills.trim();
      if (searchVal.trim()) params.search = searchVal.trim();

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
  useEffect(() => { fetchGigs(search, category, radius, skillFilter); }, []);

  // Debounce search changes
  const handleSearchChange = (val: string) => {
    setSearch(val);
    clearTimeout(searchTimer.current);
    searchTimer.current = setTimeout(() => fetchGigs(val, category, radius, skillFilter), 400);
  };

  const handleFilterApply = () => {
    fetchGigs(search, category, radius, skillFilter);
    setShowFilters(false);
  };

  return (
    <div className="flex-grow bg-paper flex flex-col" style={{ minHeight: 0 }}>
      
      {/* Top toolbar */}
      <div className="border-b border-line-gray bg-white px-4 py-3 flex items-center space-x-3">
        <div className="flex items-center space-x-2 flex-grow max-w-md">
          <Search className="h-4 w-4 text-slate flex-shrink-0" />
          <input
            type="text"
            value={search}
            onChange={e => handleSearchChange(e.target.value)}
            placeholder="Search gigs by title or keyword..."
            className="flex-grow text-sm text-ink bg-transparent border-b border-line-gray focus:outline-none focus:border-route-teal pb-0.5 font-sans placeholder:text-slate/50"
          />
          {search && (
            <button onClick={() => { setSearch(''); fetchGigs('', category, radius, skillFilter); }}>
              <X className="h-3.5 w-3.5 text-slate hover:text-signal-coral" />
            </button>
          )}
        </div>

        <button
          onClick={() => setShowFilters(f => !f)}
          className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-sm border text-xs font-bold font-display uppercase tracking-wider transition-colors ${showFilters ? 'border-route-teal text-route-teal bg-route-teal/5' : 'border-line-gray text-slate hover:border-slate'}`}
        >
          <SlidersHorizontal className="h-3.5 w-3.5" />
          <span>Filters</span>
        </button>

        <span className="text-[10px] font-mono text-slate ml-auto">
          {loading ? '...' : `${gigs.length} GIGS FOUND`}
        </span>
      </div>

      {/* Filter panel (collapsible) */}
      {showFilters && (
        <div className="bg-white border-b border-line-gray px-4 py-4 flex flex-wrap items-end gap-4">
          <div className="space-y-1">
            <label className="text-[10px] font-bold font-display uppercase tracking-wider text-ink">Category</label>
            <select
              value={category}
              onChange={e => setCategory(e.target.value)}
              className="px-3 py-2 text-xs rounded-sm border border-line-gray bg-paper text-ink focus:outline-none focus:border-route-teal font-sans"
            >
              <option value="">All Categories</option>
              {GIG_CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>

          <div className="space-y-1 min-w-[200px]">
            <label className="text-[10px] font-bold font-display uppercase tracking-wider text-ink">
              Radius: <span className="font-mono text-route-teal">{radius}km</span>
            </label>
            <input
              type="range"
              min="5" max="200" step="5"
              value={radius}
              onChange={e => setRadius(Number(e.target.value))}
              className="w-full accent-route-teal"
            />
          </div>

          <div className="space-y-1 flex-grow min-w-[200px]">
            <label className="text-[10px] font-bold font-display uppercase tracking-wider text-ink">Skills (comma-separated)</label>
            <input
              type="text"
              value={skillFilter}
              onChange={e => setSkillFilter(e.target.value)}
              placeholder="e.g. React, Plumber, Figma"
              className="w-full px-3 py-2 text-xs rounded-sm border border-line-gray bg-paper text-ink focus:outline-none focus:border-route-teal font-sans"
            />
          </div>

          <button
            onClick={handleFilterApply}
            className="px-4 py-2 rounded-sm bg-route-teal hover:bg-route-teal/90 text-white text-xs font-bold font-display uppercase tracking-widest transition-colors"
          >
            Apply Filters
          </button>
        </div>
      )}

      {/* Main split view: map left, list right */}
      <div className="flex flex-col lg:flex-row flex-grow overflow-hidden">
        
        {/* Map Panel */}
        <div className="lg:w-[45%] h-64 lg:h-auto border-b lg:border-b-0 lg:border-r border-line-gray relative flex-shrink-0">
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
                    <div className="text-xs">
                      <strong className="block font-display uppercase">{gig.title}</strong>
                      <span className="font-mono text-[11px]">₹{gig.budget.toLocaleString()}</span>
                      <br />
                      <span className="text-slate">{gig.location.city}</span>
                    </div>
                  </Popup>
                </Marker>
              );
            })}
          </MapContainer>

          {/* Map legend */}
          <div className="absolute bottom-3 left-3 bg-white border border-line-gray rounded-sm px-3 py-2 z-[1000] text-[9px] font-mono text-slate space-y-1">
            <div className="flex items-center space-x-2">
              <span className="w-2.5 h-2.5 rounded-full bg-signal-coral border border-ink inline-block flex-shrink-0"></span>
              <span>YOUR LOCATION</span>
            </div>
            <div className="flex items-center space-x-2">
              <span className="w-2.5 h-2.5 rounded-full bg-route-teal border border-ink inline-block flex-shrink-0"></span>
              <span>OPEN GIG</span>
            </div>
          </div>
        </div>

        {/* List Panel */}
        <div className="flex-grow overflow-y-auto p-4 lg:p-6">
          {loading ? (
            <div className="flex flex-col items-center justify-center h-48 space-y-3">
              <Loader2 className="h-7 w-7 text-route-teal animate-spin" />
              <p className="text-xs font-mono text-slate uppercase tracking-wider">Scanning nearby nodes…</p>
            </div>
          ) : error ? (
            <div className="text-center py-12 text-signal-coral text-sm font-sans">{error}</div>
          ) : gigs.length === 0 ? (
            <div className="text-center py-12">
              <MapPin className="h-8 w-8 mx-auto text-slate mb-3" />
              <h3 className="font-bold font-display text-ink uppercase tracking-tight mb-1">No Gigs Found</h3>
              <p className="text-xs text-slate font-sans max-w-xs mx-auto">
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
