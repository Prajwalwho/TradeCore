import type { FastifyReply, FastifyRequest } from "fastify";
import { AppError } from "../utils/app-error.js";

export async function requireAuth(request: FastifyRequest, reply: FastifyReply) {
  try {
    const payload = await request.jwtVerify<{ userId: string; type: string }>();

    if (payload.type !== "access") {
      throw new AppError("Invalid token type", 401);
    }
  } catch {
    throw new AppError("Unauthorized", 401);
  }
}