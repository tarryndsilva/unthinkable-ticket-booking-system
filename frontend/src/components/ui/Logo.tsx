export function Logo({ size = 32 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 48 48" fill="none" className="shrink-0">
      <defs>
        <linearGradient id="logo-gradient" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#7c7fff" />
          <stop offset="100%" stopColor="#2ea6ff" />
        </linearGradient>
      </defs>
      <rect width="48" height="48" rx="12" className="fill-canvas-900" />
      <path
        d="M10 17a3 3 0 0 1 3-3h22a3 3 0 0 1 3 3v2.2a2.6 2.6 0 0 0 0 5.2V27a3 3 0 0 1-3 3H13a3 3 0 0 1-3-3v-2.6a2.6 2.6 0 0 0 0-5.2V17z"
        fill="url(#logo-gradient)"
      />
      <path
        d="M23 15v4M23 25v4"
        stroke="#0d0c14"
        strokeWidth="1.6"
        strokeLinecap="round"
        strokeDasharray="0.5 3.4"
      />
    </svg>
  );
}
