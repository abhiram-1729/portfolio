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
  Barcode
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { productsAPI, ordersAPI } from '../../services/api';
import adminAPI from '../../services/adminService';
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
  Printer
} from 'lucide-react';
import toast from 'react-hot-toast';
import { jsPDF } from 'jspdf';
import villagKartLogo from '../../assets/vk.png';
import BarcodeScannerOverlay from '../../components/BarcodeScannerOverlay';

export default function AdminPOS() {
  const navigate = useNavigate();
  const { user } = useUserStore();
  const { items, addItem, removeItem, updateQuantity, clearCart, totalAmount, customerName, setCustomerName, customerMobile, setCustomerMobile } = useCartStore();
  
  const [loading, setLoading] = useState(true);
  const [products, setProducts] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [isScanning, setIsScanning] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState('ALL');
  
  // Checkout States
  const [checkoutStep, setCheckoutStep] = useState('CART'); // 'CART', 'PAYMENT', 'SUCCESS'
  const [selectedPaymentMode, setSelectedPaymentMode] = useState(null);
  const [cashReceived, setCashReceived] = useState('');
  const [splitAmounts, setSplitAmounts] = useState({ cash: '', upi: '' });
  const [actionLoading, setActionLoading] = useState(false);
  const [lastOrder, setLastOrder] = useState(null);
  const [settings, setSettings] = useState(null);
  const [isDownloading, setIsDownloading] = useState(false);
  
  // Fetch Warehouse Products
  useEffect(() => {
    const fetchProducts = async () => {
      try {
        setLoading(true);
        const { data } = await productsAPI.getAll({ showAll: true });
        setProducts(data);
      } catch (err) {
        toast.error('Failed to load products');
      } finally {
        setLoading(false);
      }
    };

    const fetchSettings = async () => {
      try {
        const { data } = await adminAPI.getSettings();
        if (data?.success) setSettings(data.data);
      } catch (err) {
        console.warn('Failed to load settings');
      }
    };

    fetchProducts();
    fetchSettings();
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

    if (selectedPaymentMode === 'CASH_UPI') {
      const cash = parseFloat(splitAmounts.cash) || 0;
      const upi = parseFloat(splitAmounts.upi) || 0;
      if (Math.abs((cash + upi) - totalAmount) > 0.01) {
        return toast.error(`Total must equal ₹${totalAmount.toFixed(2)}`);
      }
    }

    setActionLoading(true);
    try {
      const { data: order } = await ordersAPI.createFromCart({
        mobile: customerMobile || undefined,
        customerName: customerName || undefined,
        items: items.map(i => ({ productId: i.productId, quantity: i.quantity })),
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
    const paymentLabel = order.paymentMode === 'CASH' ? 'Cash' : order.paymentMode === 'UPI' ? 'UPI' : order.paymentMode === 'CASH_UPI' ? 'Split (Cash+UPI)' : 'Card';
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
      pdf.text(`${itemGstAmt.toFixed(2)}`, colX.gst, y + 1);

      pdf.setTextColor(...grayText);
      pdf.setFontSize(7);
      pdf.text(`Rs.${mrpValue.toFixed(2)}`, colX.mrp, y + 1, { align: 'left' });

      const isItemFree = price === 0;
      pdf.setTextColor(...(isItemFree ? orangeAccent : emerald));
      pdf.setFontSize(isItemFree ? 7 : 8);
      pdf.setFont('helvetica', 'bold');
      pdf.text(isItemFree ? 'GIFT/FREE' : `Rs.${price.toFixed(2)}`, colX.price, y + 1);

      pdf.setTextColor(...darkText);
      pdf.setFontSize(9);
      pdf.text(isItemFree ? 'Rs.0.00' : `Rs.${amount.toFixed(2)}`, colX.amount, y + 1, { align: 'right' });

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
    pdf.text(`Rs.${subTotalMRP.toFixed(2)}`, colX.amount, rightY, { align: 'right' });
    rightY += 7;

    if (savings > 0) {
      pdf.setFillColor(255, 247, 237);
      pdf.roundedRect(totalsX - 3, rightY - 5, (pageWidth - margin) - totalsX + 6, 9, 1, 1, 'F');
      pdf.setTextColor(...orangeAccent);
      pdf.setFontSize(10);
      pdf.setFont('helvetica', 'bold');
      pdf.text('TOTAL SAVINGS', totalsX, rightY + 1.5);
      pdf.setFontSize(11);
      pdf.text(`- Rs.${savings.toFixed(2)}`, colX.amount, rightY + 1.5, { align: 'right' });
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
    pdf.text(`Rs.${(order.totalAmount - totalTax).toFixed(2)}`, colX.amount, rightY, { align: 'right' });
    rightY += 7;

    pdf.setTextColor(...grayText);
    pdf.setFont('helvetica', 'bold');
    pdf.text(`Total GST (Incl.)`, totalsX, rightY);
    pdf.setTextColor(...darkText);
    pdf.text(`Rs.${totalTax.toFixed(2)}`, colX.amount, rightY, { align: 'right' });
    rightY += 4;

    pdf.setDrawColor(...lightLine);
    pdf.line(totalsX, rightY, pageWidth - margin, rightY);
    rightY += 7;

    pdf.setFillColor(...emerald);
    pdf.roundedRect(totalsX - 3, rightY - 5, (pageWidth - margin) - totalsX + 6, 14, 2, 2, 'F');
    pdf.setTextColor(255, 255, 255);
    pdf.setFontSize(10);
    pdf.setFont('helvetica', 'bold');
    pdf.text('TOTAL', totalsX, rightY + 3);
    pdf.setFontSize(14);
    pdf.text(`Rs.${order.totalAmount?.toFixed(2)}`, colX.amount, rightY + 4, { align: 'right' });
    rightY += 15;

    // Payment Status Badge
    const badgeWidth = (totalsX - margin) - 15;
    pdf.setFillColor(236, 253, 245);
    pdf.roundedRect(margin, startY, badgeWidth, 18, 3, 3, 'F');
    pdf.setDrawColor(167, 243, 208);
    pdf.roundedRect(margin, startY, badgeWidth, 18, 3, 3, 'S');
    pdf.setTextColor(...emerald);
    pdf.setFontSize(10);
    pdf.setFont('helvetica', 'bold');
    pdf.text('PAYMENT STATUS', margin + badgeWidth / 2, startY + 7, { align: 'center' });
    pdf.setFontSize(11);
    pdf.text('PAID', margin + badgeWidth / 2, startY + 13, { align: 'center' });

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
              <span class="item-amt">${(item.price * item.quantity).toFixed(2)}</span>
            </div>
          `).join('')}
          
          <div class="divider"></div>
          
          <div class="total-row">
            <span>TOTAL AMOUNT</span>
            <span>Rs.${lastOrder.totalAmount.toFixed(2)}</span>
          </div>
          <div class="item-row" style="font-size: 9px; margin-top: 4px;">
            <span>Payment: ${lastOrder.paymentMode}</span>
            <span>Status: PAID</span>
          </div>

          ${savings > 0 ? `
            <div class="savings-box">
              YOU SAVED: Rs.${savings.toFixed(2)}
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

  return (
    <div className="flex flex-col h-full min-h-[calc(100vh-4rem)] animate-in fade-in duration-500 relative">
      {/* Page Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-4">
          <button 
            onClick={() => navigate(-1)}
            className="p-3 bg-white rounded-2xl border border-gray-100 text-gray-500 hover:text-emerald-600 transition-all shadow-sm"
          >
            <ArrowLeft size={20} />
          </button>
          <div>
            <h2 className="text-2xl font-black text-gray-900 tracking-tight leading-none mb-1">POS BILLING</h2>
            <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest flex items-center gap-2">
              <Zap size={12} className="text-emerald-500" />
              Instant Warehouse Direct Sales
            </p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-3 bg-white px-4 py-2 rounded-2xl border border-gray-100 shadow-sm lg:hidden">
            <div className="w-8 h-8 rounded-xl bg-emerald-600 flex items-center justify-center text-white shadow-lg shadow-emerald-600/20 relative">
              <ShoppingCart size={16} />
              {cartCount > 0 && (
                <span className="absolute -top-1.5 -right-1.5 w-4 h-4 bg-emerald-950 text-white text-[8px] font-black rounded-full flex items-center justify-center border border-emerald-500">
                  {cartCount}
                </span>
              )}
            </div>
            <div className="text-right">
              <p className="text-[9px] font-bold text-emerald-600 uppercase tracking-widest leading-none">Cart</p>
              <p className="text-lg font-black text-emerald-950 tracking-tighter">₹{totalAmount.toFixed(2)}</p>
            </div>
          </div>
        </div>
      </div>

      <div className="flex flex-1 gap-6 overflow-hidden">
        {/* Left Side: Product Selector */}
        <div className="flex-[3] flex flex-col gap-6 overflow-hidden">
          {/* Filters & Search */}
          <div className="bg-white p-4 rounded-[2rem] border border-gray-100 shadow-sm space-y-4">
            <div className="relative">
              <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" />
              <input 
                type="text"
                placeholder="Find products by name or barcode..."
                className="w-full bg-gray-50 border border-gray-100 rounded-2xl pl-12 pr-14 py-4 text-sm font-bold text-gray-900 outline-none focus:ring-2 focus:ring-emerald-500/10 transition-all"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
              <button 
                onClick={() => setIsScanning(true)}
                className="absolute right-4 top-1/2 -translate-y-1/2 p-2 bg-white rounded-lg border border-gray-200 text-gray-400 hover:text-emerald-600 hover:border-emerald-200 transition-all shadow-sm"
                title="Scan Barcode"
              >
                <Barcode size={18} />
              </button>
            </div>
            <div className="flex items-center gap-2 overflow-x-auto pb-2 [scrollbar-width:none]">
              {categories.map(cat => (
                <button
                  key={cat}
                  onClick={() => setSelectedCategory(cat)}
                  className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all border shrink-0 ${
                    selectedCategory === cat 
                    ? 'bg-emerald-600 text-white border-emerald-600 shadow-lg shadow-emerald-600/20' 
                    : 'bg-gray-50 text-gray-400 border-transparent hover:bg-gray-100'
                  }`}
                >
                  {cat}
                </button>
              ))}
            </div>
          </div>

          {/* Product Grid */}
          <div className="flex-1 overflow-y-auto pr-2 grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 2xl:grid-cols-6 gap-3 pb-20 lg:pb-6 scrollbar-thin scrollbar-thumb-gray-200">
            {loading ? (
              [...Array(12)].map((_, i) => (
                <div key={i} className="aspect-square bg-white rounded-[2rem] border border-gray-50 animate-pulse shadow-sm" />
              ))
            ) : filteredProducts.length === 0 ? (
              <div className="col-span-full py-20 text-center text-gray-400">
                <Package size={48} className="mx-auto mb-4 opacity-20" />
                <p className="font-black text-sm uppercase tracking-widest">No products found</p>
              </div>
            ) : (
              filteredProducts.map((product) => {
                const inCart = items.find(i => i.productId === product.id);
                return (
                  <div 
                    key={product.id}
                    onClick={() => addItem(product)}
                    className={`group relative bg-white rounded-3xl p-3 border transition-all cursor-pointer hover:shadow-xl hover:shadow-emerald-900/5 ${
                      inCart ? 'border-emerald-500 ring-4 ring-emerald-500/5' : 'border-gray-50'
                    }`}
                  >
                    {inCart && (
                      <div className="absolute top-4 right-4 w-6 h-6 bg-emerald-600 text-white rounded-full flex items-center justify-center text-[10px] font-black shadow-lg shadow-emerald-600/20 z-10">
                        {inCart.quantity}
                      </div>
                    )}
                    <div className="aspect-square rounded-2xl bg-gray-50 mb-3 overflow-hidden">
                      {product.image ? (
                        <img src={product.image} alt={product.name} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-gray-200">
                          <Package size={32} />
                        </div>
                      )}
                    </div>
                    <div className="space-y-1">
                      <div className="flex items-center justify-between">
                        <p className="text-[7px] font-black text-emerald-600 uppercase tracking-widest">{product.category?.name || 'General'}</p>
                        {product.barcode && (
                          <div className="flex items-center gap-0.5 px-1 bg-gray-100 rounded border border-gray-200">
                             <Barcode size={8} className="text-gray-500" />
                             <span className="text-[7px] font-black text-gray-500 uppercase tracking-tighter">{product.barcode}</span>
                          </div>
                        )}
                      </div>
                      <h4 className="text-[11px] font-black text-gray-900 leading-tight line-clamp-2 uppercase min-h-[1.75rem] mb-1">{product.name}</h4>
                      
                      <div className="flex items-center justify-between pt-1">
                        <div className="flex flex-col">
                            <span className="text-sm font-black text-emerald-950 tracking-tighter">₹{product.price}</span>
                            {product.mrp > product.price && (
                            <span className="text-[8px] font-medium text-rose-500 line-through">₹{product.mrp}</span>
                            )}
                        </div>

                        {inCart ? (
                           <div className="flex items-center gap-1 bg-emerald-50 p-1 rounded-xl border border-emerald-100 shadow-sm shadow-emerald-600/5">
                                <button 
                                    onClick={(e) => { e.stopPropagation(); updateQuantity(inCart.productId, inCart.quantity - 1); }}
                                    className="w-7 h-7 flex items-center justify-center bg-white rounded-lg text-emerald-600 hover:bg-rose-50 hover:text-rose-600 transition-all border border-emerald-100/50"
                                >
                                    <Minus size={12} strokeWidth={3} />
                                </button>
                                <span className="w-6 text-center text-xs font-black text-emerald-950">{inCart.quantity}</span>
                                <button 
                                    onClick={(e) => { e.stopPropagation(); updateQuantity(inCart.productId, inCart.quantity + 1); }}
                                    className="w-7 h-7 flex items-center justify-center bg-white rounded-lg text-emerald-600 hover:bg-emerald-50 transition-all border border-emerald-100/50"
                                >
                                    <Plus size={12} strokeWidth={3} />
                                </button>
                           </div>
                        ) : (
                          <div className="w-8 h-8 rounded-xl bg-gray-50 flex items-center justify-center text-gray-400 group-hover:bg-emerald-600 group-hover:text-white transition-all shadow-sm">
                            <Plus size={14} strokeWidth={3} />
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        <div className="flex-[1.5] hidden lg:flex flex-col bg-white rounded-[2.5rem] border border-gray-100 shadow-sm overflow-hidden animate-in slide-in-from-right duration-500">
          {checkoutStep === 'CART' && (
            <>
              {/* Header */}
              <div className="p-6 border-b border-emerald-50 flex items-center justify-between bg-emerald-50/20">
                  <div>
                      <h3 className="text-xl font-black text-emerald-950 tracking-tight flex items-center gap-2">
                          <Zap size={20} className="text-emerald-600" />
                          SUMMARY
                      </h3>
                      <p className="text-[9px] font-black text-emerald-600 uppercase tracking-[0.2em]">{cartCount} ITEM(S) IN BASKET</p>
                  </div>
                  <button 
                    onClick={clearCart}
                    className="p-2.5 text-rose-400 hover:text-rose-600 hover:bg-rose-50 rounded-xl transition-all"
                    title="Clear Cart"
                  >
                    <Trash2 size={18} />
                  </button>
              </div>

              {/* Customer Info */}
              <div className="px-6 py-4 border-b border-gray-50 space-y-3">
                <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1">
                        <label className="text-[8px] font-black text-gray-400 uppercase tracking-widest ml-1">Customer Name</label>
                        <input 
                            type="text"
                            placeholder="..."
                            className="w-full bg-gray-50 border border-transparent rounded-xl px-4 py-2.5 text-[10px] font-bold outline-none focus:bg-white focus:border-emerald-500/20"
                            value={customerName}
                            onChange={(e) => setCustomerName(e.target.value)}
                        />
                    </div>
                    <div className="space-y-1">
                        <label className="text-[8px] font-black text-gray-400 uppercase tracking-widest ml-1">Mobile Number</label>
                        <input 
                            type="tel"
                            placeholder="..."
                            className="w-full bg-gray-50 border border-transparent rounded-xl px-4 py-2.5 text-[10px] font-bold outline-none focus:bg-white focus:border-emerald-500/20"
                            value={customerMobile}
                            onChange={(e) => setCustomerMobile(e.target.value)}
                        />
                    </div>
                </div>
              </div>

              {/* Totals & Checkout */}
              <div className="p-6 bg-emerald-50/50 border-b border-emerald-100/50 space-y-4">
                <div className="space-y-2">
                  <div className="flex justify-between items-center px-1">
                    <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Subtotal</span>
                    <span className="text-xs font-black text-gray-700">₹{totalAmount.toFixed(2)}</span>
                  </div>
                  
                  {items.some(i => i.mrp > i.price) && (
                    <div className="bg-emerald-600 p-4 rounded-2xl shadow-xl shadow-emerald-500/10">
                       <div className="flex items-center justify-between text-white">
                          <div className="flex flex-col">
                            <span className="text-[7px] font-black opacity-80 uppercase tracking-widest">Savings</span>
                            <h3 className="font-black text-[10px] uppercase">Direct Discount</h3>
                          </div>
                          <span className="text-xl font-black tracking-tighter">
                            -₹{(items.reduce((sum, i) => sum + (i.mrp || i.price) * i.quantity, 0) - totalAmount).toFixed(2)}
                          </span>
                       </div>
                    </div>
                  )}
                  
                  <div className="flex justify-between items-center px-1 pt-2">
                    <span className="text-sm font-black text-emerald-950 uppercase tracking-wider">Total Amount</span>
                    <span className="text-3xl font-black text-emerald-950 tracking-tighter">₹{totalAmount.toFixed(2)}</span>
                  </div>
                </div>

                <button
                  onClick={handleCheckout}
                  disabled={items.length === 0}
                  className={`w-full font-black py-4 rounded-2xl active:scale-95 transition-all shadow-xl flex items-center justify-center gap-3 ${
                    items.length === 0 
                    ? 'bg-gray-200 text-gray-400 cursor-not-allowed' 
                    : 'bg-emerald-600 text-white shadow-emerald-600/20 hover:bg-emerald-700'
                  }`}
                >
                  Process Checkout
                  <ChevronRight size={18} />
                </button>
              </div>

              {/* Items List */}
              <div className="flex-1 overflow-y-auto px-6 py-4 space-y-3 scrollbar-thin scrollbar-thumb-emerald-100">
                {items.length === 0 ? (
                   <div className="h-full flex flex-col items-center justify-center text-center p-6 text-gray-300">
                      <ShoppingCart size={48} className="mb-4 opacity-20" />
                      <p className="text-[10px] font-black uppercase tracking-widest">Cart is empty</p>
                      <p className="text-[9px] font-bold opacity-60">Add products to begin billing</p>
                   </div>
                ) : (
                  items.map(item => (
                    <div key={item.productId} className="flex items-center justify-between p-3 bg-gray-50/50 rounded-2xl border border-gray-50 group hover:bg-white hover:border-emerald-100 transition-all">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-white rounded-xl overflow-hidden flex-shrink-0 border border-gray-100">
                          {item.image ? (
                            <img src={item.image} alt={item.name} className="w-full h-full object-cover" />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center text-gray-200"><Package size={14} /></div>
                          )}
                        </div>
                        <div>
                          <h4 className="text-[10px] font-black text-gray-900 uppercase tracking-tight leading-tight max-w-[120px] truncate">{item.name}</h4>
                          <span className="text-[9px] font-bold text-emerald-600">₹{item.price.toFixed(2)}</span>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                          <button 
                            onClick={() => updateQuantity(item.productId, item.quantity - 1)}
                            className="w-6 h-6 flex items-center justify-center bg-white rounded-lg border border-gray-100 text-gray-400 hover:text-rose-500"
                          >
                            <Minus size={10} strokeWidth={3} />
                          </button>
                          <span className="w-5 text-center text-[10px] font-black">{item.quantity}</span>
                          <button 
                            onClick={() => updateQuantity(item.productId, item.quantity + 1)}
                            className="w-6 h-6 flex items-center justify-center bg-white rounded-lg border border-gray-100 text-gray-400 hover:text-emerald-500"
                          >
                            <Plus size={10} strokeWidth={3} />
                          </button>
                        </div>
                        <div className="text-right min-w-[50px]">
                          <p className="text-[10px] font-black text-gray-950 tracking-tighter">₹{(item.price * item.quantity).toFixed(2)}</p>
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </>
          )}

          {checkoutStep === 'PAYMENT' && (
            <div className="flex flex-col h-full animate-in slide-in-from-right duration-300">
               <div className="p-6 border-b border-gray-100 flex items-center gap-4">
                  <button onClick={() => setCheckoutStep('CART')} className="p-2 rounded-xl bg-gray-50 text-gray-500 hover:text-emerald-600 transition-all">
                    <ChevronLeft size={20} />
                  </button>
                  <h3 className="text-xl font-black text-gray-900 tracking-tight">PAYMENT</h3>
               </div>

               <div className="p-6 border-b border-gray-100 bg-white z-10 shadow-sm">
                  <button
                    onClick={handlePayment}
                    disabled={actionLoading || !selectedPaymentMode}
                    className="w-full bg-emerald-600 text-white font-black py-5 rounded-[2rem] shadow-xl hover:bg-emerald-700 transition-all disabled:opacity-50 flex items-center justify-center gap-3"
                  >
                    {actionLoading ? <Loader2 className="animate-spin" /> : <CheckCircle size={20} />}
                    Complete Payment
                  </button>
               </div>

               <div className="flex-1 overflow-y-auto p-6 space-y-6">
                  <div className="bg-emerald-50 rounded-3xl p-6 text-center border border-emerald-100">
                    <p className="text-[10px] font-black text-emerald-600 uppercase tracking-widest mb-1">Payable Amount</p>
                    <p className="text-4xl font-black text-emerald-950 tracking-tighter">₹{totalAmount.toFixed(2)}</p>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    {[
                      { id: 'CASH', label: 'Cash', icon: Banknote, color: 'bg-emerald-600' },
                      { id: 'UPI', label: 'UPI', icon: Smartphone, color: 'bg-orange-600' },
                      { id: 'CARD', label: 'Card', icon: CreditCard, color: 'bg-sky-600' },
                      { id: 'CASH_UPI', label: 'Cash + UPI', icon: Banknote, color: 'bg-indigo-600' }
                    ].map(mode => (
                      <button
                        key={mode.id}
                        onClick={() => setSelectedPaymentMode(mode.id)}
                        className={`p-4 rounded-2xl border-2 transition-all flex flex-col items-center gap-2 ${
                          selectedPaymentMode === mode.id 
                          ? `border-${mode.color.split('-')[1]}-500 ${mode.color} text-white shadow-lg` 
                          : 'border-gray-100 bg-gray-50 text-gray-400 hover:border-gray-200'
                        }`}
                      >
                        <mode.icon size={24} />
                        <span className="text-[10px] font-black uppercase tracking-widest">{mode.label}</span>
                      </button>
                    ))}
                  </div>

                  {selectedPaymentMode === 'CASH' && (
                    <div className="space-y-3 animate-in fade-in slide-in-from-top-4">
                      <div className="bg-white border border-gray-100 rounded-2xl p-4 space-y-3">
                        <div>
                          <label className="text-[8px] font-black text-gray-400 uppercase tracking-widest ml-1">Received Cash</label>
                          <input 
                            type="number"
                            value={cashReceived}
                            onChange={(e) => setCashReceived(e.target.value)}
                            className="w-full text-xl font-black text-emerald-950 outline-none"
                            placeholder="0.00"
                          />
                        </div>
                        <div className="flex justify-between items-center pt-2 border-t border-gray-50">
                          <span className="text-[9px] font-black text-gray-400 uppercase tracking-widest">Change Due</span>
                          <span className="text-lg font-black text-orange-600">
                            ₹{Math.max(0, (parseFloat(cashReceived) || 0) - totalAmount).toFixed(2)}
                          </span>
                        </div>
                      </div>
                    </div>
                  )}

                  {selectedPaymentMode === 'CASH_UPI' && (
                    <div className="space-y-3 animate-in fade-in slide-in-from-top-4">
                      <div className="grid grid-cols-2 gap-3">
                        <div className="bg-white border border-gray-100 rounded-2xl p-4">
                          <label className="text-[8px] font-black text-gray-400 uppercase tracking-widest block mb-1">Cash</label>
                          <input 
                            type="number"
                            value={splitAmounts.cash}
                            onChange={(e) => {
                              const val = e.target.value;
                              const rem = Math.max(0, totalAmount - (parseFloat(val) || 0));
                              setSplitAmounts({ cash: val, upi: rem.toFixed(2) });
                            }}
                            className="w-full text-lg font-black text-emerald-950 outline-none"
                            placeholder="0.00"
                          />
                        </div>
                        <div className="bg-white border border-gray-100 rounded-2xl p-4">
                          <label className="text-[8px] font-black text-gray-400 uppercase tracking-widest block mb-1">UPI</label>
                          <input 
                            type="number"
                            value={splitAmounts.upi}
                            onChange={(e) => {
                              const val = e.target.value;
                              const rem = Math.max(0, totalAmount - (parseFloat(val) || 0));
                              setSplitAmounts({ upi: val, cash: rem.toFixed(2) });
                            }}
                            className="w-full text-lg font-black text-orange-600 outline-none"
                            placeholder="0.00"
                          />
                        </div>
                      </div>
                    </div>
                  )}
               </div>
            </div>
          )}

          {checkoutStep === 'SUCCESS' && lastOrder && (
            <div className="flex flex-col h-full animate-in zoom-in duration-500 bg-emerald-50/10">
               <div className="flex-1 overflow-y-auto p-8 flex flex-col items-center text-center space-y-6">
                  <div className="w-24 h-24 bg-emerald-600 rounded-full flex items-center justify-center text-white shadow-2xl shadow-emerald-600/30">
                    <CheckCircle size={48} strokeWidth={3} />
                  </div>
                  <div>
                    <h3 className="text-2xl font-black text-gray-900 uppercase tracking-tight">Sale Successful!</h3>
                    <p className="text-xs font-bold text-gray-400 mt-1">Order #VK-{getInvoiceNumber(lastOrder)}</p>
                  </div>

                  <div className="w-full space-y-4 pt-4">
                    <div className="bg-white rounded-3xl p-6 border border-emerald-100 shadow-sm space-y-4">
                      <div className="flex justify-between items-center">
                        <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Total Amount</span>
                        <span className="text-2xl font-black text-emerald-950">₹{lastOrder.totalAmount?.toFixed(2)}</span>
                      </div>
                      <div className="flex justify-between items-center pt-4 border-t border-gray-50">
                        <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Paid Via</span>
                        <span className="text-xs font-black text-gray-900 uppercase bg-emerald-50 px-3 py-1 rounded-lg border border-emerald-100">
                          {selectedPaymentMode}
                        </span>
                      </div>
                    </div>

                    <div className="grid grid-cols-3 gap-3">
                      <button onClick={resetPOS} className="w-full bg-white text-gray-900 font-black text-[10px] py-4 rounded-2xl border border-gray-200 hover:bg-gray-50 transition-all flex flex-col items-center justify-center gap-1">
                        <Home size={16} /> NEW
                      </button>
                      <button 
                         onClick={handleDownloadPDF} 
                         disabled={isDownloading}
                         className="w-full bg-white text-emerald-700 font-black text-[10px] py-4 rounded-2xl border border-emerald-100 hover:bg-emerald-50 transition-all flex flex-col items-center justify-center gap-1 disabled:opacity-50"
                      >
                        <Download size={16} /> PDF
                      </button>
                      <button 
                         onClick={handlePrintReceipt}
                         className="w-full bg-emerald-600 text-white font-black text-[10px] py-4 rounded-2xl hover:bg-emerald-700 transition-all shadow-lg shadow-emerald-600/20 flex flex-col items-center justify-center gap-1"
                      >
                        <Printer size={16} /> PRINT
                      </button>
                    </div>
                    <button 
                       onClick={() => navigate(`/admin/sales`)} 
                       className="w-full bg-gray-50 text-gray-400 font-black text-[10px] py-3 rounded-xl hover:text-emerald-600 transition-all uppercase tracking-widest"
                    >
                      View All History
                    </button>
                  </div>
               </div>
            </div>
          )}
        </div>
      </div>

      {/* Floating Summary Trigger (Mobile Only) */}
      {cartCount > 0 && (
        <div className="fixed bottom-10 left-1/2 -translate-x-1/2 z-40 w-full max-w-xs animate-slide-up lg:hidden">
            <button
                onClick={() => setIsCartOpen(true)}
                className="w-full bg-emerald-950 text-white font-black py-4 rounded-3xl shadow-2xl flex items-center justify-between px-6 hover:scale-[1.02] active:scale-95 transition-all group"
            >
                <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-xl bg-emerald-600 flex items-center justify-center">
                        <ShoppingCart size={16} />
                    </div>
                    <span className="text-[10px] uppercase tracking-[0.2em]">Show Summary</span>
                </div>
                <div className="flex items-center gap-2">
                    <span className="text-xs opacity-50 font-black tracking-widest">{cartCount} items</span>
                    <ChevronRight size={16} />
                </div>
            </button>
        </div>
      )}

      {/* Billing Summary Modal Overlay (Mobile Only) */}
      {isCartOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 lg:hidden">
          <div 
            className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm animate-fade-in" 
            onClick={() => setIsCartOpen(false)}
          />
          
          <div className="relative w-full max-w-md max-h-[90vh] flex flex-col animate-slide-up">
              {/* Cart Summary Card */}
              <div className="flex-1 overflow-hidden flex flex-col relative group">
                <div className="absolute inset-0 bg-gradient-to-br from-emerald-500/10 to-teal-600/10 rounded-[2.5rem] -z-10" />
                
                <div className="flex-1 bg-white backdrop-blur-2xl rounded-[2.5rem] border border-white shadow-2xl overflow-hidden flex flex-col">
                  {/* Modal Header */}
                  <div className="p-6 border-b border-emerald-50 flex items-center justify-between bg-emerald-50/20">
                    <div>
                      <h3 className="text-xl font-black text-emerald-950 tracking-tight flex items-center gap-2">
                        {checkoutStep === 'CART' ? <Zap size={20} className="text-emerald-600" /> : <CheckCircle size={20} className="text-emerald-600" />}
                        {checkoutStep === 'CART' ? 'BILLING SUMMARY' : checkoutStep === 'PAYMENT' ? 'PAYMENT' : 'SUCCESS'}
                      </h3>
                      <p className="text-[9px] font-black text-emerald-600 uppercase tracking-[0.2em]">
                        {checkoutStep === 'CART' ? `${cartCount} ITEM(S) IN BASKET` : checkoutStep === 'PAYMENT' ? 'Select Payment Mode' : 'Order Completed'}
                      </p>
                    </div>
                    <button 
                      onClick={() => {
                        if (checkoutStep === 'SUCCESS') resetPOS();
                        setIsCartOpen(false);
                      }}
                      className="p-2 bg-white rounded-full border border-gray-100 text-gray-400 hover:text-gray-900 shadow-sm"
                    >
                      <X size={20} />
                    </button>
                  </div>

                  {checkoutStep === 'CART' && (
                    <>
                      {/* Customer Info */}
                      <div className="px-6 py-4 border-b border-gray-50 space-y-3">
                        <div className="grid grid-cols-2 gap-3">
                            <div className="space-y-1">
                                <label className="text-[8px] font-black text-gray-400 uppercase tracking-widest ml-1">Customer Name</label>
                                <input 
                                    type="text"
                                    placeholder="..."
                                    className="w-full bg-gray-50 border border-transparent rounded-xl px-4 py-2.5 text-[10px] font-bold outline-none focus:bg-white focus:border-emerald-500/20"
                                    value={customerName}
                                    onChange={(e) => setCustomerName(e.target.value)}
                                />
                            </div>
                            <div className="space-y-1">
                                <label className="text-[8px] font-black text-gray-400 uppercase tracking-widest ml-1">Mobile Number</label>
                                <input 
                                    type="tel"
                                    placeholder="..."
                                    className="w-full bg-gray-50 border border-transparent rounded-xl px-4 py-2.5 text-[10px] font-bold outline-none focus:bg-white focus:border-emerald-500/20"
                                    value={customerMobile}
                                    onChange={(e) => setCustomerMobile(e.target.value)}
                                />
                            </div>
                        </div>
                      </div>

                      {/* Footer Stats & Checkout */}
                      <div className="p-6 bg-emerald-50/50 border-b border-emerald-100/50 space-y-4">
                        <div className="space-y-2">
                          <div className="flex justify-between items-center px-1">
                            <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Subtotal</span>
                            <span className="text-xs font-black text-gray-700">₹{totalAmount.toFixed(2)}</span>
                          </div>
                          
                          {items.some(i => i.mrp > i.price) && (
                            <div className="bg-emerald-600 p-4 rounded-2xl shadow-xl shadow-emerald-500/10">
                               <div className="flex items-center justify-between text-white">
                                  <div className="flex flex-col">
                                    <span className="text-[7px] font-black opacity-80 uppercase tracking-widest">Savings</span>
                                    <h3 className="font-black text-[10px] uppercase">Direct Discount</h3>
                                  </div>
                                  <span className="text-xl font-black tracking-tighter">
                                    -₹{(items.reduce((sum, i) => sum + (i.mrp || i.price) * i.quantity, 0) - totalAmount).toFixed(2)}
                                  </span>
                               </div>
                            </div>
                          )}
                          
                          <div className="flex justify-between items-center px-1 pt-2">
                            <span className="text-sm font-black text-emerald-950 uppercase tracking-wider">Total Amount</span>
                            <span className="text-3xl font-black text-emerald-950 tracking-tighter">₹{totalAmount.toFixed(2)}</span>
                          </div>
                        </div>

                        <button
                          onClick={handleCheckout}
                          className="w-full bg-emerald-600 text-white font-black py-4 rounded-2xl active:scale-95 transition-all shadow-xl shadow-emerald-600/20 flex items-center justify-center gap-3"
                        >
                          Process Checkout
                          <ChevronRight size={18} />
                        </button>
                      </div>

                      {/* Items List */}
                      <div className="flex-1 overflow-y-auto px-6 py-4 space-y-3 scrollbar-thin scrollbar-thumb-emerald-100">
                        {items.map(item => (
                          <div key={item.productId} className="flex items-center justify-between p-3 bg-gray-50/50 rounded-2xl border border-gray-50">
                            <div className="flex items-center gap-3">
                              <div className="w-10 h-10 bg-white rounded-xl overflow-hidden flex-shrink-0 border border-gray-100">
                                {item.image ? (
                                  <img src={item.image} alt={item.name} className="w-full h-full object-cover" />
                                ) : (
                                  <div className="w-full h-full flex items-center justify-center text-gray-200"><Package size={14} /></div>
                                )}
                              </div>
                              <div>
                                <h4 className="text-[10px] font-black text-gray-900 uppercase tracking-tight leading-tight max-w-[120px] truncate">{item.name}</h4>
                                <span className="text-[9px] font-bold text-emerald-600">₹{item.price.toFixed(2)}</span>
                              </div>
                            </div>
                            <div className="flex items-center gap-3">
                              <div className="flex items-center gap-1">
                                <button 
                                  onClick={() => updateQuantity(item.productId, item.quantity - 1)}
                                  className="w-6 h-6 flex items-center justify-center bg-white rounded-lg border border-gray-100 text-gray-400"
                                >
                                  <Minus size={10} strokeWidth={3} />
                                </button>
                                <span className="w-5 text-center text-[10px] font-black">{item.quantity}</span>
                                <button 
                                  onClick={() => updateQuantity(item.productId, item.quantity + 1)}
                                  className="w-6 h-6 flex items-center justify-center bg-white rounded-lg border border-gray-100 text-gray-400"
                                >
                                  <Plus size={10} strokeWidth={3} />
                                </button>
                              </div>
                              <div className="text-right min-w-[50px]">
                                <p className="text-[10px] font-black text-gray-950 tracking-tighter">₹{(item.price * item.quantity).toFixed(2)}</p>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </>
                  )}

                  {checkoutStep === 'PAYMENT' && (
                    <div className="flex flex-col h-full animate-in slide-in-from-right duration-300">
                      <div className="p-6 border-b border-gray-100 flex gap-3 bg-white z-10 shadow-sm">
                        <button onClick={() => setCheckoutStep('CART')} className="flex-1 bg-gray-100 text-gray-900 font-black py-4 rounded-2xl">
                          Back
                        </button>
                        <button
                          onClick={handlePayment}
                          disabled={actionLoading || !selectedPaymentMode}
                          className="flex-[2] bg-emerald-600 text-white font-black py-4 rounded-2xl shadow-xl disabled:opacity-50"
                        >
                          {actionLoading ? '...' : 'Pay Now'}
                        </button>
                      </div>

                      <div className="flex-1 overflow-y-auto p-6 space-y-6">
                        <div className="bg-emerald-50 rounded-3xl p-6 text-center border border-emerald-100">
                          <p className="text-[10px] font-black text-emerald-600 uppercase tracking-widest mb-1">Payable Amount</p>
                          <p className="text-3xl font-black text-emerald-950 tracking-tighter">₹{totalAmount.toFixed(2)}</p>
                        </div>

                        <div className="grid grid-cols-2 gap-3">
                          {[
                            { id: 'CASH', label: 'Cash', icon: Banknote, color: 'bg-emerald-600' },
                            { id: 'UPI', label: 'UPI', icon: Smartphone, color: 'bg-orange-600' },
                            { id: 'CARD', label: 'Card', icon: CreditCard, color: 'bg-sky-600' },
                            { id: 'CASH_UPI', label: 'Cash + UPI', icon: Banknote, color: 'bg-indigo-600' }
                          ].map(mode => (
                            <button
                              key={mode.id}
                              onClick={() => setSelectedPaymentMode(mode.id)}
                              className={`p-4 rounded-2xl border-2 transition-all flex flex-col items-center gap-2 ${
                                selectedPaymentMode === mode.id 
                                ? `border-${mode.color.split('-')[1]}-500 ${mode.color} text-white shadow-lg` 
                                : 'border-gray-100 bg-gray-50 text-gray-400 hover:border-gray-200'
                              }`}
                            >
                              <mode.icon size={20} />
                              <span className="text-[9px] font-black uppercase tracking-widest">{mode.label}</span>
                            </button>
                          ))}
                        </div>

                        {selectedPaymentMode === 'CASH' && (
                          <div className="space-y-3 animate-in fade-in slide-in-from-top-4">
                            <div className="bg-white border border-gray-100 rounded-2xl p-4">
                              <label className="text-[8px] font-black text-gray-400 uppercase tracking-widest block mb-1">Received Cash</label>
                              <input 
                                type="number"
                                value={cashReceived}
                                onChange={(e) => setCashReceived(e.target.value)}
                                className="w-full text-xl font-black text-emerald-950 outline-none"
                                placeholder="0.00"
                              />
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  {checkoutStep === 'SUCCESS' && lastOrder && (
                    <div className="flex flex-col items-center text-center p-8 space-y-6 animate-in zoom-in duration-500">
                      <div className="w-20 h-20 bg-emerald-600 rounded-full flex items-center justify-center text-white shadow-2xl shadow-emerald-600/30">
                        <CheckCircle size={40} strokeWidth={3} />
                      </div>
                      <div>
                        <h3 className="text-xl font-black text-gray-900 uppercase tracking-tight">Sale Successful!</h3>
                        <p className="text-[10px] font-bold text-gray-400 mt-1">Order #VK-{getInvoiceNumber(lastOrder)}</p>
                      </div>

                      <div className="w-full grid grid-cols-3 gap-3 pt-4">
                        <button 
                          onClick={handleDownloadPDF} 
                          disabled={isDownloading}
                          className="w-full bg-white text-emerald-700 font-black text-[10px] py-4 rounded-2xl border border-emerald-100 flex flex-col items-center justify-center gap-1 disabled:opacity-50"
                        >
                          <Download size={16} /> PDF
                        </button>
                        <button 
                          onClick={handlePrintReceipt}
                          className="w-full bg-white text-emerald-700 font-black text-[10px] py-4 rounded-2xl border border-emerald-100 flex flex-col items-center justify-center gap-1"
                        >
                          <Printer size={16} /> PRINT
                        </button>
                        <button 
                          onClick={() => { resetPOS(); setIsCartOpen(false); }} 
                          className="w-full bg-emerald-600 text-white font-black text-[10px] py-4 rounded-2xl shadow-lg shadow-emerald-600/20 flex flex-col items-center justify-center gap-1"
                        >
                          <CheckCircle size={16} /> DONE
                        </button>
                      </div>
                      <button 
                         onClick={() => { resetPOS(); setIsCartOpen(false); navigate('/admin/sales'); }} 
                         className="w-full bg-gray-50 text-gray-400 font-black text-[10px] py-3 rounded-xl uppercase tracking-widest"
                      >
                        View History
                      </button>
                    </div>
                  )}
                </div>
              </div>
          </div>
        </div>
      )}

      {isScanning && (
        <BarcodeScannerOverlay
          onClose={() => setIsScanning(false)}
          onScan={(code) => {
            setSearchTerm(code);
            toast.success("Barcode Scanned!");
          }}
        />
      )}
    </div>
  );
}
