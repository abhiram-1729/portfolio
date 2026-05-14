import dotenv from 'dotenv';
dotenv.config();
import app from './app.js';
import { initCronJobs } from './utils/cronJobs.js';
import { createServer } from 'http';
import { initSocket } from './services/socketService.js';

const PORT = process.env.PORT || 5001; 

const server = createServer(app);
const io = initSocket(server);

server.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on port ${PORT}`);
    initCronJobs();
});

// Graceful shutdown to free DB connections
const shutdown = async () => {
    console.log('Shutting down server...');
    try {
        const prisma = (await import('./utils/prisma.js')).default;
        await prisma.$disconnect();
        console.log('Prisma disconnected');
    } catch (err) {
        console.error('Error during Prisma disconnect:', err);
    }
    server.close(() => {
        console.log('HTTP server closed');
        process.exit(0);
    });
};

process.on('SIGTERM', shutdown);
process.on('SIGINT', shutdown);