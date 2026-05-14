import fs from 'fs';
import path from 'path';
const logFile = fs.createWriteStream('debug.log', { flags: 'a' });
console.log = (...args) => {
  logFile.write(`[${new Date().toISOString()}] LOG: ${args.map(a => typeof a === 'object' ? JSON.stringify(a) : a).join(' ')}\n`);
  process.stdout.write(args.join(' ') + '\n');
};
console.error = (...args) => {
  logFile.write(`[${new Date().toISOString()}] ERR: ${args.map(a => typeof a === 'object' ? JSON.stringify(a) : a).join(' ')}\n`);
  process.stderr.write(args.join(' ') + '\n');
};

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