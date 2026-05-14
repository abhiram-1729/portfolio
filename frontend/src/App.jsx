import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { useEffect, useCallback } from 'react';
import { Toaster } from 'react-hot-toast';
import { useUserStore } from './store/userStore';
import { useCartStore } from './store/cartStore';
import { useNotificationStore } from './store/notificationStore';
import Login from './pages/Login';
import Register from './pages/Register';
import LandingPage from './pages/LandingPage';
import CreateBusiness from './pages/CreateBusiness';
import SalesEntry from './pages/SalesEntry';
import InvoicePreview from './pages/InvoicePreview';
import PaymentScreen from './pages/PaymentScreen';
import SuccessScreen from './pages/SuccessScreen';
import Reports from './pages/Reports';
import Profile from './pages/Profile';
import OpeningCashEntry from './pages/OpeningCashEntry';
import ClosingCashEntry from './pages/ClosingCashEntry';
import AgentInventory from './pages/AgentInventory';
import TodayPlan from './pages/TodayPlan';
import RefillStock from './pages/RefillStock';
import AdminLayout from './components/admin/AdminLayout';
import AgentLayout from './components/AgentLayout';
import AdminDashboard from './pages/admin/AdminDashboard';
import AdminUsers from './pages/admin/AdminUsers';
import AdminVehicles from './pages/admin/AdminVehicles';
import AdminInventory from './pages/admin/AdminInventory';
import AdminPOS from './pages/admin/AdminPOS';
import AdminSales from './pages/admin/AdminSales';
import AdminReports from './pages/admin/AdminReports';
import AdminCashManagement from './pages/admin/AdminCashManagement';
import AdminSettings from './pages/admin/AdminSettings';
import AdminRoutes from './pages/admin/AdminRoutes';
import AdminNotifications from './pages/admin/AdminNotifications';
import AdminTargets from './pages/admin/AdminTargets';
import AdminAssets from './pages/admin/AdminAssets';
import Notifications from './pages/Notifications';
import VgeTargets from './pages/VgeTargets';
import AgentAssets from './pages/AgentAssets';
import CashWallet from './pages/CashWallet';
import AdminExpenses from './pages/admin/AdminExpenses';
import AdminFinanceReports from './pages/admin/AdminFinanceReports';
import AdminProcurement from './pages/admin/AdminProcurement';
import TenantLayout from './components/tenant/TenantLayout';
import TenantDashboard from './pages/tenant/TenantDashboard';
import TenantStores from './pages/tenant/TenantStores';
import AdminStores from './pages/admin/AdminStores';
import TenantPrivileges from './pages/tenant/TenantPrivileges';
import TenantActivityLogs from './pages/tenant/TenantActivityLogs';
import AdminActivityLogs from './pages/admin/AdminActivityLogs';
import AdminDamage from './pages/admin/AdminDamage';
import AgentActivityLogs from './pages/AgentActivityLogs';
import ReportDamage from './pages/ReportDamage';
import SalesHistory from './pages/SalesHistory';
import OrderDetail from './pages/OrderDetail';
import AgentAttendance from './pages/AgentAttendance';
import AdminAttendance from './pages/admin/AdminAttendance';
import TenantOnboarding from './pages/tenant/TenantOnboarding';
import CreateExpense from './pages/CreateExpense';

// Admin Reports
import OverviewReport from './pages/admin/adminreports/OverviewReport';
import ItemWiseReport from './pages/admin/adminreports/ItemWiseReport';
import CategoryWiseReport from './pages/admin/adminreports/CategoryWiseReport';
import DayWiseReport from './pages/admin/adminreports/DayWiseReport';
import RouteVillageReport from './pages/admin/adminreports/RouteVillageReport';
import AgentPerformanceReport from './pages/admin/adminreports/AgentPerformanceReport';
import LocationTrackingReport from './pages/admin/adminreports/LocationTrackingReport';
import VehicleWiseReport from './pages/admin/adminreports/VehicleWiseReport';
import PaymentModeReport from './pages/admin/adminreports/PaymentModeReport';
import ReturnReport from './pages/admin/adminreports/ReturnReport';
import DamageReport from './pages/admin/adminreports/DamageReport';
import SessionReport from './pages/admin/adminreports/SessionReport';
import InvoiceReport from './pages/admin/adminreports/InvoiceReport';

function PrivateRoute({ children }) {
  const { token } = useUserStore();
  return token ? children : <Navigate to="/login" replace />;
}

function AdminRoute({ children }) {
  const { token, user } = useUserStore();
  if (!token) return <Navigate to="/login" replace />;
  
  const isAuthorized = 
    user?.role === 'ADMIN' || 
    user?.role === 'TENANT_OWNER' || 
    user?.portalType === 'ADMIN' || 
    user?.portalType === 'SUPERVISOR';

  if (!isAuthorized) {
     return <Navigate to="/home" replace />;
  }
  return children;
}

function TenantRoute({ children }) {
  const { token, user } = useUserStore();
  if (!token) return <Navigate to="/login" replace />;
  if (user?.role !== 'TENANT_OWNER') return <Navigate to="/home" replace />;
  return children;
}

export default function App() {
  const { token, user, refreshUserProfile } = useUserStore();
  const { cartOwnerId, clearCart, setCartOwner } = useCartStore();
  const { initSocket, disconnectSocket, fetchNotifications } = useNotificationStore();

  const init = useCallback(() => {
    if (token) {
      initSocket(token);
      fetchNotifications();
      refreshUserProfile();
    }
  }, [token, initSocket, fetchNotifications, refreshUserProfile]);

  useEffect(() => {
    if (token) {
      init();
    } else {
      disconnectSocket();
    }
  }, [token, init, disconnectSocket]);

  useEffect(() => {
    if (user && user.id !== cartOwnerId) {
      clearCart();
      setCartOwner(user.id);
    } else if (!user && cartOwnerId) {
      setCartOwner(null);
    }
  }, [user, cartOwnerId, clearCart, setCartOwner]);

  return (
    <BrowserRouter>
      <Toaster
        position="top-center"
        toastOptions={{
          style: {
            borderRadius: '12px',
            background: '#1f2937',
            color: '#fff',
            fontSize: '14px',
          },
        }}
      />
      <Routes>
        <Route path="/login" element={token ? <Navigate to="/" replace /> : <Login />} />
        <Route path="/register" element={token ? <Navigate to="/" replace /> : <Register />} />
        <Route path="/home" element={<LandingPage />} />
        <Route path="/create-business" element={<AdminRoute><CreateBusiness /></AdminRoute>} />
        
        <Route path="/" element={
          !token ? <Navigate to="/home" replace /> : 
          (user?.portalType === 'ADMIN' || user?.role === 'ADMIN') ? <Navigate to="/admin" replace /> :
          (user?.portalType === 'SUPERVISOR') ? <Navigate to="/admin" replace /> : 
          (user?.portalType === 'HELPER') ? <PrivateRoute><AgentLayout /></PrivateRoute> :
          user?.role === 'TENANT_OWNER' ? <Navigate to="/admin" replace /> :
          <PrivateRoute><AgentLayout /></PrivateRoute>
        }>
          <Route index element={<SalesEntry />} />
          <Route path="reports" element={<Reports />} />
          <Route path="profile" element={<Profile />} />
          <Route path="notifications" element={<Notifications />} />
          <Route path="opening-cash" element={<OpeningCashEntry />} />
          <Route path="closing-cash" element={<ClosingCashEntry />} />
          <Route path="agent-inventory/:vehicleId" element={<AgentInventory />} />
          <Route path="today-plan" element={<TodayPlan />} />
          <Route path="refill-stock" element={<RefillStock />} />
          <Route path="targets" element={<VgeTargets />} />
          <Route path="my-assets" element={<AgentAssets />} />
          <Route path="wallet" element={<CashWallet />} />
          <Route path="activity-logs" element={<AgentActivityLogs />} />
          <Route path="report-damage" element={<ReportDamage />} />
          <Route path="sales-history" element={<SalesHistory />} />
          <Route path="order-detail/:id" element={<OrderDetail />} />
          <Route path="attendance" element={<AgentAttendance />} />
          <Route path="create-expense" element={<CreateExpense />} />
        </Route>

        <Route path="/invoice" element={<PrivateRoute><InvoicePreview /></PrivateRoute>} />
        <Route path="/payment" element={<PrivateRoute><PaymentScreen /></PrivateRoute>} />
        <Route path="/success/:id" element={<PrivateRoute><SuccessScreen /></PrivateRoute>} />
        
          <Route path="/admin" element={<AdminRoute><AdminLayout /></AdminRoute>}>
            <Route index element={<AdminDashboard />} />
            <Route path="pos" element={<AdminPOS />} />
            <Route path="users" element={<AdminUsers />} />
          <Route path="vehicles" element={<AdminVehicles />} />
          <Route path="inventory" element={<AdminInventory />} />
          <Route path="sales" element={<AdminSales />} />
          <Route path="reports">
            <Route index element={<AdminReports />} />
            <Route path="overview" element={<OverviewReport />} />
            <Route path="item-wise" element={<ItemWiseReport />} />
            <Route path="category-wise" element={<CategoryWiseReport />} />
            <Route path="day-wise" element={<DayWiseReport />} />
            <Route path="route-village" element={<RouteVillageReport />} />
            <Route path="agent-performance" element={<AgentPerformanceReport />} />
            <Route path="location-tracking" element={<LocationTrackingReport />} />
            <Route path="vehicle-wise" element={<VehicleWiseReport />} />
            <Route path="payment-mode" element={<PaymentModeReport />} />
            <Route path="returns" element={<ReturnReport />} />
            <Route path="damages" element={<DamageReport />} />
            <Route path="sessions" element={<SessionReport />} />
            <Route path="invoices" element={<InvoiceReport />} />
          </Route>
          <Route path="cash" element={<AdminCashManagement />} />
          <Route path="settings" element={<AdminSettings />} />
          <Route path="notifications" element={<AdminNotifications />} />
          <Route path="routes" element={<AdminRoutes />} />
          <Route path="targets" element={<AdminTargets />} />
          <Route path="assets" element={<AdminAssets />} />
          <Route path="expenses" element={<AdminExpenses />} />
          <Route path="procurement" element={<AdminProcurement />} />
          <Route path="finance-reports" element={<AdminFinanceReports />} />
          <Route path="activity-logs" element={<AdminActivityLogs />} />
          <Route path="damage" element={<AdminDamage />} />
          <Route path="attendance" element={<AdminAttendance />} />
          <Route path="privileges" element={<TenantPrivileges />} />
          <Route path="stores" element={<AdminStores />} />
          <Route path="admins" element={<AdminUsers type="admin" />} />
          <Route path="onboarding" element={<TenantOnboarding />} />
        </Route>
        <Route path="/tenant" element={<TenantRoute><TenantLayout /></TenantRoute>}>
          <Route index element={<TenantDashboard />} />
          <Route path="stores" element={<TenantStores />} />
          <Route path="users" element={<AdminUsers type="staff" />} />
          <Route path="vehicles" element={<AdminVehicles />} />
          <Route path="reports">
            <Route index element={<AdminReports />} />
            <Route path="overview" element={<OverviewReport />} />
            <Route path="item-wise" element={<ItemWiseReport />} />
            <Route path="category-wise" element={<CategoryWiseReport />} />
            <Route path="day-wise" element={<DayWiseReport />} />
            <Route path="route-village" element={<RouteVillageReport />} />
            <Route path="agent-performance" element={<AgentPerformanceReport />} />
            <Route path="location-tracking" element={<LocationTrackingReport />} />
            <Route path="vehicle-wise" element={<VehicleWiseReport />} />
            <Route path="payment-mode" element={<PaymentModeReport />} />
            <Route path="returns" element={<ReturnReport />} />
            <Route path="damages" element={<DamageReport />} />
            <Route path="sessions" element={<SessionReport />} />
            <Route path="invoices" element={<InvoiceReport />} />
          </Route>
          <Route path="privileges" element={<TenantPrivileges />} />
          <Route path="settings" element={<AdminSettings />} />
          <Route path="notifications" element={<AdminNotifications />} />
          <Route path="admins" element={<AdminUsers type="admin" />} /> 
          <Route path="activity-logs" element={<TenantActivityLogs />} />
          <Route path="onboarding" element={<TenantOnboarding />} />
        </Route>

        <Route path="*" element={<Navigate to="/home" replace />} />
      </Routes>
    </BrowserRouter>
  );
}
