import prisma from './prisma.js';

/**
 * Log an activity to the database
 * @param {Object} params
 * @param {string} params.userId - The ID of the user performing the action
 * @param {string} params.tenantId - The tenant ID
 * @param {string} params.action - The type of action (e.g., "SALE_CREATED")
 * @param {string} params.details - Human-readable description
 * @param {Object} [params.metadata] - Optional JSON data
 * @param {string} [params.storeId] - Optional store ID
 */
export const logActivity = async ({ userId, tenantId, action, details, metadata = {}, storeId = null, targetUserId = null }) => {
  try {
    await prisma.activityLog.create({
      data: {
        userId,
        tenantId,
        action,
        details,
        metadata,
        storeId,
        targetUserId
      }
    });
  } catch (error) {
    console.error('[ActivityLogger] Failed to log activity:', error);
    // We don't throw here to avoid breaking the main request flow
  }
};
