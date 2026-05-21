import prisma from '../../utils/prisma.js';
import { format } from 'date-fns';

export const getDashboardStats = async (req, res) => {
  try {
    const { storeId } = req.query;
    const tenantId = req.user.tenantId;

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    // Build filters
    const baseFilter = { tenantId };
    const vehicleFilter = { tenantId, status: true };
    const userFilter = { tenantId, role: { not: 'CONSUMER' } };
    const orderFilter = { 
      tenantId, 
      createdAt: { gte: today },
      status: { not: 'CANCELLED' }
    };
    
    const yesterdayOrderFilter = {
      tenantId,
      createdAt: { gte: yesterday, lt: today },
      status: { not: 'CANCELLED' }
    };

    if (storeId && storeId !== 'undefined' && storeId !== 'null') {
      vehicleFilter.storeId = storeId;
      userFilter.storeId = storeId;
      orderFilter.storeId = storeId;
      yesterdayOrderFilter.storeId = storeId;
    } else if (req.user.storeId) {
      const isGlobal = 
        ['TENANT_OWNER', 'SUPER_ADMIN', 'ADMIN'].includes(req.user.role) || 
        req.user.customRole?.portalType === 'ADMIN';
        
      if (!isGlobal) {
        vehicleFilter.storeId = req.user.storeId;
        userFilter.storeId = req.user.storeId;
        orderFilter.storeId = req.user.storeId;
        yesterdayOrderFilter.storeId = req.user.storeId;
      }
    }

    // 1. Core Counts & Metrics
    const [
      activeVehicles, 
      activeUsers, 
      ordersToday, 
      todayOrders,
      yesterdayOrders,
      totalProducts,
      totalVillages,
      totalRoutes,
      totalVendors,
      stockValueData,
      assetStats,
      expenseStats,
      pendingRefills,
      activeAttendance,
      damageStats,
      pendingOrdersCount,
      vendorPayments,
      orderItemStats,
      yesterdayOrderItemStats,
      allExpensesToday,
      lowStockProducts,
      outOfStockProducts,
      pendingDeliveries,
      damagedItems,
      outstandingVendors,
      refillRequestsList
    ] = await Promise.all([
      prisma.vehicle.count({ where: vehicleFilter }),
      prisma.user.count({ where: userFilter }),
      prisma.order.count({ where: orderFilter }),
      prisma.order.findMany({
        where: orderFilter,
        select: { totalAmount: true, paymentMode: true, id: true, customerName: true, createdAt: true, displayId: true, vehicleId: true }
      }),
      prisma.order.findMany({
        where: yesterdayOrderFilter,
        select: { totalAmount: true, paymentMode: true }
      }),
      prisma.product.count({ where: { tenantId, status: 'ACTIVE' } }),
      prisma.village.count({ where: { tenantId } }),
      prisma.route.count({ where: { tenantId } }),
      prisma.vendor.count({ where: { tenantId } }),
      prisma.product.aggregate({
        _sum: { stock: true },
        where: { tenantId, status: 'ACTIVE' }
      }),
      prisma.asset.aggregate({
        _sum: { totalQuantity: true, estimatedCost: true },
        where: { tenantId }
      }),
      prisma.expense.aggregate({
        _sum: { amount: true },
        where: { 
          tenantId, 
          createdAt: { gte: today },
          status: 'APPROVED'
        }
      }),
      prisma.refillRequest.count({
        where: { tenantId, status: 'PENDING', ...(storeId && { storeId }) }
      }),
      prisma.attendance.count({
        where: { 
          tenantId, 
          date: format(today, 'yyyy-MM-dd'),
          punchOutTime: null,
          ...(storeId && { storeId })
        }
      }),
      prisma.damageEntry.aggregate({
        _sum: { quantity: true },
        where: { 
          tenantId, 
          createdAt: { gte: today },
          ...(storeId && { storeId })
        }
      }),
      prisma.order.count({
        where: { 
          tenantId, 
          status: 'PENDING',
          ...(storeId && { storeId })
        }
      }),
      prisma.vendor.aggregate({
        _sum: { currentBalance: true },
        where: { tenantId }
      }),
      prisma.orderItem.aggregate({
        _sum: { quantity: true, price: true, landingPrice: true },
        where: {
          order: {
            ...orderFilter
          }
        }
      }),
      prisma.orderItem.aggregate({
        _sum: { quantity: true, price: true, landingPrice: true },
        where: {
          order: {
            ...yesterdayOrderFilter
          }
        }
      }),
      prisma.expense.findMany({
        where: {
          tenantId,
          createdAt: { gte: today },
          status: 'APPROVED'
        },
        select: { type: true, amount: true }
      }),
      prisma.product.findMany({
        where: { tenantId, status: 'ACTIVE', stock: { lte: 5, gt: 0 } },
        select: { name: true, stock: true }
      }),
      prisma.product.findMany({
        where: { tenantId, status: 'ACTIVE', stock: { lte: 0 } },
        select: { name: true, stock: true }
      }),
      prisma.order.findMany({
        where: { tenantId, status: 'PENDING', ...(storeId && { storeId }) },
        include: { items: true },
        take: 10
      }),
      prisma.damageEntry.findMany({
        where: { tenantId, createdAt: { gte: today }, ...(storeId && { storeId }) },
        include: { product: true },
        take: 10
      }),
      prisma.vendor.findMany({
        where: { tenantId, currentBalance: { gt: 0 } },
        select: { id: true, vendorName: true, currentBalance: true, updatedAt: true },
        take: 10
      }),
      prisma.refillRequest.findMany({
        where: { tenantId, status: 'PENDING', ...(storeId && { storeId }) },
        include: { vehicle: true, items: { include: { product: true } } },
        take: 10
      })
    ]);

    // For Fast/Slow moving products (last 30 days)
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const recentItems = await prisma.orderItem.findMany({
      where: {
        tenantId,
        order: {
          createdAt: { gte: thirtyDaysAgo },
          status: { not: 'CANCELLED' }
        }
      },
      select: {
        productId: true,
        quantity: true,
        price: true,
        product: {
          select: { name: true, image: true, skuCode: true, category: { select: { name: true } } }
        }
      }
    });

    const volumeMap = {};
    recentItems.forEach(item => {
      if (!volumeMap[item.productId]) {
        volumeMap[item.productId] = { 
          productId: item.productId, 
          quantity: 0, 
          revenue: 0,
          name: item.product?.name, 
          sku: item.product?.skuCode,
          category: item.product?.category?.name,
          image: item.product?.image 
        };
      }
      volumeMap[item.productId].quantity += (item.quantity || 0);
      volumeMap[item.productId].revenue += (item.price || 0) * (item.quantity || 0);
    });

    const salesVolumeData = Object.values(volumeMap);

    // Calculate Stock Value (Estimated)
    const productsWithValue = await prisma.product.findMany({
      where: { tenantId, status: 'ACTIVE', stock: { gt: 0 } },
      select: { stock: true, landingPrice: true, price: true }
    });
    const totalStockValue = productsWithValue.reduce((acc, p) => acc + (p.stock * (p.landingPrice || p.price || 0)), 0);

    let totalSales = 0;
    const paymentSplits = { CASH: 0, UPI: 0, CARD: 0 };
    const orderSources = { COUNTER: 0, FIELD: 0 };
    
    // Hourly sales for today's chart
    const hourlySales = Array.from({ length: 24 }, (_, i) => ({ time: `${i}:00`, sales: 0 }));

    todayOrders.forEach(order => {
      totalSales += order.totalAmount;
      if (order.paymentMode) {
        paymentSplits[order.paymentMode] = (paymentSplits[order.paymentMode] || 0) + order.totalAmount;
      }
      if (order.vehicleId) {
        orderSources.FIELD += 1;
      } else {
        orderSources.COUNTER += 1;
      }
      
      const hour = new Date(order.createdAt).getHours();
      hourlySales[hour].sales += order.totalAmount;
    });
    
    let yesterdayTotalSales = 0;
    yesterdayOrders.forEach(order => yesterdayTotalSales += order.totalAmount);

    // Gross Margin Calculation Today
    const totalRevenue = orderItemStats._sum.price || 0;
    const totalCost = orderItemStats._sum.landingPrice || 0;
    const grossMargin = totalRevenue > 0 ? ((totalRevenue - totalCost) / totalRevenue) * 100 : 0;
    const grossProfit = totalRevenue - totalCost;
    
    // Gross Margin Calculation Yesterday
    const yTotalRevenue = yesterdayOrderItemStats._sum.price || 0;
    const yTotalCost = yesterdayOrderItemStats._sum.landingPrice || 0;
    const yesterdayGrossMargin = yTotalRevenue > 0 ? ((yTotalRevenue - yTotalCost) / yTotalRevenue) * 100 : 0;

    // Resolve Fast/Slow moving products
    const sortedProducts = salesVolumeData.sort((a, b) => b.quantity - a.quantity);
    const fastMoving = sortedProducts.slice(0, 5).map(p => ({
      name: p.name,
      image: p.image,
      sku: p.sku,
      category: p.category,
      revenue: p.revenue,
      quantity: p.quantity
    }));

    const slowMoving = sortedProducts.slice(-5).reverse().map(p => ({
      name: p.name,
      image: p.image,
      sku: p.sku,
      category: p.category,
      revenue: p.revenue,
      quantity: p.quantity
    }));
    
    // Calculate Expense Breakdown
    const expenseBreakdown = { fuel: 0, maintenance: 0, staff: 0, misc: 0 };
    allExpensesToday.forEach(exp => {
      const type = (exp.type || '').toUpperCase();
      if (type.includes('FUEL')) expenseBreakdown.fuel += exp.amount;
      else if (type.includes('MAINT') || type.includes('REPAIR')) expenseBreakdown.maintenance += exp.amount;
      else if (type.includes('SALARY') || type.includes('ADVANCE') || type.includes('STAFF')) expenseBreakdown.staff += exp.amount;
      else expenseBreakdown.misc += exp.amount;
    });

    res.json({
      activeVehicles,
      activeUsers,
      ordersToday,
      totalSales,
      paymentSplits,
      orderSources,
      grossMargin: Math.round(grossMargin * 100) / 100,
      grossProfit,
      inventoryAlerts: lowStockProducts.length + outOfStockProducts.length,
      pendingRefills,
      activeAttendance,
      todayDamages: damageStats._sum.quantity || 0,
      pendingOrders: pendingOrdersCount,
      outstandingPayments: vendorPayments._sum.currentBalance || 0,
      recentOrders: todayOrders.slice(0, 5).sort((a, b) => b.createdAt - a.createdAt),
      metrics: {
        totalProducts,
        totalVillages,
        totalRoutes,
        totalVendors,
        totalStockValue,
        totalStockQty: stockValueData._sum.stock || 0,
        assetQty: assetStats._sum.totalQuantity || 0,
        assetValue: assetStats._sum.estimatedCost || 0,
        todayExpenses: expenseStats._sum.amount || 0
      },
      fastMoving,
      slowMoving,
      // New fields for the 5-tab redesign
      comparison: {
        yesterdaySales: yesterdayTotalSales,
        salesGrowth: yesterdayTotalSales > 0 ? ((totalSales - yesterdayTotalSales) / yesterdayTotalSales) * 100 : 0,
        yesterdayMargin: yesterdayGrossMargin,
        marginGrowth: yesterdayGrossMargin > 0 ? ((grossMargin - yesterdayGrossMargin) / yesterdayGrossMargin) * 100 : 0,
        yesterdayOrders: yesterdayOrders.length,
        ordersGrowth: yesterdayOrders.length > 0 ? ((ordersToday - yesterdayOrders.length) / yesterdayOrders.length) * 100 : 0
      },
      hourlySales,
      expenseBreakdown,
      attendance: {
        present: activeAttendance,
        absent: Math.max(0, activeUsers - activeAttendance),
        onLeave: 0,
        halfDay: 0,
        total: activeUsers
      },
      inventoryDetails: {
        lowStockCount: lowStockProducts.length,
        outOfStockCount: outOfStockProducts.length,
        expiringSoonCount: 0, // Mocked for UI
        lowStockItems: lowStockProducts,
        outOfStockItems: outOfStockProducts,
        damagedItems: damagedItems.map(d => ({
          name: d.product?.name,
          quantity: d.quantity,
          value: d.quantity * (d.product?.landingPrice || d.product?.price || 0)
        })),
        refillRequests: refillRequestsList.map(r => ({
          productName: r.items?.map(i => i.product?.name).filter(Boolean).join(', ') || 'Unknown',
          vehicleName: r.vehicle?.vehicleNumber || 'Unknown',
          quantity: r.items?.reduce((acc, i) => acc + (i.quantity || 0), 0) || 0,
          date: r.createdAt
        }))
      },
      operations: {
        pendingDeliveries: pendingDeliveries.map(d => ({
          orderId: d.displayId,
          storeId: d.storeId,
          items: d.items.reduce((acc, item) => acc + item.quantity, 0),
          status: d.status,
          date: d.createdAt
        }))
      },
      finance: {
        outstandingVendors: outstandingVendors.map(v => ({
          name: v.vendorName,
          outstanding: v.currentBalance,
          days: Math.floor((new Date() - new Date(v.updatedAt)) / (1000 * 60 * 60 * 24))
        }))
      }
    });
  } catch (error) {
    console.error('Dashboard Stats Error:', error);
    res.status(500).json({ message: 'Error fetching stats' });
  }
};
