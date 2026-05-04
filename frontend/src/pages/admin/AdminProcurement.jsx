import React, { useEffect } from 'react';
import {
  Users, ClipboardList, Truck, Receipt, BookOpen,
  CreditCard, BarChart3, Link2
} from 'lucide-react';
import { useSearchParams } from 'react-router-dom';
import { useUserStore } from '../../store/userStore';

// Section Components
import VendorsSection from './admin_procurement/VendorsSection';
import MappingSection from './admin_procurement/MappingSection';
import PurchaseOrdersSection from './admin_procurement/PurchaseOrdersSection';
import GRNSection from './admin_procurement/GRNSection';
import PurchasesSection from './admin_procurement/PurchasesSection';
import StockLedgerSection from './admin_procurement/StockLedgerSection';
import PaymentsSection from './admin_procurement/PaymentsSection';
import ReportsSection from './admin_procurement/ReportsSection';

const TABS = [
  { key: 'vendors', label: 'Vendors', icon: Users, section: 'VENDORS' },
  { key: 'mapping', label: 'Item Mapping', icon: Link2, section: 'MAPPING' },
  { key: 'po', label: 'Purchase Orders', icon: ClipboardList, section: 'PO' },
  { key: 'grn', label: 'Goods Receipt', icon: Truck, section: 'GRN' },
  { key: 'purchases', label: 'Purchases', icon: Receipt, section: 'PURCHASES' },
  { key: 'ledger', label: 'Stock Ledger', icon: BookOpen, section: 'LEDGER' },
  { key: 'payments', label: 'Payments', icon: CreditCard, section: 'PAYMENTS' },
  { key: 'reports', label: 'Reports', icon: BarChart3, section: 'REPORTS' },
];

// ─── MAIN COMPONENT ─────────────────────────────────────
export default function AdminProcurement() {
  const [searchParams, setSearchParams] = useSearchParams();
  const activeTab = searchParams.get('tab') || 'vendors';
  const user = useUserStore(s => s.user);
  const can = useUserStore(s => s.can);

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

  useEffect(() => {
    if (availableTabs.length > 0 && !availableTabs.some(t => t.key === activeTab)) {
      setSearchParams({ tab: availableTabs[0].key });
    }
  }, [availableTabs, activeTab, setSearchParams]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex flex-col gap-1">
          <h2 className="text-2xl font-black text-gray-900 tracking-tight">Procurement & Payables</h2>
          <p className="text-sm text-gray-400 font-bold">Vendor → PO → GRN → Purchase → Stock → Payment</p>
        </div>
        <div className="animate-in fade-in slide-in-from-right-4 duration-500">
          {headerExtra}
        </div>
      </div>

      {/* Tab Content */}
      <div className="animate-in fade-in duration-500">
        {activeTab === 'vendors' && canViewSection('VENDORS') && <VendorsSection can={can} setHeaderExtra={setHeaderExtra} />}
        {activeTab === 'mapping' && canViewSection('MAPPING') && <MappingSection can={can} setHeaderExtra={setHeaderExtra} />}
        {activeTab === 'po' && canViewSection('PO') && <PurchaseOrdersSection can={can} setHeaderExtra={setHeaderExtra} />}
        {activeTab === 'grn' && canViewSection('GRN') && <GRNSection can={can} setHeaderExtra={setHeaderExtra} />}
        {activeTab === 'purchases' && canViewSection('PURCHASES') && <PurchasesSection can={can} setHeaderExtra={setHeaderExtra} />}
        {activeTab === 'ledger' && canViewSection('LEDGER') && <StockLedgerSection setHeaderExtra={setHeaderExtra} />}
        {activeTab === 'payments' && canViewSection('PAYMENTS') && <PaymentsSection can={can} setHeaderExtra={setHeaderExtra} />}
        {activeTab === 'reports' && canViewSection('REPORTS') && <ReportsSection setHeaderExtra={setHeaderExtra} />}
      </div>
    </div>
  );
}
