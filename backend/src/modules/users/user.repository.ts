import { eq } from "drizzle-orm";
import { db } from "../../db/postgres.js";
import { users } from "../../db/schema.js";

export const userRepository = {
  async create(email: string, passwordHash: string) {
    const [user] = await db
      .insert(users)
      .values({ email, passwordHash })
      .returning();

    if (!user) {
      throw new Error("Failed to create user");
    }

    return user;
  },

  async findByEmail(email: string) {
    const [user] = await db
      .select()
      .from(users)
      .where(eq(users.email, email));
    return user ?? null;
  },

  async findById(id: string) {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user ?? null;
  },
};