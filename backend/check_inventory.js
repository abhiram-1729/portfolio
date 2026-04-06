import prisma from './utils/prisma.js';

async function main() {
  const [vehicles, users, stock] = await Promise.all([
    prisma.vehicle.findMany(),
    prisma.user.findMany({ select: { id: true, name: true, role: true, assignedVehicleId: true } }),
    prisma.vehicleStock.findMany({ include: { product: { select: { name: true } } } })
  ]);
  
  console.log('Vehicles:', JSON.stringify(vehicles, null, 2));
  console.log('Users:', JSON.stringify(users, null, 2));
  console.log('Vehicle Stock:', JSON.stringify(stock, null, 2));
}

main()
  .catch(e => console.error(e))
  .finally(() => prisma.$disconnect());
