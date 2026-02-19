import type { FastifyPluginAsync } from 'fastify'
import { z } from 'zod'
import { normalizeDigitsToEnglish } from '../utils/digits.js'
import { sanitizeRichHtml, stripHtmlToText } from '../utils/sanitize.js'

const IdParams = z.object({ id: z.string().uuid() })

const ChecklistCreateSchema = z.object({
  title: z.string().min(1).max(200),
  descriptionHtml: z.string().optional().default(''),
  pinned: z.boolean().optional().default(false),
  archived: z.boolean().optional().default(false),
  checked: z.boolean().optional().default(false),
  tags: z.array(z.string().uuid()).optional().default([])
})

const ChecklistUpdateSchema = z.object({
  title: z.string().min(1).max(200).optional(),
  descriptionHtml: z.string().optional(),
  pinned: z.boolean().optional(),
  archived: z.boolean().optional(),
  checked: z.boolean().optional(),
  tags: z.array(z.string().uuid()).optional(),
  // برای تغییر آلارم اینجا نیست؛ endpoint جدا دارد
})

const ReorderSchema = z.object({
  orderedIds: z.array(z.string().uuid()).min(1)
})

const ListQuerySchema = z.object({
  includeArchived: z.coerce.boolean().optional().default(false),
  hideChecked: z.coerce.boolean().optional().default(false),
  q: z.string().optional(),
  tagIds: z.string().optional() // comma separated
})

const AlarmUpsertSchema = z.object({
  at: z.string().datetime().nullable(),
  repeat: z.enum(['none', 'daily', 'weekly']).optional().default('none'),
  snoozeMinutes: z.number().int().min(1).max(1440).nullable().optional()
})

const checklistRoutes: FastifyPluginAsync = async (app) => {
  app.get('/', { preHandler: app.auth }, async (req) => {
    const userId = req.user!.id
    const q = ListQuerySchema.parse(req.query)

    const where: any = { userId, deletedAt: null }
    if (!q.includeArchived) where.archived = false
    if (q.hideChecked) where.checked = false

    if (q.tagIds) {
      const ids = q.tagIds.split(',').map((s) => s.trim()).filter(Boolean)
      if (ids.length) {
        where.tags = { some: { id: { in: ids } } }
      }
    }

    if (q.q && q.q.trim()) {
      const query = q.q.trim()
      where.OR = [
        { title: { contains: query, mode: 'insensitive' } },
        { descriptionHtml: { contains: query, mode: 'insensitive' } }
      ]
    }

    const items = await app.prisma.checklistItem.findMany({
      where,
      include: { tags: true, alarm: true },
      orderBy: [
        { pinned: 'desc' },
        { checked: 'asc' },
        { orderIndex: 'asc' },
        { updatedAt: 'desc' }
      ]
    })

    return { items }
  })

  app.post('/', { preHandler: app.auth }, async (req, reply) => {
    const userId = req.user!.id
    const body = ChecklistCreateSchema.parse(req.body)

    const title = normalizeDigitsToEnglish(body.title.trim())
    const descriptionHtml = sanitizeRichHtml(body.descriptionHtml ?? '')

    const max = await app.prisma.checklistItem.aggregate({
      where: { userId, deletedAt: null },
      _max: { orderIndex: true }
    })
    const nextOrder = (max._max.orderIndex ?? 0) + 1

    const item = await app.prisma.checklistItem.create({
      data: {
        userId,
        title,
        descriptionHtml,
        pinned: body.pinned,
        archived: body.archived,
        checked: body.checked,
        orderIndex: nextOrder,
        tags: body.tags.length ? { connect: body.tags.map((id) => ({ id })) } : undefined
      },
      include: { tags: true, alarm: true }
    })

    return reply.code(201).send({ item })
  })

  // لیست آیتم‌های حذف‌شده برای بازیابی (Recycle Bin)
  app.get('/deleted', { preHandler: app.auth }, async (req) => {
    const userId = req.user!.id
    const items = await app.prisma.checklistItem.findMany({
      where: { userId, deletedAt: { not: null } },
      include: { tags: true, alarm: true },
      orderBy: [{ deletedAt: 'desc' }]
    })
    return { items }
  })

  app.get('/:id', { preHandler: app.auth }, async (req, reply) => {
    const userId = req.user!.id
    const { id } = IdParams.parse(req.params)

    const item = await app.prisma.checklistItem.findFirst({
      where: { id, userId },
      include: { tags: true, alarm: true }
    })

    if (!item || item.deletedAt) return reply.code(404).send({ error: 'NOT_FOUND' })
    return { item }
  })

  app.patch('/:id', { preHandler: app.auth }, async (req, reply) => {
    const userId = req.user!.id
    const { id } = IdParams.parse(req.params)
    const body = ChecklistUpdateSchema.parse(req.body)

    const existing = await app.prisma.checklistItem.findFirst({
      where: { id, userId }
    })
    if (!existing || existing.deletedAt) return reply.code(404).send({ error: 'NOT_FOUND' })

    const data: any = {}

    if (body.title) data.title = normalizeDigitsToEnglish(body.title.trim())
    if (body.descriptionHtml != null) data.descriptionHtml = sanitizeRichHtml(body.descriptionHtml)
    if (typeof body.pinned === 'boolean') data.pinned = body.pinned
    if (typeof body.archived === 'boolean') data.archived = body.archived

    if (typeof body.checked === 'boolean') {
      data.checked = body.checked
      // Rule: وقتی checked شد، به انتهای لیست برود
      if (body.checked && !existing.checked) {
        const max = await app.prisma.checklistItem.aggregate({
          where: { userId, deletedAt: null },
          _max: { orderIndex: true }
        })
        data.orderIndex = (max._max.orderIndex ?? existing.orderIndex ?? 0) + 1
      }
    }

    const tagUpdate: any = {}
    if (body.tags) {
      // Replace tags
      tagUpdate.tags = {
        set: [],
        connect: body.tags.map((tid) => ({ id: tid }))
      }
    }

    const item = await app.prisma.checklistItem.update({
      where: { id },
      data: { ...data, ...tagUpdate },
      include: { tags: true, alarm: true }
    })

    return { item }
  })

  app.delete('/:id', { preHandler: app.auth }, async (req, reply) => {
    const userId = req.user!.id
    const { id } = IdParams.parse(req.params)

    const existing = await app.prisma.checklistItem.findFirst({ where: { id, userId } })
    if (!existing || existing.deletedAt) return reply.code(404).send({ error: 'NOT_FOUND' })

    await app.prisma.checklistItem.update({
      where: { id },
      data: { deletedAt: new Date() }
    })

    return reply.code(204).send()
  })

  app.post('/:id/restore', { preHandler: app.auth }, async (req, reply) => {
    const userId = req.user!.id
    const { id } = IdParams.parse(req.params)

    const existing = await app.prisma.checklistItem.findFirst({ where: { id, userId } })
    if (!existing || !existing.deletedAt) return reply.code(404).send({ error: 'NOT_FOUND' })

    const item = await app.prisma.checklistItem.update({
      where: { id },
      data: { deletedAt: null },
      include: { tags: true, alarm: true }
    })

    return { item }
  })

  app.post('/reorder', { preHandler: app.auth }, async (req, reply) => {
    const userId = req.user!.id
    const body = ReorderSchema.parse(req.body)

    const items = await app.prisma.checklistItem.findMany({
      where: { userId, deletedAt: null, id: { in: body.orderedIds } },
      select: { id: true }
    })

    if (items.length !== body.orderedIds.length) {
      return reply.code(400).send({ error: 'INVALID_IDS' })
    }

    await app.prisma.$transaction(
      body.orderedIds.map((id, idx) =>
        app.prisma.checklistItem.update({
          where: { id },
          data: { orderIndex: idx + 1 }
        })
      )
    )

    return { ok: true }
  })

  app.put('/:id/alarm', { preHandler: app.auth }, async (req, reply) => {
    const userId = req.user!.id
    const { id } = IdParams.parse(req.params)
    const body = AlarmUpsertSchema.parse(req.body)

    const item = await app.prisma.checklistItem.findFirst({ where: { id, userId, deletedAt: null } })
    if (!item) return reply.code(404).send({ error: 'NOT_FOUND' })

    if (body.at === null) {
      await app.prisma.alarm.deleteMany({ where: { userId, checklistItemId: id } })
      return { ok: true }
    }

    const alarm = await app.prisma.alarm.upsert({
      where: { checklistItemId: id },
      create: {
        userId,
        checklistItemId: id,
        at: new Date(body.at),
        repeat: body.repeat,
        snoozeMinutes: body.snoozeMinutes ?? null,
        status: 'scheduled'
      },
      update: {
        at: new Date(body.at),
        repeat: body.repeat,
        snoozeMinutes: body.snoozeMinutes ?? null,
        status: 'scheduled'
      }
    })

    return { alarm }
  })

  // helper for frontend: متن ساده‌ی description (اختیاری)
  app.get('/:id/plain', { preHandler: app.auth }, async (req, reply) => {
    const userId = req.user!.id
    const { id } = IdParams.parse(req.params)
    const item = await app.prisma.checklistItem.findFirst({ where: { id, userId, deletedAt: null } })
    if (!item) return reply.code(404).send({ error: 'NOT_FOUND' })
    return { text: stripHtmlToText(item.descriptionHtml) }
  })
}

export default checklistRoutes
