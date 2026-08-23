import type { HTMLAttributes, ReactNode } from 'react';

interface CardProps extends HTMLAttributes<HTMLDivElement> {
  variant?: 'solid' | 'glass' | 'outline';
  interactive?: boolean;
  glow?: 'none' | 'brand' | 'emerald' | 'gold';
  children: ReactNode;
}

const variantClasses = {
  solid: 'bg-canvas-850 border border-canvas-700',
  glass: 'bg-canvas-850/60 backdrop-blur-xl border border-white/8',
  outline: 'bg-transparent border border-canvas-700',
};

const glowClasses = {
  none: '',
  brand: 'shadow-[var(--shadow-glow-brand)]',
  emerald: 'shadow-[var(--shadow-glow-emerald)]',
  gold: 'shadow-[var(--shadow-glow-gold)]',
};

export function Card({
  variant = 'solid',
  interactive = false,
  glow = 'none',
  className = '',
  children,
  ...props
}: CardProps) {
  return (
    <div
      className={`
        rounded-2xl shadow-[var(--shadow-card)] transition-all duration-200 ease-out
        ${variantClasses[variant]} ${glowClasses[glow]}
        ${interactive ? 'cursor-pointer hover:-translate-y-1 hover:shadow-[var(--shadow-card-hover)] hover:border-canvas-500' : ''}
        ${className}
      `}
      {...props}
    >
      {children}
    </div>
  );
}
