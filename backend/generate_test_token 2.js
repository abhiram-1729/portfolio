import prisma from './utils/prisma.js';
import generateToken from './utils/generateToken.js';

async function run() {
  try {
    const user = await prisma.user.findFirst({
      where: { email: 'bhagyarao@villagkart.com' }
    });
    if (user) {
      const token = generateToken(user.id, user.role, user.assignedVehicleId, user.tenantId);
      console.log("JWT_TOKEN:", token);
    } else {
      console.log("User not found");
    }
  } catch (err) {
    console.error(err);
  } finally {
    await prisma.$disconnect();
  }
}

run();
