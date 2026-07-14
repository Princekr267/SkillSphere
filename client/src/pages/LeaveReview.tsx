import React, { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { StarRating } from '../components/StarRating';
import api from '../utils/api';
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
    <div className="max-w-xl mx-auto px-4 py-12 flex-grow bg-paper font-sans">
      <button
        onClick={() => navigate(-1)}
        className="flex items-center space-x-1.5 text-xs text-slate hover:text-ink transition-colors mb-8 font-bold font-display uppercase tracking-wider"
      >
        <ArrowLeft className="h-3.5 w-3.5" />
        <span>Back</span>
      </button>

      <div className="bg-white border border-line-gray rounded-sm p-8">
        <span className="text-[10px] font-mono text-slate uppercase tracking-widest block mb-1">Post-Gig Feedback</span>
        <h1 className="text-xl font-black font-display text-ink uppercase tracking-tight mb-6">
          Leave a Review
        </h1>

        {done ? (
          <div className="flex flex-col items-center py-8 space-y-4">
            <CheckCircle2 className="h-12 w-12 text-route-teal" />
            <p className="text-sm font-sans text-ink text-center max-w-xs">
              Your review has been submitted. Ratings help the community find reliable professionals.
            </p>
            <button
              onClick={() => navigate(-2)}
              className="px-5 py-2.5 rounded-sm bg-route-teal text-white text-xs font-bold font-display uppercase tracking-widest hover:bg-route-teal/90"
            >
              Back to Dashboard
            </button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Star picker */}
            <div className="space-y-2">
              <label className="text-[10px] font-bold font-display uppercase tracking-widest text-ink block">
                Your Rating *
              </label>
              <StarRating value={rating} onChange={setRating} size="lg" />
              {rating > 0 && (
                <p className="text-[10px] font-mono text-slate">
                  {['', 'Poor', 'Fair', 'Good', 'Very Good', 'Excellent'][rating]}
                </p>
              )}
            </div>

            {/* Comment */}
            <div className="space-y-1.5">
              <label className="text-[10px] font-bold font-display uppercase tracking-widest text-ink block">
                Your Comments (optional)
              </label>
              <textarea
                rows={5}
                value={comment}
                onChange={e => setComment(e.target.value)}
                placeholder="Describe your experience working with this person…"
                maxLength={1000}
                className="w-full px-4 py-3 rounded-sm bg-paper/30 border border-line-gray text-ink text-sm font-sans resize-none focus:outline-none focus:border-route-teal"
              />
              <p className="text-[10px] font-mono text-slate text-right">{comment.length}/1000</p>
            </div>

            {/* Alert */}
            {msg && (
              <div className={`p-3 rounded-sm border-l-4 text-xs flex items-center space-x-2 ${
                msg.type === 'success' ? 'border-l-route-teal bg-route-teal/5 text-ink' : 'border-l-signal-coral bg-signal-coral/5 text-ink'
              }`}>
                {msg.type === 'success'
                  ? <CheckCircle2 className="h-4 w-4 text-route-teal flex-shrink-0" />
                  : <AlertCircle className="h-4 w-4 text-signal-coral flex-shrink-0" />}
                <span>{msg.text}</span>
              </div>
            )}

            <button
              type="submit"
              disabled={submitting || rating === 0}
              className="w-full flex items-center justify-center space-x-2 py-3 rounded-sm bg-signal-coral hover:bg-signal-coral/90 text-white text-xs font-bold font-display uppercase tracking-widest disabled:opacity-50 transition-colors"
            >
              <Send className="h-4 w-4" />
              <span>{submitting ? 'Submitting…' : 'Submit Review'}</span>
            </button>
          </form>
        )}
      </div>
    </div>
  );
};
