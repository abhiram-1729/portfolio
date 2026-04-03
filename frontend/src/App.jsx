import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { useUserStore } from './store/userStore';
import Login from './pages/Login';
import SalesEntry from './pages/SalesEntry';
import InvoicePreview from './pages/InvoicePreview';
import PaymentScreen from './pages/PaymentScreen';
import SuccessScreen from './pages/SuccessScreen';
import Reports from './pages/Reports';
import Profile from './pages/Profile';
import AgentInventory from './pages/AgentInventory';
import AdminLayout from './components/admin/AdminLayout';
import AdminDashboard from './pages/admin/AdminDashboard';
import AdminUsers from './pages/admin/AdminUsers';
import AdminVehicles from './pages/admin/AdminVehicles';
import AdminInventory from './pages/admin/AdminInventory';
import AdminSales from './pages/admin/AdminSales';
import AdminReports from './pages/admin/AdminReports';
import AdminSettings from './pages/admin/AdminSettings';

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
        <Route path="/" element={<PrivateRoute><SalesEntry /></PrivateRoute>} />
        <Route path="/invoice" element={<PrivateRoute><InvoicePreview /></PrivateRoute>} />
        <Route path="/payment" element={<PrivateRoute><PaymentScreen /></PrivateRoute>} />
        <Route path="/success/:id" element={<PrivateRoute><SuccessScreen /></PrivateRoute>} />
        <Route path="/reports" element={<PrivateRoute><Reports /></PrivateRoute>} />
        <Route path="/profile" element={<PrivateRoute><Profile /></PrivateRoute>} />
        <Route path="/agent-inventory/:vehicleId" element={<PrivateRoute><AgentInventory /></PrivateRoute>} />
        
        {/* Admin Routes */}
        <Route path="/admin" element={<AdminRoute><AdminLayout /></AdminRoute>}>
          <Route index element={<AdminDashboard />} />
          <Route path="users" element={<AdminUsers />} />
          <Route path="vehicles" element={<AdminVehicles />} />
          <Route path="inventory" element={<AdminInventory />} />
          <Route path="sales" element={<AdminSales />} />
          <Route path="reports" element={<AdminReports />} />
          <Route path="settings" element={<AdminSettings />} />
        </Route>
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}
