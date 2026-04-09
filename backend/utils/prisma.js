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
            if (operation === 'create' || operation === 'upsert') {
              const useRelationModels = ['Order', 'OrderItem', 'Product', 'User', 'Category', 'Brand', 'Tenant'];
              const connectTenant = { tenant: { connect: { id: tenantId } } };
              const scalarTenant = { tenantId };

              if (operation === 'create') {
                const hasTenant = args.data.tenantId || args.data.tenant;
                if (!hasTenant) {
                  if (useRelationModels.includes(model)) {
                    args.data = { ...args.data, ...connectTenant };
                  } else {
                    args.data = { ...args.data, ...scalarTenant };
                  }
                }
              } else if (operation === 'upsert') {
                const hasCreateTenant = args.create.tenantId || args.create.tenant;
                if (!hasCreateTenant) {
                  if (useRelationModels.includes(model)) {
                    args.create = { ...args.create, ...connectTenant };
                    if (model !== 'Tenant') args.update = { ...args.update, ...connectTenant };
                  } else {
                    args.create = { ...args.create, ...scalarTenant };
                    args.update = { ...args.update, ...scalarTenant };
                  }
                }
              }
            } else if (operation === 'createMany') {
              if (Array.isArray(args.data)) {
                args.data = args.data.map(d => {
                  const hasTenant = d.tenantId || d.tenant;
                  return hasTenant ? d : { ...d, tenantId };
                });
              }
            }
            
            if (['findMany', 'findFirst', 'count', 'groupBy', 'aggregate', 'update', 'updateMany', 'upsert', 'delete', 'deleteMany'].includes(operation)) {
               const where = args.where || {};
               const hasUniqueKey = Object.keys(where).some(k => k.includes('_'));
               if (!where.tenantId && !hasUniqueKey) {
                 args.where = { ...where, tenantId };
               }
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
