import React, { useEffect, useState } from 'react';
import { 
  Briefcase, 
  Users, 
  Truck, 
  TrendingUp, 
  DollarSign, 
  ShieldCheck, 
  ArrowUpRight,
  Loader2,
  PieChart,
  Layout
} from 'lucide-react';
import adminAPI from '../../services/adminService';
import { useUserStore } from '../../store/userStore';

export default function TenantDashboard() {
  const { user } = useUserStore();
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const { data } = await adminAPI.getDashboardStats();
        setStats(data);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchStats();
  }, []);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
        <Loader2 className="animate-spin text-indigo-600" size={40} />
        <p className="text-slate-500 font-bold tracking-widest uppercase text-[10px]">Loading Organization Data...</p>
      </div>
    );
  }

  const cards = [
    { label: 'Executive Admins', value: '3', icon: Briefcase, color: 'text-emerald-600', bg: 'bg-emerald-50' },
    { label: 'Field Force', value: stats?.activeUsers || 0, icon: Users, color: 'text-orange-600', bg: 'bg-orange-50' },
    { label: 'Active Fleet', value: stats?.activeVehicles || 0, icon: Truck, color: 'text-emerald-500', bg: 'bg-emerald-50' },
    { label: 'Total Revenue', value: `₹${stats?.totalSales?.toLocaleString() || 0}`, icon: DollarSign, color: 'text-orange-500', bg: 'bg-orange-50' },
  ];

  return (
    <div className="space-y-8 max-w-7xl mx-auto pb-12">
      {/* Hero Section */}
      <div className="relative overflow-hidden bg-gradient-to-br from-emerald-600 to-emerald-900 rounded-[3rem] p-8 md:p-12 text-white shadow-2xl">
         <div className="absolute top-0 right-0 p-12 opacity-10">
            <Layout size={200} strokeWidth={1} />
         </div>
         <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-8">
            <div className="space-y-4">
               <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-white/10 border border-white/20">
                  <span className="w-2 h-2 rounded-full bg-orange-400 animate-pulse" />
                  <span className="text-[10px] font-black uppercase tracking-[0.2em] text-emerald-50">Organization Head</span>
               </div>
               <h1 className="text-4xl md:text-5xl font-black tracking-tighter leading-none text-white">
                  Welcome to <br />
                  <span className="text-orange-400">{user?.tenantName || 'Your Organization'}</span>
               </h1>
               <p className="text-emerald-50/80 max-w-md font-medium text-sm leading-relaxed">
                  Strategic control center for VillagKart Operations. Monitor expansion, managing administrators, and oversee the fleet network at scale.
               </p>
            </div>
            
            <div className="flex flex-col gap-4">
               <div className="bg-white/10 backdrop-blur-xl p-6 rounded-[2.5rem] border border-white/10 flex items-center gap-4 shadow-2xl">
                  <div className="w-14 h-14 rounded-2xl bg-orange-500 flex items-center justify-center shadow-lg shadow-orange-500/40">
                     <ShieldCheck size={28} />
                  </div>
                  <div>
                     <p className="text-[10px] font-black uppercase tracking-widest text-emerald-100">Access Level</p>
                     <p className="text-2xl font-black uppercase tracking-tight">Organization</p>
                  </div>
               </div>
            </div>
         </div>
      </div>

      {/* Grid Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        {cards.map((card, i) => (
          <div key={i} className="bg-white p-6 rounded-[2.5rem] border border-emerald-50 shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all duration-300 group">
             <div className="flex justify-between items-start mb-6">
                <div className={`p-4 rounded-3xl ${card.bg} ${card.color} transition-colors group-hover:bg-emerald-600 group-hover:text-white`}>
                   <card.icon size={24} />
                </div>
                <div className="w-8 h-8 rounded-full bg-emerald-50 flex items-center justify-center text-emerald-300">
                   <ArrowUpRight size={16} />
                </div>
             </div>
             <div>
                <h3 className="text-3xl font-black text-emerald-950 mb-1">{card.value}</h3>
                <p className="text-[10px] font-black uppercase tracking-widest text-emerald-400">{card.label}</p>
             </div>
          </div>
        ))}
      </div>

      {/* Secondary Insight Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
         <div className="bg-white p-8 rounded-[3rem] border border-emerald-50 shadow-sm flex flex-col items-center text-center">
            <div className="w-20 h-20 rounded-full bg-orange-50 flex items-center justify-center text-orange-600 mb-6">
               <PieChart size={40} />
            </div>
            <h3 className="text-2xl font-black text-emerald-950 mb-2 tracking-tight">Expansion Dynamics</h3>
            <p className="text-sm text-slate-500 font-medium max-w-sm mb-8 leading-relaxed">
               Current coverage metrics show high performance across all 12 operational routes.
            </p>
            <div className="w-full h-3 bg-emerald-50 rounded-full overflow-hidden border border-emerald-100 p-0.5">
               <div className="h-full bg-gradient-to-r from-emerald-500 to-emerald-700 rounded-full" style={{ width: '85%' }} />
            </div>
            <div className="flex justify-between w-full mt-4 text-[10px] font-black text-emerald-400 uppercase tracking-widest">
               <span>Performance</span>
               <span className="text-orange-600 tracking-normal">85% High Efficiency</span>
            </div>
         </div>

         <div className="bg-gradient-to-br from-orange-400 to-orange-600 p-8 rounded-[3rem] text-white flex flex-col justify-center relative overflow-hidden group shadow-xl">
            <div className="absolute -bottom-10 -right-10 opacity-10 transition-transform group-hover:scale-110 duration-500">
               <TrendingUp size={240} />
            </div>
            <h2 className="text-3xl font-black mb-4 tracking-tighter">Scale Your Operation</h2>
            <p className="text-orange-50 font-medium mb-8 leading-relaxed text-sm opacity-90">
               Ready to expand? Onboard a new regional administrator to oversee multiple routes and field agents.
            </p>
            <button className="bg-white text-orange-600 font-black px-10 py-5 rounded-3xl shadow-2xl shadow-orange-900/20 active:scale-95 transition-all w-fit uppercase text-xs tracking-[0.2em]">
               Onboard Admin
            </button>
         </div>
      </div>
    </div>
  );
}
