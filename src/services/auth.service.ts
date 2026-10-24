import bcrypt from 'bcrypt';
import crypto, { randomUUID } from 'crypto';
import { prisma } from '../config/db.js';
import { env } from '../config/env.js';
import { generateToken } from '../utils/jwt.js';
import ApiError from '../utils/ApiError.js';
import { HTTP_STATUS } from '../constants/index.js';
import { RegisterInput, LoginInput, UpdateProfileInput } from '../schemas/auth.schema.js';
import { sendVerificationEmail, sendPasswordResetEmail } from './email.service.js';

const DUMMY_HASH = '$2b$10$CwTycUXWue0Thq9StjUM0uJ8w2i4Kwbz3q6VYCH3RfC1S3S3nCqzS';

const hashToken = (token: string): string => {
  return crypto.createHash('sha256').update(token).digest('hex');
};

export const registerUser = async (input: RegisterInput) => {
  const existingUser = await prisma.user.findUnique({
    where: { email: input.email },
  });

  if (existingUser) {
    throw new ApiError(HTTP_STATUS.CONFLICT, 'Email is already registered');
  }

  const saltRounds = parseInt(env.BCRYPT_SALT_ROUNDS, 10) || 10;
  const hashedPassword = await bcrypt.hash(input.password, saltRounds);

  const rawVerificationToken = randomUUID();
  const tokenHash = hashToken(rawVerificationToken);
  const tokenExpiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours

  const user = await prisma.user.create({
    data: {
      email: input.email,
      password: hashedPassword,
      role: 'USER',
      fullName: input.fullName,
      organizationName: input.organizationName,
      phoneNumber: input.phoneNumber,
      telegramHandle: input.telegramHandle,
      isEmailVerified: false,
      emailTokens: {
        create: {
          tokenHash,
          type: 'EMAIL_VERIFICATION',
          expiresAt: tokenExpiresAt,
        },
      },
    },
    select: {
      id: true,
      email: true,
      role: true,
      fullName: true,
      organizationName: true,
      phoneNumber: true,
      telegramHandle: true,
      isEmailVerified: true,
      createdAt: true,
    },
  });

  // Dispatch transactional verification email (non-blocking failure)
  sendVerificationEmail(user.email, rawVerificationToken).catch(() => {});

  const token = generateToken({
    id: user.id,
    email: user.email,
    role: user.role,
    createdAt: user.createdAt,
  });

  return { user, token };
};

export const loginUser = async (input: LoginInput) => {
  const user = await prisma.user.findUnique({
    where: { email: input.email },
  });

  const isMatch = await bcrypt.compare(input.password, user?.password ?? DUMMY_HASH);

  if (!user || !isMatch) {
    throw new ApiError(HTTP_STATUS.UNAUTHORIZED, 'Invalid email or password');
  }

  const token = generateToken({
    id: user.id,
    email: user.email,
    role: user.role,
    createdAt: user.createdAt,
  });

  return {
    user: {
      id: user.id,
      email: user.email,
      role: user.role,
      fullName: user.fullName,
      organizationName: user.organizationName,
      phoneNumber: user.phoneNumber,
      telegramHandle: user.telegramHandle,
      isEmailVerified: user.isEmailVerified,
      createdAt: user.createdAt,
    },
    token,
  };
};

export const verifyEmail = async (rawToken: string) => {
  const tokenHash = hashToken(rawToken);

  const emailToken = await prisma.emailToken.findFirst({
    where: {
      tokenHash,
      type: 'EMAIL_VERIFICATION',
      usedAt: null,
      expiresAt: { gt: new Date() },
    },
  });

  if (!emailToken) {
    throw new ApiError(HTTP_STATUS.BAD_REQUEST, 'Invalid or expired verification token');
  }

  await prisma.$transaction([
    prisma.emailToken.update({
      where: { id: emailToken.id },
      data: { usedAt: new Date() },
    }),
    prisma.user.update({
      where: { id: emailToken.userId },
      data: { isEmailVerified: true },
    }),
  ]);

  return { message: 'Email verified successfully' };
};

export const requestPasswordReset = async (email: string) => {
  const user = await prisma.user.findUnique({
    where: { email },
  });

  if (user) {
    const rawResetToken = randomUUID();
    const tokenHash = hashToken(rawResetToken);
    const expiresAt = new Date(Date.now() + 60 * 60 * 1000); // 1 hour

    await prisma.emailToken.create({
      data: {
        userId: user.id,
        tokenHash,
        type: 'PASSWORD_RESET',
        expiresAt,
      },
    });

    sendPasswordResetEmail(user.email, rawResetToken).catch(() => {});
  }

  // Always return identical success message to prevent user enumeration
  return {
    message: 'If the email exists, a password reset link has been dispatched',
  };
};

export const resetPassword = async (rawToken: string, newPassword: string) => {
  const tokenHash = hashToken(rawToken);

  const emailToken = await prisma.emailToken.findFirst({
    where: {
      tokenHash,
      type: 'PASSWORD_RESET',
      usedAt: null,
      expiresAt: { gt: new Date() },
    },
  });

  if (!emailToken) {
    throw new ApiError(HTTP_STATUS.BAD_REQUEST, 'Invalid or expired reset token');
  }

  const saltRounds = parseInt(env.BCRYPT_SALT_ROUNDS, 10) || 10;
  const hashedPassword = await bcrypt.hash(newPassword, saltRounds);

  await prisma.$transaction([
    prisma.emailToken.update({
      where: { id: emailToken.id },
      data: { usedAt: new Date() },
    }),
    prisma.user.update({
      where: { id: emailToken.userId },
      data: { password: hashedPassword },
    }),
  ]);

  return { message: 'Password reset successfully' };
};

export const getProfile = async (userId: string) => {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      email: true,
      role: true,
      fullName: true,
      organizationName: true,
      phoneNumber: true,
      telegramHandle: true,
      isEmailVerified: true,
      createdAt: true,
      updatedAt: true,
    },
  });

  if (!user) {
    throw new ApiError(HTTP_STATUS.NOT_FOUND, 'User not found');
  }

  return user;
};

export const updateProfile = async (userId: string, input: UpdateProfileInput) => {
  const user = await prisma.user.update({
    where: { id: userId },
    data: {
      ...(input.fullName !== undefined ? { fullName: input.fullName } : {}),
      ...(input.organizationName !== undefined ? { organizationName: input.organizationName } : {}),
      ...(input.phoneNumber !== undefined ? { phoneNumber: input.phoneNumber } : {}),
      ...(input.telegramHandle !== undefined ? { telegramHandle: input.telegramHandle } : {}),
    },
    select: {
      id: true,
      email: true,
      role: true,
      fullName: true,
      organizationName: true,
      phoneNumber: true,
      telegramHandle: true,
      isEmailVerified: true,
      createdAt: true,
      updatedAt: true,
    },
  });

  return user;
};

export const resendVerificationEmail = async (userIdOrEmail: {
  userId?: string;
  email?: string;
}) => {
  let user;
  if (userIdOrEmail.userId) {
    user = await prisma.user.findUnique({ where: { id: userIdOrEmail.userId } });
  } else if (userIdOrEmail.email) {
    user = await prisma.user.findUnique({
      where: { email: userIdOrEmail.email.toLowerCase().trim() },
    });
  }

  if (!user) {
    throw new ApiError(HTTP_STATUS.NOT_FOUND, 'User not found');
  }

  if (user.isEmailVerified) {
    throw new ApiError(HTTP_STATUS.BAD_REQUEST, 'Email is already verified');
  }

  const rawVerificationToken = randomUUID();
  const tokenHash = hashToken(rawVerificationToken);
  const tokenExpiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000);

  await prisma.emailToken.create({
    data: {
      userId: user.id,
      tokenHash,
      type: 'EMAIL_VERIFICATION',
      expiresAt: tokenExpiresAt,
    },
  });

  sendVerificationEmail(user.email, rawVerificationToken).catch(() => {});

  return { message: 'Verification email sent successfully' };
};
