import React, { useState, useEffect, useMemo } from 'react';
import { Package, Plus, Search, X, Loader2, Pencil, Trash2, Truck, Users, ArrowLeft, AlertTriangle,
  CheckCircle2, XCircle, Monitor, Box, Tag, Hash, ArrowUpCircle, ArrowDownCircle, BarChart3, Eye, MessageSquare, RefreshCcw, Download, Printer, FileText, ChevronLeft, Lock } from 'lucide-react';
import { exportReportToExcel, generateReportPDF } from './adminreports/ReportUtils';
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
  const [stores, setStores] = useState([]);

  // Module 14 Enterprise states
  const [vehicles, setVehicles] = useState([]);
  const [depreciations, setDepreciations] = useState([]);
  const [audits, setAudits] = useState([]);
  const [auditForm, setAuditForm] = useState({ assetId: '', assetUnitId: '', status: 'VERIFIED', physicalCondition: 'GOOD', remarks: '' });
  const [showAuditForm, setShowAuditForm] = useState(false);
  const [depreciationForm, setDepreciationForm] = useState({ assetId: '', costBasis: '', salvageValue: '', usefulLifeYears: '5', method: 'STRAIGHT_LINE', ratePercentage: '20' });

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
  const can = useUserStore(s => s.can);

  useEffect(() => {
    fetchAll();
  }, [storeId]);

  useEffect(() => {
    if (activeTab === 'tracking') loadTracking();
    if (activeTab === 'issues') loadIssues();
    if (activeTab === 'requests') loadRequests();
    if (activeTab === 'reports') loadReports();
    if (activeTab === 'vehicle-mapping') loadVehicles();
    if (activeTab === 'depreciation') loadDepreciations();
    if (activeTab === 'audit') loadAudits();
  }, [activeTab]);

  const fetchAll = async () => {
    try {
      setLoading(true);
      // Clear previous data to prevent stale data flicker
      setAssets([]);
      setTracking([]);
      setIssues([]);
      setRequests([]);
      setReports(null);

      const [aRes, uRes, cRes, sRes] = await Promise.all([
        adminAPI.getAssets({ storeId }),
        adminAPI.getUsers({ storeId }),
        adminAPI.getAssetCategories(),
        adminAPI.getStores()
      ]);
      setAssets(aRes.data);
      setUsers(uRes.data.filter(u => u.role === 'SALES_AGENT' || u.role === 'SUPERVISOR' || u.role === 'HELPER'));
      setAssetCategories(cRes.data);
      if (sRes.data.success) {
        const fetchedStores = sRes.data.data;
        setStores(fetchedStores);
        // Auto-select if only one store exists
        if (fetchedStores.length === 1 && !storeId) {
          setSearchParams({ storeId: fetchedStores[0].id });
        }
      }
    } catch (err) {
      toast.error('Failed to load assets');
    } finally {
      setLoading(false);
    }
  };

  const loadTracking = async () => {
    try {
      const { data } = await adminAPI.getAssetTracking({ storeId });
      setTracking(data);
    } catch { toast.error('Failed to load tracking'); }
  };

  const loadIssues = async () => {
    try {
      const { data } = await adminAPI.getAssetIssues({ storeId });
      setIssues(data);
    } catch { toast.error('Failed to load issues'); }
  };

  const loadReports = async () => {
    try {
      const { data } = await adminAPI.getAssetReports({ storeId });
      setReports(data);
    } catch { toast.error('Failed to load reports'); }
  };

  const loadRequests = async () => {
    try {
      const { data } = await adminAPI.getAssetRequests({ storeId });
      setRequests(data);
    } catch { toast.error('Failed to load requests'); }
  };

  const loadVehicles = async () => {
    try {
      const { data } = await adminAPI.getVehicles({ storeId });
      setVehicles(Array.isArray(data) ? data : data?.data || []);
      // Also load tracking assignments to render the mapping lists
      const trackRes = await adminAPI.getAssetTracking({ storeId });
      setTracking(trackRes.data);
    } catch { toast.error('Failed to load vehicles for asset mapping'); }
  };

  const loadDepreciations = async () => {
    try {
      const { data } = await adminAPI.getDepreciationSchedules({ storeId });
      setDepreciations(data);
    } catch { toast.error('Failed to load depreciation schedules'); }
  };

  const loadAudits = async () => {
    try {
      const { data } = await adminAPI.getAssetAudits({ storeId });
      setAudits(data);
    } catch { toast.error('Failed to load asset inspection audits'); }
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

  const handleExportExcel = (type) => {
    if (!reports) return;
    const data = type === 'asset-utilization' ? reports.utilization : reports.executiveReport;
    exportReportToExcel(type, data);
  };

  const handleExportPDF = (type) => {
    if (!reports) return;
    const data = type === 'asset-utilization' ? reports.utilization : reports.executiveReport;
    generateReportPDF(type, data);
  };

  const handlePrint = (type) => {
    if (!reports) return;
    const data = type === 'asset-utilization' ? reports.utilization : reports.executiveReport;
    generateReportPDF(type, data, true);
  };

  // Module 14 Handlers
  const handleVehicleMappingUpdate = async (assetUnitId, vehicleId) => {
    try {
      await adminAPI.updateAssetVehicleMapping({ assetUnitId, vehicleId });
      toast.success('Vehicle mapping updated successfully');
      loadVehicles();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to update vehicle mapping');
    }
  };

  const handleSaveDepreciation = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      await adminAPI.saveDepreciationSchedule(depreciationForm);
      toast.success('Depreciation schedule saved successfully');
      setDepreciationForm({ assetId: '', costBasis: '', salvageValue: '', usefulLifeYears: '5', method: 'STRAIGHT_LINE', ratePercentage: '20' });
      loadDepreciations();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to save depreciation');
    } finally { setIsSubmitting(false); }
  };

  const handleCreateAudit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      await adminAPI.createAssetAudit(auditForm);
      toast.success('Audit verification logged successfully');
      setAuditForm({ assetId: '', assetUnitId: '', status: 'VERIFIED', physicalCondition: 'GOOD', remarks: '' });
      loadAudits();
      fetchAll(); // refresh item conditions
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to log audit');
    } finally { setIsSubmitting(false); }
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
    { key: 'master', label: 'Registration', icon: <Package size={14} /> },
    { key: 'assign', label: 'Assignment', icon: <Users size={14} /> },
    { key: 'vehicle-mapping', label: 'Vehicle Mapping', icon: <Truck size={14} /> },
    { key: 'issues', label: 'Maintenance', icon: <AlertTriangle size={14} /> },
    { key: 'depreciation', label: 'Depreciation', icon: <BarChart3 size={14} /> },
    { key: 'audit', label: 'Asset Audit', icon: <CheckCircle2 size={14} /> },
    { key: 'requests', label: 'Requests', icon: <MessageSquare size={14} /> },
    { key: 'reports', label: 'Reports', icon: <FileText size={14} /> },
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
        {can('ASSETS', 'CREATE') && (
          <button onClick={() => setShowCreateModal(true)}
            className="bg-emerald-600 text-white p-3 rounded-xl shadow-lg hover:bg-emerald-700 transition-colors shrink-0">
            <Plus size={24} />
          </button>
        )}
      </div>

      <div className="bg-white rounded-3xl border border-gray-100 shadow-sm overflow-hidden">
        {filteredAssets.length === 0 ? (
          <div className="py-24 text-center">
            <Package size={48} className="mx-auto text-gray-200 mb-4" />
            <p className="text-sm font-bold text-gray-400 uppercase tracking-widest">No assets found in inventory</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-emerald-50/50">
                  <th className="text-left py-4 px-6 text-[10px] font-black text-emerald-800 uppercase tracking-widest">Asset Identity</th>
                  <th className="text-left py-4 px-6 text-[10px] font-black text-emerald-800 uppercase tracking-widest">Category & Type</th>
                  <th className="text-center py-4 px-6 text-[10px] font-black text-emerald-800 uppercase tracking-widest">Stock Distribution</th>
                  <th className="text-right py-4 px-6 text-[10px] font-black text-emerald-800 uppercase tracking-widest">Pricing</th>
                  <th className="text-right py-4 px-8 text-[10px] font-black text-emerald-800 uppercase tracking-widest">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {filteredAssets.map(asset => {
                  const available = (asset.units || []).filter(u => u.status === 'AVAILABLE').length;
                  const assigned = (asset.units || []).filter(u => u.status === 'ASSIGNED').length;
                  const total = asset.units?.length || 0;

                  return (
                    <tr key={asset.id} className="hover:bg-emerald-50/30 transition-colors group">
                      <td className="py-4 px-6">
                        <div className="flex items-center gap-4">
                          <div className="w-12 h-12 rounded-xl bg-gray-100 flex items-center justify-center overflow-hidden border border-gray-100 shrink-0">
                            {asset.image ? (
                              <img src={asset.image} alt={asset.name} className="w-full h-full object-cover" />
                            ) : (
                              asset.assetType === 'ELECTRONIC' ? <Monitor size={20} className="text-gray-400" /> : <Box size={20} className="text-gray-400" />
                            )}
                          </div>
                          <div>
                            <h3 className="text-sm font-black text-gray-900 uppercase tracking-tight">{asset.name}</h3>
                            <div className="flex items-center gap-1.5 mt-0.5">
                              {asset.model && <span className="text-[9px] font-bold text-gray-400 bg-gray-50 px-1.5 py-0.5 rounded border border-gray-100">{asset.model}</span>}
                              {asset.brand && <span className="text-[9px] font-bold text-gray-400 bg-gray-50 px-1.5 py-0.5 rounded border border-gray-100">{asset.brand}</span>}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="py-4 px-6">
                        <div className="flex flex-col gap-1">
                          <span className="text-[10px] font-black text-emerald-600 uppercase tracking-widest bg-emerald-50 px-2 py-0.5 rounded border border-emerald-100/50 w-fit">
                            {asset.category?.name || 'Uncategorized'}
                          </span>
                          <span className="text-[9px] font-bold text-gray-400 uppercase tracking-tighter">
                            {asset.assetType === 'ELECTRONIC' ? 'Hardware / Electronic' : 'Physical / Asset'}
                          </span>
                        </div>
                      </td>
                      <td className="py-4 px-6">
                        <div className="flex items-center justify-center gap-6">
                          <div className="text-center">
                            <span className="block text-sm font-black text-gray-800">{total}</span>
                            <span className="text-[8px] font-black text-gray-400 uppercase tracking-widest">Total</span>
                          </div>
                          <div className="w-px h-6 bg-gray-100" />
                          <div className="text-center">
                            <span className="block text-sm font-black text-emerald-600">{available}</span>
                            <span className="text-[8px] font-black text-emerald-400 uppercase tracking-widest">Free</span>
                          </div>
                          <div className="w-px h-6 bg-gray-100" />
                          <div className="text-center">
                            <span className="block text-sm font-black text-blue-600">{assigned}</span>
                            <span className="text-[8px] font-black text-blue-400 uppercase tracking-widest">Assigned</span>
                          </div>
                        </div>
                      </td>
                      <td className="py-4 px-6 text-right">
                        <span className="text-sm font-black text-gray-900">₹{asset.estimatedCost}</span>
                        <span className="block text-[8px] font-black text-gray-400 uppercase tracking-widest">Est. Cost</span>
                      </td>
                      <td className="py-4 px-8 text-right">
                        <div className="flex items-center justify-end gap-2">
                          {can('ASSETS', 'CREATE') && (
                            <button onClick={() => { setUnitsTarget(asset); setShowAddUnitsModal(true); }}
                              className="p-2 text-emerald-600 hover:bg-emerald-50 rounded-lg transition-colors border border-emerald-50"
                              title="Add Units">
                              <Plus size={16} strokeWidth={2.5} />
                            </button>
                          )}
                          <button onClick={() => setShowDetailModal(asset)}
                            className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors border border-blue-50"
                            title="View Details">
                            <Eye size={16} strokeWidth={2.5} />
                          </button>
                          {can('ASSETS', 'UPDATE') && (
                            <button onClick={() => { setEditForm({ id: asset.id, name: asset.name, categoryId: asset.categoryId || '', assetType: asset.assetType, model: asset.model || '', brand: asset.brand || '', description: asset.description || '', estimatedCost: asset.estimatedCost?.toString() || '' }); setShowEditModal(true); }}
                              className="p-2 text-gray-500 hover:bg-gray-50 rounded-lg transition-colors border border-gray-100"
                              title="Edit Info">
                              <Pencil size={16} strokeWidth={2.5} />
                            </button>
                          )}
                          {can('ASSETS', 'DELETE') && (
                            <button onClick={() => handleDelete(asset.id, asset.name)}
                              className="p-2 text-rose-500 hover:bg-rose-50 rounded-lg transition-colors border border-rose-50"
                              title="Delete Asset">
                              <Trash2 size={16} strokeWidth={2.5} />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );

  // ─── Assign Tab ─────────────────────────────────────────
  const renderAssign = () => (
    <div className="w-full bg-white p-3 lg:p-4 rounded-3xl border border-gray-100 shadow-sm overflow-hidden">
      <form onSubmit={handleAssign} className="flex flex-col lg:flex-row items-center justify-between gap-2 w-full">
        {/* Title */}
        <div className="flex items-center gap-1.5 shrink-0 px-2.5">
          <Users size={16} className="text-emerald-500" />
          <span className="text-xs font-black text-gray-900 uppercase tracking-tight">Assign</span>
        </div>

        {/* Executive Select */}
        <div className="flex-1 min-w-[120px] w-full lg:w-auto">
          <select value={assignForm.userId} onChange={e => setAssignForm({ ...assignForm, userId: e.target.value })} required
            className="w-full bg-gray-50 border border-gray-100 rounded-xl px-2.5 py-2 text-[11px] font-bold text-gray-800 appearance-none focus:outline-none focus:bg-white truncate">
            <option value="">Executive</option>
            {users.map(u => <option key={u.id} value={u.id} className="truncate">{u.name} ({u.role})</option>)}
          </select>
        </div>

        {/* Asset Select */}
        <div className="flex-1 min-w-[120px] w-full lg:w-auto">
          <select value={assignForm.assetId} onChange={e => setAssignForm({ ...assignForm, assetId: e.target.value, serialNumber: '' })} required
            className="w-full bg-gray-50 border border-gray-100 rounded-xl px-2.5 py-2 text-[11px] font-bold text-gray-800 appearance-none focus:outline-none focus:bg-white truncate">
            <option value="">Asset</option>
            {assets.map(a => {
              const avail = (a.units || []).filter(u => u.status === 'AVAILABLE').length;
              return <option key={a.id} value={a.id} className="truncate">{a.name} ({avail})</option>;
            })}
          </select>
        </div>

        {/* Serial Number / Quantity */}
        {selectedAssetForAssign?.assetType === 'ELECTRONIC' ? (
          <div className="w-full lg:w-28 shrink-0">
            <select value={assignForm.serialNumber} onChange={e => setAssignForm({ ...assignForm, serialNumber: e.target.value })} required
              className="w-full bg-gray-50 border border-gray-100 rounded-xl px-2 py-2 text-[11px] font-bold text-gray-800 appearance-none focus:outline-none focus:bg-white truncate">
              <option value="">Serial #</option>
              {(selectedAssetForAssign.units || []).filter(u => u.status === 'AVAILABLE' && u.serialNumber).map(u =>
                <option key={u.id} value={u.serialNumber} className="truncate">{u.serialNumber}</option>
              )}
            </select>
          </div>
        ) : (
          <div className="w-full lg:w-16 shrink-0 flex items-center gap-1">
            <span className="text-[9px] font-bold text-gray-400 lg:hidden">Qty:</span>
            <input type="number" min="1" placeholder="Qty" value={assignForm.quantity} onChange={e => setAssignForm({ ...assignForm, quantity: e.target.value })}
              className="w-full bg-gray-50 border border-gray-100 rounded-xl px-2 py-2 text-[11px] font-bold text-center text-gray-800 focus:outline-none focus:bg-white" />
          </div>
        )}

        {/* Condition */}
        <div className="w-full lg:w-20 shrink-0">
          <select value={assignForm.condition} onChange={e => setAssignForm({ ...assignForm, condition: e.target.value })}
            className="w-full bg-gray-50 border border-gray-100 rounded-xl px-2 py-2 text-[11px] font-bold text-gray-800 appearance-none focus:outline-none focus:bg-white text-center">
            <option value="NEW">New</option>
            <option value="GOOD">Good</option>
            <option value="USED">Used</option>
          </select>
        </div>

        {/* Assign Button */}
        <div className="shrink-0 w-full lg:w-auto">
          {(can('ASSETS', 'UPDATE') || can('ASSETS', 'CREATE')) ? (
            <button type="submit" disabled={isSubmitting}
              className="w-full lg:w-auto bg-emerald-600 text-white font-black text-[11px] px-4 py-2 rounded-xl shadow-xs hover:bg-emerald-700 transition-all flex items-center justify-center gap-1 shrink-0 whitespace-nowrap">
              {isSubmitting ? <Loader2 size={14} className="animate-spin" /> : <><CheckCircle2 size={12} /> Assign</>}
            </button>
          ) : (
            <span className="text-[9px] text-rose-500 font-bold px-2">No Perms</span>
          )}
        </div>

        {/* Separator */}
        <div className="hidden lg:block w-px h-5 bg-gray-200 shrink-0 mx-0.5"></div>

        {/* Return Action */}
        <div className="shrink-0 w-full lg:w-auto">
          {(can('ASSETS', 'UPDATE') || can('ASSETS', 'CREATE')) && (
            <button type="button" onClick={() => { loadTracking(); setShowReturnModal(true); }}
              className="w-full lg:w-auto bg-orange-50 text-orange-600 font-black text-[11px] px-3 py-2 rounded-xl border border-orange-100 hover:bg-orange-100 transition-colors flex items-center justify-center gap-1 shrink-0 whitespace-nowrap">
              <ArrowDownCircle size={12} /> Return
            </button>
          )}
        </div>
      </form>
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
    <div className="space-y-4 animate-in fade-in duration-200">
      {issues.length === 0 ? (
        <div className="py-12 bg-white rounded-2xl border border-gray-100 text-center">
          <CheckCircle2 size={32} className="mx-auto text-emerald-200 mb-2" />
          <p className="text-sm font-bold text-gray-400">No issues reported</p>
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-gray-50/75 border-b border-gray-100 text-[10px] font-black text-gray-400 uppercase tracking-wider">
                  <th className="py-3 px-4">Asset Specifics</th>
                  <th className="py-3 px-4">Reported By</th>
                  <th className="py-3 px-4">Issue Category</th>
                  <th className="py-3 px-4">Details & Evidence</th>
                  <th className="py-3 px-4">Reported Date</th>
                  <th className="py-3 px-4 text-center">Status</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50 text-xs font-medium">
                {issues.map(issue => (
                  <tr key={issue.id} className="hover:bg-gray-50/50 transition-colors">
                    <td className="py-3 px-4 align-middle">
                      <div className="font-bold text-gray-900 truncate max-w-[150px]">{issue.assetUnit?.asset?.name}</div>
                      <div className="text-[10px] text-gray-400 truncate max-w-[150px]">{issue.assetUnit?.asset?.model || 'General'}</div>
                    </td>
                    <td className="py-3 px-4 align-middle text-gray-600 truncate max-w-[120px]">
                      {issue.user?.name || 'Unknown Agent'}
                    </td>
                    <td className="py-3 px-4 align-middle">
                      <span className="text-[10px] font-black uppercase text-gray-700 bg-gray-100 px-2 py-0.5 rounded">
                        {issue.issueType?.replace('_', ' ')}
                      </span>
                    </td>
                    <td className="py-3 px-4 align-middle">
                      <div className="flex items-center gap-2">
                        <span className="text-[11px] text-gray-600 truncate max-w-[180px] block">
                          {issue.description || 'No description provided'}
                        </span>
                        {issue.photos && issue.photos.length > 0 && (
                          <div className="flex gap-1 shrink-0">
                            {issue.photos.map((p, i) => (
                              <a key={i} href={p} target="_blank" rel="noopener noreferrer" className="block hover:opacity-80">
                                <img src={p} alt="" className="w-6 h-6 rounded object-cover border border-gray-200" />
                              </a>
                            ))}
                          </div>
                        )}
                      </div>
                    </td>
                    <td className="py-3 px-4 align-middle text-[11px] text-gray-400 whitespace-nowrap">
                      {new Date(issue.createdAt).toLocaleDateString('en-IN')}
                    </td>
                    <td className="py-3 px-4 align-middle text-center whitespace-nowrap">
                      <span className={`text-[9px] font-black px-2 py-0.5 rounded-md uppercase tracking-wider ${
                        issue.status === 'OPEN' ? 'bg-red-50 text-red-600 border border-red-100' : 
                        issue.status === 'RESOLVED' ? 'bg-emerald-50 text-emerald-600 border border-emerald-100' : 
                        'bg-gray-50 text-gray-500 border border-gray-100'
                      }`}>
                        {issue.status}
                      </span>
                    </td>
                    <td className="py-3 px-4 align-middle text-right whitespace-nowrap">
                      {issue.status === 'OPEN' && (can('ASSETS', 'UPDATE') || can('ASSETS', 'CREATE')) ? (
                        <div className="inline-flex gap-1.5 justify-end">
                          <button onClick={() => handleIssueStatus(issue.id, 'RESOLVED')}
                            className="text-[9px] font-black uppercase bg-emerald-50 text-emerald-600 px-2.5 py-1 rounded-lg hover:bg-emerald-100 border border-emerald-100 transition-colors">
                            Resolve
                          </button>
                          <button onClick={() => handleIssueStatus(issue.id, 'CLOSED')}
                            className="text-[9px] font-black uppercase bg-gray-50 text-gray-500 px-2.5 py-1 rounded-lg hover:bg-gray-100 border border-gray-100 transition-colors">
                            Close
                          </button>
                        </div>
                      ) : (
                        <span className="text-[10px] text-gray-300 italic">-- Actioned --</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );

  // ─── Reports Tab ────────────────────────────────────────
  const renderReports = () => {
    if (!reports) return <div className="flex justify-center py-12"><Loader2 className="animate-spin text-emerald-600" size={32} /></div>;

    return (
      <div className="space-y-8">
        <div className="flex items-center justify-between bg-white p-4 rounded-2xl border border-gray-100 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-50 flex items-center justify-center text-blue-600">
              <BarChart3 size={20} />
            </div>
            <div>
              <h3 className="text-sm font-black text-gray-900 uppercase tracking-tight">Asset Analytics</h3>
              <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Inventory Health & Distribution Reports</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => handleExportPDF('asset-utilization')}
              className="p-2.5 bg-white border border-gray-100 text-gray-400 hover:text-rose-600 hover:bg-rose-50 rounded-xl transition-all shadow-sm"
              title="Export PDF"
            >
              <FileText size={16} />
            </button>
            <button
              onClick={() => handlePrint('asset-utilization')}
              className="p-2.5 bg-white border border-gray-100 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-xl transition-all shadow-sm"
              title="Print Report"
            >
              <Printer size={16} />
            </button>
            <button
              onClick={() => handleExportExcel('asset-utilization')}
              className="flex items-center gap-2 px-4 py-2.5 bg-emerald-50 text-emerald-600 rounded-xl border border-emerald-100 hover:bg-emerald-100 transition-all font-black text-[10px] uppercase tracking-widest shadow-sm"
            >
              <Download size={14} /> Export Excel
            </button>
          </div>
        </div>

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
        <div className="bg-white rounded-[2rem] border border-gray-100 shadow-sm overflow-hidden">
          <div className="p-6 border-b border-gray-50 flex items-center justify-between bg-white">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-blue-50 flex items-center justify-center text-blue-600">
                <Users size={20} />
              </div>
              <div>
                <h3 className="text-sm font-black text-gray-900 uppercase tracking-tight">Executive Asset Registry</h3>
                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mt-0.5 italic">Real-time personnel assignment tracking</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => handleExportPDF('asset-executive-report')}
                className="p-2.5 bg-white border border-gray-100 text-gray-400 hover:text-rose-600 hover:bg-rose-50 rounded-xl transition-all shadow-sm group"
                title="Export PDF"
              >
                <FileText size={16} className="group-hover:scale-110 transition-transform" />
              </button>
              <button
                onClick={() => handlePrint('asset-executive-report')}
                className="p-2.5 bg-white border border-gray-100 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-xl transition-all shadow-sm group"
                title="Print Report"
              >
                <Printer size={16} className="group-hover:scale-110 transition-transform" />
              </button>
              <button
                onClick={() => handleExportExcel('asset-executive-report')}
                className="flex items-center gap-2 px-5 py-2.5 bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition-all font-black text-[10px] uppercase tracking-widest shadow-lg shadow-blue-600/20 active:scale-95"
              >
                <Download size={14} /> Export Excel
              </button>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-emerald-50/50">
                  <th className="text-left py-4 px-6 text-[10px] font-black text-emerald-800 uppercase tracking-widest border-b border-emerald-100/50">Executive Name</th>
                  <th className="text-left py-4 px-6 text-[10px] font-black text-emerald-800 uppercase tracking-widest border-b border-emerald-100/50">Asset Category / Name</th>
                  <th className="text-left py-4 px-6 text-[10px] font-black text-emerald-800 uppercase tracking-widest border-b border-emerald-100/50">Model / Specs</th>
                  <th className="text-left py-4 px-6 text-[10px] font-black text-emerald-800 uppercase tracking-widest border-b border-emerald-100/50">Serial Number</th>
                  <th className="text-right py-4 px-8 text-[10px] font-black text-emerald-800 uppercase tracking-widest border-b border-emerald-100/50">Current Condition</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {reports.executiveReport.length === 0 ? (
                  <tr>
                    <td colSpan="5" className="py-12 text-center text-gray-400 font-bold uppercase text-[10px] tracking-widest italic">
                      No active asset assignments detected
                    </td>
                  </tr>
                ) : (
                  reports.executiveReport.map((er) => (
                    er.assets.map((a, idx) => (
                      <tr key={`${er.user?.id}-${idx}`} className="hover:bg-emerald-50/20 transition-colors group">
                        <td className="py-4 px-6">
                          {idx === 0 ? (
                            <div className="flex items-center gap-2">
                              <div className="w-7 h-7 rounded-lg bg-slate-100 flex items-center justify-center text-slate-400 border border-slate-200">
                                <Users size={12} />
                              </div>
                              <span className="text-xs font-black text-gray-900">{er.user?.name}</span>
                            </div>
                          ) : (
                            <span className="text-[10px] text-gray-300 font-bold ml-9">"</span>
                          )}
                        </td>
                        <td className="py-4 px-6">
                          <span className="text-xs font-bold text-gray-700">{a.assetName}</span>
                        </td>
                        <td className="py-4 px-6">
                          <span className="text-[10px] font-medium text-gray-400 italic">
                            {a.model || <span className="text-gray-300 not-italic">---</span>}
                          </span>
                        </td>
                        <td className="py-4 px-6">
                          {a.serialNumber ? (
                            <span className="text-[10px] font-mono font-black text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-100">
                              {a.serialNumber}
                            </span>
                          ) : (
                            <span className="text-[10px] text-gray-300 font-mono">N/A</span>
                          )}
                        </td>
                        <td className="py-4 px-8 text-right">
                          <span className={`text-[9px] font-black px-2.5 py-1 rounded-lg uppercase tracking-tighter border shadow-sm ${
                            a.condition === 'NEW' ? 'bg-emerald-50 text-emerald-600 border-emerald-100' : 
                            a.condition === 'GOOD' ? 'bg-blue-50 text-blue-600 border-blue-100' : 
                            'bg-amber-50 text-amber-600 border-amber-100'
                          }`}>
                            {a.condition}
                          </span>
                        </td>
                      </tr>
                    ))
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    );
  };

  // ─── Vehicle Mapping Tab ────────────────────────────────
  const renderVehicleMapping = () => (
    <div className="space-y-6">
      <div className="bg-gradient-to-r from-emerald-600 to-teal-700 p-8 rounded-3xl text-white shadow-xl flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <h3 className="text-xl font-black tracking-tight flex items-center gap-2.5">
            <Truck size={24} className="text-emerald-200" /> Dynamic Fleet Asset Distribution
          </h3>
          <p className="text-xs text-emerald-100 font-medium mt-1">
            Real-time reflection of attached transport logistics. Vehicle allocations and primary agent assignments are administered centrally via the <strong className="underline underline-offset-2">Admin Vehicles</strong> module.
          </p>
        </div>
        <div className="bg-white/10 backdrop-blur-md px-4 py-2 rounded-2xl border border-white/10 text-xs font-bold">
          {tracking.filter(t => t.vehicleId || t.assetUnit?.vehicleId || t.user?.assignedVehicleId).length} Bound Assets
        </div>
      </div>

      <div className="bg-white rounded-3xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="p-4 bg-gray-50/50 border-b border-gray-100 font-bold text-xs text-gray-500 uppercase tracking-wider px-6 flex items-center justify-between">
          <span>Assigned Devices & Vehicle Binding List</span>
          <span className="text-[10px] text-emerald-600 font-bold lowercase bg-emerald-50 px-2 py-0.5 rounded-lg border border-emerald-100 flex items-center gap-1">
            <Lock size={10} /> read-only view
          </span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-emerald-50/30">
                <th className="text-left py-4 px-6 text-[10px] font-black text-emerald-800 uppercase tracking-widest">Asset Specifics</th>
                <th className="text-left py-4 px-6 text-[10px] font-black text-emerald-800 uppercase tracking-widest">Serial Number</th>
                <th className="text-left py-4 px-6 text-[10px] font-black text-emerald-800 uppercase tracking-widest">Current Holder</th>
                <th className="text-left py-4 px-6 text-[10px] font-black text-emerald-800 uppercase tracking-widest">Assigned Delivery Vehicle</th>
                <th className="text-right py-4 px-6 text-[10px] font-black text-emerald-800 uppercase tracking-widest">Binding Source</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {tracking.length === 0 ? (
                <tr>
                  <td colSpan="5" className="text-center py-12 text-gray-400 font-bold text-xs uppercase tracking-widest">
                    No Active Asset Assignments to Monitor
                  </td>
                </tr>
              ) : (
                tracking.map(item => {
                  const currentVehicleId = item.vehicleId || item.assetUnit?.vehicleId || item.user?.assignedVehicleId || '';
                  const targetVehicleObj = item.user?.assignedVehicle || vehicles.find(v => v.id === currentVehicleId);
                  
                  return (
                    <tr key={item.id} className="hover:bg-emerald-50/20 transition-colors">
                      <td className="py-4 px-6">
                        <div className="font-bold text-gray-900">{item.assetUnit?.asset?.name || 'Asset'}</div>
                        <div className="text-[10px] text-gray-400">{item.assetUnit?.asset?.assetType}</div>
                      </td>
                      <td className="py-4 px-6 font-mono text-xs font-bold text-emerald-600">
                        {item.assetUnit?.serialNumber || <span className="text-gray-300 italic">Bulk Asset</span>}
                      </td>
                      <td className="py-4 px-6">
                        <div className="flex flex-col gap-0.5">
                          <div className="flex items-center gap-2">
                            <div className="w-6 h-6 rounded-full bg-slate-100 flex items-center justify-center text-[10px] font-bold text-slate-600 shrink-0">
                              {(item.user?.name || 'U')[0]}
                            </div>
                            <span className="text-xs font-bold text-gray-700">{item.user?.name}</span>
                          </div>
                        </div>
                      </td>
                      <td className="py-4 px-6">
                        {targetVehicleObj ? (
                          <div className="flex items-center gap-2">
                            <span className="px-2.5 py-1 bg-emerald-50 text-emerald-800 font-black text-xs rounded-xl border border-emerald-100 flex items-center gap-1.5 shadow-2xs">
                              <Truck size={12} className="text-emerald-600" />
                              {targetVehicleObj.vehicleNumber}
                            </span>
                            {targetVehicleObj.vehicleName && (
                              <span className="text-[10px] text-gray-400 font-bold">({targetVehicleObj.vehicleName})</span>
                            )}
                          </div>
                        ) : (
                          <span className="text-xs text-gray-400 italic">Unassigned (Manage via Admin Vehicles)</span>
                        )}
                      </td>
                      <td className="py-4 px-6 text-right">
                        <span className={`px-2.5 py-1 rounded-lg text-[9px] font-black uppercase tracking-wider border ${
                          currentVehicleId ? 'bg-emerald-50 text-emerald-600 border-emerald-100' : 'bg-gray-50 text-gray-400 border-gray-100'
                        }`}>
                          {currentVehicleId ? (item.user?.assignedVehicleId ? 'Agent Allocation' : 'Direct Link') : 'Unassigned'}
                        </span>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );

  // ─── Depreciation Tab ───────────────────────────────────
  const renderDepreciation = () => (
    <div className="space-y-6">
      {/* Configuration Controller Form */}
      <div className="bg-white p-6 md:p-8 rounded-3xl border border-gray-100 shadow-sm">
        <div className="flex items-center gap-2 mb-6">
          <BarChart3 className="text-emerald-600" size={20} />
          <h4 className="text-sm font-black uppercase tracking-widest text-gray-800">Configure Depreciation Matrix</h4>
        </div>
        <form onSubmit={handleSaveDepreciation} className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="space-y-1">
            <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Select Physical Asset</label>
            <select 
              required
              value={depreciationForm.assetId} 
              onChange={e => {
                const a = assets.find(x => x.id === e.target.value);
                setDepreciationForm({ 
                  ...depreciationForm, 
                  assetId: e.target.value,
                  costBasis: a?.estimatedCost || ''
                });
              }}
              className="w-full bg-gray-50 border border-gray-100 rounded-xl px-3 py-2.5 text-xs font-bold"
            >
              <option value="">-- Select Master Asset --</option>
              {assets.map(a => <option key={a.id} value={a.id}>{a.name} ({a.assetType})</option>)}
            </select>
          </div>
          <div className="space-y-1">
            <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Cost Basis (₹)</label>
            <input 
              type="number" required placeholder="15000"
              value={depreciationForm.costBasis} 
              onChange={e => setDepreciationForm({...depreciationForm, costBasis: e.target.value})}
              className="w-full bg-gray-50 border border-gray-100 rounded-xl px-3 py-2.5 text-xs font-bold focus:ring-2 focus:ring-emerald-500/20" 
            />
          </div>
          <div className="space-y-1">
            <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Salvage / Residual Value (₹)</label>
            <input 
              type="number" required placeholder="1500"
              value={depreciationForm.salvageValue} 
              onChange={e => setDepreciationForm({...depreciationForm, salvageValue: e.target.value})}
              className="w-full bg-gray-50 border border-gray-100 rounded-xl px-3 py-2.5 text-xs font-bold focus:ring-2 focus:ring-emerald-500/20" 
            />
          </div>
          <div className="space-y-1">
            <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Useful Life (Years)</label>
            <input 
              type="number" min="1" required
              value={depreciationForm.usefulLifeYears} 
              onChange={e => setDepreciationForm({...depreciationForm, usefulLifeYears: e.target.value})}
              className="w-full bg-gray-50 border border-gray-100 rounded-xl px-3 py-2.5 text-xs font-bold focus:ring-2 focus:ring-emerald-500/20" 
            />
          </div>
          <div className="space-y-1">
            <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Depreciation Methodology</label>
            <select 
              value={depreciationForm.method} 
              onChange={e => setDepreciationForm({...depreciationForm, method: e.target.value})}
              className="w-full bg-gray-50 border border-gray-100 rounded-xl px-3 py-2.5 text-xs font-bold"
            >
              <option value="STRAIGHT_LINE">Straight-Line Method</option>
              <option value="DECLINING_BALANCE">Declining Balance Method</option>
            </select>
          </div>
          <div className="space-y-1">
            <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Annual Rate (%)</label>
            <div className="flex gap-2">
              <input 
                type="number" step="0.1" required
                value={depreciationForm.ratePercentage} 
                onChange={e => setDepreciationForm({...depreciationForm, ratePercentage: e.target.value})}
                className="w-full bg-gray-50 border border-gray-100 rounded-xl px-3 py-2.5 text-xs font-bold focus:ring-2 focus:ring-emerald-500/20" 
              />
              <button 
                type="submit" disabled={isSubmitting}
                className="bg-emerald-600 text-white font-bold text-xs px-6 rounded-xl hover:bg-emerald-700 transition-all shrink-0 shadow-md"
              >
                {isSubmitting ? <Loader2 size={16} className="animate-spin" /> : 'Save Matrix'}
              </button>
            </div>
          </div>
        </form>
      </div>

      {/* Calculated Schedule Overview Table */}
      <div className="bg-white rounded-3xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="p-4 bg-gray-50/50 border-b border-gray-100 font-bold text-xs text-gray-500 uppercase tracking-wider px-6">
          Asset Depreciation Matrix & Live Book Valuation
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-emerald-50/30">
                <th className="text-left py-4 px-6 text-[10px] font-black text-emerald-800 uppercase tracking-widest">Asset Details</th>
                <th className="text-left py-4 px-6 text-[10px] font-black text-emerald-800 uppercase tracking-widest whitespace-nowrap">Methodology</th>
                <th className="text-right py-4 px-6 text-[10px] font-black text-emerald-800 uppercase tracking-widest">Cost Basis</th>
                <th className="text-right py-4 px-6 text-[10px] font-black text-emerald-800 uppercase tracking-widest">Salvage Limit</th>
                <th className="text-center py-4 px-6 text-[10px] font-black text-emerald-800 uppercase tracking-widest">Useful Life</th>
                <th className="text-right py-4 px-6 text-[10px] font-black text-emerald-800 uppercase tracking-widest">Annual Rate</th>
                <th className="text-right py-4 px-6 text-[10px] font-black text-emerald-800 uppercase tracking-widest">Real-Time Book Val</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {depreciations.length === 0 ? (
                <tr>
                  <td colSpan="7" className="text-center py-12 text-gray-400 font-bold text-xs uppercase tracking-widest">
                    No Fixed-Asset Depreciation Configuration Seeded
                  </td>
                </tr>
              ) : (
                depreciations.map(dep => (
                  <tr key={dep.id} className="hover:bg-emerald-50/10 transition-colors">
                    <td className="py-4 px-6 max-w-xs">
                      <div className="font-black text-gray-900 truncate">{dep.assetName}</div>
                      {dep.assetModel && <div className="text-[10px] text-gray-400 truncate font-bold">{dep.assetModel}</div>}
                    </td>
                    <td className="py-4 px-6 whitespace-nowrap">
                      <span className="text-[8px] font-black px-2 py-0.5 bg-emerald-50 text-emerald-700 rounded-lg uppercase tracking-tight border border-emerald-100 inline-block">
                        {dep.method.replace('_', ' ')}
                      </span>
                    </td>
                    <td className="py-4 px-6 text-right font-mono font-bold text-gray-700">
                      ₹{dep.costBasis?.toLocaleString()}
                    </td>
                    <td className="py-4 px-6 text-right font-mono font-bold text-gray-700">
                      ₹{dep.salvageValue?.toLocaleString()}
                    </td>
                    <td className="py-4 px-6 text-center font-bold text-gray-700">
                      {dep.usefulLifeYears} Years
                    </td>
                    <td className="py-4 px-6 text-right font-mono font-bold text-emerald-600">
                      {dep.ratePercentage}%
                    </td>
                    <td className="py-4 px-6 text-right font-mono font-black text-emerald-600 text-base">
                      ₹{dep.realTimeBookValue?.toLocaleString()}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );

  // ─── Asset Audit Tab ────────────────────────────────────
  // ─── Asset Audit Tab ────────────────────────────────────
  const renderAudit = () => (
    <div className="space-y-6">
      {/* Logger Expandable Controller */}
      <div className="bg-white p-4 rounded-3xl border border-gray-100 shadow-sm flex flex-col transition-all duration-300">
        <div className="flex items-center justify-between px-2">
          <div className="flex items-center gap-2.5">
            <CheckCircle2 className="text-emerald-600" size={20} />
            <div>
              <h4 className="text-xs font-black uppercase tracking-widest text-gray-800">Physical Asset Audit & Inspection</h4>
              <p className="text-[10px] text-gray-400 font-bold">Perform manual inspection checks and log unit verification records</p>
            </div>
          </div>
          <button 
            type="button" 
            onClick={() => setShowAuditForm(!showAuditForm)}
            className={`px-4 py-2 rounded-xl font-black text-xs transition-all flex items-center gap-1.5 border ${
              showAuditForm 
                ? 'bg-gray-50 text-gray-500 border-gray-200 hover:bg-gray-100' 
                : 'bg-emerald-50 text-emerald-700 border-emerald-100 hover:bg-emerald-100'
            }`}
          >
            {showAuditForm ? <><X size={14} /> Close Logger</> : <><Plus size={14} /> Record New Audit</>}
          </button>
        </div>

        {showAuditForm && (
          <form onSubmit={(e) => { handleCreateAudit(e); setShowAuditForm(false); }} className="space-y-4 pt-4 mt-4 border-t border-gray-50 animate-fadeIn">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Target Master Asset</label>
                <select 
                  required
                  value={auditForm.assetId} 
                  onChange={e => setAuditForm({ ...auditForm, assetId: e.target.value, assetUnitId: '' })}
                  className="w-full bg-gray-50 border border-gray-100 rounded-xl px-3 py-2 text-xs font-bold focus:bg-white"
                >
                  <option value="">-- Select Master Asset --</option>
                  {assets.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
                </select>
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Specific Unit Serial (Optional)</label>
                <select 
                  value={auditForm.assetUnitId} 
                  onChange={e => setAuditForm({ ...auditForm, assetUnitId: e.target.value })}
                  className="w-full bg-gray-50 border border-gray-100 rounded-xl px-3 py-2 text-xs font-bold focus:bg-white"
                >
                  <option value="">-- All / General Unit --</option>
                  {(() => {
                    const targetAsset = assets.find(a => a.id === auditForm.assetId);
                    if (!targetAsset || !targetAsset.units) return null;
                    return targetAsset.units.map(u => (
                      <option key={u.id} value={u.id}>SN: {u.serialNumber || u.id.slice(-6)} ({u.condition})</option>
                    ));
                  })()}
                </select>
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Audit Result Status</label>
                <select 
                  value={auditForm.status} 
                  onChange={e => setAuditForm({ ...auditForm, status: e.target.value })}
                  className="w-full bg-gray-50 border border-gray-100 rounded-xl px-3 py-2 text-xs font-bold focus:bg-white"
                >
                  <option value="VERIFIED">Verified Present</option>
                  <option value="MISSING">Reported Missing / Lost</option>
                  <option value="DAMAGED">Physically Damaged</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-end">
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Physical Hardware Condition</label>
                <select 
                  value={auditForm.physicalCondition} 
                  onChange={e => setAuditForm({ ...auditForm, physicalCondition: e.target.value })}
                  className="w-full bg-gray-50 border border-gray-100 rounded-xl px-3 py-2 text-xs font-bold focus:bg-white"
                >
                  <option value="NEW">Pristine / New</option>
                  <option value="GOOD">Operational / Good</option>
                  <option value="DAMAGED">Requires Attention / Damaged</option>
                </select>
              </div>
              <div className="space-y-1 md:col-span-2">
                <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Verification Notes / Supervisor Remarks</label>
                <div className="flex gap-2">
                  <input 
                    type="text" placeholder="Scanned label successfully, operating nominal..."
                    value={auditForm.remarks} 
                    onChange={e => setAuditForm({ ...auditForm, remarks: e.target.value })}
                    className="w-full bg-gray-50 border border-gray-100 rounded-xl px-3 py-2 text-xs font-bold focus:bg-white"
                  />
                  <button 
                    type="submit" disabled={isSubmitting}
                    className="bg-emerald-600 text-white font-black text-xs px-6 rounded-xl hover:bg-emerald-700 transition-all shrink-0 flex items-center gap-1 shadow-md"
                  >
                    {isSubmitting ? <Loader2 size={16} className="animate-spin" /> : <><CheckCircle2 size={14} /> Log Audit</>}
                  </button>
                </div>
              </div>
            </div>
          </form>
        )}
      </div>

      {/* Audit Logs Table */}
      <div className="bg-white rounded-3xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="p-4 bg-gray-50/50 border-b border-gray-100 font-bold text-xs text-gray-500 uppercase tracking-wider px-6">
          Recent Audit Verification Trail
        </div>
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-emerald-50/30">
              <th className="text-left py-3 px-6 text-[10px] font-black text-emerald-800 uppercase tracking-widest">Date & Time</th>
              <th className="text-left py-3 px-6 text-[10px] font-black text-emerald-800 uppercase tracking-widest">Asset Target</th>
              <th className="text-left py-3 px-6 text-[10px] font-black text-emerald-800 uppercase tracking-widest">Auditor</th>
              <th className="text-left py-3 px-6 text-[10px] font-black text-emerald-800 uppercase tracking-widest">Result Status</th>
              <th className="text-left py-3 px-6 text-[10px] font-black text-emerald-800 uppercase tracking-widest">Condition & Notes</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50 text-xs">
            {audits.length === 0 ? (
              <tr>
                <td colSpan="5" className="text-center py-8 text-gray-400 font-bold uppercase tracking-widest">
                  No Asset Audits Logged Yet
                </td>
              </tr>
            ) : (
              audits.map(a => (
                <tr key={a.id} className="hover:bg-gray-50/50">
                  <td className="py-3 px-6 font-mono text-gray-500">
                    {new Date(a.auditDate).toLocaleString('en-IN', { dateStyle: 'short', timeStyle: 'short' })}
                  </td>
                  <td className="py-3 px-6">
                    <span className="font-bold text-gray-900 block">{a.assetName}</span>
                    {a.serialNumber !== 'N/A' && <span className="text-[10px] font-mono text-emerald-600 font-bold">SN: {a.serialNumber}</span>}
                  </td>
                  <td className="py-3 px-6 font-bold text-gray-700">{a.auditedByName}</td>
                  <td className="py-3 px-6">
                    <span className={`px-2 py-0.5 rounded text-[9px] font-black uppercase tracking-wider border ${
                      a.status === 'VERIFIED' ? 'bg-emerald-50 text-emerald-600 border-emerald-100' :
                      a.status === 'MISSING' ? 'bg-red-50 text-red-600 border-red-100' : 'bg-orange-50 text-orange-600 border-orange-100'
                    }`}>
                      {a.status}
                    </span>
                  </td>
                  <td className="py-3 px-6">
                    <span className="font-bold text-gray-800 block text-[11px]">Cond: {a.physicalCondition}</span>
                    {a.remarks && <span className="text-[10px] text-gray-400 italic">"{a.remarks}"</span>}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );

  // ─── Requests Tab ───────────────────────────────────────
  const renderRequests = () => (
    <div className="space-y-4">
      {requests.length === 0 ? (
        <div className="py-24 bg-white rounded-3xl border border-gray-100 text-center shadow-sm">
          <MessageSquare size={48} className="mx-auto text-emerald-200 mb-4" />
          <p className="text-sm font-bold text-gray-400 uppercase tracking-widest">No active requests found</p>
        </div>
      ) : (
        <div className="bg-white rounded-3xl border border-gray-100 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-emerald-50/50">
                  <th className="text-left py-4 px-6 text-[10px] font-black text-emerald-800 uppercase tracking-widest">Type & Priority</th>
                  <th className="text-left py-4 px-6 text-[10px] font-black text-emerald-800 uppercase tracking-widest">Executive</th>
                  <th className="text-left py-4 px-6 text-[10px] font-black text-emerald-800 uppercase tracking-widest">Asset Details</th>
                  <th className="text-left py-4 px-6 text-[10px] font-black text-emerald-800 uppercase tracking-widest">Description / Reason</th>
                  <th className="text-center py-4 px-6 text-[10px] font-black text-emerald-800 uppercase tracking-widest">Status</th>
                  <th className="text-right py-4 px-8 text-[10px] font-black text-emerald-800 uppercase tracking-widest">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {requests.map(req => (
                  <tr key={req.id} className="hover:bg-emerald-50/30 transition-colors group">
                    <td className="py-4 px-6">
                      <div className="flex flex-col gap-1.5">
                        <div className="flex items-center gap-2">
                          <div className={`w-7 h-7 rounded-lg flex items-center justify-center ${
                            req.type === 'REPLACEMENT' ? 'bg-orange-50 text-orange-500' :
                            req.type === 'NEW_ASSET' ? 'bg-blue-50 text-blue-500' : 'bg-emerald-50 text-emerald-500'
                          }`}>
                            {req.type === 'REPLACEMENT' ? <RefreshCcw size={14} /> :
                             req.type === 'NEW_ASSET' ? <Plus size={14} /> : <MessageSquare size={14} />}
                          </div>
                          <span className="text-[10px] font-black text-gray-900 uppercase tracking-tight">
                            {req.type.replace('_', ' ')}
                          </span>
                        </div>
                        <span className={`text-[8px] font-black px-2 py-0.5 rounded border w-fit uppercase tracking-tighter ${
                          req.priority === 'HIGH' || req.priority === 'CRITICAL' 
                          ? 'bg-red-50 text-red-600 border-red-100' 
                          : 'bg-gray-50 text-gray-400 border-gray-100'
                        }`}>
                          {req.priority} Priority
                        </span>
                      </div>
                    </td>
                    <td className="py-4 px-6">
                      <div className="flex items-center gap-2.5">
                        <div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center text-slate-400 border border-slate-200">
                          <Users size={14} />
                        </div>
                        <div className="flex flex-col">
                          <span className="text-xs font-black text-gray-900">{req.user?.name}</span>
                          <span className="text-[9px] font-bold text-gray-400 uppercase tracking-widest">{req.user?.role}</span>
                        </div>
                      </div>
                    </td>
                    <td className="py-4 px-6">
                      <div className="flex flex-col">
                        <span className="text-xs font-bold text-gray-800">
                          {req.asset?.name || <span className="italic text-gray-400">General Requirement</span>}
                        </span>
                        {req.asset?.model && <span className="text-[9px] text-gray-400 italic">({req.asset.model})</span>}
                        {req.assetUnit?.serialNumber && (
                          <span className="text-[9px] font-mono text-emerald-600 font-bold mt-0.5">SN: {req.assetUnit.serialNumber}</span>
                        )}
                      </div>
                    </td>
                    <td className="py-4 px-6">
                      <div className="max-w-[200px]">
                        <p className="text-[10px] text-gray-500 italic leading-relaxed line-clamp-2">
                          {req.description ? `"${req.description}"` : 'No description provided'}
                        </p>
                        <span className="text-[8px] text-gray-300 font-bold uppercase mt-1 block">
                          {new Date(req.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}
                        </span>
                        {req.adminRemark && (
                          <div className="mt-1 p-1.5 bg-red-50 rounded-lg border border-red-100 text-[8px] text-red-600 font-bold">
                            Remark: {req.adminRemark}
                          </div>
                        )}
                      </div>
                    </td>
                    <td className="py-4 px-6 text-center">
                      <span className={`text-[9px] font-black px-2.5 py-1 rounded-full uppercase tracking-widest border ${
                        req.status === 'PENDING' ? 'bg-amber-50 text-amber-600 border-amber-100' :
                        req.status === 'APPROVED' ? 'bg-blue-50 text-blue-600 border-blue-100' :
                        req.status === 'REJECTED' ? 'bg-red-50 text-red-600 border-red-100' : 
                        'bg-emerald-50 text-emerald-600 border-emerald-100'
                      }`}>
                        {req.status}
                      </span>
                    </td>
                    <td className="py-4 px-8 text-right">
                      <div className="flex items-center justify-end gap-2">
                        {req.status === 'PENDING' && (can('ASSETS', 'UPDATE') || can('ASSETS', 'CREATE')) && (
                          <>
                            <button 
                              onClick={() => handleRequestUpdate(req.id, 'APPROVED')}
                              className="px-3 py-1.5 bg-blue-50 text-blue-600 text-[9px] font-black uppercase tracking-wider rounded-lg border border-blue-100 hover:bg-blue-100 transition-all shadow-sm"
                            >
                              Approve
                            </button>
                            <button 
                              onClick={() => {
                                 const remark = window.prompt("Reason for rejection?");
                                 if(remark !== null) handleRequestUpdate(req.id, 'REJECTED', remark);
                              }}
                              className="px-3 py-1.5 bg-red-50 text-red-600 text-[9px] font-black uppercase tracking-wider rounded-lg border border-red-100 hover:bg-red-100 transition-all shadow-sm"
                            >
                              Reject
                            </button>
                          </>
                        )}
                        {req.status === 'APPROVED' && (can('ASSETS', 'UPDATE') || can('ASSETS', 'CREATE')) && (
                           <button 
                              onClick={() => handleRequestUpdate(req.id, 'COMPLETED')}
                              className="px-4 py-1.5 bg-emerald-600 text-white text-[9px] font-black uppercase tracking-wider rounded-lg shadow-lg shadow-emerald-600/20 hover:bg-emerald-700 transition-all"
                            >
                              Handover Complete
                            </button>
                        )}
                        {(req.status === 'REJECTED' || req.status === 'COMPLETED') && (
                          <span className="text-[9px] font-black text-gray-300 uppercase italic">Archive Only</span>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );

  // Gatekeeper
  const isGlobalRole = currentUser?.role === 'TENANT_OWNER' || currentUser?.role === 'SUPER_ADMIN' || (currentUser?.role === 'ADMIN' && !currentUser?.customRoleId) || currentUser?.portalType === 'ADMIN';
  
  if (isGlobalRole && !storeId) {
    return (
       <div className="space-y-8 animate-in fade-in duration-500">
         <div className="flex flex-col gap-1">
           <h2 className="text-3xl font-black text-gray-900 tracking-tight">Organization Assets</h2>
           <p className="text-sm font-medium text-gray-500 uppercase tracking-widest">Global Inventory & Branch Distribution Oversight</p>
         </div>

         <div className="grid grid-cols-1 gap-4 max-w-5xl">
           {stores.map(store => (
             <div 
               key={store.id}
               onClick={() => setSearchParams({ storeId: store.id })}
               className="group bg-white p-8 rounded-[2.5rem] border border-gray-100 shadow-sm hover:shadow-2xl hover:shadow-emerald-500/10 hover:border-emerald-100 transition-all cursor-pointer relative overflow-hidden"
             >
               <div className="absolute top-0 right-0 p-6 opacity-[0.03] group-hover:opacity-[0.08] transition-opacity">
                 <Package size={120} />
               </div>
                <div className="relative z-10 flex items-center justify-between gap-8">
                  <div className="flex items-center gap-6">
                    <div className="w-16 h-16 rounded-3xl bg-emerald-50 text-emerald-600 flex items-center justify-center group-hover:bg-emerald-600 group-hover:text-white transition-all duration-500 shrink-0">
                      <Package size={32} strokeWidth={2.5} />
                    </div>
                    <div className="flex flex-col">
                      <h3 className="text-xl font-black text-gray-900 tracking-tight group-hover:text-emerald-600 transition-colors">{store.name}</h3>
                      <div className="flex items-center gap-2 mt-1">
                        <span className="text-[10px] font-black px-2.5 py-0.5 bg-emerald-50 text-emerald-600 rounded-md uppercase tracking-widest">
                          {store.code || 'BRANCH'}
                        </span>
                        <span className="text-xs font-bold text-gray-400 uppercase tracking-tighter flex items-center gap-1.5">
                          • <Box size={12} /> {store.address || 'Location Unspecified'}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-12">
                    <div className="hidden md:flex flex-col items-end">
                      <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Asset Management</span>
                      <span className="text-sm font-bold text-gray-900 uppercase italic mt-1">Full Oversight</span>
                    </div>
                    <div className="w-12 h-12 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center opacity-40 group-hover:opacity-100 group-hover:bg-emerald-600 group-hover:text-white transition-all">
                      <ArrowLeft className="rotate-180" size={24} strokeWidth={3} />
                    </div>
                  </div>
                </div>
             </div>
           ))}
         </div>
       </div>
    );
  }

  if (showCreateModal) {
    return (
      <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-500 pb-20">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button 
              onClick={() => setShowCreateModal(false)}
              className="p-2.5 bg-white border border-gray-100 rounded-2xl text-gray-400 hover:text-emerald-600 hover:border-emerald-100 transition-all shadow-sm group"
            >
              <ArrowLeft size={20} className="group-hover:-translate-x-0.5 transition-transform" />
            </button>
            <div>
              <h2 className="text-2xl font-black text-gray-900 tracking-tight">Register New Asset</h2>
              <p className="text-[10px] uppercase font-black text-gray-400 tracking-widest mt-1 italic">Inventory Expansion & Capital Tracking</p>
            </div>
          </div>
          <button 
            onClick={() => setShowCreateModal(false)}
            className="hidden md:flex items-center gap-2 px-6 py-3 bg-white border border-gray-100 rounded-2xl text-[10px] font-black uppercase text-gray-400 hover:text-gray-900 hover:border-gray-200 transition-all shadow-sm"
          >
            Cancel & Return
          </button>
        </div>

        <div className="bg-white rounded-[2.5rem] border border-gray-50 shadow-2xl shadow-slate-200/50 overflow-hidden">
          <div className="p-8 md:p-12">
            <form onSubmit={handleCreate} className="max-w-4xl mx-auto space-y-10">
              {/* Classification & Nature */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div className="space-y-6">
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1 flex items-center gap-2">
                      <Tag size={12} className="text-emerald-500" /> Asset Category <span className="text-rose-500">*</span>
                    </label>
                    <select value={form.categoryId} onChange={e => setForm({ ...form, categoryId: e.target.value })} required
                      className="w-full bg-slate-50 border border-slate-100 rounded-2xl px-6 py-4 text-sm font-black text-emerald-800 appearance-none outline-none focus:ring-4 focus:ring-emerald-500/10 focus:border-emerald-500 focus:bg-white transition-all cursor-pointer">
                      <option value="">Select Category</option>
                      {assetCategories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                    </select>
                  </div>

                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1 flex items-center gap-2">
                      <Monitor size={12} className="text-emerald-500" /> Operational Nature <span className="text-rose-500">*</span>
                    </label>
                    <div className="grid grid-cols-2 gap-3 p-1.5 bg-slate-100 rounded-2xl">
                      <button type="button" onClick={() => setForm({...form, assetType: 'ELECTRONIC'})}
                        className={`py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${form.assetType === 'ELECTRONIC' ? 'bg-white text-emerald-600 shadow-sm' : 'text-gray-400 hover:text-gray-600'}`}>
                        Electronic
                      </button>
                      <button type="button" onClick={() => setForm({...form, assetType: 'NON_ELECTRONIC'})}
                        className={`py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${form.assetType === 'NON_ELECTRONIC' ? 'bg-white text-emerald-600 shadow-sm' : 'text-gray-400 hover:text-gray-600'}`}>
                        Bulk / Tools
                      </button>
                    </div>
                  </div>
                </div>

                <div className="space-y-6">
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1 flex items-center gap-2">
                      <Package size={12} className="text-emerald-500" /> Identification Name <span className="text-rose-500">*</span>
                    </label>
                    <input type="text" required value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} placeholder="e.g. Android POS V2"
                      className="w-full bg-slate-50 border border-slate-100 rounded-2xl px-6 py-4.5 text-base focus:ring-4 focus:ring-emerald-500/10 focus:border-emerald-500 focus:bg-white outline-none transition-all font-bold tracking-tight" />
                  </div>

                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1 flex items-center gap-2">
                      <Box size={12} className="text-emerald-500" /> Asset Description
                    </label>
                    <textarea value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} rows="1" placeholder="Technical specs or usage notes..."
                      className="w-full bg-slate-50 border border-slate-100 rounded-2xl px-6 py-4.5 text-sm focus:ring-4 focus:ring-emerald-500/10 focus:border-emerald-500 focus:bg-white outline-none transition-all font-medium resize-none overflow-hidden" />
                  </div>
                </div>
              </div>

              {/* Specs & Valuation */}
              <div className="bg-slate-50/50 p-8 rounded-[2rem] border border-slate-100 space-y-8">
                <div className="flex items-center gap-3 border-b border-slate-100 pb-4">
                  <BarChart3 size={20} className="text-emerald-500" />
                  <h4 className="text-xs font-black uppercase tracking-widest text-slate-800">Specifications & Valuation</h4>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Brand / OEM</label>
                    <input type="text" value={form.brand} onChange={e => setForm({ ...form, brand: e.target.value })} placeholder="e.g. MSwipe"
                      className="w-full bg-white border border-slate-200 rounded-2xl px-5 py-4 text-sm font-black text-slate-700 focus:ring-4 focus:ring-emerald-500/10 focus:border-emerald-500 outline-none transition-all" />
                  </div>

                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Model / Version</label>
                    <input type="text" value={form.model} onChange={e => setForm({ ...form, model: e.target.value })} placeholder="e.g. V240-X"
                      className="w-full bg-white border border-slate-200 rounded-2xl px-5 py-4 text-sm font-black text-slate-700 focus:ring-4 focus:ring-emerald-500/10 focus:border-emerald-500 outline-none transition-all" />
                  </div>

                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Estimated Value (₹)</label>
                    <input type="number" value={form.estimatedCost} onChange={e => setForm({ ...form, estimatedCost: e.target.value })} placeholder="0"
                      className="w-full bg-white border border-slate-200 rounded-2xl px-5 py-4 text-sm font-black text-emerald-600 focus:ring-4 focus:ring-emerald-500/10 focus:border-emerald-500 outline-none transition-all" />
                  </div>
                </div>
              </div>

              {/* Media Attachment */}
              <div className="space-y-4">
                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1 flex items-center gap-2 uppercase font-black">
                  Visual Documentation
                </label>
                <div className="relative group overflow-hidden">
                  <input type="file" accept="image/*" onChange={e => setSelectedFile(e.target.files[0])}
                    className="absolute inset-0 opacity-0 cursor-pointer z-10" />
                  <div className="w-full h-40 bg-slate-50 border-2 border-dashed border-slate-200 rounded-[2rem] flex flex-col items-center justify-center gap-3 group-hover:bg-emerald-50/50 group-hover:border-emerald-200 transition-all">
                    <div className="w-12 h-12 rounded-2xl bg-white shadow-sm flex items-center justify-center text-slate-400 group-hover:text-emerald-500 transition-colors">
                      <RefreshCcw size={20} />
                    </div>
                    <div className="text-center">
                      <p className="text-xs font-black text-slate-600">{selectedFile ? selectedFile.name : 'Click or Drag Asset Identity Photo'}</p>
                      <p className="text-[9px] font-bold text-slate-400 mt-1 uppercase tracking-tighter">PNG, JPG up to 10MB</p>
                    </div>
                  </div>
                </div>
              </div>

              <div className="flex flex-col md:flex-row items-center justify-end gap-4 pt-4">
                <button type="button" onClick={() => setShowCreateModal(false)}
                  className="w-full md:w-auto px-10 py-5 rounded-2xl font-black text-xs uppercase tracking-widest text-gray-400 hover:text-gray-900 transition-all">
                  Discard
                </button>
                <button type="submit" disabled={isSubmitting}
                  className={`w-full md:w-auto px-16 py-5 rounded-2xl shadow-2xl shadow-emerald-500/30 text-white font-black text-xs uppercase tracking-widest transition-all active:scale-95 flex items-center justify-center gap-3 ${
                    isSubmitting ? 'bg-emerald-400 cursor-not-allowed' : 'bg-emerald-600 hover:bg-emerald-700'
                  }`}>
                  {isSubmitting ? <><Loader2 className="animate-spin" size={18} /> Cataloging...</> : <><CheckCircle2 size={18} /> Catalog Asset</>}
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div key={storeId} className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex flex-col gap-1">
          <div className="flex items-center gap-3">
            {storeId && stores.length > 1 && (
              <button
                onClick={() => setSearchParams({})}
                className="p-2.5 bg-white border border-gray-100 rounded-xl text-gray-400 hover:text-emerald-600 hover:border-emerald-100 transition-all shadow-sm active:scale-90"
                title="Back to All Branches"
              >
                <ChevronLeft size={18} />
              </button>
            )}
            <h2 className="text-2xl font-bold text-gray-900">
              {(() => {
                const selectedStore = stores.find(s => s.id === storeId);
                return selectedStore ? `${selectedStore.name} Assets` : 'Asset Management';
              })()}
            </h2>
          </div>
          <p className="text-sm text-gray-500">Track, assign and manage company assets</p>
        </div>
        {stores.length > 1 && (
          <select
            value={storeId || ''}
            onChange={(e) => {
              if (e.target.value) {
                setSearchParams({ storeId: e.target.value });
              } else {
                setSearchParams({});
              }
            }}
            className="bg-emerald-50 text-emerald-700 text-[10px] font-black uppercase tracking-widest pl-3 pr-7 py-2 rounded-xl border-none outline-none appearance-none focus:ring-2 focus:ring-emerald-500/20 cursor-pointer shadow-sm w-fit"
            style={{
              backgroundImage: `url("data:image/svg+xml,%3csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 20 20'%3e%3cpath stroke='%23047857' stroke-linecap='round' stroke-linejoin='round' stroke-width='2' d='M5.25 7.5L10 12.25L14.75 7.5'/%3e%3c/svg%3e")`,
              backgroundPosition: 'right 0.35rem center',
              backgroundRepeat: 'no-repeat',
              backgroundSize: '1.1rem'
            }}
          >
            <option value="">All Branches</option>
            {stores.map(s => (
              <option key={s.id} value={s.id}>{s.name}</option>
            ))}
          </select>
        )}
      </div>

      {/* Tabs */}
      <div className="grid grid-cols-8 gap-1 p-1 rounded-2xl bg-gray-50 border border-gray-100 mb-6 w-full overflow-hidden">
        {tabs.map(tab => (
          <button key={tab.key}
            onClick={() => { setActiveTab(tab.key); setSearchQuery(''); }}
            className={`flex flex-col lg:flex-row items-center justify-center gap-1 lg:gap-1.5 py-2 px-1 rounded-xl text-[9px] lg:text-[10px] font-black uppercase tracking-tight text-center truncate transition-all duration-200 ${
              activeTab === tab.key ? 'bg-white text-emerald-700 border border-emerald-100 shadow-sm' : 'text-gray-400 hover:text-gray-600 hover:bg-gray-100/50'
            }`}>
            <span className="shrink-0">{tab.icon}</span>
            <span className="truncate max-w-full">{tab.label}</span>
          </button>
        ))}
      </div>

      {activeTab === 'master' && renderMaster()}
      {activeTab === 'assign' && renderAssign()}
      {activeTab === 'vehicle-mapping' && renderVehicleMapping()}
      {activeTab === 'issues' && renderIssues()}
      {activeTab === 'depreciation' && renderDepreciation()}
      {activeTab === 'audit' && renderAudit()}
      {activeTab === 'requests' && renderRequests()}
      {activeTab === 'reports' && renderReports()}

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
                {isSubmitting ? <><Loader2 size={18} className="animate-spin" /> Processing...</> : <><CheckCircle2 size={16} /> Submit Return</>}
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
