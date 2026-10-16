import bcrypt from "bcrypt";
import { userRepository } from "./user.repository.js";
import { authTokenRepository } from "./auth-token.repository.js";
import { accountRepository } from "../accounts/account.repository.js";
import { sendEmail } from "../../utils/mailer.js";
import { config } from "../../config/env.js";
import { AppError } from "../../utils/app-error.js";
import type { RegisterUserInput, LoginUserInput } from "./user.schema.js";

const SALT_ROUNDS = 10;
const VERIFY_TTL_MS = 24 * 60 * 60 * 1000;
const RESET_TTL_MS = 60 * 60 * 1000;

async function sendVerificationEmail(userId: string, email: string) {
  const token = await authTokenRepository.issue(userId, "VERIFY_EMAIL", VERIFY_TTL_MS);
  await sendEmail({
    to: email,
    subject: "Verify your email",
    text:
      `Welcome to TradeCore!\n\nConfirm your email to start trading:\n` +
      `${config.appUrl}/verify-email?token=${token}\n\nThis link works for 24 hours.`,
  });
}

export const userService = {
  async registerUser(input: RegisterUserInput) {
    const existing = await userRepository.findByEmail(input.email);

    if (existing) {
      throw new AppError("Email already registered", 409);
    }

    const passwordHash = await bcrypt.hash(input.password, SALT_ROUNDS);
    const user = await userRepository.create(input.email, passwordHash);

    await accountRepository.createForUser(user.id);

    if (!config.emailVerification.required) {
      // Demo mode: no email step, the account can trade straight away.
      await userRepository.markEmailVerified(user.id);
    } else {
      try {
        await sendVerificationEmail(user.id, user.email);
      } catch (err) {
        // Registration must not fail just because the email could not be sent; the user can resend.
        console.error("[auth] could not send verification email", err);
      }
    }

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

  async getMe(userId: string) {
    const user = await userRepository.findById(userId);
    if (!user) {
      throw new AppError("Account not found", 404);
    }
    return { userId: user.id, email: user.email, emailVerified: user.emailVerifiedAt !== null };
  },

  async verifyEmail(token: string) {
    const userId = await authTokenRepository.consume("VERIFY_EMAIL", token);
    if (!userId) {
      throw new AppError("This link is invalid or has expired", 400);
    }
    await userRepository.markEmailVerified(userId);
  },

  async resendVerification(userId: string) {
    const user = await userRepository.findById(userId);
    if (!user) {
      throw new AppError("Account not found", 404);
    }
    if (user.emailVerifiedAt) {
      return { message: "Your email is already verified" };
    }
    await sendVerificationEmail(user.id, user.email);
    return { message: "Verification email sent" };
  },

  // Always succeeds from the caller's point of view, so nobody can probe which emails exist.
  async forgotPassword(email: string) {
    const user = await userRepository.findByEmail(email);
    if (!user) return;

    const token = await authTokenRepository.issue(user.id, "RESET_PASSWORD", RESET_TTL_MS);
    await sendEmail({
      to: user.email,
      subject: "Reset your password",
      text:
        `Someone asked to reset your TradeCore password.\n\n` +
        `Choose a new one here:\n${config.appUrl}/reset-password?token=${token}\n\n` +
        `This link works for 1 hour. If this was not you, ignore this email.`,
    });
  },

  async resetPassword(token: string, newPassword: string) {
    const userId = await authTokenRepository.consume("RESET_PASSWORD", token);
    if (!userId) {
      throw new AppError("This link is invalid or has expired", 400);
    }
    const passwordHash = await bcrypt.hash(newPassword, SALT_ROUNDS);
    await userRepository.updatePassword(userId, passwordHash);
    // Using the emailed link also proves the person owns this email address.
    await userRepository.markEmailVerified(userId);
  },
};
