import React, { useState, useEffect } from 'react';
import { CreditCard, Percent, FileText, ChevronRight, Bell, Lock, X, Loader2, Save, Store, Mail, Phone, MapPin, Hash, Package, Trash2, Edit, ArrowLeft, CheckCircle2, Plus, AlertTriangle, Search } from 'lucide-react';
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
  // Sub Categories State
  const [subCategories, setSubCategories] = useState([]);
  const [subCategoriesLoading, setSubCategoriesLoading] = useState(false);
  const [newSubCategory, setNewSubCategory] = useState({ name: '', categoryId: '' });
  const [editingSubCategoryId, setEditingSubCategoryId] = useState(null);
  
  // Search States
  const [unitSearch, setUnitSearch] = useState('');
  const [categorySearch, setCategorySearch] = useState('');
  const [subCategorySearch, setSubCategorySearch] = useState('');
  const [assetCategorySearch, setAssetCategorySearch] = useState('');

  const currentUser = useUserStore(s => s.user);
  const can = useUserStore(s => s.can);

  useEffect(() => {
    fetchSettings();
    fetchUnits();
    fetchCategories();
    fetchSubCategories();
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

  const fetchSubCategories = async () => {
    setSubCategoriesLoading(true);
    try {
      const { data } = await adminAPI.getSubCategories({ storeId: currentUser?.storeId });
      setSubCategories(data);
    } catch (error) {
      toast.error('Failed to load sub-categories');
    } finally {
      setSubCategoriesLoading(false);
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

  const handleSaveSubCategory = async (e) => {
    e.preventDefault();
    if (!newSubCategory.name || !newSubCategory.categoryId) return toast.error('Please enter name and select category');
    setSaving(true);
    try {
      if (editingSubCategoryId) {
        const { data } = await adminAPI.updateSubCategory(editingSubCategoryId, newSubCategory);
        setSubCategories(subCategories.map(s => s.id === editingSubCategoryId ? data : s));
        toast.success('Sub-category updated');
      } else {
        const { data } = await adminAPI.createSubCategory(newSubCategory);
        setSubCategories([data, ...subCategories]);
        toast.success('Sub-category created');
      }
      setNewSubCategory({ name: '', categoryId: '' });
      setEditingSubCategoryId(null);
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to save sub-category');
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteSubCategory = async (id) => {
    if (!confirm('Are you sure? Products in this sub-category will be moved to Uncategorized.')) return;
    try {
      await adminAPI.deleteSubCategory(id);
      setSubCategories(subCategories.filter(s => s.id !== id));
      toast.success('Sub-category deleted');
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to delete sub-category');
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
        { label: 'Sub-Category Management', action: () => setActiveModal('SUB_CATEGORIES') },
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

  const renderHeader = (title, subtitle, Icon, colorClass) => (
    <div className="flex items-center justify-between mb-8 animate-in fade-in slide-in-from-left-4 duration-500">
      <div className="flex items-center gap-4">
        <button 
          onClick={() => setActiveModal(null)}
          className="p-2.5 bg-white border border-gray-100 rounded-2xl text-gray-400 hover:text-emerald-600 hover:border-emerald-100 transition-all shadow-sm group"
        >
          <ArrowLeft size={20} className="group-hover:-translate-x-0.5 transition-transform" />
        </button>
        <div>
          <h2 className="text-2xl font-black text-gray-900 tracking-tight">{title}</h2>
          <p className="text-[10px] uppercase font-black text-gray-400 tracking-widest mt-1 italic">{subtitle}</p>
        </div>
      </div>
      <div className={`hidden md:flex items-center gap-3 px-6 py-3 bg-white border border-gray-100 rounded-2xl shadow-sm`}>
        <div className={`p-2 rounded-xl bg-opacity-10 ${colorClass}`}>
          <Icon size={18} />
        </div>
        <span className="text-[10px] font-black uppercase text-gray-400 tracking-widest">Configuration Active</span>
      </div>
    </div>
  );

  // ════════════════════════════════════════════════════════════════════════
  // Sub-Pages Rendering
  // ════════════════════════════════════════════════════════════════════════

  if (activeModal === 'UNITS') {
    return (
      <div className="space-y-6 pb-20 max-w-7xl mx-auto">
        {renderHeader('Unit Management', 'Inventory Measurement Specs', Package, 'text-emerald-600 bg-emerald-100')}
        
        <div className="grid grid-cols-1 lg:grid-cols-[400px_1fr] gap-8">
          <div className="bg-white rounded-[2rem] p-8 border border-gray-50 shadow-xl h-fit">
            <h4 className="text-[10px] font-black text-emerald-900 uppercase tracking-[0.2em] mb-8 flex items-center gap-3">
              <span className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse"></span>
              {editingUnitId ? 'Modification Sync' : 'Measurement Entry'}
            </h4>
            <form onSubmit={handleSaveUnit} className="space-y-6">
              <div className="space-y-2">
                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Universal Unit Name</label>
                <input type="text" required placeholder="e.g., Kilogram" value={newUnit.name} onChange={e => setNewUnit({...newUnit, name: e.target.value})}
                  className="w-full bg-slate-50 border border-slate-100 rounded-2xl px-6 py-4 text-sm font-bold focus:bg-white focus:ring-4 focus:ring-emerald-500/10 focus:border-emerald-500 outline-none transition-all" />
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Symbolic Notation (Type)</label>
                <input type="text" required placeholder="e.g., KG" value={newUnit.type} onChange={e => setNewUnit({...newUnit, type: e.target.value})}
                  className="w-full bg-slate-50 border border-slate-100 rounded-2xl px-6 py-4 text-sm font-bold focus:bg-white focus:ring-4 focus:ring-emerald-500/10 focus:border-emerald-500 outline-none transition-all" />
              </div>
              <div className="pt-4 flex flex-col gap-2">
                <button type="submit" disabled={saving} className="w-full bg-emerald-600 text-white font-black py-5 rounded-2xl shadow-2xl shadow-emerald-500/20 hover:bg-emerald-700 transition-all text-sm uppercase tracking-widest flex items-center justify-center gap-3 disabled:opacity-50 active:scale-[0.98]">
                  {saving ? <Loader2 size={20} className="animate-spin" /> : (editingUnitId ? <Save size={20} /> : <Plus size={20} />)}
                  {saving ? 'Processing...' : (editingUnitId ? 'Update Identity' : 'Authorize Unit')}
                </button>
                {editingUnitId && (
                  <button type="button" onClick={() => { setEditingUnitId(null); setNewUnit({name:'', type:''}) }}
                    className="w-full py-4 rounded-2xl text-[10px] font-black uppercase text-gray-400 hover:text-gray-900 transition-colors">
                    Discard Selection
                  </button>
                )}
              </div>
            </form>
          </div>

          <div className="bg-white rounded-[2rem] border border-gray-50 shadow-xl overflow-hidden min-h-[500px]">
            <div className="px-8 py-6 bg-emerald-900 text-emerald-100 flex items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <FileText size={18} className="text-emerald-400 opacity-60" />
                <h4 className="text-xs font-black uppercase tracking-[0.2em]">Authorized Units Registry</h4>
              </div>
              <div className="flex items-center gap-4">
                <div className="relative">
                  <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-emerald-400" />
                  <input 
                    type="text" 
                    placeholder="Search Units..." 
                    value={unitSearch}
                    onChange={(e) => setUnitSearch(e.target.value)}
                    className="bg-emerald-800/50 border border-emerald-700/50 rounded-xl pl-9 pr-4 py-2 text-[10px] font-black uppercase tracking-widest text-white placeholder:text-emerald-400 focus:bg-emerald-800 outline-none w-48 transition-all"
                  />
                </div>
                <span className="text-[10px] font-black px-4 py-1.5 bg-emerald-800/50 rounded-full border border-emerald-700/50 min-w-fit">{units.length} ACTIVE</span>
              </div>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead>
                  <tr className="bg-slate-50/50 border-b border-gray-100">
                    <th className="py-5 px-8 text-[10px] font-black text-gray-400 uppercase tracking-widest">Formal Identity</th>
                    <th className="py-5 px-8 text-[10px] font-black text-gray-400 uppercase tracking-widest text-center">Notation</th>
                    <th className="py-5 px-8 text-[10px] font-black text-gray-400 uppercase tracking-widest text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {units.filter(u => u.name.toLowerCase().includes(unitSearch.toLowerCase()) || u.type.toLowerCase().includes(unitSearch.toLowerCase())).map(unit => (
                    <tr key={unit.id} className="hover:bg-emerald-50/30 transition-all group">
                      <td className="py-5 px-8">
                        <span className="text-sm font-black text-slate-700">{unit.name}</span>
                      </td>
                      <td className="py-5 px-8 text-center">
                        <span className="inline-block px-3 py-1.5 bg-emerald-50 text-emerald-700 text-[10px] font-black rounded-lg border border-emerald-100">{unit.type}</span>
                      </td>
                      <td className="py-5 px-8 text-right">
                        <div className="flex items-center justify-end gap-2 pr-2">
                          <button onClick={() => { setEditingUnitId(unit.id); setNewUnit({ name: unit.name, type: unit.type }) }}
                            className="p-2 text-emerald-600 hover:bg-white hover:shadow-md rounded-xl transition-all"><Edit size={16} /></button>
                          <button onClick={() => handleDeleteUnit(unit.id)}
                            className="p-2 text-rose-400 hover:bg-white hover:shadow-md hover:text-rose-600 rounded-xl transition-all"><Trash2 size={16} /></button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {units.length === 0 && !unitsLoading && <div className="py-20 text-center text-gray-400 text-xs font-bold font-black uppercase tracking-widest italic opacity-40">Zero Records in Registry</div>}
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (activeModal === 'CATEGORIES') {
    return (
      <div className="space-y-6 pb-20 max-w-7xl mx-auto">
        {renderHeader('Catalog Classification', 'Top-Level Inventory Segmentation', Package, 'text-amber-600 bg-amber-100')}
        <div className="grid grid-cols-1 lg:grid-cols-[400px_1fr] gap-8">
          <div className="bg-white rounded-[2rem] p-8 border border-gray-50 shadow-xl h-fit">
            <h4 className="text-[10px] font-black text-amber-900 uppercase tracking-[0.2em] mb-8 flex items-center gap-3">
              <span className="w-2 h-2 bg-amber-500 rounded-full animate-pulse"></span>
              {editingCategoryId ? 'Entity Amendment' : 'Structural Creation'}
            </h4>
            <form onSubmit={handleSaveCategory} className="space-y-6">
              <div className="space-y-2">
                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Formal Category Label</label>
                <input type="text" required placeholder="e.g., Consumer Electronics" value={newCategory.name} onChange={e => setNewCategory({...newCategory, name: e.target.value})}
                  className="w-full bg-slate-50 border border-slate-100 rounded-2xl px-6 py-4 text-sm font-bold focus:bg-white focus:ring-4 focus:ring-amber-500/10 focus:border-amber-500 outline-none transition-all" />
              </div>
              <div className="pt-4 flex flex-col gap-2">
                <button type="submit" disabled={saving} className="w-full bg-amber-600 text-white font-black py-5 rounded-2xl shadow-2xl shadow-amber-500/20 hover:bg-amber-700 transition-all text-sm uppercase tracking-widest flex items-center justify-center gap-3 disabled:opacity-50 active:scale-[0.98]">
                  {saving ? <Loader2 size={20} className="animate-spin" /> : (editingCategoryId ? <Save size={20} /> : <Plus size={20} />)}
                  {saving ? 'Synchronizing...' : (editingCategoryId ? 'Commit Update' : 'Initialize Category')}
                </button>
                {editingCategoryId && (
                  <button type="button" onClick={() => { setEditingCategoryId(null); setNewCategory({name:''}) }}
                    className="w-full py-4 rounded-2xl text-[10px] font-black uppercase text-gray-400 hover:text-gray-900 transition-colors">
                    Discard Selection
                  </button>
                )}
              </div>
            </form>
          </div>

          <div className="bg-white rounded-[2rem] border border-gray-50 shadow-xl overflow-hidden min-h-[500px]">
             <div className="px-8 py-6 bg-slate-900 text-slate-100 flex items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <Hash size={18} className="text-amber-400 opacity-60" />
                <h4 className="text-xs font-black uppercase tracking-[0.2em]">Master Classification Indexed</h4>
              </div>
              <div className="flex items-center gap-4">
                <div className="relative">
                  <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input 
                    type="text" 
                    placeholder="Search Categories..." 
                    value={categorySearch}
                    onChange={(e) => setCategorySearch(e.target.value)}
                    className="bg-slate-800 border border-slate-700 rounded-xl pl-9 pr-4 py-2 text-[10px] font-black uppercase tracking-widest text-white placeholder:text-slate-500 focus:bg-slate-850 outline-none w-48 transition-all"
                  />
                </div>
                <span className="text-[10px] font-black px-4 py-1.5 bg-slate-800 rounded-full border border-slate-700 min-w-fit">{categories.length} SEGMENTS</span>
              </div>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left font-bold">
                <thead><tr className="bg-slate-50 border-b border-gray-100"><th className="py-5 px-8 text-[10px] font-black text-gray-400 uppercase tracking-widest">Operational Category</th><th className="py-5 px-8 text-[10px] font-black text-gray-400 uppercase tracking-widest text-right">Contextual Actions</th></tr></thead>
                <tbody className="divide-y divide-gray-50">
                  {categories.filter(c => c.name.toLowerCase().includes(categorySearch.toLowerCase())).map(category => (
                    <tr key={category.id} className="hover:bg-amber-50/20 group">
                      <td className="py-5 px-8 text-sm font-black text-slate-700">{category.name}</td>
                      <td className="py-5 px-8 text-right"><div className="flex items-center justify-end gap-2 pr-2">
                        <button onClick={() => { setEditingCategoryId(category.id); setNewCategory({ name: category.name }) }}
                          className="p-2 text-amber-600 hover:bg-white hover:rotate-12 transition-all"><Edit size={16} /></button>
                        <button onClick={() => handleDeleteCategory(category.id)}
                          className="p-2 text-rose-400 hover:bg-white hover:-rotate-12 transition-all"><Trash2 size={16} /></button>
                      </div></td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {categories.length === 0 && <div className="py-20 text-center text-gray-300 font-black uppercase tracking-widest italic text-[10px]">Registry Empty</div>}
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (activeModal === 'SUB_CATEGORIES') {
    return (
      <div className="space-y-6 pb-20 max-w-7xl mx-auto">
        {renderHeader('Sub-Segmentation', 'Granular Inventory Refinement', Package, 'text-orange-600 bg-orange-100')}
        <div className="grid grid-cols-1 lg:grid-cols-[400px_1fr] gap-8">
          <div className="bg-white rounded-[2rem] p-8 border border-gray-50 shadow-xl h-fit">
            <h4 className="text-[10px] font-black text-orange-900 uppercase tracking-[0.2em] mb-8 flex items-center gap-3">
              <span className="w-2 h-2 bg-orange-500 rounded-full animate-pulse"></span>
              {editingSubCategoryId ? 'Hierarchy Amendment' : 'Relational Entry'}
            </h4>
            <form onSubmit={handleSaveSubCategory} className="space-y-6">
              <div className="space-y-2">
                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Parent Classification</label>
                <select required value={newSubCategory.categoryId} onChange={e => setNewSubCategory({...newSubCategory, categoryId: e.target.value})}
                  className="w-full bg-slate-50 border border-slate-100 rounded-2xl px-6 py-4 text-sm font-black text-emerald-800 appearance-none outline-none focus:ring-4 focus:ring-orange-500/10 focus:border-orange-500 focus:bg-white transition-all cursor-pointer">
                  <option value="">Select Master Category</option>
                  {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Sub-Category Identifier</label>
                <input type="text" required placeholder="e.g., Wireless Peripherals" value={newSubCategory.name} onChange={e => setNewSubCategory({...newSubCategory, name: e.target.value})}
                  className="w-full bg-slate-50 border border-slate-100 rounded-2xl px-6 py-4 text-sm font-bold focus:bg-white focus:ring-4 focus:ring-orange-500/10 focus:border-orange-500 outline-none transition-all" />
              </div>
              <div className="pt-4 flex flex-col gap-2">
                <button type="submit" disabled={saving} className="w-full bg-orange-600 text-white font-black py-5 rounded-2xl shadow-2xl shadow-orange-500/20 hover:bg-orange-700 transition-all text-sm uppercase tracking-widest flex items-center justify-center gap-3 disabled:opacity-50 active:scale-[0.98]">
                  {saving ? <Loader2 size={20} className="animate-spin" /> : (editingSubCategoryId ? <Save size={20} /> : <Plus size={20} />)}
                  {saving ? 'Processing Hierarchy...' : (editingSubCategoryId ? 'Authorize Change' : 'Forge Sub-Category')}
                </button>
                {editingSubCategoryId && (
                   <button type="button" onClick={() => { setEditingSubCategoryId(null); setNewSubCategory({name:'', categoryId:''}) }}
                    className="w-full py-4 rounded-2xl text-[10px] font-black uppercase text-gray-400 hover:text-gray-900 transition-colors">Discard Amendment</button>
                )}
              </div>
            </form>
          </div>

          <div className="bg-white rounded-[2rem] border border-gray-50 shadow-xl overflow-hidden min-h-[500px]">
            <div className="px-8 py-6 bg-orange-950 text-white flex items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <Package size={18} className="text-orange-400 opacity-60" />
                <h4 className="text-xs font-black uppercase tracking-[0.2em]">Granular Catalog Index</h4>
              </div>
              <div className="flex items-center gap-4">
                <div className="relative">
                  <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-orange-400" />
                  <input 
                    type="text" 
                    placeholder="Search Sub-Cats..." 
                    value={subCategorySearch}
                    onChange={(e) => setSubCategorySearch(e.target.value)}
                    className="bg-orange-900 border border-orange-800 rounded-xl pl-9 pr-4 py-2 text-[10px] font-black uppercase tracking-widest text-white placeholder:text-orange-600 focus:bg-orange-800 outline-none w-48 transition-all"
                  />
                </div>
                <span className="text-[10px] font-black px-4 py-1.5 bg-orange-900 rounded-full border border-orange-800 min-w-fit">{subCategories.length} RECORDS</span>
              </div>
            </div>
            <div className="overflow-x-auto font-bold">
              <table className="w-full text-left">
                <thead><tr className="bg-slate-50 border-b border-gray-100"><th className="py-5 px-8 text-[10px] font-black text-gray-400 uppercase tracking-widest">Sub-segment</th><th className="py-5 px-8 text-[10px] font-black text-gray-400 uppercase tracking-widest">Parent Segment</th><th className="py-5 px-8 text-[10px] font-black text-gray-400 uppercase tracking-widest text-right">Operations</th></tr></thead>
                <tbody className="divide-y divide-gray-50">
                  {subCategories.filter(s => s.name.toLowerCase().includes(subCategorySearch.toLowerCase()) || s.category?.name.toLowerCase().includes(subCategorySearch.toLowerCase())).map(sub => (
                    <tr key={sub.id} className="hover:bg-orange-50 transition-all group">
                      <td className="py-5 px-8 text-sm font-black text-slate-700">{sub.name}</td>
                      <td className="py-5 px-8"><span className="text-[10px] px-2.5 py-1 bg-gray-100 text-gray-500 rounded-lg uppercase font-black">{sub.category?.name}</span></td>
                      <td className="py-5 px-8 text-right"><div className="flex items-center justify-end gap-2 pr-2">
                        <button onClick={() => { setEditingSubCategoryId(sub.id); setNewSubCategory({ name: sub.name, categoryId: sub.categoryId }) }}
                          className="p-2 text-orange-600 hover:bg-white hover:shadow-lg rounded-xl transition-all"><Edit size={16} /></button>
                        <button onClick={() => handleDeleteSubCategory(sub.id)}
                          className="p-2 text-rose-400 hover:bg-white hover:shadow-lg hover:text-rose-600 rounded-xl transition-all"><Trash2 size={16} /></button>
                      </div></td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {subCategories.length === 0 && <div className="py-24 text-center text-gray-300 font-black uppercase tracking-widest text-[10px]">Inventory Hierarchy Empty</div>}
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (activeModal === 'ASSET_CATEGORIES') {
    return (
      <div className="space-y-6 pb-20 max-w-7xl mx-auto">
        {renderHeader('Capital Asset Taxonomy', 'Non-Inventory Resource Classification', Package, 'text-indigo-600 bg-indigo-100')}
        <div className="grid grid-cols-1 lg:grid-cols-[400px_1fr] gap-8">
          <div className="bg-white rounded-[2rem] p-8 border border-gray-50 shadow-xl h-fit">
            <h4 className="text-[10px] font-black text-indigo-900 uppercase tracking-[0.2em] mb-8 flex items-center gap-3">
              <span className="w-2 h-2 bg-indigo-500 rounded-full animate-pulse"></span>
              {editingAssetCategoryId ? 'Taxonomy Override' : 'Asset Group Entry'}
            </h4>
            <form onSubmit={handleSaveAssetCategory} className="space-y-6">
              <div className="space-y-2">
                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Asset Category Nomenclature</label>
                <input type="text" required placeholder="e.g., Computing Hardware" value={newAssetCategory.name} onChange={e => setNewAssetCategory({...newAssetCategory, name: e.target.value})}
                  className="w-full bg-slate-50 border border-slate-100 rounded-2xl px-6 py-4 text-sm font-bold focus:bg-white focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 outline-none transition-all" />
              </div>
              <div className="pt-4 flex flex-col gap-2">
                 <button type="submit" disabled={saving} className="w-full bg-indigo-600 text-white font-black py-5 rounded-2xl shadow-2xl shadow-indigo-500/20 hover:bg-indigo-700 transition-all text-sm uppercase tracking-widest flex items-center justify-center gap-3 disabled:opacity-50 active:scale-[0.98]">
                  {saving ? <Loader2 size={20} className="animate-spin" /> : (editingAssetCategoryId ? <Save size={20} /> : <Plus size={20} />)}
                  {saving ? 'Relogging Group...' : 'Authorize Asset Type'}
                </button>
                {editingAssetCategoryId && (
                   <button type="button" onClick={() => { setEditingAssetCategoryId(null); setNewAssetCategory({name:''}) }}
                    className="w-full py-4 rounded-2xl text-[10px] font-black uppercase text-gray-400 hover:text-gray-900 transition-colors">Discard Grouping</button>
                )}
              </div>
            </form>
          </div>

          <div className="bg-white rounded-[2rem] border border-gray-50 shadow-xl overflow-hidden min-h-[500px]">
            <div className="px-8 py-6 bg-indigo-950 text-indigo-50 flex items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <Store size={18} className="text-indigo-400 opacity-60" />
                <h4 className="text-xs font-black uppercase tracking-[0.2em]">Institutional Asset Registry</h4>
              </div>
              <div className="flex items-center gap-4">
                <div className="relative">
                  <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-indigo-400" />
                  <input 
                    type="text" 
                    placeholder="Search Asset Types..." 
                    value={assetCategorySearch}
                    onChange={(e) => setAssetCategorySearch(e.target.value)}
                    className="bg-indigo-900 border border-indigo-800 rounded-xl pl-9 pr-4 py-2 text-[10px] font-black uppercase tracking-widest text-white placeholder:text-indigo-600 focus:bg-indigo-800 outline-none w-48 transition-all"
                  />
                </div>
                <span className="text-[10px] font-black px-4 py-1.5 bg-indigo-900 rounded-full border border-indigo-800 min-w-fit">{assetCategories.length} GROUPS</span>
              </div>
            </div>
            <div className="overflow-x-auto font-bold">
              <table className="w-full text-left">
                <thead><tr className="bg-slate-50 border-b border-gray-100"><th className="py-5 px-8 text-[10px] font-black text-gray-400 uppercase tracking-widest">Asset Grouping</th><th className="py-5 px-8 text-[10px] font-black text-gray-400 uppercase tracking-widest text-right">Override Options</th></tr></thead>
                <tbody className="divide-y divide-gray-50">
                  {assetCategories.filter(c => c.name.toLowerCase().includes(assetCategorySearch.toLowerCase())).map(category => (
                    <tr key={category.id} className="hover:bg-indigo-50 group">
                      <td className="py-5 px-8 text-sm font-black text-slate-700">{category.name}</td>
                      <td className="py-5 px-8 text-right"><div className="flex items-center justify-end gap-2 pr-2">
                        <button onClick={() => { setEditingAssetCategoryId(category.id); setNewAssetCategory({ name: category.name }) }}
                          className="p-2 text-indigo-600 hover:bg-white hover:scale-110 transition-all shadow-indigo-100"><Edit size={16} /></button>
                        <button onClick={() => handleDeleteAssetCategory(category.id)}
                          className="p-2 text-rose-400 hover:bg-white hover:scale-110 transition-all shadow-rose-100"><Trash2 size={16} /></button>
                      </div></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (activeModal === 'TAX') {
    return (
      <div className="max-w-3xl mx-auto space-y-8 animate-in fade-in slide-in-from-bottom-6 duration-700">
        {renderHeader('Fiscal Compliance', 'GST Slabbing & Taxation Logic', Percent, 'text-rose-600 bg-rose-100')}
        <div className="bg-white rounded-[3rem] border border-slate-100 shadow-2xl p-10 md:p-16">
          <form onSubmit={handleUpdateSettings} className="space-y-12">
            <div className="space-y-4">
              <label className="text-[11px] font-black text-slate-400 uppercase tracking-[0.3em] flex items-center gap-3">
                <Hash size={14} className="text-rose-500" /> Active GST Slabs (Comma Separated)
              </label>
              <div className="relative group">
                <input type="text" required placeholder="0, 5, 12, 18, 28" value={settings.taxRates} onChange={e => setSettings({...settings, taxRates: e.target.value})}
                  className="w-full bg-slate-50 border-2 border-slate-100 rounded-3xl px-8 py-6 text-2xl font-black text-slate-900 focus:bg-white focus:border-rose-500 focus:ring-[12px] focus:ring-rose-500/5 transition-all outline-none tracking-tight" />
                <div className="absolute top-1/2 -right-4 -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-opacity translate-x-12 hidden lg:block">
                  <div className="bg-slate-900 text-white text-[10px] font-black px-4 py-2 rounded-xl whitespace-nowrap shadow-xl">
                    Values determine product tax menus
                  </div>
                </div>
              </div>
              <div className="p-6 bg-rose-50/50 rounded-2xl border border-rose-100/50 flex gap-4">
                 <AlertTriangle size={20} className="text-rose-500 shrink-0 mt-1" />
                 <p className="text-xs font-bold text-rose-900 leading-relaxed uppercase tracking-tighter italic">
                  Critical Configuration: Changes to these slabs will immediately update the available tax options for all inventory modules across the platform.
                 </p>
              </div>
            </div>

            <div className="pt-6">
              {can('SETTINGS', 'UPDATE') ? (
                <button type="submit" disabled={saving} className="w-full bg-slate-900 text-white font-black py-6 rounded-3xl shadow-2xl shadow-slate-900/30 hover:bg-rose-600 transition-all text-sm uppercase tracking-[0.2em] flex items-center justify-center gap-4 active:scale-95 disabled:bg-slate-400">
                  {saving ? <Loader2 size={24} className="animate-spin" /> : <CheckCircle2 size={24} />}
                  {saving ? 'Synchronizing Slopes...' : 'Apply Governance Policy'}
                </button>
              ) : (
                <div className="bg-rose-50 p-6 rounded-3xl border border-rose-100 flex items-center justify-center gap-3 text-rose-500 font-black text-xs uppercase tracking-widest">
                  <Lock size={16} /> Restricted: Administrative Override Required
                </div>
              )}
            </div>
          </form>
        </div>
      </div>
    );
  }

  if (activeModal === 'BUSINESS') {
    return (
      <div className="max-w-4xl mx-auto space-y-8 animate-in fade-in slide-in-from-right-10 duration-700">
        {renderHeader('Institutional Profile', 'Core Legal & Communication Identity', Store, 'text-blue-600 bg-blue-100')}
        <div className="bg-white rounded-[3rem] border border-gray-50 shadow-2xl overflow-hidden">
          <div className="p-10 md:p-14 space-y-14">
            <form onSubmit={handleUpdateSettings} className="space-y-12">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
                <div className="space-y-10">
                  <div className="space-y-3">
                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Legacy Business Identity</label>
                    <div className="relative group">
                       <input type="text" required placeholder="Institutional Name" value={settings.businessName} onChange={e => setSettings({...settings, businessName: e.target.value})}
                        className="w-full bg-slate-50 border-2 border-slate-100 rounded-2xl px-6 py-5.5 text-lg font-black text-slate-900 focus:bg-white focus:border-blue-500 transition-all outline-none" />
                       <Store size={20} className="absolute right-6 top-1/2 -translate-y-1/2 text-slate-300 group-focus-within:text-blue-500 transition-colors" />
                    </div>
                  </div>
                  <div className="space-y-3">
                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Legal GSTIN Authorization</label>
                    <div className="relative group">
                      <input type="text" placeholder="22AAAAA0000A1Z5" value={settings.gstNo || ''} onChange={e => setSettings({...settings, gstNo: e.target.value})}
                        className="w-full bg-slate-50 border-2 border-slate-100 rounded-2xl px-6 py-5.5 text-lg font-black text-slate-900 focus:bg-white focus:border-blue-500 transition-all outline-none tracking-widest uppercase" />
                      <Hash size={20} className="absolute right-6 top-1/2 -translate-y-1/2 text-slate-300 group-focus-within:text-blue-500 transition-colors" />
                    </div>
                  </div>
                </div>

                <div className="space-y-10">
                   <div className="space-y-3">
                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Operational Hotline</label>
                    <div className="relative group">
                      <input type="text" placeholder="+91" value={settings.contactNo || ''} onChange={e => setSettings({...settings, contactNo: e.target.value })}
                        className="w-full bg-slate-50 border-2 border-slate-100 rounded-2xl px-6 py-5.5 text-lg font-black text-slate-900 focus:bg-white focus:border-blue-500 transition-all outline-none" />
                      <Phone size={20} className="absolute right-6 top-1/2 -translate-y-1/2 text-slate-300 group-focus-within:text-blue-500 transition-colors" />
                    </div>
                  </div>
                  <div className="space-y-3">
                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Contact Email Protocol</label>
                    <div className="relative group">
                      <input type="email" placeholder="hq@entity.com" value={settings.email || ''} onChange={e => setSettings({...settings, email: e.target.value})}
                        className="w-full bg-slate-50 border-2 border-slate-100 rounded-2xl px-6 py-5.5 text-lg font-black text-slate-900 focus:bg-white focus:border-blue-500 transition-all outline-none" />
                      <Mail size={20} className="absolute right-6 top-1/2 -translate-y-1/2 text-slate-300 group-focus-within:text-blue-500 transition-colors" />
                    </div>
                  </div>
                </div>
              </div>

              <div className="space-y-4">
                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Institutional Headquarters Address</label>
                <div className="relative group">
                  <textarea rows="3" placeholder="Full physical address for invoicing..." value={settings.address || ''} onChange={e => setSettings({...settings, address: e.target.value})}
                    className="w-full bg-slate-50 border-2 border-slate-100 rounded-3xl px-8 py-6 text-lg font-bold text-slate-900 focus:bg-white focus:border-blue-500 transition-all outline-none resize-none" />
                  <MapPin size={24} className="absolute right-6 top-8 text-slate-300 group-focus-within:text-blue-500 transition-colors" />
                </div>
              </div>

              <div className="pt-8">
                {can('SETTINGS', 'UPDATE') ? (
                  <button type="submit" disabled={saving} className="w-full bg-blue-600 text-white font-black py-7 rounded-[2rem] shadow-2xl shadow-blue-500/20 hover:bg-blue-700 transition-all text-xs uppercase tracking-[0.25em] flex items-center justify-center gap-4 active:scale-95">
                    {saving ? <Loader2 size={24} className="animate-spin" /> : <Save size={24} />}
                    {saving ? 'Archiving Profile...' : 'Commit Institutional Identity'}
                  </button>
                ) : (
                  <div className="bg-slate-100 p-8 rounded-[2rem] flex items-center justify-center gap-3 text-slate-400 font-bold uppercase tracking-widest text-[10px]">
                    <Lock size={16} /> Restricted Module: Elevated Permissions Required
                  </div>
                )}
              </div>
            </form>
          </div>
        </div>
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
                  className="w-full flex items-center justify-between px-6 py-4 hover:bg-gray-50 transition-colors group text-left disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <span className="text-sm text-gray-600 group-hover:text-emerald-600 font-bold transition-colors">{item.label}</span>
                  <ChevronRight size={16} className="text-gray-300 group-hover:text-emerald-500 transition-colors" />
                </button>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

