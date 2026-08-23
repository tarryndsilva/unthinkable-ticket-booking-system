export function SkeletonBlock({ className = '' }: { className?: string }) {
  return (
    <div
      className={`animate-pulse rounded-xl bg-gradient-to-r from-canvas-800 via-canvas-700 to-canvas-800 bg-[length:200%_100%] animate-[shimmer_2s_linear_infinite] ${className}`}
    />
  );
}

export function SkeletonText({ lines = 1, className = '' }: { lines?: number; className?: string }) {
  return (
    <div className={`space-y-2 ${className}`}>
      {Array.from({ length: lines }).map((_, i) => (
        <SkeletonBlock key={i} className={`h-3 ${i === lines - 1 && lines > 1 ? 'w-2/3' : 'w-full'}`} />
      ))}
    </div>
  );
}

export function SkeletonCard() {
  return (
    <div className="rounded-2xl border border-canvas-700 bg-canvas-850 p-5">
      <div className="flex items-center gap-4">
        <SkeletonBlock className="h-14 w-14 shrink-0 rounded-xl" />
        <div className="flex-1">
          <SkeletonBlock className="h-4 w-1/2" />
          <SkeletonBlock className="mt-2 h-3 w-1/3" />
        </div>
      </div>
    </div>
  );
}

export function SkeletonEventCard() {
  return (
    <div className="overflow-hidden rounded-2xl border border-canvas-700 bg-canvas-850">
      <SkeletonBlock className="aspect-[4/3] w-full rounded-none" />
      <div className="p-4">
        <SkeletonBlock className="h-4 w-3/4" />
        <SkeletonBlock className="mt-2 h-3 w-1/2" />
      </div>
    </div>
  );
}

export function SkeletonTable({ rows = 4 }: { rows?: number }) {
  return (
    <div className="overflow-hidden rounded-2xl border border-canvas-700">
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="flex items-center gap-4 border-b border-canvas-800 p-4 last:border-0">
          <SkeletonBlock className="h-4 w-1/4" />
          <SkeletonBlock className="h-4 w-1/3" />
          <SkeletonBlock className="h-4 w-16" />
        </div>
      ))}
    </div>
  );
}
