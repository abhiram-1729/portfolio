/**
 * Utility to resolve the effective store ID for a request.
 * Handles global roles (TENANT_OWNER, SUPER_ADMIN, ADMIN) vs restricted roles.
 * Priority: req.query.storeId (for global) > req.user.storeId
 */
export const getEffectiveStoreId = (req) => {
    if (!req.user) return null;

    const { storeId: queryStoreId } = req.query || {};
    const { storeId: bodyStoreId } = req.body || {};
    const user = req.user;

    // Normalize input storeId
    const targetStoreId = queryStoreId || bodyStoreId;

    const isGlobal = 
        user.role === 'TENANT_OWNER' || 
        user.role === 'SUPER_ADMIN' || 
        (user.role === 'ADMIN' && !user.customRoleId) ||
        user.portalType === 'ADMIN';

    if (isGlobal) {
        // Global roles can use the provided storeId or null (for all stores)
        return (targetStoreId && targetStoreId !== 'undefined' && targetStoreId !== 'null') ? targetStoreId : null;
    }

    // Restricted roles (Branch Managers, Agents, etc.) are locked to their assigned storeId
    return user.storeId || null;
};
