export type SeatVisualStatus = 'available' | 'held' | 'booked' | 'selected';
export type SeatTier = 'premium' | 'standard';

interface SeatProps {
  status: SeatVisualStatus;
  tier: SeatTier;
  label: string;
  onClick?: () => void;
  disabled?: boolean;
}

/**
 * Seat states:
 *  - available: outlined, tier-tinted, inviting hover lift + glow
 *  - selected:  filled brand gradient, pop animation, persistent glow ring
 *  - held:      amber pulse, not interactive (someone else has it)
 *  - booked:    solid muted fill, not interactive
 *
 * Tier communicated via glow color even before selection:
 *  - premium: gold-tinted outline/glow
 *  - standard: cool indigo-tinted outline/glow
 */
export function Seat({ status, tier, label, onClick, disabled }: SeatProps) {
  const isInteractive = status === 'available' || status === 'selected';

  const base =
    'relative flex h-8 w-8 items-center justify-center rounded-[10px] text-[10px] font-semibold transition-all duration-200 ease-out select-none';

  const stateClasses: Record<SeatVisualStatus, string> = {
    available:
      tier === 'premium'
        ? 'border-[1.5px] border-gold-500/50 bg-gold-500/5 text-gold-300 hover:bg-gold-500/15 hover:border-gold-400 hover:-translate-y-0.5 hover:shadow-[0_4px_16px_-2px_rgba(232,171,46,0.45)] cursor-pointer'
        : 'border-[1.5px] border-brand-400/40 bg-brand-400/5 text-brand-300 hover:bg-brand-400/15 hover:border-brand-300 hover:-translate-y-0.5 hover:shadow-[0_4px_16px_-2px_rgba(99,85,245,0.45)] cursor-pointer',
    selected:
      'bg-gradient-to-b from-brand-400 to-brand-600 text-white shadow-[0_0_0_3px_rgba(124,127,255,0.25),0_6px_20px_-4px_rgba(99,85,245,0.6)] animate-[seat-pop_0.25s_cubic-bezier(0.34,1.56,0.64,1)] cursor-pointer',
    held:
      'border-[1.5px] border-amber-500/40 bg-amber-500/10 text-amber-400/70 cursor-not-allowed animate-[pulse-glow_2.2s_ease-in-out_infinite]',
    booked:
      'bg-canvas-700 text-canvas-500 cursor-not-allowed',
  };

  return (
    <button
      type="button"
      title={label}
      aria-label={`Seat ${label}, ${status}`}
      aria-pressed={status === 'selected'}
      disabled={disabled || !isInteractive}
      onClick={onClick}
      className={`${base} ${stateClasses[status]}`}
    >
      {status === 'selected' && (
        <svg viewBox="0 0 20 20" fill="currentColor" className="h-3.5 w-3.5">
          <path
            fillRule="evenodd"
            d="M16.7 5.3a1 1 0 010 1.4l-7.5 7.5a1 1 0 01-1.4 0l-3.5-3.5a1 1 0 111.4-1.4l2.8 2.8 6.8-6.8a1 1 0 011.4 0z"
            clipRule="evenodd"
          />
        </svg>
      )}
      {status !== 'selected' && label.replace(/^[A-Za-z]+/, '')}
    </button>
  );
}

export function SeatLegendSwatch({ status, tier = 'standard' }: { status: SeatVisualStatus; tier?: SeatTier }) {
  return <Seat status={status} tier={tier} label="00" disabled />;
}
