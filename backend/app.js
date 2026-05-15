import express from 'express';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import authRoutes from './routes/authRoutes.js';
import productRoutes from './routes/productRoutes.js';
import cartRoutes from './routes/cartRoutes.js';
import orderRoutes from './routes/orderRoutes.js';
import reportRoutes from './routes/reportRoutes.js';
import adminRoutes from './routes/adminRoutes.js';
import cashRoutes from './routes/cashRoutes.js';
import routeRoutes from './routes/routeRoutes.js';
import notificationRoutes from './routes/notificationRoutes.js';
import vgeRoutes from './routes/vgeRoutes.js';
import assetRoutes from './routes/assetRoutes.js';
import expenseRoutes from './routes/expenseRoutes.js';
import storeRoutes from './routes/storeRoutes.js';
import procurementRoutes from './routes/procurementRoutes.js';
import roleRoutes from './routes/roleRoutes.js';
import activityRoutes from './routes/activityRoutes.js';
import damageRoutes from './routes/damageRoutes.js';
import attendanceRoutes from './routes/attendanceRoutes.js';
import shiftRoutes from './routes/shiftRoutes.js';
import villageActivityRoutes from './routes/villageActivityRoutes.js';
import locationRoutes from './routes/locationRoutes.js';
import refillRoutes from './routes/refillRoutes.js';
import lateEntryRoutes from './routes/lateEntryRoutes.js';
import customerRoutes from './routes/customerRoutes.js';
import promotionRoutes from './routes/promotionRoutes.js';
import { errorHandler } from './middleware/errorMiddleware.js';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();

const corsOptions = {
  origin: function (origin, callback) {
    // Reflect the requesting origin to bypass CORS issues for Vercel preview domains
    callback(null, origin || true);
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'Accept'],
  optionsSuccessStatus: 204 // Some legacy browsers (IE11, various SmartTVs) choke on 200
};

app.use(cors(corsOptions));
app.use(express.json());

// Static Files
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// API Router definition for robustness
const apiRouter = express.Router();

// Mount all routes to the apiRouter WITHOUT /api prefix here
apiRouter.use('/auth', authRoutes);
apiRouter.use('/products', productRoutes);
apiRouter.use('/cart', cartRoutes);
apiRouter.use('/orders', orderRoutes);
apiRouter.use('/reports', reportRoutes);
apiRouter.use('/admin', adminRoutes);
apiRouter.use('/cash', cashRoutes);
apiRouter.use('/routes', routeRoutes);
apiRouter.use('/notifications', notificationRoutes);
apiRouter.use('/vge', vgeRoutes);
apiRouter.use('/assets', assetRoutes);
apiRouter.use('/expenses', expenseRoutes);
apiRouter.use('/tenant/stores', storeRoutes);
apiRouter.use('/procurement', procurementRoutes);
apiRouter.use('/admin/roles', roleRoutes);
apiRouter.use('/activities', activityRoutes);
apiRouter.use('/damage', damageRoutes);
apiRouter.use('/attendance', attendanceRoutes);
apiRouter.use('/shifts', shiftRoutes);
apiRouter.use('/village-activities', villageActivityRoutes);
apiRouter.use('/location', locationRoutes);
apiRouter.use('/refills', refillRoutes);
apiRouter.use('/late-entry', lateEntryRoutes);
apiRouter.use('/customers', customerRoutes);
apiRouter.use('/promotions', promotionRoutes);

// Mount the apiRouter both WITH and WITHOUT /api prefix
// This ensures compatibility with proxies that might or might not strip the prefix
app.use('/api', apiRouter);
app.use(apiRouter);

// Root path health check (accessible at both / and /api)
app.get('/', (req, res) => {
  res.json({
    message: 'Vehicle Sales Tracking API is running...',
    status: 'healthy',
    timestamp: new Date().toISOString()
  });
});

apiRouter.get('/', (req, res) => {
  res.json({
    message: 'Vehicle Sales Tracking API is running...',
    status: 'healthy',
    timestamp: new Date().toISOString()
  });
});

// Error Middleware
app.use(errorHandler);

export default app;
// Force nodemon restart

// restart2