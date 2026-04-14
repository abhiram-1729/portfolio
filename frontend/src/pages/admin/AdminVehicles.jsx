import React, { useState, useEffect } from 'react';
import { Plus, Truck, User, ArrowRight, CheckCircle2, XCircle, X, Loader2, Pencil, Trash2, FileText, Search, Store, ArrowLeft, ChevronLeft, ChevronRight } from 'lucide-react';
import adminAPI from '../../services/adminService';
import toast from 'react-hot-toast';
import { useSearchParams, useLocation } from 'react-router-dom';
import { useUserStore } from '../../store/userStore';

export default function AdminVehicles() {
  const [searchParams, setSearchParams] = useSearchParams();
  const storeFilterId = searchParams.get('storeId');
  const location = useLocation();
  const isTenantRoute = location.pathname.startsWith('/tenant');
  const currentUser = useUserStore(s => s.user);

  const [vehicles, setVehicles] = useState([]);
  const [users, setUsers] = useState([]);
  const [stores, setStores] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showAssignModal, setShowAssignModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [selectedVehicle, setSelectedVehicle] = useState(null);
  const [editingVehicle, setEditingVehicle] = useState(null);
  const [editDocuments, setEditDocuments] = useState({ rcDocument: null, insuranceDocument: null, permitDocument: null });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [deletingId, setDeletingId] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const ITEMS_PER_PAGE = 10;

  const [newVehicle, setNewVehicle] = useState({ 
    vehicleNumber: '', 
    vehicleName: '', 
    assignedUserId: '', 
    status: true,
    storeId: storeFilterId || currentUser?.storeId || ''
  });
  const [documents, setDocuments] = useState({ rcDocument: null, insuranceDocument: null, permitDocument: null });

  const fetchData = async () => {
    try {
      const [vRes, uRes, sRes] = await Promise.all([adminAPI.getVehicles(), adminAPI.getUsers(), isTenantRoute ? adminAPI.getStores() : null]);
      setVehicles(vRes.data);
      if (isTenantRoute && sRes) {
        setStores(sRes.data?.success ? sRes.data.data : (sRes.data || []));
      }
      // Filter out Consumers AND Admins - only show agents/staff for vehicles
      setUsers(uRes.data.filter(u => u.role !== 'CONSUMER' && u.role !== 'ADMIN'));
    } catch {
      toast.error('Failed to fetch vehicle data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchData(); }, []);

  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, storeFilterId]);

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
      if (newVehicle.storeId) fd.append('storeId', newVehicle.storeId);
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
      if (editingVehicle.storeId) fd.append('storeId', editingVehicle.storeId);
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

  // ── Toggle Status ───────────────────────────────────────────────
  const handleToggleStatus = async (vehicle) => {
    try {
      const fd = new FormData();
      fd.append('status', !vehicle.status);
      await adminAPI.updateVehicle(vehicle.id, fd);
      toast.success(`Vehicle marked ${!vehicle.status ? 'Active' : 'Inactive'}`);
      fetchData();
    } catch (error) {
      toast.error('Failed to update vehicle status');
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

  const filteredVehicles = vehicles.filter((v) => {
    if (storeFilterId && v.storeId !== storeFilterId) return false;
    const searchLower = searchTerm.toLowerCase();
    const assignedUser = users.find(u => u.assignedVehicleId === v.id);
    return (
      v.vehicleNumber?.toLowerCase().includes(searchLower) ||
      v.vehicleName?.toLowerCase().includes(searchLower) ||
      assignedUser?.name?.toLowerCase().includes(searchLower)
    );
  });

  const totalPages = Math.ceil(filteredVehicles.length / ITEMS_PER_PAGE);
  const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
  const paginatedVehicles = filteredVehicles.slice(startIndex, startIndex + ITEMS_PER_PAGE);

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

  const renderGroup = (groupVehicles) => (
    <>
      <div className="grid grid-cols-1 gap-4 md:hidden mb-6">
        {groupVehicles.map((vehicle) => (
          <div key={vehicle.id} className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm flex flex-col gap-4">
            <div className="flex justify-between items-start">
              <div className="flex items-center gap-4">
                <div className={cn('w-12 h-12 rounded-xl flex items-center justify-center',
                  vehicle.status ? 'bg-emerald-50 text-emerald-600' : 'bg-gray-100 text-gray-400')}>
                  <Truck size={24} />
                </div>
                <div className="flex flex-col">
                  <h3 className="font-bold text-gray-900">{vehicle.vehicleNumber}</h3>
                  {vehicle.displayId && <span className="text-[9px] font-black text-teal-600 bg-teal-50 px-1.5 py-0.5 rounded w-fit tracking-wider">{vehicle.displayId}</span>}
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

              <div className="flex items-center gap-1">
                <button onClick={() => handleToggleStatus(vehicle)} title={vehicle.status ? "Mark Inactive" : "Mark Active"}
                  className={`p-2 rounded-xl transition-all ${vehicle.status ? 'text-orange-400 hover:text-orange-600 hover:bg-orange-50' : 'text-emerald-400 hover:text-emerald-600 hover:bg-emerald-50'}`}>
                  {vehicle.status ? <XCircle size={16} /> : <CheckCircle2 size={16} />}
                </button>
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

            {(vehicle.rcDocument || vehicle.insuranceDocument || vehicle.permitDocument) && (
              <div className="flex gap-2">
                {vehicle.rcDocument && <a href={vehicle.rcDocument} target="_blank" rel="noreferrer" className="text-[10px] bg-emerald-100 text-emerald-700 px-2 py-1 rounded-md font-bold">RC</a>}
                {vehicle.insuranceDocument && <a href={vehicle.insuranceDocument} target="_blank" rel="noreferrer" className="text-[10px] bg-emerald-100 text-emerald-700 px-2 py-1 rounded-md font-bold">Insurance</a>}
                {vehicle.permitDocument && <a href={vehicle.permitDocument} target="_blank" rel="noreferrer" className="text-[10px] bg-emerald-100 text-emerald-700 px-2 py-1 rounded-md font-bold">Permit</a>}
              </div>
            )}

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
        ))}
      </div>

      <div className="hidden md:block bg-white rounded-3xl border border-gray-100 shadow-sm overflow-hidden mb-6">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-gray-50/50">
              <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-gray-400">Vehicle Info</th>
              <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-gray-400 text-center">Status</th>
              <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-gray-400">Driver Assignment</th>
              <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-gray-400">Compliance</th>
              <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-gray-400 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {groupVehicles.map((vehicle) => (
              <tr key={vehicle.id} className="hover:bg-gray-50/30 transition-colors group">
                <td className="px-6 py-4">
                  <div className="flex items-center gap-3">
                    <div className={cn('w-10 h-10 rounded-xl flex items-center justify-center shrink-0',
                      vehicle.status ? 'bg-emerald-50 text-emerald-600' : 'bg-gray-100 text-gray-400')}>
                      <Truck size={20} />
                    </div>
                    <div className="flex flex-col">
                      <span className="font-bold text-gray-900 tracking-tight">{vehicle.vehicleNumber}</span>
                      {vehicle.displayId && <span className="text-[9px] font-black text-teal-600 bg-teal-50 px-1.5 py-0.5 rounded w-fit tracking-wider mt-0.5">{vehicle.displayId}</span>}
                      {vehicle.vehicleName && <span className="text-[10px] font-bold text-gray-400 uppercase tracking-tighter">{vehicle.vehicleName}</span>}
                    </div>
                  </div>
                </td>
                <td className="px-6 py-4">
                  <div className="flex justify-center">
                    {vehicle.status ? (
                      <span className="inline-flex items-center gap-1 text-[10px] font-black text-emerald-600 bg-emerald-50 px-2 py-1 rounded-full uppercase tracking-widest">
                        <CheckCircle2 size={10} /> Active
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 text-[10px] font-black text-gray-400 bg-gray-50 px-2 py-1 rounded-full uppercase tracking-widest">
                        <XCircle size={10} /> Inactive
                      </span>
                    )}
                  </div>
                </td>
                <td className="px-6 py-4">
                  <div className="flex items-center justify-between gap-4 bg-gray-50/50 p-2 rounded-xl border border-transparent hover:border-gray-100 transition-all group/driver">
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 rounded-full bg-white flex items-center justify-center text-emerald-500 shadow-sm border border-gray-50">
                        <User size={14} />
                      </div>
                      <span className="text-sm font-bold text-gray-700">{vehicle.assignedUsers?.[0]?.name || 'Unassigned'}</span>
                    </div>
                  <button onClick={() => { setSelectedVehicle(vehicle); setShowAssignModal(true); }}
                      className="text-emerald-600 hover:bg-emerald-100 p-1.5 rounded-full transition-colors">
                      <ArrowRight size={16} />
                    </button>
                  </div>
                </td>
                <td className="px-6 py-4">
                  <div className="flex gap-1.5">
                    {vehicle.rcDocument ? (
                      <a href={vehicle.rcDocument} target="_blank" rel="noreferrer" title="RC Document"
                        className="w-8 h-8 flex items-center justify-center text-[10px] font-black bg-emerald-600/10 text-emerald-700 rounded-lg hover:bg-emerald-600 hover:text-white transition-all">RC</a>
                    ) : <div className="w-8 h-8 border border-dashed border-gray-200 rounded-lg" />}
                    {vehicle.insuranceDocument ? (
                      <a href={vehicle.insuranceDocument} target="_blank" rel="noreferrer" title="Insurance"
                        className="w-8 h-8 flex items-center justify-center text-[10px] font-black bg-blue-600/10 text-blue-700 rounded-lg hover:bg-blue-600 hover:text-white transition-all">IN</a>
                    ) : <div className="w-8 h-8 border border-dashed border-gray-200 rounded-lg" />}
                    {vehicle.permitDocument ? (
                      <a href={vehicle.permitDocument} target="_blank" rel="noreferrer" title="Permit"
                        className="w-8 h-8 flex items-center justify-center text-[10px] font-black bg-orange-600/10 text-orange-700 rounded-lg hover:bg-orange-600 hover:text-white transition-all">PM</a>
                    ) : <div className="w-8 h-8 border border-dashed border-gray-200 rounded-lg" />}
                  </div>
                </td>
                <td className="px-6 py-4">
                  <div className="flex items-center justify-end gap-1 transition-all">
                    <button onClick={() => handleToggleStatus(vehicle)} title={vehicle.status ? "Mark Inactive" : "Mark Active"}
                      className={`p-2 rounded-xl transition-all ${vehicle.status ? 'text-orange-400 hover:text-orange-600 hover:bg-orange-50' : 'text-emerald-400 hover:text-emerald-600 hover:bg-emerald-50'}`}>
                      {vehicle.status ? <XCircle size={16} /> : <CheckCircle2 size={16} />}
                    </button>
                    <button onClick={() => openEditModal(vehicle)} title="Edit Details"
                      className="p-2 text-indigo-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-xl transition-all">
                      <Pencil size={16} />
                    </button>
                    <button onClick={() => handleDeleteVehicle(vehicle)} title="Delete"
                      disabled={deletingId === vehicle.id}
                      className="p-2 text-rose-400 hover:text-rose-600 hover:bg-rose-50 rounded-xl transition-all disabled:opacity-50">
                      {deletingId === vehicle.id ? <Loader2 size={16} className="animate-spin" /> : <Trash2 size={16} />}
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );

  const renderClassifiedVehicles = () => {
    if (isTenantRoute && !storeFilterId) {
      return (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 pt-4 animate-in fade-in slide-in-from-bottom-6">
          <div className="col-span-full mb-2">
            <h3 className="text-xl font-black tracking-tight text-gray-900">Platform Branches</h3>
            <p className="text-[10px] font-bold text-gray-400 tracking-widest uppercase mt-1">Select a branch to manage its transport assets</p>
          </div>
          {stores.map(store => {
            const groupVehicles = filteredVehicles.filter(v => v.storeId === store.id);
            return (
              <button
                key={store.id}
                onClick={() => setSearchParams({ storeId: store.id })}
                className="text-left bg-white p-6 rounded-[2rem] border border-gray-100 shadow-sm hover:shadow-xl hover:border-emerald-200 hover:-translate-y-1 transition-all duration-300 group relative overflow-hidden"
              >
                <div className="absolute -right-4 -top-4 w-24 h-24 bg-emerald-50 rounded-full blur-2xl group-hover:bg-emerald-100 transition-all opacity-50" />
                
                <div className="relative z-10 w-14 h-14 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center mb-6 group-hover:bg-emerald-600 group-hover:text-white transition-colors">
                  <Store size={28} strokeWidth={2.5} />
                </div>
                <h4 className="relative z-10 text-lg font-black text-gray-900 tracking-tight leading-none mb-2">{store.name}</h4>
                <p className="relative z-10 text-[10px] font-bold text-gray-400 uppercase tracking-widest">{store.code || 'Branch'}</p>
                
                <div className="relative z-10 mt-8 flex items-center justify-between text-[10px] font-black uppercase text-emerald-600 tracking-widest bg-emerald-50/50 p-3 rounded-xl group-hover:bg-emerald-50 transition-colors">
                  <span>{groupVehicles.length} Vehicles</span>
                  <span className="group-hover:translate-x-1 transition-transform flex items-center justify-center w-5 h-5 bg-emerald-200 rounded-full text-emerald-700">→</span>
                </div>
              </button>
            );
          })}
          {stores.length === 0 && (
            <div className="col-span-full py-12 text-center bg-white rounded-[2rem] border border-dashed border-gray-200">
               <Store size={48} className="mx-auto text-gray-300 mb-4" />
               <p className="text-sm font-bold text-gray-400 uppercase tracking-widest">No Active Branches Found</p>
            </div>
          )}
        </div>
      );
    }
    
    return (
      <div className="flex flex-col gap-6">
        {renderGroup(paginatedVehicles)}
        
        {totalPages > 1 && (
          <div className="flex items-center justify-between bg-white px-6 py-4 rounded-3xl border border-gray-100 shadow-sm animate-in fade-in slide-in-from-bottom-2">
            <div className="flex items-center gap-2">
              <p className="text-[10px] font-black uppercase text-gray-400 tracking-widest">
                Showing {startIndex + 1}-{Math.min(startIndex + ITEMS_PER_PAGE, filteredVehicles.length)} of {filteredVehicles.length}
              </p>
            </div>
            
            <div className="flex items-center gap-1.5">
              <button
                onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                disabled={currentPage === 1}
                className="p-2 rounded-xl border border-gray-100 text-gray-400 hover:text-emerald-600 hover:border-emerald-100 hover:bg-emerald-50 disabled:opacity-30 disabled:hover:bg-transparent disabled:hover:border-gray-100 disabled:hover:text-gray-400 transition-all"
              >
                <ChevronLeft size={16} />
              </button>
              
              <div className="flex items-center gap-1">
                {[...Array(totalPages)].map((_, i) => {
                  const pageNum = i + 1;
                  if (
                    pageNum === 1 ||
                    pageNum === totalPages ||
                    (pageNum >= currentPage - 1 && pageNum <= currentPage + 1)
                  ) {
                    return (
                      <button
                        key={pageNum}
                        onClick={() => setCurrentPage(pageNum)}
                        className={`w-9 h-9 rounded-xl text-[10px] font-black transition-all ${
                          currentPage === pageNum
                            ? 'bg-emerald-600 text-white shadow-lg shadow-emerald-200'
                            : 'text-gray-400 hover:text-gray-600 hover:bg-gray-50'
                        }`}
                      >
                        {pageNum}
                      </button>
                    );
                  } else if (
                    pageNum === currentPage - 2 ||
                    pageNum === currentPage + 2
                  ) {
                    return <span key={pageNum} className="text-gray-300 px-1">...</span>;
                  }
                  return null;
                })}
              </div>

              <button
                onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                disabled={currentPage === totalPages}
                className="p-2 rounded-xl border border-gray-100 text-gray-400 hover:text-emerald-600 hover:border-emerald-100 hover:bg-emerald-50 disabled:opacity-30 disabled:hover:bg-transparent disabled:hover:border-gray-100 disabled:hover:text-gray-400 transition-all"
              >
                <ChevronRight size={16} />
              </button>
            </div>
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500 pb-20">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div className="flex flex-col gap-1">
          <div className="flex items-center gap-3">
             {isTenantRoute && storeFilterId && (
               <button 
                 onClick={() => setSearchParams({})}
                 className="p-2 bg-white border border-gray-100 rounded-xl text-gray-400 hover:text-emerald-600 hover:border-emerald-100 transition-all shadow-sm"
                 title="Back to All Branches"
               >
                 <ArrowLeft size={18} />
               </button>
             )}
             <h2 className="text-2xl font-black text-gray-900 tracking-tight">Fleet Management</h2>
          </div>
          <div className="flex items-center gap-2">
            <p className="text-sm font-medium text-gray-500">Monitor and assign your transport assets</p>
            {isTenantRoute && (
              <>
                <span className="text-gray-300">•</span>
                <select
                  value={storeFilterId || ''}
                  onChange={(e) => {
                    if (e.target.value) {
                      setSearchParams({ storeId: e.target.value });
                    } else {
                      setSearchParams({});
                    }
                  }}
                  className="bg-emerald-50 text-emerald-700 text-[10px] font-black uppercase tracking-widest pl-2 pr-6 py-1 rounded-md border-none outline-none appearance-none focus:ring-1 focus:ring-emerald-500 cursor-pointer mt-0.5"
                  style={{
                    backgroundImage: `url("data:image/svg+xml,%3csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 20 20'%3e%3cpath stroke='%23047857' stroke-linecap='round' stroke-linejoin='round' stroke-width='2' d='M5.25 7.5L10 12.25L14.75 7.5'/%3e%3c/svg%3e")`,
                    backgroundPosition: 'right 0.25rem center',
                    backgroundRepeat: 'no-repeat',
                    backgroundSize: '1rem'
                  }}
                >
                  <option value="">All Branches</option>
                  {stores.map(s => (
                    <option key={s.id} value={s.id}>{s.name}</option>
                  ))}
                </select>
              </>
            )}
          </div>
        </div>
        <div className="flex items-center gap-3">
          <div className="relative group hidden sm:block">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 focus-within:text-emerald-500 transition-colors" size={16} />
            <input 
              type="text"
              placeholder="Search by number or driver..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 pr-4 py-2 bg-white border border-gray-100 rounded-xl text-sm focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none transition-all w-64 shadow-sm font-medium"
            />
          </div>
          <button onClick={() => { 
            setNewVehicle({ 
              vehicleNumber: '', 
              vehicleName: '', 
              assignedUserId: '', 
              status: true,
              storeId: storeFilterId || currentUser?.storeId || '' 
            });
            setDocuments({ rcDocument: null, insuranceDocument: null, permitDocument: null });
            setShowAddModal(true); 
          }}
            className="bg-emerald-600 text-white p-3 rounded-xl shadow-lg hover:bg-emerald-700 transition-all active:scale-95">
            <Plus size={24} />
          </button>
        </div>
      </div>

      {/* Mobile Search - Only visible on small screens */}
      <div className="sm:hidden relative group px-1">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
        <input 
          type="text"
          placeholder="Search fleet..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full pl-11 pr-4 py-3 bg-white border border-gray-100 rounded-2xl text-sm focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none transition-all shadow-sm font-medium"
        />
      </div>

      {/* Vehicle Data Representation */}
      <div className="space-y-4">
        {filteredVehicles.length === 0 ? (
          <div className="text-center py-12 bg-white rounded-2xl border border-dashed border-gray-200">
            <Truck size={48} className="mx-auto text-gray-300 mb-2" />
            <p className="text-gray-500">No vehicles found</p>
          </div>
        ) : (
          renderClassifiedVehicles()
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
                  {users.filter(u => !u.assignedVehicleId).map(u => (
                    <option key={u.id} value={u.id}>{u.name} ({u.role})</option>
                  ))}
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
                  {users.filter(u => !u.assignedVehicleId || u.assignedVehicleId === editingVehicle.id).map(u => (
                    <option key={u.id} value={u.id}>{u.name} ({u.role})</option>
                  ))}
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
              {users.filter(u => !u.assignedVehicleId).map(user => (
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
