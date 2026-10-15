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
import { useCurrentTheme } from "../lib/theme";

type Props = {
  symbol: string;
  livePrice: PricePoint | null;
};

const MAX_CANDLES = 400;
const UP = "#0fb583";
const DOWN = "#ee5a5f";

type Bar = { open: number; high: number; low: number; close: number };

const PALETTE = {
  light: { bg: "#ffffff", text: "#667085", grid: "#eef1f4", border: "#e3e7ec", cross: "#98a2b3", crossLabel: "#1c2330" },
  dark: { bg: "#151a20", text: "#8d97a6", grid: "#222a33", border: "#29303a", cross: "#6b7686", crossLabel: "#29303a" },
};

function chartOptions(theme: "light" | "dark") {
  const c = PALETTE[theme];
  return {
    layout: { background: { type: ColorType.Solid, color: c.bg } as const, textColor: c.text },
    grid: { vertLines: { color: c.grid }, horzLines: { color: c.grid } },
    timeScale: { borderColor: c.border, timeVisible: true, secondsVisible: false },
    rightPriceScale: { borderColor: c.border },
    crosshair: {
      vertLine: { color: c.cross, labelBackgroundColor: c.crossLabel },
      horzLine: { color: c.cross, labelBackgroundColor: c.crossLabel },
    },
  };
}

export function PriceChart({ symbol, livePrice }: Props) {
  const theme = useCurrentTheme();
  const themeRef = useRef(theme);
  themeRef.current = theme;

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
      ...chartOptions(themeRef.current),
      width: containerRef.current.clientWidth,
      height: 360,
    });

    const series = chart.addSeries(CandlestickSeries, {
      upColor: UP,
      downColor: DOWN,
      borderVisible: false,
      wickUpColor: UP,
      wickDownColor: DOWN,
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

  // Switch the chart colors when the theme changes.
  useEffect(() => {
    chartRef.current?.applyOptions(chartOptions(theme));
  }, [theme]);

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
    <div className="pc-box">
      <div className="pc-head">
        <div className="pc-left">
          <span className="pc-sym">{symbol}</span>
          <span className="pc-chip">1M</span>
          {livePrice && (
            <span className="pc-live">
              <i className="dot open" /> Live
            </span>
          )}
          {status === "loading" && <span>Loading chart…</span>}
          {status === "empty" && <span>No candle data available</span>}
          {status === "error" && <span className="down">Could not load chart data</span>}
        </div>
        {activeBar && (
          <div className="pc-ohlc">
            <span>
              O <b>{activeBar.open.toFixed(2)}</b>
            </span>
            <span>
              H <b className="hi">{activeBar.high.toFixed(2)}</b>
            </span>
            <span>
              L <b className="lo">{activeBar.low.toFixed(2)}</b>
            </span>
            <span>
              C <b className={activeBar.close >= activeBar.open ? "hi" : "lo"}>{activeBar.close.toFixed(2)}</b>
            </span>
          </div>
        )}
      </div>
      <div ref={containerRef} style={{ width: "100%" }} />
    </div>
  );
}
