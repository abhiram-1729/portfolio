import prisma from '../../utils/prisma.js';
import { generateStoreId } from '../../utils/idGenerator.js';

// @desc    Get all stores for the tenant
// @route   GET /api/tenant/stores
// @access  Private (Tenant Owner)
export const getStores = async (req, res) => {
  try {
    const stores = await prisma.store.findMany({
      where: {
        tenantId: req.user.tenantId
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
    console.error('Error fetching stores:', error);
    res.status(500).json({ success: false, message: 'Server error while fetching stores' });
  }
};

// @desc    Create a new store
// @route   POST /api/tenant/stores
// @access  Private (Tenant Owner)
export const createStore = async (req, res) => {
  try {
    const { name, code, address, contactEmail, contactPhone, status, stateCode, hubCode } = req.body;

    // Check for existing stores with same critical attributes
    const existingStore = await prisma.store.findFirst({
      where: {
        tenantId: req.user.tenantId,
        OR: [
          { code: code },
          { name: name },
          { contactEmail: contactEmail },
          { contactPhone: contactPhone }
        ]
      }
    });

    if (existingStore) {
      let conflictField = 'attribute';
      if (existingStore.code === code) conflictField = 'Code';
      else if (existingStore.name === name) conflictField = 'Name';
      else if (existingStore.contactEmail === contactEmail) conflictField = 'Contact Email';
      else if (existingStore.contactPhone === contactPhone) conflictField = 'Contact Phone';

      return res.status(400).json({ 
        success: false, 
        message: `A store with this ${conflictField} already exists in your organization` 
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
        tenantId: req.user.tenantId
      }
    });

    res.status(201).json({ success: true, data: store, message: 'Store created successfully' });
  } catch (error) {
    console.error('Error creating store:', error);
    res.status(500).json({ success: false, message: 'Server error while creating store' });
  }
};

// @desc    Update a store
// @route   PUT /api/tenant/stores/:id
// @access  Private (Tenant Owner)
export const updateStore = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, code, address, contactEmail, contactPhone, status, stateCode, hubCode } = req.body;

    // Check if store exists
    const store = await prisma.store.findUnique({
      where: { id }
    });

    if (!store) {
      return res.status(404).json({ success: false, message: 'Store not found' });
    }

    // Ensure they belong to the same tenant
    if (store.tenantId !== req.user.tenantId) {
      return res.status(403).json({ success: false, message: 'Unauthorized access to store' });
    }

    // Check for conflicts with other stores
    const conflictStore = await prisma.store.findFirst({
      where: {
        tenantId: req.user.tenantId,
        id: { not: id },
        OR: [
          { code: code },
          { name: name },
          { contactEmail: contactEmail },
          { contactPhone: contactPhone }
        ]
      }
    });

    if (conflictStore) {
      let conflictField = 'attribute';
      if (conflictStore.code === code) conflictField = 'Code';
      else if (conflictStore.name === name) conflictField = 'Name';
      else if (conflictStore.contactEmail === contactEmail) conflictField = 'Contact Email';
      else if (conflictStore.contactPhone === contactPhone) conflictField = 'Contact Phone';

      return res.status(400).json({ 
        success: false, 
        message: `Another store already uses this ${conflictField}` 
      });
    }

    const updatedStore = await prisma.store.update({
      where: { id },
      data: {
        name,
        code,
        ...(stateCode && { stateCode }),
        ...(hubCode && { hubCode }),
        address,
        contactEmail,
        contactPhone,
        status
      }
    });

    res.json({ success: true, data: updatedStore, message: 'Store updated successfully' });
  } catch (error) {
    console.error('Error updating store:', error);
    res.status(500).json({ success: false, message: 'Server error while updating store' });
  }
};

// @desc    Delete a store
// @route   DELETE /api/tenant/stores/:id
// @access  Private (Tenant Owner)
export const deleteStore = async (req, res) => {
  try {
    const { id } = req.params;

    const store = await prisma.store.findUnique({
      where: { id },
      include: {
        users: true,
        vehicles: true
      }
    });

    if (!store) {
      return res.status(404).json({ success: false, message: 'Store not found' });
    }

    if (store.tenantId !== req.user.tenantId) {
      return res.status(403).json({ success: false, message: 'Unauthorized access to store' });
    }

    // Check if store has associated logic
    if (store.users.length > 0 || store.vehicles.length > 0) {
      return res.status(400).json({ 
        success: false, 
        message: 'Cannot delete store with assigned users or vehicles. Reassign them first.' 
      });
    }

    await prisma.store.delete({
      where: { id }
    });

    res.json({ success: true, message: 'Store deleted successfully' });
  } catch (error) {
    console.error('Error deleting store:', error);
    res.status(500).json({ success: false, message: 'Server error while deleting store' });
  }
};
