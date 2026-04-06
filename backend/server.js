import app from './app.js';
import { initCronJobs } from './utils/cronJobs.js';
import { createServer } from 'http';
import { initSocket } from './services/socketService.js';

const PORT = process.env.PORT || 5001; // Match .env

const server = createServer(app);
const io = initSocket(server);

server.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on port ${PORT}`);
    initCronJobs();
});


