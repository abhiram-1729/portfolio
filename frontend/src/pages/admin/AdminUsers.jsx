import React, { useState, useEffect } from 'react';
import { Plus, User, Phone, Mail, Truck, MoreVertical, X, Loader2, ShieldCheck, UserCog, Users, Pencil, Trash2, Pause, Play, AlertCircle, Search, Store, ArrowLeft, ArrowRight, ChevronLeft, ChevronRight, CheckCircle2, FileText, Download, Printer } from 'lucide-react';
import { useSearchParams, useNavigate, useLocation } from 'react-router-dom';
import StoreSelector from './StoreSelector';
import { useUserStore } from '../../store/userStore';
import adminAPI from '../../services/adminService';
import toast from 'react-hot-toast';
import * as XLSX from 'xlsx';
import { generateReportPDF } from './adminreports/ReportUtils';
export default function AdminUsers({ type }) {
  const [users, setUsers] = useState([]);
  const [stores, setStores] = useState([]);
  const [customRoles, setCustomRoles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [searchParams, setSearchParams] = useSearchParams();
  const storeFilterId = searchParams.get('storeId');
  const navigate = useNavigate();
  const location = useLocation();
  const isTenantRoute = location.pathname.includes('/tenant/');
  const currentUser = useUserStore(s => s.user);
  const can = useUserStore(s => s.can);

  const [newUser, setNewUser] = useState({
    name: '',
    email: '',
    password: '',
    mobile: '',
    role: type === 'admin' ? 'ADMIN' : 'SALES_AGENT',
    vgeType: 'EMPLOYEE',
    storeId: storeFilterId || currentUser?.storeId || '',
    dailyTarget: 10000,
    baseSalary: 12000,
    customRoleId: '',
    attendanceEnabled: true,
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingUser, setEditingUser] = useState(null);
  const [deletingId, setDeletingId] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [activeTab, setActiveTab] = useState('all');
  const [currentPage, setCurrentPage] = useState(1);
  const ITEMS_PER_PAGE = 10;

  useEffect(() => {
    if (type) {
      setActiveTab('all');
    }
  }, [type]);

  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, activeTab, storeFilterId]);

  const fetchUsers = async () => {
    try {
      const { data } = await adminAPI.getUsers({ storeId: storeFilterId });
      setUsers(data);
    } catch (error) {
      toast.error('Failed to fetch users');
    }
  };

  const fetchStores = async () => {
    try {
      const res = await adminAPI.getStores();
      if (res.data?.success) {
        const fetchedStores = res.data.data;
        setStores(fetchedStores);
        // Auto-select if only one store exists
        if (fetchedStores.length === 1 && !storeFilterId) {
          setSearchParams({ storeId: fetchedStores[0].id });
        }
      }
    } catch (error) {
      console.error('Failed to fetch stores:', error);
    }
  };

  const fetchCustomRoles = async () => {
    try {
      const res = await adminAPI.getRoles();
      if (res.data?.success) {
        setCustomRoles(res.data.data);
      }
    } catch (error) {
      console.error('Failed to fetch roles:', error);
    }
  };

  useEffect(() => {
    Promise.all([fetchUsers(), fetchStores(), fetchCustomRoles()]).finally(() => setLoading(false));
  }, [storeFilterId]);

  const handleCreateUser = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      await adminAPI.createUser(newUser);
      toast.success('User created successfully');
      setShowAddModal(false);
      setNewUser({ name: '', email: '', password: '', mobile: '', role: type === 'admin' ? 'ADMIN' : 'SALES_AGENT', vgeType: 'EMPLOYEE', storeId: storeFilterId || currentUser?.storeId || '', dailyTarget: 10000, baseSalary: 12000, customRoleId: '', attendanceEnabled: true });
      fetchUsers();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to create user');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleUpdateUser = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      await adminAPI.updateUser(editingUser.id, editingUser);
      toast.success('User updated successfully');
      setShowEditModal(false);
      fetchUsers();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to update user');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleToggleStatus = async (user) => {
    const newStatus = user.status === 'ACTIVE' ? 'SUSPENDED' : 'ACTIVE';
    const originalStatus = user.status;

    // Optimistic UI update
    setUsers(prev => prev.map(u => u.id === user.id ? { ...u, status: newStatus } : u));

    try {
      await adminAPI.updateUser(user.id, { status: newStatus });
      toast.success(`User ${newStatus === 'ACTIVE' ? 'activated' : 'suspended'}`);
    } catch (error) {
      setUsers(prev => prev.map(u => u.id === user.id ? { ...u, status: originalStatus } : u));
      toast.error('Failed to update status');
    }
  };

  const handleDeleteUser = async (id) => {
    if (!window.confirm('Are you sure you want to delete this staff member? This action cannot be undone.')) return;
    setDeletingId(id);
    try {
      await adminAPI.deactivateUser(id);
      toast.success('Staff member removed');
      fetchUsers();
    } catch (error) {
      toast.error('Failed to remove user');
    } finally {
      setDeletingId(null);
    }
  };

  const getRoleBadge = (roleName, customRole) => {
    const roles = {
      SUPER_ADMIN: { label: 'Sys Admin', color: 'bg-rose-50 text-rose-700 border-rose-100', icon: ShieldCheck },
      TENANT_OWNER: { label: 'Owner', color: 'bg-indigo-50 text-indigo-700 border-indigo-100', icon: ShieldCheck },
      ADMIN: { label: 'Admin', color: 'bg-blue-50 text-blue-700 border-blue-100', icon: ShieldCheck },
      SALES_AGENT: { label: 'Sales', color: 'bg-emerald-50 text-emerald-700 border-emerald-100', icon: Truck },
      SUPERVISOR: { label: 'Sup', color: 'bg-amber-50 text-amber-700 border-amber-100', icon: UserCog },
      HELPER: { label: 'Helper', color: 'bg-slate-50 text-slate-700 border-slate-100', icon: Users },
    };

    // If there's a custom role, we use its name as the primary label
    if (customRole?.name) {
      const isSystemAdmin = customRole.portalType === 'ADMIN' || customRole.portalType === 'SUPERVISOR';
      return (
        <span className={`inline-flex items-center gap-1 px-1.5 py-0 rounded-md text-[9px] font-black border uppercase tracking-tighter ${isSystemAdmin ? 'bg-blue-50 text-blue-700 border-blue-100' : 'bg-emerald-50 text-emerald-700 border-emerald-100'}`}>
          {isSystemAdmin ? <ShieldCheck size={8} /> : <Truck size={8} />}
          {customRole.name}
        </span>
      );
    }

    const r = roles[roleName] || { label: roleName, color: 'bg-gray-50 text-gray-700 border-gray-100', icon: User };
    const Icon = r.icon;
    
    return (
      <span className={`inline-flex items-center gap-1 px-1.5 py-0 rounded-md text-[9px] font-black border uppercase tracking-tighter ${r.color}`}>
        <Icon size={8} />
        {r.label}
      </span>
    );
  };

  const getStatusBadge = (status) => {
    if (status === 'SUSPENDED') {
      return (
        <span className="inline-flex items-center gap-1 px-1.5 py-0 rounded-md text-[9px] font-black border border-rose-100 bg-rose-50 text-rose-600 uppercase tracking-tighter">
          <Pause size={8} />
          Suspended
        </span>
      );
    }
    return null;
  };

  const getVgeTypeBadge = (vgeType) => {
    if (vgeType === 'FREELANCER') {
      return (
        <span className="inline-flex items-center gap-1 px-1.5 py-0 rounded-md text-[9px] font-black border border-blue-100 bg-blue-50 text-blue-600 uppercase tracking-tighter">
          Freelancer (Apps)
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1 px-1.5 py-0 rounded-md text-[9px] font-black border border-emerald-100 bg-emerald-50 text-emerald-600 uppercase tracking-tighter">
        Employee
      </span>
    );
  };

  const getInitials = (name) => {
    return name?.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase() || '??';
  };

  const filteredUsers = React.useMemo(() => {
    return users.filter(u => {
      // 1. Primary Filter by Portal Type (Admin vs Staff)
      const userIsAdmin = u.role === 'ADMIN' || 
                         u.customRole?.portalType === 'ADMIN' || 
                         u.customRole?.portalType === 'SUPERVISOR' ||
                         u.role === 'TENANT_OWNER';

      if (type === 'admin' && !userIsAdmin) return false;
      if (type === 'staff' && userIsAdmin) return false;

      // 2. Tab Filter
      const roleMatches = activeTab === 'all'
        ? true
        : activeTab === 'admin'
          ? userIsAdmin
          : activeTab === 'agent'
            ? !userIsAdmin
            : u.customRoleId === activeTab;

      if (!roleMatches) return false;

      // 3. Hide Current User (Self)
      if (u.id === currentUser?.id) return false;

      // 4. Search Filter
      const searchLower = (searchTerm || '').toLowerCase();
      if (
        searchTerm &&
        !u.name?.toLowerCase().includes(searchLower) &&
        !u.mobile?.includes(searchTerm) &&
        !u.role?.toLowerCase().includes(searchLower) &&
        !u.customRole?.name?.toLowerCase().includes(searchLower)
      ) {
        return false;
      }

      // 5. Store Filter
      if (storeFilterId && u.storeId !== storeFilterId) {
        return false;
      }

      return true;
    });
  }, [users, activeTab, searchTerm, storeFilterId, currentUser?.id, type]);

  const handleCustomRoleChange = (roleId, isEdit = false) => {
    const role = customRoles.find(r => r.id === roleId);
    if (!role) {
      if (isEdit) {
        setEditingUser(prev => ({ ...prev, customRoleId: null, role: activeTab === 'admin' ? 'ADMIN' : 'SALES_AGENT' }));
      } else {
        setNewUser(prev => ({ ...prev, customRoleId: null, role: activeTab === 'admin' ? 'ADMIN' : 'SALES_AGENT' }));
      }
      return;
    }

    // Map portalType to system role
    // ADMIN / SUPERVISOR -> ADMIN
    // AGENT / HELPER -> SALES_AGENT
    const systemRole = (role.portalType === 'ADMIN' || role.portalType === 'SUPERVISOR') ? 'ADMIN' : 'SALES_AGENT';

    if (isEdit) {
      setEditingUser(prev => ({ ...prev, customRoleId: roleId, role: systemRole }));
    } else {
      setNewUser(prev => ({ ...prev, customRoleId: roleId, role: systemRole }));
    }
  };

  const relevantCustomRoles = React.useMemo(() => {
    return customRoles.filter(role => {
      const isCustomAdmin = (role.portalType === 'ADMIN' || role.portalType === 'SUPERVISOR');
      return (type === 'admin' && isCustomAdmin) || (type === 'staff' && !isCustomAdmin);
    });
  }, [customRoles, type]);

  const showDetailColumns = React.useMemo(() => {
    if (activeTab === 'admin') return false;
    if (activeTab === 'staff') return true;
    // For custom roles, show columns if any user in this group is operational (not ADMIN)
    return filteredUsers.some(u => u.role !== 'ADMIN');
  }, [activeTab, filteredUsers]);

  const totalPages = React.useMemo(() => Math.ceil(filteredUsers.length / ITEMS_PER_PAGE), [filteredUsers.length]);
  const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
  const paginatedUsers = React.useMemo(() => filteredUsers.slice(startIndex, startIndex + ITEMS_PER_PAGE), [filteredUsers, startIndex]);

  const handleExportPDF = () => {
    generateReportPDF('users', filteredUsers);
  };

  const handleExportExcel = () => {
    try {
      const exportData = filteredUsers.map(u => ({
        'Name': u.name,
        'Email': u.email,
        'Mobile': u.mobile || 'N/A',
        'Role': u.role,
        'Custom Role': u.customRole?.name || 'Standard',
        'Store': u.store?.name || 'Unassigned',
        'VGE Type': u.vgeType,
        'Status': u.status,
        'Base Salary': u.baseSalary || 0
      }));

      const ws = XLSX.utils.json_to_sheet(exportData);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, "Users");
      XLSX.writeFile(wb, `Users_Export_${new Date().toISOString().split('T')[0]}.xlsx`);
      toast.success('Excel exported successfully');
    } catch (error) {
      toast.error('Failed to export Excel');
    }
  };

  const handlePrint = () => {
    generateReportPDF('users', filteredUsers, true);
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
        <Loader2 className="animate-spin text-emerald-600" size={40} />
        <p className="text-gray-500 font-medium tracking-wide">Loading Members...</p>
      </div>
    );
  }
  const renderGroup = (groupUsers) => (
    <>
      {/* Mobile Card View */}
      <div className="md:hidden space-y-4 mb-8">
        {groupUsers.map((user) => (
          <div
            key={user.id}
            className={`bg-white p-5 rounded-3xl border border-gray-100 shadow-sm flex flex-col gap-4 relative overflow-hidden transition-all ${user.status === 'SUSPENDED' ? 'bg-gray-50/50 grayscale opacity-80' : ''}`}
          >
            <div className="flex justify-between items-start">
              <div className="flex items-center gap-4">
                <div className={`w-12 h-12 rounded-2xl flex items-center justify-center font-black text-sm border shadow-inner ${user.status === 'SUSPENDED' ? 'bg-gray-200 text-gray-500 border-gray-300' : 'bg-emerald-50 text-emerald-600 border-emerald-100'}`}>
                  {getInitials(user.name)}
                </div>
                <div className="flex flex-col">
                  <div className="flex items-center gap-2">
                    <h3 className={`font-black text-gray-900 tracking-tight leading-none ${user.status === 'SUSPENDED' ? 'line-through' : ''}`}>{user.name}</h3>
                    {getStatusBadge(user.status)}
                  </div>
                  {user.displayId && <span className="text-[9px] font-black text-teal-600 bg-teal-50 px-1.5 py-0.5 rounded w-fit tracking-wider mt-0.5">{user.displayId}</span>}
                  <div className="mt-1 flex flex-wrap gap-1 items-center">
                    {getRoleBadge(user.role)}
                    {getVgeTypeBadge(user.vgeType)}
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-1">
                {can('STAFF', 'UPDATE') && (
                  <button onClick={() => {
                    const { password, ...userWithoutPass } = user;
                    setEditingUser({ ...userWithoutPass, password: '' });
                    setShowEditModal(true);
                  }}
                    className="p-2 text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-xl transition-all">
                    <Pencil size={15} />
                  </button>
                )}
                {can('STAFF', 'TOGGLE_STATUS') && (
                  <button
                    onClick={() => handleToggleStatus(user)}
                    className={cn(
                      "relative inline-flex h-5 w-9 shrink-0 cursor-pointer items-center rounded-full border-2 border-transparent transition-colors duration-300 focus:outline-none",
                      user.status === 'ACTIVE' ? "bg-emerald-500" : "bg-gray-200"
                    )}
                  >
                    <span className={cn(
                      "pointer-events-none inline-block h-3 w-3 transform rounded-full bg-white shadow-lg ring-0 transition-all duration-300",
                      user.status === 'ACTIVE' ? "translate-x-4" : "translate-x-0"
                    )} />
                  </button>
                )}
                {can('STAFF', 'DELETE') && (
                  <button onClick={() => handleDeleteUser(user.id)}
                    disabled={deletingId === user.id}
                    className="p-2 text-gray-400 hover:text-rose-600 hover:bg-rose-50 rounded-xl transition-all disabled:opacity-50">
                    {deletingId === user.id ? <Loader2 size={15} className="animate-spin text-rose-400" /> : <Trash2 size={15} />}
                  </button>
                )}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3 pb-1">
              <div className="flex flex-col gap-1">
                <span className="text-[9px] font-black uppercase text-gray-400 tracking-widest">Mobile</span>
                <span className="text-xs font-black text-gray-700 flex items-center gap-1.5"><Phone size={10} className="text-emerald-500" /> {user.mobile || '---'}</span>
              </div>
              <div className="flex flex-col gap-1">
                <span className="text-[9px] font-black uppercase text-gray-400 tracking-widest">Base Store</span>
                <span className="text-xs font-black text-emerald-700 flex items-center gap-1.5 truncate"><Store size={10} /> {user.store?.name || 'Unassigned'}</span>
              </div>
            </div>

            {user.role !== 'ADMIN' && (
              <>
                <div className="grid grid-cols-2 gap-3 pb-1 pt-1 border-t border-gray-50">
                  <div className="flex flex-col gap-1">
                    <span className="text-[9px] font-black uppercase text-gray-400 tracking-widest">Role Type</span>
                    {getRoleBadge(user.role)}
                  </div>
                  <div className="flex flex-col gap-1">
                    <span className="text-[9px] font-black uppercase text-gray-400 tracking-widest">Vehicle</span>
                    <span className="text-xs font-black text-blue-600 flex items-center gap-1.5"><Truck size={10} /> {user.assignedVehicle?.vehicleNumber || 'No Truck'}</span>
                  </div>
                </div>
                <div className="mt-1">
                  <div className="bg-indigo-50/50 p-4 rounded-2xl border border-indigo-100/50 flex flex-col items-center">
                    <span className="text-[10px] font-black uppercase text-indigo-600 tracking-widest mb-1">Monthly CTC Package</span>
                    <span className="text-lg font-black text-indigo-950">₹{(user.baseSalary || 0).toLocaleString()}</span>
                  </div>
                </div>
              </>
            )}
          </div>
        ))}
      </div>

      {/* Desktop Table View */}
      <div className="hidden md:block bg-white rounded-3xl border border-gray-100 shadow-sm overflow-hidden mb-8">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-gray-50/50">
              <th className="px-3 py-2 text-[9px] font-black uppercase tracking-widest text-gray-400">Team Member</th>
              <th className="px-3 py-2 text-[9px] font-black uppercase tracking-widest text-gray-400 text-center">Store Context</th>
              <th className="px-3 py-2 text-[9px] font-black uppercase tracking-widest text-gray-400 text-center">Contact Info</th>
              {showDetailColumns && <th className="px-3 py-2 text-[9px] font-black uppercase tracking-widest text-gray-400 text-center">Role / Vehicle</th>}
              {showDetailColumns && <th className="px-3 py-2 text-[9px] font-black uppercase tracking-widest text-gray-400 text-center">Monthly CTC</th>}
              <th className="px-3 py-2 text-[9px] font-black uppercase tracking-widest text-gray-400 text-center">Account Status</th>
              <th className="px-3 py-2 text-[9px] font-black uppercase tracking-widest text-gray-400 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {groupUsers.map((user) => (
              <tr
                key={user.id}
                className={`hover:bg-gray-50/30 transition-colors group ${user.status === 'SUSPENDED' ? 'bg-gray-50/50 opacity-80 grayscale-[0.5]' : ''}`}
              >
                <td className="px-3 py-2 border-r border-gray-50 group-hover:border-transparent">
                  <div className="flex items-center gap-3">
                    <div className={`w-8 h-8 rounded-xl flex items-center justify-center font-black text-[10px] border shadow-inner transition-colors ${user.status === 'SUSPENDED' ? 'bg-gray-200 text-gray-500 border-gray-300' : 'bg-gray-50 text-gray-400 border-gray-100 group-hover:bg-emerald-600 group-hover:text-white group-hover:border-emerald-500 transition-all'}`}>
                      {getInitials(user.name)}
                    </div>
                    <div className="flex flex-col">
                      <span className={`text-xs font-black text-gray-900 tracking-tight leading-none mb-0.5 ${user.status === 'SUSPENDED' ? 'line-through text-gray-400' : ''}`}>
                        {user.name}
                      </span>
                      <div className="flex items-center gap-2">
                        {user.displayId && <span className="text-[8px] font-black text-teal-600 bg-teal-50 px-1 py-0 rounded tracking-wider">{user.displayId}</span>}
                        <span className="text-[9px] text-gray-400 font-bold tracking-tight">{user.email}</span>
                        {getStatusBadge(user.status)}
                      </div>
                    </div>
                  </div>
                </td>
                <td className="px-3 py-2 text-center border-r border-gray-50 group-hover:border-transparent">
                  <div className="flex flex-col items-center">
                    <span className={`text-[10px] font-black flex items-center gap-1 px-1.5 py-0.5 rounded-md border ${user.store ? 'bg-emerald-50 text-emerald-700 border-emerald-100' : 'bg-orange-50 text-orange-700 border-orange-100'}`}>
                      <Store size={10} className={user.store ? "text-emerald-500" : "text-orange-500"} /> {user.store?.name || 'Unassigned'}
                    </span>
                  </div>
                </td>
                <td className="px-3 py-2 text-center border-r border-gray-50 group-hover:border-transparent">
                  <div className="flex flex-col items-center">
                    <span className="text-[10px] font-black text-gray-700 flex items-center gap-1">
                      <Phone size={10} className="text-emerald-500" /> {user.mobile || 'No Contact'}
                    </span>
                  </div>
                </td>
                {showDetailColumns && (
                  <td className="px-3 py-2 text-center border-r border-gray-50 group-hover:border-transparent">
                    {user.role !== 'ADMIN' ? (
                      <div className="flex flex-col items-center gap-1">
                        {getRoleBadge(user.role, user.customRole)}
                        <div className={`flex items-center gap-1 px-1.5 py-0 rounded-lg text-[8px] font-black border uppercase tracking-widest ${user.assignedVehicle ? 'bg-blue-50 text-blue-700 border-blue-100' : 'bg-gray-50 text-gray-400 border-gray-100'}`}>
                          <Truck size={8} />
                          {user.assignedVehicle?.vehicleNumber || 'Unassigned'}
                        </div>
                        {getVgeTypeBadge(user.vgeType)}
                      </div>
                    ) : (
                      <div className="flex flex-col items-center gap-1">
                        {getRoleBadge(user.role, user.customRole)}
                        <span className="text-[8px] font-bold text-gray-300 uppercase tracking-widest mt-0.5">N/A</span>
                      </div>
                    )}
                  </td>
                )}
                {showDetailColumns && (
                  <td className="px-3 py-2 text-center border-r border-gray-50 group-hover:border-transparent">
                    {user.role !== 'ADMIN' ? (
                      <span className="text-[11px] font-black text-indigo-600">
                        ₹{(user.baseSalary || 0).toLocaleString()}
                      </span>
                    ) : (
                      <span className="text-[10px] font-bold text-gray-300">---</span>
                    )}
                  </td>
                )}
                <td className="px-3 py-2 text-center border-r border-gray-50 group-hover:border-transparent">
                  <div className="flex items-center justify-center">
                    {can('STAFF', 'TOGGLE_STATUS') ? (
                      <button
                        onClick={() => handleToggleStatus(user)}
                        className={cn(
                          "relative inline-flex h-4 w-8 shrink-0 cursor-pointer items-center rounded-full border-2 border-transparent transition-colors duration-300 focus:outline-none",
                          user.status === 'ACTIVE' ? "bg-emerald-500" : "bg-gray-200"
                        )}
                      >
                        <span className={cn(
                          "pointer-events-none inline-block h-2.5 w-2.5 transform rounded-full bg-white shadow-lg ring-0 transition-all duration-300",
                          user.status === 'ACTIVE' ? "translate-x-4" : "translate-x-0"
                        )} />
                      </button>
                    ) : (
                      <span className={cn(
                        "px-1.5 py-0 rounded text-[8px] font-black uppercase tracking-widest",
                        user.status === 'ACTIVE' ? "bg-emerald-50 text-emerald-600 border border-emerald-100" : "bg-gray-50 text-gray-400 border border-gray-100"
                      )}>
                        {user.status}
                      </span>
                    )}
                  </div>
                </td>
                <td className="px-3 py-2">
                  <div className="flex items-center justify-end gap-1">
                    {can('STAFF', 'UPDATE') && (
                      <button
                        onClick={() => {
                          const { password, ...userWithoutPass } = user;
                          setEditingUser({ ...userWithoutPass, password: '' });
                          setShowEditModal(true);
                        }}
                        title="Edit Profile"
                        className="p-1.5 text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-all"
                      >
                        <Pencil size={13} />
                      </button>
                    )}
                    {can('STAFF', 'DELETE') && (
                      <button
                        onClick={() => handleDeleteUser(user.id)}
                        title="Permanent Removal"
                        disabled={deletingId === user.id}
                        className="p-1.5 text-gray-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-all disabled:opacity-50"
                      >
                        {deletingId === user.id ? <Loader2 size={13} className="animate-spin text-rose-400" /> : <Trash2 size={13} />}
                      </button>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );

  const renderClassifiedUsers = () => {
    // Show store selection grid if no store is selected
    if (!storeFilterId) {
      const personnelByStore = users.reduce((acc, u) => {
        if (u.storeId && u.id !== currentUser?.id) {
          acc[u.storeId] = (acc[u.storeId] || 0) + 1;
        }
        return acc;
      }, {});

      return (
        <div className="flex flex-col gap-4 pt-4 animate-in fade-in slide-in-from-bottom-6 max-w-5xl">
          <div className="mb-2">
            <h3 className="text-xl font-black tracking-tight text-gray-900">Platform Branches</h3>
            <p className="text-[10px] font-bold text-gray-400 tracking-widest uppercase mt-1 italic">Select a branch to manage its {type === 'admin' ? 'Administrative' : 'Operations'} team</p>
          </div>
          {stores.map(store => {
            const personnelCount = personnelByStore[store.id] || 0;
            return (
              <button
                key={store.id}
                onClick={() => setSearchParams({ storeId: store.id })}
                className="group w-full bg-white p-5 rounded-[1.5rem] border border-gray-100 shadow-sm hover:shadow-xl hover:border-emerald-200 transition-all duration-300 flex items-center justify-between gap-6 relative overflow-hidden"
              >
                <div className="absolute left-0 top-0 w-2 h-full bg-emerald-500/10 group-hover:bg-emerald-500 transition-all" />
                
                <div className="flex items-center gap-5">
                  <div className="w-12 h-12 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center group-hover:bg-emerald-600 group-hover:text-white transition-colors shrink-0">
                    <Store size={24} strokeWidth={2.5} />
                  </div>
                  <div className="flex flex-col text-left">
                    <h4 className="text-lg font-black text-gray-900 tracking-tight leading-none mb-1">{store.name}</h4>
                    <div className="flex items-center gap-2">
                      <span className="text-[9px] font-black text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded tracking-widest uppercase">{store.code || 'Branch'}</span>
                      {store.stateCode && <span className="text-[9px] font-bold text-gray-400 uppercase tracking-widest">• {store.stateCode}</span>}
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-6">
                  <div className="hidden md:flex flex-col items-end">
                    <span className="text-[10px] font-black uppercase text-gray-400 tracking-widest">Total Personnel</span>
                    <span className="text-sm font-bold text-gray-900">{personnelCount} Members</span>
                  </div>
                  <div className="w-10 h-10 rounded-xl bg-gray-50 flex items-center justify-center text-gray-400 group-hover:bg-emerald-600 group-hover:text-white transition-all">
                    <ArrowRight size={20} strokeWidth={3} />
                  </div>
                </div>
              </button>
            );
          })}
          {stores.length === 0 && (
            <div className="py-12 text-center bg-white rounded-[2rem] border border-dashed border-gray-200">
              <Store size={48} className="mx-auto text-gray-300 mb-4" />
              <p className="text-sm font-bold text-gray-400 uppercase tracking-widest">No Active Branches Found</p>
            </div>
          )}
        </div>
      );
    }

    return (
      <div className="flex flex-col gap-6">
        {renderGroup(paginatedUsers)}

        {totalPages > 1 && (
          <div className="flex items-center justify-between bg-white px-6 py-4 rounded-3xl border border-gray-100 shadow-sm animate-in fade-in slide-in-from-bottom-2">
            <div className="flex items-center gap-2">
              <p className="text-[10px] font-black uppercase text-gray-400 tracking-widest">
                Showing {startIndex + 1}-{Math.min(startIndex + ITEMS_PER_PAGE, filteredUsers.length)} of {filteredUsers.length}
              </p>
            </div>

            <div className="flex items-center gap-1.5">
              <button
                onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                disabled={currentPage === 1}
                className="p-2 rounded-xl border border-gray-100 text-gray-400 hover:text-emerald-600 hover:border-emerald-100 hover:bg-emerald-50 disabled:opacity-30 disabled:hover:bg-transparent disabled:hover:border-gray-100 disabled:hover:text-gray-400 transition-all"
              >
                <ChevronLeft size={16} />
              </button>

              <div className="flex items-center gap-1">
                {[...Array(totalPages)].map((_, i) => {
                  const pageNum = i + 1;
                  // Show current page, first, last, and pages around current
                  if (
                    pageNum === 1 ||
                    pageNum === totalPages ||
                    (pageNum >= currentPage - 1 && pageNum <= currentPage + 1)
                  ) {
                    return (
                      <button
                        key={pageNum}
                        onClick={() => setCurrentPage(pageNum)}
                        className={`w-9 h-9 rounded-xl text-[10px] font-black transition-all ${currentPage === pageNum
                            ? 'bg-emerald-600 text-white shadow-lg shadow-emerald-200'
                            : 'text-gray-400 hover:text-gray-600 hover:bg-gray-50'
                          }`}
                      >
                        {pageNum}
                      </button>
                    );
                  } else if (
                    pageNum === currentPage - 2 ||
                    pageNum === currentPage + 2
                  ) {
                    return <span key={pageNum} className="text-gray-300 px-1">...</span>;
                  }
                  return null;
                })}
              </div>

              <button
                onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                disabled={currentPage === totalPages}
                className="p-2 rounded-xl border border-gray-100 text-gray-400 hover:text-emerald-600 hover:border-emerald-100 hover:bg-emerald-50 disabled:opacity-30 disabled:hover:bg-transparent disabled:hover:border-gray-100 disabled:hover:text-gray-400 transition-all"
              >
                <ChevronRight size={16} />
              </button>
            </div>
          </div>
        )}
      </div>
    );
  };

  if (showAddModal) {
    return (
      <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-500 pb-20">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button
              onClick={() => setShowAddModal(false)}
              className="p-2.5 bg-white border border-gray-100 rounded-2xl text-gray-400 hover:text-emerald-600 hover:border-emerald-100 transition-all shadow-sm group"
            >
              <ArrowLeft size={20} className="group-hover:-translate-x-0.5 transition-transform" />
            </button>
            <div>
              <h2 className="text-2xl font-black text-gray-900 tracking-tight">Hire New Member</h2>
              <p className="text-[10px] uppercase font-black text-gray-400 tracking-widest mt-1 italic">Organization Expansion & Access Control</p>
            </div>
          </div>
          <button
            onClick={() => setShowAddModal(false)}
            className="hidden md:flex items-center gap-2 px-6 py-3 bg-white border border-gray-100 rounded-2xl text-[10px] font-black uppercase text-gray-400 hover:text-gray-900 hover:border-gray-200 transition-all shadow-sm"
          >
            Cancel & Return
          </button>
        </div>

        <div className="bg-white rounded-[1.5rem] border border-gray-50 shadow-2xl shadow-slate-200/50 overflow-hidden">
          <div className="p-4 md:p-6">
            <form onSubmit={handleCreateUser} className="max-w-4xl mx-auto space-y-4">
              {/* Primary Identity Section */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div className="space-y-6">
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1 flex items-center gap-2">
                      <User size={12} className="text-emerald-500" /> Full Legal Name <span className="text-rose-500">*</span>
                    </label>
                    <input type="text" required placeholder="e.g. Abhiram R"
                      className="w-full bg-slate-50 border border-slate-100 rounded-xl px-4 py-2.5 text-sm focus:ring-4 focus:ring-emerald-500/10 focus:border-emerald-500 focus:bg-white outline-none transition-all font-bold tracking-tight"
                      value={newUser.name} onChange={(e) => setNewUser({ ...newUser, name: e.target.value })} />
                  </div>

                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1 flex items-center gap-2">
                      <Mail size={12} className="text-emerald-500" /> Official Email Address <span className="text-rose-500">*</span>
                    </label>
                    <input type="email" required placeholder="name@villagekart.com"
                      className="w-full bg-slate-50 border border-slate-100 rounded-xl px-4 py-2.5 text-sm focus:ring-4 focus:ring-emerald-500/10 focus:border-emerald-500 focus:bg-white outline-none transition-all font-bold tracking-tight"
                      value={newUser.email} onChange={(e) => setNewUser({ ...newUser, email: e.target.value })} />
                  </div>
                </div>

                <div className="space-y-6">
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1 flex items-center gap-2">
                      <Phone size={12} className="text-emerald-500" /> Mobile Number <span className="text-rose-500">*</span>
                    </label>
                    <input type="tel" required placeholder="e.g. +91 98765 43210"
                      className="w-full bg-slate-50 border border-slate-100 rounded-xl px-4 py-2.5 text-sm focus:ring-4 focus:ring-emerald-500/10 focus:border-emerald-500 focus:bg-white outline-none transition-all font-bold tracking-tight"
                      value={newUser.mobile} onChange={(e) => setNewUser({ ...newUser, mobile: e.target.value })} />
                  </div>

                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1 flex items-center gap-2">
                      <ShieldCheck size={12} className="text-emerald-500" /> Security Password <span className="text-rose-500">*</span>
                    </label>
                    <input type="password" required placeholder="Set strong password"
                      className="w-full bg-slate-50 border border-slate-100 rounded-xl px-4 py-2.5 text-sm focus:ring-4 focus:ring-emerald-500/10 focus:border-emerald-500 focus:bg-white outline-none transition-all font-bold tracking-tight"
                      value={newUser.password} onChange={(e) => setNewUser({ ...newUser, password: e.target.value })} />
                  </div>
                </div>
              </div>

              {/* Roles & Permissions Section */}
              <div className="bg-slate-50/50 p-5 rounded-[1.5rem] border border-slate-100 space-y-5">
                <div className="flex items-center gap-3 border-b border-slate-100 pb-4">
                  <ShieldCheck size={20} className="text-emerald-500" />
                  <h4 className="text-xs font-black uppercase tracking-widest text-slate-800">Permissions & Access Context</h4>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Assigned Privilege Level</label>
                    <div className="relative">
                      <select required className="w-full bg-white border border-slate-200 rounded-2xl px-5 py-4 text-sm font-black text-emerald-700 appearance-none outline-none focus:ring-4 focus:ring-emerald-500/10 focus:border-emerald-500 transition-all cursor-pointer"
                        value={newUser.customRoleId || ''} onChange={(e) => handleCustomRoleChange(e.target.value)}>
                        <option value="">Standard {activeTab === 'admin' ? 'Administrator' : 'Sales Member'}</option>
                        {customRoles.map(role => (
                          <option key={role.id} value={role.id}>{role.name}</option>
                        ))}
                      </select>
                      <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-emerald-500">
                        <ChevronLeft size={16} className="-rotate-90" />
                      </div>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Employment Context</label>
                    <select className="w-full bg-white border border-slate-200 rounded-2xl px-5 py-4 text-sm font-black text-slate-700 appearance-none outline-none focus:ring-4 focus:ring-emerald-500/10 focus:border-emerald-500 transition-all"
                      value={newUser.vgeType} onChange={(e) => setNewUser({ ...newUser, vgeType: e.target.value })}>
                      <option value="EMPLOYEE">Full-time Employee</option>
                      <option value="FREELANCER">Freelancer (Apps only)</option>
                    </select>
                  </div>

                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Primary Base Branch</label>
                    <select className="w-full bg-white border border-slate-200 rounded-2xl px-5 py-4 text-sm font-black text-emerald-700 appearance-none outline-none focus:ring-4 focus:ring-emerald-500/10 focus:border-emerald-500 transition-all disabled:bg-slate-100"
                      value={newUser.storeId || ''} onChange={(e) => setNewUser({ ...newUser, storeId: e.target.value })} disabled={!!storeFilterId}>
                      {stores.map(s => (
                        <option key={s.id} value={s.id}>{s.name}</option>
                      ))}
                    </select>
                  </div>

                {newUser.role !== 'ADMIN' && (
                  <>
                    <div className="space-y-2">
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Monthly Package (₹)</label>
                      <input type="number" required placeholder="e.g. 15000"
                        className="w-full bg-white border border-slate-200 rounded-2xl px-5 py-4 text-sm font-black text-indigo-600 focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 outline-none transition-all"
                        value={newUser.baseSalary} onChange={(e) => setNewUser({ ...newUser, baseSalary: e.target.value })} />
                    </div>

                    <div className="pt-8 border-t border-slate-200/50 flex items-center justify-between col-span-full">
                      <div className="space-y-1">
                        <h5 className="text-xs font-black text-slate-800 tracking-tight">Attendance Authorization</h5>
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest leading-none">Enable Punch-in / Punch-out capabilities for this user</p>
                      </div>
                      <button
                        type="button"
                        onClick={() => setNewUser({ ...newUser, attendanceEnabled: !newUser.attendanceEnabled })}
                        className={cn(
                          "relative inline-flex h-7 w-14 shrink-0 cursor-pointer items-center rounded-full border-2 border-transparent transition-colors duration-300 focus:outline-none",
                          newUser.attendanceEnabled ? "bg-emerald-600" : "bg-slate-200"
                        )}
                      >
                        <span
                          className={cn(
                            "pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-lg ring-0 transition-all duration-300",
                            newUser.attendanceEnabled ? "translate-x-7" : "translate-x-1"
                          )}
                        />
                      </button>
                    </div>
                  </>
                )}
              </div>
            </div>

            <div className="flex flex-col md:flex-row items-center justify-end gap-3 pt-2">
                <button type="button" onClick={() => setShowAddModal(false)}
                  className="w-full md:w-auto px-6 py-3 rounded-xl font-black text-[10px] uppercase tracking-widest text-gray-400 hover:text-gray-900 transition-all">
                  Discard
                </button>
                <button type="submit" disabled={isSubmitting}
                  className={cn('w-full md:w-auto px-10 py-3 rounded-xl shadow-xl shadow-emerald-500/20 text-white font-black text-[10px] uppercase tracking-widest transition-all active:scale-95 flex items-center justify-center gap-2',
                    isSubmitting ? 'bg-emerald-400 cursor-not-allowed' : 'bg-emerald-600 hover:bg-emerald-700')}>
                  {isSubmitting ? <><Loader2 className="animate-spin" size={14} /> Syncing...</> : <><CheckCircle2 size={14} /> Confirm Membership</>}
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    );
  }

  const renderEditView = () => {
    if (!editingUser) return null;

    return (
      <div className="animate-in fade-in slide-in-from-bottom-4 duration-300 max-w-5xl">
        {/* Header with Back Button */}
        <div className="flex items-center gap-4 mb-8">
          <button
            onClick={() => setShowEditModal(false)}
            className="p-3 bg-white border border-gray-100 rounded-2xl text-gray-400 hover:text-indigo-600 hover:border-indigo-100 transition-all shadow-sm"
          >
            <ArrowLeft size={20} strokeWidth={2.5} />
          </button>
          <div className="flex flex-col">
            <h2 className="text-2xl font-black text-gray-900 tracking-tight leading-none">Edit Member</h2>
            <p className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] mt-2">Update Access & Details</p>
          </div>
        </div>

        {/* Main Form Area */}
        <div className="bg-white rounded-[1.5rem] border border-gray-100 shadow-xl overflow-hidden p-0.5">
           <form onSubmit={handleUpdateUser} className="p-4 md:p-6 space-y-5">
              {/* Profile Section */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div className="space-y-2">
                  <label className="text-[11px] font-black text-gray-400 uppercase tracking-widest ml-1">Full Name</label>
                  <div className="relative group">
                    <User size={18} className="absolute left-5 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-indigo-600 transition-colors" />
                    <input
                      type="text"
                      required
                      className="w-full bg-gray-50/50 border border-transparent rounded-xl pl-12 pr-4 py-2.5 text-sm font-bold text-gray-900 focus:bg-white focus:border-indigo-100 focus:ring-4 focus:ring-indigo-500/5 outline-none transition-all"
                      value={editingUser.name}
                      onChange={(e) => setEditingUser({ ...editingUser, name: e.target.value })}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <label className="text-[11px] font-black text-gray-400 uppercase tracking-widest ml-1">Official Email</label>
                    <div className="relative group">
                      <Mail size={18} className="absolute left-5 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-indigo-600 transition-colors" />
                      <input
                        type="email"
                        required
                        className="w-full bg-gray-50/50 border border-transparent rounded-[1.25rem] pl-14 pr-6 py-4 text-sm font-bold text-gray-900 focus:bg-white focus:border-indigo-100 focus:ring-4 focus:ring-indigo-500/5 outline-none transition-all"
                        value={editingUser.email}
                        onChange={(e) => setEditingUser({ ...editingUser, email: e.target.value })}
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <label className="text-[11px] font-black text-gray-400 uppercase tracking-widest ml-1">Mobile Number</label>
                    <div className="relative group">
                      <Phone size={18} className="absolute left-5 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-indigo-600 transition-colors" />
                      <input
                        type="tel"
                        required
                        className="w-full bg-gray-50/50 border border-transparent rounded-[1.25rem] pl-14 pr-6 py-4 text-sm font-bold text-gray-900 focus:bg-white focus:border-indigo-100 focus:ring-4 focus:ring-indigo-500/5 outline-none transition-all"
                        value={editingUser.mobile}
                        onChange={(e) => setEditingUser({ ...editingUser, mobile: e.target.value })}
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* Permissions & Context Section */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-8 pt-8 border-t border-gray-100">
                <div className="space-y-2">
                  <label className="text-[11px] font-black text-indigo-600 uppercase tracking-widest ml-1">Privilege Level</label>
                  <div className="relative group">
                    <ShieldCheck size={18} className="absolute left-5 top-1/2 -translate-y-1/2 text-indigo-500 z-10" />
                    <select
                      required
                      className="w-full bg-indigo-50/50 border border-indigo-100/50 rounded-[1.25rem] pl-14 pr-10 py-4 text-sm font-black text-indigo-700 appearance-none outline-none focus:bg-white focus:ring-4 focus:ring-indigo-500/10 transition-all cursor-pointer"
                      value={editingUser.customRoleId || ''}
                      onChange={(e) => handleCustomRoleChange(e.target.value, true)}
                    >
                      <option value="">Standard {activeTab === 'admin' ? 'Administrator' : 'Sales Member'}</option>
                      {customRoles.map(role => (
                        <option key={role.id} value={role.id}>{role.name}</option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-[11px] font-black text-gray-400 uppercase tracking-widest ml-1">Staff Classification</label>
                  <select
                    className="w-full bg-gray-50/50 border border-transparent rounded-[1.25rem] px-6 py-4 text-sm font-black text-gray-700 appearance-none outline-none focus:bg-white focus:border-indigo-100 transition-all"
                    value={editingUser.vgeType}
                    onChange={(e) => setEditingUser({ ...editingUser, vgeType: e.target.value })}
                  >
                    <option value="EMPLOYEE">Full-time Employee</option>
                    <option value="FREELANCER">Freelancer (Apps only)</option>
                  </select>
                </div>

                <div className="space-y-2">
                  <label className="text-[11px] font-black text-gray-400 uppercase tracking-widest ml-1">Primary Base Branch</label>
                  <div className="relative group">
                    <Store size={18} className="absolute left-5 top-1/2 -translate-y-1/2 text-indigo-600 z-10" />
                    <select
                      className="w-full bg-indigo-50/50 border border-indigo-100/50 rounded-[1.25rem] pl-14 pr-10 py-4 text-sm font-black text-indigo-900 appearance-none outline-none focus:bg-white focus:ring-4 focus:ring-indigo-500/10 transition-all cursor-pointer"
                      value={editingUser.storeId || ''}
                      onChange={(e) => setEditingUser({ ...editingUser, storeId: e.target.value })}
                      disabled={!!storeFilterId}
                    >
                      {stores.map(s => (
                        <option key={s.id} value={s.id}>{s.name}</option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>

              {/* Attendance & Compensation */}
              {editingUser.role !== 'ADMIN' && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8 pt-8 border-t border-gray-100">
                  <div className="p-6 bg-indigo-50/30 rounded-[2rem] border border-indigo-100/50 flex items-center justify-between">
                    <div className="space-y-1">
                      <h5 className="text-sm font-black text-indigo-900 tracking-tight">Attendance Access</h5>
                      <p className="text-[10px] font-bold text-indigo-400 uppercase tracking-widest leading-none">Toggle Punching Privileges</p>
                    </div>
                    <button
                      type="button"
                      onClick={() => setEditingUser({ ...editingUser, attendanceEnabled: !editingUser.attendanceEnabled })}
                      className={cn(
                        "relative inline-flex h-8 w-16 shrink-0 cursor-pointer items-center rounded-full border-2 border-transparent transition-colors duration-300 focus:outline-none",
                        editingUser.attendanceEnabled ? "bg-indigo-600" : "bg-slate-200"
                      )}
                    >
                      <span
                        className={cn(
                          "pointer-events-none inline-block h-6 w-6 transform rounded-full bg-white shadow-xl ring-0 transition-all duration-300",
                          editingUser.attendanceEnabled ? "translate-x-8" : "translate-x-1"
                        )}
                      />
                    </button>
                  </div>

                  <div className="space-y-2">
                    <label className="text-[11px] font-black text-gray-400 uppercase tracking-widest ml-1">Monthly Package (₹)</label>
                    <input
                      type="number"
                      required
                      className="w-full bg-gray-50/50 border border-transparent rounded-[1.25rem] px-6 py-4 text-lg font-black text-indigo-600 focus:bg-white focus:border-indigo-100 outline-none transition-all"
                      value={editingUser.baseSalary || ''}
                      onChange={(e) => setEditingUser({ ...editingUser, baseSalary: e.target.value })}
                    />
                  </div>
                </div>
              )}

              {/* Account Security & Status */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8 pt-8 border-t border-gray-100">
                <div className="space-y-2">
                  <label className="text-[11px] font-black text-gray-400 uppercase tracking-widest ml-1">Account Access Status</label>
                  <div className={cn("p-6 rounded-[2rem] border flex items-center justify-between transition-colors", 
                    editingUser.status === 'ACTIVE' ? "bg-emerald-50/50 border-emerald-100" : "bg-rose-50/50 border-rose-100"
                  )}>
                    <div className="space-y-1">
                      <h5 className={cn("text-sm font-black tracking-tight", 
                        editingUser.status === 'ACTIVE' ? "text-emerald-900" : "text-rose-900"
                      )}>
                        {editingUser.status === 'ACTIVE' ? 'Active / Authorized' : 'Suspended / Blocked'}
                      </h5>
                      <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest leading-none">Security Control</p>
                    </div>
                    {can('STAFF', 'TOGGLE_STATUS') && (
                      <button
                        type="button"
                        onClick={() => setEditingUser({ ...editingUser, status: editingUser.status === 'ACTIVE' ? 'SUSPENDED' : 'ACTIVE' })}
                        className={cn("relative inline-flex h-8 w-16 shrink-0 cursor-pointer items-center rounded-full border-2 border-transparent transition-colors duration-300 focus:outline-none",
                          editingUser.status === 'ACTIVE' ? "bg-emerald-600" : "bg-rose-500"
                        )}
                      >
                        <span className={cn("pointer-events-none inline-block h-6 w-6 transform rounded-full bg-white shadow-xl ring-0 transition-all duration-300",
                          editingUser.status === 'ACTIVE' ? "translate-x-8" : "translate-x-1"
                        )} />
                      </button>
                    )}
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-[11px] font-black text-gray-400 uppercase tracking-widest ml-1">Update Password</label>
                  <input
                    type="text"
                    placeholder="Leave blank to keep current"
                    className="w-full bg-gray-50/50 border border-transparent rounded-[1.25rem] px-6 py-4 text-sm font-bold text-gray-900 focus:bg-white focus:border-indigo-100 outline-none transition-all"
                    value={editingUser.password || ''}
                    onChange={(e) => setEditingUser({ ...editingUser, password: e.target.value })}
                  />
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex flex-col md:flex-row items-center justify-end gap-4 pt-8">
                <button
                  type="button"
                  onClick={() => setShowEditModal(false)}
                  className="w-full md:w-auto px-10 py-5 rounded-[1.25rem] font-black text-[10px] uppercase tracking-[0.2em] text-gray-400 hover:text-gray-900 transition-all"
                >
                  Cancel & Return
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className={cn(
                    "w-full md:w-auto px-16 py-5 rounded-[1.25rem] font-black text-[10px] uppercase tracking-[0.2em] transition-all active:scale-95 flex items-center justify-center gap-3 shadow-2xl",
                    isSubmitting ? "bg-indigo-400 cursor-not-allowed" : "bg-indigo-600 hover:bg-indigo-700 text-white shadow-indigo-600/30"
                  )}
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="animate-spin" size={18} />
                      Syncing Data...
                    </>
                  ) : (
                    <>
                      <CheckCircle2 size={18} />
                      Save Changes
                    </>
                  )}
                </button>
              </div>
           </form>
        </div>
      </div>
    );
  };

  return (
    <div className="p-2 md:p-4 space-y-3">
      {showEditModal && editingUser ? (
        renderEditView()
      ) : (
        <>
          {/* Header Section */}
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div className="flex flex-col gap-1">
          <div className="flex items-center gap-3">
            {storeFilterId && (
              <button
                onClick={() => setSearchParams({})}
                className="p-2 bg-white border border-gray-100 rounded-xl text-gray-400 hover:text-emerald-600 hover:border-emerald-100 transition-all shadow-sm"
                title="Back to All Branches"
              >
                <ArrowLeft size={18} />
              </button>
            )}
            <h2 className="text-xl font-bold text-gray-900">User Management</h2>
          </div>
          <div className="flex flex-col gap-1.5 mt-2">
            <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1 opacity-70">
              Department View
            </span>
            <div className="flex items-center bg-gray-200/50 p-1.5 rounded-2xl w-fit flex-wrap gap-1 border border-gray-100 shadow-sm">
              <button
                onClick={() => setActiveTab('all')}
                className={`px-6 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all shadow-sm ${activeTab === 'all' ? 'bg-emerald-600 text-white' : 'bg-white text-gray-400 hover:text-gray-600'}`}
              >
                All Members
              </button>

              <button
                onClick={() => setActiveTab('admin')}
                className={`px-6 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all shadow-sm ${activeTab === 'admin' ? 'bg-rose-600 text-white' : 'bg-white text-gray-400 hover:text-gray-600'}`}
              >
                Admins
              </button>

              <button
                onClick={() => setActiveTab('agent')}
                className={`px-6 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all shadow-sm ${activeTab === 'agent' ? 'bg-blue-600 text-white' : 'bg-white text-gray-400 hover:text-gray-600'}`}
              >
                Agents
              </button>

              {relevantCustomRoles.map(role => (
                <button
                  key={role.id}
                  onClick={() => setActiveTab(role.id)}
                  className={`px-6 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all shadow-sm ${activeTab === role.id ? 'bg-emerald-600 text-white' : 'bg-white text-gray-400 hover:text-gray-600'}`}
                >
                  {role.name}
                </button>
              ))}
            </div>
          </div>
          <div className="flex items-center gap-2 mt-2">
            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-tight">{filteredUsers.length} members found</p>
            {true && (
              <>
                <span className="text-gray-300">•</span>
                <select
                  value={storeFilterId || ''}
                  onChange={(e) => {
                    if (e.target.value) {
                      setSearchParams({ storeId: e.target.value });
                    } else {
                      setSearchParams({});
                    }
                  }}
                  className="bg-emerald-50 text-emerald-700 text-[10px] font-black uppercase tracking-widest pl-2 pr-6 py-1 rounded-md border-none outline-none appearance-none focus:ring-1 focus:ring-emerald-500 cursor-pointer"
                  style={{
                    backgroundImage: `url("data:image/svg+xml,%3csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 20 20'%3e%3cpath stroke='%23047857' stroke-linecap='round' stroke-linejoin='round' stroke-width='2' d='M5.25 7.5L10 12.25L14.75 7.5'/%3e%3c/svg%3e")`,
                    backgroundPosition: 'right 0.25rem center',
                    backgroundRepeat: 'no-repeat',
                    backgroundSize: '1rem'
                  }}
                >
                  <option value="">All Branches</option>
                  {stores.map(s => (
                    <option key={s.id} value={s.id}>{s.name}</option>
                  ))}
                </select>
              </>
            )}
          </div>
        </div>
        <div className="flex items-center gap-3">
        
        {/* Search & Actions */}
        {storeFilterId && (
          <div className="flex flex-col md:flex-row items-center justify-between gap-4 bg-white p-5 rounded-[2rem] border border-gray-100 shadow-sm">
            <div className="relative flex-1 w-full group">
              <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-emerald-500 transition-colors" />
              <input
                type="text"
                placeholder={`Search ${activeTab === 'admin' ? 'Admins' : 'Staff'} by name, mobile or role...`}
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-12 pr-4 py-3 bg-gray-50 border-none rounded-xl text-sm focus:bg-white focus:ring-2 focus:ring-emerald-500/20 transition-all outline-none font-bold"
              />
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={handleExportExcel}
                className="p-3 bg-white border border-gray-100 rounded-xl text-gray-400 hover:text-emerald-600 hover:border-emerald-100 transition-all shadow-sm"
                title="Export to Excel"
              >
                <FileText size={18} />
              </button>
              <button
                onClick={handleExportPDF}
                className="p-3 bg-white border border-gray-100 rounded-xl text-gray-400 hover:text-emerald-600 hover:border-emerald-100 transition-all shadow-sm"
                title="Download PDF Report"
              >
                <Download size={18} />
              </button>
              <button
                onClick={handlePrint}
                className="p-3 bg-white border border-gray-100 rounded-xl text-gray-400 hover:text-emerald-600 hover:border-emerald-100 transition-all shadow-sm"
                title="Print Current List"
              >
                <Printer size={18} />
              </button>
              <button
                onClick={() => {
                  setNewUser({
                    name: '',
                    email: '',
                    password: '',
                    mobile: '',
                    role: activeTab === 'admin' ? 'ADMIN' : 'SALES_AGENT',
                    vgeType: 'EMPLOYEE',
                    storeId: storeFilterId || currentUser?.storeId || '',
                    dailyTarget: 10000,
                    baseSalary: 12000,
                  });
                  setShowAddModal(true);
                }}
                className="bg-emerald-600 text-white flex items-center gap-2 px-6 py-3 rounded-xl shadow-lg shadow-emerald-600/10 hover:bg-emerald-700 transition-all font-bold text-xs uppercase tracking-widest active:scale-95"
              >
                <Plus size={18} />
                <span className="hidden md:inline">Hire Member</span>
                <span className="md:hidden">Add</span>
              </button>
            </div>
          </div>
        )}
      </div>
    </div>

      {/* Mobile Search - Only visible on small screens */}
      {storeFilterId && (
        <div className="sm:hidden relative group px-1">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
          <input
            type="text"
            placeholder="Search staff members..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-11 pr-4 py-3 bg-white border border-gray-100 rounded-2xl text-sm focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none transition-all shadow-sm font-medium"
          />
        </div>
      )}

        {renderClassifiedUsers()}
      </>
      )}
    </div>
  );
}

function cn(...inputs) {
  return inputs.filter(Boolean).join(' ');
}
