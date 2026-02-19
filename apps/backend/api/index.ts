import type { VercelRequest, VercelResponse } from '@vercel/node'
import type { FastifyInstance } from 'fastify'
import { buildApp } from '../src/app.js'

// Reuse Fastify across warm invocations, but avoid crashing the function at import-time
// if env is missing/misconfigured.
let app: FastifyInstance | null = null

// ✅ FIX: Fastify's app.ready() is PromiseLike (thenable), not Promise<void>
let readyPromise: PromiseLike<unknown> | null = null

export default async function handler(req: VercelRequest, res: VercelResponse) {
  try {
    if (!app) app = buildApp()

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
