import express from 'express';
import { protect, admin } from '../middleware/authMiddleware.js';
import * as dashboardCtr from '../controllers/admin/dashboardController.js';
import * as userCtr from '../controllers/admin/userController.js';
import * as vehicleCtr from '../controllers/admin/vehicleController.js';
import * as inventoryCtr from '../controllers/admin/inventoryController.js';
import * as salesCtr from '../controllers/admin/salesController.js';
import * as reportCtr from '../controllers/admin/reportController.js';
import * as settingsCtr from '../controllers/admin/settingsController.js';
import * as routeCtr from '../controllers/admin/routeController.js';
import * as villageCtr from '../controllers/admin/villageController.js';
import * as unitCtr from '../controllers/admin/unitController.js';
import * as categoryCtr from '../controllers/admin/categoryController.js';
import * as subCategoryCtr from '../controllers/admin/subCategoryController.js';
import * as assetCategoryCtr from '../controllers/admin/assetCategoryController.js';
import * as assetCtr from '../controllers/admin/assetController.js';
import * as activityCtr from '../controllers/admin/activityController.js';
import { getFinanceReports } from '../controllers/cashController.js';
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
  .get(vehicleCtr.getVehicleById)
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
router.put('/inventory/vehicle/:id/audit', inventoryCtr.auditVehicleStock);
router.get('/inventory/audit-history', inventoryCtr.getAuditHistory);
router.get('/inventory/refills', inventoryCtr.getRefillRequests);
router.put('/inventory/refills/:id/approve', inventoryCtr.approveRefillRequest);
router.put('/inventory/refills/:id/reject', inventoryCtr.rejectRefillRequest);

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
router.get('/reports/route-wise', reportCtr.getRouteWiseReport);
router.get('/reports/village-wise', reportCtr.getVillageWiseReport);
router.get('/reports/agent-performance', reportCtr.getAgentPerformance);

// Activity Logs
router.get('/activities', activityCtr.getActivityLogs);

// Finance
router.get('/finance/reports', getFinanceReports);

// Villages
router.route('/villages')
  .get(villageCtr.getVillages)
  .post(villageCtr.createVillage);
router.route('/villages/:id')
  .put(villageCtr.updateVillage)
  .delete(villageCtr.deleteVillage);
router.post('/villages/resolve-link', villageCtr.resolveMapsLink);

// Routes & Assignments
router.route('/routes')
  .get(routeCtr.getAdminRoutes)
  .post(routeCtr.createRoute);
router.route('/routes/:id')
  .put(routeCtr.updateRoute)
  .delete(routeCtr.deleteRoute);
router.route('/routes/assignments')
  .get(routeCtr.getRouteAssignments)
  .post(routeCtr.assignRouteToVehicle);
router.route('/routes/assignments/:id')
  .put(routeCtr.updateRouteAssignment)
  .delete(routeCtr.deleteRouteAssignment);

// Business Settings Update (Admin Only)
router.put('/settings', admin, settingsCtr.updateSettings);

// Units Management
router.route('/units')
  .get(unitCtr.getUnits)
  .post(unitCtr.createUnit);
router.route('/units/:id')
  .put(unitCtr.updateUnit)
  .delete(unitCtr.deleteUnit);

// Categories Management
router.route('/categories')
  .get(categoryCtr.getCategories)
  .post(categoryCtr.createCategory);
router.route('/categories/:id')
  .put(categoryCtr.updateCategory)
  .delete(categoryCtr.deleteCategory);

// Sub-Categories Management
router.route('/sub-categories')
  .get(subCategoryCtr.getSubCategories)
  .post(subCategoryCtr.createSubCategory);
router.route('/sub-categories/:id')
  .put(subCategoryCtr.updateSubCategory)
  .delete(subCategoryCtr.deleteSubCategory);

// Asset Categories Management
router.route('/asset-categories')
  .get(assetCategoryCtr.getAssetCategories)
  .post(assetCategoryCtr.createAssetCategory);
router.route('/asset-categories/:id')
  .put(assetCategoryCtr.updateAssetCategory)
  .delete(assetCategoryCtr.deleteAssetCategory);

// ─── Asset Management ─────────────────────────────────────
router.route('/assets')
  .get(assetCtr.getAssets)
  .post(uploadMiddleware.single('image'), assetCtr.createAsset);
router.route('/assets/:id')
  .put(uploadMiddleware.single('image'), assetCtr.updateAsset)
  .delete(assetCtr.deleteAsset);
router.post('/assets/:id/units', assetCtr.addAssetUnits);
router.post('/assets/assign', assetCtr.assignAsset);
router.post('/assets/return', assetCtr.returnAsset);
router.get('/assets/tracking', assetCtr.getAssetTracking);
router.get('/assets/issues', assetCtr.getIssues);
router.put('/assets/issues/:id', assetCtr.updateIssueStatus);
router.get('/assets/requests', assetCtr.getAssetRequests);
router.put('/assets/requests/:id', assetCtr.updateAssetRequestStatus);
router.get('/assets/reports', assetCtr.getAssetReports);

export default router;
