import express from 'express';
import { protect, admin } from '../middleware/authMiddleware.js';
import * as vendorCtr from '../controllers/admin/vendorController.js';
import * as poCtr from '../controllers/admin/purchaseOrderController.js';
import * as grnCtr from '../controllers/admin/grnController.js';
import * as purchaseCtr from '../controllers/admin/purchaseController.js';
import * as paymentCtr from '../controllers/admin/vendorPaymentController.js';
import * as reportCtr from '../controllers/admin/procurementReportController.js';

const router = express.Router();

// Auth + Admin middleware
router.use(protect);
router.use(admin);

// ─── VENDORS ─────────────────────────────────────
router.route('/vendors')
  .get(vendorCtr.getVendors)
  .post(vendorCtr.createVendor);
router.route('/vendors/:id')
  .put(vendorCtr.updateVendor)
  .delete(vendorCtr.deleteVendor);
router.put('/vendors/:id/toggle-status', vendorCtr.toggleVendorStatus);
router.get('/vendors/:id/ledger', vendorCtr.getVendorLedger);

// ─── VENDOR ITEM MAPPINGS ─────────────────────────────────────
router.get('/vendors/:vendorId/mappings', vendorCtr.getVendorMappings);
router.put('/vendors/:vendorId/mappings', vendorCtr.updateVendorMappings);

// ─── PURCHASE ORDERS ─────────────────────────────────────
router.route('/purchase-orders')
  .get(poCtr.getPOs)
  .post(poCtr.createPO);
router.route('/purchase-orders/:id')
  .get(poCtr.getPOById)
  .put(poCtr.updatePO)
  .delete(poCtr.deletePO);
router.put('/purchase-orders/:id/status', poCtr.updatePOStatus);

// ─── GOODS RECEIPT NOTES ─────────────────────────────────────
router.route('/grn')
  .get(grnCtr.getGRNs)
  .post(grnCtr.createGRN);
router.route('/grn/:id')
  .put(grnCtr.updateGRN)
  .delete(grnCtr.deleteGRN);

// ─── PURCHASE INVOICES ─────────────────────────────────────
router.route('/purchases')
  .get(purchaseCtr.getPurchases)
  .post(purchaseCtr.createPurchase);
router.route('/purchases/:id')
  .get(purchaseCtr.getPurchaseById)
  .put(purchaseCtr.updatePurchase)
  .delete(purchaseCtr.deletePurchase);

// ─── VENDOR PAYMENTS ─────────────────────────────────────
router.route('/payments')
  .get(paymentCtr.getPayments)
  .post(paymentCtr.createPayment);
router.route('/payments/:id')
  .delete(paymentCtr.deletePayment);
router.get('/payments/outstanding/:vendorId', paymentCtr.getOutstandingInvoices);

// ─── REPORTS ─────────────────────────────────────
router.get('/reports/stock', reportCtr.getStockReport);
router.get('/reports/low-stock', reportCtr.getLowStockAlert);
router.get('/reports/purchases', reportCtr.getPurchaseReport);
router.get('/reports/vendors', reportCtr.getVendorReport);
router.get('/reports/outstanding', reportCtr.getOutstandingPayables);
router.get('/reports/aging', reportCtr.getAgingReport);
router.get('/reports/profitability', reportCtr.getProfitabilityReport);
router.get('/reports/stock-ledger', reportCtr.getStockLedger);

export default router;
