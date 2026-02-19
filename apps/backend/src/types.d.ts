import 'fastify'
import type { PrismaClient, User } from '@prisma/client'

declare module 'fastify' {
  interface FastifyInstance {
    prisma: PrismaClient
  }

  interface FastifyRequest {
    user?: Pick<User, 'id' | 'username'>
  }
}
