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
  GROQ_KEY: z.string().optional(),
  ADMIN_SEED_EMAIL: z.string(),
  ADMIN_SEED_PASSWORD: z.string(),
  CHAPA_SECRET_KEY: z.string().default('dev_chapa_secret_key'),
  CHAPA_WEBHOOK_SECRET: z.string().default('dev_chapa_webhook_secret'),
  CHAPA_BASE_URL: z.string().default('https://api.chapa.co/v1'),
});

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  console.error('Invalid environment variables:', parsed.error.flatten().fieldErrors);
  process.exit(1);
}

export const env = parsed.data;
