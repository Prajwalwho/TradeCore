import { userRepository } from "./user.repository.js";
import type { CreateUserInput } from "./user.schema.js";

export const userService = {
  async registerUser(input: CreateUserInput) {
    const existing = await userRepository.findByEmail(input.email);

    if (existing) {
      const error = new Error("Email already registered");
      (error as any).statusCode = 409;
      throw error;
    }

    return userRepository.create(input);
  },
};