import React, { useState, useEffect } from 'react';
import { Store, Plus, Search, Edit2, Trash2, MapPin, Users, Truck, Loader2, Briefcase, BarChart3, ChevronRight, LayoutDashboard, Eye, CheckCircle2, Phone, Mail, ShieldCheck } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import adminAPI from '../../services/adminService';
import toast from 'react-hot-toast';

export default function AdminStores() {
  const [stores, setStores] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [selectedViewStore, setSelectedViewStore] = useState(null);
  const [formData, setFormData] = useState({ id: '', name: '', code: '', stateCode: '', hubCode: '', address: '', contactEmail: '', contactPhone: '', status: 'ACTIVE' });
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
      toast.error('Failed to load organizational stores');
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
      setFormData({ id: '', name: '', code: '', stateCode: '', hubCode: '', address: '', contactEmail: '', contactPhone: '', status: 'ACTIVE' });
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
        toast.success('New store created for organization');
      }
      setIsModalOpen(false);
      fetchStores();
    } catch (err) {
      console.error(err);
      toast.error(err.response?.data?.message || 'Failed to save store');
    }
  };

  const handleToggleStatus = async (store) => {
    const newStatus = store.status === 'ACTIVE' ? 'INACTIVE' : 'ACTIVE';
    try {
      await adminAPI.updateStore(store.id, { ...store, status: newStatus });
      toast.success(`Store marked ${newStatus}`);
      fetchStores();
    } catch (err) {
      toast.error('Failed to update store status');
    }
  };

  const handleDelete = async (id) => {
    if (window.confirm('Are you sure you want to delete this store? This action cannot be undone.')) {
      try {
        await adminAPI.deleteStore(id);
        toast.success('Store removed from organization');
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
    <div className="max-w-7xl mx-auto space-y-6 p-4">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-black text-emerald-950 tracking-tight">Organization Stores</h1>
          <p className="text-sm font-medium text-slate-500">Manage multiple branches and distribution centers for your business.</p>
        </div>
        <button
          onClick={() => navigate('/create-business')}
          className="flex items-center gap-2 px-8 py-3 bg-emerald-600 text-white rounded-2xl font-black shadow-lg shadow-emerald-600/30 active:scale-95 transition-all w-fit"
        >
          <Plus size={20} className="stroke-[3px]" />
          Add New Store
        </button>
      </div>

      <div className="bg-white rounded-[2.5rem] border border-slate-100 shadow-sm overflow-hidden">
        <div className="p-8 pb-0">
          <div className="relative group mb-8">
            <Search size={20} className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-emerald-500 transition-colors" />
            <input
              type="text"
              placeholder="Search organizational stores..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-14 pr-6 py-4 bg-slate-50 border-none rounded-2xl text-base font-bold placeholder-slate-400 focus:bg-white focus:ring-2 focus:ring-emerald-500 transition-all outline-none"
            />
          </div>
        </div>

        {loading ? (
          <div className="flex flex-col items-center justify-center py-24 gap-4">
            <Loader2 className="animate-spin text-emerald-600" size={48} />
            <p className="text-xs font-black uppercase tracking-widest text-slate-400">Synchronizing Data...</p>
          </div>
        ) : filteredStores.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-24 text-center">
            <div className="w-24 h-24 bg-emerald-50 rounded-full flex items-center justify-center text-emerald-300 mb-8">
              <Store size={48} strokeWidth={1.5} />
            </div>
            <h3 className="text-2xl font-black text-slate-900 tracking-tight mb-3">No Active Stores</h3>
            <p className="text-slate-500 max-w-md mx-auto">
              Your organization doesn't have any stores yet. Create your first branch to start managing inventory and sales across different locations.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full border-collapse">
              <thead>
                <tr className="bg-emerald-50/80 backdrop-blur-sm">
                  <th className="px-8 py-6 text-left text-[11px] font-black uppercase tracking-[0.2em] text-emerald-800 border-b border-emerald-100">Branch</th>
                  <th className="px-6 py-6 text-left text-[11px] font-black uppercase tracking-[0.2em] text-emerald-800 border-b border-emerald-100">Location & Hub Config</th>
                  <th className="px-6 py-6 text-center text-[11px] font-black uppercase tracking-[0.2em] text-emerald-800 border-b border-emerald-100">Performance Stats</th>
                  <th className="px-6 py-6 text-center text-[11px] font-black uppercase tracking-[0.2em] text-emerald-800 border-b border-emerald-100">Status</th>
                  <th className="px-8 py-6 text-right text-[11px] font-black uppercase tracking-[0.2em] text-emerald-800 border-b border-emerald-100">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {filteredStores.map(store => (
                  <tr key={store.id} className="hover:bg-emerald-50/20 transition-all duration-300 group">
                    <td className="px-8 py-6">
                      <div className="flex items-center gap-4">
                        <div className="w-12 h-12 rounded-xl bg-emerald-50 flex items-center justify-center text-emerald-600 border border-emerald-100 group-hover:scale-110 transition-transform">
                          <Store size={24} strokeWidth={2.5} />
                        </div>
                        <div>
                          <h3 className="text-base font-black text-slate-900 leading-none mb-1.5">{store.name}</h3>
                          <span className="text-[10px] font-black px-2 py-0.5 rounded-md bg-slate-100 text-slate-500 uppercase tracking-widest">{store.code}</span>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-6">
                      <div className="flex flex-col gap-3">
                        <div className="flex items-start gap-2.5 max-w-[250px]">
                          <MapPin size={14} className="text-emerald-500 shrink-0 mt-0.5" />
                          <span className="text-[11px] font-bold text-slate-600 leading-tight">
                            {store.address || <span className="text-slate-300 italic font-medium">No address provided</span>}
                          </span>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-[9px] font-black text-emerald-600 uppercase tracking-widest bg-emerald-50 px-2 py-1 rounded-lg border border-emerald-100/50 shadow-sm">
                            VK-{store.stateCode || '??'}-{store.hubCode || '???'}
                          </span>
                          <div className="w-1 h-1 rounded-full bg-slate-200" />
                          <span className="text-[8px] font-black text-slate-400 uppercase tracking-tighter">Enterprise Hub</span>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-6 text-center">
                      <div className="flex items-center justify-center gap-4">
                        <div className="flex flex-col items-center">
                          <span className="text-sm font-black text-slate-900 leading-none">{store._count?.users || 0}</span>
                          <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest mt-1">Users</span>
                        </div>
                        <div className="w-px h-6 bg-slate-100" />
                        <div className="flex flex-col items-center">
                          <span className="text-sm font-black text-slate-900 leading-none">{store._count?.vehicles || 0}</span>
                          <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest mt-1">Vehicles</span>
                        </div>
                      </div>
                    </td>
                     <td className="px-6 py-6 text-center">
                      <div className="flex items-center justify-center">
                        <button
                          onClick={() => handleToggleStatus(store)}
                          className={cn(
                            "relative inline-flex h-6 w-11 shrink-0 cursor-pointer items-center rounded-full border-2 border-transparent transition-colors duration-300 focus:outline-none",
                            store.status === 'ACTIVE' ? "bg-emerald-500" : "bg-slate-200"
                          )}
                        >
                          <span className={cn(
                            "pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow-lg ring-0 transition-all duration-300",
                            store.status === 'ACTIVE' ? "translate-x-5" : "translate-x-0"
                          )} />
                        </button>
                      </div>
                    </td>
                    <td className="px-8 py-6">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => setSelectedViewStore(store)}
                          className="w-9 h-9 flex items-center justify-center bg-emerald-50 text-emerald-600 hover:bg-emerald-100 rounded-lg transition-all border border-emerald-100/50 shadow-sm"
                          title="View Setup Details"
                        >
                          <Eye size={16} />
                        </button>
                        <button
                          onClick={() => navigate('/create-business', { state: { editStore: store } })}
                          className="w-9 h-9 flex items-center justify-center bg-slate-50 text-slate-600 hover:bg-emerald-50 hover:text-emerald-600 rounded-lg transition-all border border-slate-100"
                          title="Edit Store Parameters"
                        >
                          <Edit2 size={16} />
                        </button>
                        <button
                          onClick={() => handleDelete(store.id)}
                          className="w-9 h-9 flex items-center justify-center bg-slate-50 text-slate-400 hover:bg-red-50 hover:text-red-600 rounded-lg transition-all border border-slate-100"
                          title="Delete Store"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-300">
          <div className="bg-white rounded-[3rem] p-10 w-full max-w-xl shadow-2xl relative">
            <div className="flex items-center gap-4 mb-10">
              <div className="w-16 h-16 rounded-3xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
                <Store size={32} strokeWidth={2.5} />
              </div>
              <div>
                <h2 className="text-3xl font-black text-slate-900 tracking-tight">{isEditing ? 'Modify Store' : 'Add New Branch'}</h2>
                <p className="text-xs font-black uppercase tracking-[0.2em] text-emerald-600">Enterprise Asset Configuration</p>
              </div>
            </div>

            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="grid grid-cols-2 gap-6">
                <div className="space-y-2">
                  <label className="text-[11px] font-black uppercase tracking-widest text-slate-400 ml-4">Display Name *</label>
                  <input
                    required
                    type="text"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="w-full bg-slate-50 border-none rounded-2xl px-6 py-4 text-base font-bold text-slate-900 focus:bg-white focus:ring-4 focus:ring-emerald-500/10 outline-none transition-all"
                    placeholder="Main Hub"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-[11px] font-black uppercase tracking-widest text-slate-400 ml-4">Identifier Code *</label>
                  <input
                    required
                    type="text"
                    value={formData.code}
                    onChange={(e) => setFormData({ ...formData, code: e.target.value })}
                    className="w-full bg-slate-50 border-none rounded-2xl px-6 py-4 text-base font-bold text-slate-900 focus:bg-white focus:ring-4 focus:ring-emerald-500/10 outline-none transition-all uppercase"
                    placeholder="HUB-01"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-6">
                <div className="space-y-2">
                  <label className="text-[11px] font-black uppercase tracking-widest text-slate-400 ml-4">State Code</label>
                  <input
                    type="text"
                    maxLength={2}
                    value={formData.stateCode || ''}
                    onChange={(e) => setFormData({ ...formData, stateCode: e.target.value.toUpperCase() })}
                    className="w-full bg-slate-50 border-none rounded-2xl px-6 py-4 text-base font-bold text-slate-900 focus:bg-white focus:ring-4 focus:ring-emerald-500/10 outline-none transition-all uppercase"
                    placeholder="AP"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-[11px] font-black uppercase tracking-widest text-slate-400 ml-4">Hub Code</label>
                  <input
                    type="text"
                    maxLength={3}
                    value={formData.hubCode || ''}
                    onChange={(e) => setFormData({ ...formData, hubCode: e.target.value.toUpperCase() })}
                    className="w-full bg-slate-50 border-none rounded-2xl px-6 py-4 text-base font-bold text-slate-900 focus:bg-white focus:ring-4 focus:ring-emerald-500/10 outline-none transition-all uppercase"
                    placeholder="HUB"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-6">
                <div className="space-y-2">
                  <label className="text-[11px] font-black uppercase tracking-widest text-slate-400 ml-4">Contact Phone</label>
                  <input
                    type="text"
                    value={formData.contactPhone || ''}
                    onChange={(e) => setFormData({ ...formData, contactPhone: e.target.value.replace(/\D/g, '').slice(0, 10) })}
                    className="w-full bg-slate-50 border-none rounded-2xl px-6 py-4 text-base font-bold text-slate-900 focus:bg-white focus:ring-4 focus:ring-emerald-500/10 outline-none transition-all"
                    placeholder="1234567890"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-[11px] font-black uppercase tracking-widest text-slate-400 ml-4">Contact Email</label>
                  <input
                    type="email"
                    value={formData.contactEmail || ''}
                    onChange={(e) => setFormData({ ...formData, contactEmail: e.target.value })}
                    className="w-full bg-slate-50 border-none rounded-2xl px-6 py-4 text-base font-bold text-slate-900 focus:bg-white focus:ring-4 focus:ring-emerald-500/10 outline-none transition-all"
                    placeholder="admin@villagkart.com"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-[11px] font-black uppercase tracking-widest text-slate-400 ml-4">Full Address</label>
                <textarea
                  value={formData.address}
                  onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                  className="w-full bg-slate-50 border-none rounded-2xl px-6 py-4 text-base font-bold text-slate-900 focus:bg-white focus:ring-4 focus:ring-emerald-500/10 outline-none transition-all h-24 resize-none"
                  placeholder="Street, City, Pincode"
                />
              </div>

              <div className="flex justify-end gap-4 pt-8">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-8 py-4 rounded-2xl text-slate-500 font-bold hover:bg-slate-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-12 py-4 rounded-2xl text-white font-black bg-emerald-600 hover:bg-emerald-700 shadow-xl shadow-emerald-600/20 active:scale-95 transition-all"
                >
                  {isEditing ? 'Update Store' : 'Create Branch'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {selectedViewStore && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-300">
          <div className="bg-white rounded-[3rem] p-8 md:p-10 w-full max-w-3xl shadow-2xl relative max-h-[90vh] overflow-y-auto border border-slate-100">
            <div className="flex items-center justify-between pb-6 border-b border-slate-100 mb-8">
              <div className="flex items-center gap-4">
                <div className="w-14 h-14 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center border border-emerald-100">
                  <Store size={28} strokeWidth={2.5} />
                </div>
                <div>
                  <h2 className="text-2xl font-black text-slate-900 tracking-tight">{selectedViewStore.name}</h2>
                  <span className="text-[10px] font-black text-emerald-600 bg-emerald-50 px-2.5 py-0.5 rounded-full uppercase tracking-widest border border-emerald-100/50">
                    ID Code: {selectedViewStore.code}
                  </span>
                </div>
              </div>
              <button
                onClick={() => setSelectedViewStore(null)}
                className="w-10 h-10 rounded-full bg-slate-50 text-slate-400 hover:text-slate-600 hover:bg-slate-100 flex items-center justify-center transition-all font-bold text-sm"
              >
                ✕
              </button>
            </div>

            <div className="space-y-8">
              {/* Table section displaying configured properties */}
              <div>
                <h3 className="text-[11px] font-black text-slate-400 uppercase tracking-widest mb-4 px-1">Enterprise Configuration Properties</h3>
                <div className="border border-slate-100 rounded-3xl overflow-hidden shadow-sm">
                  <table className="w-full border-collapse text-left text-xs">
                    <tbody className="divide-y divide-slate-50">
                      <tr className="hover:bg-slate-50/50 transition-colors">
                        <th className="w-1/3 py-3.5 px-5 font-bold text-slate-500 bg-slate-50/30">Nature of Business</th>
                        <td className="py-3.5 px-5 font-black text-slate-900">{selectedViewStore.nature || 'Product Selling & Retail Operations'}</td>
                      </tr>
                      <tr className="hover:bg-slate-50/50 transition-colors">
                        <th className="w-1/3 py-3.5 px-5 font-bold text-slate-500 bg-slate-50/30">Business Type</th>
                        <td className="py-3.5 px-5 font-black text-slate-800">{selectedViewStore.type || 'Private Limited'}</td>
                      </tr>
                      <tr className="hover:bg-slate-50/50 transition-colors">
                        <th className="w-1/3 py-3.5 px-5 font-bold text-slate-500 bg-slate-50/30">Hub Identifiers</th>
                        <td className="py-3.5 px-5 font-black text-emerald-700">
                          State: <span className="font-bold text-slate-600">{selectedViewStore.stateCode || 'AP'}</span> | Hub Code: <span className="font-bold text-slate-600">{selectedViewStore.hubCode || 'HUB'}</span>
                        </td>
                      </tr>
                      <tr className="hover:bg-slate-50/50 transition-colors">
                        <th className="w-1/3 py-3.5 px-5 font-bold text-slate-500 bg-slate-50/30">Primary Contact</th>
                        <td className="py-3.5 px-5 font-bold text-slate-800">
                          <div className="flex items-center gap-4 flex-wrap">
                            <span className="flex items-center gap-1"><Phone size={12} className="text-slate-400" /> {selectedViewStore.contactPhone || '+91 1234567890'}</span>
                            <span className="flex items-center gap-1"><Mail size={12} className="text-slate-400" /> {selectedViewStore.contactEmail || 'admin@villagkart.com'}</span>
                          </div>
                        </td>
                      </tr>
                      <tr className="hover:bg-slate-50/50 transition-colors">
                        <th className="w-1/3 py-3.5 px-5 font-bold text-slate-500 bg-slate-50/30">Physical Address</th>
                        <td className="py-3.5 px-5 font-bold text-slate-700 leading-normal">
                          {selectedViewStore.address || 'Standard Registered Village Enterprise Route Base'}
                        </td>
                      </tr>
                      <tr className="hover:bg-slate-50/50 transition-colors">
                        <th className="w-1/3 py-3.5 px-5 font-bold text-slate-500 bg-slate-50/30">Operations Status</th>
                        <td className="py-3.5 px-5">
                          <span className={`inline-flex items-center gap-1 text-[10px] font-black uppercase tracking-wider px-2.5 py-0.5 rounded-md ${selectedViewStore.status === 'ACTIVE' ? 'bg-emerald-50 text-emerald-600' : 'bg-slate-100 text-slate-500'}`}>
                            <CheckCircle2 size={10} /> {selectedViewStore.status} ROUTE
                          </span>
                        </td>
                      </tr>
                      <tr className="hover:bg-slate-50/50 transition-colors">
                        <th className="w-1/3 py-3.5 px-5 font-bold text-slate-500 bg-slate-50/30">Subscribed Tier</th>
                        <td className="py-3.5 px-5 font-black text-emerald-950 flex items-center gap-1.5">
                          <ShieldCheck size={14} className="text-emerald-500" /> Enterprise Standard Dashboard Plan
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Performance Footprint Grid */}
              <div>
                <h3 className="text-[11px] font-black text-slate-400 uppercase tracking-widest mb-4 px-1">Active Performance & Allocations</h3>
                <div className="grid grid-cols-3 gap-4">
                  <div className="p-4 rounded-2xl bg-slate-50/80 border border-slate-100 text-center">
                    <span className="text-xl font-black text-slate-900 block">{selectedViewStore._count?.users || 0}</span>
                    <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mt-0.5 block">Staff Assigned</span>
                  </div>
                  <div className="p-4 rounded-2xl bg-slate-50/80 border border-slate-100 text-center">
                    <span className="text-xl font-black text-slate-900 block">{selectedViewStore._count?.vehicles || 0}</span>
                    <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mt-0.5 block">Fleet Assets</span>
                  </div>
                  <div className="p-4 rounded-2xl bg-emerald-50/80 border border-emerald-100 text-center">
                    <span className="text-xl font-black text-emerald-700 block">Active</span>
                    <span className="text-[9px] font-bold text-emerald-500 uppercase tracking-widest mt-0.5 block">Sync Status</span>
                  </div>
                </div>
              </div>
            </div>

            <div className="mt-8 pt-6 border-t border-slate-100 flex justify-end">
              <button
                onClick={() => setSelectedViewStore(null)}
                className="px-8 py-3 bg-slate-900 text-white font-bold rounded-xl text-xs hover:bg-slate-800 transition-all active:scale-95"
              >
                Close View
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function cn(...inputs) {
  return inputs.filter(Boolean).join(' ');
}
