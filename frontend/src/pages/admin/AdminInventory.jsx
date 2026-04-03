import React, { useState, useEffect } from 'react';
import { Plus, Package, Truck, ArrowDownCircle, ArrowUpCircle, Search, Filter, X, Loader2, Pencil, Trash2, Gift } from 'lucide-react';
import adminAPI from '../../services/adminService';
import toast from 'react-hot-toast';

export default function AdminInventory() {
  const [activeTab, setActiveTab] = useState('master');
  const [searchQuery, setSearchQuery] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  const [filterCategory, setFilterCategory] = useState('ALL');
  const [filterStatus, setFilterStatus] = useState('ALL');
  const [filterFreeOnly, setFilterFreeOnly] = useState(false);
  const [items, setItems] = useState([]);
  const [vehicles, setVehicles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showAddItemModal, setShowAddItemModal] = useState(false);
  const [showEditItemModal, setShowEditItemModal] = useState(false);
  const [editItem, setEditItem] = useState(null);
  const [selectedFile, setSelectedFile] = useState(null);
  const [selectedEditFile, setSelectedEditFile] = useState(null);
  const [previewUrl, setPreviewUrl] = useState(null);
  const [editPreviewUrl, setEditPreviewUrl] = useState(null);

  // States for stock actions
  const [selectedVehicleId, setSelectedVehicleId] = useState('');
  const [stockQuantities, setStockQuantities] = useState({}); // { productId: quantity }
  const [vehicleInventory, setVehicleInventory] = useState([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [deletingId, setDeletingId] = useState(null);
  const [taxRates, setTaxRates] = useState(['0', '5', '12', '18']);

  const [newItem, setNewItem] = useState({
    name: '',
    description: '',
    mrp: '',
    price: '',
    landingPrice: '',
    discount: '',
    categoryId: 'default',
    subCategoryId: 'default',
    brandId: 'default',
    gst: '0',
    isFree: false,
    minShopAmount: '0',
    status: 'ACTIVE',
  });

  const fetchData = async () => {
    try {
      const [iRes, vRes, sRes] = await Promise.all([
        adminAPI.getItems(),
        adminAPI.getVehicles(),
        adminAPI.getSettings()
      ]);
      setItems(iRes.data);
      setVehicles(vRes.data);
      if (sRes.data?.success && sRes.data?.data?.taxRates) {
        setTaxRates(sRes.data.data.taxRates.split(',').map(r => r.trim()));
      }
    } catch (error) {
      toast.error('Failed to fetch inventory data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  useEffect(() => {
    if (selectedVehicleId && activeTab === 'return') {
      fetchVehicleInventory(selectedVehicleId);
    }
  }, [selectedVehicleId, activeTab]);

  const fetchVehicleInventory = async (vId) => {
    try {
      const { data } = await adminAPI.getVehicleInventory(vId);
      setVehicleInventory(data);
    } catch (error) {
      toast.error('Failed to fetch vehicle inventory');
    }
  };

  const calculateFinalPrice = (mrp, discount) => {
    const m = parseFloat(mrp) || 0;
    const d = parseFloat(discount) || 0;
    const base = m - d;
    return base.toFixed(2);
  };

  const handleCreateItem = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      const formData = new FormData();
      Object.keys(newItem).forEach(key => {
        if (newItem[key] !== undefined && newItem[key] !== null) {
          formData.append(key, newItem[key]);
        }
      });

      if (selectedFile) {
        formData.append('image', selectedFile);
      }

      await adminAPI.createItem(formData);
      toast.success('Item added to master');
      setShowAddItemModal(false);
      setSelectedFile(null);
      setPreviewUrl(null);
      setNewItem({
        name: '',
        description: '',
        mrp: '',
        price: '',
        landingPrice: '',
        discount: '',
        categoryId: 'default',
        subCategoryId: 'default',
        brandId: 'default',
        gst: '0',
        isFree: false,
        minShopAmount: '0',
      });
      fetchData();
    } catch (error) {
      console.error('Create item error:', error);
      toast.error(error.response?.data?.message || 'Failed to add item');
    } finally {
      setIsSubmitting(false);
    }
  };

  const openEditModal = (item) => {
    setEditItem({
      id: item.id,
      name: item.name || '',
      description: item.description || '',
      mrp: item.mrp?.toString() || '',
      price: item.price?.toString() || '',
      landingPrice: item.landingPrice?.toString() || '',
      discount: item.discount?.toString() || '',
      image: item.image || '',
      status: item.status || 'ACTIVE',
      gst: item.gst?.toString() || '0',
      isFree: item.isFree || false,
      minShopAmount: item.minShopAmount?.toString() || '0',
    });
    setEditPreviewUrl(item.image || null);
    setShowEditItemModal(true);
  };

  const handleUpdateItem = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      const formData = new FormData();
      Object.keys(editItem).forEach(key => {
        if (key !== 'image' && editItem[key] !== undefined && editItem[key] !== null) {
          formData.append(key, editItem[key]);
        }
      });

      if (selectedEditFile) {
        formData.append('image', selectedEditFile);
      }

      await adminAPI.updateItem(editItem.id, formData);
      toast.success('Item updated successfully');
      setShowEditItemModal(false);
      setEditItem(null);
      setSelectedEditFile(null);
      setEditPreviewUrl(null);
      fetchData();
    } catch (error) {
      console.error('Update item error:', error);
      toast.error(error.response?.data?.message || 'Failed to update item');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleToggleStatus = async (item) => {
    try {
      const updatedStatus = item.status === 'ACTIVE' ? 'INACTIVE' : 'ACTIVE';
      const formData = new FormData();
      formData.append('status', updatedStatus);

      await adminAPI.updateItem(item.id, formData);
      toast.success(`Item marked as ${updatedStatus.toLowerCase()}`);
      fetchData();
    } catch (error) {
      toast.error('Failed to update item status');
    }
  };

  const handleDeleteItem = async (item) => {
    if (!window.confirm(`Delete "${item.name}" from inventory? This cannot be undone.`)) return;
    setDeletingId(item.id);
    try {
      await adminAPI.deleteItem(item.id);
      toast.success('Item deleted successfully');
      fetchData();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to delete item');
    } finally {
      setDeletingId(null);
    }
  };

  const handleFileChange = (e, isEdit = false) => {
    const file = e.target.files[0];
    if (file) {
      if (isEdit) {
        setSelectedEditFile(file);
        setEditPreviewUrl(URL.createObjectURL(file));
      } else {
        setSelectedFile(file);
        setPreviewUrl(URL.createObjectURL(file));
      }
    }
  };

  const handleStockAction = async (type) => {
    if (!selectedVehicleId) return toast.error('Please select a vehicle');

    const actionItems = Object.entries(stockQuantities)
      .filter(([_, qty]) => qty > 0)
      .map(([productId, quantity]) => ({ productId, quantity: parseInt(quantity) }));

    if (actionItems.length === 0) return toast.error('Please enter quantities');

    setIsSubmitting(true);
    try {
      if (type === 'LOAD') {
        await adminAPI.loadStock({ vehicleId: selectedVehicleId, items: actionItems });
        toast.success('Stock loaded successfully');
      } else {
        await adminAPI.returnStock({ vehicleId: selectedVehicleId, items: actionItems });
        toast.success('Stock returned successfully');
      }
      setStockQuantities({});
      if (type === 'RETURN') fetchVehicleInventory(selectedVehicleId);
    } catch (error) {
      toast.error(`Failed to ${type === 'LOAD' ? 'load' : 'return'} stock`);
    } finally {
      setIsSubmitting(false);
    }
  };

  const uniqueCategories = [...new Set(items.map(i => i.category?.name).filter(Boolean))];

  const filteredItems = items.filter(item => {
    const matchesSearch = item.name.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = filterCategory === 'ALL' || item.category?.name === filterCategory;
    const matchesStatus = filterStatus === 'ALL' || item.status === filterStatus;
    const matchesFree = !filterFreeOnly || item.isFree;
    return matchesSearch && matchesCategory && matchesStatus && matchesFree;
  });

  const renderMaster = () => {
    const renderProductCard = (item) => (
      <div key={item.id} className={`bg-white p-4 rounded-2xl border ${item.isFree ? 'border-emerald-100 bg-emerald-50/20' : 'border-gray-100'} shadow-sm flex items-center justify-between`}>
        <div className="flex items-center gap-4">
          <div className={`w-12 h-12 rounded-xl flex items-center justify-center overflow-hidden border shadow-inner ${item.isFree ? 'bg-emerald-50 border-emerald-100 text-emerald-600' : 'bg-gray-50 border-gray-100 text-gray-600'}`}>
            {item.image ? (
              <img src={item.image} alt={item.name} className="w-full h-full object-cover" />
            ) : (
              item.isFree ? <Gift size={24} /> : <Package size={24} />
            )}
          </div>
          <div className="flex flex-col">
            <div className="flex items-center gap-2">
              <h3 className={`text-sm font-bold ${item.isFree ? 'text-emerald-950' : 'text-gray-900'}`}>{item.name}</h3>
              <span className={`text-[8px] font-black px-1.5 py-0.5 rounded uppercase tracking-widest shadow-sm ${item.status === 'INACTIVE' ? 'bg-orange-500 text-white' : (item.isFree ? 'bg-emerald-100 text-emerald-600' : 'bg-blue-100 text-blue-600')}`}>
                {item.status || 'ACTIVE'}
              </span>
              {item.isFree && (
                <span className="bg-gradient-to-r from-emerald-500 to-teal-500 text-white text-[8px] font-black px-1.5 py-0.5 rounded uppercase tracking-widest shadow-sm">Gift</span>
              )}
            </div>
            <span className="text-[10px] text-gray-400 uppercase font-bold tracking-wider">{item.category?.name || 'Uncategorized'}</span>
            <div className="flex items-center gap-3 mt-1 flex-wrap">
              <div className="flex flex-col">
                <span className="text-[10px] text-gray-400 uppercase font-black tracking-tighter">Selling</span>
                <span className="text-xs font-black text-emerald-700">₹{item.price}</span>
              </div>
              <div className="flex flex-col border-l border-gray-100 pl-3">
                <span className="text-[10px] text-gray-400 uppercase font-black tracking-tighter">MRP</span>
                <span className="text-[10px] text-gray-400 line-through">₹{item.mrp || 0}</span>
              </div>
              <div className="flex flex-col border-l border-gray-100 pl-3">
                <span className="text-[10px] text-gray-400 uppercase font-black tracking-tighter">Discount</span>
                <span className="text-[10px] text-orange-600 font-bold">₹{item.discount || 0}</span>
              </div>
              <div className="flex flex-col border-l border-gray-100 pl-3">
                <span className="text-[10px] text-gray-400 uppercase font-black tracking-tighter">Lnd. Price</span>
                <span className="text-[10px] text-slate-500 font-bold">₹{item.landingPrice || 0}</span>
              </div>
              <div className="flex flex-col border-l border-gray-100 pl-3">
                <span className="text-[10px] text-gray-400 uppercase font-black tracking-tighter">GST</span>
                <span className="text-[10px] text-blue-600 font-bold">{item.gst || 0}%</span>
              </div>
              {item.isFree && (
                <div className="flex flex-col border-l border-gray-100 pl-3">
                  <span className="text-[10px] text-emerald-600 uppercase font-black tracking-tighter">Free Above</span>
                  <span className="text-[10px] text-emerald-600 font-bold">₹{item.minShopAmount || 0}</span>
                </div>
              )}
            </div>
          </div>
        </div>
        <div className="flex items-center gap-1">
          <button
            onClick={() => handleToggleStatus(item)}
            className={`text-xs font-bold p-2 rounded-lg flex items-center gap-1 transition-colors ${item.status === 'INACTIVE' ? 'text-emerald-600 hover:bg-emerald-50' : 'text-orange-600 hover:bg-orange-50'}`}
          >
            {item.status === 'INACTIVE' ? '' : ''}
          </button>
          <div className="w-px h-4 bg-gray-200 mx-1 border-r border-gray-100" />
          <button
            onClick={() => openEditModal(item)}
            className="text-gray-600 text-xs font-bold p-2 hover:bg-gray-100 rounded-lg flex items-center gap-1"
          >
            <Pencil size={14} />
          </button>
          <button
            onClick={() => handleDeleteItem(item)}
            title="Delete Item"
            disabled={deletingId === item.id}
            className="p-2 text-gray-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {deletingId === item.id
              ? <Loader2 size={14} className="animate-spin text-rose-400" />
              : <Trash2 size={14} />}
          </button>
        </div>
      </div>
    );

    return (
      <div className="space-y-4">
        <div className="flex items-center gap-2 bg-white p-2.5 rounded-2xl border border-gray-100 shadow-sm">
          <div className="flex-1 flex items-center gap-2 pl-2">
            <Search size={18} className="text-gray-400 shrink-0" />
            <input
              type="text"
              placeholder="Search items..."
              className="w-full bg-transparent border-none focus:outline-none text-sm min-w-0"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
          <div className="flex items-center gap-1.5 shrink-0 border-l border-gray-100 pl-2">
            <button
              onClick={() => setFilterFreeOnly(!filterFreeOnly)}
              className={`px-2.5 py-1.5 rounded-xl text-[10px] uppercase tracking-wider font-bold transition-all border ${filterFreeOnly ? 'bg-emerald-50 border-emerald-200 text-emerald-700 shadow-sm' : 'bg-gray-50 border-gray-100 text-gray-500 hover:bg-gray-100'}`}
            >
              {filterFreeOnly ? '✓ Free Only' : 'Free'}
            </button>
            <button
              onClick={() => setShowFilters(!showFilters)}
              className={`p-1.5 rounded-xl transition-colors border ${showFilters ? 'bg-emerald-50 border-emerald-100 text-emerald-600 shadow-sm' : 'bg-white border-transparent hover:bg-gray-50 text-gray-400'}`}
              title="Advanced Filters"
            >
              <Filter size={16} />
            </button>
          </div>
        </div>

        {showFilters && (
          <div className="bg-white p-4 rounded-2xl border border-gray-100 shadow-sm flex flex-wrap gap-4 animate-in slide-in-from-top-2 duration-200">
            <div className="space-y-1 flex-1 min-w-[150px]">
              <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Category</label>
              <select
                className="w-full bg-gray-50 border border-gray-100 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20 appearance-none"
                value={filterCategory}
                onChange={(e) => setFilterCategory(e.target.value)}
              >
                <option value="ALL">All Categories</option>
                {uniqueCategories.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
            <div className="space-y-1 flex-1 min-w-[150px]">
              <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Status</label>
              <select
                className="w-full bg-gray-50 border border-gray-100 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20 appearance-none"
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value)}
              >
                <option value="ALL">All Status</option>
                <option value="ACTIVE">Active</option>
                <option value="INACTIVE">Inactive</option>
              </select>
            </div>

            <div className="flex items-end">
              <button
                onClick={() => { setFilterCategory('ALL'); setFilterStatus('ALL'); setSearchQuery(''); setFilterFreeOnly(false); }}
                className="text-xs font-bold text-gray-400 hover:text-gray-600 px-3 py-2"
              >
                Clear Filters
              </button>
            </div>
          </div>
        )}      <div className="space-y-6">
          {filteredItems.length === 0 ? (
            <div className="py-12 bg-white rounded-2xl border border-gray-100 text-center shadow-sm">
              <Package size={32} className="mx-auto text-gray-200 mb-2" />
              <p className="text-sm font-bold text-gray-400">No items match your filters</p>
            </div>
          ) : (
            <>
              {filteredItems.filter(i => !i.isFree).length > 0 && (
                <div className="space-y-3">
                  <h4 className="text-[10px] font-black text-gray-400 uppercase tracking-widest pl-2">Regular Products</h4>
                  {filteredItems.filter(i => !i.isFree).map(renderProductCard)}
                </div>
              )}
              {filteredItems.filter(i => i.isFree).length > 0 && (
                <div className="space-y-3 mt-4">
                  <h4 className="text-[10px] font-black text-emerald-500 uppercase tracking-widest pl-2 flex items-center gap-1.5"><Gift size={14} /> Promotional Gifts</h4>
                  {filteredItems.filter(i => i.isFree).map(renderProductCard)}
                </div>
              )}
            </>
          )}
        </div>
      </div>
    );
  };

  const renderLoading = () => (
    <div className="space-y-6">
      <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm space-y-4">
        <div className="space-y-2">
          <label className="text-xs font-bold text-gray-400 uppercase tracking-wider">Select Vehicle</label>
          <div className="relative">
            <select
              value={selectedVehicleId}
              onChange={(e) => setSelectedVehicleId(e.target.value)}
              className="w-full bg-gray-50 border border-gray-100 rounded-xl px-4 py-3 text-sm font-medium appearance-none focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
            >
              <option value="">Select Vehicle No.</option>
              {vehicles.map(v => {
                const nameStr = v.vehicleName ? `(${v.vehicleName})` : '';
                const agentStr = v.assignedUsers?.[0] ? `- Agent: ${v.assignedUsers[0].name}` : '- Unassigned';
                return (
                  <option key={v.id} value={v.id}>
                    {`${v.vehicleNumber} ${nameStr} ${agentStr}`}
                  </option>
                );
              })}
            </select>
            <Truck size={18} className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
          </div>
        </div>

        <div className="pt-4 space-y-4">
          <h4 className="text-sm font-bold text-gray-900 flex items-center gap-2">
            <ArrowUpCircle size={18} className="text-emerald-500" />
            Stock Loading (Morning)
          </h4>
          <div className="space-y-6">
            {items.filter(i => !i.isFree).length > 0 && (
              <div className="space-y-3">
                <h4 className="text-[10px] font-black text-gray-400 uppercase tracking-widest pl-1">Regular Products</h4>
                {items.filter(i => !i.isFree).map((item) => (
                  <div key={item.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-xl border border-gray-100">
                    <span className="text-sm font-medium text-gray-700">{item.name}</span>
                    <input
                      type="number"
                      placeholder="Qty"
                      className="w-16 bg-white border border-gray-200 rounded-lg px-2 py-1 text-sm text-center font-bold"
                      value={stockQuantities[item.id] || ''}
                      onChange={(e) => setStockQuantities({ ...stockQuantities, [item.id]: e.target.value })}
                    />
                  </div>
                ))}
              </div>
            )}
            {items.filter(i => i.isFree).length > 0 && (
              <div className="space-y-3">
                <h4 className="text-[10px] font-black text-emerald-500 uppercase tracking-widest pl-1 flex items-center gap-1.5"><Gift size={14} /> Promotional Gifts</h4>
                {items.filter(i => i.isFree).map((item) => (
                  <div key={item.id} className="flex items-center justify-between p-3 bg-emerald-50/50 rounded-xl border border-emerald-100">
                    <span className="text-sm font-bold text-emerald-900">{item.name}</span>
                    <input
                      type="number"
                      placeholder="Qty"
                      className="w-16 bg-white border border-emerald-200 rounded-lg px-2 py-1 text-sm text-center font-bold text-emerald-700"
                      value={stockQuantities[item.id] || ''}
                      onChange={(e) => setStockQuantities({ ...stockQuantities, [item.id]: e.target.value })}
                    />
                  </div>
                ))}
              </div>
            )}
          </div>
          <button
            onClick={() => handleStockAction('LOAD')}
            disabled={isSubmitting}
            className="w-full bg-emerald-600 text-white font-bold py-3 rounded-xl shadow-lg shadow-emerald-600/20 hover:bg-emerald-700 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
          >
            {isSubmitting ? <><Loader2 size={18} className="animate-spin" /> Processing...</> : 'Submit Loading'}
          </button>
        </div>
      </div>
    </div>
  );

  const renderReturn = () => (
    <div className="space-y-6">
      <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm space-y-4">
        <div className="space-y-2">
          <label className="text-xs font-bold text-gray-400 uppercase tracking-wider">Select Vehicle</label>
          <div className="relative">
            <select
              value={selectedVehicleId}
              onChange={(e) => setSelectedVehicleId(e.target.value)}
              className="w-full bg-gray-50 border border-gray-100 rounded-xl px-4 py-3 text-sm font-medium appearance-none focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
            >
              <option value="">Select Vehicle No.</option>
              {vehicles.map(v => {
                const nameStr = v.vehicleName ? `(${v.vehicleName})` : '';
                const agentStr = v.assignedUsers?.[0] ? `- Agent: ${v.assignedUsers[0].name}` : '- Unassigned';
                return (
                  <option key={v.id} value={v.id}>
                    {`${v.vehicleNumber} ${nameStr} ${agentStr}`}
                  </option>
                );
              })}
            </select>
            <Truck size={18} className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
          </div>
        </div>

        <div className="pt-4 space-y-4">
          <h4 className="text-sm font-bold text-gray-900 flex items-center gap-2">
            <ArrowDownCircle size={18} className="text-orange-500" />
            Stock Return (Evening)
          </h4>
          <div className="space-y-6">
            {selectedVehicleId ? (
              <>
                {items.filter(i => !i.isFree).length > 0 && (
                  <div className="space-y-3">
                    <h4 className="text-[10px] font-black text-gray-400 uppercase tracking-widest pl-1">Regular Products</h4>
                    {items.filter(i => !i.isFree).map((item) => {
                      const currentStock = vehicleInventory.find(vi => vi.productId === item.id)?.quantity || 0;
                      return (
                        <div key={item.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-xl border border-gray-100">
                          <div className="flex flex-col">
                            <span className="text-sm font-medium text-gray-700">{item.name}</span>
                            <span className="text-[10px] text-gray-400 font-bold uppercase">In Vehicle: {currentStock}</span>
                          </div>
                          <input
                            type="number"
                            placeholder="Qty"
                            className="w-16 bg-white border border-gray-200 rounded-lg px-2 py-1 text-sm text-center font-bold"
                            value={stockQuantities[item.id] || ''}
                            onChange={(e) => setStockQuantities({ ...stockQuantities, [item.id]: e.target.value })}
                          />
                        </div>
                      );
                    })}
                  </div>
                )}
                {items.filter(i => i.isFree).length > 0 && (
                  <div className="space-y-3">
                    <h4 className="text-[10px] font-black text-emerald-500 uppercase tracking-widest pl-1 flex items-center gap-1.5"><Gift size={14} /> Promotional Gifts</h4>
                    {items.filter(i => i.isFree).map((item) => {
                      const currentStock = vehicleInventory.find(vi => vi.productId === item.id)?.quantity || 0;
                      return (
                        <div key={item.id} className="flex items-center justify-between p-3 bg-emerald-50/50 rounded-xl border border-emerald-100">
                          <div className="flex flex-col">
                            <span className="text-sm font-bold text-emerald-900">{item.name}</span>
                            <span className="text-[10px] text-emerald-600 font-bold uppercase">In Vehicle: {currentStock}</span>
                          </div>
                          <input
                            type="number"
                            placeholder="Qty"
                            className="w-16 bg-white border border-emerald-200 rounded-lg px-2 py-1 text-sm text-center font-bold text-emerald-700"
                            value={stockQuantities[item.id] || ''}
                            onChange={(e) => setStockQuantities({ ...stockQuantities, [item.id]: e.target.value })}
                          />
                        </div>
                      );
                    })}
                  </div>
                )}
              </>
            ) : (
              <p className="text-center text-gray-400 text-sm py-4">Select a vehicle to see current stock</p>
            )}
          </div>
          <button
            onClick={() => handleStockAction('RETURN')}
            className="w-full bg-emerald-600 text-white font-bold py-3 rounded-xl shadow-lg shadow-emerald-600/20 hover:bg-emerald-700 transition-all disabled:opacity-50 flex items-center justify-center gap-2"
            disabled={!selectedVehicleId || isSubmitting}
          >
            {isSubmitting ? <><Loader2 size={18} className="animate-spin" /> Processing...</> : 'Submit Return'}
          </button>
        </div>
      </div>
    </div>
  );

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
        <Loader2 className="animate-spin text-emerald-600" size={40} />
        <p className="text-gray-500 font-medium tracking-wide">Loading Inventory...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex flex-col gap-1">
          <h2 className="text-2xl font-bold text-gray-900">Inventory Management</h2>
          <p className="text-sm text-gray-500">Track your items and vehicle stocks</p>
        </div>
        {activeTab === 'master' && (
          <button
            onClick={() => setShowAddItemModal(true)}
            className="bg-emerald-600 text-white p-3 rounded-xl shadow-lg hover:bg-emerald-700 transition-colors"
          >
            <Plus size={24} />
          </button>
        )}
      </div>

      <div className="flex gap-2 bg-gray-100 p-1 rounded-2xl">
        {[
          { key: 'master', label: 'Item Master' },
          { key: 'loading', label: 'Loading' },
          { key: 'return', label: 'Return' },
        ].map((tab) => (
          <button
            key={tab.key}
            onClick={() => {
              setActiveTab(tab.key);
              setStockQuantities({});
            }}
            className={cn(
              "flex-1 py-3 px-2 rounded-xl text-xs font-bold uppercase tracking-wider transition-all duration-200",
              activeTab === tab.key ? "bg-white text-emerald-600 shadow-sm" : "text-gray-400"
            )}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {activeTab === 'master' && renderMaster()}
      {activeTab === 'loading' && renderLoading()}
      {activeTab === 'return' && renderReturn()}

      {/* Add Item Modal */}
      {showAddItemModal && (
        <div className="fixed inset-0 z-50 flex items-end md:items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="bg-white w-full max-w-md rounded-3xl p-5 shadow-2xl animate-in slide-in-from-bottom duration-300 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold text-gray-900">Add New Item</h3>
              <button
                onClick={() => setShowAddItemModal(false)}
                className="p-1 hover:bg-gray-100 rounded-full text-gray-400"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleCreateItem} className="space-y-2.5">
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Item Name</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Standard Oil 5L"
                  className="w-full bg-gray-50 border border-gray-100 rounded-xl px-3 py-2 text-sm focus:ring-2 focus:ring-emerald-500/20"
                  value={newItem.name}
                  onChange={(e) => setNewItem({ ...newItem, name: e.target.value })}
                />
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Product Image</label>
                <div className="flex items-center gap-3">
                  <div
                    className="w-14 h-14 rounded-xl bg-gray-50 border-2 border-dashed border-gray-200 flex items-center justify-center text-gray-400 overflow-hidden cursor-pointer hover:bg-gray-100 transition-colors"
                    onClick={() => document.getElementById('add-image-input').click()}
                  >
                    {previewUrl ? (
                      <img src={previewUrl} alt="Preview" className="w-full h-full object-cover" />
                    ) : (
                      <Plus size={24} />
                    )}
                  </div>
                  <div className="flex-1">
                    <input
                      id="add-image-input"
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={(e) => handleFileChange(e, false)}
                    />
                    <button
                      type="button"
                      onClick={() => document.getElementById('add-image-input').click()}
                      className="text-emerald-600 text-xs font-bold px-3 py-1.5 bg-emerald-50 rounded-lg hover:bg-emerald-100 transition-colors"
                    >
                      {selectedFile ? 'Change Image' : 'Select Image'}
                    </button>
                    <p className="text-[10px] text-gray-400 mt-1 uppercase font-bold">Max 5MB</p>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Landing Price</label>
                  <input
                    type="number"
                    required
                    placeholder="₹"
                    className="w-full bg-gray-50 border border-gray-100 rounded-xl px-3 py-2 text-sm focus:ring-2 focus:ring-emerald-500/20"
                    value={newItem.landingPrice}
                    onChange={(e) => setNewItem({ ...newItem, landingPrice: e.target.value })}
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">MRP</label>
                  <input
                    type="number"
                    required
                    placeholder="₹"
                    className="w-full bg-gray-50 border border-gray-100 rounded-xl px-3 py-2 text-sm focus:ring-2 focus:ring-emerald-500/20"
                    value={newItem.mrp}
                    onChange={(e) => {
                      const m = e.target.value;
                      setNewItem({
                        ...newItem,
                        mrp: m,
                        price: calculateFinalPrice(m, newItem.discount)
                      });
                    }}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Discount (₹)</label>
                  <input
                    type="number"
                    required
                    placeholder="₹"
                    className="w-full bg-gray-50 border border-gray-100 rounded-xl px-3 py-2 text-sm focus:ring-2 focus:ring-emerald-500/20"
                    value={newItem.discount}
                    onChange={(e) => {
                      const d = e.target.value;
                      setNewItem({
                        ...newItem,
                        discount: d,
                        price: calculateFinalPrice(newItem.mrp, d)
                      });
                    }}
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Final Selling Price</label>
                  <input
                    type="number"
                    required
                    placeholder="₹"
                    className="w-full bg-gray-50 border border-gray-100 rounded-xl px-3 py-2 text-sm focus:ring-2 focus:ring-emerald-500/20 font-bold text-emerald-700"
                    value={newItem.price}
                    onChange={(e) => setNewItem({ ...newItem, price: e.target.value })}
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">GST Slab (%)</label>
                  <select
                    className="w-full bg-gray-50 border border-gray-100 rounded-xl px-3 py-2 text-sm focus:ring-2 focus:ring-emerald-500/20 appearance-none font-bold"
                    value={newItem.gst}
                    onChange={(e) => {
                      const g = e.target.value;
                      setNewItem({
                        ...newItem,
                        gst: g
                      });
                    }}
                  >
                    {taxRates.map(rate => (
                      <option key={`add-gst-${rate}`} value={rate}>{rate}%</option>
                    ))}
                  </select>
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Incl. GST (₹)</label>
                  <input
                    type="text"
                    disabled
                    placeholder="₹0.00"
                    className="w-full bg-gray-100 border border-gray-200 rounded-xl px-3 py-2 text-sm font-bold text-emerald-700 cursor-not-allowed"
                    value={newItem.price && newItem.gst ? (parseFloat(newItem.price) - (parseFloat(newItem.price) / (1 + parseFloat(newItem.gst) / 100))).toFixed(2) : '0.00'}
                  />
                </div>

              </div>

              <div className="grid grid-cols-2 gap-3 items-center bg-emerald-50/50 p-3 rounded-xl border border-emerald-100">
                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="isFree-add"
                    className="w-4 h-4 text-emerald-600 rounded border-gray-300 focus:ring-emerald-500"
                    checked={newItem.isFree}
                    onChange={(e) => setNewItem({ ...newItem, isFree: e.target.checked })}
                  />
                  <label htmlFor="isFree-add" className="text-sm font-bold text-emerald-700 cursor-pointer">Free Item</label>
                </div>
                {newItem.isFree && (
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-emerald-600 uppercase tracking-wider">Min Shop ₹</label>
                    <input
                      type="number"
                      placeholder="Amount"
                      className="w-full bg-white border border-emerald-100 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-emerald-500/20 font-bold text-emerald-700"
                      value={newItem.minShopAmount}
                      onChange={(e) => setNewItem({ ...newItem, minShopAmount: e.target.value })}
                    />
                  </div>
                )}
              </div>


              <div className="flex gap-3">
                <div className="space-y-1 flex-1">
                  <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Status</label>
                  <select
                    className="w-full bg-gray-50 border border-gray-100 rounded-xl px-3 py-2 text-sm focus:ring-2 focus:ring-emerald-500/20 appearance-none font-bold"
                    value={newItem.status}
                    onChange={(e) => setNewItem({ ...newItem, status: e.target.value })}
                  >
                    <option value="ACTIVE">Active</option>
                    <option value="INACTIVE">Inactive</option>
                  </select>
                </div>

                <div className="space-y-1 flex-[2]">
                  <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Description</label>
                  <textarea
                    placeholder="Optional details..."
                    className="w-full bg-gray-50 border border-gray-100 rounded-xl px-3 py-2 text-sm h-9 resize-none"
                    value={newItem.description}
                    onChange={(e) => setNewItem({ ...newItem, description: e.target.value })}
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full bg-emerald-600 text-white font-bold py-2.5 rounded-xl shadow-lg shadow-emerald-600/20 mt-2 hover:bg-emerald-700 transition-all text-sm uppercase tracking-wider flex items-center justify-center gap-2 disabled:opacity-50"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 size={16} className="animate-spin" />
                    Adding...
                  </>
                ) : 'Add to Master'}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Edit Item Modal */}
      {showEditItemModal && editItem && (
        <div className="fixed inset-0 z-50 flex items-end md:items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="bg-white w-full max-w-md rounded-3xl p-5 shadow-2xl animate-in slide-in-from-bottom duration-300 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold text-gray-900">Edit Item</h3>
              <button
                onClick={() => { setShowEditItemModal(false); setEditItem(null); }}
                className="p-1 hover:bg-gray-100 rounded-full text-gray-400"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleUpdateItem} className="space-y-2.5">
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Item Name</label>
                <input
                  type="text"
                  required
                  className="w-full bg-gray-50 border border-gray-100 rounded-xl px-3 py-2 text-sm focus:ring-2 focus:ring-emerald-500/20"
                  value={editItem.name}
                  onChange={(e) => setEditItem({ ...editItem, name: e.target.value })}
                />
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Product Image</label>
                <div className="flex items-center gap-3">
                  <div
                    className="w-14 h-14 rounded-xl bg-gray-50 border-2 border-dashed border-gray-200 flex items-center justify-center text-gray-400 overflow-hidden cursor-pointer hover:bg-gray-100 transition-colors"
                    onClick={() => document.getElementById('edit-image-input').click()}
                  >
                    {editPreviewUrl ? (
                      <img src={editPreviewUrl} alt="Preview" className="w-full h-full object-cover" />
                    ) : (
                      <Plus size={24} />
                    )}
                  </div>
                  <div className="flex-1">
                    <input
                      id="edit-image-input"
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={(e) => handleFileChange(e, true)}
                    />
                    <button
                      type="button"
                      onClick={() => document.getElementById('edit-image-input').click()}
                      className="text-emerald-600 text-xs font-bold px-3 py-1.5 bg-emerald-50 rounded-lg hover:bg-emerald-100 transition-colors"
                    >
                      Change Image
                    </button>
                    <p className="text-[10px] text-gray-400 mt-1 uppercase font-bold">Max 5MB</p>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Landing Price</label>
                  <input
                    type="number"
                    required
                    placeholder="₹"
                    className="w-full bg-gray-50 border border-gray-100 rounded-xl px-3 py-2 text-sm focus:ring-2 focus:ring-emerald-500/20"
                    value={editItem.landingPrice}
                    onChange={(e) => setEditItem({ ...editItem, landingPrice: e.target.value })}
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">MRP</label>
                  <input
                    type="number"
                    required
                    placeholder="₹"
                    className="w-full bg-gray-50 border border-gray-100 rounded-xl px-3 py-2 text-sm focus:ring-2 focus:ring-emerald-500/20"
                    value={editItem.mrp}
                    onChange={(e) => {
                      const m = e.target.value;
                      setEditItem({
                        ...editItem,
                        mrp: m,
                        price: calculateFinalPrice(m, editItem.discount)
                      });
                    }}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Discount (₹)</label>
                  <input
                    type="number"
                    required
                    placeholder="₹"
                    className="w-full bg-gray-50 border border-gray-100 rounded-xl px-3 py-2 text-sm focus:ring-2 focus:ring-emerald-500/20"
                    value={editItem.discount}
                    onChange={(e) => {
                      const d = e.target.value;
                      setEditItem({
                        ...editItem,
                        discount: d,
                        price: calculateFinalPrice(editItem.mrp, d)
                      });
                    }}
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Final Selling Price</label>
                  <input
                    type="number"
                    required
                    placeholder="₹"
                    className="w-full bg-gray-50 border border-gray-100 rounded-xl px-3 py-2 text-sm focus:ring-2 focus:ring-emerald-500/20 font-bold text-emerald-700"
                    value={editItem.price}
                    onChange={(e) => setEditItem({ ...editItem, price: e.target.value })}
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">GST Slab (%)</label>
                  <select
                    className="w-full bg-gray-50 border border-gray-100 rounded-xl px-3 py-2 text-sm focus:ring-2 focus:ring-emerald-500/20 appearance-none font-bold"
                    value={editItem.gst}
                    onChange={(e) => {
                      const g = e.target.value;
                      setEditItem({
                        ...editItem,
                        gst: g
                      });
                    }}
                  >
                    {taxRates.map(rate => (
                      <option key={`edit-gst-${rate}`} value={rate}>{rate}%</option>
                    ))}
                  </select>
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Incl. GST (₹)</label>
                  <input
                    type="text"
                    disabled
                    placeholder="₹0.00"
                    className="w-full bg-gray-100 border border-gray-200 rounded-xl px-3 py-2 text-sm font-bold text-emerald-700 cursor-not-allowed"
                    value={editItem.price && editItem.gst ? (parseFloat(editItem.price) - (parseFloat(editItem.price) / (1 + parseFloat(editItem.gst) / 100))).toFixed(2) : '0.00'}
                  />
                </div>

              </div>

              <div className="grid grid-cols-2 gap-3 items-center bg-emerald-50/50 p-3 rounded-xl border border-emerald-100">
                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="isFree-edit"
                    className="w-4 h-4 text-emerald-600 rounded border-gray-300 focus:ring-emerald-500"
                    checked={editItem.isFree}
                    onChange={(e) => setEditItem({ ...editItem, isFree: e.target.checked })}
                  />
                  <label htmlFor="isFree-edit" className="text-sm font-bold text-emerald-700 cursor-pointer">Free Item</label>
                </div>
                {editItem.isFree && (
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-emerald-600 uppercase tracking-wider">Min Shop ₹</label>
                    <input
                      type="number"
                      placeholder="Amount"
                      className="w-full bg-white border border-emerald-100 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-emerald-500/20 font-bold text-emerald-700"
                      value={editItem.minShopAmount}
                      onChange={(e) => setEditItem({ ...editItem, minShopAmount: e.target.value })}
                    />
                  </div>
                )}
              </div>

              <div className="flex gap-3">
                <div className="space-y-1 flex-1">
                  <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Status</label>
                  <select
                    className="w-full bg-gray-50 border border-gray-100 rounded-xl px-3 py-2 text-sm focus:ring-2 focus:ring-emerald-500/20 appearance-none"
                    value={editItem.status}
                    onChange={(e) => setEditItem({ ...editItem, status: e.target.value })}
                  >
                    <option value="ACTIVE">Active</option>
                    <option value="INACTIVE">Inactive</option>
                  </select>
                </div>

                <div className="space-y-1 flex-[2]">
                  <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Description</label>
                  <textarea
                    placeholder="Optional details..."
                    className="w-full bg-gray-50 border border-gray-100 rounded-xl px-3 py-2 text-sm h-9 resize-none"
                    value={editItem.description}
                    onChange={(e) => setEditItem({ ...editItem, description: e.target.value })}
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full bg-emerald-600 text-white font-bold py-2.5 rounded-xl shadow-lg shadow-emerald-600/20 mt-2 hover:bg-emerald-700 transition-all text-sm uppercase tracking-wider flex items-center justify-center gap-2 disabled:opacity-50"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 size={16} className="animate-spin" />
                    Saving...
                  </>
                ) : 'Save Changes'}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

function cn(...inputs) {
  return inputs.filter(Boolean).join(' ');
}

