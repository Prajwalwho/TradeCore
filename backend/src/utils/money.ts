// All money maths is done in integer cents so floating point can never lose a paisa.
// Prices are restricted to whole cents (tick size 0.01), so price x quantity is exact.

export function decimalToCents(value: string): number {
  return Math.round(Number(value) * 100);
}

export function priceToCents(price: number): number {
  return Math.round(price * 100);
}

export function centsToDecimal(cents: number): string {
  const sign = cents < 0 ? "-" : "";
  const abs = Math.abs(cents);
  return `${sign}${Math.floor(abs / 100)}.${String(abs % 100).padStart(2, "0")}`;
}