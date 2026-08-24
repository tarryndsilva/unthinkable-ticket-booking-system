import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../api/client';
import type { EventItem } from '../types';
import { Badge } from '../components/ui/Badge';
import { RatingStars } from '../components/ui/RatingStars';
import { FavoriteButton } from '../components/ui/FavoriteButton';
import { SkeletonEventCard } from '../components/ui/Skeleton';
import { posterGradient } from '../lib/poster';
import { useAuth } from '../context/AuthContext';

export function EventsPage() {
  const { user } = useAuth();
  const [events, setEvents] = useState<EventItem[]>([]);
  const [type, setType] = useState<string>('');
  const [city, setCity] = useState<string>('');
  const [cities, setCities] = useState<string[]>([]);
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [favoriteIds, setFavoriteIds] = useState<Set<string>>(new Set());

  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(search), 350);
    return () => clearTimeout(t);
  }, [search]);

  useEffect(() => {
    api.get('/api/events/cities').then((res) => setCities(res.data));
  }, []);

  useEffect(() => {
    setLoading(true);
    api
      .get('/api/events', {
        params: {
          ...(type ? { type } : {}),
          ...(city ? { city } : {}),
          ...(debouncedSearch ? { search: debouncedSearch } : {}),
        },
      })
      .then((res) => setEvents(res.data))
      .finally(() => setLoading(false));
  }, [type, city, debouncedSearch]);

  useEffect(() => {
    if (!user) {
      setFavoriteIds(new Set());
      return;
    }
    api.get('/api/favorites/ids').then((res) => setFavoriteIds(new Set(res.data)));
  }, [user]);

  async function toggleFavorite(eventId: string) {
    if (!user) return;
    const isFav = favoriteIds.has(eventId);
    setFavoriteIds((prev) => {
      const next = new Set(prev);
      isFav ? next.delete(eventId) : next.add(eventId);
      return next;
    });
    try {
      if (isFav) await api.delete(`/api/events/${eventId}/favorite`);
      else await api.post(`/api/events/${eventId}/favorite`);
    } catch {
      // revert on failure
      setFavoriteIds((prev) => {
        const next = new Set(prev);
        isFav ? next.add(eventId) : next.delete(eventId);
        return next;
      });
    }
  }

  const featured = !search && !type && !city ? events[0] : undefined;
  const rest = featured ? events.slice(1) : events;

  return (
    <div className="min-h-[calc(100vh-64px)] bg-canvas-950">
      {/* ===== Hero ===== */}
      <div className="relative overflow-hidden border-b border-canvas-800">
        <div className="pointer-events-none absolute -top-40 left-1/2 h-[420px] w-[900px] -translate-x-1/2 rounded-full bg-brand-600/25 blur-[120px]" />
        <div className="pointer-events-none absolute right-0 top-20 h-72 w-72 rounded-full bg-electric-500/15 blur-[100px]" />
        <div className="relative mx-auto max-w-6xl px-6 pb-16 pt-20 sm:pb-24 sm:pt-28">
          <Badge tone="brand" dot>
            Live seat availability, updated in real time
          </Badge>
          <h1 className="mt-5 max-w-2xl font-display text-5xl italic leading-[1.05] text-canvas-50 sm:text-6xl">
            Every seat,
            <br />
            <span className="bg-gradient-to-r from-brand-300 via-electric-300 to-violet-300 bg-clip-text text-transparent">
              beautifully booked.
            </span>
          </h1>
          <p className="mt-5 max-w-lg text-base text-canvas-300 sm:text-lg">
            Browse movies and concerts, pick your seat from a live theatre map, and get a ticket
            worth screenshotting.
          </p>

          <div className="mt-8 flex max-w-2xl flex-col gap-3 sm:flex-row">
            <div className="relative flex-1">
              <svg viewBox="0 0 20 20" fill="none" className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-canvas-400">
                <circle cx="9" cy="9" r="6.5" stroke="currentColor" strokeWidth={1.6} />
                <path d="M18 18l-4-4" stroke="currentColor" strokeWidth={1.6} strokeLinecap="round" />
              </svg>
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search movies, concerts, artists..."
                className="w-full rounded-full border border-canvas-600 bg-canvas-900/80 py-3 pl-11 pr-4 text-sm text-canvas-50 backdrop-blur placeholder:text-canvas-500 focus:border-brand-400 focus:outline-none focus:ring-2 focus:ring-brand-500/25"
              />
            </div>
            {cities.length > 1 && (
              <div className="relative">
                <svg viewBox="0 0 20 20" fill="none" className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-canvas-400">
                  <path
                    d="M10 18s6-5.2 6-9.6A6 6 0 004 8.4C4 12.8 10 18 10 18z"
                    stroke="currentColor"
                    strokeWidth={1.6}
                    strokeLinejoin="round"
                  />
                  <circle cx="10" cy="8.4" r="2" stroke="currentColor" strokeWidth={1.6} />
                </svg>
                <select
                  value={city}
                  onChange={(e) => setCity(e.target.value)}
                  className="w-full rounded-full border border-canvas-600 bg-canvas-900/80 py-3 pl-11 pr-8 text-sm text-canvas-50 backdrop-blur focus:border-brand-400 focus:outline-none focus:ring-2 focus:ring-brand-500/25 sm:w-48"
                >
                  <option value="">All cities</option>
                  {cities.map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </select>
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-6xl px-6 py-12">
        <div className="mb-8 flex items-center justify-between">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-canvas-400">
            {search ? `Results for \u201c${search}\u201d` : type ? (type === 'MOVIE' ? 'Movies' : 'Concerts') : 'What\u2019s on'}
          </h2>
          <div className="flex gap-1 rounded-full border border-canvas-700 bg-canvas-900 p-1">
            {[
              { v: '', label: 'All' },
              { v: 'MOVIE', label: 'Movies' },
              { v: 'CONCERT', label: 'Concerts' },
            ].map((opt) => (
              <button
                key={opt.v}
                onClick={() => setType(opt.v)}
                className={`rounded-full px-4 py-1.5 text-sm font-medium transition-all ${
                  type === opt.v ? 'bg-canvas-700 text-white shadow-sm' : 'text-canvas-400 hover:text-canvas-200'
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>

        {loading ? (
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {Array.from({ length: 6 }).map((_, i) => (
              <SkeletonEventCard key={i} />
            ))}
          </div>
        ) : events.length === 0 ? (
          <p className="py-20 text-center text-canvas-400">No events found. Try a different search.</p>
        ) : (
          <>
            {featured && (
              <Link
                to={`/events/${featured.id}`}
                className="group relative mb-10 block overflow-hidden rounded-3xl border border-canvas-700 shadow-[var(--shadow-card)] transition-all duration-300 hover:-translate-y-1 hover:shadow-[var(--shadow-card-hover)]"
              >
                <div
                  className="relative flex min-h-[280px] flex-col justify-end p-8 sm:min-h-[340px] sm:p-10"
                  style={posterGradient(featured.title)}
                >
                  <div className="absolute inset-0 bg-gradient-to-t from-canvas-950/90 via-canvas-950/20 to-transparent" />
                  {user && (
                    <div className="absolute right-5 top-5 z-10">
                      <FavoriteButton active={favoriteIds.has(featured.id)} onToggle={() => toggleFavorite(featured.id)} />
                    </div>
                  )}
                  <div className="relative">
                    <div className="flex items-center gap-3">
                      <Badge tone="gold" dot>
                        Featured
                      </Badge>
                      <RatingStars rating={featured.avgRating} count={featured.reviewCount} />
                    </div>
                    <h3 className="mt-3 font-display text-3xl italic text-white sm:text-4xl">{featured.title}</h3>
                    <p className="mt-2 text-sm text-canvas-200">
                      {featured.venue?.name} &middot; {new Date(featured.date).toDateString()} &middot;{' '}
                      {featured.startTime}
                    </p>
                    <div className="mt-4 flex flex-wrap gap-2">
                      {featured.pricing?.map((p) => (
                        <span
                          key={p.category}
                          className="rounded-full border border-white/15 bg-white/5 px-3 py-1 text-xs text-white backdrop-blur"
                        >
                          {p.category} from ${Number(p.price).toFixed(0)}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>
              </Link>
            )}

            <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
              {rest.map((ev, i) => (
                <Link
                  key={ev.id}
                  to={`/events/${ev.id}`}
                  className="group relative animate-[fade-up_0.5s_cubic-bezier(0.16,1,0.3,1)_both] overflow-hidden rounded-2xl border border-canvas-700 bg-canvas-850 shadow-[var(--shadow-card)] transition-all duration-300 hover:-translate-y-1.5 hover:border-canvas-500 hover:shadow-[var(--shadow-card-hover)]"
                  style={{ animationDelay: `${i * 50}ms` }}
                >
                  <div className="relative aspect-[4/3] overflow-hidden" style={posterGradient(ev.title)}>
                    <div className="absolute inset-0 bg-gradient-to-t from-canvas-900/80 via-transparent to-transparent transition-opacity duration-300 group-hover:from-canvas-900/60" />
                    <div className="absolute left-3 top-3">
                      <Badge tone={ev.type === 'MOVIE' ? 'brand' : 'violet'}>{ev.type}</Badge>
                    </div>
                    {user && (
                      <div className="absolute right-3 top-3">
                        <FavoriteButton size="sm" active={favoriteIds.has(ev.id)} onToggle={() => toggleFavorite(ev.id)} />
                      </div>
                    )}
                  </div>
                  <div className="p-4">
                    <div className="flex items-center justify-between gap-2">
                      <h3 className="line-clamp-1 font-semibold text-canvas-50 transition-colors group-hover:text-brand-300">
                        {ev.title}
                      </h3>
                      <RatingStars rating={ev.avgRating} />
                    </div>
                    <p className="mt-1 line-clamp-1 text-sm text-canvas-400">{ev.venue?.name}</p>
                    <div className="mt-2 flex items-center justify-between">
                      <p className="text-xs text-canvas-500">
                        {new Date(ev.date).toDateString()} &middot; {ev.startTime}
                      </p>
                      {ev.pricing?.[0] && (
                        <p className="text-sm font-semibold text-canvas-100">
                          ${Math.min(...ev.pricing.map((p) => Number(p.price))).toFixed(0)}+
                        </p>
                      )}
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
