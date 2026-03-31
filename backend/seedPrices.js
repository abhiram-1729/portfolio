import prisma from './utils/prisma.js';

async function updatePrices() {
  const products = await prisma.product.findMany();
  let updatedCount = 0;

  for (const product of products) {
    const sellingPrice = product.price;
    // Assume MRP is roughly 35% higher than Selling Price, rounded to nearest 10
    let mrp = Math.ceil((sellingPrice * 1.35) / 10) * 10;
    
    // Safety check: ensure MRP is strictly > Selling Price
    if (mrp <= sellingPrice) {
        mrp = sellingPrice + 50; 
    }

    const discount = mrp - sellingPrice;
    
    // Assume Landing Price is roughly 60% of Selling Price (40% profit margin)
    const landingPrice = Math.floor(sellingPrice * 0.6);

    await prisma.product.update({
      where: { id: product.id },
      data: {
        mrp,
        discount,
        landingPrice
      }
    });

    console.log(`Updated ${product.name} | MRP: ₹${mrp} | Sale: ₹${sellingPrice} | Discount: ₹${discount} | Cost: ₹${landingPrice}`);
    updatedCount++;
  }

  return updatedCount;
}

updatePrices()
  .then((count) => console.log(`\n✅ Successfully updated ${count} products with assumed pricing data!`))
  .catch(console.error)
  .finally(() => prisma.$disconnect());
