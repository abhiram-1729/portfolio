import React, { useState, useEffect } from 'react';
import { 
  Plus, 
  Trash2, 
  Camera, 
  MapPin, 
  Package, 
  IndianRupee,
  Loader2,
  CheckCircle2,
  AlertTriangle
} from 'lucide-react';
import toast from 'react-hot-toast';
import api from '../services/api';

export default function RefillStock() {
  const [loading, setLoading] = useState(false);
  const [products, setProducts] = useState([]);
  const [amount, setAmount] = useState('');
  const [items, setItems] = useState([{ productId: '', quantity: '' }]);
  const [photo, setPhoto] = useState(null);

  useEffect(() => {
    fetchProducts();
  }, []);

  const fetchProducts = async () => {
    try {
      const { data } = await api.get('/products');
      setProducts(data);
    } catch (err) {
      toast.error('Failed to load products');
    }
  };

  const addItem = () => setItems([...items, { productId: '', quantity: '' }]);
  const removeItem = (index) => setItems(items.filter((_, i) => i !== index));
  const updateItem = (index, field, value) => {
    const newItems = [...items];
    newItems[index][field] = value;
    setItems(newItems);
  };

  const getGPSLocation = () => {
    return new Promise((resolve, reject) => {
      navigator.geolocation.getCurrentPosition(
        (pos) => resolve(pos.coords),
        (err) => reject(err),
        { enableHighAccuracy: true }
      );
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (items.some(i => !i.productId || !i.quantity)) {
      toast.error('Please fill all item details');
      return;
    }

    setLoading(true);
    try {
      const coords = await getGPSLocation();
      
      const payload = {
        amount: parseFloat(amount),
        photo: "mock_base64_photo", // In real app, capture from camera
        lat: coords.latitude,
        lon: coords.longitude,
        accuracy: coords.accuracy,
        items: items
      };

      await api.post('/refills/log', payload);
      toast.success('Refill Stock Logged ✅');
      setAmount('');
      setItems([{ productId: '', quantity: '' }]);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to log refill');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 pt-6 pb-24 px-5">
      <div className="max-w-lg mx-auto space-y-6">
        <div>
          <h1 className="text-2xl font-black text-gray-900 tracking-tight">Refill Stock</h1>
          <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Hub Loading Presence</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Amount & Photo Card */}
          <div className="bg-white rounded-[2.5rem] p-6 border border-gray-100 shadow-sm space-y-5">
            <div className="space-y-2">
              <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Total Refill Amount (INR)</label>
              <div className="relative">
                <IndianRupee className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                <input 
                  type="number"
                  placeholder="Enter Amount"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  className="w-full bg-gray-50 border-none rounded-2xl py-4 pl-12 pr-4 font-black text-gray-900 focus:ring-2 focus:ring-emerald-500 transition-all"
                  required
                />
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Vehicle Photo</label>
              <button 
                type="button"
                className="w-full aspect-video bg-gray-50 rounded-2xl border-2 border-dashed border-gray-200 flex flex-col items-center justify-center gap-2 text-gray-400 hover:text-emerald-600 hover:border-emerald-200 transition-all"
              >
                <Camera size={32} strokeWidth={1.5} />
                <span className="text-xs font-bold uppercase tracking-wider">Snap Vehicle Photo</span>
              </button>
            </div>
          </div>

          {/* Items Card */}
          <div className="bg-white rounded-[2.5rem] p-6 border border-gray-100 shadow-sm space-y-4">
            <div className="flex items-center justify-between mb-2">
               <h3 className="text-xs font-black text-gray-900 uppercase tracking-widest">Stock Items</h3>
               <button 
                type="button"
                onClick={addItem}
                className="p-2 rounded-xl bg-emerald-50 text-emerald-600 hover:bg-emerald-100 transition-all"
               >
                <Plus size={18} strokeWidth={3} />
               </button>
            </div>

            <div className="space-y-3">
              {items.map((item, index) => (
                <div key={index} className="flex gap-2 items-start bg-gray-50 p-3 rounded-2xl border border-gray-100">
                  <div className="flex-1 space-y-2">
                    <select 
                      value={item.productId}
                      onChange={(e) => updateItem(index, 'productId', e.target.value)}
                      className="w-full bg-white border-none rounded-xl text-xs font-bold text-gray-800 p-3 focus:ring-1 focus:ring-emerald-500"
                    >
                      <option value="">Select Product</option>
                      {products?.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                    </select>
                    <input 
                      type="number"
                      placeholder="Qty"
                      value={item.quantity}
                      onChange={(e) => updateItem(index, 'quantity', e.target.value)}
                      className="w-full bg-white border-none rounded-xl text-xs font-bold text-gray-800 p-3 focus:ring-1 focus:ring-emerald-500"
                    />
                  </div>
                  {items.length > 1 && (
                    <button 
                      type="button"
                      onClick={() => removeItem(index)}
                      className="p-3 text-rose-400 hover:text-rose-600 transition-all"
                    >
                      <Trash2 size={18} />
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Submit Button */}
          <button 
            type="submit"
            disabled={loading}
            className="w-full bg-gray-900 text-white py-5 rounded-2xl font-black text-sm uppercase tracking-widest shadow-lg shadow-gray-900/20 active:scale-95 transition-all flex items-center justify-center gap-3 disabled:opacity-50"
          >
            {loading ? <Loader2 className="animate-spin" /> : <Package size={20} />}
            Submit Refill Log
          </button>
        </form>

        <div className="bg-amber-50 rounded-2xl p-4 border border-amber-100 flex gap-3">
            <AlertTriangle className="text-amber-500 shrink-0" size={20} />
            <p className="text-[10px] text-amber-900 font-bold leading-relaxed">
              <span className="uppercase">Mandatory:</span> Refill logging is only allowed within the Store/HUB premises. GPS validation will be performed upon submission.
            </p>
        </div>
      </div>
    </div>
  );
}
