import { useEffect, useState } from 'react';
import { useLocation, useNavigate, Link } from 'react-router-dom';
import type { Booking } from '../types';
import { Ticket } from '../components/ui/Ticket';
import { Button } from '../components/ui/Button';

export function BookingSuccessPage() {
  const location = useLocation();
  const navigate = useNavigate();
  const booking = (location.state as { booking: Booking } | undefined)?.booking;
  const [confettiVisible, setConfettiVisible] = useState(true);

  useEffect(() => {
    if (!booking) navigate('/bookings', { replace: true });
    const t = setTimeout(() => setConfettiVisible(false), 1800);
    return () => clearTimeout(t);
  }, [booking, navigate]);

  if (!booking) return null;

  return (
    <div className="relative flex min-h-[calc(100vh-64px)] flex-col items-center justify-center overflow-hidden bg-canvas-950 px-6 py-16">
      <div className="pointer-events-none absolute -top-32 left-1/2 h-[420px] w-[700px] -translate-x-1/2 rounded-full bg-emerald-500/15 blur-[120px]" />
      {confettiVisible && <Confetti />}

      <div className="relative flex flex-col items-center animate-[scale-in_0.3s_cubic-bezier(0.16,1,0.3,1)]">
        <div className="flex h-16 w-16 items-center justify-center rounded-full bg-gradient-to-br from-emerald-400 to-emerald-600 shadow-[var(--shadow-glow-emerald)]">
          <svg viewBox="0 0 24 24" fill="none" className="h-8 w-8 text-white">
            <path d="M5 13l4 4L19 7" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </div>
        <h1 className="mt-6 font-display text-4xl italic text-canvas-50">You&rsquo;re in.</h1>
        <p className="mt-2 max-w-sm text-center text-sm text-canvas-400">
          Your booking is confirmed and a ticket with your QR code has been emailed to you.
        </p>

        <div className="mt-8">
          <Ticket
            eventTitle={booking.event.title}
            venueName={booking.event.venue.name}
            date={booking.event.date}
            time={booking.event.startTime}
            seatLabels={booking.seats.map((s) => s.showSeat.seat.label)}
            bookingRef={booking.bookingRef}
            qrCodeData={booking.qrCodeData}
            status={booking.status}
          />
        </div>

        <div className="mt-8 flex gap-3">
          <Link to="/bookings">
            <Button variant="secondary" size="lg">
              View all tickets
            </Button>
          </Link>
          <Link to="/">
            <Button variant="primary" size="lg">
              Browse more events
            </Button>
          </Link>
        </div>
      </div>
    </div>
  );
}

function Confetti() {
  const colors = ['#7c7fff', '#34e0a1', '#f7c65b', '#5ec8ff', '#ef4361'];
  const pieces = Array.from({ length: 40 }, (_, i) => ({
    id: i,
    left: Math.random() * 100,
    delay: Math.random() * 0.4,
    duration: 1.2 + Math.random() * 0.8,
    color: colors[i % colors.length],
    size: 6 + Math.random() * 6,
    rotate: Math.random() * 360,
  }));

  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden">
      {pieces.map((p) => (
        <span
          key={p.id}
          className="absolute top-0 rounded-sm opacity-90"
          style={{
            left: `${p.left}%`,
            width: p.size,
            height: p.size * 0.5,
            backgroundColor: p.color,
            transform: `rotate(${p.rotate}deg)`,
            animation: `confetti-fall ${p.duration}s ease-in ${p.delay}s forwards`,
          }}
        />
      ))}
      <style>{`
        @keyframes confetti-fall {
          to { transform: translateY(110vh) rotate(600deg); opacity: 0; }
        }
      `}</style>
    </div>
  );
}
