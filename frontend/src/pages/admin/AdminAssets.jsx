import React, { useState, useEffect, useMemo } from 'react';
import { Package, Plus, Search, X, Loader2, Pencil, Trash2, Truck, Users, ArrowLeft, AlertTriangle,
  CheckCircle2, XCircle, Monitor, Box, Tag, Hash, ArrowUpCircle, ArrowDownCircle, BarChart3, Eye, MessageSquare, RefreshCcw } from 'lucide-react';
import adminAPI from '../../services/adminService';
import toast from 'react-hot-toast';
import { useSearchParams, useLocation } from 'react-router-dom';
import { useUserStore } from '../../store/userStore';
import StoreSelector from './StoreSelector';

export default function AdminAssets() {
  const [activeTab, setActiveTab] = useState('master');
  const [searchQuery, setSearchQuery] = useState('');
  const [assets, setAssets] = useState([]);
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Modals
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showAddUnitsModal, setShowAddUnitsModal] = useState(false);
  const [showAssignModal, setShowAssignModal] = useState(false);
  const [showReturnModal, setShowReturnModal] = useState(false);
  const [showDetailModal, setShowDetailModal] = useState(null);

  // Tracking & Issues & Reports
  const [tracking, setTracking] = useState([]);
  const [issues, setIssues] = useState([]);
  const [requests, setRequests] = useState([]);
  const [reports, setReports] = useState(null);
  const [assetCategories, setAssetCategories] = useState([]);

  // Form states
  const [form, setForm] = useState({ name: '', categoryId: '', assetType: 'NON_ELECTRONIC', model: '', brand: '', description: '', estimatedCost: '' });
  const [editForm, setEditForm] = useState(null);
  const [selectedFile, setSelectedFile] = useState(null);
  const [editFile, setEditFile] = useState(null);

  // Units form
  const [unitsTarget, setUnitsTarget] = useState(null);
  const [unitsForm, setUnitsForm] = useState({ quantity: '', serialNumbers: '', condition: 'NEW' });

  // Assign form
  const [assignForm, setAssignForm] = useState({ userId: '', assetId: '', quantity: '1', serialNumber: '', condition: 'GOOD' });

  // Return form
  const [returnForm, setReturnForm] = useState({ assignmentId: '', returnCondition: 'GOOD', remarks: '' });

  const [searchParams, setSearchParams] = useSearchParams();
  const storeId = searchParams.get('storeId');
  const location = useLocation();
  const currentUser = useUserStore(s => s.user);

  useEffect(() => {
    fetchAll();
  }, [storeId]);

  useEffect(() => {
    if (activeTab === 'tracking') loadTracking();
    if (activeTab === 'issues') loadIssues();
    if (activeTab === 'requests') loadRequests();
    if (activeTab === 'reports') loadReports();
  }, [activeTab]);

  const fetchAll = async () => {
    try {
      const [aRes, uRes, cRes] = await Promise.all([
        adminAPI.getAssets({ storeId }),
        adminAPI.getUsers({ storeId }),
        adminAPI.getAssetCategories()
      ]);
      setAssets(aRes.data);
      setUsers(uRes.data.filter(u => u.role === 'SALES_AGENT' || u.role === 'SUPERVISOR' || u.role === 'HELPER'));
      setAssetCategories(cRes.data);
    } catch (err) {
      toast.error('Failed to load assets');
    } finally {
      setLoading(false);
    }
  };

  const loadTracking = async () => {
    try {
      const { data } = await adminAPI.getAssetTracking();
      setTracking(data);
    } catch { toast.error('Failed to load tracking'); }
  };

  const loadIssues = async () => {
    try {
      const { data } = await adminAPI.getAssetIssues();
      setIssues(data);
    } catch { toast.error('Failed to load issues'); }
  };

  const loadReports = async () => {
    try {
      const { data } = await adminAPI.getAssetReports();
      setReports(data);
    } catch { toast.error('Failed to load reports'); }
  };

  const loadRequests = async () => {
    try {
      const { data } = await adminAPI.getAssetRequests();
      setRequests(data);
    } catch { toast.error('Failed to load requests'); }
  };

  const handleRequestUpdate = async (id, status, remark = '') => {
    try {
      await adminAPI.updateAssetRequest(id, { status, adminRemark: remark });
      toast.success(`Request ${status.toLowerCase()}`);
      loadRequests();
    } catch { toast.error('Failed to update request'); }
  };

  const handleCreate = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      const fd = new FormData();
      Object.entries(form).forEach(([k, v]) => { if (v) fd.append(k, v); });
      if (selectedFile) fd.append('image', selectedFile);
      await adminAPI.createAsset(fd);
      toast.success('Asset created');
      setShowCreateModal(false);
      setForm({ name: '', categoryId: '', assetType: 'NON_ELECTRONIC', model: '', brand: '', description: '', estimatedCost: '' });
      setSelectedFile(null);
      fetchAll();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to create asset');
    } finally { setIsSubmitting(false); }
  };

  const handleUpdate = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      const fd = new FormData();
      Object.entries(editForm).forEach(([k, v]) => { if (k !== 'id' && v !== undefined && v !== null) fd.append(k, v); });
      if (editFile) fd.append('image', editFile);
      await adminAPI.updateAsset(editForm.id, fd);
      toast.success('Asset updated');
      setShowEditModal(false);
      setEditForm(null);
      setEditFile(null);
      fetchAll();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to update');
    } finally { setIsSubmitting(false); }
  };

  const handleDelete = async (id, name) => {
    if (!window.confirm(`Delete "${name}" and all its units? This cannot be undone.`)) return;
    try {
      await adminAPI.deleteAsset(id);
      toast.success('Asset deleted');
      fetchAll();
    } catch { toast.error('Failed to delete asset'); }
  };

  const handleAddUnits = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      const data = {
        condition: unitsForm.condition,
      };
      if (unitsTarget.assetType === 'ELECTRONIC') {
        data.serialNumbers = unitsForm.serialNumbers.split('\n').map(s => s.trim()).filter(Boolean);
        if (data.serialNumbers.length === 0) { toast.error('Enter serial numbers'); setIsSubmitting(false); return; }
      } else {
        data.quantity = parseInt(unitsForm.quantity) || 1;
      }
      await adminAPI.addAssetUnits(unitsTarget.id, data);
      toast.success('Units added');
      setShowAddUnitsModal(false);
      setUnitsTarget(null);
      setUnitsForm({ quantity: '', serialNumbers: '', condition: 'NEW' });
      fetchAll();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to add units');
    } finally { setIsSubmitting(false); }
  };

  const handleAssign = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      await adminAPI.assignAsset(assignForm);
      toast.success('Asset assigned');
      setShowAssignModal(false);
      setAssignForm({ userId: '', assetId: '', quantity: '1', serialNumber: '', condition: 'GOOD' });
      fetchAll();
      if (activeTab === 'tracking') loadTracking();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to assign');
    } finally { setIsSubmitting(false); }
  };

  const handleReturn = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      await adminAPI.returnAsset(returnForm);
      toast.success('Asset returned');
      setShowReturnModal(false);
      setReturnForm({ assignmentId: '', returnCondition: 'GOOD', remarks: '' });
      fetchAll();
      loadTracking();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to return');
    } finally { setIsSubmitting(false); }
  };

  const handleIssueStatus = async (id, status) => {
    try {
      await adminAPI.updateAssetIssue(id, { status });
      toast.success('Issue updated');
      loadIssues();
    } catch { toast.error('Failed to update issue'); }
  };

  const filteredAssets = useMemo(() => {
    const q = searchQuery.toLowerCase();
    return assets.filter(a => a.name.toLowerCase().includes(q) || (a.model || '').toLowerCase().includes(q) || (a.brand || '').toLowerCase().includes(q));
  }, [assets, searchQuery]);

  const selectedAssetForAssign = useMemo(() => {
    return assets.find(a => a.id === assignForm.assetId);
  }, [assets, assignForm.assetId]);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
        <Loader2 className="animate-spin text-emerald-600" size={40} />
        <p className="text-gray-500 font-medium">Loading Assets...</p>
      </div>
    );
  }

  const tabs = [
    { key: 'master', label: 'Assets', icon: <Package size={14} /> },
    { key: 'assign', label: 'Assign', icon: <Users size={14} /> },
    { key: 'tracking', label: 'Tracking', icon: <Eye size={14} /> },
    { key: 'issues', label: 'Issues', icon: <AlertTriangle size={14} /> },
    { key: 'requests', label: 'Requests', icon: <MessageSquare size={14} /> },
    { key: 'reports', label: 'Reports', icon: <BarChart3 size={14} /> },
  ];

  // ─── Master Tab ─────────────────────────────────────────
  const renderMaster = () => (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <div className="flex-1 flex items-center gap-2 bg-white p-2.5 rounded-2xl border border-gray-100 shadow-sm">
          <Search size={18} className="text-gray-400 shrink-0 ml-2" />
          <input type="text" placeholder="Search assets..." className="w-full bg-transparent border-none focus:outline-none text-sm"
            value={searchQuery} onChange={e => setSearchQuery(e.target.value)} />
        </div>
        <button onClick={() => setShowCreateModal(true)}
          className="bg-emerald-600 text-white p-3 rounded-xl shadow-lg hover:bg-emerald-700 transition-colors shrink-0">
          <Plus size={24} />
        </button>
      </div>

      {filteredAssets.length === 0 ? (
        <div className="py-12 bg-white rounded-2xl border border-gray-100 text-center shadow-sm">
          <Package size={32} className="mx-auto text-gray-200 mb-2" />
          <p className="text-sm font-bold text-gray-400">No assets found</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredAssets.map(asset => {
            const available = (asset.units || []).filter(u => u.status === 'AVAILABLE').length;
            const assigned = (asset.units || []).filter(u => u.status === 'ASSIGNED').length;
            const total = asset.units?.length || 0;

            return (
              <div key={asset.id} className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden hover:shadow-md hover:border-emerald-200 transition-all group">
                {/* Image / Icon */}
                <div className="h-32 bg-gradient-to-br from-gray-50 to-gray-100 flex items-center justify-center relative overflow-hidden">
                  {asset.image ? (
                    <img src={asset.image} alt={asset.name} className="w-full h-full object-cover" />
                  ) : (
                    asset.assetType === 'ELECTRONIC' ? <Monitor size={48} className="text-gray-200" /> : <Box size={48} className="text-gray-200" />
                  )}
                  <span className={`absolute top-3 right-3 text-[9px] font-black px-2 py-1 rounded-lg uppercase tracking-wider ${
                    asset.assetType === 'ELECTRONIC' ? 'bg-blue-100 text-blue-600' : 'bg-amber-100 text-amber-600'
                  }`}>{asset.category?.name || (asset.assetType === 'ELECTRONIC' ? 'Electronic' : 'Non-Electronic')}</span>
                </div>

                <div className="p-4 space-y-3">
                  <div>
                    <h3 className="text-sm font-black text-gray-900 uppercase tracking-tight">{asset.name}</h3>
                    <div className="flex items-center gap-2 mt-1 flex-wrap">
                      {asset.model && <span className="text-[10px] font-bold text-gray-400 bg-gray-50 px-1.5 py-0.5 rounded">{asset.model}</span>}
                      {asset.brand && <span className="text-[10px] font-bold text-gray-400 bg-gray-50 px-1.5 py-0.5 rounded">{asset.brand}</span>}
                      <span className="text-[10px] font-bold text-emerald-600 bg-emerald-50 px-1.5 py-0.5 rounded">₹{asset.estimatedCost}</span>
                    </div>
                  </div>

                  {/* Stock Bar */}
                  <div className="grid grid-cols-3 gap-2">
                    <div className="bg-gray-50 rounded-xl p-2 text-center">
                      <span className="text-[8px] font-black text-gray-400 uppercase block">Total</span>
                      <span className="text-sm font-black text-gray-800">{total}</span>
                    </div>
                    <div className="bg-emerald-50 rounded-xl p-2 text-center">
                      <span className="text-[8px] font-black text-emerald-500 uppercase block">Free</span>
                      <span className="text-sm font-black text-emerald-700">{available}</span>
                    </div>
                    <div className="bg-blue-50 rounded-xl p-2 text-center">
                      <span className="text-[8px] font-black text-blue-500 uppercase block">Assigned</span>
                      <span className="text-sm font-black text-blue-700">{assigned}</span>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-2 pt-1">
                    <button onClick={() => { setUnitsTarget(asset); setShowAddUnitsModal(true); }}
                      className="flex-1 text-[10px] font-black uppercase tracking-wider bg-emerald-50 text-emerald-600 py-2 rounded-xl hover:bg-emerald-100 transition-colors border border-emerald-100">
                      + Add Units
                    </button>
                    <button onClick={() => { setEditForm({ id: asset.id, name: asset.name, categoryId: asset.categoryId || '', assetType: asset.assetType, model: asset.model || '', brand: asset.brand || '', description: asset.description || '', estimatedCost: asset.estimatedCost?.toString() || '' }); setShowEditModal(true); }}
                      className="p-2 text-gray-400 hover:text-emerald-600 hover:bg-emerald-50 rounded-xl transition-colors">
                      <Pencil size={14} />
                    </button>
                    <button onClick={() => setShowDetailModal(asset)}
                      className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-xl transition-colors">
                      <Eye size={14} />
                    </button>
                    <button onClick={() => handleDelete(asset.id, asset.name)}
                      className="p-2 text-gray-400 hover:text-rose-600 hover:bg-rose-50 rounded-xl transition-colors">
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );

  // ─── Assign Tab ─────────────────────────────────────────
  const renderAssign = () => (
    <div className="max-w-lg mx-auto space-y-6">
      <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm space-y-4">
        <h3 className="text-lg font-black text-gray-900 flex items-center gap-2"><Users size={20} className="text-emerald-500" /> Assign Asset</h3>

        <form onSubmit={handleAssign} className="space-y-4">
          <div className="space-y-1">
            <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Select Executive (VGE)</label>
            <select value={assignForm.userId} onChange={e => setAssignForm({ ...assignForm, userId: e.target.value })} required
              className="w-full bg-gray-50 border border-gray-100 rounded-xl px-4 py-3 text-sm font-medium appearance-none focus:outline-none focus:ring-2 focus:ring-emerald-500/20 truncate">
              <option value="">Select Executive</option>
              {users.map(u => <option key={u.id} value={u.id} className="truncate">{u.name} ({u.role})</option>)}
            </select>
          </div>

          <div className="space-y-1">
            <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Select Asset</label>
            <select value={assignForm.assetId} onChange={e => setAssignForm({ ...assignForm, assetId: e.target.value, serialNumber: '' })} required
              className="w-full bg-gray-50 border border-gray-100 rounded-xl px-4 py-3 text-sm font-medium appearance-none focus:outline-none focus:ring-2 focus:ring-emerald-500/20 truncate">
              <option value="">Select Asset</option>
              {assets.map(a => {
                const avail = (a.units || []).filter(u => u.status === 'AVAILABLE').length;
                return <option key={a.id} value={a.id} className="truncate">{a.name} {a.model ? `(${a.model})` : ''} — {avail} available</option>;
              })}
            </select>
          </div>

          {selectedAssetForAssign?.assetType === 'ELECTRONIC' && (
            <div className="space-y-1">
              <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Serial Number</label>
              <select value={assignForm.serialNumber} onChange={e => setAssignForm({ ...assignForm, serialNumber: e.target.value })} required
                className="w-full bg-gray-50 border border-gray-100 rounded-xl px-4 py-3 text-sm font-medium appearance-none focus:outline-none focus:ring-2 focus:ring-emerald-500/20 truncate">
                <option value="">Select Serial Number</option>
                {(selectedAssetForAssign.units || []).filter(u => u.status === 'AVAILABLE' && u.serialNumber).map(u =>
                  <option key={u.id} value={u.serialNumber} className="truncate">{u.serialNumber}</option>
                )}
              </select>
            </div>
          )}

          {selectedAssetForAssign?.assetType !== 'ELECTRONIC' && (
            <div className="space-y-1">
              <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Quantity</label>
              <input type="number" min="1" value={assignForm.quantity} onChange={e => setAssignForm({ ...assignForm, quantity: e.target.value })}
                className="w-full bg-gray-50 border border-gray-100 rounded-xl px-4 py-3 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-emerald-500/20" />
            </div>
          )}

          <div className="space-y-1">
            <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Condition</label>
            <select value={assignForm.condition} onChange={e => setAssignForm({ ...assignForm, condition: e.target.value })}
              className="w-full bg-gray-50 border border-gray-100 rounded-xl px-4 py-3 text-sm font-medium appearance-none focus:outline-none focus:ring-2 focus:ring-emerald-500/20">
              <option value="NEW">New</option>
              <option value="GOOD">Good</option>
              <option value="USED">Used</option>
            </select>
          </div>

          <button type="submit" disabled={isSubmitting}
            className="w-full bg-emerald-600 text-white font-bold py-3 rounded-xl shadow-lg shadow-emerald-600/20 hover:bg-emerald-700 transition-all flex items-center justify-center gap-2 disabled:opacity-50">
            {isSubmitting ? <><Loader2 size={18} className="animate-spin" /> Assigning...</> : '✅ Assign Asset'}
          </button>
        </form>
      </div>

      {/* Return Asset */}
      <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm space-y-4">
        <h3 className="text-lg font-black text-gray-900 flex items-center gap-2"><ArrowDownCircle size={20} className="text-orange-500" /> Return Asset</h3>
        <button onClick={() => { loadTracking(); setShowReturnModal(true); }}
          className="w-full bg-orange-50 text-orange-600 font-bold py-3 rounded-xl border border-orange-100 hover:bg-orange-100 transition-colors">
          Process Return
        </button>
      </div>
    </div>
  );

  // ─── Tracking Tab ───────────────────────────────────────
  const renderTracking = () => (
    <div className="space-y-4">
      <div className="flex items-center gap-3 mb-4">
        <div className="flex-1 flex items-center gap-2 bg-white p-2.5 rounded-2xl border border-gray-100 shadow-sm">
          <Search size={18} className="text-gray-400 shrink-0 ml-2" />
          <input type="text" placeholder="Search tracking..." className="w-full bg-transparent border-none focus:outline-none text-sm"
            value={searchQuery} onChange={e => setSearchQuery(e.target.value)} />
        </div>
      </div>

      {tracking.length === 0 ? (
        <div className="py-12 bg-white rounded-2xl border border-gray-100 text-center">
          <Package size={32} className="mx-auto text-gray-200 mb-2" />
          <p className="text-sm font-bold text-gray-400">No active assignments</p>
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100 bg-gray-50">
                  <th className="text-left py-3 px-4 text-[10px] font-black text-gray-400 uppercase tracking-widest">Asset</th>
                  <th className="text-left py-3 px-4 text-[10px] font-black text-gray-400 uppercase tracking-widest">Serial</th>
                  <th className="text-left py-3 px-4 text-[10px] font-black text-gray-400 uppercase tracking-widest">Assigned To</th>
                  <th className="text-left py-3 px-4 text-[10px] font-black text-gray-400 uppercase tracking-widest">Condition</th>
                  <th className="text-left py-3 px-4 text-[10px] font-black text-gray-400 uppercase tracking-widest">Date</th>
                </tr>
              </thead>
              <tbody>
                {tracking.filter(t => {
                  const q = searchQuery.toLowerCase();
                  return !q || t.assetUnit?.asset?.name?.toLowerCase().includes(q) || t.user?.name?.toLowerCase().includes(q);
                }).map(t => (
                  <tr key={t.id} className="border-b border-gray-50 hover:bg-emerald-50/30 transition-colors">
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-2">
                        {t.assetUnit?.asset?.image ? (
                          <img src={t.assetUnit.asset.image} alt="" className="w-8 h-8 rounded-lg object-cover border border-gray-100" />
                        ) : (
                          <div className="w-8 h-8 rounded-lg bg-gray-100 flex items-center justify-center"><Package size={14} className="text-gray-400" /></div>
                        )}
                        <div>
                          <span className="font-bold text-gray-800 text-xs">{t.assetUnit?.asset?.name}</span>
                          {t.assetUnit?.asset?.model && <span className="text-[9px] text-gray-400 block">{t.assetUnit.asset.model}</span>}
                        </div>
                      </div>
                    </td>
                    <td className="py-3 px-4 text-xs font-mono text-gray-500">{t.assetUnit?.serialNumber || '—'}</td>
                    <td className="py-3 px-4 text-xs font-bold text-gray-700">{t.user?.name}</td>
                    <td className="py-3 px-4">
                      <span className={`text-[9px] font-black px-2 py-1 rounded-lg uppercase ${
                        t.assignCondition === 'NEW' ? 'bg-emerald-100 text-emerald-600' :
                        t.assignCondition === 'GOOD' ? 'bg-blue-100 text-blue-600' :
                        'bg-amber-100 text-amber-600'
                      }`}>{t.assignCondition}</span>
                    </td>
                    <td className="py-3 px-4 text-xs text-gray-400">{new Date(t.assignedDate).toLocaleDateString('en-IN')}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );

  // ─── Issues Tab ─────────────────────────────────────────
  const renderIssues = () => (
    <div className="space-y-4">
      {issues.length === 0 ? (
        <div className="py-12 bg-white rounded-2xl border border-gray-100 text-center">
          <CheckCircle2 size={32} className="mx-auto text-emerald-200 mb-2" />
          <p className="text-sm font-bold text-gray-400">No issues reported</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {issues.map(issue => (
            <div key={issue.id} className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 space-y-3">
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                    issue.status === 'OPEN' ? 'bg-red-50 text-red-500' : issue.status === 'RESOLVED' ? 'bg-emerald-50 text-emerald-500' : 'bg-gray-50 text-gray-400'
                  }`}>
                    <AlertTriangle size={20} />
                  </div>
                  <div>
                    <h4 className="text-sm font-black text-gray-900">{issue.assetUnit?.asset?.name}</h4>
                    <span className="text-[10px] text-gray-400 font-bold">{issue.assetUnit?.asset?.model} • Reported by {issue.user?.name}</span>
                  </div>
                </div>
                <span className={`text-[9px] font-black px-2 py-1 rounded-lg uppercase ${
                  issue.status === 'OPEN' ? 'bg-red-100 text-red-600' : issue.status === 'RESOLVED' ? 'bg-emerald-100 text-emerald-600' : 'bg-gray-100 text-gray-500'
                }`}>{issue.status}</span>
              </div>

              <div className="bg-gray-50 p-3 rounded-xl space-y-1">
                <span className="text-[10px] font-black text-gray-400 uppercase">Issue: {issue.issueType?.replace('_', ' ')}</span>
                {issue.description && <p className="text-xs text-gray-600">{issue.description}</p>}
              </div>

              {issue.photos && issue.photos.length > 0 && (
                <div className="flex gap-2 overflow-x-auto pb-1">
                  {issue.photos.map((p, i) => (
                    <img key={i} src={p} alt="" className="w-16 h-16 rounded-lg object-cover border border-gray-100 shrink-0" />
                  ))}
                </div>
              )}

              <div className="flex items-center justify-between pt-1">
                <span className="text-[10px] text-gray-400">{new Date(issue.createdAt).toLocaleDateString('en-IN')}</span>
                {issue.status === 'OPEN' && (
                  <div className="flex gap-2">
                    <button onClick={() => handleIssueStatus(issue.id, 'RESOLVED')}
                      className="text-[10px] font-black uppercase bg-emerald-50 text-emerald-600 px-3 py-1.5 rounded-xl hover:bg-emerald-100 border border-emerald-100">
                      Resolve
                    </button>
                    <button onClick={() => handleIssueStatus(issue.id, 'CLOSED')}
                      className="text-[10px] font-black uppercase bg-gray-50 text-gray-500 px-3 py-1.5 rounded-xl hover:bg-gray-100 border border-gray-100">
                      Close
                    </button>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );

  // ─── Reports Tab ────────────────────────────────────────
  const renderReports = () => {
    if (!reports) return <div className="flex justify-center py-12"><Loader2 className="animate-spin text-emerald-600" size={32} /></div>;

    return (
      <div className="space-y-8">
        {/* Utilization */}
        <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm">
          <h3 className="text-sm font-black text-gray-900 uppercase mb-4 flex items-center gap-2"><BarChart3 size={16} className="text-emerald-500" /> Asset Utilization</h3>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100">
                  <th className="text-left py-2 px-3 text-[10px] font-black text-gray-400 uppercase">Asset</th>
                  <th className="text-center py-2 px-3 text-[10px] font-black text-gray-400 uppercase">Total</th>
                  <th className="text-center py-2 px-3 text-[10px] font-black text-emerald-500 uppercase">Assigned</th>
                  <th className="text-center py-2 px-3 text-[10px] font-black text-blue-500 uppercase">Available</th>
                  <th className="text-center py-2 px-3 text-[10px] font-black text-orange-500 uppercase">Damaged</th>
                  <th className="text-center py-2 px-3 text-[10px] font-black text-red-500 uppercase">Lost</th>
                </tr>
              </thead>
              <tbody>
                {reports.utilization.map(r => (
                  <tr key={r.id} className="border-b border-gray-50">
                    <td className="py-2 px-3 text-xs font-bold text-gray-800">{r.name}</td>
                    <td className="py-2 px-3 text-center text-xs font-black text-gray-600">{r.total}</td>
                    <td className="py-2 px-3 text-center text-xs font-black text-emerald-600">{r.assigned}</td>
                    <td className="py-2 px-3 text-center text-xs font-black text-blue-600">{r.available}</td>
                    <td className="py-2 px-3 text-center text-xs font-black text-orange-600">{r.damaged}</td>
                    <td className="py-2 px-3 text-center text-xs font-black text-red-600">{r.lost}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Executive Report */}
        <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm">
          <h3 className="text-sm font-black text-gray-900 uppercase mb-4 flex items-center gap-2"><Users size={16} className="text-blue-500" /> Executive Asset Report</h3>
          {reports.executiveReport.length === 0 ? (
            <p className="text-sm text-gray-400 text-center py-4">No active assignments</p>
          ) : (
            <div className="space-y-4">
              {reports.executiveReport.map((er, i) => (
                <div key={i} className="bg-gray-50 p-4 rounded-xl space-y-2">
                  <h4 className="text-sm font-black text-gray-800">{er.user?.name}</h4>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {er.assets.map((a, j) => (
                      <div key={j} className="bg-white p-3 rounded-lg border border-gray-100 flex items-center justify-between">
                        <div>
                          <span className="text-xs font-bold text-gray-700">{a.assetName}</span>
                          {a.model && <span className="text-[10px] text-gray-400 block">{a.model}</span>}
                          {a.serialNumber && <span className="text-[10px] font-mono text-emerald-600 block">{a.serialNumber}</span>}
                        </div>
                        <span className={`text-[9px] font-black px-2 py-1 rounded uppercase ${
                          a.condition === 'NEW' ? 'bg-emerald-100 text-emerald-600' : a.condition === 'GOOD' ? 'bg-blue-100 text-blue-600' : 'bg-amber-100 text-amber-600'
                        }`}>{a.condition}</span>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    );
  };

  // ─── Requests Tab ───────────────────────────────────────
  const renderRequests = () => (
    <div className="space-y-4">
      {requests.length === 0 ? (
        <div className="py-12 bg-white rounded-2xl border border-gray-100 text-center shadow-sm">
          <MessageSquare size={32} className="mx-auto text-emerald-200 mb-2" />
          <p className="text-sm font-bold text-gray-400">No requests found</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {requests.map(req => (
            <div key={req.id} className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 space-y-3 flex flex-col transition-all hover:shadow-md hover:border-emerald-200">
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-2">
                  <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${
                    req.type === 'REPLACEMENT' ? 'bg-orange-50 text-orange-500' :
                    req.type === 'NEW_ASSET' ? 'bg-blue-50 text-blue-500' : 'bg-emerald-50 text-emerald-500'
                  }`}>
                    {req.type === 'REPLACEMENT' ? <RefreshCcw size={16} /> :
                     req.type === 'NEW_ASSET' ? <Plus size={16} /> : <MessageSquare size={16} />}
                  </div>
                  <div>
                    <span className="text-[10px] font-black text-gray-900 uppercase tracking-tight block leading-none">
                      {req.type.replace('_', ' ')}
                    </span>
                    <span className="text-[9px] font-bold text-gray-400 uppercase tracking-widest">{req.user?.name}</span>
                  </div>
                </div>
                <span className={`text-[8px] font-black px-2 py-1 rounded-lg uppercase tracking-widest shadow-sm ${
                  req.status === 'PENDING' ? 'bg-amber-100 text-amber-600' :
                  req.status === 'APPROVED' ? 'bg-blue-100 text-blue-600' :
                  req.status === 'REJECTED' ? 'bg-red-100 text-red-600' : 'bg-emerald-100 text-emerald-600'
                }`}>{req.status}</span>
              </div>

              <div className="bg-gray-50 p-3 rounded-xl flex-1">
                <div className="text-[9px] font-black text-gray-400 uppercase mb-1">Request Details</div>
                <div className="text-xs font-bold text-gray-700">
                  {req.asset?.name || 'Requirement'}
                  {req.asset?.model && <span className="text-gray-400 ml-1 font-medium italic">({req.asset.model})</span>}
                </div>
                {req.assetUnit?.serialNumber && (
                   <div className="text-[9px] font-mono text-emerald-600 mt-0.5">SN: {req.assetUnit.serialNumber}</div>
                )}
                {req.description && <p className="text-[10px] text-gray-500 mt-2 italic leading-relaxed">"{req.description}"</p>}
              </div>

              <div className="flex items-center justify-between text-[9px] font-bold border-t border-gray-50 pt-2">
                <span className="text-gray-400">{new Date(req.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}</span>
                <span className={`uppercase tracking-tighter ${
                  req.priority === 'HIGH' || req.priority === 'CRITICAL' ? 'text-red-500 font-extrabold' : 'text-gray-400'
                }`}>Priority: {req.priority}</span>
              </div>

              {req.status === 'PENDING' && (
                <div className="grid grid-cols-2 gap-2 pt-1 mt-auto">
                   <button 
                     onClick={() => handleRequestUpdate(req.id, 'APPROVED')}
                     className="py-2 bg-blue-50 text-blue-600 text-[10px] font-black uppercase tracking-wider rounded-xl border border-blue-100 hover:bg-blue-100 transition-all"
                   >
                     Approve
                   </button>
                   <button 
                     onClick={() => {
                        const remark = window.prompt("Reason for rejection?");
                        if(remark !== null) handleRequestUpdate(req.id, 'REJECTED', remark);
                     }}
                     className="py-2 bg-red-50 text-red-600 text-[10px] font-black uppercase tracking-wider rounded-xl border border-red-100 hover:bg-red-100 transition-all"
                   >
                     Reject
                   </button>
                </div>
              )}
              
              {req.status === 'APPROVED' && (
                 <button 
                    onClick={() => handleRequestUpdate(req.id, 'COMPLETED')}
                    className="w-full py-2 bg-emerald-50 text-emerald-600 text-[10px] font-black uppercase tracking-wider rounded-xl border border-emerald-100 hover:bg-emerald-100 transition-all"
                  >
                    Mark Handover Complete
                  </button>
              )}

              {req.adminRemark && req.status === 'REJECTED' && (
                <div className="p-2 bg-red-50 rounded-xl border border-red-100">
                  <span className="text-[8px] font-black text-red-400 uppercase block mb-0.5">Admin Remark</span>
                  <p className="text-[10px] text-red-600 italic">"{req.adminRemark}"</p>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );

  // Gatekeeper
  const isGlobalRole = currentUser?.role === 'TENANT_OWNER' || currentUser?.role === 'SUPER_ADMIN';
  const isTenantRoute = location.pathname.includes('/tenant/');
  
  if (isGlobalRole && isTenantRoute && !storeId) {
    return (
       <StoreSelector 
         title="Asset Management"
         description="Please select a store branch to manage its inventory and equipment."
         onSelect={(id) => {
           setSearchParams({ storeId: id });
         }}
       />
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex flex-col gap-1">
          <h2 className="text-2xl font-bold text-gray-900">Asset Management</h2>
          <div className="flex items-center gap-2">
            <p className="text-sm text-gray-500">Track, assign and manage company assets</p>
            {isTenantRoute && storeId && (
              <>
                <span className="text-gray-300">•</span>
                <button 
                  onClick={() => setSearchParams({})} 
                  className="text-[10px] font-black text-emerald-600 hover:text-emerald-700 uppercase tracking-widest bg-emerald-50 px-2 py-0.5 rounded transition-colors"
                >
                  Change Store
                </button>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 p-1 rounded-2xl flex-wrap border-b border-gray-100 mb-6 overflow-x-auto">
        {tabs.map(tab => (
          <button key={tab.key}
            onClick={() => { setActiveTab(tab.key); setSearchQuery(''); }}
            className={`flex items-center gap-2 py-2 px-4 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all duration-200 ${
              activeTab === tab.key ? 'bg-emerald-50 text-emerald-700 border border-emerald-100' : 'text-gray-400 hover:text-gray-600'
            }`}>
            {tab.icon}
            {tab.label}
          </button>
        ))}
      </div>

      {activeTab === 'master' && renderMaster()}
      {activeTab === 'assign' && renderAssign()}
      {activeTab === 'tracking' && renderTracking()}
      {activeTab === 'issues' && renderIssues()}
      {activeTab === 'requests' && renderRequests()}
      {activeTab === 'reports' && renderReports()}

      {/* ══════ Create Asset Modal ══════ */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-end md:items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="bg-white w-full max-w-md rounded-3xl p-6 shadow-2xl animate-in slide-in-from-bottom duration-300 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold text-gray-900">Create Asset</h3>
              <button onClick={() => setShowCreateModal(false)} className="p-1 hover:bg-gray-100 rounded-full text-gray-400"><X size={18} /></button>
            </div>
            <form onSubmit={handleCreate} className="space-y-3">
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Asset Category</label>
                <select value={form.categoryId} onChange={e => setForm({ ...form, categoryId: e.target.value })} required
                  className="w-full bg-gray-50 border border-gray-100 rounded-xl px-3 py-2.5 text-sm font-bold focus:ring-2 focus:ring-emerald-500/20">
                  <option value="">Select Category</option>
                  {assetCategories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Nature (Behavior)</label>
                <select value={form.assetType} onChange={e => setForm({ ...form, assetType: e.target.value })}
                  className="w-full bg-gray-50 border border-gray-100 rounded-xl px-3 py-2.5 text-sm font-bold focus:ring-2 focus:ring-emerald-500/20">
                  <option value="ELECTRONIC">Electronic (Has Serials)</option>
                  <option value="NON_ELECTRONIC">Non-Electronic (Bulk)</option>
                </select>
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Asset Name *</label>
                <input type="text" required value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} placeholder="e.g., Swiping Machine"
                  className="w-full bg-gray-50 border border-gray-100 rounded-xl px-3 py-2.5 text-sm focus:ring-2 focus:ring-emerald-500/20" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Model</label>
                  <input type="text" value={form.model} onChange={e => setForm({ ...form, model: e.target.value })} placeholder="e.g., POS-X200"
                    className="w-full bg-gray-50 border border-gray-100 rounded-xl px-3 py-2.5 text-sm focus:ring-2 focus:ring-emerald-500/20" />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Brand</label>
                  <input type="text" value={form.brand} onChange={e => setForm({ ...form, brand: e.target.value })} placeholder="e.g., HP"
                    className="w-full bg-gray-50 border border-gray-100 rounded-xl px-3 py-2.5 text-sm focus:ring-2 focus:ring-emerald-500/20" />
                </div>
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Estimated Cost (₹)</label>
                <input type="number" value={form.estimatedCost} onChange={e => setForm({ ...form, estimatedCost: e.target.value })} placeholder="0"
                  className="w-full bg-gray-50 border border-gray-100 rounded-xl px-3 py-2.5 text-sm focus:ring-2 focus:ring-emerald-500/20" />
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Description</label>
                <textarea value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} rows="2"
                  className="w-full bg-gray-50 border border-gray-100 rounded-xl px-3 py-2.5 text-sm focus:ring-2 focus:ring-emerald-500/20 resize-none" />
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Image</label>
                <input type="file" accept="image/*" onChange={e => setSelectedFile(e.target.files[0])}
                  className="w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-sm file:font-semibold file:bg-emerald-50 file:text-emerald-700 hover:file:bg-emerald-100" />
              </div>
              <button type="submit" disabled={isSubmitting}
                className="w-full bg-emerald-600 text-white font-bold py-3 rounded-xl shadow-lg shadow-emerald-600/20 hover:bg-emerald-700 transition-all flex items-center justify-center gap-2 disabled:opacity-50">
                {isSubmitting ? <><Loader2 size={18} className="animate-spin" /> Creating...</> : '✅ Create Asset'}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* ══════ Edit Asset Modal ══════ */}
      {showEditModal && editForm && (
        <div className="fixed inset-0 z-50 flex items-end md:items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="bg-white w-full max-w-md rounded-3xl p-6 shadow-2xl animate-in slide-in-from-bottom duration-300 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold text-gray-900">Edit Asset</h3>
              <button onClick={() => { setShowEditModal(false); setEditForm(null); }} className="p-1 hover:bg-gray-100 rounded-full text-gray-400"><X size={18} /></button>
            </div>
            <form onSubmit={handleUpdate} className="space-y-3">
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Asset Category</label>
                <select value={editForm.categoryId} onChange={e => setEditForm({ ...editForm, categoryId: e.target.value })} required
                  className="w-full bg-gray-50 border border-gray-100 rounded-xl px-3 py-2.5 text-sm font-bold focus:ring-2 focus:ring-emerald-500/20">
                  <option value="">Select Category</option>
                  {assetCategories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Nature (Behavior)</label>
                <select value={editForm.assetType} onChange={e => setEditForm({ ...editForm, assetType: e.target.value })}
                  className="w-full bg-gray-50 border border-gray-100 rounded-xl px-3 py-2.5 text-sm font-bold focus:ring-2 focus:ring-emerald-500/20">
                  <option value="ELECTRONIC">Electronic (Has Serials)</option>
                  <option value="NON_ELECTRONIC">Non-Electronic (Bulk)</option>
                </select>
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Asset Name *</label>
                <input type="text" required value={editForm.name} onChange={e => setEditForm({ ...editForm, name: e.target.value })}
                  className="w-full bg-gray-50 border border-gray-100 rounded-xl px-3 py-2.5 text-sm focus:ring-2 focus:ring-emerald-500/20" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Model</label>
                  <input type="text" value={editForm.model} onChange={e => setEditForm({ ...editForm, model: e.target.value })}
                    className="w-full bg-gray-50 border border-gray-100 rounded-xl px-3 py-2.5 text-sm focus:ring-2 focus:ring-emerald-500/20" />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Brand</label>
                  <input type="text" value={editForm.brand} onChange={e => setEditForm({ ...editForm, brand: e.target.value })}
                    className="w-full bg-gray-50 border border-gray-100 rounded-xl px-3 py-2.5 text-sm focus:ring-2 focus:ring-emerald-500/20" />
                </div>
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Cost (₹)</label>
                <input type="number" value={editForm.estimatedCost} onChange={e => setEditForm({ ...editForm, estimatedCost: e.target.value })}
                  className="w-full bg-gray-50 border border-gray-100 rounded-xl px-3 py-2.5 text-sm focus:ring-2 focus:ring-emerald-500/20" />
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Image</label>
                <input type="file" accept="image/*" onChange={e => setEditFile(e.target.files[0])}
                  className="w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-sm file:font-semibold file:bg-emerald-50 file:text-emerald-700 hover:file:bg-emerald-100" />
              </div>
              <button type="submit" disabled={isSubmitting}
                className="w-full bg-emerald-600 text-white font-bold py-3 rounded-xl shadow-lg hover:bg-emerald-700 transition-all flex items-center justify-center gap-2 disabled:opacity-50">
                {isSubmitting ? <><Loader2 size={18} className="animate-spin" /> Saving...</> : 'Save Changes'}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* ══════ Add Units Modal ══════ */}
      {showAddUnitsModal && unitsTarget && (
        <div className="fixed inset-0 z-50 flex items-end md:items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="bg-white w-full max-w-md rounded-3xl p-6 shadow-2xl animate-in slide-in-from-bottom duration-300">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold text-gray-900">Add Units — {unitsTarget.name}</h3>
              <button onClick={() => { setShowAddUnitsModal(false); setUnitsTarget(null); }} className="p-1 hover:bg-gray-100 rounded-full text-gray-400"><X size={18} /></button>
            </div>
            <form onSubmit={handleAddUnits} className="space-y-4">
              {unitsTarget.assetType === 'ELECTRONIC' ? (
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Serial Numbers (one per line)</label>
                  <textarea value={unitsForm.serialNumbers} onChange={e => setUnitsForm({ ...unitsForm, serialNumbers: e.target.value })} rows="5" placeholder="SN-001&#10;SN-002&#10;SN-003"
                    className="w-full bg-gray-50 border border-gray-100 rounded-xl px-3 py-2.5 text-sm font-mono focus:ring-2 focus:ring-emerald-500/20 resize-none" />
                </div>
              ) : (
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Quantity</label>
                  <input type="number" min="1" value={unitsForm.quantity} onChange={e => setUnitsForm({ ...unitsForm, quantity: e.target.value })} placeholder="10"
                    className="w-full bg-gray-50 border border-gray-100 rounded-xl px-3 py-2.5 text-sm focus:ring-2 focus:ring-emerald-500/20" />
                </div>
              )}
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Condition</label>
                <select value={unitsForm.condition} onChange={e => setUnitsForm({ ...unitsForm, condition: e.target.value })}
                  className="w-full bg-gray-50 border border-gray-100 rounded-xl px-3 py-2.5 text-sm font-bold focus:ring-2 focus:ring-emerald-500/20">
                  <option value="NEW">New</option>
                  <option value="GOOD">Good</option>
                  <option value="USED">Used</option>
                </select>
              </div>
              <button type="submit" disabled={isSubmitting}
                className="w-full bg-emerald-600 text-white font-bold py-3 rounded-xl shadow-lg hover:bg-emerald-700 transition-all flex items-center justify-center gap-2 disabled:opacity-50">
                {isSubmitting ? <><Loader2 size={18} className="animate-spin" /> Adding...</> : 'Add Units'}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* ══════ Return Modal ══════ */}
      {showReturnModal && (
        <div className="fixed inset-0 z-50 flex items-end md:items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="bg-white w-full max-w-md rounded-3xl p-6 shadow-2xl animate-in slide-in-from-bottom duration-300 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold text-gray-900">Return Asset</h3>
              <button onClick={() => setShowReturnModal(false)} className="p-1 hover:bg-gray-100 rounded-full text-gray-400"><X size={18} /></button>
            </div>
            <form onSubmit={handleReturn} className="space-y-4">
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Select Active Assignment</label>
                <select value={returnForm.assignmentId} onChange={e => setReturnForm({ ...returnForm, assignmentId: e.target.value })} required
                  className="w-full bg-gray-50 border border-gray-100 rounded-xl px-4 py-3 text-sm font-medium appearance-none focus:outline-none focus:ring-2 focus:ring-emerald-500/20 truncate">
                  <option value="">Select Assignment</option>
                  {tracking.map(t => (
                    <option key={t.id} value={t.id} className="truncate">
                      {t.assetUnit?.asset?.name} {t.assetUnit?.serialNumber ? `(${t.assetUnit.serialNumber})` : ''} → {t.user?.name}
                    </option>
                  ))}
                </select>
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Return Condition</label>
                <select value={returnForm.returnCondition} onChange={e => setReturnForm({ ...returnForm, returnCondition: e.target.value })}
                  className="w-full bg-gray-50 border border-gray-100 rounded-xl px-4 py-3 text-sm font-medium appearance-none focus:outline-none focus:ring-2 focus:ring-emerald-500/20">
                  <option value="GOOD">Good</option>
                  <option value="DAMAGED">Damaged</option>
                  <option value="LOST">Lost</option>
                </select>
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Remarks</label>
                <textarea value={returnForm.remarks} onChange={e => setReturnForm({ ...returnForm, remarks: e.target.value })} rows="2" placeholder="Optional remarks..."
                  className="w-full bg-gray-50 border border-gray-100 rounded-xl px-3 py-2.5 text-sm focus:ring-2 focus:ring-emerald-500/20 resize-none" />
              </div>
              <button type="submit" disabled={isSubmitting}
                className="w-full bg-orange-500 text-white font-bold py-3 rounded-xl shadow-lg hover:bg-orange-600 transition-all flex items-center justify-center gap-2 disabled:opacity-50">
                {isSubmitting ? <><Loader2 size={18} className="animate-spin" /> Processing...</> : '✅ Submit Return'}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* ══════ Detail Modal ══════ */}
      {showDetailModal && (
        <div className="fixed inset-0 z-50 flex items-end md:items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="bg-white w-full max-w-lg rounded-3xl p-6 shadow-2xl animate-in slide-in-from-bottom duration-300 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold text-gray-900">{showDetailModal.name} — Units</h3>
              <button onClick={() => setShowDetailModal(null)} className="p-1 hover:bg-gray-100 rounded-full text-gray-400"><X size={18} /></button>
            </div>
            <div className="space-y-2">
              {(showDetailModal.units || []).length === 0 ? (
                <p className="text-sm text-gray-400 text-center py-6">No units added yet</p>
              ) : (
                showDetailModal.units.map(u => (
                  <div key={u.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-xl border border-gray-100">
                    <div className="flex items-center gap-2">
                      {u.serialNumber ? <Hash size={14} className="text-blue-500" /> : <Box size={14} className="text-gray-400" />}
                      <span className="text-xs font-bold text-gray-700">{u.serialNumber || 'Unit'}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className={`text-[9px] font-black px-2 py-1 rounded uppercase ${
                        u.condition === 'NEW' ? 'bg-emerald-100 text-emerald-600' : u.condition === 'GOOD' ? 'bg-blue-100 text-blue-600' :
                        u.condition === 'USED' ? 'bg-amber-100 text-amber-600' : 'bg-red-100 text-red-600'
                      }`}>{u.condition}</span>
                      <span className={`text-[9px] font-black px-2 py-1 rounded uppercase ${
                        u.status === 'AVAILABLE' ? 'bg-emerald-50 text-emerald-600' : u.status === 'ASSIGNED' ? 'bg-blue-50 text-blue-600' :
                        u.status === 'DAMAGED' ? 'bg-orange-50 text-orange-600' : 'bg-red-50 text-red-600'
                      }`}>{u.status}</span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
