import React, { useState, useEffect } from 'react';
import { Plus, User, Phone, Mail, Truck, MoreVertical, X, Loader2, ShieldCheck, UserCog, Users, Pencil, Trash2, Pause, Play, AlertCircle } from 'lucide-react';
import adminAPI from '../../services/adminService';
import toast from 'react-hot-toast';

export default function AdminUsers() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [newUser, setNewUser] = useState({
    name: '',
    email: '',
    password: '',
    mobile: '',
    role: 'SALES_AGENT',
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingUser, setEditingUser] = useState(null);
  const [deletingId, setDeletingId] = useState(null);

  const fetchUsers = async () => {
    try {
      const { data } = await adminAPI.getUsers();
      setUsers(data);
    } catch (error) {
      toast.error('Failed to fetch users');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

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

  const getRoleBadge = (role) => {
    const roles = {
      ADMIN: { label: 'Admin', color: 'bg-indigo-50 text-indigo-700 border-indigo-100', icon: ShieldCheck },
      SALES_AGENT: { label: 'Sales', color: 'bg-emerald-50 text-emerald-700 border-emerald-100', icon: Truck },
      SUPERVISOR: { label: 'Sup', color: 'bg-amber-50 text-amber-700 border-amber-100', icon: UserCog },
      HELPER: { label: 'Helper', color: 'bg-slate-50 text-slate-700 border-slate-100', icon: Users },
    };
    const r = roles[role] || { label: role, color: 'bg-gray-50 text-gray-700 border-gray-100', icon: User };
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

  const getInitials = (name) => {
    return name?.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase() || '??';
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
        <Loader2 className="animate-spin text-emerald-600" size={40} />
        <p className="text-gray-500 font-medium tracking-wide">Loading Staff...</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Sub-Header */}
      <div className="flex items-center justify-between pb-2">
        <div>
          <h2 className="text-xl font-bold text-gray-900">Staff</h2>
          <p className="text-xs text-gray-500">{users.length} active members</p>
        </div>
        <button 
          onClick={() => setShowAddModal(true)}
          className="bg-emerald-600 text-white flex items-center gap-2 px-4 py-2 rounded-xl shadow-lg shadow-emerald-600/10 hover:bg-emerald-700 transition-all font-medium text-sm"
        >
          <Plus size={18} />
          <span>Add New</span>
        </button>
      </div>

      {/* Main List Container */}
      <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
        {users.length === 0 ? (
          <div className="text-center py-12">
            <User size={48} className="mx-auto text-gray-200 mb-2" />
            <p className="text-gray-400 text-sm">No staff members found</p>
          </div>
        ) : (
          <div className="divide-y divide-gray-50">
            {/* Table Header - Desktop Only */}
            <div className="hidden md:grid grid-cols-12 gap-4 px-6 py-3 bg-gray-50/50 text-[10px] font-bold text-gray-400 uppercase tracking-widest">
              <div className="col-span-5">Member Information</div>
              <div className="col-span-3">Contact</div>
              <div className="col-span-3">Role / Vehicle</div>
              <div className="col-span-1 text-right">Action</div>
            </div>

            {/* List Items */}
            {users.map((user) => (
              <div 
                key={user.id} 
                className={`group relative flex flex-col md:grid md:grid-cols-12 md:items-center gap-2 md:gap-4 px-4 py-3 md:px-6 md:py-4 transition-colors hover:bg-gray-50/30 ${user.status === 'SUSPENDED' ? 'bg-gray-50/50 opacity-80' : ''}`}
              >
                {/* Information Column */}
                <div className="col-span-10 flex items-start gap-3">
                  {/* Avatar */}
                  <div className={`flex-shrink-0 w-10 h-10 rounded-xl flex items-center justify-center font-bold text-xs border transition-colors ${user.status === 'SUSPENDED' ? 'bg-gray-200 text-gray-500 border-gray-300' : 'bg-gray-100 text-gray-500 border-gray-200 group-hover:bg-emerald-50 group-hover:text-emerald-600 group-hover:border-emerald-100'}`}>
                    {getInitials(user.name)}
                  </div>
                  
                  <div className="flex-1 min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className={`font-bold text-sm whitespace-nowrap ${user.status === 'SUSPENDED' ? 'text-gray-500 line-through' : 'text-gray-900'}`}>{user.name}</h3>
                      {getRoleBadge(user.role)}
                      {getStatusBadge(user.status)}
                    </div>

                    <div className={`flex items-center gap-2 mt-1 text-[11px] font-medium flex-wrap ${user.status === 'SUSPENDED' ? 'text-gray-400' : 'text-emerald-600'}`}>
                      <span className="flex items-center gap-1">
                        <Phone size={11} />
                        {user.mobile || 'No mobile added'}
                      </span>
                      <div className="flex items-center gap-1 px-1.5 py-0 bg-gray-50 rounded-md text-[9px] font-bold text-gray-400 border border-gray-100 uppercase tracking-tighter">
                        <Truck size={10} className="text-gray-300" />
                        <span>{user.assignedVehicle?.vehicleNumber || 'None'}</span>
                      </div>
                    </div>

                    <p className="hidden md:block text-[10px] text-gray-400 truncate mt-0.5">{user.email}</p>
                  </div>
                </div>

                {/* Actions */}
                <div className="absolute top-4 right-3 md:static md:col-span-2 flex items-center justify-end gap-1.5">
                  {/* Edit Button */}
                  <button 
                    onClick={() => {
                      setEditingUser(user);
                      setShowEditModal(true);
                    }}
                    title="Edit Member"
                    className="p-2 text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-xl transition-all"
                  >
                    <Pencil size={15} />
                  </button>

                  {/* Suspend/Unsuspend Button */}
                  <button 
                    onClick={() => handleToggleStatus(user)}
                    title={user.status === 'ACTIVE' ? 'Suspend Access' : 'Restore Access'}
                    className={`p-2 rounded-xl transition-all ${
                      user.status === 'ACTIVE' 
                        ? 'text-gray-400 hover:text-amber-600 hover:bg-amber-50' 
                        : 'text-emerald-500 hover:text-emerald-700 hover:bg-emerald-50'
                    }`}
                  >
                    {user.status === 'ACTIVE' ? <Pause size={15} /> : <Play size={15} />}
                  </button>

                  {/* Delete Button */}
                  <button 
                    onClick={() => handleDeleteUser(user.id)}
                    title="Delete Account"
                    disabled={deletingId === user.id}
                    className="p-2 text-gray-400 hover:text-rose-600 hover:bg-rose-50 rounded-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {deletingId === user.id
                      ? <Loader2 size={15} className="animate-spin text-rose-400" />
                      : <Trash2 size={15} />}
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Add User Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-[2px] p-4">
          <div className="bg-white w-full max-w-sm rounded-3xl p-5 shadow-2xl animate-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between mb-5">
              <div>
                <h3 className="text-lg font-bold text-gray-900">New Member</h3>
                <p className="text-[10px] uppercase font-bold text-gray-400 tracking-wider">Access Assignment</p>
              </div>
              <button 
                onClick={() => setShowAddModal(false)}
                className="p-2 hover:bg-gray-50 rounded-full text-gray-400"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleCreateUser} className="space-y-3">
              <div className="space-y-1">
                <input 
                  type="text"
                  required
                  placeholder="Full Name"
                  className="w-full bg-gray-50 border border-gray-100 rounded-xl px-4 py-2.5 text-sm focus:bg-white focus:ring-2 focus:ring-emerald-500/20 transition-all outline-none"
                  value={newUser.name}
                  onChange={(e) => setNewUser({...newUser, name: e.target.value})}
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <input 
                  type="email"
                  required
                  placeholder="Email"
                  className="w-full bg-gray-50 border border-gray-100 rounded-xl px-4 py-2.5 text-sm focus:bg-white outline-none"
                  value={newUser.email}
                  onChange={(e) => setNewUser({...newUser, email: e.target.value})}
                />
                <input 
                  type="tel"
                  required
                  placeholder="Mobile"
                  className="w-full bg-gray-50 border border-gray-100 rounded-xl px-4 py-2.5 text-sm focus:bg-white outline-none"
                  value={newUser.mobile}
                  onChange={(e) => setNewUser({...newUser, mobile: e.target.value})}
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                 <select 
                  className="w-full bg-gray-50 border border-gray-100 rounded-xl px-4 py-2.5 text-sm appearance-none outline-none"
                  value={newUser.role}
                  onChange={(e) => setNewUser({...newUser, role: e.target.value})}
                >
                  <option value="SALES_AGENT">Sales</option>
                  <option value="SUPERVISOR">Supervisor</option>
                  <option value="HELPER">Helper</option>
                  <option value="ADMIN">Admin</option>
                </select>
                <input 
                  type="password"
                  required
                  placeholder="Password"
                  className="w-full bg-gray-50 border border-gray-100 rounded-xl px-4 py-2.5 text-sm focus:bg-white outline-none"
                  value={newUser.password}
                  onChange={(e) => setNewUser({...newUser, password: e.target.value})}
                />
              </div>

              <button 
                type="submit"
                disabled={isSubmitting}
                className="w-full bg-emerald-600 text-white font-bold py-3.5 rounded-xl shadow-lg shadow-emerald-600/20 mt-4 hover:bg-emerald-700 active:scale-[0.98] transition-all text-sm flex items-center justify-center gap-2 disabled:opacity-70 disabled:cursor-not-allowed"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 size={16} className="animate-spin" />
                    Processing...
                  </>
                ) : 'Confirm Membership'}
              </button>
            </form>
          </div>
        </div>
      )}
      {/* Edit User Modal */}
      {showEditModal && editingUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-[2px] p-4">
          <div className="bg-white w-full max-w-sm rounded-3xl p-5 shadow-2xl animate-in zoom-in-95 duration-200 border border-indigo-50">
            <div className="flex items-center justify-between mb-5">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-indigo-50 flex items-center justify-center text-indigo-600">
                  <UserCog size={20} />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-gray-900">Edit Member</h3>
                  <p className="text-[10px] uppercase font-bold text-gray-400 tracking-wider">Update Access & Details</p>
                </div>
              </div>
              <button 
                onClick={() => setShowEditModal(false)}
                className="p-2 hover:bg-gray-50 rounded-full text-gray-400 transition-colors"
                type="button"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleUpdateUser} className="space-y-4">
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-gray-400 uppercase ml-1">Full Name</label>
                <input 
                  type="text"
                  required
                  placeholder="Full Name"
                  className="w-full bg-gray-50 border border-gray-100 rounded-xl px-4 py-2.5 text-sm focus:bg-white focus:ring-2 focus:ring-indigo-500/20 transition-all outline-none"
                  value={editingUser.name}
                  onChange={(e) => setEditingUser({...editingUser, name: e.target.value})}
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-gray-400 uppercase ml-1">Email</label>
                  <input 
                    type="email"
                    required
                    placeholder="Email"
                    className="w-full bg-gray-50 border border-gray-100 rounded-xl px-4 py-2.5 text-sm focus:bg-white outline-none cursor-not-allowed opacity-70"
                    value={editingUser.email}
                    disabled
                    title="Email cannot be changed"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-gray-400 uppercase ml-1">Mobile</label>
                  <input 
                    type="tel"
                    required
                    placeholder="Mobile"
                    className="w-full bg-gray-50 border border-gray-100 rounded-xl px-4 py-2.5 text-sm focus:bg-white outline-none"
                    value={editingUser.mobile}
                    onChange={(e) => setEditingUser({...editingUser, mobile: e.target.value})}
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-bold text-gray-400 uppercase ml-1">Role</label>
                <select 
                  className="w-full bg-gray-50 border border-gray-100 rounded-xl px-4 py-2.5 text-sm appearance-none outline-none focus:bg-white transition-all"
                  value={editingUser.role}
                  onChange={(e) => setEditingUser({...editingUser, role: e.target.value})}
                >
                  <option value="SALES_AGENT">Sales Agent</option>
                  <option value="SUPERVISOR">Supervisor</option>
                  <option value="HELPER">Helper</option>
                  <option value="ADMIN">Admin</option>
                </select>
              </div>

              <div className="pt-2">
                <button 
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full bg-indigo-600 text-white font-bold py-3.5 rounded-xl shadow-lg shadow-indigo-600/20 hover:bg-indigo-700 active:scale-[0.98] transition-all text-sm flex items-center justify-center gap-2 disabled:opacity-70 disabled:cursor-not-allowed"
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 size={16} className="animate-spin" />
                      Saving...
                    </>
                  ) : 'Save Changes'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
