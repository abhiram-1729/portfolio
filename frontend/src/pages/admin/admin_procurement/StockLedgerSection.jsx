import React, { useState, useEffect } from 'react';
import { 
  Search, Loader2, Eye, ArrowLeft, Download, BookOpen
} from 'lucide-react';
import { procurementAPI } from '../../../services/procurementService';
import toast from 'react-hot-toast';
import { format } from 'date-fns';

const StockLedgerSection = ({ setHeaderExtra, setHideMainHeader, storeId }) => {
  const [vendors, setVendors] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL'); // 'ALL' or 'ACTIVE'
  const [selectedVendorId, setSelectedVendorId] = useState(null);
  const [detailData, setDetailData] = useState(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [detailError, setDetailError] = useState(null);
  const [detailTab, setDetailTab] = useState('movements'); // 'movements' or 'products'

  // Detailed View Filter/Search States
  const [detailSearchQuery, setDetailSearchQuery] = useState('');
  const [detailFilter, setDetailFilter] = useState('ALL'); // 'ALL', 'IN_STOCK', 'LOW_STOCK', 'NEAR_EXPIRY', 'EXPIRED'

  // Hide the default main header from parent component
  useEffect(() => {
    if (setHideMainHeader) setHideMainHeader(true);
    return () => {
      if (setHideMainHeader) setHideMainHeader(false);
    };
  }, [setHideMainHeader]);

  // Load summary on mount / storeId change
  useEffect(() => {
    const loadSummary = async () => {
      try {
        setLoading(true);
        const { data } = await procurementAPI.getStockLedger({ groupBy: 'vendor', storeId });
        setVendors(data);
      } catch (err) {
        toast.error('Failed to load vendor stock summary');
      } finally {
        setLoading(false);
      }
    };
    if (!selectedVendorId) {
      loadSummary();
    }
  }, [storeId, selectedVendorId]);

  // Load details when a vendor is selected
  useEffect(() => {
    if (selectedVendorId) {
      const loadDetails = async () => {
        try {
          setDetailLoading(true);
          setDetailError(null);
          const { data } = await procurementAPI.getStockLedger({ vendorId: selectedVendorId, storeId });
          setDetailData(data);
          // Reset detailed search/filters when loading new vendor
          setDetailSearchQuery('');
          setDetailFilter('ALL');
        } catch (err) {
          setDetailError('Failed to load vendor details');
          toast.error('Failed to load vendor details');
        } finally {
          setDetailLoading(false);
        }
      };
      loadDetails();
    }
  }, [selectedVendorId, storeId]);

  // Filter vendors
  const filteredVendors = vendors.filter(v => {
    const matchesSearch = !searchQuery || 
      v.vendorName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      v.mobile?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      v.gstNumber?.toLowerCase().includes(searchQuery.toLowerCase());
    
    const matchesStatus = statusFilter === 'ALL' || v.status === 'ACTIVE';
    
    return matchesSearch && matchesStatus;
  });

  // Filter detailed movements
  const filteredMovements = (detailData?.movements || []).filter(m => {
    const matchesSearch = !detailSearchQuery || 
      m.product?.name?.toLowerCase().includes(detailSearchQuery.toLowerCase()) ||
      m.skuCode?.toLowerCase().includes(detailSearchQuery.toLowerCase()) ||
      m.category?.toLowerCase().includes(detailSearchQuery.toLowerCase());
      
    let matchesFilter = true;
    if (detailFilter === 'IN_STOCK') {
      matchesFilter = m.balanceAfter > 0;
    } else if (detailFilter === 'LOW_STOCK') {
      matchesFilter = m.balanceAfter > 0 && m.balanceAfter <= 10;
    } else if (detailFilter === 'NEAR_EXPIRY') {
      matchesFilter = (m.expiryStatus || '').toLowerCase().includes('near');
    } else if (detailFilter === 'EXPIRED') {
      matchesFilter = (m.expiryStatus || '').toLowerCase().includes('expired');
    }
    
    return matchesSearch && matchesFilter;
  });

  // Filter detailed products
  const filteredProducts = (detailData?.products || []).filter(p => {
    const matchesSearch = !detailSearchQuery || 
      p.name?.toLowerCase().includes(detailSearchQuery.toLowerCase()) ||
      p.skuCode?.toLowerCase().includes(detailSearchQuery.toLowerCase()) ||
      p.category?.toLowerCase().includes(detailSearchQuery.toLowerCase());
      
    let matchesFilter = true;
    if (detailFilter === 'IN_STOCK') {
      matchesFilter = p.stock > 0;
    } else if (detailFilter === 'LOW_STOCK') {
      matchesFilter = p.stock > 0 && p.stock <= 10;
    } else if (detailFilter === 'NEAR_EXPIRY') {
      // Products don't have explicit expiry in this tab
      matchesFilter = true;
    } else if (detailFilter === 'EXPIRED') {
      matchesFilter = true;
    }
    
    return matchesSearch && matchesFilter;
  });

  const handleExport = () => {
    if (filteredVendors.length === 0) return;
    const headers = ['Vendor', 'Mobile', 'GSTIN', 'Total Stock Qty', 'Inventory Value', 'Last Purchase'];
    const rows = filteredVendors.map(v => [
      v.vendorName,
      v.mobile || '—',
      v.gstNumber || '—',
      v.totalStockQty,
      `Rs. ${v.inventoryValue}`,
      v.lastPurchase ? format(new Date(v.lastPurchase), 'dd MMM yyyy') : '—'
    ]);
    const csvContent = "data:text/csv;charset=utf-8," 
      + [headers.join(','), ...rows.map(e => e.map(val => `"${val}"`).join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `stock_ledger_summary_${format(new Date(), 'yyyy-MM-dd')}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleExportDetail = () => {
    if (detailTab === 'movements') {
      if (filteredMovements.length === 0) return;
      const headers = ['Product', 'SKU', 'Type', 'Qty', 'Balance', 'Expiry Status', 'Inventory Value', 'Last Updated'];
      const rows = filteredMovements.map(m => [
        m.product?.name,
        m.skuCode || '—',
        m.type,
        m.quantity >= 0 ? `+${m.quantity}` : m.quantity,
        m.balanceAfter,
        m.expiryStatus || 'Safe',
        `Rs. ${m.inventoryValue}`,
        format(new Date(m.createdAt), 'dd MMM yyyy, hh:mm a')
      ]);
      const csvContent = "data:text/csv;charset=utf-8," 
        + [headers.join(','), ...rows.map(e => e.map(val => `"${val}"`).join(','))].join('\n');
      const encodedUri = encodeURI(csvContent);
      const link = document.createElement("a");
      link.setAttribute("href", encodedUri);
      link.setAttribute("download", `${detailData?.vendor?.vendorName}_movements_${format(new Date(), 'yyyy-MM-dd')}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } else {
      if (filteredProducts.length === 0) return;
      const headers = ['Product', 'SKU Code', 'Category', 'Stock', 'Purchase Rate', 'Total Value'];
      const rows = filteredProducts.map(p => [
        p.name,
        p.skuCode || '—',
        p.category,
        p.stock,
        `Rs. ${p.purchasePrice}`,
        `Rs. ${p.totalValue}`
      ]);
      const csvContent = "data:text/csv;charset=utf-8," 
        + [headers.join(','), ...rows.map(e => e.map(val => `"${val}"`).join(','))].join('\n');
      const encodedUri = encodeURI(csvContent);
      const link = document.createElement("a");
      link.setAttribute("href", encodedUri);
      link.setAttribute("download", `${detailData?.vendor?.vendorName}_products_${format(new Date(), 'yyyy-MM-dd')}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }
  };

  const getExpiryStatusBadge = (status) => {
    const s = (status || 'Safe').toLowerCase();
    if (s.includes('near')) {
      return <span className="px-3 py-1 bg-amber-50 text-amber-600 rounded-full text-[10px] font-black uppercase tracking-wider">Near Expiry</span>;
    }
    if (s.includes('expired')) {
      return <span className="px-3 py-1 bg-red-50 text-red-600 rounded-full text-[10px] font-black uppercase tracking-wider">Expired</span>;
    }
    return <span className="px-3 py-1 bg-emerald-50 text-emerald-600 rounded-full text-[10px] font-black uppercase tracking-wider">Safe</span>;
  };

  const getTypeBadge = (type) => {
    const t = type || '';
    if (t === 'PURCHASE') {
      return <span className="px-3 py-1 bg-emerald-50 text-emerald-600 rounded-full text-[10px] font-black uppercase tracking-wider">Purchase</span>;
    }
    if (t === 'SALE') {
      return <span className="px-3 py-1 bg-blue-50 text-blue-600 rounded-full text-[10px] font-black uppercase tracking-wider">Sale</span>;
    }
    if (t.startsWith('TRANSFER')) {
      return <span className="px-3 py-1 bg-purple-50 text-purple-600 rounded-full text-[10px] font-black uppercase tracking-wider">Transfer</span>;
    }
    return <span className="px-3 py-1 bg-gray-50 text-gray-500 rounded-full text-[10px] font-black uppercase tracking-wider">{t.replace('_', ' ').toLowerCase()}</span>;
  };

  if (selectedVendorId) {
    // ─── VENDOR DETAILS RENDERING ─────────────────────────────────────
    return (
      <div className="space-y-6 flex-1 min-h-0 overflow-y-auto pr-2 pb-4 custom-scrollbar">
        {/* Detail Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <button 
              onClick={() => { setSelectedVendorId(null); setDetailData(null); }}
              className="p-2.5 bg-white border border-gray-200 rounded-2xl text-gray-500 hover:text-emerald-600 hover:border-emerald-100 transition-all shadow-sm active:scale-95"
            >
              <ArrowLeft size={18} />
            </button>
            <div>
              <h2 className="text-2xl font-black text-gray-950 tracking-tight uppercase">
                {detailLoading ? 'Loading Details...' : detailData?.vendor?.vendorName}
              </h2>
              <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mt-1">
                {detailLoading ? 'Please wait' : `GST: ${detailData?.vendor?.gstNumber || 'N/A'} • Phone: ${detailData?.vendor?.mobile || 'N/A'}`}
              </p>
            </div>
          </div>

          {!detailLoading && detailData && (
            <div className="flex items-center gap-3">
              <span className={`text-[10px] font-black uppercase px-2.5 py-1 rounded-md tracking-wider ${
                detailData.vendor.status === 'ACTIVE' ? 'bg-emerald-50 text-emerald-600' : 'bg-red-50 text-red-600'
              }`}>
                {detailData.vendor.status}
              </span>
            </div>
          )}
        </div>

        {detailLoading || (!detailData && !detailError) ? (
          <div className="flex items-center justify-center py-32"><Loader2 className="animate-spin text-emerald-600" size={40} /></div>
        ) : detailError ? (
          <div className="bg-white rounded-3xl p-16 border border-dashed border-gray-200 text-center">
            <h3 className="text-sm font-black text-gray-400 uppercase tracking-widest">{detailError}</h3>
            <button 
              onClick={() => { setSelectedVendorId(null); setDetailData(null); setDetailError(null); }}
              className="mt-4 px-4 py-2 bg-emerald-600 text-white text-xs font-bold rounded-xl transition-all active:scale-95 shadow-lg shadow-emerald-600/10"
            >
              Go Back
            </button>
          </div>
        ) : (
          <div className="space-y-6">
            {/* KPI Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm">
                <span className="text-[10px] font-black uppercase text-gray-400 tracking-widest">Mapped Products</span>
                <h3 className="text-2xl font-black text-gray-950 mt-1">{detailData.products.length} Items</h3>
              </div>
              <div className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm">
                <span className="text-[10px] font-black uppercase text-gray-400 tracking-widest">Total Stock Quantity</span>
                <h3 className="text-2xl font-black text-gray-950 mt-1">
                  {detailData.products.reduce((acc, p) => acc + p.stock, 0).toLocaleString()}
                </h3>
              </div>
              <div className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm">
                <span className="text-[10px] font-black uppercase text-gray-400 tracking-widest">Inventory Value</span>
                <h3 className="text-2xl font-black text-emerald-600 mt-1">
                  ₹{detailData.products.reduce((acc, p) => acc + p.totalValue, 0).toLocaleString()}
                </h3>
              </div>
            </div>

            {/* Toggle Tabs */}
            <div className="flex border-b border-gray-150 gap-6">
              <button 
                onClick={() => setDetailTab('movements')}
                className={`pb-3 text-xs font-black uppercase tracking-wider border-b-2 transition-all ${
                  detailTab === 'movements' ? 'border-emerald-600 text-emerald-600' : 'border-transparent text-gray-400 hover:text-gray-600'
                }`}
              >
                Stock Movements ({detailData.movements.length})
              </button>
              <button 
                onClick={() => setDetailTab('products')}
                className={`pb-3 text-xs font-black uppercase tracking-wider border-b-2 transition-all ${
                  detailTab === 'products' ? 'border-emerald-600 text-emerald-600' : 'border-transparent text-gray-400 hover:text-gray-600'
                }`}
              >
                Mapped Products List ({detailData.products.length})
              </button>
            </div>

            {/* Search and Filters Bar (Detail Page) */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              {/* Search products */}
              <div className="relative group min-w-[320px]">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-emerald-500 transition-colors" size={16} />
                <input 
                  type="text"
                  placeholder="Search products..."
                  className="w-full bg-white border border-gray-200 rounded-xl pl-10 pr-4 py-2 text-xs font-bold focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all shadow-sm"
                  value={detailSearchQuery}
                  onChange={e => setDetailSearchQuery(e.target.value)}
                />
              </div>

              {/* Filters & Export */}
              <div className="flex flex-wrap items-center gap-3">
                <div className="flex bg-gray-100 p-1 rounded-xl">
                  {[
                    { id: 'ALL', label: 'All' },
                    { id: 'IN_STOCK', label: 'In Stock' },
                    { id: 'LOW_STOCK', label: 'Low Stock' },
                    { id: 'NEAR_EXPIRY', label: 'Near Expiry' },
                    { id: 'EXPIRED', label: 'Expired' }
                  ].map(f => (
                    <button
                      key={f.id}
                      onClick={() => setDetailFilter(f.id)}
                      className={`px-3 py-1.5 rounded-lg text-[9px] font-black uppercase tracking-wider transition-all ${
                        detailFilter === f.id ? 'bg-emerald-600 text-white shadow-sm' : 'text-gray-400 hover:text-gray-600'
                      }`}
                    >
                      {f.label}
                    </button>
                  ))}
                </div>

                <button 
                  onClick={handleExportDetail}
                  className="flex items-center gap-2 px-4 py-2.5 bg-white border border-gray-200 rounded-xl text-xs font-semibold text-gray-700 hover:bg-gray-50 active:scale-95 transition-all shadow-sm"
                >
                  <Download size={14} />
                  Export Stock
                </button>
              </div>
            </div>

            {/* Tab Contents */}
            {detailTab === 'movements' ? (
              <div className="bg-white rounded-3xl border border-gray-100 shadow-sm overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="bg-gray-50/50 whitespace-nowrap">
                        <th className="px-6 py-4 text-[9px] font-black uppercase tracking-widest text-gray-400">Product</th>
                        <th className="px-6 py-4 text-[9px] font-black uppercase tracking-widest text-gray-400">SKU</th>
                        <th className="px-6 py-4 text-[9px] font-black uppercase tracking-widest text-gray-400 text-center">Type</th>
                        <th className="px-6 py-4 text-[9px] font-black uppercase tracking-widest text-gray-400 text-center">Qty</th>
                        <th className="px-6 py-4 text-[9px] font-black uppercase tracking-widest text-gray-400 text-center">Balance</th>
                        <th className="px-6 py-4 text-[9px] font-black uppercase tracking-widest text-gray-400 text-center">Expiry Status</th>
                        <th className="px-6 py-4 text-[9px] font-black uppercase tracking-widest text-gray-400 text-right">Inventory Value</th>
                        <th className="px-6 py-4 text-[9px] font-black uppercase tracking-widest text-gray-400 text-right">Last Updated</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-50">
                      {filteredMovements.map(m => (
                        <tr key={m.id} className="hover:bg-gray-50/20 transition-colors whitespace-nowrap">
                          <td className="px-6 py-4">
                            <div className="flex flex-col">
                              <span className="text-xs font-black text-gray-900">{m.product?.name}</span>
                              <span className="text-[10px] text-gray-400 font-bold mt-0.5">
                                {m.unit} • {m.category}
                              </span>
                            </div>
                          </td>
                          <td className="px-6 py-4 text-xs font-bold text-gray-500 font-mono">{m.skuCode}</td>
                          <td className="px-6 py-4 text-center">
                            {getTypeBadge(m.type)}
                          </td>
                          <td className="px-6 py-4 text-center font-black text-xs">
                            <span className={m.quantity >= 0 ? 'text-emerald-600' : 'text-red-600'}>
                              {m.quantity >= 0 ? '+' : ''}{m.quantity}
                            </span>
                          </td>
                          <td className="px-6 py-4 text-center text-xs font-black text-gray-900">{m.balanceAfter}</td>
                          <td className="px-6 py-4 text-center">
                            {getExpiryStatusBadge(m.expiryStatus)}
                          </td>
                          <td className="px-6 py-4 text-xs font-black text-gray-900 text-right">
                            ₹{m.inventoryValue?.toLocaleString() || '0'}
                          </td>
                          <td className="px-6 py-4 text-xs text-gray-600 font-bold text-right">
                            {format(new Date(m.createdAt), 'dd MMM yyyy, hh:mm a')}
                          </td>
                        </tr>
                      ))}
                      {filteredMovements.length === 0 && (
                        <tr>
                          <td colSpan={8} className="px-6 py-12 text-center text-xs font-bold text-gray-400 uppercase tracking-widest">
                            No matching movements found
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            ) : (
              <div className="bg-white rounded-3xl border border-gray-100 shadow-sm overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="bg-gray-50/50">
                        <th className="px-6 py-4 text-[9px] font-black uppercase tracking-widest text-gray-400">Product</th>
                        <th className="px-6 py-4 text-[9px] font-black uppercase tracking-widest text-gray-400">SKU Code</th>
                        <th className="px-6 py-4 text-[9px] font-black uppercase tracking-widest text-gray-400">Category</th>
                        <th className="px-6 py-4 text-[9px] font-black uppercase tracking-widest text-gray-400 text-center">Stock</th>
                        <th className="px-6 py-4 text-[9px] font-black uppercase tracking-widest text-gray-400 text-right">Purchase Rate</th>
                        <th className="px-6 py-4 text-[9px] font-black uppercase tracking-widest text-gray-400 text-right">Total Value</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-50">
                      {filteredProducts.map(p => (
                        <tr key={p.id} className="hover:bg-gray-50/20 transition-colors">
                          <td className="px-6 py-4 text-xs font-bold text-gray-900">{p.name}</td>
                          <td className="px-6 py-4 text-xs text-gray-500 font-mono">{p.skuCode || '—'}</td>
                          <td className="px-6 py-4 text-xs font-semibold text-gray-500">{p.category}</td>
                          <td className="px-6 py-4 text-xs font-bold text-gray-700 text-center">{p.stock}</td>
                          <td className="px-6 py-4 text-xs font-bold text-gray-800 text-right">₹{p.purchasePrice?.toLocaleString() || '0'}</td>
                          <td className="px-6 py-4 text-xs font-black text-gray-900 text-right">₹{p.totalValue?.toLocaleString() || '0'}</td>
                        </tr>
                      ))}
                      {filteredProducts.length === 0 && (
                        <tr>
                          <td colSpan={6} className="px-6 py-12 text-center text-xs font-bold text-gray-400 uppercase tracking-widest">
                            No matching products found
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    );
  }

  // ─── VENDOR SUMMARY LIST RENDERING ────────────────────────────────
  return (
    <div className="space-y-6 flex-1 min-h-0 overflow-y-auto pr-2 pb-4 custom-scrollbar">
      {/* Title Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-black text-gray-950 tracking-tight uppercase">STOCK LEDGER</h2>
          <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mt-1">Track inventory stock movement vendor-wise and batch-wise.</p>
        </div>
      </div>

      {/* Controls Bar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        {/* Search */}
        <div className="relative group min-w-[320px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-emerald-500 transition-colors" size={16} />
          <input 
            type="text"
            placeholder="Search vendors..."
            className="w-full bg-white border border-gray-200 rounded-xl pl-10 pr-4 py-2 text-xs font-bold focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all shadow-sm"
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
          />
        </div>

        {/* Filters and Actions */}
        <div className="flex items-center gap-3 self-end md:self-auto">
          {/* Status Buttons */}
          <div className="flex bg-gray-100 p-1 rounded-xl">
            <button 
              onClick={() => setStatusFilter('ALL')}
              className={`px-3 py-1.5 rounded-lg text-[9px] font-black uppercase tracking-wider transition-all ${
                statusFilter === 'ALL' ? 'bg-white text-emerald-700 shadow-sm' : 'text-gray-400 hover:text-gray-600'
              }`}
            >
              All Vendors
            </button>
            <button 
              onClick={() => setStatusFilter('ACTIVE')}
              className={`px-3 py-1.5 rounded-lg text-[9px] font-black uppercase tracking-wider transition-all ${
                statusFilter === 'ACTIVE' ? 'bg-white text-emerald-700 shadow-sm' : 'text-gray-400 hover:text-gray-600'
              }`}
            >
              Active Vendors
            </button>
          </div>

          {/* Export */}
          <button 
            onClick={handleExport}
            className="flex items-center gap-2 px-4 py-2.5 bg-white border border-gray-200 rounded-xl text-xs font-semibold text-gray-700 hover:bg-gray-50 active:scale-95 transition-all shadow-sm"
          >
            <Download size={14} />
            Export Ledger
          </button>
        </div>
      </div>

      {/* Main Vendor Summary Table */}
      {loading ? (
        <div className="flex items-center justify-center py-32"><Loader2 className="animate-spin text-emerald-600" size={40} /></div>
      ) : filteredVendors.length === 0 ? (
        <div className="bg-white rounded-3xl p-16 border border-dashed border-gray-200 text-center">
          <BookOpen size={48} className="mx-auto text-gray-200 mb-3 opacity-50" />
          <h3 className="text-sm font-black text-gray-400 uppercase tracking-widest">No matching vendors</h3>
          <p className="text-[10px] text-gray-300 mt-1">Try adjusting your search or filter criteria</p>
        </div>
      ) : (
        <div className="bg-white rounded-3xl border border-gray-100 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-gray-50/50">
                  <th className="px-6 py-4 text-[9px] font-black uppercase tracking-widest text-gray-400">Vendor</th>
                  <th className="px-6 py-4 text-[9px] font-black uppercase tracking-widest text-gray-400 text-center">Total Stock Qty</th>
                  <th className="px-6 py-4 text-[9px] font-black uppercase tracking-widest text-gray-400 text-center">Inventory Value</th>
                  <th className="px-6 py-4 text-[9px] font-black uppercase tracking-widest text-gray-400 text-center">Last Purchase</th>
                  <th className="px-6 py-4 text-[9px] font-black uppercase tracking-widest text-gray-400 text-center">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {filteredVendors.map(v => (
                  <tr key={v.id} className="hover:bg-gray-50/20 transition-colors">
                    <td className="px-6 py-4">
                      <div className="flex flex-col">
                        <span className="text-xs font-black text-gray-900">{v.vendorName}</span>
                        {v.mobile && <span className="text-[10px] text-gray-400 font-bold mt-0.5">{v.mobile}</span>}
                        {v.gstNumber && <span className="text-[9px] text-gray-400 font-mono tracking-tighter mt-0.5">GST: {v.gstNumber.toUpperCase()}</span>}
                      </div>
                    </td>
                    <td className="px-6 py-4 text-xs font-bold text-gray-800 text-center">
                      {v.totalStockQty.toLocaleString()}
                    </td>
                    <td className="px-6 py-4 text-xs font-black text-gray-950 text-center">
                      ₹{v.inventoryValue.toLocaleString()}
                    </td>
                    <td className="px-6 py-4 text-xs font-bold text-gray-500 text-center">
                      {v.lastPurchase ? format(new Date(v.lastPurchase), 'dd MMM yyyy') : '—'}
                    </td>
                    <td className="px-6 py-4 text-center">
                      <button 
                        onClick={() => setSelectedVendorId(v.id)}
                        className="inline-flex items-center justify-center p-2 rounded-xl border border-gray-200 text-gray-400 hover:text-emerald-600 hover:border-emerald-100 hover:bg-emerald-50/30 transition-all active:scale-90"
                      >
                        <Eye size={15} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};

export default StockLedgerSection;
