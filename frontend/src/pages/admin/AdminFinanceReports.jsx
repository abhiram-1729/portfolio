import React, { useState, useEffect } from 'react';
import { 
    BarChart3, 
    PieChart, 
    TrendingUp, 
    ArrowUpRight, 
    ArrowDownRight, 
    Calendar, 
    Truck, 
    Receipt, 
    Coins,
    Loader2,
    Download
} from 'lucide-react';
import adminAPI from '../../services/adminService';
import { format } from 'date-fns';
import toast from 'react-hot-toast';

export default function AdminFinanceReports() {
    const [loading, setLoading] = useState(true);
    const [date, setDate] = useState(format(new Date(), 'yyyy-MM-dd'));
    const [data, setData] = useState(null);

    useEffect(() => {
        loadData();
    }, [date]);

    const loadData = async () => {
        setLoading(true);
        try {
            const res = await adminAPI.getFinancialReport({ date });
            setData(res);
        } catch (err) {
            toast.error('Failed to load financial data');
        } finally {
            setLoading(false);
        }
    };

    if (loading && !data) {
        return (
            <div className="min-h-[60vh] flex items-center justify-center">
                <Loader2 className="animate-spin text-emerald-600" size={40} />
            </div>
        );
    }

    const totalSales = data?.profitability?.reduce((sum, item) => sum + item.totalSales, 0) || 0;
    const totalExpenses = data?.profitability?.reduce((sum, item) => sum + item.totalExpenses, 0) || 0;
    const netProfit = totalSales - totalExpenses;

    return (
        <div className="space-y-8 animate-in fade-in duration-500">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="flex flex-col gap-1">
                    <h2 className="text-2xl font-bold text-gray-900">Financial Reports</h2>
                    <p className="text-sm text-gray-500">Comprehensive overview of revenue, expenses and profitability</p>
                </div>

                <div className="flex items-center gap-3">
                    <div className="flex items-center gap-3 bg-white p-2 rounded-2xl border border-gray-100 shadow-sm">
                        <Calendar size={18} className="text-emerald-500 ml-2" />
                        <input 
                            type="date" 
                            value={date}
                            onChange={(e) => setDate(e.target.value)}
                            className="bg-transparent border-none focus:outline-none text-sm font-bold text-gray-700 pr-2"
                        />
                    </div>
                </div>
            </div>

            {/* Top Stats */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="bg-white p-6 rounded-[2.5rem] border border-gray-100 shadow-sm space-y-4">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-emerald-50 rounded-xl flex items-center justify-center text-emerald-600">
                            <ArrowUpRight size={20} />
                        </div>
                        <span className="text-[10px] font-black uppercase tracking-widest text-gray-400">Total Cash Sales</span>
                    </div>
                    <h3 className="text-3xl font-black text-gray-900">₹{totalSales.toLocaleString()}</h3>
                </div>

                <div className="bg-white p-6 rounded-[2.5rem] border border-gray-100 shadow-sm space-y-4">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-rose-50 rounded-xl flex items-center justify-center text-rose-600">
                            <ArrowDownRight size={20} />
                        </div>
                        <span className="text-[10px] font-black uppercase tracking-widest text-gray-400">Total Expenses</span>
                    </div>
                    <h3 className="text-3xl font-black text-gray-900">₹{totalExpenses.toLocaleString()}</h3>
                </div>

                <div className="bg-slate-900 p-6 rounded-[2.5rem] shadow-xl shadow-slate-200 space-y-4 relative overflow-hidden">
                    <div className="absolute top-0 right-0 p-8 opacity-10">
                        <TrendingUp size={80} className="text-emerald-400" />
                    </div>
                    <div className="flex items-center gap-3 relative z-10">
                        <div className="w-10 h-10 bg-emerald-500/20 rounded-xl flex items-center justify-center text-emerald-400">
                            <BarChart3 size={20} />
                        </div>
                        <span className="text-[10px] font-black uppercase tracking-widest text-white/50">Net Daily Profit</span>
                    </div>
                    <h3 className="text-3xl font-black text-white relative z-10">₹{netProfit.toLocaleString()}</h3>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                {/* Category Breakdown */}
                <div className="bg-white rounded-[2.5rem] border border-gray-100 shadow-sm overflow-hidden">
                    <div className="px-8 py-6 border-b border-gray-50 flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <PieChart className="text-indigo-500" size={20} />
                            <h3 className="font-black text-gray-900 uppercase tracking-tight">Expense Breakdown</h3>
                        </div>
                    </div>
                    <div className="p-8 space-y-4">
                        {data?.expenseBreakdown?.length === 0 ? (
                            <div className="py-10 text-center text-gray-400 font-bold italic">No expenses recorded for this date</div>
                        ) : (
                            data?.expenseBreakdown?.map((item, i) => (
                                <div key={i} className="flex items-center gap-4">
                                    <div className="text-xs font-black text-gray-400 w-24 truncate uppercase">{item.type}</div>
                                    <div className="flex-1 h-3 bg-gray-50 rounded-full overflow-hidden">
                                        <div 
                                            className="h-full bg-rose-500 rounded-full" 
                                            style={{ width: `${totalExpenses > 0 ? (item._sum.amount / totalExpenses) * 100 : 0}%` }}
                                        ></div>
                                    </div>
                                    <div className="text-sm font-black text-gray-900">₹{item._sum.amount.toLocaleString()}</div>
                                </div>
                            ))
                        )}
                    </div>
                </div>

                {/* Vehicle Profitability */}
                <div className="bg-white rounded-[2.5rem] border border-gray-100 shadow-sm overflow-hidden">
                    <div className="px-8 py-6 border-b border-gray-50 flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <Truck className="text-emerald-500" size={20} />
                            <h3 className="font-black text-gray-900 uppercase tracking-tight">Vehicle-wise Performance</h3>
                        </div>
                    </div>
                    <div className="p-8">
                        <div className="space-y-6">
                            {data?.profitability?.map((item, i) => (
                                <div key={i} className="flex items-center justify-between p-4 bg-slate-50 rounded-2xl">
                                    <div className="flex items-center gap-3">
                                        <div className="w-10 h-10 bg-white rounded-xl shadow-sm flex items-center justify-center font-black text-xs text-slate-400">
                                            {item.vehicleNumber}
                                        </div>
                                        <div>
                                            <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Revenue</p>
                                            <p className="text-sm font-black text-gray-900">₹{item.totalSales.toLocaleString()}</p>
                                        </div>
                                    </div>
                                    <div className="text-right">
                                        <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Net Contribution</p>
                                        <p className={`text-sm font-black ${item.profit >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                                            {item.profit >= 0 ? '+' : ''}₹{item.profit.toLocaleString()}
                                        </p>
                                    </div>
                                </div>
                            ))}
                            {data?.profitability?.length === 0 && (
                                <div className="py-10 text-center text-gray-400 font-bold italic">No vehicle activity today</div>
                            )}
                        </div>
                    </div>
                </div>
            </div>
            
            {/* Daily Cash Sheet (Simplified) */}
            <div className="bg-white rounded-[2.5rem] border border-gray-100 shadow-sm overflow-hidden">
                <div className="px-8 py-6 border-b border-gray-50 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <Coins className="text-amber-500" size={20} />
                        <h3 className="font-black text-gray-900 uppercase tracking-tight">Daily Cash Sheet</h3>
                    </div>
                    <button className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-emerald-600 hover:text-emerald-700">
                        <Download size={14} /> Export PDF
                    </button>
                </div>
                <div className="overflow-x-auto">
                    <table className="w-full text-left">
                        <thead>
                            <tr className="bg-gray-50/50">
                                <th className="px-8 py-4 text-[10px] font-black uppercase tracking-widest text-gray-400">Vehicle</th>
                                <th className="px-8 py-4 text-[10px] font-black uppercase tracking-widest text-gray-400">Opening</th>
                                <th className="px-8 py-4 text-[10px] font-black uppercase tracking-widest text-emerald-600">Sales (+)</th>
                                <th className="px-8 py-4 text-[10px] font-black uppercase tracking-widest text-rose-600">Expenses (-)</th>
                                <th className="px-8 py-4 text-[10px] font-black uppercase tracking-widest text-gray-900">Expected</th>
                                <th className="px-8 py-4 text-[10px] font-black uppercase tracking-widest text-slate-800">Actual</th>
                                <th className="px-8 py-4 text-[10px] font-black uppercase tracking-widest text-gray-400">Status</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-50">
                            {data?.dailySheet?.map((row, i) => (
                                <tr key={i} className="hover:bg-gray-50/50 transition-colors">
                                    <td className="px-8 py-4 text-sm font-black text-gray-900">{row.vehicle?.vehicleNumber}</td>
                                    <td className="px-8 py-4 text-sm font-bold text-gray-500">₹{row.openingCash.toLocaleString()}</td>
                                    <td className="px-8 py-4 text-sm font-black text-emerald-600">₹{row.cashSales.toLocaleString()}</td>
                                    <td className="px-8 py-4 text-sm font-bold text-rose-500">₹{row.expenses.toLocaleString()}</td>
                                    <td className="px-8 py-4 text-sm font-black text-gray-900">₹{row.expectedCash.toLocaleString()}</td>
                                    <td className="px-8 py-4 text-sm font-black text-slate-800">₹{row.actualCash.toLocaleString()}</td>
                                    <td className="px-8 py-4">
                                        <span className={`text-[10px] font-black px-2 py-1 rounded-lg uppercase tracking-widest ${
                                            row.status === 'MATCHED' ? 'bg-emerald-100 text-emerald-600' : 
                                            row.status === 'MISMATCHED' ? 'bg-rose-100 text-rose-600' : 'bg-gray-100 text-gray-500'
                                        }`}>
                                            {row.status}
                                        </span>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
}
