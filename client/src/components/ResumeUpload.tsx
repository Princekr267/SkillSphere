import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import api from '../utils/api';
import { FileText, Loader2, AlertCircle, CheckCircle2, Trash2, Upload, ExternalLink } from 'lucide-react';

export const ResumeUpload: React.FC = () => {
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

    // Accepted document types
    const allowedExtensions = ['.pdf', '.doc', '.docx'];
    const allowedMimeTypes = [
      'application/pdf',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    ];

    const fileExt = '.' + file.name.split('.').pop()?.toLowerCase();

    if (!allowedMimeTypes.includes(file.type) && !allowedExtensions.includes(fileExt)) {
      setError('Only PDF, DOC, or DOCX document formats are allowed.');
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      setError('Resume file size must be smaller than 5MB.');
      return;
    }

    setUploading(true);
    setError('');
    setSuccess('');

    const formData = new FormData();
    formData.append('resume', file);

    try {
      const res = await api.post('/users/resume', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      if (res.data.success) {
        updateUser(res.data.user);
        showSuccess('Resume uploaded successfully!');
      }
    } catch (err: any) {
      setError(err.response?.data?.message || 'Resume upload failed.');
    } finally {
      setUploading(false);
      e.target.value = '';
    }
  };

  const handleRemoveResume = async () => {
    if (!user?.resume?.url) return;
    if (!window.confirm('Are you sure you want to remove your resume?')) return;

    setRemoving(true);
    setError('');
    setSuccess('');

    try {
      const res = await api.delete('/users/resume');
      if (res.data.success) {
        updateUser(res.data.user);
        showSuccess('Resume removed.');
      }
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to remove resume.');
    } finally {
      setRemoving(false);
    }
  };

  return (
    <div className="flex flex-col items-center space-y-3 p-3.5 sm:p-4 border-2 border-ink rounded-lg bg-cream w-full min-w-0 max-w-full transition-colors duration-200 text-left">
      <div className="flex items-center space-x-3 w-full border-b border-ink/10 pb-3">
        <div className="h-10 w-10 rounded-lg bg-accent-teal/20 border-2 border-ink flex items-center justify-center text-ink flex-shrink-0 shadow-retro-sm">
          <FileText className="h-5 w-5 text-accent-teal" />
        </div>
        <div className="flex-1 min-w-0">
          <h4 className="text-xs font-bold text-ink uppercase font-display tracking-tight">
            Freelancer CV / Resume
          </h4>
          <p className="text-[9px] font-mono text-ink/60 uppercase mt-0.5">
            PDF · DOC · DOCX (MAX 5MB)
          </p>
        </div>
      </div>

      {user?.resume?.url ? (
        <div className="w-full space-y-3 pt-1">
          <a
            href={user.resume.url}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center justify-between bg-cream border border-ink/20 p-2.5 rounded-lg text-xs font-mono hover:bg-cream/70 hover:border-ink/40 transition-colors group cursor-pointer"
            title="View Resume in new tab"
          >
            <div className="flex items-center space-x-2 truncate min-w-0 pr-2">
              <FileText className="h-4 w-4 text-accent-teal flex-shrink-0" />
              <span className="font-bold text-ink truncate text-[11px]" title={user.resume.originalName || 'My_Resume.pdf'}>
                {user.resume.originalName || 'My_Resume.pdf'}
              </span>
            </div>
            <div
              className="inline-flex items-center space-x-1 px-2.5 py-1 bg-accent-teal text-ink font-bold text-[10px] uppercase border border-ink rounded group-hover:bg-accent-teal/80 transition-colors flex-shrink-0"
            >
              <span>View</span>
              <ExternalLink className="h-3 w-3" />
            </div>
          </a>

          <div className="flex items-center justify-between text-xs pt-1">
            <label className="flex items-center space-x-1 text-[10px] font-mono text-accent-teal hover:underline cursor-pointer font-bold">
              <Upload className="h-3 w-3" />
              <span>{uploading ? 'Uploading...' : 'Replace Resume'}</span>
              <input
                type="file"
                accept=".pdf,.doc,.docx"
                onChange={handleFileChange}
                disabled={uploading || removing}
                className="hidden"
              />
            </label>

            <button
              type="button"
              onClick={handleRemoveResume}
              disabled={removing || uploading}
              className="flex items-center space-x-1 text-[10px] font-mono text-accent-coral hover:text-accent-coral/80 transition-colors disabled:opacity-50 cursor-pointer font-bold"
            >
              {removing ? (
                <Loader2 className="h-3 w-3 animate-spin" />
              ) : (
                <Trash2 className="h-3 w-3" />
              )}
              <span>{removing ? 'Removing...' : 'Remove'}</span>
            </button>
          </div>
        </div>
      ) : (
        <div className="w-full space-y-3 pt-1">
          <label className="w-full py-3 px-4 border-2 border-dashed border-ink rounded-lg bg-cream/50 hover:bg-accent-teal/10 transition-colors flex flex-col items-center justify-center cursor-pointer text-center group">
            <Upload className="h-6 w-6 text-accent-teal group-hover:scale-110 transition-transform mb-1" />
            <span className="text-xs font-bold font-display uppercase text-ink">
              {uploading ? 'Uploading Resume...' : 'Upload Resume File'}
            </span>
            <span className="text-[9px] font-mono text-ink/60 uppercase mt-0.5">
              Click to browse PDF, DOC, or DOCX
            </span>
            <input
              type="file"
              accept=".pdf,.doc,.docx"
              onChange={handleFileChange}
              disabled={uploading || removing}
              className="hidden"
            />
          </label>
        </div>
      )}

      {uploading && (
        <div className="flex items-center space-x-1.5 text-[10px] font-mono text-accent-teal font-bold pt-1">
          <Loader2 className="h-3 w-3 animate-spin" />
          <span>Uploading resume to Cloudinary...</span>
        </div>
      )}

      {error && (
        <div className="flex items-center space-x-1.5 text-[10px] font-mono text-accent-coral font-bold pt-1">
          <AlertCircle className="h-3.5 w-3.5 flex-shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {success && (
        <div className="flex items-center space-x-1.5 text-[10px] font-mono text-accent-teal font-bold pt-1">
          <CheckCircle2 className="h-3.5 w-3.5 flex-shrink-0" />
          <span>{success}</span>
        </div>
      )}
    </div>
  );
};
