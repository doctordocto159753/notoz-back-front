import type { FastifyPluginAsync } from 'fastify'
import { z } from 'zod'
import { computeNextRepeat } from '../services/time.js'

const IdParams = z.object({ id: z.string().uuid() })

const SnoozeSchema = z.object({
  minutes: z.number().int().min(1).max(1440)
})

const alarmRoutes: FastifyPluginAsync = async (app) => {
  app.get('/', { preHandler: app.auth }, async (req) => {
    const userId = req.user!.id

    const alarms = await app.prisma.alarm.findMany({
      where: { userId },
      include: {
        checklistItem: { select: { id: true, title: true } },
        noteBlock: { select: { id: true, searchText: true } }
      },
      orderBy: [{ at: 'asc' }]
    })

    return { alarms }
  })

  app.post('/:id/dismiss', { preHandler: app.auth }, async (req, reply) => {
    const userId = req.user!.id
    const { id } = IdParams.parse(req.params)

    const alarm = await app.prisma.alarm.findFirst({ where: { id, userId } })
    if (!alarm) return reply.code(404).send({ error: 'NOT_FOUND' })

    // اگر repeat دارد، آلارم بعدی schedule شود
    const next = computeNextRepeat(alarm.at, alarm.repeat)

    const updated = await app.prisma.alarm.update({
      where: { id },
      data: next
        ? { at: next, status: 'scheduled', firedAt: null }
        : { status: 'dismissed', firedAt: new Date() }
    })

    return { alarm: updated }
  })

  app.post('/:id/snooze', { preHandler: app.auth }, async (req, reply) => {
    const userId = req.user!.id
    const { id } = IdParams.parse(req.params)
    const body = SnoozeSchema.parse(req.body)

    const alarm = await app.prisma.alarm.findFirst({ where: { id, userId } })
    if (!alarm) return reply.code(404).send({ error: 'NOT_FOUND' })

    const at = new Date(Date.now() + body.minutes * 60 * 1000)

    const updated = await app.prisma.alarm.update({
      where: { id },
      data: { at, status: 'scheduled', snoozeMinutes: body.minutes, firedAt: null }
    })

    return { alarm: updated }
  })

  // اختیاری برای فرانت: وقتی داخل اپ، زمان رسید و شما خواستید وضعیت را fired کنید
  app.post('/:id/fire', { preHandler: app.auth }, async (req, reply) => {
    const userId = req.user!.id
    const { id } = IdParams.parse(req.params)

    const alarm = await app.prisma.alarm.findFirst({ where: { id, userId } })
    if (!alarm) return reply.code(404).send({ error: 'NOT_FOUND' })

    const next = computeNextRepeat(alarm.at, alarm.repeat)

    const updated = await app.prisma.alarm.update({
      where: { id },
      data: next
        ? { at: next, status: 'scheduled', firedAt: new Date() }
        : { status: 'fired', firedAt: new Date() }
    })

    return { alarm: updated }
  })
}

export default alarmRoutes
