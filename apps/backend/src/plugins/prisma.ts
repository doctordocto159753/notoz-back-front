import fp from 'fastify-plugin'
import { PrismaClient } from '@prisma/client'
import type { FastifyInstance } from 'fastify'

declare global {
  // eslint-disable-next-line no-var
  var __notoPrisma: PrismaClient | undefined
}

function getPrisma(app: FastifyInstance) {
  if (!global.__notoPrisma) {
    global.__notoPrisma = new PrismaClient({
      log: app.log.level === 'debug' ? ['query', 'info', 'warn', 'error'] : ['warn', 'error']
    })
  }
  return global.__notoPrisma
}

export default fp(async (app: FastifyInstance) => {
  const prisma = getPrisma(app)

  app.decorate('prisma', prisma)

  app.addHook('onClose', async () => {
    // In serverless (Vercel), keep connections warm. In long-running servers,
    // Fastify onClose will be called and disconnect is fine.
    if (process.env.VERCEL) return
    await prisma.$disconnect()
  })
})
