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
        try {
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

            // Redirect findUnique to findFirst to include tenantId
            if (operation === 'findUnique') {
              const modelName = model.charAt(0).toLowerCase() + model.slice(1);
              if (basePrisma[modelName]) {
                const refinedWhere = { ...args.where, tenantId };
                
                // Flatten composite unique keys for findFirst compatibility
                // (e.g., { vehicleId_date: { vehicleId, date } } -> { vehicleId, date })
                for (const key in args.where) {
                  if (key.includes('_') && typeof args.where[key] === 'object' && !Array.isArray(args.where[key])) {
                    // Check if it's a composite key (values are not filters like 'in', 'gt', etc.)
                    const values = args.where[key];
                    const isFilter = Object.keys(values).some(k => ['in', 'not', 'gt', 'lt', 'gte', 'lte', 'contains'].includes(k));
                    if (!isFilter) {
                      Object.assign(refinedWhere, values);
                      delete refinedWhere[key];
                    }
                  }
                }

                return basePrisma[modelName].findFirst({
                  ...args,
                  where: refinedWhere
                });
              }
            }
            
            // Injection for Write operations
            if (operation === 'create') {
              // Models where Prisma insists on relation connectivity instead of scalar ID
              const useRelationModels = ['Order', 'OrderItem', 'Product', 'User'];
              
              if (useRelationModels.includes(model)) {
                args.data = { ...args.data, tenant: { connect: { id: tenantId } } };
              } else {
                args.data = { ...args.data, tenantId };
              }
            } else if (operation === 'createMany') {
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
        } catch (error) {
          console.error(`[Prisma Extension Error] Model: ${model}, Op: ${operation}:`, error.message);
          throw error;
        }
      },
    },
  },
});

export default prisma;
