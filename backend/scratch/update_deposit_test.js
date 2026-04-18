import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
  const dep = await prisma.storeDeposit.findFirst();
  if(!dep) { console.log("No deposits found"); return; }
  console.log("Found deposit:", dep.id);
  try {
    const res = await prisma.storeDeposit.update({
      where: { id: dep.id },
      data: { amount: dep.amount, denominations: dep.denominations, description: dep.description }
    });
    console.log("Success:", !!res);
  } catch (e) {
    console.error("Error:", e);
  }
}
main().finally(() => prisma.$disconnect());
