import prisma from './prisma.js';

async function fixSequences() {
  try {
    console.log('🔄 Checking and fixing database sequences...');

    // Fix Order.orderNumber sequence
    const maxOrder = await prisma.order.aggregate({
      _max: { orderNumber: true }
    });
    
    if (maxOrder._max.orderNumber) {
        console.log(`📍 Max Order Number: ${maxOrder._max.orderNumber}`);
        // PostgreSQL sequence name logic: Model_field_seq
        await prisma.$executeRawUnsafe(`SELECT setval('"Order_orderNumber_seq"', ${maxOrder._max.orderNumber})`);
        console.log('✅ Order sequence reset successfully.');
    } else {
        console.log('ℹ️ No orders found, sequence reset not needed.');
    }

    // Fix PurchaseOrder.poNumber sequence
    const maxPO = await prisma.purchaseOrder.aggregate({
      _max: { poNumber: true }
    });
    const maxPoVal = maxPO._max.poNumber;
    
    if (maxPoVal) {
        console.log(`📍 Max PO Number: ${maxPoVal}`);
        await prisma.$executeRawUnsafe(`SELECT setval('"PurchaseOrder_poNumber_seq"', ${maxPoVal})`);
        console.log('✅ PO sequence reset successfully.');
    } else {
        console.log('ℹ️ No PurchaseOrders found, sequence reset not needed.');
    }

    console.log('✨ All sequences are now in sync!');
  } catch (error) {
    console.error('❌ Error fixing sequences:', error.message);
    if (error.message.includes('relation "Order_orderNumber_seq" does not exist')) {
        console.log('💡 Note: Sequence names might be different. Please check your DB schema.');
    }
  } finally {
    await prisma.$disconnect();
  }
}

fixSequences();
