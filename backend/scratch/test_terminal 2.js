import prisma from '../utils/prisma.js';

async function test() {
  try {
    console.log("Checking if POSTerminal table exists in DB...");
    const terminals = await prisma.pOSTerminal.findMany();
    console.log("POSTerminal terminals in DB:", JSON.stringify(terminals, null, 2));
  } catch (error) {
    console.error("DB QUERY ERROR:", error.message);
  } finally {
    await prisma.$disconnect();
  }
}

test();
