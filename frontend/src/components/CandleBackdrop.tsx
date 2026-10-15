import { useEffect, useState } from "react";

// Decorative only: a random-walk candlestick chart that keeps moving. These are NOT real prices.
type Candle = { id: number; open: number; close: number; high: number; low: number };

const COUNT = 36;
let nextId = 0;

function nextCandle(prevClose: number): Candle {
  const drift = (50 - prevClose) * 0.06; // gently pulls the walk back to the middle
  const close = Math.min(90, Math.max(10, prevClose + (Math.random() - 0.5) * 12 + drift));
  const high = Math.min(96, Math.max(prevClose, close) + Math.random() * 4);
  const low = Math.max(4, Math.min(prevClose, close) - Math.random() * 4);
  return { id: nextId++, open: prevClose, close, high, low };
}

function seed(): Candle[] {
  const list: Candle[] = [];
  let last = 50;
  for (let i = 0; i < COUNT; i++) {
    const c = nextCandle(last);
    list.push(c);
    last = c.close;
  }
  return list;
}

export function CandleBackdrop({ className }: { className?: string }) {
  const [candles, setCandles] = useState<Candle[]>(seed);

  useEffect(() => {
    const id = setInterval(() => {
      setCandles((list) => {
        const last = list[list.length - 1];
        return [...list.slice(1), nextCandle(last ? last.close : 50)];
      });
    }, 1200);
    return () => clearInterval(id);
  }, []);

  const step = 100 / COUNT;

  return (
    <div className={className} aria-hidden="true">
      <svg viewBox="0 0 100 100" preserveAspectRatio="none">
        {candles.map((c, i) => {
          const color = c.close >= c.open ? "var(--up)" : "var(--down)";
          const bodyTop = 100 - Math.max(c.open, c.close);
          const bodyHeight = Math.max(Math.abs(c.close - c.open), 0.8);
          return (
            <g key={c.id} className="candle-g" style={{ transform: `translateX(${i * step}px)` }}>
              <line
                x1={step / 2}
                x2={step / 2}
                y1={100 - c.high}
                y2={100 - c.low}
                stroke={color}
                strokeWidth="1.5"
                vectorEffect="non-scaling-stroke"
              />
              <rect x={step * 0.2} y={bodyTop} width={step * 0.6} height={bodyHeight} fill={color} />
            </g>
          );
        })}
      </svg>
    </div>
  );
}
