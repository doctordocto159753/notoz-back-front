import type { FastifyPluginAsync } from 'fastify'
import { z } from 'zod'
import path from 'node:path'
import fs from 'node:fs/promises'
import fssync from 'node:fs'
import crypto from 'node:crypto'
import sharp from 'sharp'
import { put, del } from '@vercel/blob'
import { getEnv } from '../utils/env.js'

const IdParams = z.object({ id: z.string().uuid() })

const ALLOWED = new Set(['image/jpeg', 'image/png', 'image/webp'])

function contentTypeForExt(ext: string) {
  if (ext === 'jpg' || ext === 'jpeg') return 'image/jpeg'
  if (ext === 'png') return 'image/png'
  if (ext === 'webp') return 'image/webp'
  return 'application/octet-stream'
}

const mediaRoutes: FastifyPluginAsync = async (app) => {
  const env = getEnv()

  app.post('/', { preHandler: app.auth }, async (req, reply) => {
    const userId = req.user!.id

    const file = await (req as any).file()
    if (!file) return reply.code(400).send({ error: 'NO_FILE' })

    const mimeType = file.mimetype
    if (!ALLOWED.has(mimeType)) return reply.code(400).send({ error: 'UNSUPPORTED_TYPE' })

    const buf = await file.toBuffer()

    let img = sharp(buf, { failOn: 'none' })
    const meta = await img.metadata()

    const maxWidth = 1280
    if (meta.width && meta.width > maxWidth) {
      img = img.resize({ width: maxWidth })
    }

    // Decide output format
    let ext = 'jpg'
    if (mimeType === 'image/webp') ext = 'webp'
    else if (mimeType === 'image/png' && meta.hasAlpha) ext = 'png'

    if (ext === 'jpg') img = img.jpeg({ quality: 80, mozjpeg: true })
    if (ext === 'png') img = img.png({ compressionLevel: 9 })
    if (ext === 'webp') img = img.webp({ quality: 80 })

    const out = await img.toBuffer()
    const outMeta = await sharp(out).metadata()

    const id = crypto.randomUUID()
    const ctype = contentTypeForExt(ext)

    // --- Storage driver
    if (env.MEDIA_DRIVER === 'blob') {
      if (!env.BLOB_READ_WRITE_TOKEN) {
        return reply.code(500).send({ error: 'BLOB_TOKEN_MISSING' })
      }

      const pathname = `noto/${userId}/${id}.${ext}`
      const uploaded = await put(pathname, out, {
        access: 'public',
        contentType: ctype
      })

      const asset = await app.prisma.mediaAsset.create({
        data: {
          id,
          userId,
          mimeType: ctype,
          ext,
          width: outMeta.width ?? null,
          height: outMeta.height ?? null,
          sizeBytes: out.length,
          storage: 'blob',
          url: uploaded.url,
          pathname: uploaded.pathname
        }
      })

      return reply.code(201).send({ asset })
    }

    // Default: filesystem (local dev)
    const userDir = path.join(env.MEDIA_STORAGE_PATH, userId)
    await fs.mkdir(userDir, { recursive: true })

    const filename = `${id}.${ext}`
    const fullPath = path.join(userDir, filename)
    await fs.writeFile(fullPath, out)

    const asset = await app.prisma.mediaAsset.create({
      data: {
        id,
        userId,
        mimeType: ctype,
        ext,
        width: outMeta.width ?? null,
        height: outMeta.height ?? null,
        sizeBytes: out.length,
        storage: 'fs',
        path: fullPath
      }
    })

    const url = `${env.MEDIA_PUBLIC_BASE_URL}/api/v1/media/${asset.id}`

    return reply.code(201).send({ asset: { ...asset, url } })
  })

  app.get('/:id', { preHandler: app.auth }, async (req, reply) => {
    const userId = req.user!.id
    const { id } = IdParams.parse(req.params)

    const asset = await app.prisma.mediaAsset.findFirst({ where: { id, userId } })
    if (!asset) return reply.code(404).send({ error: 'NOT_FOUND' })

    if (asset.storage === 'blob') {
      if (!asset.url) return reply.code(404).send({ error: 'BLOB_URL_MISSING' })
      // Redirect to Blob URL (avoids proxying bytes through serverless function)
      return reply.redirect(asset.url)
    }

    if (!asset.path) return reply.code(404).send({ error: 'FILE_MISSING' })
    if (!fssync.existsSync(asset.path)) return reply.code(404).send({ error: 'FILE_MISSING' })

    reply.header('Content-Type', asset.mimeType)
    reply.header('Cache-Control', 'private, max-age=3600')

    return reply.send(fssync.createReadStream(asset.path))
  })

  app.delete('/:id', { preHandler: app.auth }, async (req, reply) => {
    const userId = req.user!.id
    const { id } = IdParams.parse(req.params)

    const asset = await app.prisma.mediaAsset.findFirst({ where: { id, userId } })
    if (!asset) return reply.code(404).send({ error: 'NOT_FOUND' })

    await app.prisma.mediaAsset.delete({ where: { id } })

    if (asset.storage === 'blob') {
      if (env.BLOB_READ_WRITE_TOKEN && asset.url) {
        try {
          await del(asset.url)
        } catch {
          // ignore
        }
      }
      return reply.code(204).send()
    }

    // best-effort unlink
    if (asset.path) {
      try {
        await fs.unlink(asset.path)
      } catch {
        // ignore
      }
    }

    return reply.code(204).send()
  })
}

export default mediaRoutes
