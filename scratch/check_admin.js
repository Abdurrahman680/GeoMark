const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const users = await prisma.user.findMany({ 
    select: { email: true, name: true, createdAt: true },
    orderBy: { createdAt: 'asc' }
  });
  console.log('User List (Oldest to Newest):');
  users.forEach((u, i) => console.log(`${i+1}. Name: ${u.name}, Email: ${u.email}`));
}

main().catch(console.error).finally(() => prisma.$disconnect());
