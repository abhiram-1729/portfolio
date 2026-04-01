import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ordersAPI } from '../services/api';
import { CheckCircle, Home, Share2, Smartphone, Banknote, CreditCard, Download } from 'lucide-react';
import toast from 'react-hot-toast';
import { jsPDF } from 'jspdf';
import villagKartLogo from '../assets/VillagKart_Logo.png';

export default function SuccessScreen() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [order, setOrder] = useState(null);
  const [isDownloading, setIsDownloading] = useState(false);

  const getInvoiceNumber = (o) => o?.orderNumber ? String(o.orderNumber) : String(o?.id).replace(/\D/g, '').slice(0, 6) || '000000';

  useEffect(() => {
    ordersAPI.getById(id)
      .then(({ data }) => setOrder(data))
      .catch(() => toast.error('Could not load order details'));
  }, [id]);

  const handleDownloadPDF = async () => {
    if (!order) return;
    try {
      setIsDownloading(true);
      const pdf = await generateInvoicePDF(order);
      if (!pdf) return;

      const invoiceNo = getInvoiceNumber(order);
      pdf.save(`VillagKart_Invoice_VK-${invoiceNo}.pdf`);
      toast.success('Invoice PDF downloaded!');
    } catch (error) {
      console.error('PDF generation error:', error);
      toast.error('Failed to generate PDF');
    } finally {
      setIsDownloading(false);
    }
  };

  // Convert image URL to base64 for jsPDF
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

  const generateInvoicePDF = async (order) => {
    if (!order) return null;

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
    pdf.setFillColor(...emerald);
    pdf.rect(0, 0, pageWidth, 42, 'F');

    // Logo
    const logoSize = 18;
    const logoX = margin;
    const logoY = 6;
    let textStartX = margin;
    if (logoBase64) {
      // White circle behind logo for contrast
      pdf.setFillColor(255, 255, 255);
      pdf.circle(logoX + logoSize / 2, logoY + logoSize / 2, logoSize / 2 + 1, 'F');
      pdf.addImage(logoBase64, 'PNG', logoX, logoY, logoSize, logoSize);
      textStartX = logoX + logoSize + 4;
    }

    // Company name
    pdf.setTextColor(255, 255, 255);
    pdf.setFontSize(24);
    pdf.setFont('helvetica', 'bold');
    // Default color (black)
    pdf.setTextColor(255, 255, 255);
    pdf.text('Villag', textStartX, 18);

    // Orange color for "Kart"
    pdf.setTextColor(239, 90, 6); // RGB for orange
    pdf.text('Kart', textStartX + pdf.getTextWidth('Villag'), 18);

    // Optional: reset color back to black
    pdf.setTextColor(255, 255, 255);

    // Tagline
    pdf.setFontSize(9);
    pdf.setFont('helvetica', 'normal');
    pdf.text('Shop any Time, Save Everytime', textStartX, 25);

    // Invoice label (right-aligned)
    pdf.setFontSize(28);
    pdf.setFont('helvetica', 'bold');
    pdf.text('INVOICE', pageWidth - margin, 20, { align: 'right' });

    pdf.setFontSize(9);
    pdf.setFont('helvetica', 'normal');
    pdf.text('Tax Invoice / Bill of Supply', pageWidth - margin, 27, { align: 'right' });

    // Orange accent strip
    pdf.setFillColor(...orangeAccent);
    pdf.rect(0, 42, pageWidth, 2, 'F');

    y = 55;

    // ══════════════════════════════════════
    // INVOICE META — Two columns
    // ══════════════════════════════════════
    const invoiceNo = getInvoiceNumber(order);
    const orderDate = new Date(order.createdAt);
    const dateStr = orderDate.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
    const timeStr = orderDate.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true });

    // Left column
    pdf.setTextColor(...grayText);
    pdf.setFontSize(8);
    pdf.setFont('helvetica', 'bold');
    pdf.text('INVOICE NUMBER', margin, y);
    pdf.setTextColor(...darkText);
    pdf.setFontSize(12);
    pdf.setFont('helvetica', 'bold');
    pdf.text(`#VK-${invoiceNo}`, margin, y + 6);

    pdf.setTextColor(...grayText);
    pdf.setFontSize(8);
    pdf.setFont('helvetica', 'bold');
    pdf.text('DATE & TIME', margin, y + 16);
    pdf.setTextColor(...darkText);
    pdf.setFontSize(10);
    pdf.setFont('helvetica', 'normal');
    pdf.text(`${dateStr}  |  ${timeStr}`, margin, y + 22);

    // Right column
    const paymentLabel = order.paymentMode === 'CASH' ? 'Cash' : order.paymentMode === 'UPI' ? 'UPI' : 'Card';
    pdf.setTextColor(...grayText);
    pdf.setFontSize(8);
    pdf.setFont('helvetica', 'bold');
    pdf.text('PAYMENT METHOD', pageWidth - margin, y, { align: 'right' });
    pdf.setTextColor(...darkText);
    pdf.setFontSize(12);
    pdf.setFont('helvetica', 'bold');
    pdf.text(paymentLabel, pageWidth - margin, y + 6, { align: 'right' });

    if (order.mobile) {
      pdf.setTextColor(...grayText);
      pdf.setFontSize(8);
      pdf.setFont('helvetica', 'bold');
      pdf.text('CUSTOMER MOBILE', pageWidth - margin, y + 16, { align: 'right' });
      pdf.setTextColor(...darkText);
      pdf.setFontSize(10);
      pdf.setFont('helvetica', 'normal');
      pdf.text(order.mobile, pageWidth - margin, y + 22, { align: 'right' });
    }

    y += 34;

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
      item: margin + 12,
      qty: margin + contentWidth * 0.45,
      mrp: margin + contentWidth * 0.58,
      price: margin + contentWidth * 0.72,
      amount: pageWidth - margin,
    };

    pdf.setFillColor(248, 250, 252);
    pdf.rect(margin, y - 4, contentWidth, 10, 'F');

    pdf.setTextColor(...grayText);
    pdf.setFontSize(7.5);
    pdf.setFont('helvetica', 'bold');
    pdf.text('S.NO', colX.sno, y + 2);
    pdf.text('ITEM DESCRIPTION', colX.item, y + 2);
    pdf.text('QTY', colX.qty, y + 2);
    pdf.text('MRP', colX.mrp, y + 2);
    pdf.text('OFFER', colX.price, y + 2);
    pdf.text('AMOUNT', colX.amount, y + 2, { align: 'right' });

    y += 10;

    const items = order.items || [];
    items.forEach((item, index) => {
      const itemName = item.product?.name || `Product ${item.productId?.slice(-6) || ''}`;
      const qty = item.quantity || 0;
      const price = item.price || 0;
      const mrpValue = item.mrp || price;
      const amount = qty * price;

      if (index % 2 === 0) {
        pdf.setFillColor(255, 255, 255);
      } else {
        pdf.setFillColor(249, 250, 251);
      }
      pdf.rect(margin, y - 4, contentWidth, 9, 'F');

      pdf.setTextColor(...darkText);
      pdf.setFontSize(9);
      pdf.setFont('helvetica', 'normal');
      pdf.text(`${index + 1}`, colX.sno, y + 1);

      const maxNameWidth = colX.qty - colX.item - 5;
      let displayName = itemName;
      while (pdf.getTextWidth(displayName) > maxNameWidth && displayName.length > 3) {
        displayName = displayName.slice(0, -4) + '...';
      }
      pdf.text(displayName, colX.item, y + 1);

      pdf.text(`${qty}`, colX.qty, y + 1);

      pdf.setTextColor(...grayText);
      pdf.setFontSize(7);
      pdf.text(`Rs.${mrpValue.toFixed(2)}`, colX.mrp, y + 1, { align: 'left' });

      pdf.setTextColor(...emerald);
      pdf.setFontSize(8);
      pdf.setFont('helvetica', 'bold');
      pdf.text(`Rs.${price.toFixed(2)}`, colX.price, y + 1);

      pdf.setTextColor(...darkText);
      pdf.setFontSize(9);
      pdf.text(`Rs.${amount.toFixed(2)}`, colX.amount, y + 1, { align: 'right' });

      y += 9;
    });

    if (items.length === 0) {
      pdf.setTextColor(...grayText);
      pdf.setFontSize(9);
      pdf.setFont('helvetica', 'italic');
      pdf.text('No itemized details available', margin + contentWidth / 2, y + 1, { align: 'center' });
      y += 9;
    }

    y += 2;

    pdf.setDrawColor(...emerald);
    pdf.setLineWidth(0.8);
    pdf.line(margin, y, pageWidth - margin, y);
    y += 8;

    // ══════════════════════════════════════
    // TOTALS & PAYMENT STATUS
    // ══════════════════════════════════════
    const totalsX = margin + contentWidth * 0.55;
    const startY = y;
    let rightY = startY;

    const subTotalMRP = order.items?.reduce((sum, i) => sum + (i.mrp || i.price) * i.quantity, 0) || order.totalAmount;
    const savings = subTotalMRP - order.totalAmount;

    pdf.setTextColor(...grayText);
    pdf.setFontSize(9);
    pdf.setFont('helvetica', 'normal');
    pdf.text('Subtotal (MRP)', totalsX, rightY);
    pdf.setTextColor(...darkText);
    pdf.text(`Rs.${subTotalMRP.toFixed(2)}`, colX.amount, rightY, { align: 'right' });
    rightY += 7;

    if (savings > 0) {
      pdf.setTextColor(...orangeAccent);
      pdf.text('Instant Savings', totalsX, rightY);
      pdf.text(`- Rs.${savings.toFixed(2)}`, colX.amount, rightY, { align: 'right' });
      rightY += 7;
    }

    pdf.setTextColor(...grayText);
    pdf.text('Tax (Inclusive)', totalsX, rightY);
    pdf.setTextColor(...darkText);
    pdf.text('Rs.0.00', colX.amount, rightY, { align: 'right' });
    rightY += 4;

    pdf.setDrawColor(...lightLine);
    pdf.setLineWidth(0.3);
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

    const badgeWidth = (totalsX - margin) - 15;
    pdf.setFillColor(236, 253, 245);
    pdf.roundedRect(margin, startY, badgeWidth, 18, 3, 3, 'F');
    pdf.setDrawColor(167, 243, 208);
    pdf.setLineWidth(0.5);
    pdf.roundedRect(margin, startY, badgeWidth, 18, 3, 3, 'S');

    pdf.setTextColor(...emerald);
    pdf.setFontSize(10);
    pdf.setFont('helvetica', 'bold');
    pdf.text('PAYMENT STATUS', margin + badgeWidth / 2, startY + 7, { align: 'center' });
    pdf.setFontSize(11);
    const paidStr = order.status === 'COMPLETED' ? 'PAID' : 'PAID';
    const pModeStr = order.paymentMode ? ` (${order.paymentMode})` : '';
    pdf.text(`${paidStr}${pModeStr}`, margin + badgeWidth / 2, startY + 13, { align: 'center' });

    y = Math.max(startY + 25, rightY + 5);

    // ══════════════════════════════════════
    // FOOTER
    // ══════════════════════════════════════
    pdf.setDrawColor(...lightLine);
    pdf.setLineWidth(0.3);
    pdf.line(margin, y, pageWidth - margin, y);
    y += 12;

    pdf.setTextColor(...emerald);
    pdf.setFontSize(14);
    pdf.setFont('helvetica', 'bold');
    pdf.text('Thanks for shopping in VillagKart', pageWidth / 2, y, { align: 'center' });
    y += 6;

    pdf.setTextColor(...grayText);
    pdf.setFontSize(7);
    pdf.setFont('helvetica', 'normal');
    pdf.text('This is a computer-generated invoice and does not require a signature.', pageWidth / 2, y, { align: 'center' });
    y += 4;
    pdf.text(`Generated on ${new Date().toLocaleString('en-IN')}`, pageWidth / 2, y, { align: 'center' });

    return pdf;
  };

  const handleShare = async () => {
    if (!order) return;

    const invoiceNo = getInvoiceNumber(order);
    const paymentLabel = order.paymentMode === 'CASH' ? 'Cash' : order.paymentMode === 'UPI' ? 'UPI' : 'Card';
    const text = `✅ Invoice #VK-${invoiceNo}\nAmount: ₹${order.totalAmount.toFixed(2)}\nPayment: ${paymentLabel}\n\nThank you for shopping with VillagKart! 🚐`;

    try {
      setIsDownloading(true);
      const pdf = await generateInvoicePDF(order);
      if (!pdf) return;

      const pdfBlob = pdf.output('blob');
      const file = new File([pdfBlob], `VillagKart_Invoice_VK-${invoiceNo}.pdf`, {
        type: 'application/pdf'
      });

      if (navigator.canShare && navigator.canShare({ files: [file] })) {
        await navigator.share({
          files: [file],
          title: 'VillagKart Invoice',
          text: text,
        });
      } else if (navigator.share) {
        // Fallback to text share and then download
        await navigator.share({ text });
        pdf.save(`VillagKart_Invoice_VK-${invoiceNo}.pdf`);
      } else {
        // Ultimate fallback
        await navigator.clipboard.writeText(text);
        pdf.save(`VillagKart_Invoice_VK-${invoiceNo}.pdf`);
        toast.success('Invoice copied & downloaded!');
      }
    } catch (error) {
      console.error('Share error:', error);
      // Fail gracefully
      toast.error('Could not share document');
      // Still allow text share if basic share works
      if (navigator.share) navigator.share({ text });
    } finally {
      setIsDownloading(false);
    }
  };

  const getPaymentIcon = (mode) => {
    switch (mode) {
      case 'CASH': return <Banknote size={16} className="text-emerald-600" />;
      case 'UPI': return <Smartphone size={16} className="text-orange-600" />;
      case 'CARD': return <CreditCard size={16} className="text-emerald-700" />;
      default: return null;
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-6 relative overflow-hidden">
      {/* Immersive Background Effects */}
      <div className="absolute top-0 left-0 w-full h-full overflow-hidden z-0 pointer-events-none">
        <div className="absolute top-[-10%] left-[-10%] w-[50vw] h-[50vw] rounded-full bg-emerald-500/10 blur-[100px] animate-pulse" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[40vw] h-[40vw] rounded-full bg-orange-500/10 blur-[80px]" />
      </div>

      <div className="z-10 max-w-sm w-full space-y-8 animate-slide-up">
        {/* Success Icon */}
        <div className="flex flex-col items-center justify-center">
          <div className="w-28 h-28 rounded-full bg-gradient-to-br from-emerald-400 to-emerald-600 flex items-center justify-center shadow-2xl shadow-emerald-500/30 mb-6 border-4 border-white relative">
            <CheckCircle size={56} className="text-white drop-shadow-md relative z-10" strokeWidth={2.5} />
            <div className="absolute inset-0 bg-white/20 blur-xl rounded-full scale-125 animate-pulse" />
          </div>
          <div className="text-center">
            <h1 className="text-3xl font-black text-emerald-950 tracking-tight">Payment Successful!</h1>
            <p className="text-emerald-600 font-bold uppercase tracking-widest text-[0.7rem] mt-2 opacity-60">Verified & Synchronized</p>
          </div>
        </div>

        {/* Order Details */}
        {order ? (
          <div className="glass rounded-[2.5rem] p-8 shadow-2xl shadow-emerald-900/5 border border-white/80 bg-white/70 space-y-6">
            <div className="flex justify-between items-center pb-4 border-b border-emerald-100/50">
              <span className="text-[10px] font-black text-emerald-800/40 uppercase tracking-widest">Transaction ID</span>
              <span className="font-mono font-black text-emerald-900 text-[0.9rem] bg-emerald-50 px-3 py-1 rounded-xl border border-emerald-100">#VK-{getInvoiceNumber(order)}</span>
            </div>

            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <span className="text-xs font-black text-emerald-800/40 uppercase tracking-widest">Order Amount</span>
                <span className="font-black text-3xl text-emerald-950 tracking-tighter">₹{order.totalAmount?.toFixed(2)}</span>
              </div>
              <div className="flex items-center justify-between p-3 bg-emerald-50/50 rounded-2xl border border-emerald-50">
                <span className="text-xs font-black text-emerald-800/50 uppercase tracking-widest ml-1">Payment</span>
                <div className="flex items-center gap-2 font-black text-emerald-900 bg-white border border-emerald-100 px-3 py-1.5 rounded-xl text-xs shadow-sm shadow-emerald-900/5">
                  {getPaymentIcon(order.paymentMode)}
                  <span className="capitalize">{order.paymentMode?.toLowerCase()}</span>
                </div>
              </div>
              {order.items?.some(i => i.mrp > i.price) && (
                <div className="flex justify-between items-center bg-orange-50/50 p-3 rounded-2xl border border-orange-100/50">
                  <span className="text-xs font-black text-orange-600 uppercase tracking-widest ml-1">Total Savings</span>
                  <span className="font-black text-lg text-orange-600 tracking-tight">₹{(order.items.reduce((sum, i) => sum + (i.mrp || i.price) * i.quantity, 0) - order.totalAmount).toFixed(2)}</span>
                </div>
              )}
              {order.mobile && (
                <div className="flex justify-between items-center px-1">
                  <span className="text-xs font-black text-emerald-800/40 uppercase tracking-widest">Customer</span>
                  <div className="flex items-center gap-2 font-black text-emerald-900">
                    <Smartphone size={16} className="text-emerald-400" />
                    <span>{order.mobile}</span>
                  </div>
                </div>
              )}
            </div>

            <div className="pt-4 border-t border-emerald-100/50 text-[10px] font-black text-emerald-800/30 text-center uppercase tracking-widest">
              {new Date(order.createdAt).toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' })}
            </div>
          </div>
        ) : (
          <div className="glass rounded-[2.5rem] p-12 flex justify-center bg-white/70 border border-white/80 shadow-xl shadow-emerald-900/5">
            <div className="w-10 h-10 rounded-full border-4 border-emerald-100 border-t-emerald-600 animate-spin" />
          </div>
        )}

        {/* Actions */}
        <div className="flex flex-col gap-4 pt-4">
          {order && (
            <div className="grid grid-cols-2 gap-4">
              <button
                onClick={handleShare}
                className="w-full bg-white text-emerald-700 font-black text-sm sm:text-lg py-4 rounded-[1.75rem] active:scale-[0.98] transition-all shadow-xl shadow-emerald-900/5 border border-emerald-100 hover:bg-emerald-50 flex items-center justify-center gap-2"
              >
                <Share2 size={20} strokeWidth={3} /> Share
              </button>
              <button
                onClick={handleDownloadPDF}
                disabled={isDownloading}
                className="w-full bg-white text-emerald-700 font-black text-sm sm:text-lg py-4 rounded-[1.75rem] active:scale-[0.98] transition-all shadow-xl shadow-emerald-900/5 border border-emerald-100 hover:bg-emerald-50 flex items-center justify-center gap-2 disabled:opacity-50 flex-col sm:flex-row"
              >
                <Download size={20} strokeWidth={3} /> {isDownloading ? 'Saving...' : 'PDF'}
              </button>
            </div>
          )}
          <button
            id="new-sale-btn"
            onClick={() => navigate('/')}
            className="w-full bg-emerald-600 text-white font-black text-lg py-5 rounded-[1.75rem] active:scale-[0.98] transition-all shadow-2xl shadow-emerald-600/30 flex items-center justify-center gap-3 relative overflow-hidden group"
          >
            <div className="absolute inset-0 bg-gradient-to-r from-orange-400 to-orange-600 opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
            <span className="relative z-10 flex items-center gap-3 uppercase text-xs tracking-[0.2em]">
              <Home size={18} strokeWidth={3} /> Process New Sale
            </span>
          </button>
        </div>
      </div>
    </div>
  );
}
