import React, { useState, useEffect } from 'react';
import { CreditCard, Percent, FileText, ChevronRight, Bell, Lock, X, Loader2, Save, Store, Mail, Phone, MapPin, Hash, Package, Trash2, Edit } from 'lucide-react';
import adminAPI from '../../services/adminService';
import toast from 'react-hot-toast';
import { useUserStore } from '../../store/userStore';

export default function AdminSettings() {
  const [settings, setSettings] = useState({
    businessName: '',
    gstNo: '',
    contactNo: '',
    email: '',
    address: '',
    taxRates: '0,5,12,18'
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [activeModal, setActiveModal] = useState(null); // 'TAX' | 'BUSINESS' | 'UNITS' | 'CATEGORIES'

  // Units State
  const [units, setUnits] = useState([]);
  const [unitsLoading, setUnitsLoading] = useState(false);
  const [newUnit, setNewUnit] = useState({ name: '', type: '' });
  const [editingUnitId, setEditingUnitId] = useState(null);

  // Categories State
  const [categories, setCategories] = useState([]);
  const [categoriesLoading, setCategoriesLoading] = useState(false);
  const [newCategory, setNewCategory] = useState({ name: '' });
  const [editingCategoryId, setEditingCategoryId] = useState(null);

  // Asset Categories State
  const [assetCategories, setAssetCategories] = useState([]);
  const [assetCategoriesLoading, setAssetCategoriesLoading] = useState(false);
  const [newAssetCategory, setNewAssetCategory] = useState({ name: '' });
  const [editingAssetCategoryId, setEditingAssetCategoryId] = useState(null);

  const currentUser = useUserStore(s => s.user);

  useEffect(() => {
    fetchSettings();
    fetchUnits();
    fetchCategories();
    fetchAssetCategories();
  }, [currentUser?.storeId]);

  const fetchUnits = async () => {
    setUnitsLoading(true);
    try {
      const { data } = await adminAPI.getUnits({ storeId: currentUser?.storeId });
      setUnits(data);
    } catch (error) {
      toast.error('Failed to load units');
    } finally {
      setUnitsLoading(false);
    }
  };

  const fetchCategories = async () => {
    setCategoriesLoading(true);
    try {
      const { data } = await adminAPI.getCategories({ storeId: currentUser?.storeId });
      setCategories(data);
    } catch (error) {
      toast.error('Failed to load categories');
    } finally {
      setCategoriesLoading(false);
    }
  };

  const fetchAssetCategories = async () => {
    setAssetCategoriesLoading(true);
    try {
      const { data } = await adminAPI.getAssetCategories({ storeId: currentUser?.storeId });
      setAssetCategories(data);
    } catch (error) {
      toast.error('Failed to load asset categories');
    } finally {
      setAssetCategoriesLoading(false);
    }
  };

  const fetchSettings = async () => {
    try {
      const { data } = await adminAPI.getSettings({ storeId: currentUser?.storeId });
      if (data.success) {
        setSettings(data.data);
      }
    } catch (error) {
      toast.error('Failed to load settings');
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateSettings = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      const { data } = await adminAPI.updateSettings({ ...settings, storeId: currentUser?.storeId });
      if (data.success) {
        toast.success('Settings updated!');
        setActiveModal(null);
      }
    } catch (error) {
      toast.error('Failed to update settings');
    } finally {
      setSaving(false);
    }
  };

  const handleSaveUnit = async (e) => {
    e.preventDefault();
    if (!newUnit.name || !newUnit.type) return toast.error('Please enter name and type');
    setSaving(true);
    try {
      if (editingUnitId) {
        const { data } = await adminAPI.updateUnit(editingUnitId, newUnit);
        setUnits(units.map(u => u.id === editingUnitId ? data : u));
        toast.success('Unit updated');
      } else {
        const { data } = await adminAPI.createUnit({ ...newUnit, storeId: currentUser?.storeId });
        setUnits([data, ...units]);
        toast.success('Unit created');
      }
      setNewUnit({ name: '', type: '' });
      setEditingUnitId(null);
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to save unit');
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteUnit = async (id) => {
    if (!confirm('Are you sure you want to delete this unit?')) return;
    try {
      await adminAPI.deleteUnit(id);
      setUnits(units.filter(u => u.id !== id));
      toast.success('Unit deleted');
    } catch (error) {
      toast.error('Failed to delete unit');
    }
  };

  const handleSaveCategory = async (e) => {
    e.preventDefault();
    if (!newCategory.name) return toast.error('Please enter category name');
    setSaving(true);
    try {
      if (editingCategoryId) {
        const { data } = await adminAPI.updateCategory(editingCategoryId, newCategory);
        setCategories(categories.map(c => c.id === editingCategoryId ? data : c));
        toast.success('Category updated');
      } else {
        const { data } = await adminAPI.createCategory({ ...newCategory, storeId: currentUser?.storeId });
        setCategories([data, ...categories]);
        toast.success('Category created');
      }
      setNewCategory({ name: '' });
      setEditingCategoryId(null);
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to save category');
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteCategory = async (id) => {
    if (!confirm('Are you sure you want to delete this category?')) return;
    try {
      await adminAPI.deleteCategory(id);
      setCategories(categories.filter(c => c.id !== id));
      toast.success('Category deleted');
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to delete category');
    }
  };

  const handleSaveAssetCategory = async (e) => {
    e.preventDefault();
    if (!newAssetCategory.name) return toast.error('Please enter category name');
    setSaving(true);
    try {
      if (editingAssetCategoryId) {
        const { data } = await adminAPI.updateAssetCategory(editingAssetCategoryId, newAssetCategory);
        setAssetCategories(assetCategories.map(c => c.id === editingAssetCategoryId ? data : c));
        toast.success('Asset Category updated');
      } else {
        const { data } = await adminAPI.createAssetCategory({ ...newAssetCategory, storeId: currentUser?.storeId });
        setAssetCategories([data, ...assetCategories]);
        toast.success('Asset Category created');
      }
      setNewAssetCategory({ name: '' });
      setEditingAssetCategoryId(null);
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to save asset category');
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteAssetCategory = async (id) => {
    if (!confirm('Are you sure you want to delete this asset category?')) return;
    try {
      await adminAPI.deleteAssetCategory(id);
      setAssetCategories(assetCategories.filter(c => c.id !== id));
      toast.success('Asset Category deleted');
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to delete asset category');
    }
  };

  const sections = [
    { 
      title: 'Inventory Settings', 
      icon: Package, 
      items: [
        { label: 'Unit Management', action: () => setActiveModal('UNITS') },
        { label: 'Category Management', action: () => setActiveModal('CATEGORIES') },
        { label: 'Asset Type Management', action: () => setActiveModal('ASSET_CATEGORIES') }
      ] 
    },
    { 
      title: 'Payment Settings', 
      icon: CreditCard, 
      items: [
        { label: 'Add/Edit Payment Modes', action: () => toast.error('This feature is coming soon') },
        { label: 'UPI Settings', action: () => toast.error('This feature is coming soon') },
        { label: 'Card Terminal Config', action: () => toast.error('This feature is coming soon') }
      ] 
    },
    { 
      title: 'Business Details', 
      icon: Store, 
      items: [
        { label: 'Tax Settings (GST)', action: () => setActiveModal('TAX') },
        { label: 'Business Profile Details', action: () => setActiveModal('BUSINESS') },
        { label: 'Currency Options', action: () => toast.error('This feature is coming soon') }
      ] 
    },
    { 
      title: 'Invoice Format', 
      icon: FileText, 
      items: [
        { label: 'Header/Footer Text', action: () => toast.error('Coming soon') },
        { label: 'Upload Logo', action: () => toast.error('Coming soon') },
        { label: 'Sequential Numbering', action: () => toast.error('Coming soon') }
      ] 
    },
    { 
      title: 'Notifications', 
      icon: Bell, 
      items: [
        { label: 'Low Stock Alerts', action: () => {} },
        { label: 'Daily Sales Report Email', action: () => {} }
      ] 
    }
  ];

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[50vh] gap-4">
        <Loader2 className="animate-spin text-emerald-600" size={32} />
        <p className="text-gray-500 font-medium tracking-wide text-sm">Loading Settings...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-20">
      <div className="flex flex-col gap-1 px-2">
        <h2 className="text-2xl font-bold text-gray-900">Settings</h2>
        <p className="text-sm text-gray-500 font-medium">Configure your platform behavior</p>
      </div>

      <div className="space-y-4">
        {sections.map((section) => (
          <div key={section.title} className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden mx-1">
            <div className="p-4 bg-gray-50/50 border-b border-gray-100 flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-emerald-100 flex items-center justify-center text-emerald-600">
                <section.icon size={18} />
              </div>
              <h3 className="font-bold text-gray-900 text-sm">{section.title}</h3>
            </div>
            <div className="divide-y divide-gray-50">
              {section.items.map((item) => (
                <button 
                  key={item.label} 
                  onClick={item.action}
                  className="w-full flex items-center justify-between px-6 py-4 hover:bg-gray-50 transition-colors group text-left"
                >
                  <span className="text-sm text-gray-600 group-hover:text-emerald-600 font-bold transition-colors">{item.label}</span>
                  <ChevronRight size={16} className="text-gray-300 group-hover:text-emerald-500 transition-colors" />
                </button>
              ))}
            </div>
          </div>
        ))}
      </div>

      {/* Tax Settings Modal */}
      {activeModal === 'TAX' && (
        <div className="fixed inset-0 z-[60] flex items-end md:items-center justify-center bg-black/40 backdrop-blur-sm p-4 animate-in fade-in duration-200">
          <div className="bg-white w-full max-w-md rounded-3xl p-6 shadow-2xl animate-in slide-in-from-bottom-4 duration-300">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-emerald-100 text-emerald-600 rounded-xl">
                    <Percent size={20} fontWeight="bold" />
                </div>
                <h3 className="text-xl font-bold text-gray-900">Tax Settings</h3>
              </div>
              <button 
                onClick={() => setActiveModal(null)}
                className="p-2 hover:bg-slate-100 rounded-full text-slate-400 transition-colors"
                disabled={saving}
              >
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleUpdateSettings} className="space-y-5">
              <div className="space-y-2">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">GST Slabs (Comma Separated)</label>
                <div className="relative">
                  <input 
                    type="text"
                    required
                    placeholder="e.g. 0,5,12,18"
                    className="w-full bg-slate-50 border border-slate-100 rounded-xl px-4 py-3 text-sm font-bold focus:ring-2 focus:ring-emerald-500/20 text-emerald-900"
                    value={settings.taxRates}
                    onChange={(e) => setSettings({...settings, taxRates: e.target.value})}
                  />
                  <Hash size={16} className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-300" />
                </div>
                <p className="text-[9px] text-slate-400 font-bold uppercase tracking-tight ml-1 leading-relaxed">
                  These percentages will appear in the "Add Product" modal dropdown for tax selection.
                </p>
              </div>

              <div className="pt-2">
                <button 
                  type="submit"
                  disabled={saving}
                  className="w-full bg-emerald-600 text-white font-bold py-4 rounded-xl shadow-lg shadow-emerald-600/20 hover:bg-emerald-700 transition-all text-sm uppercase tracking-wider flex items-center justify-center gap-2 disabled:opacity-50"
                >
                  {saving ? <Loader2 size={18} className="animate-spin" /> : <Save size={18} />}
                  {saving ? 'Saving...' : 'Update Tax Slabs'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Business Details Modal */}
      {activeModal === 'BUSINESS' && (
        <div className="fixed inset-0 z-[60] flex items-end md:items-center justify-center bg-black/40 backdrop-blur-sm p-4 animate-in fade-in duration-200">
          <div className="bg-white w-full max-w-lg rounded-3xl p-6 shadow-2xl animate-in slide-in-from-bottom-4 duration-300 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-6 sticky top-0 bg-white z-10 pb-2">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-emerald-100 text-emerald-600 rounded-xl">
                    <Store size={20} />
                </div>
                <h3 className="text-xl font-bold text-gray-900">Business Details</h3>
              </div>
              <button 
                onClick={() => setActiveModal(null)}
                className="p-2 hover:bg-slate-100 rounded-full text-slate-400 transition-colors"
                disabled={saving}
              >
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleUpdateSettings} className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">Business Name</label>
                <div className="relative">
                  <input 
                    type="text" required
                    className="w-full bg-slate-50 border border-slate-100 rounded-xl px-4 py-3 text-sm font-bold focus:ring-2 focus:ring-emerald-500/20 text-emerald-900"
                    placeholder="Enter Business Name"
                    value={settings.businessName}
                    onChange={(e) => setSettings({...settings, businessName: e.target.value})}
                  />
                  <Store size={16} className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-300" />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">GST Number</label>
                  <div className="relative">
                    <input 
                      type="text"
                      className="w-full bg-slate-50 border border-slate-100 rounded-xl px-4 py-3 text-sm font-bold focus:ring-2 focus:ring-emerald-500/20 text-emerald-900"
                      placeholder="GSTIN"
                      value={settings.gstNo || ''}
                      onChange={(e) => setSettings({...settings, gstNo: e.target.value})}
                    />
                    <Hash size={16} className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-300" />
                  </div>
                </div>
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">Contact Number</label>
                  <div className="relative">
                    <input 
                      type="text"
                      className="w-full bg-slate-50 border border-slate-100 rounded-xl px-4 py-3 text-sm font-bold focus:ring-2 focus:ring-emerald-500/20 text-emerald-900"
                      placeholder="+91"
                      value={settings.contactNo || ''}
                      onChange={(e) => setSettings({...settings, contactNo: e.target.value})}
                    />
                    <Phone size={16} className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-300" />
                  </div>
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">Business Email</label>
                <div className="relative">
                  <input 
                    type="email"
                    className="w-full bg-slate-50 border border-slate-100 rounded-xl px-4 py-3 text-sm font-bold focus:ring-2 focus:ring-emerald-500/20 text-emerald-900"
                    placeholder="email@example.com"
                    value={settings.email || ''}
                    onChange={(e) => setSettings({...settings, email: e.target.value})}
                  />
                  <Mail size={16} className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-300" />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">Business Address</label>
                <div className="relative">
                  <textarea 
                    className="w-full bg-slate-50 border border-slate-100 rounded-xl px-4 py-3 text-sm font-bold focus:ring-2 focus:ring-emerald-500/20 text-emerald-900 min-h-[80px]"
                    placeholder="Physical location"
                    value={settings.address || ''}
                    onChange={(e) => setSettings({...settings, address: e.target.value})}
                  />
                  <MapPin size={16} className="absolute right-4 top-6 text-slate-300" />
                </div>
              </div>

              <div className="pt-2">
                <button 
                  type="submit"
                  disabled={saving}
                  className="w-full bg-emerald-600 text-white font-bold py-4 rounded-xl shadow-lg shadow-emerald-600/20 hover:bg-emerald-700 transition-all text-sm uppercase tracking-wider flex items-center justify-center gap-2 disabled:opacity-50"
                >
                  {saving ? <Loader2 size={18} className="animate-spin" /> : <Store size={18} />}
                  {saving ? 'Updating...' : 'Save Business Profile'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Units Modal */}
      {activeModal === 'UNITS' && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/40 backdrop-blur-sm p-4 animate-in fade-in duration-200">
          <div className="bg-slate-50 w-full max-w-5xl rounded-[2rem] shadow-2xl flex flex-col h-[90vh] max-h-[800px] overflow-hidden animate-in slide-in-from-bottom-4 duration-300">
            {/* Header */}
            <div className="flex items-center justify-between p-6 bg-white border-b border-gray-100 z-10 shadow-sm shrink-0">
              <div className="flex items-center gap-3">
                <div className="p-2.5 bg-emerald-100 text-emerald-600 rounded-xl">
                  <Package size={22} className="drop-shadow-sm" />
                </div>
                <div>
                  <h3 className="text-xl font-black text-gray-900 tracking-tight leading-none mb-1">Unit Management</h3>
                  <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Inventory Measurement Specs</p>
                </div>
              </div>
              <button 
                onClick={() => setActiveModal(null)}
                className="p-2 bg-gray-50 hover:bg-red-50 text-gray-400 hover:text-red-500 rounded-full transition-all active:scale-95"
              >
                <X size={20} strokeWidth={2.5} />
              </button>
            </div>

            {/* Grid Content */}
            <div className="flex-1 overflow-y-auto p-6">
              <div className="grid grid-cols-1 lg:grid-cols-[3fr_5fr] gap-6 max-w-none">
                
                {/* Form Side */}
                <div className="bg-white rounded-3xl p-6 border border-gray-100 shadow-sm h-fit sticky top-0">
                  <h4 className="text-sm font-black text-emerald-900 uppercase tracking-wider mb-5 flex items-center gap-2">
                    <span className="w-1.5 h-4 bg-emerald-500 rounded-full inline-block"></span>
                    {editingUnitId ? 'Edit Unit' : 'Create Unit'}
                  </h4>
                  <form onSubmit={handleSaveUnit} className="space-y-4">
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest ml-1">Unit Name</label>
                      <input 
                        type="text"
                        required
                        placeholder="Enter Unit Name (e.g., Gram)"
                        className="w-full bg-slate-50 border border-slate-100 rounded-xl px-4 py-3 text-sm font-bold focus:bg-white focus:ring-2 focus:ring-emerald-500/20 text-emerald-950 transition-all outline-none placeholder-gray-300"
                        value={newUnit.name}
                        onChange={(e) => setNewUnit({...newUnit, name: e.target.value})}
                      />
                    </div>
                    
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest ml-1">Unit Type / Symbol</label>
                      <input 
                        type="text"
                        required
                        placeholder="Enter Unit Type (e.g., Gms)"
                        className="w-full bg-slate-50 border border-slate-100 rounded-xl px-4 py-3 text-sm font-bold focus:bg-white focus:ring-2 focus:ring-emerald-500/20 text-emerald-950 transition-all outline-none placeholder-gray-300"
                        value={newUnit.type}
                        onChange={(e) => setNewUnit({...newUnit, type: e.target.value})}
                      />
                    </div>

                    <div className="pt-2">
                      <button 
                        type="submit"
                        disabled={saving}
                        className="w-full bg-emerald-600 text-white font-black py-3.5 rounded-xl shadow-lg shadow-emerald-500/20 hover:bg-emerald-700 transition-all text-xs uppercase tracking-widest flex items-center justify-center gap-2 disabled:opacity-60 active:scale-[0.98]"
                      >
                        {saving ? <Loader2 size={16} className="animate-spin" /> : (editingUnitId ? <Save size={16} /> : <span className="text-lg leading-none shrink-0 border-2 border-white/30 rounded-full w-5 h-5 flex items-center justify-center -mr-1">+</span>)}
                        {saving ? 'Processing...' : (editingUnitId ? 'Update Unit' : 'Create Unit')}
                      </button>
                      
                      {editingUnitId && (
                        <button 
                          type="button"
                          onClick={() => { setEditingUnitId(null); setNewUnit({name:'', type:''}) }}
                          className="w-full mt-2 bg-slate-100 text-slate-500 font-bold py-3 text-xs uppercase tracking-widest rounded-xl hover:bg-slate-200 transition-colors"
                        >
                          Cancel Editing
                        </button>
                      )}
                    </div>
                  </form>
                </div>

                {/* Table Side */}
                <div className="bg-white rounded-3xl border border-gray-100 shadow-sm overflow-hidden flex flex-col">
                  <div className="p-5 border-b border-gray-50 flex items-center justify-between bg-emerald-900 text-emerald-50 shrink-0">
                    <h4 className="text-sm font-black uppercase tracking-wider flex items-center gap-2">
                      <FileText size={16} className="text-emerald-400" />
                      Showing created data
                    </h4>
                    <span className="text-xs font-bold px-2.5 py-1 bg-emerald-800 rounded-lg whitespace-nowrap">
                      {units.length} Records
                    </span>
                  </div>

                  <div className="w-full overflow-x-auto flex-1">
                    <table className="w-full min-w-[500px] text-left border-collapse">
                      <thead>
                        <tr className="bg-slate-50/80 border-b border-gray-100">
                          <th className="py-3 px-5 text-[10px] uppercase tracking-widest font-black text-slate-400 whitespace-nowrap">Unit Name</th>
                          <th className="py-3 px-5 text-[10px] uppercase tracking-widest font-black text-slate-400 whitespace-nowrap">Unit Type</th>
                          <th className="py-3 px-5 text-[10px] uppercase tracking-widest font-black text-slate-400 whitespace-nowrap">Created Date</th>
                          <th className="py-3 px-5 text-[10px] uppercase tracking-widest font-black text-slate-400 whitespace-nowrap text-right">Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {unitsLoading ? (
                          <tr>
                            <td colSpan="4" className="py-12 text-center text-slate-400 text-sm font-bold">
                              <Loader2 className="mx-auto animate-spin mb-2" size={24} />
                              Loading records...
                            </td>
                          </tr>
                        ) : units.length === 0 ? (
                          <tr>
                            <td colSpan="4" className="py-12 text-center text-slate-400 text-sm font-bold bg-slate-50/30">
                              No measurement units created yet.
                            </td>
                          </tr>
                        ) : (
                          units.map((unit) => (
                            <tr key={unit.id} className="border-b border-gray-50 hover:bg-emerald-50/30 transition-colors group">
                              <td className="py-3 px-5 text-sm font-black text-slate-700 whitespace-nowrap">{unit.name}</td>
                              <td className="py-3 px-5 text-sm font-bold text-emerald-600 whitespace-nowrap">
                                <span className="bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-100">{unit.type}</span>
                              </td>
                              <td className="py-3 px-5 text-xs font-bold text-slate-400 whitespace-nowrap">
                                {new Date(unit.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                              </td>
                              <td className="py-3 px-5 text-right whitespace-nowrap">
                                <div className="flex items-center justify-end gap-2">
                                  <button 
                                    onClick={() => { setEditingUnitId(unit.id); setNewUnit({ name: unit.name, type: unit.type }) }}
                                    className="p-1.5 text-emerald-600 hover:bg-emerald-100 rounded-lg transition-colors group-hover:opacity-100 opacity-70"
                                  >
                                    <Edit size={16} />
                                  </button>
                                  <button 
                                    onClick={() => handleDeleteUnit(unit.id)}
                                    className="p-1.5 text-red-500 hover:bg-red-50 rounded-lg transition-colors group-hover:opacity-100 opacity-70"
                                  >
                                    <Trash2 size={16} />
                                  </button>
                                </div>
                              </td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>

              </div>
            </div>
          </div>
        </div>
      )}

      {/* Categories Modal */}
      {activeModal === 'CATEGORIES' && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/40 backdrop-blur-sm p-4 animate-in fade-in duration-200">
          <div className="bg-slate-50 w-full max-w-5xl rounded-[2rem] shadow-2xl flex flex-col h-[90vh] max-h-[800px] overflow-hidden animate-in slide-in-from-bottom-4 duration-300">
            {/* Header */}
            <div className="flex items-center justify-between p-6 bg-white border-b border-gray-100 z-10 shadow-sm shrink-0">
              <div className="flex items-center gap-3">
                <div className="p-2.5 bg-orange-100 text-orange-600 rounded-xl">
                  <Package size={22} className="drop-shadow-sm" />
                </div>
                <div>
                  <h3 className="text-xl font-black text-gray-900 tracking-tight leading-none mb-1">Category Management</h3>
                  <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Inventory Classification</p>
                </div>
              </div>
              <button 
                onClick={() => setActiveModal(null)}
                className="p-2 bg-gray-50 hover:bg-red-50 text-gray-400 hover:text-red-500 rounded-full transition-all active:scale-95"
              >
                <X size={20} strokeWidth={2.5} />
              </button>
            </div>

            {/* Grid Content */}
            <div className="flex-1 overflow-y-auto p-6">
              <div className="grid grid-cols-1 lg:grid-cols-[3fr_5fr] gap-6 max-w-none">
                
                {/* Form Side */}
                <div className="bg-white rounded-3xl p-6 border border-gray-100 shadow-sm h-fit sticky top-0">
                  <h4 className="text-sm font-black text-orange-900 uppercase tracking-wider mb-5 flex items-center gap-2">
                    <span className="w-1.5 h-4 bg-orange-500 rounded-full inline-block"></span>
                    {editingCategoryId ? 'Edit Category' : 'Create Category'}
                  </h4>
                  <form onSubmit={handleSaveCategory} className="space-y-4">
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest ml-1">Category Name</label>
                      <input 
                        type="text"
                        required
                        placeholder="Enter Category Name (e.g., Electronics)"
                        className="w-full bg-slate-50 border border-slate-100 rounded-xl px-4 py-3 text-sm font-bold focus:bg-white focus:ring-2 focus:ring-orange-500/20 text-emerald-950 transition-all outline-none placeholder-gray-300"
                        value={newCategory.name}
                        onChange={(e) => setNewCategory({...newCategory, name: e.target.value})}
                      />
                    </div>

                    <div className="pt-2">
                      <button 
                        type="submit"
                        disabled={saving}
                        className="w-full bg-orange-600 text-white font-black py-3.5 rounded-xl shadow-lg shadow-orange-500/20 hover:bg-orange-700 transition-all text-xs uppercase tracking-widest flex items-center justify-center gap-2 disabled:opacity-60 active:scale-[0.98]"
                      >
                        {saving ? <Loader2 size={16} className="animate-spin" /> : (editingCategoryId ? <Save size={16} /> : <span className="text-lg leading-none shrink-0 border-2 border-white/30 rounded-full w-5 h-5 flex items-center justify-center -mr-1">+</span>)}
                        {saving ? 'Processing...' : (editingCategoryId ? 'Update Category' : 'Create Category')}
                      </button>
                      
                      {editingCategoryId && (
                        <button 
                          type="button"
                          onClick={() => { setEditingCategoryId(null); setNewCategory({name:''}) }}
                          className="w-full mt-2 bg-slate-100 text-slate-500 font-bold py-3 text-xs uppercase tracking-widest rounded-xl hover:bg-slate-200 transition-colors"
                        >
                          Cancel Editing
                        </button>
                      )}
                    </div>
                  </form>
                </div>

                {/* Table Side */}
                <div className="bg-white rounded-3xl border border-gray-100 shadow-sm overflow-hidden flex flex-col">
                  <div className="p-5 border-b border-gray-50 flex items-center justify-between bg-orange-900 text-orange-50 shrink-0">
                    <h4 className="text-sm font-black uppercase tracking-wider flex items-center gap-2">
                      <FileText size={16} className="text-orange-400" />
                      Showing categories
                    </h4>
                    <span className="text-xs font-bold px-2.5 py-1 bg-orange-800 rounded-lg whitespace-nowrap">
                      {categories.length} Records
                    </span>
                  </div>

                  <div className="w-full overflow-x-auto flex-1">
                    <table className="w-full min-w-[500px] text-left border-collapse">
                      <thead>
                        <tr className="bg-slate-50/80 border-b border-gray-100">
                          <th className="py-3 px-5 text-[10px] uppercase tracking-widest font-black text-slate-400 whitespace-nowrap">Category Name</th>
                          <th className="py-3 px-5 text-[10px] uppercase tracking-widest font-black text-slate-400 whitespace-nowrap text-right">Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {categoriesLoading ? (
                          <tr>
                            <td colSpan="2" className="py-12 text-center text-slate-400 text-sm font-bold">
                              <Loader2 className="mx-auto animate-spin mb-2" size={24} />
                              Loading records...
                            </td>
                          </tr>
                        ) : categories.length === 0 ? (
                          <tr>
                            <td colSpan="2" className="py-12 text-center text-slate-400 text-sm font-bold bg-slate-50/30">
                              No categories created yet.
                            </td>
                          </tr>
                        ) : (
                          categories.map((category) => (
                            <tr key={category.id} className="border-b border-gray-50 hover:bg-orange-50/30 transition-colors group">
                              <td className="py-3 px-5 text-sm font-black text-slate-700 whitespace-nowrap">{category.name}</td>
                              <td className="py-3 px-5 text-right whitespace-nowrap">
                                <div className="flex items-center justify-end gap-2">
                                  <button 
                                    onClick={() => { setEditingCategoryId(category.id); setNewCategory({ name: category.name }) }}
                                    className="p-1.5 text-orange-600 hover:bg-orange-100 rounded-lg transition-colors group-hover:opacity-100 opacity-70"
                                  >
                                    <Edit size={16} />
                                  </button>
                                  <button 
                                    onClick={() => handleDeleteCategory(category.id)}
                                    className="p-1.5 text-red-500 hover:bg-red-50 rounded-lg transition-colors group-hover:opacity-100 opacity-70"
                                  >
                                    <Trash2 size={16} />
                                  </button>
                                </div>
                              </td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>

              </div>
            </div>
          </div>
        </div>
      )}

      {/* Asset Categories Modal */}
      {activeModal === 'ASSET_CATEGORIES' && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/40 backdrop-blur-sm p-4 animate-in fade-in duration-200">
          <div className="bg-slate-50 w-full max-w-5xl rounded-[2rem] shadow-2xl flex flex-col h-[90vh] max-h-[800px] overflow-hidden animate-in slide-in-from-bottom-4 duration-300">
            {/* Header */}
            <div className="flex items-center justify-between p-6 bg-white border-b border-gray-100 z-10 shadow-sm shrink-0">
              <div className="flex items-center gap-3">
                <div className="p-2.5 bg-indigo-100 text-indigo-600 rounded-xl">
                  <Package size={22} className="drop-shadow-sm" />
                </div>
                <div>
                  <h3 className="text-xl font-black text-gray-900 tracking-tight leading-none mb-1">Asset Category Management</h3>
                  <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Asset Classification</p>
                </div>
              </div>
              <button 
                onClick={() => setActiveModal(null)}
                className="p-2 bg-gray-50 hover:bg-red-50 text-gray-400 hover:text-red-500 rounded-full transition-all active:scale-95"
              >
                <X size={20} strokeWidth={2.5} />
              </button>
            </div>

            {/* Grid Content */}
            <div className="flex-1 overflow-y-auto p-6">
              <div className="grid grid-cols-1 lg:grid-cols-[3fr_5fr] gap-6 max-w-none">
                
                {/* Form Side */}
                <div className="bg-white rounded-3xl p-6 border border-gray-100 shadow-sm h-fit sticky top-0">
                  <h4 className="text-sm font-black text-indigo-900 uppercase tracking-wider mb-5 flex items-center gap-2">
                    <span className="w-1.5 h-4 bg-indigo-500 rounded-full inline-block"></span>
                    {editingAssetCategoryId ? 'Edit Asset Category' : 'Create Asset Category'}
                  </h4>
                  <form onSubmit={handleSaveAssetCategory} className="space-y-4">
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest ml-1">Category Name</label>
                      <input 
                        type="text"
                        required
                        placeholder="Enter Category Name (e.g., Furniture)"
                        className="w-full bg-slate-50 border border-slate-100 rounded-xl px-4 py-3 text-sm font-bold focus:bg-white focus:ring-2 focus:ring-indigo-500/20 text-indigo-950 transition-all outline-none placeholder-gray-300"
                        value={newAssetCategory.name}
                        onChange={(e) => setNewAssetCategory({...newAssetCategory, name: e.target.value})}
                      />
                    </div>

                    <div className="pt-2">
                      <button 
                        type="submit" 
                        disabled={saving}
                        className="w-full bg-indigo-600 text-white font-black py-3.5 rounded-xl shadow-lg shadow-indigo-500/20 hover:bg-indigo-700 transition-all text-xs uppercase tracking-widest flex items-center justify-center gap-2 disabled:opacity-60 active:scale-[0.98]"
                      >
                        {saving ? <Loader2 size={16} className="animate-spin" /> : (editingAssetCategoryId ? <Save size={16} /> : <span className="text-lg leading-none shrink-0 border-2 border-white/30 rounded-full w-5 h-5 flex items-center justify-center -mr-1">+</span>)}
                        {saving ? 'Processing...' : (editingAssetCategoryId ? 'Update Category' : 'Create Category')}
                      </button>
                      
                      {editingAssetCategoryId && (
                        <button 
                          type="button"
                          onClick={() => { setEditingAssetCategoryId(null); setNewAssetCategory({name:''}) }}
                          className="w-full mt-2 bg-slate-100 text-slate-500 font-bold py-3 text-xs uppercase tracking-widest rounded-xl hover:bg-slate-200 transition-colors"
                        >
                          Cancel Editing
                        </button>
                      )}
                    </div>
                  </form>
                </div>

                {/* Table Side */}
                <div className="bg-white rounded-3xl border border-gray-100 shadow-sm overflow-hidden flex flex-col">
                  <div className="p-5 border-b border-gray-50 flex items-center justify-between bg-indigo-900 text-indigo-50 shrink-0">
                    <h4 className="text-sm font-black uppercase tracking-wider flex items-center gap-2">
                      <FileText size={16} className="text-indigo-400" />
                      Showing categories
                    </h4>
                    <span className="text-xs font-bold px-2.5 py-1 bg-indigo-800 rounded-lg whitespace-nowrap">
                      {assetCategories.length} Records
                    </span>
                  </div>

                  <div className="w-full overflow-x-auto flex-1">
                    <table className="w-full min-w-[500px] text-left border-collapse">
                      <thead>
                        <tr className="bg-slate-50/80 border-b border-gray-100">
                          <th className="py-3 px-5 text-[10px] uppercase tracking-widest font-black text-slate-400 whitespace-nowrap">Category Name</th>
                          <th className="py-3 px-5 text-[10px] uppercase tracking-widest font-black text-slate-400 whitespace-nowrap text-right">Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {assetCategoriesLoading ? (
                          <tr>
                            <td colSpan="2" className="py-12 text-center text-slate-400 text-sm font-bold">
                              <Loader2 className="mx-auto animate-spin mb-2" size={24} />
                              Loading records...
                            </td>
                          </tr>
                        ) : assetCategories.length === 0 ? (
                          <tr>
                            <td colSpan="2" className="py-12 text-center text-slate-400 text-sm font-bold bg-slate-50/30">
                              No asset categories created yet.
                            </td>
                          </tr>
                        ) : (
                          assetCategories.map((category) => (
                            <tr key={category.id} className="border-b border-gray-50 hover:bg-indigo-50/30 transition-colors group">
                              <td className="py-3 px-5 text-sm font-black text-slate-700 whitespace-nowrap">{category.name}</td>
                              <td className="py-3 px-5 text-right whitespace-nowrap">
                                <div className="flex items-center justify-end gap-2">
                                  <button 
                                    onClick={() => { setEditingAssetCategoryId(category.id); setNewAssetCategory({ name: category.name }) }}
                                    className="p-1.5 text-indigo-600 hover:bg-indigo-100 rounded-lg transition-colors group-hover:opacity-100 opacity-70"
                                  >
                                    <Edit size={16} />
                                  </button>
                                  <button 
                                    onClick={() => handleDeleteAssetCategory(category.id)}
                                    className="p-1.5 text-red-500 hover:bg-red-50 rounded-lg transition-colors group-hover:opacity-100 opacity-70"
                                  >
                                    <Trash2 size={16} />
                                  </button>
                                </div>
                              </td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>

              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
