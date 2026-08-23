import { useEffect, useMemo, useRef, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { io, Socket } from 'socket.io-client';
import { api, apiErrorMessage } from '../api/client';
import type { EventItem, SeatMapEntry } from '../types';
import { useAuth } from '../context/AuthContext';
import { Seat, SeatLegendSwatch } from '../components/ui/Seat';
import { Button } from '../components/ui/Button';
import { Badge } from '../components/ui/Badge';
import { Card } from '../components/ui/Card';

const SESSION_KEY = 'booking_session_id';
function getSessionId() {
  let id = sessionStorage.getItem(SESSION_KEY);
  if (!id) {
    id = crypto.randomUUID();
    sessionStorage.setItem(SESSION_KEY, id);
  }
  return id;
}

export function EventDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const navigate = useNavigate();

  const [event, setEvent] = useState<EventItem | null>(null);
  const [seatMap, setSeatMap] = useState<SeatMapEntry[]>([]);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [holdExpiresAt, setHoldExpiresAt] = useState<Date | null>(null);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [busy, setBusy] = useState(false);
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [sheetExpanded, setSheetExpanded] = useState(false);
  const touchState = useRef<{
    mode: 'none' | 'pan' | 'pinch';
    lastX: number;
    lastY: number;
    lastDist: number;
  }>({ mode: 'none', lastX: 0, lastY: 0, lastDist: 0 });
  const socketRef = useRef<Socket | null>(null);
  const sessionId = useMemo(() => getSessionId(), []);

  useEffect(() => {
    if (!id) return;
    api.get(`/api/events/${id}`).then((res) => setEvent(res.data));
    refreshSeatMap();

    const socket = io(import.meta.env.VITE_API_URL || 'http://localhost:4000');
    socketRef.current = socket;
    socket.emit('event:subscribe', id);
    socket.on(
      'seat:update',
      (payload: { eventId: string; seats: Array<{ showSeatId: string; status: string; heldUntil: string | null }> }) => {
        if (payload.eventId !== id) return;
        setSeatMap((prev) =>
          prev.map((s) => {
            const update = payload.seats.find((u) => u.showSeatId === s.showSeatId);
            return update ? { ...s, status: update.status as any, heldUntil: update.heldUntil } : s;
          })
        );
      }
    );

    return () => {
      socket.emit('event:unsubscribe', id);
      socket.disconnect();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  function refreshSeatMap() {
    if (!id) return;
    api.get(`/api/events/${id}/seatmap`).then((res) => setSeatMap(res.data));
  }

  function toggleSeat(seat: SeatMapEntry) {
    if (seat.status !== 'AVAILABLE' && !selected.has(seat.seatId)) return;
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(seat.seatId)) next.delete(seat.seatId);
      else next.add(seat.seatId);
      return next;
    });
  }

  // ---- Touch pinch-to-zoom and pan for the theatre seat map ----
  function touchDistance(touches: React.TouchList) {
    const dx = touches[0].clientX - touches[1].clientX;
    const dy = touches[0].clientY - touches[1].clientY;
    return Math.sqrt(dx * dx + dy * dy);
  }

  function handleTouchStart(e: React.TouchEvent) {
    if (e.touches.length === 2) {
      touchState.current = { mode: 'pinch', lastX: 0, lastY: 0, lastDist: touchDistance(e.touches) };
    } else if (e.touches.length === 1) {
      touchState.current = {
        mode: 'pan',
        lastX: e.touches[0].clientX,
        lastY: e.touches[0].clientY,
        lastDist: 0,
      };
    }
  }

  function handleTouchMove(e: React.TouchEvent) {
    const state = touchState.current;
    if (state.mode === 'pinch' && e.touches.length === 2) {
      e.preventDefault();
      const dist = touchDistance(e.touches);
      const delta = dist - state.lastDist;
      setZoom((z) => Math.min(1.8, Math.max(0.6, z + delta * 0.004)));
      touchState.current = { ...state, lastDist: dist };
    } else if (state.mode === 'pan' && e.touches.length === 1) {
      const dx = e.touches[0].clientX - state.lastX;
      const dy = e.touches[0].clientY - state.lastY;
      setPan((p) => ({ x: p.x + dx, y: p.y + dy }));
      touchState.current = { ...state, lastX: e.touches[0].clientX, lastY: e.touches[0].clientY };
    }
  }

  function handleTouchEnd() {
    touchState.current = { mode: 'none', lastX: 0, lastY: 0, lastDist: 0 };
  }

  function resetView() {
    setZoom(1);
    setPan({ x: 0, y: 0 });
  }

  function buildCheckoutState(expiry: Date, seats: string[]) {
    if (!event || !id) return null;

    const seatDetails = seats.map((seatId) => {
      const seat = seatMap.find((s) => s.seatId === seatId);
      if (!seat) return null;
      return {
        seatId,
        label: seat.label,
        category: seat.category,
        price: priceByCategory.get(seat.category) || 0,
      };
    }).filter(Boolean) as { seatId: string; label: string; category: string; price: number }[];

    if (seatDetails.length === 0) return null;

    return {
      eventId: id,
      eventTitle: event.title,
      venueName: event.venue.name,
      date: event.date,
      startTime: event.startTime,
      sessionId,
      seats: seatDetails,
      holdExpiresAt: expiry.toISOString(),
    };
  }

  async function handleHold() {
    if (!user) return navigate('/login');
    if (selected.size === 0) return;
    setError('');
    setNotice('');
    setBusy(true);
    try {
      const res = await api.post(`/api/events/${id}/holds`, {
        seatIds: Array.from(selected),
        sessionId,
      });
      const expiries = res.data.holds.map((h: any) => new Date(h.expiresAt).getTime());
      const nextExpiry = new Date(Math.min(...expiries));
      setHoldExpiresAt(nextExpiry);

      const checkoutState = buildCheckoutState(nextExpiry, Array.from(selected));
      if (!checkoutState) {
        throw new Error('Your selected seats are no longer available.');
      }

      setNotice('Seats held successfully. Taking you to checkout...');
      window.setTimeout(() => {
        navigate('/checkout', { state: checkoutState });
      }, 500);
    } catch (err) {
      setError(apiErrorMessage(err));
      refreshSeatMap();
      setSelected(new Set());
    } finally {
      setBusy(false);
    }
  }

  function goToCheckout() {
    if (!holdExpiresAt || !event) return;
    const checkoutState = buildCheckoutState(holdExpiresAt, Array.from(selected));
    if (!checkoutState) return;
    navigate('/checkout', { state: checkoutState });
  }

  async function handleJoinWaitlist(category: string) {
    setError('');
    try {
      await api.post(`/api/events/${id}/waitlist`, { category });
      alert(`You're on the list for ${category}. We'll email you the moment a seat opens up.`);
    } catch (err) {
      setError(apiErrorMessage(err));
    }
  }

  if (!event) {
    return (
      <div className="mx-auto max-w-6xl px-6 py-16">
        <div className="h-8 w-64 animate-pulse rounded-lg bg-canvas-800" />
        <div className="mt-4 h-4 w-96 animate-pulse rounded-lg bg-canvas-800" />
        <div className="mt-12 h-96 animate-pulse rounded-3xl bg-canvas-800" />
      </div>
    );
  }

  const rows = Array.from(new Set(seatMap.map((s) => s.row))).sort();
  const categories = Array.from(new Set(seatMap.map((s) => s.category)));
  const priceByCategory = new Map(event.pricing.map((p) => [p.category, Number(p.price)]));

  const soldOutCategories = categories.filter(
    (cat) => !seatMap.some((s) => s.category === cat && s.status === 'AVAILABLE')
  );

  const total = Array.from(selected).reduce((sum, seatId) => {
    const seat = seatMap.find((s) => s.seatId === seatId);
    return sum + (seat ? priceByCategory.get(seat.category) || 0 : 0);
  }, 0);

  const tierOf = (category: string): 'premium' | 'standard' =>
    /premium|vip|gold/i.test(category) ? 'premium' : 'standard';

  return (
    <div className={`min-h-[calc(100vh-64px)] bg-canvas-950 ${selected.size > 0 ? 'pb-28 lg:pb-0' : ''}`}>
      {/* Cinematic header */}
      <div className="relative overflow-hidden border-b border-canvas-800 bg-gradient-to-b from-canvas-900 via-canvas-950 to-canvas-950 px-6 py-10">
        <div className="pointer-events-none absolute -top-32 left-1/2 h-64 w-[600px] -translate-x-1/2 rounded-full bg-brand-600/20 blur-[100px]" />
        <div className="relative mx-auto max-w-6xl">
          <Badge tone="brand" dot>
            {event.type === 'MOVIE' ? 'Now showing' : 'Live event'}
          </Badge>
          <h1 className="mt-3 font-display text-4xl italic text-canvas-50 sm:text-5xl">{event.title}</h1>
          <p className="mt-2 text-canvas-300">
            {event.venue.name} &middot; {new Date(event.date).toDateString()} &middot; {event.startTime}
          </p>
        </div>
      </div>

      <div className="mx-auto max-w-6xl px-6 py-10">
        <div className="grid gap-8 lg:grid-cols-[1fr_340px]">
          {/* ===== Theatre seat map ===== */}
          <Card variant="glass" className="relative overflow-hidden p-6 sm:p-10">
            {/* Zoom controls */}
            <div className="absolute right-5 top-5 z-10 flex gap-1 rounded-full border border-canvas-600 bg-canvas-900/80 p-1 backdrop-blur">
              <button
                onClick={() => setZoom((z) => Math.max(0.6, z - 0.15))}
                className="flex h-8 w-8 items-center justify-center rounded-full text-canvas-300 transition hover:bg-canvas-700 hover:text-white"
                aria-label="Zoom out"
              >
                &minus;
              </button>
              <button
                onClick={resetView}
                className="flex h-8 w-8 items-center justify-center rounded-full text-canvas-400 transition hover:bg-canvas-700 hover:text-white"
                aria-label="Reset view"
                title="Reset zoom & position"
              >
                <svg viewBox="0 0 20 20" fill="none" className="h-3.5 w-3.5">
                  <path
                    d="M4 10a6 6 0 1011.2-3M4 10V5m0 5h5"
                    stroke="currentColor"
                    strokeWidth={1.6}
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              </button>
              <button
                onClick={() => setZoom((z) => Math.min(1.8, z + 0.15))}
                className="flex h-8 w-8 items-center justify-center rounded-full text-canvas-300 transition hover:bg-canvas-700 hover:text-white"
                aria-label="Zoom in"
              >
                +
              </button>
            </div>
            <p className="absolute left-5 top-5 z-10 hidden text-[10px] text-canvas-500 sm:block">
              Scroll to pan &middot; buttons to zoom
            </p>
            <p className="absolute left-5 top-5 z-10 text-[10px] text-canvas-500 sm:hidden">
              Pinch to zoom &middot; drag to pan
            </p>

            {/* Stage / screen */}
            <div className="mx-auto mb-14 max-w-md">
              <div className="h-2 rounded-full bg-gradient-to-r from-transparent via-electric-400 to-transparent shadow-[0_0_40px_8px_rgba(46,166,255,0.45)]" />
              <p className="mt-3 text-center text-xs font-medium uppercase tracking-[0.3em] text-canvas-400">
                {event.type === 'MOVIE' ? 'Screen' : 'Stage'}
              </p>
            </div>

            {/* Curved rows */}
            <div
              className="mx-auto flex touch-none flex-col items-center gap-3 pb-2"
              onTouchStart={handleTouchStart}
              onTouchMove={handleTouchMove}
              onTouchEnd={handleTouchEnd}
              style={{
                transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`,
                transformOrigin: 'top center',
                transition: touchState.current.mode === 'none' ? 'transform 0.2s ease-out' : 'none',
              }}
            >
              {rows.map((row, rowIdx) => {
                const rowSeats = seatMap.filter((s) => s.row === row).sort((a, b) => a.column - b.column);
                const center = (rowSeats.length - 1) / 2;
                const rowScale = 0.94 + rowIdx * 0.02;
                return (
                  <div key={row} className="flex items-end gap-1.5" style={{ transform: `scale(${rowScale})` }}>
                    <span className="mr-1 w-4 text-right text-[10px] font-semibold text-canvas-500">{row}</span>
                    {rowSeats.map((seat) => {
                      const dist = seat.column - 1 - center;
                      const curveY = Math.pow(dist / Math.max(center, 1), 2) * 10;
                      const isSelected = selected.has(seat.seatId);
                      const visualStatus = isSelected ? 'selected' : (seat.status.toLowerCase() as any);
                      return (
                        <div key={seat.seatId} style={{ transform: `translateY(${curveY}px)` }}>
                          <Seat
                            status={visualStatus}
                            tier={tierOf(seat.category)}
                            label={seat.label}
                            disabled={holdExpiresAt !== null}
                            onClick={() => toggleSeat(seat)}
                          />
                        </div>
                      );
                    })}
                  </div>
                );
              })}
            </div>

            {/* Legend */}
            <div className="mt-12 flex flex-wrap items-center justify-center gap-x-6 gap-y-3 border-t border-canvas-700 pt-6 text-xs text-canvas-300">
              <LegendItem swatch={<SeatLegendSwatch status="available" tier="standard" />} label="Standard" />
              <LegendItem swatch={<SeatLegendSwatch status="available" tier="premium" />} label="Premium" />
              <LegendItem swatch={<SeatLegendSwatch status="selected" />} label="Selected" />
              <LegendItem swatch={<SeatLegendSwatch status="held" />} label="Held" />
              <LegendItem swatch={<SeatLegendSwatch status="booked" />} label="Booked" />
            </div>

            {soldOutCategories.length > 0 && (
              <div className="mt-6 flex flex-wrap gap-2">
                {soldOutCategories.map((cat) => (
                  <button
                    key={cat}
                    onClick={() => handleJoinWaitlist(cat)}
                    className="rounded-full border border-amber-500/30 bg-amber-500/10 px-4 py-2 text-xs font-medium text-amber-400 transition hover:bg-amber-500/20"
                  >
                    {cat} is sold out &middot; join the waitlist
                  </button>
                ))}
              </div>
            )}

            {error && <p className="mt-4 text-sm text-ruby-400">{error}</p>}
            {notice && <p className="mt-4 text-sm text-emerald-400">{notice}</p>}
          </Card>

          {/* ===== Floating booking summary (desktop) ===== */}
          <div className="hidden lg:sticky lg:top-24 lg:block lg:self-start">
            <Card variant="solid" glow={holdExpiresAt ? 'gold' : 'brand'} className="p-6">
              <h3 className="text-sm font-semibold uppercase tracking-wide text-canvas-400">Your selection</h3>

              {selected.size === 0 ? (
                <p className="mt-4 text-sm text-canvas-400">Tap seats on the map to build your order.</p>
              ) : (
                <ul className="mt-4 space-y-2">
                  {Array.from(selected).map((seatId) => {
                    const seat = seatMap.find((s) => s.seatId === seatId);
                    if (!seat) return null;
                    return (
                      <li key={seatId} className="flex items-center justify-between text-sm">
                        <span className="text-canvas-100">
                          {seat.label} <span className="text-canvas-400">&middot; {seat.category}</span>
                        </span>
                        <span className="font-medium text-canvas-50">
                          ${(priceByCategory.get(seat.category) || 0).toFixed(2)}
                        </span>
                      </li>
                    );
                  })}
                </ul>
              )}

              <div className="mt-5 flex items-center justify-between border-t border-canvas-700 pt-4">
                <span className="text-sm text-canvas-300">Total</span>
                <span className="font-display text-2xl italic text-canvas-50">${total.toFixed(2)}</span>
              </div>

              {holdExpiresAt && (
                <div className="mt-4">
                  <CountdownBar
                    expiresAt={holdExpiresAt}
                    onExpire={() => {
                      setHoldExpiresAt(null);
                      setSelected(new Set());
                      refreshSeatMap();
                    }}
                  />
                </div>
              )}

              <div className="mt-5">
                {!holdExpiresAt ? (
                  <Button
                    variant="primary"
                    size="lg"
                    className="w-full"
                    disabled={selected.size === 0}
                    loading={busy}
                    onClick={handleHold}
                  >
                    Hold {selected.size > 0 ? `${selected.size} seat${selected.size > 1 ? 's' : ''}` : 'seats'}
                  </Button>
                ) : (
                  <Button variant="gold" size="lg" className="w-full" onClick={goToCheckout}>
                    Continue to checkout
                  </Button>
                )}
              </div>
            </Card>
          </div>
        </div>
      </div>

      {/* ===== Booking summary bottom sheet (mobile) ===== */}
      {selected.size > 0 && (
        <div className="fixed inset-x-0 bottom-0 z-50 lg:hidden">
          <div
            className="mx-auto max-w-lg rounded-t-3xl border border-b-0 border-canvas-600 bg-canvas-900/95 shadow-[var(--shadow-float)] backdrop-blur-xl"
          >
            {/* Drag handle / tap target */}
            <button
              onClick={() => setSheetExpanded((s) => !s)}
              className="flex w-full flex-col items-center pb-1 pt-2.5"
              aria-label={sheetExpanded ? 'Collapse summary' : 'Expand summary'}
            >
              <span className="h-1 w-10 rounded-full bg-canvas-600" />
            </button>

            {sheetExpanded && (
              <div className="max-h-[45vh] overflow-y-auto px-5 pb-2 animate-[fade-in_0.2s_ease-out]">
                <h3 className="text-xs font-semibold uppercase tracking-wide text-canvas-400">Your selection</h3>
                <ul className="mt-3 space-y-2">
                  {Array.from(selected).map((seatId) => {
                    const seat = seatMap.find((s) => s.seatId === seatId);
                    if (!seat) return null;
                    return (
                      <li key={seatId} className="flex items-center justify-between text-sm">
                        <span className="text-canvas-100">
                          {seat.label} <span className="text-canvas-400">&middot; {seat.category}</span>
                        </span>
                        <span className="font-medium text-canvas-50">
                          ${(priceByCategory.get(seat.category) || 0).toFixed(2)}
                        </span>
                      </li>
                    );
                  })}
                </ul>
                {holdExpiresAt && (
                  <div className="mt-4">
                    <CountdownBar
                      expiresAt={holdExpiresAt}
                      onExpire={() => {
                        setHoldExpiresAt(null);
                        setSelected(new Set());
                        setSheetExpanded(false);
                        refreshSeatMap();
                      }}
                    />
                  </div>
                )}
              </div>
            )}

            <div className="flex items-center justify-between gap-4 border-t border-canvas-700 px-5 py-4">
              <div>
                <p className="text-xs text-canvas-400">
                  {selected.size} seat{selected.size > 1 ? 's' : ''}
                </p>
                <p className="font-display text-xl italic text-canvas-50">${total.toFixed(2)}</p>
              </div>
              {!holdExpiresAt ? (
                <Button variant="primary" size="md" loading={busy} onClick={handleHold} className="flex-1">
                  Hold seats
                </Button>
              ) : (
                <Button variant="gold" size="md" onClick={goToCheckout} className="flex-1">
                  Checkout
                </Button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function LegendItem({ swatch, label }: { swatch: React.ReactNode; label: string }) {
  return (
    <div className="flex items-center gap-2">
      {swatch}
      <span>{label}</span>
    </div>
  );
}

function CountdownBar({ expiresAt, onExpire }: { expiresAt: Date; onExpire: () => void }) {
  const total = useRef(Math.max(1, expiresAt.getTime() - Date.now()));
  const [remaining, setRemaining] = useState(Math.max(0, expiresAt.getTime() - Date.now()));

  useEffect(() => {
    const interval = setInterval(() => {
      const rem = expiresAt.getTime() - Date.now();
      setRemaining(Math.max(0, rem));
      if (rem <= 0) {
        clearInterval(interval);
        onExpire();
      }
    }, 1000);
    return () => clearInterval(interval);
  }, [expiresAt, onExpire]);

  const mins = Math.floor(remaining / 60000);
  const secs = Math.floor((remaining % 60000) / 1000);
  const pct = Math.max(0, Math.min(100, (remaining / total.current) * 100));
  const isUrgent = remaining < 60000;

  return (
    <div>
      <div className="mb-1.5 flex items-center justify-between text-xs">
        <span className={isUrgent ? 'font-semibold text-ruby-400' : 'text-amber-400'}>
          Seats held &middot; {mins}:{secs.toString().padStart(2, '0')} left
        </span>
      </div>
      <div className="h-1.5 w-full overflow-hidden rounded-full bg-canvas-700">
        <div
          className={`h-full rounded-full transition-all duration-1000 ease-linear ${
            isUrgent ? 'bg-ruby-500' : 'bg-gradient-to-r from-gold-400 to-amber-500'
          }`}
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}
