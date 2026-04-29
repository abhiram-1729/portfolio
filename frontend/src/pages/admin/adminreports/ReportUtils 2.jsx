import React from 'react';
import { format } from 'date-fns';
import jsPDF from 'jspdf';
import toast from 'react-hot-toast';

export const COLORS = ['#10b981', '#f97316', '#3b82f6', '#8b5cf6', '#ec4899', '#f59e0b'];

export const formatMinutesToHours = (totalMinutes) => {
    const absMinutes = Math.abs(totalMinutes);
    const h = Math.floor(absMinutes / 60);
    const m = absMinutes % 60;
    
    let parts = [];
    if (h > 0) parts.push(`${h} hour${h > 1 ? 's' : ''}`);
    if (m > 0) parts.push(`${m} minute${m > 1 ? 's' : ''}`);
    
    if (parts.length === 0) return "0 minutes";
    return parts.join(' and ');
};

export const StatCard = ({ label, value, icon: Icon, colorClass }) => (
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

export const generateReportPDF = (activeTab, reportData, shouldPrint = false) => {
    try {
      if (!reportData) { toast.error('No data to export'); return; }
      const doc = new jsPDF('p', 'mm', 'a4');
      const title = activeTab.toUpperCase().replace('-', ' ') + ' REPORT';
      const now = format(new Date(), 'PPP p');
      const pw = 210; const margin = 8;

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

      const drawTable = (headers, rows, colWidths) => {
        let y = 42; let pg = 1; drawHeader(pg);
        const totalW = colWidths.reduce((a, b) => a + b, 0);
        const xs = [margin]; colWidths.forEach((w, i) => { if (i < colWidths.length - 1) xs.push(xs[i] + w); });

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

        const pages = doc.internal.getNumberOfPages();
        for (let i = 1; i <= pages; i++) {
          doc.setPage(i); doc.setFontSize(6.5); doc.setTextColor(160, 160, 160);
          doc.text(`Page ${i} of ${pages}  |  VillagKart Enterprise Audit  |  ${now}`, pw / 2, 292, { align: 'center' });
        }
      };

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
          doc.addPage();
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
