import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function test() {
  const id = 'cmojndkt5000szfzn5rbl4w3e'; // The ID from the error
  try {
    const existing = await prisma.purchaseInvoice.findUnique({ where: { id } });
    console.log('Existing Invoice:', existing ? 'Found' : 'Not Found');
    
    if (existing) {
      console.log('Model Property purchaseInvoiceItem exists:', !!prisma.purchaseInvoiceItem);
      console.log('Model Property vendorLedger exists:', !!prisma.vendorLedger);
    }
  } catch (err) {
    console.error('Test Error:', err);
  } finally {
    await prisma.$disconnect();
  }
}

test();
