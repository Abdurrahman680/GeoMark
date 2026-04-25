import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
  const users = await prisma.user.findMany({ select: { email: true, name: true, createdAt: true } });
  console.log('Users found:', users);
}

main().catch(console.error).finally(() => prisma.$disconnect());
