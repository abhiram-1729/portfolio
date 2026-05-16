import prisma from '../../utils/prisma.js';

/**
 * @desc Get all terminals for a store
 * @route GET /api/admin/terminals
 */
export const getTerminals = async (req, res) => {
  try {
    const { storeId } = req.query;
    
    if (!storeId) {
      return res.status(400).json({ success: false, message: 'Store ID is required' });
    }

    const terminals = await prisma.pOSTerminal.findMany({
      where: { 
        storeId,
        tenantId: req.user.tenantId 
      },
      orderBy: { name: 'asc' }
    });

    res.json({ success: true, data: terminals });
  } catch (error) {
    console.error('Get Terminals Error:', error);
    res.status(500).json({ success: false, message: error.message, stack: error.stack });
  }
};

/**
 * @desc Create a new terminal
 * @route POST /api/admin/terminals
 */
export const createTerminal = async (req, res) => {
  try {
    const { name, code, storeId } = req.body;

    if (!name || !code || !storeId) {
      return res.status(400).json({ success: false, message: 'All fields are required' });
    }

    const terminal = await prisma.pOSTerminal.create({
      data: {
        name,
        code,
        storeId,
        tenantId: req.user.tenantId
      }
    });

    res.status(201).json({ success: true, data: terminal });
  } catch (error) {
    console.error('Create Terminal Error:', error);
    if (error.code === 'P2002') {
      return res.status(400).json({ success: false, message: 'Terminal code already exists for this store' });
    }
    res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * @desc Update a terminal
 * @route PUT /api/admin/terminals/:id
 */
export const updateTerminal = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, status } = req.body;

    const terminal = await prisma.pOSTerminal.update({
      where: { id },
      data: { 
        name, 
        status,
        updatedAt: new Date()
      }
    });

    res.json({ success: true, data: terminal });
  } catch (error) {
    console.error('Update Terminal Error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * @desc Delete a terminal
 * @route DELETE /api/admin/terminals/:id
 */
export const deleteTerminal = async (req, res) => {
  try {
    const { id } = req.params;

    // Check if terminal has orders
    const ordersCount = await prisma.order.count({
      where: { terminalId: id }
    });

    if (ordersCount > 0) {
      return res.status(400).json({ 
        success: false, 
        message: 'Cannot delete terminal with existing orders. Deactivate it instead.' 
      });
    }

    await prisma.pOSTerminal.delete({
      where: { id }
    });

    res.json({ success: true, message: 'Terminal deleted successfully' });
  } catch (error) {
    console.error('Delete Terminal Error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};
