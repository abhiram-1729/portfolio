import React, { useState, useEffect } from 'react';
import { Plus, Package, Truck, ArrowDownCircle, ArrowUpCircle, Search, Filter, X, Loader2 } from 'lucide-react';
import adminAPI from '../../services/adminService';
import toast from 'react-hot-toast';

export default function AdminInventory() {
  const [activeTab, setActiveTab] = useState('master');
  const [searchQuery, setSearchQuery] = useState('');
  const [items, setItems] = useState([]);
  const [vehicles, setVehicles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showAddItemModal, setShowAddItemModal] = useState(false);
  
  // States for stock actions
  const [selectedVehicleId, setSelectedVehicleId] = useState('');
  const [stockQuantities, setStockQuantities] = useState({}); // { productId: quantity }
  const [vehicleInventory, setVehicleInventory] = useState([]);

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
  });

  const fetchData = async () => {
    try {
      const [iRes, vRes] = await Promise.all([
        adminAPI.getItems(),
        adminAPI.getVehicles()
      ]);
      setItems(iRes.data);
      setVehicles(vRes.data);
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

  const handleCreateItem = async (e) => {
    e.preventDefault();
    try {
      await adminAPI.createItem(newItem);
      toast.success('Item added to master');
      setShowAddItemModal(false);
      setNewItem({ 
        name: '', 
        image: '', 
        description: '', 
        mrp: '', 
        price: '', 
        landingPrice: '',
        discount: '',
        categoryId: 'default', 
        subCategoryId: 'default', 
        brandId: 'default' 
      });
      fetchData();
    } catch (error) {
      toast.error('Failed to add item');
    }
  };

  const handleStockAction = async (type) => {
    if (!selectedVehicleId) return toast.error('Please select a vehicle');
    
    const actionItems = Object.entries(stockQuantities)
      .filter(([_, qty]) => qty > 0)
      .map(([productId, quantity]) => ({ productId, quantity: parseInt(quantity) }));

    if (actionItems.length === 0) return toast.error('Please enter quantities');

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
    }
  };

  const renderMaster = () => (
    <div className="space-y-4">
      <div className="flex items-center gap-3 bg-white p-3 rounded-2xl border border-gray-100 shadow-sm">
        <Search size={20} className="text-gray-400" />
        <input 
          type="text" 
          placeholder="Search items..." 
          className="flex-1 bg-transparent border-none focus:outline-none text-sm"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
        />
        <Filter size={18} className="text-gray-400" />
      </div>

      <div className="space-y-3">
        {items.filter(i => i.name.toLowerCase().includes(searchQuery.toLowerCase())).map((item) => (
          <div key={item.id} className="bg-white p-4 rounded-2xl border border-gray-100 shadow-sm flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-gray-50 flex items-center justify-center text-emerald-600 overflow-hidden border border-gray-100 shadow-inner">
                {item.image ? (
                  <img src={item.image} alt={item.name} className="w-full h-full object-cover" />
                ) : (
                  <Package size={24} />
                )}
              </div>
              <div className="flex flex-col">
                <h3 className="text-sm font-bold text-gray-900">{item.name}</h3>
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
                </div>
              </div>
            </div>
            <button className="text-emerald-600 text-xs font-bold p-2 hover:bg-emerald-50 rounded-lg">Edit</button>
          </div>
        ))}
      </div>
    </div>
  );

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
              {vehicles.map(v => (
                <option key={v.id} value={v.id}>{v.vehicleNumber}</option>
              ))}
            </select>
            <Truck size={18} className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
          </div>
        </div>
        
        <div className="pt-4 space-y-4">
           <h4 className="text-sm font-bold text-gray-900 flex items-center gap-2">
             <ArrowUpCircle size={18} className="text-emerald-500" />
             Stock Loading (Morning)
           </h4>
           <div className="space-y-3">
             {items.map((item) => (
                <div key={item.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-xl border border-gray-100">
                  <span className="text-sm font-medium text-gray-700">{item.name}</span>
                  <input 
                    type="number" 
                    placeholder="Qty" 
                    className="w-16 bg-white border border-gray-200 rounded-lg px-2 py-1 text-sm text-center font-bold" 
                    value={stockQuantities[item.id] || ''}
                    onChange={(e) => setStockQuantities({...stockQuantities, [item.id]: e.target.value})}
                  />
                </div>
             ))}
           </div>
           <button 
            onClick={() => handleStockAction('LOAD')}
            className="w-full bg-emerald-600 text-white font-bold py-3 rounded-xl shadow-lg shadow-emerald-600/20 hover:bg-emerald-700 transition-all"
           >
             Submit Loading
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
                {vehicles.map(v => (
                  <option key={v.id} value={v.id}>{v.vehicleNumber}</option>
                ))}
             </select>
             <Truck size={18} className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
          </div>
        </div>
        
        <div className="pt-4 space-y-4">
           <h4 className="text-sm font-bold text-gray-900 flex items-center gap-2">
             <ArrowDownCircle size={18} className="text-orange-500" />
             Stock Return (Evening)
           </h4>
           <div className="space-y-3">
             {selectedVehicleId ? (
               items.map((item) => {
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
                        onChange={(e) => setStockQuantities({...stockQuantities, [item.id]: e.target.value})}
                      />
                    </div>
                 );
               })
             ) : (
               <p className="text-center text-gray-400 text-sm py-4">Select a vehicle to see current stock</p>
             )}
           </div>
           <button 
            onClick={() => handleStockAction('RETURN')}
            className="w-full bg-emerald-600 text-white font-bold py-3 rounded-xl shadow-lg shadow-emerald-600/20 hover:bg-emerald-700 transition-all disabled:opacity-50"
            disabled={!selectedVehicleId}
           >
             Submit Return
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
          <div className="bg-white w-full max-w-md rounded-3xl p-6 shadow-2xl animate-in slide-in-from-bottom duration-300">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-xl font-bold text-gray-900">Add New Item</h3>
              <button 
                onClick={() => setShowAddItemModal(false)}
                className="p-2 hover:bg-gray-100 rounded-full text-gray-400"
              >
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleCreateItem} className="space-y-4">
              <div className="space-y-1">
                <label className="text-xs font-bold text-gray-400 uppercase tracking-wider">Item Name</label>
                <input 
                  type="text"
                  required
                  placeholder="e.g. Standard Oil 5L"
                  className="w-full bg-gray-50 border border-gray-100 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-emerald-500/20"
                  value={newItem.name}
                  onChange={(e) => setNewItem({...newItem, name: e.target.value})}
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-gray-400 uppercase tracking-wider">Image URL (Supabase)</label>
                <input 
                  type="text"
                  placeholder="Paste Supabase public URL"
                  className="w-full bg-gray-50 border border-gray-100 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-emerald-500/20"
                  value={newItem.image || ''}
                  onChange={(e) => setNewItem({...newItem, image: e.target.value})}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-xs font-bold text-gray-400 uppercase tracking-wider">Landing Price (Cost)</label>
                  <input 
                    type="number"
                    required
                    placeholder="₹"
                    className="w-full bg-gray-50 border border-gray-100 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-emerald-500/20"
                    value={newItem.landingPrice}
                    onChange={(e) => setNewItem({...newItem, landingPrice: e.target.value})}
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-bold text-gray-400 uppercase tracking-wider">MRP (Original)</label>
                  <input 
                    type="number"
                    required
                    placeholder="₹"
                    className="w-full bg-gray-50 border border-gray-100 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-emerald-500/20"
                    value={newItem.mrp}
                    onChange={(e) => setNewItem({...newItem, mrp: e.target.value})}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-xs font-bold text-gray-400 uppercase tracking-wider">Discount (₹)</label>
                  <input 
                    type="number"
                    required
                    placeholder="₹"
                    className="w-full bg-gray-50 border border-gray-100 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-emerald-500/20"
                    value={newItem.discount}
                    onChange={(e) => {
                      const d = parseFloat(e.target.value) || 0;
                      const m = parseFloat(newItem.mrp) || 0;
                      setNewItem({
                        ...newItem, 
                        discount: e.target.value,
                        price: m > 0 ? (m - d).toString() : newItem.price
                      });
                    }}
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-bold text-gray-400 uppercase tracking-wider">Final Selling Price</label>
                  <input 
                    type="number"
                    required
                    placeholder="₹"
                    className="w-full bg-gray-50 border border-gray-100 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-emerald-500/20 font-bold text-emerald-700"
                    value={newItem.price}
                    onChange={(e) => setNewItem({...newItem, price: e.target.value})}
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-gray-400 uppercase tracking-wider">Description</label>
                <textarea 
                  placeholder="Optional details..."
                  className="w-full bg-gray-50 border border-gray-100 rounded-xl px-4 py-3 text-sm h-20"
                  value={newItem.description}
                  onChange={(e) => setNewItem({...newItem, description: e.target.value})}
                />
              </div>

              <button 
                type="submit"
                className="w-full bg-emerald-600 text-white font-bold py-4 rounded-xl shadow-lg shadow-emerald-600/20 mt-4 hover:bg-emerald-700 transition-all text-sm uppercase tracking-wider"
              >
                Add to Master
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

