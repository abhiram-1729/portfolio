import prisma from './prisma.js';
import { format } from 'date-fns';

/**
 * VillagKart ID Generation System
 * 
 * Format: VK-[STATE]-[HUB]-[ENTITY]-[NUMBER]
 * 
 * Entity Codes:
 *   VH   = Vehicle
 *   INV  = Invoice/Order
 *   ORD  = Order
 *   PO   = Purchase Order
 *   PINV = Purchase Invoice
 *   GRN  = Goods Receipt Note
 *   PAY  = Vendor Payment
 *   EMP  = Employee/User
 *   VA   = Village Assistant
 *   ITM  = Item/Product
 *   VND  = Vendor
 *   SES  = Session
 *   EXP  = Expense
 * 
 * Reset Logic:
 *   INV  → Daily   (period = YYYYMMDD)
 *   PO   → Yearly  (period = YYYY)
 *   Others → Continuous (period = ALL)
 */

// Entity reset configuration
const RESET_CONFIG = {
  INV: 'DAILY',
  PO: 'YEARLY',
  // All others default to CONTINUOUS
};

// Padding config (default 3, but some entities may need more)
const PADDING_CONFIG = {
  ORD: 4,
  PINV: 5,
  GRN: 5,
  PAY: 5,
  DMG: 4,
  default: 3,
};

/**
 * Get the period string based on entity reset logic.
 */
function getPeriod(entity) {
  const resetType = RESET_CONFIG[entity] || 'CONTINUOUS';
  const now = new Date();

  switch (resetType) {
    case 'DAILY':
      return format(now, 'yyyyMMdd');
    case 'YEARLY':
      return String(now.getFullYear());
    case 'CONTINUOUS':
    default:
      return 'ALL';
  }
}

/**
 * Get pad length for the number portion.
 */
function getPadding(entity) {
  return PADDING_CONFIG[entity] || PADDING_CONFIG.default;
}

/**
 * Resolve stateCode and hubCode from storeId.
 * Falls back to defaults if no store is found.
 */
async function resolveHubInfo(storeId, tenantId) {
  if (storeId) {
    const store = await prisma.store.findUnique({
      where: { id: storeId },
      select: { stateCode: true, hubCode: true }
    });
    if (store) {
      return { stateCode: store.stateCode, hubCode: store.hubCode };
    }
  }

  // Fallback: try to find any store for this tenant
  const fallbackStore = await prisma.store.findFirst({
    where: { tenantId },
    select: { stateCode: true, hubCode: true }
  });

  return {
    stateCode: fallbackStore?.stateCode || 'XX',
    hubCode: fallbackStore?.hubCode || 'HUB'
  };
}

/**
 * Generate a unique, structured ID for any entity.
 * 
 * Uses atomic upsert to handle concurrency safely.
 * 
 * @param {Object} options
 * @param {string} options.entity - Entity code (VH, INV, ORD, PO, etc.)
 * @param {string} options.tenantId - Tenant ID
 * @param {string} [options.storeId] - Store ID (to resolve state/hub codes)
 * @param {string} [options.stateCode] - Override state code
 * @param {string} [options.hubCode] - Override hub code
 * @param {string} [options.categoryCode] - For items: category code (e.g., FMCG, GRC)
 * @param {string} [options.sessionType] - For sessions: M or E
 * @param {string} [options.dateStr] - For invoices: override date string (YYYYMMDD)
 * @returns {Promise<string>} The generated display ID
 */
export async function generateId({
  entity,
  tenantId,
  storeId,
  stateCode: overrideState,
  hubCode: overrideHub,
  categoryCode,
  sessionType,
  dateStr,
}) {
  // Resolve hub info
  let stateCode = overrideState;
  let hubCode = overrideHub;

  if (!stateCode || !hubCode) {
    const hubInfo = await resolveHubInfo(storeId, tenantId);
    stateCode = stateCode || hubInfo.stateCode;
    hubCode = hubCode || hubInfo.hubCode;
  }

  // Determine period
  const period = getPeriod(entity);

  // Atomic increment using upsert
  const sequence = await prisma.idSequence.upsert({
    where: {
      tenantId_entity_hub_period: {
        tenantId,
        entity,
        hub: hubCode,
        period
      }
    },
    update: {
      lastNumber: { increment: 1 }
    },
    create: {
      tenantId,
      entity,
      hub: hubCode,
      period,
      lastNumber: 1
    }
  });

  const num = String(sequence.lastNumber).padStart(getPadding(entity), '0');

  // Build the ID based on entity type
  switch (entity) {
    case 'ITM':
      // VK-ITM-[CATEGORY]-[NUMBER]
      return `VK-ITM-${categoryCode || 'GEN'}-${num}`;

    case 'SES':
      // VK-[STATE]-[HUB]-SES-[DATE]-[M/E]
      return `VK-${stateCode}-${hubCode}-SES-${dateStr || format(new Date(), 'yyyyMMdd')}-${sessionType || 'M'}`;

    case 'INV':
      // VK-[STATE]-[HUB]-INV-[YYYYMMDD]-[NUMBER]
      return `VK-${stateCode}-${hubCode}-INV-${period}-${num}`;

    case 'PO':
      // VK-[STATE]-[HUB]-PO-[YYYY]-[NUMBER]
      return `VK-${stateCode}-${hubCode}-PO-${period}-${num}`;

    default:
      // VK-[STATE]-[HUB]-[ENTITY]-[NUMBER]
      return `VK-${stateCode}-${hubCode}-${entity}-${num}`;
  }
}

/**
 * Generate store/hub display ID.
 * Format: VK-[STATE]-[HUB]
 */
export function generateStoreId(stateCode, hubCode) {
  return `VK-${stateCode}-${hubCode}`;
}

export default generateId;
