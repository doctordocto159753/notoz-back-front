import fp from 'fastify-plugin'
import cors from '@fastify/cors'
import helmet from '@fastify/helmet'
import rateLimit from '@fastify/rate-limit'
import type { FastifyInstance } from 'fastify'
import { getEnv } from '../utils/env.js'

export default fp(async (app: FastifyInstance) => {
  const env = getEnv()

  await app.register(helmet)
  await app.register(cors, {
    origin: env.CORS_ORIGIN === '*' ? true : env.CORS_ORIGIN.split(',').map((s) => s.trim()),
    credentials: true
  })

  await app.register(rateLimit, {
    max: env.RATE_LIMIT_MAX,
    timeWindow: env.RATE_LIMIT_TIME_WINDOW
  })
})
