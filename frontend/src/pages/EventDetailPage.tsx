import { useEffect, useMemo, useRef, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { io, Socket } from 'socket.io-client';
import { api, apiErrorMessage } from '../api/client';
import type { EventItem, SeatMapEntry } from '../types';
import { useAuth } from '../context/AuthContext';

const SESSION_KEY = 'booking_session_id';
function getSessionId() {
  let id = sessionStorage.getItem(SESSION_KEY);
  if (!id) {
    id = crypto.randomUUID();
    sessionStorage.setItem(SESSION_KEY, id);
  }
  return id;
}

const statusColor: Record<string, string> = {
  AVAILABLE: 'bg-emerald-100 border-emerald-400 hover:bg-emerald-200 cursor-pointer',
  HELD: 'bg-amber-200 border-amber-400 cursor-not-allowed opacity-70',
  BOOKED: 'bg-slate-300 border-slate-400 cursor-not-allowed opacity-70',
  SELECTED: 'bg-indigo-500 border-indigo-700 text-white cursor-pointer',
};

export function EventDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const navigate = useNavigate();

  const [event, setEvent] = useState<EventItem | null>(null);
  const [seatMap, setSeatMap] = useState<SeatMapEntry[]>([]);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [holdExpiresAt, setHoldExpiresAt] = useState<Date | null>(null);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const socketRef = useRef<Socket | null>(null);
  const sessionId = useMemo(() => getSessionId(), []);

  useEffect(() => {
    if (!id) return;
    api.get(`/api/events/${id}`).then((res) => setEvent(res.data));
    refreshSeatMap();

    const socket = io(import.meta.env.VITE_API_URL || 'http://localhost:4000');
    socketRef.current = socket;
    socket.emit('event:subscribe', id);
    socket.on('seat:update', (payload: { eventId: string; seats: Array<{ showSeatId: string; status: string; heldUntil: string | null }> }) => {
      if (payload.eventId !== id) return;
      setSeatMap((prev) =>
        prev.map((s) => {
          const update = payload.seats.find((u) => u.showSeatId === s.showSeatId);
          return update ? { ...s, status: update.status as any, heldUntil: update.heldUntil } : s;
        })
      );
    });

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

  async function handleHold() {
    if (!user) return navigate('/login');
    if (selected.size === 0) return;
    setError('');
    setBusy(true);
    try {
      const res = await api.post(`/api/events/${id}/holds`, {
        seatIds: Array.from(selected),
        sessionId,
      });
      const expiries = res.data.holds.map((h: any) => new Date(h.expiresAt).getTime());
      setHoldExpiresAt(new Date(Math.min(...expiries)));
    } catch (err) {
      setError(apiErrorMessage(err));
      refreshSeatMap();
      setSelected(new Set());
    } finally {
      setBusy(false);
    }
  }

  async function handleConfirmBooking() {
    setBusy(true);
    setError('');
    try {
      await api.post(`/api/events/${id}/bookings`, { seatIds: Array.from(selected), sessionId });
      navigate('/bookings');
    } catch (err) {
      setError(apiErrorMessage(err));
      refreshSeatMap();
    } finally {
      setBusy(false);
    }
  }

  async function handleJoinWaitlist(category: string) {
    setError('');
    try {
      await api.post(`/api/events/${id}/waitlist`, { category });
      alert(`You've joined the waitlist for ${category}. We'll email you when a seat opens up.`);
    } catch (err) {
      setError(apiErrorMessage(err));
    }
  }

  if (!event) return <div className="p-6">Loading event...</div>;

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

  return (
    <div className="max-w-4xl mx-auto p-6">
      <h1 className="text-2xl font-bold">{event.title}</h1>
      <p className="text-slate-600">
        {event.venue.name} · {new Date(event.date).toDateString()} · {event.startTime}
      </p>

      <div className="mt-6 bg-white rounded-lg shadow p-6 border">
        <div className="flex gap-4 mb-4 text-sm">
          <Legend color={statusColor.AVAILABLE} label="Available" />
          <Legend color={statusColor.SELECTED} label="Selected" />
          <Legend color={statusColor.HELD} label="Held" />
          <Legend color={statusColor.BOOKED} label="Booked" />
        </div>

        <div className="space-y-2 overflow-x-auto">
          {rows.map((row) => (
            <div key={row} className="flex items-center gap-2">
              <span className="w-6 text-sm text-slate-500">{row}</span>
              <div className="flex gap-1.5">
                {seatMap
                  .filter((s) => s.row === row)
                  .sort((a, b) => a.column - b.column)
                  .map((seat) => {
                    const isSelected = selected.has(seat.seatId);
                    const cls = isSelected ? statusColor.SELECTED : statusColor[seat.status];
                    return (
                      <button
                        key={seat.seatId}
                        title={`${seat.label} · ${seat.category}`}
                        onClick={() => toggleSeat(seat)}
                        disabled={holdExpiresAt !== null}
                        className={`w-8 h-8 text-[10px] rounded border flex items-center justify-center ${cls}`}
                      >
                        {seat.column}
                      </button>
                    );
                  })}
              </div>
            </div>
          ))}
        </div>

        {soldOutCategories.length > 0 && (
          <div className="mt-4 text-sm">
            {soldOutCategories.map((cat) => (
              <button
                key={cat}
                onClick={() => handleJoinWaitlist(cat)}
                className="mr-2 mb-2 text-amber-700 bg-amber-50 border border-amber-300 rounded px-3 py-1 hover:bg-amber-100"
              >
                {cat} sold out — join waitlist
              </button>
            ))}
          </div>
        )}

        {error && <p className="text-red-600 text-sm mt-3">{error}</p>}

        <div className="mt-6 flex items-center justify-between border-t pt-4">
          <div>
            <p className="text-sm text-slate-600">{selected.size} seat(s) selected</p>
            <p className="font-semibold">Total: ${total.toFixed(2)}</p>
            {holdExpiresAt && <CountdownTimer expiresAt={holdExpiresAt} onExpire={() => { setHoldExpiresAt(null); setSelected(new Set()); refreshSeatMap(); }} />}
          </div>
          {!holdExpiresAt ? (
            <button
              onClick={handleHold}
              disabled={selected.size === 0 || busy}
              className="bg-indigo-600 text-white px-5 py-2 rounded disabled:opacity-40"
            >
              {busy ? 'Holding...' : 'Hold seats'}
            </button>
          ) : (
            <button onClick={handleConfirmBooking} disabled={busy} className="bg-emerald-600 text-white px-5 py-2 rounded disabled:opacity-40">
              {busy ? 'Booking...' : 'Confirm & Pay'}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

function Legend({ color, label }: { color: string; label: string }) {
  return (
    <div className="flex items-center gap-1.5">
      <span className={`w-3.5 h-3.5 rounded border inline-block ${color.split(' ')[0]} ${color.split(' ')[1]}`} />
      <span className="text-slate-600">{label}</span>
    </div>
  );
}

function CountdownTimer({ expiresAt, onExpire }: { expiresAt: Date; onExpire: () => void }) {
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

  return (
    <p className="text-xs text-amber-700 mt-1">
      Held — complete checkout within {mins}:{secs.toString().padStart(2, '0')}
    </p>
  );
}
