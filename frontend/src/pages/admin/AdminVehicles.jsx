import React, { useState, useEffect } from 'react';
import { Plus, Truck, User, ArrowRight, CheckCircle2, XCircle, X, Loader2, Pencil, Trash2, FileText } from 'lucide-react';
import adminAPI from '../../services/adminService';
import toast from 'react-hot-toast';

export default function AdminVehicles() {
  const [vehicles, setVehicles] = useState([]);
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showAssignModal, setShowAssignModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [selectedVehicle, setSelectedVehicle] = useState(null);
  const [editingVehicle, setEditingVehicle] = useState(null);
  const [editDocuments, setEditDocuments] = useState({ rcDocument: null, insuranceDocument: null, permitDocument: null });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [deletingId, setDeletingId] = useState(null);

  const [newVehicle, setNewVehicle] = useState({ vehicleNumber: '', vehicleName: '', assignedUserId: '', status: true });
  const [documents, setDocuments] = useState({ rcDocument: null, insuranceDocument: null, permitDocument: null });

  const fetchData = async () => {
    try {
      const [vRes, uRes] = await Promise.all([adminAPI.getVehicles(), adminAPI.getUsers()]);
      setVehicles(vRes.data);
      setUsers(uRes.data.filter(u => u.role !== 'CONSUMER'));
    } catch {
      toast.error('Failed to fetch vehicle data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchData(); }, []);

  // ── Create ──────────────────────────────────────────────
  const handleCreateVehicle = async (e) => {
    e.preventDefault();
    if (isSubmitting) return;
    setIsSubmitting(true);
    try {
      const fd = new FormData();
      fd.append('vehicleNumber', newVehicle.vehicleNumber);
      if (newVehicle.vehicleName) fd.append('vehicleName', newVehicle.vehicleName);
      if (newVehicle.assignedUserId) fd.append('assignedUserId', newVehicle.assignedUserId);
      fd.append('status', newVehicle.status);
      if (documents.rcDocument) fd.append('rcDocument', documents.rcDocument);
      if (documents.insuranceDocument) fd.append('insuranceDocument', documents.insuranceDocument);
      if (documents.permitDocument) fd.append('permitDocument', documents.permitDocument);

      await adminAPI.createVehicle(fd);
      toast.success('Vehicle added successfully');
      setShowAddModal(false);
      setNewVehicle({ vehicleNumber: '', vehicleName: '', assignedUserId: '', status: true });
      setDocuments({ rcDocument: null, insuranceDocument: null, permitDocument: null });
      fetchData();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to add vehicle');
    } finally {
      setIsSubmitting(false);
    }
  };

  // ── Edit ─────────────────────────────────────────────────
  const openEditModal = (vehicle) => {
    // Find the currently assigned user id for this vehicle
    const currentUserId = users.find(u => u.assignedVehicleId === vehicle.id)?.id || '';
    setEditingVehicle({ ...vehicle, assignedUserId: currentUserId });
    setEditDocuments({ rcDocument: null, insuranceDocument: null, permitDocument: null });
    setShowEditModal(true);
  };

  const handleUpdateVehicle = async (e) => {
    e.preventDefault();
    if (isSubmitting) return;
    setIsSubmitting(true);
    try {
      const fd = new FormData();
      fd.append('vehicleNumber', editingVehicle.vehicleNumber);
      fd.append('vehicleName', editingVehicle.vehicleName || '');
      fd.append('status', editingVehicle.status);
      fd.append('assignedUserId', editingVehicle.assignedUserId || '');
      if (editDocuments.rcDocument) fd.append('rcDocument', editDocuments.rcDocument);
      if (editDocuments.insuranceDocument) fd.append('insuranceDocument', editDocuments.insuranceDocument);
      if (editDocuments.permitDocument) fd.append('permitDocument', editDocuments.permitDocument);

      await adminAPI.updateVehicle(editingVehicle.id, fd);
      toast.success('Vehicle updated successfully');
      setShowEditModal(false);
      setEditingVehicle(null);
      fetchData();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to update vehicle');
    } finally {
      setIsSubmitting(false);
    }
  };

  // ── Delete ───────────────────────────────────────────────
  const handleDeleteVehicle = async (vehicle) => {
    if (!window.confirm(`Delete vehicle "${vehicle.vehicleNumber}"?\n\nThis will remove all stock records for this vehicle. Order history will be preserved.`)) return;
    setDeletingId(vehicle.id);
    try {
      await adminAPI.deleteVehicle(vehicle.id);
      toast.success('Vehicle deleted');
      fetchData();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to delete vehicle');
    } finally {
      setDeletingId(null);
    }
  };

  // ── Assign driver ─────────────────────────────────────────
  const handleAssignDriver = async (userId) => {
    setIsSubmitting(true);
    try {
      await adminAPI.assignDriver(selectedVehicle.id, userId);
      toast.success('Driver assigned successfully');
      setShowAssignModal(false);
      setSelectedVehicle(null);
      fetchData();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to assign driver');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
        <Loader2 className="animate-spin text-emerald-600" size={40} />
        <p className="text-gray-500 font-medium tracking-wide">Loading Vehicles...</p>
      </div>
    );
  }

  // ── Document upload field helper ──────────────────────────
  const DocUpload = ({ label, fieldKey, existing, files, setFiles }) => (
    <div className="space-y-1">
      <label className="text-xs font-bold text-gray-400 uppercase tracking-wider">{label}</label>
      <div className="flex items-center gap-3">
        {existing && !files[fieldKey] && (
          <a href={existing} target="_blank" rel="noreferrer"
            className="flex items-center gap-1 text-[10px] bg-emerald-100 text-emerald-700 px-2 py-1 rounded-md font-bold shrink-0">
            <FileText size={10} /> Current
          </a>
        )}
        <input
          type="file" accept=".jpg,.jpeg,.png,.pdf"
          className="w-full text-xs text-gray-500 file:mr-3 file:py-1.5 file:px-3 file:rounded-full file:border-0 file:text-xs file:font-semibold file:bg-emerald-50 file:text-emerald-700 hover:file:bg-emerald-100 cursor-pointer"
          onChange={(e) => setFiles(prev => ({ ...prev, [fieldKey]: e.target.files[0] }))}
        />
      </div>
      {files[fieldKey] && <p className="text-[10px] text-emerald-600 font-bold">✓ {files[fieldKey].name}</p>}
    </div>
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex flex-col gap-1">
          <h2 className="text-2xl font-bold text-gray-900">Vehicle Management</h2>
          <p className="text-sm text-gray-500">Manage your fleet and driver assignments</p>
        </div>
        <button onClick={() => setShowAddModal(true)}
          className="bg-emerald-600 text-white p-3 rounded-xl shadow-lg hover:bg-emerald-700 transition-colors">
          <Plus size={24} />
        </button>
      </div>

      {/* Vehicle Cards */}
      <div className="grid grid-cols-1 gap-4">
        {vehicles.length === 0 ? (
          <div className="text-center py-12 bg-white rounded-2xl border border-dashed border-gray-200">
            <Truck size={48} className="mx-auto text-gray-300 mb-2" />
            <p className="text-gray-500">No vehicles found</p>
          </div>
        ) : (
          vehicles.map((vehicle) => (
            <div key={vehicle.id} className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm flex flex-col gap-4">
              <div className="flex justify-between items-start">
                <div className="flex items-center gap-4">
                  <div className={cn('w-12 h-12 rounded-xl flex items-center justify-center',
                    vehicle.status ? 'bg-emerald-50 text-emerald-600' : 'bg-gray-100 text-gray-400')}>
                    <Truck size={24} />
                  </div>
                  <div className="flex flex-col">
                    <h3 className="font-bold text-gray-900">{vehicle.vehicleNumber}</h3>
                    {vehicle.vehicleName && <span className="text-xs text-gray-500">{vehicle.vehicleName}</span>}
                    <div className="flex items-center gap-2 mt-1">
                      {vehicle.status ? (
                        <span className="flex items-center gap-1 text-[10px] font-bold text-emerald-600 uppercase">
                          <CheckCircle2 size={12} /> Active
                        </span>
                      ) : (
                        <span className="flex items-center gap-1 text-[10px] font-bold text-gray-400 uppercase">
                          <XCircle size={12} /> Inactive
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                {/* Action buttons */}
                <div className="flex items-center gap-1">
                  <button onClick={() => openEditModal(vehicle)} title="Edit Vehicle"
                    className="p-2 text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-xl transition-all">
                    <Pencil size={16} />
                  </button>
                  <button onClick={() => handleDeleteVehicle(vehicle)} title="Delete Vehicle"
                    disabled={deletingId === vehicle.id}
                    className="p-2 text-gray-400 hover:text-rose-600 hover:bg-rose-50 rounded-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed">
                    {deletingId === vehicle.id
                      ? <Loader2 size={16} className="animate-spin text-rose-400" />
                      : <Trash2 size={16} />}
                  </button>
                </div>
              </div>

              {/* Documents */}
              {(vehicle.rcDocument || vehicle.insuranceDocument || vehicle.permitDocument) && (
                <div className="flex gap-2">
                  {vehicle.rcDocument && <a href={vehicle.rcDocument} target="_blank" rel="noreferrer" className="text-[10px] bg-emerald-100 text-emerald-700 px-2 py-1 rounded-md font-bold">RC</a>}
                  {vehicle.insuranceDocument && <a href={vehicle.insuranceDocument} target="_blank" rel="noreferrer" className="text-[10px] bg-emerald-100 text-emerald-700 px-2 py-1 rounded-md font-bold">Insurance</a>}
                  {vehicle.permitDocument && <a href={vehicle.permitDocument} target="_blank" rel="noreferrer" className="text-[10px] bg-emerald-100 text-emerald-700 px-2 py-1 rounded-md font-bold">Permit</a>}
                </div>
              )}

              {/* Assigned Driver */}
              <div className="bg-gray-50 rounded-xl p-4 flex items-center justify-between border border-gray-100">
                <div className="flex flex-col gap-1">
                  <span className="text-[10px] uppercase tracking-wider font-semibold text-gray-400">Assigned Driver</span>
                  <div className="flex items-center gap-2">
                    <User size={14} className="text-emerald-500" />
                    <span className="text-sm font-bold text-gray-800">{vehicle.assignedUsers?.[0]?.name || 'Not Assigned'}</span>
                  </div>
                </div>
                <button onClick={() => { setSelectedVehicle(vehicle); setShowAssignModal(true); }}
                  className="text-emerald-600 hover:bg-emerald-50 p-2 rounded-full transition-colors">
                  <ArrowRight size={20} />
                </button>
              </div>
            </div>
          ))
        )}
      </div>

      {/* ── Add Vehicle Modal ───────────────────────────────── */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-end md:items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="bg-white w-full max-w-md rounded-3xl p-6 shadow-2xl animate-in slide-in-from-bottom duration-300 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-xl font-bold text-gray-900">Add New Vehicle</h3>
              <button onClick={() => setShowAddModal(false)} className="p-2 hover:bg-gray-100 rounded-full text-gray-400"><X size={20} /></button>
            </div>

            <form onSubmit={handleCreateVehicle} className="space-y-4">
              <div className="space-y-1">
                <label className="text-xs font-bold text-gray-400 uppercase tracking-wider">Vehicle Number <span className="text-red-500">*</span></label>
                <input type="text" required placeholder="e.g. KA 01 AB 1234"
                  className="w-full bg-gray-50 border border-gray-100 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-emerald-500/20 outline-none"
                  value={newVehicle.vehicleNumber} onChange={(e) => setNewVehicle({ ...newVehicle, vehicleNumber: e.target.value })} />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-gray-400 uppercase tracking-wider">Vehicle Name</label>
                <input type="text" placeholder="e.g. Tata Ace Gold"
                  className="w-full bg-gray-50 border border-gray-100 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-emerald-500/20 outline-none"
                  value={newVehicle.vehicleName} onChange={(e) => setNewVehicle({ ...newVehicle, vehicleName: e.target.value })} />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-gray-400 uppercase tracking-wider">Assign To</label>
                <select className="w-full bg-gray-50 border border-gray-100 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-emerald-500/20 outline-none"
                  value={newVehicle.assignedUserId} onChange={(e) => setNewVehicle({ ...newVehicle, assignedUserId: e.target.value })}>
                  <option value="">-- Unassigned --</option>
                  {users.map(u => <option key={u.id} value={u.id}>{u.name} ({u.role})</option>)}
                </select>
              </div>

              <div className="space-y-3 pt-1 border-t border-gray-50">
                <p className="text-xs font-bold text-gray-400 uppercase tracking-wider pt-1">Documents</p>
                <DocUpload label="RC Document" fieldKey="rcDocument" existing={null} files={documents} setFiles={setDocuments} />
                <DocUpload label="Insurance Document" fieldKey="insuranceDocument" existing={null} files={documents} setFiles={setDocuments} />
                <DocUpload label="Permit Document" fieldKey="permitDocument" existing={null} files={documents} setFiles={setDocuments} />
              </div>

              <div className="flex items-center justify-between p-4 bg-gray-50 rounded-xl">
                <span className="text-sm font-medium text-gray-700">Status Active</span>
                <button type="button" onClick={() => setNewVehicle({ ...newVehicle, status: !newVehicle.status })}
                  className={cn('w-12 h-6 rounded-full relative transition-colors', newVehicle.status ? 'bg-emerald-500' : 'bg-gray-300')}>
                  <div className={cn('absolute top-1 w-4 h-4 rounded-full bg-white transition-all', newVehicle.status ? 'right-1' : 'left-1')} />
                </button>
              </div>

              <button type="submit" disabled={isSubmitting}
                className={cn('w-full text-white font-bold py-4 rounded-xl shadow-lg mt-2 transition-all text-sm uppercase tracking-wider flex items-center justify-center gap-2',
                  isSubmitting ? 'bg-emerald-400 cursor-not-allowed' : 'bg-emerald-600 shadow-emerald-600/20 hover:bg-emerald-700')}>
                {isSubmitting ? <><Loader2 className="animate-spin" size={18} />Adding...</> : 'Add Vehicle'}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* ── Edit Vehicle Modal ──────────────────────────────── */}
      {showEditModal && editingVehicle && (
        <div className="fixed inset-0 z-50 flex items-end md:items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="bg-white w-full max-w-md rounded-3xl p-6 shadow-2xl animate-in slide-in-from-bottom duration-300 max-h-[90vh] overflow-y-auto border border-indigo-50">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h3 className="text-xl font-bold text-gray-900">Edit Vehicle</h3>
                <p className="text-[10px] uppercase font-bold text-gray-400 tracking-wider">Update Details & Documents</p>
              </div>
              <button onClick={() => { setShowEditModal(false); setEditingVehicle(null); }}
                className="p-2 hover:bg-gray-100 rounded-full text-gray-400"><X size={20} /></button>
            </div>

            <form onSubmit={handleUpdateVehicle} className="space-y-4">
              <div className="space-y-1">
                <label className="text-xs font-bold text-gray-400 uppercase tracking-wider">Vehicle Number <span className="text-red-500">*</span></label>
                <input type="text" required
                  className="w-full bg-gray-50 border border-gray-100 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-indigo-500/20 outline-none"
                  value={editingVehicle.vehicleNumber}
                  onChange={(e) => setEditingVehicle({ ...editingVehicle, vehicleNumber: e.target.value })} />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-gray-400 uppercase tracking-wider">Vehicle Name</label>
                <input type="text" placeholder="e.g. Tata Ace Gold"
                  className="w-full bg-gray-50 border border-gray-100 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-indigo-500/20 outline-none"
                  value={editingVehicle.vehicleName || ''}
                  onChange={(e) => setEditingVehicle({ ...editingVehicle, vehicleName: e.target.value })} />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-gray-400 uppercase tracking-wider">Assigned Driver</label>
                <select className="w-full bg-gray-50 border border-gray-100 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-indigo-500/20 outline-none"
                  value={editingVehicle.assignedUserId || ''}
                  onChange={(e) => setEditingVehicle({ ...editingVehicle, assignedUserId: e.target.value })}>
                  <option value="">-- Unassigned --</option>
                  {users.map(u => <option key={u.id} value={u.id}>{u.name} ({u.role})</option>)}
                </select>
              </div>

              <div className="space-y-3 pt-1 border-t border-gray-50">
                <p className="text-xs font-bold text-gray-400 uppercase tracking-wider pt-1">Documents (upload to replace)</p>
                <DocUpload label="RC Document" fieldKey="rcDocument" existing={editingVehicle.rcDocument} files={editDocuments} setFiles={setEditDocuments} />
                <DocUpload label="Insurance Document" fieldKey="insuranceDocument" existing={editingVehicle.insuranceDocument} files={editDocuments} setFiles={setEditDocuments} />
                <DocUpload label="Permit Document" fieldKey="permitDocument" existing={editingVehicle.permitDocument} files={editDocuments} setFiles={setEditDocuments} />
              </div>

              <div className="flex items-center justify-between p-4 bg-gray-50 rounded-xl">
                <span className="text-sm font-medium text-gray-700">Status Active</span>
                <button type="button" onClick={() => setEditingVehicle({ ...editingVehicle, status: !editingVehicle.status })}
                  className={cn('w-12 h-6 rounded-full relative transition-colors', editingVehicle.status ? 'bg-emerald-500' : 'bg-gray-300')}>
                  <div className={cn('absolute top-1 w-4 h-4 rounded-full bg-white transition-all', editingVehicle.status ? 'right-1' : 'left-1')} />
                </button>
              </div>

              <button type="submit" disabled={isSubmitting}
                className="w-full bg-indigo-600 text-white font-bold py-4 rounded-xl shadow-lg shadow-indigo-600/20 hover:bg-indigo-700 transition-all text-sm uppercase tracking-wider flex items-center justify-center gap-2 disabled:opacity-70">
                {isSubmitting ? <><Loader2 className="animate-spin" size={18} />Saving...</> : 'Save Changes'}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* ── Assign Driver Modal ─────────────────────────────── */}
      {showAssignModal && (
        <div className="fixed inset-0 z-50 flex items-end md:items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="bg-white w-full max-w-md rounded-3xl p-6 shadow-2xl animate-in slide-in-from-bottom duration-300 max-h-[80vh] flex flex-col">
            <div className="flex items-center justify-between mb-6 shrink-0">
              <div>
                <h3 className="text-xl font-bold text-gray-900">Assign Driver</h3>
                <p className="text-xs text-gray-400 font-medium tracking-wide">Vehicle: {selectedVehicle?.vehicleNumber}</p>
              </div>
              <button onClick={() => setShowAssignModal(false)} className="p-2 hover:bg-gray-100 rounded-full text-gray-400"><X size={20} /></button>
            </div>

            <div className="flex-1 overflow-y-auto space-y-2 pr-1">
              {users.map(user => (
                <button key={user.id} disabled={isSubmitting} onClick={() => handleAssignDriver(user.id)}
                  className="w-full flex items-center justify-between p-4 hover:bg-emerald-50 rounded-2xl border border-transparent hover:border-emerald-100 transition-all group disabled:opacity-50">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center text-gray-500 group-hover:bg-emerald-100 group-hover:text-emerald-600 transition-colors">
                      {isSubmitting ? <Loader2 size={18} className="animate-spin" /> : <User size={20} />}
                    </div>
                    <div className="flex flex-col items-start">
                      <span className="font-bold text-gray-900 text-sm">{user.name}</span>
                      <span className="text-[10px] text-gray-400 font-bold uppercase tracking-wider">{user.role}</span>
                    </div>
                  </div>
                  {!isSubmitting && <ArrowRight size={18} className="text-gray-300 group-hover:text-emerald-500 transition-colors" />}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function cn(...inputs) {
  return inputs.filter(Boolean).join(' ');
}
