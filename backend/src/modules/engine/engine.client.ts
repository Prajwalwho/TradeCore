import { spawn, type ChildProcessWithoutNullStreams } from "node:child_process";
import { createInterface } from "node:readline";
import { randomUUID } from "node:crypto";
import { resolve as resolvePath } from "node:path";
import { config } from "../../config/env.js";

// ---- Messages the engine sends (mirrors engine/src/protocol/EngineProtocol.cpp) ----

export type EngineOrderStatus =
  | "PENDING"
  | "PARTIALLY_FILLED"
  | "FILLED"
  | "CANCELLED"
  | "REJECTED";

export type EngineTrade = {
  id: string;
  buyOrderId: string;
  sellOrderId: string;
  symbol: string;
  price: number;
  quantity: number;
  executedAtMs: number;
};

export type EngineEvent = {
  type: "event";
  reqId: string;
  event:
    | "ORDER_RESTED"
    | "TRADE_EXECUTED"
    | "ORDER_FILLED"
    | "ORDER_CANCELLED"
    | "ORDER_REJECTED";
  orderId?: string;
  trade?: EngineTrade;
};

export type EngineSubmitDone = {
  type: "done";
  reqId: string;
  ok: true;
  orderId: string;
  status: EngineOrderStatus;
  filledQuantity: number;
  remainingQuantity: number;
};

export type EngineCancelDone = {
  type: "done";
  reqId: string;
  ok: true;
  result: "CANCELLED" | "NOT_FOUND";
};

type EngineDone = EngineSubmitDone | EngineCancelDone;
type EngineErrorMessage = { type: "error"; reqId: string | null; message: string };
type EngineReply = EngineEvent | EngineDone | EngineErrorMessage;
type EngineMessage = { type: "ready" } | EngineReply;

// ---- Errors ----

// The engine ran but refused the command (bad data). Retrying the same order won't help.
export class EngineRejectedError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "EngineRejectedError";
  }
}

// The engine isn't running, crashed, or didn't answer in time. Outcome is unknown.
export class EngineUnavailableError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "EngineUnavailableError";
  }
}

// ---- Client ----

type Pending = {
  resolve: (result: { done: EngineDone; events: EngineEvent[] }) => void;
  reject: (error: Error) => void;
  events: EngineEvent[];
  timer: ReturnType<typeof setTimeout>;
};

export type SubmitOrderCommand = {
  symbol: string;
  orderId: string;
  accountId: string;
  side: "BUY" | "SELL";
  type: "MARKET" | "LIMIT";
  quantity: number;
  price?: number | undefined;
};

export class EngineClient {
  private child: ChildProcessWithoutNullStreams | null = null;
  private ready = false;
  private readonly pending = new Map<string, Pending>();
  private readonly binaryPath: string;
  private readonly timeoutMs: number;

  constructor(binaryPath: string, timeoutMs = 5000) {
    this.binaryPath = binaryPath;
    this.timeoutMs = timeoutMs;
  }

  // Spawns the engine and resolves once it prints {"type":"ready"}.
  start(): Promise<void> {
    return new Promise<void>((resolve, reject) => {
      const child = spawn(this.binaryPath, [], { stdio: ["pipe", "pipe", "pipe"] });
      this.child = child;

      const startupTimer = setTimeout(() => {
        reject(new EngineUnavailableError("engine did not report ready in time"));
        child.kill();
      }, this.timeoutMs);

      child.once("error", (err) => {
        clearTimeout(startupTimer);
        this.child = null;
        reject(
          new EngineUnavailableError(
            `could not start engine at ${this.binaryPath}: ${err.message}`
          )
        );
      });

      child.stdin.on("error", (err) => {
        console.error(`[engine] stdin error: ${err.message}`);
      });

      child.stderr.on("data", (chunk: Buffer) => {
        console.error(`[engine] ${chunk.toString().trimEnd()}`);
      });

      const lines = createInterface({ input: child.stdout });
      lines.on("line", (line) => {
        const msg = this.parse(line);
        if (!msg) {
          return;
        }
        if (msg.type === "ready") {
          this.ready = true;
          clearTimeout(startupTimer);
          resolve();
          return;
        }
        this.dispatch(msg);
      });

      child.once("exit", (code, signal) => {
        clearTimeout(startupTimer);
        this.ready = false;
        this.child = null;
        const reason = new EngineUnavailableError(
          `engine exited (code=${code}, signal=${signal})`
        );
        reject(reason); // no-op if start() already succeeded
        this.failAllPending(reason);
      });
    });
  }

  submitOrder(order: SubmitOrderCommand) {
    return this.request<EngineSubmitDone>({ cmd: "submit", ...order });
  }

  cancelOrder(symbol: string, orderId: string) {
    return this.request<EngineCancelDone>({ cmd: "cancel", symbol, orderId });
  }

  // Closing stdin is the engine's signal to exit cleanly.
  async stop(): Promise<void> {
    const child = this.child;
    if (!child) {
      return;
    }
    await new Promise<void>((resolve) => {
      child.once("exit", () => resolve());
      child.stdin.end();
      setTimeout(() => child.kill(), 2000).unref();
    });
  }

  private request<T extends EngineDone>(command: Record<string, unknown>) {
    return new Promise<{ done: T; events: EngineEvent[] }>((resolve, reject) => {
      const child = this.child;
      if (!child || !this.ready) {
        reject(new EngineUnavailableError("engine is not running"));
        return;
      }

      const reqId = randomUUID();

      const timer = setTimeout(() => {
        this.pending.delete(reqId);
        reject(new EngineUnavailableError(`engine did not answer request ${reqId} in time`));
      }, this.timeoutMs);

      this.pending.set(reqId, {
        resolve: (result) => resolve(result as { done: T; events: EngineEvent[] }),
        reject,
        events: [],
        timer,
      });

      child.stdin.write(JSON.stringify({ ...command, reqId }) + "\n", (err) => {
        if (err) {
          clearTimeout(timer);
          this.pending.delete(reqId);
          reject(new EngineUnavailableError(`could not write to engine: ${err.message}`));
        }
      });
    });
  }

  private parse(line: string): EngineMessage | null {
    try {
      return JSON.parse(line) as EngineMessage;
    } catch {
      console.error(`[engine] unparseable output: ${line}`);
      return null;
    }
  }

  private dispatch(msg: EngineReply): void {
    if (msg.reqId === null) {
      console.error(`[engine] error without a request id: ${msg.type === "error" ? msg.message : ""}`);
      return;
    }

    const pending = this.pending.get(msg.reqId);
    if (!pending) {
      return; // the request already timed out
    }

    if (msg.type === "event") {
      pending.events.push(msg);
      return;
    }

    clearTimeout(pending.timer);
    this.pending.delete(msg.reqId);

    if (msg.type === "done") {
      pending.resolve({ done: msg, events: pending.events });
    } else {
      pending.reject(new EngineRejectedError(msg.message));
    }
  }

  private failAllPending(error: Error): void {
    for (const pending of this.pending.values()) {
      clearTimeout(pending.timer);
      pending.reject(error);
    }
    this.pending.clear();
  }
}

// One engine process for the whole backend.
export const engineClient = new EngineClient(resolvePath(config.engine.binaryPath));