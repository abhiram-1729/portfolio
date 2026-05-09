import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useUserStore } from '../store/userStore';
import { authAPI } from '../services/api';
import toast from 'react-hot-toast';
import { ArrowLeft, User, Phone, Mail, Shield, Truck, LogOut, FileText, CheckCircle2, XCircle, Package, KeyRound, Loader2, Download, Plus } from 'lucide-react';

const cn = (...classes) => classes.filter(Boolean).join(' ');

export default function Profile() {
  const { user, clearUser } = useUserStore();
  const navigate = useNavigate();

  const [fullUser, setFullUser] = useState(null);
  const [isFetching, setIsFetching] = useState(true);
  const [passwords, setPasswords] = useState({ oldPassword: '', newPassword: '', confirmPassword: '' });
  const [isUpdating, setIsUpdating] = useState(false);

  const fetchProfile = async () => {
    try {
      const { data } = await authAPI.me();
      setFullUser(data);
    } catch (error) {
      console.error('Failed to fetch profile:', error);
    } finally {
      setIsFetching(false);
    }
  };

  useState(() => {
    fetchProfile();
  }, []);

  const handleUploadDoc = async (type, file) => {
    const formData = new FormData();
    formData.append('document', file);
    formData.append('type', type);
    
    const loadingToast = toast.loading(`Uploading ${type}...`);
    try {
      await authAPI.uploadMyDocument(formData);
      toast.success('Document uploaded successfully!', { id: loadingToast });
      fetchProfile(); // Refresh list
    } catch (error) {
      toast.error('Upload failed', { id: loadingToast });
    }
  };

  const handleUpdatePassword = async (e) => {
    e.preventDefault();
    if (passwords.newPassword !== passwords.confirmPassword) {
      return toast.error("New passwords don't match");
    }
    if (passwords.newPassword.length < 6) {
      return toast.error("New password must be at least 6 characters");
    }

    setIsUpdating(true);
    try {
      await authAPI.updatePassword({
        oldPassword: passwords.oldPassword,
        newPassword: passwords.newPassword
      });
      toast.success("Password updated securely!");
      setPasswords({ oldPassword: '', newPassword: '', confirmPassword: '' });
    } catch (error) {
      toast.error(error.response?.data?.message || "Failed to update password");
    } finally {
      setIsUpdating(false);
    }
  };

  const handleLogout = () => {
    clearUser();
    navigate('/login');
  };

  const ROLE_COLORS = {
    ADMIN: 'from-emerald-500 to-emerald-600 shadow-emerald-500/20',
    SALES_AGENT: 'from-emerald-500 to-emerald-600 shadow-emerald-500/20',
    CONSUMER: 'from-emerald-800 to-emerald-950 shadow-emerald-950/20',
  };

  if (isFetching) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <Loader2 className="animate-spin text-emerald-600" size={32} />
      </div>
    );
  }

  const currentUser = fullUser || user;

  return (
    <div className="min-h-screen bg-slate-50 animate-fade-in pb-32">
      <div className="max-w-lg mx-auto px-5 pt-6 space-y-6">
        {/* Avatar & Name */}
        <div className="glass rounded-[2.5rem] p-8 flex flex-col items-center gap-5 text-center bg-white/70 border border-white shadow-sm relative overflow-hidden">
          <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-500/5 blur-3xl rounded-full translate-x-12 -translate-y-12" />

          <div className={`w-24 h-24 rounded-[2rem] bg-gradient-to-br ${ROLE_COLORS[currentUser?.role] || 'from-emerald-400 to-emerald-600'} flex items-center justify-center shadow-2xl relative z-10 border-4 border-white`}>
            <Truck size={42} className="text-white drop-shadow-md" strokeWidth={2.5} />
          </div>
          <div className="relative z-10">
            <h2 className="text-2xl font-black text-emerald-950 tracking-tighter leading-none">{currentUser?.name || 'Agent'}</h2>
            <div className={`mt-3 py-1.5 px-4 rounded-xl bg-gradient-to-r ${ROLE_COLORS[currentUser?.role]} shadow-lg`}>
              <span className="text-[10px] font-black text-white uppercase tracking-[0.2em]">
                {currentUser?.role?.replace('_', ' ')}
              </span>
            </div>
          </div>
        </div>

        {/* Details Grid */}
        <div className="space-y-4">
          <p className="text-[10px] font-black text-emerald-800/40 uppercase tracking-[0.2em] px-2">Account Details</p>
          <div className="glass rounded-[2rem] overflow-hidden divide-y divide-emerald-50 bg-white/70 border border-emerald-50 shadow-sm">
            {[
              { icon: User, label: 'Full Name', value: currentUser?.name || '—' },
              { icon: Phone, label: 'Registered Mobile', value: currentUser?.mobile || '—' },
              { icon: Mail, label: 'Official Email', value: currentUser?.email || '—' },
              { icon: Shield, label: 'Security Level', value: currentUser?.role?.replace('_', ' ') || '—' },
            ].map(({ icon: Icon, label, value }) => (
              <div key={label} className="flex items-center gap-5 px-6 py-5 hover:bg-white transition-colors group">
                <div className="w-12 h-12 rounded-2xl bg-emerald-50 flex items-center justify-center text-emerald-500 group-hover:bg-emerald-600 group-hover:text-white transition-all duration-300 shadow-inner">
                  <Icon size={20} strokeWidth={2.5} />
                </div>
                <div>
                  <p className="text-[10px] font-black text-emerald-800/40 uppercase tracking-widest leading-none mb-1.5">{label}</p>
                  <p className="text-[0.95rem] font-black text-emerald-950 tracking-tight">{value}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* KYC Documents */}
        <div className="space-y-4">
          <div className="flex items-center justify-between px-2">
            <p className="text-[10px] font-black text-emerald-800/40 uppercase tracking-[0.2em]">KYC Compliance</p>
            <span className={cn(
              "text-[9px] font-black uppercase px-2 py-0.5 rounded-full",
              currentUser?.kycStatus === 'VERIFIED' ? "bg-emerald-100 text-emerald-700" : "bg-amber-100 text-amber-700"
            )}>
              {currentUser?.kycStatus || 'PENDING'}
            </span>
          </div>
          <div className="glass rounded-[2rem] p-6 bg-white/70 border border-emerald-50 shadow-sm space-y-4">
            <div className="grid grid-cols-1 gap-3">
              {currentUser?.documents?.map((doc, idx) => (
                <div key={idx} className="flex items-center justify-between p-4 bg-emerald-50/30 border border-emerald-100/50 rounded-2xl">
                  <div className="flex items-center gap-4">
                    <div className="p-2.5 bg-white rounded-xl text-emerald-600 shadow-sm">
                      <FileText size={18} />
                    </div>
                    <div>
                      <p className="text-[10px] font-black text-emerald-900 uppercase tracking-tight">{doc.type}</p>
                      <p className={`text-[8px] font-black uppercase tracking-widest ${doc.status === 'VERIFIED' ? 'text-emerald-500' : 'text-amber-500'}`}>
                        {doc.status}
                      </p>
                    </div>
                  </div>
                  <a 
                    href={doc.fileUrl?.startsWith('http') ? doc.fileUrl : `${import.meta.env.VITE_API_URL}${doc.fileUrl}`} 
                    target="_blank" 
                    rel="noreferrer"
                    className="p-2 text-emerald-600 hover:bg-emerald-100 rounded-lg transition-colors"
                  >
                    <Download size={16} />
                  </a>
                </div>
              ))}

              <div className="relative mt-2">
                <input
                  type="file"
                  id="profile-doc-upload"
                  className="hidden"
                  onChange={(e) => {
                    const file = e.target.files[0];
                    if (file) {
                      const type = prompt("Enter Document Type (AADHAR, LICENSE, PAN, etc.)", "AADHAR");
                      if (type) handleUploadDoc(type.toUpperCase(), file);
                    }
                  }}
                />
                <button 
                  type="button" 
                  onClick={() => document.getElementById('profile-doc-upload').click()}
                  className="w-full p-6 border-2 border-dashed border-emerald-100 rounded-[1.5rem] flex flex-col items-center justify-center gap-2 text-emerald-400 hover:border-emerald-400 hover:text-emerald-600 hover:bg-emerald-50/30 transition-all group"
                >
                  <Plus size={24} />
                  <span className="text-[9px] font-black uppercase tracking-[0.2em]">Upload Identity Document</span>
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Vehicle Details */}
        <div className="space-y-4">
          <p className="text-[10px] font-black text-emerald-800/40 uppercase tracking-[0.2em] px-2">Assigned Vehicle</p>
          <div className="glass rounded-[2rem] p-6 bg-white/70 border border-emerald-50 shadow-sm relative overflow-hidden">
            {currentUser?.role === 'ADMIN' ? (
              <div className="flex flex-col items-center py-4 text-center">
                <Shield className="text-emerald-500 mb-2" size={32} />
                <p className="text-sm font-bold text-emerald-950 uppercase tracking-tight">Administrator Status</p>
                <p className="text-[10px] font-extrabold text-emerald-600 mt-1 uppercase tracking-[0.2em]">Full Fleet Access Restricted</p>
              </div>
            ) : currentUser?.assignedVehicle ? (
              <div className="space-y-6">
                <div className="flex items-center gap-5">
                  <div className="w-14 h-14 rounded-2xl bg-emerald-600 flex items-center justify-center text-white shadow-lg shadow-emerald-600/20">
                    <Truck size={28} strokeWidth={2.5} />
                  </div>
                  <div>
                    <h3 className="text-lg font-black text-emerald-950 tracking-tight leading-none mb-1.5">
                      {currentUser.assignedVehicle.vehicleNumber}
                    </h3>
                    <p className="text-xs font-bold text-emerald-600/60 uppercase tracking-widest">
                      {currentUser.assignedVehicle.vehicleName || 'Standard Fleet Vehicle'}
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="bg-emerald-50/50 p-3 rounded-2xl border border-emerald-100/50">
                    <p className="text-[9px] font-black text-emerald-800/40 uppercase tracking-widest mb-1">Current Status</p>
                    <div className="flex items-center gap-1.5">
                      {currentUser.assignedVehicle.status ? (
                        <>
                          <CheckCircle2 size={12} className="text-emerald-500" />
                          <span className="text-[10px] font-black text-emerald-900 uppercase">Active</span>
                        </>
                      ) : (
                        <>
                          <XCircle size={12} className="text-red-500" />
                          <span className="text-[10px] font-black text-red-900 uppercase">Inactive</span>
                        </>
                      )}
                    </div>
                  </div>
                  <div className="bg-emerald-50/50 p-3 rounded-2xl border border-emerald-100/50">
                    <p className="text-[9px] font-black text-emerald-800/40 uppercase tracking-widest mb-1">Documentation</p>
                    <span className="text-[10px] font-black text-emerald-900 uppercase italic">Verified Cloud</span>
                  </div>
                </div>

                <div className="space-y-2">
                  <p className="text-[10px] font-black text-emerald-800/40 uppercase tracking-widest px-1">Digital Documents</p>
                  <div className="flex flex-wrap gap-2">
                    {currentUser.assignedVehicle.rcDocument && (
                      <a href={currentUser.assignedVehicle.rcDocument} target="_blank" rel="noreferrer" className="flex items-center gap-2 px-4 py-2 bg-white border border-emerald-100 rounded-xl hover:bg-emerald-50 transition-colors shadow-sm group">
                        <FileText size={14} className="text-emerald-600" />
                        <span className="text-[10px] font-black text-emerald-900 uppercase">RC Copy</span>
                      </a>
                    )}
                    {currentUser.assignedVehicle.insuranceDocument && (
                      <a href={currentUser.assignedVehicle.insuranceDocument} target="_blank" rel="noreferrer" className="flex items-center gap-2 px-4 py-2 bg-white border border-emerald-100 rounded-xl hover:bg-emerald-50 transition-colors shadow-sm group">
                        <FileText size={14} className="text-emerald-600" />
                        <span className="text-[10px] font-black text-emerald-900 uppercase">Insurance</span>
                      </a>
                    )}
                    {currentUser.assignedVehicle.permitDocument && (
                      <a href={currentUser.assignedVehicle.permitDocument} target="_blank" rel="noreferrer" className="flex items-center gap-2 px-4 py-2 bg-white border border-emerald-100 rounded-xl hover:bg-emerald-50 transition-colors shadow-sm group">
                        <FileText size={14} className="text-emerald-600" />
                        <span className="text-[10px] font-black text-emerald-900 uppercase">Permit</span>
                      </a>
                    )}
                  </div>
                </div>

                <div className="pt-2">
                  <button
                    onClick={() => navigate(`/agent-inventory/${currentUser.assignedVehicle.id}`)}
                    className="w-full bg-emerald-600 text-white p-3.5 rounded-2xl shadow-lg shadow-emerald-600/20 hover:bg-emerald-700 active:scale-[0.98] transition-all flex items-center justify-center gap-2 font-black uppercase text-xs tracking-widest"
                  >
                    <Package size={18} />
                    View Inventory
                  </button>
                </div>
              </div>
            ) : (
              <div className="flex flex-col items-center py-6 text-center opacity-40">
                <Truck className="text-emerald-300 mb-2" size={32} />
                <p className="text-xs font-black text-emerald-900 uppercase tracking-widest">No Vehicle Assigned</p>
                <p className="text-[9px] font-bold text-emerald-600 mt-1 uppercase tracking-tighter italic">Contact Admin for Fleet Deployment</p>
              </div>
            )}
          </div>
        </div>

        {/* Update Password */}
        <div className="space-y-4">
          <p className="text-[10px] font-black text-emerald-800/40 uppercase tracking-[0.2em] px-2">Account Security</p>
          <div className="glass rounded-[2rem] p-6 bg-white/70 border border-emerald-50 shadow-sm relative overflow-hidden">
            <div className="flex items-center gap-4 mb-5">
              <div className="w-10 h-10 rounded-xl bg-emerald-50 flex items-center justify-center text-emerald-500 shadow-inner">
                <KeyRound size={20} strokeWidth={2.5} />
              </div>
              <div>
                <h3 className="text-lg font-black text-emerald-950 tracking-tight leading-none mb-1">
                  Change Password
                </h3>
                <p className="text-[10px] font-bold text-emerald-600/60 uppercase tracking-widest">
                  Secure your account
                </p>
              </div>
            </div>

            <form onSubmit={handleUpdatePassword} className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-[10px] font-black text-emerald-800/50 uppercase tracking-widest ml-1">Current Password</label>
                <input
                  type="password"
                  required
                  placeholder="Enter old password"
                  className="w-full bg-slate-50 border border-slate-100/60 rounded-2xl px-5 py-3 text-sm focus:bg-white focus:ring-2 focus:ring-emerald-500/20 transition-all outline-none text-emerald-950 font-medium placeholder-emerald-900/20"
                  value={passwords.oldPassword}
                  onChange={(e) => setPasswords({ ...passwords, oldPassword: e.target.value })}
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <label className="text-[10px] font-black text-emerald-800/50 uppercase tracking-widest ml-1">New Password</label>
                  <input
                    type="password"
                    required
                    placeholder="New password"
                    className="w-full bg-slate-50 border border-slate-100/60 rounded-2xl px-5 py-3 text-sm focus:bg-white focus:ring-2 focus:ring-emerald-500/20 transition-all outline-none text-emerald-950 font-medium placeholder-emerald-900/20"
                    value={passwords.newPassword}
                    onChange={(e) => setPasswords({ ...passwords, newPassword: e.target.value })}
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-[10px] font-black text-emerald-800/50 uppercase tracking-widest ml-1">Confirm</label>
                  <input
                    type="password"
                    required
                    placeholder="Confirm password"
                    className="w-full bg-slate-50 border border-slate-100/60 rounded-2xl px-5 py-3 text-sm focus:bg-white focus:ring-2 focus:ring-emerald-500/20 transition-all outline-none text-emerald-950 font-medium placeholder-emerald-900/20"
                    value={passwords.confirmPassword}
                    onChange={(e) => setPasswords({ ...passwords, confirmPassword: e.target.value })}
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={isUpdating}
                className="w-full bg-emerald-600 text-white p-3.5 rounded-2xl shadow-lg shadow-emerald-600/20 hover:bg-emerald-700 active:scale-[0.98] transition-all flex items-center justify-center gap-2 font-black uppercase text-xs tracking-widest disabled:opacity-70 mt-2"
              >
                {isUpdating ? <Loader2 className="animate-spin" size={18} /> : <KeyRound size={18} />}
                Update Security
              </button>
            </form>
          </div>
        </div>

        {/* Terminate Session */}
        <div className="pt-4 px-2 space-y-4">
            <button
            id="logout-btn"
            onClick={handleLogout}
            className="w-full h-16 rounded-[1.5rem] bg-white text-emerald-600 font-black text-lg active:scale-[0.98] transition-all flex items-center justify-center gap-3 shadow-xl shadow-emerald-950/5 border border-emerald-100 hover:bg-emerald-50 group"
            >
                <LogOut size={22} strokeWidth={3} className="group-hover:-translate-x-1 transition-transform" />
                <span className="uppercase text-xs tracking-[0.2em]">Terminate Session</span>
            </button>
            <p className="text-center text-[10px] font-extrabold text-emerald-800/30 uppercase tracking-[0.4em]">
                VillagKart Cloud Security v1.4
            </p>
        </div>
      </div>
    </div>
  );
}
