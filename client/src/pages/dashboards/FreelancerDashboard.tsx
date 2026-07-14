import React, { useState, useRef } from 'react';
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
  Loader2
} from 'lucide-react';
import axios from 'axios';
import api from '../../utils/api';
import { FreelancerApplications } from './FreelancerApplications';
import { AvatarUpload } from '../../components/AvatarUpload';


type Tab = 'profile' | 'applications';

interface CitySuggestion {
  display_name: string;
  lat: string;
  lon: string;
}

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

  // Temporary inputs states
  const [newSkillName, setNewSkillName] = useState('');
  const [newSkillLevel, setNewSkillLevel] = useState<'Beginner' | 'Intermediate' | 'Expert'>('Intermediate');
  const [newCertName, setNewCertName] = useState('');

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

  if (!user) return null;

  const handleRemoveResume = async () => {
    if (!window.confirm('Remove your resume document?')) return;
    setRemovingResume(true);
    try {
      const res = await api.delete('/users/resume');
      if (res.data.success) {
        updateUser(res.data.user);
        setMessage({ type: 'success', text: 'Resume removed successfully.' });
        setTimeout(() => setMessage(null), 3000);
      }
    } catch (err: any) {
      setMessage({ type: 'error', text: err.response?.data?.message || 'Failed to remove resume.' });
    } finally {
      setRemovingResume(false);
    }
  };

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

  // Manage lists updates in DB
  const saveLists = async (newSkills = skills, newPortfolio = portfolio, newCerts = certifications, newRate = hourlyRate) => {
    try {
      await updateProfile({
        skills: newSkills,
        portfolio: newPortfolio,
        certifications: newCerts,
        hourlyRate: newRate
      });
      setMessage({ type: 'success', text: 'Profile changes saved!' });
    } catch (err: any) {
      setMessage({ type: 'error', text: err.message || 'Failed to save changes.' });
    }
  };

  // Add Skill
  const handleAddSkill = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newSkillName.trim()) return;
    
    if (skills.some(s => s.name.toLowerCase() === newSkillName.trim().toLowerCase())) {
      setMessage({ type: 'error', text: 'Skill already exists in your profile.' });
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

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 flex-grow bg-paper font-sans">
      
      {/* Dashboard Title + Tab Switcher */}
      <div className="mb-8 border-b border-line-gray pb-0 flex items-end justify-between">
        <div className="pb-6">
          <span className="text-[10px] font-mono text-slate uppercase tracking-widest block mb-1">Provider Node Workspace</span>
          <h1 className="text-2xl font-black font-display text-ink uppercase tracking-tight">Freelancer Dashboard</h1>
        </div>
        <div className="flex items-end space-x-1">
          {(['profile', 'applications'] as Tab[]).map(tab => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-4 py-2.5 text-xs font-bold font-display uppercase tracking-widest border-b-2 transition-colors ${
                activeTab === tab
                  ? 'border-route-teal text-route-teal'
                  : 'border-transparent text-slate hover:text-ink'
              }`}
            >
              {tab === 'profile' ? 'My Profile' : 'My Applications'}
            </button>
          ))}
        </div>
      </div>

      {/* Tab content */}
      {activeTab === 'applications' ? (
        <FreelancerApplications />
      ) : (
        <>

      {/* Alert Banner */}
      {message && (
        <div className={`mb-6 p-4 rounded-sm border-l-4 flex items-center space-x-3 text-xs ${
          message.type === 'success' 
            ? 'bg-white border-line-gray border-l-route-teal text-ink' 
            : 'bg-white border-line-gray border-l-signal-coral text-ink'
        }`}>
          {message.type === 'success' ? <Check className="h-4.5 w-4.5 text-route-teal flex-shrink-0" /> : <AlertCircle className="h-4.5 w-4.5 text-signal-coral flex-shrink-0" />}
          <span>{message.text}</span>
        </div>
      )}

      {/* Main Layout Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Left Column: Profile Card & Resume Uploader */}
        <div className="space-y-8 lg:col-span-1">
          
          {/* Card 1: Avatar and main stats */}
          <div className="bg-white border border-line-gray rounded-sm p-6 flex flex-col items-start text-left">
            <div className="h-16 w-16 bg-slate/10 border border-slate/30 flex items-center justify-center text-ink text-2xl font-black font-display uppercase mb-4 rounded-sm overflow-hidden flex-shrink-0">
              {user.avatar ? (
                <img src={user.avatar} alt={user.name} className="h-full w-full object-cover" />
              ) : (
                user.name.charAt(0)
              )}
            </div>
            <h2 className="text-lg font-bold text-ink uppercase font-display tracking-tight">{user.name}</h2>
            <span className="text-[10px] font-mono text-slate uppercase tracking-wider mt-1 bg-line-gray/25 px-2 py-0.5 rounded">
              Freelancer Account
            </span>
            
            <div className="w-full border-t border-line-gray my-6 pt-6 space-y-4 font-mono text-xs text-slate">
              <div className="flex items-center justify-between">
                <span className="flex items-center space-x-2">
                  <DollarSign className="h-4 w-4 text-route-teal" />
                  <span>RATE:</span>
                </span>
                <span className="font-bold text-ink text-sm">₹{user.hourlyRate || 0}/HR</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="flex items-center space-x-2">
                  <MapPin className="h-4 w-4 text-route-teal" />
                  <span>CITY:</span>
                </span>
                <span className="text-ink font-bold uppercase">{user.location.city}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="flex items-center space-x-2">
                  <Award className="h-4 w-4 text-transit-gold" />
                  <span>RATING:</span>
                </span>
                <span className="font-bold text-ink">{user.rating.toFixed(1)} ★</span>
              </div>
            </div>

            {!isEditing && (
              <>
                <button
                  onClick={() => setIsEditing(true)}
                  className="w-full mt-4 py-2.5 rounded-sm border border-line-gray hover:border-route-teal text-xs font-bold font-display uppercase tracking-widest text-slate hover:text-route-teal transition-all flex items-center justify-center space-x-2"
                >
                  <Edit className="h-4 w-4" />
                  <span>Modify Settings</span>
                </button>
                
                <div className="w-full mt-4 border-t border-line-gray pt-4">
                  <AvatarUpload />
                </div>
              </>
            )}
          </div>


          {/* Card 2: Resume Uploader */}
          <div className="bg-white border border-line-gray rounded-sm p-6 text-left">
            <h3 className="text-xs font-bold font-display text-ink uppercase tracking-widest mb-4 flex items-center space-x-2">
              <FileText className="h-4 w-4 text-route-teal" />
              <span>Resume Document</span>
            </h3>

            {user.resumeUrl ? (
              <div className="space-y-4">
                <div className="p-3 bg-paper/50 border border-line-gray text-xs flex items-center justify-between font-mono">
                  <span className="text-slate truncate max-w-[120px]">resume-node.pdf</span>
                  <a
                    href={user.resumeUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-route-teal hover:underline font-bold"
                  >
                    View File
                  </a>
                </div>
                <div className="border-t border-line-gray pt-3 flex gap-2">
                  <button
                    onClick={() => fileInputRef.current?.click()}
                    disabled={uploading || removingResume}
                    className="flex-1 py-2 text-xs font-bold font-display uppercase tracking-widest rounded-sm bg-paper hover:bg-line-gray/20 border border-line-gray hover:border-slate text-slate flex items-center justify-center space-x-2 transition-all disabled:opacity-50"
                  >
                    <Upload className="h-3.5 w-3.5" />
                    <span>{uploading ? 'Uploading...' : 'Replace'}</span>
                  </button>
                  <button
                    onClick={handleRemoveResume}
                    disabled={uploading || removingResume}
                    className="flex-1 py-2 text-xs font-bold font-display uppercase tracking-widest rounded-sm bg-signal-coral/5 hover:bg-signal-coral/10 border border-signal-coral/30 hover:border-signal-coral text-signal-coral flex items-center justify-center space-x-2 transition-all disabled:opacity-50"
                  >
                    {removingResume ? (
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    ) : (
                      <Trash2 className="h-3.5 w-3.5" />
                    )}
                    <span>{removingResume ? 'Removing...' : 'Remove'}</span>
                  </button>
                </div>
              </div>
            ) : (
              <div className="text-center py-6 border-2 border-dashed border-line-gray rounded-sm bg-paper/10 hover:bg-paper/30 transition-colors">
                <Upload className="h-6 w-6 mx-auto text-slate mb-2" />
                <p className="text-[10px] text-slate font-mono uppercase tracking-wider">PDF, JPG, PNG (Max 10MB)</p>
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={uploading}
                  className="mt-3 px-4 py-2 rounded-sm bg-route-teal hover:bg-route-teal/90 text-white text-xs font-bold font-display uppercase tracking-wider transition-colors"
                >
                  {uploading ? 'Uploading...' : 'Upload Resume'}
                </button>
              </div>
            )}
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleFileChange}
              className="hidden"
              accept=".pdf,.jpg,.jpeg,.png"
            />
          </div>

        </div>

        {/* Right Column: Manage dynamic items */}
        <div className="lg:col-span-2 space-y-8">
          
          {/* Dashboard Settings Editor */}
          {isEditing ? (
            <div className="bg-white border border-line-gray rounded-sm p-6 text-left">
              <h3 className="text-sm font-bold font-display text-ink uppercase tracking-widest mb-6">Modify Settings</h3>
              <form onSubmit={handleSaveProfile} className="space-y-5">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold font-display text-ink uppercase tracking-widest block">Full Name</label>
                    <input
                      type="text"
                      required
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      className="w-full px-4 py-2.5 rounded-sm bg-paper/30 border border-line-gray text-ink text-sm focus:outline-none focus:border-route-teal"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold font-display text-ink uppercase tracking-widest block">Hourly Rate (₹)</label>
                    <input
                      type="number"
                      required
                      min={0}
                      value={hourlyRate}
                      onChange={(e) => setHourlyRate(Number(e.target.value))}
                      className="w-full px-4 py-2.5 rounded-sm bg-paper/30 border border-line-gray text-ink text-sm focus:outline-none focus:border-route-teal"
                    />
                  </div>
                </div>

                {/* Autocomplete Location Picker */}
                <div className="border-t border-line-gray pt-4 space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-bold font-display text-ink uppercase tracking-widest block">Change Coordinates</span>
                    <button
                      type="button"
                      onClick={handleDetectLocation}
                      disabled={fetchingGeo}
                      className="text-xs text-route-teal hover:text-route-teal/80 flex items-center space-x-1 font-bold"
                    >
                      <Compass className="h-3.5 w-3.5" />
                      <span>{fetchingGeo ? 'GPS Locating...' : 'Use GPS Location'}</span>
                    </button>
                  </div>

                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate" />
                    <input
                      type="text"
                      value={citySearch}
                      onChange={handleCitySearchChange}
                      placeholder="Search city..."
                      className="w-full pl-10 pr-4 py-2.5 rounded-sm bg-paper/30 border border-line-gray text-ink text-sm focus:outline-none focus:border-route-teal"
                    />
                    {searchingCity && (
                      <div className="absolute right-3 top-1/2 -translate-y-1/2">
                        <div className="w-4 h-4 border-2 border-route-teal/30 border-t-route-teal rounded-full animate-spin"></div>
                      </div>
                    )}

                    {suggestions.length > 0 && (
                      <div className="absolute z-50 left-0 right-0 top-full mt-1 bg-white border border-line-gray rounded-sm shadow-md max-h-40 overflow-y-auto">
                        {suggestions.map((sug, i) => (
                          <button
                            key={i}
                            type="button"
                            onClick={() => handleSelectCity(sug)}
                            className="w-full text-left px-4 py-2.5 text-xs text-ink hover:bg-paper/30 transition-colors border-b border-line-gray/40 last:border-b-0"
                          >
                            {sug.display_name}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>

                  {latitude !== null && longitude !== null && (
                    <div className="text-xs font-mono text-slate bg-paper/50 p-2 border border-line-gray rounded-sm">
                      Location Lock: {latitude.toFixed(4)}, {longitude.toFixed(4)} ({city})
                    </div>
                  )}
                </div>

                <div className="flex space-x-3 pt-4 border-t border-line-gray">
                  <button
                    type="submit"
                    disabled={saving || !city || latitude === null}
                    className="px-5 py-2.5 rounded-sm text-xs font-bold font-display uppercase tracking-widest text-white bg-signal-coral hover:bg-signal-coral/95 disabled:opacity-50 transition-colors"
                  >
                    {saving ? 'Saving...' : 'Save Settings'}
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setIsEditing(false);
                      setMessage(null);
                    }}
                    className="px-5 py-2.5 rounded-sm text-xs font-bold font-display uppercase tracking-widest text-slate border border-line-gray hover:bg-paper/30 transition-colors"
                  >
                    Cancel
                  </button>
                </div>
              </form>
            </div>
          ) : null}

          {/* Card 3: Skills Manager */}
          <div className="bg-white border border-line-gray rounded-sm p-6 text-left">
            <h3 className="text-xs font-bold font-display text-ink uppercase tracking-widest mb-4">Skills Management</h3>
            
            {skills.length > 0 ? (
              <div className="flex flex-wrap gap-2 mb-6">
                {skills.map((s, i) => (
                  <span 
                    key={i} 
                    className="inline-flex items-center space-x-2 px-3 py-1.5 rounded-sm bg-paper border border-line-gray text-xs text-ink font-medium"
                  >
                    <span>{s.name}</span>
                    <span className={`px-1.5 py-0.5 rounded-sm text-[9px] font-mono uppercase font-bold ${
                      s.level === 'Expert' 
                        ? 'bg-route-teal/15 text-route-teal' 
                        : s.level === 'Intermediate' 
                        ? 'bg-slate/15 text-slate' 
                        : 'bg-line-gray/30 text-slate'
                    }`}>
                      {s.level}
                    </span>
                    <button
                      onClick={() => handleDeleteSkill(i)}
                      className="text-slate hover:text-signal-coral transition-colors pl-1"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </span>
                ))}
              </div>
            ) : (
              <p className="text-xs text-slate mb-6 italic font-sans">No skills listed inside your node profiles. Add skills to matching algorithms.</p>
            )}

            <form onSubmit={handleAddSkill} className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="sm:col-span-1.5">
                <input
                  type="text"
                  required
                  value={newSkillName}
                  onChange={(e) => setNewSkillName(e.target.value)}
                  placeholder="Skill name (e.g. React.js)"
                  className="w-full px-3 py-2 rounded-sm bg-paper/30 border border-line-gray text-ink text-xs focus:outline-none focus:border-route-teal"
                />
              </div>
              <div className="sm:col-span-1">
                <select
                  value={newSkillLevel}
                  onChange={(e) => setNewSkillLevel(e.target.value as any)}
                  className="w-full px-3 py-2 rounded-sm bg-paper/30 border border-line-gray text-ink text-xs focus:outline-none focus:border-route-teal"
                >
                  <option value="Beginner">Beginner</option>
                  <option value="Intermediate">Intermediate</option>
                  <option value="Expert">Expert</option>
                </select>
              </div>
              <button
                type="submit"
                className="py-2 px-4 rounded-sm bg-route-teal hover:bg-route-teal/90 text-white font-bold font-display uppercase tracking-widest text-xs flex items-center justify-center space-x-1.5"
              >
                <Plus className="h-4 w-4" />
                <span>Add Skill</span>
              </button>
            </form>
          </div>

          {/* Card 4: Portfolio */}
          <div className="bg-white border border-line-gray rounded-sm p-6 text-left">
            <h3 className="text-xs font-bold font-display text-ink uppercase tracking-widest mb-4">Portfolio Registry</h3>

            {portfolio.length > 0 ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
                {portfolio.map((item, i) => (
                  <div key={i} className="p-4 bg-paper/20 border border-line-gray rounded-sm flex flex-col justify-between">
                    <div>
                      <div className="flex items-center justify-between mb-1.5">
                        <h4 className="font-bold text-ink text-xs uppercase tracking-tight truncate">{item.title}</h4>
                        <button
                          onClick={() => handleDeletePortfolio(i)}
                          className="text-slate hover:text-signal-coral transition-colors"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                      <p className="text-xs text-slate line-clamp-3 mb-3 leading-relaxed font-sans">{item.description}</p>
                    </div>
                    {item.link && (
                      <a
                        href={item.link}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center space-x-1 text-xs text-route-teal hover:underline font-bold"
                      >
                        <LinkIcon className="h-3 w-3" />
                        <span>Visit Project</span>
                      </a>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-xs text-slate mb-6 italic font-sans">No portfolio items logged.</p>
            )}

            <form onSubmit={handleAddPortfolio} className="space-y-3.5 border-t border-line-gray pt-4 font-sans">
              <span className="text-[10px] font-bold font-display text-ink uppercase tracking-widest block">Add Portfolio Project</span>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <input
                  type="text"
                  required
                  value={portTitle}
                  onChange={(e) => setPortTitle(e.target.value)}
                  placeholder="Project Title"
                  className="w-full px-3 py-2 rounded-sm bg-paper/30 border border-line-gray text-ink text-xs focus:outline-none focus:border-route-teal"
                />
                <input
                  type="url"
                  value={portLink}
                  onChange={(e) => setPortLink(e.target.value)}
                  placeholder="Project Link (Optional)"
                  className="w-full px-3 py-2 rounded-sm bg-paper/30 border border-line-gray text-ink text-xs focus:outline-none focus:border-route-teal"
                />
              </div>
              <textarea
                required
                rows={2}
                value={portDesc}
                onChange={(e) => setPortDesc(e.target.value)}
                placeholder="Brief description of work parameters..."
                className="w-full px-3 py-2 rounded-sm bg-paper/30 border border-line-gray text-ink text-xs resize-none focus:outline-none focus:border-route-teal"
              />
              <button
                type="submit"
                className="w-full py-2.5 bg-route-teal hover:bg-route-teal/90 text-white font-bold font-display uppercase tracking-widest text-xs flex items-center justify-center space-x-1.5 rounded-sm"
              >
                <Plus className="h-4 w-4" />
                <span>Save Project</span>
              </button>
            </form>
          </div>

          {/* Card 5: Certifications */}
          <div className="bg-white border border-line-gray rounded-sm p-6 text-left">
            <h3 className="text-xs font-bold font-display text-ink uppercase tracking-widest mb-4">Certifications & Credentials</h3>

            {certifications.length > 0 ? (
              <div className="space-y-2 mb-6">
                {certifications.map((cert, i) => (
                  <div key={i} className="p-3 bg-paper border border-line-gray rounded-sm text-xs flex items-center justify-between text-ink font-mono">
                    <span className="flex items-center space-x-2">
                      <Award className="h-4 w-4 text-transit-gold flex-shrink-0" />
                      <span>{cert}</span>
                    </span>
                    <button
                      type="button"
                      onClick={() => handleDeleteCert(i)}
                      className="text-slate hover:text-signal-coral transition-colors"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-xs text-slate mb-6 italic font-sans">No certifications listed.</p>
            )}

            <form onSubmit={handleAddCert} className="flex gap-2">
              <input
                type="text"
                required
                value={newCertName}
                onChange={(e) => setNewCertName(e.target.value)}
                placeholder="AWS Developer, Electrician Level II"
                className="flex-grow px-3 py-2 rounded-sm bg-paper/30 border border-line-gray text-ink text-xs focus:outline-none focus:border-route-teal"
              />
              <button
                type="submit"
                className="py-2 px-4 rounded-sm bg-route-teal hover:bg-route-teal/90 text-white font-bold font-display uppercase tracking-widest text-xs flex items-center justify-center space-x-1.5"
              >
                <Plus className="h-4 w-4" />
                <span>Add</span>
              </button>
            </form>
          </div>

        </div>

      </div>

        </>
      )}
    </div>
  );
};
