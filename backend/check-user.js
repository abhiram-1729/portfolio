import prisma from './utils/prisma.js';

async function main() {
    try {
        const user = await prisma.user.findUnique({
            where: { id: 'cmnpw3ik10000faznewjoev4q' },
            include: { tenant: true }
        });
        console.log('User:', JSON.stringify(user, null, 2));
    } catch (e) {
        console.error('Check Error:', e);
    } finally {
        process.exit();
    }
}

main();
