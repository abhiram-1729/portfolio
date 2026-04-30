import jwt from 'jsonwebtoken';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function run() {
  try {
    const user = await prisma.user.findFirst({ where: { role: 'ADMIN' } });
    if (!user) return console.log("No admin found");

    const token = jwt.sign({ id: user.id }, 'shop-on-wheels-secret-key-2026', { expiresIn: '1d' });
    
    // get a valid purchase invoice
    const pi = await prisma.purchaseInvoice.findFirst({ include: { items: true } });
    if (!pi) return console.log("No purchase invoices");

    console.log("Updating", pi.id);
    const res = await fetch(`http://localhost:5001/api/procurement/purchases/${pi.id}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': "Bearer " + token
      },
      body: JSON.stringify({
        invoiceNumber: pi.invoiceNumber,
        invoiceDate: pi.invoiceDate,
        transportCharges: pi.transportCharges,
        otherCharges: pi.otherCharges,
        items: pi.items.map(i => ({ productId: i.productId, quantity: i.quantity, price: i.price }))
      })
    });
    
    const data = await res.json();
    console.log(res.status, data);
  } catch (err) {
    console.error(err.message);
  } finally {
    await prisma.$disconnect();
  }
}
run();
