import React, { useState, useRef, useCallback } from 'react';
import { useNavigate, useLocation, Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Globe, Navigation, MapPin, Loader2, Search, ArrowRight, AlertTriangle } from 'lucide-react';
import axios from 'axios';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';

interface CitySuggestion {
  place_id: number;
  display_name: string;
  lat: string;
  lon: string;
}

export const CompleteGoogleSignup: React.FC = () => {
  const { googleLogin, user, token } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  // All hooks must be called before any conditional returns
  const [googleRole, setGoogleRole] = useState<'client' | 'freelancer'>('client');
  const [googleCity, setGoogleCity] = useState('');
  const [googleLat, setGoogleLat] = useState('19.076');
  const [googleLng, setGoogleLng] = useState('72.877');
  const [googleCitySearch, setGoogleCitySearch] = useState('');
  const [googleSuggestions, setGoogleSuggestions] = useState<CitySuggestion[]>([]);
  const [searchingCity, setSearchingCity] = useState(false);
  const [fetchingGeo, setFetchingGeo] = useState(false);
  const [geoApiDown, setGeoApiDown] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const debounceTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const googleCredential: string | undefined = location.state?.googleCredential;

  // Guard: if no credential, user navigated here directly — send back to login
  if (!googleCredential) {
    return <Navigate to="/login" replace />;
  }

  // Already authenticated
  if (token && user) {
    return <Navigate to="/" replace />;
  }

  const handleDetectGeo = () => {
    if (!navigator.geolocation) {
      setError('Geolocation is not supported by your browser.');
      return;
    }
    setFetchingGeo(true);
    setError(null);

    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const { latitude: lat, longitude: lng } = position.coords;
        setGoogleLat(lat.toString());
        setGoogleLng(lng.toString());

        try {
          const res = await axios.get(
            `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}`
          );
          const address = res.data.address;
          const cityName = address.city || address.town || address.village || address.suburb || 'My Location';
          setGoogleCity(cityName);
          setGoogleCitySearch(cityName);
        } catch (err) {
          console.error(err);
          setGoogleCity('Detected Location');
          setGoogleCitySearch('Detected Location');
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

  const searchCity = useCallback(async (val: string) => {
    if (val.length < 3) {
      setGoogleSuggestions([]);
      setSearchingCity(false);
      return;
    }
    setSearchingCity(true);
    try {
      const res = await axios.get(
        `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(val)}&limit=5&addressdetails=1`,
        { headers: { 'Accept-Language': 'en', 'User-Agent': 'SkillSphere/1.0 (skillsphere.in)' }, timeout: 6000 }
      );
      setGoogleSuggestions(res.data);
      setGeoApiDown(false);
    } catch (err: any) {
      setGeoApiDown(true);
      setGoogleSuggestions([]);
    } finally {
      setSearchingCity(false);
    }
  }, []);

  const handleCitySearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setGoogleCitySearch(val);
    if (debounceTimer.current) clearTimeout(debounceTimer.current);
    debounceTimer.current = setTimeout(() => searchCity(val), 500);
  };

  const handleSelectCity = (suggestion: CitySuggestion) => {
    const cityName = suggestion.display_name.split(',')[0];
    setGoogleCity(cityName);
    setGoogleCitySearch(suggestion.display_name);
    setGoogleLat(suggestion.lat);
    setGoogleLng(suggestion.lon);
    setGoogleSuggestions([]);
  };

  const handleGoogleSignupSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const finalCity = googleCity || googleCitySearch.trim();
    if (!finalCity) {
      setError('Please select or enter your city name.');
      return;
    }

    setLoading(true);
    try {
      const res = await googleLogin(googleCredential, googleRole, {
        city: finalCity,
        latitude: parseFloat(googleLat),
        longitude: parseFloat(googleLng),
      });
      if (res && res.twoFactorRequired) {
        navigate('/login/2fa', { state: { tempToken: res.tempToken } });
      } else {
        navigate('/');
      }
    } catch (err: any) {
      setError(err.message || 'Google registration failed.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-lg mx-auto px-2.5 sm:px-4 py-8 sm:py-12 flex-grow bg-cream font-sans transition-colors duration-200 min-w-0">
      <Card className="p-4 sm:p-8 text-left min-w-0">
        <div className="text-left mb-6 sm:mb-8 min-w-0">
          <div className="h-10 w-10 bg-accent-teal flex items-center justify-center text-ink font-bold border-2 border-ink rounded-lg mb-4 shadow-retro-sm flex-shrink-0">
            <Globe className="h-5 w-5" />
          </div>
          <h2 className="text-xl sm:text-2xl font-display font-black text-ink uppercase tracking-tight truncate">Complete Google Registration</h2>
          <p className="text-xs font-sans text-ink/60 mt-1.5 leading-relaxed">
            Please supply your account role and city location to complete your profile setup.
          </p>
        </div>

        {error && (
          <div className="mb-6 p-4 bg-cream border-2 border-ink border-l-4 border-l-accent-coral flex items-start space-x-3 text-ink text-xs font-sans rounded-lg">
            <AlertTriangle className="h-4 w-4 text-accent-coral flex-shrink-0 mt-0.5" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleGoogleSignupSubmit} className="space-y-5 font-sans">

          {/* Role Picker */}
          <div className="space-y-1.5">
            <label className="text-[10px] font-bold font-display text-ink uppercase tracking-widest block pl-1">
              Select Role *
            </label>
            <div className="grid grid-cols-2 gap-4">
              <Button
                type="button"
                variant={googleRole === 'client' ? 'primary' : 'outline'}
                onClick={() => setGoogleRole('client')}
                className="w-full"
              >
                Client
              </Button>
              <Button
                type="button"
                variant={googleRole === 'freelancer' ? 'primary' : 'outline'}
                onClick={() => setGoogleRole('freelancer')}
                className="w-full"
              >
                Freelancer
              </Button>
            </div>
          </div>

          {/* Geolocation Detect Button */}
          <div className="space-y-1.5 pt-2">
            <label className="text-[10px] font-bold font-display text-ink uppercase tracking-widest block pl-1">
              Location Setup *
            </label>
            <Button
              type="button"
              onClick={handleDetectGeo}
              disabled={fetchingGeo}
              variant="outline"
              className="w-full flex items-center justify-center space-x-2 text-xs py-2"
            >
              {fetchingGeo ? (
                <>
                  <Loader2 className="h-4 w-4 text-accent-teal animate-spin" />
                  <span>Detecting Coordinates...</span>
                </>
              ) : (
                <>
                  <Navigation className="h-4 w-4 text-accent-teal" />
                  <span>Auto-Detect My City &amp; Location</span>
                </>
              )}
            </Button>
          </div>

          {/* City Search Field */}
          <div className="space-y-1.5 relative">
            <label className="text-[10px] font-bold font-display text-ink uppercase tracking-widest block pl-1">
              Or Search City Name
            </label>
            <div className="relative">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-ink/40 z-10" />
              <Input
                type="text"
                value={googleCitySearch}
                onChange={handleCitySearchChange}
                placeholder="Enter city (e.g. Mumbai, Delhi)"
                className="pl-10"
              />
              {searchingCity && (
                <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-accent-teal animate-spin" />
              )}
            </div>

            {/* Suggestions dropdown */}
            {googleSuggestions.length > 0 && (
              <div className="absolute left-0 right-0 top-full mt-1 bg-cream border-2 border-ink rounded-lg shadow-retro z-50 divide-y divide-ink/10 max-h-48 overflow-y-auto">
                {googleSuggestions.map((s) => (
                  <div
                    key={s.place_id}
                    onClick={() => handleSelectCity(s)}
                    className="p-2.5 text-xs text-ink hover:bg-accent-teal/15 cursor-pointer flex items-center space-x-2 transition-colors"
                  >
                    <MapPin className="h-3.5 w-3.5 text-accent-teal flex-shrink-0" />
                    <span className="font-bold font-sans">{s.display_name}</span>
                  </div>
                ))}
              </div>
            )}

            {geoApiDown && googleCitySearch.trim().length > 1 && (
              <div className="p-2.5 bg-cream border-2 border-ink rounded-lg text-xs flex items-center justify-between mt-2">
                <span className="font-bold text-ink">Use "{googleCitySearch.trim()}"</span>
                <Button
                  type="button"
                  size="sm"
                  variant="primary"
                  onClick={() => setGoogleCity(googleCitySearch.trim())}
                >
                  Set City
                </Button>
              </div>
            )}
          </div>

          {/* Selected City Confirmation */}
          {googleCity && (
            <div className="p-3 bg-accent-teal/10 border-2 border-ink rounded-lg text-xs font-mono font-bold text-ink flex items-center space-x-2">
              <MapPin className="h-4 w-4 text-accent-teal flex-shrink-0" />
              <span>Selected City: {googleCity}</span>
            </div>
          )}

          <Button
            type="submit"
            disabled={loading || !googleCity}
            variant="coral"
            className="w-full mt-4"
          >
            {loading ? (
              <span className="w-4 h-4 border-2 border-ink/30 border-t-ink rounded-full animate-spin"></span>
            ) : (
              <>
                <span>Complete Google Registration</span>
                <ArrowRight className="h-3.5 w-3.5 ml-1" />
              </>
            )}
          </Button>
        </form>

        <div className="text-left mt-8 pt-6 border-t-2 border-ink font-sans text-xs">
          <button
            onClick={() => navigate('/login')}
            className="font-bold text-ink/60 hover:text-ink hover:underline cursor-pointer"
          >
            Cancel
          </button>
        </div>
      </Card>
    </div>
  );
};
