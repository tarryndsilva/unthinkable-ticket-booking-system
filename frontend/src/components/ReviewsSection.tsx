import { useEffect, useState } from 'react';
import { api, apiErrorMessage } from '../api/client';
import type { Review } from '../types';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { RatingStars } from '../components/ui/RatingStars';
import { useAuth } from '../context/AuthContext';

export function ReviewsSection({ eventId }: { eventId: string }) {
  const { user } = useAuth();
  const [reviews, setReviews] = useState<Review[]>([]);
  const [avgRating, setAvgRating] = useState<number | null>(null);
  const [count, setCount] = useState(0);
  const [showForm, setShowForm] = useState(false);
  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  function refresh() {
    api.get(`/api/events/${eventId}/reviews`).then((res) => {
      setReviews(res.data.reviews);
      setAvgRating(res.data.avgRating);
      setCount(res.data.count);
    });
  }

  useEffect(refresh, [eventId]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setBusy(true);
    try {
      await api.post(`/api/events/${eventId}/reviews`, { rating, comment: comment || undefined });
      setShowForm(false);
      setComment('');
      refresh();
    } catch (err) {
      setError(apiErrorMessage(err));
    } finally {
      setBusy(false);
    }
  }

  const myReview = reviews.find((r) => r.customer.id === user?.id);

  return (
    <div>
      <div className="mb-5 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <h2 className="font-display text-2xl italic text-canvas-50">Reviews</h2>
          {avgRating !== null && <RatingStars rating={avgRating} count={count} size="md" />}
        </div>
        {user?.role === 'CUSTOMER' && !myReview && (
          <Button variant="secondary" size="sm" onClick={() => setShowForm((s) => !s)}>
            {showForm ? 'Cancel' : 'Write a review'}
          </Button>
        )}
      </div>

      {showForm && (
        <Card variant="glass" className="mb-6 animate-[fade-up_0.25s_ease-out] p-5">
          <form onSubmit={handleSubmit} className="space-y-3">
            <div>
              <p className="mb-1.5 text-sm font-medium text-canvas-200">Your rating</p>
              <div className="flex gap-1">
                {[1, 2, 3, 4, 5].map((n) => (
                  <button
                    key={n}
                    type="button"
                    onClick={() => setRating(n)}
                    className="p-0.5"
                    aria-label={`${n} star${n > 1 ? 's' : ''}`}
                  >
                    <svg
                      viewBox="0 0 20 20"
                      fill={n <= rating ? 'currentColor' : 'none'}
                      stroke="currentColor"
                      strokeWidth={1.4}
                      className={`h-6 w-6 transition-colors ${n <= rating ? 'text-gold-400' : 'text-canvas-600'}`}
                    >
                      <path d="M9.05 2.927c.3-.921 1.603-.921 1.902 0l1.286 3.958a1 1 0 00.95.69h4.162c.969 0 1.371 1.24.588 1.81l-3.368 2.447a1 1 0 00-.364 1.118l1.287 3.957c.3.922-.755 1.688-1.538 1.118l-3.367-2.447a1 1 0 00-1.176 0l-3.367 2.447c-.783.57-1.838-.196-1.538-1.118l1.287-3.957a1 1 0 00-.364-1.118L2.062 9.385c-.783-.57-.38-1.81.588-1.81h4.163a1 1 0 00.95-.69l1.286-3.958z" />
                    </svg>
                  </button>
                ))}
              </div>
            </div>
            <textarea
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              placeholder="Share your experience (optional)"
              rows={3}
              className="w-full rounded-xl border border-canvas-600 bg-canvas-850 px-4 py-2.5 text-sm text-canvas-50 placeholder:text-canvas-500 focus:border-brand-400 focus:outline-none focus:ring-2 focus:ring-brand-500/25"
            />
            {error && <p className="text-sm text-ruby-400">{error}</p>}
            <Button type="submit" variant="primary" size="sm" loading={busy}>
              Submit review
            </Button>
          </form>
        </Card>
      )}

      {reviews.length === 0 ? (
        <p className="text-sm text-canvas-400">No reviews yet. Be the first to share your experience.</p>
      ) : (
        <div className="space-y-3">
          {reviews.map((r) => (
            <Card key={r.id} variant="solid" className="p-4">
              <div className="flex items-center justify-between">
                <p className="text-sm font-medium text-canvas-100">{r.customer.name}</p>
                <RatingStars rating={r.rating} />
              </div>
              {r.comment && <p className="mt-1.5 text-sm text-canvas-300">{r.comment}</p>}
              <p className="mt-1.5 text-xs text-canvas-500">{new Date(r.createdAt).toLocaleDateString()}</p>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
