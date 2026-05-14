import prisma from '../../utils/prisma.js';

// @desc    Get all stores for the organization (admin perspective)
// @route   GET /api/admin/stores
// @access  Private (Admin)
export const getAdminStores = async (req, res, next) => {
  try {
    const user = req.user;
    const isGlobal = 
        user.role === 'TENANT_OWNER' || 
        user.role === 'SUPER_ADMIN' || 
        (user.role === 'ADMIN' && !user.customRoleId) ||
        user.customRole?.portalType === 'ADMIN';

    console.log('[getAdminStores] User:', { id: user.id, role: user.role, tenantId: user.tenantId, storeId: user.storeId });
    console.log('[getAdminStores] isGlobal:', isGlobal);

    const where = {
        tenantId: user.tenantId
    };

    // If not a global role, restrict to their assigned store
    if (!isGlobal && user.storeId) {
        where.id = user.storeId;
    }

    console.log('[getAdminStores] Query where:', JSON.stringify(where, null, 2));

    const stores = await prisma.store.findMany({
      where,
      orderBy: {
        createdAt: 'desc'
      },
      include: {
        _count: {
          select: { users: true, vehicles: true }
        }
      }
    });

    console.log(`[getAdminStores] Found ${stores.length} stores`);

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
    const { name, code, address, contactEmail, contactPhone, status, stateCode, hubCode, nature, type } = req.body;

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
        nature: nature || 'Both',
        type: type || 'Private Limited',
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
    const { name, code, address, contactEmail, contactPhone, status, stateCode, hubCode, nature, type } = req.body;

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
        ...(nature && { nature }),
        ...(type && { type }),
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

    // --- NUCLEAR STORE PURGE ---
    await prisma.$transaction(async (tx) => {
      // 1. Cleanup operational state
      await tx.storeCashRegister.deleteMany({ where: { storeId: id } });
      await tx.businessSettings.deleteMany({ where: { storeId: id } });
      await tx.storeDeposit.deleteMany({ where: { storeId: id } });
      
      // 2. Unlink or Cleanup references
      // If there are vehicles or users, we already check for them above, 
      // but let's be safe and clear any lingering unlinked references if necessary.
      
      // 3. Delete related logs that might block
      await tx.activityLog.deleteMany({ where: { storeId: id } });
      await tx.notification.deleteMany({ where: { storeId: id } });

      // 4. Final Delete
      await tx.store.delete({
        where: { id }
      });
    }, { timeout: 15000 });

    res.json({ success: true, message: 'Store deleted successfully' });
  } catch (error) {
    console.error('Error deleting admin store:', error);
    next(error);
  }
};
