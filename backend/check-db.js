import prisma from './utils/prisma.js';

async function main() {
    try {
        const tenants = await prisma.tenant.findMany();
        console.log('Tenants in DB:', JSON.stringify(tenants, null, 2));
    } catch (e) {
        console.error('Check Error:', e);
    } finally {
        process.exit();
    }
}

main();
