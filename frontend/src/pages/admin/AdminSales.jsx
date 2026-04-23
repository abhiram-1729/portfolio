import React, { useState, useEffect } from 'react';
import { Search, Filter, ShoppingCart, Calendar, Truck, Download, ChevronRight, ChevronLeft, Loader2, ArrowLeft, User, Smartphone, Shield, Coins, Package, Info, MapPin, Printer } from 'lucide-react';
import { format } from 'date-fns';
import { useSearchParams, useNavigate, useLocation } from 'react-router-dom';
import StoreSelector from './StoreSelector';
import { useUserStore } from '../../store/userStore';
import adminAPI from '../../services/adminService';
import toast from 'react-hot-toast';

export default function AdminSales() {
  const [sales, setSales] = useState([]);
  const [stores, setStores] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterDate, setFilterDate] = useState('Today');
  const [currentPage, setCurrentPage] = useState(1);
  const [viewingOrder, setViewingOrder] = useState(null);
  const ITEMS_PER_PAGE = 10;
  
  const [searchParams, setSearchParams] = useSearchParams();
  const storeFilterId = searchParams.get('storeId');
  const location = useLocation();
  const isTenantRoute = location.pathname.includes('/tenant/');
  const currentUser = useUserStore(s => s.user);
  const can = useUserStore(s => s.can);

  const fetchSales = async () => {
    try {
      setLoading(true);
      const params = { storeId: storeFilterId };
      if (filterDate === 'Today') {
        params.fromDate = new Date().toISOString().split('T')[0];
      }
      // Add more filter logic if needed

      const [salesRes, storesRes] = await Promise.all([
        adminAPI.getSales(params),
        adminAPI.getStores()
      ]);
      setSales(salesRes.data);
      if (storesRes.data?.success) {
        setStores(storesRes.data.data);
      }
    } catch (error) {
      toast.error('Failed to fetch sales history');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSales();
  }, [filterDate, storeFilterId]);

  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, filterDate, storeFilterId]);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
        <Loader2 className="animate-spin text-emerald-600" size={40} />
        <p className="text-gray-500 font-medium tracking-wide">Loading Sales History...</p>
      </div>
    );
  }

  // Gatekeeper removed for Tenant Owners to allow "All Stores" sales view

  // Apply Store filter mathematically to sales
  const listToRender = sales.filter(s => {
      if (storeFilterId && s.storeId !== storeFilterId) return false;
      const query = searchQuery.toLowerCase();
      const invoiceStr = s.orderNumber ? `vk-${s.orderNumber}` : `vk-${Date.now().toString().slice(-6)}`;
      const customerName = s.customerName ? s.customerName.toLowerCase() : '';
      return invoiceStr.includes(query) || (s.mobile && s.mobile.includes(searchQuery)) || customerName.includes(query);
  });

  const totalPages = Math.ceil(listToRender.length / ITEMS_PER_PAGE);
  const paginatedSales = listToRender.slice((currentPage - 1) * ITEMS_PER_PAGE, currentPage * ITEMS_PER_PAGE);

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div className="flex flex-col gap-1">
          <h2 className="text-2xl font-black text-gray-900 tracking-tight">Sales Management</h2>
          <div className="flex items-center gap-2">
            <p className="text-sm font-medium text-gray-500">View and manage all transaction history</p>
            {isTenantRoute && (
              <>
                <span className="text-gray-300">•</span>
                <select
                  value={storeFilterId || ''}
                  onChange={(e) => {
                    if (e.target.value) {
                      setSearchParams({ storeId: e.target.value });
                    } else {
                      setSearchParams({});
                    }
                  }}
                  className="bg-emerald-50 text-emerald-700 text-[10px] font-black uppercase tracking-widest pl-2 pr-6 py-1 rounded-md border-none outline-none appearance-none focus:ring-1 focus:ring-emerald-500 cursor-pointer mt-0.5"
                  style={{
                    backgroundImage: `url("data:image/svg+xml,%3csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 20 20'%3e%3cpath stroke='%23047857' stroke-linecap='round' stroke-linejoin='round' stroke-width='2' d='M5.25 7.5L10 12.25L14.75 7.5'/%3e%3c/svg%3e")`,
                    backgroundPosition: 'right 0.25rem center',
                    backgroundRepeat: 'no-repeat',
                    backgroundSize: '1rem'
                  }}
                >
                  <option value="">All Branches</option>
                  {stores.map(s => (
                    <option key={s.id} value={s.id}>{s.name}</option>
                  ))}
                </select>
              </>
            )}
          </div>
        </div>
        {can('SALES', 'CREATE') && (
          <button className="bg-emerald-50 text-emerald-600 p-3 rounded-xl border border-emerald-100 hover:bg-emerald-100 transition-colors">
            <Download size={24} />
          </button>
        )}
      </div>

      {viewingOrder ? (
        /* ========== SALES DETAIL FULL PAGE VIEW ========== */
        <div className="space-y-6 animate-in slide-in-from-right-4 fade-in duration-500">
          <div className="flex items-center gap-4 mb-2">
            <button
              onClick={() => setViewingOrder(null)}
              className="w-10 h-10 bg-white rounded-xl border border-gray-100 flex items-center justify-center text-gray-400 hover:text-emerald-600 hover:border-emerald-100 transition-all shadow-sm"
            >
              <ArrowLeft size={18} />
            </button>
            <div>
              <h2 className="text-xl font-black text-gray-900 tracking-tight flex items-center gap-2">
                Sales Details <span className="text-sky-500 text-sm font-bold bg-sky-50 px-2 py-0.5 rounded-lg border border-sky-100">{viewingOrder.displayId || `VK-${viewingOrder.orderNumber}`}</span>
              </h2>
              <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Transaction Audit • {format(new Date(viewingOrder.createdAt), 'PPP p')}</p>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-1 space-y-6">
              <div className="bg-white rounded-[2rem] border border-gray-100 shadow-sm p-6 space-y-6">
                <div className="space-y-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-emerald-50 text-emerald-600 rounded-xl flex items-center justify-center">
                      <User size={20} />
                    </div>
                    <div>
                      <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest">Customer Information</p>
                      <p className="text-sm font-black text-gray-900">{viewingOrder.customerName || 'Walk-in Customer'}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-sky-50 text-sky-600 rounded-xl flex items-center justify-center">
                      <Smartphone size={20} />
                    </div>
                    <div>
                      <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest">Contact Number</p>
                      <p className="text-sm font-black text-gray-900">{viewingOrder.mobile || '--'}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-slate-50 text-slate-600 rounded-xl flex items-center justify-center">
                      <Shield size={20} />
                    </div>
                    <div>
                      <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest">Processed By</p>
                      <div className="flex items-center gap-1.5">
                        <span className="text-sm font-black text-gray-900">{viewingOrder.user?.name || viewingOrder.userName || '--'}</span>
                        <span className="text-[8px] font-black bg-emerald-100 text-emerald-700 px-1.5 py-0.5 rounded-md uppercase tracking-widest">Verified</span>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-amber-50 text-amber-600 rounded-xl flex items-center justify-center">
                      <MapPin size={20} />
                    </div>
                    <div>
                      <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest">Sale Location</p>
                      <div className="flex items-center gap-1.5">
                        <span className="text-sm font-black text-gray-900">{viewingOrder.villageName || 'Direct Store Sale'}</span>
                        {viewingOrder.coverageType && (
                          <span className="text-[8px] font-black bg-amber-100 text-amber-700 px-1.5 py-0.5 rounded-md uppercase tracking-widest">{viewingOrder.coverageType}</span>
                        )}
                      </div>
                    </div>
                  </div>
                </div>

                <div className="pt-6 border-t border-gray-50">
                  <div className="p-4 bg-emerald-900 rounded-2xl relative overflow-hidden group">
                    <div className="absolute top-0 right-0 p-2 opacity-10">
                      <Coins size={40} className="text-emerald-400" />
                    </div>
                    <p className="text-[9px] font-black text-emerald-400 uppercase tracking-widest mb-1">Total Collection</p>
                    <p className="text-3xl font-black text-white tracking-tighter">₹{(viewingOrder.totalAmount || 0).toFixed(2)}</p>
                    <div className="mt-3 flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
                      <span className="text-[8px] font-black text-emerald-100 uppercase tracking-widest">
                        {viewingOrder.paymentMode || 'PAID'}
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              <div className="bg-amber-50 border border-amber-100 rounded-2xl p-4 flex gap-3">
                <Info size={16} className="text-amber-500 shrink-0 mt-0.5" />
                <p className="text-[10px] font-bold text-amber-900 leading-relaxed uppercase">
                  This transaction summary includes itemized breakdown and customer verification details.
                </p>
              </div>
            </div>

            <div className="lg:col-span-2">
              <div className="bg-white rounded-[2rem] border border-gray-100 shadow-sm overflow-hidden flex flex-col h-full">
                <div className="px-6 py-4 border-b border-gray-100 bg-gray-50/30 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-white rounded-xl border border-gray-100 flex items-center justify-center text-slate-600 shadow-sm">
                      <Package size={20} />
                    </div>
                    <div>
                      <h3 className="text-sm font-black text-gray-900 uppercase tracking-tight">Itemized Breakdown</h3>
                      <p className="text-[9px] font-bold text-gray-400 uppercase tracking-widest">{viewingOrder.items?.length || 0} Unique items in basket</p>
                    </div>
                  </div>
                </div>

                <div className="flex-1 overflow-x-auto">
                  <table className="w-full text-left">
                    <thead>
                      <tr className="border-b border-gray-100">
                        <th className="px-6 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest">Product Details</th>
                        <th className="px-4 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest text-center">Qty</th>
                        <th className="px-4 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest text-right">Unit Price</th>
                        <th className="px-6 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest text-right">Subtotal</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-50">
                      {viewingOrder.items?.map((item, idx) => (
                        <tr key={idx} className="hover:bg-gray-50/50 transition-colors">
                          <td className="px-6 py-4">
                            <div className="flex items-center gap-3">
                              <div className="w-9 h-9 bg-gray-50 rounded-xl flex items-center justify-center text-gray-300 font-black text-xs border border-gray-100 shadow-inner">
                                {idx + 1}
                              </div>
                              <div>
                                <p className="text-xs font-black text-gray-900 uppercase">{item.product?.name || item.productName || 'Unknown Product'}</p>
                                <div className="flex items-center gap-2 mt-0.5">
                                  <span className="text-[8px] font-black text-emerald-600 bg-emerald-50 px-1.5 py-0.5 rounded uppercase tracking-widest">SKU: {item.productId?.slice(-6).toUpperCase()}</span>
                                </div>
                              </div>
                            </div>
                          </td>
                          <td className="px-4 py-4 text-center">
                            <span className="text-xs font-black text-emerald-700 bg-emerald-50 px-2.5 py-1.5 rounded-xl border border-emerald-100">
                              {item.quantity}
                            </span>
                          </td>
                          <td className="px-4 py-4 text-right">
                            <span className="text-xs font-black text-gray-500 tabular-nums">₹{(item.price || 0).toFixed(2)}</span>
                          </td>
                          <td className="px-6 py-4 text-right">
                            <span className="text-xs font-black text-gray-900 tabular-nums">₹{(item.price * item.quantity).toFixed(2)}</span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                <div className="p-6 bg-gray-50/50 border-t border-gray-100 grid grid-cols-3 gap-4 mt-auto">
                  <div className="text-center p-3 bg-white rounded-2xl border border-gray-100 shadow-sm">
                    <p className="text-[8px] font-black text-gray-400 uppercase tracking-widest mb-1">Total Items</p>
                    <p className="text-sm font-black text-gray-900">{viewingOrder.items?.reduce((sum, i) => sum + i.quantity, 0) || 0}</p>
                  </div>
                  <div className="text-center p-3 bg-white rounded-2xl border border-gray-100 shadow-sm">
                    <p className="text-[8px] font-black text-gray-400 uppercase tracking-widest mb-1">Tax Status</p>
                    <p className="text-sm font-black text-emerald-600 tracking-widest uppercase">Inclusive</p>
                  </div>
                  <button onClick={() => window.print()} className="bg-gray-900 text-white rounded-2xl font-black text-[10px] uppercase tracking-widest flex items-center justify-center gap-2 shadow-lg shadow-gray-900/10 hover:translate-y-[-2px] transition-all">
                    <Printer size={14} /> Print Receipt
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      ) : (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div className="flex items-center gap-3 bg-white p-3 rounded-2xl border border-gray-100 shadow-sm">
              <Search size={20} className="text-gray-400" />
              <input
                type="text"
                placeholder="Search invoice or mobile..."
                className="flex-1 bg-transparent border-none focus:outline-none text-sm"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
            <div className="flex items-center gap-3 bg-white p-3 rounded-2xl border border-gray-100 shadow-sm px-4">
              <Calendar size={20} className="text-gray-400" />
              <select
                value={filterDate}
                onChange={(e) => setFilterDate(e.target.value)}
                className="flex-1 bg-transparent border-none focus:outline-none text-sm font-medium appearance-none"
              >
                <option>Today</option>
                <option>Yesterday</option>
                <option>Last 7 Days</option>
                <option>All Time</option>
              </select>
              <Filter size={18} className="text-gray-400" />
            </div>
          </div>

          <div className="space-y-4">
            {sales.length === 0 ? (
              <div className="text-center py-12 bg-white rounded-2xl border border-dashed border-gray-200">
                <ShoppingCart size={48} className="mx-auto text-gray-300 mb-2" />
                <p className="text-gray-500">No sales found for this period</p>
              </div>
            ) : (
              <>
                {/* Mobile View */}
                <div className="space-y-4 md:hidden">
                  {paginatedSales.map((sale) => (
                    <div key={sale.id} className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm flex flex-col gap-4">
                      <div className="flex justify-between items-start">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-xl bg-emerald-50 flex items-center justify-center text-emerald-600">
                            <ShoppingCart size={20} />
                          </div>
                          <div>
                            <div className="flex items-center gap-2">
                              <h3 className="text-sm font-bold text-gray-900 uppercase">
                                {sale.displayId || (sale.orderNumber ? `VK-${sale.orderNumber}` : `VK-${String(sale.id).replace(/\D/g, '').slice(0, 6) || Math.floor(Math.random() * 100000)}`)}
                              </h3>
                              {sale.customerName && (
                                <span className="text-[10px] bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded-full font-black uppercase tracking-tight">
                                  {sale.customerName}
                                </span>
                              )}
                            </div>
                            <span className="text-[10px] text-gray-400 font-bold uppercase">
                              {sale.mobile ? `${sale.mobile} • ` : ''}{new Date(sale.createdAt).toLocaleString()}
                            </span>
                          </div>
                        </div>
                        <div className="flex flex-col items-end">
                          <span className="text-lg font-bold text-gray-900">₹{sale.totalAmount.toLocaleString()}</span>
                          <span className="text-[10px] bg-emerald-50 text-emerald-600 px-2 py-0.5 rounded-full font-bold uppercase">
                            {sale.paymentMode || 'Pending'}
                          </span>
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-4 border-t border-gray-50 pt-4">
                        <div className="flex flex-col gap-1">
                          <div className="flex items-center gap-2">
                            <Truck size={12} className="text-gray-400" />
                            <span className="text-[10px] font-bold text-gray-500 uppercase tracking-wider">
                              {sale.vehicle?.vehicleNumber || 'No Vehicle'}
                            </span>
                          </div>
                          <span className="text-xs font-medium text-gray-400 ml-5 italic">
                            Driver: {sale.vehicle?.assignedUsers?.[0]?.name || 'No Driver'}
                          </span>
                        </div>
                        <div className="flex items-center justify-end gap-1 text-emerald-600 group cursor-pointer">
                          <button onClick={() => setViewingOrder(sale)} className="flex items-center gap-1 text-xs font-bold uppercase tracking-wider">
                            Details
                            <ChevronRight size={16} className="group-hover:translate-x-1 transition-transform" />
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Desktop Table View */}
                <div className="hidden md:block bg-white rounded-3xl border border-gray-100 shadow-sm overflow-hidden">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="bg-gray-50/50">
                        <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-gray-400">Order Details</th>
                        <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-gray-400">Customer</th>
                        <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-gray-400 text-center">Amount</th>
                        <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-gray-400 text-center">Logistics</th>
                        <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-gray-400 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-50 text-sm">
                      {paginatedSales.map((sale) => (
                        <tr key={sale.id} className="hover:bg-gray-50/30 transition-colors group">
                          <td className="px-6 py-4">
                            <div className="flex flex-col">
                              <span className="font-black text-gray-900 uppercase">
                                {sale.displayId || (sale.orderNumber ? `VK-${sale.orderNumber}` : `VK-${String(sale.id).replace(/\D/g, '').slice(0, 6)}`)}
                              </span>
                              <span className="text-[10px] text-gray-400 font-bold uppercase tracking-tighter">
                                {new Date(sale.createdAt).toLocaleString()}
                              </span>
                            </div>
                          </td>
                          <td className="px-6 py-4">
                            <div className="flex flex-col">
                              <span className="font-bold text-gray-800">{sale.customerName || 'Walk-in Customer'}</span>
                              <span className="text-xs text-gray-400">{sale.mobile || 'No Mobile'}</span>
                            </div>
                          </td>
                          <td className="px-6 py-4">
                            <div className="flex flex-col items-center">
                              <span className="font-black text-emerald-700">₹{sale.totalAmount.toLocaleString()}</span>
                              <span className="text-[10px] bg-emerald-50 text-emerald-600 px-2 py-0.5 rounded-full font-black uppercase tracking-widest mt-1">
                                {sale.paymentMode || 'Pending'}
                              </span>
                            </div>
                          </td>
                          <td className="px-6 py-4">
                            <div className="flex flex-col items-center">
                              <div className="flex items-center gap-1.5 text-gray-600">
                                <Truck size={14} className="text-gray-400" />
                                <span className="text-[10px] font-black uppercase tracking-widest">{sale.vehicle?.vehicleNumber || 'N/A'}</span>
                              </div>
                              <span className="text-[10px] text-gray-400 font-bold italic mt-0.5">
                                {sale.vehicle?.assignedUsers?.[0]?.name || 'No Driver'}
                              </span>
                            </div>
                          </td>
                          <td className="px-6 py-4">
                            <div className="flex items-center justify-end gap-2 transition-all">
                              <button 
                                onClick={() => setViewingOrder(sale)}
                                className="flex items-center gap-1 px-3 py-1.5 bg-emerald-50 text-emerald-600 rounded-xl font-black text-[10px] uppercase tracking-widest hover:bg-emerald-600 hover:text-white transition-all"
                              >
                                View Details
                                <ChevronRight size={14} />
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* Pagination Controls */}
                {totalPages > 1 && (
                  <div className="flex items-center justify-between bg-white px-8 py-4 rounded-[2rem] border border-gray-100 shadow-sm">
                    <div className="flex items-center gap-2">
                      <p className="text-[10px] font-black uppercase text-gray-400 tracking-widest">
                        Showing {(currentPage - 1) * ITEMS_PER_PAGE + 1}-{Math.min(currentPage * ITEMS_PER_PAGE, listToRender.length)} of {listToRender.length}
                      </p>
                    </div>
                    
                    <div className="flex items-center gap-1.5">
                      <button
                        onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                        disabled={currentPage === 1}
                        className="p-2 rounded-xl border border-gray-100 text-gray-400 hover:text-emerald-600 hover:border-emerald-100 hover:bg-emerald-50 disabled:opacity-30 disabled:hover:bg-transparent disabled:hover:border-gray-100 disabled:hover:text-gray-400 transition-all"
                      >
                        <ChevronLeft size={16} />
                      </button>
                      
                      <div className="flex items-center gap-1">
                        {[...Array(totalPages)].map((_, i) => {
                          const pageNum = i + 1;
                          if (pageNum === 1 || pageNum === totalPages || (pageNum >= currentPage - 1 && pageNum <= currentPage + 1)) {
                            return (
                              <button
                                key={pageNum}
                                onClick={() => setCurrentPage(pageNum)}
                                className={`w-9 h-9 rounded-xl text-[10px] font-black transition-all ${currentPage === pageNum ? 'bg-emerald-600 text-white shadow-lg shadow-emerald-200' : 'text-gray-400 hover:text-gray-600 hover:bg-gray-50'}`}
                              >
                                {pageNum}
                              </button>
                            );
                          } else if (pageNum === currentPage - 2 || pageNum === currentPage + 2) {
                            return <span key={pageNum} className="text-gray-300 px-1">...</span>;
                          }
                          return null;
                        })}
                      </div>

                      <button
                        onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                        disabled={currentPage === totalPages}
                        className="p-2 rounded-xl border border-gray-100 text-gray-400 hover:text-emerald-600 hover:border-emerald-100 hover:bg-emerald-50 disabled:opacity-30 disabled:hover:bg-transparent disabled:hover:border-gray-100 disabled:hover:text-gray-400 transition-all"
                      >
                        <ChevronRight size={16} />
                      </button>
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

