import React, { useState } from 'react';
import { Link, useNavigate, Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Mail, Lock, ArrowRight, AlertTriangle, Globe } from 'lucide-react';

export const Login: React.FC = () => {
  const { login, user, token, loading: authLoading } = useAuth();
  const navigate = useNavigate();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

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

  // Already logged in — send to the appropriate dashboard
  if (token && user) {
    if (user.role === 'admin') return <Navigate to="/admin" replace />;
    if (user.role === 'client') return <Navigate to="/client-dashboard" replace />;
    return <Navigate to="/freelancer-dashboard" replace />;
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      await login(email, password);
      navigate('/');
    } catch (err: any) {
      setError(err.message || 'Login failed. Please check your credentials.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex-grow flex items-center justify-start px-4 sm:px-12 md:px-24 py-16 relative bg-paper">
      
      {/* Decorative vertical route line on the left edge of page */}
      <div className="absolute left-8 top-0 bottom-0 w-[3px] bg-line-gray border-x border-ink hidden md:block">
        <div className="absolute top-1/3 bottom-1/3 left-0 w-full bg-route-teal"></div>
      </div>

      <div className="w-full max-w-md bg-paper border-2 border-ink sketch-card p-8 relative z-10 animate-slide-up ml-0 md:ml-12 rotate-[-0.5deg]">
        
        {/* Brand Header - Left aligned */}
        <div className="text-left mb-8">
          <div className="h-10 w-10 bg-route-teal flex items-center justify-center text-white font-bold border-2 border-ink sketch-border mb-4">
            <Globe className="h-5 w-5" />
          </div>
          <h2 className="text-2xl font-black font-display text-ink uppercase tracking-tight">System Login</h2>
          <p className="text-xs font-sans text-slate mt-1.5 leading-relaxed">
            Enter your credentials to access your local node dashboard.
          </p>
        </div>

        {/* Error Alert */}
        {error && (
          <div className="mb-6 p-4 bg-paper border-2 border-ink border-l-4 border-l-signal-coral sketch-border flex items-start space-x-3 text-ink text-xs font-sans">
            <AlertTriangle className="h-4 w-4 text-signal-coral flex-shrink-0 mt-0.5" />
            <span>{error}</span>
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-6 font-sans">
          <div className="space-y-1.5">
            <label className="text-[10px] font-bold font-display text-ink uppercase tracking-widest block pl-1">
              Email Address
            </label>
            <div className="relative">
              <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate z-10" />
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="name@domain.com"
                className="w-full pl-10 pr-4 py-2.5 bg-paper border-2 border-ink sketch-input text-ink text-sm focus:outline-none focus:border-route-teal"
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-[10px] font-bold font-display text-ink uppercase tracking-widest block pl-1">
              Password
            </label>
            <div className="relative">
              <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate z-10" />
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full pl-10 pr-4 py-2.5 bg-paper border-2 border-ink sketch-input text-ink text-sm focus:outline-none focus:border-route-teal"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 text-xs font-bold font-display uppercase tracking-widest text-white bg-signal-coral sketch-button flex items-center justify-center space-x-2"
          >
            {loading ? (
              <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></span>
            ) : (
              <>
                <span>Authenticate</span>
                <ArrowRight className="h-3.5 w-3.5" />
              </>
            )}
          </button>
        </form>

        {/* Footer info */}
        <div className="text-left mt-8 pt-6 border-t-2 border-ink font-sans text-xs">
          <p className="text-slate">
            Need a platform account?{' '}
            <Link to="/register" className="font-bold text-route-teal hover:underline transition-colors">
              Register Node
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
};
