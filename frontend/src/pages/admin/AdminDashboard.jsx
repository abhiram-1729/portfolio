import React, { useEffect, useState } from 'react';
import {
  Users,
  Truck,
  ShoppingCart,
  DollarSign,
  CreditCard,
  TrendingUp,
  Loader2,
  Coins,
  Target,
  Trophy,
  ChevronRight
} from 'lucide-react';
import { Link } from 'react-router-dom';
import adminAPI from '../../services/adminService';
import { getAdminReconciliation } from '../../services/cashService';
import { format } from 'date-fns';
import toast from 'react-hot-toast';
import { useUserStore } from '../../store/userStore';
import { useSearchParams, useLocation } from 'react-router-dom';
import { Building2, ArrowRight, ChevronLeft } from 'lucide-react';

export default function AdminDashboard() {
  const { user: currentUser } = useUserStore();
  const [stats, setStats] = useState(null);
  const [cashStats, setCashStats] = useState([]);
  const [vgeStats, setVgeStats] = useState([]);
  const [stores, setStores] = useState([]);
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);

  const [searchParams, setSearchParams] = useSearchParams();
  const storeFilterId = searchParams.get('storeId');
  const location = useLocation();

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [statsRes, cashRes, vgeRes, storesRes, usersRes] = await Promise.all([
          adminAPI.getDashboardStats({ storeId: storeFilterId }),
          getAdminReconciliation(format(new Date(), 'yyyy-MM-dd'), storeFilterId),
          adminAPI.vgeAllPerformance({ date: format(new Date(), 'yyyy-MM-dd'), storeId: storeFilterId }),
          adminAPI.getStores(),
          adminAPI.getUsers()
        ]);
        setStats(statsRes.data);
        setCashStats(cashRes);
        setVgeStats(vgeRes.data.slice(0, 3)); // Top 3

        if (storesRes.data?.success) {
          setStores(storesRes.data.data);
        } else {
          setStores(storesRes.data || []);
        }
        setUsers(usersRes.data || []);
      } catch (error) {
        toast.error('Failed to load dashboard data');
        console.error(error);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [storeFilterId]);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
        <Loader2 className="animate-spin text-emerald-600" size={40} />
        <p className="text-gray-500 font-medium tracking-wide">Loading Dashboard...</p>
      </div>
    );
  }

  // Visibility gating
  const isGlobalRole = (currentUser?.role === 'TENANT_OWNER' || currentUser?.role === 'ADMIN' || currentUser?.portalType === 'ADMIN' || currentUser?.portalType === 'SUPERVISOR');

  const renderClassifiedDashboard = () => {
    // If we have a storeId in the URL, we show the detailed dashboard
    if (storeFilterId) return null;

    // Show the branch list if no specific store is selected in the URL
    // This allows global admins to switch branches even if they have a default one assigned
    if (true) {
      const staffByStore = users.reduce((acc, u) => {
        if (u.storeId) {
          acc[u.storeId] = (acc[u.storeId] || 0) + 1;
        }
        return acc;
      }, {});

      return (
        <div className="space-y-6 max-w-5xl mx-auto px-4 py-8 animate-in fade-in slide-in-from-bottom-8 duration-700">
          <div className="flex flex-col gap-2 mb-8">
            <h1 className="text-4xl font-black text-gray-900 tracking-tight">Your Branches</h1>
            <p className="text-gray-500 font-medium">Select a branch to view its Dashboard</p>
          </div>

          <div className="grid gap-4">
            {stores.map(store => (
              <button
                key={store.id}
                onClick={() => setSearchParams({ storeId: store.id })}
                className="group w-full bg-white p-6 rounded-[2rem] border border-gray-100 shadow-sm hover:shadow-2xl hover:border-emerald-200 transition-all duration-500 flex flex-col md:flex-row md:items-center justify-between gap-6 relative overflow-hidden"
              >
                {/* Decorative background element */}
                <div className="absolute right-0 top-0 w-32 h-32 bg-emerald-50 rounded-full -mr-16 -mt-16 group-hover:bg-emerald-100 transition-all duration-500 opacity-50" />

                <div className="flex items-center gap-6 z-10">
                  <div className="w-16 h-16 rounded-[1.25rem] bg-emerald-600 text-white flex items-center justify-center shadow-lg shadow-emerald-200 group-hover:scale-110 transition-transform duration-500">
                    <Building2 size={32} strokeWidth={2.5} />
                  </div>
                  <div className="flex flex-col text-left">
                    <h3 className="text-2xl font-black text-gray-900 tracking-tight mb-1 group-hover:text-emerald-600 transition-colors">{store.name}</h3>
                    <div className="flex items-center gap-3">
                      <span className="text-[10px] font-black bg-emerald-50 text-emerald-700 px-3 py-1 rounded-full uppercase tracking-widest">{store.code || 'Branch'}</span>
                      <span className="text-xs font-bold text-gray-400 uppercase tracking-widest">• {store.stateCode || 'Active'}</span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-12 z-10">
                  <div className="flex flex-col items-end">
                    <span className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] mb-1">Total Personnel</span>
                    <span className="text-xl font-black text-slate-800">{staffByStore[store.id] || 0} <span className="text-xs font-bold text-gray-400">Members</span></span>
                  </div>
                  <div className="w-14 h-14 rounded-2xl bg-gray-50 flex items-center justify-center text-gray-300 group-hover:bg-emerald-600 group-hover:text-white group-hover:translate-x-1 transition-all duration-500">
                    <ArrowRight size={24} strokeWidth={3} />
                  </div>
                </div>
              </button>
            ))}

            {stores.length === 0 && (
              <div className="py-20 text-center bg-white rounded-[3rem] border-2 border-dashed border-gray-100">
                <Building2 size={64} className="mx-auto text-gray-200 mb-4" />
                <p className="text-lg font-black text-gray-400 uppercase tracking-widest">No Branches Configured</p>
                <p className="text-sm text-gray-300 mt-2">Add your first store in Settings to start tracking.</p>
              </div>
            )}
          </div>
        </div>
      );
    }
    return null;
  };

  const hasDashboardView = (currentUser?.permissions?.DASHBOARD || []).includes('READ');
  const showWidget = (key) => isGlobalRole || hasDashboardView;

  const statCards = [
    { key: 'activeVehicles', label: 'Active Vehicles', value: stats?.activeVehicles || 0, icon: Truck, color: 'bg-blue-500' },
    { key: 'activeUsers', label: 'Active Users', value: stats?.activeUsers || 0, icon: Users, color: 'bg-purple-500' },
    { key: 'totalOrders', label: 'Total Orders Today', value: stats?.ordersToday || 0, icon: ShoppingCart, color: 'bg-emerald-500' },
    { key: 'totalSales', label: 'Total Sales Today', value: `₹${stats?.totalSales?.toLocaleString() || 0}`, icon: DollarSign, color: 'bg-orange-500' },
  ].filter(card => showWidget(card.key));

  const paymentData = [
    { mode: 'Cash', amount: stats?.paymentSplits?.CASH || 0 },
    { mode: 'UPI', amount: stats?.paymentSplits?.UPI || 0 },
    { mode: 'Card', amount: stats?.paymentSplits?.CARD || 0 },
  ];

  const totalSales = stats?.totalSales || 1; // Avoid division by zero
  const isOperationalRoute = location.pathname.includes('/tenant') || location.pathname.includes('/admin');

  const classifiedView = renderClassifiedDashboard();
  if (classifiedView) return classifiedView;

  return (
    <div className="max-w-6xl mx-auto space-y-6 pb-12 px-4 md:px-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex flex-col gap-2">
        <div className="flex items-center gap-3">
          {storeFilterId && (
            <button
              onClick={() => setSearchParams({})}
              className="p-2.5 bg-white border border-gray-100 rounded-xl text-gray-400 hover:text-emerald-600 hover:border-emerald-100 transition-all shadow-sm active:scale-90"
              title="Back to All Branches"
            >
              <ChevronLeft size={18} />
            </button>
          )}
          <h2 className="text-2xl font-black text-gray-900 tracking-tight">Dashboard</h2>
        </div>
        <div className="flex items-center gap-2">
          <p className="text-sm text-gray-500">
            Adminizing <span className="text-emerald-600 font-bold">{currentUser?.tenantName || currentUser?.tenant?.name || 'Organization'}</span>
          </p>
          {isOperationalRoute && storeFilterId && (
            <>
              <span className="text-gray-300">•</span>
              <button
                onClick={() => setSearchParams({})}
                className="text-[10px] font-black text-emerald-600 hover:text-emerald-700 uppercase tracking-widest bg-emerald-50 px-2 py-0.5 rounded transition-colors"
              >
                Change Store
              </button>
            </>
          )}
        </div>
      </div>

      {statCards.length > 0 && (
        <div className={`grid grid-cols-2 md:grid-cols-${Math.min(statCards.length, 4)} gap-4`}>
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
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Payment Split Chart */}
        {showWidget('paymentSplit') && (
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
        )}

        {/* Cash Reconciliation Status Widget */}
        {showWidget('cashStatus') && (
          <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm">
            <h3 className="text-lg font-bold text-gray-900 mb-6 flex items-center gap-2">
              <Coins size={20} className="text-emerald-500" />
              Cash Reconciliation Status
            </h3>
            <div className="space-y-3">
              {cashStats.length === 0 ? (
                <p className="text-sm text-gray-400 font-bold text-center py-4 italic">No cash records found for today</p>
              ) : (
                cashStats.slice(0, 5).map((summary) => (
                  <div key={summary.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-xl">
                    <div className="flex flex-col">
                      <span className="text-xs font-bold text-gray-900">{summary.vehicle.vehicleNumber}</span>
                      <span className="text-[10px] text-gray-400 uppercase font-bold">{summary.status}</span>
                    </div>
                    <div className="flex flex-col items-end">
                      <span className="text-xs font-black text-slate-800">₹{summary.actualCash.toLocaleString()}</span>
                      <span className={`text-[10px] font-black ${summary.difference === 0 ? 'text-gray-300' : summary.difference > 0 ? 'text-blue-500' : 'text-rose-500'}`}>
                        {summary.difference === 0 ? 'MATCHED' : summary.difference > 0 ? `+₹${summary.difference}` : `-₹${Math.abs(summary.difference)}`}
                      </span>
                    </div>
                  </div>
                ))
              )}
            </div>
            {cashStats.length > 5 && (
              <p className="text-[10px] text-center text-gray-400 mt-4 font-bold uppercase tracking-widest">
                + {cashStats.length - 5} more vehicles
              </p>
            )}
          </div>
        )}

        {/* VGE Leaderboard Summary */}
        {showWidget('topPerformers') && (
          <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm flex flex-col h-full">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                <Trophy size={20} className="text-amber-500" />
                Top Performers (VGE)
              </h3>
              <Link to="/admin/targets" className="text-[10px] font-black text-emerald-600 hover:text-emerald-700 uppercase tracking-widest flex items-center gap-1 bg-emerald-50 px-3 py-1.5 rounded-xl transition-all">
                View <ChevronRight size={12} />
              </Link>
            </div>

            <div className="space-y-4 flex-1">
              {vgeStats.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-8 opacity-40">
                  <Target size={32} className="text-gray-300 mb-2" />
                  <p className="text-xs font-bold text-gray-400 italic">No sales data yet today</p>
                </div>
              ) : (
                vgeStats.map((p, idx) => (
                  <div key={p.id} className="flex items-center gap-4 p-4 bg-gray-50 rounded-2xl border border-transparent hover:border-emerald-100 transition-all group">
                    <div className={`w-8 h-8 rounded-xl flex items-center justify-center font-black text-sm ${idx === 0 ? 'bg-amber-100 text-amber-600' :
                      idx === 1 ? 'bg-slate-100 text-slate-500' :
                        'bg-orange-100 text-orange-600'
                      }`}>
                      {idx + 1}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-black text-gray-900 truncate">{p.user?.name}</p>
                      <div className="flex items-center gap-2 mt-0.5">
                        <span className="text-[10px] font-bold text-gray-400 uppercase">{p.level}</span>
                        <span className="w-1 h-1 rounded-full bg-gray-300" />
                        <span className="text-[10px] font-bold text-gray-400">{p.completedOrders} Orders</span>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-black text-slate-900">₹{p.totalSales.toLocaleString()}</p>
                      <p className="text-[9px] font-black text-emerald-600 tracking-tight">+₹{p.totalIncentive} Earned</p>
                    </div>
                  </div>
                ))
              )}
            </div>

            {vgeStats.length > 0 && (
              <div className="mt-6 p-4 rounded-2xl bg-gradient-to-tr from-emerald-50 to-emerald-100/30 border border-emerald-100/50">
                <p className="text-[10px] font-black text-emerald-800/80 uppercase tracking-widest text-center">
                  Live Performance Tracking Enabled
                </p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

// Simple cn helper for placeholder
function cn(...inputs) {
  return inputs.filter(Boolean).join(' ');
}
