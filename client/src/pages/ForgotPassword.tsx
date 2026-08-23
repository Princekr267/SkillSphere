import React, { useState } from 'react';
import { useNavigate, Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Mail, ArrowRight, AlertTriangle, Key } from 'lucide-react';
import api from '../utils/api';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { EmailInput } from '../components/ui/EmailInput';

export const ForgotPassword: React.FC = () => {
  const { user, token } = useAuth();
  const navigate = useNavigate();

  const [forgotEmail, setForgotEmail] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [forgotSuccess, setForgotSuccess] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  // Already authenticated
  if (token && user) {
    return <Navigate to="/" replace />;
  }

  const handleForgotSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setForgotSuccess(null);

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(forgotEmail)) {
      setError('Please enter a valid email address.');
      return;
    }

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

  return (
    <div className="max-w-lg mx-auto px-2.5 sm:px-4 py-8 sm:py-12 flex-grow bg-cream font-sans transition-colors duration-200 min-w-0">
      <Card className="p-4 sm:p-8 text-left min-w-0">
        <div className="text-left mb-6 sm:mb-8 min-w-0">
          <div className="h-10 w-10 bg-accent-teal flex items-center justify-center text-ink font-bold border-2 border-ink rounded-lg mb-4 shadow-retro-sm flex-shrink-0">
            <Key className="h-5 w-5" />
          </div>
          <h2 className="text-xl sm:text-2xl font-display font-black text-ink uppercase tracking-tight truncate">Reset Password</h2>
          <p className="text-xs font-sans text-ink/60 mt-1.5 leading-relaxed">
            Enter your registered email address to receive a password recovery link.
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
              <Mail className="absolute left-3.5 top-[22px] -translate-y-1/2 h-4 w-4 text-ink/40 z-30" />
              <EmailInput
                required
                value={forgotEmail}
                onChange={setForgotEmail}
                inputClassName="pl-10"
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
