import prisma from '../../utils/prisma.js';
import { getTenantId } from '../../utils/tenantContext.js';
import { generateId } from '../../utils/idGenerator.js';

// ─── CREATE PAYMENT ─────────────────────────────────────
export const createPayment = async (req, res) => {
  try {
    const tenantId = req.user?.tenantId || getTenantId();
    const { vendorId, amount, mode, referenceNo, paymentDate, invoiceIds, remarks } = req.body;

    if (!vendorId || !amount || !mode) {
      return res.status(400).json({ message: 'Vendor, amount, and payment mode are required' });
    }

    const vendor = await prisma.vendor.findUnique({ where: { id: vendorId } });
    if (!vendor) return res.status(404).json({ message: 'Vendor not found' });

    const paymentAmount = parseFloat(amount);
    const isAdvance = !invoiceIds || !Array.isArray(invoiceIds) || invoiceIds.length === 0;
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
          remarks: remarks || null
        }
      });

      // Allocate to invoices if specified
      if (!isAdvance && invoiceIds.length > 0) {
        let remainingAmount = paymentAmount;

        for (const invoiceId of invoiceIds) {
          if (remainingAmount <= 0) break;

          const invoice = await tx.purchaseInvoice.findUnique({ where: { id: invoiceId } });
          if (!invoice) continue;

          const outstanding = invoice.totalAmount - invoice.paidAmount;
          if (outstanding <= 0) continue;

          const allocateAmount = Math.min(remainingAmount, outstanding);

          await tx.vendorPaymentAllocation.create({
            data: {
              tenantId,
              paymentId: pmt.id,
              invoiceId,
              amount: allocateAmount
            }
          });

          // Update invoice paid amount & status
          const newPaidAmount = invoice.paidAmount + allocateAmount;
          const newStatus = newPaidAmount >= invoice.totalAmount ? 'PAID' : 'PARTIAL_PAID';

          await tx.purchaseInvoice.update({
            where: { id: invoiceId },
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
    } else if (req.user.storeId && req.user.role !== 'TENANT_OWNER') {
      where.storeId = req.user.storeId;
    }

    const payments = await prisma.vendorPayment.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      include: {
        vendor: { select: { vendorName: true, mobile: true } },
        allocations: {
          include: {
            invoice: { select: { invoiceNumber: true, totalAmount: true } }
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
