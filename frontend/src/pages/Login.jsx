import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { authAPI } from '../services/api';
import { useUserStore } from '../store/userStore';
import { Eye, EyeOff } from 'lucide-react';
import toast from 'react-hot-toast';
import logo from '../assets/VillagKart_Logo.png';
import illustration from '../assets/login_illustration.png';

export default function Login() {
  const [mobile, setMobile] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [loginError, setLoginError] = useState(null);
  const [showPassword, setShowPassword] = useState(false);
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

      if (data.role === 'TENANT_OWNER' || data.role === 'ADMIN') {
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
    <div 
      className="min-h-screen flex flex-col lg:flex-row relative"
      style={{ 
        background: 'linear-gradient(225.21deg, #F7F7FA 51.74%, rgba(232, 249, 231, 0.851054) 63.27%, rgba(215, 251, 210, 0.680549) 73.64%, rgba(198, 253, 190, 0.516864) 83.6%, rgba(182, 255, 170, 0.36) 93.14%)',
        fontFamily: '"Segoe UI", sans-serif'
      }}
    >
      {/* Left Column - Visuals */}
      <div className="hidden lg:flex lg:w-1/2 flex-col px-12 xl:px-32 py-12 relative overflow-hidden h-screen">
        {/* Logo */}
        <div className="flex items-center z-10">
          <img src={logo} alt="VillagKart Logo" className="h-14 xl:h-16 w-auto mix-blend-multiply" />
        </div>

        {/* Text and Illustration */}
        <div className="mt-20 xl:mt-24 z-10 font-semibold text-[32px] xl:text-[36px] leading-[1.4] xl:leading-[1.58] text-[#161616] max-w-[600px]">
          Welcome Back!<br />
          Please login to your account
        </div>

        {/* Illustration container locked to bottom */}
        <div className="absolute bottom-0 left-0 w-full flex justify-center z-10 px-12">
          <img 
            src={illustration} 
            alt="Shopping Illustration" 
            className="w-full max-w-[90%] object-contain mix-blend-multiply drop-shadow-md"
          />
        </div>

        {/* Soft Background shapes matching mockup style */}
        <div className="absolute top-[35%] left-[10%] w-24 h-24 border border-rose-300 rounded-full opacity-50 pointer-events-none"></div>
        <div className="absolute top-[40%] right-[20%] w-16 h-16 border border-orange-300 rounded-full opacity-50 pointer-events-none"></div>
        <div className="absolute bottom-[30%] right-[10%] w-32 h-32 border border-orange-200 rounded-full opacity-50 pointer-events-none"></div>
      </div>

      {/* Right Column - Form */}
      <div className="w-full lg:w-1/2 flex items-center justify-center lg:justify-start px-8 lg:px-24 relative bg-transparent h-screen">
        <div 
          className="flex flex-col justify-center animate-in fade-in slide-in-from-bottom-4 duration-500 w-full max-w-[397px] lg:ml-auto xl:mr-32"
          style={{ minHeight: '424px' }}
        >
          
          <div className="mb-8 text-left">
            <h2 className="text-[32px] font-semibold text-[#161616] tracking-tight">
              Hey Welcome Admin<span className="text-[#2d9a40] font-bold">!</span>
            </h2>
          </div>

          <form onSubmit={handleLogin} className="flex flex-col gap-5">
            {loginError && (
              <div className="bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded-lg text-sm font-medium">
                {loginError}
              </div>
            )}

            <div className="flex flex-col gap-1.5">
              <label htmlFor="mobile-input" className="text-sm font-medium text-gray-700">
                Enter your Email Address here
              </label>
              <input
                id="mobile-input"
                type="text"
                placeholder="Email Address"
                value={mobile}
                onChange={(e) => {
                  setMobile(e.target.value);
                  setLoginError(null);
                }}
                className={`w-full px-4 py-3 rounded-lg border ${loginError ? 'border-red-300' : 'border-gray-200'} focus:outline-none focus:border-[#2d9a40] transition-colors text-gray-800 placeholder-gray-400`}
              />
            </div>

            <div className="flex flex-col gap-1.5 relative">
              <label htmlFor="password-input" className="text-sm font-medium text-gray-700">
                Password
              </label>
              <div className="relative">
                <input
                  id="password-input"
                  type={showPassword ? 'text' : 'password'}
                  placeholder="********"
                  value={password}
                  onChange={(e) => {
                    setPassword(e.target.value);
                    setLoginError(null);
                  }}
                  className={`w-full pl-4 pr-12 py-3 rounded-lg border ${loginError ? 'border-red-300' : 'border-gray-200'} focus:outline-none focus:border-[#2d9a40] transition-colors text-gray-800 placeholder-gray-400`}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700 p-1"
                >
                  {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                </button>
              </div>
            </div>

            <div className="flex justify-end mt-1">
              <a href="#" className="text-[13px] font-medium text-gray-800 hover:text-[#2d9a40] transition-colors">
                Forgot Password?
              </a>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="mt-2 w-full bg-[#2d9a40] hover:bg-[#258034] text-white font-medium text-lg py-3 rounded-lg transition-colors flex items-center justify-center disabled:opacity-70 disabled:cursor-not-allowed"
            >
              {loading ? (
                <div className="w-6 h-6 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                'Login'
              )}
            </button>
          </form>

        </div>
      </div>
    </div>
  );
}
