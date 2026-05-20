import prisma from '../utils/prisma.js';

async function run() {
  try {
    // Let's find an active vendor first
    const vendors = await prisma.vendor.findMany({
      take: 5,
      include: {
        itemMappings: true
      }
    });
    console.log("Found vendors count:", vendors.length);
    if (vendors.length === 0) {
      console.log("No vendors found!");
      return;
    }

    for (const vendor of vendors) {
      console.log(`\nTesting vendor: ${vendor.vendorName} (ID: ${vendor.id})`);
      const productIds = vendor.itemMappings.map(m => m.productId);
      console.log("Product IDs in mapping:", productIds);

      // Now query details exactly as in getStockLedger
      console.log("1. Querying vendor details...");
      const dbVendor = await prisma.vendor.findUnique({
        where: { id: vendor.id },
        include: {
          itemMappings: {
            include: {
              product: {
                select: {
                  id: true,
                  name: true,
                  stock: true,
                  purchasePrice: true,
                  price: true,
                  skuCode: true,
                  category: { select: { name: true } },
                  unit: { select: { name: true } }
                }
              }
            }
          }
        }
      });
      console.log("dbVendor query completed successfully.");

      console.log("2. Querying movements...");
      const movements = await prisma.procurementStockLedger.findMany({
        where: {
          productId: { in: productIds },
        },
        orderBy: { createdAt: 'desc' },
        take: 100,
        include: {
          product: {
            select: {
              id: true,
              name: true,
              skuCode: true,
              purchasePrice: true,
              price: true,
              category: { select: { name: true } },
              unit: { select: { name: true } }
            }
          }
        }
      });
      console.log("Movements count:", movements.length);

      console.log("3. Querying GRN items...");
      const grnItems = productIds.length > 0 ? await prisma.goodsReceiptItem.findMany({
        where: {
          productId: { in: productIds },
        },
        select: {
          productId: true,
          grnId: true,
          expiryStatus: true
        }
      }) : [];
      console.log("GRN items count:", grnItems.length);
    }
  } catch (error) {
    console.error("CRITICAL ERROR IN STOCK LEDGER LOGIC:", error);
  } finally {
    await prisma.$disconnect();
  }
}

run();
