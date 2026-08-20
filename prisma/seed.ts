// ./prisma/seed.ts
import bcrypt from 'bcrypt';
import { DataSourceKey } from '@prisma/client';
import { prisma } from '../src/config/db.js';
import { env } from '../src/config/env.js';

/**
 * Bootstraps the single Admin account and the four fixed DataSource rows.
 * There is no admin-registration endpoint (single-admin design, Doc 4) —
 * this script is the only way an Admin ever comes to exist.
 *
 * Idempotent: safe to re-run. Both upserts are keyed on a unique field
 * (Admin.email, DataSource.key), so re-running never throws on duplicates.
 *
 * NOTE: re-running this after the admin's password was changed via normal
 * means (e.g. a future settings feature) will overwrite it back to the seed
 * value. Acceptable for this project (single-owner, low-stakes dev/practice
 * project) — flagged here for future maintainers. Same caveat applies if a
 * future endpoint ever edits DataSource.description directly.
 */

const DATA_SOURCES: Array<{
  key: DataSourceKey;
  name: string;
  description: string;
}> = [
  {
    key: DataSourceKey.VIIRS,
    name: 'VIIRS Night-Time Lights',
    description:
      'Satellite-observed night-time light emissions, used as a proxy for economic activity and electrification growth.',
  },
  {
    key: DataSourceKey.GHSL,
    name: 'Global Human Settlement Layer',
    description:
      'Satellite-derived built-up surface and settlement density data, used to track physical urban expansion over time.',
  },
  {
    key: DataSourceKey.RWI,
    name: 'Meta Relative Wealth Index',
    description:
      'Modeled relative wealth estimates derived from satellite imagery and connectivity data, used as a socioeconomic baseline signal.',
  },
  {
    key: DataSourceKey.GDELT,
    name: 'GDELT Event Database',
    description:
      'Global news and event data, used as independent human-verified evidence for case-study validation. Not included in the composite score formula.',
  },
];

async function main(): Promise<void> {
  const { ADMIN_SEED_EMAIL, ADMIN_SEED_PASSWORD, BCRYPT_SALT_ROUNDS } = env;

  // Defensive fail-fast check, in addition to config/env.ts's own Zod
  // validation — matches the fail-fast philosophy documented in Doc 8-1/9-1.
  if (!ADMIN_SEED_EMAIL || !ADMIN_SEED_PASSWORD) {
    throw new Error(
      'Seed failed: ADMIN_SEED_EMAIL and ADMIN_SEED_PASSWORD must both be set in the environment.',
    );
  }

  const saltRounds = parseInt(BCRYPT_SALT_ROUNDS, 10);
  const hashedPassword = await bcrypt.hash(ADMIN_SEED_PASSWORD, saltRounds);

  const admin = await prisma.admin.upsert({
    where: { email: ADMIN_SEED_EMAIL },
    update: { password: hashedPassword },
    create: {
      email: ADMIN_SEED_EMAIL,
      password: hashedPassword,
    },
  });
  console.log(`Admin upserted: ${admin.email}`);

  for (const source of DATA_SOURCES) {
    const dataSource = await prisma.dataSource.upsert({
      where: { key: source.key },
      update: {
        name: source.name,
        description: source.description,
      },
      create: {
        key: source.key,
        name: source.name,
        description: source.description,
      },
    });
    console.log(`DataSource upserted: ${dataSource.key}`);
  }
}

main()
  .catch((error) => {
    console.error('Seed failed:', error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
