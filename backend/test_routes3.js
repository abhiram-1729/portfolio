import prisma from './utils/prisma.js';

async function run() {
  const assignments = await prisma.routeAssignment.findMany({
    where: { status: true },
    include: { route: true, user: true, vehicle: true }
  });
  
  console.log("Assignments:");
  assignments.forEach(a => {
      console.log(`Assignment ID: ${a.id}`);
      console.log(`  User: ${a.user ? a.user.name : 'NULL'} (assignedVehicleId: ${a.user ? a.user.assignedVehicleId : 'NULL'})`);
      console.log(`  Vehicle: ${a.vehicle ? a.vehicle.vehicleNumber : 'NULL'} (ID: ${a.vehicleId})`);
      console.log(`  Route: ${a.route ? a.route.routeName : 'NULL'} (ID: ${a.routeId})`);
  });
  
}

run().finally(() => prisma.$disconnect());
