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
    Plus,
    Building2,
    ChevronRight,
    ChevronLeft
} from 'lucide-react';
import { getAllExpenses, updateExpenseStatus, getExpenseCategories, createExpenseCategory } from '../../services/expenseService';
import { format } from 'date-fns';
import toast from 'react-hot-toast';
import { useUserStore } from '../../store/userStore';
import { useSearchParams, useLocation } from 'react-router-dom';
import adminAPI from '../../services/adminService';

export default function AdminExpenses() {
    const can = useUserStore(s => s.can);
    const [expenses, setExpenses] = useState([]);
    const [loading, setLoading] = useState(true);
    const [date, setDate] = useState(format(new Date(), 'yyyy-MM-dd'));
    const [statusFilter, setStatusFilter] = useState('');
    const [activeTab, setActiveTab] = useState('monitoring');
    const [categories, setCategories] = useState([]);
    const [showAddCategory, setShowAddCategory] = useState(false);
    const [newCategory, setNewCategory] = useState({ name: '', limit: '' });
    const [selectedExpense, setSelectedExpense] = useState(null);

    // Multi-branch state
    const [searchParams, setSearchParams] = useSearchParams();
    const storeId = searchParams.get('storeId');
    const [stores, setStores] = useState([]);
    const [branchStats, setBranchStats] = useState({});
    const user = useUserStore(s => s.user);
    const isGlobalRole = user?.role === 'TENANT_OWNER' || user?.role === 'SUPER_ADMIN' || (user?.role === 'ADMIN' && !user?.customRoleId) || user?.portalType === 'ADMIN';

    useEffect(() => {
        const fetchStores = async () => {
            if (isGlobalRole && !storeId) {
                try {
                    const res = await adminAPI.getStores();
                    const storeData = res.data?.success ? res.data.data : (res.data || []);
                    setStores(storeData);

                    // Auto-select if only one store exists
                    if (storeData.length === 1 && !storeId) {
                        setSearchParams({ storeId: storeData[0].id });
                    }

                    // Fetch stats for overview
                    const stats = {};
                    await Promise.all(storeData.map(async (s) => {
                        try {
                            const data = await getAllExpenses({ storeId: s.id, date });
                            stats[s.id] = {
                                count: data.length,
                                total: data.reduce((sum, e) => sum + e.amount, 0),
                                pending: data.filter(e => e.status === 'PENDING').length
                            };
                        } catch (e) {
                            stats[s.id] = { count: 0, total: 0, pending: 0 };
                        }
                    }));
                    setBranchStats(stats);
                } catch (err) {
                    console.error('Error fetching stores:', err);
                }
            }
        };
        fetchStores();
    }, [isGlobalRole, storeId, date]);

    useEffect(() => {
        if (!isGlobalRole && !storeId && user?.storeId) {
            setSearchParams({ storeId: user.storeId });
        }
    }, [isGlobalRole, storeId, user]);

    useEffect(() => {
        if (!storeId && isGlobalRole) return;
        
        if (activeTab === 'monitoring') {
            loadExpenses();
        } else {
            loadCategories();
        }
    }, [date, statusFilter, activeTab, storeId]);

    const loadExpenses = async () => {
        setLoading(true);
        // Clear previous data
        setExpenses([]);
        try {
            const data = await getAllExpenses({ date, status: statusFilter, storeId });
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

    if (isGlobalRole && !storeId) {
        return (
            <div className="space-y-6 animate-in fade-in duration-700">
                <div className="flex flex-col gap-1">
                    <h2 className="text-3xl font-black text-gray-900 tracking-tight">Organization Expenses</h2>
                    <p className="text-sm font-medium text-gray-500 uppercase tracking-widest italic">Global Expenditure Monitoring & Approval Pipeline</p>
                </div>

                <div className="bg-white rounded-3xl border border-gray-100 shadow-sm overflow-hidden">
                  <table className="w-full text-left">
                    <thead>
                      <tr className="bg-gray-50/50">
                        <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-gray-400">Branch Details</th>
                        <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-gray-400 text-center">Total Expenditure</th>
                        <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-gray-400 text-center">Requests</th>
                        <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-gray-400 text-center">Pending Review</th>
                        <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-gray-400 text-right">Action</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-50">
                      {stores.map(store => {
                        const stats = branchStats[store.id] || { count: 0, total: 0, pending: 0 };
                        return (
                          <tr 
                            key={store.id} 
                            onClick={() => setSearchParams({ storeId: store.id })}
                            className="hover:bg-emerald-50/30 transition-all cursor-pointer group"
                          >
                            <td className="px-6 py-4">
                              <div className="flex items-center gap-4">
                                <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center group-hover:bg-emerald-600 group-hover:text-white transition-all duration-300">
                                  <Building2 size={20} />
                                </div>
                                <div className="flex flex-col">
                                  <span className="text-sm font-black text-gray-900 group-hover:text-emerald-600 transition-colors">{store.name}</span>
                                  <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest leading-none mt-1">{store.code || 'BRANCH'}</span>
                                </div>
                              </div>
                            </td>
                            <td className="px-6 py-4 text-center">
                              <span className="text-sm font-black text-gray-900">₹{stats.total.toLocaleString()}</span>
                            </td>
                            <td className="px-6 py-4 text-center">
                              <span className="text-[10px] font-black text-gray-500 bg-gray-100 px-2.5 py-1 rounded-md">{stats.count} REQS</span>
                            </td>
                            <td className="px-6 py-4 text-center">
                              <span className={`text-[9px] font-black uppercase px-3 py-1 rounded-full border ${
                                stats.pending > 0 ? 'bg-orange-50 text-orange-600 border-orange-100' : 'bg-emerald-50 text-emerald-600 border-emerald-100'
                              }`}>
                                {stats.pending} Pending
                              </span>
                            </td>
                            <td className="px-6 py-4 text-right">
                              <div className="flex justify-end">
                                <div className="w-8 h-8 rounded-full bg-gray-50 text-gray-400 flex items-center justify-center group-hover:bg-emerald-600 group-hover:text-white transition-all">
                                  <ChevronRight size={14} strokeWidth={3} />
                                </div>
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
            </div>
        );
    }

    return (
        <div key={storeId} className="space-y-6">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="flex flex-col gap-1">
                    <div className="flex items-center gap-3">
                        {isGlobalRole && storeId && stores.length > 1 && (
                            <button
                                onClick={() => setSearchParams({})}
                                className="p-2.5 bg-white border border-gray-100 rounded-xl text-gray-400 hover:text-emerald-600 hover:border-emerald-100 transition-all shadow-sm active:scale-90"
                            >
                                <ChevronLeft size={18} />
                            </button>
                        )}
                        <h2 className="text-2xl font-bold text-gray-900">
                            {(() => {
                                const selectedStore = stores.find(s => s.id === storeId);
                                return selectedStore ? `${selectedStore.name} Expenses` : 'Expense Monitoring';
                            })()}
                        </h2>
                    </div>
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
                
                {activeTab === 'categories' && can('EXPENSES', 'CREATE') && (
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

                    <div className="space-y-4">
                        {loading ? (
                            <div className="flex flex-col items-center justify-center py-32 text-gray-400 gap-4">
                                <Loader2 className="animate-spin text-emerald-600" size={48} />
                                <p className="font-black italic uppercase tracking-widest text-xs">Synchronizing Field Data...</p>
                            </div>
                        ) : expenses.length === 0 ? (
                            <div className="bg-white rounded-[2.5rem] p-24 border border-dashed border-gray-200 text-center space-y-4 shadow-inner">
                                <Receipt size={64} className="mx-auto text-gray-100" />
                                <div className="space-y-1">
                                    <h3 className="text-xl font-black text-gray-300">No Expenses Recorded</h3>
                                    <p className="text-sm text-gray-400 font-bold uppercase tracking-tighter">Everything clear for this range</p>
                                </div>
                            </div>
                        ) : (
                            <>
                        <div className="bg-white rounded-[2rem] border border-gray-100 shadow-sm overflow-hidden mb-6">
                          <div className="overflow-x-auto">
                            <table className="w-full text-left border-collapse min-w-[800px] md:min-w-full">
                              <thead>
                                <tr className="bg-gray-50/50">
                                  <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-gray-400">Preview</th>
                                  <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-gray-400">Expense Type</th>
                                  <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-gray-400 text-center">Reference ID</th>
                                  <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-gray-400 text-center">Payment</th>
                                  <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-gray-400 text-center">Time</th>
                                  <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-gray-400 text-center">Field Staff</th>
                                  <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-gray-400 text-center">Amount</th>
                                  <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-gray-400 text-center">Status</th>
                                  <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-gray-400 text-right">Actions</th>
                                </tr>
                              </thead>
                              <tbody className="divide-y divide-gray-50">
                                {expenses.map((exp) => (
                                  <tr key={exp.id} className="hover:bg-gray-50/30 transition-colors group">
                                    <td className="px-4 py-2 border-r border-gray-50 group-hover:border-transparent whitespace-nowrap">
                                      <div 
                                        className={`w-8 h-8 rounded-lg flex items-center justify-center cursor-pointer transition-transform hover:scale-105 shadow-sm ${exp.billImage ? 'bg-emerald-50 border border-emerald-100' : 'bg-gray-100 border border-gray-200'}`}
                                        onClick={() => exp.billImage && setSelectedExpense(exp)}
                                      >
                                        {exp.billImage ? <Eye size={14} className="text-emerald-600" /> : <Receipt size={14} className="text-gray-400" />}
                                      </div>
                                    </td>
                                    <td className="px-4 py-2 border-r border-gray-50 group-hover:border-transparent whitespace-nowrap">
                                      <span className="text-[11px] font-black text-gray-900 tracking-tight">{exp.type}</span>
                                    </td>
                                    <td className="px-4 py-2 text-center border-r border-gray-50 group-hover:border-transparent whitespace-nowrap">
                                      {exp.displayId ? (
                                        <span className="text-[8px] font-black text-teal-600 bg-teal-50 px-1.5 py-0.5 rounded-md border border-teal-100 tracking-wider">
                                          {exp.displayId}
                                        </span>
                                      ) : (
                                        <span className="text-[8px] font-bold text-gray-300">--</span>
                                      )}
                                    </td>
                                    <td className="px-4 py-2 text-center border-r border-gray-50 group-hover:border-transparent whitespace-nowrap">
                                      <span className={`text-[7px] font-black uppercase tracking-widest px-1.5 py-0.5 rounded-md border ${exp.paymentMode === 'CASH' ? 'bg-emerald-50 text-emerald-600 border-emerald-100' : 'bg-blue-50 text-blue-600 border-blue-100'}`}>
                                        {exp.paymentMode}
                                      </span>
                                    </td>
                                    <td className="px-4 py-2 text-center border-r border-gray-50 group-hover:border-transparent whitespace-nowrap">
                                      <span className="text-[9px] font-black text-gray-400 uppercase">{format(new Date(exp.createdAt), 'hh:mm a')}</span>
                                    </td>
                                    <td className="px-4 py-2 text-center border-r border-gray-50 group-hover:border-transparent whitespace-nowrap">
                                      <div className="flex items-center justify-center gap-2">
                                        <span className="text-[10px] font-black text-gray-700">{exp.user?.name}</span>
                                        <span className="text-[8px] font-black text-blue-600 bg-blue-50 px-1.5 py-0.5 rounded-md border border-blue-100 uppercase">
                                          {exp.vehicle?.vehicleNumber}
                                        </span>
                                      </div>
                                    </td>
                                    <td className="px-4 py-2 text-center border-r border-gray-50 group-hover:border-transparent whitespace-nowrap">
                                      <span className="text-[11px] font-black text-gray-900">₹{exp.amount.toLocaleString()}</span>
                                    </td>
                                    <td className="px-4 py-2 text-center border-r border-gray-50 group-hover:border-transparent whitespace-nowrap">
                                      <span className={`inline-flex px-2 py-0.5 rounded-full text-[7px] font-black uppercase tracking-widest border ${
                                        exp.status === 'APPROVED' ? 'bg-emerald-50 text-emerald-600 border-emerald-100' : 
                                        exp.status === 'REJECTED' ? 'bg-rose-50 text-rose-600 border-rose-100' : 'bg-orange-50 text-orange-600 border-orange-100'
                                      }`}>
                                        {exp.status}
                                      </span>
                                    </td>
                                    <td className="px-4 py-2 text-right whitespace-nowrap">
                                      {exp.status === 'PENDING' ? (
                                        <div className="flex items-center justify-end gap-1.5">
                                          {can('EXPENSES', 'UPDATE') ? (
                                            <>
                                              <button 
                                                onClick={() => handleAction(exp.id, 'APPROVED')}
                                                className="p-1.5 bg-emerald-50 text-emerald-600 rounded-lg hover:bg-emerald-600 hover:text-white transition-all border border-emerald-50"
                                              >
                                                <Check size={12} strokeWidth={4} />
                                              </button>
                                              <button 
                                                onClick={() => handleAction(exp.id, 'REJECTED')}
                                                className="p-1.5 bg-rose-50 text-rose-600 rounded-lg hover:bg-rose-600 hover:text-white transition-all border border-rose-50"
                                              >
                                                <X size={12} strokeWidth={4} />
                                              </button>
                                            </>
                                          ) : (
                                            <span className="text-[7px] font-black text-orange-400 uppercase tracking-widest px-1.5 py-0.5 bg-orange-50 rounded-md">Pending</span>
                                          )}
                                        </div>
                                      ) : (
                                        <div className="text-[7px] font-black text-gray-300 uppercase tracking-widest">
                                          Done
                                        </div>
                                      )}
                                    </td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        </div>
                            </>
                        )}
                    </div>
                </>
            ) : (
                <div className="space-y-6">
                    <div className="bg-white rounded-3xl border border-gray-100 shadow-sm overflow-hidden">
                      <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse min-w-[600px] md:min-w-full">
                          <thead>
                            <tr className="bg-gray-50/50">
                              <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-gray-400">Category Name</th>
                              <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-gray-400 text-center">Monthly Limit</th>
                              <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-gray-400 text-center">Status</th>
                              <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-gray-400 text-right">Actions</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-gray-50">
                            {categories.map(cat => (
                              <tr key={cat.id} className="hover:bg-emerald-50/10 transition-colors">
                                <td className="px-6 py-4">
                                  <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 bg-gray-50 rounded-xl flex items-center justify-center text-gray-400 border border-gray-100">
                                      <Receipt size={20} />
                                    </div>
                                    <span className="text-sm font-black text-gray-900 tracking-tight">{cat.name}</span>
                                  </div>
                                </td>
                                <td className="px-6 py-4 text-center">
                                  <span className={`text-sm font-black ${cat.limit ? 'text-gray-900' : 'text-gray-300 italic'}`}>
                                    {cat.limit ? `₹${cat.limit.toLocaleString()}` : 'No Limit Set'}
                                  </span>
                                </td>
                                <td className="px-6 py-4 text-center">
                                  <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-emerald-50 text-emerald-600 rounded-full text-[9px] font-black uppercase tracking-widest border border-emerald-100">
                                    <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                                    Active
                                  </span>
                                </td>
                                <td className="px-6 py-4 text-right">
                                  {can('EXPENSES', 'UPDATE') && (
                                    <button className="p-2 text-gray-300 hover:text-emerald-600 transition-colors">
                                      <Settings size={16} />
                                    </button>
                                  )}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
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

