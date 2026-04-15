import prisma from '../../utils/prisma.js';

// Get all subcategories
export const getSubCategories = async (req, res) => {
  try {
    const { categoryId, storeId } = req.query;
    
    const where = {};
    if (categoryId) where.categoryId = categoryId;
    
    // SubCategory itself doesn't have storeId in schema currently, 
    // it's linked via Category which has storeId.
    // However, for filtering if needed:
    if (storeId) {
      where.category = { storeId };
    }

    const subCategories = await prisma.subCategory.findMany({
      where,
      include: {
        category: true
      },
      orderBy: { name: 'asc' }
    });
    res.json(subCategories);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching sub-categories', error: error.message });
  }
};

// Create a new subcategory
export const createSubCategory = async (req, res) => {
  try {
    const { name, categoryId } = req.body;
    const tenantId = req.user.tenantId;

    if (!name || !categoryId) {
      return res.status(400).json({ message: 'Name and Category ID are required' });
    }

    const subCategory = await prisma.subCategory.create({
      data: {
        name,
        categoryId,
        tenantId
      },
      include: {
        category: true
      }
    });

    res.status(201).json(subCategory);
  } catch (error) {
    res.status(500).json({ message: 'Error creating sub-category', error: error.message });
  }
};

// Update a subcategory
export const updateSubCategory = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, categoryId } = req.body;

    const subCategory = await prisma.subCategory.update({
      where: { id },
      data: { 
        name,
        ...(categoryId && { categoryId })
      },
      include: {
        category: true
      }
    });

    res.json(subCategory);
  } catch (error) {
    res.status(500).json({ message: 'Error updating sub-category', error: error.message });
  }
};

// Delete a subcategory
export const deleteSubCategory = async (req, res) => {
  try {
    const { id } = req.params;
    const tenantId = req.user.tenantId;

    // 1. Find or create the "Uncategorized" SubCategory fallback for this subcategory's CATEGORY
    const subCatToDelete = await prisma.subCategory.findUnique({ where: { id } });
    if (!subCatToDelete) return res.status(404).json({ message: 'Sub-category not found' });

    if (subCatToDelete.name === 'Uncategorized') {
      return res.status(400).json({ message: 'Cannot delete the Uncategorized fallback sub-category' });
    }

    let uncategorizedSub = await prisma.subCategory.findFirst({
      where: { name: 'Uncategorized', categoryId: subCatToDelete.categoryId }
    });

    if (!uncategorizedSub) {
      uncategorizedSub = await prisma.subCategory.create({
        data: { 
          name: 'Uncategorized', 
          categoryId: subCatToDelete.categoryId,
          tenantId
        }
      });
    }

    // 2. Migrate products
    await prisma.product.updateMany({
      where: { subCategoryId: id },
      data: { subCategoryId: uncategorizedSub.id }
    });

    // 3. Delete
    await prisma.subCategory.delete({ where: { id } });
    
    res.json({ message: 'Sub-category removed. Items moved to Uncategorized sub-category.' });
  } catch (error) {
    res.status(500).json({ message: 'Error deleting sub-category', error: error.message });
  }
};
