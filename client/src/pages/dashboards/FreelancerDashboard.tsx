import React, { useState, useRef, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { 
  Briefcase, 
  MapPin, 
  Edit, 
  FileText, 
  Check, 
  AlertCircle, 
  Compass, 
  Search, 
  Plus, 
  Trash2, 
  Upload, 
  DollarSign, 
  Award,
  Link as LinkIcon,
  Loader2,
  Calendar,
  Clock,
  Building,
  Mail
} from 'lucide-react';
import axios from 'axios';
import api from '../../utils/api';
import { FreelancerApplications } from './FreelancerApplications';
import { AvatarUpload } from '../../components/AvatarUpload';
import { TwoFactorSetup } from '../../components/TwoFactorSetup';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Badge } from '../../components/ui/Badge';

type Tab = 'profile' | 'applications' | 'analytics' | 'bookings';

interface CitySuggestion {
  display_name: string;
  lat: string;
  lon: string;
}

// Freelancer dashboard screen styled in Retro-pop bold designs
export const FreelancerDashboard: React.FC = () => {
  const { user, updateProfile, uploadResumeFile, updateUser } = useAuth();
  
  // View states
  const [isEditing, setIsEditing] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [activeTab, setActiveTab] = useState<Tab>('profile');

  // Core details states
  const [name, setName] = useState(user?.name || '');
  const [city, setCity] = useState(user?.location.city || '');
  const [latitude, setLatitude] = useState<number | null>(user?.location.coordinates[1] || null);
  const [longitude, setLongitude] = useState<number | null>(user?.location.coordinates[0] || null);
  const [hourlyRate, setHourlyRate] = useState<number>(user?.hourlyRate || 0);

  // Lists state
  const [skills, setSkills] = useState(user?.skills || []);
  const [portfolio, setPortfolio] = useState(user?.portfolio || []);
  const [certifications, setCertifications] = useState(user?.certifications || []);
  const [experience, setExperience] = useState<any[]>(user?.experience || []);

  // Temporary inputs states
  const [newSkillName, setNewSkillName] = useState('');
  const [newSkillLevel, setNewSkillLevel] = useState<'Beginner' | 'Intermediate' | 'Expert'>('Intermediate');
  const [newCertName, setNewCertName] = useState('');
  
  // Temporary experience states
  const [expTitle, setExpTitle] = useState('');
  const [expCompany, setExpCompany] = useState('');
  const [expStart, setExpStart] = useState('');
  const [expEnd, setExpEnd] = useState('');
  const [expDesc, setExpDesc] = useState('');

  // Portfolio dialog inputs
  const [portTitle, setPortTitle] = useState('');
  const [portDesc, setPortDesc] = useState('');
  const [portLink, setPortLink] = useState('');

  // Address search states
  const [citySearch, setCitySearch] = useState(user?.location.city || '');
  const [suggestions, setSuggestions] = useState<CitySuggestion[]>([]);
  const [searchingCity, setSearchingCity] = useState(false);
  const [fetchingGeo, setFetchingGeo] = useState(false);

  // Action states
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [removingResume, setRemovingResume] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Calendar bookings states
  const [bookings, setBookings] = useState<any[]>([]);
  const [bookingsLoading, setBookingsLoading] = useState(false);

  // Analytics states
  const [analytics, setAnalytics] = useState<any>(null);
  const [analyticsLoading, setAnalyticsLoading] = useState(false);

  const loadBookings = async () => {
    setBookingsLoading(true);
    try {
      const res = await api.get('/bookings');
      if (res.data.success) {
        setBookings(res.data.bookings);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setBookingsLoading(false);
    }
  };

  const [trendingSkills, setTrendingSkills] = useState<any[]>([]);
  const [trendingLoading, setTrendingLoading] = useState(false);

  const loadTrendingSkills = async () => {
    setTrendingLoading(true);
    try {
      const res = await api.get('/ai/trending-skills');
      if (res.data.success) {
        setTrendingSkills(res.data.trending);
      }
    } catch (err) {
      console.error('Error fetching trending skills:', err);
    } finally {
      setTrendingLoading(false);
    }
  };

  const loadAnalytics = async () => {
    setAnalyticsLoading(true);
    try {
      const res = await api.get('/users/profile/analytics');
      if (res.data.success) {
        setAnalytics(res.data.analytics);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setAnalyticsLoading(false);
    }
  };

  useEffect(() => {
    if (activeTab === 'bookings') {
      loadBookings();
    } else if (activeTab === 'analytics') {
      loadAnalytics();
      loadTrendingSkills();
    }
  }, [activeTab]);

  if (!user) return null;

  // Search cities using OSM
  const handleCitySearchChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setCitySearch(val);

    if (val.length < 3) {
      setSuggestions([]);
      return;
    }

    setSearchingCity(true);
    try {
      const res = await axios.get(
        `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(val)}&limit=5`
      );
      setSuggestions(res.data);
    } catch (err) {
      console.error(err);
    } finally {
      setSearchingCity(false);
    }
  };

  // Select a suggestion
  const handleSelectCity = (suggestion: CitySuggestion) => {
    setCity(suggestion.display_name.split(',')[0]);
    setCitySearch(suggestion.display_name);
    setLatitude(parseFloat(suggestion.lat));
    setLongitude(parseFloat(suggestion.lon));
    setSuggestions([]);
  };

  // Geolocation lookup
  const handleDetectLocation = () => {
    setFetchingGeo(true);
    setMessage(null);
    if (!navigator.geolocation) {
      setMessage({ type: 'error', text: 'Geolocation is not supported.' });
      setFetchingGeo(false);
      return;
    }

    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const { latitude: lat, longitude: lng } = position.coords;
        setLatitude(lat);
        setLongitude(lng);

        try {
          const res = await axios.get(
            `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}`
          );
          const cityName = res.data.address.city || res.data.address.town || 'My Location';
          setCity(cityName);
          setCitySearch(cityName);
        } catch (err) {
          setCity(`Detected Coordinate`);
        } finally {
          setFetchingGeo(false);
        }
      },
      (err) => {
        setMessage({ type: 'error', text: 'Could not access geolocation. Search manually.' });
        setFetchingGeo(false);
      }
    );
  };

  const handleBookingResponse = async (bookingId: string, status: 'confirmed' | 'cancelled') => {
    try {
      const res = await api.put(`/bookings/${bookingId}/status`, { status });
      if (res.data.success) {
        setMessage({ type: 'success', text: `Appointment ${status} successfully.` });
        loadBookings();
      }
    } catch (err: any) {
      setMessage({ type: 'error', text: err.response?.data?.message || 'Action failed.' });
    }
  };

  // Helper to save lists to backend
  const saveLists = async (
    updatedSkills = skills,
    updatedPortfolio = portfolio,
    updatedCerts = certifications,
    updatedExp = experience
  ) => {
    try {
      const res = await api.put('/users/profile', {
        skills: updatedSkills,
        portfolio: updatedPortfolio,
        certifications: updatedCerts,
        experience: updatedExp,
      });
      if (res.data.success) {
        updateUser(res.data.user);
      }
    } catch (err: any) {
      setMessage({ type: 'error', text: err.response?.data?.message || 'Failed to update credentials details.' });
    }
  };

  // Add Skill
  const handleAddSkill = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newSkillName.trim()) return;

    const exists = skills.some((s) => s.name.toLowerCase() === newSkillName.trim().toLowerCase());
    if (exists) {
      setMessage({ type: 'error', text: 'Skill already registered.' });
      return;
    }

    const updated = [...skills, { name: newSkillName.trim(), level: newSkillLevel }];
    setSkills(updated);
    setNewSkillName('');
    saveLists(updated);
  };

  // Delete Skill
  const handleDeleteSkill = (index: number) => {
    const updated = skills.filter((_, idx) => idx !== index);
    setSkills(updated);
    saveLists(updated);
  };

  // Add Certification
  const handleAddCert = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCertName.trim()) return;

    const updated = [...certifications, newCertName.trim()];
    setCertifications(updated);
    setNewCertName('');
    saveLists(skills, portfolio, updated);
  };

  // Delete Certification
  const handleDeleteCert = (index: number) => {
    const updated = certifications.filter((_, idx) => idx !== index);
    setCertifications(updated);
    saveLists(skills, portfolio, updated);
  };

  // Add Experience
  const handleAddExperience = (e: React.FormEvent) => {
    e.preventDefault();
    if (!expTitle.trim() || !expCompany.trim() || !expStart.trim()) return;

    const newExp = {
      title: expTitle.trim(),
      company: expCompany.trim(),
      startDate: expStart.trim(),
      endDate: expEnd.trim() || 'Present',
      description: expDesc.trim(),
    };

    const updated = [...experience, newExp];
    setExperience(updated);
    setExpTitle('');
    setExpCompany('');
    setExpStart('');
    setExpEnd('');
    setExpDesc('');
    saveLists(skills, portfolio, certifications, updated);
  };

  // Delete Experience
  const handleDeleteExperience = (index: number) => {
    const updated = experience.filter((_, idx) => idx !== index);
    setExperience(updated);
    saveLists(skills, portfolio, certifications, updated);
  };

  // Add Portfolio Item
  const handleAddPortfolio = (e: React.FormEvent) => {
    e.preventDefault();
    if (!portTitle.trim() || !portDesc.trim()) return;

    const updated = [...portfolio, { title: portTitle.trim(), description: portDesc.trim(), link: portLink.trim() }];
    setPortfolio(updated);
    setPortTitle('');
    setPortDesc('');
    setPortLink('');
    saveLists(skills, updated);
  };

  // Delete Portfolio Item
  const handleDeletePortfolio = (index: number) => {
    const updated = portfolio.filter((_, idx) => idx !== index);
    setPortfolio(updated);
    saveLists(skills, updated);
  };

  // File Upload
  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setMessage(null);
    setUploading(true);

    try {
      await uploadResumeFile(file);
      setMessage({ type: 'success', text: `Resume uploaded successfully!` });
    } catch (err: any) {
      setMessage({ type: 'error', text: err.message || 'File upload failed.' });
    } finally {
      setUploading(false);
    }
  };

  const handleRemoveResume = async () => {
    if (!window.confirm('Are you sure you want to remove your resume document?')) return;
    setMessage(null);
    setRemovingResume(true);
    try {
      const res = await api.delete('/users/resume');
      if (res.data.success) {
        updateUser(res.data.user);
        setMessage({ type: 'success', text: 'Resume file removed successfully.' });
      }
    } catch (err: any) {
      setMessage({ type: 'error', text: err.response?.data?.message || 'Failed to remove resume.' });
    } finally {
      setRemovingResume(false);
    }
  };

  // Save General profile settings
  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setMessage(null);
    setSaving(true);

    try {
      await updateProfile({
        name,
        city,
        latitude,
        longitude,
        hourlyRate: Number(hourlyRate)
      });
      setMessage({ type: 'success', text: 'General settings updated successfully!' });
      setIsEditing(false);
    } catch (err: any) {
      setMessage({ type: 'error', text: err.message || 'Failed to update profile.' });
    } finally {
      setSaving(false);
    }
  };

  const [resendingEmail, setResendingEmail] = useState(false);

  const handleResendVerification = async () => {
    setResendingEmail(true);
    setMessage(null);
    try {
      const res = await api.post('/auth/resend-verification');
      setMessage({ type: 'success', text: res.data.message || 'Fresh verification link generated!' });
    } catch (err: any) {
      setMessage({ type: 'error', text: err.response?.data?.message || 'Failed to resend verification email.' });
    } finally {
      setResendingEmail(false);
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 flex-grow bg-cream font-sans transition-colors duration-200">
      
      {/* Unverified Email Alert Banner */}
      {user && !user.isVerified && (
        <div className="mb-6 p-4 bg-cream border-2 border-ink border-l-4 border-l-accent-amber rounded-lg flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 text-left">
          <div className="flex items-start space-x-3 text-xs text-ink font-sans">
            <AlertCircle className="h-5 w-5 text-accent-amber flex-shrink-0 mt-0.5" />
            <div>
              <p className="font-bold font-display uppercase tracking-wider text-ink">Account Email Unverified</p>
              <p className="text-ink/70 text-[11px] mt-0.5">Please verify your email address to unlock submitting proposals for client gigs.</p>
            </div>
          </div>
          <Button
            type="button"
            onClick={handleResendVerification}
            disabled={resendingEmail}
            variant="primary"
            size="sm"
            className="flex-shrink-0"
          >
            {resendingEmail ? 'Sending Link...' : 'Resend Verification Email'}
          </Button>
        </div>
      )}

      {/* Dashboard Title + Tab Switcher */}
      <div className="mb-8 border-b-2 border-ink pb-0 flex items-end justify-between">
        <div className="pb-6 text-left">
          <span className="text-[10px] font-mono text-ink/60 uppercase tracking-widest block mb-1">Provider Node Workspace</span>
          <h1 className="text-2xl font-display font-black text-ink uppercase tracking-tight">Freelancer Dashboard</h1>
        </div>
        <div className="flex items-end space-x-2">
          {(['profile', 'applications', 'bookings', 'analytics'] as Tab[]).map(tab => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-4 py-2.5 text-xs font-bold font-display uppercase tracking-wider border-2 border-b-0 border-ink transition-all cursor-pointer ${
                activeTab === tab
                  ? 'bg-accent-teal text-ink shadow-none translate-y-[2px]'
                  : 'bg-cream text-ink hover:bg-accent-teal/10'
              }`}
              style={{ borderBottomLeftRadius: 0, borderBottomRightRadius: 0, borderTopLeftRadius: 8, borderTopRightRadius: 8 }}
            >
              {tab === 'profile' ? 'My Profile' : tab === 'applications' ? 'Applications' : tab === 'bookings' ? 'Calendar' : 'Analytics'}
            </button>
          ))}
        </div>
      </div>

      {/* Tab content */}
      {activeTab === 'bookings' ? (
        <Card>
          <h2 className="text-sm font-bold font-display text-ink uppercase tracking-wider mb-6 flex items-center space-x-2">
            <Calendar className="h-5 w-5 text-accent-teal" />
            <span>Calendar Appointments & Bookings</span>
          </h2>

          {message && (
            <div className={`mb-6 p-4 border-2 border-ink flex items-center space-x-3 text-xs rounded-lg ${
              message.type === 'success' 
                ? 'bg-cream border-l-4 border-l-accent-teal text-ink' 
                : 'bg-cream border-l-4 border-l-accent-coral text-ink'
            }`}>
              {message.type === 'success' ? <Check className="h-4.5 w-4.5 text-accent-teal flex-shrink-0" /> : <AlertCircle className="h-4.5 w-4.5 text-accent-coral flex-shrink-0" />}
              <span className="text-left">{message.text}</span>
            </div>
          )}

          {bookingsLoading ? (
            <div className="flex justify-center py-10">
              <Loader2 className="h-6 w-6 text-accent-teal animate-spin" />
            </div>
          ) : bookings.length === 0 ? (
            <p className="text-xs text-ink/60 font-sans italic text-left">No scheduled appointments logged in your calendar node.</p>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {bookings.map(b => (
                <Card key={b._id} className="p-5 shadow-retro-sm text-left">
                  <div className="space-y-4">
                    {/* Header: Gig Title & Status */}
                    <div className="flex items-start justify-between border-b-2 border-ink/10 pb-3 gap-2">
                      <div>
                        <span className="text-[9px] font-mono text-ink/60 uppercase tracking-widest block font-bold">Appointment for Gig</span>
                        <Link to={`/gigs/${b.gigId?._id}`} className="font-black text-ink text-sm font-display uppercase tracking-tight hover:text-accent-teal transition-colors line-clamp-1">
                          {b.gigId?.title || 'Active Gig Project'}
                        </Link>
                        {b.gigId?.budget && (
                          <div className="flex items-center space-x-2 mt-1">
                            <Badge variant="amber" className="text-[8px] shadow-none">
                              ₹{b.gigId.budget}
                            </Badge>
                            {b.gigId.category && (
                              <span className="text-[9px] font-mono text-ink/60 uppercase font-bold">
                                {b.gigId.category}
                              </span>
                            )}
                          </div>
                        )}
                      </div>
                      <Badge variant={b.status === 'confirmed' ? 'teal' : b.status === 'cancelled' ? 'coral' : 'amber'} className="shadow-none flex-shrink-0">
                        {b.status === 'confirmed' ? 'CONFIRMED' : b.status === 'cancelled' ? 'REJECTED' : 'PENDING'}
                      </Badge>
                    </div>

                    {/* Client & Company Information */}
                    <div className="bg-cream/60 border-2 border-ink p-3 rounded-lg space-y-2 font-sans text-xs">
                      <div className="flex items-center space-x-3">
                        <div className="h-9 w-9 bg-cream border-2 border-ink rounded-full overflow-hidden flex items-center justify-center font-bold text-ink font-display flex-shrink-0">
                          {b.clientId?.avatar ? (
                            <img src={b.clientId.avatar} alt={b.clientId.name} className="h-full w-full object-cover" />
                          ) : (
                            b.clientId?.name?.charAt(0) || 'C'
                          )}
                        </div>
                        <div>
                          <p className="font-bold text-ink font-display uppercase text-xs">
                            {b.clientId?.name || 'Client Node'}
                          </p>
                          {b.clientId?.companyName && (
                            <p className="text-[10px] text-ink/75 font-mono flex items-center space-x-1 font-bold">
                              <Building className="h-3 w-3 text-accent-teal" />
                              <span>{b.clientId.companyName}</span>
                            </p>
                          )}
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-2 pt-1 border-t border-ink/10 text-[10px] font-mono text-ink/70">
                        {b.clientId?.location?.city && (
                          <div className="flex items-center space-x-1">
                            <MapPin className="h-3 w-3 text-accent-teal flex-shrink-0" />
                            <span className="font-bold">{b.clientId.location.city}</span>
                          </div>
                        )}
                        {b.clientId?.email && (
                          <div className="flex items-center space-x-1 truncate">
                            <Mail className="h-3 w-3 text-accent-teal flex-shrink-0" />
                            <span className="font-bold truncate">{b.clientId.email}</span>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Slot Date & Time */}
                    <div className="flex items-center justify-between bg-cream border border-ink/20 p-2.5 rounded-lg text-xs font-mono">
                      <div className="flex items-center space-x-1.5 text-ink">
                        <Calendar className="h-3.5 w-3.5 text-accent-teal" />
                        <span className="font-bold">{new Date(b.date).toLocaleDateString('en-IN', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' })}</span>
                      </div>
                      <div className="flex items-center space-x-1.5 text-ink">
                        <Clock className="h-3.5 w-3.5 text-accent-teal" />
                        <span className="font-bold">{b.startTime || b.slot} - {b.endTime || 'End'}</span>
                      </div>
                    </div>

                    {/* Action Buttons for Pending Requests */}
                    {b.status === 'pending' && (
                      <div className="flex space-x-2 pt-1">
                        <Button
                          onClick={() => handleBookingResponse(b._id, 'confirmed')}
                          variant="secondary"
                          size="sm"
                          className="flex-1 py-1.5 text-[10px]"
                        >
                          Accept Appointment
                        </Button>
                        <Button
                          onClick={() => handleBookingResponse(b._id, 'cancelled')}
                          variant="coral"
                          size="sm"
                          className="flex-1 py-1.5 text-[10px]"
                        >
                          Decline Request
                        </Button>
                      </div>
                    )}
                  </div>
                </Card>
              ))}
            </div>
          )}
        </Card>
      ) : activeTab === 'applications' ? (
        <FreelancerApplications />
      ) : activeTab === 'analytics' ? (
        <Card>
          <h2 className="text-sm font-bold font-display text-ink uppercase tracking-wider mb-6 flex items-center space-x-2">
            <Award className="h-5 w-5 text-accent-teal" />
            <span>Earnings & Profile Performance Analytics</span>
          </h2>

          {analyticsLoading ? (
            <div className="flex justify-center py-10">
              <Loader2 className="h-6 w-6 text-accent-teal animate-spin" />
            </div>
          ) : !analytics ? (
            <p className="text-xs text-ink/60 italic text-left">Could not load analytics summary dashboard details.</p>
          ) : (
            <div className="space-y-8">
              
              {/* Stat Cards */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                
                <Card className="p-4 shadow-retro-sm">
                  <span className="text-[9px] font-mono font-bold text-ink/60 uppercase tracking-wider block mb-1">Total Earnings</span>
                  <span className="text-lg font-black text-ink font-display uppercase tracking-tight">₹{analytics.totalEarnings.toLocaleString()}</span>
                </Card>

                <Card className="p-4 shadow-retro-sm">
                  <span className="text-[9px] font-mono font-bold text-ink/60 uppercase tracking-wider block mb-1">Profile views</span>
                  <span className="text-lg font-black text-ink font-display uppercase tracking-tight">{analytics.profileViews}</span>
                </Card>

                <Card className="p-4 shadow-retro-sm">
                  <span className="text-[9px] font-mono font-bold text-ink/60 uppercase tracking-wider block mb-1">Submissions</span>
                  <span className="text-lg font-black text-ink font-display uppercase tracking-tight">{analytics.applicationCount}</span>
                </Card>

                <Card className="p-4 shadow-retro-sm">
                  <span className="text-[9px] font-mono font-bold text-ink/60 uppercase tracking-wider block mb-1">Feedback Score</span>
                  <span className="text-lg font-black text-ink font-display uppercase tracking-tight">{analytics.rating.toFixed(1)} ★</span>
                  <span className="text-[9px] font-mono text-ink/60 block">({analytics.reviewCount} reviews)</span>
                </Card>

              </div>

              {/* HTML/CSS Bar Chart */}
              <Card className="p-6">
                <span className="text-[10px] font-mono font-bold text-ink/60 uppercase tracking-widest block mb-4 text-left">Earnings History By Month</span>
                
                <div className="h-48 flex items-end justify-between gap-2 pt-6 border-b-2 border-ink">
                  {analytics.monthlyEarnings.map((val: number, idx: number) => {
                    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
                    const maxVal = Math.max(...analytics.monthlyEarnings, 1000);
                    const percentage = (val / maxVal) * 100;
                    const accentColors = ['bg-accent-amber', 'bg-accent-teal', 'bg-accent-coral', 'bg-accent-pink'];
                    const barColor = accentColors[idx % accentColors.length];
                    
                    return (
                      <div key={idx} className="flex-grow flex flex-col items-center group relative">
                        {/* Tooltip value */}
                        <div className="absolute bottom-full mb-2 bg-cream border-2 border-ink px-1.5 py-0.5 rounded-lg text-[8px] font-mono font-bold opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap z-10 shadow-retro-sm">
                          ₹{val.toLocaleString()}
                        </div>
                        {/* Bar */}
                        <div
                          className={`w-full ${barColor} hover:opacity-90 border-2 border-ink border-b-0 transition-all duration-500 rounded-t-md`}
                          style={{ height: `${Math.max(4, percentage)}%` }}
                        />
                        {/* Label */}
                        <span className="text-[8px] font-mono font-bold text-ink mt-2 uppercase tracking-tighter">
                          {months[idx]}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </Card>

              {/* Trending Skills Matrix */}
              <Card className="p-6 text-left">
                <span className="text-[10px] font-mono font-bold text-ink/60 uppercase tracking-widest block mb-4">
                  Marketplace Trending Skills (AI Aggregated)
                </span>

                {trendingLoading ? (
                  <div className="flex justify-center py-6">
                    <Loader2 className="h-5 w-5 text-accent-teal animate-spin" />
                  </div>
                ) : trendingSkills.length === 0 ? (
                  <p className="text-xs text-ink/60 font-sans italic">No trending skills detected in recent gigs yet.</p>
                ) : (
                  <div className="flex flex-wrap gap-2.5">
                    {trendingSkills.map((ts, idx) => (
                      <span
                        key={idx}
                        className="inline-flex items-center space-x-2.5 px-3 py-2 border-2 border-ink bg-cream rounded-lg shadow-retro-sm"
                      >
                        <span className="text-xs font-bold text-ink font-sans">{ts.name}</span>
                        <Badge variant="teal" className="shadow-none text-[8px] font-mono">
                          {ts.count} Gigs
                        </Badge>
                      </span>
                    ))}
                  </div>
                )}
              </Card>

            </div>
          )}
        </Card>
      ) : (
        <>

      {/* Alert Banner */}
      {message && (
        <div className={`mb-6 p-4 border-2 border-ink flex items-center space-x-3 text-xs rounded-lg ${
          message.type === 'success' 
            ? 'bg-cream border-l-4 border-l-accent-teal text-ink' 
            : 'bg-cream border-l-4 border-l-accent-coral text-ink'
        }`}>
          {message.type === 'success' ? <Check className="h-4.5 w-4.5 text-accent-teal flex-shrink-0" /> : <AlertCircle className="h-4.5 w-4.5 text-accent-coral flex-shrink-0" />}
          <span className="text-left">{message.text}</span>
        </div>
      )}

      {/* Main Layout Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Left Column: Profile Card & Resume Uploader */}
        <div className="space-y-8 lg:col-span-1">
          
          {/* Card 1: Avatar and main stats */}
          <Card className="flex flex-col items-start text-left">
            <div className="h-16 w-16 bg-cream border-2 border-ink flex items-center justify-center text-ink text-2xl font-black font-display uppercase mb-4 rounded-lg overflow-hidden flex-shrink-0 shadow-retro-sm">
              {user.avatar ? (
                <img src={user.avatar} alt={user.name} className="h-full w-full object-cover" />
              ) : (
                user.name.charAt(0)
              )}
            </div>
            <h2 className="text-lg font-bold text-ink uppercase font-display tracking-tight">{user.name}</h2>
            <Badge variant="outline" className="mt-1 shadow-none">
              Freelancer Account
            </Badge>
            
            <div className="w-full border-t-2 border-ink my-6 pt-6 space-y-4 font-mono text-xs text-ink/70">
              <div className="flex items-center justify-between">
                <span className="flex items-center space-x-2">
                  <DollarSign className="h-4 w-4 text-accent-teal" />
                  <span>RATE:</span>
                </span>
                <span className="font-bold text-ink text-sm">₹{user.hourlyRate || 0}/HR</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="flex items-center space-x-2">
                  <Mail className="h-4 w-4 text-accent-teal" />
                  <span>EMAIL:</span>
                </span>
                <span className="font-bold text-ink truncate max-w-[170px]" title={user.email}>{user.email}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="flex items-center space-x-2">
                  <MapPin className="h-4 w-4 text-accent-teal" />
                  <span>CITY:</span>
                </span>
                <span className="text-ink font-bold uppercase">{user.location.city}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="flex items-center space-x-2">
                  <Award className="h-4 w-4 text-accent-amber" />
                  <span>RATING:</span>
                </span>
                <span className="font-bold text-ink">{user.rating.toFixed(1)} ★</span>
              </div>
            </div>

            {!isEditing && (
              <>
                <Button
                  onClick={() => setIsEditing(true)}
                  variant="outline"
                  className="w-full mt-4"
                >
                  <Edit className="h-4 w-4 mr-1" />
                  <span>Modify Settings</span>
                </Button>
                
                <div className="w-full mt-4 border-t-2 border-ink pt-4">
                  <AvatarUpload />
                </div>
              </>
            )}
          </Card>


          {/* Card 2: Resume Uploader */}
          <Card className="text-left">
            <h3 className="text-xs font-bold font-display text-ink uppercase tracking-widest mb-4 flex items-center space-x-2 pl-1">
              <FileText className="h-4 w-4 text-accent-teal" />
              <span>Resume Document</span>
            </h3>

            {user.resumeUrl ? (
              <div className="space-y-4">
                <div className="p-3 bg-cream border-2 border-ink text-xs flex items-center justify-between font-mono rounded-lg">
                  <span className="text-ink/60 truncate max-w-[120px]">resume-node.pdf</span>
                  <a
                    href={user.resumeUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-accent-teal hover:underline font-bold"
                  >
                    View File
                  </a>
                </div>
                <div className="border-t-2 border-ink pt-3 flex gap-2">
                  <Button
                    onClick={() => fileInputRef.current?.click()}
                    disabled={uploading || removingResume}
                    variant="outline"
                    className="flex-grow shadow-none py-2"
                  >
                    {uploading ? 'Uploading...' : 'Replace'}
                  </Button>
                  <Button
                    onClick={handleRemoveResume}
                    disabled={uploading || removingResume}
                    variant="coral"
                    className="flex-grow shadow-none py-2"
                  >
                    {removingResume ? 'Removing...' : 'Remove'}
                  </Button>
                </div>
              </div>
            ) : (
              <div className="text-center py-6 border-2 border-dashed border-ink rounded-lg bg-cream/50">
                <Upload className="h-6 w-6 mx-auto text-ink/40 mb-2" />
                <p className="text-[10px] text-ink/60 font-mono uppercase tracking-wider">PDF, JPG, PNG (Max 10MB)</p>
                <Button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={uploading}
                  variant="secondary"
                  className="mt-3 py-2 text-[10px]"
                >
                  {uploading ? 'Uploading...' : 'Upload Resume'}
                </Button>
              </div>
            )}
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleFileChange}
              accept=".pdf,.jpg,.jpeg,.png"
              className="hidden"
            />
          </Card>

          <TwoFactorSetup />

        </div>

        {/* Right Column: Manage dynamic items */}
        <div className="lg:col-span-2 space-y-8">
          
          {/* Dashboard Settings Editor */}
          {isEditing ? (
            <Card>
              <h3 className="text-sm font-bold font-display text-ink uppercase tracking-wider mb-6 pl-1">Modify Settings</h3>
              <form onSubmit={handleSaveProfile} className="space-y-5">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold font-display text-ink uppercase tracking-widest block pl-1">Full Name</label>
                    <Input
                      type="text"
                      required
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold font-display text-ink uppercase tracking-widest block pl-1">Hourly Rate (₹)</label>
                    <Input
                      type="number"
                      required
                      min={0}
                      value={hourlyRate}
                      onChange={(e) => setHourlyRate(Number(e.target.value))}
                      className="font-mono"
                    />
                  </div>
                </div>

                {/* Autocomplete Location Picker */}
                <div className="border-t-2 border-ink pt-4 space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-bold font-display text-ink uppercase tracking-widest block pl-1">Change Coordinates</span>
                    <button
                      type="button"
                      onClick={handleDetectLocation}
                      disabled={fetchingGeo}
                      className="text-xs text-accent-teal hover:underline flex items-center space-x-1 font-bold cursor-pointer"
                    >
                      <Compass className="h-3.5 w-3.5" />
                      <span>{fetchingGeo ? 'GPS Locating...' : 'Use GPS Location'}</span>
                    </button>
                  </div>

                  <div className="relative">
                    <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-ink/50 z-10" />
                    <Input
                      type="text"
                      value={citySearch}
                      onChange={handleCitySearchChange}
                      placeholder="Search city..."
                      className="pl-10"
                    />
                    {searchingCity && (
                      <div className="absolute right-3 top-1/2 -translate-y-1/2">
                        <div className="w-4 h-4 border-2 border-ink/30 border-t-ink rounded-full animate-spin"></div>
                      </div>
                    )}

                    {suggestions.length > 0 && (
                      <div className="absolute z-50 left-0 right-0 top-full mt-1 bg-cream border-2 border-ink rounded-lg shadow-retro max-h-40 overflow-y-auto">
                        {suggestions.map((sug, i) => (
                          <button
                            key={i}
                            type="button"
                            onClick={() => handleSelectCity(sug)}
                            className="w-full text-left px-4 py-2 text-xs text-ink hover:bg-accent-amber/10 border-b border-ink/10 last:border-b-0 cursor-pointer"
                          >
                            {sug.display_name}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>

                  {latitude !== null && longitude !== null && (
                    <div className="text-xs font-mono text-ink/70 bg-cream border-2 border-ink rounded-lg p-2.5">
                      Location Lock: {latitude.toFixed(4)}, {longitude.toFixed(4)} ({city})
                    </div>
                  )}
                </div>

                <div className="flex space-x-3 pt-4 border-t-2 border-ink">
                  <Button
                    type="submit"
                    disabled={saving || !city || latitude === null}
                    variant="coral"
                  >
                    {saving ? 'Saving...' : 'Save Settings'}
                  </Button>
                  <Button
                    type="button"
                    onClick={() => {
                      setIsEditing(false);
                      setMessage(null);
                    }}
                    variant="outline"
                  >
                    Cancel
                  </Button>
                </div>
              </form>
            </Card>
          ) : null}

          {/* Card 3: Skills Manager */}
          <Card>
            <h3 className="text-xs font-bold font-display text-ink uppercase tracking-wider mb-4 pl-1">Skills Management</h3>
            
            {skills.length > 0 ? (
              <div className="flex flex-wrap gap-2 mb-6">
                {skills.map((s, i) => (
                  <span 
                    key={i} 
                    className="inline-flex items-center space-x-2 px-3 py-1.5 border-2 border-ink bg-cream text-xs text-ink rounded-lg shadow-retro-sm"
                  >
                    <span>{s.name}</span>
                    <Badge variant={s.level === 'Expert' ? 'teal' : s.level === 'Intermediate' ? 'amber' : 'outline'} className="shadow-none">
                      {s.level}
                    </Badge>
                    <button
                      onClick={() => handleDeleteSkill(i)}
                      className="text-ink/50 hover:text-accent-coral transition-colors pl-1 cursor-pointer"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </span>
                ))}
              </div>
            ) : (
              <p className="text-xs text-ink/60 mb-6 italic font-sans pl-1">No skills listed inside your node profiles. Add skills to matching algorithms.</p>
            )}

            <form onSubmit={handleAddSkill} className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="sm:col-span-1.5">
                <Input
                  type="text"
                  required
                  value={newSkillName}
                  onChange={(e) => setNewSkillName(e.target.value)}
                  placeholder="Skill name (e.g. React.js)"
                />
              </div>
              <div className="sm:col-span-1">
                <select
                  value={newSkillLevel}
                  onChange={(e) => setNewSkillLevel(e.target.value as any)}
                  className="w-full px-3 py-2.5 bg-cream border-2 border-ink rounded-lg text-ink text-sm focus:outline-none focus:bg-accent-amber/10 focus:border-accent-amber font-sans dark:bg-cream dark:text-ink"
                >
                  <option value="Beginner" className="bg-cream text-ink">Beginner</option>
                  <option value="Intermediate" className="bg-cream text-ink">Intermediate</option>
                  <option value="Expert" className="bg-cream text-ink">Expert</option>
                </select>
              </div>
              <Button
                type="submit"
                variant="secondary"
                className="py-2 px-4 flex items-center justify-center space-x-1.5"
              >
                <Plus className="h-4 w-4" />
                <span>Add Skill</span>
              </Button>
            </form>
          </Card>

          {/* Card 4: Portfolio */}
          <Card>
            <h3 className="text-xs font-bold font-display text-ink uppercase tracking-wider mb-4 pl-1">Portfolio Registry</h3>

            {portfolio.length > 0 ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
                {portfolio.map((item, i) => (
                  <Card key={i} className="p-4 shadow-retro-sm">
                    <div>
                      <div className="flex items-center justify-between mb-1.5">
                        <h4 className="font-bold text-ink text-xs uppercase tracking-tight truncate">{item.title}</h4>
                        <button
                          onClick={() => handleDeletePortfolio(i)}
                          className="text-ink/60 hover:text-accent-coral transition-colors cursor-pointer"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                      <p className="text-xs text-ink/60 line-clamp-3 mb-3 leading-relaxed font-sans">{item.description}</p>
                    </div>
                    {item.link && (
                      <a
                        href={item.link}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center space-x-1 text-xs text-accent-teal hover:underline font-bold"
                      >
                        <LinkIcon className="h-3 w-3" />
                        <span>Visit Project</span>
                      </a>
                    )}
                  </Card>
                ))}
              </div>
            ) : (
              <p className="text-xs text-ink/60 mb-6 italic font-sans pl-1">No portfolio items logged.</p>
            )}

            <form onSubmit={handleAddPortfolio} className="space-y-3.5 border-t-2 border-ink pt-4 font-sans text-left">
              <span className="text-[10px] font-bold font-display text-ink uppercase tracking-widest block pl-1">Add Portfolio Project</span>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <Input
                  type="text"
                  required
                  value={portTitle}
                  onChange={(e) => setPortTitle(e.target.value)}
                  placeholder="Project Title"
                />
                <Input
                  type="url"
                  value={portLink}
                  onChange={(e) => setPortLink(e.target.value)}
                  placeholder="Project Link (Optional)"
                />
              </div>
              <textarea
                required
                rows={2}
                value={portDesc}
                onChange={(e) => setPortDesc(e.target.value)}
                placeholder="Brief description of work parameters..."
                className="w-full px-4 py-2.5 bg-cream border-2 border-ink rounded-lg text-ink text-sm resize-none focus:outline-none focus:bg-accent-amber/10 focus:border-accent-amber font-sans"
              />
              <Button
                type="submit"
                variant="secondary"
                className="w-full py-2.5 flex items-center justify-center space-x-1.5"
              >
                <Plus className="h-4 w-4" />
                <span>Save Project</span>
              </Button>
            </form>
          </Card>

          {/* Card 5: Certifications */}
          <Card>
            <h3 className="text-xs font-bold font-display text-ink uppercase tracking-wider mb-4 pl-1">Certifications & Credentials</h3>

            {certifications.length > 0 ? (
              <div className="space-y-2 mb-6 font-sans">
                {certifications.map((cert, i) => (
                  <div key={i} className="p-3 bg-cream border-2 border-ink text-xs flex items-center justify-between text-ink font-mono rounded-lg">
                    <span className="flex items-center space-x-2">
                      <Award className="h-4 w-4 text-accent-amber flex-shrink-0" />
                      <span>{cert}</span>
                    </span>
                    <button
                      type="button"
                      onClick={() => handleDeleteCert(i)}
                      className="text-ink/60 hover:text-accent-coral transition-colors cursor-pointer"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-xs text-ink/60 mb-6 italic font-sans pl-1">No certifications listed.</p>
            )}

            <form onSubmit={handleAddCert} className="flex gap-2">
              <Input
                type="text"
                required
                value={newCertName}
                onChange={(e) => setNewCertName(e.target.value)}
                placeholder="AWS Developer, Electrician Level II"
              />
              <Button
                type="submit"
                variant="secondary"
                className="flex-shrink-0"
              >
                <Plus className="h-4 w-4 mr-1" />
                <span>Add</span>
              </Button>
            </form>
          </Card>

          {/* Card 6: Work Experience Timeline */}
          <Card>
            <h3 className="text-xs font-bold font-display text-ink uppercase tracking-wider mb-4 pl-1">Work Experience Timeline</h3>

            {experience.length > 0 ? (
              <div className="space-y-4 mb-6 font-sans">
                {experience.map((exp, i) => (
                  <div key={i} className="p-3 bg-cream border-2 border-ink text-xs text-ink rounded-lg relative text-left">
                    <button
                      type="button"
                      onClick={() => handleDeleteExperience(i)}
                      className="absolute right-3 top-3 text-ink/60 hover:text-accent-coral transition-colors cursor-pointer"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                    <p className="font-bold font-display uppercase tracking-tight text-xs pr-6">
                      {exp.title}
                    </p>
                    <p className="font-bold text-[10px] text-ink/80 mt-0.5">
                      {exp.company}
                    </p>
                    <p className="text-[9px] font-mono text-ink/60 mt-0.5">
                      {exp.startDate} — {exp.endDate || 'Present'}
                    </p>
                    {exp.description && (
                      <p className="text-[10px] text-ink/75 mt-1.5 leading-relaxed font-sans font-bold">
                        {exp.description}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-xs text-ink/60 mb-6 italic font-sans pl-1">No work experience timeline listed.</p>
            )}

            <form onSubmit={handleAddExperience} className="space-y-3.5 border-t-2 border-ink pt-4 font-sans text-left">
              <span className="text-[10px] font-bold font-display text-ink uppercase tracking-widest block pl-1">Add Job Entry</span>
              
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <Input
                  type="text"
                  required
                  value={expTitle}
                  onChange={(e) => setExpTitle(e.target.value)}
                  placeholder="Job Title (e.g. Lead Designer)"
                />
                <Input
                  type="text"
                  required
                  value={expCompany}
                  onChange={(e) => setExpCompany(e.target.value)}
                  placeholder="Company Name (e.g. Google)"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <Input
                  type="text"
                  required
                  value={expStart}
                  onChange={(e) => setExpStart(e.target.value)}
                  placeholder="Start Date (e.g. Jan 2024)"
                />
                <Input
                  type="text"
                  value={expEnd}
                  onChange={(e) => setExpEnd(e.target.value)}
                  placeholder="End Date (e.g. Dec 2024 or leave empty for Present)"
                />
              </div>

              <textarea
                rows={2}
                value={expDesc}
                onChange={(e) => setExpDesc(e.target.value)}
                placeholder="Brief summary of duties, projects, achievements..."
                className="w-full px-4 py-2.5 bg-cream border-2 border-ink rounded-lg text-ink text-sm resize-none focus:outline-none focus:bg-accent-amber/10 focus:border-accent-amber font-sans"
              />

              <Button
                type="submit"
                variant="secondary"
                className="w-full py-2.5 flex items-center justify-center space-x-1.5"
              >
                <Plus className="h-4 w-4" />
                <span>Save Experience Entry</span>
              </Button>
            </form>
          </Card>

        </div>

      </div>

        </>
      )}
    </div>
  );
};
