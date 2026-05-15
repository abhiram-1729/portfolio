import { Prisma } from '@prisma/client';
console.log('Order Model Fields:', Prisma.dmmf.datamodel.models.find(m => m.name === 'Order').fields.map(f => f.name));
console.log('BusinessSettings Model Fields:', Prisma.dmmf.datamodel.models.find(m => m.name === 'BusinessSettings').fields.map(f => f.name));
