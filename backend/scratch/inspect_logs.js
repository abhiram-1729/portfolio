import prisma from '../utils/prisma.js';

const inspect = async () => {
    console.log('Fetching last 10 location logs...');
    const logs = await prisma.locationLog.findMany({
        take: 10,
        orderBy: { timestamp: 'desc' },
        include: { user: { select: { name: true } } }
    });
    
    console.table(logs.map(l => ({
        user: l.user.name,
        lat: l.lat,
        long: l.long,
        sub: l.subLocation || '--- MISSING ---',
        time: l.timestamp
    })));
};

inspect();
