import { forwardRef } from 'react';
import type { InputHTMLAttributes, ReactNode } from 'react';

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  icon?: ReactNode;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ label, error, icon, className = '', id, ...props }, ref) => {
    const inputId = id || label?.toLowerCase().replace(/\s+/g, '-');
    return (
      <div className="w-full">
        {label && (
          <label htmlFor={inputId} className="mb-1.5 block text-sm font-medium text-canvas-200">
            {label}
          </label>
        )}
        <div className="relative">
          {icon && (
            <span className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-canvas-400 [&>svg]:h-4 [&>svg]:w-4">
              {icon}
            </span>
          )}
          <input
            ref={ref}
            id={inputId}
            className={`
              w-full rounded-xl border bg-canvas-850 px-4 py-2.5 text-sm text-canvas-50
              placeholder:text-canvas-400 transition-all duration-150
              border-canvas-600 hover:border-canvas-500
              focus:border-brand-400 focus:outline-none focus:ring-2 focus:ring-brand-500/25
              ${icon ? 'pl-10' : ''}
              ${error ? 'border-ruby-500/60 focus:border-ruby-500 focus:ring-ruby-500/20' : ''}
              ${className}
            `}
            {...props}
          />
        </div>
        {error && <p className="mt-1.5 text-xs text-ruby-400">{error}</p>}
      </div>
    );
  }
);
Input.displayName = 'Input';
