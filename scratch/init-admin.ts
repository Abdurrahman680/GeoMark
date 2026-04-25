import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  const adminEmail = 'itsrahman.developer@gmail.com';
  const hashedPassword = await bcrypt.hash('123456', 10);

  // 1. Ensure all other users are NOT admin (User requested only one admin)
  await prisma.user.updateMany({
    where: { NOT: { email: adminEmail } },
    data: { role: 'USER' }
  });

  // 2. Upsert the single Admin
  const admin = await prisma.user.upsert({
    where: { email: adminEmail },
    update: {
      role: 'ADMIN',
      password: hashedPassword,
    },
    create: {
      email: adminEmail,
      name: 'Rahman Developer',
      role: 'ADMIN',
      password: hashedPassword,
    }
  });

  console.log('Admin user initialized/updated:', admin.email);

  // 3. Initialize Organization settings if not exists
  const org = await prisma.organization.upsert({
    where: { id: 'default' },
    update: {},
    create: {
      id: 'default',
      name: 'BioAttend Organization',
      latitude: 33.5794,
      longitude: 73.0636,
    }
  });

  console.log('Organization settings initialized:', org);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
