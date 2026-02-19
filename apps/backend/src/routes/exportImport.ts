import type { FastifyPluginAsync } from 'fastify'
import { z } from 'zod'
import { sanitizeRichHtml } from '../utils/sanitize.js'
import { normalizeDigitsToEnglish } from '../utils/digits.js'
import { extractTextFromProseMirrorJson } from '../utils/searchText.js'

const ExportImportSchemaVersion = 2

const AlarmSchema = z.object({
  id: z.string().uuid().optional(),
  at: z.string().datetime(),
  repeat: z.enum(['none', 'daily', 'weekly']).optional().default('none'),
  snoozeMinutes: z.number().int().nullable().optional(),
  firedAt: z.string().datetime().nullable().optional(),
  status: z.enum(['scheduled', 'fired', 'dismissed', 'missed']).optional().default('scheduled')
})

const ChecklistItemSchema = z.object({
  id: z.string().uuid(),
  title: z.string(),
  descriptionHtml: z.string().optional().default(''),
  checked: z.boolean().optional().default(false),
  pinned: z.boolean().optional().default(false),
  archived: z.boolean().optional().default(false),
  tags: z.array(z.string().uuid()).optional().default([]),
  order: z.number().int().optional().default(0),
  alarm: AlarmSchema.nullable().optional().default(null)
})

const NoteBlockSchema = z.object({
  id: z.string().uuid(),
  title: z.string().optional().default(''),
  html: z.string().optional().default(''),
  contentJson: z.any(),
  pinned: z.boolean().optional().default(false),
  archived: z.boolean().optional().default(false),
  tags: z.array(z.string().uuid()).optional().default([]),
  order: z.number().int().optional().default(0),
  alarm: AlarmSchema.nullable().optional().default(null)
})

const TagSchema = z.object({
  id: z.string().uuid(),
  title: z.string(),
  colorKey: z.string().nullable().optional()
})

const SettingsSchema = z.object({
  theme: z.enum(['light', 'dark']).optional().default('light'),
  usePersianDigits: z.boolean().optional().default(false),
  panelLayout: z
    .object({
      splitRatio: z.number().min(0.2).max(0.8).optional().default(0.5),
      collapsed: z.enum(['none', 'left', 'right']).optional().default('none')
    })
    .optional()
    .default({ splitRatio: 0.5, collapsed: 'none' })
})

const AppStateSchema = z.object({
  schemaVersion: z.literal(ExportImportSchemaVersion),
  settings: SettingsSchema,
  tags: z.array(TagSchema).default([]),
  checklist: z.array(ChecklistItemSchema).default([]),
  notes: z.array(NoteBlockSchema).default([])
})

const ImportBodySchema = z.object({
  mode: z.enum(['replace', 'merge']).optional().default('replace'),
  state: AppStateSchema
})

const exportImportRoutes: FastifyPluginAsync = async (app) => {
  app.get('/export', { preHandler: app.auth }, async (req) => {
    const userId = req.user!.id

    const [settings, tags, checklist, notes] = await Promise.all([
      app.prisma.settings.findUnique({ where: { userId } }),
      app.prisma.tag.findMany({ where: { userId }, orderBy: { updatedAt: 'desc' } }),
      app.prisma.checklistItem.findMany({
        where: { userId, deletedAt: null },
        include: { tags: true, alarm: true },
        orderBy: [{ pinned: 'desc' }, { checked: 'asc' }, { orderIndex: 'asc' }]
      }),
      app.prisma.noteBlock.findMany({
        where: { userId, deletedAt: null },
        include: { tags: true, alarm: true },
        orderBy: [{ pinned: 'desc' }, { orderIndex: 'asc' }]
      })
    ])

    const state = {
      schemaVersion: ExportImportSchemaVersion,
      settings: {
        theme: settings?.theme ?? 'light',
        usePersianDigits: settings?.usePersianDigits ?? false,
        panelLayout: {
          splitRatio: settings?.splitRatio ?? 0.5,
          collapsed: settings?.collapsed ?? 'none'
        }
      },
      tags: tags.map((t) => ({ id: t.id, title: t.title, colorKey: t.colorKey ?? null })),
      checklist: checklist.map((c) => ({
        id: c.id,
        title: c.title,
        descriptionHtml: c.descriptionHtml,
        checked: c.checked,
        pinned: c.pinned,
        archived: c.archived,
        tags: c.tags.map((t) => t.id),
        order: c.orderIndex,
        alarm: c.alarm
          ? {
              id: c.alarm.id,
              at: c.alarm.at.toISOString(),
              repeat: c.alarm.repeat,
              snoozeMinutes: c.alarm.snoozeMinutes ?? null,
              firedAt: c.alarm.firedAt ? c.alarm.firedAt.toISOString() : null,
              status: c.alarm.status
            }
          : null
      })),
      notes: notes.map((n) => ({
        id: n.id,
        title: n.title ?? '',
        html: n.html ?? '',
        contentJson: n.contentJson,
        pinned: n.pinned,
        archived: n.archived,
        tags: n.tags.map((t) => t.id),
        order: n.orderIndex,
        alarm: n.alarm
          ? {
              id: n.alarm.id,
              at: n.alarm.at.toISOString(),
              repeat: n.alarm.repeat,
              snoozeMinutes: n.alarm.snoozeMinutes ?? null,
              firedAt: n.alarm.firedAt ? n.alarm.firedAt.toISOString() : null,
              status: n.alarm.status
            }
          : null
      }))
    }

    return {
      exportedAt: new Date().toISOString(),
      state
    }
  })

  app.post('/import', { preHandler: app.auth }, async (req, reply) => {
    const userId = req.user!.id
    const body = ImportBodySchema.parse(req.body)

    if (body.mode !== 'replace') {
      return reply.code(501).send({ error: 'MERGE_NOT_IMPLEMENTED' })
    }

    const state = body.state

    await app.prisma.$transaction(async (tx) => {
      // wipe
      await tx.alarm.deleteMany({ where: { userId } })
      await tx.checklistItem.deleteMany({ where: { userId } })
      await tx.noteBlock.deleteMany({ where: { userId } })
      await tx.tag.deleteMany({ where: { userId } })

      // settings
      await tx.settings.upsert({
        where: { userId },
        create: {
          userId,
          theme: state.settings.theme,
          usePersianDigits: state.settings.usePersianDigits,
          splitRatio: state.settings.panelLayout.splitRatio,
          collapsed: state.settings.panelLayout.collapsed
        },
        update: {
          theme: state.settings.theme,
          usePersianDigits: state.settings.usePersianDigits,
          splitRatio: state.settings.panelLayout.splitRatio,
          collapsed: state.settings.panelLayout.collapsed
        }
      })

      // tags
      for (const tag of state.tags) {
        await tx.tag.create({
          data: {
            id: tag.id,
            userId,
            title: normalizeDigitsToEnglish(tag.title.trim()),
            colorKey: tag.colorKey ?? null
          }
        })
      }

      // checklist
      for (const item of state.checklist) {
        const created = await tx.checklistItem.create({
          data: {
            id: item.id,
            userId,
            title: normalizeDigitsToEnglish(item.title.trim()),
            descriptionHtml: sanitizeRichHtml(item.descriptionHtml ?? ''),
            checked: item.checked,
            pinned: item.pinned,
            archived: item.archived,
            orderIndex: item.order || 0,
            tags: item.tags?.length ? { connect: item.tags.map((id) => ({ id })) } : undefined
          }
        })

        if (item.alarm) {
          await tx.alarm.create({
            data: {
              id: item.alarm.id ?? undefined,
              userId,
              checklistItemId: created.id,
              at: new Date(item.alarm.at),
              repeat: item.alarm.repeat ?? 'none',
              snoozeMinutes: item.alarm.snoozeMinutes ?? null,
              firedAt: item.alarm.firedAt ? new Date(item.alarm.firedAt) : null,
              status: item.alarm.status ?? 'scheduled'
            }
          })
        }
      }

      // notes
      for (const note of state.notes) {
        const title = (note.title ?? '').trim()
        const html = note.html ?? ''
        const extracted = extractTextFromProseMirrorJson(note.contentJson)
        const searchText = `${title} ${extracted}`.trim()
        const created = await tx.noteBlock.create({
          data: {
            id: note.id,
            userId,
            title,
            html,
            contentJson: note.contentJson,
            searchText,
            pinned: note.pinned,
            archived: note.archived,
            orderIndex: note.order || 0,
            tags: note.tags?.length ? { connect: note.tags.map((id) => ({ id })) } : undefined
          }
        })

        if (note.alarm) {
          await tx.alarm.create({
            data: {
              id: note.alarm.id ?? undefined,
              userId,
              noteBlockId: created.id,
              at: new Date(note.alarm.at),
              repeat: note.alarm.repeat ?? 'none',
              snoozeMinutes: note.alarm.snoozeMinutes ?? null,
              firedAt: note.alarm.firedAt ? new Date(note.alarm.firedAt) : null,
              status: note.alarm.status ?? 'scheduled'
            }
          })
        }
      }
    })

    return reply.code(200).send({ ok: true })
  })
}

export default exportImportRoutes
