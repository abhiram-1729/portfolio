import prisma from './utils/prisma.js';
prisma.businessSettings.findFirst()
  .then(res => { console.log("SUCCESS:", res); process.exit(0); })
  .catch(err => { console.error("ERRRR:", err); process.exit(1); });
