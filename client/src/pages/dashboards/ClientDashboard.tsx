import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { Building, MapPin, Edit, FileText, Check, AlertCircle, Compass, Search, Calendar, Clock, User as UserIcon, Star, ExternalLink, Loader2, Mail } from 'lucide-react';
import axios from 'axios';
import api from '../../utils/api';
import { ClientGigManager } from './ClientGigManager';
import { AvatarUpload } from '../../components/AvatarUpload';
import { TwoFactorSetup } from '../../components/TwoFactorSetup';
import { StarRating } from '../../components/StarRating';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Badge } from '../../components/ui/Badge';

interface CitySuggestion {
  display_name: string;
  lat: string;
  lon: string;
}

type Tab = 'profile' | 'gigs' | 'calendar';

export const ClientDashboard: React.FC = () => {
  const { user, updateProfile } = useAuth();
  const [activeTab, setActiveTab] = useState<Tab>('profile');
  
  const [isEditing, setIsEditing] = useState(false);
  const [name, setName] = useState(user?.name || '');
  const [companyName, setCompanyName] = useState(user?.companyName || '');
  const [bio, setBio] = useState(user?.bio || '');
  const [city, setCity] = useState(user?.location.city || '');
  const [latitude, setLatitude] = useState<number | null>(user?.location.coordinates[1] || null);
  const [longitude, setLongitude] = useState<number | null>(user?.location.coordinates[0] || null);

  // Address search states
  const [citySearch, setCitySearch] = useState(user?.location.city || '');
  const [suggestions, setSuggestions] = useState<CitySuggestion[]>([]);
  const [searchingCity, setSearchingCity] = useState(false);
  const [fetchingGeo, setFetchingGeo] = useState(false);

  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [saving, setSaving] = useState(false);
  const [resendingEmail, setResendingEmail] = useState(false);

  // Bookings / Appointments state
  const [bookings, setBookings] = useState<any[]>([]);
  const [bookingsLoading, setBookingsLoading] = useState(false);

  const loadBookings = async () => {
    setBookingsLoading(true);
    try {
      const res = await api.get('/bookings');
      if (res.data.success) {
        setBookings(res.data.bookings);
      }
    } catch (err) {
      console.error('Error fetching client appointments:', err);
    } finally {
      setBookingsLoading(false);
    }
  };

  useEffect(() => {
    if (activeTab === 'calendar') {
      loadBookings();
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

  // Geo detect
  const handleDetectLocation = () => {
    if (!navigator.geolocation) {
      setMessage({ type: 'error', text: 'Geolocation not supported by browser.' });
      return;
    }

    setFetchingGeo(true);
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const { latitude: lat, longitude: lng } = pos.coords;
        setLatitude(lat);
        setLongitude(lng);

        try {
          const res = await axios.get(
            `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}`
          );
          const address = res.data.address;
          const cityName = address.city || address.town || address.village || address.suburb || 'My Location';
          setCity(cityName);
          setCitySearch(cityName);
        } catch (err) {
          console.error(err);
        } finally {
          setFetchingGeo(false);
        }
      },
      (err) => {
        console.error(err);
        setMessage({ type: 'error', text: 'Could not fetch current geolocation.' });
        setFetchingGeo(false);
      }
    );
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setMessage(null);
    setSaving(true);

    try {
      await updateProfile({
        name,
        companyName,
        bio,
        city,
        latitude,
        longitude,
      });
      setMessage({ type: 'success', text: 'Profile updated successfully!' });
      setIsEditing(false);
    } catch (err: any) {
      setMessage({ type: 'error', text: err.message || 'Failed to update profile.' });
    } finally {
      setSaving(false);
    }
  };

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
              <p className="text-ink/70 text-[11px] mt-0.5">Please verify your email address to unlock posting new gigs and hiring freelancers.</p>
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

      <div className="mb-8 border-b-2 border-ink pb-0 flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div className="pb-2 sm:pb-6 text-left">
          <span className="text-[10px] font-mono text-ink/60 uppercase tracking-widest block mb-1">Workspace Node</span>
          <h1 className="text-2xl font-display font-black text-ink uppercase tracking-tight">Client Panel</h1>
        </div>
        <div className="flex items-end space-x-1 sm:space-x-2 overflow-x-auto w-full sm:w-auto -mb-[2px] scrollbar-none flex-nowrap">
          {(['profile', 'gigs', 'calendar'] as Tab[]).map(tab => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-3 sm:px-5 py-2.5 text-[10px] sm:text-xs font-bold font-display uppercase tracking-wider border-2 border-b-0 border-ink transition-all cursor-pointer flex-shrink-0 ${
                activeTab === tab
                  ? 'bg-accent-teal text-ink shadow-none translate-y-[2px]'
                  : 'bg-cream text-ink hover:bg-accent-teal/10'
              }`}
              style={{ borderBottomLeftRadius: 0, borderBottomRightRadius: 0, borderTopLeftRadius: 8, borderTopRightRadius: 8 }}
            >
              {tab === 'profile' ? 'My Profile' : tab === 'gigs' ? 'Gig Manager' : 'Calendar & Appointments'}
            </button>
          ))}
        </div>
      </div>

      {/* Tab: Gig Manager */}
      {activeTab === 'gigs' ? (
        <ClientGigManager />
      ) : activeTab === 'calendar' ? (
        <Card className="text-left p-6">
          <h2 className="text-sm font-bold font-display text-ink uppercase tracking-wider mb-6 flex items-center space-x-2">
            <Calendar className="h-5 w-5 text-accent-teal" />
            <span>Scheduled Candidate Appointments</span>
          </h2>

          {bookingsLoading ? (
            <div className="flex justify-center py-12">
              <Loader2 className="h-6 w-6 text-accent-teal animate-spin" />
            </div>
          ) : bookings.length === 0 ? (
            <div className="text-center py-10 text-xs text-ink/60 font-sans italic">
              No appointment slots booked. You can request interview & consultation slots from candidate node profile pages.
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {bookings.map(b => (
                <Card key={b._id} className="p-5 shadow-retro-sm text-left">
                  <div className="space-y-4">
                    
                    {/* Header: Gig & Status */}
                    <div className="flex items-start justify-between border-b-2 border-ink/10 pb-3 gap-2">
                      <div>
                        <span className="text-[9px] font-mono text-ink/60 uppercase tracking-widest block font-bold">Appointment Requested For</span>
                        <Link to={`/gigs/${b.gigId?._id}`} className="font-black text-ink text-sm font-display uppercase tracking-tight hover:text-accent-teal transition-colors line-clamp-1">
                          {b.gigId?.title || 'Gig Project'}
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
                        {b.status === 'confirmed' ? 'CONFIRMED' : b.status === 'cancelled' ? 'DECLINED' : 'AWAITING RESPONSE'}
                      </Badge>
                    </div>

                    {/* Candidate / Freelancer Full Profile Info */}
                    <div className="bg-cream/60 border-2 border-ink p-3 rounded-lg space-y-3 font-sans text-xs">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-3">
                          <div className="h-10 w-10 bg-cream border-2 border-ink rounded-full overflow-hidden flex items-center justify-center font-bold text-ink font-display flex-shrink-0">
                            {b.freelancerId?.avatar ? (
                              <img src={b.freelancerId.avatar} alt={b.freelancerId.name} className="h-full w-full object-cover" />
                            ) : (
                              b.freelancerId?.name?.charAt(0) || 'F'
                            )}
                          </div>
                          <div>
                            <p className="font-bold text-ink font-display uppercase text-xs">
                              {b.freelancerId?.name || 'Candidate Node'}
                            </p>
                            <div className="flex items-center space-x-2 mt-0.5">
                              <StarRating value={b.freelancerId?.rating || 5} size="sm" />
                              <span className="text-[10px] font-mono font-bold text-ink/60">
                                ({b.freelancerId?.reviewCount || 0})
                              </span>
                            </div>
                          </div>
                        </div>

                        {b.freelancerId?.hourlyRate !== undefined && (
                          <div className="text-right">
                            <span className="text-[9px] font-mono text-ink/60 block font-bold">RATE</span>
                            <span className="text-xs font-bold text-accent-teal font-mono">
                              ₹{b.freelancerId.hourlyRate}/hr
                            </span>
                          </div>
                        )}
                      </div>

                      {/* Skills Matrix tags */}
                      {b.freelancerId?.skills && b.freelancerId.skills.length > 0 && (
                        <div className="flex flex-wrap gap-1 pt-1 border-t border-ink/10">
                          {b.freelancerId.skills.slice(0, 3).map((sk: any, idx: number) => (
                            <Badge key={idx} variant="outline" className="text-[8px] shadow-none py-0.25 px-1.5">
                              {sk.name}
                            </Badge>
                          ))}
                          {b.freelancerId.skills.length > 3 && (
                            <span className="text-[8px] font-mono text-ink/60 font-bold self-center">
                              +{b.freelancerId.skills.length - 3} more
                            </span>
                          )}
                        </div>
                      )}

                      {/* View Full Candidate Node Profile Button */}
                      {b.freelancerId?._id && (
                        <div className="pt-2 border-t border-ink/10 text-right">
                          <Link
                            to={`/freelancer/${b.freelancerId._id}`}
                            className="inline-flex items-center space-x-1 text-[10px] font-mono text-accent-teal hover:underline font-bold uppercase"
                          >
                            <span>View Full Candidate Profile</span>
                            <ExternalLink className="h-3 w-3" />
                          </Link>
                        </div>
                      )}
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

                  </div>
                </Card>
              ))}
            </div>
          )}
        </Card>
      ) : (
        <>
          {/* Messages */}
          {message && (
            <div className={`mb-6 p-4 border-2 border-ink flex items-center space-x-3 text-xs rounded-lg ${
              message.type === 'success'
                ? 'bg-cream border-l-4 border-l-accent-teal text-ink'
                : 'bg-cream border-l-4 border-l-accent-coral text-ink'
            }`}>
              {message.type === 'success' ? <Check className="h-4.5 w-4.5 text-accent-teal flex-shrink-0" /> : <AlertCircle className="h-4.5 w-4.5 text-accent-coral flex-shrink-0" />}
              <span>{message.text}</span>
            </div>
          )}

          {/* Main card grid */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            
            {/* Left Column: Client profile */}
            <div className="space-y-6 lg:col-span-1">
              <Card className="flex flex-col items-center text-center">
                <AvatarUpload />

                <div className="mt-4 border-t-2 border-ink w-full pt-4">
                  <h3 className="text-lg font-black font-display text-ink uppercase tracking-tight">{user.name}</h3>
                  <Badge variant="outline" className="mt-1 shadow-none">
                    {user.role} node
                  </Badge>
                </div>

                <div className="w-full border-t-2 border-ink mt-6 pt-4 space-y-3 text-left font-sans text-xs">
                  <div className="flex items-center space-x-2 text-ink/70">
                    <Building className="h-4 w-4 text-accent-teal flex-shrink-0" />
                    <span className="font-bold text-ink">{user.companyName || 'Individual Client'}</span>
                  </div>
                  <div className="flex items-center space-x-2 text-ink/70">
                    <MapPin className="h-4 w-4 text-accent-teal flex-shrink-0" />
                    <span className="font-bold text-ink">{user.location.city}</span>
                  </div>
                  <div className="flex items-center space-x-2 text-ink/70">
                    <Mail className="h-4 w-4 text-accent-teal flex-shrink-0" />
                    <span className="font-bold text-ink truncate max-w-[190px]" title={user.email}>{user.email}</span>
                  </div>
                </div>
              </Card>

              <TwoFactorSetup />
            </div>

            {/* Right Column: Edit Settings */}
            <div className="lg:col-span-2 space-y-6 text-left">
              <Card>
                <div className="flex items-center justify-between border-b-2 border-ink pb-4 mb-6">
                  <h3 className="text-xs font-bold font-display text-ink uppercase tracking-widest flex items-center space-x-2">
                    <Building className="h-4 w-4 text-accent-teal" />
                    <span>Client Profile Details</span>
                  </h3>
                  <Button
                    onClick={() => setIsEditing(!isEditing)}
                    variant={isEditing ? 'coral' : 'outline'}
                    size="sm"
                  >
                    <Edit className="h-3.5 w-3.5 mr-1" />
                    <span>{isEditing ? 'Cancel Edit' : 'Edit Profile'}</span>
                  </Button>
                </div>

                {isEditing ? (
                  <form onSubmit={handleSave} className="space-y-5 font-sans">
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-bold font-display text-ink uppercase tracking-widest block pl-1">Full Name</label>
                      <Input type="text" required value={name} onChange={e => setName(e.target.value)} />
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-[10px] font-bold font-display text-ink uppercase tracking-widest block pl-1">Company / Organization Name</label>
                      <Input type="text" value={companyName} onChange={e => setCompanyName(e.target.value)} placeholder="Acme Corp" />
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-[10px] font-bold font-display text-ink uppercase tracking-widest block pl-1">Company Bio / Description</label>
                      <textarea rows={4} value={bio} onChange={e => setBio(e.target.value)}
                        placeholder="Tell freelancers about your company or projects..."
                        className="w-full px-4 py-2.5 bg-cream border-2 border-ink rounded-lg text-ink text-sm resize-none outline-none focus:bg-accent-amber/10 focus:border-accent-amber placeholder:text-ink/40" />
                    </div>

                    <div className="border-t-2 border-ink pt-4 space-y-4">
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] font-bold font-display text-ink uppercase tracking-widest pl-1">Change Location</span>
                        <button type="button" onClick={handleDetectLocation} disabled={fetchingGeo}
                          className="text-xs text-accent-teal hover:underline flex items-center space-x-1 font-bold cursor-pointer">
                          <Compass className="h-3.5 w-3.5" />
                          <span>{fetchingGeo ? 'GPS Locating...' : 'Use GPS Location'}</span>
                        </button>
                      </div>
                      <div className="relative">
                        <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-ink/50 z-10" />
                        <Input type="text" value={citySearch} onChange={handleCitySearchChange}
                          placeholder="Search for new city..." className="pl-10" />
                        {searchingCity && (
                          <div className="absolute right-3 top-1/2 -translate-y-1/2">
                            <div className="w-4 h-4 border-2 border-ink/30 border-t-ink rounded-full animate-spin"></div>
                          </div>
                        )}
                        {suggestions.length > 0 && (
                          <div className="absolute z-50 left-0 right-0 top-full mt-1 bg-cream border-2 border-ink rounded-lg shadow-retro max-h-40 overflow-y-auto">
                            {suggestions.map((sug, i) => (
                              <button key={i} type="button" onClick={() => handleSelectCity(sug)}
                                className="w-full text-left px-4 py-2 text-xs text-ink hover:bg-accent-amber/10 border-b border-ink/10 last:border-b-0 cursor-pointer">
                                {sug.display_name}
                              </button>
                            ))}
                          </div>
                        )}
                      </div>
                      {latitude !== null && longitude !== null && (
                        <div className="text-xs font-mono text-ink/70 bg-cream border-2 border-ink rounded-lg p-2.5">
                          Coordinates Locked: {latitude.toFixed(4)}, {longitude.toFixed(4)} ({city})
                        </div>
                      )}
                    </div>

                    <Button type="submit" disabled={saving} variant="secondary" className="w-full mt-4">
                      {saving ? 'Saving...' : 'Save Profile Changes'}
                    </Button>
                  </form>
                ) : (
                  <div className="space-y-6 font-sans text-xs">
                    <div>
                      <span className="text-[10px] font-bold font-display text-ink/60 uppercase tracking-widest block mb-1">Company Description</span>
                      <p className="text-sm font-sans text-ink leading-relaxed font-bold">
                        {user.bio || 'No company bio set. Click edit profile to add details.'}
                      </p>
                    </div>

                    <div className="grid grid-cols-2 gap-4 border-t-2 border-ink pt-4 font-mono">
                      <div>
                        <span className="text-[10px] font-bold text-ink/60 uppercase tracking-widest block mb-1">Account Role</span>
                        <Badge variant="amber" className="shadow-none text-xs">{user.role}</Badge>
                      </div>
                      <div>
                        <span className="text-[10px] font-bold text-ink/60 uppercase tracking-widest block mb-1">Primary Node Location</span>
                        <span className="font-bold text-ink text-xs">{user.location.city}</span>
                      </div>
                    </div>
                  </div>
                )}
              </Card>
            </div>

          </div>
        </>
      )}

    </div>
  );
};
