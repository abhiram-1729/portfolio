import prisma from './utils/prisma.js';

async function fix() {
  const assignments = await prisma.routeAssignment.findMany({
    where: { status: true },
    include: { route: true, user: true, vehicle: true }
  });
  
  for (const a of assignments) {
    if (a.user && a.user.assignedVehicleId !== a.vehicleId) {
      console.log(`Fixing user ${a.user.name}: changing vehicle from ${a.user.assignedVehicleId} to ${a.vehicleId}`);
      
      // Clear anyone else who has this vehicle
      await prisma.user.updateMany({
        where: { assignedVehicleId: a.vehicleId },
        data: { assignedVehicleId: null }
      });
      
      // Assign it to this user
      await prisma.user.update({
        where: { id: a.userId },
        data: { assignedVehicleId: a.vehicleId }
      });
    }
  }
  console.log("Fix complete.");
}

fix().finally(() => prisma.$disconnect());
