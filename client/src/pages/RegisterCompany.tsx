import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Building, Globe, FileText, MapPin, Hash, ArrowRight, AlertTriangle, Loader2 } from 'lucide-react';
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!name.trim() || !industry || !country.trim() || !city.trim()) {
      setError('Company name, industry, country, and city are required.');
      return;
    }

    const normalizedWebsite = website.trim()
      ? (/^https?:\/\//i.test(website.trim()) ? website.trim() : `https://${website.trim()}`)
      : undefined;

    setLoading(true);
    try {
      const res = await api.post('/companies/register', {
        name: name.trim(),
        industry,
        description: description.trim(),
        website: normalizedWebsite,
        registrationDetails: {
          businessRegistrationNumber: businessRegNumber.trim(),
          taxId: taxId.trim(),
          country: country.trim(),
          city: city.trim(),
        },
      });

      if (res.data.success) {
        // Instant access model: navigate straight to the new company's dashboard
        navigate(`/company/${res.data.company._id}`);
      }
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to register company.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex-grow flex items-center justify-center px-2.5 sm:px-12 py-8 sm:py-16 bg-cream transition-colors duration-200 min-w-0">
      <Card variant="teal" className="w-full max-w-xl p-4 sm:p-8 animate-slide-up space-y-5 min-w-0">

        {/* Header */}
        <div className="bg-cream border-2 border-ink rounded-xl p-4 sm:p-5 shadow-retro-sm text-left min-w-0">
          <div className="flex items-center space-x-3 mb-2 min-w-0">
            <div className="h-9 w-9 bg-accent-teal border-2 border-ink flex items-center justify-center rounded-lg shadow-retro-sm flex-shrink-0">
              <Building className="h-4.5 w-4.5 text-ink" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-[10px] font-mono text-ink/60 uppercase tracking-widest font-bold truncate">New Organization</p>
              <h1 className="text-lg sm:text-xl font-display font-black text-ink uppercase tracking-tight truncate">Register Company</h1>
            </div>
          </div>
          <p className="text-xs text-ink/65 font-sans leading-relaxed font-medium">
            Register your company to collaborate with team members, manage organization gigs, and share an invite key.
          </p>
        </div>

        {/* Error banner */}
        {error && (
          <div className="p-4 bg-cream border-2 border-ink border-l-4 border-l-accent-coral flex items-start space-x-3 text-ink text-xs font-sans rounded-lg">
            <AlertTriangle className="h-4 w-4 text-accent-coral flex-shrink-0 mt-0.5" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="bg-cream border-2 border-ink rounded-xl p-6 shadow-retro-sm space-y-5">

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
                <span>Register & Open Dashboard</span>
                <ArrowRight className="h-3.5 w-3.5 ml-1" />
              </>
            )}
          </Button>
        </form>
      </Card>
    </div>
  );
};
