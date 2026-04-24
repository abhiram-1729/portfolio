import prisma from './utils/prisma.js';

async function run() {
  const assignments = await prisma.routeAssignment.findMany({
    where: { status: true },
    include: { route: true, user: true, vehicle: true }
  });
  
  const mismatch = assignments.filter(a => a.user && a.user.assignedVehicleId !== a.vehicleId);
  console.log(mismatch.map(a => ({
      userName: a.user.name,
      userAssignedVehicleId: a.user.assignedVehicleId,
      assignmentVehicleId: a.vehicleId,
      routeName: a.route.routeName
  })));
}

run().finally(() => prisma.$disconnect());
