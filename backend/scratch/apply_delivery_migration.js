import prisma from '../utils/prisma.js';
import dotenv from 'dotenv';

dotenv.config();

async function applyMigration() {
  console.log('--- Applying Module 9 Schema Changes ---');
  
  try {
    // 1. Add columns to Order
    await prisma.$executeRawUnsafe(`
      ALTER TABLE "Order" 
      ADD COLUMN IF NOT EXISTS "deliveryCharge" DOUBLE PRECISION NOT NULL DEFAULT 0,
      ADD COLUMN IF NOT EXISTS "deliverySlot" TEXT,
      ADD COLUMN IF NOT EXISTS "deliveryDate" TIMESTAMP(3);
    `);
    console.log('Updated Order table.');

    // 2. Add columns to BusinessSettings
    await prisma.$executeRawUnsafe(`
      ALTER TABLE "BusinessSettings" 
      ADD COLUMN IF NOT EXISTS "deliverySlabs" JSONB,
      ADD COLUMN IF NOT EXISTS "deliverySlots" JSONB,
      ADD COLUMN IF NOT EXISTS "deliveryRadiusEnforced" BOOLEAN NOT NULL DEFAULT true;
    `);
    console.log('Updated BusinessSettings table.');

  } catch (err) {
    console.error('Migration error:', err);
  } finally {
    await prisma.$disconnect();
  }
}

applyMigration();
