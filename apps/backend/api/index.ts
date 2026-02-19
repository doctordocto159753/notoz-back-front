import type { VercelRequest, VercelResponse } from '@vercel/node'
import { buildApp } from '../src/app.js'

// Fastify instance is reused across warm invocations
const app = buildApp()
let isReady = false

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (!isReady) {
    await app.ready()
    isReady = true
  }

  // Preserve original URL for routing
  app.server.emit('request', req, res)
}
