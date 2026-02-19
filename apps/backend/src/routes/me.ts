import type { FastifyPluginAsync } from 'fastify'

const meRoutes: FastifyPluginAsync = async (app) => {
  app.get('/me', { preHandler: app.auth }, async (req) => {
    const userId = req.user!.id

    const user = await app.prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        username: true,
        settings: true
      }
    })

    return { user }
  })
}

export default meRoutes
