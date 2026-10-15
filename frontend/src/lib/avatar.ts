// Pairs of shades, so every stock gets its own colorful but related badge.
const PAIRS: [string, string][] = [
  ["#00b386", "#14b8c4"],
  ["#14b8c4", "#5367ff"],
  ["#5367ff", "#8b5cf6"],
  ["#0b6b72", "#2fd4a0"],
  ["#e5484d", "#f59e0b"],
  ["#2a3fbf", "#14b8c4"],
  ["#00a37a", "#7ccf3f"],
  ["#6d4aff", "#e5484d"],
];

// Same symbol, same colors, every time.
export function avatarColor(symbol: string): string {
  let h = 0;
  for (const ch of symbol) h = (h * 31 + ch.charCodeAt(0)) >>> 0;
  const pair = PAIRS[h % PAIRS.length] as [string, string];
  return `linear-gradient(135deg, ${pair[0]}, ${pair[1]})`;
}

export function initials(symbol: string): string {
  return symbol.slice(0, 2);
}
