import { eq } from "drizzle-orm";
import { instruments } from "../../db/schema.js";
import { db } from "../../db/postgres.js";

export const instrumentRepository = {
  async findAll() {
    return db.select().from(instruments);
  },

    async findById(id: string) {
    const [instrument] = await db.select().from(instruments).where(eq(instruments.id, id));
    return instrument ?? null;
  },

  async findBySymbol(symbol: string) {
    const [instrument] = await db
      .select()
      .from(instruments)
      .where(eq(instruments.symbol, symbol));
    return instrument ?? null;
  },
};