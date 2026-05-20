import React from 'react';
import { 
  PlayCircle, 
  BookOpen, 
  Lightbulb, 
  ChevronRight, 
  Store, 
  Briefcase, 
  TrendingUp, 
  PieChart,
  Layout,
  Plus,
  ShieldCheck,
  Smartphone,
  Users
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export default function TenantOnboarding() {
  const navigate = useNavigate();

  return (
    <div className="h-[calc(100vh-160px)] flex flex-col gap-6 animate-in fade-in duration-700 overflow-hidden">
      {/* Header - Compact */}
      <div className="flex items-end justify-between px-2">
        <div>
          <h1 className="text-3xl font-black text-emerald-950 tracking-tighter">
            Onboarding & Help
          </h1>
          <p className="text-slate-400 font-bold text-xs uppercase tracking-widest mt-1">Master your business dashboard</p>
        </div>
        <button 
          onClick={() => navigate('/create-business')}
          className="bg-emerald-600 hover:bg-emerald-700 text-white font-black px-6 py-3 rounded-xl shadow-lg shadow-emerald-200 active:scale-95 transition-all flex items-center gap-2 text-xs uppercase tracking-widest"
        >
          <Plus size={16} />
          Add Business
        </button>
      </div>

      {/* Main Grid - Designed to fit in one screen */}
      <div className="flex-1 grid grid-cols-12 gap-6 min-h-0">
        
        {/* Left Column: Guides & Deep Dives (60%) */}
        <div className="col-span-8 flex flex-col gap-6 min-h-0">
          <div className="grid grid-cols-2 gap-4 flex-1 min-h-0">
            {[
              { 
                title: "Inventory Mastery", 
                desc: "Bulk import products, manage categories, and track stock transfers.",
                icon: <Briefcase className="text-emerald-600" />,
                color: "bg-emerald-50",
                border: "border-emerald-100"
              },
              { 
                title: "POS Efficiency", 
                desc: "Tips for faster billing and integrating with field printers.",
                icon: <TrendingUp className="text-orange-600" />,
                color: "bg-orange-50",
                border: "border-orange-100"
              },
              { 
                title: "Data Analytics", 
                desc: "Interpret your sales heatmaps and agent performance reports.",
                icon: <PieChart className="text-indigo-600" />,
                color: "bg-indigo-50",
                border: "border-indigo-100"
              },
              { 
                title: "Agent Management", 
                desc: "How to onboard, track, and optimize your field force operations.",
                icon: <Users className="text-rose-600" />,
                color: "bg-rose-50",
                border: "border-rose-100"
              }
            ].map((item, i) => (
              <div key={i} className={`p-5 rounded-[2rem] border ${item.border} bg-white flex flex-col gap-3 group hover:shadow-xl transition-all min-h-0 justify-center`}>
                <div className={`w-10 h-10 rounded-xl ${item.color} flex items-center justify-center shrink-0 group-hover:scale-110 transition-transform`}>
                   {item.icon}
                </div>
                <div>
                   <h3 className="text-sm font-black text-emerald-950 mb-1">{item.title}</h3>
                   <p className="text-slate-500 text-[11px] font-medium leading-relaxed">{item.desc}</p>
                </div>
              </div>
            ))}
          </div>

          {/* Video Section - Horizontal & Compact */}
          <div className="bg-white rounded-[2rem] border border-slate-100 p-5 space-y-4">
             <div className="flex items-center justify-between">
                <h3 className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-400">Video Tutorials</h3>
                <span className="text-[9px] font-black text-emerald-600 hover:underline cursor-pointer">View All</span>
             </div>
             <div className="grid grid-cols-3 gap-4">
                {[
                  "Setting up Stores",
                  "Agent Onboarding",
                  "Fleet Management"
                ].map((video, i) => (
                  <div key={i} className="group cursor-pointer">
                    <div className="aspect-video bg-slate-900 rounded-2xl flex items-center justify-center text-white relative overflow-hidden">
                       <PlayCircle size={32} className="opacity-50 group-hover:opacity-100 transition-all z-10" />
                       <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
                    </div>
                    <p className="mt-2 text-[10px] font-black text-emerald-950 truncate px-1">{video}</p>
                  </div>
                ))}
             </div>
          </div>
        </div>

        {/* Right Column: Key Benefits & Growth (40%) */}
        <div className="col-span-4 flex flex-col gap-6">
          <div className="flex-1 bg-gradient-to-br from-emerald-600 to-emerald-900 rounded-[2.5rem] p-6 text-white relative overflow-hidden shadow-xl shadow-emerald-100">
             <div className="absolute -bottom-10 -right-10 opacity-10">
                <Store size={180} />
             </div>
             <div className="relative z-10 h-full flex flex-col justify-between">
                <div className="space-y-4">
                  <div className="w-12 h-12 rounded-2xl bg-white/10 backdrop-blur-xl flex items-center justify-center border border-white/20">
                    <ShieldCheck size={24} />
                  </div>
                  <h2 className="text-xl font-black tracking-tight leading-tight">Scale Your Digital Network</h2>
                  <p className="text-emerald-50/60 font-medium text-xs leading-relaxed">
                    VillagKart helps you digitize every aspect of your small business ecosystem.
                  </p>
                </div>
                
                <div className="space-y-3 pt-6 border-t border-white/10">
                   {[
                     { label: "Multilingual POS", icon: <Smartphone size={12} /> },
                     { label: "Stock Visibility", icon: <Layout size={12} /> },
                     { label: "Revenue Tracking", icon: <TrendingUp size={12} /> }
                   ].map((f, i) => (
                     <div key={i} className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-emerald-100">
                        {f.icon}
                        {f.label}
                     </div>
                   ))}
                </div>
             </div>
          </div>

          <div className="bg-orange-50 border border-orange-100 p-6 rounded-[2.5rem] flex flex-col items-center text-center gap-3">
             <div className="w-12 h-12 rounded-2xl bg-orange-500 text-white flex items-center justify-center shadow-lg shadow-orange-200">
                <Lightbulb size={24} />
             </div>
             <h4 className="font-black text-emerald-950 text-sm">Growth Tip</h4>
             <p className="text-[10px] font-bold text-orange-800 leading-relaxed">
               Onboard at least 3 routes in your first week to see 40% growth in efficiency.
             </p>
          </div>
        </div>

      </div>
    </div>
  );
}
