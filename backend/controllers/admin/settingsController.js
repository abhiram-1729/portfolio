import prisma from '../../utils/prisma.js';

// Get current business settings
export const getSettings = async (req, res) => {
  try {
    let settings = await prisma.businessSettings.findFirst();
    
    // If no settings exist yet, create the default singleton
    if (!settings) {
      settings = await prisma.businessSettings.create({
        data: {
          id: 'singleton',
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
    const { businessName, gstNo, contactNo, email, address, taxRates } = req.body;
    
    // Find or create the singleton
    const settings = await prisma.businessSettings.upsert({
      where: { id: 'singleton' },
      update: {
        businessName,
        gstNo,
        contactNo,
        email,
        address,
        taxRates
      },
      create: {
        id: 'singleton',
        businessName,
        gstNo,
        contactNo,
        email,
        address,
        taxRates
      }
    });

    res.json({ success: true, data: settings, message: 'Settings updated successfully' });
  } catch (error) {
    console.error('Update settings error:', error);
    res.status(500).json({ success: false, message: 'Failed to update settings' });
  }
};
