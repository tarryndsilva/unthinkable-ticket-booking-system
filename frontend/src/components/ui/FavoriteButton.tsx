interface FavoriteButtonProps {
  active: boolean;
  onToggle: () => void;
  size?: 'sm' | 'md';
  className?: string;
}

export function FavoriteButton({ active, onToggle, size = 'md', className = '' }: FavoriteButtonProps) {
  const dim = size === 'md' ? 'h-9 w-9' : 'h-7 w-7';
  const iconDim = size === 'md' ? 'h-4 w-4' : 'h-3.5 w-3.5';
  return (
    <button
      onClick={(e) => {
        e.preventDefault();
        e.stopPropagation();
        onToggle();
      }}
      aria-label={active ? 'Remove from wishlist' : 'Save to wishlist'}
      aria-pressed={active}
      className={`flex ${dim} items-center justify-center rounded-full border backdrop-blur transition-all duration-200 hover:scale-110 active:scale-95 ${
        active
          ? 'border-ruby-400/50 bg-ruby-500/20 text-ruby-400'
          : 'border-white/15 bg-black/30 text-white/80 hover:text-ruby-300'
      } ${className}`}
    >
      <svg viewBox="0 0 20 20" fill={active ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth={1.6} className={iconDim}>
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M10 17.5s-6.5-4.2-8.5-8.1C-.2 6 1.3 2.8 4.4 2.3c1.9-.3 3.7.6 4.6 2.2.9-1.6 2.7-2.5 4.6-2.2 3.1.5 4.6 3.7 2.9 7.1-2 3.9-8.5 8.1-8.5 8.1z"
        />
      </svg>
    </button>
  );
}
