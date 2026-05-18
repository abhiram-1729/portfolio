import prisma from '../utils/prisma.js';

async function run() {
  try {
    const stores = await prisma.store.findMany();
    console.log("Stores in DB:", JSON.stringify(stores, null, 2));
  } catch (error) {
    console.error("Error:", error);
  } finally {
    await prisma.$disconnect();
  }
}

run();
