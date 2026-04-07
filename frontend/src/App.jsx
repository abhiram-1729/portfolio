import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { useEffect } from 'react';
import { Toaster } from 'react-hot-toast';
import { useUserStore } from './store/userStore';
import { useCartStore } from './store/cartStore';
import { useNotificationStore } from './store/notificationStore';
import Login from './pages/Login';
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
import AdminLayout from './components/admin/AdminLayout';
import AgentLayout from './components/AgentLayout';
import AdminDashboard from './pages/admin/AdminDashboard';
import AdminUsers from './pages/admin/AdminUsers';
import AdminVehicles from './pages/admin/AdminVehicles';
import AdminInventory from './pages/admin/AdminInventory';
import AdminSales from './pages/admin/AdminSales';
import AdminReports from './pages/admin/AdminReports';
import AdminCashManagement from './pages/admin/AdminCashManagement';
import AdminSettings from './pages/admin/AdminSettings';
import AdminRoutes from './pages/admin/AdminRoutes';
import AdminNotifications from './pages/admin/AdminNotifications';
import AdminTargets from './pages/admin/AdminTargets';
import Notifications from './pages/Notifications';
import VgeTargets from './pages/VgeTargets';

function PrivateRoute({ children }) {
  const { token } = useUserStore();
  return token ? children : <Navigate to="/login" replace />;
}

function AdminRoute({ children }) {
  const { token, user } = useUserStore();
  if (!token) return <Navigate to="/login" replace />;
  if (user?.role !== 'ADMIN') return <Navigate to="/" replace />;
  return children;
}

export default function App() {
  const { token, user } = useUserStore();
  const { cartOwnerId, clearCart, setCartOwner } = useCartStore();
  const { initSocket, disconnectSocket, fetchNotifications } = useNotificationStore();

  useEffect(() => {
    if (token) {
      initSocket(token);
      fetchNotifications();
    } else {
      disconnectSocket();
    }
  }, [token, initSocket, disconnectSocket, fetchNotifications]);

  useEffect(() => {
    // 🛡️ Anti-leak protection: If the logged-in user doesn't own this cart storage (e.g. they switched accounts in the same browser), wipe it immediately.
    if (user && user.id !== cartOwnerId) {
      clearCart();
      setCartOwner(user.id);
    } else if (!user && cartOwnerId) {
      // If logged out entirely, clear the owner
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
        <Route path="/login" element={<Login />} />
        
        {/* Agent Routes wrapped in Layout */}
        <Route path="/" element={<PrivateRoute><AgentLayout /></PrivateRoute>}>
          <Route index element={<SalesEntry />} />
          <Route path="reports" element={<Reports />} />
          <Route path="profile" element={<Profile />} />
          <Route path="notifications" element={<Notifications />} />
          <Route path="opening-cash" element={<OpeningCashEntry />} />
          <Route path="closing-cash" element={<ClosingCashEntry />} />
          <Route path="agent-inventory/:vehicleId" element={<AgentInventory />} />
          <Route path="today-plan" element={<TodayPlan />} />
          <Route path="targets" element={<VgeTargets />} />
        </Route>

        <Route path="/invoice" element={<PrivateRoute><InvoicePreview /></PrivateRoute>} />
        <Route path="/payment" element={<PrivateRoute><PaymentScreen /></PrivateRoute>} />
        <Route path="/success/:id" element={<PrivateRoute><SuccessScreen /></PrivateRoute>} />
        
        {/* Admin Routes */}
        <Route path="/admin" element={<AdminRoute><AdminLayout /></AdminRoute>}>
          <Route index element={<AdminDashboard />} />
          <Route path="users" element={<AdminUsers />} />
          <Route path="vehicles" element={<AdminVehicles />} />
          <Route path="inventory" element={<AdminInventory />} />
          <Route path="sales" element={<AdminSales />} />
          <Route path="reports" element={<AdminReports />} />
          <Route path="cash" element={<AdminCashManagement />} />
          <Route path="settings" element={<AdminSettings />} />
          <Route path="notifications" element={<AdminNotifications />} />
          <Route path="routes" element={<AdminRoutes />} />
          <Route path="targets" element={<AdminTargets />} />
        </Route>
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}
