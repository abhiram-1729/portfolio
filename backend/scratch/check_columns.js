import prisma from '../utils/prisma.js';
import dotenv from 'dotenv';
dotenv.config();

async function check() {
  try {
    const res = await prisma.$queryRawUnsafe("SELECT column_name FROM information_schema.columns WHERE table_name = 'BusinessSettings'");
    console.log('BusinessSettings Columns:', res.map(c => c.column_name));
    
    const res2 = await prisma.$queryRawUnsafe("SELECT column_name FROM information_schema.columns WHERE table_name = 'Order'");
    console.log('Order Columns:', res2.map(c => c.column_name));
  } catch (e) {
    console.error(e);
  } finally {
    await prisma.$disconnect();
  }
}
check();
