import prisma from '../../utils/prisma.js';

// @desc    Get all stores for the organization (admin perspective)
// @route   GET /api/admin/stores
// @access  Private (Admin)
export const getAdminStores = async (req, res, next) => {
  try {
    const stores = await prisma.store.findMany({
      where: {
        tenantId: req.user.tenantId,
        creatorId: req.user.id
      },
      orderBy: {
        createdAt: 'desc'
      },
      include: {
        _count: {
          select: { users: true, vehicles: true }
        }
      }
    });

    res.json({ success: true, data: stores });
  } catch (error) {
    next(error);
  }
};

// @desc    Create a new store (admin perspective)
// @route   POST /api/admin/stores
// @access  Private (Admin)
export const createAdminStore = async (req, res, next) => {
  try {
    const { name, code, address, contactEmail, contactPhone, status, stateCode, hubCode } = req.body;

    const existingStore = await prisma.store.findFirst({
      where: {
        tenantId: req.user.tenantId,
        OR: [
          { code: code },
          { name: name }
        ]
      }
    });

    if (existingStore) {
      return res.status(400).json({ 
        success: false, 
        message: 'A store with this name or code already exists in your organization' 
      });
    }

    const store = await prisma.store.create({
      data: {
        name,
        code,
        stateCode: stateCode || 'AP',
        hubCode: hubCode || code?.substring(0, 3)?.toUpperCase() || 'HUB',
        address,
        contactEmail,
        contactPhone,
        status: status || 'ACTIVE',
        tenantId: req.user.tenantId,
        creator: { connect: { id: req.user.id } }
      }
    });

    res.status(201).json({ success: true, data: store, message: 'Organization store created successfully' });
  } catch (error) {
    console.error('Error creating admin store:', error);
    next(error);
  }
};

// @desc    Update a store (admin perspective)
// @route   PUT /api/admin/stores/:id
export const updateAdminStore = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { name, code, address, contactEmail, contactPhone, status, stateCode, hubCode } = req.body;

    const store = await prisma.store.findUnique({
      where: { id }
    });

    if (!store || store.tenantId !== req.user.tenantId) {
      return res.status(404).json({ success: false, message: 'Store not found or unauthorized' });
    }

    const updatedStore = await prisma.store.update({
      where: { id },
      data: {
        name,
        code,
        stateCode,
        hubCode,
        address,
        contactEmail,
        contactPhone,
        status
      }
    });

    res.json({ success: true, data: updatedStore, message: 'Organization store updated successfully' });
  } catch (error) {
    console.error('Error updating admin store:', error);
    next(error);
  }
};

export const deleteAdminStore = async (req, res, next) => {
  try {
    const { id } = req.params;

    const store = await prisma.store.findUnique({
      where: { id },
      include: { users: true, vehicles: true }
    });

    if (!store || store.tenantId !== req.user.tenantId) {
      return res.status(404).json({ success: false, message: 'Store not found' });
    }

    if (store.users.length > 0 || store.vehicles.length > 0) {
      return res.status(400).json({ 
        success: false, 
        message: 'Cannot delete store with active users or vehicles.' 
      });
    }

    await prisma.store.delete({
      where: { id }
    });

    res.json({ success: true, message: 'Store deleted successfully' });
  } catch (error) {
    console.error('Error deleting admin store:', error);
    next(error);
  }
};
