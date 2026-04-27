import React, { useState, useEffect } from 'react';
import { 
  BarChart3, 
  Truck, 
  Package, 
  Calendar, 
  CheckCircle2, 
  AlertTriangle,
  ArrowRight,
  TrendingUp,
  Download,
  Loader2,
  CreditCard,
  Target,
  ArrowUpRight,
  ShoppingCart,
  Map,
  MapPin,
  Store,
  ArrowLeft,
  DollarSign,
  Activity,
  Globe,
  Users,
  ChevronLeft,
  ChevronRight,
  FileText,
  RotateCcw,
  Zap,
  Layers,
  PieChart,
  LayoutGrid,
  Navigation
} from 'lucide-react';
import { 
  AreaChart, 
  Area, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  BarChart,
  Bar,
  Cell,
  Pie,
  PieChart as RePieChart
} from 'recharts';
import { MapContainer, TileLayer, Marker, Popup, Polyline } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';
import adminAPI from '../../services/adminService';
import toast from 'react-hot-toast';
import { motion, AnimatePresence } from 'framer-motion';
import { useSearchParams, useLocation } from 'react-router-dom';
import StoreSelector from './StoreSelector';
import { useUserStore } from '../../store/userStore';
import { format } from 'date-fns';
import { Printer } from 'lucide-react';
import jsPDF from 'jspdf';

const formatMinutesToHours = (totalMinutes) => {
    const absMinutes = Math.abs(totalMinutes);
    const h = Math.floor(absMinutes / 60);
    const m = absMinutes % 60;
    
    let parts = [];
    if (h > 0) parts.push(`${h} hour${h > 1 ? 's' : ''}`);
    if (m > 0) parts.push(`${m} minute${m > 1 ? 's' : ''}`);
    
    if (parts.length === 0) return "0 minutes";
    return parts.join(' and ');
};

export default function AdminReports() {
  const [activeTab, setActiveTab] = useState('overview');
  const [subTab, setSubTab] = useState('live-map');
  
  // Data States
  const [reportData, setReportData] = useState(null);
  const [trackingReportsData, setTrackingReportsData] = useState({});
  const [stores, setStores] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [searchParams, setSearchParams] = useSearchParams();
  const storeFilterId = searchParams.get('storeId');
  const location = useLocation();
  const isTenantRoute = location.pathname.includes('/tenant/');
  
  const COLORS = ['#10b981', '#f97316', '#3b82f6', '#8b5cf6', '#ec4899', '#f59e0b'];

  const generateReportPDF = (shouldPrint = false) => {
    try {
      if (!reportData) { toast.error('No data to export'); return; }
      const doc = new jsPDF('p', 'mm', 'a4');
      const module = reportModules.find(m => m.id === activeTab);
      const title = (module?.name || activeTab).toUpperCase() + ' REPORT';
      const now = format(new Date(), 'PPP p');
      const pw = 210; const margin = 8;

      // ── Header ──
      const drawHeader = (pg) => {
        doc.setFillColor(15, 23, 42);
        doc.rect(0, 0, pw, 32, 'F');
        doc.setFillColor(16, 185, 129);
        doc.rect(0, 32, pw, 1.5, 'F');
        doc.setTextColor(255, 255, 255);
        doc.setFontSize(16); doc.setFont('helvetica', 'bold');
        doc.text(title, pw / 2, 14, { align: 'center' });
        doc.setFontSize(7); doc.setFont('helvetica', 'normal');
        doc.text(`GENERATED: ${now}  |  VILLAGKART ENTERPRISE AUDIT`, pw / 2, 22, { align: 'center' });
        doc.text(`PAGE ${pg}`, pw / 2, 28, { align: 'center' });
      };

      // ── Table Helper ──
      const drawTable = (headers, rows, colWidths) => {
        let y = 42; let pg = 1; drawHeader(pg);
        const totalW = colWidths.reduce((a, b) => a + b, 0);
        const xs = [margin]; colWidths.forEach((w, i) => { if (i < colWidths.length - 1) xs.push(xs[i] + w); });

        // Column headers
        doc.setFillColor(241, 245, 249);
        doc.rect(margin, y - 5, totalW, 8, 'F');
        doc.setFontSize(7); doc.setFont('helvetica', 'bold'); doc.setTextColor(30, 41, 59);
        headers.forEach((h, i) => doc.text(h, xs[i] + 2, y));
        y += 8; doc.setFont('helvetica', 'normal'); doc.setFontSize(6.5);

        rows.forEach((row, idx) => {
          if (y > 278) {
            pg++; doc.addPage(); drawHeader(pg); y = 42;
            doc.setFillColor(241, 245, 249);
            doc.rect(margin, y - 5, totalW, 8, 'F');
            doc.setFontSize(7); doc.setFont('helvetica', 'bold'); doc.setTextColor(30, 41, 59);
            headers.forEach((h, i) => doc.text(h, xs[i] + 2, y));
            y += 8; doc.setFont('helvetica', 'normal'); doc.setFontSize(6.5);
          }
          if (idx % 2 === 1) { doc.setFillColor(248, 250, 252); doc.rect(margin, y - 4, totalW, 6, 'F'); }
          doc.setTextColor(51, 65, 85);
          row.forEach((cell, i) => doc.text(String(cell || '').slice(0, Math.floor(colWidths[i] / 1.8)), xs[i] + 2, y));
          y += 6;
        });

        // Footer
        const pages = doc.internal.getNumberOfPages();
        for (let i = 1; i <= pages; i++) {
          doc.setPage(i); doc.setFontSize(6.5); doc.setTextColor(160, 160, 160);
          doc.text(`Page ${i} of ${pages}  |  VillagKart Enterprise Audit  |  ${now}`, pw / 2, 292, { align: 'center' });
        }
      };

      // ── Build rows per report type ──
      const safeNum = (v) => v != null ? Number(v).toLocaleString() : '0';
      const safeStr = (v, max) => String(v || 'N/A').slice(0, max || 30);
      const safeDateShort = (d) => { try { return format(new Date(d), 'dd-MM-yy'); } catch { return 'N/A'; } };

      switch (activeTab) {
        case 'overview': {
          const d = reportData;
          drawHeader(1); let y = 44;
          doc.setFontSize(9); doc.setFont('helvetica', 'bold'); doc.setTextColor(30, 41, 59);
          doc.text('SUMMARY SNAPSHOT', margin, y); y += 8;
          doc.setFontSize(8); doc.setFont('helvetica', 'normal');
          const stats = [
            ['Total Revenue', `Rs ${safeNum(d.daily?.totalSales)}`],
            ['Net Profit', `Rs ${safeNum(d.daily?.totalProfit)}`],
            ['Orders Today', safeNum(d.daily?.totalOrders)],
          ];
          stats.forEach(([k, v]) => { doc.text(`${k}: ${v}`, margin + 4, y); y += 6; });
          y += 6; doc.setFont('helvetica', 'bold'); doc.text('TOP PRODUCTS', margin, y); y += 7;
          const tpHeaders = ['PRODUCT', 'QTY', 'REVENUE', 'PROFIT'];
          const tpWidths = [80, 30, 40, 44];
          const xs = [margin]; tpWidths.forEach((w, i) => { if (i < tpWidths.length - 1) xs.push(xs[i] + w); });
          doc.setFillColor(241, 245, 249); doc.rect(margin, y - 5, 194, 8, 'F');
          doc.setFontSize(7); doc.setTextColor(30, 41, 59);
          tpHeaders.forEach((h, i) => doc.text(h, xs[i] + 2, y));
          y += 8; doc.setFont('helvetica', 'normal'); doc.setFontSize(6.5);
          (d.topProducts || []).forEach((p, idx) => {
            if (idx % 2 === 1) { doc.setFillColor(248, 250, 252); doc.rect(margin, y - 4, 194, 6, 'F'); }
            doc.setTextColor(51, 65, 85);
            doc.text(safeStr(p.name, 40), xs[0] + 2, y);
            doc.text(safeNum(p.totalQty), xs[1] + 2, y);
            doc.text(`Rs ${safeNum(p.totalRevenue)}`, xs[2] + 2, y);
            doc.text(`Rs ${safeNum(p.totalProfit)}`, xs[3] + 2, y);
            y += 6;
          });
          doc.setFontSize(6.5); doc.setTextColor(160, 160, 160);
          doc.text(`Page 1 of 1  |  VillagKart Enterprise Audit  |  ${now}`, pw / 2, 292, { align: 'center' });
          break;
        }
        case 'item-wise':
          drawTable(['ITEM NAME', 'QTY SOLD', 'REVENUE'],
            (Array.isArray(reportData) ? reportData : []).map(r => [safeStr(r.itemName, 50), safeNum(r.totalQty), `Rs ${safeNum(r.revenue)}`]),
            [100, 40, 54]);
          break;
        case 'category-wise':
          drawTable(['CATEGORY', 'ORDERS', 'TOTAL SALES'],
            (Array.isArray(reportData) ? reportData : []).map(r => [safeStr(r.name, 50), safeNum(r.orderCount), `Rs ${safeNum(r.totalSales)}`]),
            [100, 40, 54]);
          break;
        case 'day-wise':
          drawTable(['DATE', 'ORDERS', 'REVENUE', 'PROFIT'],
            (Array.isArray(reportData) ? reportData : []).map(r => [safeStr(r.date, 20), safeNum(r.orders), `Rs ${safeNum(r.revenue)}`, `Rs ${safeNum(r.profit)}`]),
            [50, 40, 52, 52]);
          break;
        case 'route-village': {
          const rts = reportData.routes || []; const vils = reportData.villages || [];
          drawTable(['ROUTE', 'TOTAL SALES', 'ORDERS'],
            rts.map(r => [safeStr(r.routeName, 40), `Rs ${safeNum(r.totalSales)}`, safeNum(r.orderCount)]),
            [90, 54, 50]);
          // append village page
          doc.addPage();
          const pg2 = doc.internal.getNumberOfPages();
          drawTable(['VILLAGE', 'SESSION', 'ORDERS', 'SALES'],
            vils.map(v => [safeStr(v.villageName, 30), safeStr(v.coverageType, 10), safeNum(v.orderCount), `Rs ${safeNum(v.totalSales)}`]),
            [60, 40, 40, 54]);
          break;
        }
        case 'agent-performance':
          drawTable(['AGENT', 'SALES', 'TARGET', 'ACHIEVEMENT'],
            (Array.isArray(reportData) ? reportData : []).map(a => [safeStr(a.name, 25), `Rs ${safeNum(a.totalSales)}`, `Rs ${safeNum(a.dailyTarget)}`, `${a.percentage || 0}%`]),
            [60, 44, 44, 46]);
          break;
        case 'location-tracking':
          drawTable(['AGENT', 'LOCATION', 'TYPE', 'TIME'],
            (Array.isArray(reportData) ? reportData : []).map(l => [safeStr(l.user?.name, 25), safeStr(l.villageName || 'In-Transit', 25), safeStr(l.checkInType, 15), l.createdAt ? format(new Date(l.createdAt), 'hh:mm a') : 'N/A']),
            [55, 55, 40, 44]);
          break;
        case 'vehicle-wise':
          drawTable(['VEHICLE', 'DISPLAY ID', 'REVENUE', 'ORDERS'],
            (Array.isArray(reportData) ? reportData : []).map(v => [safeStr(v.vehicleNumber, 20), safeStr(v.displayId, 15), `Rs ${safeNum(v.totalSales)}`, safeNum(v.orderCount)]),
            [55, 45, 50, 44]);
          break;
        case 'payment-mode': {
          const safeData = (reportData && typeof reportData === 'object' && !Array.isArray(reportData)) ? reportData : {};
          const entries = Object.entries(safeData);
          drawTable(['PAYMENT MODE', 'AMOUNT'],
            entries.map(([k, v]) => [String(k).toUpperCase(), `Rs ${safeNum(v)}`]),
            [100, 94]);
          break;
        }
        case 'returns':
          drawTable(['ORDER ID', 'PRODUCT', 'QTY', 'AMOUNT', 'DATE'],
            (Array.isArray(reportData) ? reportData : []).map(r => [safeStr(r.order?.displayId, 15), safeStr(r.product?.name, 25), `-${r.quantity || 0}`, `Rs ${safeNum(r.amount)}`, safeDateShort(r.createdAt)]),
            [36, 50, 24, 40, 44]);
          break;
        case 'damages': {
          const s = reportData.summary || {};
          const types = Object.entries(reportData.lossByType || {});
          drawHeader(1); let y = 44;
          doc.setFontSize(9); doc.setFont('helvetica', 'bold'); doc.setTextColor(30, 41, 59);
          doc.text('DAMAGE SUMMARY', margin, y); y += 8;
          doc.setFontSize(8); doc.setFont('helvetica', 'normal');
          [`Total Loss: Rs ${safeNum(s.totalLoss)}`, `Deductions: Rs ${safeNum(s.totalDeductions)}`, `Reports: ${safeNum(s.total)} (Approved: ${safeNum(s.approved)}, Pending: ${safeNum(s.pending)})`].forEach(t => { doc.text(t, margin + 4, y); y += 6; });
          y += 6; doc.setFont('helvetica', 'bold'); doc.text('LOSS BY TYPE', margin, y); y += 7;
          doc.setFillColor(241, 245, 249); doc.rect(margin, y - 5, 194, 8, 'F');
          doc.setFontSize(7);
          ['TYPE', 'INCIDENTS', 'LOSS'].forEach((h, i) => doc.text(h, margin + 2 + i * 65, y));
          y += 8; doc.setFont('helvetica', 'normal'); doc.setFontSize(6.5);
          types.forEach(([type, data], idx) => {
            if (idx % 2 === 1) { doc.setFillColor(248, 250, 252); doc.rect(margin, y - 4, 194, 6, 'F'); }
            doc.setTextColor(51, 65, 85);
            doc.text(type.replace('_', ' '), margin + 2, y);
            doc.text(String(data.count), margin + 67, y);
            doc.text(`Rs ${safeNum(data.loss)}`, margin + 132, y);
            y += 6;
          });
          doc.setFontSize(6.5); doc.setTextColor(160, 160, 160);
          doc.text(`Page 1 of 1  |  VillagKart Enterprise Audit  |  ${now}`, pw / 2, 292, { align: 'center' });
          break;
        }
        case 'sessions':
          drawTable(['SESSION', 'TOTAL SALES', 'ORDERS'],
            (Array.isArray(reportData) ? reportData : []).map(s => [safeStr(s.session, 15), `Rs ${safeNum(s.totalSales)}`, safeNum(s.orderCount)]),
            [80, 54, 60]);
          break;
        case 'invoices':
          drawTable(['INV ID', 'CUSTOMER', 'AMOUNT', 'MODE', 'STATUS'],
            (Array.isArray(reportData) ? reportData : []).map(o => [safeStr(o.displayId, 15), safeStr(o.customerName || 'Walk-in', 20), `Rs ${safeNum(o.totalAmount)}`, safeStr(o.paymentMode, 8), safeStr(o.status, 10)]),
            [38, 44, 40, 36, 36]);
          break;
        default:
          toast.error('Export not available for this report'); return;
      }

      if (shouldPrint) {
        doc.autoPrint();
        window.open(doc.output('bloburl'), '_blank');
      } else {
        doc.save(`${activeTab}_Report_${format(new Date(), 'dd_MMM_yyyy')}.pdf`);
        toast.success('Report downloaded successfully');
      }
    } catch (err) {
      console.error('PDF generation error:', err);
      toast.error('Failed to generate report');
    }
  };

  const reportModules = [
    { id: 'overview', name: 'Overview', icon: BarChart3, color: 'text-emerald-600', bg: 'bg-emerald-50' },
    { id: 'item-wise', name: 'Item-wise Sales', icon: Package, color: 'text-blue-600', bg: 'bg-blue-50' },
    { id: 'category-wise', name: 'Category-wise', icon: Layers, color: 'text-purple-600', bg: 'bg-purple-50' },
    { id: 'day-wise', name: 'Day-wise Sales', icon: Calendar, color: 'text-orange-600', bg: 'bg-orange-50' },
    { id: 'route-village', name: 'Route & Village', icon: MapPin, color: 'text-indigo-600', bg: 'bg-indigo-50' },
    { id: 'agent-performance', name: 'Agent Performance', icon: Users, color: 'text-cyan-600', bg: 'bg-cyan-50' },
    { id: 'location-tracking', name: 'Location Tracking', icon: Navigation, color: 'text-rose-600', bg: 'bg-rose-50' },
    { id: 'vehicle-wise', name: 'Substore (Vehicle)', icon: Truck, color: 'text-slate-600', bg: 'bg-slate-50' },
    { id: 'payment-mode', name: 'Payment Mode', icon: CreditCard, color: 'text-pink-600', bg: 'bg-pink-50' },
    { id: 'returns', name: 'Return Report', icon: RotateCcw, color: 'text-red-600', bg: 'bg-red-50' },
    { id: 'damages', name: 'Damage Report', icon: AlertTriangle, color: 'text-amber-600', bg: 'bg-amber-50' },
    { id: 'sessions', name: 'Session Report', icon: Zap, color: 'text-yellow-600', bg: 'bg-yellow-50' },
    { id: 'invoices', name: 'Invoice Report', icon: FileText, color: 'text-emerald-600', bg: 'bg-emerald-50' },
  ];

  const fetchData = async () => {
    setIsLoading(true);
    setReportData(null); // Clear previous data to prevent type crashes
    try {
      const params = { storeId: storeFilterId };
      let res;

      switch(activeTab) {
        case 'overview':
          const [trendRes, topRes, dailyRes] = await Promise.all([
            adminAPI.getTrendsReport({ days: 7, ...params }),
            adminAPI.getTopProducts(params),
            adminAPI.getDailyReport(params)
          ]);
          setReportData({ trends: trendRes.data, topProducts: topRes.data, daily: dailyRes.data });
          break;
        case 'item-wise':
          res = await adminAPI.getItemReport(params);
          setReportData(res.data.data);
          break;
        case 'category-wise':
          res = await adminAPI.getCategoryReport(params);
          setReportData(res.data);
          break;
        case 'day-wise':
          res = await adminAPI.getTrendsReport({ days: 30, ...params });
          setReportData(res.data);
          break;
        case 'route-village':
          const [rRes, vRes] = await Promise.all([
            adminAPI.getRouteWiseReport(params),
            adminAPI.getVillageWiseReport(params)
          ]);
          setReportData({ routes: rRes.data, villages: vRes.data });
          break;
        case 'agent-performance':
          res = await adminAPI.getAgentPerformance(params);
          setReportData(res.data);
          break;
        case 'location-tracking':
          const [locRes, visitRes, devRes] = await Promise.all([
            adminAPI.getLocationCheckIns(),
            adminAPI.getTrackingVillageVisits(params),
            adminAPI.getTrackingTimeDeviation(params)
          ]);
          setReportData(locRes.data);
          setTrackingReportsData({
            villageVisits: visitRes.data,
            timeDeviation: devRes.data
          });
          break;
        case 'vehicle-wise':
          res = await adminAPI.getVehicleAllPerformance(params);
          setReportData(res.data);
          break;
        case 'payment-mode':
          res = await adminAPI.getDailyReport(params);
          setReportData(res.data.paymentSplits);
          break;
        case 'returns':
          res = await adminAPI.getReturnReport(params);
          setReportData(res.data);
          break;
        case 'damages':
          res = await adminAPI.getDamageReports(params);
          setReportData(res.data);
          break;
        case 'sessions':
          res = await adminAPI.getSessionReport(params);
          setReportData(res.data);
          break;
        case 'invoices':
          res = await adminAPI.getSales({ limit: 50, ...params });
          setReportData(res.data.orders);
          break;
        default:
          break;
      }
    } catch (error) {
      console.error('Fetch error:', error);
      toast.error(`Failed to load ${activeTab} data`);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [activeTab, storeFilterId]);

  useEffect(() => {
    const loadStores = async () => {
      try {
        const { data } = await adminAPI.getStores();
        if (data?.success) setStores(data.data);
      } catch (err) {}
    };
    loadStores();
  }, []);

  const StatCard = ({ label, value, icon: Icon, colorClass }) => (
    <div className="bg-white p-5 rounded-3xl border border-gray-100 shadow-sm hover:shadow-md transition-all group">
      <div className="flex justify-between items-start mb-3">
        <div className={`p-3 rounded-2xl ${colorClass} bg-opacity-10`}>
          <Icon size={20} className={colorClass} />
        </div>
        <div className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Live Audit</div>
      </div>
      <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">{label}</p>
      <h3 className="text-2xl font-black text-gray-900 tracking-tighter">{value}</h3>
    </div>
  );

  const renderContent = () => {
    if (isLoading) {
      return (
        <div className="flex flex-col items-center justify-center min-h-[50vh] gap-4">
          <div className="relative">
            <div className="w-16 h-16 border-4 border-emerald-100 border-t-emerald-600 rounded-full animate-spin" />
            <div className="absolute inset-0 flex items-center justify-center">
              <Zap size={24} className="text-emerald-600 animate-pulse" />
            </div>
          </div>
          <p className="text-emerald-900/40 text-[10px] font-black uppercase tracking-[0.2em] animate-pulse">Syncing Audit Stream...</p>
        </div>
      );
    }

    if (!reportData) return (
        <div className="flex flex-col items-center justify-center min-h-[40vh] text-gray-300">
            <LayoutGrid size={48} className="opacity-20 mb-4" />
            <p className="text-xs font-black uppercase tracking-widest">No Data Available For Selection</p>
        </div>
    );

    switch(activeTab) {
      case 'overview':
        return (
          <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <StatCard label="Total Revenue" value={`₹${reportData.daily?.totalSales?.toLocaleString() || 0}`} icon={TrendingUp} colorClass="text-emerald-600 bg-emerald-50" />
              <StatCard label="Net Profit" value={`₹${reportData.daily?.totalProfit?.toLocaleString() || 0}`} icon={Target} colorClass="text-orange-600 bg-orange-50" />
              <StatCard label="Orders Today" value={reportData.daily?.totalOrders || 0} icon={ShoppingCart} colorClass="text-blue-600 bg-blue-50" />
            </div>

            <div className="bg-white p-6 rounded-[2.5rem] border border-gray-100 shadow-sm">
               <div className="flex items-center justify-between mb-8">
                 <div>
                    <h3 className="text-lg font-black text-gray-900 tracking-tight">Performance Analytics</h3>
                    <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mt-1">7-Day Revenue & Profit Distribution</p>
                 </div>
                 <div className="flex gap-4">
                    <div className="flex items-center gap-2">
                        <div className="w-3 h-3 rounded-full bg-emerald-500 shadow-sm shadow-emerald-200" />
                        <span className="text-[10px] font-black text-gray-400 uppercase">Revenue</span>
                    </div>
                    <div className="flex items-center gap-2">
                        <div className="w-3 h-3 rounded-full bg-orange-500 shadow-sm shadow-orange-200" />
                        <span className="text-[10px] font-black text-gray-400 uppercase">Profit</span>
                    </div>
                 </div>
               </div>
               <div className="h-[300px]">
                 <ResponsiveContainer width="100%" height="100%" minWidth={0} minHeight={0}>
                   <AreaChart data={reportData.trends}>
                     <defs>
                       <linearGradient id="colorRev" x1="0" y1="0" x2="0" y2="1">
                         <stop offset="5%" stopColor="#10b981" stopOpacity={0.2}/>
                         <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                       </linearGradient>
                       <linearGradient id="colorProf" x1="0" y1="0" x2="0" y2="1">
                         <stop offset="5%" stopColor="#f97316" stopOpacity={0.2}/>
                         <stop offset="95%" stopColor="#f97316" stopOpacity={0}/>
                       </linearGradient>
                     </defs>
                     <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f3f4f6" />
                     <XAxis dataKey="date" axisLine={false} tickLine={false} tick={{fontSize: 9, fontWeight: 800, fill: '#9ca3af'}} />
                     <YAxis axisLine={false} tickLine={false} tick={{fontSize: 9, fontWeight: 800, fill: '#9ca3af'}} />
                     <Tooltip 
                        contentStyle={{ borderRadius: '1.5rem', border: 'none', boxShadow: '0 20px 25px -5px rgb(0 0 0 / 0.1)', padding: '15px' }}
                        itemStyle={{ fontSize: '12px', fontWeight: 900, textTransform: 'uppercase' }}
                     />
                     <Area type="monotone" dataKey="revenue" stroke="#10b981" strokeWidth={4} fill="url(#colorRev)" />
                     <Area type="monotone" dataKey="profit" stroke="#f97316" strokeWidth={4} fill="url(#colorProf)" />
                   </AreaChart>
                 </ResponsiveContainer>
               </div>
            </div>

            <div className="bg-white p-6 rounded-[2.5rem] border border-gray-100 shadow-sm">
                <h3 className="text-lg font-black text-gray-900 tracking-tight mb-6">Top Contributing Products</h3>
                <div className="space-y-4">
                    {reportData.topProducts?.map((p, i) => (
                        <div key={i} className="flex items-center justify-between p-3 rounded-2xl hover:bg-gray-50 transition-colors border border-transparent hover:border-gray-100">
                            <div className="flex items-center gap-4">
                                <div className="w-12 h-12 rounded-xl bg-gray-50 flex items-center justify-center border border-gray-100">
                                    {p.image ? <img src={p.image} className="w-full h-full object-cover rounded-xl" /> : <Package className="text-gray-300" />}
                                </div>
                                <div>
                                    <p className="text-sm font-black text-gray-900">{p.name}</p>
                                    <p className="text-[10px] font-bold text-emerald-600 uppercase tracking-tighter">{p.totalQty} Units Distributed</p>
                                </div>
                            </div>
                            <div className="text-right">
                                <p className="text-sm font-black text-gray-900 tracking-tighter italic">₹{(p.totalRevenue || 0).toLocaleString()}</p>
                                <p className="text-[10px] font-bold text-gray-400">Profit: ₹{(p.totalProfit || 0).toLocaleString()}</p>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
          </div>
        );
      
      case 'item-wise':
      case 'category-wise':
      case 'day-wise':
        const columns = {
            'item-wise': ['Item Name', 'Quantity Sold', 'Total Revenue'],
            'category-wise': ['Category', 'Orders', 'Total Sales'],
            'day-wise': ['Date', 'Orders', 'Revenue', 'Profit']
        }[activeTab];

        return (
          <div className="bg-white rounded-[2.5rem] border border-gray-100 shadow-sm overflow-hidden animate-in fade-in duration-500">
             <div className="p-6 border-b border-gray-50 flex justify-between items-center">
                 <h3 className="text-lg font-black text-gray-900 tracking-tight uppercase">{activeTab.replace('-', ' ')}</h3>
                 <button onClick={fetchData} className="p-2 rounded-xl bg-emerald-50 text-emerald-600 hover:bg-emerald-600 hover:text-white transition-all">
                    <RotateCcw size={18} />
                 </button>
             </div>
             <div className="overflow-x-auto">
               <table className="w-full text-left">
                 <thead>
                   <tr className="bg-gray-50/50">
                     {columns.map(c => <th key={c} className="px-6 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest">{c}</th>)}
                   </tr>
                 </thead>
                 <tbody className="divide-y divide-gray-50">
                   {Array.isArray(reportData) && reportData.map((item, i) => (
                     <tr key={i} className="hover:bg-gray-50/50 transition-colors">
                       {activeTab === 'item-wise' && (
                         <>
                           <td className="px-6 py-4 text-sm font-black text-gray-800">{item.itemName}</td>
                           <td className="px-6 py-4 text-sm font-bold text-gray-600">{item.totalQty}</td>
                           <td className="px-6 py-4 text-sm font-black text-emerald-600 italic">₹{(item.revenue || 0).toLocaleString()}</td>
                         </>
                       )}
                       {activeTab === 'category-wise' && (
                         <>
                           <td className="px-6 py-4 text-sm font-black text-gray-800">{item.name}</td>
                           <td className="px-6 py-4 text-sm font-bold text-gray-600">{item.orderCount}</td>
                           <td className="px-6 py-4 text-sm font-black text-purple-600 italic">₹{(item.totalSales || 0).toLocaleString()}</td>
                         </>
                       )}
                       {activeTab === 'day-wise' && (
                         <>
                           <td className="px-6 py-4 text-sm font-black text-gray-800">{item.date}</td>
                           <td className="px-6 py-4 text-sm font-bold text-gray-600">{item.orders}</td>
                           <td className="px-6 py-4 text-sm font-black text-emerald-600 italic">₹{(item.revenue || 0).toLocaleString()}</td>
                           <td className="px-6 py-4 text-sm font-bold text-orange-600">₹{(item.profit || 0).toLocaleString()}</td>
                         </>
                       )}
                     </tr>
                   ))}
                 </tbody>
               </table>
             </div>
          </div>
        );

      case 'route-village':
        return (
            <div className="space-y-10 animate-in fade-in duration-500">
                {/* Route Leaderboard */}
                <div className="bg-white p-8 rounded-[2.5rem] border border-gray-100 shadow-sm">
                    <h3 className="text-lg font-black text-gray-900 tracking-tight mb-8 uppercase">Route Leaderboard</h3>
                    <div className="h-[250px] w-full">
                        <ResponsiveContainer width="100%" height="100%" minWidth={0} minHeight={0}>
                            <BarChart data={reportData.routes} layout="vertical" margin={{ left: 10, right: 30 }}>
                                <XAxis type="number" hide />
                                <YAxis dataKey="routeName" type="category" axisLine={false} tickLine={false} tick={{ fontSize: 10, fontWeight: 900, fill: '#374151' }} width={120} />
                                <Tooltip cursor={{ fill: '#f9fafb' }} contentStyle={{ borderRadius: '1rem', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }} />
                                <Bar dataKey="totalSales" radius={[0, 10, 10, 0]} barSize={20}>
                                    {reportData.routes?.map((entry, index) => (
                                        <Cell key={`cell-${index}`} fill={index % 2 === 0 ? '#10b981' : '#f97316'} />
                                    ))}
                                </Bar>
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                {/* Village Audit Table */}
                <div className="bg-white rounded-[2.5rem] border border-gray-100 shadow-sm overflow-hidden">
                    <div className="p-6 border-b border-gray-50">
                        <h3 className="text-lg font-black text-gray-900 tracking-tight uppercase">Village Sales Matrix</h3>
                    </div>
                    <div className="overflow-x-auto">
                        <table className="w-full text-left">
                            <thead>
                                <tr className="bg-gray-50/50">
                                    <th className="px-6 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest">Village</th>
                                    <th className="px-6 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest">Session</th>
                                    <th className="px-6 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest">Orders</th>
                                    <th className="px-6 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest">Total Sales</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-50">
                                {reportData.villages?.map((v, i) => (
                                    <tr key={i} className="hover:bg-gray-50 transition-colors">
                                        <td className="px-6 py-4 text-sm font-black text-gray-800">{v.villageName}</td>
                                        <td className="px-6 py-4">
                                            <span className={`text-[9px] font-black uppercase px-2 py-0.5 rounded ${v.coverageType === 'MORNING' ? 'bg-orange-100 text-orange-600' : 'bg-indigo-100 text-indigo-600'}`}>
                                                {v.coverageType}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 text-sm font-bold text-gray-600">{v.orderCount}</td>
                                        <td className="px-6 py-4 text-sm font-black text-indigo-600 italic">₹{(v.totalSales || 0).toLocaleString()}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
        );

      case 'agent-performance':
        return (
            <div className="bg-white p-8 rounded-[2.5rem] border border-gray-100 shadow-sm animate-in fade-in duration-500">
                <div className="flex items-center justify-between mb-10">
                    <h3 className="text-lg font-black text-gray-900 tracking-tight uppercase">Agent Performance vs Targets</h3>
                    <div className="flex items-center gap-2 px-4 py-2 rounded-xl bg-cyan-50 text-cyan-600 text-[10px] font-black uppercase tracking-widest">
                        <Users size={14} /> Active Agents
                    </div>
                </div>
                <div className="space-y-8">
                    {Array.isArray(reportData) && reportData.map((agent, idx) => (
                        <div key={idx} className="space-y-3 p-6 rounded-[1.5rem] bg-gray-50/50 border border-gray-100 hover:bg-white hover:shadow-md transition-all">
                            <div className="flex justify-between items-end">
                                <div>
                                    <h4 className="text-base font-black text-gray-900">{agent.name}</h4>
                                    <p className="text-[10px] font-bold text-gray-400 uppercase tracking-tighter mt-0.5">
                                        Today: ₹{(agent.totalSales || 0).toLocaleString()} <span className="opacity-40">/ Goal: ₹{(agent.dailyTarget || 0).toLocaleString()}</span>
                                    </p>
                                </div>
                                <div className="text-right">
                                    <span className={`text-xl font-black tracking-tighter ${agent.percentage >= 100 ? 'text-emerald-600' : 'text-orange-500'}`}>
                                        {agent.percentage}%
                                    </span>
                                </div>
                            </div>
                            <div className="h-2.5 bg-white rounded-full overflow-hidden border border-gray-100 p-0.5 shadow-inner">
                                <motion.div 
                                    initial={{ width: 0 }}
                                    animate={{ width: `${Math.min(agent.percentage, 100)}%` }}
                                    transition={{ duration: 1.5, ease: "easeOut" }}
                                    className={`h-full rounded-full ${agent.percentage >= 100 ? 'bg-gradient-to-r from-emerald-500 to-emerald-400' : 'bg-gradient-to-r from-orange-400 to-orange-500'}`}
                                />
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        );

      case 'location-tracking': {
        // Custom icon for markers
        const agentIcon = new L.Icon({
            iconUrl: 'https://cdn-icons-png.flaticon.com/512/684/684908.png',
            iconSize: [32, 32],
            iconAnchor: [16, 32],
            popupAnchor: [0, -32]
        });

        return (
            <div className="space-y-6 animate-in fade-in duration-500">
                {/* Sub Tabs */}
                <div className="flex gap-2 p-1 bg-gray-100 rounded-2xl w-fit">
                    <button 
                        onClick={() => setSubTab('live-map')}
                        className={`px-6 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${subTab === 'live-map' ? 'bg-white text-rose-600 shadow-sm' : 'text-gray-400 hover:text-gray-600'}`}
                    >
                        Live Tracking Map
                    </button>
                    <button 
                        onClick={() => setSubTab('history')}
                        className={`px-6 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${subTab === 'history' ? 'bg-white text-rose-600 shadow-sm' : 'text-gray-400 hover:text-gray-600'}`}
                    >
                        History
                    </button>
                    <button 
                        onClick={() => setSubTab('village-visits')}
                        className={`px-6 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${subTab === 'village-visits' ? 'bg-white text-rose-600 shadow-sm' : 'text-gray-400 hover:text-gray-600'}`}
                    >
                        Village Durations
                    </button>
                    <button 
                        onClick={() => setSubTab('deviation')}
                        className={`px-6 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${subTab === 'deviation' ? 'bg-white text-rose-600 shadow-sm' : 'text-gray-400 hover:text-gray-600'}`}
                    >
                        Time Deviation
                    </button>
                </div>

                {subTab === 'live-map' && (
                    <div className="bg-white rounded-[2.5rem] border border-gray-100 shadow-sm overflow-hidden h-[600px] relative">
                        <MapContainer center={[20.5937, 78.9629]} zoom={5} style={{ height: '100%', width: '100%' }}>
                            <TileLayer
                                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                                attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                            />
                            {Array.isArray(reportData) && reportData.map((log, i) => (
                                log.lat && log.long && (
                                    <Marker key={i} position={[log.lat, log.long]} icon={agentIcon}>
                                        <Popup>
                                            <div className="p-2">
                                                <p className="font-black text-gray-900">{log.user?.name}</p>
                                                <p className="text-[10px] text-gray-500 uppercase font-bold">{log.villageName || 'In-Transit'}</p>
                                                {log.subLocation && <p className="text-[9px] text-gray-400 italic mt-0.5 line-clamp-1">{log.subLocation}</p>}
                                                <p className="text-[10px] text-rose-600 font-black mt-2">
                                                    Last updated: {log.createdAt ? format(new Date(log.createdAt), 'hh:mm a') : 'N/A'}
                                                </p>
                                            </div>
                                        </Popup>
                                    </Marker>
                                )
                            ))}
                        </MapContainer>
                    </div>
                )}

                {subTab === 'history' && (
                    <div className="bg-white rounded-[2.5rem] border border-gray-100 shadow-sm overflow-hidden">
                        <div className="p-6 border-b border-gray-50 flex items-center justify-between">
                            <h3 className="text-lg font-black text-gray-900 tracking-tight uppercase">Recent Geo-Logs</h3>
                            <div className="flex gap-2">
                                <span className="px-3 py-1 rounded-full bg-rose-50 text-rose-600 text-[10px] font-black uppercase tracking-widest">
                                    {reportData.length} Total Logs
                                </span>
                            </div>
                        </div>
                        <div className="overflow-x-auto">
                            <table className="w-full text-left">
                                <thead>
                                    <tr className="bg-gray-50/50">
                                        <th className="px-6 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest">Agent</th>
                                        <th className="px-6 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest">Location</th>
                                        <th className="px-6 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest">Type</th>
                                        <th className="px-6 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest">Timestamp</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-50">
                                    {Array.isArray(reportData) && reportData.map((log, i) => (
                                        <tr key={i} className="hover:bg-gray-50 transition-colors">
                                            <td className="px-6 py-4 text-sm font-black text-gray-800">{log.user?.name}</td>
                                            <td className="px-6 py-4 text-sm font-bold text-gray-600 flex items-center gap-2">
                                                <MapPin size={12} className="text-rose-500" />
                                                <div className="flex flex-col">
                                                    <span>{log.villageName || 'In-Transit'}</span>
                                                    {log.subLocation && <span className="text-[10px] text-gray-400 font-normal italic">{log.subLocation}</span>}
                                                </div>
                                                <span className="text-[10px] opacity-40 ml-1">({log.lat?.toFixed(4)}, {log.long?.toFixed(4)})</span>
                                            </td>
                                            <td className="px-6 py-4">
                                                <span className={`text-[9px] font-black uppercase px-2 py-0.5 rounded ${log.checkInType === 'SHIFT_START' ? 'bg-emerald-100 text-emerald-600' : 'bg-gray-100 text-gray-600'}`}>
                                                    {log.checkInType || 'BREADCRUMB'}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4 text-xs font-bold text-gray-400">
                                                {log.createdAt ? format(new Date(log.createdAt), 'hh:mm a') : 'N/A'}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                )}

                {subTab === 'village-visits' && (
                    <div className="bg-white rounded-[2.5rem] border border-gray-100 shadow-sm overflow-hidden">
                        <div className="p-6 border-b border-gray-50 flex items-center justify-between">
                            <h3 className="text-lg font-black text-gray-900 tracking-tight uppercase">Village Visit Durations</h3>
                        </div>
                        <div className="overflow-x-auto">
                            <table className="w-full text-left">
                                <thead>
                                    <tr className="bg-gray-50/50">
                                        <th className="px-6 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest">Agent</th>
                                        <th className="px-6 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest">Village</th>
                                        <th className="px-6 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest">Duration</th>
                                        <th className="px-6 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest">Time Range</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-50">
                                    {trackingReportsData?.villageVisits?.map(log => (
                                        <tr key={log.id} className="hover:bg-gray-50 transition-colors">
                                            <td className="px-6 py-4 text-sm font-black text-gray-800">{log.agentName}</td>
                                            <td className="px-6 py-4">
                                                <div className="flex flex-col">
                                                    <span className="text-sm font-bold text-gray-600">{log.villageName}</span>
                                                    {log.subLocation && <span className="text-[10px] text-gray-400 font-medium italic">{log.subLocation}</span>}
                                                </div>
                                            </td>
                                            <td className="px-6 py-4 text-sm font-black text-emerald-600">{log.durationMinutes} mins</td>
                                            <td className="px-6 py-4 text-xs font-bold text-gray-400">
                                                {format(new Date(log.startTime), 'hh:mm a')} - {log.endTime ? format(new Date(log.endTime), 'hh:mm a') : 'Active'}
                                            </td>
                                        </tr>
                                    ))}
                                    {!trackingReportsData?.villageVisits?.length && (
                                        <tr>
                                            <td colSpan="4" className="px-6 py-8 text-center text-sm text-gray-400 font-bold">No visits recorded for this period.</td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>
                )}

                {subTab === 'deviation' && (
                    <div className="bg-white rounded-[2.5rem] border border-gray-100 shadow-sm overflow-hidden">
                        <div className="p-6 border-b border-gray-50 flex items-center justify-between">
                            <h3 className="text-lg font-black text-gray-900 tracking-tight uppercase">Shift Time Deviation</h3>
                        </div>
                        <div className="overflow-x-auto">
                            <table className="w-full text-left">
                                <thead>
                                    <tr className="bg-gray-50/50">
                                        <th className="px-6 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest">Agent</th>
                                        <th className="px-6 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest">Expected</th>
                                        <th className="px-6 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest">Actual</th>
                                        <th className="px-6 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest">Deviation</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-50">
                                    {trackingReportsData?.timeDeviation?.map(log => (
                                        <tr key={log.id} className="hover:bg-gray-50 transition-colors">
                                            <td className="px-6 py-4 text-sm font-black text-gray-800">{log.agentName} ({log.shiftType})</td>
                                            <td className="px-6 py-4 text-sm font-bold text-gray-600">{log.expectedTime}</td>
                                            <td className="px-6 py-4 text-sm font-bold text-gray-600">{log.actualTime}</td>
                                            <td className={`px-6 py-4 text-xs font-black ${log.status === 'LATE' ? 'text-rose-500' : 'text-emerald-500'}`}>
                                                {log.deviationMinutes > 0 ? `+${formatMinutesToHours(log.deviationMinutes)} (Late)` : `${formatMinutesToHours(log.deviationMinutes)} (Early/On Time)`}
                                            </td>
                                        </tr>
                                    ))}
                                    {!trackingReportsData?.timeDeviation?.length && (
                                        <tr>
                                            <td colSpan="4" className="px-6 py-8 text-center text-sm text-gray-400 font-bold">No shifts recorded for this period.</td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>
                )}
            </div>
        );
      }

      case 'payment-mode':
        const safeData = (reportData && typeof reportData === 'object' && !Array.isArray(reportData)) ? reportData : {};
        const pieData = Object.entries(safeData).map(([name, value]) => ({ name, value }));
        return (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 animate-in fade-in duration-500">
                <div className="bg-white p-8 rounded-[2.5rem] border border-gray-100 shadow-sm flex flex-col items-center">
                    <h3 className="text-lg font-black text-gray-900 tracking-tight mb-8 self-start">Transaction Channels</h3>
                    <div className="h-[250px] w-full">
                        <ResponsiveContainer width="100%" height="100%" minWidth={0} minHeight={0}>
                            <RePieChart>
                                <Pie data={pieData} innerRadius={60} outerRadius={100} paddingAngle={5} dataKey="value" animationDuration={1500}>
                                    {pieData.map((entry, index) => <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />)}
                                </Pie>
                                <Tooltip contentStyle={{ borderRadius: '1.5rem', border: 'none', boxShadow: '0 20px 25px -5px rgb(0 0 0 / 0.1)' }} />
                            </RePieChart>
                        </ResponsiveContainer>
                    </div>
                </div>
                <div className="bg-white p-8 rounded-[2.5rem] border border-gray-100 shadow-sm space-y-4">
                    <h3 className="text-lg font-black text-gray-900 tracking-tight mb-4">Channel Breakdown</h3>
                    {pieData.map((d, i) => (
                        <div key={d.name} className="flex items-center justify-between p-4 rounded-2xl bg-gray-50 border border-gray-100">
                            <div className="flex items-center gap-3">
                                <div className="w-3 h-3 rounded-full" style={{ backgroundColor: COLORS[i % COLORS.length] }} />
                                <span className="text-sm font-black text-gray-700 uppercase tracking-widest">{d.name}</span>
                            </div>
                            <span className="text-lg font-black text-gray-900 italic">₹{(d.value || 0).toLocaleString()}</span>
                        </div>
                    ))}
                </div>
            </div>
        );

      case 'returns':
        return (
            <div className="bg-white rounded-[2.5rem] border border-gray-100 shadow-sm overflow-hidden animate-in fade-in duration-500">
                <div className="p-6 border-b border-gray-50 flex items-center gap-3">
                    <div className="p-2.5 rounded-xl bg-red-50 text-red-600"><RotateCcw size={20} /></div>
                    <h3 className="text-lg font-black text-gray-900 tracking-tight uppercase">Product Return Audit</h3>
                </div>
                <div className="overflow-x-auto">
                    <table className="w-full text-left">
                        <thead>
                            <tr className="bg-gray-50/50">
                                <th className="px-6 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest">Order ID</th>
                                <th className="px-6 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest">Product</th>
                                <th className="px-6 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest">Qty</th>
                                <th className="px-6 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest">Amount</th>
                                <th className="px-6 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest">Date</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-50">
                            {Array.isArray(reportData) && reportData.map((r, i) => (
                                <tr key={i} className="hover:bg-gray-50 transition-colors">
                                    <td className="px-6 py-4 text-sm font-black text-gray-800">{r.order?.displayId || 'N/A'}</td>
                                    <td className="px-6 py-4 text-sm font-bold text-gray-600">{r.product?.name}</td>
                                    <td className="px-6 py-4 text-sm font-black text-red-600">-{r.quantity}</td>
                                    <td className="px-6 py-4 text-sm font-black text-gray-900 italic">₹{r.amount?.toLocaleString()}</td>
                                    <td className="px-6 py-4 text-xs font-bold text-gray-400">
                                        {r.createdAt ? format(new Date(r.createdAt), 'dd MMM yyyy') : 'N/A'}
                                    </td>
                                </tr>
                            ))}
                            {reportData.length === 0 && <tr><td colSpan="5" className="py-20 text-center text-gray-300 font-bold uppercase text-[10px] tracking-widest">No Returns Recorded</td></tr>}
                        </tbody>
                    </table>
                </div>
            </div>
        );

      case 'damages':
        return (
            <div className="space-y-6 animate-in fade-in duration-500">
                <div className="grid grid-cols-2 gap-4">
                    <div className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm border-l-4 border-l-amber-500">
                        <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Total Loss (Approved)</p>
                        <h3 className="text-2xl font-black text-amber-600 italic">₹{reportData.summary?.totalLoss?.toLocaleString() || 0}</h3>
                    </div>
                    <div className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm border-l-4 border-l-emerald-500">
                        <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Deductions Applied</p>
                        <h3 className="text-2xl font-black text-emerald-600 italic">₹{reportData.summary?.totalDeductions?.toLocaleString() || 0}</h3>
                    </div>
                </div>
                <div className="bg-white p-6 rounded-[2.5rem] border border-gray-100 shadow-sm">
                    <h3 className="text-lg font-black text-gray-900 tracking-tight mb-6">Damages by Category</h3>
                    <div className="space-y-4">
                        {Object.entries(reportData.lossByType || {}).map(([type, data]) => (
                            <div key={type} className="p-4 rounded-2xl bg-gray-50 border border-gray-100 flex justify-between items-center">
                                <div>
                                    <p className="text-sm font-black text-gray-900 uppercase tracking-tighter">{type.replace('_', ' ')}</p>
                                    <p className="text-[10px] font-bold text-gray-400">{data.count} Incidents</p>
                                </div>
                                <div className="text-right">
                                    <p className="text-md font-black text-amber-600 italic">₹{(data.loss || 0).toLocaleString()}</p>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        );

      case 'sessions':
        return (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 animate-in fade-in duration-500">
                {Array.isArray(reportData) && reportData.map((s, i) => (
                    <div key={i} className="bg-white p-8 rounded-[2.5rem] border border-gray-100 shadow-sm relative overflow-hidden group">
                        <div className={`absolute top-0 right-0 w-32 h-32 ${s.session === 'MORNING' ? 'bg-orange-50' : 'bg-indigo-50'} rounded-bl-full -mr-16 -mt-16 transition-all group-hover:scale-110`} />
                        <div className="relative z-10">
                            <div className={`w-14 h-14 rounded-2xl ${s.session === 'MORNING' ? 'bg-orange-500 shadow-orange-200' : 'bg-indigo-600 shadow-indigo-200'} shadow-lg flex items-center justify-center text-white mb-6`}>
                                <Zap size={28} />
                            </div>
                            <h3 className="text-2xl font-black text-gray-900 tracking-tighter mb-1">{s.session} SESSION</h3>
                            <p className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] mb-6">Service Analytics</p>
                            <div className="space-y-3">
                                <div className="flex justify-between items-center"><span className="text-xs font-bold text-gray-400 uppercase">Total Sales</span><span className="text-lg font-black text-gray-900 italic">₹{(s.totalSales || 0).toLocaleString()}</span></div>
                                <div className="flex justify-between items-center"><span className="text-xs font-bold text-gray-400 uppercase">Orders</span><span className="text-lg font-black text-gray-900 italic">{s.orderCount}</span></div>
                            </div>
                        </div>
                    </div>
                ))}
            </div>
        );

      case 'invoices':
        return (
            <div className="bg-white rounded-[2.5rem] border border-gray-100 shadow-sm overflow-hidden animate-in fade-in duration-500">
                <div className="p-6 border-b border-gray-50 flex items-center justify-between">
                    <h3 className="text-lg font-black text-gray-900 tracking-tight uppercase">Recent Invoices Audit</h3>
                    <div className="px-4 py-1.5 rounded-full bg-emerald-50 text-emerald-600 text-[10px] font-black uppercase tracking-widest">Last 50 Entries</div>
                </div>
                <div className="overflow-x-auto">
                    <table className="w-full text-left">
                        <thead>
                            <tr className="bg-gray-50/50">
                                <th className="px-6 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest">Inv ID</th>
                                <th className="px-6 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest">Customer</th>
                                <th className="px-6 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest">Amount</th>
                                <th className="px-6 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest">Mode</th>
                                <th className="px-6 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest">Status</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-50">
                            {Array.isArray(reportData) && reportData.map((ord, i) => (
                                <tr key={i} className="hover:bg-gray-50 transition-colors">
                                    <td className="px-6 py-4 text-xs font-black text-gray-800 tracking-tighter">{ord.displayId}</td>
                                    <td className="px-6 py-4 text-sm font-bold text-gray-600">{ord.customerName || 'Walk-in'}</td>
                                    <td className="px-6 py-4 text-sm font-black text-gray-900 italic">₹{(ord.totalAmount || 0).toLocaleString()}</td>
                                    <td className="px-6 py-4"><span className={`text-[9px] font-black uppercase px-2 py-0.5 rounded-full ${ord.paymentMode === 'CASH' ? 'bg-orange-50 text-orange-600' : 'bg-blue-50 text-blue-600'}`}>{ord.paymentMode}</span></td>
                                    <td className="px-6 py-4"><span className={`text-[9px] font-black uppercase px-2 py-0.5 rounded-full ${ord.status === 'COMPLETED' ? 'bg-emerald-50 text-emerald-600' : 'bg-amber-50 text-amber-600'}`}>{ord.status}</span></td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
        );

      case 'vehicle-wise':
        return (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 animate-in fade-in duration-500">
                {Array.isArray(reportData) && reportData.map((vh, i) => (
                    <div key={i} className="bg-white p-6 rounded-[2rem] border border-gray-100 shadow-sm hover:shadow-md transition-all group border-b-4 border-b-slate-200">
                        <div className="flex justify-between items-start mb-6">
                            <div className="p-3 rounded-2xl bg-slate-50 text-slate-600"><Truck size={24} /></div>
                            <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{vh.displayId || 'VH-LOG'}</div>
                        </div>
                        <h4 className="text-xl font-black text-gray-900 tracking-tighter mb-4">{vh.vehicleNumber}</h4>
                        <div className="space-y-3">
                            <div className="flex justify-between items-center"><span className="text-[10px] font-bold text-gray-400 uppercase">Revenue Generated</span><span className="text-md font-black text-emerald-600 italic">₹{(vh.totalSales || 0).toLocaleString()}</span></div>
                            <div className="flex justify-between items-center"><span className="text-[10px] font-bold text-gray-400 uppercase">Total Orders</span><span className="text-md font-black text-gray-800">{(vh.orderCount || 0).toLocaleString()}</span></div>
                        </div>
                        <button className="w-full mt-6 py-3 rounded-xl bg-gray-50 text-[10px] font-black text-gray-400 uppercase tracking-widest group-hover:bg-slate-600 group-hover:text-white transition-all">Detailed Audit</button>
                    </div>
                ))}
            </div>
        );

      default:
        return <div>Report under construction</div>;
    }
  };

  return (
    <div className="min-h-screen bg-[#FDFDFD] pb-20">
      <div className="bg-white border-b border-gray-100 sticky top-0 z-30 backdrop-blur-md bg-opacity-80">
        <div className="max-w-[1600px] mx-auto px-6 py-6 flex items-center justify-between">
          <div>
            <div className="flex items-center gap-3 mb-1">
               <div className="p-2.5 rounded-2xl bg-emerald-600 text-white shadow-lg shadow-emerald-200"><BarChart3 size={24} strokeWidth={2.5} /></div>
               <h1 className="text-3xl font-black text-gray-900 tracking-tighter">REPORTING <span className="text-emerald-600">HUB</span></h1>
            </div>
            <p className="text-[10px] font-black text-gray-400 uppercase tracking-[0.3em] ml-1">Enterprise Analytics & Sales Audit Suite</p>
          </div>
          <div className="flex items-center gap-3">
             {isTenantRoute && <div className="w-64"><StoreSelector onSelect={(id) => setSearchParams({ storeId: id })} currentStoreId={storeFilterId} stores={stores} /></div>}
             <button onClick={() => generateReportPDF(false)} disabled={!reportData || isLoading} className="bg-gray-900 text-white px-5 py-3 rounded-2xl flex items-center gap-2 font-black text-xs uppercase tracking-widest shadow-xl shadow-gray-200 hover:scale-105 active:scale-95 transition-all disabled:opacity-40 disabled:pointer-events-none"><Download size={16} /> Download</button>
             <button onClick={() => generateReportPDF(true)} disabled={!reportData || isLoading} className="bg-emerald-600 text-white px-5 py-3 rounded-2xl flex items-center gap-2 font-black text-xs uppercase tracking-widest shadow-xl shadow-emerald-200 hover:scale-105 active:scale-95 transition-all disabled:opacity-40 disabled:pointer-events-none"><Printer size={16} /> Print</button>
           </div>
        </div>
      </div>

      <div className="max-w-[1600px] mx-auto px-6 py-10 flex gap-10">
        <div className="w-80 shrink-0">
           <div className="sticky top-32 space-y-2">
              <div className="px-4 mb-4"><p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Select Audit Type</p></div>
              {reportModules.map((module) => (
                <button key={module.id} onClick={() => setActiveTab(module.id)} className={`w-full flex items-center gap-4 px-5 py-4 rounded-[1.5rem] transition-all relative overflow-hidden group ${activeTab === module.id ? `${module.bg} ${module.color} shadow-sm border border-gray-100` : 'text-gray-500 hover:bg-gray-50'}`}>
                  <div className={`p-2 rounded-xl transition-all ${activeTab === module.id ? 'bg-white shadow-sm' : 'bg-gray-50 group-hover:bg-white shadow-none'}`}><module.icon size={20} strokeWidth={activeTab === module.id ? 2.5 : 2} /></div>
                  <span className="text-sm font-black tracking-tight">{module.name}</span>
                  {activeTab === module.id && <motion.div layoutId="activePill" className="absolute left-0 w-1.5 h-8 bg-emerald-600 rounded-r-full" transition={{ type: "spring", stiffness: 300, damping: 30 }} />}
                </button>
              ))}
           </div>
        </div>
        <div className="flex-1 min-w-0">
          <AnimatePresence mode="wait">
            <motion.div key={activeTab} initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} transition={{ duration: 0.3 }}>
              <div className="mb-8 flex items-end justify-between">
                <div>
                  <h2 className="text-4xl font-black text-gray-900 tracking-tighter uppercase mb-2">{activeTab.replace('-', ' ')}</h2>
                  <div className="h-1.5 w-20 bg-emerald-600 rounded-full" />
                </div>
                {reportData && !isLoading && (
                  <div className="flex items-center gap-2">
                    <button onClick={() => generateReportPDF(false)} className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-gray-900 text-white text-[10px] font-black uppercase tracking-widest hover:scale-105 active:scale-95 transition-all shadow-lg shadow-gray-200"><Download size={14} /> Download Report</button>
                    <button onClick={() => generateReportPDF(true)} className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-emerald-600 text-white text-[10px] font-black uppercase tracking-widest hover:scale-105 active:scale-95 transition-all shadow-lg shadow-emerald-200"><Printer size={14} /> Print Report</button>
                  </div>
                )}
              </div>
              {renderContent()}
            </motion.div>
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}
