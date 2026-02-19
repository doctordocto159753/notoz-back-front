import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'

const prisma = new PrismaClient()

async function main() {
  const username = 'demo'
  const password = 'demo1234'

  const existing = await prisma.user.findUnique({ where: { username } })
  if (!existing) {
    const passwordHash = await bcrypt.hash(password, 10)
    const user = await prisma.user.create({
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
      }
    })

    const tag = await prisma.tag.create({
      data: { userId: user.id, title: 'کار', colorKey: 'accent' }
    })

    await prisma.checklistItem.create({
      data: {
        userId: user.id,
        title: 'اولین کار',
        descriptionHtml: '<p>سلام! این یک آیتم نمونه است.</p>',
        orderIndex: 1,
        tags: { connect: { id: tag.id } }
      }
    })

    await prisma.noteBlock.create({
      data: {
        userId: user.id,
        orderIndex: 1,
        contentJson: {
          type: 'doc',
          content: [{ type: 'paragraph', content: [{ type: 'text', text: 'اولین یادداشت NOTO' }] }]
        },
        searchText: 'اولین یادداشت NOTO',
        tags: { connect: { id: tag.id } }
      }
    })

    console.log('Seed done. demo/demo1234 created.')
  } else {
    console.log('Seed skipped. demo user already exists.')
  }
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
