import fp from 'fastify-plugin'
import multipart from '@fastify/multipart'
import type { FastifyInstance } from 'fastify'
import { getEnv } from '../utils/env.js'

export default fp(async (app: FastifyInstance) => {
  const env = getEnv()

  await app.register(multipart, {
    limits: {
      fileSize: env.MAX_UPLOAD_MB * 1024 * 1024
    }
  })
})
