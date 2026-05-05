import * as XLSX from 'xlsx';

export const exportExpensesToExcel = (expenses, fileName = 'Expense_Report.xlsx') => {
    // 1. Prepare Headers
    const headerRow1 = [
        "SL NO", "NATURE OF EXPENSE", "VOUCHER NO", "BILL NO", 
        "BILL DATE", "PYMNT DATE", "AMOUNT PAYABLE", 
        "AMOUNT PAID", "", // Empty cell for Bank column header merge
        "BALANCE", "CLAIMED BY", "APPROVED BY", "PAID BY", "REMARKS", "DOCUMENT LINK"
    ];
    
    const headerRow2 = [
        "", "", "", "", "", "", "", 
        "Cash", "Bank", 
        "", "", "", "", "", ""
    ];

    // 2. Prepare Data Rows
    const dataRows = expenses.map((exp, index) => {
        const amountPayable = parseFloat(exp.amount) || 0;
        
        let cashPaid = 0;
        let bankPaid = 0;
        
        // Only count as "paid" if it actually is
        if (exp.status === 'PAID') {
             if (exp.paymentMode === 'CASH' || exp.paymentMode === 'PERSONAL_CASH') {
                 cashPaid = amountPayable;
             } else if (exp.paymentMode === 'UPI' || exp.paymentMode === 'BANK') {
                 bankPaid = amountPayable;
             }
        }
        
        const balance = amountPayable - (cashPaid + bankPaid);

        // Format dates correctly
        const billDate = exp.date ? new Date(exp.date).toLocaleDateString('en-GB') : '-';
        const pymntDate = (exp.status === 'PAID' && exp.updatedAt) 
            ? new Date(exp.updatedAt).toLocaleDateString('en-GB') 
            : '-';

        // Extract Metadata Tags
        let remarks = exp.description || '-';
        let approvedBy = '-';
        let paidBy = '-';

        const approvedMatch = remarks.match(/\[APPROVED_BY:(.+?)\]/);
        if (approvedMatch) {
            approvedBy = approvedMatch[1].trim();
            remarks = remarks.replace(/\[APPROVED_BY:(.+?)\]/g, '').trim();
        }

        const paidMatch = remarks.match(/\[PAID_BY:(.+?)\]/);
        if (paidMatch) {
            paidBy = paidMatch[1].trim();
            remarks = remarks.replace(/\[PAID_BY:(.+?)\]/g, '').trim();
        }
        
        // Clean up empty remarks after extracting
        if (!remarks || remarks === '') remarks = '-';

        return [
            index + 1,
            exp.type || '-',
            exp.displayId || '-',
            exp.vendorBillNumber || '-', 
            billDate,
            pymntDate,
            amountPayable,
            cashPaid,
            bankPaid,
            balance,
            exp.user?.name || '-', // CLAIMED BY
            approvedBy,            // APPROVED BY
            paidBy,                // PAID BY
            remarks,               // REMARKS
            exp.billImage ? { t: 's', v: "View Bill", l: { Target: exp.billImage, Tooltip: "Click to open document" } } : '-'
        ];
    });

    // 3. Combine all rows
    const wsData = [headerRow1, headerRow2, ...dataRows];

    // 4. Create Worksheet
    const ws = XLSX.utils.aoa_to_sheet(wsData);

    // 5. Apply Merges
    ws['!merges'] = [
        { s: { r: 0, c: 0 }, e: { r: 1, c: 0 } }, // SL NO
        { s: { r: 0, c: 1 }, e: { r: 1, c: 1 } }, // NATURE OF EXPENSE
        { s: { r: 0, c: 2 }, e: { r: 1, c: 2 } }, // VOUCHER NO
        { s: { r: 0, c: 3 }, e: { r: 1, c: 3 } }, // BILL NO
        { s: { r: 0, c: 4 }, e: { r: 1, c: 4 } }, // BILL DATE
        { s: { r: 0, c: 5 }, e: { r: 1, c: 5 } }, // PYMNT DATE
        { s: { r: 0, c: 6 }, e: { r: 1, c: 6 } }, // AMOUNT PAYABLE
        { s: { r: 0, c: 7 }, e: { r: 0, c: 8 } }, // AMOUNT PAID (Spans Cash & Bank)
        { s: { r: 0, c: 9 }, e: { r: 1, c: 9 } }, // BALANCE
        { s: { r: 0, c: 10 }, e: { r: 1, c: 10 } }, // CLAIMED BY
        { s: { r: 0, c: 11 }, e: { r: 1, c: 11 } }, // APPROVED BY
        { s: { r: 0, c: 12 }, e: { r: 1, c: 12 } }, // PAID BY
        { s: { r: 0, c: 13 }, e: { r: 1, c: 13 } }, // REMARKS
        { s: { r: 0, c: 14 }, e: { r: 1, c: 14 } }, // DOCUMENT LINK
    ];

    // 6. Set column widths for better readability
    ws['!cols'] = [
        { wch: 8 },  // SL NO
        { wch: 25 }, // NATURE OF EXPENSE
        { wch: 20 }, // VOUCHER NO
        { wch: 15 }, // BILL NO
        { wch: 15 }, // BILL DATE
        { wch: 15 }, // PYMNT DATE
        { wch: 18 }, // AMOUNT PAYABLE
        { wch: 15 }, // Cash
        { wch: 15 }, // Bank
        { wch: 15 }, // BALANCE
        { wch: 20 }, // CLAIMED BY
        { wch: 20 }, // APPROVED BY
        { wch: 20 }, // PAID BY
        { wch: 40 }, // REMARKS
        { wch: 15 }, // DOCUMENT LINK
    ];

    // 7. Create Workbook and Export
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Expenses");
    XLSX.writeFile(wb, fileName);
};
