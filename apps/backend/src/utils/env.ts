import { z } from 'zod'

const EnvSchema = z.object({
  NODE_ENV: z.string().default('development'),
  PORT: z.coerce.number().default(8080),
  LOG_LEVEL: z.string().default('info'),

  DATABASE_URL: z.string().min(1),

  JWT_SECRET: z.string().min(16),
  JWT_EXPIRES_IN: z.string().default('7d'),
  CORS_ORIGIN: z.string().default('http://localhost:3000'),

  MAX_UPLOAD_MB: z.coerce.number().default(8),

  // Media storage
  // - fs: store on local filesystem (default for local Docker)
  // - blob: store on Vercel Blob (recommended for Vercel)
  MEDIA_DRIVER: z.enum(['fs', 'blob']).default('fs'),
  MEDIA_STORAGE_PATH: z.string().default('./data/media'),
  MEDIA_PUBLIC_BASE_URL: z.string().default('http://localhost:8080'),
  BLOB_READ_WRITE_TOKEN: z.string().optional(),

  RATE_LIMIT_MAX: z.coerce.number().default(300),
  RATE_LIMIT_TIME_WINDOW: z.string().default('1 minute')
})

export type Env = z.infer<typeof EnvSchema>

export function getEnv(): Env {
  const parsed = EnvSchema.safeParse(process.env)
  if (!parsed.success) {
    // eslint-disable-next-line no-console
    console.error(parsed.error.format())
    throw new Error('Invalid environment variables')
  }
  return parsed.data
}
