import WebSocket from "ws";

const token = process.argv[2];
if (!token) {
  console.error("Usage: node scripts/ws-test.mjs <accessToken>");
  process.exit(1);
}

const ws = new WebSocket(`ws://localhost:3000/ws?token=${token}`);

ws.on("open", () => console.log("connected"));
ws.on("message", (data) => console.log("message:", data.toString()));
ws.on("close", (code, reason) => console.log("closed:", code, reason.toString()));
ws.on("error", (err) => console.error("error:", err.message));

setTimeout(() => {
  ws.close();
  process.exit(0);
}, 6000);