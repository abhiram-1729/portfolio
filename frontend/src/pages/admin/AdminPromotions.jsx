import React, { useState, useEffect } from 'react';
import { 
    Tag, Plus, Trash2, Edit, Calendar, MapPin, 
    ChevronRight, ChevronLeft, Sparkles, Filter, Search, 
    Gift, Percent, CreditCard, LayoutGrid, CheckCircle2, XCircle,
    User, MoreVertical
} from 'lucide-react';
import promotionService from '../../services/promotionService';
import toast from 'react-hot-toast';
import { format } from 'date-fns';

export default function AdminPromotions() {
    const [promotions, setPromotions] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showModal, setShowModal] = useState(false);
    const [editingPromotion, setEditingPromotion] = useState(null);
    const [formData, setFormData] = useState({
        name: '',
        code: '',
        type: 'COUPON',
        discountType: 'PERCENTAGE',
        discountValue: 0,
        maxDiscount: 0,
        minOrderAmount: 0,
        startDate: '',
        endDate: '',
        usageLimit: 0,
        isActive: true,
        targetRouteIds: [],
        targetVillageNames: []
    });

    useEffect(() => {
        loadPromotions();
    }, []);

    const loadPromotions = async () => {
        try {
            const { data } = await promotionService.getAll();
            setPromotions(data);
        } catch (err) {
            toast.error('Failed to load promotions');
        } finally {
            setLoading(false);
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        try {
            const payload = {
                ...formData,
                discountValue: Number(formData.discountValue),
                maxDiscount: Number(formData.maxDiscount) || null,
                minOrderAmount: Number(formData.minOrderAmount) || 0,
                usageLimit: Number(formData.usageLimit) || null,
                startDate: formData.startDate ? new Date(formData.startDate) : null,
                endDate: formData.endDate ? new Date(formData.endDate) : null,
            };

            if (editingPromotion) {
                await promotionService.update(editingPromotion.id, payload);
                toast.success('Promotion updated');
            } else {
                await promotionService.create(payload);
                toast.success('Promotion created');
            }
            setShowModal(false);
            setEditingPromotion(null);
            resetForm();
            loadPromotions();
        } catch (err) {
            toast.error(err.response?.data?.message || 'Action failed');
        }
    };

    const resetForm = () => {
        setFormData({
            name: '',
            code: '',
            type: 'COUPON',
            discountType: 'PERCENTAGE',
            discountValue: 0,
            maxDiscount: 0,
            minOrderAmount: 0,
            startDate: '',
            endDate: '',
            usageLimit: 0,
            isActive: true,
            targetRouteIds: [],
            targetVillageNames: []
        });
    };

    const handleDelete = async (id) => {
        if (!window.confirm('Delete this promotion?')) return;
        try {
            await promotionService.delete(id);
            toast.success('Promotion deleted');
            loadPromotions();
        } catch (err) {
            toast.error('Failed to delete');
        }
    };

    const openEdit = (promo) => {
        setEditingPromotion(promo);
        setFormData({
            ...promo,
            startDate: promo.startDate ? format(new Date(promo.startDate), 'yyyy-MM-dd') : '',
            endDate: promo.endDate ? format(new Date(promo.endDate), 'yyyy-MM-dd') : '',
        });
        setShowModal(true);
    };

    return (
        <div className="p-4 md:p-8 space-y-8 animate-in fade-in duration-500 min-h-screen bg-[#F8FAFC]">
            <style>{`
                .glass {
                    background: white;
                    border: 1px solid #E2E8F0;
                    box-shadow: 0 4px 6px -1px rgb(0 0 0 / 0.05);
                }
                .stat-card-glow {
                    position: relative;
                    overflow: hidden;
                }
                .stat-card-glow::after {
                    content: '';
                    position: absolute;
                    bottom: 0;
                    left: 0;
                    height: 3px;
                    width: 100%;
                    border-radius: 0 0 100px 100px;
                }
                .glow-emerald::after { background: #10B981; width: 40%; }
                .glow-blue::after { background: #3B82F6; width: 60%; }
                .glow-orange::after { background: #F97316; width: 30%; }
            `}</style>
            
            {/* ── HEADER ── */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
                <div className="flex items-center gap-6">
                    <div className="w-16 h-16 bg-[#ECFDF5] rounded-2xl flex items-center justify-center text-emerald-600 shadow-sm border border-emerald-100">
                        <Tag size={32} />
                    </div>
                    <div>
                        <h1 className="text-3xl font-black text-slate-900 tracking-tight">Offers & Promotions</h1>
                        <p className="text-slate-500 font-medium mt-0.5">Manage discounts, coupons and campaign targeting</p>
                    </div>
                </div>
                <button 
                    onClick={() => { resetForm(); setEditingPromotion(null); setShowModal(true); }}
                    className="bg-[#059669] hover:bg-[#047857] text-white px-6 py-3 rounded-xl font-bold flex items-center gap-2 shadow-lg shadow-emerald-200 transition-all active:scale-95"
                >
                    <Plus size={20} strokeWidth={3} />
                    Create New Offer
                </button>
            </div>

            {/* ── STAT CARDS ── */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="glass p-6 rounded-3xl flex items-center gap-6 bg-white stat-card-glow glow-emerald">
                    <div className="w-14 h-14 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
                        <Tag size={28} />
                    </div>
                    <div>
                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Active Coupons</p>
                        <p className="text-2xl font-black text-slate-900 leading-none mb-1">{promotions.filter(p => p.isActive).length}</p>
                        <p className="text-[10px] font-bold text-slate-400">Currently running offers</p>
                    </div>
                </div>
                <div className="glass p-6 rounded-3xl flex items-center gap-6 bg-white stat-card-glow glow-blue">
                    <div className="w-14 h-14 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center">
                        <Sparkles size={28} />
                    </div>
                    <div>
                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Ongoing Campaigns</p>
                        <p className="text-2xl font-black text-slate-900 leading-none mb-1">{promotions.filter(p => p.type !== 'COUPON' && p.isActive).length}</p>
                        <p className="text-[10px] font-bold text-slate-400">Active marketing campaigns</p>
                    </div>
                </div>
                <div className="glass p-6 rounded-3xl flex items-center gap-6 bg-white stat-card-glow glow-orange">
                    <div className="w-14 h-14 rounded-2xl bg-orange-50 text-orange-600 flex items-center justify-center">
                        <Calendar size={28} />
                    </div>
                    <div>
                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Expiring Soon</p>
                        <p className="text-2xl font-black text-slate-900 leading-none mb-1">{promotions.filter(p => p.endDate && new Date(p.endDate) < new Date(Date.now() + 7 * 86400000)).length}</p>
                        <p className="text-[10px] font-bold text-slate-400">Offers expiring soon</p>
                    </div>
                </div>
            </div>

            {/* ── LIST FILTERS ── */}
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pt-4">
                <div className="flex items-center gap-3">
                    <h2 className="text-lg font-black text-slate-800">All Promotions</h2>
                    <span className="text-xs font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-lg">{promotions.length} offers found</span>
                </div>
                <div className="flex flex-wrap items-center gap-3">
                    <select className="bg-white border border-slate-200 rounded-xl px-4 py-2 text-xs font-bold text-slate-600 outline-none focus:ring-2 focus:ring-emerald-500/20">
                        <option>All Status</option>
                        <option>Active</option>
                        <option>Paused</option>
                    </select>
                    <select className="bg-white border border-slate-200 rounded-xl px-4 py-2 text-xs font-bold text-slate-600 outline-none focus:ring-2 focus:ring-emerald-500/20">
                        <option>All Types</option>
                        <option>Coupon</option>
                        <option>BOGO</option>
                        <option>Festival</option>
                    </select>
                    <div className="relative">
                        <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                        <input 
                            type="text" 
                            placeholder="Search by name or code..." 
                            className="pl-10 pr-4 py-2 bg-white border border-slate-200 rounded-xl text-xs font-bold focus:outline-none focus:ring-2 focus:ring-emerald-500/20 w-64 transition-all" 
                        />
                    </div>
                </div>
            </div>

            {/* ── PROMOTIONS LIST ── */}
            <div className="space-y-4">
                {loading ? (
                    [1,2,3].map(i => <div key={i} className="h-32 bg-white rounded-3xl animate-pulse border border-slate-100" />)
                ) : promotions.length === 0 ? (
                    <div className="py-20 text-center glass rounded-[3rem] border border-dashed border-slate-300">
                        <Gift size={48} className="mx-auto text-slate-300 mb-4" />
                        <p className="text-slate-500 font-bold">No promotions found. Start by creating one!</p>
                    </div>
                ) : promotions.map(promo => (
                    <div key={promo.id} className="bg-white rounded-3xl border border-slate-200 p-6 flex flex-col gap-4 group hover:shadow-xl hover:border-emerald-100 transition-all">
                        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
                            {/* Info Section */}
                            <div className="flex items-center gap-6 flex-1">
                                <div className={`w-16 h-16 rounded-2xl flex items-center justify-center shadow-sm ${promo.isActive ? 'bg-[#ECFDF5] text-emerald-600' : 'bg-slate-50 text-slate-400'}`}>
                                    {promo.type === 'FESTIVAL' ? <Gift size={32} /> : promo.type === 'BOGO' ? <Sparkles size={32} /> : <Tag size={32} />}
                                </div>
                                <div className="space-y-1">
                                    <h3 className="text-xl font-black text-slate-900 tracking-tight">{promo.name}</h3>
                                    <div className="flex items-center gap-2">
                                        <div className="flex items-center gap-1.5 text-xs font-black text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-lg border border-emerald-100 uppercase tracking-widest">
                                            <User size={12} />
                                            {promo.code}
                                        </div>
                                    </div>
                                    <p className="text-xs font-medium text-slate-400 mt-1 max-w-md line-clamp-1">{promo.description || 'Special discount offer for our valued customers.'}</p>
                                    <div className="flex items-center gap-2 mt-2">
                                        <span className={`flex items-center gap-1 px-2 py-0.5 rounded-lg text-[10px] font-black uppercase tracking-tighter ${promo.isActive ? 'bg-emerald-50 text-emerald-600' : 'bg-rose-50 text-rose-600'}`}>
                                            <div className={`w-1.5 h-1.5 rounded-full ${promo.isActive ? 'bg-emerald-500' : 'bg-rose-500'}`} />
                                            {promo.isActive ? 'Active' : 'Paused'}
                                        </span>
                                        <span className="bg-blue-50 text-blue-600 px-2 py-0.5 rounded-lg text-[10px] font-black uppercase tracking-tighter flex items-center gap-1">
                                            <div className="w-1.5 h-1.5 rounded-full bg-blue-500" />
                                            {promo.type}
                                        </span>
                                    </div>
                                </div>
                            </div>

                            {/* Columnar Stats */}
                            <div className="flex items-center gap-12 lg:gap-16 pr-8">
                                <div className="space-y-1 min-w-[80px]">
                                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Value</p>
                                    <p className="text-xl font-black text-slate-900 flex items-center gap-1">
                                        ₹{promo.discountValue}
                                        <span className="text-[10px] font-black text-emerald-600 bg-emerald-50 px-1 rounded uppercase">OFF</span>
                                    </p>
                                </div>
                                <div className="space-y-1 min-w-[100px]">
                                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Min Order</p>
                                    <p className="text-xl font-black text-slate-900">₹{promo.minOrderAmount || 0}</p>
                                </div>
                                <div className="space-y-1 min-w-[140px]">
                                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Validity</p>
                                    <div className="flex flex-col">
                                        <div className="flex items-center gap-1.5 text-sm font-bold text-slate-700">
                                            <Calendar size={14} className="text-slate-400" />
                                            {promo.startDate ? format(new Date(promo.startDate), 'MMM dd') : 'N/A'} - {promo.endDate ? format(new Date(promo.endDate), 'MMM dd') : 'N/A'}
                                        </div>
                                        {promo.endDate && (
                                            <p className="text-[10px] font-bold text-emerald-600 mt-0.5">
                                                {Math.ceil((new Date(promo.endDate) - new Date()) / (1000 * 60 * 60 * 24))} days remaining
                                            </p>
                                        )}
                                    </div>
                                </div>
                            </div>

                            {/* Actions Section */}
                            <div className="flex items-center gap-4">
                                <button 
                                    onClick={() => openEdit(promo)}
                                    className="flex items-center gap-2 bg-white border border-emerald-500 text-emerald-600 px-4 py-2 rounded-xl text-xs font-black hover:bg-emerald-600 hover:text-white transition-all whitespace-nowrap"
                                >
                                    View Details
                                    <ChevronRight size={14} />
                                </button>
                                <button className="p-2 text-slate-300 hover:text-slate-600 rounded-lg">
                                    <MoreVertical size={18} />
                                </button>
                            </div>
                        </div>

                        {/* Bottom Info Row */}
                        <div className="flex items-center gap-2 pt-4 border-t border-slate-100">
                            <p className="text-[10px] font-medium text-slate-400">Created on {format(new Date(promo.createdAt), 'MMM dd, yyyy')} at {format(new Date(promo.createdAt), 'hh:mm a')}</p>
                        </div>
                    </div>
                ))}
            </div>

            {/* ── PAGINATION ── */}
            {!loading && promotions.length > 0 && (
                <div className="flex items-center justify-between pt-6">
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Showing 1 to {promotions.length} of {promotions.length} offers</p>
                    <div className="flex items-center gap-2">
                        <button className="p-2 rounded-lg border border-slate-200 text-slate-400 hover:bg-white transition-all disabled:opacity-30">
                            <ChevronLeft size={16} />
                        </button>
                        <div className="flex items-center gap-1">
                            <button className="w-8 h-8 rounded-lg bg-emerald-600 text-white text-[10px] font-black">1</button>
                        </div>
                        <button className="p-2 rounded-lg border border-slate-200 text-slate-400 hover:bg-white transition-all">
                            <ChevronRight size={16} />
                        </button>
                    </div>
                </div>
            )}
            {/* Create/Edit Modal */}
            {showModal && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
                    <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-md" onClick={() => setShowModal(false)} />
                    <div className="relative glass bg-white rounded-[3rem] w-full max-w-2xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-300">
                        <div className="px-8 py-6 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
                            <h2 className="text-2xl font-black text-slate-900 flex items-center gap-2">
                                <Sparkles className="text-emerald-500" />
                                {editingPromotion ? 'Edit Promotion' : 'New Promotion'}
                            </h2>
                            <button onClick={() => setShowModal(false)} className="p-2 hover:bg-slate-200 rounded-xl transition-all">
                                <Plus size={24} className="rotate-45" />
                            </button>
                        </div>

                        <form onSubmit={handleSubmit} className="p-8 space-y-6 max-h-[70vh] overflow-y-auto no-scrollbar">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">Campaign Name</label>
                                    <input 
                                        required 
                                        type="text" 
                                        className="w-full px-5 py-3.5 bg-slate-50 border border-slate-200 rounded-2xl focus:outline-none focus:ring-4 focus:ring-emerald-500/10 focus:bg-white transition-all font-bold"
                                        placeholder="E.g. Diwali Super Sale"
                                        value={formData.name}
                                        onChange={e => setFormData({...formData, name: e.target.value})}
                                    />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">Coupon Code</label>
                                    <input 
                                        required 
                                        type="text" 
                                        className="w-full px-5 py-3.5 bg-slate-50 border border-slate-200 rounded-2xl focus:outline-none focus:ring-4 focus:ring-emerald-500/10 focus:bg-white transition-all font-black uppercase"
                                        placeholder="E.g. DIWALI20"
                                        value={formData.code}
                                        onChange={e => setFormData({...formData, code: e.target.value.toUpperCase()})}
                                    />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">Promotion Type</label>
                                    <select 
                                        className="w-full px-5 py-3.5 bg-slate-50 border border-slate-200 rounded-2xl focus:outline-none focus:ring-4 focus:ring-emerald-500/10 focus:bg-white transition-all font-bold"
                                        value={formData.type}
                                        onChange={e => setFormData({...formData, type: e.target.value})}
                                    >
                                        <option value="COUPON">Coupon Code</option>
                                        <option value="FESTIVAL">Festival Offer</option>
                                        <option value="ROUTE_BASED">Route Specific</option>
                                        <option value="VILLAGE_BASED">Village Specific</option>
                                        <option value="BOGO">BOGO (Buy 1 Get 1)</option>
                                        <option value="COMBO">Combo Deal</option>
                                    </select>
                                </div>
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">Discount Mode</label>
                                    <select 
                                        className="w-full px-5 py-3.5 bg-slate-50 border border-slate-200 rounded-2xl focus:outline-none focus:ring-4 focus:ring-emerald-500/10 focus:bg-white transition-all font-bold"
                                        value={formData.discountType}
                                        onChange={e => setFormData({...formData, discountType: e.target.value})}
                                    >
                                        <option value="PERCENTAGE">Percentage (%)</option>
                                        <option value="FLAT_AMOUNT">Flat Amount (₹)</option>
                                    </select>
                                </div>
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">Discount Value</label>
                                    <input 
                                        required 
                                        type="number" 
                                        className="w-full px-5 py-3.5 bg-slate-50 border border-slate-200 rounded-2xl focus:outline-none focus:ring-4 focus:ring-emerald-500/10 focus:bg-white transition-all font-bold"
                                        value={formData.discountValue}
                                        onChange={e => setFormData({...formData, discountValue: e.target.value})}
                                    />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">Max Discount (₹)</label>
                                    <input 
                                        type="number" 
                                        className="w-full px-5 py-3.5 bg-slate-50 border border-slate-200 rounded-2xl focus:outline-none focus:ring-4 focus:ring-emerald-500/10 focus:bg-white transition-all font-bold"
                                        value={formData.maxDiscount}
                                        onChange={e => setFormData({...formData, maxDiscount: e.target.value})}
                                    />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">Min Order Amount (₹)</label>
                                    <input 
                                        type="number" 
                                        className="w-full px-5 py-3.5 bg-slate-50 border border-slate-200 rounded-2xl focus:outline-none focus:ring-4 focus:ring-emerald-500/10 focus:bg-white transition-all font-bold"
                                        value={formData.minOrderAmount}
                                        onChange={e => setFormData({...formData, minOrderAmount: e.target.value})}
                                    />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">Usage Limit (Total)</label>
                                    <input 
                                        type="number" 
                                        className="w-full px-5 py-3.5 bg-slate-50 border border-slate-200 rounded-2xl focus:outline-none focus:ring-4 focus:ring-emerald-500/10 focus:bg-white transition-all font-bold"
                                        value={formData.usageLimit}
                                        onChange={e => setFormData({...formData, usageLimit: e.target.value})}
                                    />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">Start Date</label>
                                    <input 
                                        type="date" 
                                        className="w-full px-5 py-3.5 bg-slate-50 border border-slate-200 rounded-2xl focus:outline-none focus:ring-4 focus:ring-emerald-500/10 focus:bg-white transition-all font-bold"
                                        value={formData.startDate}
                                        onChange={e => setFormData({...formData, startDate: e.target.value})}
                                    />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">End Date</label>
                                    <input 
                                        type="date" 
                                        className="w-full px-5 py-3.5 bg-slate-50 border border-slate-200 rounded-2xl focus:outline-none focus:ring-4 focus:ring-emerald-500/10 focus:bg-white transition-all font-bold"
                                        value={formData.endDate}
                                        onChange={e => setFormData({...formData, endDate: e.target.value})}
                                    />
                                </div>
                            </div>

                            <div className="flex items-center gap-3 p-4 bg-emerald-50 rounded-[1.5rem] border border-emerald-100">
                                <input 
                                    type="checkbox" 
                                    id="is-active"
                                    className="w-6 h-6 accent-emerald-600 rounded-lg cursor-pointer"
                                    checked={formData.isActive}
                                    onChange={e => setFormData({...formData, isActive: e.target.checked})}
                                />
                                <label htmlFor="is-active" className="text-sm font-black text-emerald-900 cursor-pointer">Promotion is Currently Active</label>
                            </div>

                            <button 
                                type="submit"
                                className="w-full py-5 bg-emerald-600 hover:bg-emerald-700 text-white font-black rounded-3xl shadow-xl shadow-emerald-500/20 transition-all active:scale-[0.98] mt-4"
                            >
                                {editingPromotion ? 'Update Campaign' : 'Launch Promotion'}
                            </button>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
