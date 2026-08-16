import { prisma } from '../config/db.js';
import bcrypt from 'bcrypt';
import { generateToken } from '../utils/jwt.js';
import ApiError from '../utils/ApiError.js';
import { HTTP_STATUS } from '../constants/index.js';

export const authenticateAdmin = async (
  email: string,
  password: string,
): Promise<{ token: string; admin: { id: string; email: string } }> => {
  throw new Error('not implemented');
};

export const invalidateSession = async (token: string): Promise<void> => {
  throw new Error('not implemented');
};
