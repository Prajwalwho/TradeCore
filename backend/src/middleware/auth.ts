import type { FastifyReply, FastifyRequest } from "fastify";
import { AppError } from "../utils/app-error.js";
import { userRepository } from "../modules/users/user.repository.js";

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

// Use after requireAuth on actions that need a confirmed email address, like trading.
export async function requireVerified(request: FastifyRequest) {
  const { userId } = request.user as { userId: string };
  const user = await userRepository.findById(userId);

  if (!user) {
    throw new AppError("Unauthorized", 401);
  }
  if (!user.emailVerifiedAt) {
    throw new AppError("Please verify your email before trading", 403);
  }
}