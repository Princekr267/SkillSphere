import React, { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { StarRating } from '../components/StarRating';
import api from '../utils/api';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { ArrowLeft, CheckCircle2, AlertCircle, Send } from 'lucide-react';

export const LeaveReview: React.FC = () => {
  const { gigId, revieweeId } = useParams<{ gigId: string; revieweeId: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();

  const [rating, setRating] = useState(0);
  const [comment, setComment] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [msg, setMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [done, setDone] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (rating === 0) { setMsg({ type: 'error', text: 'Please select a star rating.' }); return; }

    setSubmitting(true);
    setMsg(null);
    try {
      await api.post('/reviews', { gigId, revieweeId, rating, comment });
      setMsg({ type: 'success', text: 'Review submitted! Thank you for your feedback.' });
      setDone(true);
    } catch (err: any) {
      setMsg({ type: 'error', text: err.response?.data?.message || 'Could not submit review.' });
    } finally {
      setSubmitting(false);
    }
  };

  if (!user) return null;

  return (
    <div className="max-w-xl mx-auto px-4 py-12 flex-grow bg-cream font-sans animate-fade-in transition-colors duration-200">
      
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

      <Card className="p-8 text-left">
        <span className="text-[10px] font-mono text-ink/60 uppercase tracking-widest block mb-1">Post-Gig Feedback</span>
        <h1 className="text-xl font-black font-display text-ink uppercase tracking-tight mb-6">
          Leave a Review
        </h1>

        {done ? (
          <div className="flex flex-col items-center py-8 space-y-4 font-sans text-center">
            <CheckCircle2 className="h-12 w-12 text-accent-teal" />
            <p className="text-sm font-sans text-ink leading-relaxed font-bold max-w-xs">
              Your review has been submitted. Ratings help the community find reliable professionals.
            </p>
            <Button
              onClick={() => navigate(-2)}
              variant="secondary"
              className="px-5 py-2.5"
            >
              Back to Dashboard
            </Button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-6 font-sans">
            {/* Star picker */}
            <div className="space-y-2">
              <label className="text-[10px] font-bold font-display uppercase tracking-widest text-ink block pl-1">
                Your Rating *
              </label>
              <div className="pl-1">
                <StarRating value={rating} onChange={setRating} size="lg" />
              </div>
              {rating > 0 && (
                <p className="text-[10px] font-mono text-ink/60 pl-1 font-bold">
                  {['', 'Poor', 'Fair', 'Good', 'Very Good', 'Excellent'][rating]}
                </p>
              )}
            </div>

            {/* Comment */}
            <div className="space-y-1.5">
              <label className="text-[10px] font-bold font-display uppercase tracking-widest text-ink block pl-1">
                Your Comments (optional)
              </label>
              <textarea
                rows={5}
                value={comment}
                onChange={e => setComment(e.target.value)}
                placeholder="Describe your experience working with this person…"
                maxLength={1000}
                className="w-full px-4 py-3 bg-cream border-2 border-ink rounded-lg text-ink text-sm font-sans resize-none focus:outline-none focus:bg-accent-amber/10 focus:border-accent-amber"
              />
              <p className="text-[10px] font-mono text-ink/60 text-right">{comment.length}/1000</p>
            </div>

            {/* Alert */}
            {msg && (
              <div className={`p-3 border-2 border-ink text-xs flex items-center space-x-2 rounded-lg ${
                msg.type === 'success' ? 'border-l-4 border-l-accent-teal bg-cream text-ink' : 'border-l-4 border-l-accent-coral bg-cream text-ink'
              }`}>
                {msg.type === 'success'
                  ? <CheckCircle2 className="h-4 w-4 text-accent-teal flex-shrink-0" />
                  : <AlertCircle className="h-4 w-4 text-accent-coral flex-shrink-0" />}
                <span>{msg.text}</span>
              </div>
            )}

            <Button
              type="submit"
              disabled={submitting || rating === 0}
              variant="coral"
              className="w-full"
            >
              <Send className="h-4 w-4 mr-2" />
              <span>{submitting ? 'Submitting…' : 'Submit Review'}</span>
            </Button>
          </form>
        )}
      </Card>
    </div>
  );
};
