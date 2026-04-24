import prisma from './utils/prisma.js';

async function run() {
  const assignments = await prisma.routeAssignment.findMany({
    where: { status: true },
    include: { route: true, user: true, vehicle: true }
  });
  console.log(JSON.stringify(assignments, null, 2));
}

run().finally(() => prisma.$disconnect());
