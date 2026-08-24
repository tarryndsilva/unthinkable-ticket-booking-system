import { useEffect, useRef, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { api, apiErrorMessage } from '../api/client';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Badge } from '../components/ui/Badge';
import { Input } from '../components/ui/Input';
import { posterGradient } from '../lib/poster';

interface CheckoutState {
  eventId: string;
  eventTitle: string;
  venueName: string;
  date: string;
  startTime: string;
  sessionId: string;
  seats: { seatId: string; label: string; category: string; price: number }[];
  holdExpiresAt: string;
}

export function CheckoutPage() {
  const location = useLocation();
  const navigate = useNavigate();
  const state = location.state as CheckoutState | undefined;

  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [couponInput, setCouponInput] = useState('');
  const [couponApplied, setCouponApplied] = useState<{ code: string; percentOff: number } | null>(null);
  const [couponError, setCouponError] = useState('');
  const [couponBusy, setCouponBusy] = useState(false);

  useEffect(() => {
    if (!state) navigate('/', { replace: true });
  }, [state, navigate]);

  if (!state) return null;

  const subtotal = state.seats.reduce((sum, s) => sum + s.price, 0);
  const discount = couponApplied ? Math.round(subtotal * (couponApplied.percentOff / 100) * 100) / 100 : 0;
  const total = Math.max(0, subtotal - discount);

  async function handleApplyCoupon() {
    if (!couponInput.trim()) return;
    setCouponBusy(true);
    setCouponError('');
    try {
      const res = await api.post('/api/coupons/validate', { code: couponInput.trim() });
      setCouponApplied({ code: res.data.code, percentOff: res.data.percentOff });
    } catch (err) {
      setCouponApplied(null);
      setCouponError(apiErrorMessage(err));
    } finally {
      setCouponBusy(false);
    }
  }

  function removeCoupon() {
    setCouponApplied(null);
    setCouponInput('');
    setCouponError('');
  }

  async function handleConfirm() {
    setBusy(true);
    setError('');
    try {
      const res = await api.post(`/api/events/${state!.eventId}/bookings`, {
        seatIds: state!.seats.map((s) => s.seatId),
        sessionId: state!.sessionId,
        couponCode: couponApplied?.code,
      });
      navigate('/booking-success', { state: { booking: res.data } });
    } catch (err) {
      setError(apiErrorMessage(err));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="min-h-[calc(100vh-64px)] bg-canvas-950">
      <div className="mx-auto max-w-2xl px-6 py-12">
        <Badge tone="brand" dot>
          Step 2 of 2
        </Badge>
        <h1 className="mt-3 font-display text-3xl italic text-canvas-50">Review your order</h1>
        <p className="mt-1 text-sm text-canvas-400">Your seats are held while you finish checking out.</p>

        <div className="mt-8">
          <CountdownBanner expiresAt={new Date(state.holdExpiresAt)} onExpire={() => navigate(`/events/${state.eventId}`)} />
        </div>

        <Card variant="glass" className="mt-6 overflow-hidden">
          <div className="relative flex items-center gap-4 p-6" style={posterGradient(state.eventTitle)}>
            <div className="absolute inset-0 bg-gradient-to-r from-canvas-950/70 to-canvas-950/30" />
            <div className="relative">
              <h2 className="font-display text-xl italic text-white">{state.eventTitle}</h2>
              <p className="mt-1 text-sm text-canvas-200">
                {state.venueName} &middot; {new Date(state.date).toDateString()} &middot; {state.startTime}
              </p>
            </div>
          </div>

          <div className="p-6">
            <h3 className="text-xs font-semibold uppercase tracking-wide text-canvas-400">Seats</h3>
            <ul className="mt-3 divide-y divide-canvas-700">
              {state.seats.map((s) => (
                <li key={s.seatId} className="flex items-center justify-between py-3">
                  <div className="flex items-center gap-3">
                    <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-canvas-700 text-xs font-semibold text-canvas-100">
                      {s.label}
                    </span>
                    <span className="text-sm text-canvas-300">{s.category}</span>
                  </div>
                  <span className="text-sm font-medium text-canvas-50">${s.price.toFixed(2)}</span>
                </li>
              ))}
            </ul>

            <div className="mt-4 border-t border-canvas-700 pt-4">
              <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-canvas-400">Promo code</h3>
              {couponApplied ? (
                <div className="flex items-center justify-between rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-4 py-2.5">
                  <div className="flex items-center gap-2">
                    <svg viewBox="0 0 20 20" fill="none" className="h-4 w-4 text-emerald-400">
                      <path d="M5 10l3 3 7-7" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                    <span className="text-sm font-medium text-emerald-300">
                      {couponApplied.code} applied &middot; {couponApplied.percentOff}% off
                    </span>
                  </div>
                  <button onClick={removeCoupon} className="text-xs font-medium text-canvas-400 hover:text-canvas-200">
                    Remove
                  </button>
                </div>
              ) : (
                <div className="flex gap-2">
                  <Input
                    placeholder="Enter code"
                    value={couponInput}
                    onChange={(e) => setCouponInput(e.target.value.toUpperCase())}
                    className="flex-1"
                  />
                  <Button variant="secondary" loading={couponBusy} onClick={handleApplyCoupon}>
                    Apply
                  </Button>
                </div>
              )}
              {couponError && <p className="mt-2 text-xs text-ruby-400">{couponError}</p>}
            </div>

            <div className="mt-4 space-y-1.5 border-t border-canvas-700 pt-4">
              <div className="flex items-center justify-between text-sm text-canvas-300">
                <span>Subtotal</span>
                <span>${subtotal.toFixed(2)}</span>
              </div>
              {discount > 0 && (
                <div className="flex items-center justify-between text-sm text-emerald-400">
                  <span>Discount ({couponApplied?.percentOff}%)</span>
                  <span>&minus;${discount.toFixed(2)}</span>
                </div>
              )}
              <div className="flex items-center justify-between pt-1.5">
                <span className="text-sm text-canvas-300">Total due</span>
                <span className="font-display text-2xl italic text-canvas-50">${total.toFixed(2)}</span>
              </div>
            </div>
          </div>
        </Card>

        {error && <p className="mt-4 text-sm text-ruby-400">{error}</p>}

        <div className="mt-6 flex gap-3">
          <Button variant="secondary" size="lg" onClick={() => navigate(-1)}>
            Back
          </Button>
          <Button variant="gold" size="lg" className="flex-1" loading={busy} onClick={handleConfirm}>
            Confirm &amp; pay ${total.toFixed(2)}
          </Button>
        </div>
        <p className="mt-3 text-center text-xs text-canvas-500">
          This is a demo checkout &mdash; no real payment is processed.
        </p>
      </div>
    </div>
  );
}

function CountdownBanner({ expiresAt, onExpire }: { expiresAt: Date; onExpire: () => void }) {
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
    <div className={`rounded-xl border p-4 ${isUrgent ? 'border-ruby-500/30 bg-ruby-500/10' : 'border-amber-500/25 bg-amber-500/10'}`}>
      <div className="flex items-center justify-between text-sm">
        <span className={isUrgent ? 'font-medium text-ruby-300' : 'font-medium text-amber-300'}>
          Seats held for you &middot; {mins}:{secs.toString().padStart(2, '0')}
        </span>
      </div>
      <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-canvas-700">
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
