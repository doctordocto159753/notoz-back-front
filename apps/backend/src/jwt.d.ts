import '@fastify/jwt'

// Make `request.user` strongly typed after `request.jwtVerify()`.
// Without this, `request.user` defaults to: string | object | Buffer.
declare module '@fastify/jwt' {
  interface FastifyJWT {
    payload: { sub: string; username: string }
    user: { id: string; username: string }
  }
}
