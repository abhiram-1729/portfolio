import prisma from './utils/prisma.js';

async function main() {
  try {
    // Update products with "Oil" in name to 5% GST
    const oilUpdate = await prisma.product.updateMany({
      where: { name: { contains: 'Oil', mode: 'insensitive' } },
      data: { gst: 5 }
    });
    console.log(`Updated ${oilUpdate.count} Oil products to 5% GST`);

    // Update products with "Masala" or "Spice" in name to 12% GST
    const spiceUpdate = await prisma.product.updateMany({
      where: { 
        OR: [
          { name: { contains: 'Masala', mode: 'insensitive' } },
          { name: { contains: 'Spice', mode: 'insensitive' } }
        ]
      },
      data: { gst: 12 }
    });
    console.log(`Updated ${spiceUpdate.count} Spice products to 12% GST`);

    // Update products with "Soap" or "Cleaner" in name to 18% GST
    const cleaningUpdate = await prisma.product.updateMany({
      where: { 
        OR: [
          { name: { contains: 'Soap', mode: 'insensitive' } },
          { name: { contains: 'Cleaner', mode: 'insensitive' } },
          { name: { contains: 'Detergent', mode: 'insensitive' } }
        ]
      },
      data: { gst: 18 }
    });
    console.log(`Updated ${cleaningUpdate.count} Cleaning products to 18% GST`);

  } catch (error) {
    console.error('Update failed:', error);
  } finally {
    await prisma.$disconnect();
    process.exit(0);
  }
}

main();
