import React, { useState, useEffect } from 'react';
import { Link, useSearchParams, useLocation } from 'react-router-dom';
import { 
  BarChart3, Package, Layers, Calendar, MapPin, 
  Users, Navigation, Truck, CreditCard, RotateCcw, 
  Zap, Building2, ChevronRight, ChevronLeft, FileText, AlertTriangle
} from 'lucide-react';
import { useUserStore } from '../../store/userStore';
import adminAPI from '../../services/adminService';

const reportModules = [
  { id: 'overview', name: 'Overview', icon: BarChart3, color: 'text-emerald-600', bg: 'bg-emerald-50', desc: 'Real-time sales & profit trends' },
  { id: 'item-wise', name: 'Item-wise Sales', icon: Package, color: 'text-blue-600', bg: 'bg-blue-50', desc: 'SKU level performance audit' },
  { id: 'category-wise', name: 'Category-wise', icon: Layers, color: 'text-purple-600', bg: 'bg-purple-50', desc: 'Sales distribution by group' },
  { id: 'day-wise', name: 'Day-wise Sales', icon: Calendar, color: 'text-orange-600', bg: 'bg-orange-50', desc: 'Historical daily revenue logs' },
  { id: 'route-village', name: 'Route & Village', icon: MapPin, color: 'text-indigo-600', bg: 'bg-indigo-50', desc: 'Geographic sales distribution' },
  { id: 'agent-performance', name: 'Agent Performance', icon: Users, color: 'text-cyan-600', bg: 'bg-cyan-50', desc: 'Agent targets vs achievement' },
  { id: 'location-tracking', name: 'Location Tracking', icon: Navigation, color: 'text-rose-600', bg: 'bg-rose-50', desc: 'Live agent movement audit' },
  { id: 'vehicle-wise', name: 'Substore (Vehicle)', icon: Truck, color: 'text-slate-600', bg: 'bg-slate-50', desc: 'Vehicle-level stock & sales' },
  { id: 'payment-mode', name: 'Payment Mode', icon: CreditCard, color: 'text-pink-600', bg: 'bg-pink-50', desc: 'Cash vs Digital reconciliation' },
  { id: 'returns', name: 'Return Report', icon: RotateCcw, color: 'text-red-600', bg: 'bg-red-50', desc: 'Customer return audit trail' },
  { id: 'damages', name: 'Damage Report', icon: AlertTriangle, color: 'text-amber-600', bg: 'bg-amber-50', desc: 'Loss analysis & deductions' },
  { id: 'sessions', name: 'Session Report', icon: Zap, color: 'text-yellow-600', bg: 'bg-yellow-50', desc: 'Morning vs Afternoon audits' },
  { id: 'invoices', name: 'Invoice Report', icon: FileText, color: 'text-emerald-600', bg: 'bg-emerald-50', desc: 'Detailed transaction history' },
];

export default function AdminReports() {
  const [searchParams, setSearchParams] = useSearchParams();
  const location = useLocation();
  const storeId = searchParams.get('storeId');
  const user = useUserStore(s => s.user);

  const isGlobalRole = user?.role === 'TENANT_OWNER' || user?.role === 'SUPER_ADMIN' || (user?.role === 'ADMIN' && !user?.customRoleId) || user?.portalType === 'ADMIN';

  const getBaseLink = (id) => {
    const basePath = location.pathname.endsWith('/') ? location.pathname : `${location.pathname}/`;
    // We don't necessarily pass storeId here anymore, as the sub-report handles it
    const query = storeId ? `?storeId=${storeId}` : '';
    return `${basePath}${id}${query}`;
  };

  const filteredModules = reportModules.filter(module => {
    if (!user?.customRoleId || user?.role === 'TENANT_OWNER') return true;
    
    const sectionMap = {
      'overview': 'OVERVIEW',
      'item-wise': 'ITEM_WISE',
      'category-wise': 'CATEGORY_WISE',
      'day-wise': 'DAY_WISE',
      'route-village': 'ROUTE_VILLAGE',
      'agent-performance': 'AGENT_PERFORMANCE',
      'location-tracking': 'LOCATION_TRACKING',
      'vehicle-wise': 'VEHICLE_WISE',
      'payment-mode': 'PAYMENT_MODE',
      'returns': 'RETURN',
      'damages': 'DAMAGE',
      'sessions': 'SESSION',
      'invoices': 'INVOICE'
    };
    
    const reqSection = sectionMap[module.id];
    if (reqSection && user?.permissions?.REPORT_TARGET_SECTIONS) {
      return user.permissions.REPORT_TARGET_SECTIONS.includes(reqSection);
    }
    return true;
  });

  return (
    <div className="min-h-screen bg-[#FDFDFD] pb-20">
      <div className="bg-white border-b border-gray-100 sticky top-0 z-30 backdrop-blur-md bg-opacity-80">
        <div className="max-w-[1600px] mx-auto px-6 py-6 flex items-center justify-between">
          <div>
            <div className="flex items-center gap-3 mb-1">
               <div className="p-2.5 rounded-2xl bg-emerald-600 text-white shadow-lg shadow-emerald-200"><BarChart3 size={24} strokeWidth={2.5} /></div>
               <h1 className="text-3xl font-black text-gray-900 tracking-tighter">REPORTING <span className="text-emerald-600">HUB</span></h1>
            </div>
            <p className="text-[10px] font-black text-gray-400 uppercase tracking-[0.3em] ml-1">Enterprise Analytics & Sales Audit Suite</p>
          </div>
        </div>
      </div>

      <div className="max-w-[1600px] mx-auto px-6 py-10">
        <div className="mb-10 flex flex-col md:flex-row md:items-end justify-between gap-4">
          <div>
            <div className="flex items-center gap-3">
               <h2 className="text-2xl font-black text-gray-900 tracking-tight uppercase">Select Audit Module</h2>
            </div>
            <div className="flex items-center gap-3 mt-2">
               <div className="h-1.5 w-20 bg-emerald-600 rounded-full" />
               <p className="text-xs font-bold text-gray-400 uppercase tracking-widest">Global Expenditure Monitoring & Approval Pipeline</p>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {filteredModules.map((module) => (
            <Link 
              key={module.id} 
              to={getBaseLink(module.id)}
              className="group bg-white p-6 rounded-[2.5rem] border border-gray-100 shadow-sm hover:shadow-xl hover:scale-[1.02] transition-all duration-300 flex flex-col h-full"
            >
              <div className={`w-14 h-14 rounded-2xl ${module.bg} ${module.color} flex items-center justify-center mb-6 group-hover:scale-110 transition-transform`}>
                <module.icon size={28} strokeWidth={2.5} />
              </div>
              <h3 className="text-xl font-black text-gray-900 tracking-tight mb-2 group-hover:text-emerald-600 transition-colors">{module.name}</h3>
              <p className="text-xs font-medium text-gray-400 leading-relaxed mb-6">{module.desc}</p>
              <div className="mt-auto flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-emerald-600 opacity-0 group-hover:opacity-100 transition-all transform translate-x-[-10px] group-hover:translate-x-0">
                View Report <BarChart3 size={12} />
              </div>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}
