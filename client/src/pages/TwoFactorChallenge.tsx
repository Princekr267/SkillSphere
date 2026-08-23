import React, { useState } from 'react';
import { useNavigate, useLocation, Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Key, ArrowRight, AlertTriangle, ShieldCheck } from 'lucide-react';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';

export const TwoFactorChallenge: React.FC = () => {
  const { verify2FA, user, token } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  // All hooks must be called before any conditional returns
  const [otpCode, setOtpCode] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const tempToken: string | undefined = location.state?.tempToken;

  // Guard: if no tempToken, user navigated here directly — send back to login
  if (!tempToken) {
    return <Navigate to="/login" replace />;
  }

  // Already authenticated
  if (token && user) {
    return <Navigate to="/" replace />;
  }

  const handle2FASubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      // Fix: verify2FA signature is (code, tempToken) — code first, tempToken second
      await verify2FA(otpCode, tempToken);
      navigate('/');
    } catch (err: any) {
      setError(err.message || 'Invalid 2FA authentication code.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-lg mx-auto px-2.5 sm:px-4 py-8 sm:py-12 flex-grow bg-cream font-sans transition-colors duration-200 min-w-0">
      <Card className="p-4 sm:p-8 text-left min-w-0">
        <div className="text-left mb-6 sm:mb-8 min-w-0">
          <div className="h-10 w-10 bg-accent-coral flex items-center justify-center text-ink font-bold border-2 border-ink rounded-lg mb-4 shadow-retro-sm flex-shrink-0">
            <ShieldCheck className="h-5 w-5" />
          </div>
          <h2 className="text-lg sm:text-2xl font-display font-black text-ink uppercase tracking-tight truncate">Two-Factor Authentication</h2>
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
                <span>Verify Code &amp; Login</span>
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
            Back to Sign In
          </button>
        </div>
      </Card>
    </div>
  );
};
