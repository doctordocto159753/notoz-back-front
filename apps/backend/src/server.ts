import { buildApp } from './app.js'
import { getEnv } from './utils/env.js'

async function main() {
  const env = getEnv()
  const app = buildApp()

  await app.ready()

  const address = await app.listen({ port: env.PORT, host: '0.0.0.0' })
  app.log.info(`NOTO backend listening on ${address}`)
}

main().catch((err) => {
  // eslint-disable-next-line no-console
  console.error(err)
  process.exit(1)
})
