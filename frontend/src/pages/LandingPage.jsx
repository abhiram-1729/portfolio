import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { 
  ChevronRight, 
  Store, 
  Truck, 
  Users, 
  LayoutDashboard, 
  BarChart3, 
  ShieldCheck, 
  Smartphone,
  CheckCircle2,
  Package,
  CreditCard,
  Phone
} from 'lucide-react';
import logo from '../assets/VillagKart_Logo.png';

const LandingPage = () => {
  const navigate = useNavigate();

  const features = [
    {
      icon: <LayoutDashboard className="w-6 h-6" />,
      title: "Smart POS Billing",
      description: "Fast, efficient billing with thermal print and WhatsApp invoice sharing."
    },
    {
      icon: <Package className="w-6 h-6" />,
      title: "Inventory Control",
      description: "Real-time stock tracking, low stock alerts, and multi-unit management."
    },
    {
      icon: <BarChart3 className="w-6 h-6" />,
      title: "Business Analytics",
      description: "Track sales, expenses, and profits with intuitive daily/monthly reports."
    },
    {
      icon: <Users className="w-6 h-6" />,
      title: "Customer Udhar System",
      description: "Manage credit, track purchase history, and improve customer retention."
    }
  ];

  const plans = [
    {
      name: "Basic",
      price: "₹0",
      period: "/month",
      features: ["1 Business Dashboard", "Basic POS Billing", "Simple Inventory", "Daily Reports"],
      highlight: false
    },
    {
      name: "Standard",
      price: "₹499",
      period: "/month",
      features: ["3 Business Dashboards", "Advanced POS", "Full Inventory Mgmt", "Credit (Udhar) System", "Supplier Management"],
      highlight: true
    },
    {
      name: "Premium",
      price: "₹999",
      period: "/month",
      features: ["Unlimited Businesses", "Multi-user Access", "Advanced Analytics", "Custom Branding", "Priority Support"],
      highlight: false
    }
  ];

  return (
    <div className="min-h-screen bg-[#FDFCFB] text-slate-900 selection:bg-emerald-100 selection:text-emerald-900">
      {/* Navigation */}
      <nav className="fixed top-0 left-0 right-0 z-50 bg-white/70 backdrop-blur-xl border-b border-slate-100">
        <div className="max-w-7xl mx-auto px-6 h-20 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <img src={logo} alt="VillagKart" className="h-10 w-auto" />
            <span className="text-xl font-black tracking-tighter text-emerald-950">VillagKart</span>
          </div>
          <div className="flex items-center gap-4">
            <button 
              onClick={() => navigate('/login')}
              className="text-sm font-bold text-slate-600 hover:text-emerald-600 transition-colors px-4 py-2"
            >
              Login
            </button>
            <button 
              onClick={() => navigate('/register')}
              className="bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-black px-6 py-2.5 rounded-full shadow-lg shadow-emerald-200 transition-all active:scale-95"
            >
              Start Free
            </button>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="relative pt-40 pb-24 overflow-hidden">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full h-full -z-10">
          <div className="absolute top-[-10%] left-[-10%] w-[50vw] h-[50vw] rounded-full bg-emerald-50/50 blur-[120px]" />
          <div className="absolute bottom-0 right-[-5%] w-[40vw] h-[40vw] rounded-full bg-orange-50/50 blur-[100px]" />
        </div>

        <div className="max-w-7xl mx-auto px-6 text-center">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
          >
            <span className="inline-block px-4 py-1.5 rounded-full bg-emerald-50 text-emerald-700 text-xs font-black uppercase tracking-[0.2em] mb-6">
              Empowering Small Business
            </span>
            <h1 className="text-5xl md:text-7xl font-black text-slate-900 tracking-tight leading-[1.1] mb-8">
              Digitize Every <span className="text-emerald-600">Small Business.</span><br />
              Scale Every <span className="text-orange-500">Dream.</span>
            </h1>
            <p className="max-w-2xl mx-auto text-lg text-slate-500 font-medium leading-relaxed mb-10">
              The all-in-one digital platform for street vendors, kirana stores, and small shops to manage POS, inventory, and finances with ease.
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <button 
                onClick={() => navigate('/register')}
                className="w-full sm:w-auto bg-emerald-600 hover:bg-emerald-700 text-white font-black text-lg px-10 py-5 rounded-2xl shadow-2xl shadow-emerald-200 transition-all active:scale-95 flex items-center justify-center gap-2"
              >
                Create Business Account <ChevronRight size={20} />
              </button>
              <button 
                onClick={() => navigate('/login')}
                className="w-full sm:w-auto bg-white hover:bg-slate-50 text-slate-900 font-black text-lg px-10 py-5 rounded-2xl border-2 border-slate-100 transition-all flex items-center justify-center"
              >
                Login
              </button>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Stats/Trust Section */}
      <section className="py-12 border-y border-slate-100 bg-slate-50/30">
        <div className="max-w-7xl mx-auto px-6">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
            {[
              { label: "Active Vendors", value: "10,000+" },
              { label: "Cities Covered", value: "50+" },
              { label: "Daily Transactions", value: "₹50L+" },
              { label: "Uptime", value: "99.9%" }
            ].map((stat, i) => (
              <div key={i} className="text-center">
                <div className="text-2xl font-black text-slate-900">{stat.value}</div>
                <div className="text-xs font-bold text-slate-400 uppercase tracking-widest mt-1">{stat.label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Features Grid */}
      <section className="py-32 bg-white">
        <div className="max-w-7xl mx-auto px-6">
          <div className="text-center mb-20">
            <h2 className="text-4xl font-black text-slate-900 tracking-tight mb-4">Powerful Features for Growth</h2>
            <p className="text-slate-500 font-medium">Everything you need to run your business professionally from day one.</p>
          </div>
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
            {features.map((f, i) => (
              <motion.div 
                key={i}
                whileHover={{ y: -10 }}
                className="p-8 rounded-[2.5rem] bg-slate-50 hover:bg-emerald-50 transition-colors group"
              >
                <div className="w-14 h-14 rounded-2xl bg-white shadow-sm flex items-center justify-center text-emerald-600 mb-6 group-hover:bg-emerald-600 group-hover:text-white transition-all">
                  {f.icon}
                </div>
                <h3 className="text-xl font-black text-slate-900 mb-3">{f.title}</h3>
                <p className="text-slate-500 text-sm font-medium leading-relaxed">{f.description}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Pricing Section */}
      <section className="py-32 bg-[#FDFCFB]">
        <div className="max-w-7xl mx-auto px-6">
          <div className="text-center mb-20">
            <h2 className="text-4xl font-black text-slate-900 tracking-tight mb-4">Simple, Transparent Pricing</h2>
            <p className="text-slate-500 font-medium">Choose a plan that fits your business stage.</p>
          </div>
          <div className="grid md:grid-cols-3 gap-8">
            {plans.map((plan, i) => (
              <div 
                key={i}
                className={`p-10 rounded-[2.5rem] border ${plan.highlight ? 'border-emerald-500 bg-white shadow-2xl shadow-emerald-100 ring-1 ring-emerald-500' : 'border-slate-100 bg-white'}`}
              >
                {plan.highlight && (
                  <span className="inline-block px-3 py-1 rounded-full bg-emerald-100 text-emerald-700 text-[10px] font-black uppercase tracking-widest mb-6">Recommended</span>
                )}
                <h3 className="text-xl font-black text-slate-900 mb-2">{plan.name}</h3>
                <div className="flex items-baseline gap-1 mb-8">
                  <span className="text-4xl font-black text-slate-900">{plan.price}</span>
                  <span className="text-slate-400 font-bold">{plan.period}</span>
                </div>
                <ul className="space-y-4 mb-10">
                  {plan.features.map((feat, j) => (
                    <li key={j} className="flex items-center gap-3 text-slate-600 font-bold text-sm">
                      <CheckCircle2 size={18} className="text-emerald-500 shrink-0" />
                      {feat}
                    </li>
                  ))}
                </ul>
                <button 
                  onClick={() => navigate('/register')}
                  className={`w-full py-4 rounded-2xl font-black transition-all active:scale-95 ${plan.highlight ? 'bg-emerald-600 text-white shadow-lg shadow-emerald-200 hover:bg-emerald-700' : 'bg-slate-100 text-slate-900 hover:bg-slate-200'}`}
                >
                  Get Started
                </button>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Footer */}
      <section className="py-32">
        <div className="max-w-5xl mx-auto px-6">
          <div className="bg-emerald-950 rounded-[3rem] p-12 md:p-20 text-center relative overflow-hidden">
            <div className="absolute top-0 right-0 w-64 h-64 bg-emerald-600/20 blur-[100px] rounded-full" />
            <div className="absolute bottom-0 left-0 w-64 h-64 bg-orange-600/10 blur-[100px] rounded-full" />
            
            <h2 className="text-4xl md:text-5xl font-black text-white tracking-tight mb-8 relative z-10">
              Ready to grow your business?
            </h2>
            <p className="text-emerald-100/60 font-medium mb-12 max-w-xl mx-auto relative z-10 text-lg">
              Join thousands of small business owners who are already scaling their dreams with VillagKart.
            </p>
            <button 
              onClick={() => navigate('/register')}
              className="bg-white hover:bg-emerald-50 text-emerald-950 font-black text-xl px-12 py-6 rounded-2xl shadow-2xl transition-all active:scale-95 relative z-10"
            >
              Start Your Free Trial
            </button>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-20 border-t border-slate-100">
        <div className="max-w-7xl mx-auto px-6">
          <div className="flex flex-col md:flex-row justify-between items-center gap-10">
            <div className="flex items-center gap-3">
              <img src={logo} alt="VillagKart" className="h-8 w-auto opacity-50 grayscale" />
              <span className="text-lg font-black tracking-tighter text-slate-300">VillagKart</span>
            </div>
            <div className="flex items-center gap-8 text-slate-400 font-bold text-sm">
              <a href="#" className="hover:text-emerald-600">Privacy Policy</a>
              <a href="#" className="hover:text-emerald-600">Terms of Service</a>
              <a href="#" className="hover:text-emerald-600">Contact Support</a>
            </div>
            <div className="text-slate-300 font-black text-[10px] uppercase tracking-[0.3em]">
              © 2026 VillagKart Ecosystem
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default LandingPage;
