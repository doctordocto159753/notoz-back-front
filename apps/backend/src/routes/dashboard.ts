import type { FastifyPluginAsync } from 'fastify'
import { z } from 'zod'
import { getDayRange } from '../services/time.js'

const QuerySchema = z.object({
  tz: z.string().optional().default('Asia/Tehran')
})

const dashboardRoutes: FastifyPluginAsync = async (app) => {
  app.get('/today', { preHandler: app.auth }, async (req) => {
    const userId = req.user!.id
    const { tz } = QuerySchema.parse(req.query)

    const { start, end, now } = getDayRange(tz)

    const today = await app.prisma.alarm.findMany({
      where: {
        userId,
        status: 'scheduled',
        at: { gte: start, lte: end }
      },
      include: {
        checklistItem: { select: { id: true, title: true } },
        noteBlock: { select: { id: true, searchText: true } }
      },
      orderBy: [{ at: 'asc' }]
    })

    const missed = await app.prisma.alarm.findMany({
      where: {
        userId,
        status: 'scheduled',
        at: { lt: now }
      },
      include: {
        checklistItem: { select: { id: true, title: true } },
        noteBlock: { select: { id: true, searchText: true } }
      },
      orderBy: [{ at: 'asc' }]
    })

    return { tz, today, missed }
  })
}

export default dashboardRoutes
