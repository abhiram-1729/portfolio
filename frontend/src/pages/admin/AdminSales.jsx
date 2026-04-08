import React, { useState, useEffect } from 'react';
import { Search, Filter, ShoppingCart, Calendar, Truck, Download, ChevronRight, Loader2 } from 'lucide-react';
import adminAPI from '../../services/adminService';
import toast from 'react-hot-toast';

export default function AdminSales() {
  const [sales, setSales] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterDate, setFilterDate] = useState('Today');

  const fetchSales = async () => {
    try {
      setLoading(true);
      const params = {};
      if (filterDate === 'Today') {
        params.fromDate = new Date().toISOString().split('T')[0];
      }
      // Add more filter logic if needed

      const { data } = await adminAPI.getSales(params);
      setSales(data);
    } catch (error) {
      toast.error('Failed to fetch sales history');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSales();
  }, [filterDate]);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
        <Loader2 className="animate-spin text-emerald-600" size={40} />
        <p className="text-gray-500 font-medium tracking-wide">Loading Sales History...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex flex-col gap-1">
          <h2 className="text-2xl font-bold text-gray-900">Sales Management</h2>
          <p className="text-sm text-gray-500">View and manage all transaction history</p>
        </div>
        <button className="bg-emerald-50 text-emerald-600 p-3 rounded-xl border border-emerald-100 hover:bg-emerald-100 transition-colors">
          <Download size={24} />
        </button>
      </div>

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
              {sales
                .filter(s => {
                  const query = searchQuery.toLowerCase();
                  const invoiceStr = s.orderNumber ? `vk-${s.orderNumber}` : `vk-${Date.now().toString().slice(-6)}`;
                  const customerName = s.customerName ? s.customerName.toLowerCase() : '';
                  return invoiceStr.includes(query) || (s.mobile && s.mobile.includes(searchQuery)) || customerName.includes(query);
                })
                .map((sale) => (
                  <div key={sale.id} className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm flex flex-col gap-4">
                    <div className="flex justify-between items-start">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-emerald-50 flex items-center justify-center text-emerald-600">
                          <ShoppingCart size={20} />
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <h3 className="text-sm font-bold text-gray-900 uppercase">
                              {sale.orderNumber ? `VK-${sale.orderNumber}` : `VK-${String(sale.id).replace(/\D/g, '').slice(0, 6) || Math.floor(Math.random() * 100000)}`}
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
                        <span className="text-xs font-bold uppercase tracking-wider">Details</span>
                        <ChevronRight size={16} className="group-hover:translate-x-1 transition-transform" />
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
                  {sales
                    .filter(s => {
                      const query = searchQuery.toLowerCase();
                      const invoiceStr = s.orderNumber ? `vk-${s.orderNumber}` : `vk-${Date.now().toString().slice(-6)}`;
                      const customerName = s.customerName ? s.customerName.toLowerCase() : '';
                      return invoiceStr.includes(query) || (s.mobile && s.mobile.includes(searchQuery)) || customerName.includes(query);
                    })
                    .map((sale) => (
                      <tr key={sale.id} className="hover:bg-gray-50/30 transition-colors group">
                        <td className="px-6 py-4">
                          <div className="flex flex-col">
                            <span className="font-black text-gray-900 uppercase">
                              {sale.orderNumber ? `VK-${sale.orderNumber}` : `VK-${String(sale.id).replace(/\D/g, '').slice(0, 6)}`}
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
                            <button className="flex items-center gap-1 px-3 py-1.5 bg-emerald-50 text-emerald-600 rounded-xl font-black text-[10px] uppercase tracking-widest hover:bg-emerald-600 hover:text-white transition-all">
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
          </>
        )}
      </div>
    </div>
  );
}

