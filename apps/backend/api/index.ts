import type { VercelRequest, VercelResponse } from '@vercel/node'
import { buildApp } from '../src/app.js'

// Reuse Fastify across warm invocations, but avoid crashing the function at import-time
// if env is missing/misconfigured.
type App = Awaited<ReturnType<typeof buildApp>>

let appPromise: ReturnType<typeof buildApp> | null = null
let readyPromise: Promise<void> | null = null

export default async function handler(req: VercelRequest, res: VercelResponse) {
  try {
    if (!appPromise) appPromise = buildApp()

    const app: App = await appPromise

    if (!readyPromise) readyPromise = app.ready()
    await readyPromise

    // Hand off to Fastify
    // @ts-ignore - Fastify's Node server can handle Vercel req/res
    app.server.emit('request', req, res)
  } catch (err: any) {
    // Never show Vercel's generic crash page; return a JSON error instead.
    // eslint-disable-next-line no-console
    console.error('FUNCTION_BOOT_ERROR', err)
    res.statusCode = 500
    res.setHeader('content-type', 'application/json; charset=utf-8')
    res.end(
      JSON.stringify({
        ok: false,
        error: 'FUNCTION_INVOCATION_FAILED',
        message: err?.message ?? 'Unknown error',
      }),
    )
  }
}
