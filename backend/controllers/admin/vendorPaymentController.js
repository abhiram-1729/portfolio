import prisma from '../../utils/prisma.js';
import { getTenantId } from '../../utils/tenantContext.js';
import { generateId } from '../../utils/idGenerator.js';
import { logActivity } from '../../utils/activityLogger.js';

// ─── CREATE PAYMENT ─────────────────────────────────────
export const createPayment = async (req, res) => {
  try {
    const tenantId = req.user?.tenantId || getTenantId();
    const { vendorId, amount, mode, referenceNo, paymentDate, invoiceId, invoiceIds, remarks } = req.body;

    if (!vendorId || !amount || !mode) {
      return res.status(400).json({ message: 'Vendor, amount, and payment mode are required' });
    }

    const vendor = await prisma.vendor.findUnique({ where: { id: vendorId } });
    if (!vendor) return res.status(404).json({ message: 'Vendor not found' });

    const paymentAmount = parseFloat(amount);
    const targetInvoiceId = invoiceId || (invoiceIds && invoiceIds[0]) || null;
    const resolvedInvoiceIds = targetInvoiceId ? [targetInvoiceId] : [];
    const isAdvance = resolvedInvoiceIds.length === 0;
    const storeId = req.body.storeId || req.user.storeId || null;

    const payment = await prisma.$transaction(async (tx) => {
      const displayId = await generateId({
        entity: 'PAY',
        tenantId,
        storeId
      });

      // Create payment
      const pmt = await tx.vendorPayment.create({
        data: {
          tenantId,
          storeId,
          displayId,
          vendorId,
          amount: paymentAmount,
          mode,
          referenceNo: referenceNo || null,
          paymentDate: paymentDate ? new Date(paymentDate) : new Date(),
          isAdvance,
          remarks: remarks || null,
          invoiceId: targetInvoiceId
        }
      });

      // Allocate to invoices if specified
      if (!isAdvance && resolvedInvoiceIds.length > 0) {
        let remainingAmount = paymentAmount;

        for (const singleInvoiceId of resolvedInvoiceIds) {
          if (remainingAmount <= 0) break;

          const invoice = await tx.purchaseInvoice.findUnique({ where: { id: singleInvoiceId } });
          if (!invoice) continue;

          const outstanding = invoice.totalAmount - invoice.paidAmount;
          if (outstanding <= 0) continue;

          const allocateAmount = Math.min(remainingAmount, outstanding);

          await tx.vendorPaymentAllocation.create({
            data: {
              tenantId,
              paymentId: pmt.id,
              invoiceId: singleInvoiceId,
              amount: allocateAmount
            }
          });

          // Update invoice paid amount & status
          const newPaidAmount = invoice.paidAmount + allocateAmount;
          const newStatus = newPaidAmount >= invoice.totalAmount ? 'PAID' : 'PARTIAL_PAID';

          await tx.purchaseInvoice.update({
            where: { id: singleInvoiceId },
            data: {
              paidAmount: newPaidAmount,
              status: newStatus
            }
          });

          remainingAmount -= allocateAmount;
        }
      }

      // Vendor Ledger → Credit (Payment)
      const newBalance = (vendor.currentBalance || 0) - paymentAmount;

      await tx.vendorLedger.create({
        data: {
          tenantId,
          storeId,
          vendorId,
          type: 'PAYMENT',
          credit: paymentAmount,
          balance: newBalance,
          reference: pmt.id,
          description: isAdvance
            ? `Advance Payment (${mode}) Ref: ${referenceNo || 'N/A'}`
            : `Invoice Payment (${mode}) Ref: ${referenceNo || 'N/A'}`
        }
      });

      // Update vendor current balance
      await tx.vendor.update({
        where: { id: vendorId },
        data: { currentBalance: newBalance }
      });

      return pmt;
    }, {
      maxWait: 20000,
      timeout: 60000
    });

    res.status(201).json({ message: 'Payment recorded successfully', payment });
  } catch (error) {
    console.error('❌ Create Payment Error:', error);
    res.status(500).json({ message: 'Error creating payment', error: error.message });
  }
};

// ─── GET PAYMENTS ─────────────────────────────────────
export const getPayments = async (req, res) => {
  try {
    const { vendorId, storeId } = req.query;
    const where = { tenantId: req.user.tenantId };

    if (vendorId) where.vendorId = vendorId;
    if (storeId && storeId !== 'undefined' && storeId !== 'null') {
      where.storeId = storeId;
    } else if (req.user.storeId) {
      const isGlobal = 
        ['TENANT_OWNER', 'SUPER_ADMIN', 'ADMIN'].includes(req.user.role) || 
        req.user.customRole?.portalType === 'ADMIN';
        
      if (!isGlobal) {
        where.storeId = req.user.storeId;
      }
    }

    const payments = await prisma.vendorPayment.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      include: {
        vendor: { select: { vendorName: true, mobile: true } },
        invoice: { select: { invoiceNumber: true, totalAmount: true, paidAmount: true, invoiceDate: true, dueDate: true } },
        allocations: {
          include: {
            invoice: { select: { invoiceNumber: true, totalAmount: true, paidAmount: true, invoiceDate: true, dueDate: true } }
          }
        }
      }
    });

    res.json(payments);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching payments', error: error.message });
  }
};

// ─── GET OUTSTANDING INVOICES FOR A VENDOR ─────────────────────────────────────
export const getOutstandingInvoices = async (req, res) => {
  try {
    const { vendorId } = req.params;

    const invoices = await prisma.purchaseInvoice.findMany({
      where: {
        vendorId,
        status: { in: ['CONFIRMED', 'PARTIAL_PAID'] }
      },
      orderBy: { invoiceDate: 'asc' },
      select: {
        id: true,
        invoiceNumber: true,
        invoiceDate: true,
        totalAmount: true,
        paidAmount: true,
        status: true,
        vendor: { select: { creditDays: true } }
      }
    });

    // Calculate outstanding and due date
    const result = invoices.map(inv => ({
      ...inv,
      outstanding: inv.totalAmount - inv.paidAmount,
      dueDate: new Date(new Date(inv.invoiceDate).getTime() + (inv.vendor?.creditDays || 30) * 86400000)
    }));

    res.json(result);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching outstanding invoices', error: error.message });
  }
};

// ─── DELETE PAYMENT ─────────────────────────────────────
export const deletePayment = async (req, res) => {
  try {
    const { id } = req.params;
    const tenantId = req.user.tenantId;

    const payment = await prisma.vendorPayment.findUnique({
      where: { id },
      include: { allocations: { include: { invoice: true } } }
    });

    if (!payment) return res.status(404).json({ message: 'Payment not found' });

    await prisma.$transaction(async (tx) => {
      // 1. Rollback allocations
      for (const allocation of payment.allocations) {
        const inv = allocation.invoice;
        const newPaidAmount = Math.max(0, inv.paidAmount - allocation.amount);
        const newStatus = newPaidAmount === 0 ? 'CONFIRMED' : 'PARTIAL_PAID';

        await tx.purchaseInvoice.update({
          where: { id: inv.id },
          data: { paidAmount: newPaidAmount, status: newStatus }
        });
      }

      // 2. Revert Vendor Balance
      const currentVendor = await tx.vendor.findUnique({ where: { id: payment.vendorId } });
      const newBalance = (currentVendor?.currentBalance || 0) + payment.amount;

      await tx.vendor.update({
        where: { id: payment.vendorId },
        data: { currentBalance: newBalance }
      });

      // 3. Delete Ledger Entry
      await tx.vendorLedger.deleteMany({
        where: { reference: payment.id, type: 'PAYMENT' }
      });

      // 4. Delete allocations & payment
      await tx.vendorPaymentAllocation.deleteMany({ where: { paymentId: id } });
      await tx.vendorPayment.delete({ where: { id } });
    });

    logActivity({
      userId: req.user.id,
      tenantId: req.user.tenantId,
      action: 'VENDOR_PAYMENT_DELETED',
      details: `Deleted Payment of ₹${payment.amount} for Vendor ${payment.vendorId}`,
      metadata: { paymentId: id }
    });

    res.json({ message: 'Payment deleted successfully' });
  } catch (error) {
    console.error('❌ Delete Payment Error:', error);
    res.status(500).json({ message: 'Error deleting payment', error: error.message });
  }
};
