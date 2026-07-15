import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { Building, MapPin, Edit, FileText, Check, AlertCircle, Compass, Search } from 'lucide-react';
import axios from 'axios';
import { ClientGigManager } from './ClientGigManager';
import { AvatarUpload } from '../../components/AvatarUpload';


interface CitySuggestion {
  display_name: string;
  lat: string;
  lon: string;
}

type Tab = 'profile' | 'gigs';

export const ClientDashboard: React.FC = () => {
  const { user, updateProfile } = useAuth();
  const [activeTab, setActiveTab] = useState<Tab>('profile');
  
  const [isEditing, setIsEditing] = useState(false);
  const [name, setName] = useState(user?.name || '');
  const [companyName, setCompanyName] = useState(user?.companyName || '');
  const [bio, setBio] = useState(user?.bio || '');
  const [city, setCity] = useState(user?.location.city || '');
  const [latitude, setLatitude] = useState<number | null>(user?.location.coordinates[1] || null);
  const [longitude, setLongitude] = useState<number | null>(user?.location.coordinates[0] || null);

  // Address search states
  const [citySearch, setCitySearch] = useState(user?.location.city || '');
  const [suggestions, setSuggestions] = useState<CitySuggestion[]>([]);
  const [searchingCity, setSearchingCity] = useState(false);
  const [fetchingGeo, setFetchingGeo] = useState(false);

  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [saving, setSaving] = useState(false);

  if (!user) return null;

  // Search cities using OSM
  const handleCitySearchChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setCitySearch(val);

    if (val.length < 3) {
      setSuggestions([]);
      return;
    }

    setSearchingCity(true);
    try {
      const res = await axios.get(
        `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(val)}&limit=5`
      );
      setSuggestions(res.data);
    } catch (err) {
      console.error(err);
    } finally {
      setSearchingCity(false);
    }
  };

  // Select a suggestion
  const handleSelectCity = (suggestion: CitySuggestion) => {
    setCity(suggestion.display_name.split(',')[0]);
    setCitySearch(suggestion.display_name);
    setLatitude(parseFloat(suggestion.lat));
    setLongitude(parseFloat(suggestion.lon));
    setSuggestions([]);
  };

  // Geolocation lookup
  const handleDetectLocation = () => {
    setFetchingGeo(true);
    setMessage(null);
    if (!navigator.geolocation) {
      setMessage({ type: 'error', text: 'Geolocation is not supported.' });
      setFetchingGeo(false);
      return;
    }

    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const { latitude: lat, longitude: lng } = position.coords;
        setLatitude(lat);
        setLongitude(lng);

        try {
          const res = await axios.get(
            `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}`
          );
          const cityName = res.data.address.city || res.data.address.town || 'My Location';
          setCity(cityName);
          setCitySearch(cityName);
        } catch (err) {
          setCity(`Detected Coordinate`);
        } finally {
          setFetchingGeo(false);
        }
      },
      (err) => {
        setMessage({ type: 'error', text: 'Could not access geolocation. Search manually.' });
        setFetchingGeo(false);
      }
    );
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setMessage(null);
    setSaving(true);

    try {
      await updateProfile({
        name,
        companyName,
        bio,
        city,
        latitude,
        longitude,
      });
      setMessage({ type: 'success', text: 'Profile updated successfully!' });
      setIsEditing(false);
    } catch (err: any) {
      setMessage({ type: 'error', text: err.message || 'Failed to update profile.' });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 flex-grow bg-paper font-sans">
      
      <div className="mb-8 border-b-2 border-ink pb-0 flex items-end justify-between">
        <div className="pb-6">
          <span className="text-[10px] font-mono text-slate uppercase tracking-widest block mb-1">Workspace Node</span>
          <h1 className="text-2xl font-black font-display text-ink uppercase tracking-tight">Client Panel</h1>
        </div>
        <div className="flex items-end space-x-2">
          {(['profile', 'gigs'] as Tab[]).map(tab => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-4 py-2 text-xs font-bold font-display uppercase tracking-widest border-2 border-b-0 border-ink transition-all ${
                activeTab === tab
                  ? 'bg-route-teal text-white translate-y-0.5'
                  : 'bg-paper text-ink hover:bg-line-gray/20'
              } sketch-border`}
              style={{ borderBottomLeftRadius: 0, borderBottomRightRadius: 0 }}
            >
              {tab === 'profile' ? 'My Profile' : 'Gig Manager'}
            </button>
          ))}
        </div>
      </div>

      {/* Tab: Gig Manager */}
      {activeTab === 'gigs' ? (
        <ClientGigManager />
      ) : (
        <>
          {/* Messages */}
          {message && (
            <div className={`mb-6 p-4 border-2 border-ink sketch-border flex items-center space-x-3 text-xs ${
              message.type === 'success'
                ? 'bg-paper border-l-4 border-l-route-teal text-ink'
                : 'bg-paper border-l-4 border-l-signal-coral text-ink'
            }`}>
              {message.type === 'success' ? <Check className="h-4.5 w-4.5 text-route-teal flex-shrink-0" /> : <AlertCircle className="h-4.5 w-4.5 text-signal-coral flex-shrink-0" />}
              <span>{message.text}</span>
            </div>
          )}

          {/* Main card grid */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            
            {/* Left Column: Client profile */}
            <div className="bg-paper border-2 border-ink sketch-card p-6 lg:col-span-1 flex flex-col items-start text-left rotate-[-0.5deg]">
              <div className="h-16 w-16 bg-paper border-2 border-ink flex items-center justify-center text-ink text-2xl font-black font-display uppercase mb-4 rounded-sm overflow-hidden flex-shrink-0 sketch-border">
                {user.avatar ? (
                  <img src={user.avatar} alt={user.name} className="h-full w-full object-cover" />
                ) : (
                  user.name.charAt(0)
                )}
              </div>
              <h2 className="text-lg font-bold text-ink uppercase font-display tracking-tight">{user.name}</h2>
              <span className="text-[10px] font-mono text-ink bg-paper border border-ink px-2 py-0.5 sketch-badge uppercase tracking-wider mt-1">
                Client Account
              </span>
              
              <div className="w-full border-t-2 border-ink my-6 pt-6 space-y-4">
                <div className="flex items-center space-x-3 text-xs text-slate">
                  <Building className="h-4 w-4 text-route-teal flex-shrink-0" />
                  <span className="font-bold text-ink">{user.companyName || 'No company configured'}</span>
                </div>
                <div className="flex items-center space-x-3 text-xs text-slate">
                  <MapPin className="h-4 w-4 text-route-teal flex-shrink-0" />
                  <span className="font-bold text-ink">{user.location.city}</span>
                </div>
                <div className="text-[10px] font-mono text-slate pt-3 border-t border-ink border-dashed">
                  COORDINATES: [{user.location.coordinates[0].toFixed(4)}, {user.location.coordinates[1].toFixed(4)}]
                </div>
              </div>

              {!isEditing && (
                <>
                  <button
                    onClick={() => setIsEditing(true)}
                    className="mt-2 w-full py-2.5 border-2 border-ink text-xs font-bold font-display uppercase tracking-widest text-ink hover:text-route-teal bg-paper sketch-button flex items-center justify-center space-x-2"
                  >
                    <Edit className="h-4 w-4" />
                    <span>Modify Node Settings</span>
                  </button>
                  
                  <div className="w-full mt-4 border-t-2 border-ink pt-4">
                    <AvatarUpload />
                  </div>
                </>
              )}
            </div>

            {/* Right Column */}
            <div className="lg:col-span-2 space-y-8">
              {isEditing ? (
                <div className="bg-paper border-2 border-ink sketch-card p-6 rotate-[0.5deg]">
                  <h3 className="text-sm font-bold font-display text-ink uppercase tracking-widest mb-6">Modify Settings</h3>
                  <form onSubmit={handleSave} className="space-y-5">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div className="space-y-1.5">
                        <label className="text-[10px] font-bold font-display text-ink uppercase tracking-widest block pl-1">Full Name</label>
                        <input type="text" required value={name} onChange={e => setName(e.target.value)}
                          className="w-full px-4 py-2.5 bg-paper border-2 border-ink sketch-input text-ink text-sm focus:outline-none focus:border-route-teal" />
                      </div>
                      <div className="space-y-1.5">
                        <label className="text-[10px] font-bold font-display text-ink uppercase tracking-widest block pl-1">Company Name</label>
                        <input type="text" value={companyName} onChange={e => setCompanyName(e.target.value)}
                          className="w-full px-4 py-2.5 bg-paper border-2 border-ink sketch-input text-ink text-sm focus:outline-none focus:border-route-teal" />
                      </div>
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-[10px] font-bold font-display text-ink uppercase tracking-widest block pl-1">Bio / Description</label>
                      <textarea rows={3} value={bio} onChange={e => setBio(e.target.value)}
                        className="w-full px-4 py-2.5 bg-paper border-2 border-ink sketch-input text-ink text-sm resize-none focus:outline-none focus:border-route-teal" />
                    </div>

                    <div className="border-t-2 border-ink pt-4 space-y-4">
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] font-bold font-display text-ink uppercase tracking-widest pl-1">Change Location</span>
                        <button type="button" onClick={handleDetectLocation} disabled={fetchingGeo}
                          className="text-xs text-route-teal hover:underline flex items-center space-x-1 font-bold">
                          <Compass className="h-3.5 w-3.5" />
                          <span>{fetchingGeo ? 'GPS Locating...' : 'Use GPS Location'}</span>
                        </button>
                      </div>
                      <div className="relative">
                        <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate z-10" />
                        <input type="text" value={citySearch} onChange={handleCitySearchChange}
                          placeholder="Search for new city..."
                          className="w-full pl-10 pr-4 py-2.5 bg-paper border-2 border-ink sketch-input text-ink text-sm focus:outline-none focus:border-route-teal" />
                        {searchingCity && (
                          <div className="absolute right-3 top-1/2 -translate-y-1/2">
                            <div className="w-4 h-4 border-2 border-route-teal/30 border-t-route-teal rounded-full animate-spin"></div>
                          </div>
                        )}
                        {suggestions.length > 0 && (
                          <div className="absolute z-50 left-0 right-0 top-full mt-1 bg-paper border-2 border-ink sketch-card max-h-40 overflow-y-auto">
                            {suggestions.map((sug, i) => (
                              <button key={i} type="button" onClick={() => handleSelectCity(sug)}
                                className="w-full text-left px-4 py-2 text-xs text-ink hover:bg-line-gray/20 border-b border-ink last:border-b-0">
                                {sug.display_name}
                              </button>
                            ))}
                          </div>
                        )}
                      </div>
                      {latitude !== null && longitude !== null && (
                        <div className="text-xs font-mono text-slate bg-paper border-2 border-ink sketch-border p-2">
                          Coordinates Locked: {latitude.toFixed(4)}, {longitude.toFixed(4)} ({city})
                        </div>
                      )}
                    </div>

                    <div className="flex space-x-3 pt-4 border-t-2 border-ink">
                      <button type="submit" disabled={saving || !city || latitude === null}
                        className="px-5 py-2.5 text-xs font-bold font-display uppercase tracking-widest text-white bg-signal-coral sketch-button">
                        {saving ? 'Saving...' : 'Save Settings'}
                      </button>
                      <button type="button" onClick={() => { setIsEditing(false); setMessage(null); }}
                        className="px-5 py-2.5 text-xs font-bold font-display uppercase tracking-widest text-ink bg-paper border-2 border-ink sketch-button">
                        Cancel
                      </button>
                    </div>
                  </form>
                </div>
              ) : (
                <div className="space-y-6">
                  <div className="bg-paper border-2 border-ink sketch-card p-6 text-left rotate-[-0.3deg]">
                    <h3 className="text-xs font-bold font-display text-ink uppercase tracking-widest mb-3">Organization Description</h3>
                    <p className="text-sm text-ink leading-relaxed font-sans">
                      {user.bio || 'Please update your bio description in node settings.'}
                    </p>
                  </div>
                  <div className="bg-paper border-2 border-ink sketch-card p-6 text-left rotate-[0.3deg]">
                    <div className="flex justify-between items-center mb-4">
                      <h3 className="text-xs font-bold font-display text-ink uppercase tracking-widest">Gig Activity</h3>
                      <button
                        onClick={() => setActiveTab('gigs')}
                        className="text-xs text-route-teal hover:underline font-bold font-display uppercase tracking-wider"
                      >
                        Open Gig Manager →
                      </button>
                    </div>
                    <p className="text-xs text-slate font-sans">
                      Use the <strong>Gig Manager</strong> tab to post jobs, review applicants, and manage escrow releases.
                    </p>
                  </div>
                </div>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
};
