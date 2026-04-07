import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { authAPI } from '../services/api';
import { useUserStore } from '../store/userStore';
import { Lock, Phone } from 'lucide-react';
import toast from 'react-hot-toast';
import logo from '../assets/VillagKart_Logo.png';

export default function Login() {
  const [mobile, setMobile] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [loginError, setLoginError] = useState(null);
  const { setUser } = useUserStore();
  const navigate = useNavigate();

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoginError(null);
    if (!mobile || !password) {
      setLoginError('Please fill in both mobile number and password.');
      return;
    }
    setLoading(true);
    try {
      const { data } = await authAPI.login({ mobile, password });
      setUser(data, data.token);
      toast.success(`Welcome back, ${data.name || 'Agent'}!`);
      if (data.role === 'ADMIN') {
        navigate('/admin');
      } else {
        navigate('/');
      }
    } catch (err) {
      setLoginError(err.response?.data?.message || 'Login failed. Please check your credentials.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-6 bg-slate-50 relative overflow-hidden">
      {/* Soft Immersive Background Effects */}
      <div className="absolute top-0 left-0 w-full h-full overflow-hidden z-0 pointer-events-none">
        <div className="absolute top-[-10%] left-[-10%] w-[50vw] h-[50vw] rounded-full bg-emerald-100/60 blur-[120px] animate-pulse" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[40vw] h-[40vw] rounded-full bg-orange-100/40 blur-[100px]" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full h-full bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] opacity-[0.03]" />
      </div>

      <div className="z-10 w-full max-w-sm flex flex-col items-center animate-slide-up">
        {/* Logo Section */}
        <div className="mb-10 flex flex-col items-center gap-5">
          <div className="relative group">
            <div className="absolute -inset-6 bg-emerald-500/10 blur-2xl rounded-full opacity-0 group-hover:opacity-100 transition-opacity duration-700" />
            <img
              src={logo}
              alt="VillagKart Logo"
              className="h-28 w-auto object-contain drop-shadow-md relative z-10 transition-transform duration-500 group-hover:scale-105"
            />
          </div>
          <div className="text-center">
            <h1 className="text-[2.5rem] font-black text-emerald-950 tracking-tighter leading-none">
              VillagKart
            </h1>
            <p className="text-emerald-600 text-[0.75rem] font-black tracking-[0.4em] uppercase mt-3">
              Sales Ecosystem
            </p>
          </div>
        </div>

        {/* Login Card */}
        <div className="w-full glass rounded-[2.5rem] p-8 shadow-2xl shadow-emerald-900/5 border border-white relative overflow-hidden bg-white/80 backdrop-blur-2xl">
          <div className="absolute top-0 inset-x-0 h-1.5 bg-gradient-to-r from-emerald-500/0 via-emerald-500/20 to-emerald-500/0" />

          <div className="mb-8">
            <h2 className="text-2xl font-black text-emerald-900 text-center tracking-tight">Sign In</h2>
            <p className="text-center text-emerald-600/60 text-sm font-bold mt-1 uppercase tracking-wider">Access Secured</p>
          </div>

          <form onSubmit={handleLogin} className="flex flex-col gap-5">
            {/* Error Popup Alert */}
            {loginError && (
              <div className="bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded-2xl flex items-start gap-3 animate-in fade-in zoom-in duration-200 shadow-sm">
                <div className="mt-0.5 bg-red-100 p-1 rounded-full text-red-500">
                  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
                </div>
                <div className="flex-1">
                  <p className="text-[13px] font-black tracking-tight leading-tight mb-0.5">Access Denied</p>
                  <p className="text-[11px] font-semibold opacity-90 leading-tight">{loginError}</p>
                </div>
              </div>
            )}

            <div className="relative group">
              <div className="absolute left-4 top-1/2 -translate-y-1/2 w-10 h-10 rounded-xl bg-emerald-50 flex items-center justify-center text-emerald-400 group-focus-within:bg-emerald-600 group-focus-within:text-white transition-all duration-300">
                <Phone size={18} strokeWidth={2.5} />
              </div>
              <input
                id="mobile-input"
                type="tel"
                placeholder="Mobile Number"
                value={mobile}
                onChange={(e) => {
                  setMobile(e.target.value);
                  setLoginError(null);
                }}
                className={`w-full pl-16 pr-4 py-4 rounded-[1.25rem] border ${loginError ? 'border-red-300 bg-red-50/30' : 'border-emerald-100 bg-white/50'} hover:bg-white focus:bg-white focus:outline-none focus:ring-4 focus:ring-emerald-500/10 focus:border-emerald-500 transition-all font-bold text-emerald-950 text-[1.05rem] placeholder-slate-950/40 placeholder:font-medium`}
              />
            </div>

            <div className="relative group">
              <div className="absolute left-4 top-1/2 -translate-y-1/2 w-10 h-10 rounded-xl bg-emerald-50 flex items-center justify-center text-emerald-400 group-focus-within:bg-emerald-600 group-focus-within:text-white transition-all duration-300">
                <Lock size={18} strokeWidth={2.5} />
              </div>
              <input
                id="password-input"
                type="password"
                placeholder="Password"
                value={password}
                onChange={(e) => {
                  setPassword(e.target.value);
                  setLoginError(null);
                }}
                className={`w-full pl-16 pr-4 py-4 rounded-[1.25rem] border ${loginError ? 'border-red-300 bg-red-50/30' : 'border-emerald-100 bg-white/50'} hover:bg-white focus:bg-white focus:outline-none focus:ring-4 focus:ring-emerald-500/10 focus:border-emerald-500 transition-all font-bold text-emerald-950 text-[1.05rem] placeholder-slate-950/40 placeholder:font-medium`}
              />
            </div>

            <button
              id="login-btn"
              type="submit"
              disabled={loading}
              className="mt-4 w-full bg-emerald-600 hover:bg-emerald-700 text-white font-black text-lg py-4 rounded-2xl active:scale-[0.98] transition-all shadow-xl shadow-emerald-600/20 flex items-center justify-center disabled:opacity-70 group relative overflow-hidden"
            >
              <div className="absolute inset-0 bg-gradient-to-r from-orange-400 to-orange-600 opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
              <span className="relative z-10 font-black tracking-tight flex items-center gap-2">
                {loading ? (
                  <div className="w-6 h-6 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                ) : (
                  'Login'
                )}
              </span>
            </button>
          </form>
        </div>

        {/* Footer Info */}
        <p className="mt-8 text-emerald-800/40 text-[10px] font-black uppercase tracking-[0.4em]">
          VillagKart System v1.0
        </p>
      </div>
    </div>
  );
}
