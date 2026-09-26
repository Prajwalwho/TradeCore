import { db } from "../src/db/postgres.js";
import { instruments } from "../src/db/schema.js";

const SEED_DATA = [
  { symbol: "AAPL", name: "Apple Inc." },
  { symbol: "TSLA", name: "Tesla, Inc." },
  { symbol: "RELIANCE", name: "Reliance Industries Ltd." },
  { symbol: "TCS", name: "Tata Consultancy Services Ltd." },
  { symbol: "INFY", name: "Infosys Ltd." },
];

async function seed() {
  for (const item of SEED_DATA) {
    await db.insert(instruments).values(item).onConflictDoNothing();
  }
  console.log("Instruments seeded.");
  process.exit(0);
}

seed();