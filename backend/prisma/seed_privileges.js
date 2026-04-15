import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import pg from 'pg';
import dotenv from 'dotenv';

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
const prisma = new PrismaClient({ adapter });

async function main() {
  // 1. Identify Target Tenant
  const tenant = await prisma.tenant.findUnique({
    where: { code: 'VK001' }
  });

  if (!tenant) {
    // If VK001 doesn't exist, try to find any tenant
    const anyTenant = await prisma.tenant.findFirst();
    if (!anyTenant) {
      console.error('No tenants found in database. Please ensure your database is initialized with at least one tenant.');
      return;
    }
    console.log(`Using existing tenant: ${anyTenant.name} (${anyTenant.id})`);
    tenant = anyTenant;
  } else {
    console.log(`Seeding custom roles for Tenant: ${tenant.name} (${tenant.id})`);
  }

  // 2. Define Standard Roles
  const standardRoles = [
    {
      name: 'Standard Sales Agent',
      description: 'Default permissions for field sales agents and delivery staff.',
      permissions: {
        DASHBOARD: ['READ'],
        INVENTORY: ['READ'],
        SALES: ['READ', 'CREATE'],
        VEHICLES: ['READ'],
        ROUTES: ['READ'],
        CASH: ['READ', 'CREATE'],
        TARGETS: ['READ'],
        ASSETS: ['READ'],
        NOTIFICATIONS: ['READ']
      }
    },
    {
      name: 'Branch Manager',
      description: 'Intermediate administrative access for managing specific store locations.',
      permissions: {
        DASHBOARD: ['READ'],
        INVENTORY: ['READ', 'CREATE', 'UPDATE'],
        SALES: ['READ', 'CREATE', 'UPDATE'],
        VEHICLES: ['READ', 'UPDATE'],
        STAFF: ['READ', 'CREATE'],
        ROUTES: ['READ', 'CREATE', 'UPDATE'],
        CASH: ['READ', 'CREATE', 'UPDATE'],
        TARGETS: ['READ', 'UPDATE'],
        ASSETS: ['READ', 'CREATE', 'UPDATE'],
        EXPENSES: ['READ', 'CREATE', 'UPDATE'],
        REPORTS: ['READ'],
        NOTIFICATIONS: ['READ', 'CREATE']
      }
    },
    {
      name: 'Inventory Controller',
      description: 'Focused access for handling warehouse loading and stock audits.',
      permissions: {
        INVENTORY: ['READ', 'CREATE', 'UPDATE', 'DELETE'],
        PROCUREMENT: ['READ', 'CREATE'],
        REPORTS: ['READ']
      }
    }
  ];

  // 3. Upsert Roles
  for (const roleData of standardRoles) {
    const role = await prisma.customRole.upsert({
      where: {
        tenantId_name: {
          tenantId: tenant.id,
          name: roleData.name
        }
      },
      update: {
        description: roleData.description,
        permissions: roleData.permissions
      },
      create: {
        tenantId: tenant.id,
        name: roleData.name,
        description: roleData.description,
        permissions: roleData.permissions,
        isDefault: true
      }
    });
    console.log(`- Role synced: ${role.name}`);
  }

  console.log('\nSeeding completed successfully!');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
    await pool.end();
  });
