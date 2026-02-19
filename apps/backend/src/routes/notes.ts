import type { FastifyPluginAsync } from 'fastify'
import { z } from 'zod'
import { extractTextFromProseMirrorJson } from '../utils/searchText.js'

const IdParams = z.object({ id: z.string().uuid() })

const NoteCreateSchema = z.object({
  title: z.string().max(200).optional().default(''),
  html: z.string().optional().default(''),
  contentJson: z.any().optional(),
  pinned: z.boolean().optional().default(false),
  archived: z.boolean().optional().default(false),
  tags: z.array(z.string().uuid()).optional().default([])
})

const NoteUpdateSchema = z.object({
  title: z.string().max(200).optional(),
  html: z.string().optional(),
  contentJson: z.any().optional(),
  pinned: z.boolean().optional(),
  archived: z.boolean().optional(),
  tags: z.array(z.string().uuid()).optional()
})

const ReorderSchema = z.object({
  orderedIds: z.array(z.string().uuid()).min(1)
})

const ListQuerySchema = z.object({
  includeArchived: z.coerce.boolean().optional().default(false),
  q: z.string().optional(),
  tagIds: z.string().optional()
})

const AlarmUpsertSchema = z.object({
  at: z.string().datetime().nullable(),
  repeat: z.enum(['none', 'daily', 'weekly']).optional().default('none'),
  snoozeMinutes: z.number().int().min(1).max(1440).nullable().optional()
})

function defaultDoc() {
  return {
    type: 'doc',
    content: [{ type: 'paragraph', content: [{ type: 'text', text: '' }] }]
  }
}

const noteRoutes: FastifyPluginAsync = async (app) => {
  app.get('/', { preHandler: app.auth }, async (req) => {
    const userId = req.user!.id
    const q = ListQuerySchema.parse(req.query)

    const where: any = { userId, deletedAt: null }
    if (!q.includeArchived) where.archived = false

    if (q.tagIds) {
      const ids = q.tagIds.split(',').map((s) => s.trim()).filter(Boolean)
      if (ids.length) where.tags = { some: { id: { in: ids } } }
    }

    if (q.q && q.q.trim()) {
      const query = q.q.trim()
      where.OR = [{ searchText: { contains: query, mode: 'insensitive' } }]
    }

    const notes = await app.prisma.noteBlock.findMany({
      where,
      include: { tags: true, alarm: true },
      orderBy: [{ pinned: 'desc' }, { orderIndex: 'asc' }, { updatedAt: 'desc' }]
    })

    return { notes }
  })

  app.post('/', { preHandler: app.auth }, async (req, reply) => {
    const userId = req.user!.id
    const body = NoteCreateSchema.parse(req.body)

    const max = await app.prisma.noteBlock.aggregate({
      where: { userId, deletedAt: null },
      _max: { orderIndex: true }
    })
    const nextOrder = (max._max.orderIndex ?? 0) + 1

    const title = (body.title ?? '').trim()
    const html = body.html ?? ''
    const contentJson = body.contentJson ?? defaultDoc()
    const extracted = extractTextFromProseMirrorJson(contentJson)
    const searchText = `${title} ${extracted}`.trim()

    const note = await app.prisma.noteBlock.create({
      data: {
        userId,
        orderIndex: nextOrder,
        title,
        html,
        pinned: body.pinned,
        archived: body.archived,
        contentJson,
        searchText,
        tags: body.tags.length ? { connect: body.tags.map((id) => ({ id })) } : undefined
      },
      include: { tags: true, alarm: true }
    })

    return reply.code(201).send({ note })
  })

  // لیست نوت‌های حذف‌شده برای بازیابی
  app.get('/deleted', { preHandler: app.auth }, async (req) => {
    const userId = req.user!.id
    const notes = await app.prisma.noteBlock.findMany({
      where: { userId, deletedAt: { not: null } },
      include: { tags: true, alarm: true },
      orderBy: [{ deletedAt: 'desc' }]
    })
    return { notes }
  })

  app.get('/:id', { preHandler: app.auth }, async (req, reply) => {
    const userId = req.user!.id
    const { id } = IdParams.parse(req.params)

    const note = await app.prisma.noteBlock.findFirst({
      where: { id, userId },
      include: { tags: true, alarm: true }
    })

    if (!note || note.deletedAt) return reply.code(404).send({ error: 'NOT_FOUND' })
    return { note }
  })

  app.patch('/:id', { preHandler: app.auth }, async (req, reply) => {
    const userId = req.user!.id
    const { id } = IdParams.parse(req.params)
    const body = NoteUpdateSchema.parse(req.body)

    const existing = await app.prisma.noteBlock.findFirst({ where: { id, userId } })
    if (!existing || existing.deletedAt) return reply.code(404).send({ error: 'NOT_FOUND' })

    const data: any = {}
    if (typeof body.pinned === 'boolean') data.pinned = body.pinned
    if (typeof body.archived === 'boolean') data.archived = body.archived

    if (typeof body.title === 'string') data.title = body.title.trim()
    if (typeof body.html === 'string') data.html = body.html

    // Keep searchText in sync (title + extracted text from contentJson)
    const nextContentJson = body.contentJson ?? existing.contentJson
    const nextTitle = (typeof body.title === 'string' ? body.title.trim() : existing.title) ?? ''
    if (body.contentJson) data.contentJson = body.contentJson
    data.searchText = `${nextTitle} ${extractTextFromProseMirrorJson(nextContentJson)}`.trim()

    const tagUpdate: any = {}
    if (body.tags) {
      tagUpdate.tags = { set: [], connect: body.tags.map((tid) => ({ id: tid })) }
    }

    const note = await app.prisma.noteBlock.update({
      where: { id },
      data: { ...data, ...tagUpdate },
      include: { tags: true, alarm: true }
    })

    return { note }
  })

  app.delete('/:id', { preHandler: app.auth }, async (req, reply) => {
    const userId = req.user!.id
    const { id } = IdParams.parse(req.params)

    const existing = await app.prisma.noteBlock.findFirst({ where: { id, userId } })
    if (!existing || existing.deletedAt) return reply.code(404).send({ error: 'NOT_FOUND' })

    await app.prisma.noteBlock.update({ where: { id }, data: { deletedAt: new Date() } })
    return reply.code(204).send()
  })

  app.post('/:id/restore', { preHandler: app.auth }, async (req, reply) => {
    const userId = req.user!.id
    const { id } = IdParams.parse(req.params)

    const existing = await app.prisma.noteBlock.findFirst({ where: { id, userId } })
    if (!existing || !existing.deletedAt) return reply.code(404).send({ error: 'NOT_FOUND' })

    const note = await app.prisma.noteBlock.update({
      where: { id },
      data: { deletedAt: null },
      include: { tags: true, alarm: true }
    })

    return { note }
  })

  app.post('/reorder', { preHandler: app.auth }, async (req, reply) => {
    const userId = req.user!.id
    const body = ReorderSchema.parse(req.body)

    const notes = await app.prisma.noteBlock.findMany({
      where: { userId, deletedAt: null, id: { in: body.orderedIds } },
      select: { id: true }
    })

    if (notes.length !== body.orderedIds.length) return reply.code(400).send({ error: 'INVALID_IDS' })

    await app.prisma.$transaction(
      body.orderedIds.map((id, idx) =>
        app.prisma.noteBlock.update({ where: { id }, data: { orderIndex: idx + 1 } })
      )
    )

    return { ok: true }
  })

  app.put('/:id/alarm', { preHandler: app.auth }, async (req, reply) => {
    const userId = req.user!.id
    const { id } = IdParams.parse(req.params)
    const body = AlarmUpsertSchema.parse(req.body)

    const note = await app.prisma.noteBlock.findFirst({ where: { id, userId, deletedAt: null } })
    if (!note) return reply.code(404).send({ error: 'NOT_FOUND' })

    if (body.at === null) {
      await app.prisma.alarm.deleteMany({ where: { userId, noteBlockId: id } })
      return { ok: true }
    }

    const alarm = await app.prisma.alarm.upsert({
      where: { noteBlockId: id },
      create: {
        userId,
        noteBlockId: id,
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
}

export default noteRoutes
