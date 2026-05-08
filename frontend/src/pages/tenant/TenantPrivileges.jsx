import React, { useState, useEffect } from 'react';
import {
  Shield, Plus, Pencil, Trash2, Users, X, Loader2, Check,
  ChevronRight, ChevronDown, Key, Save, AlertTriangle, CheckCircle2, XCircle,
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
  { key: 'DASHBOARD', label: 'Dashboard', desc: 'Main overview & metrics' },
  { key: 'STAFF', label: 'Staff Management', desc: 'Admin, Agents & Field Force' },
  { key: 'VEHICLES', label: 'Fleet Management', desc: 'Vehicles & Assets' },
  { key: 'SALES', label: 'Sales', desc: 'Order management' },
  { key: 'TARGETS', label: 'Targets', desc: 'VGE incentives' },
  { key: 'ASSETS', label: 'Assets', desc: 'Equipment tracking' },
  { key: 'EXPENSES', label: 'Expenses', desc: 'Reimbursements' },
  { key: 'NOTIFICATIONS', label: 'Notifications', desc: 'Alert management' },
  { key: 'HR', label: 'HR', desc: 'Attendance, Leave, Payroll' },
  { key: 'SETTINGS', label: 'Settings', desc: 'System configuration' },
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

const ROUTE_SECTIONS_LIST = [
  { key: 'VILLAGES', label: 'Village Registry', desc: 'Manage village data' },
  { key: 'ROUTES', label: 'Route Master', desc: 'Define sales routes' },
  { key: 'ASSIGNMENTS', label: 'Vehicle Assignment', desc: 'Assign routes to vehicles' }
];

const REPORT_SECTIONS_LIST = [
  { key: 'OVERVIEW', label: 'Business Overview', desc: 'High-level metrics' },
  { key: 'ITEM_WISE', label: 'Item Wise Sales', desc: 'Product performance' },
  { key: 'CATEGORY_WISE', label: 'Category Wise', desc: 'Category analytics' },
  { key: 'DAY_WISE', label: 'Day Wise Sales', desc: 'Daily trends' },
  { key: 'ROUTE_VILLAGE', label: 'Route & Village', desc: 'Geographic performance' },
  { key: 'AGENT_PERFORMANCE', label: 'Agent Performance', desc: 'Staff leaderboard' },
  { key: 'LOCATION_TRACKING', label: 'Location Tracking', desc: 'GPS history' },
  { key: 'VEHICLE_WISE', label: 'Vehicle Wise', desc: 'Fleet performance' },
  { key: 'PAYMENT_MODE', label: 'Payment Analysis', desc: 'Cash vs Digital' },
  { key: 'RETURN', label: 'Return Reports', desc: 'Stock returns' },
  { key: 'DAMAGE', label: 'Damage Reports', desc: 'Loss tracking' },
  { key: 'SESSION', label: 'Session Reports', desc: 'EOD settlements' },
  { key: 'INVOICE', label: 'Invoice Reports', desc: 'Bill history' }
];


const ACTIONS = [
  { key: 'READ', label: 'View', color: 'emerald' },
  { key: 'CREATE', label: 'Create', color: 'blue' },
  { key: 'UPDATE', label: 'Edit', color: 'amber' },
  { key: 'DELETE', label: 'Delete', color: 'rose' },
  { key: 'TOGGLE_STATUS', label: 'Status', color: 'purple' },
];

const ToggleSwitch = ({ checked, onChange, disabled = false }) => {
  return (
    <div className="flex items-center justify-center w-10 h-10">
      <motion.button
        whileTap={!disabled ? { scale: 0.95 } : {}}
        onClick={(e) => {
          e.preventDefault();
          if (!disabled) onChange();
        }}
        disabled={disabled}
        className={`relative inline-flex h-5 w-9 items-center rounded-full transition-all duration-300 focus:outline-none ${checked ? 'bg-emerald-500' : 'bg-gray-200'
          } ${disabled ? 'opacity-20 cursor-not-allowed' : 'cursor-pointer hover:brightness-110'}`}
      >
        <motion.span
          animate={{ x: checked ? 18 : 2 }}
          transition={{ type: "spring", stiffness: 500, damping: 30 }}
          className="inline-block h-3.5 w-3.5 transform rounded-full bg-white shadow-lg ring-0 transition duration-200 ease-in-out"
        />
      </motion.button>
    </div>
  );
};

const CollapsibleSection = ({ title, desc, icon: Icon, children, isOpen, onToggle }) => {
  return (
    <div className="bg-white rounded-[2rem] border border-gray-100 overflow-hidden shadow-sm transition-all hover:border-emerald-100">
      <button
        onClick={onToggle}
        className="w-full px-8 py-6 flex items-center justify-between hover:bg-gray-50/50 transition-all text-left"
      >
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
            <Icon size={24} />
          </div>
          <div>
            <h4 className="text-sm font-black text-gray-900 uppercase tracking-tight">{title}</h4>
            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mt-0.5">{desc}</p>
          </div>
        </div>
        <div className={`transform transition-transform duration-300 ${isOpen ? 'rotate-180' : ''}`}>
          <ChevronDown size={20} className="text-gray-400" />
        </div>
      </button>
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.3, ease: 'easeInOut' }}
          >
            <div className="px-8 pb-8 border-t border-gray-50 pt-6">
              {children}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

const PermissionTable = ({ modules, isGranular = false, sectionKey = '', formPerms, togglePermission, toggleAllForModule }) => {
  return (
    <div className="space-y-2">
      {/* Table Header */}
      <div className="hidden sm:grid grid-cols-[1fr_repeat(5,60px)_40px] gap-2 px-4 pb-1 border-b border-gray-50">
        <span className="text-[8px] font-black text-gray-400 uppercase tracking-widest">Module</span>
        {ACTIONS.map(a => (
          <span key={a.key} className="text-[8px] font-black text-gray-400 uppercase tracking-widest text-center">{a.label}</span>
        ))}
        <span className="text-[8px] font-black text-gray-400 uppercase tracking-widest text-center">All</span>
      </div>

      {modules.map((mod) => {
        let currentPerms = [];
        if (isGranular) {
          currentPerms = (formPerms[sectionKey] || {})[mod.key] || [];
        } else {
          currentPerms = formPerms[mod.key] || [];
        }

        const allSelected = ACTIONS.every(a => currentPerms.includes(a.key));
        const someSelected = currentPerms.length > 0;

        return (
          <div
            key={mod.key}
            className={`grid grid-cols-[1fr_repeat(5,60px)_40px] gap-2 items-center px-4 py-3 rounded-2xl border transition-all ${someSelected ? 'bg-emerald-50/30 border-emerald-100/50' : 'bg-gray-50/50 border-gray-100/50 hover:bg-gray-50'
              }`}
          >
            <div className="flex flex-col min-w-0">
              <span className="text-xs font-black text-gray-800 uppercase tracking-tight truncate">{mod.label}</span>
              <span className="text-[8px] text-gray-400 font-bold hidden sm:block truncate">{mod.desc}</span>
            </div>

            {ACTIONS.map((action) => {
              const isChecked = currentPerms.includes(action.key);

              return (
                <ToggleSwitch
                  key={`${mod.key}-${action.key}`}
                  checked={isChecked}
                  onChange={() => {
                    if (isGranular) {
                      // Custom granular toggle logic
                      const sections = { ...(formPerms[sectionKey] || {}) };
                      const cur = sections[mod.key] || [];
                      const next = cur.includes(action.key) ? cur.filter(a => a !== action.key) : [...cur, action.key];
                      togglePermission(sectionKey, mod.key, action.key, true, next);
                    } else {
                      togglePermission(mod.key, action.key);
                    }
                  }}
                />
              );
            })}

            <ToggleSwitch
              checked={allSelected}
              onChange={() => {
                if (isGranular) {
                  const sections = { ...(formPerms[sectionKey] || {}) };
                  sections[mod.key] = allSelected ? [] : ACTIONS.map(a => a.key);
                  togglePermission(sectionKey, mod.key, 'ALL', true, sections[mod.key]);
                } else {
                  toggleAllForModule(mod.key);
                }
              }}
            />
          </div>
        );
      })}
    </div>
  );
};

export default function TenantPrivileges() {
  const [roles, setRoles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedRole, setSelectedRole] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState(null);
  const [activeTab, setActiveTab] = useState('permissions'); // 'permissions' | 'users'
  const [roleUsers, setRoleUsers] = useState([]);
  const [fetchingUsers, setFetchingUsers] = useState(false);
  const [headerEditing, setHeaderEditing] = useState(false);
  const [openSections, setOpenSections] = useState(['core']);

  const toggleAccordion = (key) => {
    setOpenSections(prev =>
      prev.includes(key) ? prev.filter(k => k !== key) : [...prev, key]
    );
  };

  // Form state
  const [formName, setFormName] = useState('');
  const [formDesc, setFormDesc] = useState('');
  const [formPerms, setFormPerms] = useState({});

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
    setActiveTab('permissions');
    setRoleUsers([]);
    setHeaderEditing(true);
    setShowModal(true);
  };

  const openEditModal = (role) => {
    setIsEditing(true);
    setSelectedRole(role);
    setFormName(role.name);
    setFormDesc(role.description || '');
    setFormPerms(role.permissions || {});
    setActiveTab('permissions');
    setRoleUsers([]);
    setHeaderEditing(false);
    setShowModal(true);
    fetchRoleUsers(role.id);
  };

  const fetchRoleUsers = async (roleId) => {
    setFetchingUsers(true);
    try {
      const res = await adminAPI.getUsers({ roleId });
      setRoleUsers(Array.isArray(res.data) ? res.data : (res.data?.data || []));
    } catch (err) {
      console.error('Failed to fetch role users:', err);
    } finally {
      setFetchingUsers(false);
    }
  };

  const handleDeleteUser = async (userId, userName) => {
    if (!window.confirm(`Are you absolutely sure? This will PERMANENTLY DELETE ${userName} and all their historical data (orders, attendance, cash transfers, etc). This cannot be undone.`)) {
      return;
    }

    try {
      await adminAPI.deleteUser(userId);
      toast.success(`${userName} permanently deleted`);
      // Refresh list
      if (selectedRole) fetchRoleUsers(selectedRole.id);
      fetchRoles(); // Refresh counts
    } catch (err) {
      console.error('Failed to delete user:', err);
      toast.error(err.response?.data?.message || 'Failed to delete user');
    }
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

  const togglePermission = (moduleKey, actionKey, isGranular = false, nextGranularPerms = null) => {
    setFormPerms(prev => {
      if (isGranular) {
        const sectionId = actionKey; // actionKey is used as the granular key (e.g., 'STORE_STOCK')
        const sections = { ...(prev[moduleKey] || {}) };
        sections[sectionId] = nextGranularPerms;

        // Map the section Key to the correct parent module READ permission
        const parentModule = moduleKey.split('_')[0];

        return {
          ...prev,
          [moduleKey]: sections,
          [parentModule]: ['READ']
        };
      }

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
    // Main Modules
    MODULES.forEach(m => { all[m.key] = ACTIONS.map(a => a.key); });

    // Sub-sections (Nested)
    all.INVENTORY_SECTIONS = {};
    INVENTORY_SECTIONS.forEach(s => { all.INVENTORY_SECTIONS[s.key] = ACTIONS.map(a => a.key); });

    all.CASH_SECTIONS = {};
    CASH_SECTIONS_LIST.forEach(s => { all.CASH_SECTIONS[s.key] = ACTIONS.map(a => a.key); });

    all.EXPENSE_SECTIONS = {};
    EXPENSE_SECTIONS_LIST.forEach(s => { all.EXPENSE_SECTIONS[s.key] = ACTIONS.map(a => a.key); });

    all.PROCUREMENT_SECTIONS = {};
    PROCUREMENT_SECTIONS_LIST.forEach(s => { all.PROCUREMENT_SECTIONS[s.key] = ACTIONS.map(a => a.key); });

    // Target Lists (Granular)
    all.ROUTE_TARGET_SECTIONS = {};
    ROUTE_SECTIONS_LIST.forEach(s => { all.ROUTE_TARGET_SECTIONS[s.key] = ACTIONS.map(a => a.key); });

    all.REPORT_TARGET_SECTIONS = {};
    REPORT_SECTIONS_LIST.forEach(s => { all.REPORT_TARGET_SECTIONS[s.key] = ACTIONS.map(a => a.key); });

    all.SETTINGS_TARGET_SECTIONS = {};
    SETTINGS_SECTIONS.forEach(s => { all.SETTINGS_TARGET_SECTIONS[s.key] = ACTIONS.map(a => a.key); });

    // Widgets
    all.DASHBOARD_WIDGETS = DASHBOARD_WIDGETS.map(w => w.key);

    setFormPerms(all);
  };

  const clearAllPermissions = () => {
    setFormPerms({});
  };

  const toggleAllPermissions = () => {
    const isAnySelected = Object.keys(formPerms).some(k => {
      const val = formPerms[k];
      if (Array.isArray(val)) return val.length > 0;
      if (typeof val === 'object' && val !== null) return Object.values(val).some(arr => Array.isArray(arr) && arr.length > 0);
      return false;
    });

    if (isAnySelected) {
      clearAllPermissions();
    } else {
      selectAllPermissions();
    }
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
          permissions: formPerms
        });
        toast.success('Role updated');
      } else {
        await adminAPI.createRole({
          name: formName,
          description: formDesc,
          permissions: formPerms
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
        <div className="flex items-center justify-between">
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

          {isEditing && (
            <div className="flex bg-gray-100 p-1 rounded-2xl border border-gray-200">
              <button
                onClick={() => setActiveTab('permissions')}
                className={`flex items-center gap-2 px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${activeTab === 'permissions' ? 'bg-white text-emerald-600 shadow-sm' : 'text-gray-400 hover:text-gray-600'
                  }`}
              >
                <Key size={14} /> Permissions
              </button>
              <button
                onClick={() => setActiveTab('users')}
                className={`flex items-center gap-2 px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${activeTab === 'users' ? 'bg-white text-emerald-600 shadow-sm' : 'text-gray-400 hover:text-gray-600'
                  }`}
              >
                <Users size={14} /> Assigned Users ({roleUsers.length})
              </button>
            </div>
          )}
        </div>

        <div className="flex flex-col md:flex-row gap-4">
          <div className="bg-white border border-gray-100 rounded-[2rem] p-6 shadow-sm flex-1 flex items-start justify-between gap-6">
            <div className="flex flex-col gap-2 flex-1">
              <div className="space-y-1">
                {headerEditing && <label className="text-[9px] font-black uppercase tracking-widest text-emerald-600 ml-1">Role Identity</label>}
                <input
                  type="text"
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                  placeholder="Role Name"
                  disabled={!headerEditing}
                  className={`text-2xl font-black tracking-tight w-full transition-all duration-300 ${headerEditing
                      ? 'bg-gray-50 border border-emerald-200 rounded-xl px-4 py-3 text-gray-900 focus:ring-4 focus:ring-emerald-500/5 outline-none'
                      : 'bg-transparent border-none p-0 text-gray-900 cursor-default outline-none'
                    }`}
                />
              </div>
              <div className="space-y-1">
                {headerEditing && <label className="text-[9px] font-black uppercase tracking-widest text-gray-400 ml-1">Public Description</label>}
                <input
                  type="text"
                  value={formDesc}
                  onChange={(e) => setFormDesc(e.target.value)}
                  placeholder="Add a description for this role..."
                  disabled={!headerEditing}
                  className={`text-sm font-bold w-full transition-all duration-300 ${headerEditing
                      ? 'bg-gray-50 border border-gray-100 rounded-xl px-4 py-3 text-gray-700 focus:ring-4 focus:ring-gray-500/5 outline-none'
                      : 'bg-transparent border-none p-0 text-gray-400 cursor-default outline-none'
                    }`}
                />
              </div>
            </div>
            <button
              onClick={() => setHeaderEditing(!headerEditing)}
              className={`p-3 rounded-2xl transition-all shadow-sm flex items-center justify-center ${headerEditing
                  ? 'bg-emerald-600 text-white shadow-emerald-200 hover:bg-emerald-700'
                  : 'bg-white border border-gray-100 text-gray-400 hover:text-emerald-600 hover:border-emerald-100'
                }`}
            >
              {headerEditing ? <Check size={18} strokeWidth={2.5} /> : <Pencil size={18} strokeWidth={2.5} />}
            </button>
          </div>

          {isEditing && (
            <div className="bg-white border border-gray-100 rounded-[2rem] p-6 shadow-sm flex items-center gap-10 min-w-fit">
              <div className="flex flex-col">
                <span className="text-3xl font-black text-emerald-600 tracking-tight">{getPermCount(formPerms)}</span>
                <span className="text-[10px] font-black text-gray-900 uppercase tracking-widest mt-1">Permissions</span>
              </div>
              <div className="w-px h-10 bg-gray-200" />
              <div className="flex flex-col">
                <span className="text-3xl font-black text-emerald-600 tracking-tight">{roleUsers.length}</span>
                <span className="text-[10px] font-black text-gray-900 uppercase tracking-widest mt-1">User assigned</span>
              </div>
              <div className="w-px h-10 bg-gray-200" />
              <div className="flex flex-col">
                <span className="text-3xl font-black text-emerald-600 tracking-tight">
                  {Object.keys(formPerms).filter(k => Array.isArray(formPerms[k]) && formPerms[k].length > 0).length +
                    (formPerms.INVENTORY_SECTIONS ? Object.keys(formPerms.INVENTORY_SECTIONS).filter(k => (formPerms.INVENTORY_SECTIONS[k] || []).length > 0).length : 0) +
                    (formPerms.CASH_SECTIONS ? Object.keys(formPerms.CASH_SECTIONS).filter(k => (formPerms.CASH_SECTIONS[k] || []).length > 0).length : 0) +
                    (formPerms.EXPENSE_SECTIONS ? Object.keys(formPerms.EXPENSE_SECTIONS).filter(k => (formPerms.EXPENSE_SECTIONS[k] || []).length > 0).length : 0) +
                    (formPerms.PROCUREMENT_SECTIONS ? Object.keys(formPerms.PROCUREMENT_SECTIONS).filter(k => (formPerms.PROCUREMENT_SECTIONS[k] || []).length > 0).length : 0)
                  }
                </span>
                <span className="text-[10px] font-black text-gray-900 uppercase tracking-widest mt-1">Modules</span>
              </div>
            </div>
          )}
        </div>

        <div className="bg-white rounded-[2rem] border border-gray-100 shadow-sm overflow-hidden flex flex-col">
          <div className="p-8 space-y-8 min-h-[60vh]">
            {activeTab === 'permissions' ? (
              <div className="space-y-8 animate-in fade-in slide-in-from-bottom-2 duration-300">
                {/* Quick Actions */}
                <div className="flex items-center justify-between">
                  <h3 className="text-xs font-black text-gray-900 uppercase tracking-widest flex items-center gap-2">
                    <Key size={14} className="text-emerald-600" /> Permission Matrix
                  </h3>
                  <div className="flex items-center gap-3 bg-gray-50/50 px-4 py-1.5 rounded-xl border border-gray-100">
                    <span className="text-[9px] font-black text-gray-400 uppercase tracking-widest">
                      {Object.keys(formPerms).some(k => {
                        const v = formPerms[k];
                        return Array.isArray(v) ? v.length > 0 : Object.values(v || {}).some(arr => arr.length > 0);
                      }) ? 'Deselect All' : 'Select All'}
                    </span>
                    <ToggleSwitch
                      checked={Object.keys(formPerms).some(k => {
                        const v = formPerms[k];
                        return Array.isArray(v) ? v.length > 0 : Object.values(v || {}).some(arr => arr.length > 0);
                      })}
                      onChange={toggleAllPermissions}
                    />
                  </div>
                </div>

                {/* Permission Matrix */}
                <div className="space-y-6">

                  {/* Core System Modules */}
                  <CollapsibleSection
                    title="Core System Operations"
                    desc="Primary resource and workflow management"
                    icon={Shield}
                    isOpen={openSections.includes('core')}
                    onToggle={() => toggleAccordion('core')}
                  >
                    <PermissionTable
                      modules={MODULES}
                      formPerms={formPerms}
                      togglePermission={togglePermission}
                      toggleAllForModule={toggleAllForModule}
                    />
                  </CollapsibleSection>

                  {/* Business Operations */}
                  <CollapsibleSection
                    title="Business Operations"
                    desc="Inventory, Stock & Store Registry"
                    icon={Package}
                    isOpen={openSections.includes('business')}
                    onToggle={() => toggleAccordion('business')}
                  >
                    <div className="space-y-6">
                      <div className="flex items-center justify-between px-2">
                        <h5 className="text-[10px] font-black uppercase tracking-widest text-emerald-600">Inventory Sections</h5>
                        <button
                          onClick={() => {
                            const sections = {};
                            INVENTORY_SECTIONS.forEach(s => { sections[s.key] = ACTIONS.map(a => a.key); });
                            setFormPerms(prev => ({ ...prev, INVENTORY_SECTIONS: sections }));
                          }}
                          className="text-[9px] font-black text-emerald-600 hover:underline uppercase tracking-widest"
                        >
                          Select All Sections
                        </button>
                      </div>
                      <PermissionTable
                        modules={INVENTORY_SECTIONS}
                        isGranular={true}
                        sectionKey="INVENTORY_SECTIONS"
                        formPerms={formPerms}
                        togglePermission={togglePermission}
                        toggleAllForModule={toggleAllForModule}
                      />
                    </div>
                  </CollapsibleSection>

                  {/* Cash Flow */}
                  <CollapsibleSection
                    title="Cash Flow & Settlement"
                    desc="Daily reconcile & safe management"
                    icon={Coins}
                    isOpen={openSections.includes('cash')}
                    onToggle={() => toggleAccordion('cash')}
                  >
                    <PermissionTable
                      modules={CASH_SECTIONS_LIST}
                      isGranular={true}
                      sectionKey="CASH_SECTIONS"
                      formPerms={formPerms}
                      togglePermission={togglePermission}
                      toggleAllForModule={toggleAllForModule}
                    />
                  </CollapsibleSection>

                  {/* Expense Control */}
                  <CollapsibleSection
                    title="Expense Control"
                    desc="Reimbursements & Claims Management"
                    icon={Wallet}
                    isOpen={openSections.includes('expenses')}
                    onToggle={() => toggleAccordion('expenses')}
                  >
                    <PermissionTable
                      modules={EXPENSE_SECTIONS_LIST}
                      isGranular={true}
                      sectionKey="EXPENSE_SECTIONS"
                      formPerms={formPerms}
                      togglePermission={togglePermission}
                      toggleAllForModule={toggleAllForModule}
                    />
                  </CollapsibleSection>

                  {/* Procurement */}
                  <CollapsibleSection
                    title="Procurement & Vendor Management"
                    desc="Purchase orders & stock sourcing"
                    icon={ShoppingCart}
                    isOpen={openSections.includes('procurement')}
                    onToggle={() => toggleAccordion('procurement')}
                  >
                    <PermissionTable
                      modules={PROCUREMENT_SECTIONS_LIST}
                      isGranular={true}
                      sectionKey="PROCUREMENT_SECTIONS"
                      formPerms={formPerms}
                      togglePermission={togglePermission}
                      toggleAllForModule={toggleAllForModule}
                    />
                  </CollapsibleSection>

                  {/* Route Planning */}
                  <CollapsibleSection
                    title="Route Planning"
                    desc="Sales routes & delivery paths"
                    icon={MapPin}
                    isOpen={openSections.includes('routes')}
                    onToggle={() => toggleAccordion('routes')}
                  >
                    <PermissionTable
                      modules={ROUTE_SECTIONS_LIST}
                      isGranular={true}
                      sectionKey="ROUTE_TARGET_SECTIONS"
                      formPerms={formPerms}
                      togglePermission={togglePermission}
                      toggleAllForModule={toggleAllForModule}
                    />
                  </CollapsibleSection>

                  {/* Reports & Analytics */}
                  <CollapsibleSection
                    title="Reports & Analytics"
                    desc="Data insights & export permissions"
                    icon={BarChart3}
                    isOpen={openSections.includes('reports')}
                    onToggle={() => toggleAccordion('reports')}
                  >
                    <PermissionTable
                      modules={REPORT_SECTIONS_LIST}
                      isGranular={true}
                      sectionKey="REPORT_TARGET_SECTIONS"
                      formPerms={formPerms}
                      togglePermission={togglePermission}
                      toggleAllForModule={toggleAllForModule}
                    />
                  </CollapsibleSection>

                  {/* System Settings */}
                  <CollapsibleSection
                    title="System & POS Settings"
                    desc="POS configurations & global settings"
                    icon={Settings}
                    isOpen={openSections.includes('settings')}
                    onToggle={() => toggleAccordion('settings')}
                  >
                    <PermissionTable
                      modules={SETTINGS_SECTIONS}
                      isGranular={true}
                      sectionKey="SETTINGS_TARGET_SECTIONS"
                      formPerms={formPerms}
                      togglePermission={togglePermission}
                      toggleAllForModule={toggleAllForModule}
                    />
                  </CollapsibleSection>
                </div>
              </div>

            ) : (
              <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-300">
                <div className="flex items-center justify-between">
                  <h3 className="text-xs font-black text-gray-900 uppercase tracking-widest flex items-center gap-2">
                    <Users size={14} className="text-emerald-600" /> Currently Assigned Staff
                  </h3>
                </div>

                {fetchingUsers ? (
                  <div className="flex flex-col items-center justify-center py-20 gap-4">
                    <Loader2 className="animate-spin text-emerald-600" size={32} />
                    <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Fetching users...</p>
                  </div>
                ) : roleUsers.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-20 bg-gray-50 rounded-[2rem] border border-dashed border-gray-200">
                    <Users size={40} className="text-gray-200 mb-4" />
                    <h3 className="text-sm font-black text-gray-400 uppercase tracking-tight">No Users Assigned</h3>
                    <p className="text-[10px] text-gray-400 font-bold mt-1 uppercase tracking-widest">No organization members have this role yet</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 gap-3">
                    {roleUsers.map((user) => (
                      <div key={user.id} className="group flex items-center justify-between p-4 bg-white rounded-2xl border border-gray-100 hover:border-emerald-100 hover:shadow-md transition-all">
                        <div className="flex items-center gap-4">
                          <div className="w-11 h-11 rounded-xl bg-emerald-100 text-emerald-600 flex items-center justify-center font-black text-xs">
                            {user.name?.charAt(0) || user.email?.charAt(0)}
                          </div>
                          <div>
                            <p className="text-sm font-black text-gray-900 uppercase tracking-tight leading-none">{user.name}</p>
                            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mt-1.5">{user.email}</p>
                          </div>
                        </div>

                        <button
                          onClick={() => handleDeleteUser(user.id, user.name)}
                          className="p-2.5 bg-rose-50 text-rose-500 rounded-xl opacity-0 group-hover:opacity-100 transition-all hover:bg-rose-100 border border-rose-100"
                          title="Permanently Delete Account"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
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


              {/* Actions */}
              <div className="flex gap-2 pt-2 border-t border-gray-50">
                <button
                  onClick={() => openEditModal(role)}
                  className="flex-1 flex items-center justify-center gap-2 py-2.5 bg-emerald-50 text-emerald-600 rounded-xl font-black text-[10px] uppercase tracking-wider border border-emerald-100 hover:bg-emerald-100 transition-all"
                >
                  <Eye size={12} /> View Details
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
