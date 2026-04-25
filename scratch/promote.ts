import { PrismaClient } from '@prisma/client'
const prisma = new PrismaClient()

async function main() {
  const users = await prisma.user.findMany()
  console.log('Current Users:', users.map(u => ({ email: u.email, role: (u as any).role })))
  
  if (users.length > 0) {
    const updated = await prisma.user.updateMany({
      data: { role: 'ADMIN' }
    })
    console.log(`Updated ${updated.count} users to ADMIN`)
  }
}

main()
  .catch(e => console.error(e))
  .finally(() => prisma.$disconnect())
