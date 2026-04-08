import React, { useState, useEffect } from 'react';
import { Package, Monitor, Box, AlertTriangle, Loader2, X, Camera, CheckCircle2, ChevronRight } from 'lucide-react';
import { assetAPI } from '../services/api';
import toast from 'react-hot-toast';

export default function AgentAssets() {
  const [assets, setAssets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showIssueModal, setShowIssueModal] = useState(false);
  const [selectedAsset, setSelectedAsset] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [expandedId, setExpandedId] = useState(null);

  // Issue form
  const [issueForm, setIssueForm] = useState({ issueType: 'NOT_WORKING', description: '' });
  const [issuePhotos, setIssuePhotos] = useState([]);

  useEffect(() => {
    fetchMyAssets();
  }, []);

  const fetchMyAssets = async () => {
    try {
      const { data } = await assetAPI.getMyAssets();
      setAssets(data);
    } catch (err) {
      toast.error('Failed to load your assets');
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
      fetchMyAssets();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to report issue');
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
    <div className="px-4 py-6 space-y-6 max-w-lg mx-auto">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="w-12 h-12 bg-emerald-100 rounded-2xl flex items-center justify-center">
          <Package size={24} className="text-emerald-600" />
        </div>
        <div>
          <h2 className="text-xl font-black text-gray-900">My Assets</h2>
          <p className="text-xs text-gray-400 font-bold uppercase tracking-wider">{assets.length} assigned items</p>
        </div>
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
          {assets.map((assignment, idx) => {
            const asset = assignment.assetUnit?.asset;
            const unit = assignment.assetUnit;
            const isExpanded = expandedId === assignment.id;

            return (
              <div key={assignment.id} className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden transition-all">
                {/* Card Header */}
                <button
                  onClick={() => setExpandedId(isExpanded ? null : assignment.id)}
                  className="w-full p-4 flex items-center gap-3 text-left"
                >
                  <div className={`w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 ${
                    asset?.assetType === 'ELECTRONIC' ? 'bg-blue-50' : 'bg-amber-50'
                  }`}>
                    {asset?.image ? (
                      <img src={asset.image} alt={asset.name} className="w-full h-full rounded-2xl object-cover" />
                    ) : (
                      asset?.assetType === 'ELECTRONIC' ? <Monitor size={22} className="text-blue-500" /> : <Box size={22} className="text-amber-500" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="text-sm font-black text-gray-900 truncate">{asset?.name || 'Unknown'}</h3>
                    <div className="flex items-center gap-2 mt-0.5">
                      {asset?.model && <span className="text-[10px] font-bold text-gray-400">{asset.model}</span>}
                      {unit?.serialNumber && <span className="text-[10px] font-mono text-emerald-600 bg-emerald-50 px-1.5 py-0.5 rounded">{unit.serialNumber}</span>}
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <span className={`text-[9px] font-black px-2 py-1 rounded-lg uppercase ${
                      assignment.assignCondition === 'NEW' ? 'bg-emerald-100 text-emerald-600' :
                      assignment.assignCondition === 'GOOD' ? 'bg-blue-100 text-blue-600' :
                      'bg-amber-100 text-amber-600'
                    }`}>{assignment.assignCondition}</span>
                    <ChevronRight size={16} className={`text-gray-300 transition-transform duration-200 ${isExpanded ? 'rotate-90' : ''}`} />
                  </div>
                </button>

                {/* Expanded Details */}
                {isExpanded && (
                  <div className="px-4 pb-4 space-y-3 animate-in fade-in duration-200">
                    <div className="bg-gray-50 p-3 rounded-xl space-y-2">
                      {asset?.brand && (
                        <div className="flex items-center justify-between">
                          <span className="text-[10px] font-black text-gray-400 uppercase">Brand</span>
                          <span className="text-xs font-bold text-gray-700">{asset.brand}</span>
                        </div>
                      )}
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] font-black text-gray-400 uppercase">Assigned Date</span>
                        <span className="text-xs font-bold text-gray-700">{new Date(assignment.assignedDate).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] font-black text-gray-400 uppercase">Type</span>
                        <span className={`text-[9px] font-black px-2 py-1 rounded uppercase ${
                          asset?.assetType === 'ELECTRONIC' ? 'bg-blue-100 text-blue-600' : 'bg-amber-100 text-amber-600'
                        }`}>{asset?.assetType === 'ELECTRONIC' ? 'Electronic' : 'Non-Electronic'}</span>
                      </div>
                      {asset?.description && (
                        <div>
                          <span className="text-[10px] font-black text-gray-400 uppercase block mb-1">Description</span>
                          <p className="text-xs text-gray-600">{asset.description}</p>
                        </div>
                      )}
                    </div>

                    {/* Report Issue Button */}
                    <button
                      onClick={() => { setSelectedAsset(assignment); setShowIssueModal(true); }}
                      className="w-full flex items-center justify-center gap-2 py-3 bg-red-50 text-red-500 font-black text-xs uppercase tracking-wider rounded-xl border border-red-100 hover:bg-red-100 transition-colors"
                    >
                      <AlertTriangle size={16} /> Report Issue
                    </button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* ══════ Report Issue Modal ══════ */}
      {showIssueModal && selectedAsset && (
        <div className="fixed inset-0 z-50 flex items-end md:items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="bg-white w-full max-w-md rounded-3xl p-6 shadow-2xl animate-in slide-in-from-bottom duration-300">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold text-gray-900">Report Issue</h3>
              <button onClick={() => { setShowIssueModal(false); setSelectedAsset(null); }} className="p-1 hover:bg-gray-100 rounded-full text-gray-400"><X size={18} /></button>
            </div>

            <div className="bg-gray-50 p-3 rounded-xl mb-4 flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-white border border-gray-100 flex items-center justify-center">
                <Package size={18} className="text-emerald-500" />
              </div>
              <div>
                <span className="text-sm font-bold text-gray-800">{selectedAsset.assetUnit?.asset?.name}</span>
                {selectedAsset.assetUnit?.serialNumber && <span className="text-[10px] font-mono text-gray-400 block">{selectedAsset.assetUnit.serialNumber}</span>}
              </div>
            </div>

            <form onSubmit={handleReportIssue} className="space-y-4">
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Issue Type</label>
                <select value={issueForm.issueType} onChange={e => setIssueForm({ ...issueForm, issueType: e.target.value })}
                  className="w-full bg-gray-50 border border-gray-100 rounded-xl px-4 py-3 text-sm font-bold appearance-none focus:ring-2 focus:ring-red-500/20">
                  <option value="NOT_WORKING">Not Working</option>
                  <option value="DAMAGED">Damaged</option>
                  <option value="OTHER">Other</option>
                </select>
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Description</label>
                <textarea value={issueForm.description} onChange={e => setIssueForm({ ...issueForm, description: e.target.value })} rows="3" placeholder="Describe what happened..."
                  className="w-full bg-gray-50 border border-gray-100 rounded-xl px-3 py-2.5 text-sm focus:ring-2 focus:ring-red-500/20 resize-none" />
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Photos (optional)</label>
                <label className="flex items-center justify-center gap-2 py-4 bg-gray-50 border-2 border-dashed border-gray-200 rounded-xl cursor-pointer hover:bg-gray-100 transition-colors">
                  <Camera size={20} className="text-gray-400" />
                  <span className="text-sm font-bold text-gray-500">Tap to add photos</span>
                  <input type="file" accept="image/*" multiple className="hidden"
                    onChange={e => setIssuePhotos([...issuePhotos, ...Array.from(e.target.files)])} />
                </label>
                {issuePhotos.length > 0 && (
                  <div className="flex gap-2 mt-2 overflow-x-auto pb-1">
                    {issuePhotos.map((f, i) => (
                      <div key={i} className="relative shrink-0">
                        <img src={URL.createObjectURL(f)} alt="" className="w-16 h-16 rounded-lg object-cover border border-gray-100" />
                        <button type="button" onClick={() => setIssuePhotos(issuePhotos.filter((_, j) => j !== i))}
                          className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white rounded-full flex items-center justify-center text-[10px]">✕</button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <button type="submit" disabled={isSubmitting}
                className="w-full bg-red-500 text-white font-bold py-3 rounded-xl shadow-lg shadow-red-500/20 hover:bg-red-600 transition-all flex items-center justify-center gap-2 disabled:opacity-50">
                {isSubmitting ? <><Loader2 size={18} className="animate-spin" /> Submitting...</> : <><AlertTriangle size={18} /> Submit Report</>}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
