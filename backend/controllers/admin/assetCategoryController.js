import prisma from '../../utils/prisma.js';

export const getAssetCategories = async (req, res) => {
  try {
    const categories = await prisma.assetCategory.findMany({
      where: { status: true },
      orderBy: { name: 'asc' }
    });
    res.json(categories);
  } catch (error) {
    console.error('❌ Get Asset Categories Error:', error);
    res.status(500).json({ message: 'Error fetching asset categories', error: error.message });
  }
};

export const createAssetCategory = async (req, res) => {
  try {
    const { name } = req.body;
    if (!name) return res.status(400).json({ message: 'Category name is required' });

    const category = await prisma.assetCategory.create({
      data: { name }
    });
    res.status(201).json(category);
  } catch (error) {
    console.error('❌ Create Asset Category Error:', error);
    res.status(500).json({ message: 'Error creating asset category', error: error.message });
  }
};

export const updateAssetCategory = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, status } = req.body;

    const category = await prisma.assetCategory.update({
      where: { id },
      data: { 
        name: name || undefined,
        status: status !== undefined ? status : undefined
      }
    });
    res.json(category);
  } catch (error) {
    console.error('❌ Update Asset Category Error:', error);
    res.status(500).json({ message: 'Error updating asset category', error: error.message });
  }
};

export const deleteAssetCategory = async (req, res) => {
  try {
    const { id } = req.params;
    
    // Check if assets are linked to this category
    const assetCount = await prisma.asset.count({ where: { categoryId: id } });
    if (assetCount > 0) {
      return res.status(400).json({ message: 'Cannot delete category with linked assets. Deactivate it instead.' });
    }

    await prisma.assetCategory.delete({ where: { id } });
    res.json({ message: 'Asset category deleted successfully' });
  } catch (error) {
    console.error('❌ Delete Asset Category Error:', error);
    res.status(500).json({ message: 'Error deleting asset category', error: error.message });
  }
};
