import type { FastifyPluginAsync } from 'fastify'
import { z } from 'zod'
import bcrypt from 'bcryptjs'
import { normalizeDigitsToEnglish } from '../utils/digits.js'

const RegisterSchema = z.object({
  username: z.string().min(3).max(32),
  password: z.string().min(6).max(72)
})

const LoginSchema = RegisterSchema

const authRoutes: FastifyPluginAsync = async (app) => {
  app.post('/register', async (req, reply) => {
    const body = RegisterSchema.parse(req.body)
    const username = normalizeDigitsToEnglish(body.username.trim())

    const exists = await app.prisma.user.findUnique({ where: { username } })
    if (exists) return reply.code(409).send({ error: 'USERNAME_TAKEN' })

    const passwordHash = await bcrypt.hash(body.password, 10)

    const user = await app.prisma.user.create({
      data: {
        username,
        passwordHash,
        settings: {
          create: {
            theme: 'light',
            usePersianDigits: false,
            splitRatio: 0.5,
            collapsed: 'none'
          }
        }
      },
      select: { id: true, username: true }
    })

    const accessToken = app.jwt.sign({ sub: user.id, username: user.username })

    return reply.code(201).send({ user, accessToken })
  })

  app.post('/login', async (req, reply) => {
    const body = LoginSchema.parse(req.body)
    const username = normalizeDigitsToEnglish(body.username.trim())

    const user = await app.prisma.user.findUnique({ where: { username } })
    if (!user) return reply.code(401).send({ error: 'INVALID_CREDENTIALS' })

    const ok = await bcrypt.compare(body.password, user.passwordHash)
    if (!ok) return reply.code(401).send({ error: 'INVALID_CREDENTIALS' })

    const accessToken = app.jwt.sign({ sub: user.id, username: user.username })

    return reply.send({ user: { id: user.id, username: user.username }, accessToken })
  })
}

export default authRoutes
