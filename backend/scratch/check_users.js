import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();
async function main() {
  const users = await prisma.user.findMany({ include: { store: true } });
  console.log(users.map(u => ({ name: u.name, storeId: u.storeId, storeName: u.store?.name })));
}
main().finally(() => prisma.$disconnect());
