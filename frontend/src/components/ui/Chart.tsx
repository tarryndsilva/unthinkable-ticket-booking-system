interface BarDatum {
  label: string;
  value: number;
  color: string;
}

export function MiniBarChart({ data, valuePrefix = '$' }: { data: BarDatum[]; valuePrefix?: string }) {
  const max = Math.max(1, ...data.map((d) => d.value));
  return (
    <div className="space-y-3">
      {data.map((d) => (
        <div key={d.label}>
          <div className="mb-1 flex items-center justify-between text-xs">
            <span className="font-medium text-canvas-300">{d.label}</span>
            <span className="text-canvas-400">
              {valuePrefix}
              {d.value.toLocaleString(undefined, { maximumFractionDigits: 0 })}
            </span>
          </div>
          <div className="h-2.5 w-full overflow-hidden rounded-full bg-canvas-700">
            <div
              className="h-full animate-[fade-up_0.6s_cubic-bezier(0.16,1,0.3,1)_both] rounded-full transition-all duration-700 ease-out"
              style={{ width: `${(d.value / max) * 100}%`, background: d.color }}
            />
          </div>
        </div>
      ))}
    </div>
  );
}

export function StatCard({ label, value, tone = 'brand' }: { label: string; value: string; tone?: 'brand' | 'emerald' | 'gold' }) {
  const toneClasses = {
    brand: 'from-brand-500/15 to-transparent border-brand-500/25 text-brand-200',
    emerald: 'from-emerald-500/15 to-transparent border-emerald-500/25 text-emerald-300',
    gold: 'from-gold-500/15 to-transparent border-gold-500/25 text-gold-300',
  };
  return (
    <div className={`rounded-2xl border bg-gradient-to-b p-5 ${toneClasses[tone]}`}>
      <p className="text-xs font-medium uppercase tracking-wide opacity-70">{label}</p>
      <p className="mt-2 font-display text-3xl italic text-canvas-50">{value}</p>
    </div>
  );
}
