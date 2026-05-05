import prisma from '../utils/prisma.js';

// Module definitions - central source of truth for available modules
export const AVAILABLE_MODULES = [
  'DASHBOARD',
  'INVENTORY',
  'SALES',
  'VEHICLES',
  'STAFF',
  'ROUTES',
  'CASH',
  'TARGETS',
  'ASSETS',
  'EXPENSES',
  'PROCUREMENT',
  'REPORTS',
  'NOTIFICATIONS',
  'SETTINGS'
];

// Granular expense sections for fine-tuned RBAC
export const EXPENSE_SECTIONS = [
  { key: 'MONITORING', label: 'Expense Monitoring', desc: 'View all expense submissions' },
  { key: 'APPROVAL', label: 'Expense Approval', desc: 'Approve, reject, and return expenses' },
  { key: 'SETTINGS', label: 'Expense Settings', desc: 'Manage categories, limits, and policies' }
];

export const AVAILABLE_ACTIONS = ['READ', 'CREATE', 'UPDATE', 'DELETE'];

// @desc    Get all custom roles for this tenant
// @route   GET /api/admin/roles
// @access  Private/Admin+
export const getRoles = async (req, res, next) => {
    try {
        const roles = await prisma.customRole.findMany({
            where: { tenantId: req.user.tenantId },
            include: {
                _count: { select: { users: true } }
            },
            orderBy: { createdAt: 'desc' }
        });

        res.json({
            success: true,
            data: roles,
            modules: AVAILABLE_MODULES,
            actions: AVAILABLE_ACTIONS,
            expenseSections: EXPENSE_SECTIONS
        });
    } catch (error) {
        next(error);
    }
};

// @desc    Get a single role
// @route   GET /api/admin/roles/:id
// @access  Private/Admin+
export const getRole = async (req, res, next) => {
    try {
        const role = await prisma.customRole.findFirst({
            where: { id: req.params.id, tenantId: req.user.tenantId },
            include: {
                users: { select: { id: true, name: true, email: true, role: true } },
                _count: { select: { users: true } }
            }
        });

        if (!role) {
            res.status(404);
            throw new Error('Role not found');
        }

        res.json({ success: true, data: role });
    } catch (error) {
        next(error);
    }
};

// @desc    Create a custom role
// @route   POST /api/admin/roles
// @access  Private/Admin+
export const createRole = async (req, res, next) => {
    try {
        const { name, description, permissions, portalType } = req.body;

        if (!name || !permissions) {
            res.status(400);
            throw new Error('Role name and permissions are required');
        }

        const role = await prisma.customRole.create({
            data: {
                tenantId: req.user.tenantId,
                name: name.trim(),
                description: description?.trim() || null,
                permissions,
                portalType: portalType || 'ADMIN'
            }
        });

        res.status(201).json({ success: true, data: role });
    } catch (error) {
        if (error.code === 'P2002') {
            res.status(400);
            return next(new Error(`A role with the name "${req.body.name}" already exists`));
        }
        next(error);
    }
};

// @desc    Update a custom role
// @route   PUT /api/admin/roles/:id
// @access  Private/Admin+
export const updateRole = async (req, res, next) => {
    try {
        const { name, description, permissions, portalType } = req.body;

        const existing = await prisma.customRole.findFirst({
            where: { id: req.params.id, tenantId: req.user.tenantId }
        });

        if (!existing) {
            res.status(404);
            throw new Error('Role not found');
        }

        const role = await prisma.customRole.update({
            where: { id: req.params.id },
            data: {
                ...(name && { name: name.trim() }),
                ...(description !== undefined && { description: description?.trim() || null }),
                ...(permissions && { permissions }),
                ...(portalType && { portalType })
            }
        });

        res.json({ success: true, data: role });
    } catch (error) {
        if (error.code === 'P2002') {
            res.status(400);
            return next(new Error(`A role with the name "${req.body.name}" already exists`));
        }
        next(error);
    }
};

// @desc    Delete a custom role
// @route   DELETE /api/admin/roles/:id
// @access  Private/Admin+
export const deleteRole = async (req, res, next) => {
    try {
        const role = await prisma.customRole.findFirst({
            where: { id: req.params.id, tenantId: req.user.tenantId },
            include: { _count: { select: { users: true } } }
        });

        if (!role) {
            res.status(404);
            throw new Error('Role not found');
        }

        if (role._count.users > 0) {
            res.status(400);
            throw new Error(`Cannot delete this role. It is currently assigned to ${role._count.users} user(s). Please reassign them first.`);
        }

        await prisma.customRole.delete({ where: { id: req.params.id } });

        res.json({ success: true, message: 'Role deleted successfully' });
    } catch (error) {
        next(error);
    }
};

// @desc    Assign a custom role to a user
// @route   PUT /api/admin/roles/assign
// @access  Private/Admin+
export const assignRole = async (req, res, next) => {
    try {
        const { userId, customRoleId } = req.body;

        if (!userId) {
            res.status(400);
            throw new Error('User ID is required');
        }

        // Verify user belongs to same tenant
        const user = await prisma.user.findFirst({
            where: { id: userId, tenantId: req.user.tenantId }
        });

        if (!user) {
            res.status(404);
            throw new Error('User not found');
        }

        // If customRoleId is provided, verify role exists in same tenant
        if (customRoleId) {
            const role = await prisma.customRole.findFirst({
                where: { id: customRoleId, tenantId: req.user.tenantId }
            });
            if (!role) {
                res.status(404);
                throw new Error('Role not found');
            }
        }

        const updated = await prisma.user.update({
            where: { id: userId },
            data: { customRoleId: customRoleId || null },
            include: {
                customRole: true
            }
        });

        res.json({ success: true, data: updated });
    } catch (error) {
        next(error);
    }
};
