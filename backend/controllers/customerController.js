import prisma from '../utils/prisma.js';

// @desc    Register a new customer
// @route   POST /api/customers
// @access  Private
export const registerCustomer = async (req, res, next) => {
  try {
    const { name, mobile, address, villageId, segment, isOnline } = req.body;
    const tenantId = req.user.tenantId || 'VK001';
    const storeId = req.body.storeId || req.user.storeId || null;

    if (!name || !mobile) {
      return res.status(400).json({ success: false, message: 'Name and mobile number are required' });
    }

    // Check if customer already exists
    const existing = await prisma.customer.findUnique({
      where: { 
        tenantId_mobile: {
          tenantId,
          mobile
        }
      }
    });

    if (existing) {
      return res.status(400).json({ success: false, message: 'Customer with this mobile number already exists', data: existing });
    }

    const customer = await prisma.customer.create({
      data: {
        tenantId,
        storeId,
        name,
        mobile,
        address,
        villageId: villageId || undefined,
        segment: segment || 'REGULAR',
        isOnline: isOnline || false,
        loyaltyPoints: 0,
        creditBalance: 0
      },
      include: {
        village: true
      }
    });

    res.status(201).json({ success: true, data: customer, message: 'Customer registered successfully' });
  } catch (error) {
    next(error);
  }
};

// @desc    Mobile Login / Lookup
// @route   POST /api/customers/login
// @access  Private
export const loginCustomer = async (req, res, next) => {
  try {
    const { mobile, name } = req.body;
    const tenantId = req.user?.tenantId || 'VK001';

    if (!mobile) {
      return res.status(400).json({ success: false, message: 'Mobile number is required' });
    }

    let customer = await prisma.customer.findUnique({
      where: { 
        tenantId_mobile: {
          tenantId,
          mobile
        }
      },
      include: { village: true }
    });

    // Auto-create if doesn't exist and name is provided
    if (!customer && name) {
      customer = await prisma.customer.create({
        data: {
          tenantId,
          name,
          mobile,
          segment: 'REGULAR'
        },
        include: { village: true }
      });
    }

    if (!customer) {
      return res.status(404).json({ success: false, message: 'Customer profile not found. Please register.' });
    }

    res.json({ success: true, data: customer });
  } catch (error) {
    next(error);
  }
};

// @desc    Get list of customers with dynamic filtering
// @route   GET /api/customers
// @access  Private
export const getCustomers = async (req, res, next) => {
  try {
    const tenantId = req.user.tenantId || 'VK001';
    const { segment, search, storeId } = req.query;

    const where = { tenantId };

    if (segment && segment !== 'ALL') {
      where.segment = segment;
    }

    if (storeId) {
      where.storeId = storeId;
    }

    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { mobile: { contains: search } },
        { address: { contains: search, mode: 'insensitive' } }
      ];
    }

    // 🛡️ Self-Healing Layer: Auto-discover any completed orders with mobile numbers that haven't been mapped to the master Customer directory yet.
    try {
      const unmappedOrders = await prisma.order.findMany({
        where: {
          tenantId,
          customerId: null,
          mobile: { not: null },
          status: 'COMPLETED'
        },
        select: {
          mobile: true,
          customerName: true,
          storeId: true
        },
        distinct: ['mobile']
      });

      for (const ord of unmappedOrders) {
        if (ord.mobile && ord.mobile.trim() !== '') {
          const mob = ord.mobile.trim();
          // Auto-upsert customer profile
          const cust = await prisma.customer.upsert({
            where: { 
              tenantId_mobile: {
                tenantId,
                mobile: mob
              }
            },
            update: {},
            create: {
              tenant: { connect: { id: tenantId } },
              ...(ord.storeId ? { store: { connect: { id: ord.storeId } } } : {}),
              name: ord.customerName || 'Walk-in Customer',
              mobile: mob,
              segment: 'REGULAR',
              loyaltyPoints: 0,
              creditBalance: 0
            }
          });

          // Permanent association to accelerate future DB resolution
          await prisma.order.updateMany({
            where: { tenantId, mobile: mob, customerId: null },
            data: { customerId: cust.id }
          });
        }
      }
    } catch (healErr) {
      console.warn('[Self-Healing CRM] Non-fatal indexing bypass:', healErr.message);
    }

    const customers = await prisma.customer.findMany({
      where,
      include: {
        village: true,
        _count: {
          select: { orders: true }
        }
      },
      orderBy: { createdAt: 'desc' }
    });

    // We also aggregate total spent per customer to support premium dashboards
    // To minimize DB stress, we fetch order totals grouped by customerId
    const customerIds = customers.map(c => c.id);
    const orderSums = await prisma.order.groupBy({
      by: ['customerId'],
      where: {
        customerId: { in: customerIds },
        status: 'COMPLETED'
      },
      _sum: {
        totalAmount: true
      }
    });

    // We also map legacy orders by mobile number to ensure smooth stats integration
    const mobileNumbers = customers.map(c => c.mobile);
    const legacySums = await prisma.order.groupBy({
      by: ['mobile'],
      where: {
        mobile: { in: mobileNumbers },
        customerId: null,
        status: 'COMPLETED'
      },
      _sum: {
        totalAmount: true
      },
      _count: {
        id: true
      }
    });

    const enrichedCustomers = customers.map(cust => {
      const dbSum = orderSums.find(o => o.customerId === cust.id)?._sum.totalAmount || 0;
      const legacySum = legacySums.find(l => l.mobile === cust.mobile)?._sum.totalAmount || 0;
      const legacyCount = legacySums.find(l => l.mobile === cust.mobile)?._count.id || 0;

      return {
        ...cust,
        totalOrders: cust._count.orders + legacyCount,
        totalSpent: dbSum + legacySum
      };
    });

    res.json({ success: true, data: enrichedCustomers });
  } catch (error) {
    next(error);
  }
};

// @desc    Get complete purchase history for a customer
// @route   GET /api/customers/:id/history
// @access  Private
export const getCustomerHistory = async (req, res, next) => {
  try {
    const { id } = req.params;

    const customer = await prisma.customer.findUnique({
      where: { id }
    });

    if (!customer) {
      return res.status(404).json({ success: false, message: 'Customer not found' });
    }

    // Fetch orders by customerId OR legacy orders by matching mobile number
    const orders = await prisma.order.findMany({
      where: {
        tenantId: customer.tenantId,
        OR: [
          { customerId: id },
          { mobile: customer.mobile }
        ]
      },
      include: {
        items: {
          include: {
            product: true
          }
        },
        store: true,
        user: { select: { id: true, name: true } }
      },
      orderBy: { createdAt: 'desc' }
    });

    res.json({ success: true, data: orders });
  } catch (error) {
    next(error);
  }
};

// @desc    Update basic customer info
// @route   PUT /api/customers/:id
// @access  Private
export const updateCustomerProfile = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { name, mobile, address, villageId, segment, isOnline } = req.body;

    const customer = await prisma.customer.update({
      where: { id },
      data: {
        name,
        mobile,
        address,
        villageId: villageId || null,
        segment,
        isOnline
      },
      include: { village: true }
    });

    res.json({ success: true, data: customer, message: 'Profile updated successfully' });
  } catch (error) {
    next(error);
  }
};

// @desc    Adjust Credit Balance (Ledger functionality)
// @route   POST /api/customers/:id/credit
// @access  Private
export const adjustCreditBalance = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { amount, action } = req.body; // action: 'ADD' | 'DEDUCT'

    const parsedAmount = parseFloat(amount);
    if (isNaN(parsedAmount) || parsedAmount <= 0) {
      return res.status(400).json({ success: false, message: 'Valid positive amount required' });
    }

    const updateData = action === 'ADD' 
      ? { increment: parsedAmount } 
      : { decrement: parsedAmount };

    const customer = await prisma.customer.update({
      where: { id },
      data: { creditBalance: updateData }
    });

    res.json({ success: true, data: customer, message: `Credit balance updated to ₹${customer.creditBalance.toFixed(2)}` });
  } catch (error) {
    next(error);
  }
};

// @desc    Adjust Loyalty Points
// @route   POST /api/customers/:id/points
// @access  Private
export const adjustLoyaltyPoints = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { points, action } = req.body; // action: 'ADD' | 'DEDUCT'

    const parsedPoints = parseInt(points);
    if (isNaN(parsedPoints) || parsedPoints <= 0) {
      return res.status(400).json({ success: false, message: 'Valid positive points value required' });
    }

    const updateData = action === 'ADD' 
      ? { increment: parsedPoints } 
      : { decrement: parsedPoints };

    const customer = await prisma.customer.update({
      where: { id },
      data: { loyaltyPoints: updateData }
    });

    res.json({ success: true, data: customer, message: `Loyalty points updated to ${customer.loyaltyPoints}` });
  } catch (error) {
    next(error);
  }
};
