import React, { useState, useEffect } from 'react';
import { 
    Receipt, 
    Search, 
    Filter, 
    CheckCircle2, 
    XCircle, 
    Eye, 
    Clock, 
    User, 
    Truck,
    AlertCircle,
    Calendar,
    Loader2,
    Check,
    X,
    Settings,
    Plus
} from 'lucide-react';
import { getAllExpenses, updateExpenseStatus, getExpenseCategories, createExpenseCategory } from '../../services/expenseService';
import { format } from 'date-fns';
import toast from 'react-hot-toast';

export default function AdminExpenses() {
    const [expenses, setExpenses] = useState([]);
    const [loading, setLoading] = useState(true);
    const [date, setDate] = useState(format(new Date(), 'yyyy-MM-dd'));
    const [statusFilter, setStatusFilter] = useState('');
    const [activeTab, setActiveTab] = useState('monitoring');
    const [categories, setCategories] = useState([]);
    const [showAddCategory, setShowAddCategory] = useState(false);
    const [newCategory, setNewCategory] = useState({ name: '', limit: '' });
    const [selectedExpense, setSelectedExpense] = useState(null);

    useEffect(() => {
        if (activeTab === 'monitoring') {
            loadExpenses();
        } else {
            loadCategories();
        }
    }, [date, statusFilter, activeTab]);

    const loadExpenses = async () => {
        setLoading(true);
        try {
            const data = await getAllExpenses({ date, status: statusFilter });
            setExpenses(data);
        } catch (err) {
            toast.error('Failed to load expenses');
        } finally {
            setLoading(false);
        }
    };

    const loadCategories = async () => {
        setLoading(true);
        try {
            const data = await getExpenseCategories();
            setCategories(data);
        } catch (err) {
            toast.error('Failed to load categories');
        } finally {
            setLoading(false);
        }
    };

    const handleAddCategory = async (e) => {
        e.preventDefault();
        try {
            await createExpenseCategory(newCategory);
            toast.success('Category added');
            setShowAddCategory(false);
            setNewCategory({ name: '', limit: '' });
            loadCategories();
        } catch (err) {
            toast.error('Failed to add category');
        }
    };

    const handleAction = async (id, status) => {
        try {
            await updateExpenseStatus(id, status);
            toast.success(`Expense ${status.toLowerCase()}ed`);
            loadExpenses();
        } catch (err) {
            toast.error('Failed to update status');
        }
    };

    return (
        <div className="space-y-6">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="flex flex-col gap-1">
                    <h2 className="text-2xl font-bold text-gray-900">Expenses</h2>
                    <p className="text-sm text-gray-500">Review and manage field expenses and categories</p>
                </div>

                {activeTab === 'monitoring' && (
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
                )}
                
                {activeTab === 'categories' && (
                    <button 
                        onClick={() => setShowAddCategory(true)}
                        className="flex items-center gap-2 bg-emerald-600 text-white px-5 py-2.5 rounded-2xl font-bold text-sm hover:bg-emerald-700 transition-all shadow-lg shadow-emerald-600/20"
                    >
                        <Plus size={18} strokeWidth={2.5} />
                        Add Type
                    </button>
                )}
            </div>

            {/* Main Tabs */}
            <div className="flex gap-2 bg-gray-100 p-1 rounded-2xl w-fit">
                <button
                    onClick={() => setActiveTab('monitoring')}
                    className={`px-6 py-2.5 rounded-xl text-xs font-bold uppercase tracking-wider transition-all ${activeTab === 'monitoring' ? 'bg-white text-emerald-600 shadow-sm' : 'text-gray-400'}`}
                >
                    Monitoring
                </button>
                <button
                    onClick={() => setActiveTab('categories')}
                    className={`px-6 py-2.5 rounded-xl text-xs font-bold uppercase tracking-wider transition-all ${activeTab === 'categories' ? 'bg-white text-emerald-600 shadow-sm' : 'text-gray-400'}`}
                >
                    Types & Limits
                </button>
            </div>

            {activeTab === 'monitoring' ? (
                <>
                    {/* Status Filters */}
                    <div className="flex flex-wrap gap-2">
                        {['', 'PENDING', 'APPROVED', 'REJECTED'].map((s) => (
                            <button
                                key={s}
                                onClick={() => setStatusFilter(s)}
                                className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${statusFilter === s ? 'bg-slate-900 text-white' : 'bg-white text-slate-400 border border-slate-100'}`}
                            >
                                {s || 'All'}
                            </button>
                        ))}
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {loading ? (
                    <div className="col-span-full flex flex-col items-center justify-center py-20 text-gray-400">
                        <Loader2 className="animate-spin mb-4" size={40} />
                        <p className="font-bold italic">Fetching expenses...</p>
                    </div>
                ) : expenses.length === 0 ? (
                    <div className="col-span-full bg-white rounded-[2rem] p-20 border border-dashed border-gray-200 text-center space-y-4">
                        <Receipt size={64} className="mx-auto text-gray-100" />
                        <div className="space-y-1">
                            <h3 className="text-xl font-black text-gray-300">No Expenses Recorded</h3>
                            <p className="text-sm text-gray-400 font-bold">Try changing filters or dates</p>
                        </div>
                    </div>
                ) : (
                    expenses.map((exp) => (
                        <div key={exp.id} className="bg-white rounded-[2rem] border border-gray-100 shadow-sm overflow-hidden hover:shadow-md transition-shadow group">
                            <div className="p-6 space-y-4">
                                <div className="flex items-start justify-between">
                                    <div className="flex items-center gap-3">
                                        <div className={`w-12 h-12 rounded-2xl flex items-center justify-center ${
                                            exp.status === 'APPROVED' ? 'bg-emerald-50 text-emerald-600' : 
                                            exp.status === 'REJECTED' ? 'bg-rose-50 text-rose-600' : 'bg-orange-50 text-orange-600'
                                        }`}>
                                            <Receipt size={24} strokeWidth={2.5} />
                                        </div>
                                        <div>
                                            <h4 className="text-base font-black text-gray-900 tracking-tight">{exp.type}</h4>
                                            <div className="flex items-center gap-2 mt-0.5">
                                                <span className={`text-[10px] font-black uppercase px-2 py-0.5 rounded-full ${
                                                    exp.paymentMode === 'CASH' ? 'bg-emerald-100 text-emerald-700' : 'bg-blue-100 text-blue-700'
                                                }`}>
                                                    {exp.paymentMode}
                                                </span>
                                                <span className="text-[10px] font-bold text-gray-400">{format(new Date(exp.createdAt), 'hh:mm a')}</span>
                                            </div>
                                        </div>
                                    </div>
                                    <div className="text-right">
                                        <span className="text-lg font-black text-gray-900 block">₹{exp.amount.toLocaleString()}</span>
                                    </div>
                                </div>

                                <div className="bg-gray-50 p-4 rounded-2xl space-y-2">
                                    <div className="flex items-center gap-2 text-xs font-bold text-gray-600">
                                        <User size={14} className="text-gray-400" />
                                        <span>{exp.user?.name}</span>
                                    </div>
                                    <div className="flex items-center gap-2 text-xs font-bold text-gray-600">
                                        <Truck size={14} className="text-gray-400" />
                                        <span>{exp.vehicle?.vehicleNumber}</span>
                                    </div>
                                    {exp.description && (
                                        <p className="text-xs text-gray-500 bg-white p-2 rounded-lg border border-gray-100 italic">
                                            "{exp.description}"
                                        </p>
                                    )}
                                    {exp.billImage && (
                                        <img 
                                            src={exp.billImage} 
                                            alt="Bill" 
                                            className="w-full h-32 object-cover rounded-xl mt-2 cursor-pointer hover:opacity-90 transition-opacity"
                                            onClick={() => setSelectedExpense(exp)}
                                        />
                                    )}
                                </div>

                                {exp.status === 'PENDING' ? (
                                    <div className="flex gap-2 pt-2">
                                        <button 
                                            onClick={() => handleAction(exp.id, 'APPROVED')}
                                            className="flex-1 bg-emerald-600 text-white py-3 rounded-xl font-black text-xs uppercase tracking-widest shadow-lg shadow-emerald-600/20 active:scale-95 transition-all flex items-center justify-center gap-2"
                                        >
                                            <Check size={16} strokeWidth={3} /> Approve
                                        </button>
                                        <button 
                                            onClick={() => handleAction(exp.id, 'REJECTED')}
                                            className="flex-1 bg-rose-50 text-rose-600 py-3 rounded-xl font-black text-xs uppercase tracking-widest border border-rose-100 active:scale-95 transition-all flex items-center justify-center gap-2"
                                        >
                                            <X size={16} strokeWidth={3} /> Reject
                                        </button>
                                    </div>
                                ) : (
                                    <div className={`py-3 px-4 rounded-xl text-center font-black text-xs uppercase tracking-[0.2em] border ${
                                        exp.status === 'APPROVED' ? 'bg-emerald-50 text-emerald-600 border-emerald-100' : 'bg-rose-50 text-rose-600 border-rose-100'
                                    }`}>
                                        {exp.status}
                                    </div>
                                )}
                            </div>
                        </div>
                    ))
                )}
            </div>
            </>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-4">
                    {categories.map(cat => (
                        <div key={cat.id} className="bg-white p-6 rounded-[2rem] border border-slate-100 shadow-sm space-y-3">
                            <div className="w-10 h-10 bg-slate-50 rounded-xl flex items-center justify-center text-slate-600">
                                <Receipt size={20} />
                            </div>
                            <div>
                                <h4 className="text-sm font-black uppercase tracking-tight text-slate-900">{cat.name}</h4>
                                <p className="text-[10px] font-bold text-slate-400">Monthly Limit: {cat.limit ? `₹${cat.limit.toLocaleString()}` : 'No Limit'}</p>
                            </div>
                            <div className="pt-2 border-t border-slate-50 flex items-center gap-2">
                                <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
                                <span className="text-[9px] font-black uppercase text-emerald-600">Active</span>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {/* Add Category Modal */}
            {showAddCategory && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
                    <div className="bg-white w-full max-w-sm rounded-[2rem] p-8 shadow-2xl animate-in zoom-in-95 duration-200 space-y-6">
                        <div className="flex items-center justify-between">
                            <h3 className="text-lg font-black text-gray-900 tracking-tight">New Expense Type</h3>
                            <button onClick={() => setShowAddCategory(false)} className="text-gray-400"><X size={20} /></button>
                        </div>
                        <form onSubmit={handleAddCategory} className="space-y-4">
                            <div className="space-y-1">
                                <label className="text-[10px] font-black uppercase tracking-widest text-gray-400 pl-1">Type Name</label>
                                <input 
                                    required
                                    placeholder="e.g. Fuel, Toll"
                                    value={newCategory.name}
                                    onChange={(e) => setNewCategory({...newCategory, name: e.target.value})}
                                    className="w-full bg-gray-50 border-none rounded-xl px-4 py-3 text-sm font-bold"
                                />
                            </div>
                            <div className="space-y-1">
                                <label className="text-[10px] font-black uppercase tracking-widest text-gray-400 pl-1">Monthly Limit (Optional)</label>
                                <input 
                                    type="number"
                                    placeholder="0"
                                    value={newCategory.limit}
                                    onChange={(e) => setNewCategory({...newCategory, limit: e.target.value})}
                                    className="w-full bg-gray-50 border-none rounded-xl px-4 py-3 text-sm font-bold"
                                />
                            </div>
                            <button className="w-full bg-slate-900 text-white py-4 rounded-xl font-black text-xs uppercase tracking-widest shadow-xl active:scale-[0.98] transition-all">
                                Create Expense Type
                            </button>
                        </form>
                    </div>
                </div>
            )}

            {/* Bill Image Preview Modal */}
            {selectedExpense && (
                <div className="fixed inset-0 z-[110] flex items-center justify-center bg-black/90 p-4" onClick={() => setSelectedExpense(null)}>
                    <div className="relative max-w-4xl max-h-screen">
                        <img src={selectedExpense.billImage} alt="Bill detail" className="max-w-full max-h-[90vh] object-contain" />
                        <button className="absolute top-4 right-4 text-white bg-white/20 p-2 rounded-full hover:bg-white/40 transition-all">
                            <X size={24} />
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
}

