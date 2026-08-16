import { z } from 'zod';
import dotenv from 'dotenv';

dotenv.config();

export const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  PORT: z.string().default('3000'),
  DATABASE_URL: z.string(),
  JWT_SECRET: z.string(),
  JWT_EXPIRES_IN: z.string().default('7d'),
  BCRYPT_SALT_ROUNDS: z.string().default('10'),
  CLIENT_URL: z.string(),
  GOOGLE_EARTH_ENGINE_CREDENTIALS: z.string(),
  GDELT_API_KEY: z.string(),
  LLM_API_KEY: z.string(),
  ADMIN_SEED_EMAIL: z.string(),
  ADMIN_SEED_PASSWORD: z.string(),
});

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  console.error('Invalid environment variables:', parsed.error.flatten().fieldErrors);
  process.exit(1);
}

export const env = parsed.data;
