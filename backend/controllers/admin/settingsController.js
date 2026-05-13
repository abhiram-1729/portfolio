import prisma from '../../utils/prisma.js';
import { logActivity } from '../../utils/activityLogger.js';

// Get current business settings
export const getSettings = async (req, res) => {
  try {
    const storeId = req.query.storeId || req.user.storeId || null;
    const tenantId = req.user.tenantId;

    // 1. Try to fetch store-specific settings
    let settings = null;
    if (storeId) {
      settings = await prisma.businessSettings.findUnique({
        where: { tenantId_storeId: { tenantId, storeId } }
      });
    }

    // 2. If no store settings, try to fetch global tenant settings
    if (!settings) {
      settings = await prisma.businessSettings.findUnique({
        where: { tenantId_storeId: { tenantId, storeId: null } }
      });
    }
    
    // 3. If still no settings exist, return the defaults (don't create yet to avoid junk data)
    if (!settings) {
      return res.json({ 
        success: true, 
        data: {
          businessName: 'VillagKart',
          taxRates: '0,5,12,18'
        } 
      });
    }
    
    res.json({ success: true, data: settings });
  } catch (error) {
    console.error('Get settings error:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch settings' });
  }
};

// Update business settings
export const updateSettings = async (req, res) => {
  try {
    const { 
      businessName, gstNo, contactNo, email, address, taxRates, shifts, 
      deliverySlabs, deliverySlots, deliveryRadiusEnforced, deliveryRadius, surcharges,
      storeId: bodyStoreId 
    } = req.body;
    const tenantId = req.user.tenantId;
    const storeId = bodyStoreId || req.user.storeId || null;

    const dataToUpdate = {};
    const fields = [
      'businessName', 'gstNo', 'contactNo', 'email', 'address', 'taxRates', 
      'shifts', 'shiftMode', 'deliverySlabs', 'deliverySlots', 
      'deliveryRadiusEnforced', 'deliveryRadius', 'surcharges'
    ];

    fields.forEach(field => {
      if (req.body[field] !== undefined) {
        dataToUpdate[field] = req.body[field];
      }
    });

    const settings = await prisma.businessSettings.upsert({
      where: { tenantId_storeId: { tenantId, storeId } },
      update: {
        ...dataToUpdate,
        updatedAt: new Date()
      },
      create: {
        ...dataToUpdate,
        tenantId,
        storeId: storeId || null
      }
    });

    // Log the activity
    await logActivity({
      userId: req.user.id,
      tenantId: req.user.tenantId,
      storeId: storeId,
      action: 'SETTINGS_UPDATED',
      details: `Business settings updated for ${storeId ? 'Store' : 'Organization'}`,
      metadata: { fieldsUpdated: Object.keys(dataToUpdate) }
    });

    res.json({ success: true, data: settings, message: 'Settings updated successfully' });
  } catch (error) {
    console.error('Update settings error:', error);
    res.status(500).json({ 
      success: false, 
      message: error.message || 'Failed to update settings',
      error: process.env.NODE_ENV === 'development' ? error : undefined 
    });
  }
};
