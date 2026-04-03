import express from 'express';
import { protect, admin } from '../middleware/authMiddleware.js';
import * as dashboardCtr from '../controllers/admin/dashboardController.js';
import * as userCtr from '../controllers/admin/userController.js';
import * as vehicleCtr from '../controllers/admin/vehicleController.js';
import * as inventoryCtr from '../controllers/admin/inventoryController.js';
import * as salesCtr from '../controllers/admin/salesController.js';
import * as reportCtr from '../controllers/admin/reportController.js';
import * as settingsCtr from '../controllers/admin/settingsController.js';
import { uploadMiddleware } from '../middleware/uploadMiddleware.js';

const router = express.Router();

// Apply auth middleware to all admin routes
router.use(protect);

// Settings (GET available to all authenticated users for invoices)
router.get('/settings', settingsCtr.getSettings);

// All other routes below are ADMIN ONLY
router.use(admin);

// Dashboard
router.get('/dashboard', dashboardCtr.getDashboardStats);

// Users
router.route('/users')
  .get(userCtr.getUsers)
  .post(userCtr.createUser);
router.route('/users/:id')
  .put(userCtr.updateUser)
  .delete(userCtr.deactivateUser);

// Vehicles
router.route('/vehicles')
  .get(vehicleCtr.getVehicles)
  .post(
    uploadMiddleware.fields([
      { name: 'rcDocument', maxCount: 1 },
      { name: 'insuranceDocument', maxCount: 1 },
      { name: 'permitDocument', maxCount: 1 }
    ]),
    vehicleCtr.createVehicle
  );
router.route('/vehicles/:id')
  .put(
    uploadMiddleware.fields([
      { name: 'rcDocument', maxCount: 1 },
      { name: 'insuranceDocument', maxCount: 1 },
      { name: 'permitDocument', maxCount: 1 }
    ]),
    vehicleCtr.updateVehicle
  )
  .delete(vehicleCtr.deleteVehicle);
router.put('/vehicles/:id/assign', vehicleCtr.assignDriver);
router.get('/vehicles/:id/sales', vehicleCtr.getVehicleSales);

// Inventory (Item Master & Stocking)
router.route('/inventory/items')
  .get(inventoryCtr.getItems)
  .post(
    uploadMiddleware.single('image'),
    inventoryCtr.createItem
  );
router.post('/inventory/items/bulk', inventoryCtr.bulkCreateItems);
router.post('/inventory/items/bulk-delete', inventoryCtr.bulkDeleteItems);
router.route('/inventory/items/:id')
  .put(uploadMiddleware.single('image'), inventoryCtr.updateItem)
  .delete(inventoryCtr.deleteItem);

router.post('/inventory/load', inventoryCtr.loadStock);
router.post('/inventory/return', inventoryCtr.returnStock);
router.get('/inventory/vehicle/:id', inventoryCtr.getVehicleInventory);

// Sales History
router.get('/sales', salesCtr.getSalesHistory);

// Reports
router.get('/reports/daily', reportCtr.getDailyReport);
router.get('/reports/trends', reportCtr.getTrendsReport);
router.get('/reports/top-products', reportCtr.getTopProducts);
router.get('/reports/vehicle/:id', reportCtr.getVehicleWiseReport);
router.get('/reports/item', reportCtr.getItemWiseReport);
router.get('/reports/date-range', reportCtr.getDateRangeReport);
router.get('/reports/reconciliation', reportCtr.getReconciliationReport);

// Business Settings Update (Admin Only)
router.put('/settings', admin, settingsCtr.updateSettings);

export default router;
