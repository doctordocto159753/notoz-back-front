import fp from 'fastify-plugin'
import jwt from '@fastify/jwt'
import type { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify'
import { getEnv } from '../utils/env.js'

export default fp(async (app: FastifyInstance) => {
  const env = getEnv()

  app.register(jwt, {
    secret: env.JWT_SECRET,
    sign: { expiresIn: env.JWT_EXPIRES_IN }
  })

  app.decorate('auth', async (req: FastifyRequest, reply: FastifyReply) => {
    try {
      const payload = await req.jwtVerify<{ id: string; username: string }>()
      req.user = { id: payload.id, username: payload.username }
    } catch {
      return reply.code(401).send({ error: 'UNAUTHORIZED' })
    }
  })
})

declare module 'fastify' {
  interface FastifyInstance {
    auth: (req: FastifyRequest, reply: FastifyReply) => Promise<void>
  }
}
