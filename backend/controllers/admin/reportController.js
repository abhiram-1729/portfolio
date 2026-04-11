import prisma from '../../utils/prisma.js';

export const getDailyReport = async (req, res) => {
  try {
    const { storeId } = req.query;
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const where = {
      tenantId: req.user.tenantId,
      createdAt: { gte: today },
      status: { not: 'CANCELLED' }
    };

    if (storeId && storeId !== 'undefined' && storeId !== 'null') {
      where.storeId = storeId;
    } else if (req.user.storeId && req.user.role !== 'TENANT_OWNER') {
      where.storeId = req.user.storeId;
    }

    const orders = await prisma.order.findMany({
      where,
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
    console.error('[ReportController] Daily Report Error:', error);
    res.status(500).json({ message: 'Error fetching daily report', error: error.message });
  }
};

// 7-day trends for charts
export const getTrendsReport = async (req, res) => {
  try {
    const days = parseInt(req.query.days) || 7;

    const { storeId } = req.query;
    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - (days - 1));
    startDate.setHours(0, 0, 0, 0);

    const where = {
      tenantId: req.user.tenantId,
      createdAt: { gte: startDate, lte: endDate },
      status: { not: 'CANCELLED' },
    };

    if (storeId && storeId !== 'undefined' && storeId !== 'null') {
      where.storeId = storeId;
    } else if (req.user.storeId) {
      where.storeId = req.user.storeId;
    }

    // Fetch all orders in the range with ONE query
    const orders = await prisma.order.findMany({
      where,
      include: { items: true },
    });

    // Initialize map to guarantee zero-values for days without orders
    const dailyStatsMap = new Map();
    for (let i = days - 1; i >= 0; i--) {
        const d = new Date();
        d.setDate(d.getDate() - i);
        const dateString = d.toLocaleDateString('en-IN', { month: 'short', day: 'numeric' });
        dailyStatsMap.set(dateString, { date: dateString, revenue: 0, profit: 0, orders: 0 });
    }

    // Aggregate the payload
    orders.forEach(order => {
        const orderDateStr = order.createdAt.toLocaleDateString('en-IN', { month: 'short', day: 'numeric' });
        
        if (dailyStatsMap.has(orderDateStr)) {
            const stats = dailyStatsMap.get(orderDateStr);
            stats.orders += 1;
            stats.revenue += order.totalAmount;
            
            const profit = order.items.reduce((itemSum, item) => {
                return itemSum + ((item.price - (item.landingPrice || 0)) * item.quantity);
            }, 0);
            stats.profit += profit;
        }
    });

    const finalResults = Array.from(dailyStatsMap.values()).map(stat => ({
        ...stat,
        revenue: Math.round(stat.revenue),
        profit: Math.round(stat.profit)
    }));

    res.json(finalResults);
  } catch (error) {
    console.error('[ReportController] Trends Report Error:', error);
    res.status(500).json({ message: 'Error fetching trends', error: error.message });
  }
};

// Top selling products
export const getTopProducts = async (req, res) => {
  try {
    const { storeId } = req.query;
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const orderFilter = {
      tenantId: req.user.tenantId,
      createdAt: { gte: today },
      status: { not: 'CANCELLED' },
    };

    if (storeId && storeId !== 'undefined' && storeId !== 'null') {
      orderFilter.storeId = storeId;
    } else if (req.user.storeId) {
      orderFilter.storeId = req.user.storeId;
    }

    const orderItems = await prisma.orderItem.findMany({
      where: {
        tenantId: req.user.tenantId,
        order: orderFilter,
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
    console.error('[ReportController] Top Products Error:', error);
    res.status(500).json({ message: 'Error fetching top products', error: error.message });
  }
};

export const getVehicleWiseReport = async (req, res) => {
  try {
    const { id } = req.params; // vehicleId

    const orders = await prisma.order.findMany({
      where: { 
        vehicleId: id, 
        tenantId: req.user.tenantId,
        status: { not: 'CANCELLED' } 
      },
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
    console.error('[ReportController] Vehicle Report Error:', error);
    res.status(500).json({ message: 'Error fetching vehicle report', error: error.message });
  }
};

export const getItemWiseReport = async (req, res) => {
  try {
    const { storeId: queryStoreId } = req.query;
    const storeId = (queryStoreId && queryStoreId !== 'undefined' && queryStoreId !== 'null') ? queryStoreId : req.user.storeId;

    const orderItemWhere = { tenantId: req.user.tenantId };
    if (storeId) {
      orderItemWhere.order = { storeId };
    }

    const orderItems = await prisma.orderItem.groupBy({
      by: ['productId'],
      where: orderItemWhere,
      _sum: {
        quantity: true,
        price: true 
      }
    });

    const productIds = orderItems.map(item => item.productId);
    const productWhere = { id: { in: productIds }, tenantId: req.user.tenantId };
    if (storeId) productWhere.storeId = storeId;

    const products = await prisma.product.findMany({
      where: productWhere,
      select: { id: true, name: true }
    });

    const productLookup = products.reduce((acc, p) => {
      acc[p.id] = p.name;
      return acc;
    }, {});

    const results = orderItems.map((item) => {
      const totalAmount = (item._sum.quantity || 0) * (item._sum.price || 0);
      return {
        itemName: productLookup[item.productId] || 'Unknown',
        totalQty: item._sum.quantity,
        revenue: totalAmount 
      };
    });

    res.json({ title: 'Item Wise Report', data: results });
  } catch (error) {
    console.error('[ReportController] Item Report Error:', error);
    res.status(500).json({ message: 'Error fetching item report', error: error.message });
  }
};

export const getDateRangeReport = async (req, res) => {
  try {
    const { from, to, storeId } = req.query;

    const where = {
      tenantId: req.user.tenantId,
      createdAt: { gte: new Date(from), lte: new Date(to) },
      status: { not: 'CANCELLED' }
    };

    if (storeId && storeId !== 'undefined' && storeId !== 'null') {
      where.storeId = storeId;
    } else if (req.user.storeId) {
      where.storeId = req.user.storeId;
    }

    const orders = await prisma.order.findMany({
      where
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
    const { vehicleId, date, storeId: queryStoreId } = req.query; // pass 'today' or specific date
    const storeId = (queryStoreId && queryStoreId !== 'undefined' && queryStoreId !== 'null') ? queryStoreId : req.user.storeId;

    let dateQuery = new Date();
    dateQuery.setHours(0, 0, 0, 0);

    const productWhere = { tenantId: req.user.tenantId };
    if (storeId) productWhere.storeId = storeId;

    const [items, loads, returns, sales] = await Promise.all([
      prisma.product.findMany({ where: productWhere, select: { id: true, name: true } }),
      prisma.stockTransaction.findMany({
        where: { vehicleId, type: 'LOAD', date: { gte: dateQuery }, tenantId: req.user.tenantId }
      }),
      prisma.stockTransaction.findMany({
        where: { vehicleId, type: 'RETURN', date: { gte: dateQuery }, tenantId: req.user.tenantId }
      }),
      prisma.orderItem.findMany({
        where: {
          tenantId: req.user.tenantId,
          order: {
            vehicleId,
            createdAt: { gte: dateQuery },
            status: { not: 'CANCELLED' }
          }
        }
      })
    ]);

    // Pre-aggregate data into maps for O(1) lookup
    const loadMap = {};
    loads.forEach(l => loadMap[l.productId] = (loadMap[l.productId] || 0) + l.quantity);

    const returnMap = {};
    returns.forEach(r => returnMap[r.productId] = (returnMap[r.productId] || 0) + r.quantity);

    const saleMap = {};
    sales.forEach(s => saleMap[s.productId] = (saleMap[s.productId] || 0) + s.quantity);

    const report = items.map(product => {
      const pid = product.id;
      const loadedQty = loadMap[pid] || 0;
      const returnedQty = returnMap[pid] || 0;
      const soldQty = saleMap[pid] || 0;
      
      const expectedRemaining = loadedQty - soldQty;
      const difference = expectedRemaining - returnedQty;

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

export const getRouteWiseReport = async (req, res) => {
  try {
    const { startDate, endDate, storeId } = req.query;
    const where = {
      tenantId: req.user.tenantId,
      status: 'COMPLETED',
      routeId: { not: null }
    };

    if (startDate && endDate) {
      where.createdAt = { gte: new Date(startDate), lte: new Date(endDate) };
    }

    if (storeId && storeId !== 'undefined' && storeId !== 'null') {
      where.storeId = storeId;
    } else if (req.user.storeId) {
      where.storeId = req.user.storeId;
    }

    const routeData = await prisma.order.groupBy({
      by: ['routeId', 'storeId'],
      where,
      _sum: {
        totalAmount: true
      },
      _count: {
        id: true
      }
    });

    const routeIds = routeData.map(r => r.routeId);
    const routes = await prisma.route.findMany({
      where: { id: { in: routeIds } },
      select: { id: true, routeName: true }
    });

    const routeMap = routes.reduce((acc, r) => {
      acc[r.id] = r.routeName;
      return acc;
    }, {});

    const result = routeData.map(r => ({
      routeName: routeMap[r.routeId] || 'Unmapped Route',
      totalSales: Math.round(r._sum.totalAmount || 0),
      orderCount: r._count.id,
      storeId: r.storeId
    }));

    res.json(result);
  } catch (error) {
    console.error('[ReportController] Route Report Error:', error);
    res.status(500).json({ message: 'Error fetching route report', error: error.message });
  }
};

export const getVillageWiseReport = async (req, res) => {
  try {
    const { startDate, endDate, storeId } = req.query;
    const where = {
      tenantId: req.user.tenantId,
      status: 'COMPLETED',
      villageName: { not: null }
    };

    if (startDate && endDate) {
      where.createdAt = { gte: new Date(startDate), lte: new Date(endDate) };
    }

    if (storeId && storeId !== 'undefined' && storeId !== 'null') {
      where.storeId = storeId;
    } else if (req.user.storeId) {
      where.storeId = req.user.storeId;
    }

    const villageData = await prisma.order.groupBy({
      by: ['villageName', 'coverageType', 'storeId'],
      where,
      _sum: {
        totalAmount: true
      },
      _count: {
        id: true
      }
    });

    const formattedData = villageData.map(v => ({
      villageName: v.villageName,
      coverageType: v.coverageType,
      totalSales: Math.round(v._sum.totalAmount || 0),
      orderCount: v._count.id,
      storeId: v.storeId
    }));

    res.json(formattedData);
  } catch (error) {
    console.error('[ReportController] Village Report Error:', error);
    res.status(500).json({ message: 'Error fetching village report', error: error.message });
  }
};

export const getAgentPerformance = async (req, res) => {
  try {
    const { storeId } = req.query;
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const agentFilter = { 
      tenantId: req.user.tenantId,
      role: 'SALES_AGENT' 
    };

    if (storeId && storeId !== 'undefined' && storeId !== 'null') {
      agentFilter.storeId = storeId;
    } else if (req.user.storeId) {
      agentFilter.storeId = req.user.storeId;
    }

    const agents = await prisma.user.findMany({
      where: agentFilter,
      select: { id: true, name: true, dailyTarget: true, status: true, storeId: true }
    });

    const performance = await Promise.all(agents.map(async (agent) => {
      const orders = await prisma.order.findMany({
        where: {
          agentId: agent.id,
          createdAt: { gte: today },
          status: { not: 'CANCELLED' }
        },
        select: { totalAmount: true }
      });

      const totalSales = orders.reduce((sum, o) => sum + o.totalAmount, 0);
      
      return {
        id: agent.id,
        name: agent.name || 'Unknown Agent',
        dailyTarget: agent.dailyTarget,
        totalSales: totalSales,
        percentage: agent.dailyTarget > 0 ? Math.round((totalSales / agent.dailyTarget) * 100) : 0,
        status: agent.status,
        storeId: agent.storeId
      };
    }));

    res.json(performance);
  } catch (error) {
    console.error('[ReportController] Agent Performance Error:', error);
    res.status(500).json({ message: 'Error fetching agent performance', error: error.message });
  }
};
