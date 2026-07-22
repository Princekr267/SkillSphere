import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Link, useNavigate, Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Mail, Lock, ArrowRight, AlertTriangle, Globe, Key, ShieldCheck, Navigation, MapPin, Loader2, Search } from 'lucide-react';
import axios from 'axios';
import api from '../utils/api';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';

interface CitySuggestion {
  place_id: number;
  display_name: string;
  lat: string;
  lon: string;
}

export const Login: React.FC = () => {
  const { login, verify2FA, googleLogin, user, token, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  // 2FA state variables
  const [show2FA, setShow2FA] = useState(false);
  const [tempToken, setTempToken] = useState('');
  const [otpCode, setOtpCode] = useState('');

  // Forgot password state
  const [showForgot, setShowForgot] = useState(false);
  const [forgotEmail, setForgotEmail] = useState('');
  const [forgotSuccess, setForgotSuccess] = useState<string | null>(null);

  // Google registration state
  const [googleRegisterRequired, setGoogleRegisterRequired] = useState(
    location.state?.registrationRequired || false
  );
  const [googleCredential, setGoogleCredential] = useState(
    location.state?.googleCredential || ''
  );
  const [googleRole, setGoogleRole] = useState<'client' | 'freelancer'>('client');
  const [googleCity, setGoogleCity] = useState('');
  const [googleLat, setGoogleLat] = useState('19.076');
  const [googleLng, setGoogleLng] = useState('72.877');

  // Google city search states
  const [googleCitySearch, setGoogleCitySearch] = useState('');
  const [googleSuggestions, setGoogleSuggestions] = useState<CitySuggestion[]>([]);
  const [searchingCity, setSearchingCity] = useState(false);
  const [fetchingGeo, setFetchingGeo] = useState(false);
  const [geoApiDown, setGeoApiDown] = useState(false);
  const debounceTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

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

  const handleGoogleLoginResponse = async (response: any) => {
    setError(null);
    setLoading(true);
    try {
      const res = await googleLogin(response.credential);
      if (res && res.registrationRequired) {
        setGoogleCredential(response.credential);
        setGoogleRegisterRequired(true);
      } else if (res && res.twoFactorRequired) {
        setTempToken(res.tempToken);
        setShow2FA(true);
      } else {
        navigate('/');
      }
    } catch (err: any) {
      setError(err.message || 'Google authentication failed.');
    } finally {
      setLoading(false);
    }
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
        setTempToken(res.tempToken);
        setShow2FA(true);
        setGoogleRegisterRequired(false);
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
    const initGoogle = () => {
      if ((window as any).google) {
        (window as any).google.accounts.id.initialize({
          client_id: import.meta.env.VITE_GOOGLE_CLIENT_ID || '35391508282-r6r69antfsgl9jen2e501242s5i4vqlk.apps.googleusercontent.com',
          callback: handleGoogleLoginResponse,
        });
        const btnContainer = document.getElementById('google-signin-btn');
        if (btnContainer) {
          const width = window.innerWidth < 450 ? Math.min(window.innerWidth - 64, 320) : 380;
          (window as any).google.accounts.id.renderButton(
            btnContainer,
            { theme: 'outline', size: 'large', type: 'standard', width }
          );
        }
      }
    };

    const timer = setTimeout(initGoogle, 1000);
    return () => clearTimeout(timer);
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const res = await login(email, password);
      if (res && res.twoFactorRequired) {
        setTempToken(res.tempToken);
        setShow2FA(true);
      } else {
        navigate('/');
      }
    } catch (err: any) {
      setError(err.message || 'Invalid email or password.');
    } finally {
      setLoading(false);
    }
  };

  const handle2FASubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      await verify2FA(tempToken, otpCode);
      navigate('/');
    } catch (err: any) {
      setError(err.message || 'Invalid 2FA authentication code.');
    } finally {
      setLoading(false);
    }
  };

  const handleForgotSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setForgotSuccess(null);
    setLoading(true);

    try {
      const res = await api.post('/auth/forgot-password', { email: forgotEmail });
      if (res.data.success) {
        setForgotSuccess('Password reset link sent to your email inbox.');
      }
    } catch (err: any) {
      setError(err.response?.data?.message || 'Could not send password reset request.');
    } finally {
      setLoading(false);
    }
  };

  if (token && user) {
    return <Navigate to="/" replace />;
  }

  return (
    <div className="max-w-md mx-auto px-4 py-12 flex-grow bg-cream font-sans transition-colors duration-200">
      
      <Card className="p-8 text-left">
        
        {/* VIEW 1: Standard Login Form */}
        {!googleRegisterRequired && !show2FA && !showForgot && (
          <>
            <div className="text-left mb-8">
              <div className="h-10 w-10 bg-accent-amber flex items-center justify-center text-ink font-bold border-2 border-ink rounded-lg mb-4 shadow-retro-sm">
                <Globe className="h-5 w-5" />
              </div>
              <h2 className="text-2xl font-display font-black text-ink uppercase tracking-tight">Welcome Back</h2>
              <p className="text-xs font-sans text-ink/60 mt-1.5 leading-relaxed">
                Log into your SkillSphere marketplace node to manage gigs & active contracts.
              </p>
            </div>

            {error && (
              <div className="mb-6 p-4 bg-cream border-2 border-ink border-l-4 border-l-accent-coral flex items-start space-x-3 text-ink text-xs font-sans rounded-lg">
                <AlertTriangle className="h-4 w-4 text-accent-coral flex-shrink-0 mt-0.5" />
                <span>{error}</span>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4 font-sans">
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold font-display text-ink uppercase tracking-widest block pl-1">
                  Email Address
                </label>
                <div className="relative">
                  <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-ink/40 z-10" />
                  <Input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="name@domain.com"
                    className="pl-10"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <div className="flex items-center justify-between pl-1">
                  <label className="text-[10px] font-bold font-display text-ink uppercase tracking-widest">
                    Password
                  </label>
                  <button
                    type="button"
                    onClick={() => { setShowForgot(true); setError(null); }}
                    className="text-[10px] font-mono text-accent-teal hover:underline font-bold uppercase cursor-pointer"
                  >
                    Forgot Password?
                  </button>
                </div>
                <div className="relative">
                  <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-ink/40 z-10" />
                  <Input
                    type="password"
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    className="pl-10"
                  />
                </div>
              </div>

              <Button
                type="submit"
                disabled={loading || authLoading}
                variant="primary"
                className="w-full mt-2"
              >
                {loading ? (
                  <span className="w-4 h-4 border-2 border-ink/30 border-t-ink rounded-full animate-spin"></span>
                ) : (
                  <>
                    <span>Sign Into Node</span>
                    <ArrowRight className="h-3.5 w-3.5 ml-1" />
                  </>
                )}
              </Button>
            </form>

            <div className="my-6 flex items-center justify-center space-x-2">
              <div className="flex-grow h-[2px] bg-ink/10" />
              <span className="text-[10px] font-mono text-ink/60 uppercase font-bold px-2">OR</span>
              <div className="flex-grow h-[2px] bg-ink/10" />
            </div>

            {/* Google Sign In Container */}
            <div className="flex justify-center">
              <div id="google-signin-btn" className="w-full flex justify-center"></div>
            </div>

            <div className="text-center mt-8 pt-6 border-t-2 border-ink font-sans text-xs">
              <span className="text-ink/60 font-bold">Don't have a node account yet? </span>
              <Link to="/register" className="font-bold text-accent-teal hover:underline uppercase font-display text-xs">
                Register Here →
              </Link>
            </div>
          </>
        )}

        {/* VIEW 2: Google Additional Details Registration */}
        {googleRegisterRequired && (
          <>
            <div className="text-left mb-8">
              <div className="h-10 w-10 bg-accent-teal flex items-center justify-center text-ink font-bold border-2 border-ink rounded-lg mb-4 shadow-retro-sm">
                <Globe className="h-5 w-5" />
              </div>
              <h2 className="text-2xl font-display font-black text-ink uppercase tracking-tight">Complete Google Registration</h2>
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
                      <span>Auto-Detect My City & Location</span>
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
              <button onClick={() => { setGoogleRegisterRequired(false); setError(null); }} className="font-bold text-ink/60 hover:text-ink hover:underline cursor-pointer">
                Cancel
              </button>
            </div>
          </>
        )}

        {/* VIEW 3: 2FA Token Code Challenge Form */}
        {show2FA && (
          <>
            <div className="text-left mb-8">
              <div className="h-10 w-10 bg-accent-coral flex items-center justify-center text-ink font-bold border-2 border-ink rounded-lg mb-4 shadow-retro-sm">
                <ShieldCheck className="h-5 w-5" />
              </div>
              <h2 className="text-2xl font-display font-black text-ink uppercase tracking-tight">Two-Factor Authentication</h2>
              <p className="text-xs font-sans text-ink/60 mt-1.5 leading-relaxed">
                Please type the 6-digit verification code from your Google Authenticator app.
              </p>
            </div>

            {error && (
              <div className="mb-6 p-4 bg-cream border-2 border-ink border-l-4 border-l-accent-coral flex items-start space-x-3 text-ink text-xs font-sans rounded-lg">
                <AlertTriangle className="h-4 w-4 text-accent-coral flex-shrink-0 mt-0.5" />
                <span>{error}</span>
              </div>
            )}

            <form onSubmit={handle2FASubmit} className="space-y-4 font-sans">
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold font-display text-ink uppercase tracking-widest block pl-1">
                  6-Digit OTP Code
                </label>
                <div className="relative">
                  <Key className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-ink/40 z-10" />
                  <Input
                    type="text"
                    required
                    maxLength={6}
                    value={otpCode}
                    onChange={(e) => setOtpCode(e.target.value.replace(/\D/g, ''))}
                    placeholder="123456"
                    className="pl-10 font-mono tracking-widest text-lg font-bold"
                  />
                </div>
              </div>

              <Button
                type="submit"
                disabled={loading || otpCode.length < 6}
                variant="primary"
                className="w-full mt-2"
              >
                {loading ? (
                  <span className="w-4 h-4 border-2 border-ink/30 border-t-ink rounded-full animate-spin"></span>
                ) : (
                  <>
                    <span>Verify Code & Login</span>
                    <ArrowRight className="h-3.5 w-3.5 ml-1" />
                  </>
                )}
              </Button>
            </form>

            <div className="text-left mt-8 pt-6 border-t-2 border-ink font-sans text-xs">
              <button onClick={() => { setShow2FA(false); setError(null); }} className="font-bold text-ink/60 hover:text-ink hover:underline cursor-pointer">
                Back to Sign In
              </button>
            </div>
          </>
        )}

        {/* VIEW 4: Forgot Password Request Form */}
        {showForgot && (
          <>
            <div className="text-left mb-8">
              <div className="h-10 w-10 bg-accent-teal flex items-center justify-center text-ink font-bold border-2 border-ink rounded-lg mb-4 shadow-retro-sm">
                <Key className="h-5 w-5" />
              </div>
              <h2 className="text-2xl font-display font-black text-ink uppercase tracking-tight">Reset Password</h2>
              <p className="text-xs font-sans text-ink/60 mt-1.5 leading-relaxed">
                Enter your registered node email address to receive a password recovery link.
              </p>
            </div>

            {error && (
              <div className="mb-6 p-4 bg-cream border-2 border-ink border-l-4 border-l-accent-coral flex items-start space-x-3 text-ink text-xs font-sans rounded-lg">
                <AlertTriangle className="h-4 w-4 text-accent-coral flex-shrink-0 mt-0.5" />
                <span>{error}</span>
              </div>
            )}

            {forgotSuccess && (
              <div className="mb-6 p-4 bg-cream border-2 border-ink border-l-4 border-l-accent-teal text-ink text-xs font-sans rounded-lg">
                <span>{forgotSuccess}</span>
              </div>
            )}

            <form onSubmit={handleForgotSubmit} className="space-y-4 font-sans">
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold font-display text-ink uppercase tracking-widest block pl-1">
                  Email Address
                </label>
                <div className="relative">
                  <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-ink/40 z-10" />
                  <Input
                    type="email"
                    required
                    value={forgotEmail}
                    onChange={(e) => setForgotEmail(e.target.value)}
                    placeholder="name@domain.com"
                    className="pl-10"
                  />
                </div>
              </div>

              <Button
                type="submit"
                disabled={loading}
                variant="primary"
                className="w-full mt-2"
              >
                {loading ? (
                  <span className="w-4 h-4 border-2 border-ink/30 border-t-ink rounded-full animate-spin"></span>
                ) : (
                  <>
                    <span>Send Recovery Link</span>
                    <ArrowRight className="h-3.5 w-3.5 ml-1" />
                  </>
                )}
              </Button>
            </form>

            <div className="text-left mt-8 pt-6 border-t-2 border-ink font-sans text-xs">
              <button onClick={() => { setShowForgot(false); setError(null); setForgotSuccess(null); }} className="font-bold text-ink/60 hover:text-ink hover:underline cursor-pointer">
                Back to Sign In
              </button>
            </div>
          </>
        )}

      </Card>
    </div>
  );
};
