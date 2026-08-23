import type { ReactNode } from 'react';

type Tone = 'brand' | 'emerald' | 'gold' | 'amber' | 'ruby' | 'violet' | 'neutral';

const toneClasses: Record<Tone, string> = {
  brand: 'bg-brand-500/15 text-brand-300 border-brand-500/30',
  emerald: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30',
  gold: 'bg-gold-500/15 text-gold-300 border-gold-500/30',
  amber: 'bg-amber-500/15 text-amber-400 border-amber-500/30',
  ruby: 'bg-ruby-500/15 text-ruby-400 border-ruby-500/30',
  violet: 'bg-violet-500/15 text-violet-300 border-violet-500/30',
  neutral: 'bg-canvas-700/60 text-canvas-200 border-canvas-600',
};

export function Badge({
  tone = 'neutral',
  dot = false,
  children,
}: {
  tone?: Tone;
  dot?: boolean;
  children: ReactNode;
}) {
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-medium ${toneClasses[tone]}`}
    >
      {dot && <span className="h-1.5 w-1.5 rounded-full bg-current" />}
      {children}
    </span>
  );
}
