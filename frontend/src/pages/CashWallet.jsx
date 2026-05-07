import React, { useState, useEffect } from 'react';
import {
    Wallet,
    Plus,
    ArrowUpRight,
    ArrowDownLeft,
    Receipt,
    Camera,
    Send,
    History,
    CheckCircle2,
    X,
    Loader2,
    AlertCircle,
    HandCoins,
    Timer,
    CheckCircle
} from 'lucide-react';
import { claimExpense, addExpense, getMyExpenses, getExpenseCategories } from '../services/expenseService';
import { format } from 'date-fns';
import toast from 'react-hot-toast';

export default function CashWallet() {
    const [expenses, setExpenses] = useState([]);
    const [categories, setCategories] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showAddExpense, setShowAddExpense] = useState(false);

    // Form states
    const [expenseForm, setExpenseForm] = useState(() => {
        // Restore offline draft if exists
        try {
            const draft = localStorage.getItem('expense_draft');
            if (draft) return JSON.parse(draft);
        } catch {}
        return { type: '', amount: '', paymentMode: 'CASH', description: '' };
    });
    const [billFile, setBillFile] = useState(null);
    const [billPreview, setBillPreview] = useState(null);
    const [submitting, setSubmitting] = useState(false);
    const [claimingId, setClaimingId] = useState(null);

    // Auto-save draft to localStorage
    useEffect(() => {
        if (expenseForm.amount || expenseForm.description) {
            localStorage.setItem('expense_draft', JSON.stringify(expenseForm));
        }
    }, [expenseForm]);

    useEffect(() => {
        loadData();
    }, []);

    const loadData = async () => {
        setLoading(true);
        try {
            // Decouple the requests so if expenses fail, categories still load!
            let catData = [];
            try {
                catData = await getExpenseCategories();
                setCategories(catData);
                if (catData.length > 0 && !expenseForm.type) {
                    setExpenseForm(prev => ({ ...prev, type: catData[0].displayName || catData[0].name }));
                }
            } catch (catErr) {
                console.error("Failed to load categories", catErr);
            }

            try {
                const expensesData = await getMyExpenses();
                setExpenses(expensesData);
            } catch (expErr) {
                console.error("Failed to load expenses", expErr);
                toast.error('Failed to load expense history');
            }
        } catch (err) {
            toast.error('Failed to load wallet data');
        } finally {
            setLoading(false);
        }
    };

    const handleExpenseSubmit = async (e) => {
        e.preventDefault();
        setSubmitting(true);
        try {
            const formData = new FormData();
            formData.append('type', expenseForm.type);
            formData.append('amount', expenseForm.amount);
            formData.append('paymentMode', expenseForm.paymentMode);
            formData.append('description', expenseForm.description);
            if (billFile) {
                formData.append('billImage', billFile);
            }

            await addExpense(formData);
            toast.success('Expense request sent to Admin');
            localStorage.removeItem('expense_draft');
            setShowAddExpense(false);
            setExpenseForm({ type: categories[0]?.displayName || categories[0]?.name || '', amount: '', paymentMode: 'CASH', description: '' });
            setBillFile(null);
            setBillPreview(null);
            loadData();
        } catch (err) {
            toast.error(err.response?.data?.message || 'Failed to submit expense');
        } finally {
            setSubmitting(false);
        }
    };

    const handleClaim = async (id) => {
        setClaimingId(id);
        try {
            await claimExpense(id);
            toast.success('Fund claimed successfully!');
            loadData();
        } catch (err) {
            toast.error(err.response?.data?.message || 'Failed to claim fund');
        } finally {
            setClaimingId(null);
        }
    };

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center p-5">
                <Loader2 className="animate-spin text-emerald-600" size={32} />
            </div>
        );
    }

    const pendingAmount = expenses.filter(e => e.status === 'PENDING').reduce((acc, curr) => acc + Number(curr.amount || 0), 0);
    const approvedAmount = expenses.filter(e => e.status === 'APPROVED').reduce((acc, curr) => acc + Number(curr.amount || 0), 0);
    const claimedToday = expenses.filter(e => e.status === 'PAID').reduce((acc, curr) => acc + Number(curr.amount || 0), 0);

    return (
        <div className="min-h-screen bg-slate-50 pb-20">
            <div className="max-w-lg mx-auto p-4 space-y-6">

                {/* Refactored Expense Wallet Header */}
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
                            <span className="text-[10px] font-black uppercase tracking-widest text-emerald-300 block mb-1">Claimable Approved Amount</span>
                            <h2 className="text-5xl font-black tracking-tighter">₹{approvedAmount.toLocaleString()}</h2>
                        </div>

                        <div className="grid grid-cols-2 gap-3 pt-2">
                            <div className="bg-white/10 backdrop-blur-md p-4 rounded-3xl border border-white/10">
                                <div className="flex items-center gap-2 mb-1">
                                    <Timer size={14} className="text-amber-300" />
                                    <span className="text-[9px] font-black uppercase text-white/50">Pending Approval</span>
                                </div>
                                <span className="text-lg font-black italic">₹{pendingAmount.toLocaleString()}</span>
                            </div>
                            <div className="bg-white/10 backdrop-blur-md p-4 rounded-3xl border border-white/10">
                                <div className="flex items-center gap-2 mb-1">
                                    <CheckCircle size={14} className="text-emerald-300" />
                                    <span className="text-[9px] font-black uppercase text-white/50">Claimed (All Time)</span>
                                </div>
                                <span className="text-lg font-black italic">₹{claimedToday.toLocaleString()}</span>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Primary Action */}
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

                {/* Transaction History */}
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
                                                <span className="text-base font-black text-slate-900">₹{exp.amount.toLocaleString()}</span>
                                            </div>
                                            <div className="flex items-center gap-2 mt-1">
                                                <span className={`text-[9px] font-black px-2 py-0.5 rounded-full uppercase tracking-widest ${
                                                    exp.status === 'APPROVED' ? 'bg-indigo-100 text-indigo-600' :
                                                    exp.status === 'PAID' ? 'bg-emerald-100 text-emerald-600' :
                                                    exp.status === 'REJECTED' ? 'bg-rose-100 text-rose-600' :
                                                    exp.status === 'RETURNED' ? 'bg-purple-100 text-purple-600' :
                                                    exp.status === 'VERIFIED' ? 'bg-teal-100 text-teal-600' :
                                                    exp.status === 'CLOSED' ? 'bg-gray-200 text-gray-600' :
                                                    exp.status === 'UNDER_REVIEW' ? 'bg-yellow-100 text-yellow-600' :
                                                    'bg-orange-100 text-orange-600'
                                                    }`}>
                                                    {exp.status === 'PAID' ? 'CLAIMED' : exp.status}
                                                </span>
                                                {exp.paymentMode === 'PERSONAL_CASH' && (
                                                    <span className="text-[8px] font-black px-1.5 py-0.5 rounded bg-purple-50 text-purple-500 uppercase">Reimb.</span>
                                                )}
                                                <span className="text-[10px] font-bold text-slate-300">{format(new Date(exp.createdAt), 'dd MMM, hh:mm a')}</span>
                                            </div>
                                        </div>
                                    </div>

                                    {exp.description && (
                                        <p className="text-xs font-medium text-slate-500 bg-slate-50 p-3 rounded-xl border border-slate-100 italic">
                                            "{(() => {
                                                const clean = exp.description.replace(/\[(APPROVED|PAID)_BY:.+?\]/g, '').trim();
                                                const parts = clean.split(/\n\[\d{2}\/\d{2}\/\d{2}/);
                                                return parts[0].trim();
                                            })()}"
                                        </p>
                                    )}

                                    {exp.status === 'APPROVED' && (
                                        <button
                                            onClick={() => handleClaim(exp.id)}
                                            disabled={claimingId === exp.id}
                                            className="w-full bg-emerald-600 text-white font-black py-4 rounded-2xl flex items-center justify-center gap-2 shadow-lg shadow-emerald-200 active:scale-[0.98] transition-all hover:bg-emerald-700"
                                        >
                                            {claimingId === exp.id ? <Loader2 className="animate-spin" size={18} /> : (
                                                <>
                                                    <HandCoins size={18} />
                                                    Claim This Fund
                                                </>
                                            )}
                                        </button>
                                    )}
                                </div>
                            ))
                        )}
                    </div>
                </div>

                {/* Modals */}
                {showAddExpense && (
                    <div className="fixed inset-0 z-[100] bg-slate-900/60 backdrop-blur-md flex items-end sm:items-center justify-center animate-in fade-in duration-300 p-4">
                        <div className="bg-white w-full max-w-md rounded-t-[2.5rem] sm:rounded-[2.5rem] p-6 space-y-5 shadow-2xl animate-in slide-in-from-bottom duration-500">
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 bg-emerald-50 rounded-2xl flex items-center justify-center text-emerald-600">
                                        <Receipt size={20} />
                                    </div>
                                    <h3 className="text-lg font-black text-slate-900 tracking-tight">New Expense Request</h3>
                                </div>
                                <button onClick={() => setShowAddExpense(false)} className="p-2 bg-slate-50 rounded-xl text-slate-400">
                                    <X size={20} />
                                </button>
                            </div>

                            <form onSubmit={handleExpenseSubmit} className="space-y-4">
                                <div className="space-y-1">
                                    <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 pl-1">Expense Type</label>
                                    <select
                                        required
                                        value={expenseForm.type}
                                        onChange={(e) => setExpenseForm({ ...expenseForm, type: e.target.value })}
                                        className="w-full bg-slate-50 border-none rounded-xl px-5 py-3 font-black text-slate-900 focus:ring-2 focus:ring-emerald-500 transition-all appearance-none text-sm"
                                        style={{
                                            backgroundImage: `url("data:image/svg+xml,%3csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 20 20'%3e%3cpath stroke='%230f172a' stroke-linecap='round' stroke-linejoin='round' stroke-width='2' d='M5.25 7.5L10 12.25L14.75 7.5'/%3e%3c/svg%3e")`,
                                            backgroundPosition: 'right 0.75rem center',
                                            backgroundRepeat: 'no-repeat',
                                            backgroundSize: '1rem'
                                        }}
                                    >
                                        <option value="" disabled>Select Expense Purpose</option>
                                        {(() => {
                                            const cats = categories.length > 0 ? categories : [
                                                { id: 'c1', name: 'Fuel' },
                                                { id: 'c2', name: 'Toll' },
                                                { id: 'c3', name: 'Food' },
                                                { id: 'c4', name: 'Repairs' },
                                                { id: 'c5', name: 'Other' }
                                            ];
                                            const masters = cats.filter(c => !(c.displayName || c.name).includes(' | '));
                                            return masters.map(master => {
                                                const masterDisplay = master.displayName || master.name;
                                                const subs = cats.filter(c => (c.displayName || c.name).startsWith(`${masterDisplay} | `));
                                                if (subs.length === 0) return <option key={master.id} value={masterDisplay}>{masterDisplay}</option>;
                                                return (
                                                    <optgroup key={master.id} label={masterDisplay}>
                                                        <option value={masterDisplay}>General {masterDisplay}</option>
                                                        {subs.map(sub => {
                                                            const subDisplay = (sub.displayName || sub.name).split(' | ')[1];
                                                            return <option key={sub.id} value={sub.displayName || sub.name}>{subDisplay}</option>;
                                                        })}
                                                    </optgroup>
                                                );
                                            });
                                        })()}
                                    </select>
                                </div>

                                <div className="space-y-1">
                                    <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 pl-1">Amount Requested</label>
                                    <div className="relative">
                                        <span className="absolute left-4 top-1/2 -translate-y-1/2 text-xs font-black text-slate-400">₹</span>
                                        <input
                                            type="number"
                                            required
                                            min="0"
                                            placeholder="0.00"
                                            value={expenseForm.amount}
                                            onChange={(e) => setExpenseForm({ ...expenseForm, amount: e.target.value })}
                                            className="w-full bg-slate-50 border-none rounded-xl pl-8 pr-4 py-3 font-black text-slate-900 text-base focus:ring-2 focus:ring-emerald-500 transition-all placeholder:text-slate-200"
                                        />
                                    </div>
                                </div>

                                <div className="space-y-1">
                                    <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 pl-1">Payment Mode</label>
                                    <div className="grid grid-cols-3 gap-2">
                                        {[{k:'CASH',l:'Cash',c:'emerald'},{k:'PERSONAL_CASH',l:'Personal Cash',c:'purple'},{k:'UPI',l:'UPI',c:'blue'}].map(m => (
                                            <button key={m.k} type="button"
                                                onClick={() => setExpenseForm({...expenseForm, paymentMode: m.k})}
                                                className={`py-2.5 rounded-xl text-[10px] font-black uppercase tracking-wide border transition-all ${
                                                    expenseForm.paymentMode === m.k
                                                        ? `bg-${m.c}-50 text-${m.c}-600 border-${m.c}-200 shadow-sm`
                                                        : 'bg-white text-slate-400 border-slate-100 hover:border-slate-200'}`}>
                                                {m.l}
                                            </button>
                                        ))}
                                    </div>
                                    {expenseForm.paymentMode === 'PERSONAL_CASH' && (
                                        <p className="text-[9px] font-bold text-purple-500 bg-purple-50 px-3 py-1.5 rounded-xl mt-1">
                                            ℹ️ Personal cash expenses are reimbursements. You can claim the fund after admin approval.
                                        </p>
                                    )}
                                </div>

                                <div className="space-y-1">
                                    <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 pl-1">Description / Reason</label>
                                    <textarea
                                        required
                                        placeholder="Enter details..."
                                        value={expenseForm.description}
                                        onChange={(e) => setExpenseForm({ ...expenseForm, description: e.target.value })}
                                        className="w-full bg-slate-50 border-none rounded-xl px-5 py-3 font-bold text-slate-900 focus:ring-2 focus:ring-emerald-500 transition-all h-20 resize-none text-sm placeholder:text-slate-300"
                                    />
                                </div>

                                <div className="space-y-1">
                                    <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 pl-1">Photo of Bill</label>
                                    <div className="relative group">
                                        <input
                                            type="file"
                                            accept="image/*"
                                            onChange={(e) => {
                                                const file = e.target.files[0];
                                                if (file) {
                                                    setBillFile(file);
                                                    setBillPreview(URL.createObjectURL(file));
                                                }
                                            }}
                                            className="hidden"
                                            id="bill-upload"
                                        />
                                        <label
                                            htmlFor="bill-upload"
                                            className="w-full bg-slate-50 border-2 border-dashed border-slate-200 rounded-2xl p-6 flex flex-col items-center justify-center gap-2 cursor-pointer hover:border-emerald-300 hover:bg-emerald-50/30 transition-all"
                                        >
                                            {billPreview ? (
                                                <div className="relative w-full aspect-video rounded-xl overflow-hidden shadow-md">
                                                    <img src={billPreview} alt="Preview" className="w-full h-full object-cover" />
                                                    <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                                                        <Camera className="text-white" size={24} />
                                                    </div>
                                                </div>
                                            ) : (
                                                <>
                                                    <Camera className="text-slate-300" size={24} />
                                                    <span className="text-[10px] font-bold text-slate-400">Capture Bill Photo</span>
                                                </>
                                            )}
                                        </label>
                                    </div>
                                </div>

                                <button
                                    type="submit"
                                    disabled={submitting}
                                    className="w-full bg-slate-900 text-white py-4 rounded-xl font-black text-xs uppercase tracking-[0.2em] shadow-xl active:scale-[0.98] transition-all flex items-center justify-center gap-2 disabled:opacity-50"
                                >
                                    {submitting ? <Loader2 className="animate-spin" size={16} /> : <>Send for Approval</>}
                                </button>
                            </form>
                        </div>
                    </div>
                )}

            </div>
        </div>
    );
}
