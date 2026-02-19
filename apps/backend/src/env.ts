import { z } from 'zod'

const EnvSchema = z.object({
  NODE_ENV: z.string().optional(),
  DATABASE_URL: z.string().min(1),
  DIRECT_URL: z.string().optional(),
  JWT_SECRET: z.string().min(16),
  CORS_ORIGIN: z.string().default('*'),
  MEDIA_DRIVER: z.enum(['fs', 'blob']).default('fs'),
  BLOB_READ_WRITE_TOKEN: z.string().optional(),
})

const parsed = EnvSchema.safeParse(process.env)
if (!parsed.success) {
  // مهم: روی Vercel اگر اینجا throw کنیم، function ممکنه کرش کند.
  // پس پیام قابل فهم چاپ می‌کنیم و مقدارهای fallback نمی‌گذاریم.
  console.error('ENV_INVALID:', parsed.error.flatten().fieldErrors)
  throw new Error('ENV_INVALID: Missing or invalid environment variables')
}

export const env = parsed.data
