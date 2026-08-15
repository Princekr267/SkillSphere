import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Building, Globe, FileText, MapPin, Hash, ArrowRight, Check, AlertTriangle, Loader2 } from 'lucide-react';
import api from '../utils/api';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';

const INDUSTRIES = [
  'Technology & Software',
  'Design & Creative',
  'Marketing & Advertising',
  'Finance & Accounting',
  'Legal & Compliance',
  'Healthcare & Medical',
  'Education & Training',
  'Construction & Engineering',
  'Retail & E-commerce',
  'Logistics & Supply Chain',
  'Other',
];

export const RegisterCompany: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();

  // Company details
  const [name, setName] = useState('');
  const [industry, setIndustry] = useState('');
  const [description, setDescription] = useState('');
  const [website, setWebsite] = useState('');

  // Registration details
  const [country, setCountry] = useState('');
  const [city, setCity] = useState('');
  const [businessRegNumber, setBusinessRegNumber] = useState('');
  const [taxId, setTaxId] = useState('');

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [submitted, setSubmitted] = useState(false);
  const [createdCompanyId, setCreatedCompanyId] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!name.trim() || !industry || !country.trim() || !city.trim()) {
      setError('Company name, industry, country, and city are required.');
      return;
    }

    setLoading(true);
    try {
      const res = await api.post('/companies/register', {
        name: name.trim(),
        industry,
        description: description.trim(),
        website: website.trim(),
        registrationDetails: {
          businessRegistrationNumber: businessRegNumber.trim(),
          taxId: taxId.trim(),
          country: country.trim(),
          city: city.trim(),
        },
      });

      if (res.data.success) {
        setCreatedCompanyId(res.data.company._id);
        setSubmitted(true);
      }
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to submit company application.');
    } finally {
      setLoading(false);
    }
  };

  // ── Success / Pending state ───────────────────────────────────────────────
  if (submitted && createdCompanyId) {
    return (
      <div className="flex-grow flex items-center justify-center px-4 py-16 bg-cream transition-colors duration-200">
        <Card className="w-full max-w-md p-8 text-center space-y-6 animate-slide-up">
          <div className="h-16 w-16 rounded-full bg-accent-amber/20 border-2 border-ink flex items-center justify-center mx-auto">
            <Check className="h-8 w-8 text-ink" />
          </div>
          <div>
            <h2 className="text-xl font-display font-black text-ink uppercase tracking-tight">Application Submitted</h2>
            <p className="text-xs text-ink/60 font-sans mt-2 leading-relaxed">
              Your company application has been submitted and is currently <strong>pending review</strong> by the SkillSphere team.
              You'll receive a notification once it's been reviewed.
            </p>
          </div>
          <div className="p-4 bg-accent-amber/10 border-2 border-ink rounded-lg text-xs font-sans text-ink/70 text-left space-y-1">
            <p className="font-bold font-display uppercase text-[10px] text-ink/50 tracking-widest mb-2">What's next?</p>
            <p>• Our team will review your application (typically within 24–48 hours)</p>
            <p>• You'll get an in-app notification and email when approved</p>
            <p>• Once approved, you'll get an invite key to add team members</p>
          </div>
          <div className="flex flex-col sm:flex-row gap-3 pt-2">
            <Button
              variant="outline"
              className="w-full"
              onClick={() => navigate(`/company/${createdCompanyId}`)}
            >
              View Company Status
            </Button>
            <Button
              variant="coral"
              className="w-full"
              onClick={() => navigate('/client-dashboard')}
            >
              Back to Dashboard
            </Button>
          </div>
        </Card>
      </div>
    );
  }

  return (
    <div className="flex-grow flex items-center justify-center px-4 sm:px-12 py-16 bg-cream transition-colors duration-200">
      <Card className="w-full max-w-xl p-8 animate-slide-up">

        {/* Header */}
        <div className="mb-8 text-left">
          <div className="flex items-center space-x-3 mb-3">
            <div className="h-9 w-9 bg-accent-teal border-2 border-ink flex items-center justify-center rounded-lg shadow-retro-sm">
              <Building className="h-4.5 w-4.5 text-ink" />
            </div>
            <div>
              <p className="text-[10px] font-mono text-ink/60 uppercase tracking-widest">New Application</p>
              <h1 className="text-xl font-display font-black text-ink uppercase tracking-tight">Register Company</h1>
            </div>
          </div>
          <p className="text-xs text-ink/60 font-sans leading-relaxed">
            Submit your company for verification. Once approved, you'll be able to invite team members and view company-wide gigs.
          </p>
        </div>

        {/* Error banner */}
        {error && (
          <div className="mb-6 p-4 bg-cream border-2 border-ink border-l-4 border-l-accent-coral flex items-start space-x-3 text-ink text-xs font-sans rounded-lg">
            <AlertTriangle className="h-4 w-4 text-accent-coral flex-shrink-0 mt-0.5" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-5">

          {/* ── Section: Company Info ── */}
          <div>
            <p className="text-[10px] font-bold font-display text-ink/50 uppercase tracking-widest mb-3">Company Information</p>
            <div className="space-y-4">

              <div className="space-y-1.5">
                <label className="text-[10px] font-bold font-display text-ink uppercase tracking-widest block pl-1">
                  Company Name <span className="text-accent-coral">*</span>
                </label>
                <div className="relative">
                  <Building className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-ink/50 z-10" />
                  <Input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="e.g. Acme Corporation"
                    className="pl-10"
                    required
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-[10px] font-bold font-display text-ink uppercase tracking-widest block pl-1">
                  Industry <span className="text-accent-coral">*</span>
                </label>
                <select
                  value={industry}
                  onChange={(e) => setIndustry(e.target.value)}
                  className="w-full px-4 py-2.5 bg-cream border-2 border-ink rounded-lg text-ink text-sm focus:outline-none focus:border-accent-amber"
                  required
                >
                  <option value="">Select an industry…</option>
                  {INDUSTRIES.map((ind) => (
                    <option key={ind} value={ind}>{ind}</option>
                  ))}
                </select>
              </div>

              <div className="space-y-1.5">
                <label className="text-[10px] font-bold font-display text-ink uppercase tracking-widest block pl-1">
                  Description
                </label>
                <div className="relative">
                  <FileText className="absolute left-3.5 top-3.5 h-4 w-4 text-ink/50 z-10" />
                  <textarea
                    rows={3}
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="Brief description of your company (optional)…"
                    className="w-full pl-10 pr-4 py-2.5 bg-cream border-2 border-ink rounded-lg text-ink text-sm resize-none focus:outline-none focus:border-accent-amber placeholder:text-ink/40"
                    maxLength={1000}
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-[10px] font-bold font-display text-ink uppercase tracking-widest block pl-1">
                  Website
                </label>
                <div className="relative">
                  <Globe className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-ink/50 z-10" />
                  <Input
                    type="url"
                    value={website}
                    onChange={(e) => setWebsite(e.target.value)}
                    placeholder="https://yourcompany.com"
                    className="pl-10"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Divider */}
          <div className="flex items-center my-2">
            <div className="flex-grow border-t-2 border-ink/10" />
            <span className="px-3 text-[9px] text-ink/50 font-bold uppercase tracking-widest">Registration Details</span>
            <div className="flex-grow border-t-2 border-ink/10" />
          </div>

          {/* ── Section: Registration Details ── */}
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold font-display text-ink uppercase tracking-widest block pl-1">
                  Country <span className="text-accent-coral">*</span>
                </label>
                <div className="relative">
                  <MapPin className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-ink/50 z-10" />
                  <Input
                    type="text"
                    value={country}
                    onChange={(e) => setCountry(e.target.value)}
                    placeholder="e.g. India"
                    className="pl-10"
                    required
                  />
                </div>
              </div>
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold font-display text-ink uppercase tracking-widest block pl-1">
                  City <span className="text-accent-coral">*</span>
                </label>
                <div className="relative">
                  <MapPin className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-ink/50 z-10" />
                  <Input
                    type="text"
                    value={city}
                    onChange={(e) => setCity(e.target.value)}
                    placeholder="e.g. Mumbai"
                    className="pl-10"
                    required
                  />
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold font-display text-ink uppercase tracking-widest block pl-1">
                  Business Reg. No.
                </label>
                <div className="relative">
                  <Hash className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-ink/50 z-10" />
                  <Input
                    type="text"
                    value={businessRegNumber}
                    onChange={(e) => setBusinessRegNumber(e.target.value)}
                    placeholder="CIN / Reg. Number"
                    className="pl-10"
                  />
                </div>
              </div>
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold font-display text-ink uppercase tracking-widest block pl-1">
                  Tax ID / GSTIN
                </label>
                <div className="relative">
                  <Hash className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-ink/50 z-10" />
                  <Input
                    type="text"
                    value={taxId}
                    onChange={(e) => setTaxId(e.target.value)}
                    placeholder="GSTIN / VAT / EIN"
                    className="pl-10"
                  />
                </div>
              </div>
            </div>
          </div>

          <Button
            type="submit"
            variant="coral"
            className="w-full py-3 mt-2"
            disabled={loading}
          >
            {loading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <>
                <span>Submit Application</span>
                <ArrowRight className="h-3.5 w-3.5 ml-1" />
              </>
            )}
          </Button>
        </form>
      </Card>
    </div>
  );
};
