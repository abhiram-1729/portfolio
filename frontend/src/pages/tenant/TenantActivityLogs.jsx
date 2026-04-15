import React, { useState, useEffect } from 'react';
import { 
  History as HistoryIcon, 
  Search, 
  Filter, 
  Calendar, 
  User, 
  Layout, 
  Loader2, 
  Scale, 
  ShoppingCart, 
  RefreshCcw, 
  Banknote, 
  CreditCard,
  ChevronLeft,
  ChevronRight,
  Eye,
  PieChart,
  ClipboardList,
  AlertCircle,
  CheckCircle,
  XCircle,
  Trophy,
  Truck,
  Package,
  Route,
  ShoppingBag,
  FileText,
  ClipboardCheck,
  Box,
  Store as StoreIcon,
  ShieldCheck
} from 'lucide-react';
import { useSearchParams } from 'react-router-dom';
import { adminAPI } from '../../services/adminService';
import { useUserStore } from '../../store/userStore';
import toast from 'react-hot-toast';
import { format } from 'date-fns';

const ACTION_ICONS = {
  'SALE_COMPLETED': <ShoppingCart size={18} className="text-emerald-500" />,
  'REFILL_REQUESTED': <RefreshCcw size={18} className="text-blue-500" />,
  'REFILL_APPROVED': <RefreshCcw size={18} className="text-emerald-600" />,
  'OPENING_CASH_SUBMITTED': <Banknote size={18} className="text-amber-500" />,
  'CLOSING_CASH_SUBMITTED': <Banknote size={18} className="text-indigo-500" />,
  'EXPENSE_REQUESTED': <CreditCard size={18} className="text-rose-500" />,
  'EXPENSE_APPROVED': <CreditCard size={18} className="text-emerald-500" />,
  'EXPENSE_REJECTED': <CreditCard size={18} className="text-gray-400" />,
  'CASH_TO_CHEST_SUBMITTED': <Scale size={18} className="text-cyan-600" />,
  'ASSET_ASSIGNED': <Box size={18} className="text-emerald-500" />,
  'ASSET_RETURNED': <Box size={18} className="text-amber-500" />,
  'ASSET_ISSUE_REPORTED': <AlertCircle size={18} className="text-rose-500" />,
  'ASSET_REQUEST_SUBMITTED': <ClipboardList size={18} className="text-blue-500" />,
  'ASSET_REQ_APPROVED': <CheckCircle size={18} className="text-emerald-600" />,
  'ASSET_REQ_REJECTED': <XCircle size={18} className="text-gray-400" />,
  'LEVEL_UP': <Trophy size={18} className="text-yellow-500" />,
  'STOCK_LOADING': <Truck size={18} className="text-orange-500" />,
  'STOCK_RETURNED': <Package size={18} className="text-blue-400" />,
  'STOCK_AUDITED': <HistoryIcon size={18} className="text-fuchsia-500" />,
  'ROUTE_ASSIGNED': <Route size={18} className="text-indigo-500" />,
  'ROUTE_UPDATED': <Route size={18} className="text-blue-500" />,
  'ROUTE_REMOVED': <Route size={18} className="text-rose-400" />,
  'PO_CREATED': <ShoppingBag size={18} className="text-indigo-500" />,
  'PO_UPDATED': <ClipboardCheck size={18} className="text-blue-500" />,
  'GRN_CREATED': <Package size={18} className="text-emerald-500" />,
  'PURCHASE_INVOICE_CREATED': <FileText size={18} className="text-amber-500" />,
  'USER_CREATED': <User size={18} className="text-indigo-600" />,
  'USER_UPDATED': <User size={18} className="text-indigo-400" />,
  'VEHICLE_CREATED': <Truck size={18} className="text-slate-600" />,
  'DEFAULT': <Layout size={18} className="text-gray-400" />
};

export default function TenantActivityLogs() {
  const [logs, setLogs] = useState([]);
  const [stores, setStores] = useState([]);
  const [loading, setLoading] = useState(true);
  const [pagination, setPagination] = useState({ total: 0, limit: 100, skip: 0 });
  const [searchParams] = useSearchParams();
  
  const [activeTab, setActiveTab] = useState('org'); // 'org', 'my', 'managers', 'team'
  const [selectedUser, setSelectedUser] = useState(null);
  const [userList, setUserList] = useState([]);
  const [userSearch, setUserSearch] = useState('');

  const [filters, setFilters] = useState({
    action: searchParams.get('action') || 'all',
    storeId: searchParams.get('storeId') || 'all',
    limit: 100,
    skip: 0
  });

  const { user: currentUser } = useUserStore();

  const fetchLogs = async () => {
    try {
      setLoading(true);
      const params = {
        limit: filters.limit,
        skip: filters.skip
      };
      
      if (activeTab === 'my') {
         params.userId = currentUser?.id;
      } else if (selectedUser) {
         params.userId = selectedUser.id;
         params.targetUserId = selectedUser.id;
      }

      if (filters.action !== 'all') params.action = filters.action;
      if (filters.storeId !== 'all') params.storeId = filters.storeId;

      const [logsRes, storesRes] = await Promise.all([
        adminAPI.getActivityLogs(params),
        adminAPI.getStores()
      ]);

      if (logsRes.data) {
        setLogs(logsRes.data.logs);
        setPagination(logsRes.data.pagination);
      }
      
      if (storesRes.data?.success) {
        setStores(storesRes.data.data);
      }
    } catch (error) {
      toast.error('Failed to fetch activity logs');
    } finally {
      setLoading(false);
    }
  };

  const fetchUsers = async () => {
    try {
      if (activeTab === 'managers') {
        const res = await adminAPI.getUsers({ role: 'ADMIN' });
        setUserList(res.data || []);
      } else if (activeTab === 'team') {
        const res = await adminAPI.getUsers({ role: 'SALES_AGENT' });
        setUserList(res.data || []);
      }
    } catch (error) {
      toast.error('Failed to fetch user list');
    }
  };

  useEffect(() => {
    fetchLogs();
  }, [filters, activeTab, selectedUser]);

  useEffect(() => {
    if (activeTab === 'managers' || activeTab === 'team') {
       fetchUsers();
    }
    setSelectedUser(null);
  }, [activeTab]);

  const handleUserClick = (u) => {
    setSelectedUser(u);
    setFilters(prev => ({ ...prev, skip: 0 }));
  };

  const handleBackToGrid = () => {
    setSelectedUser(null);
    setFilters(prev => ({ ...prev, skip: 0 }));
  };

  const filteredUsers = userList.filter(u => 
    u.name?.toLowerCase().includes(userSearch.toLowerCase()) || 
    u.displayId?.toLowerCase().includes(userSearch.toLowerCase())
  );

  const handlePageChange = (direction) => {
    const newSkip = direction === 'next' 
      ? filters.skip + filters.limit 
      : Math.max(0, filters.skip - filters.limit);
    setFilters(prev => ({ ...prev, skip: newSkip }));
  };

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      {/* Header */}
      <div className="flex flex-col xl:flex-row items-start xl:items-center justify-between gap-6">
        <div className="flex flex-col gap-1">
          <div className="flex items-center gap-2">
            <div className="w-10 h-10 rounded-2xl bg-indigo-50 flex items-center justify-center text-indigo-600">
              <HistoryIcon size={24} />
            </div>
            <h2 className="text-2xl font-black text-gray-900 tracking-tight">Audit Trail & Activity Logs</h2>
          </div>
          <p className="text-sm font-medium text-gray-500 ml-12 text-nowrap">Organization-wide operational transparency</p>
        </div>

        <div className="flex items-center bg-gray-100 p-1.5 rounded-2xl overflow-x-auto w-full xl:w-auto no-scrollbar">
           <button 
             onClick={() => setActiveTab('org')}
             className={`px-5 py-2 rounded-xl text-xs font-black transition-all whitespace-nowrap ${activeTab === 'org' ? 'bg-white text-indigo-600 shadow-md' : 'text-gray-500'}`}
           >
              Organization
           </button>
           <button 
             onClick={() => setActiveTab('my')}
             className={`px-5 py-2 rounded-xl text-xs font-black transition-all whitespace-nowrap ${activeTab === 'my' ? 'bg-white text-emerald-600 shadow-md' : 'text-gray-500'}`}
           >
              My Ops
           </button>
           <button 
             onClick={() => setActiveTab('managers')}
             className={`px-5 py-2 rounded-xl text-xs font-black transition-all whitespace-nowrap ${activeTab === 'managers' ? 'bg-white text-amber-600 shadow-md' : 'text-gray-500'}`}
           >
              Manager Logs
           </button>
           <button 
             onClick={() => setActiveTab('team')}
             className={`px-5 py-2 rounded-xl text-xs font-black transition-all whitespace-nowrap ${activeTab === 'team' ? 'bg-white text-indigo-600 shadow-md' : 'text-gray-500'}`}
           >
              Field Team
           </button>
        </div>
      </div>

      {(activeTab === 'managers' || activeTab === 'team') && !selectedUser ? (
         <div className="space-y-6">
            <div className="relative group max-w-md">
              <div className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-indigo-500 transition-colors">
                <Search size={20} />
              </div>
              <input 
                type="text"
                placeholder={`Search ${activeTab === 'managers' ? 'Managers' : 'Agents'}...`}
                value={userSearch}
                onChange={(e) => setUserSearch(e.target.value)}
                className="w-full pl-12 pr-4 py-4 bg-white rounded-3xl border border-gray-100 focus:outline-none focus:ring-4 focus:ring-indigo-50 shadow-sm font-bold text-gray-800"
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
               {filteredUsers.map(member => (
                 <button 
                   key={member.id}
                   onClick={() => handleUserClick(member)}
                   className="flex items-center gap-4 bg-white p-6 rounded-[2.5rem] border border-gray-100 shadow-sm hover:border-indigo-200 hover:shadow-xl hover:shadow-indigo-500/5 transition-all group text-left"
                 >
                    <div className={`w-16 h-16 bg-gradient-to-br ${activeTab === 'managers' ? 'from-amber-400 to-amber-600' : 'from-indigo-500 to-indigo-700'} rounded-3xl flex items-center justify-center text-white font-black text-2xl group-hover:scale-110 transition-transform shadow-lg`}>
                      {member.name?.[0]}
                    </div>
                    <div className="flex-1">
                       <h4 className="font-black text-gray-900 group-hover:text-indigo-600 transition-colors">{member.name}</h4>
                       <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">{member.displayId} • {member.role}</p>
                       <div className="mt-2 text-[10px] font-black text-indigo-500 uppercase">View Audit Trail</div>
                    </div>
                    <ChevronRight size={20} className="text-gray-300 group-hover:text-indigo-500" />
                 </button>
               ))}
            </div>
         </div>
      ) : (
         <>
         {selectedUser && (
           <div className={`flex items-center justify-between ${activeTab === 'managers' ? 'bg-amber-600' : 'bg-indigo-600'} p-6 rounded-[2rem] text-white shadow-xl animate-in slide-in-from-top-4 duration-500`}>
             <div className="flex items-center gap-6">
                <button onClick={handleBackToGrid} className="p-3 bg-white/10 hover:bg-white/20 rounded-2xl transition-all">
                  <ChevronLeft size={24} />
                </button>
                <div>
                   <h3 className="text-2xl font-black tracking-tight">{selectedUser.name}'s History</h3>
                   <p className="text-white/60 text-xs font-bold uppercase tracking-widest">{selectedUser.displayId} • Audit Ledger</p>
                </div>
             </div>
           </div>
         )}

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 bg-white p-4 rounded-3xl border border-gray-100 shadow-sm">
          <div className="flex items-center gap-3 bg-gray-50 px-4 py-2.5 rounded-2xl border border-gray-100">
            <Filter size={18} className="text-gray-400" />
            <select 
              value={filters.action}
              onChange={(e) => setFilters(prev => ({ ...prev, action: e.target.value, skip: 0 }))}
              className="flex-1 bg-transparent border-none focus:outline-none text-sm font-bold text-gray-700 appearance-none cursor-pointer"
            >
              <option value="all">All Activities</option>
              <option value="SALE_COMPLETED">Sales Transactions</option>
              <option value="REFILL_REQUESTED">Refill Requests</option>
              <option value="EXPENSE_APPROVED">Expense Approvals</option>
              <option value="STOCK_AUDITED">Inventory Audits</option>
              <option value="USER_CREATED">Personnel Management</option>
              <option value="VEHICLE_CREATED">Fleet Management</option>
              <option value="PO_CREATED">Procurement</option>
            </select>
          </div>

          <div className="flex items-center gap-3 bg-gray-50 px-4 py-2.5 rounded-2xl border border-gray-100">
            <StoreIcon size={18} className="text-gray-400" />
            <select 
              value={filters.storeId}
              onChange={(e) => setFilters(prev => ({ ...prev, storeId: e.target.value, skip: 0 }))}
              className="flex-1 bg-transparent border-none focus:outline-none text-sm font-bold text-gray-700 appearance-none cursor-pointer"
            >
              <option value="all">All Branches</option>
              {stores.map(s => (
                <option key={s.id} value={s.id}>{s.name}</option>
              ))}
            </select>
          </div>

          <div className="flex items-center gap-3 bg-indigo-50/50 px-4 py-2.5 rounded-2xl border border-indigo-100/50">
            <Calendar size={18} className="text-indigo-500" />
            <span className="text-sm font-black text-indigo-700 uppercase tracking-widest">
              {format(new Date(), 'dd MMMM, yyyy')}
            </span>
          </div>
        </div>

        <div className="space-y-4">
          {loading ? (
            <div className="flex flex-col items-center justify-center py-20 gap-4">
              <Loader2 className="animate-spin text-indigo-600" size={40} />
              <p className="text-gray-500 font-bold uppercase tracking-widest text-[10px]">Syncing Central Ledger...</p>
            </div>
          ) : logs.length === 0 ? (
            <div className="text-center py-20 bg-white rounded-[2.5rem] border border-dashed border-gray-200">
              <HistoryIcon size={64} className="mx-auto text-gray-200 mb-4" />
              <p className="text-gray-500 font-bold uppercase tracking-widest text-xs">No activity trails found</p>
            </div>
          ) : (
            <>
              <div className="hidden md:block bg-white rounded-[2.5rem] border border-gray-100 shadow-sm overflow-hidden">
                <table className="w-full border-collapse">
                  <thead>
                    <tr className="bg-gray-50/50 border-b border-gray-50">
                      <th className="px-8 py-5 text-[10px] font-black uppercase tracking-widest text-gray-400">Activity & Timestamp</th>
                      <th className="px-8 py-5 text-[10px] font-black uppercase tracking-widest text-gray-400">User Context</th>
                      <th className="px-8 py-5 text-[10px] font-black uppercase tracking-widest text-gray-400">Description</th>
                      <th className="px-8 py-5 text-[10px] font-black uppercase tracking-widest text-gray-400">Branch</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50/50">
                    {logs.map((log) => (
                      <tr key={log.id} className="hover:bg-indigo-50/20 transition-all group">
                        <td className="px-8 py-5">
                          <div className="flex items-center gap-4">
                            <div className="w-10 h-10 rounded-xl bg-white border border-gray-100 shadow-sm flex items-center justify-center">
                              {ACTION_ICONS[log.action] || ACTION_ICONS.DEFAULT}
                            </div>
                            <div className="flex flex-col">
                              <span className="text-xs font-black text-gray-900 uppercase tracking-tight">{log.action.replace(/_/g, ' ')}</span>
                              <span className="text-[10px] font-bold text-gray-400 uppercase">{format(new Date(log.createdAt), 'hh:mm a • dd MMM')}</span>
                            </div>
                          </div>
                        </td>
                        <td className="px-8 py-5">
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center text-gray-400">
                               <User size={14} />
                            </div>
                            <div className="flex flex-col">
                              <span className="text-sm font-bold text-gray-800">{log.user?.name}</span>
                              <span className="text-[10px] font-black text-indigo-500 uppercase">{log.user?.role}</span>
                            </div>
                          </div>
                        </td>
                        <td className="px-8 py-5">
                          <p className="text-sm font-medium text-gray-600 max-w-sm">{log.details}</p>
                        </td>
                        <td className="px-8 py-5">
                          <span className="text-xs font-bold text-gray-500 uppercase tracking-tight">{log.store?.name || 'Central'}</span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="md:hidden space-y-4">
                {logs.map((log) => (
                  <div key={log.id} className="bg-white p-5 rounded-3xl border border-gray-100 shadow-sm space-y-4">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-2xl bg-indigo-50 flex items-center justify-center text-indigo-600">
                        {ACTION_ICONS[log.action] || ACTION_ICONS.DEFAULT}
                      </div>
                      <div>
                        <h3 className="text-xs font-black text-gray-900 uppercase">{log.action.replace(/_/g, ' ')}</h3>
                        <p className="text-[10px] font-bold text-gray-400 uppercase">{format(new Date(log.createdAt), 'hh:mm a • dd MMM')}</p>
                      </div>
                    </div>
                    <p className="text-sm font-bold text-slate-700 leading-snug">{log.details}</p>
                  </div>
                ))}
              </div>

              <div className="flex items-center justify-between bg-white px-8 py-4 rounded-[2rem] border border-gray-100 shadow-sm">
                <span className="text-[10px] font-black uppercase text-gray-400 tracking-widest">Page Navigation</span>
                <div className="flex items-center gap-2">
                  <button onClick={() => handlePageChange('prev')} disabled={filters.skip === 0} className="p-2 rounded-xl border border-gray-100 text-gray-400 disabled:opacity-30"><ChevronLeft /></button>
                  <button onClick={() => handlePageChange('next')} disabled={logs.length < filters.limit} className="p-2 rounded-xl border border-gray-100 text-gray-400 disabled:opacity-30"><ChevronRight /></button>
                </div>
              </div>
            </>
          )}
        </div>
         </>
      )}
    </div>
  );
}
