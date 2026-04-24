import prisma from './utils/prisma.js';

async function fix() {
  const assignments = await prisma.routeAssignment.findMany({
    where: { status: true },
    orderBy: { startDate: 'desc' }
  });
  
  const activeVehicles = new Set();
  const activeUsers = new Set();
  
  for (const a of assignments) {
    // If the user doesn't exist anymore, just deactivate this orphaned assignment
    const user = await prisma.user.findUnique({ where: { id: a.userId } });
    if (!user) {
      console.log(`Deactivating orphaned assignment ${a.id} for missing user ${a.userId}`);
      await prisma.routeAssignment.update({
        where: { id: a.id },
        data: { status: false }
      });
      continue;
    }
    
    if (activeVehicles.has(a.vehicleId) || activeUsers.has(a.userId)) {
      // Duplicate, deactivate it
      console.log(`Deactivating duplicate assignment ${a.id} for vehicle ${a.vehicleId} or user ${a.userId}`);
      await prisma.routeAssignment.update({
        where: { id: a.id },
        data: { status: false }
      });
    } else {
      activeVehicles.add(a.vehicleId);
      activeUsers.add(a.userId);
      
      // Ensure user's assigned vehicle is correct
      await prisma.user.updateMany({
          where: { assignedVehicleId: a.vehicleId, id: { not: a.userId } },
          data: { assignedVehicleId: null }
      });
      await prisma.user.update({
          where: { id: a.userId },
          data: { assignedVehicleId: a.vehicleId }
      });
    }
  }
  
  console.log("Fix complete.");
}

fix().finally(() => prisma.$disconnect());
