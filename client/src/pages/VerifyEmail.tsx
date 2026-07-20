import React, { useState } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { Globe, Check, AlertTriangle, ShieldCheck, ArrowRight } from 'lucide-react';
import api from '../utils/api';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';

export const VerifyEmail: React.FC = () => {
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token');

  const [submitting, setSubmitting] = useState(false);
  const [verified, setVerified] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState('');

  const handleVerify = async () => {
    if (!token) {
      setError('Missing email verification token in URL.');
      return;
    }

    setSubmitting(true);
    setError(null);

    try {
      const res = await api.post('/auth/verify-email', { token });
      if (res.data.success) {
        setVerified(true);
        setMessage(res.data.message || 'Email verified successfully! You now have full access.');
      } else {
        setError(res.data.message || 'Verification failed.');
      }
    } catch (err: any) {
      setError(err.response?.data?.message || 'Server error verifying email.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="flex-grow flex items-center justify-center p-8 bg-cream relative transition-colors duration-200">
      
      {/* Decorative vertical line */}
      <div className="absolute left-8 top-0 bottom-0 w-[4px] bg-ink/10 dark:bg-cream/15 border-x border-ink hidden md:block">
        <div className="absolute top-1/4 bottom-1/4 left-0 w-full bg-accent-amber"></div>
      </div>

      <Card className="w-full max-w-md p-8 text-center relative z-10">
        <div className="h-12 w-12 bg-accent-teal flex items-center justify-center text-ink font-bold border-2 border-ink rounded-lg mx-auto mb-6 shadow-retro-sm">
          <ShieldCheck className="h-6 w-6" />
        </div>

        <h2 className="text-2xl font-display font-black text-ink uppercase tracking-tight mb-2">
          Email Verification
        </h2>

        <p className="text-xs font-sans text-ink/60 mb-6 leading-relaxed">
          Confirm your email verification to unlock posting gigs and submitting freelancer proposals.
        </p>

        {error && (
          <div className="mb-6 p-4 bg-cream border-2 border-ink border-l-4 border-l-accent-coral flex items-start space-x-3 text-ink text-xs text-left rounded-lg font-sans">
            <AlertTriangle className="h-5 w-5 text-accent-coral flex-shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {verified ? (
          <div className="space-y-6 font-sans">
            <div className="p-4 bg-cream border-2 border-ink border-l-4 border-l-accent-teal flex items-start space-x-3 text-ink text-xs text-left rounded-lg">
              <Check className="h-5 w-5 text-accent-teal flex-shrink-0" />
              <span>{message}</span>
            </div>

            <Link to="/login" className="block w-full">
              <Button variant="primary" className="w-full py-3">
                <span>Sign Into Account</span>
                <ArrowRight className="h-4 w-4 ml-1" />
              </Button>
            </Link>
          </div>
        ) : (
          <div className="space-y-4 font-sans">
            <Button
              onClick={handleVerify}
              disabled={submitting || !token}
              variant="coral"
              className="w-full py-3 flex items-center justify-center space-x-2"
            >
              {submitting ? (
                <span className="w-4 h-4 border-2 border-ink/30 border-t-ink rounded-full animate-spin"></span>
              ) : (
                <>
                  <span>Verify My Account Now</span>
                  <ArrowRight className="h-4 w-4" />
                </>
              )}
            </Button>

            {!token && (
              <p className="text-[10px] font-mono text-accent-coral font-bold uppercase">
                Invalid verification link. Please check your email link or request a new one.
              </p>
            )}

            <div className="pt-4 border-t-2 border-ink">
              <Link to="/login" className="text-xs font-bold text-ink/60 hover:text-ink hover:underline uppercase font-display">
                Back to Sign In
              </Link>
            </div>
          </div>
        )}
      </Card>
    </div>
  );
};
