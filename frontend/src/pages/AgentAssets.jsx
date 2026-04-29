import React, { useState, useEffect } from 'react';
import { Package, Monitor, Box, AlertTriangle, Loader2, X, Camera, CheckCircle2, ChevronRight, Plus, History, MessageSquare, RefreshCcw } from 'lucide-react';
import { assetAPI } from '../services/api';
import toast from 'react-hot-toast';

export default function AgentAssets() {
  const [activeTab, setActiveTab] = useState('assets'); // 'assets' or 'requests'
  const [assets, setAssets] = useState([]);
  const [requests, setRequests] = useState([]);
  const [catalog, setCatalog] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showIssueModal, setShowIssueModal] = useState(false);
  const [showRequestModal, setShowRequestModal] = useState(false);
  const [selectedAsset, setSelectedAsset] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [expandedId, setExpandedId] = useState(null);

  // Issue form
  const [issueForm, setIssueForm] = useState({ issueType: 'NOT_WORKING', description: '' });
  const [issuePhotos, setIssuePhotos] = useState([]);

  // Request form
  const [requestForm, setRequestForm] = useState({
    type: 'NEW_ASSET',
    assetId: '',
    assetUnitId: '',
    description: '',
    priority: 'MEDIUM'
  });

  useEffect(() => {
    fetchAll();
  }, []);

  const fetchAll = async () => {
    setLoading(true);
    try {
      const [aRes, rRes, cRes] = await Promise.all([
        assetAPI.getMyAssets(),
        assetAPI.getMyRequests(),
        assetAPI.getCatalog()
      ]);
      setAssets(aRes.data);
      setRequests(rRes.data);
      setCatalog(cRes.data);
    } catch (err) {
      toast.error('Failed to load asset data');
    } finally {
      setLoading(false);
    }
  };

  const handleReportIssue = async (e) => {
    e.preventDefault();
    if (!selectedAsset) return;
    setIsSubmitting(true);
    try {
      const fd = new FormData();
      fd.append('assetUnitId', selectedAsset.assetUnitId);
      fd.append('issueType', issueForm.issueType);
      if (issueForm.description) fd.append('description', issueForm.description);
      issuePhotos.forEach(f => fd.append('photos', f));

      await assetAPI.reportIssue(fd);
      toast.success('Issue reported successfully');
      setShowIssueModal(false);
      setSelectedAsset(null);
      setIssueForm({ issueType: 'NOT_WORKING', description: '' });
      setIssuePhotos([]);
      fetchAll();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to report issue');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCreateRequest = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      await assetAPI.createRequest(requestForm);
      toast.success('Request submitted successfully');
      setShowRequestModal(false);
      setRequestForm({ type: 'NEW_ASSET', assetId: '', assetUnitId: '', description: '', priority: 'MEDIUM' });
      fetchAll();
      setActiveTab('requests');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to submit request');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
        <Loader2 className="animate-spin text-emerald-600" size={40} />
        <p className="text-gray-500 font-medium">Loading your assets...</p>
      </div>
    );
  }

  return (
    <div className="px-4 py-6 space-y-6 max-w-lg mx-auto pb-24">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 bg-emerald-100 rounded-2xl flex items-center justify-center">
            <Package size={24} className="text-emerald-600" />
          </div>
          <div>
            <h2 className="text-xl font-black text-gray-900">My Assets</h2>
            <p className="text-xs text-gray-400 font-bold uppercase tracking-wider">{assets.length} items • {requests.length} requests</p>
          </div>
        </div>
      </div>

      {/* Modern Tabs */}
      <div className="flex p-1 bg-gray-100 rounded-2xl">
        <button
          onClick={() => setActiveTab('assets')}
          className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-xs font-black uppercase tracking-wider transition-all ${activeTab === 'assets' ? 'bg-white text-emerald-600 shadow-sm' : 'text-gray-400'
            }`}
        >
          <Box size={16} /> My Gear
        </button>
        <button
          onClick={() => setActiveTab('requests')}
          className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-xs font-black uppercase tracking-wider transition-all ${activeTab === 'requests' ? 'bg-white text-emerald-600 shadow-sm' : 'text-gray-400'
            }`}
        >
          <History size={16} /> Status
        </button>
      </div>

      {activeTab === 'assets' ? (
        <div className="space-y-4">
          {/* Quick Actions */}
          <div className="grid grid-cols-2 gap-3">
            <button
              onClick={() => { setRequestForm({ ...requestForm, type: 'NEW_ASSET' }); setShowRequestModal(true); }}
              className="flex flex-col items-center gap-2 p-4 bg-white rounded-2xl border border-gray-100 shadow-sm hover:border-emerald-200 transition-all text-center"
            >
              <div className="w-10 h-10 bg-blue-50 text-blue-600 rounded-xl flex items-center justify-center">
                <Plus size={20} />
              </div>
              <span className="text-[10px] font-black text-gray-700 uppercase">Request New</span>
            </button>
            <button
              onClick={() => { setRequestForm({ ...requestForm, type: 'NEW_REQUIREMENT' }); setShowRequestModal(true); }}
              className="flex flex-col items-center gap-2 p-4 bg-white rounded-2xl border border-gray-100 shadow-sm hover:border-emerald-200 transition-all text-center"
            >
              <div className="w-10 h-10 bg-emerald-50 text-emerald-600 rounded-xl flex items-center justify-center">
                <MessageSquare size={20} />
              </div>
              <span className="text-[10px] font-black text-gray-700 uppercase">Requirement</span>
            </button>
          </div>

          {/* Asset List */}
          {assets.length === 0 ? (
            <div className="py-16 bg-white rounded-3xl border border-gray-100 shadow-sm text-center">
              <Package size={48} className="mx-auto text-gray-200 mb-3" />
              <h3 className="text-lg font-black text-gray-300">No Assets Assigned</h3>
              <p className="text-sm text-gray-400 mt-1">Contact your admin for asset allocation</p>
            </div>
          ) : (
            <div className="space-y-3">
              {assets.map((assignment) => {
                const asset = assignment.assetUnit?.asset;
                const unit = assignment.assetUnit;
                const isExpanded = expandedId === assignment.id;

                return (
                  <div key={assignment.id} className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden transition-all hover:shadow-md">
                    <button
                      onClick={() => setExpandedId(isExpanded ? null : assignment.id)}
                      className="w-full p-4 flex items-center gap-3 text-left"
                    >
                      <div className={`w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 ${asset?.assetType === 'ELECTRONIC' ? 'bg-blue-50' : 'bg-amber-50'
                        }`}>
                        {asset?.image ? (
                          <img src={asset.image} alt={asset.name} className="w-full h-full rounded-2xl object-cover" />
                        ) : (
                          asset?.assetType === 'ELECTRONIC' ? <Monitor size={22} className="text-blue-500" /> : <Box size={22} className="text-amber-500" />
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <h3 className="text-sm font-black text-gray-900 truncate">{asset?.name || 'Unknown'}</h3>
                        <div className="flex items-center gap-2 mt-0.5 font-bold">
                          {asset?.model && <span className="text-[10px] text-gray-400">{asset.model}</span>}
                          {unit?.serialNumber && <span className="text-[10px] font-mono text-emerald-600 bg-emerald-50 px-1.5 py-0.5 rounded">{unit.serialNumber}</span>}
                        </div>
                      </div>
                      <ChevronRight size={16} className={`text-gray-300 transition-transform duration-200 ${isExpanded ? 'rotate-90' : ''}`} />
                    </button>

                    {isExpanded && (
                      <div className="px-4 pb-4 space-y-3 animate-in fade-in duration-200">
                        <div className="bg-gray-50 p-3 rounded-xl space-y-2">
                          <div className="flex items-center justify-between"><span className="text-[9px] font-black text-gray-400 uppercase">Condition</span><span className="text-[10px] font-bold text-gray-700">{assignment.assignCondition}</span></div>
                          <div className="flex items-center justify-between"><span className="text-[9px] font-black text-gray-400 uppercase">Assigned</span><span className="text-[10px] font-bold text-gray-700">{new Date(assignment.assignedDate).toLocaleDateString('en-IN')}</span></div>
                          {asset?.brand && <div className="flex items-center justify-between"><span className="text-[9px] font-black text-gray-400 uppercase">Brand</span><span className="text-[10px] font-bold text-gray-700">{asset.brand}</span></div>}
                        </div>
                        <div className="grid grid-cols-2 gap-2">
                          <button
                            onClick={() => { setSelectedAsset(assignment); setShowIssueModal(true); }}
                            className="flex-1 flex items-center justify-center gap-2 py-3 bg-red-50 text-red-500 font-black text-[10px] uppercase tracking-wider rounded-xl border border-red-100"
                          >
                            <AlertTriangle size={14} /> Issue
                          </button>
                          <button
                            onClick={() => {
                              setRequestForm({ ...requestForm, type: 'REPLACEMENT', assetId: asset?.id, assetUnitId: unit?.id });
                              setShowRequestModal(true);
                            }}
                            className="flex-1 flex items-center justify-center gap-2 py-3 bg-blue-50 text-blue-600 font-black text-[10px] uppercase tracking-wider rounded-xl border border-blue-100"
                          >
                            <RefreshCcw size={14} /> Replace
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      ) : (
        /* Requests History Tab */
        <div className="space-y-4">
          {requests.length === 0 ? (
            <div className="py-16 bg-white rounded-3xl border border-gray-100 shadow-sm text-center">
              <History size={48} className="mx-auto text-gray-200 mb-3" />
              <h3 className="text-lg font-black text-gray-300">No Requests Yet</h3>
              <p className="text-sm text-gray-400 mt-1">Your equipment requests will appear here</p>
            </div>
          ) : (
            <div className="space-y-3">
              {requests.map((req) => (
                <div key={req.id} className="bg-white p-4 rounded-2xl border border-gray-100 shadow-sm space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${req.type === 'REPLACEMENT' ? 'bg-orange-50 text-orange-500' :
                        req.type === 'NEW_ASSET' ? 'bg-blue-50 text-blue-500' : 'bg-emerald-50 text-emerald-500'
                        }`}>
                        {req.type === 'REPLACEMENT' ? <RefreshCcw size={16} /> :
                          req.type === 'NEW_ASSET' ? <Plus size={16} /> : <MessageSquare size={16} />}
                      </div>
                      <span className="text-xs font-black text-gray-900 uppercase tracking-tight">
                        {req.type.replace('_', ' ')}
                      </span>
                    </div>
                    <span className={`text-[9px] font-black px-2 py-1 rounded-lg uppercase tracking-widest shadow-sm ${req.status === 'PENDING' ? 'bg-amber-100 text-amber-600' :
                      req.status === 'APPROVED' ? 'bg-blue-100 text-blue-600' :
                        req.status === 'REJECTED' ? 'bg-red-100 text-red-600' : 'bg-emerald-100 text-emerald-600'
                      }`}>{req.status}</span>
                  </div>

                  <div className="bg-gray-50 p-3 rounded-xl">
                    <div className="text-[10px] font-black text-gray-400 uppercase mb-1">Details</div>
                    <div className="text-[11px] font-bold text-gray-700">
                      {req.asset?.name || 'New Requirement'}
                      {req.asset?.model && <span className="text-gray-400 ml-1">({req.asset.model})</span>}
                    </div>
                    {req.description && <p className="text-[10px] text-gray-500 mt-1 line-clamp-2">{req.description}</p>}
                  </div>

                  {req.adminRemark && (
                    <div className="p-3 bg-emerald-50 rounded-xl border border-emerald-100">
                      <span className="text-[9px] font-black text-emerald-600 uppercase block mb-1">Admin Remark</span>
                      <p className="text-[10px] text-emerald-700 font-medium italic">"{req.adminRemark}"</p>
                    </div>
                  )}

                  <div className="flex items-center justify-between text-[9px] font-bold">
                    <span className="text-gray-400">{new Date(req.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}</span>
                    <span className={`uppercase ${req.priority === 'HIGH' || req.priority === 'CRITICAL' ? 'text-red-500' : 'text-gray-400'
                      }`}>Priority: {req.priority}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ══════ Create Request Modal ══════ */}
      {showRequestModal && (
        <div className="fixed inset-0 z-50 flex items-end md:items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="bg-white w-full max-w-md rounded-3xl p-6 shadow-2xl animate-in slide-in-from-bottom duration-300">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg font-black text-gray-900 uppercase">
                {requestForm.type === 'REPLACEMENT' ? 'Request Replacement' :
                  requestForm.type === 'NEW_ASSET' ? 'Request New Asset' : 'New Requirement'}
              </h3>
              <button onClick={() => setShowRequestModal(false)} className="p-2 hover:bg-gray-100 rounded-full text-gray-400 transition-colors"><X size={20} /></button>
            </div>

            <form onSubmit={handleCreateRequest} className="space-y-4">
              {requestForm.type === 'NEW_ASSET' && (
                <div className="space-y-1">
                  <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Select Asset Type</label>
                  <select
                    value={requestForm.assetId}
                    onChange={e => setRequestForm({ ...requestForm, assetId: e.target.value })}
                    required
                    className="w-full bg-gray-50 border border-gray-100 rounded-xl px-4 py-3 text-sm font-bold focus:ring-2 focus:ring-emerald-500/20 truncate"
                  >
                    <option value="">Select an Item</option>
                    {/* Only show assets currently present in user's account */}
                    {assets.reduce((acc, curr) => {
                      const asset = curr.assetUnit?.asset;
                      if (asset && !acc.find(a => a.id === asset.id)) {
                        acc.push(asset);
                      }
                      return acc;
                    }, []).map(item => (
                      <option key={item.id} value={item.id} className="truncate">{item.name} {item.model ? `(${item.model})` : ''}</option>
                    ))}
                  </select>
                </div>
              )}

              {requestForm.type === 'REPLACEMENT' && (
                <div className="bg-blue-50 p-4 rounded-xl border border-blue-100 flex items-center gap-3">
                  <div className="w-10 h-10 bg-white rounded-lg flex items-center justify-center text-blue-500 shadow-sm">
                    <RefreshCcw size={20} />
                  </div>
                  <div>
                    <span className="text-[10px] font-black text-blue-400 uppercase">Replacing</span>
                    <h4 className="text-xs font-black text-blue-700">{assets.find(a => a.assetUnit?.asset?.id === requestForm.assetId)?.assetUnit?.asset?.name}</h4>
                  </div>
                </div>
              )}

              <div className="space-y-1">
                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Priority</label>
                <div className="grid grid-cols-3 gap-2">
                  {['LOW', 'MEDIUM', 'HIGH'].map(p => (
                    <button
                      key={p}
                      type="button"
                      onClick={() => setRequestForm({ ...requestForm, priority: p })}
                      className={`py-2 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all border ${requestForm.priority === p ? 'bg-emerald-600 text-white border-emerald-600' : 'bg-white text-gray-400 border-gray-200'
                        }`}
                    >
                      {p}
                    </button>
                  ))}
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Description / Reason</label>
                <textarea
                  value={requestForm.description}
                  onChange={e => setRequestForm({ ...requestForm, description: e.target.value })}
                  rows="4"
                  placeholder={requestForm.type === 'NEW_REQUIREMENT' ? "Describe what you need..." : "Why do you need this?"}
                  className="w-full bg-gray-50 border border-gray-100 rounded-2xl px-4 py-3 text-sm focus:ring-2 focus:ring-emerald-500/20 resize-none font-medium"
                />
              </div>

              <button type="submit" disabled={isSubmitting}
                className="w-full bg-emerald-600 text-white font-black py-4 rounded-2xl shadow-xl shadow-emerald-600/20 hover:bg-emerald-700 transition-all flex items-center justify-center gap-2 disabled:opacity-50 mt-4 uppercase tracking-widest text-xs"
              >
                {isSubmitting ? <><Loader2 size={18} className="animate-spin" /> Submitting...</> : '🚀 Submit Request'}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* ══════ Report Issue Modal (Keep original if preferred, or unify) ══════ */}
      {showIssueModal && selectedAsset && (
        <div className="fixed inset-0 z-50 flex items-end md:items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="bg-white w-full max-w-md rounded-3xl p-6 shadow-2xl animate-in slide-in-from-bottom duration-300">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-black text-gray-900 uppercase tracking-tight">Report Issue</h3>
              <button onClick={() => { setShowIssueModal(false); setSelectedAsset(null); }} className="p-2 hover:bg-gray-100 rounded-full text-gray-400"><X size={18} /></button>
            </div>

            <div className="bg-gray-50 p-4 rounded-2xl mb-4 flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-white border border-gray-100 flex items-center justify-center shadow-sm">
                <Package size={20} className="text-emerald-500" />
              </div>
              <div>
                <span className="text-xs font-black text-gray-800 uppercase tracking-tight">{selectedAsset.assetUnit?.asset?.name}</span>
                {selectedAsset.assetUnit?.serialNumber && <span className="text-[10px] font-mono text-gray-400 block">{selectedAsset.assetUnit.serialNumber}</span>}
              </div>
            </div>

            <form onSubmit={handleReportIssue} className="space-y-4">
              <div className="space-y-1">
                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Issue Type</label>
                <select value={issueForm.issueType} onChange={e => setIssueForm({ ...issueForm, issueType: e.target.value })}
                  className="w-full bg-gray-50 border border-gray-100 rounded-xl px-4 py-3 text-sm font-bold appearance-none focus:ring-2 focus:ring-red-500/20 truncate">
                  <option value="NOT_WORKING" className="truncate">Not Working</option>
                  <option value="DAMAGED" className="truncate">Damaged</option>
                  <option value="OTHER" className="truncate">Other</option>
                </select>
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Description</label>
                <textarea value={issueForm.description} onChange={e => setIssueForm({ ...issueForm, description: e.target.value })} rows="3" placeholder="Describe what happened..."
                  className="w-full bg-gray-50 border border-gray-100 rounded-2xl px-4 py-3 text-sm focus:ring-2 focus:ring-red-500/20 resize-none font-medium" />
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Photos (optional)</label>
                <label className="flex items-center justify-center gap-2 py-6 bg-gray-50 border-2 border-dashed border-gray-200 rounded-2xl cursor-pointer hover:bg-gray-100 transition-colors">
                  <Camera size={24} className="text-gray-400" />
                  <span className="text-xs font-black text-gray-500 uppercase tracking-wider">Add Photos</span>
                  <input type="file" accept="image/*" multiple className="hidden"
                    onChange={e => setIssuePhotos([...issuePhotos, ...Array.from(e.target.files)])} />
                </label>
                {issuePhotos.length > 0 && (
                  <div className="flex gap-2 mt-2 overflow-x-auto pb-1">
                    {issuePhotos.map((f, i) => (
                      <div key={i} className="relative shrink-0">
                        <img src={URL.createObjectURL(f)} alt="" className="w-16 h-16 rounded-xl object-cover border border-gray-200" />
                        <button type="button" onClick={() => setIssuePhotos(issuePhotos.filter((_, j) => j !== i))}
                          className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white rounded-full flex items-center justify-center text-[10px] border-2 border-white">✕</button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <button type="submit" disabled={isSubmitting}
                className="w-full bg-red-500 text-white font-black py-4 rounded-2xl shadow-xl shadow-red-500/20 hover:bg-red-600 transition-all flex items-center justify-center gap-2 disabled:opacity-50 mt-2 uppercase tracking-widest text-xs"
              >
                {isSubmitting ? <><Loader2 size={18} className="animate-spin" /> Submitting...</> : <><AlertTriangle size={18} /> Submit Report</>}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
