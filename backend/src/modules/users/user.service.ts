import bcrypt from "bcrypt";
import { userRepository } from "./user.repository.js";
import { accountRepository } from "../accounts/account.repository.js";

import { AppError } from "../../utils/app-error.js";
import type { RegisterUserInput, LoginUserInput } from "./user.schema.js";

const SALT_ROUNDS = 10;

export const userService = {
  async registerUser(input: RegisterUserInput) {
    const existing = await userRepository.findByEmail(input.email);

    if (existing) {
      throw new AppError("Email already registered", 409);
    }

    const passwordHash = await bcrypt.hash(input.password, SALT_ROUNDS);
    const user = await userRepository.create(input.email, passwordHash);

    await accountRepository.createForUser(user.id);

    return user;
  },

  async loginUser(input: LoginUserInput) {
    const user = await userRepository.findByEmail(input.email);

    if (!user) {
      throw new AppError("Invalid email or password", 401);
    }

    const passwordMatches = await bcrypt.compare(input.password, user.passwordHash);

    if (!passwordMatches) {
      throw new AppError("Invalid email or password", 401);
    }

    return user;
  },
};