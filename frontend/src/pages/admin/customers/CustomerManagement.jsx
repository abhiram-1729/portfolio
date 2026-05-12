import React, { useState, useEffect } from 'react';
import { 
  User, Search, Filter, Plus, FileText, ChevronRight, Loader2, Edit, Coins, 
  Wallet, Award, MapPin, Smartphone, Shield, CheckCircle2, RotateCcw, X, CreditCard
} from 'lucide-react';
import { format } from 'date-fns';
import toast from 'react-hot-toast';
import adminAPI from '../../../services/adminService';
import { getVillages } from '../../../services/routeService';

export default function CustomerManagement({ storeFilterId }) {
  const [customers, setCustomers] = useState([]);
  const [villages, setVillages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [segmentFilter, setSegmentFilter] = useState('ALL'); // ALL, REGULAR, PREMIUM, ROUTE_WISE, HIGH_VALUE, ONLINE
  
  // Modals
  const [showRegisterModal, setShowRegisterModal] = useState(false);
  const [selectedCustomer, setSelectedCustomer] = useState(null);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [showLedgerModal, setShowLedgerModal] = useState(false); // For modifying Points / Credit
  const [ledgerType, setLedgerType] = useState('CREDIT'); // CREDIT | POINTS
  const [ledgerAction, setLedgerAction] = useState('ADD'); // ADD | DEDUCT
  const [ledgerAmount, setLedgerAmount] = useState('');

  // Register Form State
  const [formData, setFormData] = useState({
    name: '',
    mobile: '',
    address: '',
    villageId: '',
    segment: 'REGULAR',
    isOnline: false
  });
  const [formLoading, setFormLoading] = useState(false);

  // History State
  const [customerHistory, setCustomerHistory] = useState([]);
  const [historyLoading, setHistoryLoading] = useState(false);

  const fetchCustomers = async () => {
    try {
      setLoading(true);
      const res = await adminAPI.getCustomers({ 
        segment: segmentFilter, 
        search: searchQuery,
        storeId: storeFilterId 
      });
      setCustomers(res.data?.data || res.data || []);
    } catch (error) {
      toast.error('Failed to load customers');
    } finally {
      setLoading(false);
    }
  };

  const fetchVillageList = async () => {
    try {
      const res = await getVillages({ storeId: storeFilterId });
      setVillages(res?.data || res || []);
    } catch (err) {
      console.warn('[Villages] Failed to fetch list:', err);
    }
  };

  useEffect(() => {
    fetchCustomers();
  }, [segmentFilter, storeFilterId]);

  useEffect(() => {
    // Delayed search trigger
    const timer = setTimeout(() => {
      fetchCustomers();
    }, 400);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  useEffect(() => {
    fetchVillageList();
  }, [storeFilterId]);

  const handleRegisterSubmit = async (e) => {
    e.preventDefault();
    if (!formData.name || !formData.mobile) {
      return toast.error('Name and mobile number are required');
    }
    try {
      setFormLoading(true);
      if (selectedCustomer && selectedCustomer.isEditMode) {
        // Update profile
        await adminAPI.updateCustomerProfile(selectedCustomer.id, {
          ...formData,
          storeId: storeFilterId || undefined
        });
        toast.success('Customer profile updated');
      } else {
        // Register new
        await adminAPI.registerCustomer({
          ...formData,
          storeId: storeFilterId || undefined
        });
        toast.success('Customer registered successfully');
      }
      setShowRegisterModal(false);
      setSelectedCustomer(null);
      setFormData({ name: '', mobile: '', address: '', villageId: '', segment: 'REGULAR', isOnline: false });
      fetchCustomers();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Action failed');
    } finally {
      setFormLoading(false);
    }
  };

  const handleOpenDetail = async (cust) => {
    setSelectedCustomer(cust);
    setShowDetailModal(true);
    setHistoryLoading(true);
    try {
      const res = await adminAPI.getCustomerHistory(cust.id);
      setCustomerHistory(res.data?.data || res.data || []);
    } catch (err) {
      toast.error('Failed to load purchase history');
      setCustomerHistory([]);
    } finally {
      setHistoryLoading(false);
    }
  };

  const handleOpenLedger = (cust, type) => {
    setSelectedCustomer(cust);
    setLedgerType(type);
    setLedgerAction('ADD');
    setLedgerAmount('');
    setShowLedgerModal(true);
  };

  const handleLedgerSubmit = async (e) => {
    e.preventDefault();
    if (!ledgerAmount || isNaN(ledgerAmount) || Number(ledgerAmount) <= 0) {
      return toast.error('Please enter a valid positive number');
    }
    try {
      setFormLoading(true);
      if (ledgerType === 'CREDIT') {
        await adminAPI.adjustCreditBalance(selectedCustomer.id, {
          amount: ledgerAmount,
          action: ledgerAction
        });
        toast.success('Credit ledger updated');
      } else {
        await adminAPI.adjustLoyaltyPoints(selectedCustomer.id, {
          points: ledgerAmount,
          action: ledgerAction
        });
        toast.success('Loyalty points updated');
      }
      setShowLedgerModal(false);
      fetchCustomers();
      // Update selectedCustomer dynamically if open in detail view
      if (showDetailModal) {
        setSelectedCustomer(prev => ({
          ...prev,
          creditBalance: ledgerType === 'CREDIT' 
            ? (ledgerAction === 'ADD' ? prev.creditBalance + Number(ledgerAmount) : prev.creditBalance - Number(ledgerAmount))
            : prev.creditBalance,
          loyaltyPoints: ledgerType === 'POINTS'
            ? (ledgerAction === 'ADD' ? prev.loyaltyPoints + Number(ledgerAmount) : prev.loyaltyPoints - Number(ledgerAmount))
            : prev.loyaltyPoints
        }));
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'Adjustment failed');
    } finally {
      setFormLoading(false);
    }
  };

  const handleEditClick = (cust) => {
    setSelectedCustomer({ ...cust, isEditMode: true });
    setFormData({
      name: cust.name,
      mobile: cust.mobile,
      address: cust.address || '',
      villageId: cust.villageId || '',
      segment: cust.segment || 'REGULAR',
      isOnline: cust.isOnline || false
    });
    setShowRegisterModal(true);
  };

  // Top metric stats
  const stats = {
    total: customers.length,
    premium: customers.filter(c => c.segment === 'PREMIUM' || c.segment === 'HIGH_VALUE').length,
    totalCredit: customers.reduce((sum, c) => sum + (c.creditBalance || 0), 0),
    totalPoints: customers.reduce((sum, c) => sum + (c.loyaltyPoints || 0), 0)
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      {/* Dynamic Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-emerald-50/80 backdrop-blur border border-emerald-100 rounded-3xl p-5 flex flex-col justify-between shadow-sm">
          <div className="flex items-center justify-between mb-3">
            <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center text-emerald-600 shadow-sm border border-emerald-100">
              <User size={18} />
            </div>
            <span className="text-[10px] font-bold text-emerald-600 bg-white px-2 py-0.5 rounded-full border border-emerald-50">Active DB</span>
          </div>
          <div>
            <p className="text-[10px] font-black text-emerald-600 uppercase tracking-widest mb-0.5">Total Registered</p>
            <p className="text-2xl font-black text-emerald-900 tabular-nums">{stats.total}</p>
          </div>
        </div>

        <div className="bg-amber-50/80 backdrop-blur border border-amber-100 rounded-3xl p-5 flex flex-col justify-between shadow-sm">
          <div className="flex items-center justify-between mb-3">
            <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center text-amber-600 shadow-sm border border-amber-100">
              <Award size={18} />
            </div>
            <span className="text-[10px] font-bold text-amber-600 bg-white px-2 py-0.5 rounded-full border border-amber-50">VIP</span>
          </div>
          <div>
            <p className="text-[10px] font-black text-amber-600 uppercase tracking-widest mb-0.5">Premium / High Value</p>
            <p className="text-2xl font-black text-amber-900 tabular-nums">{stats.premium}</p>
          </div>
        </div>

        <div className="bg-blue-50/80 backdrop-blur border border-blue-100 rounded-3xl p-5 flex flex-col justify-between shadow-sm">
          <div className="flex items-center justify-between mb-3">
            <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center text-blue-600 shadow-sm border border-blue-100">
              <CreditCard size={18} />
            </div>
            <span className="text-[10px] font-bold text-blue-600 bg-white px-2 py-0.5 rounded-full border border-blue-50">Outstanding</span>
          </div>
          <div>
            <p className="text-[10px] font-black text-blue-600 uppercase tracking-widest mb-0.5">Customer Wallet Bal.</p>
            <p className="text-2xl font-black text-blue-900 tabular-nums">₹{stats.totalCredit.toFixed(0)}</p>
          </div>
        </div>

        <div className="bg-purple-50/80 backdrop-blur border border-purple-100 rounded-3xl p-5 flex flex-col justify-between shadow-sm">
          <div className="flex items-center justify-between mb-3">
            <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center text-purple-600 shadow-sm border border-purple-100">
              <Coins size={18} />
            </div>
            <span className="text-[10px] font-bold text-purple-600 bg-white px-2 py-0.5 rounded-full border border-purple-50">Rewards</span>
          </div>
          <div>
            <p className="text-[10px] font-black text-purple-600 uppercase tracking-widest mb-0.5">Loyalty Pool</p>
            <p className="text-2xl font-black text-purple-900 tabular-nums">{stats.totalPoints} Pts</p>
          </div>
        </div>
      </div>

      {/* Actions & Filters Header */}
      <div className="flex flex-col md:flex-row items-center justify-between gap-4 bg-white p-4 rounded-[2rem] border border-gray-100 shadow-sm">
        <div className="flex flex-col md:flex-row items-center gap-3 w-full md:w-auto">
          {/* Search Box */}
          <div className="flex items-center gap-2.5 bg-gray-50 px-4 py-2.5 rounded-2xl border border-gray-100 w-full md:w-72 focus-within:bg-white focus-within:border-emerald-500 transition-all">
            <Search size={18} className="text-gray-400" />
            <input 
              type="text"
              placeholder="Search Name, Phone, Area..."
              className="bg-transparent border-none focus:outline-none text-xs font-medium w-full"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
            {searchQuery && (
              <button onClick={() => setSearchQuery('')} className="text-gray-400 hover:text-gray-600">
                <X size={14} />
              </button>
            )}
          </div>

          {/* Segment Pills */}
          <div className="flex items-center gap-1 overflow-x-auto w-full pb-1 md:pb-0 scrollbar-none">
            {['ALL', 'REGULAR', 'PREMIUM', 'ROUTE_WISE', 'HIGH_VALUE', 'ONLINE'].map((seg) => (
              <button
                key={seg}
                onClick={() => setSegmentFilter(seg)}
                className={`px-3 py-2 rounded-xl text-[9px] font-black uppercase tracking-widest whitespace-nowrap transition-all ${
                  segmentFilter === seg 
                    ? 'bg-emerald-600 text-white shadow-sm' 
                    : 'bg-gray-50 text-gray-400 hover:text-gray-600 hover:bg-gray-100'
                }`}
              >
                {seg.replace('_', ' ')}
              </button>
            ))}
          </div>
        </div>

        <button
          onClick={() => {
            setSelectedCustomer(null);
            setFormData({ name: '', mobile: '', address: '', villageId: '', segment: 'REGULAR', isOnline: false });
            setShowRegisterModal(true);
          }}
          className="bg-emerald-600 text-white px-5 py-2.5 rounded-2xl text-xs font-bold shadow-sm hover:bg-emerald-700 hover:shadow transition-all flex items-center gap-2 shrink-0 group w-full md:w-auto justify-center"
        >
          <Plus size={16} className="group-hover:rotate-90 transition-transform" />
          Register Customer
        </button>
      </div>

      {/* Main Table */}
      <div className="bg-white rounded-[2.5rem] border border-gray-100 shadow-sm overflow-hidden">
        {loading ? (
          <div className="flex flex-col items-center justify-center py-20 gap-3">
            <Loader2 className="animate-spin text-emerald-600" size={32} />
            <p className="text-xs font-bold text-gray-400 uppercase tracking-widest">Indexing Customer Records...</p>
          </div>
        ) : customers.length === 0 ? (
          <div className="text-center py-16">
            <User size={40} className="mx-auto text-gray-300 mb-2" />
            <p className="text-xs font-bold text-gray-400 uppercase tracking-widest">No matching customers found</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-gray-50/50">
                  <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-gray-400">Customer Details</th>
                  <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-gray-400">Area mapping</th>
                  <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-gray-400">Classification</th>
                  <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-gray-400 text-center">Purchases</th>
                  <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-gray-400 text-right">Lifetime Spend</th>
                  <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-gray-400 text-center">Ledgers</th>
                  <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-gray-400 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50 text-sm">
                {customers.map((cust) => (
                  <tr key={cust.id} className="hover:bg-gray-50/40 transition-colors group">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-xl bg-gray-50 flex items-center justify-center font-black text-xs text-gray-700 border border-gray-100 group-hover:bg-emerald-50 group-hover:text-emerald-600 group-hover:border-emerald-100 transition-all shrink-0">
                          {cust.name.charAt(0).toUpperCase()}
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-black text-gray-900 uppercase text-xs tracking-tight">{cust.name}</span>
                            {cust.isOnline && <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" title="Online Client" />}
                          </div>
                          <span className="text-[10px] font-bold text-gray-500 tracking-wide">{cust.mobile}</span>
                        </div>
                      </div>
                    </td>

                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex flex-col">
                        <span className="text-xs font-bold text-gray-800">
                          {cust.village?.name || 'No Mapping'}
                        </span>
                        <span className="text-[9px] text-gray-400 truncate max-w-[150px]">
                          {cust.address || 'No specific address'}
                        </span>
                      </div>
                    </td>

                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`px-2.5 py-1 rounded-lg text-[9px] font-black uppercase tracking-widest border ${
                        cust.segment === 'PREMIUM' ? 'bg-amber-50 text-amber-700 border-amber-100' :
                        cust.segment === 'HIGH_VALUE' ? 'bg-purple-50 text-purple-700 border-purple-100' :
                        cust.segment === 'ROUTE_WISE' ? 'bg-sky-50 text-sky-700 border-sky-100' :
                        cust.segment === 'ONLINE' ? 'bg-emerald-50 text-emerald-700 border-emerald-100' :
                        'bg-gray-50 text-gray-600 border-gray-100'
                      }`}>
                        {cust.segment.replace('_', ' ')}
                      </span>
                    </td>

                    <td className="px-6 py-4 text-center whitespace-nowrap">
                      <span className="inline-block bg-gray-50 font-black text-gray-700 px-3 py-1 rounded-full text-[10px] border border-gray-100">
                        {cust.totalOrders}
                      </span>
                    </td>

                    <td className="px-6 py-4 text-right whitespace-nowrap">
                      <span className="font-black text-emerald-700 tabular-nums text-sm">
                        ₹{(cust.totalSpent || 0).toLocaleString()}
                      </span>
                    </td>

                    <td className="px-6 py-4 text-center whitespace-nowrap">
                      <div className="flex items-center justify-center gap-1.5">
                        <button 
                          onClick={() => handleOpenLedger(cust, 'CREDIT')}
                          className={`flex items-center gap-1 px-2 py-0.5 rounded text-[9px] font-bold tracking-wider transition-all ${
                            cust.creditBalance !== 0 
                              ? (cust.creditBalance > 0 ? 'bg-blue-50 text-blue-600 border border-blue-100' : 'bg-rose-50 text-rose-600 border border-rose-100')
                              : 'bg-gray-50 text-gray-400 hover:bg-blue-50 hover:text-blue-600'
                          }`}
                          title="Adjust Credit Wallet"
                        >
                          <Wallet size={10} />
                          ₹{cust.creditBalance || 0}
                        </button>
                        
                        <button 
                          onClick={() => handleOpenLedger(cust, 'POINTS')}
                          className={`flex items-center gap-1 px-2 py-0.5 rounded text-[9px] font-bold tracking-wider transition-all ${
                            cust.loyaltyPoints > 0 
                              ? 'bg-purple-50 text-purple-600 border border-purple-100'
                              : 'bg-gray-50 text-gray-400 hover:bg-purple-50 hover:text-purple-600'
                          }`}
                          title="Adjust Loyalty Points"
                        >
                          <Coins size={10} />
                          {cust.loyaltyPoints || 0}
                        </button>
                      </div>
                    </td>

                    <td className="px-6 py-4 text-right whitespace-nowrap">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => handleEditClick(cust)}
                          className="p-2 bg-gray-50 hover:bg-amber-50 hover:text-amber-600 rounded-xl text-gray-400 transition-all border border-gray-100"
                          title="Edit Info"
                        >
                          <Edit size={14} />
                        </button>
                        <button
                          onClick={() => handleOpenDetail(cust)}
                          className="flex items-center gap-1 px-3 py-1.5 bg-emerald-50 text-emerald-600 rounded-xl font-black text-[10px] uppercase tracking-widest hover:bg-emerald-600 hover:text-white transition-all border border-emerald-100 shadow-sm"
                        >
                          Audit
                          <ChevronRight size={14} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ================= MODAL: REGISTER / EDIT CUSTOMER ================= */}
      {showRegisterModal && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-[2.5rem] border border-gray-100 shadow-2xl w-full max-w-lg overflow-hidden animate-in zoom-in-95 duration-300 p-6 space-y-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-emerald-50 rounded-xl flex items-center justify-center text-emerald-600 border border-emerald-100">
                  <User size={18} />
                </div>
                <div>
                  <h3 className="text-lg font-black text-gray-900 tracking-tight">
                    {selectedCustomer && selectedCustomer.isEditMode ? 'Edit Profile' : 'Register Customer Profile'}
                  </h3>
                  <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Module 7 Management System</p>
                </div>
              </div>
              <button 
                onClick={() => { setShowRegisterModal(false); setSelectedCustomer(null); }}
                className="w-8 h-8 rounded-full bg-gray-50 flex items-center justify-center text-gray-400 hover:bg-gray-100 transition-colors"
              >
                <X size={16} />
              </button>
            </div>

            <form onSubmit={handleRegisterSubmit} className="space-y-4">
              <div className="space-y-3">
                <div>
                  <label className="text-[10px] font-black uppercase tracking-widest text-gray-400 block mb-1">Full Name *</label>
                  <input
                    type="text"
                    required
                    placeholder="Enter Customer Name"
                    className="w-full px-4 py-3 rounded-2xl bg-gray-50 border border-gray-100 text-xs font-bold focus:bg-white focus:ring-2 focus:ring-emerald-500 focus:outline-none transition-all"
                    value={formData.name}
                    onChange={(e) => setFormData({...formData, name: e.target.value})}
                  />
                </div>

                <div>
                  <label className="text-[10px] font-black uppercase tracking-widest text-gray-400 block mb-1">Mobile Number *</label>
                  <input
                    type="tel"
                    required
                    placeholder="10-digit mobile number"
                    className="w-full px-4 py-3 rounded-2xl bg-gray-50 border border-gray-100 text-xs font-bold focus:bg-white focus:ring-2 focus:ring-emerald-500 focus:outline-none transition-all"
                    value={formData.mobile}
                    onChange={(e) => setFormData({...formData, mobile: e.target.value})}
                  />
                </div>

                <div>
                  <label className="text-[10px] font-black uppercase tracking-widest text-gray-400 block mb-1">Physical Address</label>
                  <textarea
                    rows={2}
                    placeholder="Street, Landmark, Door No..."
                    className="w-full px-4 py-3 rounded-2xl bg-gray-50 border border-gray-100 text-xs font-bold focus:bg-white focus:ring-2 focus:ring-emerald-500 focus:outline-none transition-all resize-none"
                    value={formData.address}
                    onChange={(e) => setFormData({...formData, address: e.target.value})}
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-[10px] font-black uppercase tracking-widest text-gray-400 block mb-1">Village Mapping</label>
                    <select
                      className="w-full px-3 py-3 rounded-2xl bg-gray-50 border border-gray-100 text-xs font-bold focus:bg-white focus:ring-2 focus:ring-emerald-500 focus:outline-none transition-all"
                      value={formData.villageId}
                      onChange={(e) => setFormData({...formData, villageId: e.target.value})}
                    >
                      <option value="">No Village Assigned</option>
                      {villages.map(v => (
                        <option key={v.id} value={v.id}>{v.name}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="text-[10px] font-black uppercase tracking-widest text-gray-400 block mb-1">Segmentation</label>
                    <select
                      className="w-full px-3 py-3 rounded-2xl bg-gray-50 border border-gray-100 text-xs font-bold focus:bg-white focus:ring-2 focus:ring-emerald-500 focus:outline-none transition-all uppercase"
                      value={formData.segment}
                      onChange={(e) => setFormData({...formData, segment: e.target.value})}
                    >
                      <option value="REGULAR">Regular</option>
                      <option value="PREMIUM">Premium</option>
                      <option value="ROUTE_WISE">Route Wise</option>
                      <option value="HIGH_VALUE">High Value</option>
                      <option value="ONLINE">Online Customer</option>
                    </select>
                  </div>
                </div>

                <div className="flex items-center gap-2 pt-2 bg-gray-50/50 p-3 rounded-xl border border-gray-100">
                  <input
                    type="checkbox"
                    id="onlineAccess"
                    className="w-4 h-4 rounded text-emerald-600 focus:ring-emerald-500 border-gray-200"
                    checked={formData.isOnline}
                    onChange={(e) => setFormData({...formData, isOnline: e.target.checked})}
                  />
                  <label htmlFor="onlineAccess" className="text-xs font-bold text-gray-700 select-none cursor-pointer">
                    Enable Web / App Online Integration Flow
                  </label>
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-gray-50">
                <button
                  type="button"
                  onClick={() => { setShowRegisterModal(false); setSelectedCustomer(null); }}
                  className="px-5 py-2.5 rounded-xl bg-gray-50 hover:bg-gray-100 text-gray-500 text-xs font-bold transition-all"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={formLoading}
                  className="px-6 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-md transition-all flex items-center gap-2 disabled:opacity-50"
                >
                  {formLoading && <Loader2 size={14} className="animate-spin" />}
                  Save Profile
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ================= MODAL: PURCHASE HISTORY AUDIT ================= */}
      {showDetailModal && selectedCustomer && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-[2.5rem] border border-gray-100 shadow-2xl w-full max-w-4xl max-h-[85vh] flex flex-col overflow-hidden animate-in zoom-in-95 duration-300">
            {/* Header Modal */}
            <div className="p-6 border-b border-gray-50 flex items-center justify-between bg-gray-50/50 shrink-0">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-emerald-50 text-emerald-600 font-black rounded-2xl flex items-center justify-center text-lg border border-emerald-100">
                  {selectedCustomer.name.charAt(0).toUpperCase()}
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h2 className="text-xl font-black text-gray-900 tracking-tight uppercase">{selectedCustomer.name}</h2>
                    <span className="text-[9px] font-black uppercase tracking-widest bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded-md">
                      {selectedCustomer.segment.replace('_', ' ')}
                    </span>
                  </div>
                  <p className="text-xs font-bold text-gray-500 mt-0.5">
                    Phone: {selectedCustomer.mobile} {selectedCustomer.village?.name && `• Area: ${selectedCustomer.village.name}`}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <button
                  onClick={() => handleOpenLedger(selectedCustomer, 'CREDIT')}
                  className="hidden md:flex items-center gap-1.5 px-3 py-1.5 bg-blue-50 text-blue-700 rounded-xl text-xs font-black border border-blue-100 hover:bg-blue-100 transition-all"
                >
                  <Wallet size={14} /> ₹{selectedCustomer.creditBalance || 0}
                </button>
                <button
                  onClick={() => handleOpenLedger(selectedCustomer, 'POINTS')}
                  className="hidden md:flex items-center gap-1.5 px-3 py-1.5 bg-purple-50 text-purple-700 rounded-xl text-xs font-black border border-purple-100 hover:bg-purple-100 transition-all"
                >
                  <Coins size={14} /> {selectedCustomer.loyaltyPoints || 0} Pts
                </button>
                <button 
                  onClick={() => setShowDetailModal(false)}
                  className="w-9 h-9 bg-white border border-gray-100 rounded-xl flex items-center justify-center text-gray-400 hover:bg-gray-50 transition-all shadow-sm"
                >
                  <X size={16} />
                </button>
              </div>
            </div>

            {/* List Body */}
            <div className="flex-1 overflow-y-auto p-6 space-y-4">
              <h3 className="text-xs font-black text-gray-400 uppercase tracking-widest">Continuous Transaction Log ({customerHistory.length})</h3>
              
              {historyLoading ? (
                <div className="flex flex-col items-center justify-center py-12 gap-2">
                  <Loader2 size={24} className="animate-spin text-emerald-600" />
                  <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Syncing Client Logs...</p>
                </div>
              ) : customerHistory.length === 0 ? (
                <div className="text-center py-12 border border-dashed border-gray-200 rounded-2xl">
                  <FileText size={32} className="mx-auto text-gray-300 mb-2" />
                  <p className="text-xs font-bold text-gray-400 uppercase tracking-widest">No Direct Or Legacy Invoice History Bound</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {customerHistory.map(ord => (
                    <div key={ord.id} className="bg-gray-50/60 p-4 rounded-2xl border border-gray-100/80 flex flex-col gap-3">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span className="font-black text-gray-900 text-xs uppercase">
                            #{ord.displayId || ord.orderNumber}
                          </span>
                          <span className={`text-[8px] font-black uppercase px-2 py-0.5 rounded tracking-widest ${
                            ord.status === 'COMPLETED' ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'
                          }`}>
                            {ord.status}
                          </span>
                        </div>
                        <span className="text-sm font-black text-emerald-700">₹{ord.totalAmount.toFixed(0)}</span>
                      </div>

                      <div className="flex items-center justify-between text-[10px] text-gray-500 font-bold border-t border-gray-100/60 pt-2.5">
                        <span className="flex items-center gap-1">
                          Sold by: {ord.user?.name || ord.userName || 'System'}
                        </span>
                        <span>{format(new Date(ord.createdAt), 'dd MMM yyyy, hh:mm a')}</span>
                      </div>

                      {/* Items loop summary */}
                      <div className="flex flex-wrap gap-1.5 pt-1">
                        {ord.items?.map((item, i) => (
                          <span key={i} className="text-[9px] bg-white px-2 py-0.5 rounded border border-gray-100 font-medium text-gray-600">
                            {item.product?.name || item.productName} (x{item.quantity})
                          </span>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ================= MODAL: ADJUST LEDGERS (CREDIT / POINTS) ================= */}
      {showLedgerModal && selectedCustomer && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-[2.5rem] border border-gray-100 shadow-2xl w-full max-w-sm overflow-hidden animate-in zoom-in-95 duration-300 p-6 space-y-5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className={`w-9 h-9 rounded-xl flex items-center justify-center font-black text-xs ${
                  ledgerType === 'CREDIT' ? 'bg-blue-50 text-blue-600 border border-blue-100' : 'bg-purple-50 text-purple-600 border border-purple-100'
                }`}>
                  {ledgerType === 'CREDIT' ? <Wallet size={16} /> : <Coins size={16} />}
                </div>
                <div>
                  <h3 className="text-sm font-black text-gray-900 tracking-tight uppercase">
                    Adjust {ledgerType === 'CREDIT' ? 'Credit Wallet' : 'Loyalty Points'}
                  </h3>
                  <p className="text-[9px] font-bold text-gray-400 tracking-widest uppercase">{selectedCustomer.name}</p>
                </div>
              </div>
              <button onClick={() => setShowLedgerModal(false)} className="text-gray-400 hover:text-gray-600">
                <X size={16} />
              </button>
            </div>

            <form onSubmit={handleLedgerSubmit} className="space-y-4">
              <div>
                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest block mb-1.5">Action Logic</label>
                <div className="grid grid-cols-2 gap-2 bg-gray-50 p-1 rounded-xl">
                  <button
                    type="button"
                    onClick={() => setLedgerAction('ADD')}
                    className={`py-2 text-xs font-black rounded-lg transition-all uppercase ${ledgerAction === 'ADD' ? 'bg-white text-emerald-600 shadow-sm' : 'text-gray-400'}`}
                  >
                    Add / Top-up
                  </button>
                  <button
                    type="button"
                    onClick={() => setLedgerAction('DEDUCT')}
                    className={`py-2 text-xs font-black rounded-lg transition-all uppercase ${ledgerAction === 'DEDUCT' ? 'bg-white text-rose-600 shadow-sm' : 'text-gray-400'}`}
                  >
                    Deduct / Use
                  </button>
                </div>
              </div>

              <div>
                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest block mb-1">
                  {ledgerType === 'CREDIT' ? 'Amount (₹)' : 'Points Count'}
                </label>
                <input 
                  type="number"
                  required
                  min="1"
                  step={ledgerType === 'CREDIT' ? '0.01' : '1'}
                  placeholder="Enter positive value"
                  className="w-full px-4 py-3 rounded-xl bg-gray-50 border border-gray-100 text-sm font-bold focus:bg-white focus:ring-2 focus:ring-emerald-500 focus:outline-none transition-all tabular-nums"
                  value={ledgerAmount}
                  onChange={(e) => setLedgerAmount(e.target.value)}
                />
              </div>

              <button
                type="submit"
                disabled={formLoading}
                className="w-full py-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-black shadow-md transition-all flex items-center justify-center gap-2 disabled:opacity-50 uppercase tracking-wider mt-2"
              >
                {formLoading && <Loader2 size={14} className="animate-spin" />}
                Confirm Execution
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
