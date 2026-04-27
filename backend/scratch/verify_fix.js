import prisma from '../utils/prisma.js';

async function verify() {
  try {
    console.log('Verifying Attendance query...');
    const attendance = await prisma.attendance.findUnique({
      where: { userId_date: { userId: 'some-id', date: '2026-04-27' } }
    });
    console.log('Attendance query successful (even if null).');

    console.log('Verifying LocationCheckIn query...');
    const checkIn = await prisma.locationCheckIn.findFirst({
        orderBy: { createdAt: 'desc' }
    });
    console.log('LocationCheckIn query successful.');
    
    if (checkIn && 'subLocation' in checkIn) {
        console.log('subLocation field is present in the result.');
    }

    console.log('Verifying DailyCoverage query...');
    const coverage = await prisma.dailyCoverage.findFirst();
    console.log('DailyCoverage query successful.');
    if (coverage && 'shiftStatus' in coverage) {
        console.log('shiftStatus field is present in the result.');
    }

    process.exit(0);
  } catch (error) {
    console.error('Verification failed:', error);
    process.exit(1);
  }
}

verify();
