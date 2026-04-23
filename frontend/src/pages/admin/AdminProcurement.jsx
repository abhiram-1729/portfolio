import React from 'react';
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
  { key: 'vendors', label: 'Vendors', icon: Users },
  { key: 'mapping', label: 'Item Mapping', icon: Link2 },
  { key: 'po', label: 'Purchase Orders', icon: ClipboardList },
  { key: 'grn', label: 'Goods Receipt', icon: Truck },
  { key: 'purchases', label: 'Purchases', icon: Receipt },
  { key: 'ledger', label: 'Stock Ledger', icon: BookOpen },
  { key: 'payments', label: 'Payments', icon: CreditCard },
  { key: 'reports', label: 'Reports', icon: BarChart3 },
];

// ─── MAIN COMPONENT ─────────────────────────────────────
export default function AdminProcurement() {
  const [searchParams] = useSearchParams();
  const activeTab = searchParams.get('tab') || 'vendors';
  const can = useUserStore(s => s.can);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-1">
        <h2 className="text-2xl font-black text-gray-900 tracking-tight">Procurement & Payables</h2>
        <p className="text-sm text-gray-400 font-bold">Vendor → PO → GRN → Purchase → Stock → Payment</p>
      </div>

      {/* Tab Content */}
      <div className="animate-in fade-in duration-500">
        {activeTab === 'vendors' && <VendorsSection can={can} />}
        {activeTab === 'mapping' && <MappingSection can={can} />}
        {activeTab === 'po' && <PurchaseOrdersSection can={can} />}
        {activeTab === 'grn' && <GRNSection can={can} />}
        {activeTab === 'purchases' && <PurchasesSection can={can} />}
        {activeTab === 'ledger' && <StockLedgerSection />}
        {activeTab === 'payments' && <PaymentsSection can={can} />}
        {activeTab === 'reports' && <ReportsSection />}
      </div>
    </div>
  );
}
