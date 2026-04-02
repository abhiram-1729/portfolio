import prisma from './utils/prisma.js';

async function check() {
  console.log('Prisma keys:', Object.keys(prisma).filter(k => !k.startsWith('_')));
  process.exit(0);
}

check();
