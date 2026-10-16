// Indian rupee formatting: ₹10,00,000.00
function toNumber(value: string | number | null | undefined): number | null {
  if (value === null || value === undefined || value === "") return null;
  const n = typeof value === "number" ? value : Number(value);
  return Number.isFinite(n) ? n : null;
}

export function inr(value: string | number | null | undefined, decimals = 2): string {
  const n = toNumber(value);
  if (n === null) return "—";
  const body = Math.abs(n).toLocaleString("en-IN", {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });
  return `${n < 0 ? "−" : ""}₹${body}`;
}

// For profit and loss: always shows the sign, like +₹1,234.50 or −₹82.10
export function signedInr(value: string | number | null | undefined, decimals = 2): string {
  const n = toNumber(value);
  if (n === null) return "—";
  const body = Math.abs(n).toLocaleString("en-IN", {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });
  return `${n < 0 ? "−" : "+"}₹${body}`;
}
