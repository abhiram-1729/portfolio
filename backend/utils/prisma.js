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
  ssl: { rejectUnauthorized: false },
  max: 10,                 // Match database connection limit
  idleTimeoutMillis: 10000, // 10s - close idle connections before Supabase kills them
  connectionTimeoutMillis: 30000, // 30s
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

            // Injection for Write operations
            if (operation === 'create' || operation === 'upsert') {
              const relationalMandatory = ['Order', 'User', 'Store', 'Tenant']; // Models where scalars are hidden in CreateInput (mostly Order)

              const h_clean = (modelName, obj) => {
                if (!obj || typeof obj !== 'object') return obj;
                const data = { ...obj };
                const isRelationalMandatory = relationalMandatory.includes(modelName);

                // Handle Tenant Isolation
                const tId = data.tenantId || tenantId;
                if (tId) {
                  if (isRelationalMandatory && modelName !== 'Tenant') {
                    delete data.tenantId;
                    data.tenant = { connect: { id: tId } };
                  } else {
                    data.tenantId = tId;
                  }
                }

                // Handle Store Isolation
                const sId = data.storeId || null;
                if (sId && modelName !== 'Tenant') {
                  if (isRelationalMandatory) {
                    delete data.storeId;
                    data.store = { connect: { id: sId } };
                  } else {
                    data.storeId = sId;
                  }
                }

                // Recursive handling for nested creates
                for (const key in data) {
                  if (data[key] && typeof data[key] === 'object' && !['tenant', 'store', 'user', 'vehicle', 'route'].includes(key)) {
                    const val = data[key];
                    if (val.create) {
                      let nestedModel = key.charAt(0).toUpperCase() + key.slice(1);
                      if (nestedModel.endsWith('s')) nestedModel = nestedModel.slice(0, -1);
                      if (key === 'items') nestedModel = 'OrderItem';
                      if (key === 'orderItems') nestedModel = 'OrderItem';

                      if (Array.isArray(val.create)) {
                        val.create = val.create.map(d => h_clean(nestedModel, d));
                      } else {
                        val.create = h_clean(nestedModel, val.create);
                      }
                    }
                  }
                }
                return data;
              };

              if (operation === 'create') {
                args.data = h_clean(model, args.data);
              } else if (operation === 'upsert') {
                args.create = h_clean(model, args.create);
                args.update = h_clean(model, args.update);
              }
            } else if (operation === 'createMany') {
              if (args.data && Array.isArray(args.data)) {
                args.data = args.data.map(d => {
                  const hasTenant = d.tenantId || d.tenant;
                  if (!hasTenant) return { ...d, tenantId };
                  return d;
                });
              }
            }

            if (['findMany', 'findUnique', 'findFirst', 'count', 'groupBy', 'aggregate', 'update', 'updateMany', 'upsert', 'delete', 'deleteMany'].includes(operation)) {
              const where = args.where || {};
              const hasUniqueKey = where.id || where.uuid || where.email || where.displayId || Object.keys(where).some(k => k.includes('_'));
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
