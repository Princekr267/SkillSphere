import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ReviewList } from '../components/ReviewList';
import { StarRating } from '../components/StarRating';
import { useAuth } from '../context/AuthContext';
import api from '../utils/api';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Badge } from '../components/ui/Badge';
import {
  ArrowLeft, MapPin, DollarSign, Award,
  Briefcase, Calendar, Loader2, AlertCircle, Clock, Trash2, Plus
} from 'lucide-react';

interface PublicUser {
  _id: string;
  name: string;
  role: string;
  avatar?: string;
  location: { city: string };
  skills: Array<{ name: string; level: 'Beginner' | 'Intermediate' | 'Expert' }>;
  hourlyRate?: number;
  portfolio: Array<{ title: string; description: string; link?: string }>;
  certifications: string[];
  rating: number;
  reviewCount: number;
  createdAt: string;
  bio?: string;
  companyName?: string;
  availability?: Array<{ dayOfWeek: number; startTime: string; endTime: string }>;
}

export const FreelancerProfile: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();

  const [freelancer, setFreelancer] = useState<PublicUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Scheduler Booking States
  const [myGigs, setMyGigs] = useState<any[]>([]);
  const [bookingDate, setBookingDate] = useState('');
  const [bookingGigId, setBookingGigId] = useState('');
  const [bookingStart, setBookingStart] = useState('09:00');
  const [bookingEnd, setBookingEnd] = useState('10:00');
  const [bookingSuccess, setBookingSuccess] = useState('');
  const [bookingError, setBookingError] = useState('');
  const [bookingLoading, setBookingLoading] = useState(false);

  // Edit Availability States
  const [editingAvailability, setEditingAvailability] = useState(false);
  const [tempAvailability, setTempAvailability] = useState<any[]>([]);

  const DAYS_OF_WEEK = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

  useEffect(() => {
    if (user?.role === 'client') {
      api.get('/gigs/my')
        .then(res => {
          if (res.data.success) {
            setMyGigs(res.data.gigs.filter((g: any) => g.status === 'open' || g.status === 'in_progress'));
          }
        })
        .catch(console.error);
    }
  }, [user]);

  const handleBookSlot = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!bookingDate || !bookingGigId || !bookingStart || !bookingEnd) {
      setBookingError('Please fill out all booking fields.');
      return;
    }
    setBookingLoading(true);
    setBookingError('');
    setBookingSuccess('');
    try {
      const res = await api.post('/bookings', {
        freelancerId: id,
        gigId: bookingGigId,
        date: bookingDate,
        startTime: bookingStart,
        endTime: bookingEnd,
      });
      if (res.data.success) {
        setBookingSuccess('Booking request sent successfully!');
        setBookingDate('');
        setBookingGigId('');
      }
    } catch (err: any) {
      setBookingError(err.response?.data?.message || 'Failed to submit booking.');
    } finally {
      setBookingLoading(false);
    }
  };

  const handleSaveAvailability = async () => {
    try {
      const res = await api.put('/users/profile/availability', { availability: tempAvailability });
      if (res.data.success) {
        if (freelancer) {
          setFreelancer({ ...freelancer, availability: tempAvailability });
        }
        setEditingAvailability(false);
      }
    } catch (err: any) {
      alert(err.response?.data?.message || 'Failed to save availability.');
    }
  };

  const handleAddTempSlot = () => {
    setTempAvailability([...tempAvailability, { dayOfWeek: 1, startTime: '09:00', endTime: '17:00' }]);
  };

  const handleRemoveTempSlot = (index: number) => {
    setTempAvailability(tempAvailability.filter((_, idx) => idx !== index));
  };

  const handleUpdateTempSlot = (index: number, key: string, val: any) => {
    const updated = [...tempAvailability];
    updated[index] = { ...updated[index], [key]: val };
    setTempAvailability(updated);
  };

  useEffect(() => {
    if (freelancer?.availability) {
      setTempAvailability(freelancer.availability);
    }
  }, [freelancer]);

  useEffect(() => {
    const fetchProfile = async () => {
      setLoading(true);
      setError('');
      try {
        const res = await api.get(`/users/${id}`);
        if (res.data.success) {
          setFreelancer(res.data.user);
        } else {
          setError('Profile not found.');
        }
      } catch (err: any) {
        setError(err.response?.data?.message || 'Could not fetch profile details.');
      } finally {
        setLoading(false);
      }
    };

    if (id) fetchProfile();
  }, [id]);

  if (loading) {
    return (
      <div className="flex-grow bg-cream flex flex-col items-center justify-center py-16 min-h-[50vh]">
        <Loader2 className="h-8 w-8 text-accent-teal animate-spin" />
        <p className="text-xs font-mono text-ink/60 uppercase mt-2">Loading Node Profile...</p>
      </div>
    );
  }

  if (error || !freelancer) {
    return (
      <div className="flex-grow bg-cream flex flex-col items-center justify-center py-16 space-y-3 min-h-[50vh]">
        <AlertCircle className="h-8 w-8 text-accent-coral" />
        <p className="text-sm text-ink">{error || 'Node profile not found.'}</p>
        <button onClick={() => navigate(-1)} className="text-xs text-accent-teal font-bold hover:underline cursor-pointer">
          ← Go Back
        </button>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 flex-grow bg-cream font-sans transition-colors duration-200">
      
      {/* Back button */}
      <div className="text-left">
        <button
          onClick={() => navigate(-1)}
          className="inline-flex items-center space-x-1.5 text-xs text-ink/60 hover:text-ink transition-colors mb-8 font-bold font-display uppercase tracking-wider cursor-pointer"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          <span>Back</span>
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Left Column: Summary and Availability Scheduler */}
        <div className="space-y-6 lg:col-span-1">
          <Card className="flex flex-col items-center text-center">
            <div className="h-24 w-24 bg-cream border-2 border-ink overflow-hidden flex items-center justify-center font-display text-3xl font-black text-ink uppercase mb-4 rounded-lg shadow-retro">
              {freelancer.avatar ? (
                <img src={freelancer.avatar} alt={freelancer.name} className="h-full w-full object-cover" />
              ) : (
                freelancer.name.charAt(0)
              )}
            </div>

            <h1 className="text-xl font-black font-display text-ink uppercase tracking-tight">
              {freelancer.name}
            </h1>

            <Badge variant="outline" className="mt-1.5 shadow-none">
              {freelancer.role} node
            </Badge>

            <div className="w-full border-t-2 border-ink mt-6 pt-6 space-y-4 text-left font-mono text-xs">
              <div className="flex items-center space-x-3 text-ink/60">
                <MapPin className="h-4 w-4 text-accent-teal flex-shrink-0" />
                <span className="font-bold text-ink uppercase">{freelancer.location.city}</span>
              </div>

              {freelancer.hourlyRate !== undefined && (
                <div className="flex items-center space-x-3 text-ink/60">
                  <DollarSign className="h-4 w-4 text-accent-teal flex-shrink-0" />
                  <span className="font-bold text-ink">₹{freelancer.hourlyRate} / hr</span>
                </div>
              )}

              <div className="flex items-center space-x-3 text-ink/60">
                <Calendar className="h-4 w-4 text-accent-teal flex-shrink-0" />
                <span className="font-bold text-ink">Joined {new Date(freelancer.createdAt).toLocaleDateString('en-IN', { month: 'short', year: 'numeric' })}</span>
              </div>

              {/* Overall score */}
              <div className="border-t-2 border-ink pt-4 flex flex-col items-start space-y-1">
                <span className="text-[9px] font-mono text-ink/60 uppercase tracking-widest font-bold">Node Rep Score</span>
                <div className="flex items-center space-x-2">
                  <StarRating value={freelancer.rating} size="sm" />
                  <span className="text-xs font-bold text-ink font-mono">({freelancer.reviewCount})</span>
                </div>
              </div>
            </div>
          </Card>

          {/* Availability / Booking Section */}
          <Card className="text-left">
            <h3 className="text-xs font-bold font-display text-ink uppercase tracking-widest mb-4 pl-1 flex items-center space-x-1.5">
              <Calendar className="h-4 w-4 text-accent-teal" />
              <span>Availability Calendar</span>
            </h3>

            {/* Self availability edit */}
            {user?._id === freelancer._id ? (
              editingAvailability ? (
                <div className="space-y-4 font-sans text-xs">
                  <div className="space-y-3">
                    {tempAvailability.map((slot, idx) => (
                      <div key={idx} className="flex items-center space-x-2 bg-cream border-2 border-ink p-2 rounded-lg shadow-retro-sm">
                        <select
                          value={slot.dayOfWeek}
                          onChange={e => handleUpdateTempSlot(idx, 'dayOfWeek', Number(e.target.value))}
                          className="bg-cream border border-ink text-[10px] font-mono p-1 focus:outline-none rounded"
                        >
                          {DAYS_OF_WEEK.map((d, i) => (
                            <option key={i} value={i}>{d}</option>
                          ))}
                        </select>
                        <Input
                          type="text"
                          value={slot.startTime}
                          onChange={e => handleUpdateTempSlot(idx, 'startTime', e.target.value)}
                          className="text-[10px] font-mono w-14 text-center py-1"
                          placeholder="09:00"
                        />
                        <span className="font-mono text-[9px] text-ink/60">to</span>
                        <Input
                          type="text"
                          value={slot.endTime}
                          onChange={e => handleUpdateTempSlot(idx, 'endTime', e.target.value)}
                          className="text-[10px] font-mono w-14 text-center py-1"
                          placeholder="17:00"
                        />
                        <button
                          type="button"
                          onClick={() => handleRemoveTempSlot(idx)}
                          className="text-accent-coral hover:text-accent-coral/80 cursor-pointer"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    ))}
                    <button
                      type="button"
                      onClick={handleAddTempSlot}
                      className="w-full py-2 border-2 border-dashed border-ink text-[10px] font-mono font-bold hover:bg-accent-amber/10 rounded-lg uppercase cursor-pointer"
                    >
                      + Add Time Slot
                    </button>
                  </div>
                  <div className="flex items-center space-x-2 pt-2">
                    <Button
                      onClick={handleSaveAvailability}
                      variant="secondary"
                      size="sm"
                      className="flex-1 py-1.5"
                    >
                      Save
                    </Button>
                    <Button
                      onClick={() => setEditingAvailability(false)}
                      variant="outline"
                      size="sm"
                      className="flex-1 py-1.5"
                    >
                      Cancel
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="space-y-4 font-mono text-xs">
                  {(!freelancer.availability || freelancer.availability.length === 0) ? (
                    <p className="text-[10px] text-ink/60 italic pl-1">No availability slots set. Edit to define your calendar schedule.</p>
                  ) : (
                    <div className="space-y-2">
                      {freelancer.availability.map((slot, idx) => (
                        <div key={idx} className="flex justify-between border-b border-ink/10 pb-1.5 text-[10px] text-ink font-bold font-mono">
                          <span>{DAYS_OF_WEEK[slot.dayOfWeek]}</span>
                          <span>{slot.startTime} - {slot.endTime}</span>
                        </div>
                      ))}
                    </div>
                  )}
                  <Button
                    onClick={() => {
                      setTempAvailability(freelancer.availability || []);
                      setEditingAvailability(true);
                    }}
                    variant="outline"
                    className="w-full py-1.5 text-[10px]"
                  >
                    Edit Availability
                  </Button>
                </div>
              )
            ) : (
              /* Public / Client view */
              <div className="space-y-4">
                {/* List Slots */}
                <div className="font-mono text-xs space-y-2">
                  <span className="text-[9px] font-bold text-ink/60 uppercase tracking-wider block mb-1">Weekly Slots</span>
                  {(!freelancer.availability || freelancer.availability.length === 0) ? (
                    <p className="text-[10px] text-ink/60 italic pl-1">No slots configured.</p>
                  ) : (
                    freelancer.availability.map((slot, idx) => (
                      <div key={idx} className="flex justify-between border-b border-ink/10 pb-1 text-[10px] text-ink font-bold font-mono">
                        <span>{DAYS_OF_WEEK[slot.dayOfWeek]}</span>
                        <span>{slot.startTime} - {slot.endTime}</span>
                      </div>
                    ))
                  )}
                </div>

                {/* Booking Form */}
                {user?.role === 'client' && (
                  <form onSubmit={handleBookSlot} className="border-t border-ink/10 pt-4 space-y-3 font-sans text-left">
                    <span className="text-[9px] font-mono font-bold text-ink/60 uppercase tracking-wider block">Book a slot</span>
                    
                    {bookingSuccess && <p className="text-[10px] font-bold text-accent-teal">{bookingSuccess}</p>}
                    {bookingError && <p className="text-[10px] font-bold text-accent-coral">{bookingError}</p>}

                    <div className="space-y-1">
                      <label className="text-[9px] font-mono font-bold text-ink pl-0.5">Select Date</label>
                      <Input
                        type="date"
                        required
                        value={bookingDate}
                        onChange={e => setBookingDate(e.target.value)}
                        className="py-1 text-xs"
                      />
                    </div>

                    <div className="space-y-1">
                      <label className="text-[9px] font-mono font-bold text-ink pl-0.5">Select Active Gig</label>
                      <select
                        required
                        value={bookingGigId}
                        onChange={e => setBookingGigId(e.target.value)}
                        className="w-full px-3 py-2 bg-cream border-2 border-ink rounded-lg text-ink text-xs focus:outline-none focus:bg-accent-amber/10 focus:border-accent-amber font-sans"
                      >
                        <option value="">-- Choose Gig --</option>
                        {myGigs.map(g => (
                          <option key={g._id} value={g._id}>{g.title}</option>
                        ))}
                      </select>
                    </div>

                    <div className="grid grid-cols-2 gap-2">
                      <div className="space-y-1">
                        <label className="text-[9px] font-mono font-bold text-ink pl-0.5">Start Time</label>
                        <Input
                          type="text"
                          required
                          value={bookingStart}
                          onChange={e => setBookingStart(e.target.value)}
                          placeholder="e.g. 09:00"
                          className="py-1 text-[10px] text-center font-mono"
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="text-[9px] font-mono font-bold text-ink pl-0.5">End Time</label>
                        <Input
                          type="text"
                          required
                          value={bookingEnd}
                          onChange={e => setBookingEnd(e.target.value)}
                          placeholder="e.g. 17:00"
                          className="py-1 text-[10px] text-center font-mono"
                        />
                      </div>
                    </div>

                    <Button
                      type="submit"
                      disabled={bookingLoading || myGigs.length === 0}
                      variant="primary"
                      className="w-full py-1.5 text-[10px] mt-2"
                    >
                      {bookingLoading ? 'Requesting...' : myGigs.length === 0 ? 'No Active Gigs to Book' : 'Request Appointment'}
                    </Button>
                  </form>
                )}
              </div>
            )}
          </Card>
        </div>

        {/* Right Column: Bio, Skills, Reviews */}
        <div className="lg:col-span-2 space-y-8 text-left">
          
          {/* Bio */}
          <Card className="text-left">
            <h3 className="text-xs font-bold font-display text-ink uppercase tracking-widest mb-3 pl-1">Bio / node description</h3>
            <p className="text-sm text-ink leading-relaxed font-sans font-bold">
              {freelancer.bio || 'No bio configured on this node.'}
            </p>
          </Card>

          {/* Skills / Certs */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {/* Skills */}
            <Card className="text-left">
              <h3 className="text-xs font-bold font-display text-ink uppercase tracking-widest mb-4 pl-1">Skills Matrix</h3>
              {freelancer.skills.length === 0 ? (
                <p className="text-xs text-ink/60 font-sans pl-1 italic">No skills listed.</p>
              ) : (
                <div className="flex flex-wrap gap-2">
                  {freelancer.skills.map((s, i) => (
                    <span key={i} className="inline-flex items-center space-x-2 px-2.5 py-1.5 border-2 border-ink bg-cream rounded-lg shadow-retro-sm">
                      <span className="text-xs font-bold text-ink font-sans">{s.name}</span>
                      <Badge variant={s.level === 'Expert' ? 'teal' : s.level === 'Intermediate' ? 'amber' : 'outline'} className="shadow-none text-[8px] font-mono">
                        {s.level.substring(0, 3)}
                      </Badge>
                    </span>
                  ))}
                </div>
              )}
            </Card>

            {/* Certs */}
            <Card className="text-left">
              <h3 className="text-xs font-bold font-display text-ink uppercase tracking-widest mb-4 pl-1">Node Credentials</h3>
              {freelancer.certifications.length === 0 ? (
                <p className="text-xs text-ink/60 font-sans pl-1 italic">No credentials listed.</p>
              ) : (
                <ul className="space-y-2 font-mono">
                  {freelancer.certifications.map((c, i) => (
                    <li key={i} className="flex items-start space-x-2 text-xs text-ink font-sans">
                      <Award className="h-4 w-4 text-accent-teal flex-shrink-0 mt-0.5" />
                      <span className="font-bold">{c}</span>
                    </li>
                  ))}
                </ul>
              )}
            </Card>
          </div>

          {/* Portfolio */}
          <Card className="text-left">
            <h3 className="text-xs font-bold font-display text-ink uppercase tracking-widest mb-4 pl-1">Portfolio nodes</h3>
            {freelancer.portfolio.length === 0 ? (
              <p className="text-xs text-ink/60 font-sans pl-1 italic">No portfolio items added.</p>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {freelancer.portfolio.map((p, i) => (
                  <Card key={i} className="p-4 shadow-retro-sm">
                    <h4 className="font-bold text-ink text-sm font-display uppercase tracking-tight">{p.title}</h4>
                    <p className="text-xs text-ink/60 mt-1.5 leading-relaxed font-sans">{p.description}</p>
                    {p.link && (
                      <a href={p.link} target="_blank" rel="noopener noreferrer" className="text-[10px] font-mono text-accent-teal hover:underline font-bold uppercase block mt-3">
                        Visit project node →
                      </a>
                    )}
                  </Card>
                ))}
              </div>
            )}
          </Card>

          {/* Reviews section */}
          <Card className="text-left">
            <h3 className="text-xs font-bold font-display text-ink uppercase tracking-widest mb-4 pl-1">Community Feedback</h3>
            <ReviewList userId={freelancer._id} limit={20} />
          </Card>

        </div>

      </div>
    </div>
  );
};
