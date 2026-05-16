import React, { useState, useEffect, useMemo } from 'react';
import {
  Search,
  ShoppingCart,
  User,
  Smartphone,
  Trash2,
  Plus,
  Minus,
  ChevronRight,
  ArrowLeft,
  Package,
  Zap,
  Tag,
  Gift,
  Loader2,
  X,
  Barcode,
  Store,
  Users,
  Truck,
  ArrowRight,
  Pause
} from 'lucide-react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { productsAPI, ordersAPI } from '../../services/api';
import adminAPI from '../../services/adminService';
import { damageAPI } from '../../services/damageService';
import { useCartStore } from '../../store/cartStore';
import { useUserStore } from '../../store/userStore';
import {
  Banknote,
  CreditCard,
  CheckCircle,
  Home,
  Share2,
  Download,
  ChevronLeft,
  Printer,
  AlertTriangle,
  Hammer,
  Droplets,
  Clock,
  HelpCircle,
  Send,
  Image as ImageIcon,
  Camera,
  Trash2 as Trash,
  Menu,
  LayoutGrid,
  MapPin,
  Settings,
  Bell,
  Scan,
  History,
  Calendar,
  RotateCcw
} from 'lucide-react';
import toast from 'react-hot-toast';
import { jsPDF } from 'jspdf';
import villagKartLogo from '../../assets/VillagKart_Logo.png';
import BarcodeScannerOverlay from '../../components/BarcodeScannerOverlay';
import { useBarcodeScanner } from '../../hooks/useBarcodeScanner';
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs) {
  return twMerge(clsx(inputs));
}

export default function AdminPOS() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const storeId = searchParams.get('storeId');
  const storeName = searchParams.get('storeName');
  const terminalId = searchParams.get('terminalId');
  const terminalName = searchParams.get('terminalName');

  const { user } = useUserStore();
  const { items, addItem, removeItem, updateQuantity, clearCart, totalAmount, customerName, setCustomerName, customerMobile, setCustomerMobile } = useCartStore();

  // --- STORE SELECTOR STATE ---
  const [stores, setStores] = useState([]);
  const [fetchingStores, setFetchingStores] = useState(false);
  const [storeSearchTerm, setStoreSearchTerm] = useState('');

  const isGlobal = useMemo(() => {
    if (!user) return false;
    return (
      user.role === 'TENANT_OWNER' || 
      user.role === 'SUPER_ADMIN' || 
      (user.role === 'ADMIN' && !user.customRoleId) ||
      user.portalType === 'ADMIN'
    );
  }, [user]);

  // --- TERMINAL MANAGEMENT STATE ---
  const [terminals, setTerminals] = useState([]);
  const [selectedTerminal, setSelectedTerminal] = useState(null);
  const [isManagingTerminals, setIsManagingTerminals] = useState(false);
  const [terminalStore, setTerminalStore] = useState(null);
  const [fetchingTerminals, setFetchingTerminals] = useState(false);
  const [terminalSelectionStore, setTerminalSelectionStore] = useState(null);
  const [terminalList, setTerminalList] = useState([]);

  const handleOpenPOS = async (s) => {
    try {
      setFetchingTerminals(true);
      const { data } = await adminAPI.getTerminals({ storeId: s.id });
      if (data.success) {
        if (data.data.length === 0) {
          toast.info(`Please create at least one terminal for ${s.name}`);
          setTerminalStore(s);
          setIsManagingTerminals(true);
        } else if (data.data.length === 1) {
          const t = data.data[0];
          navigate(`/admin/pos?storeId=${s.id}&storeName=${encodeURIComponent(s.name)}&terminalId=${t.id}&terminalName=${encodeURIComponent(t.name)}`);
        } else {
          setTerminalList(data.data);
          setTerminalSelectionStore(s);
        }
      }
    } catch (err) {
      toast.error('Failed to check terminals');
    } finally {
      setFetchingTerminals(false);
    }
  };

  const fetchStores = async () => {
    try {
      setFetchingStores(true);
      const { data } = await adminAPI.getStores();
      if (data.success) {
        setStores(data.data);
      }
    } catch (err) {
      console.error('Failed to fetch stores:', err);
    } finally {
      setFetchingStores(false);
    }
  };

  useEffect(() => {
    if (isGlobal) {
      fetchStores();
    }
  }, [isGlobal]);

  // Auto-redirect fixed-store users
  useEffect(() => {
    if (!storeId && !isGlobal && user?.storeId) {
      navigate(`/admin/pos?storeId=${user.storeId}&storeName=${encodeURIComponent(user.storeName || 'My Store')}`, { replace: true });
    }
  }, [storeId, isGlobal, user]);


  // --- STORE ISOLATION LOGIC ---
  useEffect(() => {
    // Clear cart if switching stores to prevent leakage
    if (items.length > 0) {
      clearCart();
      toast.success(`Switched to ${storeName || 'Store'} context. Cart cleared.`);
    }
  }, [storeId]);


  const [loading, setLoading] = useState(true);
  const [products, setProducts] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [isScanning, setIsScanning] = useState(false);
  const [unavailableCode, setUnavailableCode] = useState(null);
  const [scannedProduct, setScannedProduct] = useState(null);
  const [scannedQuantity, setScannedQuantity] = useState(1);
  const [selectedCategory, setSelectedCategory] = useState('ALL');

  // Checkout States
  const [checkoutStep, setCheckoutStep] = useState('CART'); // 'CART', 'PAYMENT', 'SUCCESS'
  const [selectedPaymentMode, setSelectedPaymentMode] = useState(null);
  const [orderType, setOrderType] = useState('COUNTER');
  const [cashReceived, setCashReceived] = useState('');
  const [splitAmounts, setSplitAmounts] = useState({ cash: '', upi: '' });
  const [actionLoading, setActionLoading] = useState(false);
  const [lastOrder, setLastOrder] = useState(null);
  const [settings, setSettings] = useState(null);
  const [isDownloading, setIsDownloading] = useState(false);
  const [suspendedOrders, setSuspendedOrders] = useState([]);
  const [currentView, setCurrentView] = useState('POS'); // 'POS', 'SUSPENDED', 'SUSPENDED_DETAIL'
  const [selectedSuspendedOrder, setSelectedSuspendedOrder] = useState(null);
  const [isSuspendedLoading, setIsSuspendedLoading] = useState(false);

  // --- SUSPENDED ORDERS DATABASE SYNC ---
  const fetchSuspendedOrders = async () => {
    if (!storeId) return;
    try {
      setIsSuspendedLoading(true);
      const { data } = await adminAPI.getSuspendedSales({ storeId, terminalId });
      if (data.success) {
        setSuspendedOrders(data.data);
      }
    } catch (err) {
      console.error('Failed to fetch suspended orders');
    } finally {
      setIsSuspendedLoading(false);
    }
  };

  useEffect(() => {
    if (storeId) {
      fetchSuspendedOrders();
    }
  }, [storeId, terminalId]);

  const handleSuspendSale = async () => {
    if (items.length === 0) return toast.error('Cannot suspend an empty cart');
    
    try {
      setActionLoading(true);
      const payload = {
        storeId,
        terminalId,
        customerName,
        customerMobile,
        totalAmount,
        items: items.map(i => ({
          productId: i.productId,
          quantity: i.quantity,
          name: i.name,
          price: i.price,
          image: i.image
        }))
      };

      const { data } = await adminAPI.suspendSale(payload);
      if (data.success) {
        toast.success('Order suspended in database');
        clearCart();
        fetchSuspendedOrders(); // Refresh list
      }
    } catch (err) {
      console.error('Suspend Sale Error:', err);
      const msg = err.response?.data?.error || err.response?.data?.message || 'Failed to suspend sale';
      toast.error(msg);
    } finally {
      setActionLoading(false);
    }
  };

  const handleResumeSale = async (order) => {
    if (items.length > 0) {
      if (!window.confirm('Current cart will be cleared. Continue?')) return;
    }
    
    // Clear current
    clearCart();
    
    // Load from order
    order.items.forEach(item => {
      const product = products.find(p => p.id === item.productId);
      if (product) {
        addItem(product, item.quantity);
      }
    });

    setCustomerName(order.customerName || '');
    setCustomerMobile(order.customerMobile || '');
    
    // Remove from database
    try {
      await adminAPI.deleteSuspendedSale(order.id);
      fetchSuspendedOrders();
      setCurrentView('POS');
      toast.success('Sale resumed from database');
    } catch (err) {
      console.error('Failed to delete suspended order from DB after resume');
      // Still allow them to continue since it's loaded in cart
      setSuspendedOrders(prev => prev.filter(o => o.id !== order.id));
      setCurrentView('POS');
    }
  };

  const handleDeleteSuspended = async (id) => {
    if (!window.confirm('Are you sure you want to delete this suspended order?')) return;
    try {
      await adminAPI.deleteSuspendedSale(id);
      setSuspendedOrders(prev => prev.filter(o => o.id !== id));
      toast.success('Order deleted');
    } catch (err) {
      toast.error('Failed to delete order');
    }
  };

  const handleBarcodeScan = (code) => {
    const product = products.find(p => p.skuCode === code || p.barcode === code);
    if (product) {
      if (product.stock <= 0) {
        toast.error(`${product.name} is out of stock`);
      } else {
        setScannedProduct(product);
        setScannedQuantity(1);
      }
    } else {
      setUnavailableCode(code);
    }
  };

  useBarcodeScanner(handleBarcodeScan);

  // Damage Reporting State
  const [isDamageModalOpen, setIsDamageModalOpen] = useState(false);
  const [productToDamage, setProductToDamage] = useState(null);
  const [damageSubmitting, setDamageSubmitting] = useState(false);
  const [damageData, setDamageData] = useState({
    quantity: '',
    type: 'DAMAGED',
    reason: '',
    responsibility: 'UNKNOWN',
    images: []
  });
  const [damagePreviews, setDamagePreviews] = useState([]);

  // Fetch products (extracted so it can be re-called after sales)
  const fetchProducts = async () => {
    try {
      setLoading(true);
      const { data } = await productsAPI.getAll({ showAll: true, storeId });
      setProducts(data);
    } catch (err) {
      toast.error('Failed to load products');
    } finally {
      setLoading(false);
    }
  };

  // Fetch Warehouse Products
  useEffect(() => {
    const fetchSettings = async () => {
      try {
        const { data } = await adminAPI.getSettings({ storeId });
        if (data?.success) {
          setSettings(data.data);
          if (data.data.deliverySlabs) {
            useCartStore.getState().setDeliverySlabs(data.data.deliverySlabs);
          }
        }
      } catch (err) {
        console.warn('Failed to load settings');
      }
    };

    fetchProducts();
    fetchSettings();
  }, [storeId]);

  const [currentTime, setCurrentTime] = useState(new Date());
  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 60000);
    return () => clearInterval(timer);
  }, []);

  const categories = useMemo(() => {
    const cats = [...new Set(products.map(p => p.category?.name).filter(Boolean))];
    return ['ALL', ...cats];
  }, [products]);

  const filteredProducts = useMemo(() => {
    return products.filter(p => {
      const matchesSearch = p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (p.barcode && p.barcode.toLowerCase().includes(searchTerm.toLowerCase()));
      const matchesCategory = selectedCategory === 'ALL' || p.category?.name === selectedCategory;
      return matchesSearch && matchesCategory;
    });
  }, [products, searchTerm, selectedCategory]);

  const handleCheckout = () => {
    if (items.length === 0) {
      toast.error('Cart is empty');
      return;
    }
    setCheckoutStep('PAYMENT');
  };

  const handlePayment = async () => {
    if (!selectedPaymentMode) return toast.error('Please select payment mode');

    if (selectedPaymentMode === 'CREDIT') {
      if (!customerName?.trim() || !customerMobile?.trim()) {
        return toast.error('Customer name and mobile are required for Credit payments');
      }
    }

    if (selectedPaymentMode === 'CASH_UPI') {
      const cash = parseFloat(splitAmounts.cash) || 0;
      const upi = parseFloat(splitAmounts.upi) || 0;
      if (Math.abs((cash + upi) - totalAmount) > 0.01) {
        return toast.error(`Total must equal ₹${Math.round(totalAmount)}`);
      }
    }

    if (selectedPaymentMode === 'CREDIT' && !customerMobile && !customerName) {
      return toast.error('Customer name or mobile required for Credit sales');
    }

    setActionLoading(true);
    try {
      const { data: order } = await ordersAPI.createFromCart({
        mobile: customerMobile || undefined,
        customerName: customerName || undefined,
        items: items.map(i => ({ productId: i.productId, quantity: i.quantity })),
        storeId,
        terminalId,
      });

      await ordersAPI.completePayment({
        orderId: order.id,
        paymentMode: selectedPaymentMode,
        cashAmount: selectedPaymentMode === 'CASH_UPI' ? parseFloat(splitAmounts.cash) : undefined,
        upiAmount: selectedPaymentMode === 'CASH_UPI' ? parseFloat(splitAmounts.upi) : undefined,
      });

      // Fetch populated order for correct invoice data
      const { data: fullOrder } = await ordersAPI.getById(order.id);

      setLastOrder(fullOrder);
      setCheckoutStep('SUCCESS');
      clearCart();
      // Refresh products to show updated stock levels
      fetchProducts();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Payment failed');
    } finally {
      setActionLoading(false);
    }
  };

  const resetPOS = () => {
    setCheckoutStep('CART');
    setLastOrder(null);
    setSelectedPaymentMode(null);
    setCashReceived('');
    setSplitAmounts({ cash: '', upi: '' });
    // Refresh products to show latest stock
    fetchProducts();
  };

  const handleDamageSubmit = async (e) => {
    e.preventDefault();
    if (!productToDamage || !damageData.quantity || !damageData.type) {
      return toast.error('Please fill all required fields');
    }

    setDamageSubmitting(true);
    try {
      const formData = new FormData();
      formData.append('productId', productToDamage.id);
      formData.append('quantity', damageData.quantity);
      formData.append('damageType', damageData.type);
      formData.append('reason', damageData.reason || `Damage reported via Admin POS for ${productToDamage.name}`);
      formData.append('responsibility', damageData.responsibility);
      if (storeId) formData.append('storeId', storeId);
      
      damageData.images.forEach(img => {
        formData.append('images', img);
      });

      await damageAPI.reportDamage(formData);
      toast.success('Damage reported successfully');
      setIsDamageModalOpen(false);
      setProductToDamage(null);
      setDamageData({ quantity: '', type: 'DAMAGED', reason: '', responsibility: 'UNKNOWN', images: [] });
      setDamagePreviews([]);
      fetchProducts(); // Refresh stock
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to report damage');
    } finally {
      setDamageSubmitting(false);
    }
  };

  const handleImageChange = (e) => {
    const files = Array.from(e.target.files);
    if (!files.length) return;

    // Filter out existing images to avoid duplicates or limit total
    const newImages = [...damageData.images, ...files].slice(0, 4); // Limit to 4 images
    setDamageData({ ...damageData, images: newImages });

    // Generate previews
    const newPreviews = files.map(file => URL.createObjectURL(file));
    setDamagePreviews([...damagePreviews, ...newPreviews].slice(0, 4));
  };

  const removeDamageImage = (index) => {
    const newImages = [...damageData.images];
    newImages.splice(index, 1);
    const newPreviews = [...damagePreviews];
    newPreviews.splice(index, 1);
    setDamageData({ ...damageData, images: newImages });
    setDamagePreviews(newPreviews);
  };

  const getInvoiceNumber = (o) => o?.orderNumber ? String(o.orderNumber) : String(o?.id).replace(/\D/g, '').slice(0, 6) || '000000';

  const loadImageAsBase64 = (url) => {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.crossOrigin = 'anonymous';
      img.onload = () => {
        const canvas = document.createElement('canvas');
        canvas.width = img.naturalWidth;
        canvas.height = img.naturalHeight;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0);
        resolve(canvas.toDataURL('image/png'));
      };
      img.onerror = reject;
      img.src = url;
    });
  };

  const generateInvoicePDF = async (order, bizSettings) => {
    if (!order) return null;
    const currentSettings = bizSettings || settings || { businessName: 'VillagKart' };

    // Load logo as base64
    let logoBase64 = null;
    try {
      logoBase64 = await loadImageAsBase64(villagKartLogo);
    } catch {
      console.warn('Could not load logo, continuing without it');
    }

    const pdf = new jsPDF('p', 'mm', 'a4');
    const pageWidth = pdf.internal.pageSize.getWidth();
    const margin = 20;
    const contentWidth = pageWidth - margin * 2;
    let y = 20;

    // ── Colors ──
    const emerald = [5, 150, 105];
    const darkText = [15, 23, 42];
    const grayText = [100, 116, 139];
    const lightLine = [226, 232, 240];
    const orangeAccent = [234, 88, 12];

    // ══════════════════════════════════════
    // HEADER — Company branding
    // ══════════════════════════════════════
    const headerHeight = 55;
    pdf.setFillColor(255, 255, 255);
    pdf.rect(0, 0, pageWidth, headerHeight, 'F');

    // Logo
    const logoWidth = 30;
    const logoHeight = 30;
    const logoX = margin;
    const logoY = 5;
    if (logoBase64) {
      pdf.addImage(logoBase64, 'PNG', logoX, logoY, logoWidth, logoHeight);
    }

    // Slogans
    pdf.setTextColor(...darkText);
    pdf.setFont('helvetica', 'bold');
    pdf.setFontSize(5);
    const text1 = 'Shop any Time,';
    const text2 = 'Save Everytime';
    const textYPosition = logoY + logoHeight + 2;
    const textBaseX = margin + 1.5;
    pdf.text(text1, textBaseX, textYPosition);
    const text1Width = pdf.getTextWidth(`${text1} `);
    pdf.text(` ${text2}`, textBaseX + text1Width - pdf.getTextWidth(' '), textYPosition);

    // Invoice label (right-aligned)
    pdf.setFontSize(28);
    pdf.setFont('helvetica', 'bold');
    pdf.setTextColor(...darkText);
    pdf.text('INVOICE', pageWidth - margin, 20, { align: 'right' });

    pdf.setFontSize(9);
    pdf.setFont('helvetica', 'normal');
    pdf.text('Tax Invoice / Bill of Supply', pageWidth - margin, 27, { align: 'right' });

    // Orange accent strip
    pdf.setFillColor(...orangeAccent);
    pdf.rect(0, headerHeight, pageWidth, 2, 'F');

    y = headerHeight + 10;

    // ══════════════════════════════════════
    // INVOICE META — Two columns
    // ══════════════════════════════════════
    const invoiceNo = getInvoiceNumber(order);
    const orderDate = new Date(order.createdAt || Date.now());
    const dateStr = orderDate.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
    const timeStr = orderDate.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true });

    // Left column - Seller Details
    pdf.setTextColor(...grayText);
    pdf.setFontSize(8);
    pdf.setFont('helvetica', 'bold');
    pdf.text('INVOICE NUMBER', margin, y);
    pdf.setTextColor(...darkText);
    pdf.setFontSize(12);
    pdf.setFont('helvetica', 'bold');
    pdf.text(`#VK-${invoiceNo}`, margin, y + 6);

    // Seller Info
    let sellerY = y + 15;
    pdf.setTextColor(...grayText);
    pdf.setFontSize(7);
    pdf.text('SOLD BY:', margin, sellerY);
    pdf.setTextColor(...darkText);
    pdf.setFontSize(8.5);
    pdf.text(currentSettings.businessName.toUpperCase(), margin, sellerY + 4.5);

    pdf.setFontSize(7.5);
    pdf.setTextColor(...grayText);
    let sellerDetailsY = sellerY + 9;
    if (currentSettings.gstNo) {
      pdf.text(`GSTIN: ${currentSettings.gstNo}`, margin, sellerDetailsY);
      sellerDetailsY += 4;
    }
    if (currentSettings.contactNo) {
      pdf.text(`Ph: ${currentSettings.contactNo}`, margin, sellerDetailsY);
      sellerDetailsY += 4;
    }
    if (currentSettings.address) {
      const splitAddr = pdf.splitTextToSize(currentSettings.address, contentWidth * 0.45);
      pdf.text(splitAddr, margin, sellerDetailsY);
      sellerDetailsY += (splitAddr.length * 3.5);
    }

    const leftColBottom = sellerDetailsY + 2;

    // Right column
    const paymentLabel = order.paymentMode === 'CASH' ? 'Cash' : order.paymentMode === 'UPI' ? 'UPI' : order.paymentMode === 'CASH_UPI' ? 'Split (Cash+UPI)' : order.paymentMode === 'CREDIT' ? 'Credit (Udhar)' : 'Card';
    pdf.setTextColor(...grayText);
    pdf.setFontSize(8);
    pdf.setFont('helvetica', 'bold');
    pdf.text('PAYMENT METHOD', pageWidth - margin, y, { align: 'right' });
    pdf.setTextColor(...darkText);
    pdf.setFontSize(12);
    pdf.setFont('helvetica', 'bold');
    pdf.text(paymentLabel, pageWidth - margin, y + 6, { align: 'right' });

    pdf.setTextColor(...grayText);
    pdf.setFontSize(8);
    pdf.setFont('helvetica', 'bold');
    pdf.text('DATE & TIME', pageWidth - margin, y + 16, { align: 'right' });
    pdf.setTextColor(...darkText);
    pdf.setFontSize(10);
    pdf.setFont('helvetica', 'normal');
    pdf.text(`${dateStr} | ${timeStr}`, pageWidth - margin, y + 22, { align: 'right' });

    if (order.customerName || order.mobile) {
      pdf.setTextColor(...grayText);
      pdf.setFontSize(8);
      pdf.setFont('helvetica', 'bold');
      pdf.text('BILL TO / CUSTOMER', pageWidth - margin, y + 32, { align: 'right' });
      pdf.setTextColor(...darkText);
      pdf.setFontSize(10);
      pdf.setFont('helvetica', 'normal');
      let customerInfo = '';
      if (order.customerName && order.mobile) {
        customerInfo = `${order.customerName.toUpperCase()} (${order.mobile})`;
      } else {
        customerInfo = order.customerName ? order.customerName.toUpperCase() : order.mobile;
      }
      pdf.text(customerInfo, pageWidth - margin, y + 38, { align: 'right' });
    }

    y = Math.max(leftColBottom, y + 46);

    // Divider
    pdf.setDrawColor(...lightLine);
    pdf.setLineWidth(0.5);
    pdf.line(margin, y, pageWidth - margin, y);
    y += 8;

    // ══════════════════════════════════════
    // ITEMS TABLE
    // ══════════════════════════════════════
    const colX = {
      sno: margin,
      item: margin + 10,
      qty: margin + contentWidth * 0.40,
      gst: margin + contentWidth * 0.52,
      mrp: margin + contentWidth * 0.62,
      price: margin + contentWidth * 0.74,
      amount: pageWidth - margin,
    };

    const maxPageHeight = pdf.internal.pageSize.getHeight() - 20;

    const drawTableHeaders = (currentY) => {
      pdf.setFillColor(248, 250, 252);
      pdf.rect(margin, currentY - 4, contentWidth, 10, 'F');
      pdf.setTextColor(...grayText);
      pdf.setFontSize(7.5);
      pdf.setFont('helvetica', 'bold');
      pdf.text('S.NO', colX.sno, currentY + 2);
      pdf.text('ITEM DESCRIPTION', colX.item, currentY + 2);
      pdf.text('QTY', colX.qty, currentY + 2);
      pdf.text('GST', colX.gst, currentY + 2);
      pdf.text('MRP', colX.mrp, currentY + 2);
      pdf.text('VK PRICE', colX.price, currentY + 2);
      pdf.text('AMOUNT', colX.amount, currentY + 2, { align: 'right' });
      return currentY + 10;
    };

    y = drawTableHeaders(y);

    const items = order.items || [];
    items.forEach((item, index) => {
      const itemName = item.product?.name || `Product ${item.productId?.slice(-6) || ''}`;
      const qty = item.quantity || 0;
      const price = item.price || 0;
      const mrpValue = item.mrp || price;
      const amount = qty * price;
      const gstRate = item.gst || 0;
      const itemTaxable = amount / (1 + gstRate / 100);
      const itemGstAmt = amount - itemTaxable;

      if (y > maxPageHeight - 10) {
        pdf.addPage();
        y = 20;
        pdf.setTextColor(...grayText);
        pdf.setFontSize(8);
        pdf.setFont('helvetica', 'italic');
        pdf.text(`Invoice #VK-${invoiceNo} (Continued)`, margin, y);
        pdf.setFillColor(...orangeAccent);
        pdf.rect(margin, y + 2, contentWidth, 0.5, 'F');
        y += 12;
        y = drawTableHeaders(y);
      }

      if (index % 2 === 0) pdf.setFillColor(255, 255, 255);
      else pdf.setFillColor(249, 250, 251);
      pdf.rect(margin, y - 4, contentWidth, 9, 'F');

      pdf.setTextColor(...darkText);
      pdf.setFontSize(9);
      pdf.setFont('helvetica', 'bold');
      pdf.text(`${index + 1}`, colX.sno, y + 1);

      const maxNameWidth = colX.qty - colX.item - 5;
      let displayName = itemName;
      while (pdf.getTextWidth(displayName) > maxNameWidth && displayName.length > 3) {
        displayName = displayName.slice(0, -4) + '...';
      }
      pdf.text(displayName, colX.item, y + 1);
      pdf.text(`${qty}`, colX.qty, y + 1);
      pdf.text(`${itemGstAmt.toFixed(0)}`, colX.gst, y + 1);

      pdf.setTextColor(...grayText);
      pdf.setFontSize(7);
      pdf.text(`Rs.${mrpValue.toFixed(0)}`, colX.mrp, y + 1, { align: 'left' });

      const isItemFree = price === 0;
      pdf.setTextColor(...(isItemFree ? orangeAccent : emerald));
      pdf.setFontSize(isItemFree ? 7 : 8);
      pdf.setFont('helvetica', 'bold');
      pdf.text(isItemFree ? 'GIFT/FREE' : `Rs.${price.toFixed(0)}`, colX.price, y + 1);

      pdf.setTextColor(...darkText);
      pdf.setFontSize(9);
      pdf.text(isItemFree ? 'Rs.0.00' : `Rs.${amount.toFixed(0)}`, colX.amount, y + 1, { align: 'right' });

      y += 9;
    });

    y += 2;
    pdf.setDrawColor(...emerald);
    pdf.setLineWidth(0.8);
    pdf.line(margin, y, pageWidth - margin, y);
    y += 8;

    // TOTALS
    if (y > maxPageHeight - 65) {
      pdf.addPage();
      y = 20;
      y += 12;
    }
    const totalsX = margin + contentWidth * 0.55;
    const startY = y;
    let rightY = startY;

    const subTotalMRP = order.items?.reduce((sum, i) => sum + (i.mrp || i.price) * i.quantity, 0) || order.totalAmount;
    const savings = subTotalMRP - order.totalAmount;

    pdf.setTextColor(...grayText);
    pdf.setFontSize(9);
    pdf.setFont('helvetica', 'bold');
    pdf.text('Subtotal (MRP)', totalsX, rightY);
    pdf.setTextColor(...darkText);
    pdf.text(`Rs.${subTotalMRP.toFixed(0)}`, colX.amount, rightY, { align: 'right' });
    rightY += 7;

    if (savings > 0) {
      pdf.setFillColor(255, 247, 237);
      pdf.roundedRect(totalsX - 3, rightY - 5, (pageWidth - margin) - totalsX + 6, 9, 1, 1, 'F');
      pdf.setTextColor(...orangeAccent);
      pdf.setFontSize(10);
      pdf.setFont('helvetica', 'bold');
      pdf.text('TOTAL SAVINGS', totalsX, rightY + 1.5);
      pdf.setFontSize(11);
      pdf.text(`- Rs.${savings.toFixed(0)}`, colX.amount, rightY + 1.5, { align: 'right' });
      rightY += 9;
    }

    const totalTax = order.items?.reduce((sum, item) => {
      const rate = item.gst || 0;
      if (rate === 0) return sum;
      const taxable = (item.price * item.quantity) / (1 + rate / 100);
      return sum + ((item.price * item.quantity) - taxable);
    }, 0) || 0;

    pdf.setTextColor(...grayText);
    pdf.setFont('helvetica', 'bold');
    pdf.text('Taxable Value', totalsX, rightY);
    pdf.setTextColor(...darkText);
    pdf.text(`Rs.${(order.totalAmount - totalTax).toFixed(0)}`, colX.amount, rightY, { align: 'right' });
    rightY += 7;

    pdf.setTextColor(...grayText);
    pdf.setFont('helvetica', 'bold');
    pdf.text(`Total GST (Incl.)`, totalsX, rightY);
    pdf.setTextColor(...darkText);
    pdf.text(`Rs.${totalTax.toFixed(0)}`, colX.amount, rightY, { align: 'right' });
    rightY += 7;

    if (order.deliveryCharge > 0) {
      pdf.setTextColor(...grayText);
      pdf.setFont('helvetica', 'bold');
      pdf.text('Delivery Fee', totalsX, rightY);
      pdf.setTextColor(...darkText);
      pdf.text(`Rs.${order.deliveryCharge.toFixed(0)}`, colX.amount, rightY, { align: 'right' });
      rightY += 7;
    }

    pdf.setDrawColor(...lightLine);
    pdf.line(totalsX, rightY, pageWidth - margin, rightY);
    rightY += 7;

    pdf.setFillColor(...emerald);
    pdf.roundedRect(totalsX - 3, rightY - 5, (pageWidth - margin) - totalsX + 6, 14, 2, 2, 'F');
    pdf.setTextColor(255, 255, 255);
    pdf.setFontSize(10);
    pdf.setFont('helvetica', 'bold');
    pdf.text('GRAND TOTAL', totalsX, rightY + 3);
    pdf.setFontSize(14);
    pdf.text(`Rs.${order.totalAmount?.toFixed(0)}`, colX.amount, rightY + 4, { align: 'right' });
    rightY += 15;

    // Fulfillment Scheduling (New Section)
    if (order.deliveryDate || order.deliverySlot) {
      const scheduleY = startY + 22;
      pdf.setFillColor(239, 246, 255); // light blue
      pdf.roundedRect(margin, scheduleY, badgeWidth, 18, 3, 3, 'F');
      pdf.setDrawColor(191, 219, 254);
      pdf.roundedRect(margin, scheduleY, badgeWidth, 18, 3, 3, 'S');
      pdf.setTextColor(30, 64, 175);
      pdf.setFontSize(8);
      pdf.setFont('helvetica', 'bold');
      pdf.text('DELIVERY SCHEDULE', margin + 5, scheduleY + 7);
      pdf.setTextColor(30, 58, 138);
      pdf.setFontSize(9);
      pdf.setFont('helvetica', 'bold');
      const dateText = order.deliveryDate ? new Date(order.deliveryDate).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : 'TBD';
      pdf.text(`${dateText} | ${order.deliverySlot || 'Standard Slot'}`, margin + 5, scheduleY + 13);
    }

    // Payment Status Badge
    const badgeWidth = (totalsX - margin) - 15;
    const isCredit = order.paymentMode === 'CREDIT';
    pdf.setFillColor(isCredit ? 254 : 236, isCredit ? 242 : 253, isCredit ? 242 : 245);
    pdf.roundedRect(margin, startY, badgeWidth, 18, 3, 3, 'F');
    pdf.setDrawColor(isCredit ? 252 : 167, isCredit ? 165 : 243, isCredit ? 165 : 208);
    pdf.roundedRect(margin, startY, badgeWidth, 18, 3, 3, 'S');
    pdf.setTextColor(...(isCredit ? [220, 38, 38] : emerald));
    pdf.setFontSize(10);
    pdf.setFont('helvetica', 'bold');
    pdf.text('PAYMENT STATUS', margin + badgeWidth / 2, startY + 7, { align: 'center' });
    pdf.setFontSize(11);
    pdf.text(isCredit ? 'CREDIT / UNPAID' : 'PAID', margin + badgeWidth / 2, startY + 13, { align: 'center' });

    y = Math.max(startY + 25, rightY + 5);

    // FOOTER
    pdf.setDrawColor(...lightLine);
    pdf.line(margin, y, pageWidth - margin, y);
    y += 12;
    pdf.setTextColor(...emerald);
    pdf.setFontSize(14);
    pdf.setFont('helvetica', 'bold');
    pdf.text('Thanks for shopping in VillagKart', pageWidth / 2, y, { align: 'center' });
    y += 6;
    pdf.setTextColor(...grayText);
    pdf.setFontSize(7);
    pdf.text('This is a computer-generated invoice and does not require a signature.', pageWidth / 2, y, { align: 'center' });
    y += 4;
    pdf.text(`Generated on ${new Date().toLocaleString('en-IN')}`, pageWidth / 2, y, { align: 'center' });

    return pdf;
  };

  const handleDownloadPDF = async () => {
    if (!lastOrder) return;
    try {
      setIsDownloading(true);
      const pdf = await generateInvoicePDF(lastOrder, settings);
      pdf.save(`Invoice_VK-${getInvoiceNumber(lastOrder)}.pdf`);
      toast.success('Invoice downloaded');
    } catch (error) {
      toast.error('Failed to generate PDF');
    } finally {
      setIsDownloading(false);
    }
  };

  const handlePrintReceipt = () => {
    if (!lastOrder) return;

    const bizSettings = settings || { businessName: 'VillagKart' };
    const invoiceNo = getInvoiceNumber(lastOrder);
    const dateStr = new Date(lastOrder.createdAt || Date.now()).toLocaleString('en-IN', {
      dateStyle: 'medium',
      timeStyle: 'short'
    });

    const subTotalMRP = lastOrder.items?.reduce((sum, i) => sum + (i.mrp || i.price) * i.quantity, 0) || lastOrder.totalAmount;
    const savings = subTotalMRP - lastOrder.totalAmount;

    const printWindow = window.open('', '_blank', 'width=300,height=600');

    const receiptHTML = `
      <html>
        <head>
          <title>Receipt #VK-${invoiceNo}</title>
          <style>
            @page { size: 80mm auto; margin: 0; }
            body { 
              width: 70mm; 
              font-family: 'Courier New', Courier, monospace; 
              font-size: 11px; 
              padding: 5mm; 
              margin: 0 auto;
              color: #000;
            }
            .center { text-align: center; }
            .bold { font-weight: bold; }
            .header { font-size: 14px; margin-bottom: 2px; }
            .subheader { font-size: 9px; margin-bottom: 5px; }
            .divider { border-top: 1px dashed #000; margin: 8px 0; }
            .item-row { display: flex; justify-content: space-between; margin-bottom: 4px; }
            .item-name { flex: 1; padding-right: 5px; }
            .item-qty { width: 30px; text-align: center; }
            .item-amt { width: 60px; text-align: right; }
            .totals { margin-top: 10px; }
            .total-row { display: flex; justify-content: space-between; font-weight: bold; font-size: 12px; margin-top: 4px; }
            .savings-box { 
              border: 1px solid #000; 
              padding: 8px; 
              margin: 10px 0; 
              text-align: center; 
              font-size: 13px; 
              font-weight: bold;
              text-transform: uppercase;
            }
            .footer { margin-top: 15px; font-size: 9px; }
          </style>
        </head>
        <body>
          <div class="center bold header">${bizSettings.businessName.toUpperCase()}</div>
          ${bizSettings.address ? `<div class="center subheader">${bizSettings.address}</div>` : ''}
          ${bizSettings.gstNo ? `<div class="center subheader">GSTIN: ${bizSettings.gstNo}</div>` : ''}
          ${bizSettings.contactNo ? `<div class="center subheader">Ph: ${bizSettings.contactNo}</div>` : ''}
          
          <div class="divider"></div>
          <div class="item-row">
            <span>Bill No: #VK-${invoiceNo}</span>
          </div>
          <div class="item-row">
            <span>Date: ${dateStr}</span>
          </div>
          <div class="divider"></div>
          
          <div class="item-row bold">
            <span class="item-name">ITEM</span>
            <span class="item-qty">QTY</span>
            <span class="item-amt">AMT</span>
          </div>
          <div class="divider"></div>
          
          ${lastOrder.items.map(item => `
            <div class="item-row">
              <span class="item-name">${(item.product?.name || 'Product').slice(0, 18)}</span>
              <span class="item-qty">${item.quantity}</span>
              <span class="item-amt">${(item.price * item.quantity).toFixed(0)}</span>
            </div>
          `).join('')}
          
          <div class="divider"></div>
          
          <div class="total-row">
            <span>TOTAL AMOUNT</span>
            <span>Rs.${Math.round(lastOrder.totalAmount)}</span>
          </div>
          <div class="item-row" style="font-size: 9px; margin-top: 4px;">
            <span>Payment: ${lastOrder.paymentMode === 'CREDIT' ? 'Credit (Udhar)' : lastOrder.paymentMode}</span>
            <span>Status: ${lastOrder.paymentMode === 'CREDIT' ? 'CREDIT' : 'PAID'}</span>
          </div>

          ${savings > 0 ? `
            <div class="savings-box">
              YOU SAVED: Rs.${savings.toFixed(0)}
            </div>
          ` : ''}
          
          <div class="divider"></div>
          <div class="center footer">
            <div class="bold">Thanks for shopping!</div>
            <div>Please Visit Again</div>
            <div style="margin-top: 5px; font-size: 7px;">${new Date().toLocaleString()}</div>
          </div>
        </body>
      </html>
    `;

    printWindow.document.write(receiptHTML);
    printWindow.document.close();

    // Auto print and close
    printWindow.onload = () => {
      printWindow.focus();
      printWindow.print();
      setTimeout(() => {
        printWindow.close();
      }, 500);
    };
  };

  const cartCount = items.reduce((acc, item) => acc + item.quantity, 0);
  const [isCartOpen, setIsCartOpen] = useState(false);

  if (!storeId && isGlobal) {
    return (
      <StoreSelectionScreen 
        stores={stores} 
        fetchingStores={fetchingStores} 
        searchTerm={storeSearchTerm} 
        setSearchTerm={setStoreSearchTerm} 
        navigate={navigate} 
        storeId={storeId}
        onRefresh={fetchStores}
        handleOpenPOS={handleOpenPOS}
        fetchingTerminals={fetchingTerminals}
        isManagingTerminals={isManagingTerminals}
        setIsManagingTerminals={setIsManagingTerminals}
        terminalStore={terminalStore}
        setTerminalStore={setTerminalStore}
        terminalSelectionStore={terminalSelectionStore}
        setTerminalSelectionStore={setTerminalSelectionStore}
        terminalList={terminalList}
      />
    );
  }

  return (
    <div className="flex flex-col h-screen bg-slate-50 overflow-hidden text-slate-900">
      {/* ── NEW PREMIUM HEADER ── */}
      <header className="h-20 bg-white border-b border-slate-100 flex items-center justify-between px-6 shrink-0 z-30 shadow-sm">
        <div className="flex items-center gap-8">
          <div className="flex items-center gap-4">
            <button 
              onClick={() => navigate('/admin/pos')}
              className="p-2.5 hover:bg-slate-50 rounded-xl text-slate-400 hover:text-emerald-600 transition-all group"
              title="Back to Branch Selection"
            >
              <ArrowLeft size={22} className="group-hover:-translate-x-1 transition-transform" />
            </button>
            <div className="flex items-center gap-2.5">
              <div className="h-10 px-3 bg-white rounded-xl flex items-center justify-center border border-slate-100 shadow-sm">
                <img src={villagKartLogo} alt="Logo" className="h-7 object-contain" />
              </div>
              <h1 className="text-xl font-black tracking-tight text-slate-900 hidden sm:block">Villag<span className="text-emerald-600">Kart</span></h1>
            </div>
          </div>

          <div className="h-8 w-px bg-slate-100 mx-2 hidden lg:block" />

          <div className="hidden lg:block">
            <h2 className="text-lg font-black leading-none text-slate-800">{storeName || 'POS Billing'} <Zap size={14} className="inline text-emerald-500 fill-emerald-500" /></h2>
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-0.5">Instant {storeName ? 'Branch' : 'Warehouse'} Direct Sales</p>
          </div>
        </div>

        {/* Store Selector Button (For Global Admins) */}
        {isGlobal && (
          <button
            onClick={() => navigate('/admin/pos')}
            className="flex items-center gap-2 px-3 py-2 bg-emerald-50 text-emerald-700 rounded-xl border border-emerald-100 hover:bg-emerald-100 transition-all ml-4"
          >
            <Store size={16} />
            <span className="text-xs font-bold uppercase tracking-wider">Switch Branch</span>
          </button>
        )}

        {/* Central Search */}
        <div className="flex-1 max-w-xl mx-8 relative hidden md:block">
          <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300" />
          <input
            type="text"
            placeholder="Search products by name or barcode..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full bg-slate-50 border border-transparent focus:bg-white focus:border-emerald-500/20 rounded-2xl pl-12 pr-12 py-3 text-sm font-bold transition-all outline-none"
          />
          <button 
            onClick={() => setIsScanning(true)}
            className="absolute right-3 top-1/2 -translate-y-1/2 p-2 text-slate-300 hover:text-emerald-600 transition-colors"
          >
            <Scan size={18} />
          </button>
        </div>

        <div className="flex items-center gap-4">
          <div className="hidden xl:flex items-center gap-3 bg-slate-50 px-4 py-2 rounded-2xl border border-slate-100">
            <Calendar size={16} className="text-emerald-500" />
            <div className="text-left">
              <p className="text-[10px] font-black text-slate-800 leading-none">{currentTime.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}</p>
              <p className="text-[9px] font-bold text-slate-400 mt-0.5 uppercase">{currentTime.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true })}</p>
            </div>
          </div>

          <div className="flex items-center gap-3 bg-white pl-1 pr-4 py-1 rounded-2xl border border-slate-100 hover:border-emerald-100 transition-all cursor-pointer group">
            <div className="w-10 h-10 rounded-xl bg-emerald-50 flex items-center justify-center text-emerald-600 group-hover:bg-emerald-600 group-hover:text-white transition-all">
              <User size={20} />
            </div>
            <div className="text-left">
              <p className="text-[11px] font-black text-slate-800 leading-none">{user?.name || 'Admin'}</p>
              <p className="text-[9px] font-bold text-slate-400 mt-0.5 uppercase tracking-wider">{user?.role || 'Store Manager'}</p>
            </div>
          </div>

          <button 
            onClick={() => navigate('/admin/sales')}
            className="p-3 bg-emerald-50 text-emerald-600 rounded-2xl hover:bg-emerald-100 transition-colors"
            title="Sales History"
          >
            <History size={20} />
          </button>

          <button 
            onClick={() => setCurrentView(currentView === 'POS' ? 'SUSPENDED' : 'POS')}
            className={`relative p-3 rounded-2xl transition-all ${
              currentView === 'SUSPENDED' 
                ? 'bg-amber-600 text-white shadow-lg shadow-amber-200' 
                : 'bg-amber-50 text-amber-600 hover:bg-amber-100'
            }`}
            title="Suspended Orders"
          >
            <Pause size={20} />
            {suspendedOrders.length > 0 && currentView !== 'SUSPENDED' && (
              <span className="absolute -top-1 -right-1 w-5 h-5 bg-rose-500 text-white text-[10px] font-black rounded-full flex items-center justify-center border-2 border-white animate-in zoom-in">
                {suspendedOrders.length}
              </span>
            )}
          </button>
        </div>
      </header>

      <main className="flex-1 flex gap-6 p-6 overflow-hidden relative">
        {currentView === 'SUSPENDED' ? (
          <SuspendedOrdersView 
            orders={suspendedOrders}
            onResume={handleResumeSale}
            onDelete={handleDeleteSuspended}
            onViewDetail={(order) => {
              setSelectedSuspendedOrder(order);
              setCurrentView('SUSPENDED_DETAIL');
            }}
            isLoading={isSuspendedLoading}
            onClose={() => setCurrentView('POS')}
          />
        ) : currentView === 'SUSPENDED_DETAIL' && selectedSuspendedOrder ? (
          <SuspendedOrderDetailView 
            order={selectedSuspendedOrder}
            onResume={handleResumeSale}
            onDelete={(id) => {
              handleDeleteSuspended(id);
              setCurrentView('SUSPENDED');
            }}
            onBack={() => {
              setSelectedSuspendedOrder(null);
              setCurrentView('SUSPENDED');
            }}
          />
        ) : (
          <>
            {/* Left Side: Product Section */}
            <div className="flex-[3] flex flex-col gap-6 overflow-hidden">
              {/* Categories */}
              <div className="flex items-center gap-3 overflow-x-auto pb-2 [scrollbar-width:none] shrink-0">
                <button
                  onClick={() => setSelectedCategory('ALL')}
                  className={`flex items-center gap-2 px-5 py-3 rounded-2xl text-[11px] font-black uppercase tracking-widest transition-all shrink-0 ${
                    selectedCategory === 'ALL'
                      ? 'bg-emerald-600 text-white shadow-lg shadow-emerald-200'
                      : 'bg-white text-slate-400 border border-slate-100 hover:bg-slate-50'
                  }`}
                >
                  <LayoutGrid size={16} />
                  All Categories
                </button>
                {categories.filter(c => c !== 'ALL').map(cat => (
                  <button
                    key={cat}
                    onClick={() => setSelectedCategory(cat)}
                    className={`flex items-center gap-2 px-5 py-3 rounded-2xl text-[11px] font-black uppercase tracking-widest transition-all border shrink-0 ${
                      selectedCategory === cat
                        ? 'bg-emerald-600 text-white border-emerald-600 shadow-lg shadow-emerald-200'
                        : 'bg-white text-slate-400 border-slate-100 hover:bg-slate-50'
                    }`}
                  >
                    {cat}
                  </button>
                ))}
                <button className="flex items-center gap-2 px-5 py-3 rounded-2xl text-[11px] font-black uppercase tracking-widest bg-white text-slate-400 border border-slate-100 hover:bg-slate-50 transition-all shrink-0">
                  More <ChevronLeft className="rotate-270" size={14} />
                </button>
              </div>

              {/* Product Grid */}
              <div className="flex-1 overflow-y-auto pr-2 grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-5 pb-6 scrollbar-thin scrollbar-thumb-slate-200">
                {loading ? (
                  [...Array(10)].map((_, i) => (
                    <div key={i} className="aspect-[4/5] bg-white rounded-3xl border border-slate-50 animate-pulse shadow-sm" />
                  ))
                ) : filteredProducts.length === 0 ? (
                  <div className="col-span-full py-20 text-center text-slate-400">
                    <Package size={48} className="mx-auto mb-4 opacity-20" />
                    <p className="font-black text-sm uppercase tracking-widest">No products found</p>
                  </div>
                ) : (
                  filteredProducts.map((product) => {
                    const inCart = items.find(i => i.productId === product.id);
                    return (
                      <div
                        key={product.id}
                        onClick={() => {
                          if (checkoutStep === 'SUCCESS') {
                            toast.error('Please click DONE to start a new sale');
                            return;
                          }
                          if (product.stock <= 0) {
                            toast.error('Product out of stock');
                            return;
                          }
                          addItem(product);
                        }}
                        className={`group relative bg-white rounded-[2rem] p-4 border transition-all cursor-pointer hover:shadow-2xl hover:shadow-emerald-900/5 ${inCart ? 'border-emerald-500 ring-1 ring-emerald-500' : 'border-slate-100'
                          } ${checkoutStep === 'SUCCESS' ? 'opacity-60 cursor-not-allowed' : ''}`}
                      >
                        {inCart && (
                          <div className="absolute top-4 right-4 w-7 h-7 bg-emerald-600 text-white rounded-full flex items-center justify-center text-[11px] font-black shadow-lg shadow-emerald-600/20 z-10 animate-in zoom-in">
                            {inCart.quantity}
                          </div>
                        )}
                        
                        <div className="aspect-square rounded-2xl bg-slate-50 mb-4 overflow-hidden relative">
                          {product.image ? (
                            <img src={product.image} alt={product.name} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700" />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center text-slate-200">
                              <Package size={40} />
                            </div>
                          )}
                          
                          <div className="absolute top-3 left-3">
                            <span className="px-2.5 py-1 bg-white/90 backdrop-blur-sm border border-slate-100 text-[8px] font-black text-emerald-600 uppercase tracking-widest rounded-lg shadow-sm">
                              {product.category?.name || 'General'}
                            </span>
                          </div>
                        </div>

                        <div className="space-y-1.5">
                          <div className="flex justify-between items-start gap-2">
                            <h4 className="text-xs font-black text-slate-900 leading-snug line-clamp-2 uppercase min-h-[2.4rem]">
                              {product.name}
                            </h4>
                            <button 
                              onClick={(e) => {
                                e.stopPropagation();
                                setProductToDamage(product);
                                setIsDamageModalOpen(true);
                              }}
                              className="p-1.5 text-slate-200 hover:text-amber-500 hover:bg-amber-50 rounded-lg transition-all"
                              title="Report Damage"
                            >
                              <AlertTriangle size={14} />
                            </button>
                          </div>

                          <div className="flex items-end justify-between pt-1">
                            <div className="flex flex-col">
                              <span className="text-lg font-black text-slate-900 tracking-tighter">₹{product.price.toFixed(2)}</span>
                              {product.mrp > product.price && (
                                <span className="text-[10px] font-bold text-rose-400 line-through">₹{product.mrp.toFixed(2)}</span>
                              )}
                              <span className={`text-[9px] font-black uppercase tracking-wider mt-1 ${product.stock <= 0 ? 'text-rose-500' : 'text-emerald-500'}`}>
                                {product.stock <= 0 ? 'Out of Stock' : `Stock: ${product.stock}`}
                              </span>
                            </div>

                            {inCart ? (
                              <div className="flex items-center gap-1.5 bg-white p-1 rounded-xl border border-emerald-500 shadow-sm shadow-emerald-600/5">
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    if (checkoutStep === 'SUCCESS') return;
                                    updateQuantity(inCart.productId, inCart.quantity - 1);
                                  }}
                                  className={`w-8 h-8 flex items-center justify-center bg-slate-50 rounded-lg text-slate-400 hover:bg-rose-50 hover:text-rose-600 transition-all ${checkoutStep === 'SUCCESS' ? 'cursor-not-allowed' : ''}`}
                                >
                                  <Minus size={14} strokeWidth={3} />
                                </button>
                                <span className="w-6 text-center text-sm font-black text-slate-900">{inCart.quantity}</span>
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    if (checkoutStep === 'SUCCESS') return;
                                    updateQuantity(inCart.productId, inCart.quantity + 1);
                                  }}
                                  className={`w-8 h-8 flex items-center justify-center bg-slate-50 rounded-lg text-emerald-600 hover:bg-emerald-50 transition-all ${checkoutStep === 'SUCCESS' ? 'cursor-not-allowed' : ''}`}
                                >
                                  <Plus size={14} strokeWidth={3} />
                                </button>
                              </div>
                            ) : (
                              product.stock > 0 && (
                                <div className="w-10 h-10 rounded-2xl bg-emerald-600 flex items-center justify-center text-white shadow-lg shadow-emerald-600/20 group-hover:scale-110 transition-all">
                                  <Plus size={18} strokeWidth={3} />
                                </div>
                              )
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
              
              {/* Pagination Mockup */}
              <div className="shrink-0 flex items-center justify-between px-2 pt-2 border-t border-slate-100">
                <p className="text-[11px] font-bold text-slate-400">Showing 1 to {filteredProducts.length} of {products.length} products</p>
                <div className="flex items-center gap-2">
                  <button className="w-8 h-8 rounded-lg border border-slate-100 flex items-center justify-center text-slate-400 hover:bg-slate-50"><ChevronLeft size={16} /></button>
                  <button className="w-8 h-8 rounded-lg bg-emerald-600 text-white font-black text-xs shadow-sm">1</button>
                  <button className="w-8 h-8 rounded-lg border border-slate-100 flex items-center justify-center text-slate-400 hover:bg-slate-50 text-xs font-bold">2</button>
                  <button className="w-8 h-8 rounded-lg border border-slate-100 flex items-center justify-center text-slate-400 hover:bg-slate-50 text-xs font-bold">3</button>
                  <span className="text-slate-300 text-xs">...</span>
                  <button className="w-8 h-8 rounded-lg border border-slate-100 flex items-center justify-center text-slate-400 hover:bg-slate-50 text-xs font-bold">10</button>
                  <button className="w-8 h-8 rounded-lg border border-slate-100 flex items-center justify-center text-slate-400 hover:bg-slate-50"><ChevronRight size={16} /></button>
                </div>
              </div>
            </div>

            <div className="flex-[1.3] hidden lg:flex flex-col bg-white rounded-[2.5rem] border border-slate-100 shadow-sm overflow-hidden animate-in slide-in-from-right duration-500">
              {checkoutStep === 'CART' && (
                <>
                  {/* Header */}
                  <div className="p-6 border-b border-slate-50 flex items-center justify-between shrink-0">
                    <div className="flex items-center gap-2.5">
                      <div className="w-9 h-9 bg-emerald-50 rounded-xl flex items-center justify-center text-emerald-600">
                        <ShoppingCart size={18} />
                      </div>
                      <div>
                        <h3 className="text-lg font-black text-slate-900 tracking-tight">Cart <span className="text-slate-400 font-bold">({cartCount} Items)</span></h3>
                      </div>
                    </div>
                    <div className="flex items-center gap-1">
                      {items.length > 0 && (
                        <button
                          onClick={handleSuspendSale}
                          className="flex items-center gap-1.5 px-3 py-1.5 text-amber-500 hover:bg-amber-50 rounded-lg transition-all text-[10px] font-black uppercase tracking-widest"
                        >
                          <Pause size={14} /> Suspend
                        </button>
                      )}
                      <button
                        onClick={clearCart}
                        className="flex items-center gap-1.5 px-3 py-1.5 text-rose-500 hover:bg-rose-50 rounded-lg transition-all text-[10px] font-black uppercase tracking-widest"
                      >
                        <Trash2 size={14} /> Clear
                      </button>
                    </div>
                  </div>

                  {/* Sticky Customer Details */}
                  <div className="px-6 py-4 border-b border-slate-50 bg-white shrink-0 z-10">
                    <div className="grid grid-cols-2 gap-3">
                      <div className="space-y-1.5">
                        <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1 flex items-center gap-1.5">
                          <User size={10} className="text-emerald-500" /> Name
                        </label>
                        <input
                          type="text"
                          placeholder="Walk-in Customer"
                          className="w-full bg-slate-50 border border-transparent rounded-xl px-3 py-2.5 text-xs font-bold outline-none focus:bg-white focus:border-emerald-500/20 transition-all placeholder:text-slate-300"
                          value={customerName}
                          onChange={(e) => setCustomerName(e.target.value)}
                        />
                      </div>
                      <div className="space-y-1.5">
                        <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1 flex items-center gap-1.5">
                          <Smartphone size={10} className="text-emerald-500" /> Mobile
                        </label>
                        <input
                          type="tel"
                          placeholder="Enter mobile"
                          className="w-full bg-slate-50 border border-transparent rounded-xl px-3 py-2.5 text-xs font-bold outline-none focus:bg-white focus:border-emerald-500/20 transition-all placeholder:text-slate-300"
                          value={customerMobile}
                          onChange={(e) => setCustomerMobile(e.target.value)}
                        />
                      </div>
                    </div>
                  </div>

                  {/* Items List Section */}
                  <div className="flex-1 overflow-y-auto overflow-x-hidden p-6 space-y-6 scrollbar-thin scrollbar-thumb-slate-100">

                    {/* Items List */}
                    <div className="space-y-4">
                      {items.length === 0 ? (
                        <div className="py-12 flex flex-col items-center justify-center text-center text-slate-300">
                          <ShoppingCart size={48} className="mb-4 opacity-20" />
                          <p className="text-[11px] font-black uppercase tracking-widest">Cart is empty</p>
                        </div>
                      ) : (
                        items.map(item => (
                          <div key={item.productId} className="flex items-center gap-3 p-3 bg-white rounded-2xl border border-slate-100 group hover:border-emerald-200 transition-all">
                            <div className="w-12 h-12 bg-slate-50 rounded-xl overflow-hidden shrink-0 border border-slate-100">
                              {item.image ? (
                                <img src={item.image} alt={item.name} className="w-full h-full object-cover" />
                              ) : (
                                <div className="w-full h-full flex items-center justify-center text-slate-200"><Package size={20} /></div>
                              )}
                            </div>
                            <div className="flex-1 min-w-0">
                              <h4 className="text-[11px] font-black text-slate-900 uppercase tracking-tight leading-tight truncate">{item.name}</h4>
                              <p className="text-[10px] font-bold text-slate-400 mt-0.5">₹{item.price.toFixed(2)}</p>
                            </div>
                            <div className="flex flex-col items-end gap-1.5">
                              <button 
                                onClick={() => removeItem(item.productId)}
                                className="p-1 text-slate-300 hover:text-rose-500 transition-colors"
                              >
                                <Trash2 size={12} />
                              </button>
                              <div className="flex items-center gap-2 bg-slate-50 p-1 rounded-lg border border-slate-100">
                                <button
                                  onClick={() => updateQuantity(item.productId, item.quantity - 1)}
                                  className="w-5 h-5 flex items-center justify-center bg-white rounded text-slate-400 hover:text-rose-500 shadow-sm"
                                >
                                  <Minus size={10} strokeWidth={3} />
                                </button>
                                <span className="w-4 text-center text-[10px] font-black">{item.quantity}</span>
                                <button
                                  onClick={() => updateQuantity(item.productId, item.quantity + 1)}
                                  className="w-5 h-5 flex items-center justify-center bg-white rounded text-emerald-600 hover:bg-emerald-50 shadow-sm"
                                >
                                  <Plus size={10} strokeWidth={3} />
                                </button>
                              </div>
                            </div>
                            <div className="text-right min-w-[60px]">
                              <p className="text-[11px] font-black text-slate-900">₹{(item.price * item.quantity).toFixed(2)}</p>
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  </div>

                  {/* Totals Section */}
                  <div className="p-6 bg-slate-50/50 border-t border-slate-100 space-y-4 shrink-0">
                    <div className="space-y-2">
                      <div className="flex justify-between items-center text-slate-500">
                        <span className="text-xs font-bold uppercase tracking-widest">Subtotal</span>
                        <span className="text-sm font-black text-slate-900">₹{totalAmount.toFixed(2)}</span>
                      </div>
                      <div className="flex justify-between items-center text-slate-500">
                        <span className="text-xs font-bold uppercase tracking-widest flex items-center gap-1.5">
                          Discount <CheckCircle size={12} className="text-emerald-500" />
                        </span>
                        <span className="text-sm font-black text-rose-500">- ₹{(items.reduce((sum, i) => sum + (i.mrp || i.price) * i.quantity, 0) - totalAmount).toFixed(2)}</span>
                      </div>
                    </div>

                    <div className="pt-4 border-t border-slate-200/60">
                      <div className="flex justify-between items-center">
                        <span className="text-sm font-black text-slate-900 uppercase tracking-widest">Total Amount</span>
                        <span className="text-2xl font-black text-slate-900 tracking-tighter">₹{totalAmount.toFixed(2)}</span>
                      </div>
                    </div>

                    {items.some(i => i.mrp > i.price) && (
                      <div className="bg-emerald-50/80 px-4 py-3 rounded-2xl border border-emerald-100 flex items-center gap-3">
                        <div className="w-7 h-7 bg-emerald-600 rounded-lg flex items-center justify-center text-white shadow-lg shadow-emerald-200">
                          <CheckCircle size={14} />
                        </div>
                        <p className="text-[10px] font-black text-emerald-800 uppercase tracking-wider">
                          You saved <span className="text-emerald-600 font-black">₹{(items.reduce((sum, i) => sum + (i.mrp || i.price) * i.quantity, 0) - totalAmount).toFixed(2)}</span> on this order
                        </p>
                      </div>
                    )}

                    <button
                      onClick={handleCheckout}
                      disabled={items.length === 0}
                      className={`w-full font-black py-4 rounded-2xl active:scale-95 transition-all shadow-xl flex items-center justify-center gap-3 ${items.length === 0
                          ? 'bg-slate-200 text-slate-400 cursor-not-allowed'
                          : 'bg-emerald-600 text-white shadow-emerald-600/20 hover:bg-emerald-700'
                        }`}
                    >
                      Proceed to Payment
                      <ChevronRight size={18} />
                    </button>
                  </div>
                </>
              )}

              {checkoutStep === 'PAYMENT' && (
                <div className="flex flex-col h-full animate-in slide-in-from-right duration-300">
                  <div className="p-6 border-b border-slate-50 flex items-center justify-between shrink-0">
                    <div className="flex items-center gap-3">
                      <button onClick={() => setCheckoutStep('CART')} className="p-2 rounded-xl bg-slate-50 text-slate-400 hover:text-emerald-600 transition-all">
                        <ChevronLeft size={20} />
                      </button>
                      <h3 className="text-lg font-black text-slate-900 tracking-tight">Payment</h3>
                    </div>
                  </div>

                  {/* Payment Method Selection */}
                  <div className="flex-1 overflow-y-auto p-6 space-y-6 scrollbar-thin scrollbar-thumb-slate-100">
                    <div className="bg-emerald-600 rounded-[2rem] p-8 text-center text-white shadow-xl shadow-emerald-600/20 relative overflow-hidden group">
                      <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full -mr-16 -mt-16 transition-transform group-hover:scale-110" />
                      <p className="text-[10px] font-black opacity-80 uppercase tracking-[0.2em] mb-1">Amount to Pay</p>
                      <p className="text-5xl font-black tracking-tighter">₹{totalAmount.toFixed(2)}</p>
                    </div>

                    <div className="space-y-4">
                      <p className="text-[11px] font-black text-slate-900 uppercase tracking-widest flex items-center gap-2">
                        <CreditCard size={16} className="text-emerald-500" /> Select Payment Mode
                      </p>
                      <div className="grid grid-cols-2 gap-4">
                        {[
                          { id: 'CASH', label: 'Cash', icon: Banknote, color: 'emerald' },
                          { id: 'UPI', label: 'UPI / QR', icon: Smartphone, color: 'orange' },
                          { id: 'CARD', label: 'Card', icon: CreditCard, color: 'sky' },
                          { id: 'CASH_UPI', label: 'Split Pay', icon: Zap, color: 'indigo' },
                          { id: 'CREDIT', label: 'Credit', icon: Clock, color: 'rose' }
                        ].map(mode => (
                          <button
                            key={mode.id}
                            onClick={() => setSelectedPaymentMode(mode.id)}
                            className={`p-5 rounded-2xl border-2 transition-all flex flex-col items-center justify-center gap-3 active:scale-95 ${selectedPaymentMode === mode.id
                                ? `border-${mode.color}-500 bg-${mode.color}-50 text-${mode.color}-600 shadow-lg shadow-${mode.color}-600/5`
                                : 'border-slate-100 bg-white text-slate-400 hover:border-slate-200'
                              }`}
                          >
                            <mode.icon size={28} />
                            <span className="text-[10px] font-black uppercase tracking-widest">{mode.label}</span>
                          </button>
                        ))}
                      </div>
                    </div>

                    {selectedPaymentMode === 'CASH' && (
                      <div className="space-y-4 animate-in fade-in slide-in-from-top-4">
                        <div className="bg-white border border-slate-100 rounded-2xl p-6 space-y-4 shadow-sm">
                          <div className="space-y-2">
                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Received Cash</label>
                            <div className="relative">
                              <span className="absolute left-0 top-1/2 -translate-y-1/2 text-2xl font-black text-slate-300">₹</span>
                              <input
                                type="number"
                                value={cashReceived}
                                onChange={(e) => setCashReceived(e.target.value)}
                                className="w-full pl-8 text-3xl font-black text-slate-900 outline-none bg-transparent placeholder:text-slate-100"
                                placeholder="0.00"
                                autoFocus
                              />
                            </div>
                          </div>
                          <div className="pt-4 border-t border-slate-50 flex justify-between items-center">
                            <span className="text-[11px] font-black text-slate-400 uppercase tracking-widest">Change Due</span>
                            <span className="text-xl font-black text-orange-600">
                              ₹{Math.max(0, (parseFloat(cashReceived) || 0) - totalAmount).toFixed(2)}
                            </span>
                          </div>
                        </div>
                      </div>
                    )}

                    {selectedPaymentMode === 'CASH_UPI' && (
                      <div className="space-y-4 animate-in fade-in slide-in-from-top-4">
                        <div className="grid grid-cols-2 gap-4">
                          <div className="bg-white border border-slate-100 rounded-2xl p-4 space-y-2 shadow-sm">
                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Cash Part</label>
                            <input
                              type="number"
                              value={splitAmounts.cash}
                              onChange={(e) => {
                                const val = e.target.value;
                                const rem = Math.max(0, totalAmount - (parseFloat(val) || 0));
                                setSplitAmounts({ cash: val, upi: rem.toFixed(0) });
                              }}
                              className="w-full text-xl font-black text-slate-900 outline-none bg-transparent"
                            />
                          </div>
                          <div className="bg-white border border-slate-100 rounded-2xl p-4 space-y-2 shadow-sm">
                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">UPI Part</label>
                            <input
                              type="number"
                              value={splitAmounts.upi}
                              onChange={(e) => {
                                const val = e.target.value;
                                const rem = Math.max(0, totalAmount - (parseFloat(val) || 0));
                                setSplitAmounts({ upi: val, cash: rem.toFixed(0) });
                              }}
                              className="w-full text-xl font-black text-orange-600 outline-none bg-transparent"
                            />
                          </div>
                        </div>
                      </div>
                    )}
                    {selectedPaymentMode === 'CREDIT' && (!customerName?.trim() || !customerMobile?.trim()) && (
                      <div className="bg-rose-50 border border-rose-100 rounded-2xl p-4 animate-in fade-in slide-in-from-top-4">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 bg-rose-500 rounded-lg flex items-center justify-center text-white">
                            <AlertTriangle size={16} />
                          </div>
                          <div>
                            <p className="text-[10px] font-black text-rose-900 uppercase tracking-wider">Required Info Missing</p>
                            <p className="text-[9px] font-bold text-rose-500 uppercase">Name & Mobile needed for Credit</p>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>

                  <div className="p-6 bg-slate-50/50 border-t border-slate-100">
                    <button
                      onClick={handlePayment}
                      disabled={actionLoading || !selectedPaymentMode}
                      className="w-full bg-emerald-600 text-white font-black py-5 rounded-2xl shadow-xl hover:bg-emerald-700 transition-all active:scale-95 disabled:opacity-50 flex items-center justify-center gap-3 shadow-emerald-600/20"
                    >
                      {actionLoading ? <Loader2 className="animate-spin" /> : <CheckCircle size={20} strokeWidth={3} />}
                      Complete Payment
                    </button>
                  </div>
                </div>
              )}

              {checkoutStep === 'SUCCESS' && lastOrder && (
                <div className="flex flex-col h-full animate-in zoom-in-95 duration-500">
                  <div className="flex-1 overflow-y-auto p-8 flex flex-col items-center justify-center text-center space-y-8">
                    <div className="relative">
                      <div className="w-28 h-28 bg-emerald-600 rounded-[2.5rem] flex items-center justify-center text-white shadow-2xl shadow-emerald-600/30 rotate-12 group-hover:rotate-0 transition-transform">
                        <CheckCircle size={56} strokeWidth={3} />
                      </div>
                      <div className="absolute -top-2 -right-2 w-10 h-10 bg-white rounded-2xl shadow-lg flex items-center justify-center text-emerald-600 animate-bounce">
                        <Zap size={20} fill="currentColor" />
                      </div>
                    </div>

                    <div className="space-y-2">
                      <h3 className="text-3xl font-black text-slate-900 tracking-tight">Order Success!</h3>
                      <p className="text-[11px] font-black text-slate-400 uppercase tracking-[0.2em]">Transaction Verified Successfully</p>
                    </div>

                    <div className="w-full space-y-4">
                      <div className="bg-slate-50 rounded-[2rem] p-6 border border-slate-100 space-y-4">
                        <div className="flex justify-between items-center text-slate-500">
                          <span className="text-[10px] font-black uppercase tracking-widest">Order Number</span>
                          <span className="text-xs font-black text-slate-900">#VK-{getInvoiceNumber(lastOrder)}</span>
                        </div>
                        <div className="h-px bg-slate-200/50" />
                        <div className="flex justify-between items-center">
                          <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Paid Amount</span>
                          <span className="text-2xl font-black text-slate-900 tracking-tighter">₹{lastOrder.totalAmount?.toFixed(2)}</span>
                        </div>
                        <div className="flex justify-between items-center">
                          <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Method</span>
                          <span className="px-3 py-1 bg-white border border-slate-200 rounded-lg text-[9px] font-black text-slate-900 uppercase">
                            {selectedPaymentMode}
                          </span>
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-4">
                        <button
                          onClick={handleDownloadPDF}
                          disabled={isDownloading}
                          className="w-full bg-white text-slate-900 font-black py-4 rounded-2xl border border-slate-200 hover:bg-slate-50 transition-all flex items-center justify-center gap-2 text-xs disabled:opacity-50"
                        >
                          {isDownloading ? <Loader2 className="animate-spin" /> : <Download size={16} />}
                          Print Receipt
                        </button>
                        <button
                          onClick={() => {
                            clearCart();
                            setCheckoutStep('CART');
                            setLastOrder(null);
                          }}
                          className="w-full bg-slate-900 text-white font-black py-4 rounded-2xl hover:bg-slate-800 transition-all flex items-center justify-center gap-2 text-xs"
                        >
                          <ShoppingCart size={16} />
                          New Sale
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </>
        )}
      </main>

      {/* Floating Summary Trigger (Mobile Only) */}
      {cartCount > 0 && (
        <div className="fixed bottom-8 left-1/2 -translate-x-1/2 z-40 w-full max-w-xs lg:hidden px-4">
          <button
            onClick={() => setIsCartOpen(true)}
            className="w-full bg-slate-900 text-white font-black py-5 rounded-3xl shadow-2xl flex items-center justify-between px-8 active:scale-95 transition-all border border-white/10"
          >
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-emerald-600 flex items-center justify-center">
                <ShoppingCart size={18} />
              </div>
              <span className="text-[11px] uppercase font-black tracking-widest">Review Cart</span>
            </div>
            <div className="flex items-center gap-3">
              <span className="text-sm font-black tracking-tighter">₹{totalAmount.toFixed(2)}</span>
              <ChevronRight size={18} />
            </div>
          </button>
        </div>
      )}

      {/* Billing Summary Modal Overlay (Mobile Only) */}
      {isCartOpen && (
        <div className="fixed inset-0 z-50 flex items-end justify-center p-0 lg:hidden">
          <div
            className="absolute inset-0 bg-slate-900/60 backdrop-blur-md animate-fade-in"
            onClick={() => setIsCartOpen(false)}
          />

            <div className="relative w-full max-h-[90vh] flex flex-col bg-white rounded-t-[3rem] shadow-2xl animate-slide-up overflow-hidden">
              <div className="w-12 h-1 bg-slate-200 rounded-full mx-auto my-4 shrink-0" />
              
              {/* Sticky Customer Details (Mobile) */}
              <div className="px-6 py-4 border-b border-slate-50 bg-white shrink-0 z-10">
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1 flex items-center gap-1.5">
                      <User size={10} className="text-emerald-500" /> Name
                    </label>
                    <input
                      type="text"
                      placeholder="Walk-in Customer"
                      className="w-full bg-slate-50 border border-transparent rounded-xl px-3 py-2.5 text-xs font-bold outline-none focus:bg-white focus:border-emerald-500/20 transition-all placeholder:text-slate-300"
                      value={customerName}
                      onChange={(e) => setCustomerName(e.target.value)}
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1 flex items-center gap-1.5">
                      <Smartphone size={10} className="text-emerald-500" /> Mobile
                    </label>
                    <input
                      type="tel"
                      placeholder="Enter mobile"
                      className="w-full bg-slate-50 border border-transparent rounded-xl px-3 py-2.5 text-xs font-bold outline-none focus:bg-white focus:border-emerald-500/20 transition-all placeholder:text-slate-300"
                      value={customerMobile}
                      onChange={(e) => setCustomerMobile(e.target.value)}
                    />
                  </div>
                </div>
              </div>

              <div className="px-6 pb-6 border-b border-slate-50 flex items-center justify-between shrink-0">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-emerald-50 rounded-2xl flex items-center justify-center text-emerald-600">
                  <ShoppingCart size={20} />
                </div>
                <div>
                  <h3 className="text-xl font-black text-slate-900 tracking-tight">Checkout</h3>
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{cartCount} Items Selected</p>
                </div>
              </div>
              <button
                onClick={() => {
                  if (checkoutStep === 'SUCCESS') resetPOS();
                  setIsCartOpen(false);
                }}
                className="p-2 bg-slate-50 rounded-full text-slate-400"
              >
                <X size={24} />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto overflow-x-hidden pb-32 scrollbar-thin scrollbar-thumb-slate-100">
              {checkoutStep === 'CART' && (
                <div className="p-6 space-y-8">
                  <div className="space-y-4">
                    <p className="text-[11px] font-black text-slate-900 uppercase tracking-widest flex items-center gap-2">
                      <User size={16} className="text-emerald-500" /> Customer Info
                    </p>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">Name</label>
                        <input
                          type="text"
                          placeholder="Walk-in"
                          className="w-full bg-slate-50 border border-transparent rounded-2xl px-4 py-4 text-sm font-bold outline-none"
                          value={customerName}
                          onChange={(e) => setCustomerName(e.target.value)}
                        />
                      </div>
                      <div className="space-y-2">
                        <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">Mobile</label>
                        <input
                          type="tel"
                          placeholder="9876..."
                          className="w-full bg-slate-50 border border-transparent rounded-2xl px-4 py-4 text-sm font-bold outline-none"
                          value={customerMobile}
                          onChange={(e) => setCustomerMobile(e.target.value)}
                        />
                      </div>
                    </div>
                  </div>

                  <div className="space-y-4">
                    <p className="text-[11px] font-black text-slate-900 uppercase tracking-widest flex items-center gap-2">
                      <LayoutGrid size={16} className="text-emerald-500" /> Items List
                    </p>
                    {items.map(item => (
                      <div key={item.productId} className="flex items-center gap-4 p-4 bg-slate-50 rounded-3xl border border-slate-100">
                        <div className="w-12 h-12 bg-white rounded-xl border border-slate-100 flex-shrink-0">
                          {item.image ? (
                            <img src={item.image} alt={item.name} className="w-full h-full object-cover" />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center text-slate-200"><Package size={18} /></div>
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <h4 className="text-sm font-black text-slate-900 truncate uppercase">{item.name}</h4>
                          <p className="text-xs font-bold text-slate-400 mt-0.5">₹{item.price.toFixed(2)} × {item.quantity}</p>
                        </div>
                        <div className="text-right">
                          <p className="text-sm font-black text-slate-900">₹{(item.price * item.quantity).toFixed(2)}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {checkoutStep === 'PAYMENT' && (
                <div className="p-6 space-y-8 animate-in slide-in-from-right duration-300">
                  {/* Payment UI is similar to desktop sidebar but adapted for full width */}
                  <div className="bg-emerald-600 rounded-3xl p-8 text-center text-white shadow-xl">
                    <p className="text-[10px] font-black opacity-80 uppercase tracking-widest mb-1">Payable Amount</p>
                    <p className="text-4xl font-black tracking-tighter">₹{totalAmount.toFixed(2)}</p>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    {[
                      { id: 'CASH', label: 'Cash', icon: Banknote, color: 'emerald' },
                      { id: 'UPI', label: 'UPI / QR', icon: Smartphone, color: 'orange' },
                      { id: 'CARD', label: 'Card', icon: CreditCard, color: 'sky' },
                      { id: 'CASH_UPI', label: 'Split Pay', icon: Zap, color: 'indigo' }
                    ].map(mode => (
                      <button
                        key={mode.id}
                        onClick={() => setSelectedPaymentMode(mode.id)}
                        className={`p-6 rounded-3xl border-2 transition-all flex flex-col items-center justify-center gap-3 active:scale-95 ${selectedPaymentMode === mode.id
                            ? `border-${mode.color}-500 bg-${mode.color}-50 text-${mode.color}-600 shadow-lg`
                            : 'border-slate-100 bg-white text-slate-400'
                          }`}
                      >
                        <mode.icon size={32} />
                        <span className="text-[11px] font-black uppercase tracking-widest">{mode.label}</span>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {checkoutStep === 'SUCCESS' && (
                <div className="p-12 flex flex-col items-center text-center space-y-8 animate-in zoom-in-95 duration-500">
                  <div className="w-24 h-24 bg-emerald-600 rounded-full flex items-center justify-center text-white shadow-2xl">
                    <CheckCircle size={48} strokeWidth={3} />
                  </div>
                  <div className="space-y-2">
                    <h3 className="text-3xl font-black text-slate-900 tracking-tight">Order Placed!</h3>
                    <p className="text-[11px] font-black text-slate-400 uppercase tracking-widest">Transaction Verified Successfully</p>
                  </div>
                  <div className="w-full bg-slate-50 rounded-3xl p-6 border border-slate-100 space-y-4">
                    <div className="flex justify-between items-center text-slate-500 text-xs">
                      <span className="font-bold">Total Paid</span>
                      <span className="font-black text-slate-900">₹{lastOrder.totalAmount?.toFixed(2)}</span>
                    </div>
                  </div>
                </div>
              )}
            </div>

            <div className="p-6 bg-white border-t border-slate-100 fixed bottom-0 left-0 w-full z-10 shadow-[0_-8px_30px_rgb(0,0,0,0.04)]">
              {checkoutStep === 'CART' && (
                <button
                  onClick={handleCheckout}
                  className="w-full bg-emerald-600 text-white font-black py-5 rounded-[2rem] shadow-xl shadow-emerald-600/20 flex items-center justify-center gap-3 text-lg"
                >
                  Proceed to Payment
                  <ChevronRight size={20} />
                </button>
              )}
              {checkoutStep === 'PAYMENT' && (
                <div className="flex gap-4">
                  <button
                    onClick={() => setCheckoutStep('CART')}
                    className="flex-1 bg-slate-100 text-slate-900 font-black py-5 rounded-[2rem]"
                  >
                    Back
                  </button>
                  <button
                    onClick={handlePayment}
                    disabled={actionLoading || !selectedPaymentMode}
                    className="flex-[2] bg-emerald-600 text-white font-black py-5 rounded-[2rem] shadow-xl shadow-emerald-600/20 disabled:opacity-50"
                  >
                    {actionLoading ? <Loader2 className="animate-spin mx-auto" /> : 'Pay Now'}
                  </button>
                </div>
              )}
              {checkoutStep === 'SUCCESS' && (
                <button
                  onClick={() => { resetPOS(); setIsCartOpen(false); }}
                  className="w-full bg-emerald-600 text-white font-black py-5 rounded-[2rem] shadow-xl shadow-emerald-600/20"
                >
                  Done & New Sale
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {isScanning && (
        <BarcodeScannerOverlay
          onClose={() => setIsScanning(false)}
          onScan={(code) => {
            handleBarcodeScan(code);
          }}
        />
      )}

      {/* Damage Report Modal */}
      {isDamageModalOpen && productToDamage && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-md animate-in fade-in duration-300">
          <div className="bg-white w-full max-w-md rounded-[3rem] overflow-hidden shadow-2xl animate-in zoom-in-95 duration-300">
            <div className="p-8 border-b border-slate-50 flex items-center justify-between bg-amber-50/20">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-amber-100 rounded-2xl flex items-center justify-center text-amber-600">
                  <AlertTriangle size={24} />
                </div>
                <div>
                  <h3 className="text-xl font-black text-slate-900 tracking-tight">Report Damage</h3>
                  <p className="text-[10px] font-bold text-amber-600 uppercase tracking-widest truncate max-w-[200px]">{productToDamage.name}</p>
                </div>
              </div>
              <button 
                onClick={() => setIsDamageModalOpen(false)}
                className="p-3 bg-white rounded-2xl text-slate-400 hover:text-slate-900 shadow-sm"
              >
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleDamageSubmit} className="p-8 space-y-6">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Quantity</label>
                  <input
                    type="number"
                    required
                    min="1"
                    max={productToDamage.stock}
                    value={damageData.quantity}
                    onChange={(e) => setDamageData({ ...damageData, quantity: e.target.value })}
                    className="w-full bg-slate-50 border border-transparent rounded-2xl px-5 py-4 text-sm font-bold focus:bg-white focus:border-amber-500/20 outline-none transition-all"
                    placeholder={`Max: ${productToDamage.stock}`}
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Type</label>
                  <select
                    value={damageData.type}
                    onChange={(e) => setDamageData({ ...damageData, type: e.target.value })}
                    className="w-full bg-slate-50 border border-transparent rounded-2xl px-5 py-4 text-sm font-bold focus:bg-white focus:border-amber-500/20 outline-none transition-all"
                  >
                    <option value="DAMAGED">Damaged</option>
                    <option value="EXPIRED">Expired</option>
                    <option value="LEAKAGE">Leakage</option>
                    <option value="LOST">Lost</option>
                  </select>
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Responsibility</label>
                <div className="grid grid-cols-3 gap-3">
                  {[
                    { id: 'UNKNOWN', label: 'Unset' },
                    { id: 'SYSTEM', label: 'System' },
                    { id: 'SELF', label: 'Agent' }
                  ].map(r => (
                    <button
                      key={r.id}
                      type="button"
                      onClick={() => setDamageData({ ...damageData, responsibility: r.id })}
                      className={`py-3 rounded-2xl text-[10px] font-black uppercase tracking-widest border transition-all ${
                        damageData.responsibility === r.id 
                        ? 'bg-amber-600 border-amber-600 text-white shadow-lg shadow-amber-600/20' 
                        : 'bg-white border-slate-100 text-slate-400 hover:border-amber-200'
                      }`}
                    >
                      {r.label}
                    </button>
                  ))}
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Evidence Photos</label>
                <div className="flex flex-wrap gap-3">
                  {damagePreviews.map((preview, idx) => (
                    <div key={idx} className="relative w-16 h-16 rounded-2xl overflow-hidden border border-slate-100 group">
                      <img src={preview} alt="preview" className="w-full h-full object-cover" />
                      <button
                        type="button"
                        onClick={() => removeDamageImage(idx)}
                        className="absolute top-1 right-1 bg-white/80 backdrop-blur-sm p-1.5 rounded-xl text-rose-500 opacity-0 group-hover:opacity-100 transition-all"
                      >
                        <Trash size={14} />
                      </button>
                    </div>
                  ))}
                  {damageData.images.length < 4 && (
                    <label className="w-16 h-16 rounded-2xl border-2 border-dashed border-slate-200 flex flex-col items-center justify-center text-slate-300 hover:border-amber-200 hover:text-amber-500 cursor-pointer transition-all">
                      <Camera size={20} />
                      <input
                        type="file"
                        multiple
                        accept="image/*"
                        onChange={handleImageChange}
                        className="hidden"
                      />
                    </label>
                  )}
                </div>
              </div>

              <button
                type="submit"
                disabled={damageSubmitting}
                className="w-full bg-amber-600 text-white font-black py-5 rounded-[2rem] shadow-xl shadow-amber-600/20 hover:bg-amber-700 active:scale-95 transition-all flex items-center justify-center gap-3 disabled:opacity-50"
              >
                {damageSubmitting ? <Loader2 className="animate-spin" /> : <Send size={20} />}
                Submit Report
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Unavailable Product Modal */}
      {unavailableCode && (
        <div className="fixed inset-0 z-[120] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in">
          <div className="bg-white rounded-3xl p-8 w-full max-w-sm text-center shadow-2xl animate-in zoom-in-95">
            <div className="w-20 h-20 bg-rose-100 text-rose-600 rounded-[2rem] flex items-center justify-center mx-auto mb-6 shadow-sm border border-rose-200">
              <AlertTriangle size={40} />
            </div>
            <h3 className="text-2xl font-black text-gray-900 mb-2">Product Not Found</h3>
            <p className="text-sm font-bold text-gray-500 mb-8 leading-relaxed px-4">
              The barcode <span className="text-rose-600 font-black">"{unavailableCode}"</span> does not match any items in your catalog.
            </p>
            <button
              onClick={() => setUnavailableCode(null)}
              className="w-full bg-slate-900 text-white font-black py-5 rounded-2xl hover:bg-slate-800 active:scale-95 transition-all shadow-xl shadow-slate-900/20"
            >
              Close Notification
            </button>
          </div>
        </div>
      )}

      {/* Scanned Product Quantity Modal */}
      {scannedProduct && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in">
          <div className="bg-white rounded-[3rem] p-10 w-full max-w-md text-center shadow-2xl animate-in zoom-in-95 relative overflow-hidden">
            <div className="absolute top-0 left-0 w-full h-2 bg-emerald-600" />
            
            <h3 className="text-2xl font-black text-gray-900 mb-1">{scannedProduct.name}</h3>
            <p className="text-xs font-black text-emerald-600 uppercase tracking-widest mb-8">
              Inventory Context: {scannedProduct.stock} units available
            </p>
            
            <div className="flex items-center justify-center gap-8 mb-10">
              <button
                onClick={() => setScannedQuantity(Math.max(1, scannedQuantity - 1))}
                className="w-16 h-16 rounded-2xl bg-slate-50 flex items-center justify-center text-slate-400 hover:bg-rose-50 hover:text-rose-600 transition-all border border-slate-100"
              >
                <Minus size={32} strokeWidth={3} />
              </button>
              <div className="flex flex-col">
                <span className="text-5xl font-black text-gray-900 tabular-nums">{scannedQuantity}</span>
                <span className="text-[10px] font-black text-slate-300 uppercase tracking-[0.2em] mt-1">QTY</span>
              </div>
              <button
                onClick={() => setScannedQuantity(Math.min(scannedProduct.stock, scannedQuantity + 1))}
                className="w-16 h-16 rounded-2xl bg-slate-50 flex items-center justify-center text-slate-400 hover:bg-emerald-50 hover:text-emerald-600 transition-all border border-slate-100"
              >
                <Plus size={32} strokeWidth={3} />
              </button>
            </div>

            <div className="flex gap-4">
              <button
                onClick={() => setScannedProduct(null)}
                className="flex-1 bg-slate-100 text-slate-600 font-black py-5 rounded-2xl hover:bg-slate-200 active:scale-95 transition-all text-xs uppercase tracking-widest"
              >
                Discard
              </button>
              <button
                onClick={() => {
                  addItem(scannedProduct, scannedQuantity);
                  toast.success(`${scannedQuantity}x Added to cart`);
                  setScannedProduct(null);
                }}
                className="flex-[1.5] bg-emerald-600 text-white font-black py-5 rounded-2xl hover:bg-emerald-700 active:scale-95 transition-all shadow-xl shadow-emerald-600/20 text-xs uppercase tracking-widest"
              >
                Confirm Addition
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// --- FULL SCREEN STORE SELECTION VIEW ---
function StoreSelectionScreen({ 
  stores, 
  fetchingStores, 
  searchTerm, 
  setSearchTerm, 
  navigate, 
  storeId, 
  onRefresh,
  handleOpenPOS,
  fetchingTerminals,
  isManagingTerminals,
  setIsManagingTerminals,
  terminalStore,
  setTerminalStore,
  terminalSelectionStore,
  setTerminalSelectionStore,
  terminalList
}) {
  const filteredStores = useMemo(() => {
    return stores.filter(s => 
      s.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
      s.code.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (s.address && s.address.toLowerCase().includes(searchTerm.toLowerCase()))
    );
  }, [stores, searchTerm]);

  if (terminalSelectionStore) {
    return (
      <TerminalSelectionScreen 
        store={terminalSelectionStore}
        terminals={terminalList}
        onClose={() => setTerminalSelectionStore(null)}
        onSelect={(t) => {
          navigate(`/admin/pos?storeId=${terminalSelectionStore.id}&storeName=${encodeURIComponent(terminalSelectionStore.name)}&terminalId=${t.id}&terminalName=${encodeURIComponent(t.name)}`);
          setTerminalSelectionStore(null);
        }}
        navigate={navigate}
      />
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-6 animate-in fade-in duration-500 relative">
      {/* Top Left Back Button */}
      <div className="absolute top-8 left-8">
        <button 
          onClick={() => navigate('/admin')}
          className="p-3 bg-white hover:bg-slate-50 rounded-2xl text-slate-400 hover:text-emerald-600 transition-all group shadow-sm border border-slate-100 flex items-center gap-2"
          title="Back to Dashboard"
        >
          <ArrowLeft size={20} className="group-hover:-translate-x-1 transition-transform" />
          <span className="text-xs font-black uppercase tracking-wider pr-1">Dashboard</span>
        </button>
      </div>

      <div className="w-full max-w-5xl">
        {/* Fully Streamlined Single-Line Header Section */}
        <div className="flex flex-col lg:flex-row items-center justify-between gap-8 mb-10 bg-white p-5 rounded-[2rem] border border-slate-100 shadow-sm animate-in slide-in-from-top duration-700">
          <div className="flex items-center gap-5">
            <div className="flex items-center gap-2.5 px-3.5 py-2 bg-emerald-600 text-white rounded-xl shadow-lg shadow-emerald-200">
              <Store size={18} />
              <span className="text-[10px] font-black uppercase tracking-widest whitespace-nowrap">Control Center</span>
            </div>
            <h1 className="text-2xl font-black text-slate-900 tracking-tight whitespace-nowrap border-l border-slate-100 pl-5">
              Select Branch <span className="text-emerald-600">Context</span>
            </h1>
          </div>
          
          <div className="relative flex-1 max-w-xl group">
            <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300 group-focus-within:text-emerald-500 transition-colors" />
            <input
              type="text"
              placeholder="Search branches by name, code or location..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full bg-slate-50 border border-slate-100 rounded-2xl pl-12 pr-4 py-3.5 text-sm font-bold focus:bg-white focus:ring-4 focus:ring-emerald-500/5 focus:border-emerald-500/20 transition-all outline-none"
            />
          </div>
        </div>

        {/* Store Table */}
        <div className="min-h-[400px]">
          {fetchingStores ? (
            <div className="flex flex-col items-center justify-center py-24">
              <Loader2 size={48} className="text-emerald-600 animate-spin mb-6" />
              <p className="text-lg font-black text-slate-400">Loading organization nodes...</p>
            </div>
          ) : filteredStores.length > 0 ? (
            <div className="bg-white rounded-[2rem] shadow-xl shadow-slate-200/50 border border-slate-100 overflow-hidden animate-in slide-in-from-bottom duration-700">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50/80 border-b border-slate-100">
                    <th className="px-6 py-3 text-[10px] font-black text-slate-400 uppercase tracking-widest">Code</th>
                    <th className="px-6 py-3 text-[10px] font-black text-slate-400 uppercase tracking-widest">Branch Name</th>
                    <th className="px-6 py-3 text-[10px] font-black text-slate-400 uppercase tracking-widest">Location</th>
                    <th className="px-6 py-3 text-[10px] font-black text-slate-400 uppercase tracking-widest text-center">Team</th>
                    <th className="px-6 py-3 text-[10px] font-black text-slate-400 uppercase tracking-widest text-center">Fleet</th>
                    <th className="px-6 py-3 text-[10px] font-black text-slate-400 uppercase tracking-widest text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {filteredStores.map(s => (
                    <tr 
                      key={s.id} 
                      className="group hover:bg-emerald-50/40 transition-colors cursor-pointer whitespace-nowrap"
                      onClick={() => navigate(`/admin/pos?storeId=${s.id}&storeName=${encodeURIComponent(s.name)}`)}
                    >
                      <td className="px-6 py-3">
                        <span className="text-[11px] font-black text-slate-400 group-hover:text-emerald-600 transition-colors">{s.code}</span>
                      </td>
                      <td className="px-6 py-3">
                        <h3 className="text-sm font-black text-slate-800">{s.name}</h3>
                      </td>
                      <td className="px-6 py-3">
                        <span className="text-xs font-bold text-slate-500 max-w-[300px] truncate block">{s.address || '---'}</span>
                      </td>
                      <td className="px-6 py-3 text-center">
                        <span className="text-xs font-black text-slate-600 px-2 py-0.5 bg-slate-100 rounded-md">
                          {s._count?.users || 0}
                        </span>
                      </td>
                      <td className="px-6 py-3 text-center">
                        <span className="text-xs font-black text-slate-600 px-2 py-0.5 bg-slate-100 rounded-md">
                          {s._count?.vehicles || 0}
                        </span>
                      </td>
                      <td className="px-6 py-3 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <button 
                            onClick={(e) => {
                              e.stopPropagation();
                              setTerminalStore(s);
                              setIsManagingTerminals(true);
                            }}
                            className="p-2 text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 rounded-lg transition-all"
                            title="Manage Terminals"
                          >
                            <Settings size={16} />
                          </button>
                          <button 
                            onClick={(e) => {
                              e.stopPropagation();
                              handleOpenPOS(s);
                            }}
                            disabled={fetchingTerminals}
                            className="px-4 py-1.5 bg-emerald-600 text-white rounded-lg text-[10px] font-black uppercase tracking-widest hover:bg-emerald-700 transition-all shadow-sm hover:shadow-emerald-600/20 disabled:opacity-50"
                          >
                            {fetchingTerminals ? 'Checking...' : 'Open POS'}
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="text-center py-24 bg-white rounded-[3rem] border-2 border-dashed border-slate-200">
              <div className="w-20 h-20 bg-orange-50 text-orange-600 rounded-[2rem] flex items-center justify-center mx-auto mb-6">
                <AlertTriangle size={40} />
              </div>
              <h3 className="text-2xl font-black text-slate-800 mb-2">No Matching Branches</h3>
              <p className="text-slate-400 font-bold max-w-xs mx-auto">We couldn't find any branches matching your search criteria.</p>
              <button 
                onClick={() => setSearchTerm('')}
                className="mt-6 text-emerald-600 font-black hover:underline underline-offset-4"
              >
                Clear all filters
              </button>
            </div>
          )}
        </div>

        {/* Footer Navigation */}
        <div className="mt-16 flex items-center justify-center gap-12">
          <button 
            onClick={() => navigate('/admin')}
            className="flex items-center gap-2 text-sm font-black text-slate-400 hover:text-slate-800 transition-all group"
          >
            <ArrowLeft size={18} className="group-hover:-translate-x-1 transition-transform" />
            Back to Dashboard
          </button>
          <div className="w-1.5 h-1.5 rounded-full bg-slate-200" />
          <button 
            onClick={onRefresh}
            className="flex items-center gap-2 text-sm font-black text-slate-400 hover:text-emerald-600 transition-all group"
          >
            <RotateCcw size={18} className="group-hover:rotate-180 transition-transform duration-500" />
            Refresh Nodes
          </button>
        </div>
      </div>

      {/* Terminal Management Modal */}
      {isManagingTerminals && terminalStore && (
        <TerminalManagementModal 
          store={terminalStore} 
          onClose={() => {
            setIsManagingTerminals(false);
            setTerminalStore(null);
          }} 
        />
      )}

      {/* Terminal Selection View is now handled at the top of StoreSelectionScreen */}
    </div>
  );
}

// --- TERMINAL SELECTION SCREEN ---
function TerminalSelectionScreen({ store, terminals, onClose, onSelect, navigate }) {
  return (
    <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-6 animate-in fade-in zoom-in duration-500 relative">
      <div className="absolute top-8 left-8">
        <button 
          onClick={onClose}
          className="p-3 bg-white hover:bg-slate-50 rounded-2xl text-slate-400 hover:text-emerald-600 transition-all group shadow-sm border border-slate-100 flex items-center gap-2"
        >
          <ArrowLeft size={20} className="group-hover:-translate-x-1 transition-transform" />
          <span className="text-xs font-black uppercase tracking-wider pr-1">Branches</span>
        </button>
      </div>

      <div className="w-full max-w-xl">
        <div className="bg-white rounded-[3rem] shadow-2xl shadow-slate-200/50 border border-slate-100 p-12 text-center">
          <div className="w-24 h-24 bg-emerald-50 text-emerald-600 rounded-[2.5rem] flex items-center justify-center mx-auto mb-8 shadow-sm border border-emerald-100 animate-bounce-slow">
            <Smartphone size={40} />
          </div>
          
          <div className="mb-10">
            <span className="px-4 py-1.5 bg-emerald-50 text-emerald-600 rounded-full text-[10px] font-black uppercase tracking-widest mb-4 inline-block">
              Active Session Initiation
            </span>
            <h2 className="text-4xl font-black text-slate-900 mb-2 tracking-tight">Select POS Terminal</h2>
            <p className="text-sm font-bold text-slate-400 uppercase tracking-widest flex items-center justify-center gap-2">
              <Store size={14} className="text-emerald-500" />
              {store.name}
            </p>
          </div>
          
          <div className="space-y-4">
            {terminals.map((t, idx) => (
              <button
                key={t.id}
                onClick={() => onSelect(t)}
                style={{ animationDelay: `${idx * 100}ms` }}
                className="w-full flex items-center justify-between p-6 bg-slate-50 hover:bg-emerald-600 hover:text-white rounded-[2rem] transition-all group border border-slate-100 hover:border-emerald-500 shadow-sm hover:shadow-xl hover:shadow-emerald-200 animate-in slide-in-from-bottom-4 fill-mode-both"
              >
                <div className="flex items-center gap-5">
                  <div className="w-12 h-12 bg-white text-slate-400 rounded-2xl flex items-center justify-center group-hover:text-emerald-600 transition-all group-hover:rotate-6 shadow-sm">
                    <Smartphone size={24} />
                  </div>
                  <div className="text-left">
                    <h4 className="font-black text-base uppercase tracking-tight leading-none mb-1.5">{t.name}</h4>
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] font-black opacity-40 uppercase tracking-widest">{t.code}</span>
                      <div className="w-1 h-1 rounded-full bg-slate-300" />
                      <span className="text-[10px] font-bold text-emerald-500 group-hover:text-emerald-200 uppercase tracking-widest">Available</span>
                    </div>
                  </div>
                </div>
                <div className="p-3 bg-white/10 rounded-full opacity-0 group-hover:opacity-100 -translate-x-4 group-hover:translate-x-0 transition-all duration-300">
                  <ArrowRight size={20} />
                </div>
              </button>
            ))}
          </div>

          <div className="mt-12 pt-8 border-t border-slate-50 flex flex-col items-center gap-4">
            <button 
              onClick={onClose}
              className="text-xs font-black text-slate-400 hover:text-slate-900 transition-colors uppercase tracking-[0.2em] flex items-center gap-2 group"
            >
              <RotateCcw size={14} className="group-hover:-rotate-90 transition-transform" />
              Change Branch Context
            </button>
            <p className="text-[10px] font-bold text-slate-300 uppercase tracking-widest max-w-xs mx-auto">
              Please select a physical counter terminal to continue to the POS interface.
            </p>
          </div>
        </div>

        <div className="mt-12 text-center">
          <button 
            onClick={() => navigate('/admin')}
            className="text-sm font-black text-slate-400 hover:text-slate-800 transition-all flex items-center justify-center gap-2 mx-auto group"
          >
            <ArrowLeft size={18} className="group-hover:-translate-x-1 transition-transform" />
            Back to Dashboard
          </button>
        </div>
      </div>
    </div>
  );
}


// --- TERMINAL MANAGEMENT MODAL ---
function TerminalManagementModal({ store, onClose }) {
  const [terminals, setTerminals] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [newTerminal, setNewTerminal] = useState({ name: '', code: '' });

  const fetchTerminals = async () => {
    try {
      setLoading(true);
      const { data } = await adminAPI.getTerminals({ storeId: store.id });
      if (data.success) {
        setTerminals(data.data);
      }
    } catch (err) {
      toast.error('Failed to load terminals');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTerminals();
  }, [store.id]);

  const handleCreate = async (e) => {
    e.preventDefault();
    try {
      setSaving(true);
      const { data } = await adminAPI.createTerminal({ ...newTerminal, storeId: store.id });
      if (data.success) {
        toast.success('Terminal created');
        setNewTerminal({ name: '', code: '' });
        fetchTerminals();
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to create terminal');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Are you sure you want to delete this terminal?')) return;
    try {
      const { data } = await adminAPI.deleteTerminal(id);
      if (data.success) {
        toast.success('Terminal deleted');
        fetchTerminals();
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'Delete failed');
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-300">
      <div className="bg-white w-full max-w-2xl rounded-[2.5rem] shadow-2xl overflow-hidden animate-in zoom-in-95 duration-300">
        <div className="px-8 py-6 bg-slate-50 border-b border-slate-100 flex items-center justify-between">
          <div>
            <h2 className="text-xl font-black text-slate-900">POS Terminals</h2>
            <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">{store.name} context</p>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-slate-200 rounded-xl transition-colors">
            <X size={20} className="text-slate-400" />
          </button>
        </div>

        <div className="p-8">
          {/* Create Form */}
          <form onSubmit={handleCreate} className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8 p-6 bg-emerald-50 rounded-3xl border border-emerald-100">
            <div className="sm:col-span-1">
              <label className="block text-[10px] font-black text-emerald-700 uppercase tracking-widest mb-1.5 ml-1">Counter Code</label>
              <input
                required
                type="text"
                placeholder="e.g. POS-01"
                className="w-full bg-white border-none rounded-xl px-4 py-2.5 text-sm font-bold shadow-sm focus:ring-2 focus:ring-emerald-500 outline-none"
                value={newTerminal.code}
                onChange={e => setNewTerminal({...newTerminal, code: e.target.value.toUpperCase()})}
              />
            </div>
            <div className="sm:col-span-1">
              <label className="block text-[10px] font-black text-emerald-700 uppercase tracking-widest mb-1.5 ml-1">Terminal Name</label>
              <input
                required
                type="text"
                placeholder="e.g. Main Desk"
                className="w-full bg-white border-none rounded-xl px-4 py-2.5 text-sm font-bold shadow-sm focus:ring-2 focus:ring-emerald-500 outline-none"
                value={newTerminal.name}
                onChange={e => setNewTerminal({...newTerminal, name: e.target.value})}
              />
            </div>
            <div className="sm:col-span-1 flex items-end">
              <button
                disabled={saving}
                className="w-full h-[42px] bg-emerald-600 text-white rounded-xl text-xs font-black uppercase tracking-widest hover:bg-emerald-700 transition-all disabled:opacity-50"
              >
                {saving ? 'Creating...' : 'Add Terminal'}
              </button>
            </div>
          </form>

          {/* Terminals List */}
          <div className="space-y-3 max-h-[400px] overflow-y-auto pr-2 custom-scrollbar">
            {loading ? (
              <div className="py-12 text-center">
                <Loader2 size={32} className="animate-spin text-slate-300 mx-auto mb-2" />
                <p className="text-sm font-bold text-slate-400">Loading terminals...</p>
              </div>
            ) : terminals.length > 0 ? (
              terminals.map(t => (
                <div key={t.id} className="group flex items-center justify-between p-4 bg-white border border-slate-100 rounded-2xl hover:border-emerald-200 hover:shadow-sm transition-all">
                  <div className="flex items-center gap-4">
                    <div className="p-2.5 bg-slate-50 text-slate-400 rounded-xl">
                      <Smartphone size={20} />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] font-black text-emerald-600 bg-emerald-50 px-1.5 rounded uppercase">{t.code}</span>
                        <h4 className="text-sm font-black text-slate-800">{t.name}</h4>
                      </div>
                      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-tighter mt-0.5">Created {new Date(t.createdAt).toLocaleDateString()}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <button 
                      onClick={() => handleDelete(t.id)}
                      className="p-2 text-slate-300 hover:text-red-500 hover:bg-red-50 rounded-lg transition-all"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                </div>
              ))
            ) : (
              <div className="py-12 text-center bg-slate-50 rounded-3xl border-2 border-dashed border-slate-200">
                <p className="text-sm font-bold text-slate-400">No terminals found for this branch.</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// --- SUSPENDED ORDERS VIEW ---
function SuspendedOrdersView({ orders, onResume, onDelete, onViewDetail, isLoading, onClose }) {
  if (isLoading) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center py-24 animate-in fade-in duration-500">
        <Loader2 size={48} className="text-amber-500 animate-spin mb-6" />
        <p className="text-lg font-black text-slate-400">Synchronizing suspended orders...</p>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col gap-8 animate-in slide-in-from-bottom-4 duration-500 pb-12">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-black text-slate-900 tracking-tight">Suspended Orders</h2>
          <p className="text-sm font-bold text-slate-400 uppercase tracking-widest mt-1 flex items-center gap-2">
            <Pause size={14} className="text-amber-500" />
            {orders.length} orders currently on hold across terminals
          </p>
        </div>
        <button 
          onClick={onClose}
          className="flex items-center gap-2 px-6 py-3 bg-white text-slate-900 rounded-2xl border border-slate-100 font-black text-xs uppercase tracking-widest hover:bg-slate-50 transition-all shadow-sm"
        >
          <ArrowLeft size={16} /> Back to POS
        </button>
      </div>

      {orders.length === 0 ? (
        <div className="flex-1 flex flex-col items-center justify-center py-20 bg-white rounded-[3rem] border-2 border-dashed border-slate-100">
          <div className="w-20 h-20 bg-slate-50 text-slate-200 rounded-[2rem] flex items-center justify-center mb-6">
            <Pause size={40} />
          </div>
          <h3 className="text-xl font-black text-slate-400 uppercase tracking-widest">No suspended orders</h3>
          <p className="text-slate-300 font-bold mt-2">Any sales you suspend will appear here for resumption.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 overflow-y-auto pr-2 custom-scrollbar">
          {orders.map((order, idx) => (
            <div 
              key={order.id} 
              style={{ animationDelay: `${idx * 50}ms` }}
              className="bg-white rounded-[2.5rem] border border-slate-100 shadow-sm hover:shadow-xl hover:shadow-amber-900/5 transition-all group overflow-hidden flex flex-col animate-in fade-in slide-in-from-bottom-4 fill-mode-both"
            >
              <div className="p-6 border-b border-slate-50 bg-slate-50/50 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-white text-amber-500 rounded-xl flex items-center justify-center shadow-sm border border-amber-100 font-black text-xs">
                    #{order.id.slice(-6).toUpperCase()}
                  </div>
                  <div>
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none">Suspended At</p>
                    <p className="text-xs font-black text-slate-700 mt-1">
                      {new Date(order.createdAt).toLocaleString('en-IN', { 
                        day: '2-digit', 
                        month: 'short', 
                        hour: '2-digit', 
                        minute: '2-digit',
                        hour12: true 
                      })}
                    </p>
                  </div>
                </div>
                <div className="px-3 py-1 bg-amber-100 text-amber-700 rounded-lg text-[9px] font-black uppercase tracking-widest border border-amber-200">
                  ON HOLD
                </div>
              </div>

              <div className="p-6 flex-1 space-y-4">
                <div className="flex items-start gap-4">
                  <div className="w-10 h-10 bg-emerald-50 text-emerald-600 rounded-xl flex items-center justify-center shrink-0">
                    <User size={20} />
                  </div>
                  <div className="min-w-0">
                    <h4 className="text-sm font-black text-slate-900 truncate">{order.customerName || 'Walk-in'}</h4>
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-0.5">{order.customerMobile || 'No contact provided'}</p>
                  </div>
                </div>

                <div 
                  onClick={() => onViewDetail(order)}
                  className="bg-slate-50 rounded-2xl p-4 space-y-2 cursor-pointer hover:bg-emerald-50 transition-colors group/card"
                >
                  <div className="flex justify-between items-center mb-3">
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
                      <ShoppingCart size={12} /> Cart Summary
                    </p>
                    <span className="text-[9px] font-black text-emerald-600 uppercase tracking-widest opacity-0 group-hover/card:opacity-100 transition-opacity">
                      View All Items
                    </span>
                  </div>
                  {order.items.slice(0, 3).map((item, i) => (
                    <div key={i} className="flex justify-between items-center text-[11px] font-bold text-slate-600">
                      <span className="truncate pr-4">{item.quantity}x {item.name}</span>
                      <span className="shrink-0">₹{(item.price * item.quantity).toFixed(2)}</span>
                    </div>
                  ))}
                  {order.items.length > 3 && (
                    <p className="text-[10px] font-black text-emerald-600 uppercase tracking-widest pt-1">
                      + {order.items.length - 3} more items...
                    </p>
                  )}
                </div>
              </div>

              <div className="p-6 bg-slate-50/30 border-t border-slate-50 flex items-center justify-between">
                <div>
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none">Total Value</p>
                  <p className="text-xl font-black text-slate-900 mt-1 tracking-tight">₹{order.totalAmount.toFixed(2)}</p>
                </div>
                <div className="flex items-center gap-2">
                  <button 
                    onClick={() => onDelete(order.id)}
                    className="p-3 text-slate-300 hover:text-rose-500 hover:bg-rose-50 rounded-xl transition-all"
                    title="Discard Order"
                  >
                    <Trash2 size={18} />
                  </button>
                  <button 
                    onClick={() => onResume(order)}
                    className="flex items-center gap-2 px-5 py-3 bg-emerald-600 text-white rounded-xl font-black text-[11px] uppercase tracking-widest hover:bg-emerald-700 transition-all shadow-lg shadow-emerald-200 active:scale-95"
                  >
                    Resume <ArrowRight size={14} strokeWidth={3} />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// --- SUSPENDED ORDER DETAIL VIEW ---
function SuspendedOrderDetailView({ order, onResume, onDelete, onBack }) {
  return (
    <div className="flex-1 flex flex-col gap-8 animate-in slide-in-from-right-4 duration-500 pb-12">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-6">
          <button 
            onClick={onBack}
            className="p-4 bg-white text-slate-400 hover:text-slate-900 rounded-2xl border border-slate-100 shadow-sm transition-all"
          >
            <ArrowLeft size={24} />
          </button>
          <div>
            <div className="flex items-center gap-3">
              <h2 className="text-3xl font-black text-slate-900 tracking-tight">Order #{order.id.slice(-6).toUpperCase()}</h2>
              <span className="px-3 py-1 bg-amber-100 text-amber-700 rounded-lg text-[10px] font-black uppercase tracking-widest border border-amber-200">
                SUSPENDED
              </span>
            </div>
            <p className="text-sm font-bold text-slate-400 uppercase tracking-widest mt-1">
              Held since {new Date(order.createdAt).toLocaleString()}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <button 
            onClick={() => onDelete(order.id)}
            className="flex items-center gap-2 px-6 py-4 bg-white text-rose-500 border border-rose-100 rounded-[2rem] font-black text-xs uppercase tracking-widest hover:bg-rose-50 transition-all shadow-sm"
          >
            <Trash2 size={18} /> Discard Sale
          </button>
          <button 
            onClick={() => onResume(order)}
            className="flex items-center gap-3 px-8 py-4 bg-emerald-600 text-white rounded-[2rem] font-black text-sm uppercase tracking-widest hover:bg-emerald-700 transition-all shadow-xl shadow-emerald-600/20 active:scale-95"
          >
            Resume Transaction <ArrowRight size={20} />
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 flex-1 overflow-hidden">
        {/* Left Column: Customer & Order Info */}
        <div className="lg:col-span-1 space-y-6">
          <div className="bg-white rounded-[3rem] p-8 border border-slate-100 shadow-sm space-y-8">
            <div>
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-4">Customer Details</p>
              <div className="flex items-center gap-4">
                <div className="w-14 h-14 bg-emerald-50 text-emerald-600 rounded-2xl flex items-center justify-center shadow-inner">
                  <User size={28} />
                </div>
                <div>
                  <h4 className="text-xl font-black text-slate-900">{order.customerName || 'Walk-in'}</h4>
                  <p className="text-xs font-bold text-slate-500">{order.customerMobile || 'No contact provided'}</p>
                </div>
              </div>
            </div>

            <div className="pt-8 border-t border-slate-50">
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-4">Terminal Context</p>
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-slate-50 p-4 rounded-2xl">
                  <p className="text-[9px] font-black text-slate-400 uppercase mb-1">Terminal</p>
                  <p className="text-xs font-black text-slate-900">{order.terminal?.name || 'Standard Desk'}</p>
                </div>
                <div className="bg-slate-50 p-4 rounded-2xl">
                  <p className="text-[9px] font-black text-slate-400 uppercase mb-1">Created By</p>
                  <p className="text-xs font-black text-slate-900">{order.user?.name || 'System'}</p>
                </div>
              </div>
            </div>

            <div className="pt-8 border-t border-slate-50 bg-emerald-600 -mx-8 -mb-8 p-8 rounded-b-[3rem] text-white">
              <div className="flex justify-between items-center">
                <div>
                  <p className="text-[10px] font-black opacity-60 uppercase tracking-widest">Total Transaction Value</p>
                  <p className="text-4xl font-black tracking-tighter mt-1">₹{order.totalAmount.toFixed(2)}</p>
                </div>
                <div className="w-14 h-14 bg-white/10 rounded-2xl flex items-center justify-center">
                  <Banknote size={28} />
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Right Column: Itemized List */}
        <div className="lg:col-span-2 flex flex-col bg-white rounded-[3rem] border border-slate-100 shadow-sm overflow-hidden">
          <div className="p-8 border-b border-slate-50 flex items-center justify-between">
            <h3 className="text-xl font-black text-slate-900 flex items-center gap-3">
              <ShoppingCart size={24} className="text-emerald-500" />
              Itemized Breakdown
            </h3>
            <span className="px-4 py-2 bg-slate-50 text-slate-600 rounded-xl text-xs font-black uppercase tracking-widest border border-slate-100">
              {order.items.length} Unique Items
            </span>
          </div>

          <div className="flex-1 overflow-y-auto p-8 custom-scrollbar">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-100">
                  <th className="pb-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Product Info</th>
                  <th className="pb-4 text-[10px] font-black text-slate-400 uppercase tracking-widest text-center">Price</th>
                  <th className="pb-4 text-[10px] font-black text-slate-400 uppercase tracking-widest text-center">Qty</th>
                  <th className="pb-4 text-[10px] font-black text-slate-400 uppercase tracking-widest text-right">Subtotal</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {order.items.map((item, i) => (
                  <tr key={i} className="group hover:bg-slate-50/50 transition-colors">
                    <td className="py-6">
                      <div className="flex items-center gap-4">
                        <div className="w-12 h-12 rounded-xl bg-slate-50 overflow-hidden border border-slate-100 group-hover:border-emerald-200 transition-all shrink-0">
                          {item.image ? (
                            <img src={item.image} alt={item.name} className="w-full h-full object-cover" />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center text-slate-300">
                              <ImageIcon size={20} />
                            </div>
                          )}
                        </div>
                        <div className="min-w-0">
                          <p className="text-sm font-black text-slate-800 truncate">{item.name}</p>
                          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-tighter mt-0.5">SKU: {item.productId.slice(-8).toUpperCase()}</p>
                        </div>
                      </div>
                    </td>
                    <td className="py-6 text-center">
                      <span className="text-sm font-black text-slate-600">₹{item.price.toFixed(2)}</span>
                    </td>
                    <td className="py-6 text-center">
                      <span className="px-3 py-1.5 bg-slate-50 rounded-lg text-xs font-black text-slate-900 border border-slate-100">
                        {item.quantity}
                      </span>
                    </td>
                    <td className="py-6 text-right">
                      <span className="text-sm font-black text-emerald-600">₹{(item.price * item.quantity).toFixed(2)}</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
