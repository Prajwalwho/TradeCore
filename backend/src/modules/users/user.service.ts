import bcrypt from "bcrypt";
import { userRepository } from "./user.repository.js";
import { AppError } from "../../utils/app-error.js";
import type { RegisterUserInput } from "./user.schema.js";

const SALT_ROUNDS = 10;

export const userService = {
  async registerUser(input: RegisterUserInput) {
    const existing = await userRepository.findByEmail(input.email);

    if (existing) {
      throw new AppError("Email already registered", 409);
    }

    const passwordHash = await bcrypt.hash(input.password, SALT_ROUNDS);
    return userRepository.create(input.email, passwordHash);
  },
};