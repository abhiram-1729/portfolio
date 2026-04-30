import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function run() {
  try {
    const id = "cmol8mu9x007nndzn8ch1lqi3";
    const existing = await prisma.purchaseInvoice.findUnique({ where: { id } });
    if (!existing) return console.log("Not found");
    console.log("Found:", existing.invoiceNumber);
    
    // Simulate what the code does
    const oldItems = await prisma.purchaseInvoiceItem.findMany({ where: { invoiceId: id } });
    console.log("Old items:", oldItems.length);
  } catch (err) {
    console.error(err);
  } finally {
    await prisma.$disconnect();
  }
}
run();
