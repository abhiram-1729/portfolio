import React, { useState, useEffect } from 'react';
import {
  Shield, Plus, Pencil, Trash2, Users, X, Loader2, Check,
  ChevronRight, Key, Save, AlertTriangle, CheckCircle2, XCircle,
  Truck, ShoppingCart, PieChart, Receipt, Target, Eye, EyeOff, LayoutGrid, Coins, Grid, MapPin,
  Package, Wallet, BarChart, ClipboardList, BarChart3, Settings
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import adminAPI from '../../services/adminService';
import toast from 'react-hot-toast';

const DASHBOARD_WIDGETS = [
  { key: 'activeVehicles', label: 'Active Vehicles', desc: 'Real-time fleet tracking', icon: Truck },
  { key: 'activeUsers', label: 'Active Users', desc: 'Current online staff', icon: Users },
  { key: 'totalOrders', label: 'Total Orders Today', desc: 'Daily transaction count', icon: ShoppingCart },
  { key: 'totalSales', label: 'Total Sales Today', desc: 'Daily revenue analytics', icon: Coins },
  { key: 'paymentSplit', label: 'Payment Split', desc: 'Cash vs Digital breakdown', icon: PieChart },
  { key: 'cashStatus', label: 'Cash Reconciliation', desc: 'Safe & register audit', icon: Receipt },
  { key: 'topPerformers', label: 'Top Performers (VGE)', desc: 'Agent leaderboard', icon: Target },
];

const MODULES = [
  { key: 'DASHBOARD', label: 'Dashboard', desc: 'Main overview & metrics', categories: ['ADMIN', 'AGENT', 'SUPERVISOR', 'HELPER'] },
  { key: 'STAFF', label: 'Staff Management', desc: 'Admin, Agents & Field Force', categories: ['ADMIN', 'SUPERVISOR'] },
  { key: 'VEHICLES', label: 'Fleet Management', desc: 'Vehicles & Assets', categories: ['ADMIN', 'SUPERVISOR'] },
  { key: 'SALES', label: 'Sales', desc: 'Order management', categories: ['ADMIN', 'AGENT'] },
  { key: 'TARGETS', label: 'Targets', desc: 'VGE incentives', categories: ['ADMIN', 'SUPERVISOR'] },
  { key: 'ASSETS', label: 'Assets', desc: 'Equipment tracking', categories: ['ADMIN', 'HELPER'] },
  { key: 'EXPENSES', label: 'Expenses', desc: 'Reimbursements', categories: ['ADMIN', 'AGENT'] },
  { key: 'NOTIFICATIONS', label: 'Notifications', desc: 'Alert management', categories: ['ADMIN', 'AGENT', 'SUPERVISOR', 'HELPER'] },
  { key: 'HR', label: 'HR', desc: 'Attendance, Leave, Payroll', categories: ['ADMIN', 'SUPERVISOR'] },
  { key: 'SETTINGS', label: 'Settings', desc: 'System configuration', categories: ['ADMIN'] },
];

const INVENTORY_SECTIONS = [
  { key: 'MASTER', label: 'Master Registry', desc: 'Product database & pricing' },
  { key: 'STORE_STOCK', label: 'Store Stock', desc: 'Main warehouse inventory' },
  { key: 'VEHICLE_STOCK', label: 'Vehicle Stock', desc: 'Substore & agent inventory' },
  { key: 'LOADING', label: 'Loading Operations', desc: 'Stock issuance to vehicles' },
  { key: 'RETURN', label: 'Return Ops', desc: 'Stock returns from vehicles' },
  { key: 'REFILLS', label: 'Stock Refills', desc: 'Refilling vehicle substores' },
  { key: 'DAMAGE', label: 'Damage/Loss', desc: 'Damage reporting & audits' },
  { key: 'AUDITS', label: 'Audit History', desc: 'Stock audit logs' }
];

const CASH_SECTIONS_LIST = [
  { key: 'STORE_SAFE', label: 'Store Safe', desc: 'Safe management & transfers' },
  { key: 'RECONCILIATION', label: 'Daily Reconciliation', desc: 'End of day cash audit' },
  { key: 'LIVE_CASH', label: 'Live Cash Status', desc: 'Real-time register balances' },
  { key: 'AUDIT_LEDGER', label: 'Audit Ledger', desc: 'Transaction history logs' },
  { key: 'SHIFT_DEPOSIT', label: 'Shift Deposit', desc: 'Bank deposit tracking' }
];

const EXPENSE_SECTIONS_LIST = [
  { key: 'MONITORING', label: 'Expense Monitoring', desc: 'View all expense submissions' },
  { key: 'APPROVAL', label: 'Expense Approval', desc: 'Approve, reject, and return expenses' },
  { key: 'SETTINGS', label: 'Expense Settings', desc: 'Manage categories, limits & policies' }
];


const PROCUREMENT_SECTIONS_LIST = [
  { key: 'VENDORS', label: 'Vendors', desc: 'Vendor management' },
  { key: 'MAPPING', label: 'Item Mapping', desc: 'Product-Vendor mapping' },
  { key: 'PO', label: 'Purchase Orders', desc: 'Order generation' },
  { key: 'GRN', label: 'Goods Receipt', desc: 'Stock entry' },
  { key: 'PURCHASES', label: 'Purchases', desc: 'Purchase invoicing' },
  { key: 'LEDGER', label: 'Stock Ledger', desc: 'Procurement history' },
  { key: 'PAYMENTS', label: 'Payments', desc: 'Vendor payouts' },
  { key: 'REPORTS', label: 'Reports', desc: 'Procurement analytics' }
];

const SETTINGS_SECTIONS = [
  { key: 'POS_CONFIG', label: 'POS Configuration', desc: 'Billing UI & invoice templates' },
  { key: 'POS_TERMINAL', label: 'POS Terminal Access', desc: 'Direct link to POS interface' }
];

const PORTAL_TYPES = [
  { key: 'ADMIN', label: 'VillagKart Admin', desc: 'Full backend access', icon: Shield, color: 'emerald' },
  { key: 'AGENT', label: 'Agent Portal', desc: 'Sales & Field activities', icon: Users, color: 'blue' },
  { key: 'SUPERVISOR', label: 'Supervisor Portal', desc: 'Branch management', icon: Key, color: 'amber' },
  { key: 'HELPER', label: 'Helper Portal', desc: 'Logistics support', icon: Plus, color: 'rose' },
];

const ACTIONS = [
  { key: 'READ', label: 'View', color: 'emerald' },
  { key: 'CREATE', label: 'Create', color: 'blue' },
  { key: 'UPDATE', label: 'Edit', color: 'amber' },
  { key: 'DELETE', label: 'Delete', color: 'rose' },
  { key: 'TOGGLE_STATUS', label: 'Status', color: 'purple' },
];

export default function TenantPrivileges() {
  const [roles, setRoles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedRole, setSelectedRole] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState(null);

  // Form state
  const [formName, setFormName] = useState('');
  const [formDesc, setFormDesc] = useState('');
  const [formPerms, setFormPerms] = useState({});
  const [formPortalType, setFormPortalType] = useState('ADMIN');

  useEffect(() => {
    fetchRoles();
  }, []);

  const fetchRoles = async () => {
    setLoading(true);
    try {
      const res = await adminAPI.getRoles();
      setRoles(res.data?.data || []);
    } catch (err) {
      toast.error('Failed to load roles');
    } finally {
      setLoading(false);
    }
  };

  const openCreateModal = () => {
    setIsEditing(false);
    setFormName('');
    setFormDesc('');
    setFormPerms({});
    setFormPortalType('ADMIN');
    setShowModal(true);
  };

  const openEditModal = (role) => {
    setIsEditing(true);
    setSelectedRole(role);
    setFormName(role.name);
    setFormDesc(role.description || '');
    setFormPerms(role.permissions || {});
    setFormPortalType(role.portalType || 'ADMIN');
    setShowModal(true);
  };




  const toggleRouteSection = (sectionKey) => {
    setFormPerms(prev => {
      const current = prev.ROUTE_TARGET_SECTIONS || [];
      const has = current.includes(sectionKey);
      return {
        ...prev,
        ROUTE_TARGET_SECTIONS: has
          ? current.filter(s => s !== sectionKey)
          : [...current, sectionKey]
      };
    });
  };

  const toggleInventorySectionPermission = (sectionKey, actionKey) => {
    setFormPerms(prev => {
      const sections = prev.INVENTORY_SECTIONS || {};
      const current = sections[sectionKey] || [];
      const has = current.includes(actionKey);

      const nextPerms = has
        ? current.filter(a => a !== actionKey)
        : [...current, actionKey];

      return {
        ...prev,
        INVENTORY_SECTIONS: {
          ...sections,
          [sectionKey]: nextPerms
        },
        // Ensure top-level INVENTORY READ is enabled for sidebar visibility
        INVENTORY: (prev.INVENTORY || []).includes('READ') ? prev.INVENTORY : [...(prev.INVENTORY || []), 'READ']
      };
    });
  };

  const toggleAllForInventorySection = (sectionKey) => {
    setFormPerms(prev => {
      const sections = prev.INVENTORY_SECTIONS || {};
      const current = sections[sectionKey] || [];
      const allSelected = ACTIONS.every(a => current.includes(a.key));

      return {
        ...prev,
        INVENTORY_SECTIONS: {
          ...sections,
          [sectionKey]: allSelected ? [] : ACTIONS.map(a => a.key)
        },
        INVENTORY: (prev.INVENTORY || []).includes('READ') ? prev.INVENTORY : [...(prev.INVENTORY || []), 'READ']
      };
    });
  };

  const toggleReportSection = (sectionKey) => {
    setFormPerms(prev => {
      const current = prev.REPORT_TARGET_SECTIONS || [];
      const has = current.includes(sectionKey);
      return {
        ...prev,
        REPORT_TARGET_SECTIONS: has
          ? current.filter(s => s !== sectionKey)
          : [...current, sectionKey],
        REPORTS: (prev.REPORTS || []).includes('READ') ? prev.REPORTS : [...(prev.REPORTS || []), 'READ']
      };
    });
  };

  const toggleCashSectionPermission = (sectionKey, actionKey) => {
    setFormPerms(prev => {
      const sections = prev.CASH_SECTIONS || {};
      const current = sections[sectionKey] || [];
      const has = current.includes(actionKey);

      const nextPerms = has
        ? current.filter(a => a !== actionKey)
        : [...current, actionKey];

      return {
        ...prev,
        CASH_SECTIONS: {
          ...sections,
          [sectionKey]: nextPerms
        },
        CASH: (prev.CASH || []).includes('READ') ? prev.CASH : [...(prev.CASH || []), 'READ']
      };
    });
  };

  const toggleAllForCashSection = (sectionKey) => {
    setFormPerms(prev => {
      const sections = prev.CASH_SECTIONS || {};
      const current = sections[sectionKey] || [];
      const allSelected = ACTIONS.every(a => current.includes(a.key));

      return {
        ...prev,
        CASH_SECTIONS: {
          ...sections,
          [sectionKey]: allSelected ? [] : ACTIONS.map(a => a.key)
        },
        CASH: (prev.CASH || []).includes('READ') ? prev.CASH : [...(prev.CASH || []), 'READ']
      };
    });
  };

  const toggleProcurementSectionPermission = (sectionKey, actionKey) => {
    setFormPerms(prev => {
      const sections = prev.PROCUREMENT_SECTIONS || {};
      const current = sections[sectionKey] || [];
      const has = current.includes(actionKey);

      const nextPerms = has
        ? current.filter(a => a !== actionKey)
        : [...current, actionKey];

      return {
        ...prev,
        PROCUREMENT_SECTIONS: {
          ...sections,
          [sectionKey]: nextPerms
        },
        PROCUREMENT: (prev.PROCUREMENT || []).includes('READ') ? prev.PROCUREMENT : [...(prev.PROCUREMENT || []), 'READ']
      };
    });
  };

  const toggleAllForProcurementSection = (sectionKey) => {
    setFormPerms(prev => {
      const sections = prev.PROCUREMENT_SECTIONS || {};
      const current = sections[sectionKey] || [];
      const allSelected = ACTIONS.every(a => current.includes(a.key));

      return {
        ...prev,
        PROCUREMENT_SECTIONS: {
          ...sections,
          [sectionKey]: allSelected ? [] : ACTIONS.map(a => a.key)
        },
        PROCUREMENT: (prev.PROCUREMENT || []).includes('READ') ? prev.PROCUREMENT : [...(prev.PROCUREMENT || []), 'READ']
      };
    });
  };

  const toggleSettingsSection = (sectionKey) => {
    setFormPerms(prev => {
      const current = prev.SETTINGS_TARGET_SECTIONS || [];
      const has = current.includes(sectionKey);
      const modPerms = prev.SETTINGS || [];
      
      return {
        ...prev,
        SETTINGS_TARGET_SECTIONS: has
          ? current.filter(s => s !== sectionKey)
          : [...current, sectionKey],
        SETTINGS: modPerms.includes('READ') ? modPerms : [...modPerms, 'READ']
      };
    });
  };

  const toggleProcurementSection = (sectionKey) => {
    setFormPerms(prev => {
      const current = prev.PROCUREMENT_TARGET_SECTIONS || [];
      const has = current.includes(sectionKey);
      return {
        ...prev,
        PROCUREMENT_TARGET_SECTIONS: has
          ? current.filter(s => s !== sectionKey)
          : [...current, sectionKey]
      };
    });
  };

  const togglePermission = (moduleKey, actionKey) => {
    setFormPerms(prev => {
      const current = prev[moduleKey] || [];
      const has = current.includes(actionKey);
      const nextPerms = has
        ? current.filter(a => a !== actionKey)
        : [...current, actionKey];

      let updated = {
        ...prev,
        [moduleKey]: nextPerms
      };

      // Auto-toggle dashboard widgets based on Dashboard View permission
      if (moduleKey === 'DASHBOARD' && actionKey === 'READ') {
        updated.DASHBOARD_WIDGETS = nextPerms.includes('READ')
          ? DASHBOARD_WIDGETS.map(w => w.key)
          : [];
      }

      return updated;
    });
  };

  const toggleAllForModule = (moduleKey) => {
    setFormPerms(prev => {
      const current = prev[moduleKey] || [];
      const allSelected = ACTIONS.every(a => current.includes(a.key));
      return {
        ...prev,
        [moduleKey]: allSelected ? [] : ACTIONS.map(a => a.key)
      };
    });
  };

  const selectAllPermissions = () => {
    const all = {};
    MODULES.forEach(m => { all[m.key] = ACTIONS.map(a => a.key); });
    all.DASHBOARD = ['READ'];
    all.STAFF = ACTIONS.map(a => a.key);
    all.VEHICLES = ACTIONS.map(a => a.key);
    all.ROUTES = ACTIONS.map(a => a.key);
    all.INVENTORY = ['READ'];
    all.INVENTORY_SECTIONS = {};
    INVENTORY_SECTIONS.forEach(s => {
      all.INVENTORY_SECTIONS[s.key] = ACTIONS.map(a => a.key);
    });

    all.ROUTE_TARGET_SECTIONS = ['VILLAGES', 'ROUTES', 'ASSIGNMENTS'];
    all.INVENTORY_TARGET_SECTIONS = ['MASTER', 'STORE_STOCK', 'VEHICLE_STOCK', 'LOADING', 'RETURN', 'REFILLS', 'DAMAGE', 'AUDITS'];
    all.CASH_TARGET_SECTIONS = ['STORE_SAFE', 'RECONCILIATION', 'LIVE_CASH', 'AUDIT_LEDGER', 'SHIFT_DEPOSIT'];
    all.REPORT_TARGET_SECTIONS = ['OVERVIEW', 'ITEM_WISE', 'CATEGORY_WISE', 'DAY_WISE', 'ROUTE_VILLAGE', 'AGENT_PERFORMANCE', 'LOCATION_TRACKING', 'VEHICLE_WISE', 'PAYMENT_MODE', 'RETURN', 'DAMAGE', 'SESSION', 'INVOICE'];
    all.PROCUREMENT_TARGET_SECTIONS = ['VENDORS', 'MAPPING', 'PO', 'GRN', 'PURCHASES', 'LEDGER', 'PAYMENTS', 'REPORTS'];
    all.SETTINGS_TARGET_SECTIONS = ['POS_CONFIG', 'POS_TERMINAL'];
    all.DASHBOARD_WIDGETS = DASHBOARD_WIDGETS.map(w => w.key);
    setFormPerms(all);
  };

  const clearAllPermissions = () => {
    setFormPerms({
      DASHBOARD_WIDGETS: [],
      INVENTORY_SECTIONS: {},
      ROUTE_TARGET_SECTIONS: [],
      INVENTORY_TARGET_SECTIONS: [],
      CASH_TARGET_SECTIONS: [],
      REPORT_TARGET_SECTIONS: [],
      PROCUREMENT_TARGET_SECTIONS: [],
      SETTINGS_TARGET_SECTIONS: []
    });
  };

  const handleSave = async () => {
    if (!formName.trim()) {
      toast.error('Role name is required');
      return;
    }
    setSaving(true);
    try {
      if (isEditing && selectedRole) {
        await adminAPI.updateRole(selectedRole.id, {
          name: formName,
          description: formDesc,
          permissions: formPerms,
          portalType: formPortalType
        });
        toast.success('Role updated');
      } else {
        await adminAPI.createRole({
          name: formName,
          description: formDesc,
          permissions: formPerms,
          portalType: formPortalType
        });
        toast.success('Role created');
      }
      setShowModal(false);
      fetchRoles();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to save role');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id) => {
    if (!confirm('Are you sure you want to delete this role?')) return;
    setDeletingId(id);
    try {
      await adminAPI.deleteRole(id);
      toast.success('Role deleted');
      fetchRoles();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to delete role');
    } finally {
      setDeletingId(null);
    }
  };

  const getPermCount = (perms) => {
    if (!perms) return 0;
    return Object.values(perms).reduce((acc, arr) => acc + (Array.isArray(arr) ? arr.length : 0), 0);
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
        <Loader2 className="animate-spin text-emerald-600" size={40} />
        <p className="text-gray-400 font-bold text-sm uppercase tracking-widest">Loading Privileges...</p>
      </div>
    );
  }

  if (showModal) {
    return (
      <div className="space-y-6 max-w-5xl mx-auto animate-in fade-in duration-300">
        <div className="flex items-center gap-4">
          <button
            onClick={() => setShowModal(false)}
            className="w-10 h-10 bg-white border border-gray-200 rounded-xl flex items-center justify-center text-gray-500 hover:bg-gray-50 transition-all shadow-sm"
          >
            <ChevronRight className="rotate-180" size={20} />
          </button>
          <div>
            <h2 className="text-2xl font-black text-gray-900 tracking-tight">
              {isEditing ? 'Edit Role' : 'Create New Role'}
            </h2>
            <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">
              Define access privileges
            </p>
          </div>
        </div>

        <div className="bg-white rounded-[2rem] border border-gray-100 shadow-sm overflow-hidden flex flex-col">
          <div className="p-8 space-y-8">
            {/* Role Info */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-[10px] font-black uppercase tracking-widest text-gray-400 pl-1">Role Name *</label>
                <input
                  type="text"
                  placeholder="e.g., Field Manager"
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                  className="w-full bg-gray-50 border border-gray-100 rounded-xl px-4 py-3 text-sm font-bold text-gray-900 focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-200 outline-none transition-all"
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-[10px] font-black uppercase tracking-widest text-gray-400 pl-1">Portal Type *</label>
                <select
                  value={formPortalType}
                  onChange={(e) => setFormPortalType(e.target.value)}
                  className="w-full bg-gray-50 border border-gray-100 rounded-xl px-4 py-3 text-sm font-bold text-gray-900 focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-200 outline-none transition-all appearance-none"
                >
                  {PORTAL_TYPES.map(pt => (
                    <option key={pt.key} value={pt.key}>{pt.label}</option>
                  ))}
                </select>
              </div>
            </div>
            <div className="space-y-1.5">
              <label className="text-[10px] font-black uppercase tracking-widest text-gray-400 pl-1">Description</label>
              <input
                type="text"
                placeholder="Brief description..."
                value={formDesc}
                onChange={(e) => setFormDesc(e.target.value)}
                className="w-full bg-gray-50 border border-gray-100 rounded-xl px-4 py-3 text-sm font-bold text-gray-900 focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-200 outline-none transition-all"
              />
            </div>

            {/* Quick Actions */}
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-black text-gray-900 uppercase tracking-widest flex items-center gap-2">
                <Key size={14} className="text-emerald-600" /> Permission Matrix
              </h3>
              <div className="flex gap-2">
                <button onClick={selectAllPermissions} className="text-[9px] font-black text-emerald-600 bg-emerald-50 px-3 py-1.5 rounded-lg border border-emerald-100 hover:bg-emerald-100 transition-all uppercase tracking-widest">
                  Select All
                </button>
                <button onClick={clearAllPermissions} className="text-[9px] font-black text-gray-400 bg-gray-50 px-3 py-1.5 rounded-lg border border-gray-100 hover:bg-gray-100 transition-all uppercase tracking-widest">
                  Clear All
                </button>
              </div>
            </div>

            {/* Permission Matrix */}
            <div className="space-y-6">
              <div className="space-y-3">
                <div className="flex items-center gap-2 px-2 py-1.5 rounded-lg border w-fit bg-emerald-50 border-emerald-100 text-emerald-600">
                  <Shield size={14} />
                  <span className="text-[10px] font-black uppercase tracking-widest">All System Privileges</span>
                </div>

                <div className="space-y-2">
                  {/* Desktop Header */}
                  <div className="hidden sm:grid grid-cols-[1fr_repeat(5,60px)_40px] gap-2 px-4 pb-1 border-b border-gray-50">
                    <span className="text-[8px] font-black text-gray-400 uppercase tracking-widest">Module</span>
                    {ACTIONS.map(a => (
                      <span key={a.key} className="text-[8px] font-black text-gray-400 uppercase tracking-widest text-center">{a.label}</span>
                    ))}
                    <span className="text-[8px] font-black text-gray-400 uppercase tracking-widest text-center">All</span>
                  </div>

                  {MODULES.filter(mod => mod.categories.includes(formPortalType)).map((mod) => {
                    const modulePerms = formPerms[mod.key] || [];
                    const allSelected = ACTIONS.every(a => modulePerms.includes(a.key));
                    const someSelected = modulePerms.length > 0;

                    return (
                      <div
                        key={mod.key}
                        className={`grid grid-cols-[1fr_repeat(5,60px)_40px] gap-2 items-center px-4 py-3 rounded-2xl border transition-all ${someSelected ? 'bg-emerald-50/30 border-emerald-100/50' : 'bg-gray-50/50 border-gray-100/50 hover:bg-gray-50'
                          }`}
                      >
                        {/* Module Name */}
                        <div className="flex flex-col min-w-0">
                          <span className="text-xs font-black text-gray-800 uppercase tracking-tight truncate">{mod.label}</span>
                          <span className="text-[8px] text-gray-400 font-bold hidden sm:block truncate">{mod.desc}</span>
                        </div>

                        {/* Action Checkboxes */}
                        {ACTIONS.map((action, idx) => {
                          const isChecked = modulePerms.includes(action.key);
                          const isDisabled = mod.key === 'DASHBOARD' && action.key !== 'READ';

                          if (isDisabled) {
                            return (
                              <div key={`${mod.key}-${action.key}`} className="w-10 h-10 mx-auto flex items-center justify-center opacity-10">
                                <XCircle size={18} strokeWidth={2.5} className="text-gray-200" />
                              </div>
                            );
                          }

                          return (
                            <button
                              key={`${mod.key}-${action.key}`}
                              onClick={() => togglePermission(mod.key, action.key)}
                              className={`w-10 h-10 mx-auto rounded-xl flex items-center justify-center transition-all border ${isChecked
                                ? `bg-emerald-500 text-white border-emerald-500 shadow-lg shadow-emerald-500/20`
                                : 'bg-white border-gray-200 text-gray-300 hover:border-gray-300'
                                }`}
                              style={isChecked ? {
                                backgroundColor: '#10b981',
                                borderColor: '#10b981',
                                color: 'white'
                              } : {}}
                            >
                              {isChecked ? <CheckCircle2 size={18} strokeWidth={3} /> : <XCircle size={18} strokeWidth={2.5} className="text-rose-500" />}
                            </button>
                          );
                        })}

                        {/* Toggle All */}
                        {mod.key === 'DASHBOARD' ? (
                          <div className="w-8 h-8 mx-auto" />
                        ) : (
                          <button
                            onClick={() => toggleAllForModule(mod.key)}
                            className={`w-8 h-8 mx-auto rounded-lg flex items-center justify-center transition-all text-[8px] font-black uppercase ${allSelected
                              ? 'bg-emerald-600 text-white'
                              : 'bg-gray-100 text-gray-400 hover:bg-gray-200'
                              }`}
                          >
                            {allSelected ? <Check size={12} strokeWidth={3} /> : 'All'}
                          </button>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>


              {/* Granular Business Modules */}
              <div className="space-y-6 pt-8 border-t border-gray-100">
                <div className="flex items-center gap-3">
                  <div className="p-2.5 rounded-2xl bg-emerald-50 text-emerald-600">
                    <Grid size={20} strokeWidth={2.5} />
                  </div>
                  <div>
                    <h3 className="text-sm font-black text-gray-900 uppercase tracking-tight">Business Operations</h3>
                    <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mt-0.5">Granular Section Visibility</p>
                  </div>
                </div>

                <div className="space-y-4">
                  {/* Granular Inventory Table */}
                  <div className="bg-white rounded-3xl border border-gray-100 p-6 space-y-6 shadow-sm hover:border-emerald-100 transition-all">
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                      <div className="flex items-center gap-4">
                        <div className="w-12 h-12 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
                          <Package size={24} />
                        </div>
                        <div>
                          <h4 className="text-sm font-black text-gray-900 uppercase tracking-tight">Inventory Management</h4>
                          <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Granular Section Controls</p>
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <button
                          onClick={() => {
                            const sections = {};
                            INVENTORY_SECTIONS.forEach(s => { sections[s.key] = ACTIONS.map(a => a.key); });
                            setFormPerms(prev => ({ ...prev, INVENTORY: ['READ'], INVENTORY_SECTIONS: sections }));
                          }}
                          className="text-[9px] font-black text-emerald-600 bg-emerald-50 px-3 py-1.5 rounded-lg border border-emerald-100 hover:bg-emerald-100 transition-all uppercase tracking-widest"
                        >
                          Select All Sections
                        </button>
                      </div>
                    </div>

                    <div className="space-y-2 border-t border-gray-50 pt-4">
                      {/* Sub-table Header */}
                      <div className="grid grid-cols-[1fr_repeat(5,60px)_40px] gap-2 px-4 py-2 border-b border-gray-50">
                        <span className="text-[8px] font-black text-gray-400 uppercase tracking-widest">Inventory Section</span>
                        {ACTIONS.map(a => (
                          <span key={a.key} className="text-[8px] font-black text-gray-400 uppercase tracking-widest text-center">{a.label}</span>
                        ))}
                        <span className="text-[8px] font-black text-gray-400 uppercase tracking-widest text-center">All</span>
                      </div>

                      {INVENTORY_SECTIONS.map((section) => {
                        const sectionPerms = (formPerms.INVENTORY_SECTIONS || {})[section.key] || [];
                        const allSelected = ACTIONS.every(a => sectionPerms.includes(a.key));
                        const someSelected = sectionPerms.length > 0;

                        return (
                          <div
                            key={section.key}
                            className={`grid grid-cols-[1fr_repeat(5,60px)_40px] gap-2 items-center px-4 py-2 rounded-xl transition-all ${someSelected ? 'bg-emerald-50/20' : 'hover:bg-gray-50/50'
                              }`}
                          >
                            <div className="flex flex-col min-w-0">
                              <span className="text-[11px] font-black text-gray-800 uppercase tracking-tight truncate">{section.label}</span>
                              <span className="text-[7px] text-gray-400 font-bold uppercase tracking-widest truncate">{section.desc}</span>
                            </div>

                            {ACTIONS.map(action => {
                              const isChecked = sectionPerms.includes(action.key);
                              return (
                                <button
                                  key={`${section.key}-${action.key}`}
                                  onClick={() => toggleInventorySectionPermission(section.key, action.key)}
                                  className={`w-9 h-9 mx-auto rounded-xl flex items-center justify-center transition-all border ${isChecked
                                    ? `bg-emerald-500 text-white border-emerald-500 shadow-md`
                                    : 'bg-white border-gray-100 text-gray-200 hover:border-gray-200'
                                    }`}
                                >
                                  {isChecked ? <CheckCircle2 size={16} strokeWidth={3} /> : <XCircle size={16} strokeWidth={2.5} className="text-rose-400 opacity-20" />}
                                </button>
                              );
                            })}

                            <button
                              onClick={() => toggleAllForInventorySection(section.key)}
                              className={`w-8 h-8 mx-auto rounded-lg flex items-center justify-center transition-all text-[8px] font-black uppercase ${allSelected
                                ? 'bg-emerald-600 text-white'
                                : 'bg-gray-100 text-gray-400 hover:bg-gray-200'
                                }`}
                            >
                              {allSelected ? <Check size={12} strokeWidth={3} /> : 'All'}
                            </button>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {/* Granular Cash Flow Table */}
                  <div className="bg-white rounded-3xl border border-gray-100 p-6 space-y-6 shadow-sm hover:border-emerald-100 transition-all">
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                      <div className="flex items-center gap-4">
                        <div className="w-12 h-12 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
                          <Coins size={24} />
                        </div>
                        <div>
                          <h4 className="text-sm font-black text-gray-900 uppercase tracking-tight">Cash Flow</h4>
                          <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Reconciliation & Safe Control</p>
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <button
                          onClick={() => {
                            const sections = {};
                            CASH_SECTIONS_LIST.forEach(s => { sections[s.key] = ACTIONS.map(a => a.key); });
                            setFormPerms(prev => ({ ...prev, CASH: ['READ'], CASH_SECTIONS: sections }));
                          }}
                          className="text-[9px] font-black text-emerald-600 bg-emerald-50 px-3 py-1.5 rounded-lg border border-emerald-100 hover:bg-emerald-100 transition-all uppercase tracking-widest"
                        >
                          Select All Sections
                        </button>
                      </div>
                    </div>

                    <div className="space-y-2 border-t border-gray-50 pt-4">
                      <div className="grid grid-cols-[1fr_repeat(5,60px)_40px] gap-2 px-4 py-2 border-b border-gray-50">
                        <span className="text-[8px] font-black text-gray-400 uppercase tracking-widest">Cash Section</span>
                        {ACTIONS.map(a => (
                          <span key={a.key} className="text-[8px] font-black text-gray-400 uppercase tracking-widest text-center">{a.label}</span>
                        ))}
                        <span className="text-[8px] font-black text-gray-400 uppercase tracking-widest text-center">All</span>
                      </div>

                      {CASH_SECTIONS_LIST.map((section) => {
                        const sectionPerms = (formPerms.CASH_SECTIONS || {})[section.key] || [];
                        const allSelected = ACTIONS.every(a => sectionPerms.includes(a.key));
                        const someSelected = sectionPerms.length > 0;

                        return (
                          <div
                            key={section.key}
                            className={`grid grid-cols-[1fr_repeat(5,60px)_40px] gap-2 items-center px-4 py-2 rounded-xl transition-all ${someSelected ? 'bg-emerald-50/20' : 'hover:bg-gray-50/50'
                              }`}
                          >
                            <div className="flex flex-col min-w-0">
                              <span className="text-[11px] font-black text-gray-800 uppercase tracking-tight truncate">{section.label}</span>
                              <span className="text-[7px] text-gray-400 font-bold uppercase tracking-widest truncate">{section.desc}</span>
                            </div>

                            {ACTIONS.map(action => {
                              const isChecked = sectionPerms.includes(action.key);
                              return (
                                <button
                                  key={`${section.key}-${action.key}`}
                                  onClick={() => toggleCashSectionPermission(section.key, action.key)}
                                  className={`w-9 h-9 mx-auto rounded-xl flex items-center justify-center transition-all border ${isChecked
                                    ? `bg-emerald-500 text-white border-emerald-500 shadow-md`
                                    : 'bg-white border-gray-100 text-gray-200 hover:border-gray-200'
                                    }`}
                                >
                                  {isChecked ? <CheckCircle2 size={16} strokeWidth={3} /> : <XCircle size={16} strokeWidth={2.5} className="text-rose-400 opacity-20" />}
                                </button>
                              );
                            })}

                            <button
                              onClick={() => toggleAllForCashSection(section.key)}
                              className={`w-8 h-8 mx-auto rounded-lg flex items-center justify-center transition-all text-[8px] font-black uppercase ${allSelected
                                ? 'bg-emerald-600 text-white'
                                : 'bg-gray-100 text-gray-400 hover:bg-gray-200'
                                }`}
                            >
                              {allSelected ? <Check size={12} strokeWidth={3} /> : 'All'}
                            </button>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {/* Granular Expense Sections Table */}
                  <div className="bg-white rounded-3xl border border-gray-100 p-6 space-y-6 shadow-sm hover:border-emerald-100 transition-all">
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                      <div className="flex items-center gap-4">
                        <div className="w-12 h-12 rounded-2xl bg-rose-50 text-rose-600 flex items-center justify-center">
                          <Receipt size={24} />
                        </div>
                        <div>
                          <h4 className="text-sm font-black text-gray-900 uppercase tracking-tight">Expense Control</h4>
                          <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Granular approval & monitoring access</p>
                        </div>
                      </div>
                      <button
                        onClick={() => {
                          const sections = {};
                          EXPENSE_SECTIONS_LIST.forEach(s => { sections[s.key] = ACTIONS.map(a => a.key); });
                          setFormPerms(prev => ({ ...prev, EXPENSES: ['READ', 'UPDATE'], EXPENSE_SECTIONS: sections }));
                        }}
                        className="text-[9px] font-black text-emerald-600 bg-emerald-50 px-3 py-1.5 rounded-lg border border-emerald-100 hover:bg-emerald-100 transition-all uppercase tracking-widest"
                      >
                        Select All Sections
                      </button>
                    </div>

                    <div className="space-y-2 border-t border-gray-50 pt-4">
                      <div className="grid grid-cols-[1fr_repeat(5,60px)_40px] gap-2 px-4 py-2 border-b border-gray-50">
                        <span className="text-[8px] font-black text-gray-400 uppercase tracking-widest">Expense Section</span>
                        {ACTIONS.map(a => (
                          <span key={a.key} className="text-[8px] font-black text-gray-400 uppercase tracking-widest text-center">{a.label}</span>
                        ))}
                        <span className="text-[8px] font-black text-gray-400 uppercase tracking-widest text-center">All</span>
                      </div>
                      {EXPENSE_SECTIONS_LIST.map((section) => {
                        const sectionPerms = (formPerms.EXPENSE_SECTIONS || {})[section.key] || [];
                        const allSelected = ACTIONS.every(a => sectionPerms.includes(a.key));
                        const someSelected = sectionPerms.length > 0;
                        return (
                          <div key={section.key} className={`grid grid-cols-[1fr_repeat(5,60px)_40px] gap-2 items-center px-4 py-2 rounded-xl transition-all ${someSelected ? 'bg-rose-50/20' : 'hover:bg-gray-50/50'}`}>
                            <div className="flex flex-col min-w-0">
                              <span className="text-[11px] font-black text-gray-800 uppercase tracking-tight truncate">{section.label}</span>
                              <span className="text-[7px] text-gray-400 font-bold uppercase tracking-widest truncate">{section.desc}</span>
                            </div>
                            {ACTIONS.map(action => {
                              const isChecked = sectionPerms.includes(action.key);
                              return (
                                <button
                                  key={`exp-${section.key}-${action.key}`}
                                  onClick={() => setFormPerms(prev => {
                                    const sections = prev.EXPENSE_SECTIONS || {};
                                    const cur = sections[section.key] || [];
                                    const next = cur.includes(action.key) ? cur.filter(a => a !== action.key) : [...cur, action.key];
                                    return { ...prev, EXPENSE_SECTIONS: { ...sections, [section.key]: next }, EXPENSES: (prev.EXPENSES || []).includes('READ') ? prev.EXPENSES : [...(prev.EXPENSES || []), 'READ'] };
                                  })}
                                  className={`w-9 h-9 mx-auto rounded-xl flex items-center justify-center transition-all border ${isChecked ? 'bg-rose-500 text-white border-rose-500 shadow-md' : 'bg-white border-gray-100 text-gray-200 hover:border-gray-200'}`}
                                >
                                  {isChecked ? <CheckCircle2 size={16} strokeWidth={3} /> : <XCircle size={16} strokeWidth={2.5} className="text-rose-400 opacity-20" />}
                                </button>
                              );
                            })}
                            <button
                              onClick={() => setFormPerms(prev => {
                                const sections = prev.EXPENSE_SECTIONS || {};
                                const cur = sections[section.key] || [];
                                const allSel = ACTIONS.every(a => cur.includes(a.key));
                                return { ...prev, EXPENSE_SECTIONS: { ...sections, [section.key]: allSel ? [] : ACTIONS.map(a => a.key) }, EXPENSES: (prev.EXPENSES || []).includes('READ') ? prev.EXPENSES : [...(prev.EXPENSES || []), 'READ'] };
                              })}
                              className={`w-8 h-8 mx-auto rounded-lg flex items-center justify-center transition-all text-[8px] font-black uppercase ${allSelected ? 'bg-rose-600 text-white' : 'bg-gray-100 text-gray-400 hover:bg-gray-200'}`}
                            >
                              {allSelected ? <Check size={12} strokeWidth={3} /> : 'All'}
                            </button>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {/* Granular Procurement Table */}
                  <div className="bg-white rounded-3xl border border-gray-100 p-6 space-y-6 shadow-sm hover:border-emerald-100 transition-all">
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                      <div className="flex items-center gap-4">
                        <div className="w-12 h-12 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
                          <ClipboardList size={24} />
                        </div>
                        <div>
                          <h4 className="text-sm font-black text-gray-900 uppercase tracking-tight">Procurement</h4>
                          <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Vendor & Purchase Management</p>
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <button
                          onClick={() => {
                            const sections = {};
                            PROCUREMENT_SECTIONS_LIST.forEach(s => { sections[s.key] = ACTIONS.map(a => a.key); });
                            setFormPerms(prev => ({ ...prev, PROCUREMENT: ['READ'], PROCUREMENT_SECTIONS: sections }));
                          }}
                          className="text-[9px] font-black text-emerald-600 bg-emerald-50 px-3 py-1.5 rounded-lg border border-emerald-100 hover:bg-emerald-100 transition-all uppercase tracking-widest"
                        >
                          Select All Sections
                        </button>
                      </div>
                    </div>

                    <div className="space-y-2 border-t border-gray-50 pt-4">
                      <div className="grid grid-cols-[1fr_repeat(5,60px)_40px] gap-2 px-4 py-2 border-b border-gray-50">
                        <span className="text-[8px] font-black text-gray-400 uppercase tracking-widest">Procurement Section</span>
                        {ACTIONS.map(a => (
                          <span key={a.key} className="text-[8px] font-black text-gray-400 uppercase tracking-widest text-center">{a.label}</span>
                        ))}
                        <span className="text-[8px] font-black text-gray-400 uppercase tracking-widest text-center">All</span>
                      </div>

                      {PROCUREMENT_SECTIONS_LIST.map((section) => {
                        const sectionPerms = (formPerms.PROCUREMENT_SECTIONS || {})[section.key] || [];
                        const allSelected = ACTIONS.every(a => sectionPerms.includes(a.key));
                        const someSelected = sectionPerms.length > 0;

                        return (
                          <div
                            key={section.key}
                            className={`grid grid-cols-[1fr_repeat(5,60px)_40px] gap-2 items-center px-4 py-2 rounded-xl transition-all ${someSelected ? 'bg-emerald-50/20' : 'hover:bg-gray-50/50'
                              }`}
                          >
                            <div className="flex flex-col min-w-0">
                              <span className="text-[11px] font-black text-gray-800 uppercase tracking-tight truncate">{section.label}</span>
                              <span className="text-[7px] text-gray-400 font-bold uppercase tracking-widest truncate">{section.desc}</span>
                            </div>

                            {ACTIONS.map(action => {
                              const isChecked = sectionPerms.includes(action.key);
                              return (
                                <button
                                  key={`${section.key}-${action.key}`}
                                  onClick={() => toggleProcurementSectionPermission(section.key, action.key)}
                                  className={`w-9 h-9 mx-auto rounded-xl flex items-center justify-center transition-all border ${isChecked
                                    ? `bg-emerald-500 text-white border-emerald-500 shadow-md`
                                    : 'bg-white border-gray-100 text-gray-200 hover:border-gray-200'
                                    }`}
                                >
                                  {isChecked ? <CheckCircle2 size={16} strokeWidth={3} /> : <XCircle size={16} strokeWidth={2.5} className="text-rose-400 opacity-20" />}
                                </button>
                              );
                            })}

                            <button
                              onClick={() => toggleAllForProcurementSection(section.key)}
                              className={`w-8 h-8 mx-auto rounded-lg flex items-center justify-center transition-all text-[8px] font-black uppercase ${allSelected
                                ? 'bg-emerald-600 text-white'
                                : 'bg-gray-100 text-gray-400 hover:bg-gray-200'
                                }`}
                            >
                              {allSelected ? <Check size={12} strokeWidth={3} /> : 'All'}
                            </button>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {/* Granular System Settings Table */}
                  <div className="bg-white rounded-3xl border border-gray-100 p-6 space-y-6 shadow-sm hover:border-emerald-100 transition-all">
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                      <div className="flex items-center gap-4">
                        <div className="w-12 h-12 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
                          <Settings size={24} />
                        </div>
                        <div>
                          <h4 className="text-sm font-black text-gray-900 uppercase tracking-tight">System & POS Settings</h4>
                          <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Global Configurations & Billing</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        {ACTIONS.map(action => {
                          const isChecked = (formPerms.SETTINGS || []).includes(action.key);
                          return (
                            <div key={action.key} className="flex flex-col items-center gap-1">
                              <span className="text-[7px] font-black text-gray-400 uppercase tracking-widest">{action.label}</span>
                              <button
                                onClick={() => togglePermission('SETTINGS', action.key)}
                                className={`w-9 h-9 rounded-xl flex items-center justify-center transition-all border ${isChecked
                                  ? `bg-emerald-600 text-white border-emerald-600 shadow-lg shadow-emerald-600/20`
                                  : 'bg-white border-gray-200 text-gray-300 hover:border-emerald-100 hover:text-emerald-500'
                                  }`}
                              >
                                {isChecked ? <CheckCircle2 size={16} strokeWidth={3} /> : <XCircle size={16} strokeWidth={2.5} className="text-rose-500" />}
                              </button>
                            </div>
                          );
                        })}
                      </div>
                    </div>

                    <div className="space-y-4">
                      <div className="flex items-center justify-between px-2">
                        <div className="flex items-center gap-2">
                          <Eye size={14} className="text-gray-400" />
                          <span className="text-[9px] font-black text-gray-400 uppercase tracking-[0.1em]">Visible Sections</span>
                        </div>
                        <button
                          onClick={() => setFormPerms(prev => ({ 
                            ...prev, 
                            SETTINGS_TARGET_SECTIONS: SETTINGS_SECTIONS.map(s => s.key), 
                            SETTINGS: (prev.SETTINGS || []).includes('READ') ? prev.SETTINGS : [...(prev.SETTINGS || []), 'READ'] 
                          }))}
                          className="text-[8px] font-black text-emerald-600 hover:text-emerald-800 transition-colors uppercase tracking-widest bg-emerald-50/50 px-3 py-1.5 rounded-lg border border-emerald-100/50"
                        >
                          Select All
                        </button>
                      </div>

                      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-2 p-3 bg-gray-50/80 rounded-2xl border border-gray-100">
                        {SETTINGS_SECTIONS.map((section) => {
                          const isSelected = (formPerms.SETTINGS_TARGET_SECTIONS || []).includes(section.key);
                          return (
                            <button
                              key={section.key}
                              onClick={() => toggleSettingsSection(section.key)}
                              className={`flex items-center gap-2 px-3 py-2 rounded-xl border text-[10px] font-black uppercase tracking-widest transition-all ${isSelected
                                ? 'bg-emerald-600 text-white border-emerald-600 shadow-sm'
                                : 'bg-white text-gray-400 border-gray-200 hover:border-emerald-200'
                                }`}
                            >
                              {isSelected ? <Check size={12} strokeWidth={4} /> : <div className="w-3" />}
                              {section.label}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  </div>

                  {/* Route Planning Row */}
                  <div className="bg-white rounded-3xl border border-gray-100 p-6 space-y-6 shadow-sm hover:border-emerald-100 transition-all">
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                      <div className="flex items-center gap-4">
                        <div className="w-12 h-12 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
                          <MapPin size={24} />
                        </div>
                        <div>
                          <h4 className="text-sm font-black text-gray-900 uppercase tracking-tight">Route Planning</h4>
                          <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Geographic Assets</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        {ACTIONS.map(action => {
                          const isChecked = (formPerms.ROUTES || []).includes(action.key);
                          return (
                            <div key={`ROUTES-${action.key}`} className="flex flex-col items-center gap-1.5">
                              <span className="text-[7px] font-black text-gray-400 uppercase tracking-widest">{action.label}</span>
                              <button
                                onClick={() => togglePermission('ROUTES', action.key)}
                                className={`w-9 h-9 rounded-xl flex items-center justify-center transition-all border ${isChecked
                                  ? `bg-emerald-600 text-white border-emerald-600 shadow-lg shadow-emerald-600/20`
                                  : 'bg-white border-gray-200 text-gray-300 hover:border-emerald-100 hover:text-emerald-500'
                                  }`}
                              >
                                {isChecked ? <CheckCircle2 size={16} strokeWidth={3} /> : <XCircle size={16} strokeWidth={2.5} className="text-rose-500" />}
                              </button>
                            </div>
                          );
                        })}
                      </div>
                    </div>

                    <div className="space-y-4">
                      <div className="flex items-center justify-between px-2">
                        <div className="flex items-center gap-2">
                          <Eye size={14} className="text-gray-400" />
                          <span className="text-[9px] font-black text-gray-400 uppercase tracking-[0.1em]">Visible Sections</span>
                        </div>
                        <button
                          onClick={() => setFormPerms(prev => ({ ...prev, ROUTE_TARGET_SECTIONS: ['VILLAGES', 'ROUTES', 'ASSIGNMENTS'] }))}
                          className="text-[8px] font-black text-emerald-600 hover:text-emerald-800 transition-colors uppercase tracking-widest bg-emerald-50/50 px-3 py-1.5 rounded-lg border border-emerald-100/50"
                        >
                          Select All
                        </button>
                      </div>

                      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2 p-3 bg-gray-50/80 rounded-2xl border border-gray-100">
                        {[
                          { key: 'VILLAGES', label: 'Villages' },
                          { key: 'ROUTES', label: 'Routes' },
                          { key: 'ASSIGNMENTS', label: 'Assignments' }
                        ].map((section) => {
                          const isSelected = (formPerms.ROUTE_TARGET_SECTIONS || []).includes(section.key);
                          return (
                            <button
                              key={section.key}
                              onClick={() => toggleRouteSection(section.key)}
                              className={`flex items-center gap-2 px-3 py-2 rounded-xl border text-[10px] font-black uppercase tracking-widest transition-all ${isSelected
                                ? 'bg-emerald-600 text-white border-emerald-600 shadow-sm'
                                : 'bg-white text-gray-400 border-gray-200 hover:border-emerald-200'
                                }`}
                            >
                              {isSelected ? <Check size={12} strokeWidth={4} /> : <div className="w-3" />}
                              {section.label}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  </div>

                  {/* Reports Row */}
                  <div className="bg-white rounded-3xl border border-gray-100 p-6 space-y-6 shadow-sm hover:border-emerald-100 transition-all">
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                      <div className="flex items-center gap-4">
                        <div className="w-12 h-12 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
                          <BarChart3 size={24} />
                        </div>
                        <div>
                          <h4 className="text-sm font-black text-gray-900 uppercase tracking-tight">Reports & Analytics</h4>
                          <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Business Insights</p>
                        </div>
                      </div>
                      {/* <div className="flex items-center gap-3">
                        {ACTIONS.map(action => {
                          const isChecked = (formPerms.REPORTS || []).includes(action.key);
                          return (
                            <div key={`REPORTS-${action.key}`} className="flex flex-col items-center gap-1.5">
                              <span className="text-[7px] font-black text-gray-400 uppercase tracking-widest">{action.label}</span>
                              <button
                                onClick={() => togglePermission('REPORTS', action.key)}
                                className={`w-9 h-9 rounded-xl flex items-center justify-center transition-all border ${isChecked
                                    ? `bg-emerald-600 text-white border-emerald-600 shadow-lg shadow-emerald-600/20`
                                    : 'bg-white border-gray-200 text-gray-300 hover:border-emerald-100 hover:text-emerald-500'
                                  }`}
                              >
                                {isChecked ? <CheckCircle2 size={16} strokeWidth={3} /> : <XCircle size={16} strokeWidth={2.5} className="text-rose-500" />}
                              </button>
                            </div>
                          );
                        })}
                      </div> */}
                    </div>

                    <div className="space-y-4">
                      <div className="flex items-center justify-between px-2">
                        <div className="flex items-center gap-2">
                          <Eye size={14} className="text-gray-400" />
                          <span className="text-[9px] font-black text-gray-400 uppercase tracking-[0.1em]">Visible Reports</span>
                        </div>
                        <button
                          onClick={() => setFormPerms(prev => ({ ...prev, REPORT_TARGET_SECTIONS: ['OVERVIEW', 'ITEM_WISE', 'CATEGORY_WISE', 'DAY_WISE', 'ROUTE_VILLAGE', 'AGENT_PERFORMANCE', 'LOCATION_TRACKING', 'VEHICLE_WISE', 'PAYMENT_MODE', 'RETURN', 'DAMAGE', 'SESSION', 'INVOICE'] }))}
                          className="text-[8px] font-black text-emerald-600 hover:text-emerald-800 transition-colors uppercase tracking-widest bg-emerald-50/50 px-3 py-1.5 rounded-lg border border-emerald-100/50"
                        >
                          Select All
                        </button>
                      </div>

                      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-2 p-3 bg-gray-50/80 rounded-2xl border border-gray-100">
                        {[
                          { key: 'OVERVIEW', label: 'Overview' },
                          { key: 'ITEM_WISE', label: 'Item-wise Sales' },
                          { key: 'CATEGORY_WISE', label: 'Category-wise' },
                          { key: 'DAY_WISE', label: 'Day-wise Sales' },
                          { key: 'ROUTE_VILLAGE', label: 'Route & Village' },
                          { key: 'AGENT_PERFORMANCE', label: 'Agent Performance' },
                          { key: 'LOCATION_TRACKING', label: 'Location Tracking' },
                          { key: 'VEHICLE_WISE', label: 'Substore (Vehicle)' },
                          { key: 'PAYMENT_MODE', label: 'Payment Mode' },
                          { key: 'RETURN', label: 'Return Report' },
                          { key: 'DAMAGE', label: 'Damage Report' },
                          { key: 'SESSION', label: 'Session Report' },
                          { key: 'INVOICE', label: 'Invoice Report' }
                        ].map((section) => {
                          const isSelected = (formPerms.REPORT_TARGET_SECTIONS || []).includes(section.key);
                          return (
                            <button
                              key={section.key}
                              onClick={() => toggleReportSection(section.key)}
                              className={`flex items-center gap-2 px-3 py-2 rounded-xl border text-[10px] font-black uppercase tracking-widest transition-all ${isSelected
                                ? 'bg-emerald-600 text-white border-emerald-600 shadow-sm'
                                : 'bg-white text-gray-400 border-gray-200 hover:border-emerald-200'
                                }`}
                            >
                              {isSelected ? <Check size={12} strokeWidth={4} /> : <div className="w-3" />}
                              {section.label}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Modal Footer */}
          <div className="px-8 py-5 border-t border-gray-100 flex items-center justify-between shrink-0 bg-gray-50/50">
            <div className="text-[10px] font-black text-gray-400 uppercase tracking-widest">
              {getPermCount(formPerms)} permissions selected
            </div>
            <div className="flex gap-3">
              <button
                onClick={() => setShowModal(false)}
                className="px-6 py-3 bg-white border border-gray-200 rounded-xl font-black text-xs text-gray-500 uppercase tracking-widest hover:bg-gray-50 transition-all"
              >
                Cancel
              </button>
              <button
                onClick={handleSave}
                disabled={saving || !formName.trim()}
                className="px-8 py-3 bg-emerald-600 text-white rounded-xl font-black text-xs uppercase tracking-widest shadow-lg shadow-emerald-600/20 hover:bg-emerald-700 transition-all disabled:opacity-50 flex items-center gap-2"
              >
                {saving ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
                {isEditing ? 'Update Role' : 'Create Role'}
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8 max-w-6xl mx-auto">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 bg-emerald-600 rounded-3xl flex items-center justify-center text-white shadow-xl shadow-emerald-600/20">
            <Shield size={28} strokeWidth={2.5} />
          </div>
          <div>
            <h1 className="text-2xl font-black text-gray-900 tracking-tight">Privileges & Roles</h1>
            <p className="text-[10px] font-black text-emerald-600 uppercase tracking-widest mt-0.5">
              {roles.length} Custom Role{roles.length !== 1 ? 's' : ''} Configured
            </p>
          </div>
        </div>
        <button
          onClick={openCreateModal}
          className="flex items-center gap-2 bg-emerald-600 text-white px-6 py-3 rounded-2xl font-black text-xs uppercase tracking-widest shadow-xl shadow-emerald-600/20 hover:bg-emerald-700 transition-all active:scale-[0.98]"
        >
          <Plus size={18} strokeWidth={3} /> Create Role
        </button>
      </div>

      {/* Info Banner */}
      <div className="bg-emerald-50 border border-emerald-100 rounded-[2rem] p-6 flex items-start gap-4">
        <div className="w-10 h-10 bg-emerald-100 rounded-xl flex items-center justify-center shrink-0 mt-0.5">
          <Key size={18} className="text-emerald-600" />
        </div>
        <div>
          <h3 className="text-sm font-black text-emerald-900 mb-1">How Privileges Work</h3>
          <p className="text-xs text-emerald-700 leading-relaxed">
            Create custom roles with specific permissions for each module. Assign these roles to staff members to control what they can view, create, edit, or delete.
            <span className="font-bold"> Admin and Tenant Owner accounts always have full access</span> regardless of custom roles.
          </p>
        </div>
      </div>

      {/* Role Cards */}
      {roles.length === 0 ? (
        <div className="text-center py-20 bg-white rounded-[2.5rem] border border-dashed border-gray-200">
          <Shield size={56} className="mx-auto text-gray-200 mb-4" />
          <h3 className="text-lg font-black text-gray-300">No Custom Roles Yet</h3>
          <p className="text-sm text-gray-400 mt-2 max-w-sm mx-auto">Create your first role to start managing staff access and privileges across your organization.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {roles.map((role) => (
            <motion.div
              key={role.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-white rounded-[2rem] border border-gray-100 shadow-sm p-6 flex flex-col gap-4 group hover:shadow-lg hover:border-emerald-100 transition-all duration-300"
            >
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-11 h-11 bg-emerald-50 rounded-2xl flex items-center justify-center text-emerald-600 border border-emerald-100">
                    <Shield size={20} strokeWidth={2.5} />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="text-sm font-black text-gray-900 uppercase tracking-tight">{role.name}</h3>
                      <span className="text-[8px] font-black px-1.5 py-0.5 rounded-md border bg-emerald-50 text-emerald-600 border-emerald-100 uppercase tracking-widest">
                        {role.name}
                      </span>
                    </div>
                    {role.description && (
                      <p className="text-[10px] text-gray-400 font-bold mt-0.5 line-clamp-1">{role.description}</p>
                    )}
                  </div>
                </div>
              </div>

              {/* Permission Stats */}
              <div className="flex items-center gap-3 bg-gray-50 rounded-2xl p-3">
                <div className="flex-1 text-center">
                  <span className="text-lg font-black text-emerald-600">{getPermCount(role.permissions)}</span>
                  <p className="text-[8px] font-black text-gray-400 uppercase tracking-widest">Permissions</p>
                </div>
                <div className="w-px h-8 bg-gray-200" />
                <div className="flex-1 text-center">
                  <span className="text-lg font-black text-emerald-600">{role._count?.users || 0}</span>
                  <p className="text-[8px] font-black text-gray-400 uppercase tracking-widest">Users</p>
                </div>
                <div className="w-px h-8 bg-gray-200" />
                <div className="flex-1 text-center">
                  <span className="text-lg font-black text-gray-600">
                    {role.permissions ? Object.keys(role.permissions).filter(k => (role.permissions[k] || []).length > 0).length : 0}
                  </span>
                  <p className="text-[8px] font-black text-gray-400 uppercase tracking-widest">Modules</p>
                </div>
              </div>

              {/* Module pills */}
              <div className="flex flex-wrap gap-1.5">
                {role.permissions && Object.entries(role.permissions)
                  .filter(([, actions]) => Array.isArray(actions) && actions.length > 0)
                  .slice(0, 6)
                  .map(([mod, actions]) => (
                    <span key={mod} className="text-[8px] font-black uppercase tracking-wider bg-emerald-50 text-emerald-600 px-2 py-1 rounded-lg border border-emerald-100">
                      {mod} ({actions.length})
                    </span>
                  ))
                }
                {role.permissions && Object.keys(role.permissions).filter(k => (role.permissions[k] || []).length > 0).length > 6 && (
                  <span className="text-[8px] font-black uppercase tracking-wider bg-gray-50 text-gray-400 px-2 py-1 rounded-lg">
                    +{Object.keys(role.permissions).filter(k => (role.permissions[k] || []).length > 0).length - 6} more
                  </span>
                )}
              </div>

              {/* Actions */}
              <div className="flex gap-2 pt-2 border-t border-gray-50">
                <button
                  onClick={() => openEditModal(role)}
                  className="flex-1 flex items-center justify-center gap-2 py-2.5 bg-emerald-50 text-emerald-600 rounded-xl font-black text-[10px] uppercase tracking-wider border border-emerald-100 hover:bg-emerald-100 transition-all"
                >
                  <Pencil size={12} /> Edit
                </button>
                <button
                  onClick={() => handleDelete(role.id)}
                  disabled={deletingId === role.id}
                  className="flex items-center justify-center gap-2 px-4 py-2.5 bg-rose-50 text-rose-500 rounded-xl font-black text-[10px] uppercase tracking-wider border border-rose-100 hover:bg-rose-100 transition-all disabled:opacity-50"
                >
                  {deletingId === role.id ? <Loader2 size={12} className="animate-spin" /> : <Trash2 size={12} />}
                </button>
              </div>
            </motion.div>
          ))}
        </div>
      )}

    </div>
  );
}
