import React, { useState, useEffect } from 'react';
import { Plus, Package, Truck, ArrowDownCircle, ArrowUpCircle, Search, Filter, X, Loader2, Pencil, Trash2, Gift, FileText, CheckSquare, Square } from 'lucide-react';
import adminAPI from '../../services/adminService';
import toast from 'react-hot-toast';
import * as XLSX from 'xlsx';

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
  const [showBulkUploadModal, setShowBulkUploadModal] = useState(false);
  const [editItem, setEditItem] = useState(null);
  const [selectedFile, setSelectedFile] = useState(null);
  const [selectedEditFile, setSelectedEditFile] = useState(null);
  const [previewUrl, setPreviewUrl] = useState(null);
  const [editPreviewUrl, setEditPreviewUrl] = useState(null);
  const [isUploading, setIsUploading] = useState(false);
  const [selectedItems, setSelectedItems] = useState([]); // [id, id, ...]
  const [refillRequests, setRefillRequests] = useState([]);
  const [subTab, setSubTab] = useState('loading'); // sub-tab within return section

  // States for stock actions
  const [selectedVehicleId, setSelectedVehicleId] = useState('');
  const [stockQuantities, setStockQuantities] = useState({}); // { productId: quantity }
  const [vehicleInventory, setVehicleInventory] = useState([]);
  const [allVehiclesStock, setAllVehiclesStock] = useState({}); // { [vehicleId]: inventoryList }
  const [viewingVehicleId, setViewingVehicleId] = useState(null);
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
    discountType: 'RUPEE',
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
    if (selectedVehicleId && activeTab === 'return' && subTab === 'return') {
      fetchVehicleInventory(selectedVehicleId);
    }
  }, [selectedVehicleId, activeTab, subTab]);

  useEffect(() => {
    if (activeTab === 'return') {
       if (subTab === 'tracking') {
         loadAllVehiclesStock();
       }
       if (subTab === 'refills') {
         loadRefillRequests();
       }
    }
  }, [activeTab, subTab, vehicles]);

  const loadRefillRequests = async () => {
    try {
      const { data } = await adminAPI.getRefillRequests();
      setRefillRequests(data);
    } catch (error) {
      toast.error('Failed to load refill requests');
    }
  };

  const loadAllVehiclesStock = async () => {
    if (vehicles.length === 0) return;
    try {
      const stockRes = await Promise.all(
        vehicles.map(v => adminAPI.getVehicleInventory(v.id).then(res => ({ id: v.id, data: res.data })))
      );
      const stockMap = {};
      stockRes.forEach(r => {
        stockMap[r.id] = r.data;
      });
      setAllVehiclesStock(stockMap);
    } catch (err) {
      toast.error('Failed to load tracking data for all vehicles');
    }
  };

  const fetchVehicleInventory = async (vId) => {
    try {
      const { data } = await adminAPI.getVehicleInventory(vId);
      setVehicleInventory(data);
    } catch (error) {
      toast.error('Failed to fetch vehicle inventory');
    }
  };

  const calculateFinalPrice = (mrp, discount, type = 'RUPEE') => {
    const m = parseFloat(mrp) || 0;
    const d = parseFloat(discount) || 0;

    let base;
    if (type === 'PERCENT') {
      base = m - (m * (d / 100));
    } else {
      base = m - d;
    }

    return base.toFixed(2);
  };

  const handleDownloadSample = () => {
    const ws = XLSX.utils.json_to_sheet([
      {
        "Product Name": "",
        "Landing Price": "",
        "MRP": "",
        "Discount (%/rs)": "",
        "GST Slab": "",
        "Description": ""
      }
    ]);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "villagkart");
    XLSX.writeFile(wb, "villagkart.xlsx");
  };

  const handleExcelUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    setIsUploading(true);
    const reader = new FileReader();

    reader.onload = async (evt) => {
      try {
        const bstr = evt.target.result;
        const wb = XLSX.read(bstr, { type: 'binary' });
        const wsname = wb.SheetNames[0];
        const ws = wb.Sheets[wsname];
        const data = XLSX.utils.sheet_to_json(ws);

        if (data.length === 0) {
          toast.error('Excel file is empty');
          setIsUploading(false);
          return;
        }

        const products = data
          .map((row) => {
            // Identify columns case-insensitively
            const keys = Object.keys(row);
            const findKey = (search) => keys.find(k => k.toLowerCase().includes(search.toLowerCase()));

            const nameKey = findKey('product name') || findKey('name') || keys[0];
            const landingPriceKey = findKey('landing price') || findKey('landing');
            const mrpKey = findKey('mrp');
            const discountValueKey = findKey('discount value') || findKey('discount');
            const gstKey = findKey('gst slab') || findKey('gst') || findKey('tax');
            const descriptionKey = findKey('description');

            if (!row[nameKey]) return null;

            // Identify discount type from column name containing "discount"
            let discountType = 'RUPEE';
            if (discountValueKey && (discountValueKey.includes('%') || discountValueKey.toLowerCase().includes('percent'))) {
              discountType = 'PERCENT';
            } else {
              // check if there's any other column that specifies type
              const dTypeKey = findKey('discount type');
              if (row[dTypeKey] && (row[dTypeKey].toString().includes('%') || row[dTypeKey].toString().toLowerCase().includes('percent'))) {
                discountType = 'PERCENT';
              }
            }

            const mrp = parseFloat(row[mrpKey]) || 0;
            const discount = parseFloat(row[discountValueKey]) || 0;
            const gst = parseFloat(row[gstKey]) || 0;
            const price = calculateFinalPrice(mrp, discount, discountType);

            return {
              name: row[nameKey],
              landingPrice: parseFloat(row[landingPriceKey]) || 0,
              mrp,
              discount,
              discountType,
              gst,
              description: row[descriptionKey] || '',
              price: parseFloat(price),
              status: 'ACTIVE',
              isFree: false
            };
          })
          .filter(p => p && p.name);

        if (products.length === 0) {
          toast.error('No valid products found in Excel');
          setIsUploading(false);
          return;
        }

        await adminAPI.bulkCreateItems(products);
        toast.success(`Successfully uploaded ${products.length} products`);
        setShowBulkUploadModal(false);
        fetchData();
      } catch (error) {
        console.error('Excel upload error:', error);
        toast.error('Failed to process Excel file');
      } finally {
        setIsUploading(false);
        e.target.value = ''; // Reset input
      }
    };

    reader.readAsBinaryString(file);
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
        discountType: 'RUPEE',
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
      discountType: item.discountType || 'RUPEE',
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

  const handleBulkDelete = async () => {
    if (selectedItems.length === 0) return;
    if (!window.confirm(`Delete ${selectedItems.length} selected items? This cannot be undone.`)) return;

    setIsUploading(true);
    try {
      await adminAPI.bulkDeleteItems(selectedItems);
      toast.success(`Successfully deleted ${selectedItems.length} items`);
      setSelectedItems([]);
      fetchData();
    } catch (error) {
      toast.error('Failed to delete selected items');
    } finally {
      setIsUploading(false);
    }
  };

  const toggleSelectItem = (id) => {
    setSelectedItems(prev =>
      prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
    );
  };

  const handleSelectAll = (filteredItems) => {
    if (selectedItems.length === filteredItems.length && filteredItems.length > 0) {
      setSelectedItems([]);
    } else {
      setSelectedItems(filteredItems.map(i => i.id));
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
    const renderProductCard = (item) => {
      const isSelected = selectedItems.includes(item.id);
      return (
        <div
          key={item.id}
          className={`bg-white p-4 rounded-2xl border transition-all duration-200 ${isSelected ? 'border-emerald-500 bg-emerald-50/10' : item.isFree ? 'border-emerald-100 bg-emerald-50/20' : 'border-gray-100'} shadow-sm flex items-center justify-between group relative`}
        >
          <div className="flex items-center gap-4">
            <button
              onClick={() => toggleSelectItem(item.id)}
              className={`p-1 rounded-md transition-colors ${isSelected ? 'text-emerald-600' : 'text-gray-300'}`}
            >
              {isSelected ? <CheckSquare size={18} /> : <Square size={18} />}
            </button>
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
    }

    const allSelected = filteredItems.length > 0 && selectedItems.length === filteredItems.length;

    return (
      <div className="space-y-4">
        <div className="flex items-center gap-3">
          <div className="flex-1 flex items-center gap-2 bg-white p-2.5 rounded-2xl border border-gray-100 shadow-sm">
            <div className="flex items-center gap-2 pl-2">
              <button
                onClick={() => handleSelectAll(filteredItems)}
                className={`p-1 rounded-md transition-colors ${allSelected ? 'text-emerald-600' : 'text-gray-300'}`}
                title="Select All"
              >
                {allSelected ? <CheckSquare size={18} /> : <Square size={18} />}
              </button>
            </div>
            <Search size={18} className="text-gray-400 shrink-0" />
            <input
              type="text"
              placeholder="Search items..."
              className="w-full bg-transparent border-none focus:outline-none text-sm min-w-0"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
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
          {selectedItems.length > 0 && (
            <button
              onClick={handleBulkDelete}
              disabled={isUploading}
              className="bg-rose-50 text-rose-600 px-4 py-3 rounded-2xl border border-rose-100 shadow-sm hover:bg-rose-100 transition-all flex items-center gap-2 font-bold text-sm"
            >
              <Trash2 size={18} />
              <span>Delete {selectedItems.length}</span>
            </button>
          )}
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
        )}

        <div className="space-y-6">
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

          <div className="flex items-center justify-between bg-emerald-50 p-4 rounded-xl border border-emerald-100">
            <div className="flex flex-col">
              <span className="text-[10px] font-black text-emerald-600 uppercase tracking-widest">Total Loading Value</span>
              <span className="text-xl font-black text-emerald-900">₹{
                items.reduce((acc, item) => {
                  const qty = parseFloat(stockQuantities[item.id]) || 0;
                  return acc + (qty * (parseFloat(item.price) || 0));
                }, 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })
              }</span>
            </div>
            <div className="w-12 h-12 bg-emerald-500/10 rounded-full flex items-center justify-center border border-emerald-500/10">
              <Truck className="text-emerald-600" size={24} />
            </div>
          </div>

          <div className="space-y-6">
            {items.filter(i => !i.isFree).length > 0 && (
              <div className="space-y-3">
                <h4 className="text-[10px] font-black text-gray-400 uppercase tracking-widest pl-1">Regular Products</h4>
                {items.filter(i => !i.isFree).map((item) => {
                  const qty = parseFloat(stockQuantities[item.id]) || 0;
                  const itemAmount = qty * (parseFloat(item.price) || 0);
                  return (
                    <div key={item.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-xl border border-gray-100 group hover:border-emerald-200 transition-colors">
                      <div className="flex flex-col flex-1">
                        <span className="text-sm font-medium text-gray-700">{item.name}</span>
                        {qty > 0 && (
                          <span className="text-[10px] font-bold text-emerald-600 animate-in fade-in slide-in-from-left-1 duration-200">Amount: ₹{itemAmount.toFixed(2)}</span>
                        )}
                      </div>
                      <div className="flex items-center gap-3">
                        <div className="flex flex-col items-end mr-2">
                          <span className="text-[8px] font-black text-gray-400 uppercase">Rate</span>
                          <span className="text-[10px] font-bold text-gray-500">₹{item.price}</span>
                        </div>
                        <input
                          type="number"
                          placeholder="0"
                          className="w-16 bg-white border border-gray-200 rounded-lg px-2 py-1.5 text-sm text-center font-bold focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-300 outline-none transition-all"
                          value={stockQuantities[item.id] || ''}
                          onChange={(e) => setStockQuantities({ ...stockQuantities, [item.id]: e.target.value })}
                        />
                      </div>
                    </div>
                  );
                })}
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
                <div className="flex items-center justify-between bg-blue-50 p-4 rounded-xl border border-blue-100 mb-2">
                  <div className="flex flex-col">
                    <span className="text-[10px] font-black text-blue-600 uppercase tracking-widest">In-Vehicle Inventory Value</span>
                    <span className="text-xl font-black text-blue-900">₹{
                      items.reduce((acc, item) => {
                        const currentStock = vehicleInventory.find(vi => vi.productId === item.id)?.quantity || 0;
                        return acc + (currentStock * (parseFloat(item.price) || 0));
                      }, 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })
                    }</span>
                  </div>
                  <div className="w-12 h-12 bg-blue-500/10 rounded-full flex items-center justify-center border border-blue-500/10">
                    <Package className="text-blue-600" size={24} />
                  </div>
                </div>

                {items.filter(i => !i.isFree).length > 0 && (
                  <div className="space-y-3">
                    <h4 className="text-[10px] font-black text-gray-400 uppercase tracking-widest pl-1">Regular Products</h4>
                    {items.filter(i => !i.isFree).map((item) => {
                      const currentStock = vehicleInventory.find(vi => vi.productId === item.id)?.quantity || 0;
                      const returnQty = parseFloat(stockQuantities[item.id]) || 0;
                      const currentStockAmount = currentStock * (parseFloat(item.price) || 0);

                      return (
                        <div key={item.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-xl border border-gray-100 group hover:border-orange-200 transition-colors">
                          <div className="flex flex-col flex-1">
                            <span className="text-sm font-medium text-gray-700">{item.name}</span>
                            <div className="flex gap-4">
                              <span className="text-[10px] text-gray-400 font-bold uppercase transition-colors group-hover:text-blue-600">Stock: {currentStock}</span>
                              <span className="text-[10px] text-blue-400 font-bold uppercase">₹{currentStockAmount.toFixed(2)}</span>
                            </div>
                          </div>
                          <div className="flex items-center gap-3">
                            {returnQty > 0 && (
                              <div className="flex flex-col items-end mr-1 animate-in fade-in slide-in-from-right-1 duration-200">
                                <span className="text-[8px] font-black text-orange-400 uppercase">Return Value</span>
                                <span className="text-[10px] font-bold text-orange-600">₹{(returnQty * (parseFloat(item.price) || 0)).toFixed(2)}</span>
                              </div>
                            )}
                            <input
                              type="number"
                              placeholder="0"
                              className="w-16 bg-white border border-gray-200 rounded-lg px-2 py-1.5 text-sm text-center font-bold focus:ring-2 focus:ring-orange-500/20 focus:border-orange-300 outline-none transition-all"
                              value={stockQuantities[item.id] || ''}
                              onChange={(e) => setStockQuantities({ ...stockQuantities, [item.id]: e.target.value })}
                            />
                          </div>
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

  const renderTracking = () => {
    if (viewingVehicleId) {
      const v = vehicles.find(vh => vh.id === viewingVehicleId);
      if (!v) return null;

      const inventory = allVehiclesStock[v.id] || [];
      const activeStock = inventory.filter(i => i.quantity > 0);
      const totalValue = activeStock.reduce((acc, item) => acc + (item.quantity * parseFloat(item.product?.price || 0)), 0);
      const agentStr = v.assignedUsers?.[0] ? v.assignedUsers[0].name : 'Unassigned';

      return (
        <div className="space-y-6 animate-in slide-in-from-right-4 duration-300">
          <button
            onClick={() => setViewingVehicleId(null)}
            className="flex items-center gap-2 text-gray-500 hover:text-emerald-600 transition-colors font-bold text-sm bg-white px-4 py-2 rounded-xl border border-gray-100 shadow-sm w-fit"
          >
            ← Back to Vehicles
          </button>

          <div className="bg-white p-4 sm:p-5 rounded-[1.5rem] sm:rounded-[2rem] border border-gray-100 shadow-sm flex flex-col gap-4 sm:gap-6">
            <div className="flex flex-col md:flex-row justify-between md:items-center border-b border-gray-100 pb-4 gap-4">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 bg-emerald-50 rounded-2xl flex items-center justify-center text-emerald-600">
                  <Truck size={24} />
                </div>
                <div className="flex flex-col">
                  <h3 className="text-lg font-black text-gray-900 leading-tight">{agentStr}</h3>
                  <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">{v.vehicleNumber}</span>
                </div>
              </div>
              <div className="flex flex-col items-end bg-blue-50/50 p-2.5 rounded-xl border border-blue-100">
                <span className="text-[9px] font-black text-blue-600 uppercase tracking-widest">Total Stock Value</span>
                <span className="text-base font-black text-blue-900">₹{totalValue.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
              </div>
            </div>

            <div className="space-y-3">
              <h4 className="font-black text-gray-900 flex items-center gap-2 text-sm"><Package size={16} className="text-emerald-500" /> Loaded Inventory</h4>
              {activeStock.length === 0 ? (
                <div className="text-center py-8 bg-gray-50 rounded-2xl border border-dashed border-gray-200">
                  <Package size={28} className="mx-auto text-gray-300 mb-2" />
                  <p className="text-xs text-gray-400 font-bold">No active stock loaded</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                  {activeStock.map(item => (
                    <div key={`track-item-${item.id}`} className="flex items-center justify-between p-3 bg-gray-50 hover:bg-emerald-50/50 hover:border-emerald-100 transition-colors rounded-xl border border-gray-100 group">
                      <div className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded-lg bg-white border border-gray-100 shadow-sm flex items-center justify-center">
                          {item.product?.isFree ? <Gift size={16} className="text-emerald-500" /> : <Package size={16} className="text-gray-400 group-hover:text-emerald-500" />}
                        </div>
                        <div className="flex flex-col">
                          <span className="text-xs font-bold text-gray-800 line-clamp-1">{item.product?.name || 'Unknown'}</span>
                          <span className="text-[9px] font-bold text-emerald-600 uppercase">Rate: ₹{item.product?.price || 0}</span>
                        </div>
                      </div>
                      <div className="flex flex-col items-end shrink-0 pl-2">
                        <span className="text-sm font-black text-gray-900 leading-tight">{item.quantity} <span className="text-[9px] text-gray-400">Qty</span></span>
                        <span className="text-[10px] font-black text-gray-500">₹{(item.quantity * parseFloat(item.product?.price || 0)).toLocaleString()}</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      );
    }

    return (
      <div className="space-y-6 animate-in fade-in duration-300">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {vehicles.map(v => {
            const inventory = allVehiclesStock[v.id] || [];
            const activeStock = inventory.filter(i => i.quantity > 0);
            const totalValue = activeStock.reduce((acc, item) => acc + (item.quantity * parseFloat(item.product?.price || 0)), 0);
            const agentStr = v.assignedUsers?.[0] ? v.assignedUsers[0].name : 'Unassigned';

            return (
              <div
                key={`track-card-${v.id}`}
                onClick={() => setViewingVehicleId(v.id)}
                className="bg-white p-4 rounded-[1.25rem] border border-gray-100 shadow-sm hover:border-emerald-300 hover:shadow-emerald-500/10 transition-all cursor-pointer group flex flex-col gap-3"
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-gray-50 group-hover:bg-emerald-50 transition-colors rounded-xl flex items-center justify-center text-gray-400 group-hover:text-emerald-500 shrink-0">
                    <Truck size={20} />
                  </div>
                  <div className="flex flex-col overflow-hidden">
                    <span className="text-sm font-black text-gray-900 truncate">{agentStr}</span>
                    <span className="text-[9px] font-bold text-gray-400 uppercase tracking-widest">{v.vehicleNumber}</span>
                  </div>
                </div>
                <div className="bg-gray-50 group-hover:bg-emerald-50/50 transition-colors p-2.5 rounded-xl flex justify-between items-center border border-transparent group-hover:border-emerald-100">
                  <div className="flex flex-col">
                    <span className="text-[8px] font-black uppercase text-gray-400">Unique Items</span>
                    <span className="text-xs font-bold text-gray-700 leading-none mt-0.5">{activeStock.length}</span>
                  </div>
                  <div className="flex flex-col items-end">
                    <span className="text-[8px] font-black uppercase text-emerald-600/70">Total Value</span>
                    <span className="text-xs font-black text-emerald-700 leading-none mt-0.5">₹{totalValue.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
                  </div>
                </div>
                <div className="flex items-center justify-between text-[9px] uppercase font-bold text-gray-400 group-hover:text-emerald-500 mt-1">
                  <span>View Details</span>
                  <span>→</span>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  const handleApproveRefill = async (id) => {
    try {
      setIsSubmitting(true);
      await adminAPI.approveRefillRequest(id);
      toast.success('Refill approved and stock loaded successfully');
      loadRefillRequests();
    } catch (error) {
      toast.error('Failed to approve refill');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleRejectRefill = async (id) => {
    try {
      setIsSubmitting(true);
      await adminAPI.rejectRefillRequest(id);
      toast.success('Refill request rejected');
      loadRefillRequests();
    } catch (error) {
      toast.error('Failed to reject refill');
    } finally {
      setIsSubmitting(false);
    }
  };

  const renderRefills = () => (
    <div className="space-y-6 animate-in fade-in duration-300">
      {refillRequests.length === 0 ? (
        <div className="text-center py-12 bg-white rounded-2xl border border-dashed border-gray-200 shadow-sm">
          <Truck size={48} className="mx-auto text-gray-300 mb-4" />
          <h3 className="text-lg font-black text-gray-900">No Refill Requests</h3>
          <p className="text-sm text-gray-500 mt-2">Agents haven't requested any stock refills yet.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {refillRequests.map(req => (
            <div key={req.id} className="bg-white p-5 rounded-[1.5rem] border border-gray-100 shadow-sm flex flex-col gap-4">
              <div className="flex justify-between items-center border-b border-gray-100 pb-3">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-blue-50 rounded-xl flex items-center justify-center text-blue-600 shrink-0">
                    <Truck size={20} />
                  </div>
                  <div className="flex flex-col">
                    <span className="font-black text-gray-900 line-clamp-1">{req.user?.name || 'Unknown Agent'}</span>
                    <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">{req.vehicle?.vehicleNumber}</span>
                  </div>
                </div>
                <div className="flex flex-col items-end shrink-0">
                  <span className={`text-[10px] font-black uppercase tracking-widest px-2 py-1 rounded-md ${
                    req.status === 'PENDING' ? 'bg-amber-50 text-amber-600' :
                    req.status === 'APPROVED' ? 'bg-emerald-50 text-emerald-600' :
                    'bg-red-50 text-red-600'
                  }`}>
                    {req.status}
                  </span>
                  <span className="text-[10px] font-bold text-gray-400 mt-1">{new Date(req.createdAt).toLocaleDateString()}</span>
                </div>
              </div>
              <div className="space-y-2 max-h-[250px] overflow-y-auto pr-2 custom-scrollbar">
                {req.items.map(item => (
                  <div key={item.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-xl border border-gray-100/50">
                    <div className="flex items-center gap-2">
                       <Package size={14} className="text-emerald-500"/>
                       <span className="text-xs font-bold text-gray-800">{item.product?.name}</span>
                    </div>
                    <span className="text-sm font-black text-gray-900">{item.quantity} <span className="text-[10px] text-gray-400">Qty</span></span>
                  </div>
                ))}
              </div>
              {req.status === 'PENDING' && (
                <div className="flex gap-2 pt-3 border-t border-gray-100 mt-auto">
                  <button onClick={() => handleRejectRefill(req.id)} disabled={isSubmitting} className="flex-1 py-2.5 bg-red-50 text-red-600 font-bold text-sm rounded-xl hover:bg-red-100 transition-colors disabled:opacity-50">
                    Reject
                  </button>
                  <button onClick={() => handleApproveRefill(req.id)} disabled={isSubmitting} className="flex-1 py-2.5 bg-emerald-600 text-white font-bold text-sm rounded-xl hover:bg-emerald-700 transition-colors shadow-lg shadow-emerald-600/20 disabled:opacity-50 flex justify-center items-center gap-2">
                    {isSubmitting ? <Loader2 size={16} className="animate-spin" /> : 'Approve'}
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
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
          <div className="flex gap-2">
            <input
              type="file"
              id="excel-upload"
              accept=".xlsx, .xls, .csv"
              className="hidden"
              onChange={handleExcelUpload}
              disabled={isUploading}
            />
            <button
              onClick={() => setShowBulkUploadModal(true)}
              disabled={isUploading}
              className="bg-emerald-50 text-emerald-600 p-3 rounded-xl border border-emerald-100 shadow-sm hover:bg-emerald-100 transition-colors flex items-center gap-2 font-bold text-sm"
              title="Bulk Upload Excel"
            >
              {isUploading ? <Loader2 size={24} className="animate-spin" /> : <FileText size={24} />}
              <span className="hidden md:block">Bulk Upload</span>
            </button>
            <button
              onClick={() => setShowAddItemModal(true)}
              className="bg-emerald-600 text-white p-3 rounded-xl shadow-lg hover:bg-emerald-700 transition-colors"
            >
              <Plus size={24} />
            </button>
          </div>
        )}
      </div>

      <div className="flex gap-2 bg-gray-100 p-1 rounded-2xl flex-wrap">
        {[
          { key: 'master', label: 'Items' },
          { key: 'return', label: 'Return & Stock Logs' }
        ].map((tab) => (
          <button
            key={tab.key}
            onClick={() => {
              setActiveTab(tab.key);
              setStockQuantities({});
              setViewingVehicleId(null);
            }}
            className={`flex-1 py-3 px-2 rounded-xl text-xs font-bold uppercase tracking-wider transition-all duration-200 ${
              activeTab === tab.key ? "bg-white text-emerald-600 shadow-sm" : "text-gray-400"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {activeTab === 'return' && (
        <div className="flex gap-2 p-1 rounded-2xl flex-wrap border-b border-gray-100 mb-6 overflow-x-auto">
          {[
            { key: 'loading', label: 'Loading', icon: <ArrowUpCircle size={14}/> },
            { key: 'return', label: 'Return', icon: <ArrowDownCircle size={14}/> },
            { key: 'tracking', label: 'Tracking', icon: <Truck size={14}/> },
            { key: 'refills', label: 'Refills', icon: <Package size={14}/> }
          ].map((tab) => (
            <button
              key={`sub-${tab.key}`}
              onClick={() => {
                setSubTab(tab.key);
                setStockQuantities({});
                setViewingVehicleId(null);
              }}
              className={`flex items-center gap-2 py-2 px-4 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all duration-200 ${
                subTab === tab.key ? "bg-emerald-50 text-emerald-700 border border-emerald-100" : "text-gray-400 hover:text-gray-600"
              }`}
            >
              {tab.icon}
              {tab.label}
            </button>
          ))}
        </div>
      )}

      {activeTab === 'master' && renderMaster()}
      
      {activeTab === 'return' && (
        <>
          {subTab === 'loading' && renderLoading()}
          {subTab === 'return' && renderReturn()}
          {subTab === 'tracking' && renderTracking()}
          {subTab === 'refills' && renderRefills()}
        </>
      )}

      {/* Bulk Upload Modal */}
      {showBulkUploadModal && (
        <div className="fixed inset-0 z-50 flex items-end md:items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="bg-white w-full max-w-sm rounded-[2rem] p-6 shadow-2xl animate-in slide-in-from-bottom duration-300">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-xl font-bold text-gray-900 flex items-center gap-2">
                <FileText className="text-emerald-500" />
                Bulk Upload
              </h3>
              <button
                onClick={() => setShowBulkUploadModal(false)}
                className="p-1 hover:bg-gray-100 rounded-full text-gray-400"
              >
                <X size={18} />
              </button>
            </div>

            <div className="space-y-4">
              <div
                onClick={() => document.getElementById('excel-upload').click()}
                className="w-full border-2 border-dashed border-emerald-200 bg-emerald-50/50 hover:bg-emerald-50 rounded-[1.5rem] p-6 flex flex-col items-center justify-center cursor-pointer transition-colors group"
                style={{ pointerEvents: isUploading ? 'none' : 'auto' }}
              >
                <div className="w-14 h-14 bg-white rounded-2xl shadow-sm flex items-center justify-center mb-3 text-emerald-600 group-hover:scale-110 transition-transform">
                  {isUploading ? <Loader2 size={24} className="animate-spin" /> : <ArrowUpCircle size={28} />}
                </div>
                <span className="font-bold text-emerald-800 text-sm">Upload Excel File</span>
                <span className="text-xs text-emerald-600/70 mt-1 font-medium select-none">Click to browse your files</span>
              </div>

              <div className="relative flex items-center py-2">
                <div className="flex-grow border-t border-gray-100"></div>
                <span className="flex-shrink-0 mx-4 text-[10px] font-black text-gray-300 uppercase tracking-widest">Or</span>
                <div className="flex-grow border-t border-gray-100"></div>
              </div>

              <button
                onClick={handleDownloadSample}
                className="w-full bg-gray-50 hover:bg-gray-100 text-gray-700 font-bold py-4 rounded-[1.5rem] flex items-center justify-center gap-2 transition-colors border border-gray-200 text-sm"
              >
                <ArrowDownCircle size={18} className="text-gray-500" />
                Download Sample Excel
              </button>
            </div>
          </div>
        </div>
      )}

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
                        price: calculateFinalPrice(m, newItem.discount, newItem.discountType)
                      });
                    }}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="grid grid-cols-2 gap-2 flex-1">
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Discount Type</label>
                    <select
                      className="w-full bg-gray-50 border border-gray-100 rounded-xl px-2 py-2 text-sm focus:ring-2 focus:ring-emerald-500/20 font-bold"
                      value={newItem.discountType}
                      onChange={(e) => {
                        const type = e.target.value;
                        setNewItem({
                          ...newItem,
                          discountType: type,
                          price: calculateFinalPrice(newItem.mrp, newItem.discount, type)
                        });
                      }}
                    >
                      <option value="RUPEE">₹</option>
                      <option value="PERCENT">%</option>
                    </select>
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Value</label>
                    <input
                      type="number"
                      required
                      min="0"
                      placeholder={newItem.discountType === 'PERCENT' ? '%' : '₹'}
                      className="w-full bg-gray-50 border border-gray-100 rounded-xl px-3 py-2 text-sm focus:ring-2 focus:ring-emerald-500/20"
                      value={newItem.discount}
                      onChange={(e) => {
                        const d = Math.max(0, parseFloat(e.target.value) || 0);
                        setNewItem({
                          ...newItem,
                          discount: d.toString(),
                          price: calculateFinalPrice(newItem.mrp, d, newItem.discountType)
                        });
                      }}
                    />
                  </div>
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
                        price: calculateFinalPrice(m, editItem.discount, editItem.discountType)
                      });
                    }}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="grid grid-cols-2 gap-2 flex-1">
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Discount Type</label>
                    <select
                      className="w-full bg-gray-50 border border-gray-100 rounded-xl px-2 py-2 text-sm focus:ring-2 focus:ring-emerald-500/20 font-bold"
                      value={editItem.discountType}
                      onChange={(e) => {
                        const type = e.target.value;
                        setEditItem({
                          ...editItem,
                          discountType: type,
                          price: calculateFinalPrice(editItem.mrp, editItem.discount, type)
                        });
                      }}
                    >
                      <option value="RUPEE">Rupees (₹)</option>
                      <option value="PERCENT">Percent (%)</option>
                    </select>
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Discount Value</label>
                    <input
                      type="number"
                      required
                      min="0"
                      placeholder={editItem.discountType === 'PERCENT' ? '%' : '₹'}
                      className="w-full bg-gray-50 border border-gray-100 rounded-xl px-3 py-2 text-sm focus:ring-2 focus:ring-emerald-500/20"
                      value={editItem.discount}
                      onChange={(e) => {
                        const d = Math.max(0, parseFloat(e.target.value) || 0);
                        setEditItem({
                          ...editItem,
                          discount: d.toString(),
                          price: calculateFinalPrice(editItem.mrp, d, editItem.discountType)
                        });
                      }}
                    />
                  </div>
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

