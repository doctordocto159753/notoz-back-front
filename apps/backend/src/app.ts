import Fastify from 'fastify'
import { getEnv } from './utils/env.js'

import prismaPlugin from './plugins/prisma.js'
import authPlugin from './plugins/auth.js'
import securityPlugin from './plugins/security.js'
import swaggerPlugin from './plugins/swagger.js'
import metricsPlugin from './plugins/metrics.js'
import uploadsPlugin from './plugins/uploads.js'

import healthRoutes from './routes/health.js'
import authRoutes from './routes/auth.js'
import meRoutes from './routes/me.js'
import settingsRoutes from './routes/settings.js'
import tagRoutes from './routes/tags.js'
import checklistRoutes from './routes/checklist.js'
import noteRoutes from './routes/notes.js'
import alarmRoutes from './routes/alarms.js'
import dashboardRoutes from './routes/dashboard.js'
import searchRoutes from './routes/search.js'
import exportImportRoutes from './routes/exportImport.js'
import mediaRoutes from './routes/media.js'

export function buildApp() {
  const env = getEnv()

  const app = Fastify({
    trustProxy: true,
    logger: {
      level: env.LOG_LEVEL
    }
  })

  app.setErrorHandler((err, _req, reply) => {
    if ((err as any).name === 'ZodError') {
      return reply.code(400).send({ error: 'VALIDATION_ERROR', details: (err as any).issues })
    }

    app.log.error({ err }, 'Unhandled error')
    const status = (err as any).statusCode ?? 500
    return reply.code(status).send({ error: 'INTERNAL_ERROR' })
  })

  // Plugins
  app.register(swaggerPlugin)
  app.register(securityPlugin)
  app.register(metricsPlugin)
  app.register(uploadsPlugin)
  app.register(prismaPlugin)
  app.register(authPlugin)

  // Routes
  app.register(healthRoutes)
  app.register(authRoutes, { prefix: '/api/v1/auth' })
  app.register(meRoutes, { prefix: '/api/v1' })
  app.register(settingsRoutes, { prefix: '/api/v1/settings' })
  app.register(tagRoutes, { prefix: '/api/v1/tags' })
  app.register(checklistRoutes, { prefix: '/api/v1/checklist' })
  app.register(noteRoutes, { prefix: '/api/v1/notes' })
  app.register(alarmRoutes, { prefix: '/api/v1/alarms' })
  app.register(dashboardRoutes, { prefix: '/api/v1/dashboard' })
  app.register(searchRoutes, { prefix: '/api/v1/search' })
  app.register(exportImportRoutes, { prefix: '/api/v1' })
  app.register(mediaRoutes, { prefix: '/api/v1/media' })

  return app
}
