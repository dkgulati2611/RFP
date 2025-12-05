import { PrismaClient } from '@prisma/client';
import dotenv from 'dotenv';

dotenv.config();

const prisma = new PrismaClient();

async function main() {
  console.log('Seeding database...');

  // Create sample vendors
  const vendors = await Promise.all([
    prisma.vendor.upsert({
      where: { email: 'vendor1@example.com' },
      update: {},
      create: {
        name: 'Tech Solutions Inc.',
        email: 'vendor1@example.com',
        company: 'Tech Solutions Inc.',
      },
    }),
    prisma.vendor.upsert({
      where: { email: 'vendor2@example.com' },
      update: {},
      create: {
        name: 'Global Supplies Co.',
        email: 'vendor2@example.com',
        company: 'Global Supplies Co.',
      },
    }),
    prisma.vendor.upsert({
      where: { email: 'vendor3@example.com' },
      update: {},
      create: {
        name: 'Premium Equipment Ltd.',
        email: 'vendor3@example.com',
        company: 'Premium Equipment Ltd.',
      },
    }),
  ]);

  console.log(`Created ${vendors.length} vendors`);

  console.log('Seeding complete!');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

