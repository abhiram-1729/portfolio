import React, { useState, useEffect } from 'react';
import { 
    ArrowLeft, 
    Upload, 
    Camera, 
    X, 
    Loader2, 
    Receipt, 
    User, 
    Calendar, 
    CreditCard, 
    Info,
    ChevronDown,
    Image as ImageIcon,
    FileText
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { getExpenseCategories, addExpense } from '../services/expenseService';
import toast from 'react-hot-toast';
import { useUserStore } from '../store/userStore';
import { format } from 'date-fns';

export default function CreateExpense() {
    const navigate = useNavigate();
    const currentUser = useUserStore(s => s.user);
    
    const [loading, setLoading] = useState(false);
    const [categories, setCategories] = useState([]);
    const [allRawCategories, setAllRawCategories] = useState([]);
    
    const [form, setForm] = useState({
        mainCategory: '',
        subCategory: '',
        paidTo: '',
        paidDate: format(new Date(), 'yyyy-MM-dd'),
        billDate: format(new Date(), 'yyyy-MM-dd'),
        amount: '',
        paymentMode: 'CASH',
        description: '',
        billFile: null,
        previewUrl: null
    });

    useEffect(() => {
        fetchCategories();
    }, []);

    const fetchCategories = async () => {
        try {
            const data = await getExpenseCategories();
            setAllRawCategories(data);
            
            // Extract unique main categories
            const mainCats = [...new Set(data.map(c => c.name.split(' | ')[0]))];
            setCategories(mainCats);
        } catch (error) {
            toast.error('Failed to load categories');
        }
    };

    const handleMainCategoryChange = (val) => {
        setForm(prev => ({ ...prev, mainCategory: val, subCategory: '' }));
    };

    const getSubCategories = () => {
        if (!form.mainCategory) return [];
        return allRawCategories
            .filter(c => c.name.startsWith(form.mainCategory + ' | '))
            .map(c => c.name.split(' | ')[1]);
    };

    const handleFileChange = (e) => {
        const file = e.target.files[0];
        if (file) {
            setForm(prev => ({ ...prev, billFile: file, previewUrl: URL.createObjectURL(file) }));
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        
        if (!form.mainCategory || !form.subCategory || !form.amount || !form.paidTo) {
            return toast.error('Please fill all mandatory fields');
        }

        setLoading(true);
        try {
            const formData = new FormData();
            formData.append('type', `${form.mainCategory} | ${form.subCategory}`);
            formData.append('amount', form.amount);
            formData.append('paymentMode', form.paymentMode);
            formData.append('description', form.description);
            formData.append('paidTo', form.paidTo);
            formData.append('paidDate', form.paidDate);
            formData.append('billDate', form.billDate);
            
            if (form.billFile) {
                formData.append('billImage', form.billFile);
            }

            await addExpense(formData);
            toast.success('Expense request submitted successfully!');
            navigate('/wallet');
        } catch (error) {
            toast.error(error.response?.data?.message || 'Submission failed');
        } finally {
            setLoading(false);
        }
    };

    const paymentModes = [
        { id: 'CASH', label: 'Cash' },
        { id: 'UPI', label: 'UPI' },
        { id: 'CARD', label: 'Card' },
        { id: 'CHEQUE', label: 'Cheque' },
        { id: 'BANK_TRANSFER', label: 'Bank Transfer' }
    ];

    return (
        <div className="min-h-screen bg-[#F8FAFC] pb-24">
            {/* Header */}
            <div className="bg-white border-b border-slate-100 sticky top-0 z-10 px-6 py-5 flex items-center justify-between">
                <div className="flex items-center gap-4">
                    <button 
                        onClick={() => navigate('/wallet')}
                        className="p-2 hover:bg-slate-50 rounded-xl transition-colors text-slate-400 hover:text-slate-900"
                    >
                        <ArrowLeft size={20} />
                    </button>
                    <div>
                        <h1 className="text-xl font-black text-slate-900 tracking-tight">Create Expense</h1>
                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest italic">New Request Submission</p>
                    </div>
                </div>
                <Receipt className="text-emerald-500" size={24} />
            </div>

            <form onSubmit={handleSubmit} className="px-6 py-8 max-w-2xl mx-auto space-y-6">
                {/* Main Form Container */}
                <div className="bg-white rounded-[2.5rem] p-8 shadow-sm border border-gray-100 space-y-6">
                    {/* Row 1: Categories */}
                    <div className="grid grid-cols-2 gap-6">
                        <div className="space-y-2">
                            <label className="text-sm font-bold text-gray-700">Category <span className="text-rose-500">*</span></label>
                            <select required value={form.mainCategory} onChange={(e) => handleMainCategoryChange(e.target.value)}
                                className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-emerald-500/20 outline-none transition-all">
                                <option value="">Select category</option>
                                {categories.map(cat => (
                                    <option key={cat} value={cat}>{cat}</option>
                                ))}
                            </select>
                        </div>
                        <div className="space-y-2">
                            <label className="text-sm font-bold text-gray-700">Sub Category <span className="text-rose-500">*</span></label>
                            <select required disabled={!form.mainCategory} value={form.subCategory} onChange={(e) => setForm({...form, subCategory: e.target.value})}
                                className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-emerald-500/20 outline-none transition-all disabled:opacity-50">
                                <option value="">Select sub category</option>
                                {getSubCategories().map(sub => (
                                    <option key={sub} value={sub}>{sub}</option>
                                ))}
                            </select>
                        </div>
                    </div>

                    {/* Row 2: Paid To */}
                    <div className="space-y-2">
                        <label className="text-sm font-bold text-gray-700">Paid To <span className="text-rose-500">*</span></label>
                        <input required type="text" value={form.paidTo} onChange={(e) => setForm({...form, paidTo: e.target.value})}
                            placeholder="Enter vendor or person name"
                            className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-emerald-500/20 outline-none transition-all" />
                    </div>

                    {/* Row 3: Dates */}
                    <div className="grid grid-cols-2 gap-6">
                        <div className="space-y-2">
                            <label className="text-sm font-bold text-gray-700">Paid Date <span className="text-rose-500">*</span></label>
                            <input required type="date" value={form.paidDate} onChange={(e) => setForm({...form, paidDate: e.target.value})}
                                className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-emerald-500/20 outline-none transition-all" />
                        </div>
                        <div className="space-y-2">
                            <label className="text-sm font-bold text-gray-700">Bill Date <span className="text-rose-500">*</span></label>
                            <input required type="date" value={form.billDate} onChange={(e) => setForm({...form, billDate: e.target.value})}
                                className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-emerald-500/20 outline-none transition-all" />
                        </div>
                    </div>

                    {/* Row 4: Amount & Mode */}
                    <div className="grid grid-cols-2 gap-6">
                        <div className="space-y-2">
                            <label className="text-sm font-bold text-gray-700">Bill Amount <span className="text-rose-500">*</span></label>
                            <div className="relative">
                                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 font-bold">₹</span>
                                <input required type="number" value={form.amount} onChange={(e) => setForm({...form, amount: e.target.value})}
                                    placeholder="0.00"
                                    className="w-full bg-gray-50 border border-gray-200 rounded-xl pl-8 pr-4 py-3 text-sm focus:ring-2 focus:ring-emerald-500/20 outline-none transition-all" />
                            </div>
                        </div>
                        <div className="space-y-2">
                            <label className="text-sm font-bold text-gray-700">Payment Mode <span className="text-rose-500">*</span></label>
                            <select required value={form.paymentMode} onChange={(e) => setForm({...form, paymentMode: e.target.value})}
                                className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-emerald-500/20 outline-none transition-all">
                                {paymentModes.map(mode => (
                                    <option key={mode.id} value={mode.id}>{mode.label}</option>
                                ))}
                            </select>
                        </div>
                    </div>

                    {/* Row 5: Upload */}
                    <div className="space-y-2">
                        <label className="text-sm font-bold text-gray-700">Upload Bill <span className="text-rose-500">*</span></label>
                        <div className="relative group">
                            <input type="file" accept="image/*,.pdf" onChange={handleFileChange} className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10" />
                            <div className={`border-2 border-dashed rounded-2xl p-8 flex flex-col items-center justify-center transition-all ${form.previewUrl ? 'border-emerald-500 bg-emerald-50' : 'border-gray-200 group-hover:border-emerald-400 bg-gray-50'}`}>
                                {form.previewUrl ? (
                                    <div className="relative">
                                        {form.billFile?.type === 'application/pdf' ? (
                                            <div className="flex flex-col items-center gap-2">
                                                <FileText size={48} className="text-emerald-500" />
                                                <p className="text-[10px] font-bold text-emerald-600 truncate max-w-[200px]">{form.billFile.name}</p>
                                            </div>
                                        ) : (
                                            <img src={form.previewUrl} className="w-32 h-32 object-cover rounded-xl shadow-lg" alt="Preview" />
                                        )}
                                        <button onClick={(e) => { e.preventDefault(); setForm({...form, billFile: null, previewUrl: null}); }}
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

                    {/* Row 6: Description */}
                    <div className="space-y-2">
                        <label className="text-sm font-bold text-gray-700">Bill Description</label>
                        <textarea rows={3} value={form.description} onChange={(e) => setForm({...form, description: e.target.value})}
                            placeholder="Enter the bill description here..."
                            className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-emerald-500/20 outline-none transition-all resize-none" />
                    </div>

                    {/* Footer Button */}
                    <div className="pt-6">
                        <button type="submit" disabled={loading}
                            className="w-full bg-emerald-600 hover:bg-emerald-700 text-white py-4 rounded-2xl text-xs font-black uppercase tracking-widest transition-all shadow-xl shadow-emerald-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-3">
                            {loading ? <Loader2 size={18} className="animate-spin" /> : <Receipt size={18} />}
                            SUBMIT FOR APPROVAL
                        </button>
                        <p className="text-center text-[10px] font-bold text-gray-400 uppercase tracking-widest mt-6">
                            Requests are logged with timestamp and geolocation for audit
                        </p>
                    </div>
                </div>
            </form>
        </div>
    );
}
