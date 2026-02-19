import type { FastifyPluginAsync } from 'fastify'
import { z } from 'zod'
import { normalizeDigitsToEnglish } from '../utils/digits.js'

const CreateTagSchema = z.object({
  title: z.string().min(1).max(32),
  colorKey: z.string().max(32).optional()
})

const UpdateTagSchema = z.object({
  title: z.string().min(1).max(32).optional(),
  colorKey: z.string().max(32).nullable().optional()
})

const tagsRoutes: FastifyPluginAsync = async (app) => {
  app.get('/', { preHandler: app.auth }, async (req) => {
    const userId = req.user!.id
    const tags = await app.prisma.tag.findMany({
      where: { userId },
      orderBy: { updatedAt: 'desc' }
    })
    return { tags }
  })

  app.post('/', { preHandler: app.auth }, async (req, reply) => {
    const userId = req.user!.id
    const body = CreateTagSchema.parse(req.body)
    const title = normalizeDigitsToEnglish(body.title.trim())

    try {
      const tag = await app.prisma.tag.create({
        data: { userId, title, colorKey: body.colorKey }
      })
      return reply.code(201).send({ tag })
    } catch (e: any) {
      if (String(e?.code) === 'P2002') return reply.code(409).send({ error: 'TAG_EXISTS' })
      throw e
    }
  })

  app.patch('/:id', { preHandler: app.auth }, async (req, reply) => {
    const userId = req.user!.id
    const { id } = z.object({ id: z.string().uuid() }).parse(req.params)
    const body = UpdateTagSchema.parse(req.body)

    const exists = await app.prisma.tag.findFirst({ where: { id, userId } })
    if (!exists) return reply.code(404).send({ error: 'NOT_FOUND' })

    const data: any = {}
    if (body.title) data.title = normalizeDigitsToEnglish(body.title.trim())
    if (body.colorKey !== undefined) data.colorKey = body.colorKey

    try {
      const tag = await app.prisma.tag.update({ where: { id }, data })
      return { tag }
    } catch (e: any) {
      if (String(e?.code) === 'P2002') return reply.code(409).send({ error: 'TAG_EXISTS' })
      throw e
    }
  })

  app.delete('/:id', { preHandler: app.auth }, async (req, reply) => {
    const userId = req.user!.id
    const { id } = z.object({ id: z.string().uuid() }).parse(req.params)

    const exists = await app.prisma.tag.findFirst({ where: { id, userId } })
    if (!exists) return reply.code(404).send({ error: 'NOT_FOUND' })

    await app.prisma.tag.delete({ where: { id } })
    return reply.code(204).send()
  })
}

export default tagsRoutes
