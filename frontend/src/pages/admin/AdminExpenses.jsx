import React, { useState, useEffect } from 'react';
import { Receipt, CheckCircle2, XCircle, Eye, Clock, User, Truck, Calendar, Loader2, Check, X, Plus, RotateCcw, ShieldCheck, Lock, ChevronDown, Filter, BarChart3, Settings, Trash2, Edit } from 'lucide-react';
import { getAllExpenses, updateExpenseStatus, bulkUpdateExpenseStatus, getExpenseCategories, createExpenseCategory, updateExpenseCategory, deleteExpenseCategory } from '../../services/expenseService';
import ExpenseAnalytics from './ExpenseAnalytics';
import { format } from 'date-fns';
import toast from 'react-hot-toast';
import { useUserStore } from '../../store/userStore';

const STATUS_STYLES = {
    PENDING:      'bg-orange-50 text-orange-600 border-orange-100',
    APPROVED:     'bg-emerald-50 text-emerald-600 border-emerald-100',
    REJECTED:     'bg-rose-50 text-rose-600 border-rose-100',
    PAID:         'bg-blue-50 text-blue-600 border-blue-100',
};

const ALL_STATUSES = ['', 'PENDING', 'APPROVED', 'REJECTED', 'PAID'];

export default function AdminExpenses() {
    const can = useUserStore(s => s.can);
    const [expenses, setExpenses] = useState([]);
    const [loading, setLoading] = useState(true);
    const [date, setDate] = useState(format(new Date(), 'yyyy-MM-dd'));
    const [statusFilter, setStatusFilter] = useState('');
    const [paymentFilter, setPaymentFilter] = useState('');
    const [activeTab, setActiveTab] = useState('monitoring');
    const [categories, setCategories] = useState([]);
    const [selectedExpense, setSelectedExpense] = useState(null);
    const [selected, setSelected] = useState([]);
    const [actionModal, setActionModal] = useState(null); // { expenseId, action }
    const [remarks, setRemarks] = useState('');
    const [approverName, setApproverName] = useState('');
    const [catForm, setCatForm] = useState(null); // null | { id?, name, limit }
    const [catSaving, setCatSaving] = useState(false);

    useEffect(() => {
        if (activeTab === 'monitoring') loadExpenses();
        else if (activeTab === 'categories') loadCategories();
        setSelected([]);
    }, [date, statusFilter, paymentFilter, activeTab]);

    const loadExpenses = async () => {
        setLoading(true);
        try {
            const params = { date, status: statusFilter };
            if (paymentFilter) params.paymentMode = paymentFilter;
            setExpenses(await getAllExpenses(params));
        } catch { toast.error('Failed to load expenses'); }
        finally { setLoading(false); }
    };

    const loadCategories = async () => {
        setLoading(true);
        try { setCategories(await getExpenseCategories()); }
        catch { toast.error('Failed to load categories'); }
        finally { setLoading(false); }
    };

    const handleAction = async (id, status, extra = {}) => {
        try {
            await updateExpenseStatus(id, status, extra);
            toast.success(`Expense ${status.toLowerCase()}`);
            setActionModal(null); setRemarks(''); setApproverName('');
            loadExpenses();
        } catch (e) { toast.error(e?.response?.data?.message || 'Failed'); }
    };

    const handleBulkAction = async (status) => {
        if (!selected.length) return;
        try {
            await bulkUpdateExpenseStatus(selected, status);
            toast.success(`${selected.length} expenses ${status.toLowerCase()}`);
            setSelected([]);
            loadExpenses();
        } catch (e) { toast.error(e?.response?.data?.message || 'Bulk action failed'); }
    };

    const toggleSelect = (id) => setSelected(p => p.includes(id) ? p.filter(x => x !== id) : [...p, id]);
    const toggleAll = () => setSelected(selected.length === expenses.length ? [] : expenses.map(e => e.id));

    const handleSaveCat = async (e) => {
        e.preventDefault();
        setCatSaving(true);
        try {
            if (catForm.id) {
                await updateExpenseCategory(catForm.id, { name: catForm.name, limit: catForm.limit });
                toast.success('Category updated');
            } else {
                await createExpenseCategory({ name: catForm.name, limit: catForm.limit });
                toast.success('Category created');
            }
            setCatForm(null);
            loadCategories();
        } catch (e) { toast.error(e?.response?.data?.message || 'Failed to save'); }
        finally { setCatSaving(false); }
    };

    const handleDeleteCat = async (id) => {
        if (!confirm('Deactivate this category?')) return;
        try { await deleteExpenseCategory(id); toast.success('Deactivated'); loadCategories(); }
        catch { toast.error('Failed'); }
    };

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h2 className="text-2xl font-black text-gray-900 tracking-tight">Expenses</h2>
                    <p className="text-sm text-gray-500 mt-0.5">Enterprise expense lifecycle management</p>
                </div>
                {activeTab === 'monitoring' && (
                    <div className="flex flex-wrap items-center gap-2">
                        <div className="flex items-center gap-2 bg-white border border-gray-100 rounded-2xl px-3 py-2 shadow-sm">
                            <Calendar size={16} className="text-emerald-500" />
                            <input type="date" value={date} onChange={e => setDate(e.target.value)}
                                className="bg-transparent border-none focus:outline-none text-sm font-bold text-gray-700" />
                        </div>
                        <select value={paymentFilter} onChange={e => setPaymentFilter(e.target.value)}
                            className="bg-white border border-gray-100 rounded-2xl px-3 py-2 text-xs font-black text-gray-600 shadow-sm outline-none">
                            <option value="">All Modes</option>
                            <option value="CASH">Cash</option>
                            <option value="PERSONAL_CASH">Personal Cash</option>
                            <option value="UPI">UPI</option>
                        </select>
                    </div>
                )}
                {activeTab === 'categories' && can('EXPENSES', 'CREATE') && (
                    <button onClick={() => setCatForm({ name: '', limit: '' })}
                        className="flex items-center gap-2 bg-emerald-600 text-white px-5 py-2.5 rounded-2xl font-bold text-sm hover:bg-emerald-700 transition-all shadow-lg shadow-emerald-600/20">
                        <Plus size={16} /> Add Category
                    </button>
                )}
            </div>

            {/* Tabs */}
            <div className="flex gap-1 bg-gray-100 p-1 rounded-2xl w-fit">
                {[['monitoring','Monitoring'],['analytics','Analytics'],['categories','Categories']].map(([k,l]) => (
                    <button key={k} onClick={() => setActiveTab(k)}
                        className={`px-5 py-2 rounded-xl text-xs font-black uppercase tracking-wider transition-all ${activeTab===k ? 'bg-white text-emerald-600 shadow-sm' : 'text-gray-400'}`}>
                        {l}
                    </button>
                ))}
            </div>

            {activeTab === 'analytics' && <ExpenseAnalytics />}

            {activeTab === 'monitoring' && (
                <>
                    {/* Status Filters */}
                    <div className="flex flex-wrap gap-2">
                        {ALL_STATUSES.map(s => (
                            <button key={s} onClick={() => setStatusFilter(s)}
                                className={`px-3 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all border ${statusFilter===s ? 'bg-slate-900 text-white border-slate-900' : 'bg-white text-slate-400 border-slate-100'}`}>
                                {s || 'All'}
                            </button>
                        ))}
                    </div>

                    {/* Bulk Actions */}
                    {selected.length > 0 && (
                        <div className="flex items-center gap-3 bg-slate-900 text-white px-5 py-3 rounded-2xl shadow-lg">
                            <span className="text-xs font-black">{selected.length} selected</span>
                            <div className="flex gap-2 ml-auto">
                                {can('EXPENSES','UPDATE') && (
                                    <>
                                        <button onClick={() => handleBulkAction('APPROVED')}
                                            className="px-4 py-1.5 bg-emerald-500 rounded-xl text-[10px] font-black uppercase hover:bg-emerald-400 transition-all">Approve All</button>
                                        <button onClick={() => handleBulkAction('REJECTED')}
                                            className="px-4 py-1.5 bg-rose-500 rounded-xl text-[10px] font-black uppercase hover:bg-rose-400 transition-all">Reject All</button>
                                        <button onClick={() => handleBulkAction('PAID')}
                                            className="px-4 py-1.5 bg-blue-600 rounded-xl text-[10px] font-black uppercase hover:bg-blue-500 transition-all">Pay All</button>
                                    </>
                                )}
                                <button onClick={() => setSelected([])} className="p-1.5 hover:bg-white/10 rounded-lg"><X size={14} /></button>
                            </div>
                        </div>
                    )}

                    {loading ? (
                        <div className="flex items-center justify-center py-32 gap-4 flex-col text-gray-400">
                            <Loader2 className="animate-spin text-emerald-600" size={40} />
                            <p className="font-black text-xs uppercase tracking-widest italic">Loading expenses...</p>
                        </div>
                    ) : expenses.length === 0 ? (
                        <div className="bg-white rounded-[2.5rem] p-24 border border-dashed border-gray-200 text-center shadow-inner">
                            <Receipt size={56} className="mx-auto text-gray-100 mb-4" />
                            <h3 className="text-xl font-black text-gray-200">No Expenses</h3>
                        </div>
                    ) : (
                        <div className="bg-white rounded-3xl border border-gray-100 shadow-sm overflow-hidden">
                            <table className="w-full text-left">
                                <thead>
                                    <tr className="bg-gray-50/50">
                                        <th className="px-4 py-4">
                                            <input type="checkbox" checked={selected.length === expenses.length && expenses.length > 0}
                                                onChange={toggleAll} className="rounded" />
                                        </th>
                                        <th className="px-4 py-4 text-[10px] font-black uppercase tracking-widest text-gray-400">Expense</th>
                                        <th className="px-4 py-4 text-[10px] font-black uppercase tracking-widest text-gray-400 text-center">Agent</th>
                                        <th className="px-4 py-4 text-[10px] font-black uppercase tracking-widest text-gray-400 text-center">Amount</th>
                                        <th className="px-4 py-4 text-[10px] font-black uppercase tracking-widest text-gray-400 text-center">Status</th>
                                        <th className="px-4 py-4 text-[10px] font-black uppercase tracking-widest text-gray-400 text-right">Actions</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-50">
                                    {expenses.map(exp => (
                                        <tr key={exp.id} className="hover:bg-gray-50/30 transition-colors">
                                            <td className="px-4 py-4">
                                                <input type="checkbox" checked={selected.includes(exp.id)}
                                                    onChange={() => toggleSelect(exp.id)} className="rounded" />
                                            </td>
                                            <td className="px-4 py-4">
                                                <div className="flex items-center gap-3">
                                                    <div className="w-10 h-10 rounded-xl bg-gray-50 flex items-center justify-center cursor-pointer border border-gray-100"
                                                        onClick={() => exp.billImage && setSelectedExpense(exp)}>
                                                        {exp.billImage ? <Eye size={16} className="text-emerald-600"/> : <Receipt size={16} className="text-gray-300"/>}
                                                    </div>
                                                    <div>
                                                        <p className="text-sm font-black text-gray-900">{exp.type}</p>
                                                        {exp.displayId && <span className="text-[9px] font-black text-teal-600 bg-teal-50 px-1.5 py-0.5 rounded">{exp.displayId}</span>}
                                                        <div className="flex items-center gap-1.5 mt-0.5">
                                                            <span className={`text-[8px] font-black uppercase px-1.5 py-0.5 rounded border ${exp.paymentMode==='CASH'?'bg-emerald-50 text-emerald-600 border-emerald-100':exp.paymentMode==='PERSONAL_CASH'?'bg-purple-50 text-purple-600 border-purple-100':'bg-blue-50 text-blue-600 border-blue-100'}`}>
                                                                {exp.paymentMode}
                                                            </span>
                                                            <span className="text-[9px] text-gray-400 font-bold">{format(new Date(exp.createdAt),'hh:mm a')}</span>
                                                        </div>
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="px-4 py-4 text-center">
                                                <p className="text-xs font-black text-gray-700">{exp.user?.name}</p>
                                                {exp.vehicle && <p className="text-[9px] font-bold text-blue-500 uppercase">{exp.vehicle.vehicleNumber}</p>}
                                            </td>
                                            <td className="px-4 py-4 text-center">
                                                <span className="text-sm font-black text-gray-900">₹{exp.amount.toLocaleString()}</span>
                                            </td>
                                            <td className="px-4 py-4 text-center">
                                                <span className={`inline-flex px-3 py-1 rounded-full text-[9px] font-black uppercase border ${STATUS_STYLES[exp.status]||'bg-gray-50 text-gray-400 border-gray-100'}`}>
                                                    {exp.status}
                                                </span>
                                            </td>
                                            <td className="px-4 py-4">
                                                <div className="flex items-center justify-end gap-1.5">
                                                    {can('EXPENSES','UPDATE') && exp.status === 'PENDING' && (
                                                        <>
                                                            <button onClick={() => setActionModal({expenseId:exp.id,action:'APPROVED'})}
                                                                className="p-2 bg-emerald-50 text-emerald-600 rounded-xl hover:bg-emerald-600 hover:text-white transition-all border border-emerald-100" title="Approve">
                                                                <Check size={14} strokeWidth={3}/>
                                                            </button>
                                                            <button onClick={() => setActionModal({expenseId:exp.id,action:'REJECTED', isReturn: true})}
                                                                className="p-2 bg-purple-50 text-purple-600 rounded-xl hover:bg-purple-600 hover:text-white transition-all border border-purple-100" title="Return">
                                                                <RotateCcw size={14}/>
                                                            </button>
                                                            <button onClick={() => handleAction(exp.id,'REJECTED')}
                                                                className="p-2 bg-rose-50 text-rose-600 rounded-xl hover:bg-rose-600 hover:text-white transition-all border border-rose-100" title="Reject">
                                                                <X size={14} strokeWidth={3}/>
                                                            </button>
                                                        </>
                                                    )}
                                                    {can('EXPENSES','UPDATE') && exp.status === 'APPROVED' && (
                                                        <button onClick={() => setActionModal({expenseId:exp.id,action:'PAID'})}
                                                            className="p-2 bg-blue-50 text-blue-600 rounded-xl hover:bg-blue-600 hover:text-white transition-all border border-blue-100" title="Mark Paid">
                                                            <ShieldCheck size={14}/>
                                                        </button>
                                                    )}
                                                    {!['PENDING','APPROVED'].includes(exp.status) && (
                                                        <span className="text-[9px] text-gray-300 font-black uppercase">—</span>
                                                    )}
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </>
            )}

            {activeTab === 'categories' && (
                <div className="space-y-4">
                    {catForm && (
                        <div className="bg-white rounded-3xl border border-emerald-100 shadow-sm p-6">
                            <h4 className="text-sm font-black text-gray-900 mb-4">{catForm.id ? 'Edit' : 'New'} Category</h4>
                            <form onSubmit={handleSaveCat} className="flex flex-col sm:flex-row gap-3">
                                <input required placeholder="Category name (e.g. Fuel)" value={catForm.name}
                                    onChange={e => setCatForm(p=>({...p,name:e.target.value}))}
                                    className="flex-1 bg-gray-50 rounded-xl px-4 py-3 text-sm font-bold outline-none focus:ring-2 focus:ring-emerald-500/20" />
                                <input type="number" placeholder="Limit ₹ (optional)" value={catForm.limit}
                                    onChange={e => setCatForm(p=>({...p,limit:e.target.value}))}
                                    className="w-40 bg-gray-50 rounded-xl px-4 py-3 text-sm font-bold outline-none focus:ring-2 focus:ring-emerald-500/20" />
                                <button type="submit" disabled={catSaving}
                                    className="px-6 py-3 bg-emerald-600 text-white rounded-xl font-black text-xs uppercase tracking-widest hover:bg-emerald-700 transition-all disabled:opacity-50">
                                    {catSaving ? 'Saving...' : (catForm.id ? 'Update' : 'Create')}
                                </button>
                                <button type="button" onClick={() => setCatForm(null)}
                                    className="px-4 py-3 bg-gray-100 text-gray-500 rounded-xl font-black text-xs hover:bg-gray-200 transition-all">
                                    Cancel
                                </button>
                            </form>
                        </div>
                    )}
                    <div className="bg-white rounded-3xl border border-gray-100 shadow-sm overflow-hidden">
                        {loading ? (
                            <div className="flex items-center justify-center py-16"><Loader2 className="animate-spin text-emerald-600" size={28}/></div>
                        ) : (
                            <table className="w-full text-left">
                                <thead>
                                    <tr className="bg-gray-50">
                                        <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-gray-400">Name</th>
                                        <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-gray-400 text-center">Limit</th>
                                        <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-gray-400 text-right">Actions</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-50">
                                    {categories.map(cat => (
                                        <tr key={cat.id} className="hover:bg-gray-50/30">
                                            <td className="px-6 py-4 text-sm font-black text-gray-900">{cat.name}</td>
                                            <td className="px-6 py-4 text-center text-sm font-black text-gray-600">
                                                {cat.limit ? `₹${cat.limit.toLocaleString()}` : <span className="text-gray-300 italic text-xs">No limit</span>}
                                            </td>
                                            <td className="px-6 py-4 text-right">
                                                <div className="flex items-center justify-end gap-2">
                                                    {can('EXPENSES','UPDATE') && (
                                                        <button onClick={() => setCatForm({id:cat.id,name:cat.name,limit:cat.limit||''})}
                                                            className="p-2 text-emerald-600 hover:bg-emerald-50 rounded-xl transition-all"><Edit size={14}/></button>
                                                    )}
                                                    {can('EXPENSES','DELETE') && (
                                                        <button onClick={() => handleDeleteCat(cat.id)}
                                                            className="p-2 text-rose-400 hover:bg-rose-50 rounded-xl transition-all"><Trash2 size={14}/></button>
                                                    )}
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                                    {categories.length === 0 && (
                                        <tr><td colSpan={3} className="py-16 text-center text-xs font-black text-gray-300 uppercase tracking-widest">No categories yet</td></tr>
                                    )}
                                </tbody>
                            </table>
                        )}
                    </div>
                </div>
            )}

            {/* Actions Modal */}
            {actionModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
                    <div className="bg-white w-full max-w-sm rounded-3xl p-6 shadow-2xl space-y-4 animate-in zoom-in-95">
                        <div className="flex items-center gap-3">
                            <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                                actionModal.action === 'APPROVED' ? 'bg-emerald-50 text-emerald-600' : 
                                actionModal.action === 'PAID' ? 'bg-blue-50 text-blue-600' : 'bg-purple-50 text-purple-600'
                            }`}>
                                {actionModal.action === 'APPROVED' ? <Check size={20}/> : actionModal.action === 'PAID' ? <ShieldCheck size={20}/> : <RotateCcw size={20}/>}
                            </div>
                            <div>
                                <h3 className="text-base font-black text-gray-900">
                                    {actionModal.isReturn ? 'Return for Revision' : actionModal.action === 'APPROVED' ? 'Confirm Approval' : 'Confirm Payment'}
                                </h3>
                                <p className="text-[10px] text-gray-500 font-bold uppercase tracking-widest">
                                    {actionModal.isReturn ? 'Request changes from agent' : 'Provide verification details'}
                                </p>
                            </div>
                        </div>

                        {(actionModal.action === 'APPROVED' || actionModal.action === 'PAID') && (
                            <div className="space-y-1.5">
                                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Approver Name</label>
                                <input type="text" value={approverName} onChange={e => setApproverName(e.target.value)}
                                    placeholder="Enter person's name..."
                                    className="w-full bg-gray-50 rounded-xl px-4 py-3 text-sm font-bold outline-none focus:ring-2 focus:ring-slate-500/20" />
                            </div>
                        )}

                        <div className="space-y-1.5">
                            <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">
                                {actionModal.isReturn ? 'Reason for Return' : 'Internal Remarks (Optional)'}
                            </label>
                            <textarea rows={2} value={remarks} onChange={e => setRemarks(e.target.value)}
                                placeholder={actionModal.isReturn ? "Explain why you are returning this..." : "Add any notes for the record..."}
                                className="w-full bg-gray-50 rounded-xl px-4 py-3 text-sm font-bold resize-none outline-none focus:ring-2 focus:ring-slate-500/20" />
                        </div>

                        <div className="flex gap-3 pt-2">
                            <button onClick={() => handleAction(actionModal.expenseId, actionModal.action, { remarks, approverName })}
                                className={`flex-1 text-white py-3 rounded-xl font-black text-xs uppercase tracking-widest transition-all ${
                                    actionModal.action === 'APPROVED' ? 'bg-emerald-600 hover:bg-emerald-700' : 
                                    actionModal.action === 'PAID' ? 'bg-blue-600 hover:bg-blue-700' : 'bg-purple-600 hover:bg-purple-700'
                                }`}>
                                {actionModal.isReturn ? 'Send Back' : 'Confirm'}
                            </button>
                            <button onClick={() => { setActionModal(null); setRemarks(''); setApproverName(''); }}
                                className="px-4 bg-gray-100 text-gray-600 rounded-xl font-black text-xs hover:bg-gray-200">
                                Cancel
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Bill Preview */}
            {selectedExpense && (
                <div className="fixed inset-0 z-[110] flex items-center justify-center bg-black/90 p-4" onClick={() => setSelectedExpense(null)}>
                    <div className="relative max-w-4xl max-h-screen">
                        <img src={selectedExpense.billImage} alt="Bill" className="max-w-full max-h-[90vh] object-contain rounded-2xl"/>
                        <button className="absolute top-3 right-3 bg-white/20 p-2 rounded-full hover:bg-white/40 text-white"><X size={20}/></button>
                    </div>
                </div>
            )}
        </div>
    );
}
