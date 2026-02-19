import type { FastifyPluginAsync } from 'fastify'

const healthRoutes: FastifyPluginAsync = async (app) => {
  app.get('/healthz', async () => ({ ok: true }))

  app.get('/readyz', async (_req, reply) => {
    try {
      await app.prisma.$queryRaw`SELECT 1`
      return { ok: true }
    } catch {
      return reply.code(503).send({ ok: false })
    }
  })
}

export default healthRoutes
