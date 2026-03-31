import prisma from '../../utils/prisma.js';

export const getDailyReport = async (req, res) => {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const orders = await prisma.order.findMany({
      where: {
        createdAt: { gte: today },
        status: { not: 'CANCELLED' }
      },
      include: { items: true },
    });

    const totalOrders = orders.length;
    const totalSales = orders.reduce((sum, o) => sum + o.totalAmount, 0);
    const paymentSplits = { CASH: 0, UPI: 0, CARD: 0 };
    orders.forEach(o => {
      if (o.paymentMode) paymentSplits[o.paymentMode] = (paymentSplits[o.paymentMode] || 0) + o.totalAmount;
    });

    const totalProfit = orders.reduce((sum, order) => {
      return sum + order.items.reduce((itemSum, item) => {
        return itemSum + ((item.price - (item.landingPrice || 0)) * item.quantity);
      }, 0);
    }, 0);

    res.json({ title: 'Daily Report', date: today, totalOrders, totalSales, totalProfit, paymentSplits });
  } catch (error) {
    res.status(500).json({ message: 'Error fetching daily report', error: error.message });
  }
};

// 7-day trends for charts
export const getTrendsReport = async (req, res) => {
  try {
    const days = parseInt(req.query.days) || 7;
    const results = [];

    for (let i = days - 1; i >= 0; i--) {
      const dayStart = new Date();
      dayStart.setDate(dayStart.getDate() - i);
      dayStart.setHours(0, 0, 0, 0);
      const dayEnd = new Date(dayStart);
      dayEnd.setDate(dayEnd.getDate() + 1);

      const orders = await prisma.order.findMany({
        where: {
          createdAt: { gte: dayStart, lt: dayEnd },
          status: { not: 'CANCELLED' },
        },
        include: { items: true },
      });

      const revenue = orders.reduce((sum, o) => sum + o.totalAmount, 0);
      const profit = orders.reduce((sum, order) => {
        return sum + order.items.reduce((itemSum, item) => {
          return itemSum + ((item.price - (item.landingPrice || 0)) * item.quantity);
        }, 0);
      }, 0);

      results.push({
        date: dayStart.toLocaleDateString('en-IN', { month: 'short', day: 'numeric' }),
        revenue: Math.round(revenue),
        profit: Math.round(profit),
        orders: orders.length,
      });
    }

    res.json(results);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching trends', error: error.message });
  }
};

// Top selling products
export const getTopProducts = async (req, res) => {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const orderItems = await prisma.orderItem.findMany({
      where: {
        order: {
          createdAt: { gte: today },
          status: { not: 'CANCELLED' },
        },
      },
      include: { product: { select: { name: true, image: true } } },
    });

    const productMap = {};
    orderItems.forEach(item => {
      const key = item.productId;
      if (!productMap[key]) {
        productMap[key] = {
          name: item.product?.name || 'Unknown',
          image: item.product?.image || null,
          totalQty: 0,
          totalRevenue: 0,
          totalProfit: 0,
        };
      }
      productMap[key].totalQty += item.quantity;
      productMap[key].totalRevenue += item.price * item.quantity;
      productMap[key].totalProfit += (item.price - (item.landingPrice || 0)) * item.quantity;
    });

    const topProducts = Object.values(productMap)
      .sort((a, b) => b.totalRevenue - a.totalRevenue)
      .slice(0, 5);

    res.json(topProducts);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching top products', error: error.message });
  }
};

export const getVehicleWiseReport = async (req, res) => {
  try {
    const { id } = req.params; // vehicleId

    const orders = await prisma.order.findMany({
      where: { vehicleId: id, status: { not: 'CANCELLED' } },
      include: { items: true }
    });

    const totalOrders = orders.length;
    let totalSales = 0;
    const itemsMap = {};

    orders.forEach(order => {
      totalSales += order.totalAmount;
      order.items.forEach(item => {
        itemsMap[item.productId] = (itemsMap[item.productId] || 0) + item.quantity;
      });
    });

    res.json({ title: 'Vehicle Wise Report', totalOrders, totalSales, topSellingItems: itemsMap });
  } catch (error) {
    res.status(500).json({ message: 'Error fetching vehicle report', error: error.message });
  }
};

export const getItemWiseReport = async (req, res) => {
  try {
    const orderItems = await prisma.orderItem.groupBy({
      by: ['productId'],
      _sum: {
        quantity: true,
        price: true 
      }
    });

    const results = await Promise.all(orderItems.map(async (item) => {
      const product = await prisma.product.findUnique({ where: { id: item.productId }, select: { name: true } });
      const totalAmount = item._sum.quantity * item._sum.price; // or calculate from detailed order logic
      return {
        itemName: product?.name || 'Unknown',
        totalQty: item._sum.quantity,
        revenue: totalAmount 
      };
    }));

    res.json({ title: 'Item Wise Report', data: results });
  } catch (error) {
    res.status(500).json({ message: 'Error fetching item report', error: error.message });
  }
};

export const getDateRangeReport = async (req, res) => {
  try {
    const { from, to } = req.query;

    const orders = await prisma.order.findMany({
      where: {
        createdAt: { gte: new Date(from), lte: new Date(to) },
        status: { not: 'CANCELLED' }
      }
    });

    const totalOrders = orders.length;
    const totalSales = orders.reduce((sum, o) => sum + o.totalAmount, 0);

    res.json({ title: 'Date Range Report', from, to, totalOrders, totalSales });
  } catch (error) {
    res.status(500).json({ message: 'Error fetching date range report', error: error.message });
  }
};

export const getReconciliationReport = async (req, res) => {
  try {
    const { vehicleId, date } = req.query; // pass 'today' or specific date

    let dateQuery = new Date();
    dateQuery.setHours(0, 0, 0, 0);
    // If specific date passed, parse it.

    const items = await prisma.product.findMany({ select: { id: true, name: true } });
    
    // Loaded
    const loads = await prisma.stockTransaction.findMany({
      where: { vehicleId, type: 'LOAD', date: { gte: dateQuery } }
    });

    // Returned
    const returns = await prisma.stockTransaction.findMany({
      where: { vehicleId, type: 'RETURN', date: { gte: dateQuery } }
    });

    // Sold
    const sales = await prisma.orderItem.findMany({
      where: {
        order: {
          vehicleId,
          createdAt: { gte: dateQuery },
          status: { not: 'CANCELLED' }
        }
      }
    });

    const report = items.map(product => {
      const pid = product.id;
      const loadedQty = loads.filter(l => l.productId === pid).reduce((sum, l) => sum + l.quantity, 0);
      const returnedQty = returns.filter(r => r.productId === pid).reduce((sum, r) => sum + r.quantity, 0);
      const soldQty = sales.filter(s => s.productId === pid).reduce((sum, s) => sum + s.quantity, 0);
      
      const expectedRemaining = loadedQty - soldQty;
      const difference = expectedRemaining - returnedQty; // +ve means missed returning or lost; -ve means returned more (error)

      return {
        product: product.name,
        loadedQty,
        soldQty,
        returnedQty,
        difference
      };
    });

    res.json({ vehicleId, date: dateQuery, report });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Error fetching reconciliation report', error: error.message });
  }
};
