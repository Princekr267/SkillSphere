import React, { useState, useRef, useCallback } from 'react';
import { useNavigate, Link, Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { 
  Briefcase, 
  User as UserIcon, 
  Mail, 
  Lock, 
  Compass, 
  Building, 
  FileText, 
  ArrowRight, 
  ArrowLeft, 
  Check, 
  AlertTriangle,
  Globe,
  Search,
  WifiOff
} from 'lucide-react';
import axios from 'axios';

interface CitySuggestion {
  display_name: string;
  lat: string;
  lon: string;
}

export const Register: React.FC = () => {
  const { register, user, token, loading: authLoading } = useAuth();
  const navigate = useNavigate();

  // Wizard state
  const [step, setStep] = useState(1);
  const [role, setRole] = useState<'client' | 'freelancer' | null>(null);

  // Form inputs state
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [city, setCity] = useState('');
  const [latitude, setLatitude] = useState<number | null>(null);
  const [longitude, setLongitude] = useState<number | null>(null);
  
  // Client details
  const [companyName, setCompanyName] = useState('');
  const [bio, setBio] = useState('');

  // Location search helper states
  const [citySearch, setCitySearch] = useState('');
  const [suggestions, setSuggestions] = useState<CitySuggestion[]>([]);
  const [searchingCity, setSearchingCity] = useState(false);
  const [fetchingGeo, setFetchingGeo] = useState(false);
  const [geoApiDown, setGeoApiDown] = useState(false);
  const debounceTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Error/loading states
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  // Geo-location fallback
  const handleDetectLocation = () => {
    setFetchingGeo(true);
    setError(null);
    if (!navigator.geolocation) {
      setError('Geolocation is not supported by your browser.');
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
          const address = res.data.address;
          const cityName = address.city || address.town || address.village || address.suburb || 'My Location';
          setCity(cityName);
          setCitySearch(cityName);
        } catch (err) {
          console.error(err);
          setCity(`Detected Coordinate`);
        } finally {
          setFetchingGeo(false);
        }
      },
      (err) => {
        console.error(err);
        setError('Failed to detect geolocation. Please search for your city manually.');
        setFetchingGeo(false);
      }
    );
  };

  // Search city name using OSM Nominatim with debounce to avoid rate limiting
  const searchCity = useCallback(async (val: string) => {
    if (val.length < 3) {
      setSuggestions([]);
      setSearchingCity(false);
      return;
    }
    setSearchingCity(true);
    try {
      const res = await axios.get(
        `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(val)}&limit=5&addressdetails=1`,
        { headers: { 'Accept-Language': 'en', 'User-Agent': 'SkillSphere/1.0 (skillsphere.in)' }, timeout: 6000 }
      );
      setSuggestions(res.data);
      setGeoApiDown(false);
    } catch (err: any) {
      console.warn('Nominatim API error:', err?.response?.status, err?.message);
      if (err?.response?.status === 429) {
        setGeoApiDown(true);
        setSuggestions([]);
      } else if (err?.code === 'ERR_NETWORK' || err?.code === 'ECONNABORTED') {
        setGeoApiDown(true);
        setSuggestions([]);
      }
    } finally {
      setSearchingCity(false);
    }
  }, []);

  const handleCitySearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setCitySearch(val);
    // Clear previous debounce
    if (debounceTimer.current) clearTimeout(debounceTimer.current);
    debounceTimer.current = setTimeout(() => searchCity(val), 500);
  };

  // Select a suggestion
  const handleSelectCity = (suggestion: CitySuggestion) => {
    setCity(suggestion.display_name.split(',')[0]);
    setCitySearch(suggestion.display_name);
    setLatitude(parseFloat(suggestion.lat));
    setLongitude(parseFloat(suggestion.lon));
    setSuggestions([]);
  };

  // Submit complete form
  const handleSubmit = async () => {
    setError(null);
    setLoading(true);

    if (!role) {
      setError('Please select a profile role');
      setLoading(false);
      return;
    }

    const payload = {
      name,
      email,
      password,
      role,
      city,
      latitude,
      longitude,
      companyName: role === 'client' ? companyName : undefined,
      bio: role === 'client' ? bio : undefined,
    };

    try {
      await register(payload);
      navigate('/');
    } catch (err: any) {
      setError(err.message || 'Registration failed. Please check inputs.');
    } finally {
      setLoading(false);
    }
  };

  const canGoToStep3 = name && email && password.length >= 6;
  const canGoToStep4 = city && latitude !== null && longitude !== null;

  // If auth is still resolving, show a spinner
  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-paper">
        <div className="relative w-12 h-12">
          <div className="absolute inset-0 rounded-full border-2 border-line-gray"></div>
          <div className="absolute inset-0 rounded-full border-2 border-t-route-teal animate-spin"></div>
        </div>
      </div>
    );
  }

  // Already logged in — redirect to their dashboard
  if (token && user) {
    if (user.role === 'admin') return <Navigate to="/admin" replace />;
    if (user.role === 'client') return <Navigate to="/client-dashboard" replace />;
    return <Navigate to="/freelancer-dashboard" replace />;
  }

  return (
    <div className="flex-grow flex items-center justify-start px-4 sm:px-12 md:px-24 py-16 bg-paper relative">
      
      {/* Decorative vertical line */}
      <div className="absolute left-8 top-0 bottom-0 w-[2px] bg-line-gray hidden md:block">
        <div className="absolute top-1/4 bottom-1/4 left-0 w-full bg-route-teal animate-draw-line"></div>
      </div>

      <div className="w-full max-w-lg bg-white border border-line-gray rounded-sm p-8 relative z-10 animate-slide-up ml-0 md:ml-12">
        
        {/* Step Indicator - Stepper stylized as a route map line */}
        <div className="mb-10 relative">
          {/* Horizontal line */}
          <div className="absolute left-0 right-0 top-1/2 -translate-y-1/2 h-[2px] bg-line-gray -z-10"></div>
          {/* Filled active segment */}
          <div 
            className="absolute left-0 top-1/2 -translate-y-1/2 h-[2px] bg-route-teal -z-10 transition-all duration-500 ease-in-out"
            style={{ width: `${((step - 1) / 3) * 100}%` }}
          ></div>
          
          <div className="flex justify-between items-center relative z-10">
            {[1, 2, 3, 4].map((s) => (
              <div key={s} className="flex flex-col items-center">
                <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center text-[10px] font-mono font-bold transition-all ${
                  s === step
                    ? 'bg-route-teal border-route-teal text-white scale-110 shadow-sm'
                    : s < step
                    ? 'bg-secondary-500 border-secondary-600 text-white'
                    : 'bg-white border-line-gray text-slate'
                }`}>
                  {s < step ? <Check className="w-3.5 h-3.5" /> : s}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Global Error Banner */}
        {error && (
          <div className="mb-6 p-4 rounded-sm bg-paper border-l-4 border-l-signal-coral border border-line-gray flex items-start space-x-3 text-ink text-xs font-sans">
            <AlertTriangle className="h-4 w-4 text-signal-coral flex-shrink-0 mt-0.5" />
            <span>{error}</span>
          </div>
        )}

        {/* STEP 1: Role Selection */}
        {step === 1 && (
          <div className="space-y-6 animate-fade-in">
            <div className="text-left mb-6">
              <h3 className="text-xl font-black font-display text-ink uppercase tracking-tight">Select Account Path</h3>
              <p className="text-xs font-sans text-slate mt-1">Specify your node role inside the SkillSphere system.</p>
            </div>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 font-sans">
              <button
                type="button"
                onClick={() => setRole('client')}
                className={`p-6 rounded-sm border text-left transition-all ${
                  role === 'client'
                    ? 'bg-paper/40 border-route-teal border-2'
                    : 'bg-white border-line-gray hover:border-slate'
                }`}
              >
                <div className="h-9 w-9 bg-route-teal/10 text-route-teal flex items-center justify-center rounded-sm mb-4">
                  <UserIcon className="h-5 w-5" />
                </div>
                <h4 className="font-bold text-ink text-sm">Hiring Node</h4>
                <p className="text-xs text-slate mt-1">Configure gigs, review proximity metrics, and contract local experts.</p>
              </button>

              <button
                type="button"
                onClick={() => setRole('freelancer')}
                className={`p-6 rounded-sm border text-left transition-all ${
                  role === 'freelancer'
                    ? 'bg-paper/40 border-route-teal border-2'
                    : 'bg-white border-line-gray hover:border-slate'
                }`}
              >
                <div className="h-9 w-9 bg-route-teal/10 text-route-teal flex items-center justify-center rounded-sm mb-4">
                  <Briefcase className="h-5 w-5" />
                </div>
                <h4 className="font-bold text-ink text-sm">Provider Node</h4>
                <p className="text-xs text-slate mt-1">List professional service skills and accept hyperlocal jobs.</p>
              </button>
            </div>

            <button
              onClick={() => setStep(2)}
              disabled={!role}
              className="w-full py-3 rounded-sm text-xs font-bold font-display uppercase tracking-widest text-white bg-signal-coral hover:bg-signal-coral/95 disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center justify-center space-x-2"
            >
              <span>Continue</span>
              <ArrowRight className="h-3.5 w-3.5" />
            </button>
          </div>
        )}

        {/* STEP 2: Basic Account Details */}
        {step === 2 && (
          <div className="space-y-6 animate-fade-in">
            <div className="text-left">
              <h3 className="text-xl font-black font-display text-ink uppercase tracking-tight">Account Parameters</h3>
              <p className="text-xs font-sans text-slate mt-1">Enter credentials for platform authentication.</p>
            </div>

            <div className="space-y-4 font-sans">
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold font-display text-ink uppercase tracking-widest block">Full Name</label>
                <div className="relative">
                  <UserIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate" />
                  <input
                    type="text"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="e.g. John Doe"
                    className="w-full pl-10 pr-4 py-2.5 rounded-sm bg-paper/30 border border-line-gray text-ink text-sm focus:outline-none focus:border-route-teal"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-[10px] font-bold font-display text-ink uppercase tracking-widest block">Email Address</label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate" />
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="john@example.com"
                    className="w-full pl-10 pr-4 py-2.5 rounded-sm bg-paper/30 border border-line-gray text-ink text-sm focus:outline-none focus:border-route-teal"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-[10px] font-bold font-display text-ink uppercase tracking-widest block">Password</label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate" />
                  <input
                    type="password"
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Minimum 6 characters"
                    className="w-full pl-10 pr-4 py-2.5 rounded-sm bg-paper/30 border border-line-gray text-ink text-sm focus:outline-none focus:border-route-teal"
                  />
                </div>
              </div>
            </div>

            <div className="flex space-x-4 pt-4 font-sans">
              <button
                type="button"
                onClick={() => setStep(1)}
                className="w-1/3 py-3 rounded-sm border border-line-gray text-xs font-bold font-display uppercase tracking-widest text-slate hover:bg-paper/30 transition-colors flex items-center justify-center space-x-2"
              >
                <ArrowLeft className="h-3.5 w-3.5" />
                <span>Back</span>
              </button>
              <button
                type="button"
                onClick={() => setStep(3)}
                disabled={!canGoToStep3}
                className="w-2/3 py-3 rounded-sm text-xs font-bold font-display uppercase tracking-widest text-white bg-signal-coral hover:bg-signal-coral/95 disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center justify-center space-x-2"
              >
                <span>Add Location</span>
                <ArrowRight className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>
        )}

        {/* STEP 3: Hyperlocal Location Setup */}
        {step === 3 && (
          <div className="space-y-6 animate-fade-in">
            <div className="text-left">
              <h3 className="text-xl font-black font-display text-ink uppercase tracking-tight">System Node Location</h3>
              <p className="text-xs font-sans text-slate mt-1">Specify coordinates to unlock proximity queries.</p>
            </div>

            <div className="space-y-4 font-sans">
              <button
                type="button"
                onClick={handleDetectLocation}
                disabled={fetchingGeo}
                className="w-full py-3 rounded-sm border border-route-teal text-route-teal bg-route-teal/5 hover:bg-route-teal/10 text-xs font-bold font-display uppercase tracking-widest flex items-center justify-center space-x-2 transition-all"
              >
                {fetchingGeo ? (
                  <span className="w-4 h-4 border-2 border-route-teal/30 border-t-route-teal rounded-full animate-spin"></span>
                ) : (
                  <>
                    <Compass className="h-4 w-4" />
                    <span>Auto-detect Location</span>
                  </>
                )}
              </button>

              <div className="flex items-center my-4">
                <div className="flex-grow border-t border-line-gray"></div>
                <span className="px-3 text-[9px] text-slate font-bold uppercase tracking-widest">or search manually</span>
                <div className="flex-grow border-t border-line-gray"></div>
              </div>

              <div className="space-y-1.5 relative">
                <label className="text-[10px] font-bold font-display text-ink uppercase tracking-widest block">Search City</label>

                {geoApiDown && (
                  <div className="flex items-start space-x-2 p-3 rounded-sm bg-amber-50 border border-amber-200 text-xs text-amber-700 mb-2">
                    <WifiOff className="h-4 w-4 flex-shrink-0 mt-0.5" />
                    <span>Location search is temporarily unavailable (rate limit). Type your city name below and press Enter to set it manually.</span>
                  </div>
                )}

                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate" />
                  <input
                    type="text"
                    value={citySearch}
                    onChange={handleCitySearchChange}
                    onKeyDown={(e) => {
                      // Allow manual entry when API is down
                      if (e.key === 'Enter' && geoApiDown && citySearch.trim().length > 1) {
                        setCity(citySearch.trim());
                        // Use approximate coordinates for common cities or default to 0,0 as placeholder
                        if (!latitude) {
                          setLatitude(0);
                          setLongitude(0);
                        }
                        setSuggestions([]);
                      }
                    }}
                    placeholder={geoApiDown ? 'Type city name and press Enter' : 'Enter city (e.g. Mumbai)'}
                    className="w-full pl-10 pr-4 py-2.5 rounded-sm bg-paper/30 border border-line-gray text-ink text-sm focus:outline-none focus:border-route-teal"
                  />
                  {searchingCity && (
                    <div className="absolute right-3 top-1/2 -translate-y-1/2">
                      <div className="w-4 h-4 border-2 border-route-teal/30 border-t-route-teal rounded-full animate-spin"></div>
                    </div>
                  )}
                </div>

                {geoApiDown && citySearch.trim().length > 1 && (
                  <button
                    type="button"
                    onClick={() => {
                      setCity(citySearch.trim());
                      if (!latitude) { setLatitude(0); setLongitude(0); }
                      setSuggestions([]);
                    }}
                    className="w-full text-left px-3 py-2 text-xs text-route-teal border border-route-teal/40 rounded-sm hover:bg-route-teal/5 transition-colors mt-1"
                  >
                    ✓ Use &quot;{citySearch.trim()}&quot; as my city
                  </button>
                )}

                {suggestions.length > 0 && (
                  <div className="absolute z-50 left-0 right-0 top-full mt-1 bg-white border border-line-gray rounded-sm shadow-md max-h-40 overflow-y-auto">
                    {suggestions.map((sug, i) => (
                      <button
                        key={i}
                        type="button"
                        onClick={() => handleSelectCity(sug)}
                        className="w-full text-left px-4 py-2.5 text-xs text-ink hover:bg-paper/30 transition-colors border-b border-line-gray/40 last:border-b-0"
                      >
                        {sug.display_name}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {latitude !== null && longitude !== null && (
                <div className="p-4 rounded-sm bg-paper/50 border border-line-gray text-xs space-y-1.5 text-slate animate-fade-in font-mono">
                  <div className="flex items-center space-x-1.5 text-route-teal font-bold mb-1">
                    <Check className="h-4 w-4" />
                    <span>Coordinates Locked</span>
                  </div>
                  <div>City Name: {city}</div>
                  <div className="flex space-x-4">
                    <div>LAT: {latitude.toFixed(5)}</div>
                    <div>LNG: {longitude.toFixed(5)}</div>
                  </div>
                </div>
              )}
            </div>

            <div className="flex space-x-4 pt-4 font-sans">
              <button
                type="button"
                onClick={() => setStep(2)}
                className="w-1/3 py-3 rounded-sm border border-line-gray text-xs font-bold font-display uppercase tracking-widest text-slate hover:bg-paper/30 transition-colors flex items-center justify-center space-x-2"
              >
                <ArrowLeft className="h-3.5 w-3.5" />
                <span>Back</span>
              </button>
              <button
                type="button"
                onClick={() => setStep(4)}
                disabled={!canGoToStep4}
                className="w-2/3 py-3 rounded-sm text-xs font-bold font-display uppercase tracking-widest text-white bg-signal-coral hover:bg-signal-coral/95 disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center justify-center space-x-2"
              >
                <span>Final Settings</span>
                <ArrowRight className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>
        )}

        {/* STEP 4: Profile Specific Settings */}
        {step === 4 && (
          <div className="space-y-6 animate-fade-in font-sans">
            <div className="text-left">
              <h3 className="text-xl font-black font-display text-ink uppercase tracking-tight">
                {role === 'client' ? 'Company Details' : 'Node Profile Config'}
              </h3>
              <p className="text-xs text-slate mt-1">
                {role === 'client' 
                  ? 'Input corporate parameters.' 
                  : 'Skills can be loaded directly from your freelancer control dashboard.'
                }
              </p>
            </div>

            <div className="space-y-4">
              {role === 'client' ? (
                <>
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold font-display text-ink uppercase tracking-widest block">Company Name</label>
                    <div className="relative">
                      <Building className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate" />
                      <input
                        type="text"
                        value={companyName}
                        onChange={(e) => setCompanyName(e.target.value)}
                        placeholder="e.g. Acme Hyperlocal"
                        className="w-full pl-10 pr-4 py-2.5 rounded-sm bg-paper/30 border border-line-gray text-ink text-sm focus:outline-none focus:border-route-teal"
                      />
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold font-display text-ink uppercase tracking-widest block">Short Bio</label>
                    <div className="relative">
                      <FileText className="absolute left-3 top-3 h-4 w-4 text-slate" />
                      <textarea
                        rows={3}
                        value={bio}
                        onChange={(e) => setBio(e.target.value)}
                        placeholder="Brief intro description..."
                        className="w-full pl-10 pr-4 py-2.5 rounded-sm bg-paper/30 border border-line-gray text-ink text-sm resize-none focus:outline-none focus:border-route-teal"
                      />
                    </div>
                  </div>
                </>
              ) : (
                <div className="p-6 rounded-sm border border-dashed border-line-gray text-center space-y-3 bg-paper/20">
                  <Briefcase className="h-8 w-8 mx-auto text-route-teal" />
                  <h4 className="font-bold text-ink text-sm">Provider Node Operational</h4>
                  <p className="text-xs text-slate max-w-xs mx-auto leading-relaxed">
                    Account configuration is locked. Submit registration to land on your freelancer workspace dashboard.
                  </p>
                </div>
              )}
            </div>

            <div className="flex space-x-4 pt-4">
              <button
                type="button"
                onClick={() => setStep(3)}
                className="w-1/3 py-3 rounded-sm border border-line-gray text-xs font-bold font-display uppercase tracking-widest text-slate hover:bg-paper/30 transition-colors flex items-center justify-center space-x-2"
              >
                <ArrowLeft className="h-3.5 w-3.5" />
                <span>Back</span>
              </button>
              <button
                type="button"
                onClick={handleSubmit}
                disabled={loading}
                className="w-2/3 py-3 rounded-sm text-xs font-bold font-display uppercase tracking-widest text-white bg-signal-coral hover:bg-signal-coral/95 disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center justify-center space-x-2"
              >
                {loading ? (
                  <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></span>
                ) : (
                  <>
                    <span>Submit Setup</span>
                    <Check className="h-4 w-4" />
                  </>
                )}
              </button>
            </div>
          </div>
        )}

        {/* Bottom link */}
        <div className="text-left mt-8 pt-6 border-t border-line-gray font-sans text-xs">
          <p className="text-slate">
            Already registered?{' '}
            <Link to="/login" className="font-bold text-route-teal hover:text-route-teal/80 transition-colors">
              Sign In
            </Link>
          </p>
        </div>

      </div>
    </div>
  );
};
