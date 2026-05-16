import React, { useState, useEffect, useMemo } from 'react';
import { 
  FileDown, Search, Filter, ShoppingCart, Calendar, Truck, Download, ChevronRight, ChevronLeft, 
  Loader2, ArrowLeft, User, Smartphone, Shield, Coins, Package, Info, MapPin, Printer, Clock, 
  CreditCard, Wallet, CalendarClock, Map, Building2, Tag, CheckCircle2, AlertCircle, RefreshCw, 
  FileText, Edit3, Trash2, RotateCcw, XCircle, Minus, Plus, AlertTriangle, Lock, Unlock, BarChart3,
  FileSpreadsheet, Upload
} from 'lucide-react';
import { format } from 'date-fns';
import { useSearchParams, useNavigate, useLocation } from 'react-router-dom';
import StoreSelector from './StoreSelector';
import { useUserStore } from '../../store/userStore';
import adminAPI from '../../services/adminService';
import { ordersAPI } from '../../services/api';
import toast from 'react-hot-toast';
import * as XLSX from 'xlsx';
import { jsPDF } from 'jspdf';
import { generateReportPDF } from './adminreports/ReportUtils';
import ManualSaleDrawer from './ManualSaleDrawer';
import CustomerManagement from './customers/CustomerManagement';
export default function AdminSales() {
  // Add Print Styles
  useEffect(() => {
    const style = document.createElement('style');
    style.innerHTML = `
      @media print {
        @page { size: A4; margin: 15mm; }
        body { background: white !important; font-size: 10pt; }
        .no-print, nav, aside, header, button, .filters-section { display: none !important; }
        .print-section, .print-section * { visibility: visible !important; }
        .print-section { 
          position: absolute; 
          left: 0; 
          top: 0; 
          width: 100%; 
          padding: 0 !important;
          margin: 0 !important;
        }
        
        /* If we ARE in detail view, only show the invoice */
        body:has(.printable-invoice) .print-section {
           display: none !important;
        }

        .printable-invoice { 
          display: block !important;
          visibility: visible !important;
          position: absolute; 
          left: 0; 
          top: 0; 
          width: 100%; 
          padding: 0 !important;
        }
        
        table { width: 100%; border-collapse: collapse; margin-top: 10px; }
        th, td { border: 1px solid #e5e7eb; padding: 6px 8px; text-align: left; }
        th { background-color: #f9fafb !important; -webkit-print-color-adjust: exact; }
      }
      .print-header { display: none; }
      @media print { .print-header { display: block !important; margin-bottom: 20px; border-bottom: 2px solid #10b981; padding-bottom: 10px; } }
    `;
    document.head.appendChild(style);
    return () => document.head.removeChild(style);
  }, []);

  const [sales, setSales] = useState([]);
  const [stores, setStores] = useState([]);
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterDate, setFilterDate] = useState('Today');
  const [saleType, setSaleType] = useState('ALL'); // ALL, POS, AGENT
  const [currentPage, setCurrentPage] = useState(1);
  const [viewingOrder, setViewingOrder] = useState(null);
  const [showCreateSale, setShowCreateSale] = useState(false);
  const [showBulkUploadModal, setShowBulkUploadModal] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState('');
  const [autoCreateProducts, setAutoCreateProducts] = useState(true);
  const ITEMS_PER_PAGE = 10;

  // ── Order Edit / Return / Cancel States ──
  const [fullOrder, setFullOrder] = useState(null);
  const [loadingOrder, setLoadingOrder] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);
  const [editingItem, setEditingItem] = useState(null);
  const [editQty, setEditQty] = useState(1);
  const [returningItem, setReturningItem] = useState(null);
  const [returnQty, setReturnQty] = useState(1);
  const [returnReason, setReturnReason] = useState('');
  const [showCancelConfirm, setShowCancelConfirm] = useState(false);
  const [cancelReason, setCancelReason] = useState('');
  // ── Session States ──
  const [sessionData, setSessionData] = useState(null);
  const [sessionLoading, setSessionLoading] = useState(false);

  // ── Global & Sub-Tab States ──
  const [activeTab, setActiveTab] = useState('sales'); // 'sales', 'customers', 'analytics'
  const [roleTab, setRoleTab] = useState('All'); // 'All', 'Admins', 'Agent', 'Customer'
  const [viewMode, setViewMode] = useState('list'); // 'list' or 'analytics'
  
  // ── Analytics States ──
  const [analyticsData, setAnalyticsData] = useState({
    trends: [],
    topProducts: [],
    agentPerf: [],
    topCustomers: []
  });
  const [loadingAnalytics, setLoadingAnalytics] = useState(false);
  const [customerSearchQuery, setCustomerSearchQuery] = useState('');

  // ── Customer Data Extraction (develop branch feature) ──
  const customerData = useMemo(() => {
    const customersMap = new globalThis.Map();

    sales.forEach(sale => {
      const mobile = sale.mobile || 'Walk-in';
      const name = sale.customerName || 'Walk-in Customer';
      const identifier = mobile === 'Walk-in' && name !== 'Walk-in Customer' ? name : mobile;

      if (!customersMap.has(identifier)) {
        customersMap.set(identifier, {
          id: identifier,
          mobile: sale.mobile || 'N/A',
          name: name,
          totalSpent: 0,
          totalOrders: 0,
          lastOrderDate: sale.createdAt,
          itemsBought: {}
        });
      }

      const cust = customersMap.get(identifier);
      cust.totalSpent += sale.totalAmount || 0;
      cust.totalOrders += 1;
      
      // Update last order date if this sale is more recent
      if (new Date(sale.createdAt) > new Date(cust.lastOrderDate)) {
        cust.lastOrderDate = sale.createdAt;
      }

      // Track items bought to find favorite product
      sale.items?.forEach(item => {
        const productName = item.product?.name || item.productName || 'Unknown Product';
        if (!cust.itemsBought[productName]) {
          cust.itemsBought[productName] = 0;
        }
        cust.itemsBought[productName] += item.quantity || 1;
      });
    });

    return Array.from(customersMap.values()).map(cust => {
      // Find favorite product
      let favoriteProduct = 'N/A';
      let maxQty = 0;
      for (const [prod, qty] of Object.entries(cust.itemsBought)) {
        if (qty > maxQty) {
          maxQty = qty;
          favoriteProduct = prod;
        }
      }
      return { ...cust, favoriteProduct };
    }).sort((a, b) => b.totalSpent - a.totalSpent);
  }, [sales]);

  // Analytics Metrics Memo
  const customerAnalytics = useMemo(() => {
    if (customerData.length === 0) return null;
    
    // Top 5 spenders
    const topSpenders = [...customerData].sort((a, b) => b.totalSpent - a.totalSpent).slice(0, 5);
    
    // Most frequent buyers
    const frequentBuyers = [...customerData].sort((a, b) => b.totalOrders - a.totalOrders).slice(0, 5);

    return { topSpenders, frequentBuyers };
  }, [customerData]);

  const filteredCustomers = customerData.filter(c => 
    c.name.toLowerCase().includes(customerSearchQuery.toLowerCase()) || 
    c.mobile.includes(customerSearchQuery)
  );

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

      const [salesRes, storesRes, usersRes] = await Promise.all([
        adminAPI.getSales(params),
        adminAPI.getStores(),
        adminAPI.getUsers()
      ]);
      setSales(salesRes.data);
      const fetchedStores = storesRes.data?.success ? storesRes.data.data : (storesRes.data || []);
      setStores(fetchedStores);
      setUsers(usersRes.data || []);

      // Auto-select if only one store exists
      if (fetchedStores.length === 1 && !storeFilterId) {
        setSearchParams({ storeId: fetchedStores[0].id });
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

  // Aggregated Customer List for the "Customer" Tab
  const customerList = React.useMemo(() => {
    if (roleTab !== 'Customer') return [];
    const customerMap = {};
    sales.forEach(s => {
      if (!s.mobile) return;
      const key = s.mobile;
      if (!customerMap[key]) {
        customerMap[key] = { 
          name: s.customerName || 'Walk-in', 
          mobile: s.mobile, 
          totalSpent: 0, 
          orderCount: 0, 
          lastOrderDate: s.createdAt,
          paymentModes: new Set()
        };
      }
      customerMap[key].totalSpent += s.totalAmount;
      customerMap[key].orderCount += 1;
      if (new Date(s.createdAt) > new Date(customerMap[key].lastOrderDate)) {
        customerMap[key].lastOrderDate = s.createdAt;
      }
      if (s.paymentMode) customerMap[key].paymentModes.add(s.paymentMode);
    });
    
    let result = Object.values(customerMap).sort((a, b) => b.totalSpent - a.totalSpent);
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      result = result.filter(c => c.name.toLowerCase().includes(q) || c.mobile.includes(q));
    }
    return result;
  }, [sales, roleTab, searchQuery]);

  const fetchAnalytics = async () => {
    setLoadingAnalytics(true);
    try {
      const [trends, products, agents] = await Promise.all([
        adminAPI.getTrendsReport({ days: 7 }),
        adminAPI.getTopProducts(),
        adminAPI.getAgentPerformance({ storeId: storeFilterId })
      ]);

      setAnalyticsData({
        trends: trends.data || [],
        topProducts: products.data || [],
        agentPerf: agents.data || [],
        topCustomers: customerList.slice(0, 5)
      });
    } catch (err) {
      toast.error('Failed to load analytics data');
    } finally {
      setLoadingAnalytics(false);
    }
  };

  useEffect(() => {
    if (viewMode === 'analytics') {
      fetchAnalytics();
    }
  }, [viewMode, storeFilterId]);

  // ── Fetch enriched order when opening detail view ──
  const openOrderDetail = async (sale) => {
    setViewingOrder(sale);
    setLoadingOrder(true);
    try {
      const { data } = await ordersAPI.getById(sale.id);
      setFullOrder(data);
    } catch (err) {
      console.error('[Admin] Failed to load enriched order:', err);
      // Fallback: use the list item data
      setFullOrder(null);
    } finally {
      setLoadingOrder(false);
    }
  };

  const closeOrderDetail = () => {
    setViewingOrder(null);
    setFullOrder(null);
    setEditingItem(null);
    setReturningItem(null);
    setShowCancelConfirm(false);
  };

  // The order to render in the detail view (enriched if available, fallback to list data)
  const detailOrder = fullOrder || viewingOrder;
  const canEditOrder = detailOrder && !['CANCELLED', 'RETURNED'].includes(detailOrder.status);

  // ── Edit Quantity ──
  const handleEditQty = async () => {
    if (!editingItem || editQty < 1 || !detailOrder) return;
    setActionLoading(true);
    try {
      const { data } = await ordersAPI.editItem(detailOrder.id, editingItem.id, { quantity: editQty });
      setFullOrder(data);
      // Also update the list entry
      setSales(prev => prev.map(s => s.id === data.id ? { ...s, totalAmount: data.totalAmount } : s));
      setEditingItem(null);
      toast.success('Quantity updated');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to update quantity');
    } finally { setActionLoading(false); }
  };

  // ── Remove Item ──
  const handleRemoveItem = async (itemId) => {
    if (!detailOrder) return;
    setActionLoading(true);
    try {
      const { data } = await ordersAPI.removeItem(detailOrder.id, itemId);
      setFullOrder(data);
      setSales(prev => prev.map(s => s.id === data.id ? { ...s, totalAmount: data.totalAmount } : s));
      toast.success('Item removed');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to remove item');
    } finally { setActionLoading(false); }
  };

  // ── Return Item ──
  const handleReturn = async () => {
    if (!returningItem || returnQty < 1 || !detailOrder) return;
    setActionLoading(true);
    try {
      const { data } = await ordersAPI.returnItems(detailOrder.id, {
        items: [{ orderItemId: returningItem.id, returnQty }],
        reason: returnReason || undefined
      });
      setFullOrder(data);
      setSales(prev => prev.map(s => s.id === data.id ? { ...s, totalAmount: data.totalAmount, status: data.status } : s));
      setReturningItem(null);
      setReturnReason('');
      toast.success('Return processed');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to process return');
    } finally { setActionLoading(false); }
  };

  // ── Cancel Order ──
  const handleCancel = async () => {
    if (!detailOrder) return;
    setActionLoading(true);
    try {
      const { data } = await ordersAPI.cancelOrder(detailOrder.id, { reason: cancelReason || undefined });
      setFullOrder(data);
      setSales(prev => prev.map(s => s.id === data.id ? { ...s, totalAmount: data.totalAmount, status: data.status } : s));
      setShowCancelConfirm(false);
      setCancelReason('');
      toast.success('Order cancelled');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to cancel order');
    } finally { setActionLoading(false); }
  };

  // ── Session Sales Summary ──
  const fetchSessionData = async () => {
    setSessionLoading(true);
    try {
      const params = {};
      if (storeFilterId) params.storeId = storeFilterId;
      const { data } = await ordersAPI.getSessionSales(params);
      setSessionData(data);
    } catch (err) {
      console.error('[Session] Failed:', err);
    } finally { setSessionLoading(false); }
  };

  const handleFreezeSession = async () => {
    if (!confirm('Are you sure you want to freeze today\'s session? This will prevent further edits/returns.')) return;
    try {
      await ordersAPI.freezeSession({ date: format(new Date(), 'yyyy-MM-dd') });
      toast.success('Session frozen successfully');
      fetchSessionData();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to freeze session');
    }
  };

  useEffect(() => {
    fetchSessionData();
  }, [storeFilterId]);


  const exportHistoryToExcel = () => {
    const data = listToRender.map(s => {
      const returnAmt = s.returns?.reduce((sum, r) => sum + r.refundAmount, 0) || 0;
      const totalQty = s.items?.reduce((sum, i) => sum + i.quantity, 0) || 0;
      const totalDiscount = s.items?.reduce((sum, i) => sum + (i.discount || 0), 0) || 0;

      return {
        'Invoice ID': s.displayId || s.orderNumber,
        'Date': format(new Date(s.createdAt), 'dd-MM-yyyy'),
        'Time': format(new Date(s.createdAt), 'hh:mm a'),
        'Transaction date': format(new Date(s.createdAt), 'dd-MM-yyyy'),
        'Exact time': format(new Date(s.createdAt), 'hh:mm:ss a'),
        'Session': s.coverageType || 'N/A',
        'Morning / Evening': s.coverageType || 'N/A',
        'Store (Hub)': s.store?.name || 'Main Hub',
        'Hub ID': s.storeId || 'N/A',
        'Substore': s.substore?.name || 'N/A',
        'Route Name': s.route?.routeName || 'N/A',
        'Village Name': s.villageName || 'N/A',
        'Vehicle ID': s.vehicle?.vehicleNumber || 'N/A',
        'POS Terminal': s.terminal?.name || 'N/A',
        'Customer Mobile': s.mobile || 'N/A',
        'Description': s.remark || 'N/A',
        'Unique ID': s.id,
        'No. of Products': s.items?.length || 0,
        'Total items': s.items?.length || 0,
        'Total Quantity': totalQty,
        'Sum of qty': totalQty,
        'Invoice Amount': s.totalAmount.toFixed(0),
        'Discount': totalDiscount.toFixed(0),
        'Total bill': s.totalAmount.toFixed(0),
        'Payment Mode': s.paymentMode || 'Cash',
        'Cash / UPI / Credit': s.paymentMode || 'Cash',
        'Cash Amount': (s.cashAmount || 0).toFixed(0),
        'UPI Amount': (s.upiAmount || 0).toFixed(0),
        'Return Amount': returnAmt.toFixed(0),
        'Net Amount': (s.totalAmount - returnAmt).toFixed(0),
        'After return': (s.totalAmount - returnAmt).toFixed(0),
        'Sold By (Agent)': s.user?.name || s.userName,
        'VGE Name': s.user?.name || s.userName,
        'Order Status': s.status,
        'Completed / Cancelled': s.status,
        'Sync Status': 'Synced',
        'Pending / Synced': 'Synced',
        'Created At': s.createdAt,
        'Timestamp': new Date(s.createdAt).getTime()
      };
    });
    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "SalesHistory");
    XLSX.writeFile(wb, `Sales_History_${new Date().toLocaleDateString()}.xlsx`);
    toast.success('Comprehensive sales history exported');
  };

  const exportOrderDetailToExcel = () => {
    if (!viewingOrder) return;
    const returnAmt = viewingOrder.returns?.reduce((sum, r) => sum + r.refundAmount, 0) || 0;
    const totalQty = viewingOrder.items?.reduce((sum, i) => sum + i.quantity, 0) || 0;
    const totalDiscount = viewingOrder.items?.reduce((sum, i) => sum + (i.discount || 0), 0) || 0;

    const data = viewingOrder.items.map(item => ({
      'Invoice ID': viewingOrder.displayId || viewingOrder.orderNumber,
      'Date': format(new Date(viewingOrder.createdAt), 'dd-MM-yyyy'),
      'Time': format(new Date(viewingOrder.createdAt), 'hh:mm a'),
      'Product': item.product?.name || item.productName,
      'Price': item.price,
      'Quantity': item.quantity,
      'Item Discount': (item.discount || 0).toFixed(0),
      'Item Total': (item.price * item.quantity).toFixed(0),
      'Customer Mobile': viewingOrder.mobile || 'N/A',
      'Agent': viewingOrder.user?.name || viewingOrder.userName,
      'Payment Mode': viewingOrder.paymentMode,
      'Status': viewingOrder.status,
      'Unique ID': viewingOrder.id
    }));

    // Add summary row
    data.push({
      'Invoice ID': 'SUMMARY',
      'Date': '',
      'Time': '',
      'Product': 'TOTALS',
      'Price': '',
      'Quantity': totalQty,
      'Item Discount': totalDiscount.toFixed(0),
      'Item Total': viewingOrder.totalAmount.toFixed(0),
      'Customer Mobile': `Net: ${(viewingOrder.totalAmount - returnAmt).toFixed(0)}`,
      'Agent': '',
      'Payment Mode': '',
      'Status': '',
      'Unique ID': ''
    });

    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "OrderDetails");
    XLSX.writeFile(wb, `Order_${viewingOrder.displayId || viewingOrder.orderNumber}.xlsx`);
    toast.success('Detailed order exported');
  };

  const handleExportPDF = () => {
    generateReportPDF('invoices', listToRender);
  };

  const handlePrintList = () => {
    generateReportPDF('invoices', listToRender, true);
  };

  const handleDownloadReport = (shouldPrint = false) => {
    if (shouldPrint) {
      handlePrintList();
      return;
    }
    exportHistoryToExcel();
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
      const grossAmount = order.totalAmount + (order.discountAmount || 0);
      doc.text(`Gross Bill: Rs. ${grossAmount.toFixed(0)}`, 110, y + 2);
      if (order.discountAmount > 0) {
        doc.setTextColor(16, 185, 129); // Emerald-600
        doc.text(`Promo Discount: -Rs. ${order.discountAmount.toFixed(0)}`, 110, y + 9);
        doc.setTextColor(40, 40, 40);
      }
      doc.text(`Total Payable: Rs. ${order.totalAmount.toFixed(0)}`, 110, y + 16);
      doc.setFont("helvetica", "normal");
      doc.text(`Net After Returns: Rs. ${(order.totalAmount - returnAmt).toFixed(0)}`, 25, y + 9);
      doc.text(`Paid via: ${order.paymentMode}`, 25, y + 16);

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
        doc.text(item.price.toFixed(0), 145, y);
        doc.text((item.price * item.quantity).toFixed(0), 185, y, { align: "right" });
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

  const handleDownloadSample = () => {
    const ws = XLSX.utils.json_to_sheet([
      {
        "Invoice Group ID": "INV-001",
        "Customer Name": "Rajesh Kumar",
        "Mobile Number": "9876543210",
        "Payment Mode": "CASH",
        "Sale Date": format(new Date(), 'yyyy-MM-dd'),
        "Village Name": "Rampur",
        "Product Name": "Basmati Rice 1kg",
        "Quantity": 2,
        "Unit Price": 110,
        "Discount": 0,
        "Remark": "Bulk purchase delivery"
      },
      {
        "Invoice Group ID": "INV-001",
        "Customer Name": "Rajesh Kumar",
        "Mobile Number": "9876543210",
        "Payment Mode": "CASH",
        "Sale Date": format(new Date(), 'yyyy-MM-dd'),
        "Village Name": "Rampur",
        "Product Name": "Toor Dal 1kg",
        "Quantity": 1,
        "Unit Price": 150,
        "Discount": 5,
        "Remark": "Bulk purchase delivery"
      },
      {
        "Invoice Group ID": "INV-002",
        "Customer Name": "Suresh Walk-in",
        "Mobile Number": "9123456789",
        "Payment Mode": "UPI",
        "Sale Date": format(new Date(), 'yyyy-MM-dd'),
        "Village Name": "Sitapur",
        "Product Name": "Mustard Oil 1L",
        "Quantity": 3,
        "Unit Price": 180,
        "Discount": 10,
        "Remark": "Paid via PhonePe"
      }
    ]);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "SalesBulkImport");
    XLSX.writeFile(wb, "Sales_Bulk_Import_Template.xlsx");
    toast.success('Sample template downloaded successfully');
  };

  const handleExcelUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    setIsUploading(true);
    setUploadProgress('Reading Excel file structure...');
    const reader = new FileReader();

    reader.onload = async (evt) => {
      try {
        const bstr = evt.target.result;
        const wb = XLSX.read(bstr, { type: 'binary' });
        const wsname = wb.SheetNames[0];
        const ws = wb.Sheets[wsname];
        const data = XLSX.utils.sheet_to_json(ws);

        if (data.length === 0) {
          toast.error('Uploaded Excel file contains no data rows');
          setIsUploading(false);
          setUploadProgress('');
          e.target.value = '';
          return;
        }

        setUploadProgress('Fetching product catalog for automated mapping...');
        // Fetch all products to resolve product IDs accurately
        const itemsRes = await adminAPI.getItems({ limit: 5000 });
        let productsList = itemsRes.data?.data || itemsRes.data || [];

        // Determine default store ID
        const resolvedStoreId = storeFilterId || currentUser?.storeId || (stores.length > 0 ? stores[0].id : undefined);

        // ── SELF-HEALING AUTO-CREATE PHASE ──
        if (autoCreateProducts) {
          const missingPayloads = [];
          const seenNames = new Set(productsList.map(p => p.name.toLowerCase().trim()));
          
          data.forEach(row => {
            const keys = Object.keys(row);
            const findVal = (search) => {
              const matchedKey = keys.find(k => k.toLowerCase().includes(search.toLowerCase()));
              return matchedKey ? row[matchedKey] : undefined;
            };
            const productName = findVal('product name') || findVal('product') || findVal('item name') || findVal('item');
            if (productName) {
              const cleanName = productName.toString().trim();
              const lowerName = cleanName.toLowerCase();
              if (!seenNames.has(lowerName)) {
                seenNames.add(lowerName);
                const unitPrice = parseFloat(findVal('unit price') || findVal('price') || findVal('rate')) || 100;
                const discount = parseFloat(findVal('discount')) || 0;
                missingPayloads.push({
                  name: cleanName,
                  price: unitPrice,
                  mrp: unitPrice,
                  landingPrice: Math.round(unitPrice * 0.8),
                  discount: discount,
                  gst: 0,
                  description: 'Auto-registered via Bulk Sales Spreadsheet',
                  categoryName: 'General',
                  subCategoryName: 'General Items',
                  unitType: 'PCS',
                  unitValue: 1
                });
              }
            }
          });

          if (missingPayloads.length > 0) {
            setUploadProgress(`Auto-registering ${missingPayloads.length} missing products into master inventory...`);
            try {
              await adminAPI.bulkCreateItems(missingPayloads);
              // Refetch product catalog to obtain their newly assigned unique database IDs
              const freshRes = await adminAPI.getItems({ limit: 5000 });
              productsList = freshRes.data?.data || freshRes.data || [];
            } catch (createErr) {
              console.error('Auto-create products failed:', createErr);
              toast.error('Failed to auto-create missing products. Continuing with available items.');
            }
          }
        }

        // Group rows into separate orders intelligently
        const ordersGroups = [];
        let currentGroup = null;

        data.forEach((row, index) => {
          const keys = Object.keys(row);
          const findVal = (search) => {
            const matchedKey = keys.find(k => k.toLowerCase().includes(search.toLowerCase()));
            return matchedKey ? row[matchedKey] : undefined;
          };

          const invoiceGroupId = findVal('invoice group id') || findVal('invoice id') || findVal('group id');
          const customerName = findVal('customer name') || findVal('customer') || 'Walk-in Customer';
          const mobile = findVal('mobile number') || findVal('mobile') || findVal('phone') || '';
          const pModeRaw = findVal('payment mode') || findVal('payment') || 'CASH';
          let paymentMode = 'CASH';
          if (pModeRaw.toString().toUpperCase().includes('UPI')) paymentMode = 'UPI';
          if (pModeRaw.toString().toUpperCase().includes('SPLIT') || pModeRaw.toString().toUpperCase().includes('CASH_UPI')) paymentMode = 'CASH_UPI';

          const saleDateStr = findVal('sale date') || findVal('date');
          let saleDate = undefined;
          if (saleDateStr) {
            // Check if Excel serial date or string
            if (typeof saleDateStr === 'number') {
              const dateObj = new Date((saleDateStr - (25567 + 2)) * 86400 * 1000);
              saleDate = format(dateObj, 'yyyy-MM-dd');
            } else {
              saleDate = new Date(saleDateStr).toISOString().split('T')[0];
            }
          }

          const villageName = findVal('village name') || findVal('village') || findVal('location') || '';
          const remark = findVal('remark') || findVal('notes') || '';

          // Item fields
          const productName = findVal('product name') || findVal('product') || findVal('item name') || findVal('item');
          const qty = parseInt(findVal('quantity') || findVal('qty')) || 1;
          const unitPrice = parseFloat(findVal('unit price') || findVal('price') || findVal('rate'));
          const discount = parseFloat(findVal('discount')) || 0;

          if (!productName) return; // Skip rows without products

          // Resolve product object
          const matchedProduct = productsList.find(p => p.name.toLowerCase().trim() === productName.toString().toLowerCase().trim() || (p.sku && p.sku.toLowerCase().trim() === productName.toString().toLowerCase().trim()));

          const itemObj = {
            productNameRaw: productName,
            productId: matchedProduct ? matchedProduct.id : null,
            quantity: qty,
            price: !isNaN(unitPrice) ? unitPrice : (matchedProduct ? matchedProduct.price : 0),
            discount: discount,
            gst: matchedProduct ? (matchedProduct.taxPercent || matchedProduct.gst || 0) : 0
          };

          // Decide whether to merge into current group or start new group
          let shouldMerge = false;
          if (currentGroup) {
            if (invoiceGroupId && currentGroup.invoiceGroupId === invoiceGroupId) {
              shouldMerge = true;
            } else if (!invoiceGroupId && !currentGroup.invoiceGroupId) {
              // Merge if consecutive rows share identical customer credentials and dates
              if (currentGroup.mobile === mobile && currentGroup.customerName === customerName) {
                shouldMerge = true;
              }
            }
          }

          if (shouldMerge && currentGroup) {
            currentGroup.items.push(itemObj);
          } else {
            // Push active group and create new
            if (currentGroup) ordersGroups.push(currentGroup);
            currentGroup = {
              invoiceGroupId,
              customerName,
              mobile: mobile ? mobile.toString() : '',
              paymentMode,
              saleDate,
              villageName,
              remark,
              storeId: resolvedStoreId,
              items: [itemObj]
            };
          }

          // Push the final group on last iteration
          if (index === data.length - 1 && currentGroup) {
            ordersGroups.push(currentGroup);
          }
        });

        if (ordersGroups.length === 0) {
          toast.error('No valid products or items mapped from the Excel sheet');
          setIsUploading(false);
          setUploadProgress('');
          e.target.value = '';
          return;
        }

        // Process orders concurrently in optimized batches for ultra-fast throughput
        let successCount = 0;
        let missingProducts = [];
        const CONCURRENT_BATCH_SIZE = 15;

        for (let i = 0; i < ordersGroups.length; i += CONCURRENT_BATCH_SIZE) {
          const batchGroups = ordersGroups.slice(i, i + CONCURRENT_BATCH_SIZE);
          setUploadProgress(`Optimized Batch Ingestion: Processing records ${i + 1} to ${Math.min(i + CONCURRENT_BATCH_SIZE, ordersGroups.length)} of ${ordersGroups.length}...`);

          const batchPromises = batchGroups.map(async (grp, localIdx) => {
            const absoluteIdx = i + localIdx;
            const validItems = grp.items.filter(item => {
              if (!item.productId) {
                missingProducts.push(item.productNameRaw);
                return false;
              }
              return true;
            });

            if (validItems.length === 0) {
              console.warn(`Skipping order group for ${grp.customerName} because no products were successfully matched.`);
              return { success: false, skipped: true };
            }

            const orderTotalAmt = validItems.reduce((sum, item) => sum + (item.price * item.quantity), 0);
            const payload = {
              storeId: grp.storeId || undefined,
              customerName: grp.customerName !== 'Walk-in Customer' ? grp.customerName : undefined,
              mobile: grp.mobile || undefined,
              paymentMode: grp.paymentMode,
              saleDate: grp.saleDate || undefined,
              villageName: grp.villageName || undefined,
              remark: grp.remark || undefined,
              cashAmount: grp.paymentMode === 'CASH' ? orderTotalAmt : (grp.paymentMode === 'CASH_UPI' ? orderTotalAmt / 2 : 0),
              upiAmount: grp.paymentMode === 'UPI' ? orderTotalAmt : (grp.paymentMode === 'CASH_UPI' ? orderTotalAmt / 2 : 0),
              items: validItems.map(vi => ({
                productId: vi.productId,
                quantity: vi.quantity,
                price: vi.price,
                discount: vi.discount,
                gst: vi.gst
              }))
            };
            let attempt = 0;
            let success = false;
            let serverMsg = '';

            while (attempt < 4 && !success) {
              try {
                await adminAPI.createManualSale(payload);
                success = true;
                return { success: true, absoluteIdx };
              } catch (err) {
                serverMsg = err.response?.data?.message || err.response?.data?.detail || err.message;
                if (serverMsg && serverMsg.toLowerCase().includes('deadlock')) {
                  attempt++;
                  if (attempt < 4) {
                    await new Promise(r => setTimeout(r, 40 * attempt + Math.random() * 60));
                  }
                } else {
                  console.error(`Row upload failed for order ${absoluteIdx + 1}:`, err.response?.data || err);
                  return { success: false, absoluteIdx, serverMsg };
                }
              }
            }
            return { success: false, absoluteIdx, serverMsg };
          });

          const results = await Promise.all(batchPromises);
          results.forEach(res => {
            if (res.success) {
              successCount++;
            } else if (!res.skipped) {
              toast.error(`Order ${res.absoluteIdx + 1} failed: ${res.serverMsg}`);
            }
          });
        }

        setIsUploading(false);
        setUploadProgress('');
        setShowBulkUploadModal(false);
        e.target.value = ''; // Reset input

        if (successCount > 0) {
          toast.success(`Successfully recorded ${successCount} sales orders in bulk!`);
          fetchSales();
        } else {
          toast.error('Bulk upload completed but zero rows could be fully finalized.');
        }

        if (missingProducts.length > 0) {
          const uniqueMissing = [...new Set(missingProducts)];
          toast.error(`Unrecognized products skipped: ${uniqueMissing.slice(0, 3).join(', ')}${uniqueMissing.length > 3 ? '...' : ''}`, { duration: 6000 });
        }

      } catch (err) {
        console.error('Excel Parsing Error:', err);
        toast.error('Encountered an exception parsing Excel binary layout');
        setIsUploading(false);
        setUploadProgress('');
        e.target.value = '';
      }
    };

    reader.readAsBinaryString(file);
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
    
    // Tab filtering
    if (roleTab === 'Admins') {
      const adminRoles = ['ADMIN', 'SUPER_ADMIN', 'TENANT_OWNER'];
      if (!adminRoles.includes(s.user?.role)) return false;
    } else if (roleTab === 'Agent') {
      if (s.user?.role !== 'SALES_AGENT') return false;
    }
    // Segmented Control Filter
    if (saleType === 'POS' && s.orderType !== 'POS' && s.vehicleId) return false;
    if (saleType === 'AGENT' && (s.orderType === 'POS' || !s.vehicleId)) return false;

    const query = searchQuery.toLowerCase();
    const invoiceStr = s.orderNumber ? `vk-${s.orderNumber}` : `vk-${Date.now().toString().slice(-6)}`;
    const customerName = s.customerName ? s.customerName.toLowerCase() : '';
    return invoiceStr.includes(query) || (s.mobile && s.mobile.includes(searchQuery)) || customerName.includes(query);
  });

  // Gatekeeper removed for Tenant Owners to allow "All Stores" sales view

  const totalPages = Math.ceil((roleTab === 'Customer' ? customerList.length : listToRender.length) / ITEMS_PER_PAGE);
  const paginatedData = (roleTab === 'Customer' ? customerList : listToRender).slice((currentPage - 1) * ITEMS_PER_PAGE, currentPage * ITEMS_PER_PAGE);



  const renderClassifiedSales = () => {
    if (!storeFilterId) {
      const salesByStore = sales.reduce((acc, s) => {
        if (s.storeId) {
          acc[s.storeId] = (acc[s.storeId] || 0) + (s.totalAmount || 0);
        }
        return acc;
      }, {});

      const ordersByStore = sales.reduce((acc, s) => {
        if (s.storeId) {
          acc[s.storeId] = (acc[s.storeId] || 0) + 1;
        }
        return acc;
      }, {});

      const personnelByStore = users.reduce((acc, u) => {
        if (u.storeId && u.id !== currentUser?.id) {
          acc[u.storeId] = (acc[u.storeId] || 0) + 1;
        }
        return acc;
      }, {});

      return (
        <div className="flex flex-col gap-4 pt-4 animate-in fade-in slide-in-from-bottom-6 max-w-5xl">
          <div className="mb-2">
            <h3 className="text-xl font-black tracking-tight text-gray-900">Branch Performance</h3>
            <p className="text-[10px] font-bold text-gray-400 tracking-widest uppercase mt-1 italic">Select a branch to view detailed sales history and customer metrics</p>
          </div>
          {stores.map(store => {
            const totalRevenue = salesByStore[store.id] || 0;
            const totalOrders = ordersByStore[store.id] || 0;
            const personnelCount = personnelByStore[store.id] || 0;
            
            return (
              <button
                key={store.id}
                onClick={() => setSearchParams({ storeId: store.id })}
                className="group w-full bg-white p-5 rounded-[1.5rem] border border-gray-100 shadow-sm hover:shadow-xl hover:border-emerald-200 transition-all duration-300 flex items-center justify-between gap-6 relative overflow-hidden"
              >
                <div className="absolute left-0 top-0 w-2 h-full bg-emerald-500/10 group-hover:bg-emerald-500 transition-all" />
                
                <div className="flex items-center gap-5">
                  <div className="w-12 h-12 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center group-hover:bg-emerald-600 group-hover:text-white transition-colors shrink-0">
                    <Building2 size={24} strokeWidth={2.5} />
                  </div>
                  <div className="flex flex-col text-left">
                    <h4 className="text-lg font-black text-gray-900 tracking-tight leading-none mb-1">{store.name}</h4>
                    <div className="flex items-center gap-2">
                      <span className="text-[9px] font-black text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded tracking-widest uppercase">{store.code || 'Branch'}</span>
                      {store.stateCode && <span className="text-[9px] font-bold text-gray-400 uppercase tracking-widest">• {store.stateCode}</span>}
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-8">
                  <div className="hidden lg:flex flex-col items-end">
                    <span className="text-[10px] font-black uppercase text-gray-400 tracking-widest">Revenue</span>
                    <span className="text-sm font-bold text-gray-900">₹{totalRevenue.toLocaleString()}</span>
                  </div>
                  <div className="hidden md:flex flex-col items-end">
                    <span className="text-[10px] font-black uppercase text-gray-400 tracking-widest">Total Orders</span>
                    <span className="text-sm font-bold text-gray-900">{totalOrders} Sales</span>
                  </div>
                  <div className="hidden md:flex flex-col items-end">
                    <span className="text-[10px] font-black uppercase text-gray-400 tracking-widest">Personnel</span>
                    <span className="text-sm font-bold text-gray-900">{personnelCount} Members</span>
                  </div>
                  <div className="w-10 h-10 rounded-xl bg-gray-50 flex items-center justify-center text-gray-400 group-hover:bg-emerald-600 group-hover:text-white transition-all">
                    <ChevronRight size={20} strokeWidth={3} />
                  </div>
                </div>
              </button>
            );
          })}
          {stores.length === 0 && (
            <div className="py-12 text-center bg-white rounded-[2rem] border border-dashed border-gray-200">
              <Building2 size={48} className="mx-auto text-gray-300 mb-4" />
              <p className="text-sm font-bold text-gray-400 uppercase tracking-widest">No Active Branches Found</p>
            </div>
          )}
        </div>
      );
    }
    return null;
  };

  const classifiedView = renderClassifiedSales();
  if (classifiedView) return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500 pb-20">
      <div className="flex flex-col gap-1">
        <h2 className="text-2xl font-black text-gray-900 tracking-tight">Sales Management</h2>
        <p className="text-sm text-gray-500">Categorize your sales operations by branch</p>
      </div>
      {classifiedView}
    </div>
  );

  return (
    <div className="main-content-to-print space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div className="flex flex-col gap-1">
          <div className="flex items-center gap-3 flex-wrap">
            {storeFilterId && stores.length > 1 && (
              <button
                onClick={() => setSearchParams({})}
                className="p-2.5 bg-white border border-gray-100 rounded-xl text-gray-400 hover:text-emerald-600 hover:border-emerald-100 transition-all shadow-sm active:scale-90"
                title="Back to All Branches"
              >
                <ChevronLeft size={18} />
              </button>
            )}
            <h2 className="text-2xl font-black text-gray-900 tracking-tight">Sales Management</h2>
            {stores.length > 1 && (
              <select
                value={storeFilterId || ''}
                onChange={(e) => {
                  if (e.target.value) {
                    setSearchParams({ storeId: e.target.value });
                  } else {
                    setSearchParams({});
                  }
                }}
                className="bg-emerald-50 text-emerald-700 text-[10px] font-black uppercase tracking-widest pl-3 pr-7 py-1.5 rounded-xl border-none outline-none appearance-none focus:ring-2 focus:ring-emerald-500/20 cursor-pointer shadow-sm ml-1"
                style={{
                  backgroundImage: `url("data:image/svg+xml,%3csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 20 20'%3e%3cpath stroke='%23047857' stroke-linecap='round' stroke-linejoin='round' stroke-width='2' d='M5.25 7.5L10 12.25L14.75 7.5'/%3e%3c/svg%3e")`,
                  backgroundPosition: 'right 0.35rem center',
                  backgroundRepeat: 'no-repeat',
                  backgroundSize: '1.1rem'
                }}
              >
                <option value="">All Branches</option>
                {stores.map(s => (
                  <option key={s.id} value={s.id}>{s.name}</option>
                ))}
              </select>
            )}
          </div>
          <p className="text-sm font-medium text-gray-500">View and manage all transaction history</p>
        </div>

        {can('SALES', 'CREATE') && !viewingOrder && !showCreateSale && (
          <div className="flex items-center gap-2 no-print">
            <button
              onClick={() => setShowCreateSale(true)}
              className="bg-emerald-600 text-white px-4 py-2.5 rounded-xl text-sm font-bold shadow-sm hover:bg-emerald-700 hover:shadow-md transition-all flex items-center gap-2 group"
            >
              <Plus size={18} className="group-hover:rotate-90 transition-transform duration-300" />
              Create Sale
            </button>
            <button
              onClick={() => setShowBulkUploadModal(true)}
              className="bg-amber-50 text-amber-700 border border-amber-100 px-4 py-2.5 rounded-xl text-sm font-bold shadow-sm hover:bg-amber-100 transition-all flex items-center gap-2 group"
              title="Bulk Import Sales via Excel"
            >
              <FileSpreadsheet size={18} className="group-hover:-translate-y-0.5 transition-transform" />
              Bulk Import
            </button>
            <button
              onClick={() => setViewMode(prev => prev === 'analytics' ? 'list' : 'analytics')}
              className={`px-6 py-3 rounded-2xl transition-all flex items-center gap-2 font-black text-xs uppercase tracking-widest shadow-sm border ${viewMode === 'analytics' ? 'bg-emerald-600 text-white border-emerald-600' : 'bg-emerald-50 text-emerald-700 border-emerald-100 hover:bg-emerald-100'}`}
            >
              {viewMode === 'analytics' ? (
                <>
                  <FileText size={18} /> Sales List
                </>
              ) : (
                <>
                  <BarChart3 size={18} /> Analytics
                </>
              )}
            </button>
            <button
              onClick={exportHistoryToExcel}
              className="bg-emerald-50 text-emerald-600 border border-emerald-100 p-3 rounded-xl hover:bg-emerald-100 transition-all shadow-sm group"
              title="Export Excel"
            >
              <Download size={20} />
            </button>
            <button
              onClick={handleExportPDF}
              className="bg-rose-50 text-rose-600 border border-rose-100 p-3 rounded-xl hover:bg-rose-100 transition-all shadow-sm group"
              title="Export PDF"
            >
              <FileText size={20} />
            </button>
            <button
              onClick={handlePrintList}
              className="bg-blue-50 text-blue-600 border border-blue-100 p-3 rounded-xl hover:bg-blue-100 transition-all shadow-sm group"
              title="Print History"
            >
              <Printer size={20} />
            </button>
          </div>
        )}
      </div>

      {/* Global Tab Navigation */}
      {!viewingOrder && !showCreateSale && (
        <div className="flex flex-col gap-3 mb-4">
          <div className="flex items-center gap-2 bg-gray-50/50 p-1.5 rounded-2xl border border-gray-100 w-fit no-print">
            <button
              onClick={() => { setActiveTab('sales'); setCurrentPage(1); }}
              className={`flex items-center gap-2 px-6 py-2.5 rounded-xl font-black text-xs uppercase tracking-widest transition-all ${
                activeTab === 'sales' 
                  ? 'bg-white text-emerald-600 shadow-sm border border-emerald-100' 
                  : 'text-gray-500 hover:text-emerald-600 hover:bg-gray-100/50 border border-transparent'
              }`}
            >
              <ShoppingCart size={16} />
              Sales List
            </button>
            <button
              onClick={() => { setActiveTab('customers'); setCurrentPage(1); }}
              className={`flex items-center gap-2 px-6 py-2.5 rounded-xl font-black text-xs uppercase tracking-widest transition-all ${
                activeTab === 'customers' 
                  ? 'bg-white text-emerald-600 shadow-sm border border-emerald-100' 
                  : 'text-gray-500 hover:text-emerald-600 hover:bg-gray-100/50 border border-transparent'
              }`}
            >
              <User size={16} />
              Customer Data
            </button>
            <button
              onClick={() => { setActiveTab('analytics'); setCurrentPage(1); }}
              className={`flex items-center gap-2 px-6 py-2.5 rounded-xl font-black text-xs uppercase tracking-widest transition-all ${
                activeTab === 'analytics' 
                  ? 'bg-white text-emerald-600 shadow-sm border border-emerald-100' 
                  : 'text-gray-500 hover:text-emerald-600 hover:bg-gray-100/50 border border-transparent'
              }`}
            >
              <BarChart3 size={16} />
              Analytics
            </button>
          </div>

          {activeTab === 'sales' && viewMode === 'list' && (
            <div className="flex items-center gap-2 p-1 bg-gray-50 rounded-2xl border border-gray-100 w-fit no-print animate-in fade-in duration-200">
              {[
                { id: 'All', icon: ShoppingCart, label: 'All Sales' },
                { id: 'Admins', icon: Shield, label: 'Admins' },
                { id: 'Agent', icon: User, label: 'Agents' },
                { id: 'Customer', icon: User, label: 'Customers' },
              ].map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => { setRoleTab(tab.id); setCurrentPage(1); }}
                  className={`flex items-center gap-2 px-6 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${
                    roleTab === tab.id
                      ? 'bg-white text-emerald-600 shadow-sm border border-emerald-50'
                      : 'text-gray-400 hover:text-gray-600'
                  }`}
                >
                  <tab.icon size={14} />
                  {tab.label}
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      {showCreateSale ? (
        <ManualSaleDrawer 
          isOpen={showCreateSale} 
          onClose={() => setShowCreateSale(false)} 
          onSuccess={() => { setShowCreateSale(false); fetchSales(); }}
        />
      ) : viewingOrder ? (
        /* ========== SALES DETAIL FULL PAGE VIEW ========== */
        <>
          <div className="space-y-6 animate-in slide-in-from-right-4 fade-in duration-500 pb-12">
            {/* Header Section */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div className="flex items-center gap-4">
                <button
                  onClick={() => closeOrderDetail()}
                  className="w-12 h-12 bg-white rounded-2xl border border-gray-100 flex items-center justify-center text-gray-400 hover:text-emerald-600 hover:border-emerald-100 transition-all shadow-sm group"
                >
                  <ArrowLeft size={20} className="group-hover:-translate-x-1 transition-transform" />
                </button>
                <div>
                  <div className="flex items-center gap-3">
                    <h2 className="text-2xl font-black text-gray-900 tracking-tight">
                      Invoice <span className="text-emerald-600">#{detailOrder.displayId || detailOrder.orderNumber || viewingOrder.displayId || viewingOrder.orderNumber}</span>
                    </h2>
                    <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest border ${(detailOrder.status || viewingOrder.status) === 'COMPLETED' ? 'bg-emerald-50 text-emerald-600 border-emerald-100' :
                      (detailOrder.status || viewingOrder.status) === 'RETURNED' ? 'bg-emerald-50 text-emerald-600 border-emerald-100' :
                        (detailOrder.status || viewingOrder.status) === 'CANCELLED' ? 'bg-rose-50 text-rose-600 border-rose-100' :
                          'bg-emerald-50 text-emerald-600 border-emerald-100'
                      }`}>
                      {detailOrder.status || viewingOrder.status || 'PENDING'}
                    </span>
                    {loadingOrder && <Loader2 size={16} className="animate-spin text-gray-300" />}
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

              <div className="flex items-center gap-3 no-print">
                <button
                  onClick={exportOrderDetailToExcel}
                  className="bg-emerald-50 text-emerald-700 border border-emerald-100 px-6 py-3 rounded-2xl font-black text-xs uppercase tracking-widest flex items-center gap-2 hover:bg-emerald-100 transition-all active:scale-95 shadow-sm"
                >
                  <FileDown size={16} /> Excel
                </button>
                <button onClick={() => window.print()} className="bg-white text-gray-700 border border-gray-200 px-6 py-3 rounded-2xl font-black text-xs uppercase tracking-widest flex items-center gap-2 hover:bg-gray-50 transition-all active:scale-95 shadow-sm">
                  <Printer size={16} /> Print Invoice
                </button>
                <div className="h-12 w-[1px] bg-gray-100 mx-1 hidden md:block"></div>
                <div className="flex flex-col items-end">
                  <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Total Bill Amount</p>
                  <p className="text-2xl font-black text-gray-900 tabular-nums tracking-tighter">₹{(viewingOrder.totalAmount || 0).toFixed(0)}</p>
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
                      <p className="text-xl font-black text-emerald-900 group-hover:text-white tabular-nums">₹{(viewingOrder.totalAmount || 0).toFixed(0)}</p>
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
                        <p className="text-xl font-black text-indigo-900 group-hover:text-white tabular-nums">₹{(viewingOrder.totalAmount || 0).toFixed(0)}</p>
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
                          <span className="text-amber-900 group-hover:text-white">₹{(viewingOrder.cashAmount || 0).toFixed(0)}</span>
                        </div>
                        <div className="flex justify-between text-[10px] font-black">
                          <span className="text-amber-500 group-hover:text-amber-200">UPI:</span>
                          <span className="text-amber-900 group-hover:text-white">₹{(viewingOrder.upiAmount || 0).toFixed(0)}</span>
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
                      <p className="text-xl font-black text-rose-900 group-hover:text-white tabular-nums">₹{(viewingOrder.returns?.reduce((sum, r) => sum + r.refundAmount, 0) || 0).toFixed(0)}</p>
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
                      <p className="text-sm font-black text-rose-600">-₹{(viewingOrder.items?.reduce((sum, i) => sum + (i.discount || 0), 0) || 0).toFixed(0)}</p>
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
                          <th className="px-6 py-5 text-[10px] font-black text-gray-400 uppercase tracking-widest text-right">Sub-Total</th>
                          {canEditOrder && <th className="px-6 py-5 text-[10px] font-black text-gray-400 uppercase tracking-widest text-right">Actions</th>}
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-50">
                        {(detailOrder.items || viewingOrder.items)?.map((item, idx) => (
                          <tr key={idx} className="hover:bg-gray-50/30 transition-colors">
                            <td className="px-8 py-5">
                              <div className="flex items-center gap-4">
                                <div className="w-10 h-10 bg-gray-50 rounded-2xl flex items-center justify-center text-[10px] font-black text-gray-400 border border-gray-100">
                                  {idx + 1}
                                </div>
                                <div>
                                  <p className="text-xs font-black text-gray-900 uppercase tracking-tight">{item.product?.name || item.productName || 'Unknown Product'}</p>
                                  <p className="text-[9px] font-bold text-emerald-600 uppercase mt-0.5 tracking-widest">SKU: {item.productId?.slice(-6).toUpperCase()}</p>
                                  {item.returnedQty > 0 && (
                                    <p className="text-[9px] font-black text-rose-500 mt-0.5 flex items-center gap-1"><RotateCcw size={8} /> {item.returnedQty} returned</p>
                                  )}
                                </div>
                              </div>
                            </td>
                            <td className="px-6 py-5 text-center whitespace-nowrap">
                              <span className="text-xs font-black text-emerald-700 bg-emerald-50 px-3 py-1.5 rounded-xl border border-emerald-100 whitespace-nowrap">
                                {item.quantity} {item.product?.unit?.name || 'pcs'}
                              </span>
                            </td>
                            <td className="px-6 py-5 text-right font-black text-gray-600 text-xs tabular-nums">
                              ₹{(item.price || 0).toFixed(0)}
                            </td>
                            <td className="px-6 py-5 text-right font-black text-gray-400 text-[10px] tabular-nums">
                              {item.product?.gst || 0}%
                            </td>
                            <td className="px-6 py-5 text-right font-black text-gray-900 text-xs tabular-nums">
                              ₹{(item.price * item.quantity).toFixed(0)}
                            </td>
                            {canEditOrder && (
                              <td className="px-6 py-5">
                                <div className="flex items-center justify-end gap-1.5">
                                  {/* <button
                                    title="Edit Quantity"
                                    onClick={() => { setEditingItem(item); setEditQty(item.quantity); }}
                                    className="w-8 h-8 flex items-center justify-center bg-sky-50 text-sky-600 rounded-xl hover:bg-sky-500 hover:text-white transition-all border border-sky-100 shadow-sm"
                                  >
                                    <Edit3 size={14} />
                                  </button> */}
                                  {(item.returnableQty > 0 || (!fullOrder && item.quantity > 0)) && (
                                    <button
                                      title="Return Item"
                                      onClick={() => { setReturningItem(item); setReturnQty(1); }}
                                      className="w-8 h-8 flex items-center justify-center bg-emerald-50 text-emerald-600 rounded-xl hover:bg-emerald-500 hover:text-white transition-all border border-emerald-100 shadow-sm"
                                    >
                                      <RotateCcw size={14} />
                                    </button>
                                  )}
                                  {/* {(detailOrder.items || viewingOrder.items)?.length > 1 && (
                                    <button
                                      title="Remove Item"
                                      onClick={() => { if (confirm('Remove this item from the order?')) handleRemoveItem(item.id); }}
                                      className="w-8 h-8 flex items-center justify-center bg-rose-50 text-rose-500 rounded-xl hover:bg-rose-500 hover:text-white transition-all border border-rose-100 shadow-sm"
                                    >
                                      <Trash2 size={14} />
                                    </button>
                                  )} */}
                                </div>
                              </td>
                            )}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  <div className="p-8 bg-gray-900 text-white flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
                    <div className="flex items-center gap-6">
                      <div>
                        <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest mb-1">Gross Bill</p>
                        <p className="text-lg font-black text-gray-300">₹{((detailOrder.totalAmount || viewingOrder.totalAmount || 0) + (detailOrder.discountAmount || 0)).toFixed(0)}</p>
                      </div>
                      {detailOrder.appliedPromotion && (
                        <>
                          <div className="w-[1px] h-10 bg-gray-800"></div>
                          <div>
                            <p className="text-[9px] font-black text-emerald-400 uppercase tracking-widest mb-1">Promo Discount</p>
                            <p className="text-lg font-black text-emerald-400">-₹{(detailOrder.discountAmount || 0).toFixed(0)}</p>
                            <p className="text-[8px] font-bold text-emerald-500/50 uppercase tracking-tighter">{detailOrder.appliedPromotion.code}</p>
                          </div>
                        </>
                      )}
                      <div className="w-[1px] h-10 bg-gray-800"></div>
                      <div>
                        <p className="text-[9px] font-black text-white uppercase tracking-widest mb-1">Net Payable</p>
                        <p className="text-2xl font-black tracking-tighter">₹{(detailOrder.totalAmount || viewingOrder.totalAmount || 0).toFixed(0)}</p>
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

                {/* Returns History */}
                {detailOrder.returns?.length > 0 && (
                  <div className="bg-rose-50/50 rounded-[2rem] border border-rose-100/50 p-6 space-y-4">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-rose-100 text-rose-600 rounded-xl flex items-center justify-center"><RotateCcw size={18} /></div>
                      <div>
                        <h3 className="text-sm font-black text-rose-800 uppercase tracking-tight">Return History</h3>
                        <p className="text-[10px] font-bold text-rose-500/70 uppercase tracking-widest">{detailOrder.returns.length} return(s) recorded</p>
                      </div>
                    </div>
                    <div className="space-y-2">
                      {detailOrder.returns.map((r, i) => (
                        <div key={i} className="flex justify-between items-center py-3 px-4 bg-white rounded-2xl border border-rose-100/50">
                          <div>
                            <p className="text-xs font-black text-rose-800">Qty: {r.returnQty} • ₹{(r.returnAmount || r.refundAmount || 0).toFixed(0)}</p>
                            {r.reason && <p className="text-[9px] font-bold text-rose-500/70 mt-0.5">{r.reason}</p>}
                          </div>
                          <span className="text-[9px] font-bold text-rose-400">{format(new Date(r.createdAt), 'dd MMM, hh:mm a')}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Cancel Order */}
                {canEditOrder && (
                  <button
                    onClick={() => setShowCancelConfirm(true)}
                    className="w-full py-4 bg-rose-50 text-rose-500 text-xs font-black uppercase tracking-widest rounded-2xl border border-rose-100 shadow-sm hover:bg-rose-100 transition-all flex items-center justify-center gap-2"
                  >
                    <XCircle size={16} /> Cancel Entire Order
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* ── EDIT QTY MODAL ── */}
          {editingItem && (
            <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm flex items-center justify-center p-4" onClick={() => setEditingItem(null)}>
              <div className="bg-white w-full max-w-md rounded-[2rem] p-8 space-y-6 shadow-2xl animate-in fade-in zoom-in-95 duration-300" onClick={e => e.stopPropagation()}>
                <div>
                  <h3 className="text-lg font-black text-gray-900 uppercase tracking-tight">Edit Quantity</h3>
                  <p className="text-xs font-bold text-gray-400 mt-1">{editingItem.product?.name || editingItem.productName}</p>
                </div>
                <div className="flex items-center justify-center gap-4">
                  <button onClick={() => setEditQty(Math.max(1, editQty - 1))} className="w-14 h-14 bg-gray-50 text-gray-600 rounded-2xl flex items-center justify-center hover:bg-gray-100 active:scale-90 transition-all border border-gray-100"><Minus size={22} /></button>
                  <input type="number" value={editQty} onChange={e => setEditQty(Math.max(1, parseInt(e.target.value) || 1))} className="w-24 text-center text-3xl font-black text-gray-900 bg-gray-50 rounded-2xl py-3 border border-gray-100 outline-none focus:ring-2 focus:ring-emerald-500/20" />
                  <button onClick={() => setEditQty(editQty + 1)} className="w-14 h-14 bg-emerald-50 text-emerald-600 rounded-2xl flex items-center justify-center hover:bg-emerald-100 active:scale-90 transition-all border border-emerald-100"><Plus size={22} /></button>
                </div>
                <p className="text-center text-xs font-black text-gray-400">New Total: <span className="text-emerald-600">₹{(editQty * (editingItem.price || 0)).toFixed(0)}</span></p>
                <div className="grid grid-cols-2 gap-3">
                  <button onClick={() => setEditingItem(null)} className="py-4 bg-gray-100 text-gray-600 font-black text-xs uppercase rounded-2xl hover:bg-gray-200 transition-all">Cancel</button>
                  <button onClick={handleEditQty} disabled={actionLoading} className="py-4 bg-emerald-600 text-white font-black text-xs uppercase rounded-2xl hover:bg-emerald-700 transition-all disabled:opacity-50 flex items-center justify-center gap-2 shadow-lg shadow-emerald-600/20">
                    {actionLoading ? <Loader2 size={16} className="animate-spin" /> : <CheckCircle2 size={16} />} Confirm
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* ── RETURN MODAL ── */}
          {returningItem && (
            <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm flex items-center justify-center p-4" onClick={() => setReturningItem(null)}>
              <div className="bg-white w-full max-w-md rounded-[2rem] p-8 space-y-6 shadow-2xl animate-in fade-in zoom-in-95 duration-300" onClick={e => e.stopPropagation()}>
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 bg-emerald-50 text-emerald-600 rounded-2xl flex items-center justify-center border border-emerald-100"><RotateCcw size={22} /></div>
                  <div>
                    <h3 className="text-lg font-black text-emerald-800 uppercase tracking-tight">Return Item</h3>
                    <p className="text-xs font-bold text-gray-400 mt-0.5">{returningItem.product?.name || returningItem.productName} • Max: {returningItem.returnableQty || returningItem.quantity}</p>
                  </div>
                </div>
                <div className="flex items-center justify-center gap-4">
                  <button onClick={() => setReturnQty(Math.max(1, returnQty - 1))} className="w-14 h-14 bg-emerald-50 text-emerald-600 rounded-2xl flex items-center justify-center hover:bg-emerald-100 active:scale-90 transition-all border border-emerald-100"><Minus size={22} /></button>
                  <input type="number" value={returnQty} onChange={e => setReturnQty(Math.min(returningItem.returnableQty || returningItem.quantity, Math.max(1, parseInt(e.target.value) || 1)))} className="w-24 text-center text-3xl font-black text-emerald-800 bg-emerald-50 rounded-2xl py-3 border border-emerald-100 outline-none focus:ring-2 focus:ring-emerald-500/20" />
                  <button onClick={() => setReturnQty(Math.min(returningItem.returnableQty || returningItem.quantity, returnQty + 1))} className="w-14 h-14 bg-emerald-50 text-emerald-600 rounded-2xl flex items-center justify-center hover:bg-emerald-100 active:scale-90 transition-all border border-emerald-100"><Plus size={22} /></button>
                </div>
                <div className="bg-rose-50 rounded-2xl p-4 border border-rose-100 text-center">
                  <p className="text-[9px] font-black text-rose-400 uppercase tracking-widest mb-1">Refund Amount</p>
                  <p className="text-2xl font-black text-rose-600 tracking-tighter">₹{(returnQty * (returningItem.price || 0)).toFixed(0)}</p>
                </div>
                <input type="text" placeholder="Reason for return (optional)" value={returnReason} onChange={e => setReturnReason(e.target.value)} className="w-full px-5 py-4 bg-gray-50 rounded-2xl border border-gray-100 text-sm font-bold text-gray-700 outline-none placeholder:text-gray-300 focus:ring-2 focus:ring-emerald-500/20" />
                <div className="grid grid-cols-2 gap-3">
                  <button onClick={() => setReturningItem(null)} className="py-4 bg-gray-100 text-gray-600 font-black text-xs uppercase rounded-2xl hover:bg-gray-200 transition-all">Cancel</button>
                  <button onClick={handleReturn} disabled={actionLoading} className="py-4 bg-emerald-500 text-white font-black text-xs uppercase rounded-2xl hover:bg-emerald-600 transition-all disabled:opacity-50 flex items-center justify-center gap-2 shadow-lg shadow-emerald-500/20">
                    {actionLoading ? <Loader2 size={16} className="animate-spin" /> : <RotateCcw size={16} />} Process Return
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* ── CANCEL CONFIRM MODAL ── */}
          {showCancelConfirm && (
            <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm flex items-center justify-center p-4" onClick={() => setShowCancelConfirm(false)}>
              <div className="bg-white w-full max-w-md rounded-[2rem] p-8 space-y-6 shadow-2xl animate-in fade-in zoom-in-95 duration-300" onClick={e => e.stopPropagation()}>
                <div className="flex items-center gap-4">
                  <div className="w-14 h-14 bg-rose-50 text-rose-500 rounded-2xl flex items-center justify-center border border-rose-100"><AlertTriangle size={28} /></div>
                  <div>
                    <h3 className="text-lg font-black text-rose-600 uppercase tracking-tight">Cancel Order</h3>
                    <p className="text-[10px] font-bold text-gray-400">This will restore all stock and reverse the payment</p>
                  </div>
                </div>
                <div className="bg-rose-50 rounded-2xl p-4 border border-rose-100">
                  <p className="text-xs font-black text-rose-700">Order #{detailOrder?.displayId || detailOrder?.orderNumber} — ₹{(detailOrder?.totalAmount || 0).toFixed(0)}</p>
                </div>
                <input type="text" placeholder="Cancellation reason..." value={cancelReason} onChange={e => setCancelReason(e.target.value)} className="w-full px-5 py-4 bg-gray-50 rounded-2xl border border-gray-100 text-sm font-bold text-gray-700 outline-none placeholder:text-gray-300 focus:ring-2 focus:ring-rose-500/20" />
                <div className="grid grid-cols-2 gap-3">
                  <button onClick={() => setShowCancelConfirm(false)} className="py-4 bg-gray-100 text-gray-600 font-black text-xs uppercase rounded-2xl hover:bg-gray-200 transition-all">Keep Order</button>
                  <button onClick={handleCancel} disabled={actionLoading} className="py-4 bg-rose-500 text-white font-black text-xs uppercase rounded-2xl hover:bg-rose-600 transition-all disabled:opacity-50 flex items-center justify-center gap-2 shadow-lg shadow-rose-500/20">
                    {actionLoading ? <Loader2 size={14} className="animate-spin" /> : <XCircle size={14} />} Confirm Cancel
                  </button>
                </div>
              </div>
            </div>
          )}
        </>
      ) : (
        <div className="space-y-6">
          {activeTab === 'sales' && (
            <>
              {/* Session Control Panel */}
          {sessionData && (
            <div className="bg-white rounded-[2rem] border border-gray-100 shadow-sm p-6 space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-emerald-50 text-emerald-600 rounded-xl flex items-center justify-center border border-emerald-100"><BarChart3 size={20} /></div>
                  <div>
                    <h3 className="text-sm font-black text-gray-900 uppercase tracking-tight">Today's Session</h3>
                    <p className="text-[9px] font-bold text-gray-400 uppercase tracking-widest">{format(new Date(), 'dd MMM yyyy')} • {sessionData.isFrozen ? 'FROZEN' : 'ACTIVE'}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <button onClick={fetchSessionData} disabled={sessionLoading} className="p-2 bg-gray-50 text-gray-400 rounded-xl hover:bg-gray-100 transition-all border border-gray-100">
                    <RefreshCw size={14} className={sessionLoading ? 'animate-spin' : ''} />
                  </button>
                  {!sessionData.isFrozen && (
                    <button onClick={handleFreezeSession} className="flex items-center gap-2 px-4 py-2.5 bg-rose-50 text-rose-600 rounded-xl text-[9px] font-black uppercase tracking-widest hover:bg-rose-100 transition-all border border-rose-100">
                      <Lock size={12} /> Freeze Session
                    </button>
                  )}
                  {sessionData.isFrozen && (
                    <span className="flex items-center gap-2 px-4 py-2.5 bg-gray-100 text-gray-500 rounded-xl text-[9px] font-black uppercase tracking-widest border border-gray-200">
                      <Lock size={12} /> Session Frozen
                    </span>
                  )}
                </div>
              </div>
              <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
                <div className="bg-emerald-50 rounded-2xl p-4 border border-emerald-100">
                  <p className="text-[9px] font-black text-emerald-600/60 uppercase tracking-widest">Orders</p>
                  <p className="text-xl font-black text-emerald-800 tracking-tighter">{sessionData.totalOrders || 0}</p>
                </div>
                <div className="bg-blue-50 rounded-2xl p-4 border border-blue-100">
                  <p className="text-[9px] font-black text-blue-600/60 uppercase tracking-widest">Sales</p>
                  <p className="text-xl font-black text-blue-800 tracking-tighter">₹{(sessionData.totalSales || 0).toLocaleString()}</p>
                </div>
                <div className="bg-rose-50 rounded-2xl p-4 border border-rose-100">
                  <p className="text-[9px] font-black text-rose-600/60 uppercase tracking-widest">Returns</p>
                  <p className="text-xl font-black text-rose-800 tracking-tighter">₹{(sessionData.totalReturns || 0).toLocaleString()}</p>
                </div>
                <div className="bg-gray-50 rounded-2xl p-4 border border-gray-100">
                  <p className="text-[9px] font-black text-gray-500/60 uppercase tracking-widest">Net Sales</p>
                  <p className="text-xl font-black text-gray-900 tracking-tighter">₹{(sessionData.netSales || 0).toLocaleString()}</p>
                </div>
                <div className="bg-amber-50 rounded-2xl p-4 border border-amber-100">
                  <p className="text-[9px] font-black text-amber-600/60 uppercase tracking-widest">Cash / UPI</p>
                  <p className="text-sm font-black text-amber-800 tracking-tight">₹{(sessionData.cashSales || 0).toLocaleString()} / ₹{(sessionData.upiSales || 0).toLocaleString()}</p>
                </div>
              </div>
            </div>
          )}
          {viewMode === 'list' && (
            <div className="flex flex-col lg:flex-row items-center gap-3">
              <div className="flex-1 w-full flex items-center gap-3 bg-white p-3 rounded-2xl border border-gray-100 shadow-sm transition-all focus-within:border-emerald-200 focus-within:ring-4 focus-within:ring-emerald-500/5">
              <Search size={20} className="text-gray-400" />
              <input
                type="text"
                placeholder="Search invoice or mobile..."
                className="flex-1 bg-transparent border-none focus:outline-none text-sm font-bold placeholder:text-gray-300"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
            
            <div className="w-full lg:w-auto flex flex-col md:flex-row items-center gap-3">
              <div className="w-full md:w-auto flex items-center gap-3 bg-gray-50 p-3 rounded-2xl border border-gray-100 px-4">
                <Calendar size={18} className="text-gray-400" />
                <select
                  value={filterDate}
                  onChange={(e) => setFilterDate(e.target.value)}
                  className="bg-transparent border-none focus:outline-none text-xs font-black uppercase tracking-widest appearance-none cursor-pointer"
                >
                  <option>Today</option>
                  <option>Yesterday</option>
                  <option>Last 7 Days</option>
                  <option>All Time</option>
                </select>
                <Filter size={16} className="text-gray-400" />
              </div>

              {/* Segmented Control - Sale Type Tabs */}
              <div className="flex bg-gray-100 p-1 rounded-2xl w-full md:w-auto md:min-w-[340px] shadow-inner">
                {['ALL', 'POS', 'AGENT'].map((type) => (
                  <button
                    key={type}
                    onClick={() => {
                      setSaleType(type);
                      setCurrentPage(1);
                    }}
                    className={`flex-1 py-2 px-4 text-[10px] font-black uppercase tracking-widest rounded-xl transition-all ${
                      saleType === type 
                        ? 'bg-white text-emerald-600 shadow-sm border border-emerald-50' 
                        : 'text-gray-400 hover:text-gray-600'
                    }`}
                  >
                    {type === 'ALL' ? 'All Sales' : type === 'POS' ? 'POS Sales' : 'Agent Sales'}
                  </button>
                ))}
              </div>
            </div>
          </div>
          )}

          <div className="space-y-4">
            {sales.length === 0 ? (
              <div className="text-center py-12 bg-white rounded-2xl border border-dashed border-gray-200">
                <ShoppingCart size={48} className="mx-auto text-gray-300 mb-2" />
                <p className="text-gray-500">No sales found for this period</p>
              </div>
            ) : (
              <>
                <div className="print-section">
                  <div className="print-header">
                    <div className="flex justify-between items-center">
                      <div>
                        <h1 className="text-2xl font-black text-emerald-600 uppercase">Sales History Report</h1>
                        <p className="text-xs font-bold text-gray-400 tracking-[0.2em] uppercase">VillageKart Sales Tracker</p>
                      </div>
                      <div className="text-right text-[10px] font-black text-gray-400 uppercase tracking-widest">Date: {new Date().toLocaleString()}</div>
                    </div>
                  </div>

                  <div className="space-y-4 md:hidden no-print">
                    {paginatedData.map((item) => (
                      <div key={item.id || item.mobile} className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm flex flex-col gap-4">
                        {roleTab === 'Customer' ? (
                          <div className="flex justify-between items-center">
                            <div className="flex items-center gap-3">
                              <div className="w-10 h-10 bg-emerald-50 text-emerald-600 rounded-xl flex items-center justify-center font-black">
                                {item.name.charAt(0)}
                              </div>
                              <div>
                                <h3 className="text-sm font-black text-gray-900 uppercase">{item.name}</h3>
                                <p className="text-[10px] text-gray-400 font-bold">{item.mobile}</p>
                              </div>
                            </div>
                            <div className="text-right">
                              <p className="text-sm font-black text-emerald-700">₹{item.totalSpent.toLocaleString()}</p>
                              <p className="text-[9px] font-bold text-gray-400 uppercase">{item.orderCount} Orders</p>
                            </div>
                          </div>
                        ) : (
                          <>
                            <div className="flex justify-between items-start">
                              <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-xl bg-emerald-50 flex items-center justify-center text-emerald-600">
                                  <ShoppingCart size={20} />
                                </div>
                                <div>
                                  <div className="flex items-center gap-2">
                                    <h3 className="text-sm font-bold text-gray-900 uppercase">
                                      {item.displayId || (item.orderNumber ? `VK-${item.orderNumber}` : `VK-${String(item.id).replace(/\D/g, '').slice(0, 6)}`)}
                                    </h3>
                                    <span className={`text-[8px] font-black uppercase tracking-widest px-1.5 py-0.5 rounded-md ${item.coverageType === 'MORNING' ? 'bg-amber-50 text-amber-600 border border-amber-100' : 'bg-indigo-50 text-indigo-600 border border-indigo-100'}`}>
                                      {item.coverageType || 'N/A'}
                                    </span>
                                  </div>
                                  <p className="text-[10px] text-gray-400 font-bold uppercase mt-1">
                                    {format(new Date(item.createdAt), 'dd MMM yyyy, hh:mm a')}
                                  </p>
                                </div>
                              </div>
                              <div className="flex flex-col items-end">
                                <span className="text-lg font-bold text-gray-900">₹{item.totalAmount.toLocaleString()}</span>
                                <span className="text-[10px] bg-emerald-50 text-emerald-600 px-2 py-0.5 rounded-full font-bold uppercase">
                                  {item.paymentMode || 'Pending'}
                                </span>
                              </div>
                            </div>

                            <div className="grid grid-cols-2 gap-4 border-t border-gray-50 pt-4">
                              <div className="flex flex-col gap-1">
                                <div className="flex items-center gap-2">
                                  <User size={12} className="text-gray-400" />
                                  <span className="text-[10px] font-black text-gray-700 uppercase tracking-tight">
                                    Sold By: {item.user?.name || item.userName || 'System'}
                                  </span>
                                </div>
                                <div className="flex items-center gap-2">
                                  <Truck size={12} className="text-gray-400" />
                                  <span className="text-[10px] font-bold text-gray-500 uppercase tracking-wider">
                                    {item.vehicle?.vehicleNumber || 'No Vehicle'}
                                  </span>
                                </div>
                              </div>
                              <div className="flex items-center justify-end gap-1 text-emerald-600 group cursor-pointer">
                                <button onClick={() => openOrderDetail(item)} className="flex items-center gap-1 text-xs font-bold uppercase tracking-wider">
                                  Details
                                  <ChevronRight size={16} className="group-hover:translate-x-1 transition-transform" />
                                </button>
                              </div>
                            </div>
                          </>
                        )}
                      </div>
                    ))}
                  </div>

                  {/* Desktop Table View & Print Table */}
                  <div className="bg-white rounded-3xl border border-gray-100 shadow-sm overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                      <thead>
                        <tr className="bg-gray-50/50">
                          {roleTab === 'Customer' ? (
                            <>
                              <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-gray-400">Customer Name</th>
                              <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-gray-400">Mobile Number</th>
                              <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-gray-400">Total Orders</th>
                              <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-gray-400">Total Spent</th>
                              <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-gray-400">Last Purchase</th>
                              <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-gray-400 no-print text-right">Actions</th>
                            </>
                          ) : (
                            <>
                              <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-gray-400">Invoice ID</th>
                              <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-gray-400">Date & Time</th>
                              <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-gray-400">Customer</th>
                              <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-gray-400">Sold By</th>
                              <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-gray-400">Amount</th>
                              <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-gray-400">Payment</th>
                              <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-gray-400 no-print text-right">Actions</th>
                            </>
                          )}
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-50 text-sm">
                        {(window.matchMedia && window.matchMedia('print').matches ? (roleTab === 'Customer' ? customerList : listToRender) : paginatedData).map((item) => (
                          <tr key={item.id || item.mobile} className="hover:bg-gray-50/30 transition-colors group">
                            {roleTab === 'Customer' ? (
                              <>
                                <td className="px-6 py-4">
                                  <div className="flex items-center gap-3">
                                    <div className="w-8 h-8 bg-emerald-50 text-emerald-600 rounded-lg flex items-center justify-center font-black text-xs">
                                      {item.name.charAt(0)}
                                    </div>
                                    <span className="font-black text-gray-900 uppercase">{item.name}</span>
                                  </div>
                                </td>
                                <td className="px-6 py-4">
                                  <span className="text-xs text-gray-600 font-bold flex items-center gap-1.5">
                                    <Smartphone size={12} className="text-gray-400" />
                                    {item.mobile}
                                  </span>
                                </td>
                                <td className="px-6 py-4">
                                  <span className="text-xs font-black text-indigo-600 bg-indigo-50 px-2 py-1 rounded-lg border border-indigo-100">
                                    {item.orderCount} Orders
                                  </span>
                                </td>
                                <td className="px-6 py-4">
                                  <span className="font-black text-emerald-700">₹{item.totalSpent.toLocaleString()}</span>
                                </td>
                                <td className="px-6 py-4">
                                  <span className="text-[10px] text-gray-400 font-bold uppercase">
                                    {format(new Date(item.lastOrderDate), 'dd MMM yyyy')}
                                  </span>
                                </td>
                                <td className="px-6 py-4 text-right">
                                  <button 
                                    onClick={() => {
                                      setSearchQuery(item.mobile);
                                      setRoleTab('All');
                                    }}
                                    className="text-[10px] font-black text-emerald-600 hover:underline uppercase tracking-widest"
                                  >
                                    View History
                                  </button>
                                </td>
                              </>
                            ) : (
                              <>
                                <td className="px-6 py-4">
                                  <span className="font-black text-gray-900 uppercase">
                                    {item.displayId || (item.orderNumber ? `VK-${item.orderNumber}` : `VK-${String(item.id).replace(/\D/g, '').slice(0, 6)}`)}
                                  </span>
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap">
                                  <span className="text-xs text-gray-600 font-bold">
                                    {format(new Date(item.createdAt), 'dd-MM-yy, HH:mm')}
                                  </span>
                                </td>
                                <td className="px-6 py-4">
                                  <div className="flex flex-col">
                                    <span className="font-bold text-gray-800 uppercase text-[10px]">{item.customerName || 'Walk-in'}</span>
                                    <span className="text-[9px] text-gray-400 font-bold">{item.mobile || 'N/A'}</span>
                                  </div>
                                </td>
                                <td className="px-6 py-4">
                                  <div className="flex flex-col min-w-[120px]">
                                    <div className="flex items-center gap-2">
                                      <span className="font-bold text-gray-800 whitespace-nowrap truncate uppercase text-[10px]">
                                        {item.user?.name || item.userName || 'System'}
                                      </span>
                                      {item.terminal && (
                                        <span className="text-[7px] font-black bg-blue-50 text-blue-600 px-1 rounded border border-blue-100 uppercase tracking-tighter">POS</span>
                                      )}
                                    </div>
                                    <span className="text-[9px] text-gray-500 font-black uppercase tracking-widest whitespace-nowrap truncate">
                                      {item.terminal?.name || item.vehicle?.vehicleNumber || 'Walk-in'}
                                    </span>
                                  </div>
                                </td>
                                <td className="px-6 py-4">
                                  <div className="flex flex-col">
                                    <span className="font-black text-emerald-700">₹{item.totalAmount.toFixed(0)}</span>
                                    {item.discountAmount > 0 && (
                                      <span className="text-[7px] font-black text-emerald-500 bg-emerald-50 px-1 rounded border border-emerald-100 uppercase mt-0.5 tracking-tighter w-fit">PROMO</span>
                                    )}
                                  </div>
                                </td>
                                <td className="px-6 py-4">
                                  <span className="text-[9px] bg-emerald-50 text-emerald-600 px-2.5 py-1 rounded-full font-black uppercase tracking-widest border border-emerald-100">
                                    {item.paymentMode || 'Cash'}
                                  </span>
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap no-print">
                                  <div className="flex items-center justify-end">
                                    <button
                                      onClick={() => openOrderDetail(item)}
                                      className="flex items-center gap-1 px-3 py-1.5 bg-emerald-50 text-emerald-600 rounded-xl font-black text-[10px] uppercase tracking-widest hover:bg-emerald-600 hover:text-white transition-all whitespace-nowrap"
                                    >
                                      View
                                      <ChevronRight size={14} />
                                    </button>
                                  </div>
                                </td>
                              </>
                            )}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
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
        </>
      )}

          {/* ── CUSTOMERS TAB ── */}
          {activeTab === 'customers' && (
            <CustomerManagement storeFilterId={storeFilterId} />
          )}

          {/* ── ANALYTICS TAB ── */}
          {activeTab === 'analytics' && customerAnalytics && (
            <div className="space-y-6 animate-in fade-in duration-500">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Top Spenders */}
                <div className="bg-white rounded-3xl border border-gray-100 shadow-sm p-6 space-y-6">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 bg-amber-50 rounded-xl flex items-center justify-center text-amber-600 shadow-sm border border-amber-100">
                      <Coins size={20} />
                    </div>
                    <div>
                      <h3 className="text-lg font-black text-gray-900 uppercase tracking-tight">Top Spenders</h3>
                      <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Highest lifetime value customers</p>
                    </div>
                  </div>
                  <div className="space-y-4">
                    {customerAnalytics.topSpenders.map((cust, idx) => (
                      <div key={idx} className="flex items-center justify-between p-4 bg-gray-50/50 rounded-2xl border border-gray-100 hover:bg-gray-50 transition-colors">
                        <div className="flex items-center gap-4">
                          <div className="w-8 h-8 rounded-full bg-amber-100 text-amber-700 font-black flex items-center justify-center text-xs border border-amber-200">
                            #{idx + 1}
                          </div>
                          <div>
                            <p className="text-xs font-black text-gray-900 uppercase">{cust.name}</p>
                            <p className="text-[10px] font-bold text-gray-500">{cust.mobile}</p>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="text-sm font-black text-emerald-700 tabular-nums">₹{cust.totalSpent.toFixed(0)}</p>
                          <p className="text-[9px] font-bold text-gray-400 uppercase">{cust.totalOrders} orders</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Most Frequent Buyers */}
                <div className="bg-white rounded-3xl border border-gray-100 shadow-sm p-6 space-y-6">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 bg-indigo-50 rounded-xl flex items-center justify-center text-indigo-600 shadow-sm border border-indigo-100">
                      <RefreshCw size={20} />
                    </div>
                    <div>
                      <h3 className="text-lg font-black text-gray-900 uppercase tracking-tight">Frequent Buyers</h3>
                      <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Highest number of orders</p>
                    </div>
                  </div>
                  <div className="space-y-4">
                    {customerAnalytics.frequentBuyers.map((cust, idx) => (
                      <div key={idx} className="flex items-center justify-between p-4 bg-gray-50/50 rounded-2xl border border-gray-100 hover:bg-gray-50 transition-colors">
                        <div className="flex items-center gap-4">
                          <div className="w-8 h-8 rounded-full bg-indigo-100 text-indigo-700 font-black flex items-center justify-center text-xs border border-indigo-200">
                            #{idx + 1}
                          </div>
                          <div>
                            <p className="text-xs font-black text-gray-900 uppercase">{cust.name}</p>
                            <p className="text-[10px] font-bold text-gray-500">{cust.mobile}</p>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="text-sm font-black text-indigo-700 tabular-nums">{cust.totalOrders} Orders</p>
                          <p className="text-[9px] font-bold text-gray-400 uppercase">₹{cust.totalSpent.toFixed(0)} total</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}
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
            <div className="grid grid-cols-3 gap-8" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '2rem' }}>
              <div className="space-y-3">
                <h3 className="text-[10px] font-black text-[#10b981] uppercase tracking-[0.2em] border-b border-emerald-50 pb-2">Primary Info</h3>
                <div className="space-y-1.5 text-[10px]">
                  <div className="flex justify-between border-b border-gray-50 pb-1">
                    <span className="font-bold text-gray-400">Invoice ID:</span>
                    <span className="font-black">#{viewingOrder.displayId || viewingOrder.orderNumber}</span>
                  </div>
                  <div className="flex justify-between border-b border-gray-50 pb-1">
                    <span className="font-bold text-gray-400">Unique ID:</span>
                    <span className="font-bold font-mono text-[8px]">{viewingOrder.id}</span>
                  </div>
                  <div className="flex justify-between border-b border-gray-50 pb-1">
                    <span className="font-bold text-gray-400">Transaction Date:</span>
                    <span className="font-bold">{format(new Date(viewingOrder.createdAt), 'dd-MM-yyyy')}</span>
                  </div>
                  <div className="flex justify-between border-b border-gray-50 pb-1">
                    <span className="font-bold text-gray-400">Exact Time:</span>
                    <span className="font-bold">{format(new Date(viewingOrder.createdAt), 'hh:mm:ss a')}</span>
                  </div>
                  <div className="flex justify-between border-b border-gray-50 pb-1">
                    <span className="font-bold text-gray-400">Morning / Evening:</span>
                    <span className="font-black uppercase text-emerald-600">{viewingOrder.coverageType || 'N/A'}</span>
                  </div>
                  <div className="flex justify-between border-b border-gray-50 pb-1">
                    <span className="font-bold text-gray-400">Substore:</span>
                    <span className="font-black uppercase">{viewingOrder.substore?.name || 'N/A'}</span>
                  </div>
                </div>
              </div>

              <div className="space-y-3">
                <h3 className="text-[10px] font-black text-[#10b981] uppercase tracking-[0.2em] border-b border-emerald-50 pb-2">Logistics & Hub</h3>
                <div className="space-y-1.5 text-[10px]">
                  <div className="flex justify-between border-b border-gray-50 pb-1">
                    <span className="font-bold text-gray-400">Hub (Store):</span>
                    <span className="font-black uppercase">{viewingOrder.store?.name || 'Main Hub'}</span>
                  </div>
                  <div className="flex justify-between border-b border-gray-50 pb-1">
                    <span className="font-bold text-gray-400">Hub ID:</span>
                    <span className="font-bold uppercase">{viewingOrder.storeId?.slice(-6) || 'N/A'}</span>
                  </div>
                  <div className="flex justify-between border-b border-gray-50 pb-1">
                    <span className="font-bold text-gray-400">Route Name:</span>
                    <span className="font-black uppercase">{viewingOrder.route?.routeName || 'Direct'}</span>
                  </div>
                  <div className="flex justify-between border-b border-gray-50 pb-1">
                    <span className="font-bold text-gray-400">Vehicle ID:</span>
                    <span className="font-black uppercase">{viewingOrder.vehicle?.vehicleNumber || 'N/A'}</span>
                  </div>
                  {viewingOrder.terminal && (
                    <div className="flex justify-between border-b border-gray-50 pb-1">
                      <span className="font-bold text-gray-400">POS Terminal:</span>
                      <span className="font-black uppercase text-blue-600">{viewingOrder.terminal.name}</span>
                    </div>
                  )}
                  <div className="flex justify-between border-b border-gray-50 pb-1">
                    <span className="font-bold text-gray-400">Village:</span>
                    <span className="font-black uppercase">{viewingOrder.villageName || 'N/A'}</span>
                  </div>
                </div>
              </div>

              <div className="space-y-3">
                <h3 className="text-[10px] font-black text-[#10b981] uppercase tracking-[0.2em] border-b border-emerald-50 pb-2">Customer & VGE</h3>
                <div className="space-y-1.5 text-[10px]">
                  <div className="flex justify-between border-b border-gray-50 pb-1">
                    <span className="font-bold text-gray-400">VGE Name:</span>
                    <span className="font-black uppercase">{viewingOrder.user?.name || viewingOrder.userName}</span>
                  </div>
                  <div className="flex justify-between border-b border-gray-50 pb-1">
                    <span className="font-bold text-gray-400">Customer Mobile:</span>
                    <span className="font-black">{viewingOrder.mobile || 'Walk-in'}</span>
                  </div>
                  <div className="flex justify-between border-b border-gray-50 pb-1">
                    <span className="font-bold text-gray-400">Completed / Cancelled:</span>
                    <span className={`font-black uppercase ${viewingOrder.status === 'CANCELLED' ? 'text-rose-600' : 'text-emerald-600'}`}>{viewingOrder.status}</span>
                  </div>
                  <div className="flex justify-between border-b border-gray-50 pb-1">
                    <span className="font-bold text-gray-400">Sync Status:</span>
                    <span className="font-black uppercase text-blue-600">Synced</span>
                  </div>
                  <div className="flex justify-between border-b border-gray-50 pb-1">
                    <span className="font-bold text-gray-400">Timestamp:</span>
                    <span className="font-bold font-mono text-[8px]">{new Date(viewingOrder.createdAt).getTime()}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Financial Metadata Row */}
            <div className="grid grid-cols-4 gap-4 bg-gray-50 p-4 rounded-xl border border-gray-100" style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '1rem' }}>
              <div>
                <p className="text-[8px] font-black text-gray-400 uppercase tracking-widest">Payment Mode</p>
                <p className="text-xs font-black text-gray-900 uppercase">{viewingOrder.paymentMode}</p>
              </div>
              <div>
                <p className="text-[8px] font-black text-gray-400 uppercase tracking-widest">Cash Amount</p>
                <p className="text-xs font-black text-gray-900">₹{(viewingOrder.cashAmount || 0).toFixed(0)}</p>
              </div>
              <div>
                <p className="text-[8px] font-black text-gray-400 uppercase tracking-widest">UPI Amount</p>
                <p className="text-xs font-black text-gray-900">₹{(viewingOrder.upiAmount || 0).toFixed(0)}</p>
              </div>
              <div>
                <p className="text-[8px] font-black text-gray-400 uppercase tracking-widest">Discount</p>
                <p className="text-xs font-black text-rose-600">₹{(viewingOrder.items?.reduce((sum, i) => sum + (i.discount || 0), 0) || 0).toFixed(0)}</p>
              </div>
            </div>

            {viewingOrder.remark && (
              <div className="p-3 bg-amber-50 rounded-lg border border-amber-100 italic text-[10px] text-amber-800">
                <span className="font-black uppercase not-italic mr-2">Description:</span> "{viewingOrder.remark}"
              </div>
            )}

            <div className="bg-slate-50 rounded-2xl p-6 border border-slate-100 grid grid-cols-4 gap-6" style={{ backgroundColor: '#f8fafc', padding: '1.5rem', borderRadius: '1rem', display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '1.5rem' }}>
              <div>
                <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest mb-1">Items / Quantity</p>
                <h4 className="text-xl font-black text-slate-900 tracking-tight">
                  {viewingOrder.items?.length || 0} / {viewingOrder.items?.reduce((sum, i) => sum + i.quantity, 0) || 0}
                </h4>
                <p className="text-[7px] font-bold text-slate-400 uppercase">Products • Total Units</p>
              </div>
              <div>
                <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest mb-1">Gross Amount</p>
                <h4 className="text-xl font-black text-slate-900 tracking-tighter">₹{(viewingOrder.totalAmount || 0).toFixed(0)}</h4>
              </div>
              <div className="text-center">
                <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest mb-1">Mode & Split</p>
                <span className="text-[9px] font-black text-slate-700 bg-white px-3 py-1 rounded-lg border border-slate-100 uppercase">
                  {viewingOrder.paymentMode}
                </span>
                <p className="text-[7px] font-bold text-slate-500 mt-1">C: {(viewingOrder.cashAmount || 0).toFixed(0)} • U: {(viewingOrder.upiAmount || 0).toFixed(0)}</p>
              </div>
              <div className="text-right">
                <p className="text-[8px] font-black text-emerald-600 uppercase tracking-widest mb-1">Net Bill (INR)</p>
                <h4 className="text-2xl font-black text-emerald-700 tracking-tighter">₹{(viewingOrder.totalAmount - (viewingOrder.returns?.reduce((sum, r) => sum + r.refundAmount, 0) || 0)).toFixed(0)}</h4>
                <p className="text-[7px] font-bold text-emerald-600/60 uppercase">After Returns</p>
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
                      <td className="p-3 border-b border-slate-50 text-right">₹{item.price.toFixed(0)}</td>
                      <td className="p-3 border-b border-slate-50 text-right font-black">₹{(item.price * item.quantity).toFixed(0)}</td>
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

      {viewMode === 'analytics' && !viewingOrder && (
        <div className="space-y-8 animate-in fade-in duration-500">
          <div className="bg-emerald-600 rounded-[2.5rem] p-8 text-white flex items-center justify-between shadow-xl shadow-emerald-100">
            <div className="flex items-center gap-6">
              <div className="w-16 h-16 bg-white/20 backdrop-blur-md rounded-2xl flex items-center justify-center border border-white/30">
                <BarChart3 size={32} />
              </div>
              <div>
                <h2 className="text-3xl font-black tracking-tight uppercase">Professional Sales Analytics</h2>
                <p className="text-xs font-bold text-emerald-100 uppercase tracking-widest mt-1 opacity-80">Deep Insights & Business Intelligence</p>
              </div>
            </div>
            <div className="hidden md:block text-right">
              <p className="text-[10px] font-black text-emerald-100 uppercase tracking-widest">Store Performance</p>
              <p className="text-xl font-black">7-Day Realtime Matrix</p>
            </div>
          </div>

          {loadingAnalytics ? (
            <div className="py-20 flex flex-col items-center justify-center gap-4">
              <Loader2 className="animate-spin text-emerald-600" size={48} />
              <p className="text-gray-500 font-black uppercase tracking-widest text-xs">Crunching Business Data...</p>
            </div>
          ) : (
            <>
              {/* Analytics Content */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Customer Insights Card */}
                <div className="lg:col-span-2 bg-white rounded-[2.5rem] border border-gray-100 shadow-sm p-8 space-y-6">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 bg-emerald-50 text-emerald-600 rounded-2xl flex items-center justify-center shadow-sm"><User size={24} /></div>
                      <div>
                        <h3 className="text-sm font-black text-gray-900 uppercase tracking-tight">Top Performing Customers</h3>
                        <p className="text-[9px] font-bold text-gray-400 uppercase">High Lifetime Value</p>
                      </div>
                    </div>
                    <span className="text-[10px] font-black text-emerald-600 bg-emerald-50 px-4 py-1.5 rounded-full uppercase tracking-widest">Revenue Drivers</span>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {analyticsData.topCustomers.map((cust, i) => (
                      <div key={i} className="flex items-center justify-between p-4 bg-gray-50/50 rounded-2xl hover:bg-emerald-50/30 transition-all group border border-transparent hover:border-emerald-100">
                        <div className="flex items-center gap-3">
                          <span className="text-xs font-black text-emerald-200 w-4">#0{i + 1}</span>
                          <div>
                            <p className="text-xs font-black text-gray-900 uppercase tracking-tight group-hover:text-emerald-700 transition-colors">{cust.name}</p>
                            <p className="text-[9px] font-bold text-gray-400">{cust.mobile}</p>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="text-xs font-black text-emerald-700">₹{cust.totalSpent.toLocaleString()}</p>
                          <p className="text-[9px] font-bold text-gray-400 uppercase tracking-widest">{cust.orders} Orders</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Sales Trend Column */}
                <div className="space-y-6">
                  <div className="bg-slate-900 rounded-[2.5rem] p-8 text-white space-y-4 shadow-xl shadow-slate-200 relative overflow-hidden">
                    <div className="absolute top-0 right-0 p-6 opacity-10"><BarChart3 size={80} /></div>
                    <p className="text-[10px] font-black text-emerald-400 uppercase tracking-[0.2em]">Weekly Performance</p>
                    <h4 className="text-4xl font-black tracking-tighter">
                      ₹{analyticsData.trends.reduce((sum, t) => sum + t.revenue, 0).toLocaleString()}
                    </h4>
                    <div className="flex items-center gap-2 text-[10px] font-bold text-slate-400">
                      <CheckCircle2 size={12} className="text-emerald-400" /> Total 7D Gross Revenue
                    </div>
                  </div>

                  <div className="bg-white rounded-[2.5rem] border border-gray-100 shadow-sm p-8 space-y-6">
                    <div className="flex items-center gap-2">
                      <Tag size={18} className="text-emerald-600" />
                      <p className="text-[10px] font-black text-gray-900 uppercase tracking-[0.2em]">Product Performance</p>
                    </div>
                    <div className="space-y-5">
                      {analyticsData.topProducts.slice(0, 4).map((prod, i) => (
                        <div key={i} className="space-y-2">
                          <div className="flex items-center justify-between">
                            <p className="text-[10px] font-black text-gray-900 uppercase tracking-tight truncate w-32">{prod.name}</p>
                            <p className="text-[10px] font-black text-emerald-600">₹{prod.totalRevenue.toLocaleString()}</p>
                          </div>
                          <div className="h-1.5 bg-gray-50 rounded-full overflow-hidden border border-gray-100">
                            <div className="h-full bg-emerald-500 rounded-full" style={{ width: `${Math.min(100, (prod.totalRevenue / (analyticsData.topProducts[0]?.totalRevenue || 1)) * 100)}%` }}></div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>

              {/* Agent Performance Leaderboard */}
              <div className="bg-white rounded-[3rem] border border-gray-100 shadow-sm overflow-hidden">
                <div className="px-8 py-6 border-b border-gray-50 flex items-center justify-between bg-emerald-600 text-white">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 bg-white/20 rounded-2xl flex items-center justify-center backdrop-blur-md border border-white/30"><Shield size={24} /></div>
                    <div>
                      <h3 className="text-lg font-black uppercase tracking-tight">Agent Performance Leaderboard</h3>
                      <p className="text-[10px] font-bold text-emerald-100 uppercase tracking-widest opacity-80">Real-time VGE Revenue Distribution</p>
                    </div>
                  </div>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-left">
                    <thead>
                      <tr className="bg-gray-50/50">
                        <th className="px-10 py-5 text-[10px] font-black text-gray-400 uppercase tracking-widest">Sales Representative</th>
                        <th className="px-8 py-5 text-[10px] font-black text-gray-400 uppercase tracking-widest text-center">Daily Target</th>
                        <th className="px-8 py-5 text-[10px] font-black text-gray-400 uppercase tracking-widest text-center">Current Achievement</th>
                        <th className="px-10 py-5 text-[10px] font-black text-gray-400 uppercase tracking-widest text-right">Performance Index</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-50">
                      {analyticsData.agentPerf.map((agent, idx) => (
                        <tr key={idx} className="hover:bg-emerald-50/20 transition-colors">
                          <td className="px-10 py-5">
                            <div className="flex items-center gap-4">
                              <div className="w-10 h-10 bg-emerald-50 text-emerald-600 rounded-xl flex items-center justify-center font-black text-sm border border-emerald-100">
                                {agent.name.charAt(0)}
                              </div>
                              <div>
                                <p className="text-sm font-black text-gray-900 uppercase tracking-tight">{agent.name}</p>
                                <p className="text-[9px] font-bold text-gray-400 uppercase">Verified Agent</p>
                              </div>
                            </div>
                          </td>
                          <td className="px-8 py-5 text-center font-bold text-gray-500 text-sm">
                            ₹{agent.dailyTarget.toLocaleString()}
                          </td>
                          <td className="px-8 py-5 text-center">
                            <span className="text-sm font-black text-emerald-700 bg-emerald-50 px-3 py-1 rounded-lg">₹{agent.totalSales.toLocaleString()}</span>
                          </td>
                          <td className="px-10 py-5 text-right">
                            <div className="flex items-center justify-end gap-4">
                              <div className="w-32 h-2 bg-gray-100 rounded-full overflow-hidden border border-gray-100">
                                <div className={`h-full rounded-full transition-all duration-1000 ${agent.percentage >= 100 ? 'bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.4)]' : 'bg-emerald-400'}`} style={{ width: `${Math.min(100, agent.percentage)}%` }}></div>
                              </div>
                              <span className="text-xs font-black text-gray-900 min-w-[40px]">{agent.percentage}%</span>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </>
          )}
        </div>
      )}

      {/* ── Bulk Upload Modal ─────────────────────────────────────── */}
      {showBulkUploadModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-300">
          <div className="bg-white rounded-[2.5rem] border border-slate-100 shadow-2xl max-w-xl w-full p-8 space-y-6 relative overflow-hidden animate-in zoom-in-95 duration-300">
            <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-amber-400 via-emerald-500 to-teal-500" />
            
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-2xl bg-amber-50 border border-amber-100 text-amber-600 flex items-center justify-center shrink-0">
                  <FileSpreadsheet size={24} strokeWidth={2.5} />
                </div>
                <div>
                  <h3 className="text-xl font-black text-slate-900 tracking-tight">Bulk Sales Import</h3>
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-0.5">Excel Spreadsheet Parser</p>
                </div>
              </div>
              <button
                onClick={() => !isUploading && setShowBulkUploadModal(false)}
                disabled={isUploading}
                className="w-8 h-8 rounded-full bg-slate-50 text-slate-400 hover:text-slate-700 hover:bg-slate-100 flex items-center justify-center transition-all disabled:opacity-50"
              >
                <Minus size={16} />
              </button>
            </div>

            <div className="space-y-4">
              <div className="bg-amber-50/50 border border-amber-100/60 rounded-2xl p-4 text-xs text-amber-800 space-y-2">
                <p className="font-bold">💡 How to Import Multi-Item Sales:</p>
                <ul className="list-disc list-inside space-y-1 text-slate-600 font-medium">
                  <li>Download the sample template to view strict column layout.</li>
                  <li>Assign an identical <span className="font-bold text-slate-900">Invoice Group ID</span> to group multi-product rows into a unified sales receipt.</li>
                  <li>Product names must align directly with Master Inventory.</li>
                </ul>
              </div>

              <div className="flex items-center justify-between gap-4 pt-2">
                <span className="text-xs font-black uppercase tracking-widest text-slate-400">Step 1: Get Layout Template</span>
                <button
                  type="button"
                  onClick={handleDownloadSample}
                  className="px-4 py-2 bg-slate-50 border border-slate-200 text-slate-700 rounded-xl font-bold text-xs hover:bg-slate-100 transition-all shadow-sm flex items-center gap-1.5"
                >
                  <Download size={14} className="text-emerald-600" /> Download Template
                </button>
              </div>

              <div className="border-t border-slate-100 pt-4 space-y-2">
                <span className="text-xs font-black uppercase tracking-widest text-slate-400">Step 2: Upload Populated Sheet</span>
                <label className="relative flex flex-col items-center justify-center w-full h-36 border-2 border-dashed border-slate-200 hover:border-emerald-500 bg-slate-50/50 hover:bg-emerald-50/20 rounded-2xl cursor-pointer transition-all group overflow-hidden">
                  <div className="flex flex-col items-center justify-center pt-5 pb-6 text-center px-4">
                    <Upload size={28} className="text-slate-400 group-hover:text-emerald-600 group-hover:-translate-y-1 transition-all mb-2" />
                    <p className="text-xs font-bold text-slate-700">Click to upload spreadsheet file</p>
                    <p className="text-[10px] font-medium text-slate-400 mt-1">Supports standard .xlsx or .xls files</p>
                  </div>
                  <input
                    type="file"
                    accept=".xlsx, .xls"
                    onChange={handleExcelUpload}
                    disabled={isUploading}
                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer disabled:cursor-not-allowed"
                  />
                </label>

                <div className="flex items-center gap-2 pt-2 px-1">
                  <input
                    type="checkbox"
                    id="autoCreate"
                    checked={autoCreateProducts}
                    onChange={(e) => setAutoCreateProducts(e.target.checked)}
                    disabled={isUploading}
                    className="w-4 h-4 rounded text-emerald-600 focus:ring-emerald-500 border-slate-300 cursor-pointer"
                  />
                  <label htmlFor="autoCreate" className="text-xs font-bold text-slate-700 cursor-pointer select-none">
                    Auto-register unrecognized spreadsheet items into Master Inventory
                  </label>
                </div>
              </div>

              {isUploading && (
                <div className="bg-slate-50 border border-slate-100 rounded-2xl p-4 text-center space-y-3 animate-in fade-in duration-300">
                  <div className="flex items-center justify-center gap-2">
                    <Loader2 size={16} className="animate-spin text-emerald-600" />
                    <span className="text-xs font-black uppercase tracking-widest text-emerald-700">Processing Upload</span>
                  </div>
                  <div className="w-full bg-slate-200 h-1.5 rounded-full overflow-hidden relative">
                    <div className="absolute inset-y-0 left-0 bg-emerald-500 rounded-full animate-[pulse_1.5s_infinite] w-3/4" />
                  </div>
                  {uploadProgress && (
                    <p className="text-[11px] font-bold text-slate-500 tracking-tight">{uploadProgress}</p>
                  )}
                </div>
              )}
            </div>

            <div className="flex justify-end gap-3 pt-2 border-t border-slate-50">
              <button
                type="button"
                onClick={() => setShowBulkUploadModal(false)}
                disabled={isUploading}
                className="px-6 py-2.5 bg-slate-100 text-slate-600 rounded-xl text-xs font-black uppercase tracking-wider hover:bg-slate-200 transition-all disabled:opacity-50"
              >
                Close Drawer
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
