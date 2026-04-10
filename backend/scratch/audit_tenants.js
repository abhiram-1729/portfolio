import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function check() {
  try {
    const users = await prisma.user.findMany({
      select: { id: true, name: true, email: true, tenantId: true, role: true }
    });
    console.log('--- USER TENANT AUDIT ---');
    users.forEach(u => {
      console.log(`User: ${u.name} | Role: ${u.role} | TenantId: ${u.tenantId}`);
    });
    console.log('-------------------------');
  } catch (err) {
    console.error('Audit Error:', err.message);
  } finally {
    await prisma.$disconnect();
  }
}

check();
