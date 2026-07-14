import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import api from '../utils/api';
import { Camera, Loader2, AlertCircle, CheckCircle2, Trash2 } from 'lucide-react';

export const AvatarUpload: React.FC = () => {
  const { user, updateUser } = useAuth();
  const [uploading, setUploading] = useState(false);
  const [removing, setRemoving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const showSuccess = (msg: string) => {
    setSuccess(msg);
    setTimeout(() => setSuccess(''), 3000);
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 2 * 1024 * 1024) {
      setError('Image must be smaller than 2MB.');
      return;
    }

    setUploading(true);
    setError('');
    setSuccess('');

    const formData = new FormData();
    formData.append('avatar', file);

    try {
      const res = await api.post('/users/avatar', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      if (res.data.success) {
        updateUser(res.data.user);
        showSuccess('Avatar updated!');
      }
    } catch (err: any) {
      setError(err.response?.data?.message || 'Avatar upload failed.');
    } finally {
      setUploading(false);
      // Reset file input so same file can be re-uploaded
      e.target.value = '';
    }
  };

  const handleRemoveAvatar = async () => {
    if (!user?.avatar) return;
    if (!window.confirm('Remove your profile photo?')) return;

    setRemoving(true);
    setError('');
    setSuccess('');

    try {
      const res = await api.delete('/users/avatar');
      if (res.data.success) {
        updateUser(res.data.user);
        showSuccess('Avatar removed.');
      }
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to remove avatar.');
    } finally {
      setRemoving(false);
    }
  };

  return (
    <div className="flex flex-col items-center space-y-3 p-4 border border-line-gray rounded-sm bg-white w-full">
      <div className="relative group">
        {/* Profile Circle */}
        <div className="h-20 w-20 rounded-full bg-slate/10 border border-slate/30 overflow-hidden flex items-center justify-center font-display text-2xl font-black text-ink uppercase">
          {user?.avatar ? (
            <img src={user.avatar} alt={user.name} className="h-full w-full object-cover" />
          ) : (
            user?.name.charAt(0)
          )}
        </div>

        {/* Hover/Overlay Upload Label */}
        <label className="absolute inset-0 bg-ink/60 rounded-full flex flex-col items-center justify-center cursor-pointer opacity-0 group-hover:opacity-100 transition-opacity">
          <Camera className="h-5 w-5 text-white" />
          <span className="text-[8px] font-mono text-white uppercase tracking-wider mt-0.5">
            {uploading ? 'Uploading...' : 'Change'}
          </span>
          <input
            type="file"
            accept="image/*"
            onChange={handleFileChange}
            disabled={uploading || removing}
            className="hidden"
          />
        </label>
      </div>

      <div className="text-center">
        <p className="text-xs font-bold text-ink uppercase font-display tracking-tight">Profile Avatar</p>
        <p className="text-[9px] font-mono text-slate uppercase mt-0.5">JPG / PNG / WEBP · MAX 2MB</p>
      </div>

      {/* Remove button — only when an avatar exists */}
      {user?.avatar && (
        <button
          type="button"
          onClick={handleRemoveAvatar}
          disabled={removing || uploading}
          className="flex items-center space-x-1.5 text-[10px] font-mono text-signal-coral hover:text-signal-coral/80 transition-colors disabled:opacity-50"
        >
          {removing ? (
            <Loader2 className="h-3 w-3 animate-spin" />
          ) : (
            <Trash2 className="h-3 w-3" />
          )}
          <span>{removing ? 'Removing...' : 'Remove photo'}</span>
        </button>
      )}

      {uploading && (
        <div className="flex items-center space-x-1.5 text-[10px] font-mono text-route-teal">
          <Loader2 className="h-3 w-3 animate-spin" />
          <span>Uploading node photo...</span>
        </div>
      )}

      {error && (
        <div className="flex items-center space-x-1.5 text-[10px] font-mono text-signal-coral">
          <AlertCircle className="h-3.5 w-3.5 flex-shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {success && (
        <div className="flex items-center space-x-1.5 text-[10px] font-mono text-route-teal">
          <CheckCircle2 className="h-3.5 w-3.5 flex-shrink-0" />
          <span>{success}</span>
        </div>
      )}
    </div>
  );
};
