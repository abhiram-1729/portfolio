import React from 'react';
import { format } from 'date-fns';
import jsPDF from 'jspdf';
import toast from 'react-hot-toast';
import * as XLSX from 'xlsx';

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
          drawTable(['DATE', 'INV ID', 'CUSTOMER', 'AGENT', 'AMOUNT', 'MODE', 'STATUS'],
            (Array.isArray(reportData) ? reportData : []).map(o => [
              safeDateShort(o.createdAt),
              safeStr(o.displayId || o.orderNumber, 15),
              safeStr(o.customerName || 'Walk-in', 20),
              safeStr(o.user?.name || o.userName, 20),
              `Rs ${safeNum(o.totalAmount)}`,
              safeStr(o.paymentMode, 10),
              safeStr(o.status, 10)
            ]),
            [25, 30, 35, 35, 30, 20, 19]);
          break;
        case 'users':
          drawTable(['NAME', 'ROLE', 'MOBILE', 'STORE', 'STATUS'],
            (Array.isArray(reportData) ? reportData : []).map(u => [
              safeStr(u.name, 30),
              safeStr(u.role, 20),
              safeStr(u.mobile, 15),
              safeStr(u.store?.name || 'Unassigned', 25),
              safeStr(u.status, 10)
            ]),
            [55, 40, 40, 45, 14]);
          break;
        case 'vehicles':
          drawTable(['NUMBER', 'NAME', 'STORE', 'DRIVER', 'STATUS'],
            (Array.isArray(reportData) ? reportData : []).map(v => [
              safeStr(v.vehicleNumber, 20),
              safeStr(v.vehicleName, 25),
              safeStr(v.store?.name || 'Unassigned', 25),
              safeStr(v.assignedUsers?.[0]?.name || 'Not Assigned', 30),
              v.status ? 'ACTIVE' : 'INACTIVE'
            ]),
            [40, 45, 45, 44, 20]);
          break;
        case 'villages':
          drawTable(['NAME', 'LATITUDE', 'LONGITUDE', 'RADIUS', 'TYPE'],
            (Array.isArray(reportData) ? reportData : []).map(v => [
              safeStr(v.name, 50),
              v.latitude || 'N/A',
              v.longitude || 'N/A',
              `${v.radius || 500}m`,
              v.isPolygon ? 'POLYGON' : 'CIRCLE'
            ]),
            [80, 30, 30, 24, 30]);
          break;
        case 'routes-list':
          drawTable(['ROUTE NAME', 'VILLAGES', 'STORES'],
            (Array.isArray(reportData) ? reportData : []).map(r => [
              safeStr(r.routeName, 50),
              safeStr(r.villages?.join(', '), 100),
              safeStr(r.store?.name || 'All', 44)
            ]),
            [60, 94, 40]);
          break;
        case 'assignments':
          drawTable(['AGENT', 'VEHICLE', 'ROUTE', 'DAYS/SESSIONS'],
            (Array.isArray(reportData) ? reportData : []).map(a => [
              safeStr(a.user?.name, 30),
              safeStr(a.vehicle?.vehicleNumber, 20),
              safeStr(a.route?.routeName, 40),
              safeStr(Object.entries(a.schedule || {}).filter(([_, s]) => s.morning || s.evening).map(([d]) => d.slice(0, 3)).join(', '), 100)
            ]),
            [50, 40, 50, 54]);
          break;
        case 'late-entries':
          drawTable(['EMPLOYEE', 'DATE', 'LATE MINS', 'PENALTY', 'WAIVED', 'REASON'],
            (Array.isArray(reportData) ? reportData : []).map(r => [
              safeStr(r.user?.name, 30),
              r.date || 'N/A',
              `${r.lateMinutes || 0}m`,
              `Rs ${safeNum(r.penaltyValue)}`,
              r.isWaived ? 'YES' : 'NO',
              safeStr(r.exception?.reason || r.waivedReason, 30)
            ]),
            [50, 30, 30, 30, 20, 34]);
          break;
        case 'cash-reconciliation':
          drawTable(['VEHICLE', 'AGENT', 'S1 OPEN', 'S1 CLOSE', 'S2 OPEN', 'S2 CLOSE'],
            (Array.isArray(reportData) ? reportData : []).map(s => [
              safeStr(s.vehicle?.vehicleNumber, 15),
              safeStr(s.vehicle?.assignedUsers?.find(u => u.role === 'SALES_AGENT')?.name || 'N/A', 20),
              `Rs ${safeNum(s.shiftDetails?.shift1?.opening?.totalOpeningCash)}`,
              `Rs ${safeNum(s.shiftDetails?.shift1?.closing?.actualCash)}`,
              `Rs ${safeNum(s.shiftDetails?.shift2?.opening?.totalOpeningCash)}`,
              `Rs ${safeNum(s.shiftDetails?.shift2?.closing?.actualCash)}`
            ]),
            [30, 44, 30, 30, 30, 30]);
          break;
        case 'asset-utilization':
          drawTable(['ASSET', 'TOTAL', 'ASSIGNED', 'FREE', 'DAMAGED', 'LOST'],
            (Array.isArray(reportData) ? reportData : []).map(r => [
              safeStr(r.name, 40),
              String(r.total || 0),
              String(r.assigned || 0),
              String(r.available || 0),
              String(r.damaged || 0),
              String(r.lost || 0)
            ]),
            [54, 28, 28, 28, 28, 28]);
          break;
        case 'finance-daily-sheet':
          drawTable(['VEHICLE', 'OPENING', 'SALES', 'EXPENSES', 'EXPECTED', 'ACTUAL'],
            (Array.isArray(reportData) ? reportData : []).map(row => [
              safeStr(row.vehicle?.vehicleNumber, 20),
              `Rs ${safeNum(row.openingCash)}`,
              `Rs ${safeNum(row.cashSales)}`,
              `Rs ${safeNum(row.expenses)}`,
              `Rs ${safeNum(row.expectedCash)}`,
              `Rs ${safeNum(row.actualCash)}`
            ]),
            [40, 31, 31, 31, 31, 31]);
          break;
        case 'agent-damage-reports':
          drawTable(['PRODUCT', 'TYPE', 'QTY', 'LOSS', 'STATUS', 'DATE'],
            (Array.isArray(reportData) ? reportData : []).map(r => [
              safeStr(r.product?.name, 25),
              safeStr(r.damageType, 15),
              safeNum(r.quantity),
              `Rs ${safeNum(r.totalLoss)}`,
              safeStr(r.status, 15),
              safeDateShort(r.createdAt)
            ]),
            [50, 30, 20, 34, 30, 30]);
          break;
        case 'attendance-logs':
          drawTable(['DATE', 'IN', 'OUT', 'HRS', 'STATUS', 'REMARK'],
            (Array.isArray(reportData) ? reportData : []).map(r => [
              safeDateShort(r.date),
              formatTime(r.punchInTime),
              formatTime(r.punchOutTime),
              r.totalHours ? `${r.totalHours}h` : '—',
              r.status,
              r.isLate ? `LATE (${r.lateMinutes}m)` : ''
            ]),
            [30, 35, 35, 24, 30, 40]);
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

export const exportReportToExcel = (activeTab, reportData) => {
    try {
      if (!reportData) { toast.error('No data to export'); return; }
      let exportData = [];
      let filename = `${activeTab}_Report_${format(new Date(), 'dd_MMM_yyyy')}`;

      const safeNum = (v) => v != null ? Number(v) : 0;
      const safeStr = (v) => String(v || 'N/A');

      switch (activeTab) {
        case 'overview': {
          exportData = (reportData.topProducts || []).map(p => ({
            'Product': p.name,
            'Quantity Sold': safeNum(p.totalQty),
            'Revenue': safeNum(p.totalRevenue),
            'Profit': safeNum(p.totalProfit)
          }));
          break;
        }
        case 'item-wise':
          exportData = (Array.isArray(reportData) ? reportData : []).map(r => ({
            'Item Name': r.itemName,
            'Quantity Sold': safeNum(r.totalQty),
            'Revenue': safeNum(r.revenue)
          }));
          break;
        case 'category-wise':
          exportData = (Array.isArray(reportData) ? reportData : []).map(r => ({
            'Category': r.name,
            'Orders': safeNum(r.orderCount),
            'Total Sales': safeNum(r.totalSales)
          }));
          break;
        case 'day-wise':
          exportData = (Array.isArray(reportData) ? reportData : []).map(r => ({
            'Date': r.date,
            'Orders': safeNum(r.orders),
            'Revenue': safeNum(r.revenue),
            'Profit': safeNum(r.profit)
          }));
          break;
        case 'route-village':
          // For Excel, we might want to export two sheets or just combine them. 
          // Let's export villages as it's more granular.
          exportData = (reportData.villages || []).map(v => ({
            'Village': v.villageName,
            'Session': v.coverageType,
            'Orders': safeNum(v.orderCount),
            'Sales': safeNum(v.totalSales)
          }));
          break;
        case 'agent-performance':
          exportData = (Array.isArray(reportData) ? reportData : []).map(a => ({
            'Agent': a.name,
            'Sales': safeNum(a.totalSales),
            'Target': safeNum(a.dailyTarget),
            'Achievement %': `${a.percentage || 0}%`
          }));
          break;
        case 'location-tracking':
          exportData = (Array.isArray(reportData) ? reportData : []).map(l => ({
            'Agent': l.user?.name,
            'Location': l.villageName || 'In-Transit',
            'Type': l.checkInType,
            'Time': l.createdAt ? format(new Date(l.createdAt), 'hh:mm a') : 'N/A',
            'Date': l.createdAt ? format(new Date(l.createdAt), 'PPP') : 'N/A'
          }));
          break;
        case 'vehicles':
          exportData = (Array.isArray(reportData) ? reportData : []).map(v => ({
            'Vehicle Number': v.vehicleNumber,
            'Model Name': v.vehicleName,
            'Store': v.store?.name || 'Unassigned',
            'Assigned Driver': v.assignedUsers?.[0]?.name || 'Not Assigned',
            'Status': v.status ? 'ACTIVE' : 'INACTIVE'
          }));
          break;
        case 'users':
          exportData = (Array.isArray(reportData) ? reportData : []).map(u => ({
            'Name': u.name,
            'Email': u.email,
            'Mobile': u.mobile,
            'Role': u.role,
            'Store': u.store?.name || 'Unassigned',
            'Status': u.status
          }));
          break;
        case 'villages':
          exportData = (Array.isArray(reportData) ? reportData : []).map(v => ({
            'Village Name': v.name,
            'Latitude': v.latitude,
            'Longitude': v.longitude,
            'Radius': v.radius,
            'Type': v.isPolygon ? 'POLYGON' : 'CIRCLE'
          }));
          break;
        case 'routes-list':
          exportData = (Array.isArray(reportData) ? reportData : []).map(r => ({
            'Route Name': r.routeName,
            'Villages': r.villages?.join(', '),
            'Store': r.store?.name || 'All Branches'
          }));
          break;
        case 'assignments':
          exportData = (Array.isArray(reportData) ? reportData : []).map(a => ({
            'Agent': a.user?.name,
            'Vehicle': a.vehicle?.vehicleNumber,
            'Route': a.route?.routeName,
            'Schedule': Object.entries(a.schedule || {}).filter(([_, s]) => s.morning || s.evening).map(([d]) => d).join(', ')
          }));
          break;
        case 'invoices':
          exportData = (Array.isArray(reportData) ? reportData : []).map(o => ({
            'Date': o.createdAt ? format(new Date(o.createdAt), 'dd-MM-yyyy HH:mm') : 'N/A',
            'Invoice ID': o.displayId || o.orderNumber,
            'Customer': o.customerName || 'Walk-in',
            'Mobile': o.mobile || 'N/A',
            'Agent': o.user?.name || o.userName,
            'Store': o.store?.name || 'N/A',
            'Amount': safeNum(o.totalAmount),
            'Payment Mode': o.paymentMode,
            'Status': o.status
          }));
          break;
        case 'late-entries':
          exportData = (Array.isArray(reportData) ? reportData : []).map(r => ({
            'Employee': r.user?.name,
            'Date': r.date,
            'Shift Start': r.shiftStart,
            'Check-in Time': r.checkinTime ? format(new Date(r.checkinTime), 'HH:mm') : 'N/A',
            'Late Minutes': r.lateMinutes,
            'Penalty Applied': r.penaltyApplied,
            'Penalty Value': r.penaltyValue,
            'Is Waived': r.isWaived ? 'Yes' : 'No',
            'Waiver Reason': r.exception?.reason || r.waivedReason
          }));
          break;
        case 'cash-reconciliation':
          exportData = (Array.isArray(reportData) ? reportData : []).map(s => ({
            'Vehicle': s.vehicle?.vehicleNumber,
            'Agent': s.vehicle?.assignedUsers?.find(u => u.role === 'SALES_AGENT')?.name || 'N/A',
            'S1 Opening': safeNum(s.shiftDetails?.shift1?.opening?.totalOpeningCash),
            'S1 Closing': safeNum(s.shiftDetails?.shift1?.closing?.actualCash),
            'S1 Status': s.shiftDetails?.shift1?.closing?.status || 'N/A',
            'S2 Opening': safeNum(s.shiftDetails?.shift2?.opening?.totalOpeningCash),
            'S2 Closing': safeNum(s.shiftDetails?.shift2?.closing?.actualCash),
            'S2 Status': s.shiftDetails?.shift2?.closing?.status || 'N/A',
            'Date': s.date
          }));
          break;
        case 'asset-utilization':
          exportData = (Array.isArray(reportData) ? reportData : []).map(r => ({
            'Asset Name': r.name,
            'Model': r.model || 'N/A',
            'Brand': r.brand || 'N/A',
            'Total Units': r.total,
            'Assigned': r.assigned,
            'Available': r.available,
            'Damaged': r.damaged,
            'Lost': r.lost,
            'Cost per Unit': r.estimatedCost
          }));
          break;
        case 'asset-executive-report':
          exportData = [];
          (Array.isArray(reportData) ? reportData : []).forEach(er => {
            er.assets.forEach(a => {
              exportData.push({
                'Executive': er.user?.name,
                'Asset Name': a.assetName,
                'Model': a.model || 'N/A',
                'Serial Number': a.serialNumber || 'N/A',
                'Condition': a.condition,
                'Assigned Date': a.assignedDate ? format(new Date(a.assignedDate), 'dd-MM-yyyy') : 'N/A'
              });
            });
          });
          break;
        case 'finance-daily-sheet':
          exportData = (Array.isArray(reportData) ? reportData : []).map(row => ({
            'Vehicle': row.vehicle?.vehicleNumber,
            'Opening Cash': safeNum(row.openingCash),
            'Cash Sales': safeNum(row.cashSales),
            'Expenses': safeNum(row.expenses),
            'Expected Cash': safeNum(row.expectedCash),
            'Actual Cash': safeNum(row.actualCash),
            'Difference': safeNum(row.actualCash - row.expectedCash),
            'Status': row.status,
            'Date': row.date || format(new Date(), 'dd-MM-yyyy')
          }));
          break;
        case 'agent-damage-reports':
          exportData = (Array.isArray(reportData) ? reportData : []).map(r => ({
            'Report ID': r.displayId,
            'Product': r.product?.name,
            'Type': r.damageType,
            'Quantity': safeNum(r.quantity),
            'Estimated Loss': safeNum(r.totalLoss),
            'Status': r.status,
            'Reason': r.reason,
            'Responsibility': r.selfResponsibility,
            'Date': r.createdAt ? format(new Date(r.createdAt), 'dd-MM-yyyy HH:mm') : 'N/A'
          }));
          break;
        case 'attendance-logs':
          exportData = (Array.isArray(reportData) ? reportData : []).map(r => ({
            'Date': r.date,
            'Punch In': r.punchInTime ? format(new Date(r.punchInTime), 'HH:mm') : 'N/A',
            'Punch Out': r.punchOutTime ? format(new Date(r.punchOutTime), 'HH:mm') : 'N/A',
            'Hours': r.totalHours || 0,
            'Status': r.status,
            'Late': r.isLate ? 'Yes' : 'No',
            'Late Minutes': r.lateMinutes || 0
          }));
          break;
        default:
          toast.error('Excel export not available for this report'); return;
      }

      const ws = XLSX.utils.json_to_sheet(exportData);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, "Report");
      XLSX.writeFile(wb, `${filename}.xlsx`);
      toast.success('Excel exported successfully');
    } catch (err) {
      console.error('Excel export error:', err);
      toast.error('Failed to export Excel');
    }
};
