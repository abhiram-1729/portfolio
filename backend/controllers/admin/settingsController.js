import prisma from '../../utils/prisma.js';

// Get current business settings
export const getSettings = async (req, res) => {
  try {
    // findFirst will be automatically scoped by extension
    let settings = await prisma.businessSettings.findFirst();
    
    // If no settings exist yet, create default for this tenant
    if (!settings) {
      settings = await prisma.businessSettings.create({
        data: {
          businessName: 'VillagKart',
          taxRates: '0,5,12,18',
          // tenantId injected by extension
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
    const { businessName, gstNo, contactNo, email, address, taxRates } = req.body;
    const tenantId = req.user.tenantId;

    // Use tenantId for uniqueness
    const settings = await prisma.businessSettings.upsert({
      where: { tenantId }, 
      update: {
        businessName,
        gstNo,
        contactNo,
        email,
        address,
        taxRates
      },
      create: {
        businessName,
        gstNo,
        contactNo,
        email,
        address,
        taxRates,
        tenantId
      }
    });

    res.json({ success: true, data: settings, message: 'Settings updated successfully' });
  } catch (error) {
    console.error('Update settings error:', error);
    res.status(500).json({ success: false, message: 'Failed to update settings' });
  }
};
