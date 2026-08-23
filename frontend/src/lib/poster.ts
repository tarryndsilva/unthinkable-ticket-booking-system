const PALETTES: [string, string, string][] = [
  ['#4f3ade', '#9457ff', '#0b1020'],
  ['#0b84ea', '#12c88b', '#0a0f1e'],
  ['#e8ab2e', '#ef4361', '#160a10'],
  ['#7c33f2', '#2ea6ff', '#0d0a1e'],
  ['#12c88b', '#0b84ea', '#08131a'],
  ['#ef4361', '#e8ab2e', '#1a0a0d'],
  ['#6355f5', '#34e0a1', '#0b0e1a'],
  ['#f7c65b', '#7c33f2', '#160f10'],
];

function hashString(str: string): number {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = (hash << 5) - hash + str.charCodeAt(i);
    hash |= 0;
  }
  return Math.abs(hash);
}

export function posterGradient(seed: string) {
  const h = hashString(seed);
  const [a, b, bg] = PALETTES[h % PALETTES.length];
  const angle = 100 + (h % 120);
  const posX = 20 + (h % 60);
  const posY = 10 + ((h >> 4) % 50);
  return {
    background: `radial-gradient(circle at ${posX}% ${posY}%, ${a}55, transparent 55%), radial-gradient(circle at ${100 - posX}% ${100 - posY}%, ${b}55, transparent 55%), linear-gradient(${angle}deg, ${bg}, #050509)`,
  };
}

export function posterAccent(seed: string): string {
  const h = hashString(seed);
  return PALETTES[h % PALETTES.length][0];
}
