import React, { useState } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { Lock, ArrowRight, AlertTriangle, ShieldCheck } from 'lucide-react';
import api from '../utils/api';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';

export const ResetPassword: React.FC = () => {
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token');

  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);
    setLoading(true);

    if (!token) {
      setError('Missing reset token parameters.');
      setLoading(false);
      return;
    }

    if (password !== confirmPassword) {
      setError('Passwords do not match.');
      setLoading(false);
      return;
    }

    if (password.length < 6) {
      setError('Password must contain at least 6 characters.');
      setLoading(false);
      return;
    }

    try {
      const res = await api.post(`/auth/reset-password/${token}`, { password });
      if (res.data.success) {
        setSuccess('Password updated successfully! You can now log in.');
      }
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to reset password.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex-grow flex items-center justify-center p-8 bg-cream relative transition-colors duration-200">
      
      {/* Decorative vertical line */}
      <div className="absolute left-8 top-0 bottom-0 w-[4px] bg-ink/10 dark:bg-cream/15 border-x border-ink hidden md:block">
        <div className="absolute top-1/4 bottom-1/4 left-0 w-full bg-accent-amber"></div>
      </div>

      <Card className="w-full max-w-md p-8 relative z-10">
        <div className="text-left mb-8 font-sans">
          <div className="h-10 w-10 bg-accent-amber flex items-center justify-center text-ink font-bold border-2 border-ink rounded-lg mb-4 shadow-retro-sm">
            <Lock className="h-5 w-5" />
          </div>
          <h2 className="text-2xl font-display font-black text-ink uppercase tracking-tight">Configure Password</h2>
          <p className="text-xs text-ink/60 mt-1">
            Specify a secure new password for your account node.
          </p>
        </div>

        {error && (
          <div className="mb-6 p-4 bg-cream border-2 border-ink border-l-4 border-l-accent-coral flex items-start space-x-3 text-ink text-xs font-sans rounded-lg">
            <AlertTriangle className="h-4 w-4 text-accent-coral flex-shrink-0 mt-0.5" />
            <span>{error}</span>
          </div>
        )}

        {success ? (
          <div className="space-y-6 font-sans">
            <div className="p-4 bg-cream border-2 border-ink border-l-4 border-l-accent-teal flex items-start space-x-3 text-ink text-xs rounded-lg">
              <ShieldCheck className="h-4 w-4 text-accent-teal flex-shrink-0 mt-0.5" />
              <span>{success}</span>
            </div>

            <Link to="/login" className="block w-full">
              <Button variant="coral" className="w-full py-3">
                <span>Log In Now</span>
              </Button>
            </Link>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-6 font-sans animate-fade-in">
            <div className="space-y-1.5">
              <label className="text-[10px] font-bold font-display text-ink uppercase tracking-widest block pl-1">
                New Password
              </label>
              <div className="relative">
                <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-ink/50 z-10" />
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

            <div className="space-y-1.5">
              <label className="text-[10px] font-bold font-display text-ink uppercase tracking-widest block pl-1">
                Confirm New Password
              </label>
              <div className="relative">
                <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-ink/50 z-10" />
                <Input
                  type="password"
                  required
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="••••••••"
                  className="pl-10"
                />
              </div>
            </div>

            <Button
              type="submit"
              disabled={loading}
              variant="coral"
              className="w-full"
            >
              {loading ? (
                <span className="w-4 h-4 border-2 border-ink/30 border-t-ink rounded-full animate-spin"></span>
              ) : (
                <>
                  <span>Save Password</span>
                  <ArrowRight className="h-3.5 w-3.5 ml-1" />
                </>
              )}
            </Button>
          </form>
        )}
      </Card>
    </div>
  );
};
