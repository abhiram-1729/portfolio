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
    Calculator
} from 'lucide-react';
import { getCashStatus } from '../services/cashService';
import { addExpense, getMyExpenses, submitToChest, getExpenseCategories } from '../services/expenseService';
import { format } from 'date-fns';
import toast from 'react-hot-toast';

export default function CashWallet() {
    const [status, setStatus] = useState(null);
    const [expenses, setExpenses] = useState([]);
    const [categories, setCategories] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showAddExpense, setShowAddExpense] = useState(false);
    const [showChestTransfer, setShowChestTransfer] = useState(false);
    
    // Form states
    const [expenseForm, setExpenseForm] = useState({
        type: 'FUEL',
        amount: '',
        paymentMode: 'CASH',
        description: ''
    });
    const [billFile, setBillFile] = useState(null);
    const [billPreview, setBillPreview] = useState(null);
    const [submitting, setSubmitting] = useState(false);
    
    const [chestForm, setChestForm] = useState({
        amount: '',
        denominations: {}
    });

    useEffect(() => {
        loadData();
    }, []);

    const loadData = async () => {
        setLoading(true);
        try {
            const [statusData, expensesData, catData] = await Promise.all([
                getCashStatus(),
                getMyExpenses({ date: format(new Date(), 'yyyy-MM-dd') }),
                getExpenseCategories()
            ]);
            setStatus(statusData);
            setExpenses(expensesData);
            setCategories(catData);
            if (catData.length > 0) {
                setExpenseForm(prev => ({ ...prev, type: catData[0].name }));
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
            toast.success('Expense added successfully');
            setShowAddExpense(false);
            setExpenseForm({ type: categories[0]?.name || 'FUEL', amount: '', paymentMode: 'CASH', description: '' });
            setBillFile(null);
            setBillPreview(null);
            loadData();
        } catch (err) {
            toast.error(err.response?.data?.message || 'Failed to add expense');
        } finally {
            setSubmitting(false);
        }
    };

    const handleChestSubmit = async (e) => {
        e.preventDefault();
        setSubmitting(true);
        try {
            await submitToChest(chestForm);
            toast.success('Cash submitted to chest');
            setShowChestTransfer(false);
            loadData();
        } catch (err) {
            toast.error('Failed to submit cash');
        } finally {
            setSubmitting(false);
        }
    };

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center p-5">
                <Loader2 className="animate-spin text-emerald-600" size={32} />
            </div>
        );
    }

    const availableCash = (status?.openingCash || 0) + (status?.cashSales || 0) - (status?.expenses || 0);

    return (
        <div className="min-h-screen bg-slate-50 pb-20">
            <div className="max-w-lg mx-auto p-4 space-y-6">
                {/* Wallet Header Card */}
                <div className="bg-slate-900 rounded-[2.5rem] p-8 text-white shadow-2xl shadow-slate-900/40 relative overflow-hidden">
                <div className="absolute top-0 right-0 p-12 opacity-10">
                    <Wallet size={120} />
                </div>
                
                <div className="relative space-y-6">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-2xl bg-white/10 flex items-center justify-center backdrop-blur-md">
                            <Wallet size={20} className="text-emerald-400" />
                        </div>
                        <span className="text-xs font-black uppercase tracking-[0.2em] text-white/50">My Cash Wallet</span>
                    </div>

                    <div>
                        <span className="text-[10px] font-black uppercase tracking-widest text-emerald-400 block mb-1">Available In-Hand</span>
                        <h2 className="text-5xl font-black tracking-tighter">₹{availableCash.toLocaleString()}</h2>
                    </div>

                    <div className="grid grid-cols-3 gap-2 pt-4">
                        <div className="bg-white/5 p-3 rounded-2xl border border-white/10 backdrop-blur-sm">
                            <span className="text-[9px] font-black uppercase text-white/40 block mb-1">Opening</span>
                            <span className="text-sm font-black italic">₹{status?.openingCash?.toLocaleString()}</span>
                        </div>
                        <div className="bg-white/5 p-3 rounded-2xl border border-white/10 backdrop-blur-sm">
                            <span className="text-[9px] font-black uppercase text-emerald-400/60 block mb-1">Sales</span>
                            <span className="text-sm font-black italic text-emerald-400">+₹{status?.cashSales?.toLocaleString()}</span>
                        </div>
                        <div className="bg-white/5 p-3 rounded-2xl border border-white/10 backdrop-blur-sm">
                            <span className="text-[9px] font-black uppercase text-rose-400/60 block mb-1">Expenses</span>
                            <span className="text-sm font-black italic text-rose-400">-₹{status?.expenses?.toLocaleString()}</span>
                        </div>
                    </div>
                </div>
            </div>

            {/* Quick Actions */}
            <div className="grid grid-cols-2 gap-4">
                <button 
                    onClick={() => setShowAddExpense(true)}
                    className="bg-white p-5 rounded-3xl border border-slate-200 shadow-sm flex flex-col items-center justify-center gap-3 active:scale-95 transition-all"
                >
                    <div className="w-12 h-12 rounded-2xl bg-rose-50 flex items-center justify-center text-rose-600">
                        <Receipt size={24} strokeWidth={2.5} />
                    </div>
                    <span className="text-xs font-black uppercase tracking-widest text-slate-900">Add Expense</span>
                </button>
                <button 
                    onClick={() => setShowChestTransfer(true)}
                    className="bg-white p-5 rounded-3xl border border-slate-200 shadow-sm flex flex-col items-center justify-center gap-3 active:scale-95 transition-all"
                >
                    <div className="w-12 h-12 rounded-2xl bg-emerald-50 flex items-center justify-center text-emerald-600">
                        <Send size={24} strokeWidth={2.5} />
                    </div>
                    <span className="text-xs font-black uppercase tracking-widest text-slate-900">To Chest</span>
                </button>
            </div>

            {/* Today's Transactions */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                <div className="space-y-4">
                    <div className="flex items-center justify-between px-2">
                        <h3 className="text-sm font-black uppercase tracking-widest text-slate-400 flex items-center gap-2">
                            <History size={16} /> History (Today)
                        </h3>
                    </div>

                    <div className="space-y-3">
                        {expenses.length === 0 ? (
                            <div className="bg-white rounded-3xl p-10 border border-dashed border-slate-300 text-center space-y-2 opacity-50">
                                <p className="text-xs font-black uppercase tracking-widest text-slate-400">No transactions today</p>
                            </div>
                        ) : (
                            expenses.map((exp) => (
                                <div key={exp.id} className="bg-white rounded-[2rem] p-5 border border-slate-100 shadow-sm flex items-center gap-4">
                                    <div className={`w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 ${
                                        exp.status === 'APPROVED' ? 'bg-emerald-50 text-emerald-600' : 
                                        exp.status === 'REJECTED' ? 'bg-rose-50 text-rose-600' : 'bg-orange-50 text-orange-600'
                                    }`}>
                                        <ArrowUpRight size={24} strokeWidth={2.5} />
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-center justify-between">
                                            <h4 className="text-sm font-black text-slate-900 uppercase tracking-tight truncate">{exp.type}</h4>
                                            <span className="text-sm font-black text-rose-600">-₹{exp.amount.toLocaleString()}</span>
                                        </div>
                                        <div className="flex items-center justify-between mt-1">
                                            <p className="text-[10px] font-bold text-slate-400 truncate pr-4">{exp.description || 'No description'}</p>
                                            <span className={`text-[9px] font-black px-2 py-0.5 rounded-full uppercase tracking-widest ${
                                                exp.status === 'APPROVED' ? 'bg-emerald-100 text-emerald-600' : 
                                                exp.status === 'REJECTED' ? 'bg-rose-100 text-rose-600' : 'bg-orange-100 text-orange-600'
                                            }`}>
                                                {exp.status}
                                            </span>
                                        </div>
                                    </div>
                                </div>
                            ))
                        )}
                    </div>
                </div>

                {/* Denomination Reference / Calculator */}
                <div className="space-y-4">
                    <div className="flex items-center justify-between px-2">
                        <h3 className="text-sm font-black uppercase tracking-widest text-slate-400 flex items-center gap-2">
                            <Calculator size={16} /> Cash Counter
                        </h3>
                    </div>
                    <div className="bg-white rounded-[2.5rem] p-6 border border-slate-200 shadow-sm">
                        <div className="grid grid-cols-2 gap-3">
                            {[500, 200, 100, 50, 20, 10, 5, 2, 1].map(d => (
                                <div key={d} className="flex items-center justify-between bg-slate-50 p-3 rounded-2xl border border-slate-100">
                                    <span className="text-[10px] font-black text-slate-400 w-8">₹{d}</span>
                                    <input 
                                        type="number" 
                                        placeholder="0" 
                                        className="w-12 bg-transparent border-none p-0 text-center font-black text-slate-900 focus:ring-0 text-sm"
                                        onChange={(e) => {
                                            const val = parseInt(e.target.value) || 0;
                                            setChestForm(prev => ({
                                                ...prev,
                                                denominations: { ...prev.denominations, [d]: val }
                                            }));
                                        }}
                                    />
                                </div>
                            ))}
                        </div>
                        <div className="mt-6 pt-4 border-t border-slate-100 flex items-center justify-between">
                            <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Calculated Total</span>
                            <span className="text-lg font-black text-slate-900">
                                ₹{Object.entries(chestForm.denominations).reduce((sum, [d, q]) => sum + (parseInt(d) * q), 0).toLocaleString()}
                            </span>
                        </div>
                    </div>
                </div>
            </div>

            {/* Modals */}
            {showAddExpense && (
                <div className="fixed inset-0 z-[100] bg-slate-900/60 backdrop-blur-md flex items-end sm:items-center justify-center animate-in fade-in duration-300">
                    <div className="bg-white w-full max-w-lg rounded-t-[3rem] sm:rounded-[3rem] p-8 space-y-6 shadow-2xl animate-in slide-in-from-bottom duration-500">
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                                <div className="w-12 h-12 bg-rose-50 rounded-2xl flex items-center justify-center text-rose-600">
                                    <Receipt size={24} />
                                </div>
                                <h3 className="text-xl font-black text-slate-900 tracking-tight">Add New Expense</h3>
                            </div>
                            <button onClick={() => setShowAddExpense(false)} className="p-2 bg-slate-50 rounded-xl text-slate-400">
                                <X size={20} />
                            </button>
                        </div>

                        <form onSubmit={handleExpenseSubmit} className="space-y-4">
                            <div className="space-y-1">
                                <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 pl-1">Expense Type</label>
                                <select 
                                    value={expenseForm.type}
                                    onChange={(e) => setExpenseForm({...expenseForm, type: e.target.value})}
                                    className="w-full bg-slate-50 border-none rounded-2xl px-6 py-4 font-black text-slate-900 focus:ring-2 focus:ring-rose-500 transition-all appearance-none"
                                >
                                    {categories.map(c => (
                                        <option key={c.id} value={c.name}>{c.name}</option>
                                    ))}
                                    {categories.length === 0 && (
                                        <>
                                            <option value="FUEL">Fuel</option>
                                            <option value="FOOD">Food</option>
                                            <option value="MAINTENANCE">Maintenance</option>
                                            <option value="HELPER_CHARGES">Helper Charges</option>
                                            <option value="MISC">Miscellaneous</option>
                                        </>
                                    )}
                                </select>
                            </div>

                            <div className="space-y-1">
                                <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 pl-1">Amount</label>
                                <div className="relative">
                                    <span className="absolute left-6 top-1/2 -translate-y-1/2 font-black text-slate-400">₹</span>
                                    <input 
                                        type="number"
                                        required
                                        placeholder="0.00"
                                        value={expenseForm.amount}
                                        onChange={(e) => setExpenseForm({...expenseForm, amount: e.target.value})}
                                        className="w-full bg-slate-50 border-none rounded-2xl pl-10 pr-6 py-4 font-black text-slate-900 text-xl focus:ring-2 focus:ring-rose-500 transition-all"
                                    />
                                </div>
                            </div>

                            <div className="space-y-1">
                                <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 pl-1">Description</label>
                                <textarea 
                                    placeholder="Enter details..."
                                    value={expenseForm.description}
                                    onChange={(e) => setExpenseForm({...expenseForm, description: e.target.value})}
                                    className="w-full bg-slate-50 border-none rounded-2xl px-6 py-4 font-bold text-slate-900 focus:ring-2 focus:ring-rose-500 transition-all h-24 resize-none"
                                />
                            </div>

                            <div className="space-y-1">
                                <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 pl-1">Upload Bill (Optional)</label>
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
                                        className="w-full bg-slate-50 border-2 border-dashed border-slate-200 rounded-2xl p-6 flex flex-col items-center justify-center gap-2 cursor-pointer hover:border-rose-300 hover:bg-rose-50/30 transition-all"
                                    >
                                        {billPreview ? (
                                            <div className="relative w-full aspect-video rounded-xl overflow-hidden shadow-md">
                                                <img src={billPreview} alt="Preview" className="w-full h-full object-cover" />
                                                <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                                                    <Camera className="text-white" size={32} />
                                                </div>
                                            </div>
                                        ) : (
                                            <>
                                                <Camera className="text-slate-300" size={32} />
                                                <span className="text-xs font-bold text-slate-400">Click to capture or select photo</span>
                                            </>
                                        )}
                                    </label>
                                </div>
                            </div>

                            <button 
                                type="submit" 
                                disabled={submitting}
                                className="w-full bg-slate-900 text-white py-5 rounded-2xl font-black text-sm uppercase tracking-[0.2em] shadow-xl active:scale-[0.98] transition-all flex items-center justify-center gap-3 disabled:opacity-50"
                            >
                                {submitting ? <Loader2 className="animate-spin" /> : <>Confirm Expense Request</>}
                            </button>
                        </form>
                    </div>
                </div>
            )}

            {/* Chest Transfer Modal - Simplified for now */}
            {showChestTransfer && (
               <div className="fixed inset-0 z-[100] bg-slate-900/60 backdrop-blur-md flex items-end sm:items-center justify-center animate-in fade-in duration-300">
                    <div className="bg-white w-full max-w-lg rounded-t-[3rem] sm:rounded-[3rem] p-8 space-y-6 shadow-2xl animate-in slide-in-from-bottom duration-500">
                         <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                                <div className="w-12 h-12 bg-emerald-50 rounded-2xl flex items-center justify-center text-emerald-600">
                                    <Send size={24} />
                                </div>
                                <h3 className="text-xl font-black text-slate-900 tracking-tight">Submit to Chest</h3>
                            </div>
                            <button onClick={() => setShowChestTransfer(false)} className="p-2 bg-slate-50 rounded-xl text-slate-400">
                                <X size={20} />
                            </button>
                        </div>

                        <div className="bg-emerald-50 p-4 rounded-2xl flex items-center gap-3">
                            <AlertCircle className="text-emerald-500 shrink-0" />
                            <p className="text-xs font-bold text-emerald-700">Submit remaining physical cash to the store manager at end of day.</p>
                        </div>

                        <form onSubmit={handleChestSubmit} className="space-y-4">
                            <div className="space-y-1">
                                <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 pl-1">Amount to Submit</label>
                                <div className="relative">
                                    <span className="absolute left-6 top-1/2 -translate-y-1/2 font-black text-slate-400">₹</span>
                                    <input 
                                        type="number"
                                        required
                                        max={availableCash}
                                        placeholder="0.00"
                                        value={chestForm.amount}
                                        onChange={(e) => setChestForm({...chestForm, amount: e.target.value})}
                                        className="w-full bg-slate-50 border-none rounded-2xl pl-10 pr-6 py-4 font-black text-slate-900 text-xl focus:ring-2 focus:ring-emerald-500 transition-all"
                                    />
                                </div>
                            </div>

                            <button 
                                type="submit" 
                                disabled={submitting || !chestForm.amount || parseFloat(chestForm.amount) > availableCash}
                                className="w-full bg-emerald-600 text-white py-5 rounded-2xl font-black text-sm uppercase tracking-[0.2em] shadow-xl active:scale-[0.98] transition-all flex items-center justify-center gap-3 disabled:opacity-50"
                            >
                                {submitting ? <Loader2 className="animate-spin" /> : <>Submit Cash</>}
                            </button>
                        </form>
                    </div>
               </div>
            )}
            </div>
        </div>
    );
}
