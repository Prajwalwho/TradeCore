import { db } from "../src/db/postgres.js";
import { instruments } from "../src/db/schema.js";
import { CATALOG } from "../src/config/catalog.js";

async function seed() {
  for (const item of CATALOG) {
    await db
      .insert(instruments)
      .values({ symbol: item.symbol, name: item.name })
      .onConflictDoNothing();
  }
  console.log(`Instruments seeded: ${CATALOG.length}`);
  process.exit(0);
}

seed();