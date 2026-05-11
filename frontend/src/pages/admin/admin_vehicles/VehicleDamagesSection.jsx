import React, { useState, useEffect } from 'react';
import { AlertTriangle, Search, Loader2, Plus, Pencil, Trash2, X, CheckCircle2, Truck, User, Camera, Wrench } from 'lucide-react';
import adminAPI from '../../../services/adminService';
import toast from 'react-hot-toast';

const DAMAGE_TYPES = ['DENT', 'SCRATCH', 'TIRE', 'ACCIDENT', 'MECHANICAL', 'ELECTRICAL', 'GLASS', 'BODY', 'OTHER'];
const SEVERITIES = ['MINOR', 'MODERATE', 'MAJOR', 'CRITICAL'];
const STATUSES = ['REPORTED', 'UNDER_REVIEW', 'REPAIR_SCHEDULED', 'IN_REPAIR', 'REPAIRED', 'CLOSED'];
const LOCATIONS = ['Front Left', 'Front Right', 'Front Center', 'Rear Left', 'Rear Right', 'Rear Center', 'Left Side', 'Right Side', 'Roof', 'Undercarriage', 'Engine', 'Interior', 'Windshield', 'Other'];

const severityColor = (s) => {
  const m = { MINOR: 'bg-blue-50 text-blue-600 border-blue-100', MODERATE: 'bg-amber-50 text-amber-600 border-amber-100', MAJOR: 'bg-orange-50 text-orange-600 border-orange-100', CRITICAL: 'bg-rose-50 text-rose-600 border-rose-100' };
  return m[s] || m.MINOR;
};
const statusColor = (s) => {
  const m = { REPORTED: 'bg-amber-50 text-amber-600 border-amber-100', UNDER_REVIEW: 'bg-blue-50 text-blue-600 border-blue-100', REPAIR_SCHEDULED: 'bg-indigo-50 text-indigo-600 border-indigo-100', IN_REPAIR: 'bg-purple-50 text-purple-600 border-purple-100', REPAIRED: 'bg-emerald-50 text-emerald-600 border-emerald-100', CLOSED: 'bg-gray-100 text-gray-500 border-gray-200' };
  return m[s] || m.REPORTED;
};

const initForm = { vehicleId: '', damageType: 'DENT', severity: 'MINOR', title: '', description: '', location: '', estimatedCost: '', odometerReading: '' };

const FieldWrapper = ({ label, children }) => (<div><label className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] mb-2 block">{label}</label>{children}</div>);
const inp = (cls = '') => `w-full bg-gray-50 border border-gray-100 rounded-xl py-3 px-4 text-sm font-bold focus:ring-2 outline-none ${cls}`;

export default function VehicleDamagesSection({ storeId }) {
  const [damages, setDamages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [vehicles, setVehicles] = useState([]);
  const [showCreate, setShowCreate] = useState(false);
  const [showEdit, setShowEdit] = useState(false);
  const [showDelete, setShowDelete] = useState(false);
  const [editing, setEditing] = useState(null);
  const [deleting, setDeleting] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [form, setForm] = useState(initForm);
  const [editForm, setEditForm] = useState({});

  useEffect(() => { fetchAll(); }, [storeId]);

  const fetchAll = async () => {
    try {
      setLoading(true);
      const [dRes, vRes] = await Promise.all([
        adminAPI.getVehicleDamages({ storeId }),
        adminAPI.getVehicles({ storeId })
      ]);
      setDamages(dRes.data || []);
      setVehicles(vRes.data || []);
    } catch { toast.error('Failed to load data'); }
    finally { setLoading(false); }
  };

  const handleCreate = async (e) => {
    e.preventDefault();
    if (!form.vehicleId || !form.title || !form.damageType) return toast.error('Vehicle, title, and type are required');
    setIsSubmitting(true);
    try {
      const fd = new FormData();
      Object.entries(form).forEach(([k, v]) => { if (v) fd.append(k, v); });
      if (storeId) fd.append('storeId', storeId);
      await adminAPI.createVehicleDamage(fd);
      toast.success('Vehicle damage reported');
      setShowCreate(false); setForm(initForm); fetchAll();
    } catch (err) { toast.error(err.response?.data?.message || 'Failed'); }
    finally { setIsSubmitting(false); }
  };

  const handleEdit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      const fd = new FormData();
      Object.entries(editForm).forEach(([k, v]) => { if (v !== undefined && v !== null) fd.append(k, v); });
      await adminAPI.updateVehicleDamage(editing.id, fd);
      toast.success('Damage updated'); setShowEdit(false); setEditing(null); fetchAll();
    } catch { toast.error('Failed to update'); }
    finally { setIsSubmitting(false); }
  };

  const handleDelete = async () => {
    setIsSubmitting(true);
    try {
      await adminAPI.deleteVehicleDamage(deleting.id);
      toast.success('Damage deleted'); setShowDelete(false); setDeleting(null); fetchAll();
    } catch { toast.error('Failed to delete'); }
    finally { setIsSubmitting(false); }
  };

  const openEdit = (d) => {
    setEditing(d);
    setEditForm({ damageType: d.damageType, severity: d.severity, title: d.title, description: d.description || '', location: d.location || '', estimatedCost: d.estimatedCost || '', actualCost: d.actualCost || '', status: d.status, repairNotes: d.repairNotes || '' });
    setShowEdit(true);
  };

  const q = searchTerm.toLowerCase();
  const filtered = damages.filter(d => d.title?.toLowerCase().includes(q) || d.vehicle?.vehicleNumber?.toLowerCase().includes(q) || d.damageType?.toLowerCase().includes(q));

  if (loading) return <div className="flex flex-col items-center justify-center py-20 gap-4"><Loader2 className="animate-spin text-emerald-600" size={40} /><p className="text-gray-500 font-bold text-sm uppercase tracking-widest">Loading...</p></div>;

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h3 className="text-xl font-black text-gray-900 tracking-tight">Vehicle Damage Reports</h3>
          <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mt-1">Track Physical Vehicle Damages & Repairs</p>
        </div>
        <div className="flex items-center gap-3 w-full md:w-auto">
          <div className="relative group flex-1 md:w-72 md:flex-initial">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
            <input type="text" placeholder="Search damages..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} className="w-full pl-12 pr-4 py-3 bg-white border border-gray-100 rounded-2xl text-sm font-medium focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none shadow-sm" />
          </div>
          <button onClick={() => { setForm(initForm); setShowCreate(true); }} className="px-5 py-3 bg-emerald-600 text-white rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-emerald-700 transition-all shadow-lg shadow-emerald-500/20 flex items-center gap-2 active:scale-95 shrink-0">
            <Plus size={16} /> Report Damage
          </button>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-[2.5rem] border border-gray-100 shadow-sm overflow-hidden">
        {filtered.length === 0 ? (
          <div className="py-20 text-center flex flex-col items-center"><Wrench size={48} className="text-gray-200 mb-4" /><p className="text-sm font-black text-gray-400 uppercase tracking-widest">No vehicle damages reported</p></div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead><tr className="bg-gray-50/50">
                <th className="px-6 py-5 text-[10px] font-black uppercase tracking-widest text-gray-400">Damage</th>
                <th className="px-4 py-5 text-[10px] font-black uppercase tracking-widest text-gray-400 text-center">Vehicle</th>
                <th className="px-4 py-5 text-[10px] font-black uppercase tracking-widest text-gray-400 text-center">Type</th>
                <th className="px-4 py-5 text-[10px] font-black uppercase tracking-widest text-gray-400 text-center">Severity</th>
                <th className="px-4 py-5 text-[10px] font-black uppercase tracking-widest text-gray-400 text-center">Est. Cost</th>
                <th className="px-4 py-5 text-[10px] font-black uppercase tracking-widest text-gray-400 text-center">Status</th>
                <th className="px-6 py-5 text-[10px] font-black uppercase tracking-widest text-gray-400 text-right">Actions</th>
              </tr></thead>
              <tbody className="divide-y divide-gray-50">
                {filtered.map(d => (
                  <tr key={d.id} className="hover:bg-gray-50/30 transition-all group">
                    <td className="px-6 py-5">
                      <div className="flex flex-col">
                        <span className="text-sm font-black text-gray-800 leading-tight">{d.title}</span>
                        <span className="text-[10px] font-bold text-gray-400">{d.location || 'No location'} • {new Date(d.createdAt).toLocaleDateString()}</span>
                      </div>
                    </td>
                    <td className="px-4 py-5 text-center">
                      <div className="flex items-center justify-center gap-1.5 text-xs font-black text-gray-900 uppercase"><Truck size={12} className="text-gray-300" />{d.vehicle?.vehicleNumber}</div>
                    </td>
                    <td className="px-4 py-5 text-center"><span className="px-2.5 py-1 bg-gray-100 text-gray-600 rounded-lg text-[9px] font-black uppercase tracking-widest">{d.damageType}</span></td>
                    <td className="px-4 py-5 text-center"><span className={`px-3 py-1 rounded-xl text-[10px] font-black uppercase tracking-widest border ${severityColor(d.severity)}`}>{d.severity}</span></td>
                    <td className="px-4 py-5 text-center"><span className="text-sm font-black text-gray-700">₹{(d.estimatedCost || 0).toLocaleString()}</span></td>
                    <td className="px-4 py-5 text-center"><span className={`px-3 py-1 rounded-xl text-[10px] font-black uppercase tracking-widest border ${statusColor(d.status)}`}>{d.status.replace('_', ' ')}</span></td>
                    <td className="px-6 py-5">
                      <div className="flex items-center justify-end gap-2">
                        <button onClick={() => openEdit(d)} className="p-2 bg-gray-50 text-gray-400 rounded-xl hover:bg-blue-50 hover:text-blue-600 transition-all border border-gray-100" title="Edit"><Pencil size={14} /></button>
                        <button onClick={() => { setDeleting(d); setShowDelete(true); }} className="p-2 bg-gray-50 text-gray-400 rounded-xl hover:bg-rose-50 hover:text-rose-600 transition-all border border-gray-100" title="Delete"><Trash2 size={14} /></button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* CREATE MODAL */}
      {showCreate && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="bg-white w-full max-w-lg rounded-[2.5rem] shadow-2xl animate-in zoom-in-95 duration-300 overflow-hidden max-h-[90vh] flex flex-col">
            <div className="p-8 bg-rose-600 text-white shrink-0">
              <h3 className="text-2xl font-black tracking-tight">Report Vehicle Damage</h3>
              <p className="text-rose-100 text-xs font-bold uppercase tracking-widest mt-1">Log physical damage to a vehicle</p>
            </div>
            <form onSubmit={handleCreate} className="p-8 space-y-5 overflow-y-auto">
              <FieldWrapper label="Vehicle *"><select required value={form.vehicleId} onChange={e => setForm({...form, vehicleId: e.target.value})} className={inp('focus:ring-rose-500/20')}><option value="">Select Vehicle...</option>{vehicles.map(v => <option key={v.id} value={v.id}>{v.vehicleNumber} ({v.vehicleName})</option>)}</select></FieldWrapper>
              <FieldWrapper label="Damage Title *"><input required value={form.title} onChange={e => setForm({...form, title: e.target.value})} className={inp('focus:ring-rose-500/20')} placeholder="e.g. Front bumper dent" /></FieldWrapper>
              <div className="grid grid-cols-2 gap-4">
                <FieldWrapper label="Damage Type"><select value={form.damageType} onChange={e => setForm({...form, damageType: e.target.value})} className={inp('focus:ring-rose-500/20')}>{DAMAGE_TYPES.map(t => <option key={t}>{t}</option>)}</select></FieldWrapper>
                <FieldWrapper label="Severity"><select value={form.severity} onChange={e => setForm({...form, severity: e.target.value})} className={inp('focus:ring-rose-500/20')}>{SEVERITIES.map(s => <option key={s}>{s}</option>)}</select></FieldWrapper>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <FieldWrapper label="Location on Vehicle"><select value={form.location} onChange={e => setForm({...form, location: e.target.value})} className={inp('focus:ring-rose-500/20')}><option value="">Select...</option>{LOCATIONS.map(l => <option key={l}>{l}</option>)}</select></FieldWrapper>
                <FieldWrapper label="Estimated Repair Cost"><input type="number" value={form.estimatedCost} onChange={e => setForm({...form, estimatedCost: e.target.value})} className={inp('focus:ring-rose-500/20')} placeholder="₹0" /></FieldWrapper>
              </div>
              <FieldWrapper label="Description"><textarea rows={3} value={form.description} onChange={e => setForm({...form, description: e.target.value})} className={inp('focus:ring-rose-500/20 resize-none')} placeholder="Describe the damage..." /></FieldWrapper>
              <div className="flex gap-4 pt-4">
                <button type="button" onClick={() => setShowCreate(false)} className="flex-1 py-4 text-gray-500 font-black uppercase tracking-widest text-[10px] border border-gray-100 rounded-xl hover:bg-gray-50">Cancel</button>
                <button type="submit" disabled={isSubmitting} className="flex-[2] py-4 bg-rose-600 text-white font-black uppercase tracking-widest text-[10px] rounded-xl shadow-lg shadow-rose-500/20 hover:bg-rose-700 flex items-center justify-center gap-2">
                  {isSubmitting ? <Loader2 className="animate-spin" size={16} /> : <><AlertTriangle size={16} /> Report Damage</>}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* EDIT MODAL */}
      {showEdit && editing && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="bg-white w-full max-w-lg rounded-[2.5rem] shadow-2xl animate-in zoom-in-95 duration-300 overflow-hidden max-h-[90vh] flex flex-col">
            <div className="p-8 bg-blue-600 text-white shrink-0">
              <h3 className="text-2xl font-black tracking-tight">Edit Damage Entry</h3>
              <p className="text-blue-100 text-xs font-bold uppercase tracking-widest mt-1">{editing.title} — {editing.vehicle?.vehicleNumber}</p>
            </div>
            <form onSubmit={handleEdit} className="p-8 space-y-5 overflow-y-auto">
              <FieldWrapper label="Title"><input value={editForm.title} onChange={e => setEditForm({...editForm, title: e.target.value})} className={inp('focus:ring-blue-500/20')} /></FieldWrapper>
              <div className="grid grid-cols-3 gap-4">
                <FieldWrapper label="Type"><select value={editForm.damageType} onChange={e => setEditForm({...editForm, damageType: e.target.value})} className={inp('focus:ring-blue-500/20')}>{DAMAGE_TYPES.map(t => <option key={t}>{t}</option>)}</select></FieldWrapper>
                <FieldWrapper label="Severity"><select value={editForm.severity} onChange={e => setEditForm({...editForm, severity: e.target.value})} className={inp('focus:ring-blue-500/20')}>{SEVERITIES.map(s => <option key={s}>{s}</option>)}</select></FieldWrapper>
                <FieldWrapper label="Status"><select value={editForm.status} onChange={e => setEditForm({...editForm, status: e.target.value})} className={inp('focus:ring-blue-500/20')}>{STATUSES.map(s => <option key={s} value={s}>{s.replace('_', ' ')}</option>)}</select></FieldWrapper>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <FieldWrapper label="Est. Cost (₹)"><input type="number" value={editForm.estimatedCost} onChange={e => setEditForm({...editForm, estimatedCost: e.target.value})} className={inp('focus:ring-blue-500/20')} /></FieldWrapper>
                <FieldWrapper label="Actual Cost (₹)"><input type="number" value={editForm.actualCost} onChange={e => setEditForm({...editForm, actualCost: e.target.value})} className={inp('focus:ring-blue-500/20')} placeholder="After repair" /></FieldWrapper>
              </div>
              <FieldWrapper label="Location"><select value={editForm.location} onChange={e => setEditForm({...editForm, location: e.target.value})} className={inp('focus:ring-blue-500/20')}><option value="">Select...</option>{LOCATIONS.map(l => <option key={l}>{l}</option>)}</select></FieldWrapper>
              <FieldWrapper label="Repair Notes"><textarea rows={2} value={editForm.repairNotes} onChange={e => setEditForm({...editForm, repairNotes: e.target.value})} className={inp('focus:ring-blue-500/20 resize-none')} placeholder="Workshop notes, parts replaced..." /></FieldWrapper>
              <div className="flex gap-4 pt-4">
                <button type="button" onClick={() => { setShowEdit(false); setEditing(null); }} className="flex-1 py-4 text-gray-500 font-black uppercase tracking-widest text-[10px] border border-gray-100 rounded-xl hover:bg-gray-50">Cancel</button>
                <button type="submit" disabled={isSubmitting} className="flex-[2] py-4 bg-blue-600 text-white font-black uppercase tracking-widest text-[10px] rounded-xl shadow-lg shadow-blue-500/20 hover:bg-blue-700 flex items-center justify-center gap-2">
                  {isSubmitting ? <Loader2 className="animate-spin" size={16} /> : <><CheckCircle2 size={16} /> Save Changes</>}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* DELETE MODAL */}
      {showDelete && deleting && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="bg-white w-full max-w-sm rounded-[2.5rem] shadow-2xl animate-in zoom-in-95 duration-300 p-8 text-center">
            <div className="w-16 h-16 bg-rose-50 rounded-full flex items-center justify-center mx-auto mb-6"><Trash2 size={28} className="text-rose-600" /></div>
            <h3 className="text-xl font-black text-gray-900 tracking-tight mb-2">Delete Damage Entry?</h3>
            <p className="text-sm text-gray-500 mb-1"><strong>{deleting.title}</strong></p>
            <p className="text-xs text-gray-400 mb-8">{deleting.vehicle?.vehicleNumber} • {deleting.damageType} • This cannot be undone.</p>
            <div className="flex gap-4">
              <button onClick={() => { setShowDelete(false); setDeleting(null); }} className="flex-1 py-4 text-gray-500 font-black uppercase tracking-widest text-[10px] border border-gray-100 rounded-xl hover:bg-gray-50">Cancel</button>
              <button onClick={handleDelete} disabled={isSubmitting} className="flex-1 py-4 bg-rose-600 text-white font-black uppercase tracking-widest text-[10px] rounded-xl shadow-lg shadow-rose-500/20 hover:bg-rose-700 flex items-center justify-center gap-2">
                {isSubmitting ? <Loader2 className="animate-spin" size={16} /> : 'Delete'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
