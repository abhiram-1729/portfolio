import React, { useState, useEffect } from 'react';
import { Search, Filter, ShoppingCart, Calendar, Truck, Download, ChevronRight, ChevronLeft, Loader2, ArrowLeft, User, Smartphone, Shield, Coins, Package, Info, MapPin, Printer, Clock, CreditCard, Wallet, CalendarClock, Map, Building2, Tag, CheckCircle2, AlertCircle, RefreshCw, FileText } from 'lucide-react';
import { format } from 'date-fns';
import { useSearchParams, useNavigate, useLocation } from 'react-router-dom';
import StoreSelector from './StoreSelector';
import { useUserStore } from '../../store/userStore';
import adminAPI from '../../services/adminService';
import toast from 'react-hot-toast';
import * as XLSX from 'xlsx';
import { jsPDF } from 'jspdf';

export default function AdminSales() {
  // Add Print Styles
  useEffect(() => {
    const style = document.createElement('style');
    style.innerHTML = `
      @media print {
        /* Default: Hide sidebar and dashboard UI */
        nav, aside, header, .no-print, button, .filters-section { display: none !important; }
        
        /* If we are NOT in detail view, show the main container */
        .main-content-to-print { 
          visibility: visible !important; 
          position: absolute;
          left: 0;
          top: 0;
          width: 100%;
        }

        /* If we ARE in detail view, only show the invoice */
        body:has(.printable-invoice) .main-content-to-print {
           display: none !important;
        }

        .printable-invoice { 
          display: block !important;
          visibility: visible !important;
          position: absolute; 
          left: 0; 
          top: 0; 
          width: 100%; 
          padding: 20px;
        }
        
        /* Reset background for print */
        body { background: white !important; }
      }
    `;
    document.head.appendChild(style);
    return () => document.head.removeChild(style);
  }, []);

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

  const handleDownloadReport = (shouldPrint = false) => {
    try {
      const doc = new jsPDF('p', 'mm', 'a4'); // Portrait
      const data = listToRender;
      
      // Professional Header
      doc.setFillColor(15, 23, 42); // Slate-900
      doc.rect(0, 0, 210, 30, 'F');
      
      doc.setTextColor(255, 255, 255);
      doc.setFontSize(18);
      doc.setFont("helvetica", "bold");
      doc.text("SALES AUDIT REPORT", 105, 15, { align: "center" });
      
      doc.setFontSize(8);
      doc.setFont("helvetica", "normal");
      doc.text(`PERIOD: ALL TIME | TOTAL: ${data.length} ORDERS`, 105, 22, { align: "center" });
      doc.text(`GENERATED: ${format(new Date(), 'PPP p')}`, 105, 26, { align: "center" });

      // Table Design (Ultra Tight Portrait Grid)
      let y = 40;
      doc.setFontSize(7);
      doc.setFont("helvetica", "bold");
      doc.setFillColor(241, 245, 249);
      doc.rect(5, y - 5, 200, 8, 'F'); // 5mm margins
      doc.setTextColor(30, 41, 59);
      
      const cols = [
        { name: "INV ID", x: 7 },
        { name: "DATE", x: 38 },
        { name: "CUSTOMER", x: 58 },
        { name: "MOBILE", x: 92 },
        { name: "AMT", x: 116 },
        { name: "MODE", x: 130 },
        { name: "AGENT", x: 145 },
        { name: "ROUTE", x: 172 },
        { name: "STATUS", x: 195 }
      ];

      cols.forEach(col => doc.text(col.name, col.x, y));
      
      y += 8;
      doc.setFont("helvetica", "normal");
      doc.setFontSize(6.5); // Micro-font for portrait fit

      data.forEach((s, idx) => {
        if (y > 280) { 
          doc.addPage(); 
          y = 20; 
          doc.setFont("helvetica", "bold");
          doc.setFontSize(7);
          doc.setFillColor(241, 245, 249);
          doc.rect(5, y - 5, 200, 8, 'F');
          cols.forEach(col => doc.text(col.name, col.x, y));
          y += 8;
          doc.setFont("helvetica", "normal");
          doc.setFontSize(6.5);
        }
        
        if (idx % 2 === 1) {
            doc.setFillColor(252, 253, 255);
            doc.rect(5, y - 4, 200, 6, 'F');
        }

        doc.text(String(s.displayId || s.orderNumber || '').slice(-12), 7, y);
        doc.text(format(new Date(s.createdAt), 'dd-MM-yy'), 38, y);
        doc.text(String(s.customerName || 'Walk-in').slice(0, 15), 58, y);
        doc.text(String(s.mobile || '').slice(0, 10), 92, y);
        doc.text(s.totalAmount.toFixed(0), 116, y);
        doc.text(String(s.paymentMode || '').slice(0, 6), 130, y);
        doc.text(String(s.user?.name || s.userName || '').slice(0, 12), 145, y);
        doc.text(String(s.route?.routeName || '').slice(0, 10), 172, y);
        doc.text(String(s.status || '').slice(0, 6), 195, y);
        
        y += 6;
      });

      const pageCount = doc.internal.getNumberOfPages();
      for (let i = 1; i <= pageCount; i++) {
          doc.setPage(i);
          doc.setFontSize(7);
          doc.setTextColor(150, 150, 150);
          doc.text(`Page ${i} of ${pageCount} | VillagKart Audit`, 105, 290, { align: "center" });
      }

      if (shouldPrint) {
        doc.autoPrint();
        window.open(doc.output('bloburl'), '_blank');
      } else {
        doc.save(`Sales_Audit_Portrait_${format(new Date(), 'dd_MMM_yyyy')}.pdf`);
        toast.success('Portrait report generated');
      }
    } catch (error) {
      console.error('PDF error:', error);
      toast.error('Failed to generate portrait report');
    }
  };

  const handleDownloadDocument = (order) => {
    try {
      if (!order) return;
      const doc = new jsPDF();
      const returnAmt = order.returns?.reduce((sum, r) => sum + r.refundAmount, 0) || 0;

      // Branding & Header
      doc.setFillColor(16, 185, 129); // Emerald-600
      doc.rect(0, 0, 210, 40, 'F');

      doc.setTextColor(255, 255, 255);
      doc.setFontSize(28);
      doc.setFont("helvetica", "bold");
      doc.text("VILLAGKART", 20, 25);

      doc.setFontSize(10);
      doc.setFont("helvetica", "normal");
      doc.text("PREMIUM RURAL COMMERCE SOLUTIONS", 20, 32);

      doc.setFontSize(20);
      doc.text("TAX INVOICE", 190, 25, { align: "right" });
      doc.setFontSize(10);
      doc.text(`#${order.displayId || order.orderNumber}`, 190, 32, { align: "right" });

      // Information Grid (2 Columns)
      doc.setTextColor(40, 40, 40);
      doc.setFontSize(12);
      doc.setFont("helvetica", "bold");
      doc.text("TRANSACTION DETAILS", 20, 55);
      doc.line(20, 57, 190, 57);

      const leftFields = [
        ['Invoice ID', order.displayId || order.orderNumber],
        ['Unique ID', order.id.slice(0, 18) + '...'],
        ['Date', format(new Date(order.createdAt), 'dd-MM-yyyy')],
        ['Time', format(new Date(order.createdAt), 'hh:mm a')],
        ['Session', order.coverageType || 'N/A'],
        ['Hub ID', order.storeId || 'N/A']
      ];

      const rightFields = [
        ['Customer', order.customerName || 'Walk-in'],
        ['Mobile', order.mobile || 'N/A'],
        ['Agent (VGE)', order.user?.name || order.userName || 'N/A'],
        ['Route', order.route?.routeName || 'N/A'],
        ['Vehicle ID', order.vehicle?.vehicleNumber || 'N/A'],
        ['Status', order.status || 'N/A']
      ];

      doc.setFontSize(9);
      let y = 65;
      leftFields.forEach(([label, value]) => {
        doc.setFont("helvetica", "bold");
        doc.text(`${label}:`, 20, y);
        doc.setFont("helvetica", "normal");
        doc.text(String(value), 50, y);
        y += 7;
      });

      y = 65;
      rightFields.forEach(([label, value]) => {
        doc.setFont("helvetica", "bold");
        doc.text(`${label}:`, 110, y);
        doc.setFont("helvetica", "normal");
        doc.text(String(value), 145, y);
        y += 7;
      });

      // Financials
      y = 115;
      doc.setFillColor(248, 250, 252); // Slate-50
      doc.rect(20, y - 5, 170, 25, 'F');

      doc.setFontSize(11);
      doc.setFont("helvetica", "bold");
      doc.text("FINANCIAL SUMMARY", 25, y + 2);

      doc.setFontSize(9);
      doc.text(`Total Bill: Rs. ${order.totalAmount.toFixed(2)}`, 110, y + 2);
      doc.text(`Paid via: ${order.paymentMode}`, 110, y + 9);
      doc.setFont("helvetica", "normal");
      doc.text(`Net After Returns: Rs. ${(order.totalAmount - returnAmt).toFixed(2)}`, 25, y + 9);

      // Items Table
      y = 150;
      doc.setFontSize(12);
      doc.setFont("helvetica", "bold");
      doc.text("ITEMIZED INVENTORY", 20, y);
      doc.line(20, y + 2, 190, y + 2);

      y += 10;
      doc.setFontSize(9);
      doc.setFillColor(241, 245, 249); // Slate-100
      doc.rect(20, y - 5, 170, 8, 'F');
      doc.text("Product Description", 25, y);
      doc.text("Qty", 120, y);
      doc.text("Price", 145, y);
      doc.text("Total", 175, y, { align: "right" });

      y += 8;
      order.items?.forEach((item, idx) => {
        if (y > 270) { doc.addPage(); y = 30; }
        if (idx % 2 === 0) {
          doc.setFillColor(255, 255, 255);
        } else {
          doc.setFillColor(252, 252, 252);
        }
        doc.rect(20, y - 5, 170, 7, 'F');
        doc.text(item.product?.name || item.productName || 'Unknown', 25, y);
        doc.text(String(item.quantity), 120, y);
        doc.text(item.price.toFixed(2), 145, y);
        doc.text((item.price * item.quantity).toFixed(2), 185, y, { align: "right" });
        y += 7;
      });

      // Footer
      doc.setFontSize(8);
      doc.setTextColor(150, 150, 150);
      doc.text("This document is a computer-generated tax manifest of VillagKart Rural Solutions.", 105, 285, { align: "center" });
      doc.text(`Generated At: ${format(new Date(), 'PPP p')}`, 105, 290, { align: "center" });

      doc.save(`Invoice_${order.displayId || order.orderNumber}.pdf`);
      toast.success('Professional document generated');
    } catch (error) {
      console.error('PDF Error:', error);
      toast.error('Failed to generate professional report');
    }
  };

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
    <div className="main-content-to-print space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
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
        {can('SALES', 'CREATE') && !viewingOrder && (
          <div className="flex items-center gap-3">
            <button
              onClick={() => handleDownloadReport(true)}
              className="bg-white text-gray-700 px-6 py-3 rounded-2xl border border-gray-200 hover:bg-gray-50 transition-all flex items-center gap-2 font-black text-xs uppercase tracking-widest shadow-sm"
            >
              <Printer size={18} /> Print Report
            </button>
            <button
              onClick={() => handleDownloadReport(false)}
              className="bg-emerald-50 text-emerald-700 px-6 py-3 rounded-2xl border border-emerald-100 hover:bg-emerald-600 hover:text-white transition-all flex items-center gap-2 font-black text-xs uppercase tracking-widest shadow-sm"
            >
              <FileText size={18} /> Download Report
            </button>
          </div>
        )}
      </div>

      {viewingOrder ? (
        /* ========== SALES DETAIL FULL PAGE VIEW ========== */
        <div className="space-y-6 animate-in slide-in-from-right-4 fade-in duration-500 pb-12">
          {/* Header Section */}
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <button
                onClick={() => setViewingOrder(null)}
                className="w-12 h-12 bg-white rounded-2xl border border-gray-100 flex items-center justify-center text-gray-400 hover:text-emerald-600 hover:border-emerald-100 transition-all shadow-sm group"
              >
                <ArrowLeft size={20} className="group-hover:-translate-x-1 transition-transform" />
              </button>
              <div>
                <div className="flex items-center gap-3">
                  <h2 className="text-2xl font-black text-gray-900 tracking-tight">
                    Invoice <span className="text-emerald-600">#{viewingOrder.displayId || viewingOrder.orderNumber}</span>
                  </h2>
                  <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest border ${viewingOrder.status === 'COMPLETED' ? 'bg-emerald-50 text-emerald-600 border-emerald-100' :
                    viewingOrder.status === 'CANCELLED' ? 'bg-rose-50 text-rose-600 border-rose-100' : 'bg-amber-50 text-amber-600 border-amber-100'
                    }`}>
                    {viewingOrder.status || 'PENDING'}
                  </span>
                </div>
                <div className="flex items-center gap-3 mt-1">
                  <div className="flex items-center gap-1.5 text-gray-400 text-[10px] font-black uppercase tracking-widest">
                    <Calendar size={12} />
                    {format(new Date(viewingOrder.createdAt), 'dd MMM yyyy')}
                  </div>
                  <span className="text-gray-200">|</span>
                  <div className="flex items-center gap-1.5 text-gray-400 text-[10px] font-black uppercase tracking-widest">
                    <Clock size={12} />
                    {format(new Date(viewingOrder.createdAt), 'hh:mm:ss a')}
                  </div>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <button
                onClick={() => handleDownloadDocument(viewingOrder)}
                className="bg-emerald-50 text-emerald-700 border border-emerald-100 px-6 py-3 rounded-2xl font-black text-xs uppercase tracking-widest flex items-center gap-2 hover:bg-emerald-100 transition-all active:scale-95 shadow-sm"
              >
                <FileText size={16} /> Download
              </button>
              <button onClick={() => window.print()} className="bg-white text-gray-700 border border-gray-200 px-6 py-3 rounded-2xl font-black text-xs uppercase tracking-widest flex items-center gap-2 hover:bg-gray-50 transition-all active:scale-95 shadow-sm">
                <Printer size={16} /> Print Invoice
              </button>
              <div className="h-12 w-[1px] bg-gray-100 mx-1 hidden md:block"></div>
              <div className="flex flex-col items-end">
                <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Total Bill Amount</p>
                <p className="text-2xl font-black text-gray-900 tabular-nums tracking-tighter">₹{(viewingOrder.totalAmount || 0).toFixed(2)}</p>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
            {/* Left Sidebar: Core Info */}
            <div className="lg:col-span-1 space-y-6">
              {/* Customer & Agent Info */}
              <div className="bg-white rounded-[2.5rem] border border-gray-100 shadow-sm p-6 space-y-6 relative overflow-hidden">
                <div className="absolute -top-6 -right-6 w-24 h-24 bg-gray-50 rounded-full opacity-50 blur-2xl"></div>

                <div className="space-y-5 relative">
                  <div>
                    <p className="text-[9px] font-black text-gray-400 uppercase tracking-[0.2em] mb-3">Stakeholders</p>
                    <div className="space-y-4">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-emerald-50 text-emerald-600 rounded-xl flex items-center justify-center shadow-sm border border-emerald-100">
                          <User size={18} />
                        </div>
                        <div>
                          <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest">Customer</p>
                          <p className="text-sm font-black text-gray-900">{viewingOrder.customerName || 'Walk-in Customer'}</p>
                          <p className="text-[10px] font-bold text-gray-400">{viewingOrder.mobile || 'N/A'}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-sky-50 text-sky-600 rounded-xl flex items-center justify-center shadow-sm border border-sky-100">
                          <Shield size={18} />
                        </div>
                        <div>
                          <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest">VGE Agent (Sold By)</p>
                          <p className="text-sm font-black text-gray-900">{viewingOrder.user?.name || viewingOrder.userName || 'System'}</p>
                          <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Emp ID: {viewingOrder.user?.displayId || 'EMP-001'}</p>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="h-[1px] bg-gray-50 w-full"></div>

                  <div>
                    <p className="text-[9px] font-black text-gray-400 uppercase tracking-[0.2em] mb-3">Location & Session</p>
                    <div className="space-y-4">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-amber-50 text-amber-600 rounded-xl flex items-center justify-center shadow-sm border border-amber-100">
                          <Building2 size={18} />
                        </div>
                        <div>
                          <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest">Hub (Store)</p>
                          <p className="text-sm font-black text-gray-900">{viewingOrder.store?.name || 'Main Branch'}</p>
                          <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">ID: {viewingOrder.storeId?.slice(-6).toUpperCase()}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-indigo-50 text-indigo-600 rounded-xl flex items-center justify-center shadow-sm border border-indigo-100">
                          <CalendarClock size={18} />
                        </div>
                        <div>
                          <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest">Operational Session</p>
                          <p className="text-sm font-black text-gray-900">{viewingOrder.coverageType || 'General'}</p>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Logistics Section */}
              <div className="bg-slate-900 rounded-[2rem] p-6 text-white space-y-4 relative overflow-hidden group">
                <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:scale-110 transition-transform">
                  <Truck size={60} />
                </div>
                <p className="text-[9px] font-black text-slate-400 uppercase tracking-[0.2em]">Logistics Details</p>
                <div className="space-y-4 relative">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 bg-slate-800 rounded-xl flex items-center justify-center text-slate-300">
                      <Truck size={18} />
                    </div>
                    <div>
                      <p className="text-[8px] font-black text-slate-500 uppercase tracking-widest">Vehicle ID</p>
                      <p className="text-xs font-black text-white uppercase">{viewingOrder.vehicle?.vehicleNumber || 'No Vehicle'}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 bg-slate-800 rounded-xl flex items-center justify-center text-slate-300">
                      <Map size={18} />
                    </div>
                    <div>
                      <p className="text-[8px] font-black text-slate-500 uppercase tracking-widest">Route Name</p>
                      <p className="text-xs font-black text-white uppercase">{viewingOrder.route?.routeName || 'Direct'}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 bg-slate-800 rounded-xl flex items-center justify-center text-slate-300">
                      <MapPin size={18} />
                    </div>
                    <div>
                      <p className="text-[8px] font-black text-slate-500 uppercase tracking-widest">Village Name</p>
                      <p className="text-xs font-black text-white uppercase">{viewingOrder.villageName || 'In-Store'}</p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Sync Status Section */}
              <div className="bg-white rounded-[2rem] border border-gray-100 p-5 space-y-4">
                <div className="flex items-center justify-between">
                  <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest">System Audit</p>
                  <div className="flex items-center gap-1.5">
                    <RefreshCw size={10} className="text-emerald-500 animate-spin-slow" />
                    <span className="text-[8px] font-black text-emerald-600 uppercase tracking-widest">Synced</span>
                  </div>
                </div>
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-[9px] font-bold text-gray-400 uppercase">Unique UID</span>
                    <span className="text-[9px] font-black text-gray-600 uppercase tracking-tight font-mono">{viewingOrder.id}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-[9px] font-bold text-gray-400 uppercase">Created At</span>
                    <span className="text-[9px] font-black text-gray-600 uppercase tracking-tight">{format(new Date(viewingOrder.createdAt), 'PPP p')}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-[9px] font-bold text-gray-400 uppercase">Timestamp</span>
                    <span className="text-[9px] font-black text-gray-600 uppercase tracking-tight font-mono">{new Date(viewingOrder.createdAt).getTime()}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Main Content Area */}
            <div className="lg:col-span-3 space-y-6">
              {/* Financial Dashboard */}
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="bg-emerald-50 border border-emerald-100 rounded-3xl p-5 flex flex-col justify-between group hover:bg-emerald-600 transition-all duration-300">
                  <div className="flex items-center justify-between mb-4">
                    <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center text-emerald-600 shadow-sm border border-emerald-100">
                      <CreditCard size={18} />
                    </div>
                    <Tag size={14} className="text-emerald-300 group-hover:text-emerald-200" />
                  </div>
                  <div>
                    <p className="text-[9px] font-black text-emerald-600 group-hover:text-emerald-100 uppercase tracking-widest mb-1">Invoice Amount</p>
                    <p className="text-xl font-black text-emerald-900 group-hover:text-white tabular-nums">₹{(viewingOrder.totalAmount || 0).toFixed(2)}</p>
                  </div>
                </div>

                <div className="bg-indigo-50 border border-indigo-100 rounded-3xl p-5 flex flex-col justify-between group hover:bg-indigo-600 transition-all duration-300">
                  <div className="flex items-center justify-between mb-4">
                    <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center text-indigo-600 shadow-sm border border-indigo-100">
                      <Wallet size={18} />
                    </div>
                    <span className="text-[8px] font-black text-indigo-400 group-hover:text-indigo-200 uppercase tracking-widest">{viewingOrder.paymentMode}</span>
                  </div>
                  <div>
                    <p className="text-[9px] font-black text-indigo-600 group-hover:text-indigo-100 uppercase tracking-widest mb-1">Net Paid (Mode)</p>
                    <div className="flex items-baseline gap-2">
                      <p className="text-xl font-black text-indigo-900 group-hover:text-white tabular-nums">₹{(viewingOrder.totalAmount || 0).toFixed(2)}</p>
                      <p className="text-[8px] font-black text-indigo-400 group-hover:text-indigo-200 uppercase tracking-widest">{viewingOrder.paymentMode}</p>
                    </div>
                  </div>
                </div>

                <div className="bg-amber-50 border border-amber-100 rounded-3xl p-5 flex flex-col justify-between group hover:bg-amber-600 transition-all duration-300">
                  <div className="flex items-center justify-between mb-4">
                    <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center text-amber-600 shadow-sm border border-amber-100">
                      <Coins size={18} />
                    </div>
                  </div>
                  <div>
                    <p className="text-[9px] font-black text-amber-600 group-hover:text-amber-100 uppercase tracking-widest mb-1">Cash Breakdown</p>
                    <div className="space-y-1">
                      <div className="flex justify-between text-[10px] font-black">
                        <span className="text-amber-500 group-hover:text-amber-200">CASH:</span>
                        <span className="text-amber-900 group-hover:text-white">₹{(viewingOrder.cashAmount || 0).toFixed(2)}</span>
                      </div>
                      <div className="flex justify-between text-[10px] font-black">
                        <span className="text-amber-500 group-hover:text-amber-200">UPI:</span>
                        <span className="text-amber-900 group-hover:text-white">₹{(viewingOrder.upiAmount || 0).toFixed(2)}</span>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="bg-rose-50 border border-rose-100 rounded-3xl p-5 flex flex-col justify-between group hover:bg-rose-600 transition-all duration-300">
                  <div className="flex items-center justify-between mb-4">
                    <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center text-rose-600 shadow-sm border border-rose-100">
                      <RefreshCw size={18} />
                    </div>
                  </div>
                  <div>
                    <p className="text-[9px] font-black text-rose-600 group-hover:text-rose-100 uppercase tracking-widest mb-1">Returns & Adjust</p>
                    <p className="text-xl font-black text-rose-900 group-hover:text-white tabular-nums">₹{(viewingOrder.returns?.reduce((sum, r) => sum + r.refundAmount, 0) || 0).toFixed(2)}</p>
                  </div>
                </div>
              </div>

              {/* Itemized Table */}
              <div className="bg-white rounded-[2.5rem] border border-gray-100 shadow-sm overflow-hidden flex flex-col">
                <div className="px-8 py-6 border-b border-gray-50 flex items-center justify-between bg-gray-50/20">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 bg-white rounded-2xl flex items-center justify-center text-gray-700 shadow-sm border border-gray-100">
                      <Package size={22} />
                    </div>
                    <div>
                      <h3 className="text-lg font-black text-gray-900 uppercase tracking-tight">Basket Inventory</h3>
                      <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">
                        {viewingOrder.items?.length || 0} Products • Total Quantity: {viewingOrder.items?.reduce((sum, i) => sum + i.quantity, 0) || 0}
                      </p>
                    </div>
                  </div>
                  <div className="flex flex-col items-end">
                    <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest mb-1">Total Discount</p>
                    <p className="text-sm font-black text-rose-600">-₹{(viewingOrder.items?.reduce((sum, i) => sum + (i.discount || 0), 0) || 0).toFixed(2)}</p>
                  </div>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-left">
                    <thead>
                      <tr className="border-b border-gray-50">
                        <th className="px-8 py-5 text-[10px] font-black text-gray-400 uppercase tracking-widest">Item Description</th>
                        <th className="px-6 py-5 text-[10px] font-black text-gray-400 uppercase tracking-widest text-center">Qty / Units</th>
                        <th className="px-6 py-5 text-[10px] font-black text-gray-400 uppercase tracking-widest text-right">Selling Price</th>
                        <th className="px-6 py-5 text-[10px] font-black text-gray-400 uppercase tracking-widest text-right">Tax (%)</th>
                        <th className="px-8 py-5 text-[10px] font-black text-gray-400 uppercase tracking-widest text-right">Sub-Total</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-50">
                      {viewingOrder.items?.map((item, idx) => (
                        <tr key={idx} className="hover:bg-gray-50/30 transition-colors">
                          <td className="px-8 py-5">
                            <div className="flex items-center gap-4">
                              <div className="w-10 h-10 bg-gray-50 rounded-2xl flex items-center justify-center text-[10px] font-black text-gray-400 border border-gray-100">
                                {idx + 1}
                              </div>
                              <div>
                                <p className="text-xs font-black text-gray-900 uppercase tracking-tight">{item.product?.name || item.productName || 'Unknown Product'}</p>
                                <p className="text-[9px] font-bold text-emerald-600 uppercase mt-0.5 tracking-widest">SKU: {item.productId?.slice(-6).toUpperCase()}</p>
                              </div>
                            </div>
                          </td>
                          <td className="px-6 py-5 text-center">
                            <span className="text-xs font-black text-emerald-700 bg-emerald-50 px-3 py-1.5 rounded-xl border border-emerald-100">
                              {item.quantity} {item.product?.unit?.name || 'pcs'}
                            </span>
                          </td>
                          <td className="px-6 py-5 text-right font-black text-gray-600 text-xs tabular-nums">
                            ₹{(item.price || 0).toFixed(2)}
                          </td>
                          <td className="px-6 py-5 text-right font-black text-gray-400 text-[10px] tabular-nums">
                            {item.product?.gst || 0}%
                          </td>
                          <td className="px-8 py-5 text-right font-black text-gray-900 text-xs tabular-nums">
                            ₹{(item.price * item.quantity).toFixed(2)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                <div className="p-8 bg-gray-900 text-white flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
                  <div className="flex items-center gap-6">
                    <div>
                      <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest mb-1">Total Bill (Gross)</p>
                      <p className="text-2xl font-black tracking-tighter">₹{(viewingOrder.totalAmount || 0).toFixed(2)}</p>
                    </div>
                    <div className="w-[1px] h-10 bg-gray-800"></div>
                    <div>
                      <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest mb-1">Items Count</p>
                      <p className="text-lg font-black">{viewingOrder.items?.length || 0}</p>
                    </div>
                  </div>
                  <div className="w-full md:w-auto">
                    <div className="bg-slate-800 rounded-2xl p-4 border border-slate-700 flex gap-4 items-center">
                      <div className="w-10 h-10 bg-emerald-500/20 text-emerald-400 rounded-xl flex items-center justify-center">
                        <CheckCircle2 size={20} />
                      </div>
                      <div>
                        <p className="text-[10px] font-black uppercase tracking-widest">Description / Remarks</p>
                        <p className="text-xs text-slate-300 font-medium italic">"{viewingOrder.remark || 'Standard transaction processed without additional remarks.'}"</p>
                      </div>
                    </div>
                  </div>
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
            <div className="w-full md:w-auto flex items-center gap-3 bg-gray-50 p-3 rounded-2xl border border-gray-100 px-4">
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
                                {sale.displayId || (sale.orderNumber ? `VK-${sale.orderNumber}` : `VK-${String(sale.id).replace(/\D/g, '').slice(0, 6)}`)}
                              </h3>
                              <span className={`text-[8px] font-black uppercase tracking-widest px-1.5 py-0.5 rounded-md ${sale.coverageType === 'MORNING' ? 'bg-amber-50 text-amber-600 border border-amber-100' : 'bg-indigo-50 text-indigo-600 border border-indigo-100'}`}>
                                {sale.coverageType || 'N/A'}
                              </span>
                            </div>
                            <p className="text-[10px] text-gray-400 font-bold uppercase mt-1">
                              {format(new Date(sale.createdAt), 'dd MMM yyyy, hh:mm a')}
                            </p>
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
                            <User size={12} className="text-gray-400" />
                            <span className="text-[10px] font-black text-gray-700 uppercase tracking-tight">
                              Sold By: {sale.user?.name || sale.userName || 'System'}
                            </span>
                          </div>
                          <div className="flex items-center gap-2">
                            <Truck size={12} className="text-gray-400" />
                            <span className="text-[10px] font-bold text-gray-500 uppercase tracking-wider">
                              {sale.vehicle?.vehicleNumber || 'No Vehicle'}
                            </span>
                          </div>
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
                <div className="hidden md:block bg-white rounded-3xl border border-gray-100 shadow-sm overflow-x-auto">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="bg-gray-50/50">
                        <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-gray-400">Invoice ID</th>
                        <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-gray-400">Date & Time</th>
                        <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-gray-400">Session</th>
                        <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-gray-400">Sold By</th>
                        <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-gray-400">Invoice Amount</th>
                        <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-gray-400">Mode of Payment</th>
                        <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-gray-400 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-50 text-sm">
                      {paginatedSales.map((sale) => (
                        <tr key={sale.id} className="hover:bg-gray-50/30 transition-colors group">
                          <td className="px-6 py-4">
                            <span className="font-black text-gray-900 uppercase">
                              {sale.displayId || (sale.orderNumber ? `VK-${sale.orderNumber}` : `VK-${String(sale.id).replace(/\D/g, '').slice(0, 6)}`)}
                            </span>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span className="text-xs text-gray-600 font-bold">
                              {format(new Date(sale.createdAt), 'dd MMM yyyy, hh:mm a')}
                            </span>
                          </td>
                          <td className="px-6 py-4">
                            <span className={`text-[10px] font-black uppercase tracking-widest px-2 py-1 rounded-lg ${sale.coverageType === 'MORNING' ? 'bg-amber-50 text-amber-600 border border-amber-100' : 'bg-indigo-50 text-indigo-600 border border-indigo-100'}`}>
                              {sale.coverageType || 'N/A'}
                            </span>
                          </td>
                          <td className="px-6 py-4">
                            <div className="flex flex-col min-w-[120px]">
                              <span className="font-bold text-gray-800 whitespace-nowrap truncate">
                                {sale.user?.name || sale.userName || 'System'}
                              </span>
                              <span className="text-[9px] text-gray-500 font-black uppercase tracking-widest whitespace-nowrap truncate">
                                {sale.vehicle?.vehicleNumber || 'No Vehicle'}
                              </span>
                            </div>
                          </td>
                          <td className="px-6 py-4">
                            <span className="font-black text-emerald-700">₹{sale.totalAmount.toLocaleString()}</span>
                          </td>
                          <td className="px-6 py-4">
                            <span className="text-[10px] bg-emerald-50 text-emerald-600 px-2.5 py-1 rounded-full font-black uppercase tracking-widest border border-emerald-100">
                              {sale.paymentMode || 'Pending'}
                            </span>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="flex items-center justify-end">
                              <button
                                onClick={() => setViewingOrder(sale)}
                                className="flex items-center gap-1 px-3 py-1.5 bg-emerald-50 text-emerald-600 rounded-xl font-black text-[10px] uppercase tracking-widest hover:bg-emerald-600 hover:text-white transition-all whitespace-nowrap"
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

      {/* ========== PROFESSIONAL PRINTABLE INVOICE TEMPLATE (MIRRORS PDF DESIGN) ========== */}
      {viewingOrder && (
        <div className="printable-invoice hidden print:block bg-white text-gray-900 font-sans p-0">
          {/* Executive Header Bar */}
          <div className="bg-[#10b981] p-8 flex justify-between items-center text-white" style={{ backgroundColor: '#10b981', color: 'white', printColorAdjust: 'exact', WebkitPrintColorAdjust: 'exact' }}>
            <div>
              <h1 className="text-4xl font-black tracking-tighter uppercase mb-1">VillagKart</h1>
              <p className="text-[10px] font-bold uppercase tracking-widest opacity-90">Premium Rural Commerce Solutions</p>
            </div>
            <div className="text-right">
              <h2 className="text-2xl font-black uppercase tracking-tight">Tax Invoice</h2>
              <p className="text-xs font-bold opacity-90">#{viewingOrder.displayId || viewingOrder.orderNumber}</p>
            </div>
          </div>

          <div className="p-8 space-y-8">
            <div className="grid grid-cols-2 gap-12" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '3rem' }}>
              <div className="space-y-4">
                <h3 className="text-[10px] font-black text-[#10b981] uppercase tracking-[0.2em] border-b border-emerald-50 pb-2">Transaction Details</h3>
                <div className="space-y-2 text-xs">
                  <div className="flex justify-between border-b border-gray-50 pb-1">
                    <span className="font-bold text-gray-400">Invoice ID:</span>
                    <span className="font-black">{viewingOrder.displayId || viewingOrder.orderNumber}</span>
                  </div>
                  <div className="flex justify-between border-b border-gray-50 pb-1">
                    <span className="font-bold text-gray-400">Date:</span>
                    <span className="font-bold">{format(new Date(viewingOrder.createdAt), 'dd MMMM yyyy')}</span>
                  </div>
                  <div className="flex justify-between border-b border-gray-50 pb-1">
                    <span className="font-bold text-gray-400">Time:</span>
                    <span className="font-bold">{format(new Date(viewingOrder.createdAt), 'hh:mm a')}</span>
                  </div>
                  <div className="flex justify-between border-b border-gray-50 pb-1">
                    <span className="font-bold text-gray-400">Session:</span>
                    <span className="font-bold uppercase">{viewingOrder.coverageType || 'Morning'}</span>
                  </div>
                </div>
              </div>

              <div className="space-y-4">
                <h3 className="text-[10px] font-black text-[#10b981] uppercase tracking-[0.2em] border-b border-emerald-50 pb-2">Stakeholder Information</h3>
                <div className="space-y-2 text-xs">
                  <div className="flex justify-between border-b border-gray-50 pb-1">
                    <span className="font-bold text-gray-400">Customer:</span>
                    <span className="font-black uppercase">{viewingOrder.customerName || 'Walk-in Customer'}</span>
                  </div>
                  <div className="flex justify-between border-b border-gray-50 pb-1">
                    <span className="font-bold text-gray-400">Agent (VGE):</span>
                    <span className="font-bold uppercase">{viewingOrder.user?.name || viewingOrder.userName}</span>
                  </div>
                  <div className="flex justify-between border-b border-gray-50 pb-1">
                    <span className="font-bold text-gray-400">Route:</span>
                    <span className="font-bold uppercase">{viewingOrder.route?.routeName || 'N/A'}</span>
                  </div>
                  <div className="flex justify-between border-b border-gray-50 pb-1">
                    <span className="font-bold text-gray-400">Vehicle:</span>
                    <span className="font-bold uppercase">{viewingOrder.vehicle?.vehicleNumber || 'N/A'}</span>
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-slate-50 rounded-2xl p-6 border border-slate-100 flex justify-between items-center" style={{ backgroundColor: '#f8fafc', padding: '1.5rem', borderRadius: '1rem' }}>
              <div>
                <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">Final Bill Amount</p>
                <h4 className="text-3xl font-black text-slate-900 tracking-tighter">₹{(viewingOrder.totalAmount || 0).toFixed(2)}</h4>
              </div>
              <div className="text-right">
                <span className="text-xs font-black text-slate-700 bg-white px-3 py-1 rounded-lg border border-slate-100 uppercase">
                  {viewingOrder.paymentMode}: ₹{viewingOrder.totalAmount.toFixed(2)}
                </span>
              </div>
            </div>

            <div className="space-y-4">
               <h3 className="text-[10px] font-black text-[#10b981] uppercase tracking-[0.2em] border-b border-emerald-50 pb-2">Itemized Inventory</h3>
               <table className="w-full text-left">
                  <thead>
                    <tr className="bg-slate-100 text-slate-600">
                      <th className="p-3 text-[9px] font-black uppercase tracking-widest">Product Description</th>
                      <th className="p-3 text-[9px] font-black uppercase tracking-widest text-center">Qty</th>
                      <th className="p-3 text-[9px] font-black uppercase tracking-widest text-right">Price</th>
                      <th className="p-3 text-[9px] font-black uppercase tracking-widest text-right">Subtotal</th>
                    </tr>
                  </thead>
                  <tbody className="text-xs">
                    {viewingOrder.items?.map((item, idx) => (
                      <tr key={idx} className={idx % 2 === 0 ? 'bg-white' : 'bg-slate-50/50'}>
                        <td className="p-3 border-b border-slate-50">
                          <p className="font-black uppercase text-slate-900">{item.product?.name || item.productName}</p>
                        </td>
                        <td className="p-3 border-b border-slate-50 text-center font-bold">{item.quantity}</td>
                        <td className="p-3 border-b border-slate-50 text-right">₹{item.price.toFixed(2)}</td>
                        <td className="p-3 border-b border-slate-50 text-right font-black">₹{(item.price * item.quantity).toFixed(2)}</td>
                      </tr>
                    ))}
                  </tbody>
               </table>
            </div>

            <div className="mt-20 flex justify-between items-end pt-8 border-t border-slate-100">
               <div className="max-w-xs">
                 <p className="text-[10px] font-black text-emerald-600 uppercase mt-4">Thank you for your business!</p>
               </div>
               <div className="text-center">
                 <div className="w-40 h-[1px] bg-slate-900 mb-2 mx-auto"></div>
                 <p className="text-[9px] font-black text-slate-900 uppercase">Authorized Signatory</p>
               </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
