import React, { useState, useEffect } from 'react';
import { Plus, Truck, User, ArrowRight, CheckCircle2, XCircle, X, Loader2 } from 'lucide-react';
import adminAPI from '../../services/adminService';
import toast from 'react-hot-toast';

export default function AdminVehicles() {
  const [vehicles, setVehicles] = useState([]);
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showAssignModal, setShowAssignModal] = useState(false);
  const [selectedVehicle, setSelectedVehicle] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const [newVehicle, setNewVehicle] = useState({
    vehicleNumber: '',
    vehicleName: '',
    assignedUserId: '',
    status: true,
  });
  const [documents, setDocuments] = useState({
    rcDocument: null,
    insuranceDocument: null,
    permitDocument: null
  });

  const fetchData = async () => {
    try {
      const [vRes, uRes] = await Promise.all([
        adminAPI.getVehicles(),
        adminAPI.getUsers()
      ]);
      setVehicles(vRes.data);
      // Only sales agents, supervisors or helpers can be assigned to vehicles
      setUsers(uRes.data.filter(u => u.role !== 'CONSUMER'));
    } catch (error) {
      toast.error('Failed to fetch vehicle data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleCreateVehicle = async (e) => {
    e.preventDefault();
    if (isSubmitting) return;

    setIsSubmitting(true);
    try {
      const formData = new FormData();
      formData.append('vehicleNumber', newVehicle.vehicleNumber);
      if (newVehicle.vehicleName) formData.append('vehicleName', newVehicle.vehicleName);
      if (newVehicle.assignedUserId) formData.append('assignedUserId', newVehicle.assignedUserId);
      formData.append('status', newVehicle.status);

      if (documents.rcDocument) formData.append('rcDocument', documents.rcDocument);
      if (documents.insuranceDocument) formData.append('insuranceDocument', documents.insuranceDocument);
      if (documents.permitDocument) formData.append('permitDocument', documents.permitDocument);

      await adminAPI.createVehicle(formData);
      toast.success('Vehicle added successfully');
      setShowAddModal(false);
      setNewVehicle({ vehicleNumber: '', vehicleName: '', assignedUserId: '', status: true });
      setDocuments({ rcDocument: null, insuranceDocument: null, permitDocument: null });
      fetchData();
    } catch (error) {
      console.error('❌ Error creating vehicle:', error.message);
      toast.error(error.response?.data?.message || 'Failed to add vehicle');
    } finally {
      setIsSubmitting(false);
    }
  };

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

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex flex-col gap-1">
          <h2 className="text-2xl font-bold text-gray-900">Vehicle Management</h2>
          <p className="text-sm text-gray-500">Manage your fleet and driver assignments</p>
        </div>
        <button 
          onClick={() => setShowAddModal(true)}
          className="bg-emerald-600 text-white p-3 rounded-xl shadow-lg hover:bg-emerald-700 transition-colors"
        >
          <Plus size={24} />
        </button>
      </div>

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
                  <div className={cn(
                    "w-12 h-12 rounded-xl flex items-center justify-center",
                    vehicle.status ? "bg-emerald-50 text-emerald-600" : "bg-gray-100 text-gray-400"
                  )}>
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
                <button className="bg-gray-50 text-emerald-600 p-2 rounded-lg text-xs font-bold uppercase tracking-wider">
                  Edit
                </button>
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
                    <span className="text-sm font-bold text-gray-800">
                      {vehicle.assignedUsers?.[0]?.name || 'Not Assigned'}
                    </span>
                  </div>
                </div>
                <button 
                  onClick={() => {
                    setSelectedVehicle(vehicle);
                    setShowAssignModal(true);
                  }}
                  className="text-emerald-600 hover:bg-emerald-50 p-2 rounded-full transition-colors"
                >
                  <ArrowRight size={20} />
                </button>
              </div>
              
              <button 
                className="text-emerald-600 text-xs font-bold text-center underline underline-offset-4"
              >
                View Vehicle Sales
              </button>
            </div>
          ))
        )}
      </div>

      {/* Add Vehicle Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-end md:items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="bg-white w-full max-w-md rounded-3xl p-6 shadow-2xl animate-in slide-in-from-bottom duration-300">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-xl font-bold text-gray-900">Add New Vehicle</h3>
              <button 
                onClick={() => setShowAddModal(false)}
                className="p-2 hover:bg-gray-100 rounded-full text-gray-400"
              >
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleCreateVehicle} className="space-y-4">
              <div className="space-y-1">
                <label className="text-xs font-bold text-gray-400 uppercase tracking-wider">Vehicle Number <span className="text-red-500">*</span></label>
                <input 
                  type="text"
                  required
                  placeholder="e.g. KA 01 AB 1234"
                  className="w-full bg-gray-50 border border-gray-100 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-emerald-500/20"
                  value={newVehicle.vehicleNumber}
                  onChange={(e) => setNewVehicle({...newVehicle, vehicleNumber: e.target.value})}
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-gray-400 uppercase tracking-wider">Vehicle Name</label>
                <input 
                  type="text"
                  placeholder="e.g. Tata Ace Gold"
                  className="w-full bg-gray-50 border border-gray-100 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-emerald-500/20"
                  value={newVehicle.vehicleName}
                  onChange={(e) => setNewVehicle({...newVehicle, vehicleName: e.target.value})}
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-gray-400 uppercase tracking-wider">Assign To</label>
                <select 
                  className="w-full bg-gray-50 border border-gray-100 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-emerald-500/20"
                  value={newVehicle.assignedUserId}
                  onChange={(e) => setNewVehicle({...newVehicle, assignedUserId: e.target.value})}
                >
                  <option value="">-- Unassigned --</option>
                  {users.map(u => (
                    <option key={u.id} value={u.id}>{u.name} ({u.role})</option>
                  ))}
                </select>
              </div>

              {/* Document Uploads */}
              <div className="space-y-3 pt-2">
                <div className="space-y-1">
                  <label className="text-xs font-bold text-gray-400 uppercase tracking-wider">RC Document</label>
                  <input 
                    type="file"
                    accept=".jpg,.jpeg,.png,.pdf"
                    className="w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-xs file:font-semibold file:bg-emerald-50 file:text-emerald-700 hover:file:bg-emerald-100 transition-all cursor-pointer"
                    onChange={(e) => setDocuments({...documents, rcDocument: e.target.files[0]})}
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-bold text-gray-400 uppercase tracking-wider">Insurance Document</label>
                  <input 
                    type="file"
                    accept=".jpg,.jpeg,.png,.pdf"
                    className="w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-xs file:font-semibold file:bg-emerald-50 file:text-emerald-700 hover:file:bg-emerald-100 transition-all cursor-pointer"
                    onChange={(e) => setDocuments({...documents, insuranceDocument: e.target.files[0]})}
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-bold text-gray-400 uppercase tracking-wider">Permit Document</label>
                  <input 
                    type="file"
                    accept=".jpg,.jpeg,.png,.pdf"
                    className="w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-xs file:font-semibold file:bg-emerald-50 file:text-emerald-700 hover:file:bg-emerald-100 transition-all cursor-pointer"
                    onChange={(e) => setDocuments({...documents, permitDocument: e.target.files[0]})}
                  />
                </div>
              </div>

              <div className="flex items-center justify-between p-4 bg-gray-50 rounded-xl">
                <span className="text-sm font-medium text-gray-700">Status Active</span>
                <button
                  type="button"
                  onClick={() => setNewVehicle({...newVehicle, status: !newVehicle.status})}
                  className={cn(
                    "w-12 h-6 rounded-full relative transition-colors",
                    newVehicle.status ? "bg-emerald-500" : "bg-gray-300"
                  )}
                >
                  <div className={cn(
                    "absolute top-1 w-4 h-4 rounded-full bg-white transition-all",
                    newVehicle.status ? "right-1" : "left-1"
                  )} />
                </button>
              </div>

              <button 
                type="submit"
                disabled={isSubmitting}
                className={cn(
                  "w-full text-white font-bold py-4 rounded-xl shadow-lg mt-4 transition-all text-sm uppercase tracking-wider flex items-center justify-center gap-2",
                  isSubmitting ? "bg-emerald-400 cursor-not-allowed" : "bg-emerald-600 shadow-emerald-600/20 hover:bg-emerald-700"
                )}
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="animate-spin" size={18} />
                    Adding...
                  </>
                ) : (
                  'Add Vehicle'
                )}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Assign Driver Modal */}
      {showAssignModal && (
        <div className="fixed inset-0 z-50 flex items-end md:items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="bg-white w-full max-w-md rounded-3xl p-6 shadow-2xl animate-in slide-in-from-bottom duration-300 max-h-[80vh] flex flex-col">
            <div className="flex items-center justify-between mb-6 shrink-0">
              <div className="flex flex-col">
                <h3 className="text-xl font-bold text-gray-900">Assign Driver</h3>
                <p className="text-xs text-gray-400 font-medium tracking-wide">Vehicle: {selectedVehicle?.vehicleNumber}</p>
              </div>
              <button 
                onClick={() => setShowAssignModal(false)}
                className="p-2 hover:bg-gray-100 rounded-full text-gray-400"
              >
                <X size={20} />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto space-y-2 pr-1">
              {users.map(user => (
                <button
                  key={user.id}
                  disabled={isSubmitting}
                  onClick={() => handleAssignDriver(user.id)}
                  className="w-full flex items-center justify-between p-4 hover:bg-emerald-50 rounded-2xl border border-transparent hover:border-emerald-100 transition-all group disabled:opacity-50"
                >
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

