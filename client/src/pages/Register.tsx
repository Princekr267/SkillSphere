import React, { useState, useRef, useCallback, useEffect } from 'react';
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
  WifiOff,
  ShieldCheck
} from 'lucide-react';
import axios from 'axios';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Badge } from '../components/ui/Badge';

interface CitySuggestion {
  display_name: string;
  lat: string;
  lon: string;
}

export const Register: React.FC = () => {
  const { register, googleLogin, user, token, loading: authLoading } = useAuth();
  const navigate = useNavigate();

  // Wizard state
  const [step, setStep] = useState(1);
  const [role, setRole] = useState<'client' | 'freelancer' | 'admin' | null>(null);

  const handleGoogleLoginResponse = async (response: any) => {
    setError(null);
    setLoading(true);
    try {
      const res = await googleLogin(response.credential);
      if (res && res.registrationRequired) {
        navigate('/login', { state: { googleCredential: response.credential, registrationRequired: true } });
      } else {
        navigate('/');
      }
    } catch (err: any) {
      setError(err.message || 'Google registration failed.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (step === 1) {
      const initGoogle = () => {
        if ((window as any).google) {
          (window as any).google.accounts.id.initialize({
            client_id: import.meta.env.VITE_GOOGLE_CLIENT_ID || '35391508282-r6r69antfsgl9jen2e501242s5i4vqlk.apps.googleusercontent.com',
            callback: handleGoogleLoginResponse,
          });
          const btnContainer = document.getElementById('google-register-btn');
          if (btnContainer) {
            (window as any).google.accounts.id.renderButton(
              btnContainer,
              { theme: 'outline', size: 'large', type: 'standard', width: 380 }
            );
          }
        }
      };
      const timer = setTimeout(initGoogle, 1000);
      return () => clearTimeout(timer);
    }
  }, [step]);

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
      <div className="min-h-screen flex items-center justify-center bg-cream transition-colors duration-200">
        <div className="relative w-12 h-12">
          <div className="absolute inset-0 rounded-full border-4 border-ink/10"></div>
          <div className="absolute inset-0 rounded-full border-4 border-t-accent-amber animate-spin"></div>
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
    <div className="flex-grow flex items-center justify-start px-4 sm:px-12 md:px-24 py-16 bg-cream relative transition-colors duration-200">
      
      {/* Decorative vertical line */}
      <div className="absolute left-8 top-0 bottom-0 w-[4px] bg-ink/10 dark:bg-cream/15 border-x border-ink hidden md:block">
        <div className="absolute top-1/4 bottom-1/4 left-0 w-full bg-accent-amber"></div>
      </div>

      <Card className="w-full max-w-lg p-8 relative z-10 animate-slide-up ml-0 md:ml-12">
        
        {/* Step Indicator - Stepper stylized as a route map line */}
        <div className="mb-10 relative">
          <div className="absolute left-0 right-0 top-1/2 -translate-y-1/2 h-[4px] bg-ink/10 dark:bg-cream/15 border-y border-ink -z-10"></div>
          <div 
            className="absolute left-0 top-1/2 -translate-y-1/2 h-[4px] bg-accent-amber border-y border-ink -z-10 transition-all duration-500 ease-in-out"
            style={{ width: `${((step - 1) / 3) * 100}%` }}
          ></div>
          
          <div className="flex justify-between items-center relative z-10">
            {[1, 2, 3, 4].map((s) => (
              <div key={s} className="flex flex-col items-center">
                <div className={`w-8 h-8 border-2 border-ink flex items-center justify-center text-xs font-mono font-bold transition-all rounded-lg ${
                  s === step
                    ? 'bg-accent-amber text-ink scale-110 shadow-retro-sm'
                    : s < step
                    ? 'bg-ink text-cream dark:bg-cream dark:text-ink'
                    : 'bg-cream text-ink/40'
                }`}>
                  {s < step ? <Check className="w-4 h-4" /> : s}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Global Error Banner */}
        {error && (
          <div className="mb-6 p-4 bg-cream border-2 border-ink border-l-4 border-l-accent-coral flex items-start space-x-3 text-ink text-xs font-sans rounded-lg">
            <AlertTriangle className="h-4 w-4 text-accent-coral flex-shrink-0 mt-0.5" />
            <span>{error}</span>
          </div>
        )}

        {/* STEP 1: Role Selection */}
        {step === 1 && (
          <div className="space-y-6 animate-fade-in text-left">
            <div className="text-left mb-6">
              <h3 className="text-xl font-display font-black text-ink uppercase tracking-tight">Select Account Path</h3>
              <p className="text-xs font-sans text-ink/60 mt-1">Specify your node role inside the SkillSphere system.</p>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 font-sans">
              <button
                type="button"
                onClick={() => setRole('client')}
                className={`p-6 border-2 text-left rounded-xl transition-all shadow-retro cursor-pointer ${
                  role === 'client'
                    ? 'bg-accent-teal text-ink border-ink'
                    : 'bg-cream border-ink hover:bg-accent-teal/10'
                }`}
              >
                <div className="h-9 w-9 bg-cream text-ink flex items-center justify-center border-2 border-ink rounded-lg mb-4 shadow-retro-sm">
                  <UserIcon className="h-5 w-5" />
                </div>
                <h4 className="font-bold text-ink text-sm">Hiring Node</h4>
                <p className="text-xs text-ink/60 mt-1 leading-relaxed text-left">Configure gigs, review proximity metrics, and contract local experts.</p>
              </button>

              <button
                type="button"
                onClick={() => setRole('freelancer')}
                className={`p-6 border-2 text-left rounded-xl transition-all shadow-retro cursor-pointer ${
                  role === 'freelancer'
                    ? 'bg-accent-teal text-ink border-ink'
                    : 'bg-cream border-ink hover:bg-accent-teal/10'
                }`}
              >
                <div className="h-9 w-9 bg-cream text-ink flex items-center justify-center border-2 border-ink rounded-lg mb-4 shadow-retro-sm">
                  <Briefcase className="h-5 w-5" />
                </div>
                <h4 className="font-bold text-ink text-sm">Provider Node</h4>
                <p className="text-xs text-ink/60 mt-1 leading-relaxed text-left">List professional service skills and accept hyperlocal jobs.</p>
              </button>

              <button
                type="button"
                onClick={() => setRole('admin')}
                className={`p-6 border-2 text-left rounded-xl transition-all shadow-retro cursor-pointer ${
                  role === 'admin'
                    ? 'bg-accent-teal text-ink border-ink'
                    : 'bg-cream border-ink hover:bg-accent-teal/10'
                }`}
              >
                <div className="h-9 w-9 bg-cream text-ink flex items-center justify-center border-2 border-ink rounded-lg mb-4 shadow-retro-sm">
                  <ShieldCheck className="h-5 w-5" />
                </div>
                <h4 className="font-bold text-ink text-sm">Admin Node</h4>
                <p className="text-xs text-ink/60 mt-1 leading-relaxed text-left">System oversight, user management, warnings review & platform metrics.</p>
              </button>
            </div>

            <Button
              onClick={() => setStep(2)}
              disabled={!role}
              variant="coral"
              className="w-full py-3"
            >
              <span>Continue</span>
              <ArrowRight className="h-3.5 w-3.5 ml-1" />
            </Button>

            <div className="relative my-4 text-center">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-ink/20"></div>
              </div>
              <span className="relative px-3 bg-cream text-[10px] font-bold text-ink/60 uppercase tracking-widest">or register using</span>
            </div>

            <div className="flex justify-center">
              <div id="google-register-btn" className="border-2 border-ink rounded-lg overflow-hidden shadow-retro-sm"></div>
            </div>
          </div>
        )}

        {/* STEP 2: Basic Account Details */}
        {step === 2 && (
          <div className="space-y-6 animate-fade-in text-left">
            <div className="text-left">
              <h3 className="text-xl font-display font-black text-ink uppercase tracking-tight">Account Parameters</h3>
              <p className="text-xs font-sans text-ink/60 mt-1">Enter credentials for platform authentication.</p>
            </div>

            <div className="space-y-4 font-sans">
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold font-display text-ink uppercase tracking-widest block pl-1">Full Name</label>
                <div className="relative">
                  <UserIcon className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-ink/50 z-10" />
                  <Input
                    type="text"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="e.g. John Doe"
                    className="pl-10"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-[10px] font-bold font-display text-ink uppercase tracking-widest block pl-1">Email Address</label>
                <div className="relative">
                  <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-ink/50 z-10" />
                  <Input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="john@example.com"
                    className="pl-10"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-[10px] font-bold font-display text-ink uppercase tracking-widest block pl-1">Password</label>
                <div className="relative">
                  <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-ink/50 z-10" />
                  <Input
                    type="password"
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Minimum 6 characters"
                    className="pl-10"
                  />
                </div>
              </div>
            </div>

            <div className="flex space-x-4 pt-4 font-sans">
              <Button
                type="button"
                variant="outline"
                onClick={() => setStep(1)}
                className="w-1/3 py-3"
              >
                <ArrowLeft className="h-3.5 w-3.5 mr-1" />
                <span>Back</span>
              </Button>
              <Button
                type="button"
                variant="coral"
                onClick={() => setStep(3)}
                disabled={!canGoToStep3}
                className="w-2/3 py-3"
              >
                <span>Add Location</span>
                <ArrowRight className="h-3.5 w-3.5 ml-1" />
              </Button>
            </div>
          </div>
        )}

        {/* STEP 3: Hyperlocal Location Setup */}
        {step === 3 && (
          <div className="space-y-6 animate-fade-in text-left">
            <div className="text-left">
              <h3 className="text-xl font-display font-black text-ink uppercase tracking-tight">System Node Location</h3>
              <p className="text-xs font-sans text-ink/60 mt-1">Specify coordinates to unlock proximity queries.</p>
            </div>

            <div className="space-y-4 font-sans">
              <Button
                type="button"
                variant="outline"
                onClick={handleDetectLocation}
                disabled={fetchingGeo}
                className="w-full py-3"
              >
                {fetchingGeo ? (
                  <span className="w-4 h-4 border-2 border-ink/30 border-t-ink rounded-full animate-spin"></span>
                ) : (
                  <>
                    <Compass className="h-4 w-4 mr-1 text-ink" />
                    <span>Auto-detect Location</span>
                  </>
                )}
              </Button>

              <div className="flex items-center my-4">
                <div className="flex-grow border-t-2 border-ink/20"></div>
                <span className="px-3 text-[9px] text-ink/60 font-bold uppercase tracking-widest">or search manually</span>
                <div className="flex-grow border-t-2 border-ink/20"></div>
              </div>

              <div className="space-y-1.5 relative">
                <label className="text-[10px] font-bold font-display text-ink uppercase tracking-widest block pl-1">Search City</label>

                {geoApiDown && (
                  <div className="flex items-start space-x-2 p-3 rounded-lg bg-accent-amber/10 border-2 border-ink text-xs text-ink mb-2">
                    <WifiOff className="h-4 w-4 flex-shrink-0 mt-0.5" />
                    <span>Location search is temporarily offline. Type your city and press Enter to set manually.</span>
                  </div>
                )}

                <div className="relative">
                  <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-ink/50 z-10" />
                  <Input
                    type="text"
                    value={citySearch}
                    onChange={handleCitySearchChange}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && geoApiDown && citySearch.trim().length > 1) {
                        setCity(citySearch.trim());
                        if (!latitude) {
                          setLatitude(0);
                          setLongitude(0);
                        }
                        setSuggestions([]);
                      }
                    }}
                    placeholder={geoApiDown ? 'Type city and press Enter' : 'Enter city (e.g. Mumbai)'}
                    className="pl-10"
                  />
                  {searchingCity && (
                    <div className="absolute right-3 top-1/2 -translate-y-1/2">
                      <div className="w-4 h-4 border-2 border-ink/30 border-t-ink rounded-full animate-spin"></div>
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
                    className="w-full text-left px-3 py-2 text-xs text-accent-teal border-2 border-ink rounded-lg bg-cream hover:bg-accent-teal/10 transition-colors mt-1"
                  >
                    ✓ Use &quot;{citySearch.trim()}&quot; as my city
                  </button>
                )}

                {suggestions.length > 0 && (
                  <div className="absolute z-50 left-0 right-0 top-full mt-1 bg-cream border-2 border-ink rounded-lg shadow-retro max-h-40 overflow-y-auto">
                    {suggestions.map((sug, i) => (
                      <button
                        key={i}
                        type="button"
                        onClick={() => handleSelectCity(sug)}
                        className="w-full text-left px-4 py-2 text-xs text-ink hover:bg-accent-amber/20 border-b border-ink/10 last:border-b-0"
                      >
                        {sug.display_name}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {latitude !== null && longitude !== null && (
                <div className="p-4 bg-cream border-2 border-ink rounded-lg text-xs space-y-1.5 text-ink/70 animate-fade-in font-mono shadow-retro-sm">
                  <div className="flex items-center space-x-1.5 text-accent-teal font-extrabold mb-1">
                    <Check className="h-4 w-4 text-ink" />
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
              <Button
                type="button"
                variant="outline"
                onClick={() => setStep(2)}
                className="w-1/3 py-3"
              >
                <ArrowLeft className="h-3.5 w-3.5 mr-1" />
                <span>Back</span>
              </Button>
              <Button
                type="button"
                variant="coral"
                onClick={() => setStep(4)}
                disabled={!canGoToStep4}
                className="w-2/3 py-3"
              >
                <span>Final Settings</span>
                <ArrowRight className="h-3.5 w-3.5 ml-1" />
              </Button>
            </div>
          </div>
        )}

        {/* STEP 4: Profile Specific Settings */}
        {step === 4 && (
          <div className="space-y-6 animate-fade-in font-sans text-left">
            <div className="text-left">
              <h3 className="text-xl font-display font-black text-ink uppercase tracking-tight">
                {role === 'client' ? 'Company Details' : role === 'admin' ? 'System Administrator setup' : 'Node Profile Config'}
              </h3>
              <p className="text-xs text-ink/60 mt-1">
                {role === 'client' 
                  ? 'Input corporate parameters.' 
                  : role === 'admin'
                  ? 'Finalise system administration portal node creation.'
                  : 'Skills can be loaded directly from your freelancer control dashboard.'
                }
              </p>
            </div>

            <div className="space-y-4">
              {role === 'client' ? (
                <>
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold font-display text-ink uppercase tracking-widest block pl-1">Company Name</label>
                    <div className="relative">
                      <Building className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-ink/50 z-10" />
                      <Input
                        type="text"
                        value={companyName}
                        onChange={(e) => setCompanyName(e.target.value)}
                        placeholder="e.g. Acme Hyperlocal"
                        className="pl-10"
                      />
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold font-display text-ink uppercase tracking-widest block pl-1">Short Bio</label>
                    <div className="relative">
                      <FileText className="absolute left-3.5 top-3.5 h-4 w-4 text-ink/50 z-10" />
                      <textarea
                        rows={3}
                        value={bio}
                        onChange={(e) => setBio(e.target.value)}
                        placeholder="Brief intro description..."
                        className="w-full pl-10 pr-4 py-2.5 bg-cream border-2 border-ink rounded-lg text-ink text-sm resize-none focus:outline-none focus:border-accent-amber placeholder:text-ink/40"
                      />
                    </div>
                  </div>
                </>
              ) : role === 'admin' ? (
                <div className="p-6 bg-cream border-2 border-ink border-dashed rounded-lg text-center space-y-3">
                  <ShieldCheck className="h-8 w-8 mx-auto text-accent-teal" />
                  <h4 className="font-bold text-ink text-sm">Admin Control Node Authorized</h4>
                  <p className="text-xs text-ink/60 max-w-xs mx-auto leading-relaxed">
                    Submit registration to load the platform control and supervisor analytics dashboard.
                  </p>
                </div>
              ) : (
                <div className="p-6 bg-cream border-2 border-ink border-dashed rounded-lg text-center space-y-3">
                  <Briefcase className="h-8 w-8 mx-auto text-accent-teal" />
                  <h4 className="font-bold text-ink text-sm">Provider Node Operational</h4>
                  <p className="text-xs text-ink/60 max-w-xs mx-auto leading-relaxed">
                    Account configuration is locked. Submit registration to land on your freelancer workspace dashboard.
                  </p>
                </div>
              )}
            </div>

            <div className="flex space-x-4 pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => setStep(3)}
                className="w-1/3 py-3"
              >
                <ArrowLeft className="h-3.5 w-3.5 mr-1" />
                <span>Back</span>
              </Button>
              <Button
                type="button"
                variant="coral"
                onClick={handleSubmit}
                disabled={loading}
                className="w-2/3 py-3"
              >
                {loading ? (
                  <span className="w-4 h-4 border-2 border-ink/30 border-t-ink rounded-full animate-spin"></span>
                ) : (
                  <>
                    <span>Submit Setup</span>
                    <Check className="h-4 w-4 ml-1" />
                  </>
                )}
              </Button>
            </div>
          </div>
        )}

        {/* Bottom link */}
        <div className="text-left mt-8 pt-6 border-t-2 border-ink font-sans text-xs">
          <p className="text-ink/60">
            Already registered?{' '}
            <Link to="/login" className="font-bold text-accent-teal hover:underline transition-colors">
              Sign In
            </Link>
          </p>
        </div>

      </Card>
    </div>
  );
};
