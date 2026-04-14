import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
  const zone = await prisma.zone.findFirst({
    where: {
      sector: {
        contains: 'SABANA PERDIDA',
        mode: 'insensitive'
      }
    }
  });
  console.log(JSON.stringify(zone, null, 2));
}

main()
  .catch(e => console.error(e))
  .finally(async () => await prisma.$disconnect());
