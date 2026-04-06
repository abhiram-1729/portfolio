import { useNavigate } from 'react-router-dom';
import { useUserStore } from '../store/userStore';
import { ArrowLeft, User, Phone, Mail, Shield, Truck, LogOut, FileText, CheckCircle2, XCircle, Package } from 'lucide-react';

export default function Profile() {
  const { user, clearUser } = useUserStore();
  const navigate = useNavigate();

  const handleLogout = () => {
    clearUser();
    navigate('/login');
  };

  const ROLE_COLORS = {
    ADMIN: 'from-orange-500 to-orange-600 shadow-orange-500/20',
    SALES_AGENT: 'from-emerald-500 to-emerald-600 shadow-emerald-500/20',
    CONSUMER: 'from-emerald-800 to-emerald-950 shadow-emerald-950/20',
  };

  return (
    <div className="min-h-screen bg-slate-50 animate-fade-in pb-[calc(var(--safe-bottom)+2rem)]">

      <div className="max-w-lg mx-auto px-5 pt-6 space-y-6">
        {/* Avatar & Name */}
        <div className="glass rounded-[2.5rem] p-8 flex flex-col items-center gap-5 text-center bg-white/70 border border-white shadow-sm relative overflow-hidden">
          <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-500/5 blur-3xl rounded-full translate-x-12 -translate-y-12" />

          <div className={`w-24 h-24 rounded-[2rem] bg-gradient-to-br ${ROLE_COLORS[user?.role] || 'from-emerald-400 to-emerald-600'} flex items-center justify-center shadow-2xl relative z-10 border-4 border-white`}>
            <Truck size={42} className="text-white drop-shadow-md" strokeWidth={2.5} />
          </div>
          <div className="relative z-10">
            <h2 className="text-2xl font-black text-emerald-950 tracking-tighter leading-none">{user?.name || 'Agent'}</h2>
            <div className={`mt-3 py-1.5 px-4 rounded-xl bg-gradient-to-r ${ROLE_COLORS[user?.role]} shadow-lg`}>
              <span className="text-[10px] font-black text-white uppercase tracking-[0.2em]">
                {user?.role?.replace('_', ' ')}
              </span>
            </div>
          </div>
        </div>

        {/* Details Grid */}
        <div className="space-y-4">
          <p className="text-[10px] font-black text-emerald-800/40 uppercase tracking-[0.2em] px-2">Account Details</p>
          <div className="glass rounded-[2rem] overflow-hidden divide-y divide-emerald-50 bg-white/70 border border-emerald-50 shadow-sm">
            {[
              { icon: User, label: 'Full Name', value: user?.name || '—' },
              { icon: Phone, label: 'Registered Mobile', value: user?.mobile || '—' },
              { icon: Mail, label: 'Official Email', value: user?.email || '—' },
              { icon: Shield, label: 'Security Level', value: user?.role?.replace('_', ' ') || '—' },
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

        {/* Vehicle Details */}
        <div className="space-y-4">
          <p className="text-[10px] font-black text-emerald-800/40 uppercase tracking-[0.2em] px-2">Assigned Vehicle</p>
          <div className="glass rounded-[2rem] p-6 bg-white/70 border border-emerald-50 shadow-sm relative overflow-hidden">
            {user?.role === 'ADMIN' ? (
              <div className="flex flex-col items-center py-4 text-center">
                <Shield className="text-orange-500 mb-2" size={32} />
                <p className="text-sm font-bold text-emerald-950 uppercase tracking-tight">Administrator Status</p>
                <p className="text-[10px] font-extrabold text-orange-600 mt-1 uppercase tracking-[0.2em]">Full Fleet Access Restricted</p>
              </div>
            ) : user?.assignedVehicle ? (
              <div className="space-y-6">
                <div className="flex items-center gap-5">
                  <div className="w-14 h-14 rounded-2xl bg-emerald-600 flex items-center justify-center text-white shadow-lg shadow-emerald-600/20">
                    <Truck size={28} strokeWidth={2.5} />
                  </div>
                  <div>
                    <h3 className="text-lg font-black text-emerald-950 tracking-tight leading-none mb-1.5">
                      {user.assignedVehicle.vehicleNumber}
                    </h3>
                    <p className="text-xs font-bold text-emerald-600/60 uppercase tracking-widest">
                      {user.assignedVehicle.vehicleName || 'Standard Fleet Vehicle'}
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="bg-emerald-50/50 p-3 rounded-2xl border border-emerald-100/50">
                    <p className="text-[9px] font-black text-emerald-800/40 uppercase tracking-widest mb-1">Current Status</p>
                    <div className="flex items-center gap-1.5">
                      {user.assignedVehicle.status ? (
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
                    {user.assignedVehicle.rcDocument && (
                      <a href={user.assignedVehicle.rcDocument} target="_blank" rel="noreferrer" className="flex items-center gap-2 px-4 py-2 bg-white border border-emerald-100 rounded-xl hover:bg-emerald-50 transition-colors shadow-sm group">
                        <FileText size={14} className="text-emerald-600" />
                        <span className="text-[10px] font-black text-emerald-900 uppercase">RC Copy</span>
                      </a>
                    )}
                    {user.assignedVehicle.insuranceDocument && (
                      <a href={user.assignedVehicle.insuranceDocument} target="_blank" rel="noreferrer" className="flex items-center gap-2 px-4 py-2 bg-white border border-emerald-100 rounded-xl hover:bg-emerald-50 transition-colors shadow-sm group">
                        <FileText size={14} className="text-emerald-600" />
                        <span className="text-[10px] font-black text-emerald-900 uppercase">Insurance</span>
                      </a>
                    )}
                    {user.assignedVehicle.permitDocument && (
                      <a href={user.assignedVehicle.permitDocument} target="_blank" rel="noreferrer" className="flex items-center gap-2 px-4 py-2 bg-white border border-emerald-100 rounded-xl hover:bg-emerald-50 transition-colors shadow-sm group">
                        <FileText size={14} className="text-emerald-600" />
                        <span className="text-[10px] font-black text-emerald-900 uppercase">Permit</span>
                      </a>
                    )}
                  </div>
                </div>

                <div className="pt-2">
                  <button 
                    onClick={() => navigate(`/agent-inventory/${user.assignedVehicle.id}`)}
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

        {/* Action Section
        <div className="pt-4 px-2 space-y-4">
            <button
            id="logout-btn"
            onClick={handleLogout}
            className="w-full h-16 rounded-[1.5rem] bg-white text-orange-600 font-black text-lg active:scale-[0.98] transition-all flex items-center justify-center gap-3 shadow-xl shadow-orange-950/5 border border-orange-100 hover:bg-orange-50 group"
            >
                <LogOut size={22} strokeWidth={3} className="group-hover:-translate-x-1 transition-transform" />
                <span className="uppercase text-xs tracking-[0.2em]">Terminate Session</span>
            </button>
            <p className="text-center text-[10px] font-extrabold text-emerald-800/30 uppercase tracking-[0.4em]">
                VillagKart Cloud Security v1.4
            </p>
        </div> */}
      </div>
    </div>
  );
}
