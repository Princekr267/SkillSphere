import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { ShieldCheck, ShieldAlert, Key, Loader2, ArrowRight } from 'lucide-react';
import api from '../utils/api';
import { Card } from './ui/Card';
import { Button } from './ui/Button';
import { Input } from './ui/Input';
import { Badge } from './ui/Badge';

export const TwoFactorSetup: React.FC = () => {
  const { user, updateUser } = useAuth();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // Setup states
  const [qrCodeUrl, setQrCodeUrl] = useState<string | null>(null);
  const [secret, setSecret] = useState<string | null>(null);
  const [verificationCode, setVerificationCode] = useState('');

  if (!user) return null;

  const handleStartSetup = async () => {
    setError(null);
    setLoading(true);
    try {
      const res = await api.post('/auth/2fa/generate');
      if (res.data.success) {
        setQrCodeUrl(res.data.qrCodeUrl);
        setSecret(res.data.secret);
      }
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to initialize 2FA configuration.');
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyAndEnable = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const res = await api.post('/auth/2fa/enable', { code: verificationCode });
      if (res.data.success) {
        updateUser({ ...user, twoFactorEnabled: true });
        // Clear setup state
        setQrCodeUrl(null);
        setSecret(null);
        setVerificationCode('');
      }
    } catch (err: any) {
      setError(err.response?.data?.message || 'Invalid 2FA token code.');
    } finally {
      setLoading(false);
    }
  };

  const handleDisable = async () => {
    if (!window.confirm('Are you sure you want to disable Two-Factor Authentication? This reduces your account security.')) {
      return;
    }
    setError(null);
    setLoading(true);
    try {
      const res = await api.post('/auth/2fa/disable');
      if (res.data.success) {
        updateUser({ ...user, twoFactorEnabled: false });
      }
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to disable 2FA.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card className="text-left relative">
      <h3 className="text-xs font-bold font-display text-ink uppercase tracking-widest mb-4 flex items-center space-x-2 pl-1">
        {user.twoFactorEnabled ? (
          <ShieldCheck className="h-4 w-4 text-accent-teal" />
        ) : (
          <ShieldAlert className="h-4 w-4 text-accent-coral" />
        )}
        <span>Two-Factor Authentication (2FA)</span>
      </h3>

      {error && (
        <div className="mb-4 p-3 bg-cream border-2 border-ink border-l-4 border-l-accent-coral text-ink text-xs font-sans rounded-lg">
          {error}
        </div>
      )}

      {user.twoFactorEnabled ? (
        <div className="space-y-4">
          <p className="text-xs text-ink/75 font-sans leading-relaxed">
            Status: <span className="font-bold text-accent-teal uppercase font-mono">Enabled</span>. Your account is secured using temporary TOTP authenticator tokens.
          </p>
          <Button
            onClick={handleDisable}
            disabled={loading}
            variant="coral"
            className="w-full flex items-center justify-center space-x-2"
          >
            {loading ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <span>Disable Security Key</span>
            )}
          </Button>
        </div>
      ) : qrCodeUrl ? (
        <form onSubmit={handleVerifyAndEnable} className="space-y-4 font-sans animate-fade-in">
          <p className="text-xs text-ink/75 leading-relaxed mb-2">
            Scan this QR code with Google Authenticator or your password vault:
          </p>

          <div className="flex justify-center p-3 bg-white border-2 border-ink rounded-xl shadow-retro-sm w-fit mx-auto">
            <img src={qrCodeUrl} alt="2FA QR Code" className="h-36 w-36 object-contain" />
          </div>

          <div className="text-center">
            <span className="text-[10px] text-ink/60 block uppercase tracking-wider mb-1 font-bold">Backup Key</span>
            <code className="bg-cream border-2 border-ink px-2.5 py-1 text-xs font-mono font-bold select-all break-all rounded-lg block max-w-full text-ink">
              {secret}
            </code>
          </div>

          <div className="space-y-1">
            <label className="text-[10px] font-bold font-display text-ink uppercase tracking-widest block pl-1">
              Verify Code
            </label>
            <div className="relative">
              <Key className="absolute left-3.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-ink/50 z-10" />
              <Input
                type="text"
                required
                maxLength={6}
                value={verificationCode}
                onChange={(e) => setVerificationCode(e.target.value.replace(/\D/g, ''))}
                placeholder="123456"
                className="pl-9 text-sm tracking-widest font-mono font-bold"
              />
            </div>
          </div>

          <div className="flex space-x-2">
            <Button
              type="button"
              onClick={() => { setQrCodeUrl(null); setSecret(null); }}
              variant="outline"
              className="w-1/3"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={loading}
              variant="secondary"
              className="w-2/3 flex items-center justify-center space-x-1"
            >
              {loading ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <>
                  <span>Activate</span>
                  <ArrowRight className="h-3.5 w-3.5" />
                </>
              )}
            </Button>
          </div>
        </form>
      ) : (
        <div className="space-y-4">
          <p className="text-xs text-ink/75 font-sans leading-relaxed">
            Status: <span className="font-bold text-accent-coral uppercase font-mono">Disabled</span>. Strengthen your login security by activating two-factor TOTP authenticators.
          </p>
          <Button
            onClick={handleStartSetup}
            disabled={loading}
            variant="primary"
            className="w-full flex items-center justify-center space-x-2"
          >
            {loading ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <span>Setup Authenticator</span>
            )}
          </Button>
        </div>
      )}
    </Card>
  );
};
