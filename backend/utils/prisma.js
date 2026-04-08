import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import pg from 'pg';
import dotenv from 'dotenv';
import { getTenantId } from './tenantContext.js';

dotenv.config();

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  throw new Error('DATABASE_URL is not defined in environment variables');
}

const pool = new pg.Pool({
  connectionString,
  ssl: { rejectUnauthorized: false }
});

const adapter = new PrismaPg(pool);
const basePrisma = new PrismaClient({ adapter });

// Multi-Tenant Isolation Extension
const prisma = basePrisma.$extends({
  query: {
    $allModels: {
      async $allOperations({ model, operation, args, query }) {
        const tenantId = getTenantId();
        
        // Skip isolation for Tenant model itself
        if (model === 'Tenant') {
          return query(args);
        }

        if (tenantId) {
          // Injection for Read operations
          if (['findMany', 'findFirst', 'count', 'groupBy', 'aggregate'].includes(operation)) {
            args.where = { ...args.where, tenantId };
          }

          // Redirect findUnique to findFirst to include tenantId (since findUnique only takes unique fields)
          if (operation === 'findUnique') {
            const modelName = model.charAt(0).toLowerCase() + model.slice(1);
            return basePrisma[modelName].findFirst({
              ...args,
              where: { ...args.where, tenantId }
            });
          }
          
          // Injection for Write operations
          if (['create', 'createMany'].includes(operation)) {
            if (Array.isArray(args.data)) {
              args.data = args.data.map(d => ({ ...d, tenantId }));
            } else {
              args.data = { ...args.data, tenantId };
            }
          }
          
          if (['update', 'updateMany', 'upsert', 'delete', 'deleteMany'].includes(operation)) {
            args.where = { ...args.where, tenantId };
          }
        }

        return query(args);
      },
    },
  },
});

export default prisma;
