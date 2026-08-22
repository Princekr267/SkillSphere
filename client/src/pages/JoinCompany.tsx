import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { KeyRound, ArrowRight, AlertTriangle, Loader2, Check } from 'lucide-react';
import api from '../utils/api';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';

export const JoinCompany: React.FC = () => {
  const navigate = useNavigate();
  const [inviteKey, setInviteKey] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<{ companyId: string; companyName: string } | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const key = inviteKey.trim().toUpperCase();
    if (!key) {
      setError('Please enter an invite key.');
      return;
    }

    setLoading(true);
    try {
      const res = await api.post('/companies/join', { inviteKey: key });
      if (res.data.success) {
        setSuccess({ companyId: res.data.company._id, companyName: res.data.company.name });
      }
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to join company. Please check the invite key.');
    } finally {
      setLoading(false);
    }
  };

  // ── Success state ─────────────────────────────────────────────────────────
  if (success) {
    return (
      <div className="flex-grow flex items-center justify-center px-4 py-16 bg-cream transition-colors duration-200">
        <Card className="w-full max-w-md p-8 text-center space-y-6 animate-slide-up">
          <div className="h-16 w-16 rounded-full bg-accent-teal/20 border-2 border-ink flex items-center justify-center mx-auto">
            <Check className="h-8 w-8 text-ink" />
          </div>
          <div>
            <h2 className="text-xl font-display font-black text-ink uppercase tracking-tight">You're In!</h2>
            <p className="text-xs text-ink/60 font-sans mt-2">
              You've successfully joined <strong>{success.companyName}</strong>.
              You can now view all company gigs from the company dashboard.
            </p>
          </div>
          <Button
            variant="coral"
            className="w-full py-3"
            onClick={() => navigate(`/company/${success.companyId}`)}
          >
            <span>Go to Company Dashboard</span>
            <ArrowRight className="h-3.5 w-3.5 ml-1" />
          </Button>
        </Card>
      </div>
    );
  }

  return (
    <div className="flex-grow flex items-center justify-center px-4 py-16 bg-cream transition-colors duration-200">
      <Card variant="amber" className="w-full max-w-md p-6 sm:p-8 animate-slide-up space-y-5">

        {/* Header */}
        <div className="bg-cream border-2 border-ink rounded-xl p-5 shadow-retro-sm text-left">
          <div className="flex items-center space-x-3 mb-2">
            <div className="h-9 w-9 bg-accent-amber border-2 border-ink flex items-center justify-center rounded-lg shadow-retro-sm flex-shrink-0">
              <KeyRound className="h-4.5 w-4.5 text-ink" />
            </div>
            <div>
              <p className="text-[10px] font-mono text-ink/60 uppercase tracking-widest font-bold">Company Access</p>
              <h1 className="text-xl font-display font-black text-ink uppercase tracking-tight">Join a Company</h1>
            </div>
          </div>
          <p className="text-xs text-ink/65 font-sans leading-relaxed font-medium">
            Enter the invite key shared by your company owner to join their organisation on SkillSphere.
          </p>
        </div>

        {/* Error banner */}
        {error && (
          <div className="p-4 bg-cream border-2 border-ink border-l-4 border-l-accent-coral flex items-start space-x-3 text-ink text-xs font-sans rounded-lg">
            <AlertTriangle className="h-4 w-4 text-accent-coral flex-shrink-0 mt-0.5" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="bg-cream border-2 border-ink rounded-xl p-5 shadow-retro-sm space-y-5">
          <div className="space-y-1.5">
            <label className="text-[10px] font-bold font-display text-ink uppercase tracking-widest block pl-1">
              Invite Key <span className="text-accent-coral">*</span>
            </label>
            <div className="relative">
              <KeyRound className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-ink/50 z-10" />
              <Input
                type="text"
                value={inviteKey}
                onChange={(e) => setInviteKey(e.target.value.toUpperCase())}
                placeholder="e.g. A1B2C3D4E5"
                className="pl-10 font-mono tracking-widest uppercase"
                maxLength={10}
                required
              />
            </div>
            <p className="text-[10px] text-ink/50 font-mono pl-1">10-character alphanumeric code (case-insensitive)</p>
          </div>

          <Button
            type="submit"
            variant="coral"
            className="w-full py-3"
            disabled={loading || inviteKey.trim().length === 0}
          >
            {loading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <>
                <span>Join Company</span>
                <ArrowRight className="h-3.5 w-3.5 ml-1" />
              </>
            )}
          </Button>
        </form>

        <p className="text-xs text-ink/50 font-sans mt-6 text-center">
          Don't have an invite key?{' '}
          <button
            type="button"
            onClick={() => navigate('/register-company')}
            className="font-bold text-accent-teal hover:underline cursor-pointer"
          >
            Register your own company
          </button>
        </p>
      </Card>
    </div>
  );
};
