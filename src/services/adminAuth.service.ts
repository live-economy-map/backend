import bcrypt from 'bcrypt';
import { prisma } from '../config/db.js';
import { generateToken } from '../utils/jwt.js';
import ApiError from '../utils/ApiError.js';
import { HTTP_STATUS } from '../constants/index.js';

// Constant dummy hash so bcrypt.compare always runs, even when the email
// isn't found — prevents timing-based user enumeration (Doc 8-5).
const DUMMY_HASH = '$2b$10$CwTycUXWue0Thq9StjUM0uJ8w2i4Kwbz3q6VYCH3RfC1S3S3nCqzS';

export const authenticateAdmin = async (
  email: string,
  password: string,
): Promise<{ token: string; admin: { id: string; email: string } }> => {
  const admin = await prisma.admin.findUnique({ where: { email } });

  const isMatch = await bcrypt.compare(password, admin?.password ?? DUMMY_HASH);

  if (!admin || !isMatch) {
    throw new ApiError(HTTP_STATUS.UNAUTHORIZED, 'Invalid email or password');
  }

  const token = generateToken({
    id: admin.id,
    email: admin.email,
    createdAt: admin.createdAt,
  });

  return { token, admin: { id: admin.id, email: admin.email } };
};

// Stateless JWT, no session table (Doc 4). Denylist-vs-no-op decision is an
// open item (Doc 8-5/9-5) — left as a true no-op until that's decided.
export const invalidateSession = async (_token: string): Promise<void> => {
  return;
};
