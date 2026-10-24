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
): Promise<{
  token: string;
  admin: { id: string; email: string; role: string; createdAt: Date };
}> => {
  const admin = await prisma.admin.findUnique({ where: { email } });
  let adminUser = await prisma.user.findFirst({
    where: { email, role: 'ADMIN' },
  });

  const passwordHash = admin?.password || adminUser?.password || DUMMY_HASH;
  const isMatch = await bcrypt.compare(password, passwordHash);

  if ((!admin && !adminUser) || !isMatch) {
    throw new ApiError(HTTP_STATUS.UNAUTHORIZED, 'Invalid email or password');
  }

  // Ensure a corresponding User record exists with role ADMIN so downstream foreign keys
  // (e.g. ReportRequestEvent.actorId, ReportDeliverable.uploadedById) never fail
  if (!adminUser && admin && typeof (prisma.user as any)?.upsert === 'function') {
    try {
      adminUser = await prisma.user.upsert({
        where: { email },
        update: { role: 'ADMIN', isEmailVerified: true },
        create: {
          email,
          password: admin.password,
          role: 'ADMIN',
          fullName: 'EcoLens Administrator',
          isEmailVerified: true,
        },
      });
    } catch {
      // Fallback silently if database mock doesn't support upsert
    }
  }

  const id = adminUser?.id || admin!.id;
  const adminEmail = adminUser?.email || admin!.email;
  const createdAt = adminUser?.createdAt || admin!.createdAt;

  const token = generateToken({
    id,
    email: adminEmail,
    role: 'ADMIN',
    createdAt,
  });

  return {
    token,
    admin: {
      id,
      email: adminEmail,
      role: 'ADMIN',
      createdAt,
    },
  };
};

// Stateless JWT, no session table (Doc 4). Denylist-vs-no-op decision is an
// open item (Doc 8-5/9-5) — left as a true no-op until that's decided.
export const invalidateSession = async (_token: string): Promise<void> => {
  return;
};
