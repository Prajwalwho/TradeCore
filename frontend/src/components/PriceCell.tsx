import { useEffect, useRef, useState } from "react";

const format = (v: number) =>
  v.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

type Props = { value: number | null | undefined; prefix?: string };

// Shows a price and flashes green or red for a moment whenever it changes.
export function PriceCell({ value, prefix = "" }: Props) {
  const previous = useRef<number | null>(null);
  const [flash, setFlash] = useState<{ dir: "up" | "down"; tick: number } | null>(null);

  useEffect(() => {
    if (value === undefined || value === null) return;
    const before = previous.current;
    previous.current = value;
    if (before === null || before === value) return;
    setFlash((f) => ({ dir: value > before ? "up" : "down", tick: (f?.tick ?? 0) + 1 }));
  }, [value]);

  if (value === undefined || value === null) return <span className="price-cell">—</span>;

  return (
    <span key={flash?.tick ?? 0} className={`price-cell${flash ? ` flash-${flash.dir}` : ""}`}>
      {prefix}
      {format(value)}
    </span>
  );
}
