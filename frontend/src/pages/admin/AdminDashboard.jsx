import React, { useEffect, useState } from 'react';
import { 
  Users, 
  Truck, 
  ShoppingCart, 
  DollarSign, 
  CreditCard,
  TrendingUp,
  Loader2
} from 'lucide-react';
import adminAPI from '../../services/adminService';
import toast from 'react-hot-toast';

export default function AdminDashboard() {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const { data } = await adminAPI.getDashboardStats();
        setStats(data);
      } catch (error) {
        toast.error('Failed to load dashboard stats');
        console.error(error);
      } finally {
        setLoading(false);
      }
    };
    fetchStats();
  }, []);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
        <Loader2 className="animate-spin text-emerald-600" size={40} />
        <p className="text-gray-500 font-medium tracking-wide">Loading Dashboard...</p>
      </div>
    );
  }

  const statCards = [
    { label: 'Active Vehicles', value: stats?.activeVehicles || 0, icon: Truck, color: 'bg-blue-500' },
    { label: 'Active Users', value: stats?.activeUsers || 0, icon: Users, color: 'bg-purple-500' },
    { label: 'Total Orders Today', value: stats?.ordersToday || 0, icon: ShoppingCart, color: 'bg-emerald-500' },
    { label: 'Total Sales Today', value: `₹${stats?.totalSales?.toLocaleString() || 0}`, icon: DollarSign, color: 'bg-orange-500' },
  ];

  const paymentData = [
    { mode: 'Cash', amount: stats?.paymentSplits?.CASH || 0 },
    { mode: 'UPI', amount: stats?.paymentSplits?.UPI || 0 },
    { mode: 'Card', amount: stats?.paymentSplits?.CARD || 0 },
  ];

  const totalSales = stats?.totalSales || 1; // Avoid division by zero

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-2">
        <h2 className="text-2xl font-bold text-gray-900">Dashboard</h2>
        <p className="text-sm text-gray-500">Quick overview of your operations today</p>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {statCards.map((stat) => (
          <div key={stat.label} className="bg-white p-4 rounded-2xl border border-gray-100 shadow-sm flex flex-col gap-3">
            <div className={cn("w-10 h-10 rounded-xl flex items-center justify-center text-white", stat.color)}>
              <stat.icon size={20} />
            </div>
            <div className="flex flex-col">
              <span className="text-2xl font-bold text-gray-900">{stat.value}</span>
              <span className="text-[10px] uppercase tracking-wider font-semibold text-gray-400">{stat.label}</span>
            </div>
          </div>
        ))}
      </div>

      <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm">
        <h3 className="text-lg font-bold text-gray-900 mb-6 flex items-center gap-2">
          <CreditCard size={20} className="text-emerald-500" />
          Payment Split
        </h3>
        <div className="space-y-4">
          {paymentData.map((item) => (
            <div key={item.mode} className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className="font-medium text-gray-700">{item.mode}</span>
                <span className="font-bold text-gray-900">₹{item.amount.toLocaleString()}</span>
              </div>
              <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                <div 
                  className="h-full bg-emerald-500 rounded-full transition-all duration-500" 
                  style={{ width: `${(item.amount / totalSales) * 100}%` }}
                />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// Simple cn helper for placeholder
function cn(...inputs) {
  return inputs.filter(Boolean).join(' ');
}
