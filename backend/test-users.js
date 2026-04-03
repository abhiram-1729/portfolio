import prisma from './utils/prisma.js';

async function main() {
  const users = await prisma.user.findMany();
  console.log(users.map(u => ({ email: u.email, mobile: u.mobile, role: u.role })));
}
main().catch(console.error).finally(() => prisma.$disconnect());
