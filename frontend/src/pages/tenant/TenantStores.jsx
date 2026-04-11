import React, { useState, useEffect } from 'react';
import { Store, Plus, Search, Edit2, Trash2, MapPin, Users, Truck, Loader2, Link, Briefcase, BarChart3, ChevronRight, LayoutDashboard } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import adminAPI from '../../services/adminService';
import toast from 'react-hot-toast';

export default function TenantStores() {
  const [stores, setStores] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [formData, setFormData] = useState({ id: '', name: '', code: '', address: '', contactEmail: '', contactPhone: '', status: 'ACTIVE' });
  const [searchTerm, setSearchTerm] = useState('');
  const navigate = useNavigate();

  const fetchStores = async () => {
    try {
      setLoading(true);
      const res = await adminAPI.getStores();
      if (res.data?.success) {
        setStores(res.data.data);
      }
    } catch (err) {
      console.error(err);
      toast.error('Failed to load stores');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStores();
  }, []);

  const handleOpenModal = (store = null) => {
    if (store) {
      setFormData(store);
      setIsEditing(true);
    } else {
      setFormData({ id: '', name: '', code: '', address: '', contactEmail: '', contactPhone: '', status: 'ACTIVE' });
      setIsEditing(false);
    }
    setIsModalOpen(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      if (isEditing) {
        await adminAPI.updateStore(formData.id, formData);
        toast.success('Store updated successfully');
      } else {
        await adminAPI.createStore(formData);
        toast.success('Store created successfully');
      }
      setIsModalOpen(false);
      fetchStores();
    } catch (err) {
      console.error(err);
      toast.error(err.response?.data?.message || 'Failed to save store');
    }
  };

  const handleDelete = async (id) => {
    if (window.confirm('Are you sure you want to delete this store?')) {
      try {
        await adminAPI.deleteStore(id);
        toast.success('Store deleted successfully');
        fetchStores();
      } catch (err) {
        console.error(err);
        toast.error(err.response?.data?.message || 'Failed to delete store');
      }
    }
  };

  const filteredStores = stores.filter(store => 
    store.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
    store.code.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-emerald-950 tracking-tight">Stores Management</h1>
          <p className="text-sm font-medium text-slate-500">Manage organizational branches and sales outlets.</p>
        </div>
        <button
          onClick={() => handleOpenModal()}
          className="flex items-center gap-2 px-6 py-2.5 bg-emerald-600 text-white rounded-2xl font-black shadow-lg shadow-emerald-600/30 active:scale-95 transition-all w-fit"
        >
          <Plus size={20} className="stroke-[3px]" />
          Create Store
        </button>
      </div>

      <div className="bg-white p-6 rounded-[2.5rem] border border-emerald-50 shadow-sm">
        <div className="flex flex-col sm:flex-row items-center gap-4 mb-6">
          <div className="relative flex-1 w-full relative group">
            <Search size={20} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-emerald-500 transition-colors" />
            <input
              type="text"
              placeholder="Search stores by name or code..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-12 pr-4 py-3 bg-emerald-50/50 border-none rounded-2xl text-sm font-bold placeholder-slate-400 focus:bg-white focus:ring-2 focus:ring-emerald-500 transition-all outline-none"
            />
          </div>
        </div>

        {loading ? (
          <div className="flex flex-col items-center justify-center py-20 gap-4">
            <Loader2 className="animate-spin text-emerald-600" size={40} />
            <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Loading Stores...</p>
          </div>
        ) : filteredStores.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <div className="w-20 h-20 bg-emerald-50 rounded-full flex items-center justify-center text-emerald-300 mb-6">
              <Store size={40} strokeWidth={1.5} />
            </div>
            <h3 className="text-xl font-black text-slate-900 tracking-tight mb-2">No Stores Found</h3>
            <p className="text-sm font-medium text-slate-500 max-w-md">
              There are no stores available. Start by creating a new store to structure your organization.
            </p>
            <button
              onClick={() => handleOpenModal()}
              className="mt-6 px-6 py-2.5 bg-emerald-50 text-emerald-600 rounded-2xl font-black active:scale-95 transition-all text-sm"
            >
              Add Your First Store
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredStores.map(store => (
              <div key={store.id} className="group bg-white p-6 rounded-3xl border border-emerald-100 hover:border-emerald-300 shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all duration-300 flex flex-col relative overflow-hidden">
                <div className={`absolute top-0 left-0 w-1.5 h-full ${store.status === 'ACTIVE' ? 'bg-emerald-500' : 'bg-red-400'}`} />
                
                <div className="flex justify-between items-start mb-4 ml-2">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-2xl bg-emerald-50 flex items-center justify-center text-emerald-600">
                      <Store size={24} strokeWidth={2.5} />
                    </div>
                    <div>
                      <h3 className="text-lg font-black text-slate-900 tracking-tight leading-tight">{store.name}</h3>
                      <div className="flex items-center gap-2 mt-1">
                         <span className="text-[9px] font-black px-2 py-0.5 rounded-full bg-slate-100 text-slate-500 uppercase tracking-widest">{store.code}</span>
                         <span className={`text-[9px] font-black px-2 py-0.5 rounded-full uppercase tracking-widest ${store.status === 'ACTIVE' ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700'}`}>
                           {store.status}
                         </span>
                      </div>
                    </div>
                  </div>
                  <button 
                    onClick={() => navigate(`/admin?storeId=${store.id}&storeName=${encodeURIComponent(store.name)}`)}
                    className="shrink-0 flex items-center justify-center bg-gray-900 hover:bg-emerald-600 text-white p-2 rounded-xl transition-all group/launch shadow-md active:scale-95"
                    title="Launch Store Portal"
                  >
                    <LayoutDashboard size={18} className="group-hover/launch:scale-110 transition-transform" />
                  </button>
                </div>

                <div className="space-y-3 mb-6 ml-2 flex-1">
                  {store.address && (
                    <div className="flex items-start gap-2 text-sm font-medium text-slate-600">
                      <MapPin size={16} className="text-slate-400 mt-0.5 shrink-0" />
                      <span className="line-clamp-2">{store.address}</span>
                    </div>
                  )}
                  {store.contactEmail && (
                    <div className="flex items-center gap-2 text-sm font-medium text-slate-600">
                      <span className="text-[10px] font-black px-1.5 py-0.5 rounded bg-slate-100 text-slate-500">@</span>
                      <span className="truncate">{store.contactEmail}</span>
                    </div>
                  )}
                </div>

                <div className="flex items-center justify-between pt-4 border-t border-slate-100 ml-2">
                  <div className="flex gap-4">
                    <div className="flex flex-col items-center" title="Assigned Users">
                      <div className="flex items-center gap-1 text-slate-700 font-black">
                        <Users size={16} className="text-emerald-500" />
                        <span>{store._count?.users || 0}</span>
                      </div>
                    </div>
                    <div className="flex flex-col items-center" title="Assigned Vehicles">
                      <div className="flex items-center gap-1 text-slate-700 font-black">
                        <Truck size={16} className="text-orange-500" />
                        <span>{store._count?.vehicles || 0}</span>
                      </div>
                    </div>
                  </div>

                  <div className="flex gap-2">
                    <button
                      onClick={() => handleOpenModal(store)}
                      className="p-2 bg-slate-50 text-slate-600 hover:bg-emerald-50 hover:text-emerald-600 rounded-xl transition-colors active:scale-90"
                      title="Edit Store"
                    >
                      <Edit2 size={16} strokeWidth={2.5} />
                    </button>
                    <button
                      onClick={() => handleDelete(store.id)}
                      className="p-2 bg-slate-50 text-slate-600 hover:bg-red-50 hover:text-red-600 rounded-xl transition-colors active:scale-90"
                      title="Delete Store"
                    >
                      <Trash2 size={16} strokeWidth={2.5} />
                    </button>
                  </div>
                </div>

                <div className="mt-4 pt-4 border-t border-slate-100/50">
                  <div className="grid grid-cols-2 gap-2">
                    <button onClick={() => navigate(`/tenant/admins?storeId=${store.id}`)} className="flex items-center justify-between p-2.5 bg-slate-50 hover:bg-emerald-50 text-slate-600 hover:text-emerald-700 rounded-xl transition-colors group/btn">
                      <div className="flex items-center gap-2"><Briefcase size={14} className="text-emerald-600" /><span className="text-[10px] font-bold">Manage Admins</span></div>
                      <ChevronRight size={12} className="text-slate-400 group-hover/btn:text-emerald-600" />
                    </button>
                    <button onClick={() => navigate(`/tenant/users?storeId=${store.id}`)} className="flex items-center justify-between p-2.5 bg-slate-50 hover:bg-emerald-50 text-slate-600 hover:text-emerald-700 rounded-xl transition-colors group/btn">
                      <div className="flex items-center gap-2"><Users size={14} className="text-blue-600" /><span className="text-[10px] font-bold">View Staff</span></div>
                      <ChevronRight size={12} className="text-slate-400 group-hover/btn:text-emerald-600" />
                    </button>
                    <button onClick={() => navigate(`/tenant/vehicles?storeId=${store.id}`)} className="flex items-center justify-between p-2.5 bg-slate-50 hover:bg-emerald-50 text-slate-600 hover:text-emerald-700 rounded-xl transition-colors group/btn">
                      <div className="flex items-center gap-2"><Truck size={14} className="text-orange-600" /><span className="text-[10px] font-bold">Fleet Tracking</span></div>
                      <ChevronRight size={12} className="text-slate-400 group-hover/btn:text-emerald-600" />
                    </button>
                    <button onClick={() => navigate(`/tenant/reports?storeId=${store.id}`)} className="flex items-center justify-between p-2.5 bg-slate-50 hover:bg-emerald-50 text-slate-600 hover:text-emerald-700 rounded-xl transition-colors group/btn">
                      <div className="flex items-center gap-2"><BarChart3 size={14} className="text-indigo-600" /><span className="text-[10px] font-bold">Analytics</span></div>
                      <ChevronRight size={12} className="text-slate-400 group-hover/btn:text-emerald-600" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm" onClick={() => setIsModalOpen(false)}></div>
          <div className="bg-white rounded-[2.5rem] p-8 w-full max-w-lg relative z-10 shadow-2xl overflow-hidden">
            <div className="flex items-center gap-3 mb-8">
               <div className="w-12 h-12 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
                  <Store size={24} strokeWidth={2.5} />
               </div>
               <div>
                  <h2 className="text-2xl font-black text-slate-900 tracking-tight">{isEditing ? 'Edit Store' : 'Create Store'}</h2>
                  <p className="text-[10px] font-black uppercase tracking-widest text-emerald-600">Organization Branch</p>
               </div>
            </div>
            
            <form onSubmit={handleSubmit} className="space-y-5">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5 focus-within:text-emerald-600">
                  <label className="text-[10px] font-black uppercase tracking-widest text-slate-500 pl-4 transition-colors">Store Name *</label>
                  <input
                    required
                    type="text"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="w-full bg-slate-50 border-none rounded-2xl px-4 py-3 text-sm font-bold text-slate-900 focus:bg-emerald-50/50 focus:ring-2 focus:ring-emerald-500 outline-none transition-all placeholder-slate-400 shadow-inner"
                    placeholder="e.g. Main Outlet"
                  />
                </div>
                <div className="space-y-1.5 focus-within:text-emerald-600">
                  <label className="text-[10px] font-black uppercase tracking-widest text-slate-500 pl-4 transition-colors">Store Code *</label>
                  <input
                    required
                    type="text"
                    value={formData.code}
                    onChange={(e) => setFormData({ ...formData, code: e.target.value })}
                    className="w-full bg-slate-50 border-none rounded-2xl px-4 py-3 text-sm font-bold text-slate-900 focus:bg-emerald-50/50 focus:ring-2 focus:ring-emerald-500 outline-none transition-all placeholder-slate-400 shadow-inner uppercase"
                    placeholder="e.g. STR-001"
                  />
                </div>
              </div>

              <div className="space-y-1.5 focus-within:text-emerald-600">
                <label className="text-[10px] font-black uppercase tracking-widest text-slate-500 pl-4 transition-colors">Address</label>
                <textarea
                  value={formData.address}
                  onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                  className="w-full bg-slate-50 border-none rounded-2xl px-4 py-3 text-sm font-bold text-slate-900 focus:bg-emerald-50/50 focus:ring-2 focus:ring-emerald-500 outline-none transition-all placeholder-slate-400 shadow-inner resize-none h-20"
                  placeholder="Full physical address"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5 focus-within:text-emerald-600">
                  <label className="text-[10px] font-black uppercase tracking-widest text-slate-500 pl-4 transition-colors">Contact Email</label>
                  <input
                    type="email"
                    value={formData.contactEmail}
                    onChange={(e) => setFormData({ ...formData, contactEmail: e.target.value })}
                    className="w-full bg-slate-50 border-none rounded-2xl px-4 py-3 text-sm font-bold text-slate-900 focus:bg-emerald-50/50 focus:ring-2 focus:ring-emerald-500 outline-none transition-all placeholder-slate-400 shadow-inner"
                    placeholder="store@example.com"
                  />
                </div>
                <div className="space-y-1.5 focus-within:text-emerald-600">
                  <label className="text-[10px] font-black uppercase tracking-widest text-slate-500 pl-4 transition-colors">Contact Phone</label>
                  <input
                    type="text"
                    value={formData.contactPhone}
                    onChange={(e) => setFormData({ ...formData, contactPhone: e.target.value })}
                    className="w-full bg-slate-50 border-none rounded-2xl px-4 py-3 text-sm font-bold text-slate-900 focus:bg-emerald-50/50 focus:ring-2 focus:ring-emerald-500 outline-none transition-all placeholder-slate-400 shadow-inner"
                    placeholder="1234567890"
                  />
                </div>
              </div>

              <div className="space-y-1.5 focus-within:text-emerald-600">
                <label className="text-[10px] font-black uppercase tracking-widest text-slate-500 pl-4 transition-colors">Status</label>
                <select
                  value={formData.status}
                  onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                  className="w-full bg-slate-50 border-none rounded-2xl px-4 py-3 text-sm font-bold text-slate-900 focus:bg-emerald-50/50 focus:ring-2 focus:ring-emerald-500 outline-none transition-all shadow-inner"
                >
                  <option value="ACTIVE">Active</option>
                  <option value="INACTIVE">Inactive</option>
                </select>
              </div>

              <div className="flex justify-end gap-3 pt-6 border-t border-slate-100 mt-8">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-6 py-3 rounded-2xl text-slate-600 font-bold bg-slate-50 hover:bg-slate-100 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-8 py-3 rounded-2xl text-white font-black bg-emerald-600 hover:bg-emerald-700 shadow-lg shadow-emerald-600/30 active:scale-95 transition-all"
                >
                  {isEditing ? 'Save Changes' : 'Create Store'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
