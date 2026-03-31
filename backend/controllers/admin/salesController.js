import prisma from '../../utils/prisma.js';

export const getSalesHistory = async (req, res) => {
  try {
    const { fromDate, toDate, vehicleId, userId } = req.query;
    
    // Build query
    let whereClause = {};

    if (fromDate || toDate) {
      whereClause.createdAt = {};
      if (fromDate) whereClause.createdAt.gte = new Date(fromDate);
      if (toDate) whereClause.createdAt.lte = new Date(toDate);
    }

    if (vehicleId) whereClause.vehicleId = vehicleId;
    if (userId) whereClause.userId = userId;

    const sales = await prisma.order.findMany({
      where: whereClause,
      include: {
        user: { select: { id: true, name: true, mobile: true, role: true } },
        vehicle: { select: { id: true, vehicleNumber: true } },
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
