import { spawn } from "node:child_process";
import { createInterface } from "node:readline";
import { once } from "node:events";
import { cpus } from "node:os";
import { resolve } from "node:path";

// Measures the C++ engine through the same JSON-over-stdin/stdout protocol the backend uses.
// Usage: npx tsx scripts/bench-engine.ts [orders] [latencySamples]
const BIN = resolve(process.env.ENGINE_BINARY ?? "../engine/build/engine_server");
const N = Number(process.argv[2] ?? 200_000);
const LATENCY_SAMPLES = Number(process.argv[3] ?? 20_000);

let doneCount = 0;
let tradeCount = 0;
let onDone: (() => void) | null = null;
let onReady: (() => void) | null = null;
const ready = new Promise<void>((res) => {
  onReady = res;
});

const child = spawn(BIN, [], { stdio: ["pipe", "pipe", "inherit"] });
const lines = createInterface({ input: child.stdout });

lines.on("line", (line) => {
  if (line.includes('"type":"done"') || line.includes('"type":"error"')) {
    doneCount++;
    onDone?.();
  } else if (line.includes('"type":"ready"')) {
    onReady?.();
  } else if (line.includes("TRADE_EXECUTED")) {
    tradeCount++;
  }
});

// Limit orders around 100.00 (99.50 to 100.50), random side and size, so many of them cross and trade.
function command(id: string): string {
  const side = Math.random() < 0.5 ? "BUY" : "SELL";
  const price = (10000 + Math.floor(Math.random() * 101) - 50) / 100;
  const quantity = 1 + Math.floor(Math.random() * 100);
  return JSON.stringify({
    cmd: "submit",
    reqId: id,
    orderId: id,
    accountId: "bench",
    symbol: "BENCH",
    side,
    type: "LIMIT",
    quantity,
    price,
  });
}

async function throughput(): Promise<void> {
  doneCount = 0;
  tradeCount = 0;
  const finished = new Promise<void>((res) => {
    onDone = () => {
      if (doneCount === N) res();
    };
  });

  const start = process.hrtime.bigint();
  const CHUNK = 5000;
  for (let i = 0; i < N; i += CHUNK) {
    let buffer = "";
    for (let j = i; j < Math.min(i + CHUNK, N); j++) buffer += command(`t${j}`) + "\n";
    if (!child.stdin.write(buffer)) await once(child.stdin, "drain");
  }
  await finished;
  const seconds = Number(process.hrtime.bigint() - start) / 1e9;

  console.log(
    `Throughput: ${Math.round(N / seconds).toLocaleString()} orders/sec ` +
      `(${N.toLocaleString()} orders, ${tradeCount.toLocaleString()} trades, ${seconds.toFixed(2)}s, pipelined)`
  );
}

async function latency(): Promise<void> {
  const samples: number[] = [];
  for (let i = 0; i < LATENCY_SAMPLES; i++) {
    const t0 = process.hrtime.bigint();
    await new Promise<void>((res) => {
      onDone = res;
      child.stdin.write(command(`l${i}`) + "\n");
    });
    samples.push(Number(process.hrtime.bigint() - t0) / 1000); // microseconds
  }
  samples.sort((a, b) => a - b);
  const at = (p: number) => samples[Math.min(samples.length - 1, Math.floor(samples.length * p))] ?? 0;
  console.log(
    `Latency (one order at a time, round trip): p50 ${at(0.5).toFixed(0)} µs, p99 ${at(0.99).toFixed(0)} µs`
  );
}

async function main() {
  await ready;
  console.log(`Machine: ${cpus()[0]?.model ?? "unknown CPU"} (${cpus().length} threads), Node ${process.version}`);
  console.log(`Engine: ${BIN}`);
  await throughput();
  await latency();
  child.stdin.end();
}

main();