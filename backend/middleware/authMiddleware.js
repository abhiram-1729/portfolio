import jwt from 'jsonwebtoken';
import prisma from '../utils/prisma.js';
import { tenantContext } from '../utils/tenantContext.js';

export const protect = async (req, res, next) => {
    let token;

    if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
        try {
            token = req.headers.authorization.split(' ')[1];
            const decoded = jwt.verify(token, process.env.JWT_SECRET);

            req.user = await prisma.user.findUnique({
                where: { id: decoded.id },
                select: { 
                    id: true, 
                    name: true, 
                    email: true, 
                    role: true, 
                    assignedVehicleId: true, 
                    tenantId: true, 
                    storeId: true, 
                    customRoleId: true, 
                    customRole: { select: { permissions: true, name: true, portalType: true } } 
                }
            });

            if (!req.user) {
              return res.status(401).json({ message: 'User not found' });
            }

            // Set Tenant Context
            tenantContext.run({ tenantId: req.user.tenantId }, () => {
              next();
            });
            return; // Important: don't call next() again outside
        } catch (error) {
            console.error('[AuthMiddleware Error]', error.message);
            res.status(401);
            return next(new Error('Not authorized, token failed'));
        }
    }

    if (!token) {
        res.status(401);
        return next(new Error('Not authorized, no token'));
    }
};


export const admin = (req, res, next) => {
    const allowedRoles = ['ADMIN', 'TENANT_OWNER', 'SUPER_ADMIN'];
    const pType = req.user?.customRole?.portalType;
    const isCustomAdmin = pType === 'ADMIN' || pType === 'SUPERVISOR';

    if (req.user && (allowedRoles.includes(req.user.role) || isCustomAdmin)) {
        next();
    } else {
        res.status(403);
        return next(new Error('Not authorized as an administrator'));
    }
};

// Permission check middleware factory
// Usage: checkPermission('INVENTORY', 'CREATE')
export const checkPermission = (moduleName, action) => {
    return (req, res, next) => {
        // Super admins and tenant owners bypass all permission checks
        const bypassRoles = ['SUPER_ADMIN', 'TENANT_OWNER'];
        if (req.user && bypassRoles.includes(req.user.role)) {
            return next();
        }

        // Standard ADMINS (without custom role) also bypass for backward compatibility
        if (req.user?.role === 'ADMIN' && !req.user?.customRoleId) {
            return next();
        }

        // If user has no permissions and no bypass, deny access
        const permissions = req.user?.customRole?.permissions;
        if (!permissions) {
            res.status(403);
            return next(new Error(`Access denied. No privileges assigned for ${moduleName}.`));
        }

        // Check if the module exists in permissions and includes the required action
        const modulePerms = permissions[moduleName];
        if (!modulePerms || !Array.isArray(modulePerms) || !modulePerms.includes(action)) {
            res.status(403);
            return next(new Error(`Access denied. You do not have ${action} permission for ${moduleName}.`));
        }

        next();
    };
};
