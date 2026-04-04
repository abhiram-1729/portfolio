import app from './app.js';
import { initCronJobs } from './utils/cronJobs.js';

const PORT = process.env.PORT || 5000;

app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on port ${PORT}`);
    initCronJobs();
});
