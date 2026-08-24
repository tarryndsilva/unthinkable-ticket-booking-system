import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../api/client';
import type { EventItem } from '../types';
import { Badge } from '../components/ui/Badge';
import { FavoriteButton } from '../components/ui/FavoriteButton';
import { RatingStars } from '../components/ui/RatingStars';
import { SkeletonEventCard } from '../components/ui/Skeleton';
import { Card } from '../components/ui/Card';
import { posterGradient } from '../lib/poster';

export function WishlistPage() {
  const [events, setEvents] = useState<EventItem[]>([]);
  const [loading, setLoading] = useState(true);

  function refresh() {
    setLoading(true);
    api
      .get('/api/favorites')
      .then((res) => setEvents(res.data))
      .finally(() => setLoading(false));
  }

  useEffect(refresh, []);

  async function removeFavorite(eventId: string) {
    setEvents((prev) => prev.filter((e) => e.id !== eventId));
    try {
      await api.delete(`/api/events/${eventId}/favorite`);
    } catch {
      refresh();
    }
  }

  return (
    <div className="min-h-[calc(100vh-64px)] bg-canvas-950">
      <div className="mx-auto max-w-5xl px-6 py-12">
        <h1 className="font-display text-3xl italic text-canvas-50">Your wishlist</h1>
        <p className="mt-1 text-sm text-canvas-400">Events you&rsquo;ve saved for later.</p>

        <div className="mt-8">
          {loading ? (
            <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
              <SkeletonEventCard />
              <SkeletonEventCard />
            </div>
          ) : events.length === 0 ? (
            <Card variant="outline" className="p-10 text-center">
              <p className="text-sm text-canvas-400">
                Nothing saved yet. Tap the heart icon on any event to add it here.
              </p>
              <Link to="/" className="mt-3 inline-block text-sm font-medium text-brand-300 hover:text-brand-200">
                Browse events &rarr;
              </Link>
            </Card>
          ) : (
            <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
              {events.map((ev, i) => (
                <Link
                  key={ev.id}
                  to={`/events/${ev.id}`}
                  className="group relative animate-[fade-up_0.4s_cubic-bezier(0.16,1,0.3,1)_both] overflow-hidden rounded-2xl border border-canvas-700 bg-canvas-850 shadow-[var(--shadow-card)] transition-all duration-300 hover:-translate-y-1.5 hover:border-canvas-500"
                  style={{ animationDelay: `${i * 50}ms` }}
                >
                  <div className="relative aspect-[4/3] overflow-hidden" style={posterGradient(ev.title)}>
                    <div className="absolute inset-0 bg-gradient-to-t from-canvas-900/80 via-transparent to-transparent" />
                    <div className="absolute left-3 top-3">
                      <Badge tone={ev.type === 'MOVIE' ? 'brand' : 'violet'}>{ev.type}</Badge>
                    </div>
                    <div className="absolute right-3 top-3">
                      <FavoriteButton size="sm" active onToggle={() => removeFavorite(ev.id)} />
                    </div>
                  </div>
                  <div className="p-4">
                    <div className="flex items-center justify-between gap-2">
                      <h3 className="line-clamp-1 font-semibold text-canvas-50 group-hover:text-brand-300">{ev.title}</h3>
                      <RatingStars rating={ev.avgRating} />
                    </div>
                    <p className="mt-1 line-clamp-1 text-sm text-canvas-400">{ev.venue?.name}</p>
                    <p className="mt-2 text-xs text-canvas-500">
                      {new Date(ev.date).toDateString()} &middot; {ev.startTime}
                    </p>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
