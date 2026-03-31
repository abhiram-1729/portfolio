import prisma from '../utils/prisma.js';
import bcrypt from 'bcryptjs';

async function main() {
  console.log('🌱 Seeding database...\n');

  // Clean existing data
  await prisma.payment.deleteMany();
  await prisma.orderItem.deleteMany();
  await prisma.order.deleteMany();
  await prisma.cartItem.deleteMany();
  await prisma.cart.deleteMany();
  await prisma.warehouseInventory.deleteMany();
  await prisma.productVariant.deleteMany();
  await prisma.product.deleteMany();
  await prisma.subCategory.deleteMany();
  await prisma.category.deleteMany();
  await prisma.brand.deleteMany();
  await prisma.warehouse.deleteMany();
  await prisma.user.deleteMany();

  // Create Users
  const hashedPassword = await bcrypt.hash('agent123', 10);
  const agent = await prisma.user.create({
    data: {
      name: 'Ravi Kumar',
      email: 'ravi@shoponwheels.com',
      mobile: '9876543210',
      password: hashedPassword,
      role: 'SALES_AGENT',
    },
  });
  console.log('✅ Agent created:', agent.name);

  const admin = await prisma.user.create({
    data: {
      name: 'Admin User',
      email: 'admin@shoponwheels.com',
      mobile: '9999999999',
      password: await bcrypt.hash('admin123', 10),
      role: 'ADMIN',
    },
  });
  console.log('✅ Admin created:', admin.name);

  // Create Categories
  const categories = await Promise.all([
    prisma.category.create({ data: { name: 'Snacks' } }),
    prisma.category.create({ data: { name: 'Beverages' } }),
    prisma.category.create({ data: { name: 'Personal Care' } }),
    prisma.category.create({ data: { name: 'Dairy' } }),
    prisma.category.create({ data: { name: 'Household' } }),
  ]);
  console.log('✅ Categories created:', categories.length);

  // Create SubCategories
  const subCategories = await Promise.all([
    prisma.subCategory.create({ data: { name: 'Chips', categoryId: categories[0].id } }),
    prisma.subCategory.create({ data: { name: 'Biscuits', categoryId: categories[0].id } }),
    prisma.subCategory.create({ data: { name: 'Soft Drinks', categoryId: categories[1].id } }),
    prisma.subCategory.create({ data: { name: 'Juice', categoryId: categories[1].id } }),
    prisma.subCategory.create({ data: { name: 'Soap', categoryId: categories[2].id } }),
    prisma.subCategory.create({ data: { name: 'Milk', categoryId: categories[3].id } }),
    prisma.subCategory.create({ data: { name: 'Detergent', categoryId: categories[4].id } }),
  ]);
  console.log('✅ SubCategories created:', subCategories.length);

  // Create Brands
  const brands = await Promise.all([
    prisma.brand.create({ data: { name: 'Lays' } }),
    prisma.brand.create({ data: { name: 'Parle' } }),
    prisma.brand.create({ data: { name: 'Coca-Cola' } }),
    prisma.brand.create({ data: { name: 'Tropicana' } }),
    prisma.brand.create({ data: { name: 'Dove' } }),
    prisma.brand.create({ data: { name: 'Amul' } }),
    prisma.brand.create({ data: { name: 'Surf Excel' } }),
    prisma.brand.create({ data: { name: 'Britannia' } }),
    prisma.brand.create({ data: { name: 'Pepsi' } }),
    prisma.brand.create({ data: { name: 'Lifebuoy' } }),
  ]);
  console.log('✅ Brands created:', brands.length);

  // Create Warehouse (Vehicle)
  const warehouse = await prisma.warehouse.create({
    data: {
      name: 'Vehicle-01 (Ravi)',
      location: 'Mobile Unit - Bangalore',
    },
  });
  console.log('✅ Warehouse created:', warehouse.name);

  // Create Products
  const productsData = [
    { name: 'Lays Classic Salted', price: 20, categoryId: categories[0].id, subCategoryId: subCategories[0].id, brandId: brands[0].id },
    { name: 'Lays Magic Masala', price: 20, categoryId: categories[0].id, subCategoryId: subCategories[0].id, brandId: brands[0].id },
    { name: 'Lays American Onion', price: 30, categoryId: categories[0].id, subCategoryId: subCategories[0].id, brandId: brands[0].id },
    { name: 'Parle-G Biscuits', price: 10, categoryId: categories[0].id, subCategoryId: subCategories[1].id, brandId: brands[1].id },
    { name: 'Parle Monaco', price: 30, categoryId: categories[0].id, subCategoryId: subCategories[1].id, brandId: brands[1].id },
    { name: 'Britannia Good Day', price: 35, categoryId: categories[0].id, subCategoryId: subCategories[1].id, brandId: brands[7].id },
    { name: 'Coca-Cola 500ml', price: 40, categoryId: categories[1].id, subCategoryId: subCategories[2].id, brandId: brands[2].id },
    { name: 'Coca-Cola 1L', price: 65, categoryId: categories[1].id, subCategoryId: subCategories[2].id, brandId: brands[2].id },
    { name: 'Pepsi 500ml', price: 40, categoryId: categories[1].id, subCategoryId: subCategories[2].id, brandId: brands[8].id },
    { name: 'Tropicana Orange 1L', price: 90, categoryId: categories[1].id, subCategoryId: subCategories[3].id, brandId: brands[3].id },
    { name: 'Tropicana Apple 1L', price: 90, categoryId: categories[1].id, subCategoryId: subCategories[3].id, brandId: brands[3].id },
    { name: 'Dove Soap 100g', price: 55, categoryId: categories[2].id, subCategoryId: subCategories[4].id, brandId: brands[4].id },
    { name: 'Lifebuoy Soap 100g', price: 30, categoryId: categories[2].id, subCategoryId: subCategories[4].id, brandId: brands[9].id },
    { name: 'Amul Taza Milk 500ml', price: 25, categoryId: categories[3].id, subCategoryId: subCategories[5].id, brandId: brands[5].id },
    { name: 'Amul Gold Milk 1L', price: 68, categoryId: categories[3].id, subCategoryId: subCategories[5].id, brandId: brands[5].id },
    { name: 'Surf Excel Liquid 500ml', price: 125, categoryId: categories[4].id, subCategoryId: subCategories[6].id, brandId: brands[6].id },
  ];

  const products = await Promise.all(
    productsData.map((p) => prisma.product.create({ data: p }))
  );
  console.log('✅ Products created:', products.length);

  // Add inventory for all products in the vehicle warehouse
  await Promise.all(
    products.map((p) =>
      prisma.warehouseInventory.create({
        data: {
          warehouseId: warehouse.id,
          productId: p.id,
          quantity: Math.floor(Math.random() * 50) + 20,  // 20-70 units
        },
      })
    )
  );
  console.log('✅ Warehouse inventory populated');

  console.log('\n🎉 Seed complete!');
  console.log('\n📋 Login credentials:');
  console.log('   Agent: mobile=9876543210, password=agent123');
  console.log('   Admin: mobile=9999999999, password=admin123');
}

main()
  .catch((e) => {
    console.error('❌ Seed failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
