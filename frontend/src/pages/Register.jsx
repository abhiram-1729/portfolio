import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { 
  User, 
  Phone, 
  Lock, 
  ArrowRight, 
  ChevronRight,
  ShieldCheck,
  CheckCircle2,
  Mail
} from 'lucide-react';
import { motion } from 'framer-motion';
import logo from '../assets/VillagKart_Logo.png';
import toast from 'react-hot-toast';
import { authAPI } from '../services/api';
import { useUserStore } from '../store/userStore';

const Register = () => {
  const navigate = useNavigate();
  const { setUser } = useUserStore();
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    surname: '',
    mobile: '',
    email: '',
    gender: '',
    password: '',
    confirmPassword: ''
  });

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (step === 1) {
      if (!formData.name || !formData.mobile || !formData.gender) {
        toast.error("Please fill all required fields");
        return;
      }
      setStep(2);
    } else {
      if (!formData.password || formData.password !== formData.confirmPassword) {
        toast.error("Passwords do not match");
        return;
      }
      
      setLoading(true);
      try {
        const { data } = await authAPI.register(formData);
        setUser(data, data.token);
        toast.success("Account created successfully!");
        // Redirect to Create Business Flow
        navigate('/create-business'); 
      } catch (err) {
        toast.error(err.response?.data?.message || "Registration failed. Please try again.");
      } finally {
        setLoading(false);
      }
    }
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-6 bg-slate-50 relative overflow-hidden">
      {/* Background Effects */}
      <div className="absolute top-0 left-0 w-full h-full overflow-hidden z-0 pointer-events-none">
        <div className="absolute top-[-10%] left-[-10%] w-[50vw] h-[50vw] rounded-full bg-emerald-100/60 blur-[120px] animate-pulse" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[40vw] h-[40vw] rounded-full bg-orange-100/40 blur-[100px]" />
      </div>

      <div className="z-10 w-full max-w-md flex flex-col items-center">
        {/* Header */}
        <div className="mb-8 flex flex-col items-center gap-4">
          <Link to="/" className="relative group">
            <img src={logo} alt="VillagKart" className="h-16 w-auto object-contain" />
          </Link>
          <div className="text-center">
            <h1 className="text-3xl font-black text-emerald-950 tracking-tighter">Create Account</h1>
            <p className="text-emerald-600 text-[0.65rem] font-black tracking-[0.4em] uppercase mt-1">Step {step} of 2</p>
          </div>
        </div>

        {/* Progress Bar */}
        <div className="w-full flex gap-2 mb-8 px-2">
          <div className={`h-1.5 flex-1 rounded-full transition-all duration-500 ${step >= 1 ? 'bg-emerald-600' : 'bg-emerald-100'}`} />
          <div className={`h-1.5 flex-1 rounded-full transition-all duration-500 ${step >= 2 ? 'bg-emerald-600' : 'bg-emerald-100'}`} />
        </div>

        {/* Form Card */}
        <motion.div 
          key={step}
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          className="w-full glass rounded-[2.5rem] p-8 shadow-2xl border border-white bg-white/80 backdrop-blur-2xl relative"
        >
          <form onSubmit={handleSubmit} className="flex flex-col gap-5">
            {step === 1 ? (
              <>
                <div className="grid grid-cols-2 gap-4">
                  <div className="relative group">
                    <div className="absolute left-4 top-1/2 -translate-y-1/2 text-emerald-400">
                      <User size={18} />
                    </div>
                    <input
                      name="name"
                      placeholder="Name"
                      required
                      value={formData.name}
                      onChange={handleChange}
                      className="w-full pl-12 pr-4 py-4 rounded-2xl border border-emerald-100 bg-white/50 focus:bg-white focus:outline-none focus:ring-4 focus:ring-emerald-500/10 focus:border-emerald-500 transition-all font-bold text-emerald-950"
                    />
                  </div>
                  <div className="relative group">
                    <input
                      name="surname"
                      placeholder="Surname"
                      value={formData.surname}
                      onChange={handleChange}
                      className="w-full px-4 py-4 rounded-2xl border border-emerald-100 bg-white/50 focus:bg-white focus:outline-none focus:ring-4 focus:ring-emerald-500/10 focus:border-emerald-500 transition-all font-bold text-emerald-950"
                    />
                  </div>
                </div>

                <div className="relative group">
                  <div className="absolute left-4 top-1/2 -translate-y-1/2 text-emerald-400">
                    <Phone size={18} />
                  </div>
                  <input
                    name="mobile"
                    type="tel"
                    placeholder="Mobile Number"
                    required
                    value={formData.mobile}
                    onChange={handleChange}
                    className="w-full pl-12 pr-4 py-4 rounded-2xl border border-emerald-100 bg-white/50 focus:bg-white focus:outline-none focus:ring-4 focus:ring-emerald-500/10 focus:border-emerald-500 transition-all font-bold text-emerald-950"
                  />
                </div>

                <div className="relative group">
                  <div className="absolute left-4 top-1/2 -translate-y-1/2 text-emerald-400">
                    <Mail size={18} />
                  </div>
                  <input
                    name="email"
                    type="email"
                    placeholder="Email Address (Optional)"
                    value={formData.email}
                    onChange={handleChange}
                    className="w-full pl-12 pr-4 py-4 rounded-2xl border border-emerald-100 bg-white/50 focus:bg-white focus:outline-none focus:ring-4 focus:ring-emerald-500/10 focus:border-emerald-500 transition-all font-bold text-emerald-950"
                  />
                </div>

                <div className="flex flex-col gap-2">
                  <label className="text-[10px] font-black uppercase tracking-[0.2em] text-emerald-800/40 ml-4">Gender</label>
                  <div className="grid grid-cols-3 gap-3">
                    {['Male', 'Female', 'Other'].map((g) => (
                      <button
                        key={g}
                        type="button"
                        onClick={() => setFormData({...formData, gender: g})}
                        className={`py-3 rounded-xl border text-sm font-black transition-all ${formData.gender === g ? 'bg-emerald-600 border-emerald-600 text-white shadow-lg shadow-emerald-200' : 'bg-white border-emerald-100 text-emerald-900 hover:border-emerald-300'}`}
                      >
                        {g}
                      </button>
                    ))}
                  </div>
                </div>
              </>
            ) : (
              <>
                <div className="relative group">
                  <div className="absolute left-4 top-1/2 -translate-y-1/2 text-emerald-400">
                    <Lock size={18} />
                  </div>
                  <input
                    name="password"
                    type="password"
                    placeholder="Create Password"
                    required
                    value={formData.password}
                    onChange={handleChange}
                    className="w-full pl-12 pr-4 py-4 rounded-2xl border border-emerald-100 bg-white/50 focus:bg-white focus:outline-none focus:ring-4 focus:ring-emerald-500/10 focus:border-emerald-500 transition-all font-bold text-emerald-950"
                  />
                </div>
                <div className="relative group">
                  <div className="absolute left-4 top-1/2 -translate-y-1/2 text-emerald-400">
                    <ShieldCheck size={18} />
                  </div>
                  <input
                    name="confirmPassword"
                    type="password"
                    placeholder="Confirm Password"
                    required
                    value={formData.confirmPassword}
                    onChange={handleChange}
                    className="w-full pl-12 pr-4 py-4 rounded-2xl border border-emerald-100 bg-white/50 focus:bg-white focus:outline-none focus:ring-4 focus:ring-emerald-500/10 focus:border-emerald-500 transition-all font-bold text-emerald-950"
                  />
                </div>
                
                <div className="bg-emerald-50 p-4 rounded-2xl border border-emerald-100 flex gap-3">
                   <div className="w-5 h-5 rounded-full bg-emerald-600 flex items-center justify-center text-white shrink-0 mt-0.5">
                      <CheckCircle2 size={12} strokeWidth={3} />
                   </div>
                   <p className="text-[11px] font-bold text-emerald-800 leading-tight">
                     By continuing, you agree to our Terms and conditions for business growth and data security.
                   </p>
                </div>
              </>
            )}

            <button
              type="submit"
              disabled={loading}
              className="mt-4 w-full bg-emerald-600 hover:bg-emerald-700 text-white font-black text-lg py-5 rounded-2xl shadow-xl shadow-emerald-200 transition-all active:scale-[0.98] flex items-center justify-center gap-2 group disabled:opacity-70"
            >
              {loading ? (
                <div className="w-6 h-6 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                <>
                  {step === 1 ? 'Continue' : 'Create Account'}
                  <ChevronRight size={20} className="group-hover:translate-x-1 transition-transform" />
                </>
              )}
            </button>
            
            {step === 2 && !loading && (
              <button 
                type="button"
                onClick={() => setStep(1)}
                className="text-center text-emerald-600 font-black text-xs uppercase tracking-widest hover:text-emerald-800 transition-colors"
              >
                Go Back
              </button>
            )}
          </form>
        </motion.div>

        <p className="mt-8 text-center text-slate-400 font-bold text-sm">
          Already have an account? <Link to="/login" className="text-emerald-600 font-black hover:underline">Login here</Link>
        </p>

        <p className="mt-12 text-emerald-800/20 text-[10px] font-black uppercase tracking-[0.4em]">
          VillagKart Ecosystem v1.0
        </p>
      </div>
    </div>
  );
};

export default Register;
