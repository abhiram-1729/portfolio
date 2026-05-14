import React, { useState, useEffect, useMemo } from 'react';
import { X, Search, Plus, Trash2, Save, Package, Truck, User, Building2, MapPin, Loader2, IndianRupee, ArrowLeft } from 'lucide-react';
import { adminAPI } from '../../services/adminService';
import toast from 'react-hot-toast';
import { useUserStore } from '../../store/userStore';

export default function ManualSaleDrawer({ isOpen, onClose, onSuccess }) {
  const currentUser = useUserStore(s => s.user);
  
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  
  // Data Options
  const [stores, setStores] = useState([]);
  const [vehicles, setVehicles] = useState([]);
  const [users, setUsers] = useState([]);
  const [products, setProducts] = useState([]);
  const [customers, setCustomers] = useState([]);

  // Form State
  const [storeId, setStoreId] = useState(currentUser?.storeId || '');
  const [vehicleId, setVehicleId] = useState('');
  const [agentId, setAgentId] = useState(currentUser?.id || '');
  const [routeId, setRouteId] = useState('');
  const [villageName, setVillageName] = useState('');
  const [saleDate, setSaleDate] = useState(new Date().toISOString().split('T')[0]);
  const [customerId, setCustomerId] = useState('');
  const [customerName, setCustomerName] = useState('');
  const [mobile, setMobile] = useState('');
  const [paymentMode, setPaymentMode] = useState('CASH'); // CASH, UPI, CASH_UPI
  const [cashAmount, setCashAmount] = useState('');
  const [upiAmount, setUpiAmount] = useState('');
  const [remark, setRemark] = useState('');
  const [items, setItems] = useState([]); // { product, quantity, price, discount }

  // Product Search State
  const [productSearch, setProductSearch] = useState('');

  useEffect(() => {
    if (isOpen) {
      fetchDependencies();
    }
  }, [isOpen]);

  const fetchDependencies = async () => {
    setLoading(true);
    try {
      const [storesRes, vehiclesRes, usersRes, productsRes, customersRes] = await Promise.all([
        adminAPI.getStores(),
        adminAPI.getVehicles(),
        adminAPI.getUsers(),
        adminAPI.getItems({ limit: 1000 }), // Assuming getItems returns products
        adminAPI.getCustomers({})
      ]);
      setStores(storesRes.data?.success ? storesRes.data.data : (storesRes.data || []));
      setVehicles(vehiclesRes.data || []);
      setUsers(usersRes.data || []);
      setProducts(productsRes.data?.data || productsRes.data || []);
      setCustomers(customersRes.data?.data || customersRes.data || []);
      
      // Auto-set store if only 1
      const fetchedStores = storesRes.data?.success ? storesRes.data.data : (storesRes.data || []);
      if (fetchedStores.length === 1 && !storeId) {
        setStoreId(fetchedStores[0].id);
      }
    } catch (err) {
      toast.error('Failed to load form dependencies');
    } finally {
      setLoading(false);
    }
  };

  const filteredProducts = useMemo(() => {
    if (!productSearch) return [];
    return products.filter(p => 
      p.name.toLowerCase().includes(productSearch.toLowerCase()) || 
      (p.sku && p.sku.toLowerCase().includes(productSearch.toLowerCase()))
    ).slice(0, 5); // Show top 5 matches
  }, [productSearch, products]);

  const handleAddProduct = (product) => {
    if (items.some(i => i.product.id === product.id)) {
      toast.error('Product already added');
      return;
    }
    setItems([...items, { product, quantity: 1, price: product.price || 0, discount: 0, tax: product.taxPercent || product.gst || 0 }]);
    setProductSearch('');
  };

  const handleUpdateItem = (index, field, value) => {
    const newItems = [...items];
    newItems[index][field] = value;
    setItems(newItems);
  };

  const handleRemoveItem = (index) => {
    setItems(items.filter((_, i) => i !== index));
  };

  const totalAmount = useMemo(() => {
    return items.reduce((sum, item) => {
      const total = (parseFloat(item.price) || 0) * (parseInt(item.quantity) || 1);
      return sum + total;
    }, 0);
  }, [items]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (items.length === 0) {
      return toast.error('Please add at least one item');
    }
    if (!storeId && currentUser?.role === 'TENANT_OWNER') {
      return toast.error('Please select a branch');
    }

    setSubmitting(true);
    try {
      const payload = {
        storeId,
        vehicleId: vehicleId || undefined,
        agentId: agentId || undefined,
        routeId: routeId || undefined,
        villageName: villageName || undefined,
        saleDate: saleDate || undefined,
        customerName: customerName || undefined,
        customerId: customerId || undefined,
        mobile: mobile || undefined,
        paymentMode,
        cashAmount: paymentMode === 'CASH' ? totalAmount : (paymentMode === 'CASH_UPI' ? cashAmount : 0),
        upiAmount: paymentMode === 'UPI' ? totalAmount : (paymentMode === 'CASH_UPI' ? upiAmount : 0),
        remark,
        items: items.map(i => ({
          productId: i.product.id,
          quantity: parseInt(i.quantity),
          price: parseFloat(i.price),
          discount: parseFloat(i.discount) || 0,
          gst: parseFloat(i.tax) || 0
        }))
      };

      await adminAPI.createManualSale(payload);
      toast.success('Manual sale created successfully');
      
      // Reset Form
      setItems([]);
      setCustomerName('');
      setMobile('');
      setVehicleId('');
      setRouteId('');
      setVillageName('');
      setSaleDate(new Date().toISOString().split('T')[0]);
      setRemark('');
      setPaymentMode('CASH');
      
      onSuccess();
      onClose();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to create sale');
    } finally {
      setSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="bg-white rounded-[2rem] border border-gray-100 shadow-sm overflow-hidden flex flex-col animate-in slide-in-from-bottom-4 duration-500">
      
      {/* Header */}
      <div className="bg-gray-50/50 px-6 py-5 border-b border-gray-100 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <button 
            onClick={onClose}
            className="w-10 h-10 rounded-xl bg-white border border-gray-200 text-gray-500 hover:text-gray-900 hover:border-gray-300 flex items-center justify-center transition-all active:scale-95 shadow-sm mr-2"
            title="Go Back"
          >
            <ArrowLeft size={20} strokeWidth={2.5} />
          </button>
          <div className="w-12 h-12 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
            <Plus size={24} strokeWidth={2.5} />
          </div>
          <div>
            <h2 className="text-xl font-black text-gray-900 tracking-tight">Create Manual Sale</h2>
            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mt-1">Admin Operations</p>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="p-6 md:p-8">
        {loading ? (
          <div className="min-h-[400px] flex items-center justify-center">
            <Loader2 className="animate-spin text-emerald-600" size={40} />
          </div>
        ) : (
          <form id="manual-sale-form" onSubmit={handleSubmit} className="space-y-8 max-w-5xl mx-auto">
            
            {/* Context Section */}
            <div className="bg-white rounded-[1.5rem] p-6 border border-gray-100 shadow-sm space-y-4">
              <h3 className="text-sm font-black uppercase tracking-widest text-gray-400 flex items-center gap-2 mb-4">
                <MapPin size={16} /> Order Context
              </h3>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {currentUser?.role === 'TENANT_OWNER' && (
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-black uppercase tracking-widest text-gray-500">Branch <span className="text-rose-500">*</span></label>
                    <select 
                      value={storeId}
                      onChange={(e) => setStoreId(e.target.value)}
                      className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-sm font-medium focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none transition-all"
                      required
                    >
                      <option value="">Select Branch</option>
                      {stores.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                    </select>
                  </div>
                )}

                <div className="space-y-1.5">
                  <label className="text-[10px] font-black uppercase tracking-widest text-gray-500">Vehicle (Optional)</label>
                  <select 
                    value={vehicleId}
                    onChange={(e) => setVehicleId(e.target.value)}
                    className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-sm font-medium focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none transition-all"
                  >
                    <option value="">Store / POS Sale</option>
                    {vehicles.map(v => <option key={v.id} value={v.id}>{v.vehicleNumber} ({v.vehicleName})</option>)}
                  </select>
                  <p className="text-[9px] text-gray-400 font-medium mt-1">Selecting a vehicle deducts stock from VehicleStock.</p>
                </div>

                <div className="space-y-1.5">
                  <label className="text-[10px] font-black uppercase tracking-widest text-gray-500">Agent (Optional)</label>
                  <select 
                    value={agentId}
                    onChange={(e) => setAgentId(e.target.value)}
                    className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-sm font-medium focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none transition-all"
                  >
                    <option value="">Admin (Self)</option>
                    {users.map(u => <option key={u.id} value={u.id}>{u.name} ({u.role})</option>)}
                  </select>
                </div>

                <div className="space-y-1.5">
                  <label className="text-[10px] font-black uppercase tracking-widest text-gray-500">Village / Location</label>
                  <input 
                    type="text"
                    value={villageName}
                    onChange={(e) => setVillageName(e.target.value)}
                    placeholder="e.g. Rampur"
                    className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-sm font-medium focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none transition-all"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-[10px] font-black uppercase tracking-widest text-gray-500">Sale Date</label>
                  <input 
                    type="date"
                    value={saleDate}
                    onChange={(e) => setSaleDate(e.target.value)}
                    max={new Date().toISOString().split('T')[0]}
                    className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-sm font-medium focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none transition-all"
                  />
                </div>
              </div>
            </div>

            {/* Customer Section */}
            <div className="bg-white rounded-[1.5rem] p-6 border border-gray-100 shadow-sm space-y-4">
              <h3 className="text-sm font-black uppercase tracking-widest text-gray-400 flex items-center gap-2 mb-4">
                <User size={16} /> Customer Details
              </h3>
              
              <div className="space-y-4">
                <div className="space-y-1.5">
                  <label className="text-[10px] font-black uppercase tracking-widest text-emerald-600 block">Link Registered Profile (DB Module 7)</label>
                  <select
                    value={customerId}
                    onChange={(e) => {
                      const id = e.target.value;
                      setCustomerId(id);
                      if (id) {
                        const cust = customers.find(c => c.id === id);
                        if (cust) {
                          setCustomerName(cust.name);
                          setMobile(cust.mobile);
                          if (cust.village?.name) setVillageName(cust.village.name);
                        }
                      }
                    }}
                    className="w-full bg-emerald-50/50 border border-emerald-100 rounded-xl px-4 py-3 text-xs font-bold text-emerald-900 focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none transition-all"
                  >
                    <option value="">Walk-in / Unregistered profile</option>
                    {customers.map(c => (
                      <option key={c.id} value={c.id}>
                        {c.name} ({c.mobile}) - {c.segment.replace('_', ' ')}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-black uppercase tracking-widest text-gray-500">Customer Name</label>
                    <input 
                      type="text"
                      value={customerName}
                      onChange={(e) => setCustomerName(e.target.value)}
                      placeholder="Walk-in Customer"
                      className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-sm font-medium focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none transition-all"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-black uppercase tracking-widest text-gray-500">Mobile Number</label>
                    <input 
                      type="tel"
                      value={mobile}
                      onChange={(e) => setMobile(e.target.value)}
                      placeholder="e.g. 9876543210"
                      className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-sm font-medium focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none transition-all"
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Line Items Section */}
            <div className="bg-white rounded-[1.5rem] p-6 border border-gray-100 shadow-sm space-y-4 relative z-20">
              <h3 className="text-sm font-black uppercase tracking-widest text-gray-400 flex items-center gap-2 mb-4">
                <Package size={16} /> Line Items <span className="text-rose-500">*</span>
              </h3>
              
              <div className="relative">
                <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" />
                <input 
                  type="text"
                  value={productSearch}
                  onChange={(e) => setProductSearch(e.target.value)}
                  placeholder="Search products by name or SKU to add..."
                  className="w-full bg-gray-50 border border-gray-200 rounded-xl pl-12 pr-4 py-4 text-sm font-medium focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none transition-all"
                />
                
                {productSearch && filteredProducts.length > 0 && (
                  <div className="absolute top-full left-0 right-0 mt-2 bg-white border border-gray-100 rounded-2xl shadow-xl overflow-hidden z-30">
                    {filteredProducts.map(p => (
                      <button
                        key={p.id}
                        type="button"
                        onClick={() => handleAddProduct(p)}
                        className="w-full px-5 py-4 text-left hover:bg-emerald-50 flex items-center justify-between group transition-colors border-b border-gray-50 last:border-0"
                      >
                        <div>
                          <p className="text-[15px] font-bold text-gray-900">{p.name}</p>
                          <p className="text-[11px] font-black text-gray-400 tracking-widest uppercase mt-0.5">Stock: {p.stock} | Price: ₹{p.price}</p>
                        </div>
                        <Plus size={20} className="text-emerald-500 opacity-0 group-hover:opacity-100 transition-opacity" />
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {items.length > 0 ? (
                <div className="mt-6 border border-gray-100 rounded-2xl overflow-hidden">
                  <table className="w-full text-left text-sm">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-5 py-3 text-[10px] font-black text-gray-500 uppercase tracking-widest">Product</th>
                        <th className="px-5 py-3 text-[10px] font-black text-gray-500 uppercase tracking-widest text-center w-24">Qty</th>
                        <th className="px-5 py-3 text-[10px] font-black text-gray-500 uppercase tracking-widest text-center w-32">Unit Price</th>
                        <th className="px-5 py-3 text-[10px] font-black text-gray-500 uppercase tracking-widest text-center w-24">Tax (%)</th>
                        <th className="px-5 py-3 text-[10px] font-black text-gray-500 uppercase tracking-widest text-right w-28">Tax Amt</th>
                        <th className="px-5 py-3 text-[10px] font-black text-gray-500 uppercase tracking-widest text-right w-32">Total</th>
                        <th className="px-5 py-3 text-[10px] font-black text-gray-500 uppercase tracking-widest text-center w-16"></th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {items.map((item, idx) => (
                        <tr key={idx} className="hover:bg-gray-50/50 transition-colors">
                          <td className="px-5 py-4">
                            <p className="font-bold text-gray-900">{item.product.name}</p>
                            <p className="text-[11px] text-gray-400 font-medium mt-0.5">SKU: {item.product.sku || 'N/A'}</p>
                          </td>
                          <td className="px-5 py-4 text-center">
                            <input 
                              type="number" 
                              min="1" 
                              value={item.quantity} 
                              onChange={(e) => handleUpdateItem(idx, 'quantity', e.target.value)}
                              className="w-full bg-white border border-gray-200 rounded-xl px-2 py-2 text-center text-sm font-bold focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none transition-all"
                            />
                          </td>
                          <td className="px-5 py-4 text-center">
                            <input 
                              type="number" 
                              min="0" 
                              value={item.price} 
                              onChange={(e) => handleUpdateItem(idx, 'price', e.target.value)}
                              className="w-full bg-white border border-gray-200 rounded-xl px-2 py-2 text-center text-sm font-bold focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none transition-all"
                            />
                          </td>
                          <td className="px-5 py-4 text-center">
                            <input 
                              type="number" 
                              min="0"
                              max="100"
                              value={item.tax} 
                              onChange={(e) => handleUpdateItem(idx, 'tax', e.target.value)}
                              className="w-full bg-white border border-gray-200 rounded-xl px-2 py-2 text-center text-sm font-bold focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none transition-all"
                            />
                          </td>
                          <td className="px-5 py-4 text-right text-sm font-bold text-gray-500">
                            ₹{(((parseFloat(item.price) || 0) * (parseInt(item.quantity) || 1)) * (parseFloat(item.tax) || 0) / 100).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                          </td>
                          <td className="px-5 py-4 text-right text-base font-black text-gray-900">
                            ₹{((parseFloat(item.price) || 0) * (parseInt(item.quantity) || 1)).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                          </td>
                          <td className="px-5 py-4 text-center">
                            <button 
                              type="button" 
                              onClick={() => handleRemoveItem(idx)}
                              className="p-2 text-rose-400 hover:text-white hover:bg-rose-500 rounded-xl transition-all shadow-sm"
                            >
                              <Trash2 size={16} />
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="text-center py-10 bg-gray-50 rounded-2xl border border-dashed border-gray-200 mt-4">
                  <Package size={32} className="mx-auto text-gray-300 mb-3" />
                  <p className="text-sm font-bold text-gray-400">No items added yet</p>
                </div>
              )}
              
              <div className="flex justify-end pt-6">
                <div className="bg-emerald-50 border border-emerald-100 text-emerald-700 px-8 py-4 rounded-2xl flex items-center gap-6 shadow-sm">
                  <span className="text-xs font-black uppercase tracking-widest text-emerald-600/70">Grand Total</span>
                  <span className="text-2xl font-black">₹{totalAmount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                </div>
              </div>
            </div>

            {/* Payment Section */}
            <div className="bg-white rounded-[1.5rem] p-6 border border-gray-100 shadow-sm space-y-4">
              <h3 className="text-sm font-black uppercase tracking-widest text-gray-400 flex items-center gap-2 mb-4">
                <IndianRupee size={16} /> Payment & Remarks
              </h3>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-1.5">
                  <label className="text-[10px] font-black uppercase tracking-widest text-gray-500">Payment Mode</label>
                  <select 
                    value={paymentMode}
                    onChange={(e) => setPaymentMode(e.target.value)}
                    className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-sm font-medium focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none transition-all"
                  >
                    <option value="CASH">Cash</option>
                    <option value="UPI">UPI</option>
                    <option value="CASH_UPI">Split (Cash + UPI)</option>
                  </select>
                </div>

                {paymentMode === 'CASH_UPI' && (
                  <>
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-black uppercase tracking-widest text-gray-500">Cash Amount</label>
                      <input 
                        type="number"
                        value={cashAmount}
                        onChange={(e) => setCashAmount(e.target.value)}
                        className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-sm font-medium focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none transition-all"
                        placeholder="0"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-black uppercase tracking-widest text-gray-500">UPI Amount</label>
                      <input 
                        type="number"
                        value={upiAmount}
                        onChange={(e) => setUpiAmount(e.target.value)}
                        className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-sm font-medium focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none transition-all"
                        placeholder="0"
                      />
                    </div>
                  </>
                )}

                <div className="space-y-1.5 md:col-span-2">
                  <label className="text-[10px] font-black uppercase tracking-widest text-gray-500">Remarks / Notes</label>
                  <input 
                    type="text"
                    value={remark}
                    onChange={(e) => setRemark(e.target.value)}
                    placeholder="Optional notes about this sale..."
                    className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-sm font-medium focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none transition-all"
                  />
                </div>
              </div>
            </div>

          </form>
        )}
      </div>

      {/* Footer Actions */}
      <div className="bg-gray-50/80 px-6 py-5 border-t border-gray-100 flex items-center justify-end gap-4 mt-auto">
        <button 
          onClick={onClose}
          className="px-8 py-3.5 text-sm font-black uppercase tracking-wider text-gray-500 hover:text-gray-900 bg-white border border-gray-200 hover:border-gray-300 hover:bg-gray-50 rounded-2xl transition-all shadow-sm active:scale-95"
          type="button"
        >
          Cancel
        </button>
        <button 
          type="submit"
          form="manual-sale-form"
          disabled={submitting || loading || items.length === 0}
          className="px-8 py-3.5 text-sm font-black uppercase tracking-wider text-white bg-emerald-600 hover:bg-emerald-700 rounded-2xl shadow-lg hover:shadow-emerald-600/30 transition-all flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed active:scale-95"
        >
          {submitting ? (
            <><Loader2 size={18} className="animate-spin" /> Processing...</>
          ) : (
            <><Save size={18} /> Confirm Manual Sale</>
          )}
        </button>
      </div>
    </div>
  );
}
