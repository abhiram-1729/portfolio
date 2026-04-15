import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import pg from 'pg';
import dotenv from 'dotenv';

dotenv.config();

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  throw new Error('DATABASE_URL is not defined in environment variables');
}

const pool = new pg.Pool({
  connectionString,
  ssl: { rejectUnauthorized: false }
});

const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function main() {
  console.log('🚀 Starting inventory seeding...');

  // 1. Identify Target Tenant
  const tenant = await prisma.tenant.findFirst();
  if (!tenant) {
    console.error('❌ No tenants found in database.');
    return;
  }
  console.log(`✅ Using Tenant: ${tenant.name} (${tenant.id})`);

  // 2. Seed Units
  const unitsData = [
    { name: 'Pieces', type: 'PCS' },
    { name: 'Kilograms', type: 'KG' },
    { name: 'Grams', type: 'G' },
    { name: 'Liters', type: 'LTR' },
    { name: 'Milliliters', type: 'ML' },
    { name: 'Packets', type: 'PKT' },
    { name: 'Boxes', type: 'BOX' },
    { name: 'Dozen', type: 'DOZ' }
  ];

  const seededUnits = {};
  for (const u of unitsData) {
    let unit = await prisma.unit.findFirst({
      where: {
        tenantId: tenant.id,
        storeId: null,
        name: u.name
      }
    });

    if (!unit) {
      unit = await prisma.unit.create({
        data: {
          tenantId: tenant.id,
          storeId: null,
          name: u.name,
          type: u.type
        }
      });
    } else {
      unit = await prisma.unit.update({
        where: { id: unit.id },
        data: { type: u.type }
      });
    }
    seededUnits[u.type] = unit;
    console.log(`- Unit synced: ${unit.name} (${unit.type})`);
  }

  // 3. Seed Categories & Sub-Categories
  const inventoryStructure = [
    {
      name: 'Staples',
      subCategories: ['Rice', 'Flour', 'Pulses', 'Oil', 'Sugar']
    },
    {
      name: 'Groceries',
      subCategories: ['Spices', 'Salt', 'Tea & Coffee', 'Dry Fruits']
    },
    {
      name: 'Personal Care',
      subCategories: ['Soaps', 'Shampoos', 'Toothpaste', 'Detergents']
    },
    {
      name: 'Dairy & Snacks',
      subCategories: ['Milk Powder', 'Biscuits', 'Namkeen', 'Chocolates']
    },
    {
      name: 'Uncategorized',
      subCategories: ['General Items']
    }
  ];

  const mapping = {}; // { categoryName: { subCategoryName: id } }

  for (const catData of inventoryStructure) {
    let category = await prisma.category.findFirst({
      where: {
        tenantId: tenant.id,
        storeId: null,
        name: catData.name
      }
    });

    if (!category) {
      category = await prisma.category.create({
        data: {
          tenantId: tenant.id,
          storeId: null,
          name: catData.name
        }
      });
    }

    mapping[catData.name] = { id: category.id, sub: {} };

    for (const subName of catData.subCategories) {
      let sub = await prisma.subCategory.findFirst({
        where: {
          categoryId: category.id,
          name: subName
        }
      });

      if (!sub) {
        sub = await prisma.subCategory.create({
          data: {
            categoryId: category.id,
            name: subName,
            tenantId: tenant.id
          }
        });
      }
      mapping[catData.name].sub[subName] = sub.id;
    }
    console.log(`- Category synced: ${catData.name} (${catData.subCategories.length} sub-categories)`);
  }

  // 3b. Seed default Brand
  let brand = await prisma.brand.findFirst({
    where: {
      tenantId: tenant.id,
      name: 'Generic'
    }
  });

  if (!brand) {
    brand = await prisma.brand.create({
      data: {
        tenantId: tenant.id,
        name: 'Generic'
      }
    });
    console.log(`- Default Brand synced: ${brand.name}`);
  }

  // 4. Update existing products
  console.log('📦 Updating existing products...');

  const products = await prisma.product.findMany({});

  console.log(`Found ${products.length} products to process.`);

  // Default fallback values
  const defaultCategory = mapping['Uncategorized'];
  const defaultSubCategoryId = defaultCategory.sub['General Items'];
  const defaultUnit = seededUnits['PCS'];

  let updatedCount = 0;
  for (const product of products) {
    // Try to intelligently guess category based on name
    let targetCategoryId = defaultCategory.id;
    let targetSubCategoryId = defaultSubCategoryId;
    let targetUnitId = seededUnits['PCS'].id;
    let targetUnitValue = product.unitValue || 1;

    // Simple keyword matching for demo purposes
    const name = product.name.toLowerCase();
    if (name.includes('rice')) {
      targetCategoryId = mapping['Staples'].id;
      targetSubCategoryId = mapping['Staples'].sub['Rice'];
      targetUnitId = seededUnits['KG'].id;
    } else if (name.includes('oil')) {
      targetCategoryId = mapping['Staples'].id;
      targetSubCategoryId = mapping['Staples'].sub['Oil'];
      targetUnitId = seededUnits['LTR'].id;
    } else if (name.includes('soap') || name.includes('detergent')) {
      targetCategoryId = mapping['Personal Care'].id;
      targetSubCategoryId = name.includes('soap') ? mapping['Personal Care'].sub['Soaps'] : mapping['Personal Care'].sub['Detergents'];
      targetUnitId = seededUnits['PCS'].id;
    } else if (name.includes('sugar') || name.includes('atta') || name.includes('flour')) {
      targetCategoryId = mapping['Staples'].id;
      targetSubCategoryId = name.includes('sugar') ? mapping['Staples'].sub['Sugar'] : mapping['Staples'].sub['Flour'];
      targetUnitId = seededUnits['KG'].id;
    }

    await prisma.product.update({
      where: { id: product.id },
      data: {
        categoryId: targetCategoryId,
        subCategoryId: targetSubCategoryId,
        unitId: targetUnitId,
        unitValue: targetUnitValue,
        brandId: product.brandId || brand.id
      }
    });
    updatedCount++;
  }

  console.log(`✅ Successfully updated ${updatedCount} products.`);
  console.log('✨ Inventory seeding complete!');
}

main()
  .catch((e) => {
    console.error('❌ Seeding failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
    await pool.end();
  });
