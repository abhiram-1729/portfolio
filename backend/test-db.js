import prisma from './utils/prisma.js';

async function main() {
    try {
        console.log('Testing Prisma connection with adapter...');
        const users = await prisma.user.findMany({ take: 1 });
        console.log('Users found:', users.length);

        console.log('Testing Route cycle lookup...');
        const cycles = await prisma.routeCycle.findMany({ take: 5 });
        console.log('Cycles found:', cycles.length);
        
        console.log('Prisma test completed successfully!');
    } catch (err) {
        console.error('Prisma test FAILED:', err);
    } finally {
        await prisma.$disconnect();
    }
}

main();
