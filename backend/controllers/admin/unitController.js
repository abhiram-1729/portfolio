import prisma from '../../utils/prisma.js';

// Get all units
export const getUnits = async (req, res) => {
  try {
    const { storeId: queryStoreId } = req.query;
    const storeId = (queryStoreId && queryStoreId !== 'undefined' && queryStoreId !== 'null') ? queryStoreId : (req.user.storeId || null);
    const units = await prisma.unit.findMany({
      where: { storeId },
      orderBy: { createdAt: 'desc' }
    });
    res.json(units);
  } catch (error) {
    res.status(500).json({ message: 'Error retrieving units', error: error.message });
  }
};

// Create a new unit
export const createUnit = async (req, res) => {
  try {
    const { name, type, storeId: bodyStoreId } = req.body;
    const storeId = bodyStoreId || req.user.storeId || null;
    
    if (!name || !type) {
      return res.status(400).json({ message: 'Unit Name and Unit Type are required' });
    }

    const unit = await prisma.unit.create({
      data: { 
        name, 
        type,
        storeId
      }
    });

    res.status(201).json(unit);
  } catch (error) {
    if (error.code === 'P2002') {
      return res.status(400).json({ message: 'Unit name already exists in this context' });
    }
    res.status(500).json({ message: 'Error creating unit', error: error.message });
  }
};

// Delete a unit
export const deleteUnit = async (req, res) => {
  try {
    const { id } = req.params;
    
    // Check if any products are using this unit
    const productCount = await prisma.product.count({ where: { unitId: id } });
    if (productCount > 0) {
      return res.status(400).json({ 
        message: `Cannot delete unit. It is currently being used by ${productCount} products.` 
      });
    }

    await prisma.unit.delete({ where: { id } });
    res.json({ message: 'Unit deleted successfully' });
  } catch (error) {
    console.error('Delete Unit Error:', error);
    res.status(500).json({ message: 'Error deleting unit', error: error.message });
  }
};

// Update a unit
export const updateUnit = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, type } = req.body;

    const unit = await prisma.unit.update({
      where: { id },
      data: { name, type }
    });

    res.json(unit);
  } catch (error) {
    res.status(500).json({ message: 'Error updating unit', error: error.message });
  }
};
