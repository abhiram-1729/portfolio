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
                select: { id: true, name: true, email: true, role: true, assignedVehicleId: true, tenantId: true, storeId: true }
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
    if (req.user && allowedRoles.includes(req.user.role)) {
        next();
    } else {
        res.status(403);
        return next(new Error('Not authorized as an administrator'));
    }
};
