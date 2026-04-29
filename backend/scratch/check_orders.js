import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient({});

async function main() {
    try {
        const orderCount = await prisma.order.count();
        console.log('Total Orders in DB:', orderCount);

        const latestOrders = await prisma.order.findMany({
            take: 5,
            orderBy: { createdAt: 'desc' },
            select: {
                id: true,
                displayId: true,
                agentId: true,
                userId: true,
                tenantId: true,
                status: true,
                totalAmount: true
            }
        });
        console.log('Latest 5 orders:', JSON.stringify(latestOrders, null, 2));

        const tenants = await prisma.tenant.findMany({ select: { id: true, name: true } });
        console.log('Available Tenants:', JSON.stringify(tenants, null, 2));

    } catch (e) {
        console.error(e);
    } finally {
        await prisma.$disconnect();
    }
}

main();
