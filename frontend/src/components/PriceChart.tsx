import { useEffect, useRef, useState } from "react";
import {
  createChart,
  ColorType,
  CandlestickSeries,
  type IChartApi,
  type ISeriesApi,
  type CandlestickData,
  type Time,
} from "lightweight-charts";
import { fetchCandles, type PricePoint } from "../lib/market-api";

type Props = {
  symbol: string;
  livePrice: PricePoint | null;
};

const MAX_CANDLES = 400;

type Bar = { open: number; high: number; low: number; close: number };

export function PriceChart({ symbol, livePrice }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<IChartApi | null>(null);
  const seriesRef = useRef<ISeriesApi<"Candlestick"> | null>(null);
  const candlesRef = useRef<CandlestickData<Time>[]>([]);
  const isLoadedRef = useRef(false);

  const [activeBar, setActiveBar] = useState<Bar | null>(null);
  const [status, setStatus] = useState<"loading" | "ready" | "empty" | "error">("loading");

  // Create the chart and load real candle history, once per symbol.
  useEffect(() => {
    if (!containerRef.current) {
      return;
    }

    const chart = createChart(containerRef.current, {
      layout: {
        background: { type: ColorType.Solid, color: "#1e293b" },
        textColor: "#94a3b8",
      },
      grid: {
        vertLines: { color: "#334155" },
        horzLines: { color: "#334155" },
      },
      width: containerRef.current.clientWidth,
      height: 360,
      timeScale: {
        timeVisible: true,
        secondsVisible: false,
        borderColor: "#334155",
      },
      rightPriceScale: { borderColor: "#334155" },
      crosshair: {
        vertLine: { color: "#64748b", labelBackgroundColor: "#334155" },
        horzLine: { color: "#64748b", labelBackgroundColor: "#334155" },
      },
    });

    const series = chart.addSeries(CandlestickSeries, {
      upColor: "#16a34a",
      downColor: "#dc2626",
      borderVisible: false,
      wickUpColor: "#16a34a",
      wickDownColor: "#dc2626",
    });

    chartRef.current = chart;
    seriesRef.current = series;
    candlesRef.current = [];
    isLoadedRef.current = false;
    setActiveBar(null);
    setStatus("loading");

    let cancelled = false;

    fetchCandles(symbol)
      .then((data) => {
        if (cancelled) return;

        const candles: CandlestickData<Time>[] = data.slice(-MAX_CANDLES).map((c) => ({
          time: c.time as Time,
          open: c.open,
          high: c.high,
          low: c.low,
          close: c.close,
        }));

        candlesRef.current = candles;
        series.setData(candles);
        isLoadedRef.current = true;

        const last = candles[candles.length - 1];
        if (last) {
          setActiveBar({ open: last.open, high: last.high, low: last.low, close: last.close });
        }
        chart.timeScale().fitContent();
        setStatus(candles.length > 0 ? "ready" : "empty");
      })
      .catch(() => {
        if (!cancelled) setStatus("error");
      });

    const handleResize = () => {
      if (containerRef.current) {
        chart.applyOptions({ width: containerRef.current.clientWidth });
      }
    };
    window.addEventListener("resize", handleResize);

    return () => {
      cancelled = true;
      window.removeEventListener("resize", handleResize);
      chart.remove();
      chartRef.current = null;
      seriesRef.current = null;
    };
  }, [symbol]);

  // Apply each live tick to the current candle (or start a new one).
  useEffect(() => {
    if (!livePrice || !seriesRef.current || !isLoadedRef.current) {
      return;
    }

    const price = livePrice.price;
    const tickSeconds = Math.floor(new Date(livePrice.updatedAt).getTime() / 1000);
    const bucket = Math.floor(tickSeconds / 60) * 60;

    const candles = candlesRef.current;
    const lastBar = candles[candles.length - 1];
    const lastTime = lastBar ? (lastBar.time as number) : null;

    if (lastBar && lastTime === bucket) {
      // Same minute: widen the current candle.
      lastBar.high = Math.max(lastBar.high, price);
      lastBar.low = Math.min(lastBar.low, price);
      lastBar.close = price;

      seriesRef.current.update(lastBar);
      setActiveBar({ open: lastBar.open, high: lastBar.high, low: lastBar.low, close: lastBar.close });
    } else if (lastTime === null || bucket > lastTime) {
      // New minute. If the price hasn't moved (e.g. market closed), don't invent a candle.
      if (lastBar && price === lastBar.close) {
        return;
      }

      const prevClose = lastBar ? lastBar.close : price;
      const newBar: CandlestickData<Time> = {
        time: bucket as Time,
        open: prevClose,
        high: Math.max(prevClose, price),
        low: Math.min(prevClose, price),
        close: price,
      };

      candles.push(newBar);
      if (candles.length > MAX_CANDLES) {
        candles.shift();
      }

      seriesRef.current.update(newBar);
      setActiveBar({ open: newBar.open, high: newBar.high, low: newBar.low, close: newBar.close });
    }
  }, [livePrice]);

  return (
    <div
      style={{
        background: "#1e293b",
        borderRadius: "10px",
        border: "1px solid #334155",
        overflow: "hidden",
        width: "100%",
      }}
    >
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          padding: "0.75rem 1rem",
          borderBottom: "1px solid #334155",
          fontSize: "0.85rem",
          color: "#94a3b8",
        }}
      >
        <div style={{ display: "flex", gap: "0.75rem", alignItems: "center" }}>
          <span style={{ fontWeight: 700, color: "#e2e8f0", fontSize: "1rem" }}>{symbol}</span>
          <span
            style={{
              background: "#0f172a",
              padding: "0.2rem 0.5rem",
              borderRadius: "4px",
              fontSize: "0.75rem",
              fontWeight: 600,
            }}
          >
            1M
          </span>
          {status === "loading" && <span>Loading chart…</span>}
          {status === "empty" && <span>No candle data available</span>}
          {status === "error" && <span style={{ color: "#f87171" }}>Could not load chart data</span>}
        </div>
        {activeBar && (
          <div style={{ display: "flex", gap: "1rem", fontFamily: "monospace", fontSize: "0.8rem" }}>
            <span>
              O: <strong style={{ color: "#e2e8f0" }}>{activeBar.open.toFixed(2)}</strong>
            </span>
            <span>
              H: <strong style={{ color: "#22c55e" }}>{activeBar.high.toFixed(2)}</strong>
            </span>
            <span>
              L: <strong style={{ color: "#ef4444" }}>{activeBar.low.toFixed(2)}</strong>
            </span>
            <span>
              C:{" "}
              <strong style={{ color: activeBar.close >= activeBar.open ? "#22c55e" : "#ef4444" }}>
                {activeBar.close.toFixed(2)}
              </strong>
            </span>
          </div>
        )}
      </div>
      <div ref={containerRef} style={{ width: "100%" }} />
    </div>
  );
}