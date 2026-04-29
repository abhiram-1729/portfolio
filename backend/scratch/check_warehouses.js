import { PrismaClient } from '@prisma/client'; const prisma = new PrismaClient(); async function main() { const w = await prisma.warehouse.findMany(); console.log(JSON.stringify(w)); } main();
