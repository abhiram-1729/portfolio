import { Prisma } from '@prisma/client';
import prisma from '../../utils/prisma.js';
import { getTenantId } from '../../utils/tenantContext.js';
import { logActivity } from '../../utils/activityLogger.js';

// ─── CREATE REQUISITION ─────────────────────────────────────
export const createRequisition = async (req, res) => {
  try {
    const tenantId = req.user?.tenantId || getTenantId();
    const { items, priority, remarks, storeId } = req.body;

    if (!items || !Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ message: 'At least one item is required' });
    }

    const requisition = await prisma.purchaseRequisition.create({
      data: {
        tenantId,
        storeId: storeId || req.user.storeId || null,
        priority: priority || 'NORMAL',
        remarks,
        status: 'PENDING',
        items: {
          create: items.map(item => ({
            tenantId,
            productId: item.productId,
            quantity: parseInt(item.quantity)
          }))
        }
      },
      include: { items: true }
    });

    logActivity({
      userId: req.user.id,
      tenantId,
      storeId: storeId || req.user.storeId,
      action: 'REQUISITION_CREATED',
      details: `Created Requisition REQ-${requisition.reqNumber} with ${items.length} items.`,
      metadata: { reqId: requisition.id }
    });

    res.status(201).json({ message: 'Requisition created successfully', requisition });
  } catch (error) {
    console.error('❌ Create Requisition Error:', error);
    res.status(500).json({ message: 'Error creating requisition', error: error.message });
  }
};

// ─── GET REQUISITIONS ─────────────────────────────────────
export const getRequisitions = async (req, res) => {
  try {
    const { status, storeId } = req.query;
    const where = { tenantId: req.user.tenantId };

    if (status && status !== 'ALL') where.status = status;
    if (storeId && storeId !== 'undefined' && storeId !== 'null') {
      where.storeId = storeId;
    } else if (req.user.storeId && req.user.role !== 'TENANT_OWNER') {
      where.storeId = req.user.storeId;
    }

    const requisitions = await prisma.purchaseRequisition.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      include: {
        store: { select: { name: true } },
        items: {
          include: { 
            product: { select: { name: true, skuCode: true, brand: { select: { name: true } } } } 
          }
        }
      }
    });

    res.json(requisitions);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching requisitions', error: error.message });
  }
};

// ─── UPDATE REQUISITION STATUS ──────────────────────────────
export const updateRequisitionStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status, remarks } = req.body;
    
    if (!['APPROVED', 'REJECTED'].includes(status)) {
      return res.status(400).json({ message: 'Invalid status update' });
    }

    const existing = await prisma.purchaseRequisition.findUnique({ where: { id } });
    if (!existing) return res.status(404).json({ message: 'Requisition not found' });
    if (existing.status !== 'PENDING') return res.status(400).json({ message: 'Can only update PENDING requisitions' });

    const updated = await prisma.purchaseRequisition.update({
      where: { id },
      data: { status, remarks: remarks || existing.remarks }
    });

    logActivity({
      userId: req.user.id,
      tenantId: req.user.tenantId,
      action: `REQUISITION_${status}`,
      details: `${status} Requisition REQ-${existing.reqNumber}`,
      metadata: { reqId: id }
    });

    res.json({ message: `Requisition ${status.toLowerCase()} successfully`, requisition: updated });
  } catch (error) {
    res.status(500).json({ message: 'Error updating requisition', error: error.message });
  }
};

// ─── CONVERT TO PO ──────────────────────────────────────────
export const convertToPO = async (req, res) => {
  try {
    const { id } = req.params;
    const { vendorId } = req.body;
    const tenantId = req.user.tenantId;

    if (!vendorId) return res.status(400).json({ message: 'Vendor is required to create a PO' });

    const reqData = await prisma.purchaseRequisition.findUnique({
      where: { id },
      include: { items: { include: { product: true } } }
    });

    if (!reqData) return res.status(404).json({ message: 'Requisition not found' });
    if (reqData.status !== 'APPROVED') return res.status(400).json({ message: 'Only APPROVED requisitions can be converted' });

    // Calculate total
    const totalAmount = reqData.items.reduce((sum, item) => sum + (item.quantity * (item.product.purchasePrice || 0)), 0);

    const po = await prisma.$transaction(async (tx) => {
      // 1. Create PO
      const newPO = await tx.purchaseOrder.create({
        data: {
          tenantId,
          storeId: reqData.storeId,
          vendorId,
          poDate: new Date(),
          deliveryDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // Default 7 days
          status: 'CREATED',
          totalAmount,
          items: {
            create: reqData.items.map(item => ({
              tenantId,
              productId: item.productId,
              quantity: item.quantity,
              rate: item.product.purchasePrice || 0,
              total: item.quantity * (item.product.purchasePrice || 0)
            }))
          }
        }
      });

      // 2. Mark Requisition as PO_CREATED
      await tx.purchaseRequisition.update({
        where: { id },
        data: { status: 'PO_CREATED' }
      });

      return newPO;
    });

    logActivity({
      userId: req.user.id,
      tenantId,
      action: 'REQUISITION_CONVERTED',
      details: `Converted Requisition REQ-${reqData.reqNumber} to Purchase Order`,
      metadata: { reqId: id, poId: po.id }
    });

    res.json({ message: 'Converted to Purchase Order successfully', po });
  } catch (error) {
    res.status(500).json({ message: 'Error converting to PO', error: error.message });
  }
};

// --- GET REQUISITION BY ID ----------------------------------
export const getRequisitionById = async (req, res) => {
  try {
    const { id } = req.params;
    const requisition = await prisma.purchaseRequisition.findUnique({
      where: { id },
      include: {
        store: { select: { name: true } },
        items: {
          include: { product: { select: { name: true, skuCode: true, purchasePrice: true } } }
        }
      }
    });

    if (!requisition) return res.status(404).json({ message: 'Requisition not found' });
    res.json(requisition);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching requisition', error: error.message });
  }
};

// --- DELETE REQUISITION -------------------------------------
export const deleteRequisition = async (req, res) => {
  try {
    const { id } = req.params;
    const requisition = await prisma.purchaseRequisition.findUnique({ where: { id } });

    if (!requisition) return res.status(404).json({ message: 'Requisition not found' });
    if (requisition.status !== 'PENDING') return res.status(400).json({ message: 'Can only delete PENDING requisitions' });

    await prisma.$transaction([
      prisma.purchaseRequisitionItem.deleteMany({ where: { requisitionId: id } }),
      prisma.purchaseRequisition.delete({ where: { id } })
    ]);

    logActivity({
      userId: req.user.id,
      tenantId: req.user.tenantId,
      action: 'REQUISITION_DELETED',
      details: `Deleted Requisition REQ-${requisition.reqNumber}`,
      metadata: { reqId: id }
    });

    res.json({ message: 'Requisition deleted successfully' });
  } catch (error) {
    res.status(500).json({ message: 'Error deleting requisition', error: error.message });
  }
};

