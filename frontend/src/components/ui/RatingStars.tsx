export function RatingStars({ rating, count, size = 'sm' }: { rating: number | null | undefined; count?: number; size?: 'sm' | 'md' }) {
  if (rating === null || rating === undefined) return null;
  const starSize = size === 'md' ? 'h-4 w-4' : 'h-3.5 w-3.5';
  return (
    <div className="flex items-center gap-1">
      <svg viewBox="0 0 20 20" fill="currentColor" className={`${starSize} text-gold-400`}>
        <path d="M9.05 2.927c.3-.921 1.603-.921 1.902 0l1.286 3.958a1 1 0 00.95.69h4.162c.969 0 1.371 1.24.588 1.81l-3.368 2.447a1 1 0 00-.364 1.118l1.287 3.957c.3.922-.755 1.688-1.538 1.118l-3.367-2.447a1 1 0 00-1.176 0l-3.367 2.447c-.783.57-1.838-.196-1.538-1.118l1.287-3.957a1 1 0 00-.364-1.118L2.062 9.385c-.783-.57-.38-1.81.588-1.81h4.163a1 1 0 00.95-.69l1.286-3.958z" />
      </svg>
      <span className="text-xs font-medium text-canvas-200">{rating.toFixed(1)}</span>
      {count !== undefined && <span className="text-xs text-canvas-500">({count})</span>}
    </div>
  );
}
