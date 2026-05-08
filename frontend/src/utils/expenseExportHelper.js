import * as XLSX from 'xlsx';

export const exportExpensesToExcel = (expenses, fileName = 'Expense_Report.xlsx') => {
    // 1. Prepare Headers
    const headers = [
        "SL NO", "VOUCHER ID", "CATEGORY", "SUB CATEGORY", "BILL DATE", "PAID DATE", 
        "PAID TO", "BILL AMOUNT", "APPROVED BY", "CREATED BY", 
        "PAID AMT", "BALANCE", "MODE", "BILL", "STATUS", "REMARKS"
    ];

    // 2. Prepare Data Rows
    const dataRows = expenses.map((exp, index) => {
        const billAmount = parseFloat(exp.amount) || 0;
        
        let paidAmt = 0;
        if (exp.status === 'PAID') {
            const payInfo = exp.description?.match(/\[PAYMENT: (.*?) \| Paid: ₹([\d.]+) \| Bal: ₹([\d.]+)\]/);
            paidAmt = payInfo ? parseFloat(payInfo[2]) : billAmount;
        }
        
        const balance = billAmount - paidAmt;

        // Format dates correctly
        const billDate = exp.billDate ? new Date(exp.billDate).toLocaleDateString('en-GB') : '-';
        const paidDate = (exp.status === 'PAID' && exp.updatedAt) 
            ? new Date(exp.updatedAt).toLocaleDateString('en-GB') 
            : '-';

        // Extract and Clean Remarks (Only Agent side)
        let fullDescription = exp.description || '';
        fullDescription = fullDescription.replace(/\[(APPROVED|PAID|METADATA)_BY:.+?\]/g, '');
        fullDescription = fullDescription.replace(/\[METADATA:({.+?})\]/g, '');
        fullDescription = fullDescription.replace(/\[PAYMENT:(.+?)\]/g, '');
        
        const descParts = fullDescription.split(/\n\[\d{2}\/\d{2}\/\d{2}/);
        const agentRemarks = descParts[0].replace(/\[PERSONAL_CASH\]\s*/, '').trim() || '-';

        // Extract Approver Names
        let approvedBy = '-';
        const approvedMatch = (exp.description || '').match(/\[APPROVED_BY:(.+?)\]/);
        if (approvedMatch) approvedBy = approvedMatch[1].trim();

        // Extract Category and Sub-Category
        const typeParts = exp.type?.split(' | ') || [exp.type || '-', '-'];
        const mainCategory = typeParts[0];
        const subCategory = typeParts[1] || '-';

        return [
            index + 1,
            exp.displayId || '-',
            mainCategory,
            subCategory,
            billDate,
            paidDate,
            exp.paidTo || '-',
            billAmount,
            approvedBy,
            exp.user?.name || '-',
            paidAmt,
            balance,
            exp.paymentMode || '-',
            exp.billImage ? { t: 's', v: "View", l: { Target: exp.billImage, Tooltip: "Open Document" } } : '-',
            exp.status,
            agentRemarks
        ];
    });

    // 3. Combine
    const wsData = [headers, ...dataRows];

    // 4. Create Worksheet
    const ws = XLSX.utils.aoa_to_sheet(wsData);

    // 5. Set column widths
    ws['!cols'] = [
        { wch: 6 },  // SL NO
        { wch: 18 }, // VOUCHER ID
        { wch: 20 }, // CATEGORY
        { wch: 25 }, // SUB CATEGORY
        { wch: 12 }, // BILL DATE
        { wch: 12 }, // PAID DATE
        { wch: 20 }, // PAID TO
        { wch: 12 }, // BILL AMOUNT
        { wch: 18 }, // APPROVED BY
        { wch: 18 }, // CREATED BY
        { wch: 10 }, // PAID AMT
        { wch: 10 }, // BALANCE
        { wch: 10 }, // MODE
        { wch: 8 },  // BILL (View)
        { wch: 12 }, // STATUS
        { wch: 35 }, // REMARKS
    ];

    // 6. Export
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Expenses");
    XLSX.writeFile(wb, fileName);
};

