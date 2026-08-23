import { forwardRef } from 'react';
import type { ButtonHTMLAttributes, ReactNode } from 'react';

type Variant = 'primary' | 'secondary' | 'ghost' | 'danger' | 'gold';
type Size = 'sm' | 'md' | 'lg';

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
  icon?: ReactNode;
  iconRight?: ReactNode;
  loading?: boolean;
}

const variantClasses: Record<Variant, string> = {
  primary:
    'bg-gradient-to-b from-brand-500 to-brand-600 text-white shadow-[var(--shadow-glow-brand)] hover:from-brand-400 hover:to-brand-500 active:from-brand-600 active:to-brand-700',
  secondary:
    'bg-canvas-800 text-canvas-50 border border-canvas-600 hover:bg-canvas-700 hover:border-canvas-500 active:bg-canvas-800',
  ghost:
    'bg-transparent text-canvas-200 hover:bg-canvas-800/70 active:bg-canvas-800',
  danger:
    'bg-gradient-to-b from-ruby-400 to-ruby-500 text-white hover:brightness-110 active:brightness-95',
  gold:
    'bg-gradient-to-b from-gold-300 to-gold-500 text-canvas-950 shadow-[var(--shadow-glow-gold)] hover:brightness-105 active:brightness-95 font-semibold',
};

const sizeClasses: Record<Size, string> = {
  sm: 'h-9 px-3.5 text-sm gap-1.5',
  md: 'h-11 px-5 text-sm gap-2',
  lg: 'h-12 px-7 text-base gap-2.5',
};

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ variant = 'primary', size = 'md', icon, iconRight, loading, disabled, className = '', children, ...props }, ref) => {
    return (
      <button
        ref={ref}
        disabled={disabled || loading}
        className={`
          group relative inline-flex items-center justify-center rounded-xl font-medium
          transition-all duration-200 ease-out
          hover:-translate-y-0.5 active:translate-y-0 active:scale-[0.98]
          disabled:opacity-40 disabled:pointer-events-none disabled:hover:translate-y-0
          focus-visible:outline-2 focus-visible:outline-electric-400 focus-visible:outline-offset-2
          ${variantClasses[variant]} ${sizeClasses[size]} ${className}
        `}
        {...props}
      >
        {loading ? (
          <span className="h-4 w-4 rounded-full border-2 border-white/30 border-t-white animate-spin" />
        ) : (
          icon && <span className="shrink-0 [&>svg]:h-4 [&>svg]:w-4">{icon}</span>
        )}
        <span>{children}</span>
        {iconRight && !loading && (
          <span className="shrink-0 transition-transform duration-200 group-hover:translate-x-0.5 [&>svg]:h-4 [&>svg]:w-4">
            {iconRight}
          </span>
        )}
      </button>
    );
  }
);
Button.displayName = 'Button';
