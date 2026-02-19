import type { FastifyPluginAsync } from 'fastify'
import { z } from 'zod'
import { stripHtmlToText } from '../utils/sanitize.js'
import { makeSnippet } from '../utils/searchText.js'

const QuerySchema = z.object({
  q: z.string().min(1).max(200)
})

const searchRoutes: FastifyPluginAsync = async (app) => {
  app.get('/', { preHandler: app.auth }, async (req) => {
    const userId = req.user!.id
    const { q } = QuerySchema.parse(req.query)

    const [checklist, notes] = await Promise.all([
      app.prisma.checklistItem.findMany({
        where: {
          userId,
          deletedAt: null,
          OR: [
            { title: { contains: q, mode: 'insensitive' } },
            { descriptionHtml: { contains: q, mode: 'insensitive' } }
          ]
        },
        orderBy: [{ pinned: 'desc' }, { updatedAt: 'desc' }],
        take: 20
      }),
      app.prisma.noteBlock.findMany({
        where: {
          userId,
          deletedAt: null,
          searchText: { contains: q, mode: 'insensitive' }
        },
        orderBy: [{ pinned: 'desc' }, { updatedAt: 'desc' }],
        take: 20
      })
    ])

    const checklistResults = checklist.map((it) => ({
      id: it.id,
      type: 'checklist' as const,
      title: it.title,
      snippet: makeSnippet(stripHtmlToText(it.descriptionHtml), q)
    }))

    const noteResults = notes.map((n) => ({
      id: n.id,
      type: 'note' as const,
      snippet: makeSnippet(n.searchText, q)
    }))

    return { q, results: [...checklistResults, ...noteResults] }
  })
}

export default searchRoutes
