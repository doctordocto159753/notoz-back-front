import type { VercelRequest, VercelResponse } from '@vercel/node'
import { buildApp } from './app'

let appPromise: ReturnType<typeof buildApp> | null = null

export default async function handler(req: VercelRequest, res: VercelResponse) {
  try {
    if (!appPromise) appPromise = buildApp()
    const app = await appPromise
    await app.ready()

    // @ts-ignore - fastify can handle node req/res
    app.server.emit('request', req, res)
  } catch (err: any) {
    console.error('BOOT_ERROR:', err?.message ?? err)
    res.status(500).json({
      ok: false,
      error: 'FUNCTION_BOOT_ERROR',
      message: err?.message ?? 'Unknown error',
    })
  }
}
