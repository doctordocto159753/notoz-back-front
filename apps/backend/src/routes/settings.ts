import type { FastifyPluginAsync } from 'fastify'
import { z } from 'zod'

const UpdateSettingsSchema = z.object({
  theme: z.enum(['light', 'dark']).optional(),
  usePersianDigits: z.boolean().optional(),
  panelLayout: z
    .object({
      splitRatio: z.number().min(0.2).max(0.8).optional(),
      collapsed: z.enum(['none', 'left', 'right']).optional()
    })
    .optional()
})

const settingsRoutes: FastifyPluginAsync = async (app) => {
  app.get('/', { preHandler: app.auth }, async (req) => {
    const userId = req.user!.id
    const settings = await app.prisma.settings.findUnique({ where: { userId } })
    return { settings }
  })

  app.put('/', { preHandler: app.auth }, async (req) => {
    const userId = req.user!.id
    const body = UpdateSettingsSchema.parse(req.body)

    const data: any = {}
    if (body.theme) data.theme = body.theme
    if (typeof body.usePersianDigits === 'boolean') data.usePersianDigits = body.usePersianDigits
    if (body.panelLayout?.splitRatio != null) data.splitRatio = body.panelLayout.splitRatio
    if (body.panelLayout?.collapsed) data.collapsed = body.panelLayout.collapsed

    const settings = await app.prisma.settings.upsert({
      where: { userId },
      create: { userId, ...data },
      update: data
    })

    return { settings }
  })
}

export default settingsRoutes
