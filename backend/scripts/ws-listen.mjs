import WebSocket from "ws";

const token = process.argv[2];
const seconds = Number(process.argv[3] ?? 15);

if (!token) {
  console.error("Usage: node scripts/ws-listen.mjs <accessToken> [seconds]");
  process.exit(1);
}

const ws = new WebSocket(`ws://localhost:3000/ws?token=${token}`);

ws.on("open", () => console.log("connected, listening..."));
ws.on("message", (data) => {
  const msg = JSON.parse(data.toString());
  if (msg.type === "snapshot" || msg.type === "price_update") {
    return; // ignore the market-data noise for this test
  }
  console.log(new Date().toISOString(), JSON.stringify(msg));
});
ws.on("close", (code, reason) => console.log("closed:", code, reason.toString()));

setTimeout(() => {
  ws.close();
  process.exit(0);
}, seconds * 1000);