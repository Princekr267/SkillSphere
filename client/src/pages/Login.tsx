import React, { useState, useEffect } from 'react';
import { Link, useNavigate, Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Mail, Lock, ArrowRight, AlertTriangle, Globe } from 'lucide-react';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { EmailInput } from '../components/ui/EmailInput';
import { PasswordInput } from '../components/ui/PasswordInput';

export const Login: React.FC = () => {
  const { login, googleLogin, user, token, loading: authLoading } = useAuth();
  const navigate = useNavigate();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleGoogleLoginResponse = async (response: any) => {
    setError(null);
    setLoading(true);
    try {
      const res = await googleLogin(response.credential);
      if (res && res.registrationRequired) {
        // Navigate to dedicated Google signup completion page, passing credential via route state
        navigate('/register/google-complete', { state: { googleCredential: response.credential } });
      } else if (res && res.twoFactorRequired) {
        // Navigate to dedicated 2FA challenge page, passing tempToken via route state
        navigate('/login/2fa', { state: { tempToken: res.tempToken } });
      } else {
        navigate('/');
      }
    } catch (err: any) {
      setError(err.message || 'Google authentication failed.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const initGoogle = () => {
      if ((window as any).google) {
        (window as any).google.accounts.id.initialize({
          client_id: import.meta.env.VITE_GOOGLE_CLIENT_ID || '35391508282-83pfbal1rumlvjurfandhdq7al8fqm39.apps.googleusercontent.com',
          callback: handleGoogleLoginResponse,
        });
        const btnContainer = document.getElementById('google-signin-btn');
        if (btnContainer) {
          btnContainer.innerHTML = '';
          const parentWidth = btnContainer.parentElement?.clientWidth || (window.innerWidth - 64);
          const width = Math.max(200, Math.min(parentWidth, 380));
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

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      setError('Please enter a valid email address with a proper domain.');
      return;
    }

    setLoading(true);

    try {
      const res = await login(email, password);
      if (res && res.twoFactorRequired) {
        // Navigate to dedicated 2FA challenge page, passing tempToken via route state
        navigate('/login/2fa', { state: { tempToken: res.tempToken } });
      } else {
        navigate('/');
      }
    } catch (err: any) {
      setError(err.message || 'Invalid email or password.');
    } finally {
      setLoading(false);
    }
  };

  if (token && user) {
    return <Navigate to="/" replace />;
  }

  return (
    <div className="max-w-lg mx-auto px-2.5 sm:px-4 py-8 sm:py-12 flex-grow bg-cream font-sans transition-colors duration-200 min-w-0">

      <Card variant="amber" className="p-4 sm:p-8 text-left space-y-5 min-w-0">
        <div className="bg-cream border-2 border-ink rounded-xl p-4 shadow-retro-sm flex items-start space-x-3 text-left min-w-0">
          <div className="h-10 w-10 bg-accent-amber flex items-center justify-center text-ink font-bold border-2 border-ink rounded-lg shadow-retro-sm flex-shrink-0">
            <Globe className="h-5 w-5" />
          </div>
          <div className="min-w-0 flex-1">
            <h2 className="text-xl font-display font-black text-ink uppercase tracking-tight truncate">Welcome Back</h2>
            <p className="text-xs font-sans text-ink/65 mt-0.5 leading-relaxed">
              Log into your SkillSphere marketplace to manage gigs &amp; contracts.
            </p>
          </div>
        </div>

        {error && (
          <div className="p-4 bg-cream border-2 border-ink border-l-4 border-l-accent-coral flex items-start space-x-3 text-ink text-xs font-sans rounded-lg">
            <AlertTriangle className="h-4 w-4 text-accent-coral flex-shrink-0 mt-0.5" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="bg-cream border-2 border-ink rounded-xl p-5 shadow-retro-sm space-y-4 font-sans">
          <div className="space-y-1.5">
            <label className="text-[10px] font-bold font-display text-ink uppercase tracking-widest block pl-1">
              Email Address
            </label>
            <div className="relative">
              <Mail className="absolute left-3.5 top-[22px] -translate-y-1/2 h-4 w-4 text-ink/40 z-30" />
              <EmailInput
                required
                value={email}
                onChange={setEmail}
                inputClassName="pl-10"
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
                onClick={() => navigate('/forgot-password')}
                className="text-[10px] font-mono text-accent-teal hover:underline font-bold uppercase cursor-pointer"
              >
                Forgot Password?
              </button>
            </div>
            <div className="relative">
              <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-ink/40 z-30 pointer-events-none" />
              <PasswordInput
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
            className="w-full mt-2 font-display uppercase font-bold text-xs"
          >
            {loading ? (
              <span className="w-4 h-4 border-2 border-ink/30 border-t-ink rounded-full animate-spin"></span>
            ) : (
              <>
                <span>Sign In</span>
                <ArrowRight className="h-3.5 w-3.5 ml-1" />
              </>
            )}
          </Button>
        </form>

        <div className="bg-cream border-2 border-ink rounded-xl p-4 shadow-retro-sm space-y-4">
          <div className="flex items-center justify-center space-x-2">
            <div className="flex-grow h-[2px] bg-ink/10" />
            <span className="text-[10px] font-mono text-ink/60 uppercase font-bold px-2">OR CONTINUE WITH</span>
            <div className="flex-grow h-[2px] bg-ink/10" />
          </div>

          {/* Google Sign In Container */}
          <div className="flex justify-center w-full overflow-hidden">
            <div id="google-signin-btn" className="w-full max-w-full flex justify-center overflow-hidden"></div>
          </div>

          <div className="text-center pt-2 border-t border-ink/10 font-sans text-xs">
            <span className="text-ink/60 font-bold">Don't have an account yet? </span>
            <Link to="/register" className="font-bold text-accent-teal hover:underline uppercase font-display text-xs">
              Register Here →
            </Link>
          </div>
        </div>
      </Card>
    </div>
  );
};
