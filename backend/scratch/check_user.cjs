const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
    const users = await prisma.user.findMany({
        where: {
            OR: [
                { name: { contains: 'shiva', mode: 'insensitive' } },
                { displayId: 'ts21ef34567' }
            ]
        },
        select: {
            id: true,
            name: true,
            role: true,
            vgeType: true,
            displayId: true
        }
    });
    console.log(JSON.stringify(users, null, 2));
}

main()
    .catch(e => console.error(e))
    .finally(async () => await prisma.$disconnect());
