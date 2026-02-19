import fp from 'fastify-plugin'
import swagger from '@fastify/swagger'
import swaggerUi from '@fastify/swagger-ui'
import type { FastifyInstance } from 'fastify'

export default fp(async (app: FastifyInstance) => {
  // Fastify Swagger only includes routes that have a schema.
  // To avoid an empty /docs in MVP, auto-attach a minimal schema when missing.
  // This does NOT change runtime behavior; it only improves OpenAPI visibility.
  app.addHook('onRoute', (routeOptions) => {
    // Skip swagger UI endpoints themselves.
    if (typeof routeOptions.url === 'string' && routeOptions.url.startsWith('/docs')) return

    if (!routeOptions.schema) {
      const method = Array.isArray(routeOptions.method) ? routeOptions.method.join(',') : routeOptions.method
      routeOptions.schema = {
        tags: ['api'],
        summary: `${method} ${routeOptions.url}`,
        response: {
          200: { type: 'object', additionalProperties: true }
        }
      } as any
    }
  })

  await app.register(swagger, {
    openapi: {
      info: {
        title: 'NOTO API',
        version: '0.1.0'
      },
      components: {
        securitySchemes: {
          bearerAuth: {
            type: 'http',
            scheme: 'bearer',
            bearerFormat: 'JWT'
          }
        }
      }
    }
  })

  await app.register(swaggerUi, {
    routePrefix: '/docs',
    uiConfig: {
      docExpansion: 'list',
      deepLinking: false
    }
  })

  app.get('/docs/json', async () => app.swagger())
})
