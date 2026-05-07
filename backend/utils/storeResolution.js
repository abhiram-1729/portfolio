export const getEffectiveStoreId = (req) => {
    const queryStoreId = req.query?.storeId;
    const bodyStoreId = req.body?.storeId;
    const userStoreId = req.user?.storeId;

    const isGlobal = 
        req.user?.role === 'TENANT_OWNER' || 
        req.user?.role === 'SUPER_ADMIN' || 
        req.user?.role === 'ADMIN' ||
        req.user?.portalType === 'ADMIN';

    let requestedId = null;
    if (queryStoreId && queryStoreId !== 'undefined' && queryStoreId !== 'null' && queryStoreId !== '') requestedId = queryStoreId;
    else if (bodyStoreId && bodyStoreId !== 'undefined' && bodyStoreId !== 'null' && bodyStoreId !== '') requestedId = bodyStoreId;

    // Restricted roles (Agents, Mechanics, etc.) are ALWAYS locked to their profile's storeId
    if (req.user?.role === 'SALES_AGENT' || req.user?.role === 'MECHANIC') {
        return userStoreId;
    }

    // Global Roles can see everything if requested, otherwise fallback to their own branch
    if (isGlobal) {
        const finalId = requestedId || userStoreId;
        // console.log(`[RESOLVE-DEBUG] Store Resolution - URL: ${req.originalUrl}, User: ${req.user?.name}, isGlobal: true, Final: ${finalId}`);
        return finalId;
    }

    return userStoreId;
};
