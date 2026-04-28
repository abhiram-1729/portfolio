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
  Layout,
  Plus,
  PlayCircle,
  BookOpen,
  Lightbulb,
  ChevronRight,
  Store,
  Sparkles,
  X
} from 'lucide-react';
import adminAPI from '../../services/adminService';
import { storeAPI } from '../../services/api';
import { useUserStore } from '../../store/userStore';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';

export default function TenantDashboard() {
  const navigate = useNavigate();
  const { user } = useUserStore();
  const [stats, setStats] = useState(null);
  const [stores, setStores] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showPrompt, setShowPrompt] = useState(!localStorage.getItem('hideOnboardingPrompt'));

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [statsRes, storesRes] = await Promise.all([
          adminAPI.getDashboardStats(),
          storeAPI.getMyStores()
        ]);
        setStats(statsRes.data);
        setStores(storesRes.data || []);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  const dismissPrompt = () => {
    localStorage.setItem('hideOnboardingPrompt', 'true');
    setShowPrompt(false);
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
        <Loader2 className="animate-spin text-emerald-600" size={40} />
        <p className="text-slate-500 font-bold tracking-widest uppercase text-[10px]">Loading Dashboard...</p>
      </div>
    );
  }

  // If no stores exist, show onboarding content
  if (stores.length === 0) {
    return (
      <div className="max-w-6xl mx-auto space-y-12 pb-20 animate-in fade-in slide-in-from-bottom-4 duration-700">
        {/* Welcome Header */}
        <div className="text-center space-y-4">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-emerald-50 border border-emerald-100 mb-2">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping" />
            <span className="text-[10px] font-black uppercase tracking-[0.2em] text-emerald-700">Account Verified</span>
          </div>
          <h1 className="text-5xl font-black text-emerald-950 tracking-tighter">
            Welcome, {user?.name?.split(' ')[0]}!
          </h1>
          <p className="text-slate-500 font-medium max-w-2xl mx-auto text-lg">
            Your account is ready. Now let's create your first business dashboard to start managing your operations.
          </p>
        </div>

        {/* Main CTA Card */}
        <div className="bg-gradient-to-br from-emerald-600 to-emerald-900 rounded-[3.5rem] p-12 text-white relative overflow-hidden shadow-2xl shadow-emerald-200">
           <div className="absolute top-0 right-0 p-12 opacity-10">
              <Layout size={240} strokeWidth={1} />
           </div>
           <div className="relative z-10 flex flex-col md:flex-row items-center justify-between gap-12">
              <div className="max-w-lg space-y-6">
                 <h2 className="text-4xl font-black tracking-tight leading-none">Ready to Digitise Your Business?</h2>
                 <p className="text-emerald-50/70 font-medium text-lg">
                   Set up your inventory, start billing customers, and track your business growth in real-time.
                 </p>
                 <button 
                  onClick={() => navigate('/create-business')}
                  className="bg-orange-500 hover:bg-orange-600 text-white font-black px-12 py-6 rounded-3xl shadow-2xl shadow-orange-950/20 active:scale-95 transition-all flex items-center gap-3 text-xl group"
                 >
                    <Plus size={28} />
                    Create Business
                    <ChevronRight className="group-hover:translate-x-1 transition-transform" />
                 </button>
              </div>
              <div className="hidden lg:block w-72 h-72 bg-white/10 backdrop-blur-2xl rounded-full border border-white/20 p-8">
                 <div className="w-full h-full bg-white/20 rounded-full flex items-center justify-center">
                    <Store size={100} strokeWidth={1.5} />
                 </div>
              </div>
           </div>
        </div>

        {/* How it helps section */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
           {[
             { 
               title: "Manage Inventory", 
               desc: "Track stock levels, set low-stock alerts, and manage multiple product units effortlessly.",
               icon: <Briefcase className="text-emerald-600" />,
               color: "bg-emerald-50"
             },
             { 
               title: "Quick POS Billing", 
               desc: "Speed up your checkout with our intuitive POS. Share bills on WhatsApp instantly.",
               icon: <TrendingUp className="text-orange-600" />,
               color: "bg-orange-50"
             },
             { 
               title: "Daily Analytics", 
               desc: "Get deep insights into your sales, expenses, and profits with beautiful reports.",
               icon: <PieChart className="text-indigo-600" />,
               color: "bg-indigo-50"
             }
           ].map((item, i) => (
             <div key={i} className="bg-white p-8 rounded-[2.5rem] border border-slate-100 hover:border-emerald-200 transition-all group">
                <div className={`w-14 h-14 rounded-2xl ${item.color} flex items-center justify-center mb-6 group-hover:scale-110 transition-transform`}>
                   {item.icon}
                </div>
                <h3 className="text-xl font-black text-emerald-950 mb-3">{item.title}</h3>
                <p className="text-slate-500 text-sm font-medium leading-relaxed">{item.desc}</p>
             </div>
           ))}
        </div>

        {/* Resources / Tutorials */}
        <div className="pt-12 border-t border-slate-100">
           <h3 className="text-[10px] font-black uppercase tracking-[0.4em] text-emerald-800/40 text-center mb-10">Resources & Tutorials</h3>
           <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="bg-white p-6 rounded-3xl border border-slate-100 flex items-center gap-6 group cursor-pointer hover:bg-slate-50 transition-all">
                 <div className="w-20 h-20 rounded-2xl bg-slate-900 text-white flex items-center justify-center shrink-0">
                    <PlayCircle size={32} />
                 </div>
                 <div>
                    <h4 className="font-black text-emerald-950">Platform Overview</h4>
                    <p className="text-xs text-slate-400 font-bold mt-1 uppercase tracking-tighter">Video Tutorial • 2 Mins</p>
                 </div>
              </div>
              <div className="bg-white p-6 rounded-3xl border border-slate-100 flex items-center gap-6 group cursor-pointer hover:bg-slate-50 transition-all">
                 <div className="w-20 h-20 rounded-2xl bg-emerald-600 text-white flex items-center justify-center shrink-0">
                    <Lightbulb size={32} />
                 </div>
                 <div>
                    <h4 className="font-black text-emerald-950">Business Growth Tips</h4>
                    <p className="text-xs text-slate-400 font-bold mt-1 uppercase tracking-tighter">Reading Material • 5 Mins</p>
                 </div>
              </div>
           </div>
        </div>
      </div>
    );
  }

  const cards = [
    { label: 'Total Stores', value: stores.length, icon: Store, color: 'text-indigo-600', bg: 'bg-indigo-50' },
    { label: 'Field Force', value: stats?.activeUsers || 0, icon: Users, color: 'text-orange-600', bg: 'bg-orange-50' },
    { label: 'Active Fleet', value: stats?.activeVehicles || 0, icon: Truck, color: 'text-emerald-500', bg: 'bg-emerald-50' },
    { label: 'Total Revenue', value: `₹${stats?.totalSales?.toLocaleString() || 0}`, icon: DollarSign, color: 'text-emerald-600', bg: 'bg-emerald-50' },
  ];

  return (
    <div className="space-y-8 max-w-7xl mx-auto pb-12 animate-in fade-in duration-500 relative">
      {/* Attractive Onboarding Prompt for Newish Users */}
      <AnimatePresence>
        {showPrompt && (
          <motion.div 
            initial={{ opacity: 0, y: -20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="bg-emerald-950 text-white p-6 md:p-8 rounded-[3rem] shadow-2xl relative overflow-hidden group border border-emerald-500/30 mb-8"
          >
            <div className="absolute top-[-50%] right-[-10%] w-[400px] h-[400px] bg-emerald-500/10 blur-[100px] rounded-full group-hover:bg-emerald-500/20 transition-all duration-700" />
            <div className="relative z-10 flex flex-col md:flex-row items-center justify-between gap-6">
              <div className="flex items-center gap-6">
                <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-emerald-400 to-emerald-600 flex items-center justify-center text-white shadow-lg shadow-emerald-500/20 shrink-0 animate-bounce-slow">
                  <Sparkles size={32} />
                </div>
                <div>
                  <h2 className="text-2xl font-black tracking-tight flex items-center gap-2">
                    New to VillagKart? 
                    <span className="text-[10px] bg-orange-500 text-white px-2 py-0.5 rounded-full uppercase tracking-[0.2em] animate-pulse">Pro Tip</span>
                  </h2>
                  <p className="text-emerald-50/60 font-medium text-sm max-w-md mt-1">
                    Master the secrets of high-speed inventory and route management in our new Onboarding Center.
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-4 w-full md:w-auto">
                <button 
                  onClick={() => navigate('/tenant/onboarding')}
                  className="flex-1 md:flex-none bg-white text-emerald-950 font-black px-8 py-4 rounded-2xl shadow-xl hover:bg-emerald-50 active:scale-95 transition-all flex items-center justify-center gap-2 group"
                >
                  <PlayCircle size={18} className="group-hover:rotate-12 transition-transform" />
                  Launch Onboarding
                </button>
                <button 
                  onClick={dismissPrompt}
                  className="p-4 text-emerald-400 hover:text-white hover:bg-white/10 rounded-2xl transition-all"
                  title="Don't show this again"
                >
                  <X size={20} />
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Hero Section */}
      <div className="relative overflow-hidden bg-gradient-to-br from-emerald-600 to-emerald-900 rounded-[3rem] p-8 md:p-12 text-white shadow-2xl">
         <div className="absolute top-0 right-0 p-12 opacity-10">
            <Layout size={200} strokeWidth={1} />
         </div>
         <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-8">
            <div className="space-y-4">
               <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-white/10 border border-white/20">
                  <span className="w-2 h-2 rounded-full bg-orange-400 animate-pulse" />
                  <span className="text-[10px] font-black uppercase tracking-[0.2em] text-emerald-50">Strategic Control</span>
               </div>
               <h1 className="text-4xl md:text-5xl font-black tracking-tighter leading-none text-white">
                  Welcome back, <br />
                  <span className="text-orange-400">{user?.name?.split(' ')[0]}</span>
               </h1>
               <p className="text-emerald-50/80 max-w-md font-medium text-sm leading-relaxed">
                  Strategic control center for VillagKart Operations. Monitor expansion, manage administrators, and oversee the fleet network at scale.
               </p>
            </div>
            
            <div className="flex flex-col gap-4">
               <div className="bg-white/10 backdrop-blur-xl p-6 rounded-[2.5rem] border border-white/10 flex items-center gap-4 shadow-2xl">
                  <div className="w-14 h-14 rounded-2xl bg-orange-500 flex items-center justify-center shadow-lg shadow-orange-500/40">
                     <ShieldCheck size={28} />
                  </div>
                  <div>
                     <p className="text-[10px] font-black uppercase tracking-widest text-emerald-100">Access Level</p>
                     <p className="text-2xl font-black uppercase tracking-tight">Tenant Owner</p>
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
            <h3 className="text-2xl font-black text-emerald-950 mb-2 tracking-tight">Operational Insights</h3>
            <p className="text-sm text-slate-500 font-medium max-w-sm mb-8 leading-relaxed">
               Current coverage metrics show stable performance across your operational routes.
            </p>
            <div className="w-full h-3 bg-emerald-50 rounded-full overflow-hidden border border-emerald-100 p-0.5">
               <div className="h-full bg-gradient-to-r from-emerald-500 to-emerald-700 rounded-full" style={{ width: '85%' }} />
            </div>
            <div className="flex justify-between w-full mt-4 text-[10px] font-black text-emerald-400 uppercase tracking-widest">
               <span>Performance</span>
               <span className="text-orange-600 tracking-normal">85% Efficiency</span>
            </div>
         </div>

         <div className="bg-gradient-to-br from-orange-400 to-orange-600 p-8 rounded-[3rem] text-white flex flex-col justify-center relative overflow-hidden group shadow-xl">
            <div className="absolute -bottom-10 -right-10 opacity-10 transition-transform group-hover:scale-110 duration-500">
               <TrendingUp size={240} />
            </div>
            <h2 className="text-3xl font-black mb-4 tracking-tighter">Expand Your Reach</h2>
            <p className="text-orange-50 font-medium mb-8 leading-relaxed text-sm opacity-90">
               Add a new business location or onboard more field staff to increase your daily revenue.
            </p>
            <button 
               onClick={() => navigate('/tenant/stores')}
               className="bg-white text-orange-600 font-black px-10 py-5 rounded-3xl shadow-2xl shadow-orange-900/20 active:scale-95 transition-all w-fit uppercase text-xs tracking-[0.2em]"
            >
               Manage Stores
            </button>
         </div>
      </div>
    </div>
  );
}
