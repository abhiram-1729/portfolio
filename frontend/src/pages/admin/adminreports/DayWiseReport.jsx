import React, { useState, useEffect } from 'react';
import { Calendar, RotateCcw, ChevronRight, ArrowLeft, Package, Search, FileDown, TrendingUp, Filter } from 'lucide-react';
import { useSearchParams } from 'react-router-dom';
import adminAPI from '../../../services/adminService';
import toast from 'react-hot-toast';
import ReportLayout from './ReportLayout';
import * as XLSX from 'xlsx';
import { motion, AnimatePresence } from 'framer-motion';

export default function DayWiseReport() {
  const [reportData, setReportData] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [searchParams] = useSearchParams();
  const storeId = searchParams.get('storeId');

  // Detailed View State
  const [selectedDate, setSelectedDate] = useState(null);
  const [detailedData, setDetailedData] = useState([]);
  const [isDetailLoading, setIsDetailLoading] = useState(false);
  const [detailSearch, setDetailSearch] = useState('');

  const fetchData = async () => {
    setIsLoading(true);
    try {
      const res = await adminAPI.getTrendsReport({ days: 30, storeId });
      setReportData(res.data);
    } catch (error) {
      toast.error('Failed to load day-wise data');
    } finally {
      setIsLoading(false);
    }
  };

  const fetchDetailedData = async (date) => {
    setSelectedDate(date);
    setIsDetailLoading(true);
    try {
      const res = await adminAPI.getDayDetailedSales({ date, storeId });
      setDetailedData(res.data);
    } catch (error) {
      toast.error('Failed to load detailed sales');
    } finally {
      setIsDetailLoading(false);
    }
  };

  useEffect(() => { fetchData(); }, [storeId]);

  const exportDetailedToExcel = () => {
    if (!detailedData.length) return;
    const ws = XLSX.utils.json_to_sheet(detailedData.map(item => ({
      'Product Name': item.name,
      'SKU': item.sku,
      'Category': item.category,
      'Quantity Sold': item.quantity,
      'Total Revenue': item.revenue,
      'Total Profit': item.profit
    })));
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Day_Detailed_Sales");
    XLSX.writeFile(wb, `Sales_Report_${selectedDate}.xlsx`);
  };

  const filteredDetailed = detailedData.filter(item => 
    item.name.toLowerCase().includes(detailSearch.toLowerCase()) ||
    item.sku.toLowerCase().includes(detailSearch.toLowerCase()) ||
    item.category.toLowerCase().includes(detailSearch.toLowerCase())
  );

  return (
    <ReportLayout title="Day-wise Sales" icon={Calendar} activeTab="day-wise" reportData={reportData} isLoading={isLoading}>
      <AnimatePresence mode="wait">
        {!selectedDate ? (
          <motion.div 
            key="summary"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, x: -20 }}
            transition={{ duration: 0.4 }}
            className="bg-white rounded-[2.5rem] border border-gray-100 shadow-sm overflow-hidden"
          >
            <div className="p-8 border-b border-gray-50 flex justify-between items-center bg-gray-50/30">
                <div>
                  <h3 className="text-xl font-black text-gray-900 tracking-tight uppercase">Daily Revenue Audit</h3>
                  <div className="flex items-center gap-2 mt-1">
                    <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                    <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Last 30 Days Enterprise Performance</p>
                  </div>
                </div>
                <button 
                  onClick={fetchData} 
                  className="p-3 rounded-2xl bg-white text-emerald-600 hover:bg-emerald-600 hover:text-white transition-all shadow-sm border border-gray-100 active:scale-95 hover:rotate-180 duration-500"
                >
                  <RotateCcw size={20} />
                </button>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead>
                  <tr className="bg-gray-50/50">
                    <th className="px-8 py-6 text-[10px] font-black text-gray-400 uppercase tracking-widest">Date / Session</th>
                    <th className="px-8 py-6 text-[10px] font-black text-gray-400 uppercase tracking-widest text-center">Volume</th>
                    <th className="px-8 py-6 text-[10px] font-black text-gray-400 uppercase tracking-widest text-center">Net Revenue</th>
                    <th className="px-8 py-6 text-[10px] font-black text-gray-400 uppercase tracking-widest text-center">Gross Profit</th>
                    <th className="px-8 py-6 text-[10px] font-black text-gray-400 uppercase tracking-widest text-right">Insights</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {Array.isArray(reportData) && reportData.map((item, i) => (
                    <motion.tr 
                      key={i} 
                      whileHover={{ backgroundColor: "rgba(16, 185, 129, 0.05)" }}
                      className="transition-all group cursor-pointer" 
                      onClick={() => fetchDetailedData(item.rawDate || item.date)}
                    >
                      <td className="px-8 py-6">
                        <div className="flex items-center gap-4">
                          <div className="w-12 h-12 rounded-2xl bg-gray-50 flex items-center justify-center text-gray-400 group-hover:bg-emerald-600 group-hover:text-white transition-all duration-300 shadow-inner">
                            <Calendar size={20} />
                          </div>
                          <div className="flex flex-col">
                            <span className="text-sm font-black text-gray-800">{item.date}</span>
                            <span className="text-[10px] font-bold text-gray-400 uppercase tracking-tighter">Business Day</span>
                          </div>
                        </div>
                      </td>
                      <td className="px-8 py-6 text-center">
                        <span className="px-4 py-1.5 rounded-full bg-blue-50 text-blue-600 text-[10px] font-black uppercase tracking-tight shadow-sm border border-blue-100">{item.orders} Orders</span>
                      </td>
                      <td className="px-8 py-6 text-center text-sm font-black text-emerald-600 italic">₹{(item.revenue || 0).toLocaleString()}</td>
                      <td className="px-8 py-6 text-center text-sm font-bold text-orange-600">₹{(item.profit || 0).toLocaleString()}</td>
                      <td className="px-8 py-6 text-right">
                        <div className="flex items-center justify-end text-emerald-600 opacity-0 group-hover:opacity-100 transition-all transform translate-x-2 group-hover:translate-x-0">
                          <span className="text-[10px] font-black uppercase tracking-widest mr-3">Detailed Audit</span>
                          <div className="w-8 h-8 rounded-full bg-emerald-50 flex items-center justify-center">
                            <ChevronRight size={18} strokeWidth={3} />
                          </div>
                        </div>
                      </td>
                    </motion.tr>
                  ))}
                </tbody>
              </table>
            </div>
          </motion.div>
        ) : (
          <motion.div 
            key="details"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 20 }}
            transition={{ duration: 0.4 }}
            className="space-y-6"
          >
            <div className="flex items-center justify-between">
              <motion.button 
                whileHover={{ x: -4 }}
                onClick={() => setSelectedDate(null)}
                className="flex items-center gap-2 px-5 py-2.5 rounded-2xl bg-white border border-gray-100 text-gray-600 hover:bg-gray-50 transition-all shadow-sm group"
              >
                <ArrowLeft size={18} className="text-emerald-500" />
                <span className="text-xs font-black uppercase tracking-widest">Back to Overview</span>
              </motion.button>

              <div className="flex items-center gap-3">
                 <button 
                  onClick={exportDetailedToExcel}
                  className="flex items-center gap-3 px-7 py-3 rounded-2xl bg-emerald-600 text-white hover:bg-emerald-700 transition-all shadow-lg shadow-emerald-200 active:scale-95"
                 >
                   <FileDown size={20} />
                   <span className="text-xs font-black uppercase tracking-widest">Export Detailed XLSX</span>
                 </button>
              </div>
            </div>

            <div className="bg-white rounded-[2.5rem] border border-gray-100 shadow-2xl overflow-hidden relative">
              <div className="p-10 border-b border-gray-50 bg-gray-50/30 flex flex-col md:flex-row md:items-center justify-between gap-8">
                <div className="flex items-center gap-6">
                  <div className="w-20 h-20 rounded-[2.5rem] bg-emerald-600 text-white flex items-center justify-center shadow-2xl shadow-emerald-200 animate-pulse-subtle">
                    <Package size={36} />
                  </div>
                  <div>
                    <h3 className="text-3xl font-black text-gray-900 tracking-tighter uppercase leading-tight">Product Performance</h3>
                    <div className="flex items-center gap-3 mt-1">
                      <div className="px-3 py-1 rounded-lg bg-emerald-100 text-emerald-700 text-[10px] font-black uppercase tracking-widest">
                        Audit Log: {selectedDate}
                      </div>
                      <span className="text-xs font-bold text-gray-400 uppercase tracking-tighter flex items-center gap-2">
                        • {detailedData.length} Unique SKUs Sold
                      </span>
                    </div>
                  </div>
                </div>

                <div className="relative w-full md:w-96 group">
                  <Search className="absolute left-5 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-emerald-500 transition-colors" size={20} />
                  <input 
                    type="text" 
                    placeholder="Search by product name, SKU or category..."
                    value={detailSearch}
                    onChange={(e) => setDetailSearch(e.target.value)}
                    className="w-full pl-14 pr-6 py-4.5 bg-white border-2 border-gray-100 rounded-3xl text-sm font-bold focus:ring-8 focus:ring-emerald-500/5 focus:border-emerald-500 outline-none transition-all shadow-inner placeholder:text-gray-300"
                  />
                  <div className="absolute right-5 top-1/2 -translate-y-1/2 text-gray-200">
                    <Filter size={18} />
                  </div>
                </div>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-gray-50/50">
                      <th className="px-10 py-6 text-[10px] font-black text-gray-400 uppercase tracking-widest">Product Intelligence</th>
                      <th className="px-10 py-6 text-[10px] font-black text-gray-400 uppercase tracking-widest text-center">Categorization</th>
                      <th className="px-10 py-6 text-[10px] font-black text-gray-400 uppercase tracking-widest text-center">Unit Volume</th>
                      <th className="px-10 py-6 text-[10px] font-black text-gray-400 uppercase tracking-widest text-center">Net Revenue</th>
                      <th className="px-10 py-6 text-[10px] font-black text-gray-400 uppercase tracking-widest text-right">Profit & Margin</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {isDetailLoading ? (
                      <tr>
                        <td colSpan="5" className="px-10 py-32 text-center">
                          <div className="flex flex-col items-center gap-6">
                            <div className="w-16 h-16 border-4 border-emerald-50 border-t-emerald-600 rounded-full animate-spin shadow-inner" />
                            <p className="text-xs font-black text-gray-400 uppercase tracking-[0.3em] animate-pulse">Assembling Daily Data Stream...</p>
                          </div>
                        </td>
                      </tr>
                    ) : filteredDetailed.length === 0 ? (
                      <tr>
                        <td colSpan="5" className="px-10 py-32 text-center">
                          <div className="flex flex-col items-center gap-4 opacity-30">
                            <Search size={48} className="text-gray-400" />
                            <p className="text-sm font-black text-gray-500 uppercase tracking-widest">No products match your criteria</p>
                          </div>
                        </td>
                      </tr>
                    ) : filteredDetailed.map((item, i) => (
                      <motion.tr 
                        key={i} 
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: i * 0.02 }}
                        className="hover:bg-emerald-50/10 transition-colors"
                      >
                        <td className="px-10 py-6">
                          <div className="flex flex-col">
                            <span className="text-sm font-black text-gray-900 tracking-tight leading-tight mb-1">{item.name}</span>
                            <div className="flex items-center gap-2">
                              <span className="text-[10px] font-bold text-emerald-600 bg-emerald-50 px-1.5 py-0.5 rounded tracking-widest">SKU: {item.sku}</span>
                            </div>
                          </div>
                        </td>
                        <td className="px-10 py-6 text-center">
                          <span className="px-3 py-1 rounded-xl bg-gray-50 border border-gray-100 text-gray-600 text-[10px] font-black uppercase tracking-wider">{item.category}</span>
                        </td>
                        <td className="px-10 py-6 text-center">
                           <div className="flex flex-col items-center">
                              <span className="text-sm font-black text-gray-800">{item.quantity}</span>
                              <span className="text-[9px] font-bold text-gray-400 uppercase tracking-tighter">Units Dispatched</span>
                           </div>
                        </td>
                        <td className="px-10 py-6 text-center">
                          <span className="text-sm font-black text-emerald-600 italic">₹{(item.revenue || 0).toLocaleString()}</span>
                        </td>
                        <td className="px-10 py-6 text-right">
                           <div className="flex flex-col items-end">
                              <span className="text-sm font-black text-orange-600">₹{(item.profit || 0).toLocaleString()}</span>
                              <div className="flex items-center gap-1.5 text-[10px] font-black text-emerald-500 mt-1 uppercase">
                                 <TrendingUp size={12} strokeWidth={3} />
                                 {Math.round((item.profit / item.revenue) * 100)}% ROI
                              </div>
                           </div>
                        </td>
                      </motion.tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </ReportLayout>
  );
}
