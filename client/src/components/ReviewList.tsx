import React, { useEffect, useState } from 'react';
import api from '../utils/api';
import { StarRating } from './StarRating';
import { User, MessageSquare } from 'lucide-react';

interface Review {
  _id: string;
  rating: number;
  comment?: string;
  createdAt: string;
  reviewerId: { _id: string; name: string; role: string };
  gigId: { _id: string; title: string };
}

interface ReviewListProps {
  userId: string;
  limit?: number;
}

export const ReviewList: React.FC<ReviewListProps> = ({ userId, limit = 5 }) => {
  const [reviews, setReviews] = useState<Review[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get(`/reviews/user/${userId}`)
      .then(r => setReviews(r.data.reviews?.slice(0, limit) ?? []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [userId, limit]);

  if (loading) return <div className="text-[10px] font-mono text-slate animate-pulse">Loading reviews…</div>;
  if (reviews.length === 0) return <div className="text-[10px] font-mono text-slate">No reviews yet.</div>;

  return (
    <div className="space-y-3">
      {reviews.map(r => (
        <div key={r._id} className="border border-line-gray rounded-sm p-3 bg-paper/30">
          <div className="flex items-center justify-between mb-1">
            <div className="flex items-center space-x-2">
              <User className="h-3 w-3 text-slate" />
              <span className="text-[11px] font-bold text-ink uppercase font-display">{r.reviewerId?.name}</span>
              <span className="text-[10px] font-mono text-slate">· {r.reviewerId?.role}</span>
            </div>
            <StarRating value={r.rating} size="sm" />
          </div>
          {r.comment && (
            <p className="text-xs text-ink font-sans leading-relaxed flex items-start space-x-1.5 mt-1">
              <MessageSquare className="h-3 w-3 text-slate flex-shrink-0 mt-0.5" />
              <span>{r.comment}</span>
            </p>
          )}
          <p className="text-[10px] font-mono text-slate/60 mt-1">
            {new Date(r.createdAt).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
            {r.gigId?.title && <> · {r.gigId.title}</>}
          </p>
        </div>
      ))}
    </div>
  );
};
