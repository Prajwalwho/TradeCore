import { useEffect, useRef } from "react";
import { createChart, ColorType, LineSeries, type IChartApi, type ISeriesApi, type Time } from "lightweight-charts";
import type { PricePoint } from "../lib/market-api";

type Props = {
  symbol: string;
  livePrice: PricePoint | null;
};

// Caps how much history we keep in the chart, so a long-running session
// doesn't grow this array forever.
const MAX_POINTS = 300;

export function PriceChart({ symbol, livePrice }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<IChartApi | null>(null);
  const seriesRef = useRef<ISeriesApi<"Line"> | null>(null);
  const historyRef = useRef<{ time: Time; value: number }[]>([]);

  // Create the chart once per mount.
  useEffect(() => {
    if (!containerRef.current) {
      return;
    }

    const chart = createChart(containerRef.current, {
      layout: {
        background: { type: ColorType.Solid, color: "#1e293b" },
        textColor: "#e2e8f0",
      },
      grid: {
        vertLines: { color: "#334155" },
        horzLines: { color: "#334155" },
      },
      width: containerRef.current.clientWidth,
      height: 320,
      timeScale: { timeVisible: true, secondsVisible: true },
    });

    const series = chart.addSeries(LineSeries, {
      color: "#4ade80",
      lineWidth: 2,
    });

    chartRef.current = chart;
    seriesRef.current = series;
    historyRef.current = []; // reset history when switching symbols (see the [symbol] dep below)

    const handleResize = () => {
      if (containerRef.current) {
        chart.applyOptions({ width: containerRef.current.clientWidth });
      }
    };
    window.addEventListener("resize", handleResize);

    return () => {
      window.removeEventListener("resize", handleResize);
      chart.remove();
      chartRef.current = null;
      seriesRef.current = null;
    };
  }, [symbol]); // re-create the chart when the user navigates to a different instrument

  // Append each new tick as it arrives.
  useEffect(() => {
    if (!livePrice || !seriesRef.current) {
      return;
    }

    const time = Math.floor(new Date(livePrice.updatedAt).getTime() / 1000) as Time;
    const point = { time, value: livePrice.price };

    const history = historyRef.current;
    const last = history[history.length - 1];

    // Lightweight Charts requires strictly increasing timestamps; guard against
    // a duplicate/out-of-order tick (can happen right after a symbol switch).
    if (last && last.time >= time) {
      return;
    }

    history.push(point);
    if (history.length > MAX_POINTS) {
      history.shift();
    }

    seriesRef.current.update(point);
  }, [livePrice]);

  return <div ref={containerRef} style={{ width: "100%" }} />;
}