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
  Store as StoreIcon
} from 'lucide-react';
import { useSearchParams, useLocation } from 'react-router-dom';
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
  'DEFAULT': <Layout size={18} className="text-gray-400" />
};

export default function AdminActivityLogs() {
  const [logs, setLogs] = useState([]);
  const [stores, setStores] = useState([]);
  const [loading, setLoading] = useState(true);
  const [pagination, setPagination] = useState({ total: 0, limit: 100, skip: 0 });
  const [searchParams, setSearchParams] = useSearchParams();
  const location = useLocation();
  const isTenantRoute = location.pathname.includes('/tenant/');
  
  const [activeTab, setActiveTab] = useState('org'); // 'org' (full team), 'my' (own), 'team' (agent drilldown)
  const [selectedAgent, setSelectedAgent] = useState(null);
  const [teamMembers, setTeamMembers] = useState([]);
  const [agentSearch, setAgentSearch] = useState('');

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
      } else if (activeTab === 'team' && selectedAgent) {
         params.userId = selectedAgent.id;
         params.targetUserId = selectedAgent.id; // Show actions BY them OR FOR them
      }

      if (filters.action !== 'all') params.action = filters.action;
      if (filters.storeId !== 'all') params.storeId = filters.storeId;

      const [logsRes, storesRes, usersRes] = await Promise.all([
        adminAPI.getActivityLogs(params),
        adminAPI.getStores(),
        activeTab === 'team' && !selectedAgent ? adminAPI.getUsers({ role: 'SALES_AGENT' }) : Promise.resolve({ data: [] })
      ]);

      if (logsRes.data) {
        setLogs(logsRes.data.logs);
        setPagination(logsRes.data.pagination);
      }
      
      if (storesRes.data?.success) {
        setStores(storesRes.data.data);
      }

      if (usersRes.data) {
        setTeamMembers(usersRes.data);
      }
    } catch (error) {
      toast.error('Failed to fetch activity logs');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLogs();
  }, [filters, activeTab, selectedAgent]);

  const handleAgentClick = (agent) => {
    setSelectedAgent(agent);
    setFilters(prev => ({ ...prev, skip: 0 }));
  };

  const handleBackToTeam = () => {
    setSelectedAgent(null);
    setFilters(prev => ({ ...prev, skip: 0 }));
  };

  const filteredTeam = teamMembers.filter(m => 
    m.name?.toLowerCase().includes(agentSearch.toLowerCase()) || 
    m.displayId?.toLowerCase().includes(agentSearch.toLowerCase())
  );

  const handlePageChange = (direction) => {
    const newSkip = direction === 'next' 
      ? filters.skip + filters.limit 
      : Math.max(0, filters.skip - filters.limit);
    setFilters(prev => ({ ...prev, skip: newSkip }));
  };

  const currentStoreName = stores.find(s => s.id === filters.storeId)?.name || 'All Branches';

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      {/* Header */}
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div className="flex flex-col gap-1">
          <div className="flex items-center gap-3">
            {filters.storeId !== 'all' && stores.length > 1 && (
              <button
                onClick={() => setFilters(prev => ({ ...prev, storeId: 'all', skip: 0 }))}
                className="p-2.5 bg-white border border-gray-100 rounded-xl text-gray-400 hover:text-indigo-600 hover:border-indigo-100 transition-all shadow-sm active:scale-90"
                title="Back to All Branches"
              >
                <ChevronLeft size={18} />
              </button>
            )}
            <div className="w-10 h-10 rounded-2xl bg-indigo-50 flex items-center justify-center text-indigo-600">
              <HistoryIcon size={24} />
            </div>
            <h2 className="text-2xl font-black text-gray-900 tracking-tight">System Activity Logs</h2>
          </div>
          <p className="text-sm font-medium text-gray-500">Track real-time operations across the organization</p>
        </div>

        <div className="flex items-center bg-gray-100 p-1.5 rounded-2xl">
           <button 
             onClick={() => { setActiveTab('org'); setSelectedAgent(null); }}
             className={`px-6 py-2 rounded-xl text-xs font-black transition-all ${activeTab === 'org' ? 'bg-white text-indigo-600 shadow-md' : 'text-gray-500 hover:text-gray-700'}`}
           >
              Organization
           </button>
           <button 
             onClick={() => { setActiveTab('my'); setSelectedAgent(null); }}
             className={`px-6 py-2 rounded-xl text-xs font-black transition-all ${activeTab === 'my' ? 'bg-white text-emerald-600 shadow-md' : 'text-gray-500 hover:text-gray-700'}`}
           >
              My Operations
           </button>
           <button 
             onClick={() => { setActiveTab('team'); setSelectedAgent(null); }}
             className={`px-6 py-2 rounded-xl text-xs font-black transition-all ${activeTab === 'team' ? 'bg-white text-indigo-600 shadow-md' : 'text-gray-500 hover:text-gray-700'}`}
           >
              Field Team
           </button>
        </div>
      </div>

      {activeTab === 'team' && !selectedAgent ? (
         <div className="space-y-6">
            <div className="relative group max-w-md">
              <div className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-indigo-500 transition-colors">
                <Search size={20} />
              </div>
              <input 
                type="text"
                placeholder="Search team members by name or ID..."
                value={agentSearch}
                onChange={(e) => setAgentSearch(e.target.value)}
                className="w-full pl-12 pr-4 py-4 bg-white rounded-3xl border border-gray-100 focus:outline-none focus:ring-4 focus:ring-indigo-50 shadow-sm font-bold text-gray-800"
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
               {filteredTeam.map(member => (
                 <button 
                   key={member.id}
                   onClick={() => handleAgentClick(member)}
                   className="flex items-center gap-4 bg-white p-6 rounded-[2.5rem] border border-gray-100 shadow-sm hover:border-indigo-200 hover:shadow-xl hover:shadow-indigo-500/5 transition-all group text-left"
                 >
                    <div className="w-16 h-16 bg-gradient-to-br from-indigo-500 to-indigo-700 rounded-3xl flex items-center justify-center text-white font-black text-2xl group-hover:scale-110 transition-transform shadow-lg shadow-indigo-500/20">
                      {member.name?.[0]}
                    </div>
                    <div className="flex-1">
                       <h4 className="font-black text-gray-900 group-hover:text-indigo-600 transition-colors">{member.name}</h4>
                       <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">{member.displayId} • {member.role}</p>
                       <div className="flex items-center gap-2 mt-2">
                          <div className="px-3 py-1 bg-indigo-50 text-indigo-600 rounded-full text-[10px] font-black uppercase tracking-wider">
                             View Activity Trail
                          </div>
                       </div>
                    </div>
                    <div className="w-10 h-10 rounded-full bg-gray-50 flex items-center justify-center text-gray-300 group-hover:bg-indigo-50 group-hover:text-indigo-500 transition-all">
                       <ChevronRight size={20} />
                    </div>
                 </button>
               ))}
            </div>

            {filteredTeam.length === 0 && !loading && (
              <div className="text-center py-20 bg-white rounded-[2.5rem] border border-dashed border-gray-200">
                 <User size={48} className="mx-auto text-gray-200 mb-4" />
                 <p className="text-gray-500 font-bold uppercase tracking-widest text-xs">No team members found</p>
              </div>
            )}
         </div>
      ) : (
         <>
         {/* Context Banner */}
         {selectedAgent && (
           <div className="flex items-center justify-between bg-indigo-600 p-6 rounded-[2rem] text-white shadow-xl shadow-indigo-500/20 animate-in slide-in-from-top-4 duration-500">
             <div className="flex items-center gap-6">
                <button 
                  onClick={handleBackToTeam}
                  className="p-3 bg-white/10 hover:bg-white/20 rounded-2xl transition-all"
                >
                  <ChevronLeft size={24} />
                </button>
                <div>
                   <h3 className="text-2xl font-black tracking-tight">{selectedAgent.name}'s History</h3>
                   <p className="text-indigo-100/60 text-xs font-bold uppercase tracking-[0.2em]">{selectedAgent.displayId} • Activity Trail</p>
                </div>
             </div>
             <div className="hidden md:flex gap-4">
                <div className="text-right">
                   <p className="text-indigo-200 text-[10px] font-black uppercase tracking-widest">Team Role</p>
                   <p className="text-lg font-black">{selectedAgent.role}</p>
                </div>
             </div>
           </div>
         )}

      {/* Filters Bar */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 bg-white p-4 rounded-3xl border border-gray-100 shadow-sm">
        {/* Action Type Filter */}
        <div className="flex items-center gap-3 bg-gray-50 px-4 py-2.5 rounded-2xl border border-gray-100 focus-within:ring-2 focus-within:ring-indigo-100 transition-all">
          <Filter size={18} className="text-gray-400" />
          <select 
            value={filters.action}
            onChange={(e) => setFilters(prev => ({ ...prev, action: e.target.value, skip: 0 }))}
            className="flex-1 bg-transparent border-none focus:outline-none text-sm font-bold text-gray-700 appearance-none cursor-pointer"
          >
            <option value="all">All Activities</option>
            <option value="SALE_COMPLETED">Sales Transactions</option>
            <option value="REFILL_REQUESTED">Refill Requests</option>
            <option value="REFILL_APPROVED">Refill Approvals</option>
            <option value="OPENING_CASH_SUBMITTED">Cash Openings</option>
            <option value="CLOSING_CASH_SUBMITTED">Cash Closings</option>
            <option value="EXPENSE_REQUESTED">Expense Requests</option>
            <option value="EXPENSE_APPROVED">Expense Approvals</option>
            <option value="EXPENSE_REJECTED">Expense Rejections</option>
            <option value="CASH_TO_CHEST_SUBMITTED">Chest Transfers</option>
            <option value="STOCK_AUDITED">Inventory Audits</option>
            <option value="ASSET_ASSIGNED">Asset Assignments</option>
            <option value="ASSET_RETURNED">Asset Returns</option>
            <option value="ASSET_ISSUE_REPORTED">Asset Issues</option>
            <option value="ASSET_REQUEST_SUBMITTED">Asset Requests</option>
            <option value="LEVEL_UP">Performance Milestones</option>
            <option value="STOCK_LOADING">Stock Loading</option>
            <option value="STOCK_RETURNED">Stock Returns</option>
            <option value="ROUTE_ASSIGNED">Route Assignments</option>
            <option value="USER_CREATED">User Management</option>
            <option value="VEHICLE_CREATED">Fleet Management</option>
            <option value="PO_CREATED">Procurement (POs)</option>
            <option value="GRN_CREATED">Stock Receipts (GRN)</option>
            <option value="PURCHASE_INVOICE_CREATED">Purchase Invoices</option>
          </select>
        </div>

        {/* Store/Branch Filter */}
        {stores.length > 1 && (
          <div className="flex items-center gap-3 bg-gray-50 px-4 py-2.5 rounded-2xl border border-gray-100 focus-within:ring-2 focus-within:ring-indigo-100 transition-all">
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
        )}

        {/* Date Context (Display only for now) */}
        <div className="flex items-center gap-3 bg-indigo-50/50 px-4 py-2.5 rounded-2xl border border-indigo-100/50">
          <Calendar size={18} className="text-indigo-500" />
          <span className="text-sm font-black text-indigo-700 uppercase tracking-widest">
            {format(new Date(), 'dd MMMM, yyyy')}
          </span>
        </div>
      </div>
      </>
      )}

      {/* Main Content */}
      <div className="space-y-4">
      {(activeTab !== 'team' || selectedAgent) && (
        <div className="space-y-4">
          {loading ? (
            <div className="flex flex-col items-center justify-center py-20 gap-4">
              <Loader2 className="animate-spin text-indigo-600" size={40} />
              <p className="text-gray-500 font-bold uppercase tracking-widest text-[10px]">Syncing Activity Ledger...</p>
            </div>
          ) : logs.length === 0 ? (
            <div className="text-center py-20 bg-white rounded-[2.5rem] border border-dashed border-gray-200">
              <HistoryIcon size={64} className="mx-auto text-gray-200 mb-4" />
              <p className="text-gray-500 font-bold uppercase tracking-widest text-xs">No activity trails found for this selection</p>
            </div>
          ) : (
            <>
              {/* Desktop Table */}
              <div className="hidden md:block bg-white rounded-[2.5rem] border border-gray-100 shadow-sm overflow-hidden">
                <table className="w-full border-collapse">
                  <thead>
                    <tr className="bg-gray-50/50 border-b border-gray-50">
                      <th className="px-8 py-5 text-[10px] font-black uppercase tracking-widest text-gray-400">Activity & Timestamp</th>
                      <th className="px-8 py-5 text-[10px] font-black uppercase tracking-widest text-gray-400">Individual Agent</th>
                      <th className="px-8 py-5 text-[10px] font-black uppercase tracking-widest text-gray-400">description</th>
                      <th className="px-8 py-5 text-[10px] font-black uppercase tracking-widest text-gray-400">Store Context</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50/50">
                    {logs.map((log) => (
                      <tr key={log.id} className="hover:bg-indigo-50/20 transition-all group">
                        <td className="px-8 py-5">
                          <div className="flex items-center gap-4">
                            <div className="w-10 h-10 rounded-xl bg-white border border-gray-100 shadow-sm flex items-center justify-center group-hover:scale-110 transition-transform">
                              {ACTION_ICONS[log.action] || ACTION_ICONS.DEFAULT}
                            </div>
                            <div className="flex flex-col">
                              <span className="text-xs font-black text-gray-900 uppercase tracking-tight">
                                {log.action.replace(/_/g, ' ')}
                              </span>
                              <span className="text-[10px] font-bold text-gray-400 uppercase">
                                {format(new Date(log.createdAt), 'hh:mm:ss a • dd MMM')}
                              </span>
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
                              <span className="text-[10px] font-black text-indigo-500 uppercase tracking-wider">{log.user?.role?.replace('_', ' ')}</span>
                            </div>
                          </div>
                        </td>
                        <td className="px-8 py-5">
                          <p className="text-sm font-medium text-gray-600 max-w-sm">{log.details}</p>
                        </td>
                        <td className="px-8 py-5">
                          <div className="flex items-center gap-2">
                            <StoreIcon size={14} className="text-gray-300" />
                            <span className="text-xs font-bold text-gray-500 uppercase tracking-tight">
                              {log.store?.name || 'Central Org'}
                            </span>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Mobile View */}
              <div className="md:hidden space-y-4">
                {logs.map((log) => (
                  <div key={log.id} className="bg-white p-5 rounded-3xl border border-gray-100 shadow-sm space-y-4">
                    <div className="flex justify-between items-start">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-2xl bg-indigo-50 flex items-center justify-center text-indigo-600">
                          {ACTION_ICONS[log.action] || ACTION_ICONS.DEFAULT}
                        </div>
                        <div>
                          <h3 className="text-xs font-black text-gray-900 uppercase tracking-tight">{log.action.replace(/_/g, ' ')}</h3>
                          <p className="text-[10px] font-bold text-gray-400 uppercase">{format(new Date(log.createdAt), 'hh:mm a • dd MMM')}</p>
                        </div>
                      </div>
                    </div>
                    <div className="p-3 bg-gray-50 rounded-2xl">
                      <p className="text-sm font-bold text-slate-700 leading-snug mb-2 whitespace-normal">{log.details}</p>
                    </div>
                    <div className="flex items-center justify-between pt-2 border-t border-gray-50">
                      <div className="flex items-center gap-2">
                        <div className="w-6 h-6 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-600">
                          <User size={10} />
                        </div>
                        <span className="text-[10px] font-black text-gray-700 uppercase">{log.user?.name}</span>
                      </div>
                      <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">{log.store?.name || 'CENTRAL'}</span>
                    </div>
                  </div>
                ))}
              </div>

              {/* Pagination */}
              <div className="flex items-center justify-between bg-white px-8 py-4 rounded-[2rem] border border-gray-100 shadow-sm">
                <span className="text-[10px] font-black uppercase text-gray-400 tracking-widest">
                  Showing {logs.length} Recent Logs
                </span>
                <div className="flex items-center gap-2">
                  <button 
                    onClick={() => handlePageChange('prev')}
                    disabled={filters.skip === 0}
                    className="p-2 rounded-xl border border-gray-100 text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 disabled:opacity-30 transition-all"
                  >
                    <ChevronLeft size={20} />
                  </button>
                  <button 
                    onClick={() => handlePageChange('next')}
                    disabled={logs.length < filters.limit}
                    className="p-2 rounded-xl border border-gray-100 text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 disabled:opacity-30 transition-all"
                  >
                    <ChevronRight size={20} />
                  </button>
                </div>
              </div>
            </>
          )}
        </div>
      )}
      </div>
    </div>
  );
}
