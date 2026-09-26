import { instruments } from "../../db/schema.js";
import { db } from "../../db/postgres.js";

export const instrumentRepository = {
  async findAll() {
    return db.select().from(instruments);
  },
};