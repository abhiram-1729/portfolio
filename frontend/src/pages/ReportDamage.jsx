import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  AlertTriangle, Camera, Package, ChevronDown, Send, X, Image as ImageIcon,
  MapPin, CheckCircle, Clock, Eye, Trash2, ChevronRight, ArrowLeft, Plus,
  Hammer, Droplets, HelpCircle, Coins
} from 'lucide-react';
import toast from 'react-hot-toast';
import { damageAPI } from '../services/damageService';
import { productsAPI } from '../services/api';
import { useUserStore } from '../store/userStore';

const DAMAGE_TYPES = [
  { value: 'DAMAGED', label: 'Damaged', icon: Hammer, color: 'text-red-600', bg: 'bg-red-50', border: 'border-red-200' },
  { value: 'EXPIRED', label: 'Expired', icon: Clock, color: 'text-amber-600', bg: 'bg-amber-50', border: 'border-amber-200' },
  { value: 'LEAKAGE', label: 'Leakage', icon: Droplets, color: 'text-blue-600', bg: 'bg-blue-50', border: 'border-blue-200' },
  { value: 'LOST', label: 'Lost', icon: HelpCircle, color: 'text-purple-600', bg: 'bg-purple-50', border: 'border-purple-200' }
];

const RESPONSIBILITY_OPTIONS = [
  { value: 'SELF', label: 'Self', desc: 'I am responsible' },
  { value: 'SYSTEM', label: 'System', desc: 'Transport issue' },
  { value: 'UNKNOWN', label: 'Unknown', desc: 'Not sure' }
];

const STATUS_STYLES = {
  PENDING: { bg: 'bg-amber-50', text: 'text-amber-600', border: 'border-amber-200', dot: 'bg-amber-400' },
  APPROVED: { bg: 'bg-emerald-50', text: 'text-emerald-600', border: 'border-emerald-200', dot: 'bg-emerald-400' },
  REJECTED: { bg: 'bg-red-50', text: 'text-red-600', border: 'border-red-200', dot: 'bg-red-400' },
  UNDER_REVIEW: { bg: 'bg-indigo-50', text: 'text-indigo-600', border: 'border-indigo-200', dot: 'bg-indigo-400' }
};

export default function ReportDamage() {
  const user = useUserStore(s => s.user);
  const fileInputRef = useRef(null);
  const dropdownRef = useRef(null);
  
  const [view, setView] = useState('list'); // list | form
  const [myReports, setMyReports] = useState([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  
  // Form state
  const [products, setProducts] = useState([]);
  const [selectedProduct, setSelectedProduct] = useState('');
  const [quantity, setQuantity] = useState('');
  const [damageType, setDamageType] = useState('');
  const [selfResponsibility, setSelfResponsibility] = useState('UNKNOWN');
  const [reason, setReason] = useState('');
  const [images, setImages] = useState([]);
  const [imagePreviews, setImagePreviews] = useState([]);
  const [productSearch, setProductSearch] = useState('');
  const [showProductDropdown, setShowProductDropdown] = useState(false);

  // Close dropdown on outside click (important for mobile)
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setShowProductDropdown(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('touchstart', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('touchstart', handleClickOutside);
    };
  }, []);

  const fetchMyReports = useCallback(async () => {
    try {
      setLoading(true);
      const { data } = await damageAPI.getMyDamageReports();
      setMyReports(data);
    } catch {
      toast.error('Failed to load reports');
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchProducts = useCallback(async () => {
    try {
      if (user?.assignedVehicleId) {
        const { data } = await productsAPI.getVehicleInventory(user.assignedVehicleId);
        // Vehicle inventory returns array of stock items
        const productList = (data || []).map(s => ({
          id: s.productId || s.product?.id || s.id,
          name: s.product?.name || s.name,
          image: s.product?.image || s.image,
          stock: s.quantity || 0,
          purchasePrice: s.product?.purchasePrice || s.purchasePrice || 0,
          price: s.product?.price || s.price || 0
        })).filter(p => p.id && p.name);
        setProducts(productList);
      }
    } catch (err) {
      console.error('Failed to load products:', err);
    }
  }, [user?.assignedVehicleId]);

  useEffect(() => {
    fetchMyReports();
    fetchProducts();
  }, [fetchMyReports, fetchProducts]);

  const filteredProducts = products.filter(p =>
    p.stock > 0 && p.name?.toLowerCase().includes(productSearch.toLowerCase())
  );

  const selectedProductData = products.find(p => p.id === selectedProduct);

  const handleImageAdd = (e) => {
    const files = Array.from(e.target.files);
    if (images.length + files.length > 5) {
      toast.error('Maximum 5 images allowed');
      return;
    }
    const newImages = [...images, ...files];
    setImages(newImages);

    // Preview
    const newPreviews = [...imagePreviews];
    files.forEach(file => {
      const reader = new FileReader();
      reader.onload = (ev) => {
        newPreviews.push(ev.target.result);
        setImagePreviews([...newPreviews]);
      };
      reader.readAsDataURL(file);
    });
    // Reset file input so same file can be re-selected
    e.target.value = '';
  };

  const removeImage = (index) => {
    setImages(images.filter((_, i) => i !== index));
    setImagePreviews(imagePreviews.filter((_, i) => i !== index));
  };

  const resetForm = () => {
    setSelectedProduct('');
    setQuantity('');
    setDamageType('');
    setSelfResponsibility('UNKNOWN');
    setReason('');
    setImages([]);
    setImagePreviews([]);
    setProductSearch('');
  };

  const handleSubmit = async () => {
    // Validation
    if (!selectedProduct) return toast.error('Select a product');
    if (!quantity || parseInt(quantity) <= 0) return toast.error('Enter valid quantity');
    if (!damageType) return toast.error('Select damage type');
    if (!reason.trim()) return toast.error('Reason is mandatory');
    if (images.length === 0) return toast.error('At least one photo is required');

    // Check stock
    // Proceed even if stock is 0, as there might be inventory discrepancies
    if (selectedProductData && parseInt(quantity) > selectedProductData.stock) {
      // Just a console warning or silent allowance
    }

    try {
      setSubmitting(true);
      const formData = new FormData();
      formData.append('productId', selectedProduct);
      formData.append('quantity', quantity);
      formData.append('damageType', damageType);
      formData.append('selfResponsibility', selfResponsibility);
      formData.append('reason', reason);
      if (user?.assignedVehicleId) formData.append('vehicleId', user.assignedVehicleId);

      // Geo location
      if (navigator.geolocation) {
        try {
          const pos = await new Promise((resolve, reject) => {
            navigator.geolocation.getCurrentPosition(resolve, reject, { timeout: 5000 });
          });
          formData.append('geoLatitude', pos.coords.latitude);
          formData.append('geoLongitude', pos.coords.longitude);
        } catch { /* geo optional */ }
      }

      images.forEach(file => formData.append('images', file));

      await damageAPI.reportDamage(formData);
      toast.success('Damage reported successfully!');
      resetForm();
      setView('list');
      fetchMyReports();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to submit damage report');
    } finally {
      setSubmitting(false);
    }
  };

  // ───────── LIST VIEW ─────────
  const renderList = () => (
    <div className="max-w-lg mx-auto pb-24">
      {/* Sticky Header - Offset by app header height */}
      <div className="sticky top-[3.5rem] z-30 bg-gray-50/95 backdrop-blur-md px-4 pt-4 pb-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-10 h-10 shrink-0 rounded-xl bg-red-50 flex items-center justify-center">
              <AlertTriangle size={18} className="text-red-600" strokeWidth={2.5} />
            </div>
            <div className="min-w-0">
              <h1 className="text-base sm:text-lg font-black text-slate-900 leading-tight truncate">Damage Reports</h1>
              <p className="text-[9px] sm:text-[10px] text-slate-400 font-bold uppercase tracking-wider">Track inventory damage</p>
            </div>
          </div>
          <button
            onClick={() => setView('form')}
            className="shrink-0 px-3 sm:px-4 py-2 sm:py-2.5 rounded-xl bg-red-600 text-white text-[10px] sm:text-xs font-black uppercase tracking-wider shadow-lg shadow-red-200 hover:bg-red-700 active:scale-95 transition-all flex items-center gap-1.5"
          >
            <Plus size={14} strokeWidth={3} />
            Report
          </button>
        </div>
      </div>

      <div className="px-4">

      {/* Summary bar */}
      {myReports.length > 0 && (
        <div className="flex gap-2 mb-3 overflow-x-auto pb-1">
          {[
            { label: 'Total', val: myReports.length, color: 'text-slate-600', bg: 'bg-slate-50', border: 'border-slate-200' },
            { label: 'Pending', val: myReports.filter(r => r.status === 'PENDING').length, color: 'text-amber-600', bg: 'bg-amber-50', border: 'border-amber-200' },
            { label: 'Approved', val: myReports.filter(r => r.status === 'APPROVED').length, color: 'text-emerald-600', bg: 'bg-emerald-50', border: 'border-emerald-200' },
          ].map((s, i) => (
            <div key={i} className={`shrink-0 ${s.bg} border ${s.border} rounded-xl px-3 py-2 flex items-center gap-2`}>
              <span className={`text-base font-black ${s.color}`}>{s.val}</span>
              <span className="text-[9px] font-bold text-gray-400 uppercase tracking-wider">{s.label}</span>
            </div>
          ))}
        </div>
      )}

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <div className="animate-spin rounded-full h-8 w-8 border-2 border-emerald-500 border-t-transparent" />
        </div>
      ) : myReports.length === 0 ? (
        <div className="bg-white rounded-2xl border border-slate-100 p-8 sm:p-10 text-center shadow-sm mt-4">
          <div className="w-16 h-16 rounded-2xl bg-red-50 flex items-center justify-center mx-auto mb-4">
            <AlertTriangle size={28} className="text-red-300" />
          </div>
          <p className="text-slate-500 font-bold text-sm">No damage reports yet</p>
          <p className="text-[11px] text-slate-300 mt-1 mb-4">Report damaged inventory to keep track</p>
          <button
            onClick={() => setView('form')}
            className="px-5 py-2.5 rounded-xl bg-red-600 text-white text-xs font-black uppercase tracking-wider shadow-lg shadow-red-200 hover:bg-red-700 active:scale-95 transition-all inline-flex items-center gap-2"
          >
            <Plus size={14} strokeWidth={3} />
            Report Damage
          </button>
        </div>
      ) : (
        <div className="space-y-2.5 sm:space-y-3">
          {myReports.map(report => {
            const s = STATUS_STYLES[report.status] || STATUS_STYLES.PENDING;
            const dmgType = DAMAGE_TYPES.find(d => d.value === report.damageType);
            return (
              <div key={report.id} className="bg-white rounded-2xl border border-slate-100 p-3 sm:p-4 shadow-sm active:bg-slate-50 transition-colors">
                {/* Top Row — Product + Status */}
                <div className="flex items-start gap-2.5 sm:gap-3">
                  {/* Product Image */}
                  <div className="shrink-0">
                    {report.product?.image ? (
                      <img src={report.product.image} alt="" className="w-10 h-10 sm:w-11 sm:h-11 rounded-xl object-cover border border-gray-100" />
                    ) : (
                      <div className="w-10 h-10 sm:w-11 sm:h-11 rounded-xl bg-gray-100 flex items-center justify-center">
                        <Package size={16} className="text-gray-400" />
                      </div>
                    )}
                  </div>

                  {/* Product Info */}
                  <div className="flex-1 min-w-0">
                    <p className="text-[13px] sm:text-sm font-bold text-slate-900 truncate leading-tight">{report.product?.name}</p>
                    <p className="text-[10px] text-slate-400 truncate mt-0.5">
                      {report.displayId} · {new Date(report.createdAt).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' })}
                    </p>
                  </div>

                  {/* Status Badge */}
                  <span className={`shrink-0 inline-flex items-center gap-1 px-2 py-0.5 rounded-lg text-[8px] sm:text-[9px] font-black uppercase tracking-wider ${s.bg} ${s.text} border ${s.border}`}>
                    <span className={`w-1.5 h-1.5 rounded-full ${s.dot}`} />
                    {report.status?.replace('_', ' ')}
                  </span>
                </div>

                {/* Bottom Row — Type, Qty, Loss */}
                <div className="flex items-center gap-2 mt-2.5 pt-2 border-t border-slate-50">
                  <span className={`shrink-0 flex items-center gap-1.5 px-2 py-0.5 rounded-md text-[10px] font-bold ${dmgType?.bg || 'bg-gray-100'} ${dmgType?.color || ''}`}>
                    {dmgType && <dmgType.icon size={12} />} {report.damageType}
                  </span>
                  <span className="text-[11px] font-bold text-slate-600">Qty: {report.quantity}</span>
                  <span className="ml-auto text-[12px] font-black text-red-600">₹{(report.totalLoss || 0).toFixed(0)}</span>
                </div>

                {/* Deduction row */}
                {report.deduction && (
                  <div className="mt-2 pt-2 border-t border-slate-100 flex items-center justify-between">
                    <span className="text-[10px] text-orange-600 font-bold flex items-center gap-1"><Coins size={10} /> Deduction: ₹{report.deduction.deductionAmount?.toFixed(0)}</span>
                    <span className={`text-[9px] font-black uppercase ${report.deduction.status === 'APPLIED' ? 'text-emerald-500' : 'text-amber-500'}`}>{report.deduction.status}</span>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  </div>
);

  // ───────── FORM VIEW ─────────
  const renderForm = () => (
    <div className="max-w-lg mx-auto">
      {/* Sticky Header with back button - Offset by app header height */}
      <div className="sticky top-[3.5rem] z-30 bg-gray-50/95 backdrop-blur-md -mx-4 px-4 pt-4 pb-4 mb-2">
        <div className="flex items-center gap-2.5">
          <button
            onClick={() => { setView('list'); resetForm(); }}
            className="shrink-0 w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-white border border-slate-200 flex items-center justify-center hover:bg-slate-50 active:scale-95 transition-all shadow-sm"
          >
            <ArrowLeft size={18} className="text-slate-600" />
          </button>
          <div className="min-w-0">
            <h1 className="text-base sm:text-lg font-black text-slate-900 leading-tight">Report Damage</h1>
            <p className="text-[9px] sm:text-[10px] text-slate-400 font-bold uppercase tracking-wider">Submit inventory damage</p>
          </div>
        </div>
      </div>

      <div className="px-4 space-y-4 pb-28">
        {/* Location (Auto) */}
        <div className="bg-blue-50 rounded-xl p-3 flex items-center gap-3 border border-blue-100">
          <div className="w-9 h-9 shrink-0 rounded-lg bg-blue-100 flex items-center justify-center">
            <MapPin size={16} className="text-blue-600" />
          </div>
          <div className="min-w-0">
            <p className="text-[9px] font-black text-blue-400 uppercase tracking-wider">Location (Auto-detected)</p>
            <p className="text-sm font-bold text-blue-700 truncate">
              {user?.assignedVehicleId ? 'Substore (Vehicle)' : 'Store Level'}
            </p>
          </div>
        </div>

        {/* Product Selection */}
        <div ref={dropdownRef}>
          <p className="text-[9px] font-black text-slate-400 uppercase tracking-wider mb-2">Item Selection *</p>
          <div className="relative">
            <input
              type="text"
              placeholder="Search product..."
              value={selectedProductData ? selectedProductData.name : productSearch}
              onChange={(e) => {
                setProductSearch(e.target.value);
                setSelectedProduct('');
                setShowProductDropdown(true);
              }}
              onFocus={() => setShowProductDropdown(true)}
              className="w-full px-3 py-3 rounded-xl border border-slate-200 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition-all"
            />
            {selectedProduct && (
              <button
                onClick={() => { setSelectedProduct(''); setProductSearch(''); }}
                className="absolute right-3 top-1/2 -translate-y-1/2 w-7 h-7 rounded-lg bg-slate-100 flex items-center justify-center text-slate-500 hover:bg-slate-200 active:scale-90 transition-all"
              >
                <X size={14} />
              </button>
            )}
            {showProductDropdown && !selectedProduct && filteredProducts.length > 0 && (
              <div className="absolute z-20 left-0 right-0 mt-1 bg-white border border-slate-200 rounded-xl shadow-xl max-h-56 sm:max-h-64 overflow-y-auto overscroll-contain">
                {filteredProducts.slice(0, 20).map(p => (
                  <button
                    key={p.id}
                    onClick={() => {
                      setSelectedProduct(p.id);
                      setProductSearch('');
                      setShowProductDropdown(false);
                    }}
                    className="w-full px-3 py-3 text-left hover:bg-emerald-50 active:bg-emerald-100 flex items-center gap-2.5 border-b border-slate-50 last:border-0 transition-colors"
                  >
                    {p.image ? (
                      <img src={p.image} className="w-8 h-8 rounded-lg object-cover border border-slate-100 shrink-0" alt="" />
                    ) : (
                      <div className="w-8 h-8 rounded-lg bg-slate-100 flex items-center justify-center shrink-0"><Package size={14} className="text-slate-400" /></div>
                    )}
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-medium text-slate-800 truncate">{p.name}</p>
                      <p className="text-[10px] text-slate-400">Stock: <span className="font-bold text-emerald-600">{p.stock}</span></p>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Selected product info card */}
          {selectedProductData && (
            <div className="mt-2 flex items-center gap-2 p-2.5 bg-emerald-50 rounded-xl border border-emerald-100">
              {selectedProductData.image ? (
                <img src={selectedProductData.image} className="w-8 h-8 rounded-lg object-cover border border-emerald-100 shrink-0" alt="" />
              ) : (
                <div className="w-8 h-8 shrink-0 rounded-lg bg-emerald-100 flex items-center justify-center"><Package size={14} className="text-emerald-500" /></div>
              )}
              <div className="flex-1 min-w-0">
                <p className="text-xs font-bold text-emerald-800 truncate">{selectedProductData.name}</p>
                <p className="text-[10px] text-emerald-500">Available: <span className="font-black">{selectedProductData.stock}</span></p>
              </div>
              <button
                onClick={() => { setSelectedProduct(''); setProductSearch(''); }}
                className="shrink-0 w-6 h-6 rounded-md bg-emerald-100 flex items-center justify-center text-emerald-600 hover:bg-emerald-200 active:scale-90 transition-all"
              >
                <X size={12} />
              </button>
            </div>
          )}
        </div>

        {/* Quantity */}
        <div>
          <p className="text-[9px] font-black text-slate-400 uppercase tracking-wider mb-2">Quantity *</p>
          <input
            type="number"
            inputMode="numeric"
            pattern="[0-9]*"
            min="1"
            max={selectedProductData?.stock || 9999}
            value={quantity}
            onChange={(e) => setQuantity(e.target.value)}
            placeholder="Enter quantity"
            className="w-full px-3 py-3 rounded-xl border border-slate-200 bg-white text-sm font-bold focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition-all"
          />
        </div>

        {/* Damage Type — 2×2 grid on small screens, 4 on larger */}
        <div>
          <p className="text-[9px] font-black text-slate-400 uppercase tracking-wider mb-2">Damage Type *</p>
          <div className="grid grid-cols-2 gap-2">
            {DAMAGE_TYPES.map(t => (
              <button
                key={t.value}
                onClick={() => setDamageType(t.value)}
                className={`flex items-center gap-2.5 px-3 py-3 rounded-xl border-2 transition-all active:scale-95 ${damageType === t.value ? `${t.border} ${t.bg} shadow-sm` : 'border-slate-200 hover:border-slate-300 bg-white'}`}
              >
                <t.icon size={18} className={damageType === t.value ? t.color : 'text-slate-400'} />
                <span className={`text-[10px] font-black uppercase tracking-wide ${damageType === t.value ? t.color : 'text-slate-400'}`}>{t.label}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Responsibility */}
        <div>
          <p className="text-[9px] font-black text-slate-400 uppercase tracking-wider mb-2">Responsibility</p>
          <div className="grid grid-cols-3 gap-2">
            {RESPONSIBILITY_OPTIONS.map(r => (
              <button
                key={r.value}
                onClick={() => setSelfResponsibility(r.value)}
                className={`py-3 px-2 rounded-xl border-2 text-center transition-all active:scale-95 ${selfResponsibility === r.value ? 'border-emerald-500 bg-emerald-50 shadow-sm' : 'border-slate-200 hover:border-slate-300 bg-white'}`}
              >
                <p className="text-[11px] font-black text-slate-800">{r.label}</p>
                <p className="text-[8px] text-slate-400 mt-0.5 leading-tight">{r.desc}</p>
              </button>
            ))}
          </div>
        </div>

        {/* Reason */}
        <div>
          <p className="text-[9px] font-black text-slate-400 uppercase tracking-wider mb-2">Reason *</p>
          <textarea
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="Describe what happened..."
            rows={4}
            className="w-full px-3 sm:px-4 py-3 rounded-xl border border-slate-200 bg-white text-sm resize-none focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition-all"
          />
        </div>

        {/* Image Upload */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-1.5 align-middle">
              <ImageIcon size={12} className="text-slate-300" /> Photos *
            </p>
            <span className="text-[10px] font-bold text-slate-300">{images.length}/5</span>
          </div>

          {imagePreviews.length > 0 && (
            <div className="grid grid-cols-3 gap-2 mb-2.5">
              {imagePreviews.map((preview, i) => (
                <div key={i} className="relative aspect-square">
                  <img src={preview} alt={`Preview ${i + 1}`} className="w-full h-full rounded-xl object-cover border-2 border-slate-100" />
                  <button
                    onClick={(e) => { e.stopPropagation(); removeImage(i); }}
                    className="absolute -top-1.5 -right-1.5 w-6 h-6 rounded-full bg-red-500 text-white flex items-center justify-center shadow-md shadow-red-200 active:scale-90 transition-all"
                  >
                    <X size={12} strokeWidth={3} />
                  </button>
                </div>
              ))}
            </div>
          )}

          {images.length < 5 && (
            <button
              onClick={() => fileInputRef.current?.click()}
              className="w-full py-4 rounded-xl border-2 border-dashed border-slate-200 bg-slate-50/80 flex flex-col items-center gap-1.5 hover:bg-slate-100 active:bg-slate-200 active:scale-[0.99] transition-all"
            >
              <div className="w-10 h-10 rounded-xl bg-white border border-slate-200 flex items-center justify-center shadow-sm">
                <Camera size={20} className="text-slate-400" />
              </div>
              <span className="text-[11px] font-bold text-slate-400">Tap to add photo</span>
            </button>
          )}

          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            capture="environment"
            multiple
            onChange={handleImageAdd}
            className="hidden"
          />
        </div>

        {/* Loss Preview */}
        {selectedProductData && quantity && parseInt(quantity) > 0 && (
          <div className="bg-red-50 rounded-xl p-3.5 border border-red-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-[9px] font-black text-red-400 uppercase tracking-wider">Estimated Loss</p>
                <p className="text-xl font-black text-red-600 mt-0.5">
                  ₹{((selectedProductData.purchasePrice || selectedProductData.price || 0) * parseInt(quantity)).toFixed(2)}
                </p>
              </div>
              <div className="text-right">
                <p className="text-[10px] text-red-400">
                  {quantity} × ₹{(selectedProductData.purchasePrice || selectedProductData.price || 0).toFixed(2)}
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Sticky Submit Button */}
        <div className="sticky bottom-0 left-0 right-0 z-30 bg-gray-50/95 backdrop-blur-md pt-4 pb-6 -mx-4 px-4 mt-6">
          <button
            onClick={handleSubmit}
            disabled={submitting}
            className="w-full py-4 rounded-2xl bg-red-600 text-white font-black text-xs uppercase tracking-wider shadow-lg shadow-red-200 hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed active:scale-[0.98] transition-all flex items-center justify-center gap-2"
          >
            {submitting ? (
              <div className="animate-spin rounded-full h-5 w-5 border-2 border-white border-t-transparent" />
            ) : (
              <>
                <Send size={16} strokeWidth={2.5} />
                Submit Damage Report
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );

  return view === 'form' ? renderForm() : renderList();
}
