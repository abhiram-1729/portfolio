import React, { useEffect } from 'react';
import {
  Users, ClipboardList, Truck, Receipt, BookOpen,
  CreditCard, BarChart3, Link2, Building2, ChevronRight, ChevronLeft, RotateCcw,
  ShoppingCart, ShieldCheck, Settings2
} from 'lucide-react';
import { useSearchParams, useLocation } from 'react-router-dom';
import { useUserStore } from '../../store/userStore';
import adminAPI from '../../services/adminService';
import { procurementAPI } from '../../services/procurementService';

// Section Components
import VendorsSection from './admin_procurement/VendorsSection';
import MappingSection from './admin_procurement/MappingSection';
import PurchaseOrdersSection from './admin_procurement/PurchaseOrdersSection';
import GRNSection from './admin_procurement/GRNSection';
import PurchasesSection from './admin_procurement/PurchasesSection';
import StockLedgerSection from './admin_procurement/StockLedgerSection';
import PaymentsSection from './admin_procurement/PaymentsSection';
import ReportsSection from './admin_procurement/ReportsSection';
import RequisitionSection from './admin_procurement/RequisitionSection';
import TransferSection from './admin_procurement/TransferSection';
import WorkOrderSection from './admin_procurement/WorkOrderSection';

const TABS = [
  { key: 'vendors', label: 'Vendors', icon: Users, section: 'VENDORS' },
  { key: 'mapping', label: 'Item Mapping', icon: Link2, section: 'MAPPING' },
  { key: 'requisition', label: 'Requisitions', icon: ShoppingCart, section: 'REQUISITION' },
  { key: 'po', label: 'Purchase Orders', icon: ClipboardList, section: 'PO' },
  { key: 'grn', label: 'Goods Receipt', icon: Truck, section: 'GRN' },
  { key: 'transfers', label: 'Transfers', icon: RotateCcw, section: 'TRANSFERS' },
  { key: 'workorders', label: 'Work Orders', icon: Settings2, section: 'WORKORDERS' },
  { key: 'purchases', label: 'Purchases', icon: Receipt, section: 'PURCHASES' },
  { key: 'ledger', label: 'Stock Ledger', icon: BookOpen, section: 'LEDGER' },
  { key: 'payments', label: 'Payments', icon: CreditCard, section: 'PAYMENTS' },
  { key: 'reports', label: 'Reports', icon: BarChart3, section: 'REPORTS' },
];

// ─── MAIN COMPONENT ─────────────────────────────────────
export default function AdminProcurement() {
  const [searchParams, setSearchParams] = useSearchParams();
  const activeTab = searchParams.get('tab') || 'vendors';
  const storeId = searchParams.get('storeId');
  const user = useUserStore(s => s.user);
  const can = useUserStore(s => s.can);

  const [stores, setStores] = React.useState([]);
  const [branchStats, setBranchStats] = React.useState({});
  const [loading, setLoading] = React.useState(false);

  const isGlobalRole = user?.role === 'TENANT_OWNER' || user?.role === 'SUPER_ADMIN' || (user?.role === 'ADMIN' && !user?.customRoleId) || user?.portalType === 'ADMIN';

  React.useEffect(() => {
    const fetchStores = async () => {
      if (isGlobalRole && !storeId) {
        setLoading(true);
        try {
          const res = await adminAPI.getStores();
          const storeData = res.data?.success ? res.data.data : (res.data || []);
          setStores(storeData);

          // Auto-select if only one store exists
          if (storeData.length === 1 && !storeId) {
            setSearchParams(prev => {
              const p = new URLSearchParams(prev);
              p.set('storeId', storeData[0].id);
              return p;
            });
          }

          // Fetch procurement specific stats
          const stats = {};
          await Promise.all(storeData.map(async (s) => {
            try {
              const [poRes, purRes] = await Promise.all([
                procurementAPI.getPurchaseOrders({ storeId: s.id }),
                procurementAPI.getPurchases({ storeId: s.id })
              ]);
              stats[s.id] = {
                pendingPO: (poRes.data || []).filter(p => p.status === 'PENDING').length,
                totalSpent: (purRes.data || []).reduce((sum, p) => sum + p.totalAmount, 0)
              };
            } catch (e) {
              stats[s.id] = { pendingPO: 0, totalSpent: 0 };
            }
          }));
          setBranchStats(stats);
        } catch (err) {
          console.error(err);
        } finally {
          setLoading(false);
        }
      }
    };
    fetchStores();
  }, [isGlobalRole, storeId]);

  // Handle staff isolation
  React.useEffect(() => {
    if (!isGlobalRole && !storeId && user?.storeId) {
      setSearchParams(prev => {
        const p = new URLSearchParams(prev);
        p.set('storeId', user.storeId);
        return p;
      });
    }
  }, [isGlobalRole, storeId, user]);

  const canViewSection = (sectionKey) => {
    if (!user?.customRoleId || user?.role === 'TENANT_OWNER') return true;
    
    // Check granular permissions first
    const granularPerms = user?.permissions?.PROCUREMENT_SECTIONS?.[sectionKey];
    if (granularPerms?.includes('READ')) return true;

    // Fallback for legacy roles
    if (!user?.permissions?.PROCUREMENT_TARGET_SECTIONS) return true;
    return user.permissions.PROCUREMENT_TARGET_SECTIONS.includes(sectionKey);
  };

  const availableTabs = TABS.filter(tab => canViewSection(tab.section));
  const [headerExtra, setHeaderExtra] = React.useState(null);
  const [hideMainHeader, setHideMainHeader] = React.useState(false);

  useEffect(() => {
    if (availableTabs.length > 0 && !availableTabs.some(t => t.key === activeTab)) {
      setSearchParams({ tab: availableTabs[0].key });
    }
  }, [availableTabs, activeTab, setSearchParams]);

  // Reset hide header when tab changes
  useEffect(() => {
    setHideMainHeader(false);
  }, [activeTab]);

  return (
    <div className="h-[calc(100vh-11rem)] overflow-hidden flex flex-col space-y-3">
      {false && isGlobalRole && !storeId ? (
        <div className="max-w-5xl mx-auto space-y-8 animate-in fade-in duration-700 pb-20">
          <div className="flex flex-col gap-1">
            <h2 className="text-4xl font-black text-gray-900 tracking-tighter uppercase">Procurement Analytics</h2>
            <p className="text-sm font-bold text-gray-400 uppercase tracking-[0.2em] italic">Select a branch to manage its vendor relations & purchase pipeline</p>
          </div>

          <div className="grid grid-cols-1 gap-4">
            {stores.map(store => {
              const stats = branchStats[store.id] || { pendingPO: 0, totalSpent: 0 };
              return (
                <div 
                  key={store.id}
                  onClick={() => setSearchParams({ storeId: store.id })}
                  className="group bg-white p-8 rounded-[2.5rem] border border-gray-100 shadow-sm hover:shadow-2xl hover:shadow-emerald-500/10 hover:border-emerald-100 transition-all cursor-pointer relative overflow-hidden"
                >
                  <div className="absolute top-0 right-0 p-6 opacity-[0.03] group-hover:opacity-[0.08] transition-opacity">
                    <Truck size={120} />
                  </div>

                  <div className="relative z-10 flex items-center justify-between gap-8">
                    <div className="flex items-center gap-6">
                      <div className="w-16 h-16 rounded-3xl bg-emerald-50 text-emerald-600 flex items-center justify-center group-hover:bg-emerald-600 group-hover:text-white transition-all duration-500 shrink-0">
                        <Building2 size={32} strokeWidth={2.5} />
                      </div>
                      <div className="flex flex-col">
                        <h3 className="text-xl font-black text-gray-900 tracking-tight group-hover:text-emerald-600 transition-colors">{store.name}</h3>
                        <div className="flex items-center gap-2 mt-1">
                          <span className="text-[10px] font-black px-2.5 py-0.5 bg-emerald-50 text-emerald-600 rounded-md uppercase tracking-widest">
                            {store.code || 'BRANCH'}
                          </span>
                          <span className="text-xs font-bold text-gray-400 uppercase tracking-tighter flex items-center gap-1.5">
                            • {store.address || 'Location Unspecified'}
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-12">
                      <div className="hidden lg:flex flex-col items-end">
                        <span className="text-[10px] font-black uppercase text-gray-400 tracking-widest">Pending Orders</span>
                        <span className="text-sm font-bold text-gray-900 mt-1">{stats.pendingPO} POs</span>
                      </div>
                      <div className="hidden md:flex flex-col items-end border-l border-gray-100 pl-12">
                        <span className="text-[10px] font-black uppercase text-gray-400 tracking-widest">Total Purchases</span>
                        <span className="text-sm font-bold text-emerald-600 mt-1">₹{stats.totalSpent?.toLocaleString()}</span>
                      </div>
                      <div className="w-12 h-12 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center opacity-40 group-hover:opacity-100 group-hover:bg-emerald-600 group-hover:text-white transition-all">
                        <ChevronRight size={24} strokeWidth={3} />
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      ) : (
        <div key={storeId} className="flex-1 flex flex-col min-h-0 animate-in fade-in duration-700">
          {/* Header */}
          {!hideMainHeader && (
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
              <div className="flex items-center gap-4">
                {false && storeId && stores.length > 1 && (
                  <button
                    onClick={() => setSearchParams({ tab: activeTab })}
                    className="p-3 bg-white border border-gray-100 rounded-2xl text-gray-400 hover:text-emerald-600 hover:border-emerald-100 transition-all shadow-sm active:scale-90"
                    title="Back to Organizational Overview"
                  >
                    <ChevronLeft size={20} />
                  </button>
                )}
                <div className="flex flex-col gap-1">
                  <div className="flex items-center gap-3 flex-wrap">

                    {false && stores.length > 1 && (
                      <select
                        value={storeId || ''}
                        onChange={(e) => {
                          if (e.target.value) {
                            setSearchParams({ storeId: e.target.value, tab: activeTab });
                          } else {
                            setSearchParams({ tab: activeTab });
                          }
                        }}
                        className="bg-emerald-50 text-emerald-700 text-[10px] font-black uppercase tracking-widest pl-3 pr-7 py-1.5 rounded-xl border-none outline-none appearance-none focus:ring-2 focus:ring-emerald-500/20 cursor-pointer shadow-sm"
                        style={{
                          backgroundImage: `url("data:image/svg+xml,%3csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 20 20'%3e%3cpath stroke='%23047857' stroke-linecap='round' stroke-linejoin='round' stroke-width='2' d='M5.25 7.5L10 12.25L14.75 7.5'/%3e%3c/svg%3e")`,
                          backgroundPosition: 'right 0.35rem center',
                          backgroundRepeat: 'no-repeat',
                          backgroundSize: '1.1rem'
                        }}
                      >
                        <option value="">All Branches</option>
                        {stores.map(s => (
                          <option key={s.id} value={s.id}>{s.name}</option>
                        ))}
                      </select>
                    )}
                  </div>

                </div>
              </div>
              <div className="animate-in fade-in slide-in-from-right-4 duration-500">
                {headerExtra}
              </div>
            </div>
          )}

          {/* Tab Content */}
          <div key={storeId} className={`flex-1 flex flex-col min-h-0 animate-in fade-in duration-500 overflow-hidden ${hideMainHeader ? 'mt-0' : ''}`}>
            {activeTab === 'vendors' && canViewSection('VENDORS') && <VendorsSection can={can} setHeaderExtra={setHeaderExtra} setHideMainHeader={setHideMainHeader} storeId={storeId} />}
            {activeTab === 'mapping' && canViewSection('MAPPING') && <MappingSection can={can} setHeaderExtra={setHeaderExtra} setHideMainHeader={setHideMainHeader} storeId={storeId} />}
            {activeTab === 'requisition' && canViewSection('REQUISITION') && <RequisitionSection can={can} setHeaderExtra={setHeaderExtra} setHideMainHeader={setHideMainHeader} storeId={storeId} />}
            {activeTab === 'po' && canViewSection('PO') && <PurchaseOrdersSection can={can} setHeaderExtra={setHeaderExtra} setHideMainHeader={setHideMainHeader} storeId={storeId} />}
            {activeTab === 'grn' && canViewSection('GRN') && <GRNSection can={can} setHeaderExtra={setHeaderExtra} setHideMainHeader={setHideMainHeader} storeId={storeId} />}
            {activeTab === 'transfers' && canViewSection('TRANSFERS') && <TransferSection can={can} setHeaderExtra={setHeaderExtra} setHideMainHeader={setHideMainHeader} storeId={storeId} />}
            {activeTab === 'workorders' && canViewSection('WORKORDERS') && <WorkOrderSection can={can} setHeaderExtra={setHeaderExtra} setHideMainHeader={setHideMainHeader} storeId={storeId} />}
            {activeTab === 'purchases' && canViewSection('PURCHASES') && <PurchasesSection can={can} setHeaderExtra={setHeaderExtra} setHideMainHeader={setHideMainHeader} storeId={storeId} />}
            {activeTab === 'ledger' && canViewSection('LEDGER') && <StockLedgerSection setHeaderExtra={setHeaderExtra} setHideMainHeader={setHideMainHeader} storeId={storeId} />}
            {activeTab === 'payments' && canViewSection('PAYMENTS') && <PaymentsSection can={can} setHeaderExtra={setHeaderExtra} setHideMainHeader={setHideMainHeader} storeId={storeId} />}
            {activeTab === 'reports' && canViewSection('REPORTS') && <ReportsSection setHeaderExtra={setHeaderExtra} setHideMainHeader={setHideMainHeader} storeId={storeId} />}
          </div>
        </div>
      )}
    </div>
  );
}
