import prisma from '../../utils/prisma.js';

export const getSalesHistory = async (req, res) => {
  try {
    const { fromDate, toDate, vehicleId, userId, storeId } = req.query;
    
    // Build query
    let whereClause = {
      tenantId: req.user.tenantId
    };

    if (fromDate || toDate) {
      whereClause.createdAt = {};
      if (fromDate) whereClause.createdAt.gte = new Date(fromDate);
      if (toDate) whereClause.createdAt.lte = new Date(toDate);
    }

    if (vehicleId) whereClause.vehicleId = vehicleId;
    if (userId) whereClause.userId = userId;
    
    // Filter by store using the direct storeId column
    if (storeId && storeId !== 'undefined' && storeId !== 'null') {
      whereClause.storeId = storeId;
    } else if (req.user.storeId && req.user.role !== 'TENANT_OWNER') {
      whereClause.storeId = req.user.storeId;
    }

    const sales = await prisma.order.findMany({
      where: whereClause,
      include: {
        user: { select: { id: true, name: true, mobile: true, role: true } },
        vehicle: { select: { id: true, vehicleNumber: true, vehicleName: true, assignedUsers: { select: { id: true, name: true, mobile: true } } } },
        route: { select: { id: true, routeName: true } },
        items: {
          include: {
            product: { select: { id: true, name: true } }
          }
        }
      },
      orderBy: { createdAt: 'desc' }
    });

    res.json(sales);
  } catch (error) {
    console.error('🔥 Sales Fetch Error:', error);
    res.status(500).json({ 
      message: 'Error fetching sales data', 
      error: error.message,
      detail: error.code === 'P2025' ? 'Record not found' : error.code
    });
  }
};
