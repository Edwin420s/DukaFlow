import 'dotenv/config';
import { z } from 'zod';

const schema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().int().positive().default(4000),
  CLIENT_ORIGIN: z.string().url().default('http://localhost:5173'),
  MONGODB_URI: z.string().min(1).default('mongodb://127.0.0.1:27017/retail_platform'),
  JWT_ACCESS_SECRET: z.string().min(32).default('development-only-access-secret-change-me'),
  JWT_REFRESH_SECRET: z.string().min(32).default('development-only-refresh-secret-change-me'),
  MPESA_ENV: z.enum(['sandbox', 'production']).default('sandbox'),
  MPESA_CONSUMER_KEY: z.string().optional().default(''),
  MPESA_CONSUMER_SECRET: z.string().optional().default(''),
  MPESA_SHORTCODE: z.string().optional().default(''),
  MPESA_PASSKEY: z.string().optional().default(''),
  MPESA_CALLBACK_URL: z.string().url().optional()
});

const parsed = schema.safeParse(process.env);
if (!parsed.success) {
  console.error('Invalid environment configuration:', parsed.error.flatten().fieldErrors);
  process.exit(1);
}
export const env = Object.freeze(parsed.data);
