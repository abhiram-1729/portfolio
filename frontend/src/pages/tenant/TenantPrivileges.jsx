import React, { useState, useEffect } from 'react';
import {
  Shield, Plus, Pencil, Trash2, Users, X, Loader2, Check,
  ChevronRight, ChevronDown, Key, Save, AlertTriangle, CheckCircle2, XCircle, Search,
  Truck, ShoppingCart, PieChart, Receipt, Target, Eye, EyeOff, LayoutGrid, Coins, Grid, MapPin,
  Package, Wallet, BarChart, ClipboardList, BarChart3, Settings
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import adminAPI from '../../services/adminService';
import toast from 'react-hot-toast';

const DASHBOARD_WIDGETS = [
  { key: 'totalSales', label: 'Revenue Today', desc: 'Gross Intake', icon: Coins },
  { key: 'grossMargin', label: 'Gross Margin', desc: 'Net Efficiency', icon: PieChart },
  { key: 'totalOrders', label: 'Orders Today', desc: 'Trans. Volume', icon: ShoppingCart },
  { key: 'activeVehicles', label: 'Active Fleet', desc: 'Deployment', icon: Truck },
  { key: 'stockValuation', label: 'Stock Valuation', desc: 'Assets Value', icon: Package },
  { key: 'pendingLogistics', label: 'Pending Logistics', desc: 'Fulfillment', icon: Truck },
  { key: 'criticalAlerts', label: 'Critical Alerts', desc: 'Safety Stock', icon: Target },
  { key: 'refillRequests', label: 'Refill Requests', desc: 'Fleet Resupply', icon: Truck },
  { key: 'fleetMap', label: 'Fleet Geo-Intelligence', desc: 'Map & Live Agents', icon: MapPin },
  { key: 'orderChannels', label: 'Order Channels', desc: 'Pie Chart', icon: PieChart },
  { key: 'paymentSplit', label: 'Revenue Split', desc: 'Pie Chart', icon: PieChart },
  { key: 'productVelocity', label: 'Product Velocity', desc: 'Bar Chart', icon: BarChart },
  { key: 'operationalCriticals', label: 'Operational Criticals', desc: 'Inventory Health & Route Coverage', icon: Target },
  { key: 'treasuryAnalytics', label: 'Treasury Analytics', desc: 'Vendor Liabilities & Damage', icon: Wallet },
  { key: 'cashStatus', label: 'Operational Recon Feed', desc: 'Cash Stats', icon: Receipt },
  { key: 'topPerformers', label: 'Elite Performance', desc: 'Agent Leaderboard', icon: Users },
  { key: 'liveSales', label: 'Live Sales Stream', desc: 'Recent Orders', icon: ShoppingCart },
];

const MODULES = [
  { key: 'DASHBOARD', label: 'Dashboard', desc: 'Main overview & metrics' },
  { key: 'STAFF_ADMIN', label: 'Admin Management', desc: 'System Admins & Supervisors' },
  { key: 'STAFF_AGENT', label: 'Agent Management', desc: 'Sales Agents & Field Force' },
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

const PORTAL_TYPES = [
  { key: 'ADMIN', label: 'VillagKart Admin', desc: 'Full backend access', icon: Shield, color: 'emerald' },
  { key: 'AGENT', label: 'Agent Portal', desc: 'Sales & Field activities', icon: Users, color: 'blue' },
  { key: 'SUPERVISOR', label: 'Supervisor Portal', desc: 'Branch management', icon: Key, color: 'amber' },
  { key: 'HELPER', label: 'Helper Portal', desc: 'Logistics support', icon: Plus, color: 'rose' },
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

const CollapsibleSection = ({ title, desc, icon: Icon, children, isOpen, onToggle, extraHeaderAction }) => {
  return (
    <div className="bg-white rounded-[2rem] border border-gray-100 overflow-hidden shadow-sm transition-all hover:border-emerald-100">
      <div className="w-full px-8 py-6 flex items-center justify-between hover:bg-gray-50/50 transition-all text-left group">
        <div className="flex items-center gap-4 flex-1 cursor-pointer" onClick={onToggle}>
          <div className="w-12 h-12 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center group-hover:scale-110 transition-transform">
            <Icon size={24} />
          </div>
          <div>
            <h4 className="text-sm font-black text-gray-900 uppercase tracking-tight">{title}</h4>
            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mt-0.5">{desc}</p>
          </div>
        </div>
        <div className="flex items-center gap-4">
          {extraHeaderAction}
          <div onClick={onToggle} className={`transform transition-transform duration-300 cursor-pointer p-2 rounded-full hover:bg-gray-100 ${isOpen ? 'rotate-180' : ''}`}>
            <ChevronDown size={20} className="text-gray-400" />
          </div>
        </div>
      </div>
      <AnimatePresence initial={false}>
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

const PermissionTable = ({ 
  modules, 
  isGranular = false, 
  sectionKey = '', 
  formPerms, 
  togglePermission, 
  toggleAllForModule,
  customToggle = null,
  customToggleAll = null
}) => {
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
                    if (customToggle) {
                      customToggle(mod.key, action.key);
                    } else if (isGranular) {
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
                if (customToggleAll) {
                  customToggleAll(mod.key);
                } else if (isGranular) {
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
  const [allUsers, setAllUsers] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [isAssigning, setIsAssigning] = useState(false);

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
      
      // Also fetch all users to allow assigning new ones
      const allRes = await adminAPI.getUsers();
      const everyUser = Array.isArray(allRes.data) ? allRes.data : (allRes.data?.data || []);
      // Filter out users already in this role
      setAllUsers(everyUser.filter(u => u.customRoleId !== roleId));
    } catch (err) {
      console.error('Failed to fetch role users:', err);
    } finally {
      setFetchingUsers(false);
    }
  };

  const handleAssignUser = async (userId) => {
    if (!selectedRole) return;
    setSaving(true);
    try {
      await adminAPI.updateUser(userId, { customRoleId: selectedRole.id });
      toast.success('User assigned to role');
      fetchRoleUsers(selectedRole.id);
      fetchRoles();
      setSearchQuery('');
      setIsAssigning(false);
    } catch (err) {
      toast.error('Failed to assign user');
    } finally {
      setSaving(false);
    }
  };

  const handleRemoveFromRole = async (userId, userName) => {
    if (!window.confirm(`Remove "${userName}" from this role?\n\nThis will only revoke their custom role access. Their account, orders, attendance, and all historical data remain fully intact.`)) {
      return;
    }

    try {
      // Only strip the custom role — do NOT delete the user account
      await adminAPI.updateUser(userId, { customRoleId: null });
      toast.success(`${userName} removed from role. Account preserved.`);
      // Refresh list
      if (selectedRole) fetchRoleUsers(selectedRole.id);
      fetchRoles(); // Refresh user counts
    } catch (err) {
      console.error('Failed to remove user from role:', err);
      toast.error(err.response?.data?.message || 'Failed to remove user from role');
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

  const toggleExpenseSectionPermission = (sectionKey, actionKey) => {
    setFormPerms(prev => {
      const sections = prev.EXPENSE_SECTIONS || {};
      const current = sections[sectionKey] || [];
      const has = current.includes(actionKey);

      const nextPerms = has
        ? current.filter(a => a !== actionKey)
        : [...current, actionKey];

      return {
        ...prev,
        EXPENSE_SECTIONS: {
          ...sections,
          [sectionKey]: nextPerms
        },
        EXPENSES: (prev.EXPENSES || []).includes('READ') ? prev.EXPENSES : [...(prev.EXPENSES || []), 'READ']
      };
    });
  };

  const toggleAllForExpenseSection = (sectionKey) => {
    setFormPerms(prev => {
      const sections = prev.EXPENSE_SECTIONS || {};
      const current = sections[sectionKey] || [];
      const allSelected = ACTIONS.every(a => current.includes(a.key));

      return {
        ...prev,
        EXPENSE_SECTIONS: {
          ...sections,
          [sectionKey]: allSelected ? [] : ACTIONS.map(a => a.key)
        },
        EXPENSES: (prev.EXPENSES || []).includes('READ') ? prev.EXPENSES : [...(prev.EXPENSES || []), 'READ']
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
          [parentModule]: (prev[parentModule] || []).includes('READ') ? prev[parentModule] : [...(prev[parentModule] || []), 'READ']
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

      // Clear sub-sections if READ permission is removed
      if (!nextPerms.includes('READ')) {
        if (moduleKey === 'INVENTORY') updated.INVENTORY_SECTIONS = {};
        if (moduleKey === 'CASH') updated.CASH_SECTIONS = {};
        if (moduleKey === 'EXPENSES') updated.EXPENSE_SECTIONS = {};
        if (moduleKey === 'PROCUREMENT') updated.PROCUREMENT_SECTIONS = {};
        if (moduleKey === 'ROUTES') updated.ROUTE_TARGET_SECTIONS = [];
        if (moduleKey === 'REPORTS') updated.REPORT_TARGET_SECTIONS = [];
        if (moduleKey === 'SETTINGS') updated.SETTINGS_TARGET_SECTIONS = [];
      }

      return updated;
    });
  };

  const toggleAllForModule = (moduleKey) => {
    setFormPerms(prev => {
      const current = prev[moduleKey] || [];
      const allSelected = ACTIONS.every(a => current.includes(a.key));
      const nextPerms = allSelected ? [] : ACTIONS.map(a => a.key);
      
      let updated = {
        ...prev,
        [moduleKey]: nextPerms
      };

      if (allSelected) {
        if (moduleKey === 'DASHBOARD') updated.DASHBOARD_WIDGETS = [];
        if (moduleKey === 'INVENTORY') updated.INVENTORY_SECTIONS = {};
        if (moduleKey === 'CASH') updated.CASH_SECTIONS = {};
        if (moduleKey === 'EXPENSES') updated.EXPENSE_SECTIONS = {};
        if (moduleKey === 'PROCUREMENT') updated.PROCUREMENT_SECTIONS = {};
        if (moduleKey === 'ROUTES') updated.ROUTE_TARGET_SECTIONS = [];
        if (moduleKey === 'REPORTS') updated.REPORT_TARGET_SECTIONS = [];
        if (moduleKey === 'SETTINGS') updated.SETTINGS_TARGET_SECTIONS = [];
      }

      return updated;
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
    all.ROUTE_TARGET_SECTIONS = ROUTE_SECTIONS_LIST.map(s => s.key);
    all.REPORT_TARGET_SECTIONS = REPORT_SECTIONS_LIST.map(s => s.key);
    all.SETTINGS_TARGET_SECTIONS = SETTINGS_SECTIONS.map(s => s.key);

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
    let count = 0;
    Object.keys(perms).forEach(k => {
      const val = perms[k];
      if (Array.isArray(val)) count += val.length;
      else if (typeof val === 'object' && val !== null) {
        Object.values(val).forEach(arr => {
          if (Array.isArray(arr)) count += arr.length;
        });
      }
    });
    return count;
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
              <div className="flex flex-col text-center">
                <span className="text-3xl font-black text-emerald-600 tracking-tight">{getPermCount(formPerms)}</span>
                <span className="text-[10px] font-black text-gray-900 uppercase tracking-widest mt-1">Actions</span>
              </div>
              <div className="w-px h-10 bg-gray-200" />
              <div className="flex flex-col text-center">
                <span className="text-3xl font-black text-emerald-600 tracking-tight">{roleUsers.length}</span>
                <span className="text-[10px] font-black text-gray-900 uppercase tracking-widest mt-1">Users</span>
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
                  <button
                    onClick={toggleAllPermissions}
                    className="text-[9px] font-black text-emerald-600 bg-emerald-50 px-4 py-2 rounded-xl border border-emerald-100 hover:bg-emerald-100 transition-all uppercase tracking-widest"
                  >
                    {Object.keys(formPerms).length > 0 ? 'Clear All Access' : 'Grant All Access'}
                  </button>
                </div>

                <div className="grid grid-cols-1 gap-4">
                  {/* Core Modules */}
                  <CollapsibleSection
                    title="Core Operations"
                    desc="Staff, Vehicles, Sales & HR"
                    icon={LayoutGrid}
                    isOpen={openSections.includes('core')}
                    onToggle={() => toggleAccordion('core')}
                  >
                    <PermissionTable
                      modules={MODULES.filter(m => !['DASHBOARD', 'SETTINGS', 'EXPENSES'].includes(m.key))}
                      formPerms={formPerms}
                      togglePermission={togglePermission}
                      toggleAllForModule={toggleAllForModule}
                    />
                  </CollapsibleSection>

                  {/* Dashboard & Analytics */}
                  <CollapsibleSection
                    title="Dashboard & Metrics"
                    desc="Main overview visibility & widget control"
                    icon={BarChart3}
                    isOpen={openSections.includes('dashboard')}
                    onToggle={() => toggleAccordion('dashboard')}
                  >
                    <div className="space-y-6">
                      <PermissionTable
                        modules={MODULES.filter(m => m.key === 'DASHBOARD')}
                        formPerms={formPerms}
                        togglePermission={togglePermission}
                        toggleAllForModule={toggleAllForModule}
                      />
                      {formPerms.DASHBOARD?.includes('READ') && (
                        <div className="pt-6 border-t border-gray-50">
                          <label className="text-[9px] font-black uppercase tracking-[0.2em] text-emerald-600 mb-4 block">Visible Dashboard Widgets</label>
                          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                            {DASHBOARD_WIDGETS.map(widget => {
                              const Icon = widget.icon;
                              const isChecked = (formPerms.DASHBOARD_WIDGETS || []).includes(widget.key);
                              return (
                                <button
                                  key={widget.key}
                                  onClick={() => {
                                    setFormPerms(prev => {
                                      const cur = prev.DASHBOARD_WIDGETS || [];
                                      const next = cur.includes(widget.key) ? cur.filter(k => k !== widget.key) : [...cur, widget.key];
                                      return { ...prev, DASHBOARD_WIDGETS: next };
                                    });
                                  }}
                                  className={`flex items-center gap-3 p-4 rounded-2xl border transition-all text-left group ${isChecked ? 'bg-emerald-50 border-emerald-100' : 'bg-white border-gray-100 hover:border-emerald-100'}`}
                                >
                                  <div className={`w-8 h-8 rounded-xl flex items-center justify-center transition-all ${isChecked ? 'bg-emerald-600 text-white' : 'bg-gray-50 text-gray-400 group-hover:text-emerald-500'}`}>
                                    <Icon size={16} />
                                  </div>
                                  <div className="flex flex-col min-w-0">
                                    <span className={`text-[11px] font-black uppercase tracking-tight truncate ${isChecked ? 'text-gray-900' : 'text-gray-500'}`}>{widget.label}</span>
                                    <span className="text-[7px] font-bold text-gray-400 uppercase tracking-widest truncate">{widget.desc}</span>
                                  </div>
                                  <div className="ml-auto">
                                    <div className={`w-5 h-5 rounded-lg border-2 flex items-center justify-center transition-all ${isChecked ? 'bg-emerald-500 border-emerald-500 text-white' : 'border-gray-200'}`}>
                                      {isChecked && <Check size={12} strokeWidth={4} />}
                                    </div>
                                  </div>
                                </button>
                              );
                            })}
                          </div>
                        </div>
                      )}
                    </div>
                  </CollapsibleSection>

                  {/* Inventory Operations */}
                  <CollapsibleSection
                    title="Inventory Management"
                    desc="Stock, Master Registry & Loading"
                    icon={Package}
                    isOpen={openSections.includes('inventory')}
                    onToggle={() => toggleAccordion('inventory')}
                  >
                    <PermissionTable
                      modules={INVENTORY_SECTIONS}
                      isGranular={true}
                      sectionKey="INVENTORY_SECTIONS"
                      formPerms={formPerms}
                      togglePermission={togglePermission}
                      toggleAllForModule={toggleAllForModule}
                      customToggle={toggleInventorySectionPermission}
                      customToggleAll={toggleAllForInventorySection}
                    />
                  </CollapsibleSection>

                  {/* Cash Operations */}
                  <CollapsibleSection
                    title="Cash Flow & Safe"
                    desc="Safe Control & Daily Reconciliation"
                    icon={Coins}
                    isOpen={openSections.includes('cash')}
                    onToggle={() => toggleAccordion('cash')}
                    extraHeaderAction={
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          const sections = {};
                          CASH_SECTIONS_LIST.forEach(s => { sections[s.key] = ACTIONS.map(a => a.key); });
                          setFormPerms(prev => ({ ...prev, CASH: ['READ'], CASH_SECTIONS: sections }));
                        }}
                        className="text-[8px] font-black text-emerald-600 bg-emerald-50 px-3 py-1.5 rounded-lg border border-emerald-100 hover:bg-emerald-100 transition-all uppercase tracking-widest hidden sm:block"
                      >
                        Grant All Cash Access
                      </button>
                    }
                  >
                    <PermissionTable
                      modules={CASH_SECTIONS_LIST}
                      isGranular={true}
                      sectionKey="CASH_SECTIONS"
                      formPerms={formPerms}
                      togglePermission={togglePermission}
                      toggleAllForModule={toggleAllForModule}
                      customToggle={toggleCashSectionPermission}
                      customToggleAll={toggleAllForCashSection}
                    />
                  </CollapsibleSection>

                  {/* Expense Control */}
                  <CollapsibleSection
                    title="Expense Control"
                    desc="Monitoring, Approval & Policies"
                    icon={Receipt}
                    isOpen={openSections.includes('expenses')}
                    onToggle={() => toggleAccordion('expenses')}
                    extraHeaderAction={
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          const sections = {};
                          EXPENSE_SECTIONS_LIST.forEach(s => { sections[s.key] = ACTIONS.map(a => a.key); });
                          setFormPerms(prev => ({ ...prev, EXPENSES: ['READ', 'UPDATE'], EXPENSE_SECTIONS: sections }));
                        }}
                        className="text-[8px] font-black text-emerald-600 bg-emerald-50 px-3 py-1.5 rounded-lg border border-emerald-100 hover:bg-emerald-100 transition-all uppercase tracking-widest hidden sm:block"
                      >
                        Grant All Expense Access
                      </button>
                    }
                  >
                    <PermissionTable
                      modules={EXPENSE_SECTIONS_LIST}
                      isGranular={true}
                      sectionKey="EXPENSE_SECTIONS"
                      formPerms={formPerms}
                      togglePermission={togglePermission}
                      toggleAllForModule={toggleAllForModule}
                      customToggle={toggleExpenseSectionPermission}
                      customToggleAll={toggleAllForExpenseSection}
                    />
                  </CollapsibleSection>

                  {/* Procurement */}
                  <CollapsibleSection
                    title="Procurement & Vendors"
                    desc="PO, GRN & Vendor Payments"
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
                      customToggle={toggleProcurementSectionPermission}
                      customToggleAll={toggleAllForProcurementSection}
                    />
                  </CollapsibleSection>

                  {/* Route Management */}
                  <CollapsibleSection
                    title="Route Operations"
                    desc="Villages, Routes & Assignments"
                    icon={MapPin}
                    isOpen={openSections.includes('routes')}
                    onToggle={() => toggleAccordion('routes')}
                  >
                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                      {ROUTE_SECTIONS_LIST.map(section => {
                        const isChecked = (formPerms.ROUTE_TARGET_SECTIONS || []).includes(section.key);
                        return (
                          <button
                            key={section.key}
                            onClick={() => toggleRouteSection(section.key)}
                            className={`flex items-center gap-3 p-4 rounded-2xl border transition-all text-left group ${isChecked ? 'bg-emerald-50 border-emerald-100' : 'bg-white border-gray-100 hover:border-emerald-100'}`}
                          >
                            <div className="flex flex-col min-w-0">
                              <span className={`text-[11px] font-black uppercase tracking-tight truncate ${isChecked ? 'text-gray-900' : 'text-gray-500'}`}>{section.label}</span>
                              <span className="text-[7px] font-bold text-gray-400 uppercase tracking-widest truncate">{section.desc}</span>
                            </div>
                            <div className="ml-auto">
                              <div className={`w-5 h-5 rounded-lg border-2 flex items-center justify-center transition-all ${isChecked ? 'bg-emerald-500 border-emerald-500 text-white' : 'border-gray-200'}`}>
                                {isChecked && <Check size={12} strokeWidth={4} />}
                              </div>
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  </CollapsibleSection>

                  {/* Business Reports */}
                  <CollapsibleSection
                    title="Business Intelligence"
                    desc="Comprehensive data analytics"
                    icon={PieChart}
                    isOpen={openSections.includes('reports')}
                    onToggle={() => toggleAccordion('reports')}
                  >
                    <div className="space-y-6">
                      <PermissionTable
                        modules={MODULES.filter(m => m.key === 'REPORTS')}
                        formPerms={formPerms}
                        togglePermission={togglePermission}
                        toggleAllForModule={toggleAllForModule}
                      />
                      {formPerms.REPORTS?.includes('READ') && (
                        <div className="pt-6 border-t border-gray-50">
                          <label className="text-[9px] font-black uppercase tracking-[0.2em] text-emerald-600 mb-4 block">Accessible Reports</label>
                          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                            {REPORT_SECTIONS_LIST.map(section => {
                              const isChecked = (formPerms.REPORT_TARGET_SECTIONS || []).includes(section.key);
                              return (
                                <button
                                  key={section.key}
                                  onClick={() => toggleReportSection(section.key)}
                                  className={`flex items-center gap-3 p-4 rounded-2xl border transition-all text-left group ${isChecked ? 'bg-emerald-50 border-emerald-100' : 'bg-white border-gray-100 hover:border-emerald-100'}`}
                                >
                                  <div className="flex flex-col min-w-0">
                                    <span className={`text-[11px] font-black uppercase tracking-tight truncate ${isChecked ? 'text-gray-900' : 'text-gray-500'}`}>{section.label}</span>
                                    <span className="text-[7px] font-bold text-gray-400 uppercase tracking-widest truncate">{section.desc}</span>
                                  </div>
                                  <div className="ml-auto">
                                    <div className={`w-5 h-5 rounded-lg border-2 flex items-center justify-center transition-all ${isChecked ? 'bg-emerald-500 border-emerald-500 text-white' : 'border-gray-200'}`}>
                                      {isChecked && <Check size={12} strokeWidth={4} />}
                                    </div>
                                  </div>
                                </button>
                              );
                            })}
                          </div>
                        </div>
                      )}
                    </div>
                  </CollapsibleSection>

                  {/* System Settings */}
                  <CollapsibleSection
                    title="System & POS Settings"
                    desc="POS configurations & global settings"
                    icon={Settings}
                    isOpen={openSections.includes('settings')}
                    onToggle={() => toggleAccordion('settings')}
                  >
                    <div className="space-y-4">
                      {/* SETTINGS module-level toggles */}
                      <PermissionTable
                        modules={[{ key: 'SETTINGS', label: 'Settings', desc: 'System configuration access' }]}
                        formPerms={formPerms}
                        togglePermission={togglePermission}
                        toggleAllForModule={toggleAllForModule}
                      />

                      {/* Granular section access */}
                      {(formPerms.SETTINGS || []).includes('READ') && (
                        <div className="pt-6 border-t border-gray-50">
                          <label className="text-[9px] font-black uppercase tracking-[0.2em] text-emerald-600 mb-4 block">Accessible Setting Sections</label>
                          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                            {SETTINGS_SECTIONS.map(section => {
                              const isChecked = (formPerms.SETTINGS_TARGET_SECTIONS || []).includes(section.key);
                              return (
                                <button
                                  key={section.key}
                                  onClick={() => toggleSettingsSection(section.key)}
                                  className={`flex items-center gap-3 p-4 rounded-2xl border transition-all text-left group ${isChecked ? 'bg-emerald-50 border-emerald-100' : 'bg-white border-gray-100 hover:border-emerald-100'}`}
                                >
                                  <div className="flex flex-col min-w-0">
                                    <span className={`text-[11px] font-black uppercase tracking-tight truncate ${isChecked ? 'text-gray-900' : 'text-gray-500'}`}>{section.label}</span>
                                    <span className="text-[7px] font-bold text-gray-400 uppercase tracking-widest truncate">{section.desc}</span>
                                  </div>
                                  <div className="ml-auto">
                                    <div className={`w-5 h-5 rounded-lg border-2 flex items-center justify-center transition-all ${isChecked ? 'bg-emerald-500 border-emerald-500 text-white' : 'border-gray-200'}`}>
                                      {isChecked && <Check size={12} strokeWidth={4} />}
                                    </div>
                                  </div>
                                </button>
                              );
                            })}
                          </div>
                        </div>
                      )}
                    </div>
                  </CollapsibleSection>
                </div>
              </div>
            ) : (
              <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-300">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <h3 className="text-xs font-black text-gray-900 uppercase tracking-widest flex items-center gap-2">
                    <Users size={14} className="text-emerald-600" /> Active Users for {formName}
                  </h3>
                  
                  <div className="relative">
                    {!isAssigning ? (
                      <button 
                        onClick={() => setIsAssigning(true)}
                        className="flex items-center gap-2 px-4 py-2 bg-emerald-50 text-emerald-600 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-emerald-600 hover:text-white transition-all"
                      >
                        <Plus size={14} strokeWidth={3} />
                        Assign New User
                      </button>
                    ) : (
                      <div className="flex items-center gap-2 animate-in slide-in-from-right-2">
                        <div className="relative">
                          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={14} />
                          <input 
                            autoFocus
                            placeholder="Search Name/Mobile..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="pl-9 pr-4 py-2 bg-gray-50 border border-gray-100 rounded-xl text-xs font-bold focus:bg-white focus:ring-2 focus:ring-emerald-500/10 outline-none min-w-[240px]"
                          />
                          {searchQuery && (
                            <div className="absolute left-0 right-0 top-full mt-2 bg-white border border-gray-100 rounded-2xl shadow-xl z-50 max-h-[200px] overflow-y-auto">
                              {allUsers
                                .filter(u => u.name.toLowerCase().includes(searchQuery.toLowerCase()) || u.mobile.includes(searchQuery))
                                .map(u => (
                                  <button
                                    key={u.id}
                                    onClick={() => handleAssignUser(u.id)}
                                    className="w-full px-4 py-3 flex flex-col text-left hover:bg-emerald-50 transition-colors border-b border-gray-50 last:border-0"
                                  >
                                    <span className="text-[11px] font-black text-gray-900 uppercase">{u.name}</span>
                                    <span className="text-[9px] font-bold text-gray-400">{u.mobile} • {u.role}</span>
                                  </button>
                                ))
                              }
                              {allUsers.filter(u => u.name.toLowerCase().includes(searchQuery.toLowerCase()) || u.mobile.includes(searchQuery)).length === 0 && (
                                <div className="px-4 py-6 text-center text-[10px] font-bold text-gray-400 uppercase">No users found</div>
                              )}
                            </div>
                          )}
                        </div>
                        <button 
                          onClick={() => { setIsAssigning(false); setSearchQuery(''); }}
                          className="p-2 text-gray-400 hover:text-rose-600 rounded-xl"
                        >
                          <X size={18} />
                        </button>
                      </div>
                    )}
                  </div>
                </div>

                {fetchingUsers ? (
                  <div className="flex flex-col items-center justify-center py-20 gap-4">
                    <Loader2 className="animate-spin text-emerald-600" size={32} />
                    <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Scanning staff records...</p>
                  </div>
                ) : roleUsers.length === 0 ? (
                  <div className="bg-gray-50 rounded-[2rem] border border-dashed border-gray-200 py-20 text-center">
                    <Users size={40} className="mx-auto text-gray-200 mb-4" />
                    <p className="text-sm font-bold text-gray-300 uppercase">No users assigned to this role</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {roleUsers.map(user => (
                      <div key={user.id} className="bg-white border border-gray-100 p-6 rounded-[2rem] shadow-sm flex items-center justify-between group hover:border-emerald-100 transition-all">
                        <div className="flex items-center gap-4">
                          <div className="w-12 h-12 rounded-2xl bg-gray-50 flex items-center justify-center text-emerald-600 group-hover:bg-emerald-600 group-hover:text-white transition-all">
                            <Users size={20} />
                          </div>
                          <div className="flex flex-col">
                            <span className="text-sm font-black text-gray-900 uppercase tracking-tight">{user.name}</span>
                            <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">{user.mobile}</span>
                          </div>
                        </div>
                        <button
                          title="Remove from role (account stays intact)"
                          onClick={() => handleRemoveFromRole(user.id, user.name)}
                          className="p-3 text-amber-400 hover:text-amber-600 hover:bg-amber-50 rounded-2xl transition-all"
                        >
                          <XCircle size={18} strokeWidth={2.5} />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>

          <div className="px-8 py-6 bg-gray-50/50 border-t border-gray-100 flex items-center justify-between">
            <button
              onClick={() => setShowModal(false)}
              className="px-6 py-3 text-[10px] font-black text-gray-400 uppercase tracking-widest hover:text-gray-600 transition-all"
            >
              Cancel Changes
            </button>
            <button
              onClick={handleSave}
              disabled={saving}
              className="bg-emerald-600 text-white px-10 py-4 rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-emerald-700 transition-all shadow-xl shadow-emerald-200 disabled:opacity-50 flex items-center gap-3"
            >
              {saving ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
              {isEditing ? 'Save Privileges' : 'Create Access Role'}
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-in fade-in duration-700">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="flex flex-col gap-1">
          <h2 className="text-3xl font-black text-gray-900 tracking-tight">Access Control Center</h2>
          <p className="text-sm font-medium text-gray-500 uppercase tracking-widest italic">Define Enterprise-wide Permissions & Roles</p>
        </div>
        <button
          onClick={openCreateModal}
          className="bg-emerald-600 text-white px-8 py-3.5 rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-emerald-700 transition-all shadow-xl shadow-emerald-200 flex items-center gap-3 active:scale-95"
        >
          <Plus size={16} strokeWidth={3} />
          Define New Role
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {roles.map((role) => (
          <div
            key={role.id}
            className="group bg-white border border-gray-100 p-8 rounded-[3rem] shadow-sm hover:shadow-xl hover:shadow-emerald-500/5 hover:-translate-y-1 transition-all duration-500"
          >
            <div className="flex items-start justify-between mb-6">
              <div className="w-14 h-14 rounded-[1.5rem] bg-emerald-50 text-emerald-600 flex items-center justify-center group-hover:scale-110 transition-transform duration-500">
                <Shield size={28} />
              </div>
              <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-all duration-300">
                <button
                  onClick={() => openEditModal(role)}
                  className="p-3 bg-white border border-gray-100 rounded-2xl text-gray-400 hover:text-emerald-600 hover:border-emerald-100 shadow-sm transition-all"
                >
                  <Pencil size={18} strokeWidth={2.5} />
                </button>
                <button
                  onClick={() => handleDelete(role.id)}
                  disabled={deletingId === role.id}
                  className="p-3 bg-white border border-gray-100 rounded-2xl text-gray-400 hover:text-rose-600 hover:border-rose-100 shadow-sm transition-all"
                >
                  {deletingId === role.id ? <Loader2 size={18} className="animate-spin" /> : <Trash2 size={18} strokeWidth={2.5} />}
                </button>
              </div>
            </div>

            <div className="space-y-2 mb-8">
              <h3 className="text-xl font-black text-gray-900 tracking-tight uppercase group-hover:text-emerald-600 transition-colors">{role.name}</h3>
              <p className="text-xs font-bold text-gray-400 line-clamp-2 uppercase tracking-widest">{role.description || 'Global Access Policy'}</p>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="bg-gray-50/50 rounded-2xl p-4 border border-gray-50 group-hover:bg-white group-hover:border-emerald-100 transition-all">
                <div className="flex items-center gap-2 mb-1">
                  <Users size={12} className="text-emerald-500" />
                  <span className="text-[9px] font-black text-gray-400 uppercase tracking-widest">Active Users</span>
                </div>
                <span className="text-lg font-black text-gray-900">{role._count?.users || 0}</span>
              </div>
              <div className="bg-gray-50/50 rounded-2xl p-4 border border-gray-50 group-hover:bg-white group-hover:border-emerald-100 transition-all">
                <div className="flex items-center gap-2 mb-1">
                  <Key size={12} className="text-emerald-500" />
                  <span className="text-[9px] font-black text-gray-400 uppercase tracking-widest">Permissions</span>
                </div>
                <span className="text-lg font-black text-gray-900">{getPermCount(role.permissions)}</span>
              </div>
            </div>

            <button
              onClick={() => openEditModal(role)}
              className="w-full mt-8 py-4 bg-gray-900 text-white rounded-2xl text-[9px] font-black uppercase tracking-widest opacity-0 group-hover:opacity-100 transition-all duration-500 hover:bg-emerald-600 translate-y-4 group-hover:translate-y-0"
            >
              Configure Privileges
            </button>
          </div>
        ))}

        {roles.length === 0 && (
          <div className="col-span-full py-32 text-center bg-white rounded-[3rem] border border-dashed border-gray-200">
            <Shield size={56} className="mx-auto text-gray-100 mb-6" />
            <h3 className="text-2xl font-black text-gray-200 uppercase tracking-tighter">No Roles Defined</h3>
          </div>
        )}
      </div>
    </div>
  );
}
