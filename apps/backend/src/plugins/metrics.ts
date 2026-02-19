import fp from 'fastify-plugin'
import type { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify'
import client from 'prom-client'

export default fp(async (app: FastifyInstance) => {
  client.collectDefaultMetrics()

  const httpHistogram = new client.Histogram({
    name: 'http_request_duration_seconds',
    help: 'HTTP request duration in seconds',
    labelNames: ['method', 'route', 'status_code'] as const,
    buckets: [0.005, 0.01, 0.025, 0.05, 0.1, 0.25, 0.5, 1, 2, 5]
  })

  app.addHook('onRequest', async (req: FastifyRequest) => {
    ;(req as any)._metricsStart = process.hrtime.bigint()
  })

  app.addHook('onResponse', async (req: FastifyRequest, reply: FastifyReply) => {
    const start = (req as any)._metricsStart as bigint | undefined
    if (!start) return
    const end = process.hrtime.bigint()
    const seconds = Number(end - start) / 1e9
    const route = (req.routeOptions && (req.routeOptions.url as string)) || 'unknown'
    httpHistogram
      .labels(req.method, route, String(reply.statusCode))
      .observe(seconds)
  })

  app.get('/metrics', async (_req, reply) => {
    reply.header('Content-Type', client.register.contentType)
    return client.register.metrics()
  })
})
