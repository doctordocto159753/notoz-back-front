import fp from 'fastify-plugin'
import swagger from '@fastify/swagger'
import swaggerUi from '@fastify/swagger-ui'
import type { FastifyInstance } from 'fastify'

export default fp(async (app: FastifyInstance) => {
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
