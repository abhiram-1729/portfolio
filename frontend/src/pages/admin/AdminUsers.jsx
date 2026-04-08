import React, { useState, useEffect } from 'react';
import { Plus, User, Phone, Mail, Truck, MoreVertical, X, Loader2, ShieldCheck, UserCog, Users, Pencil, Trash2, Pause, Play, AlertCircle } from 'lucide-react';
import adminAPI from '../../services/adminService';
import toast from 'react-hot-toast';

export default function AdminUsers({ type }) {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [newUser, setNewUser] = useState({
    name: '',
    email: '',
    password: '',
    mobile: '',
    role: 'SALES_AGENT',
    dailyTarget: 10000,
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

  const handleCreateUser = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      await adminAPI.createUser(newUser);
      toast.success('User created successfully');
      setShowAddModal(false);
      setNewUser({ name: '', email: '', password: '', mobile: '', role: 'SALES_AGENT' });
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

  const getRoleBadge = (role) => {
    const roles = {
      SUPER_ADMIN: { label: 'Sys Admin', color: 'bg-rose-50 text-rose-700 border-rose-100', icon: ShieldCheck },
      TENANT_OWNER: { label: 'Owner', color: 'bg-indigo-50 text-indigo-700 border-indigo-100', icon: ShieldCheck },
      ADMIN: { label: 'Admin', color: 'bg-blue-50 text-blue-700 border-blue-100', icon: ShieldCheck },
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

  const filteredUsers = users.filter(u => {
    if (type === 'admin') return ['ADMIN', 'TENANT_OWNER', 'SUPER_ADMIN'].includes(u.role);
    if (type === 'staff') return ['SALES_AGENT', 'SUPERVISOR', 'HELPER'].includes(u.role);
    return true;
  });

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
        <Loader2 className="animate-spin text-emerald-600" size={40} />
        <p className="text-gray-500 font-medium tracking-wide">Loading {type === 'admin' ? 'Admins' : 'Staff'}...</p>
      </div>
    );
  }

  const listToRender = filteredUsers;

  return (
    <div className="space-y-4">
      {/* Sub-Header */}
      <div className="flex items-center justify-between pb-2">
        <div>
          <h2 className="text-xl font-bold text-gray-900">{type === 'admin' ? 'Organization Admins' : 'Operational Staff'}</h2>
          <p className="text-xs text-gray-500">{listToRender.length} members found</p>
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
      <div className="space-y-4">
        {listToRender.length === 0 ? (
          <div className="text-center py-16 bg-white rounded-[2.5rem] border border-dashed border-gray-100 shadow-sm">
            <User size={48} className="mx-auto text-gray-200 mb-4" />
            <h3 className="text-lg font-black text-gray-900 tracking-tight">Access Control Empty</h3>
            <p className="text-xs text-gray-400 mt-2 font-black uppercase tracking-widest">No members match this category yet.</p>
          </div>
        ) : (
          <>
            {/* Mobile Card View */}
            <div className="md:hidden space-y-4">
              {listToRender.map((user) => (
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
                        <div className="mt-1 flex flex-wrap gap-1">
                          {getRoleBadge(user.role)}
                        </div>
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-1">
                      <button onClick={() => { setEditingUser(user); setShowEditModal(true); }}
                        className="p-2 text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-xl transition-all">
                        <Pencil size={15} />
                      </button>
                      <button onClick={() => handleToggleStatus(user)}
                        className={`p-2 rounded-xl transition-all ${user.status === 'ACTIVE' ? 'text-gray-400 hover:text-amber-600 hover:bg-amber-50' : 'text-emerald-500 hover:text-emerald-700 hover:bg-emerald-50'}`}>
                        {user.status === 'ACTIVE' ? <Pause size={15} /> : <Play size={15} />}
                      </button>
                      <button onClick={() => handleDeleteUser(user.id)}
                        disabled={deletingId === user.id}
                        className="p-2 text-gray-400 hover:text-rose-600 hover:bg-rose-50 rounded-xl transition-all disabled:opacity-50">
                        {deletingId === user.id ? <Loader2 size={15} className="animate-spin text-rose-400" /> : <Trash2 size={15} />}
                      </button>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3 pb-1">
                    <div className="flex flex-col gap-1">
                      <span className="text-[9px] font-black uppercase text-gray-400 tracking-widest">Mobile</span>
                      <span className="text-xs font-black text-gray-700 flex items-center gap-1.5"><Phone size={10} className="text-emerald-500" /> {user.mobile || '---'}</span>
                    </div>
                    <div className="flex flex-col gap-1">
                      <span className="text-[9px] font-black uppercase text-gray-400 tracking-widest">Assigned Vehicle</span>
                      <span className="text-xs font-black text-blue-600 flex items-center gap-1.5"><Truck size={10} /> {user.assignedVehicle?.vehicleNumber || 'Unassigned'}</span>
                    </div>
                  </div>
                  
                  {user.dailyTarget && (
                    <div className="bg-emerald-50/50 p-3 rounded-2xl border border-emerald-100/50 flex justify-between items-center">
                       <span className="text-[9px] font-black uppercase text-emerald-600 tracking-widest">Daily Revenue Target</span>
                       <span className="text-sm font-black text-emerald-950">₹{parseFloat(user.dailyTarget).toLocaleString()}</span>
                    </div>
                  )}
                </div>
              ))}
            </div>

            {/* Desktop Table View */}
            <div className="hidden md:block bg-white rounded-3xl border border-gray-100 shadow-sm overflow-hidden mb-6">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-gray-50/50">
                    <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-gray-400">Team Member</th>
                    <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-gray-400 text-center">Contact Info</th>
                    <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-gray-400 text-center">Role / Vehicle</th>
                    <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-gray-400 text-center">Daily Target</th>
                    <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-gray-400 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {listToRender.map((user) => (
                    <tr 
                      key={user.id} 
                      className={`hover:bg-gray-50/30 transition-colors group ${user.status === 'SUSPENDED' ? 'bg-gray-50/50 opacity-80 grayscale-[0.5]' : ''}`}
                    >
                      <td className="px-6 py-4 border-r border-gray-50 group-hover:border-transparent">
                        <div className="flex items-center gap-4">
                          <div className={`w-10 h-10 rounded-2xl flex items-center justify-center font-black text-xs border shadow-inner transition-colors ${user.status === 'SUSPENDED' ? 'bg-gray-200 text-gray-500 border-gray-300' : 'bg-gray-50 text-gray-400 border-gray-100 group-hover:bg-emerald-600 group-hover:text-white group-hover:border-emerald-500 transition-all'}`}>
                            {getInitials(user.name)}
                          </div>
                          <div className="flex flex-col">
                            <span className={`text-sm font-black text-gray-900 tracking-tight leading-none mb-1 ${user.status === 'SUSPENDED' ? 'line-through text-gray-400' : ''}`}>
                              {user.name}
                            </span>
                            <div className="flex items-center gap-2">
                              <span className="text-[10px] text-gray-400 font-bold tracking-tight">{user.email}</span>
                              {getStatusBadge(user.status)}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-center border-r border-gray-50 group-hover:border-transparent">
                        <div className="flex flex-col items-center">
                          <span className="text-xs font-black text-gray-700 flex items-center gap-1.5">
                            <Phone size={11} className="text-emerald-500" /> {user.mobile || 'No Contact'}
                          </span>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-center border-r border-gray-50 group-hover:border-transparent">
                        <div className="flex flex-col items-center gap-1.5">
                          {getRoleBadge(user.role)}
                          <div className={`flex items-center gap-1 px-2 py-0.5 rounded-lg text-[9px] font-black border uppercase tracking-widest ${user.assignedVehicle ? 'bg-blue-50 text-blue-700 border-blue-100' : 'bg-gray-50 text-gray-400 border-gray-100'}`}>
                            <Truck size={10} />
                            {user.assignedVehicle?.vehicleNumber || 'Unassigned'}
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-center border-r border-gray-50 group-hover:border-transparent">
                         <span className={`text-sm font-black ${user.dailyTarget > 0 ? 'text-emerald-700' : 'text-gray-300 italic'}`}>
                           {user.dailyTarget ? `₹${parseFloat(user.dailyTarget).toLocaleString()}` : 'Not Set'}
                         </span>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center justify-end gap-1.5">
                          <button 
                            onClick={() => { setEditingUser(user); setShowEditModal(true); }}
                            title="Edit Profile"
                            className="p-2 text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-xl transition-all"
                          >
                            <Pencil size={15} />
                          </button>
                          <button 
                            onClick={() => handleToggleStatus(user)}
                            title={user.status === 'ACTIVE' ? 'Suspend Access' : 'Restore Access'}
                            className={`p-2 rounded-xl transition-all ${user.status === 'ACTIVE' ? 'text-gray-400 hover:text-amber-600 hover:bg-amber-50' : 'text-emerald-500 hover:text-emerald-700 hover:bg-emerald-50'}`}
                          >
                            {user.status === 'ACTIVE' ? <Pause size={15} /> : <Play size={15} />}
                          </button>
                          <button 
                            onClick={() => handleDeleteUser(user.id)}
                            title="Permanent Removal"
                            disabled={deletingId === user.id}
                            className="p-2 text-gray-400 hover:text-rose-600 hover:bg-rose-50 rounded-xl transition-all disabled:opacity-50"
                          >
                            {deletingId === user.id ? <Loader2 size={15} className="animate-spin text-rose-400" /> : <Trash2 size={15} />}
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
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
                  <option value="TENANT_OWNER">Tenant Owner</option>
                  <option value="SUPER_ADMIN">Super Admin</option>
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

              <div className="space-y-1">
                <label className="text-[10px] font-bold text-gray-400 uppercase ml-1">Daily Sales Target (₹)</label>
                <input 
                  type="number"
                  required
                  placeholder="Daily Sales Target"
                  className="w-full bg-gray-50 border border-gray-100 rounded-xl px-4 py-2.5 text-sm focus:bg-white outline-none"
                  value={newUser.dailyTarget}
                  onChange={(e) => setNewUser({...newUser, dailyTarget: e.target.value})}
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
                    className="w-full bg-gray-50 border border-gray-100 rounded-xl px-4 py-2.5 text-sm focus:bg-white focus:ring-2 focus:ring-indigo-500/20 transition-all outline-none"
                    value={editingUser.email}
                    onChange={(e) => setEditingUser({...editingUser, email: e.target.value})}
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
                  <option value="TENANT_OWNER">Tenant Owner</option>
                  <option value="SUPER_ADMIN">Super Admin</option>
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-gray-400 uppercase ml-1">Daily Sales Target (₹)</label>
                  <input 
                    type="number"
                    required
                    placeholder="Daily Sales Target"
                    className="w-full bg-gray-50 border border-gray-100 rounded-xl px-4 py-2.5 text-sm focus:bg-white outline-none"
                    value={editingUser.dailyTarget}
                    onChange={(e) => setEditingUser({...editingUser, dailyTarget: e.target.value})}
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-gray-400 uppercase ml-1">Update Password</label>
                  <input 
                    type="text"
                    placeholder="Leave blank to keep current"
                    className="w-full bg-gray-50 border border-gray-100 rounded-xl px-4 py-2.5 text-sm focus:bg-white focus:ring-2 focus:ring-indigo-500/20 transition-all outline-none"
                    value={editingUser.password || ''}
                    onChange={(e) => setEditingUser({...editingUser, password: e.target.value})}
                  />
                </div>
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
