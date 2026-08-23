interface OccupancyProps {
  available: number;
  held: number;
  booked: number;
}

export function OccupancyBar({ available, held, booked }: OccupancyProps) {
  const total = Math.max(1, available + held + booked);
  const pct = (n: number) => (n / total) * 100;

  return (
    <div>
      <div className="flex h-3 w-full overflow-hidden rounded-full bg-canvas-700">
        <div
          className="h-full bg-emerald-500 transition-all duration-700 ease-out"
          style={{ width: `${pct(booked)}%` }}
          title={`Booked: ${booked}`}
        />
        <div
          className="h-full bg-amber-500 transition-all duration-700 ease-out"
          style={{ width: `${pct(held)}%` }}
          title={`Held: ${held}`}
        />
        <div
          className="h-full bg-canvas-500 transition-all duration-700 ease-out"
          style={{ width: `${pct(available)}%` }}
          title={`Available: ${available}`}
        />
      </div>
      <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-canvas-400">
        <LegendDot color="bg-emerald-500" label={`${booked} booked`} />
        <LegendDot color="bg-amber-500" label={`${held} held`} />
        <LegendDot color="bg-canvas-500" label={`${available} available`} />
        <span className="ml-auto font-medium text-canvas-200">{Math.round(pct(booked))}% sold</span>
      </div>
    </div>
  );
}

function LegendDot({ color, label }: { color: string; label: string }) {
  return (
    <span className="flex items-center gap-1.5">
      <span className={`h-2 w-2 rounded-full ${color}`} />
      {label}
    </span>
  );
}
