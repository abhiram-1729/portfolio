/**
 * Utility to resolve the effective store ID for a request.
 * Handles global roles (TENANT_OWNER, SUPER_ADMIN, ADMIN) vs restricted roles.
 * Priority: req.query.storeId (for global) > req.user.storeId
 */
export const getEffectiveStoreId = (req) => {
    if (!req.user) return null;

    const queryStoreId = req.query?.storeId;
    const bodyStoreId = req.body?.storeId;
    const user = req.user;

    // Normalize input storeId
    const targetStoreId = queryStoreId || bodyStoreId;

    const isGlobal = 
        user.role === 'TENANT_OWNER' || 
        user.role === 'SUPER_ADMIN' || 
        (user.role === 'ADMIN' && !user.customRoleId) ||
        user.portalType === 'ADMIN';

    // Restricted roles (Agents, Mechanics, etc.) are ALWAYS locked to their profile's storeId
    if (user.role === 'SALES_AGENT' || user.role === 'MECHANIC') {
        return user.storeId || null;
    }

    if (isGlobal) {
        // Global roles can use the provided storeId or null (for all stores)
        return (targetStoreId && targetStoreId !== 'undefined' && targetStoreId !== 'null' && targetStoreId !== '') ? targetStoreId : null;
    }

    // Default for others (Restricted Admins, Branch Managers)
    return user.storeId || null;
};
