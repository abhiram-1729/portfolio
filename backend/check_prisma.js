
import prisma from './utils/prisma.js';

console.log('Available models in Prisma:', Object.keys(prisma).filter(k => !k.startsWith('_') && !k.startsWith('$')));
if (prisma.assetCategory) {
    console.log('✅ AssetCategory model found!');
} else {
    console.log('❌ AssetCategory model NOT found in Prisma client.');
}
process.exit(0);
