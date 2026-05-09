import React, { useState, useEffect } from 'react';
import { TrendingUp, PieChart, Users, Loader2, BarChart3, Receipt, Download } from 'lucide-react';
import { getExpenseAnalytics, getAllExpenses } from '../../services/expenseService';
import { exportExpensesToExcel } from '../../utils/expenseExportHelper';
import { format, startOfMonth } from 'date-fns';
import toast from 'react-hot-toast';

export default function ExpenseAnalytics() {
    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [startDate, setStartDate] = useState(format(startOfMonth(new Date()), 'yyyy-MM-dd'));
    const [endDate, setEndDate] = useState(format(new Date(), 'yyyy-MM-dd'));
    const [exporting, setExporting] = useState(false);

    useEffect(() => { load(); }, [startDate, endDate]);

    const load = async () => {
        setLoading(true);
        try {
            const res = await getExpenseAnalytics({ startDate, endDate });
            setData(res);
        } catch { toast.error('Failed to load analytics'); }
        finally { setLoading(false); }
    };

    const handleExport = async () => {
        setExporting(true);
        try {
            const expenses = await getAllExpenses({ startDate, endDate });
            if (!expenses || expenses.length === 0) {
                toast.error('No expenses found for this date range');
                return;
            }
            exportExpensesToExcel(expenses, `Expenses_${startDate}_to_${endDate}.xlsx`);
            toast.success('Excel file exported successfully!');
        } catch (error) {
            console.error(error);
            toast.error('Failed to export data');
        } finally {
            setExporting(false);
        }
    };

    if (loading) return (
        <div className="flex items-center justify-center py-24">
            <Loader2 className="animate-spin text-emerald-600" size={36} />
        </div>
    );

    const maxCat = data?.byCategory?.[0]?.amount || 1;
    const maxAgent = data?.byAgent?.[0]?.amount || 1;

    const STATUS_COLORS = {
        PENDING: 'bg-orange-500', APPROVED: 'bg-emerald-500',
        PAID: 'bg-blue-500', REJECTED: 'bg-rose-500',
        VERIFIED: 'bg-purple-500', CLOSED: 'bg-gray-500'
    };

    return (
        <div className="space-y-6">
            {/* Date Range */}
            <div className="flex flex-wrap gap-3 items-center">
                <div className="flex items-center gap-2 bg-white border border-gray-100 rounded-2xl px-4 py-2.5 shadow-sm">
                    <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">From</span>
                    <input type="date" value={startDate} onChange={e => setStartDate(e.target.value)}
                        className="bg-transparent text-sm font-bold text-gray-700 outline-none" />
                </div>
                <div className="flex items-center gap-2 bg-white border border-gray-100 rounded-2xl px-4 py-2.5 shadow-sm">
                    <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">To</span>
                    <input type="date" value={endDate} onChange={e => setEndDate(e.target.value)}
                        className="bg-transparent text-sm font-bold text-gray-700 outline-none" />
                </div>
                
                <button 
                    onClick={handleExport}
                    disabled={exporting}
                    className="ml-auto flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white px-5 py-2.5 rounded-2xl font-bold text-sm transition-all shadow-lg shadow-emerald-600/20 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                    {exporting ? <Loader2 size={16} className="animate-spin" /> : <Download size={16} />}
                    {exporting ? 'Exporting...' : 'Export to Excel'}
                </button>
            </div>

            {/* Summary Cards */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {[
                    { label: 'Total Amount', value: `₹${(data?.totalAmount||0).toLocaleString()}`, color: 'text-gray-900', bg: 'bg-gray-50' },
                    { label: 'Pending', value: `₹${(data?.pendingAmount||0).toLocaleString()}`, color: 'text-orange-600', bg: 'bg-orange-50' },
                    { label: 'Approved/Paid', value: `₹${(data?.approvedAmount||0).toLocaleString()}`, color: 'text-emerald-600', bg: 'bg-emerald-50' },
                    { label: 'Total Entries', value: data?.totalCount || 0, color: 'text-blue-600', bg: 'bg-blue-50' },
                ].map(c => (
                    <div key={c.label} className={`${c.bg} rounded-2xl p-5 border border-white shadow-sm`}>
                        <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">{c.label}</p>
                        <p className={`text-xl font-black ${c.color}`}>{c.value}</p>
                    </div>
                ))}
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Category Breakdown */}
                <div className="bg-white rounded-3xl border border-gray-100 shadow-sm p-6 space-y-4">
                    <h3 className="text-sm font-black text-gray-900 flex items-center gap-2">
                        <PieChart size={16} className="text-emerald-500" /> Category Breakdown
                    </h3>
                    {data?.byCategory?.length === 0 ? (
                        <p className="text-center text-gray-300 text-xs py-8 font-bold">No data</p>
                    ) : data?.byCategory?.map(c => (
                        <div key={c.name} className="space-y-1">
                            <div className="flex justify-between text-xs font-black">
                                <span className="text-gray-700 uppercase tracking-tight">{c.name}</span>
                                <span className="text-gray-900">₹{c.amount.toLocaleString()}</span>
                            </div>
                            <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                                <div className="h-full bg-emerald-500 rounded-full transition-all"
                                    style={{ width: `${(c.amount / maxCat) * 100}%` }} />
                            </div>
                        </div>
                    ))}
                </div>

                {/* Agent Leaderboard */}
                <div className="bg-white rounded-3xl border border-gray-100 shadow-sm p-6 space-y-3">
                    <h3 className="text-sm font-black text-gray-900 flex items-center gap-2">
                        <Users size={16} className="text-blue-500" /> Agent Leaderboard
                    </h3>
                    {data?.byAgent?.slice(0, 8).map((a, i) => (
                        <div key={a.name} className="flex items-center gap-3">
                            <div className={`w-6 h-6 rounded-lg flex items-center justify-center text-[10px] font-black text-white ${i === 0 ? 'bg-amber-500' : i === 1 ? 'bg-gray-400' : 'bg-orange-400'}`}>
                                {i + 1}
                            </div>
                            <div className="flex-1 min-w-0">
                                <div className="flex justify-between text-xs font-black mb-0.5">
                                    <span className="text-gray-700 truncate">{a.name}</span>
                                    <span className="text-gray-900 ml-2">₹{a.amount.toLocaleString()}</span>
                                </div>
                                <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                                    <div className="h-full bg-blue-500 rounded-full"
                                        style={{ width: `${(a.amount / maxAgent) * 100}%` }} />
                                </div>
                            </div>
                        </div>
                    ))}
                </div>

                {/* Status Distribution */}
                <div className="bg-white rounded-3xl border border-gray-100 shadow-sm p-6 space-y-3">
                    <h3 className="text-sm font-black text-gray-900 flex items-center gap-2">
                        <BarChart3 size={16} className="text-purple-500" /> Status Distribution
                    </h3>
                    <div className="grid grid-cols-2 gap-3">
                        {data?.byStatus?.map(s => (
                            <div key={s.status} className="flex items-center gap-3 p-3 bg-gray-50 rounded-xl">
                                <div className={`w-3 h-3 rounded-full ${STATUS_COLORS[s.status] || 'bg-gray-400'}`} />
                                <div>
                                    <p className="text-[9px] font-black uppercase tracking-widest text-gray-400">{s.status}</p>
                                    <p className="text-sm font-black text-gray-900">{s.count}</p>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Payment Mode Split */}
                <div className="bg-white rounded-3xl border border-gray-100 shadow-sm p-6 space-y-3">
                    <h3 className="text-sm font-black text-gray-900 flex items-center gap-2">
                        <Receipt size={16} className="text-rose-500" /> Payment Mode Split
                    </h3>
                    {data?.byPaymentMode?.map(p => {
                        const total = data?.totalAmount || 1;
                        const pct = Math.round((p.amount / total) * 100);
                        return (
                            <div key={p.mode} className="space-y-1">
                                <div className="flex justify-between text-xs font-black">
                                    <span className="text-gray-700">{p.mode}</span>
                                    <span className="text-gray-500">{pct}% · ₹{p.amount.toLocaleString()}</span>
                                </div>
                                <div className="h-2.5 bg-gray-100 rounded-full overflow-hidden">
                                    <div className={`h-full rounded-full ${p.mode === 'CASH' ? 'bg-emerald-500' : p.mode === 'PERSONAL_CASH' ? 'bg-purple-500' : 'bg-blue-500'}`}
                                        style={{ width: `${pct}%` }} />
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>
        </div>
    );
}
