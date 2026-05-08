import React, { useState, useEffect } from 'react';
import {
    Wallet,
    Plus,
    Receipt,
    History,
    CheckCircle2,
    X,
    Loader2,
    HandCoins,
    Timer,
    Upload,
    FileText
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { getMyExpenses, getExpenseCategories, addExpense } from '../services/expenseService';
import { format } from 'date-fns';
import toast from 'react-hot-toast';

export default function CashWallet() {
    const navigate = useNavigate();
    const [expenses, setExpenses] = useState([]);
    const [loading, setLoading] = useState(true);
    
    // Modal & Form State
    const [showAddExpense, setShowAddExpense] = useState(false);
    const [submitting, setSubmitting] = useState(false);
    const [expenseCategories, setExpenseCategories] = useState([]);
    const [billFile, setBillFile] = useState(null);
    const [billPreview, setBillPreview] = useState(null);
    const [newExpense, setNewExpense] = useState({
        mainCategory: '',
        subCategory: '',
        amount: '',
        paymentMode: 'CASH',
        description: '',
        paidTo: '',
        paidDate: format(new Date(), 'yyyy-MM-dd'),
        billDate: format(new Date(), 'yyyy-MM-dd')
    });

    useEffect(() => {
        loadData();
        fetchCategories();
    }, []);

    const loadData = async () => {
        setLoading(true);
        try {
            const expensesData = await getMyExpenses();
            setExpenses(expensesData);
        } catch (err) {
            toast.error('Failed to load wallet data');
        } finally {
            setLoading(false);
        }
    };

    const fetchCategories = async () => {
        try {
            const data = await getExpenseCategories();
            // Transform categories for hierarchical selection if needed
            const grouped = [];
            data.forEach(cat => {
                const parts = cat.name.split(' | ');
                const main = parts[0];
                const sub = parts[1];
                let existing = grouped.find(g => g.name === main);
                if (!existing) {
                    existing = { id: main, name: main, subCategories: [] };
                    grouped.push(existing);
                }
                if (sub) existing.subCategories.push({ id: cat.id, name: sub });
            });
            setExpenseCategories(grouped);
        } catch (err) { console.error('Failed to load categories'); }
    };

    const handleCreateExpense = async (e) => {
        e.preventDefault();
        setSubmitting(true);
        try {
            const formData = new FormData();
            formData.append('type', `${newExpense.mainCategory} | ${newExpense.subCategory}`);
            formData.append('amount', newExpense.amount);
            formData.append('paymentMode', newExpense.paymentMode);
            formData.append('description', newExpense.description);
            formData.append('paidTo', newExpense.paidTo);
            formData.append('paidDate', newExpense.paidDate);
            formData.append('billDate', newExpense.billDate);
            if (billFile) formData.append('billImage', billFile);

            await addExpense(formData);
            toast.success('Expense request submitted successfully');
            setShowAddExpense(false);
            setNewExpense({
                mainCategory: '', subCategory: '', amount: '', paymentMode: 'CASH',
                description: '', paidTo: '', 
                paidDate: format(new Date(), 'yyyy-MM-dd'),
                billDate: format(new Date(), 'yyyy-MM-dd')
            });
            setBillFile(null); setBillPreview(null);
            loadData();
        } catch (e) { toast.error(e?.response?.data?.message || 'Failed to submit'); }
        finally { setSubmitting(false); }
    };

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center p-5">
                <Loader2 className="animate-spin text-emerald-600" size={32} />
            </div>
        );
    }

    const getPaymentInfo = (desc) => {
        const match = desc?.match(/\[PAYMENT: (.*?) \| Paid: ₹([\d.]+) \| Bal: ₹([\d.]+)\]/);
        return match ? { type: match[1], paid: Number(match[2]), balance: Number(match[3]) } : null;
    };

    const pendingAmount = expenses.filter(e => e.status === 'PENDING').reduce((acc, curr) => acc + Number(curr.amount || 0), 0);
    const reimbursedTotal = expenses.filter(e => e.status === 'PAID').reduce((acc, curr) => {
        const payInfo = getPaymentInfo(curr.description);
        return acc + (payInfo ? payInfo.paid : Number(curr.amount || 0));
    }, 0);

    const pendingBalance = expenses.filter(e => e.status === 'PAID').reduce((acc, curr) => {
        const payInfo = getPaymentInfo(curr.description);
        return acc + (payInfo ? payInfo.balance : 0);
    }, 0);

    return (
        <div className="min-h-screen bg-slate-50 pb-20">
            <div className="max-w-lg mx-auto p-4 space-y-6">

                {/* Header */}
                <div className="bg-emerald-700 rounded-[2.5rem] p-8 text-white shadow-2xl shadow-emerald-900/40 relative overflow-hidden">
                    <div className="absolute top-0 right-0 p-8 opacity-10 rotate-12">
                        <HandCoins size={140} />
                    </div>

                    <div className="relative space-y-6">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-2xl bg-white/10 flex items-center justify-center backdrop-blur-md">
                                <Wallet size={20} className="text-emerald-300" />
                            </div>
                            <span className="text-xs font-black uppercase tracking-[0.2em] text-white/70">Expense Reimbursements</span>
                        </div>

                        <div>
                            <span className="text-[10px] font-black uppercase tracking-widest text-emerald-300 block mb-1">Total Reimbursed Amount</span>
                            <h2 className="text-5xl font-black tracking-tighter">₹{reimbursedTotal.toLocaleString()}</h2>
                        </div>

                        <div className="grid grid-cols-2 gap-3 pt-2">
                            <div className="bg-white/10 backdrop-blur-md p-4 rounded-3xl border border-white/10">
                                <div className="flex items-center gap-2 mb-1">
                                    <Timer size={14} className="text-amber-300" />
                                    <span className="text-[9px] font-black uppercase text-white/50">Awaiting Admin</span>
                                </div>
                                <span className="text-lg font-black italic">₹{pendingAmount.toLocaleString()}</span>
                            </div>
                            <div className="bg-white/10 backdrop-blur-md p-4 rounded-3xl border border-white/10">
                                <div className="flex items-center gap-2 mb-1">
                                    <HandCoins size={14} className="text-rose-300" />
                                    <span className="text-[9px] font-black uppercase text-white/50">Pending Balance</span>
                                </div>
                                <span className="text-lg font-black italic">₹{pendingBalance.toLocaleString()}</span>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Request Button */}
                <button
                    onClick={() => setShowAddExpense(true)}
                    className="w-full bg-white p-6 rounded-[2rem] border border-slate-200 shadow-sm flex items-center justify-between group active:scale-[0.98] transition-all hover:border-emerald-200 hover:bg-emerald-50/10"
                >
                    <div className="flex items-center gap-4">
                        <div className="w-14 h-14 rounded-2xl bg-emerald-50 flex items-center justify-center text-emerald-600 group-hover:bg-emerald-100 transition-colors">
                            <Receipt size={28} strokeWidth={2.5} />
                        </div>
                        <div className="text-left">
                            <span className="text-xs font-black uppercase tracking-widest text-slate-400 block">Submit New</span>
                            <span className="text-lg font-black text-slate-900 leading-tight">Request Expense</span>
                        </div>
                    </div>
                    <div className="w-10 h-10 rounded-full bg-slate-50 flex items-center justify-center text-slate-400 group-hover:bg-emerald-500 group-hover:text-white transition-all">
                        <Plus size={20} strokeWidth={3} />
                    </div>
                </button>

                {/* History */}
                <div className="space-y-4">
                    <div className="flex items-center justify-between px-2">
                        <h3 className="text-sm font-black uppercase tracking-widest text-slate-400 flex items-center gap-2">
                            <History size={16} /> Expense History
                        </h3>
                    </div>

                    <div className="space-y-3">
                        {expenses.length === 0 ? (
                            <div className="bg-white rounded-3xl p-10 border border-dashed border-slate-300 text-center space-y-2 opacity-50">
                                <p className="text-xs font-black uppercase tracking-widest text-slate-400">No requests yet</p>
                            </div>
                        ) : (
                            expenses.map((exp) => (
                                <div key={exp.id} className="bg-white rounded-[2.5rem] p-6 border border-slate-100 shadow-sm flex flex-col gap-4 group">
                                    {(() => {
                                        const payInfo = getPaymentInfo(exp.description);
                                        const displayAmount = payInfo ? payInfo.paid : exp.amount;
                                        return (
                                            <div className="flex items-center gap-4">
                                                <div className={`w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 ${exp.status === 'APPROVED' ? 'bg-indigo-50 text-indigo-600' :
                                                    exp.status === 'PAID' ? 'bg-emerald-50 text-emerald-600' :
                                                        exp.status === 'REJECTED' ? 'bg-rose-50 text-rose-600' : 'bg-orange-50 text-orange-600'
                                                    }`}>
                                                    {exp.status === 'PAID' ? <CheckCircle2 size={24} /> : <Receipt size={24} />}
                                                </div>
                                                <div className="flex-1 min-w-0">
                                                    <div className="flex items-center justify-between">
                                                        <h4 className="text-sm font-black text-slate-900 uppercase tracking-tight truncate">{exp.type}</h4>
                                                        <div className="flex flex-col items-end">
                                                            <span className="text-base font-black text-slate-900">₹{displayAmount.toLocaleString()}</span>
                                                            {payInfo && payInfo.paid !== exp.amount && (
                                                                <span className="text-[10px] font-bold text-slate-400 line-through">₹{exp.amount.toLocaleString()}</span>
                                                            )}
                                                        </div>
                                                    </div>
                                                    <div className="flex items-center justify-between mt-1">
                                                        <div className="flex items-center gap-2">
                                                            <span className={`text-[9px] font-black px-2 py-0.5 rounded-full uppercase tracking-widest ${
                                                                exp.status === 'APPROVED' ? 'bg-indigo-100 text-indigo-600' :
                                                                exp.status === 'PAID' ? 'bg-emerald-100 text-emerald-600' :
                                                                exp.status === 'REJECTED' ? 'bg-rose-100 text-rose-600' :
                                                                exp.status === 'RETURNED' ? 'bg-purple-100 text-purple-600' :
                                                                'bg-orange-100 text-orange-600'
                                                                }`}>
                                                                {exp.status === 'PAID' ? 'REIMBURSED' : exp.status}
                                                            </span>
                                                            <span className="text-[10px] font-bold text-slate-300">{format(new Date(exp.createdAt), 'dd MMM, hh:mm a')}</span>
                                                        </div>
                                                        {payInfo && payInfo.balance > 0 && (
                                                            <span className="text-[9px] font-black text-orange-500 uppercase tracking-tighter bg-orange-50 px-2 py-0.5 rounded-md border border-orange-100">
                                                                Bal: ₹{payInfo.balance.toLocaleString()}
                                                            </span>
                                                        )}
                                                    </div>
                                                </div>
                                            </div>
                                        );
                                    })()}

                                    {exp.description && (
                                        <p className="text-xs font-medium text-slate-500 bg-slate-50 p-3 rounded-xl border border-slate-100 italic">
                                            "{(() => {
                                                let clean = exp.description || '';
                                                clean = clean.replace(/\[METADATA:({.+?})\]/g, '');
                                                clean = clean.replace(/\[APPROVED_BY:(.+?)\]/g, '');
                                                clean = clean.replace(/\[PAID_BY:(.+?)\]/g, '');
                                                clean = clean.replace(/\[PAYMENT:(.+?)\]/g, '');
                                                const parts = clean.trim().split(/\n\[\d{2}\/\d{2}\/\d{2}/);
                                                return parts[0].trim() || 'No description';
                                            })()}"
                                        </p>
                                    )}
                                </div>
                            ))
                        )}
                    </div>
                </div>
            </div>

            {/* Premium Expense Modal */}
            {showAddExpense && (
                <div className="fixed inset-0 z-[100] bg-slate-900/60 backdrop-blur-md flex items-center justify-center p-4 animate-in fade-in duration-300 overflow-y-auto">
                    <div className="bg-white w-full max-w-2xl rounded-[3rem] shadow-2xl animate-in zoom-in-95 duration-300 overflow-hidden my-8 flex flex-col max-h-[90vh]">
                        <form onSubmit={handleCreateExpense} className="flex flex-col h-full overflow-hidden">
                            {/* Header */}
                            <div className="px-8 py-6 border-b border-gray-100 flex items-center justify-between bg-white shrink-0">
                                <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 bg-emerald-50 rounded-full flex items-center justify-center text-emerald-600">
                                        <Receipt size={20} />
                                    </div>
                                    <h3 className="text-xl font-bold text-gray-800">New Expense Request</h3>
                                </div>
                                <button type="button" onClick={() => setShowAddExpense(false)} className="w-8 h-8 flex items-center justify-center rounded-full bg-gray-50 text-gray-400 hover:bg-gray-100 transition-all">
                                    <X size={18} />
                                </button>
                            </div>

                            {/* Body - Scrollable */}
                            <div className="p-8 space-y-6 overflow-y-auto custom-scrollbar flex-1">
                                <div className="grid grid-cols-2 gap-6">
                                    <div className="space-y-2">
                                        <label className="text-sm font-bold text-gray-700">Category <span className="text-rose-500">*</span></label>
                                        <select required value={newExpense.mainCategory} onChange={e => setNewExpense({ ...newExpense, mainCategory: e.target.value, subCategory: '' })}
                                            className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-emerald-500/20 outline-none transition-all">
                                            <option value="">Select category</option>
                                            {expenseCategories.map(cat => (
                                                <option key={cat.id} value={cat.name}>{cat.name}</option>
                                            ))}
                                        </select>
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-sm font-bold text-gray-700">Sub Category <span className="text-rose-500">*</span></label>
                                        <select required disabled={!newExpense.mainCategory} value={newExpense.subCategory} onChange={e => setNewExpense({ ...newExpense, subCategory: e.target.value })}
                                            className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-emerald-500/20 outline-none transition-all disabled:opacity-50">
                                            <option value="">Select sub category</option>
                                            {(expenseCategories.find(c => c.name === newExpense.mainCategory)?.subCategories || []).map(sub => (
                                                <option key={sub.id} value={sub.name}>{sub.name}</option>
                                            ))}
                                        </select>
                                    </div>
                                </div>

                                <div className="space-y-2">
                                    <label className="text-sm font-bold text-gray-700">Paid To <span className="text-rose-500">*</span></label>
                                    <input required type="text" value={newExpense.paidTo} onChange={e => setNewExpense({ ...newExpense, paidTo: e.target.value })}
                                        placeholder="Enter vendor or person name"
                                        className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-emerald-500/20 outline-none transition-all" />
                                </div>

                                <div className="grid grid-cols-2 gap-6">
                                    <div className="space-y-2">
                                        <label className="text-sm font-bold text-gray-700">Paid Date <span className="text-rose-500">*</span></label>
                                        <input required type="date" value={newExpense.paidDate} onChange={e => setNewExpense({ ...newExpense, paidDate: e.target.value })}
                                            className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-emerald-500/20 outline-none transition-all" />
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-sm font-bold text-gray-700">Bill Date <span className="text-rose-500">*</span></label>
                                        <input required type="date" value={newExpense.billDate} onChange={e => setNewExpense({ ...newExpense, billDate: e.target.value })}
                                            className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-emerald-500/20 outline-none transition-all" />
                                    </div>
                                </div>

                                <div className="grid grid-cols-2 gap-6">
                                    <div className="space-y-2">
                                        <label className="text-sm font-bold text-gray-700">Bill Amount <span className="text-rose-500">*</span></label>
                                        <div className="relative">
                                            <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 font-bold">₹</span>
                                            <input required type="number" value={newExpense.amount} onChange={e => setNewExpense({ ...newExpense, amount: e.target.value })}
                                                placeholder="0.00"
                                                className="w-full bg-gray-50 border border-gray-200 rounded-xl pl-8 pr-4 py-3 text-sm focus:ring-2 focus:ring-emerald-500/20 outline-none transition-all" />
                                        </div>
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-sm font-bold text-gray-700">Payment Mode <span className="text-rose-500">*</span></label>
                                        <select required value={newExpense.paymentMode} onChange={e => setNewExpense({ ...newExpense, paymentMode: e.target.value })}
                                            className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-emerald-500/20 outline-none transition-all">
                                            <option value="CASH">Cash</option>
                                            <option value="UPI">UPI</option>
                                            <option value="CARD">Card</option>
                                            <option value="CHEQUE">Cheque</option>
                                            <option value="BANK_TRANSFER">Bank Transfer</option>
                                        </select>
                                    </div>
                                </div>

                                <div className="space-y-2">
                                    <label className="text-sm font-bold text-gray-700">Upload Bill</label>
                                    <div className="relative group">
                                        <input type="file" accept="image/*,.pdf" onChange={e => {
                                            const file = e.target.files[0];
                                            if (file) {
                                                setBillFile(file);
                                                setBillPreview(URL.createObjectURL(file));
                                            }
                                        }} className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10" />
                                        <div className={`border-2 border-dashed rounded-2xl p-8 flex flex-col items-center justify-center transition-all ${billFile ? 'border-emerald-500 bg-emerald-50' : 'border-gray-200 group-hover:border-emerald-400 bg-gray-50'}`}>
                                            {billPreview ? (
                                                <div className="relative">
                                                    {billFile.type === 'application/pdf' ? (
                                                        <div className="flex flex-col items-center gap-2">
                                                            <FileText size={48} className="text-emerald-500" />
                                                            <p className="text-[10px] font-bold text-emerald-600 truncate max-w-[200px]">{billFile.name}</p>
                                                        </div>
                                                    ) : (
                                                        <img src={billPreview} className="w-32 h-32 object-cover rounded-xl shadow-lg" alt="Preview" />
                                                    )}
                                                    <button type="button" onClick={(e) => { e.preventDefault(); setBillFile(null); setBillPreview(null); }}
                                                        className="absolute -top-2 -right-2 w-6 h-6 bg-rose-500 text-white rounded-full flex items-center justify-center shadow-lg hover:bg-rose-600 transition-all">
                                                        <X size={14} />
                                                    </button>
                                                </div>
                                            ) : (
                                                <>
                                                    <div className="w-12 h-12 bg-white rounded-xl shadow-sm flex items-center justify-center text-gray-400 mb-3 group-hover:text-emerald-500 transition-all">
                                                        <Upload size={24} />
                                                    </div>
                                                    <p className="text-sm text-gray-500 font-medium text-center">Drag and Drop or <span className="text-emerald-600 font-bold">Choose file</span> to upload</p>
                                                    <p className="text-[10px] text-gray-400 mt-1 uppercase tracking-widest font-black">PDF or IMAGE</p>
                                                </>
                                            )}
                                        </div>
                                    </div>
                                </div>

                                <div className="space-y-2">
                                    <label className="text-sm font-bold text-gray-700">Bill Description</label>
                                    <textarea rows={3} value={newExpense.description} onChange={e => setNewExpense({ ...newExpense, description: e.target.value })}
                                        placeholder="Enter the bill description here..."
                                        className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-emerald-500/20 outline-none transition-all resize-none" />
                                </div>
                            </div>

                            {/* Footer - Fixed */}
                            <div className="px-8 py-6 border-t border-gray-100 bg-gray-50/30 flex justify-end shrink-0">
                                <button type="submit" disabled={submitting}
                                    className="bg-emerald-600 hover:bg-emerald-700 text-white px-10 py-4 rounded-2xl text-xs font-black uppercase tracking-widest transition-all shadow-xl shadow-emerald-600/20 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-3 active:scale-95">
                                    {submitting ? <Loader2 size={18} className="animate-spin" /> : <Receipt size={18} />}
                                    Submit Request
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
