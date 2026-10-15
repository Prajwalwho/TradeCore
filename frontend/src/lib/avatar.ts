const COLORS = ["#5367ff", "#00a37a", "#e5484d", "#e8890c", "#7c4dff", "#0b7285", "#d6336c", "#2f9e44"];

// Same symbol, same color, every time.
export function avatarColor(symbol: string): string {
  let h = 0;
  for (const ch of symbol) h = (h * 31 + ch.charCodeAt(0)) >>> 0;
  return COLORS[h % COLORS.length] as string;
}

export function initials(symbol: string): string {
  return symbol.slice(0, 2);
}
