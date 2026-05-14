import { useNavigate } from 'react-router-dom';
import { useState, useEffect } from 'react';
import { motion, useScroll, useTransform } from 'framer-motion';
import { ChevronRight, Menu, X, ArrowRight, Heart } from 'lucide-react';
import logo from '../assets/logooo.png';
import { AboutSection, ProductsSection, PricingSection, StoriesSection, BlogSection, GallerySection, ContactSection } from './landing/sections';

const navLinks = [
  { label: 'Home', href: '#home' },
  { label: 'About Us', href: '#about' },
  { label: 'Products', href: '#products' },
  { label: 'Pricing', href: '#pricing' },
  { label: 'Stories', href: '#stories' },
  { label: 'Blog', href: '#blog' },
  { label: 'Gallery', href: '#gallery' },
  { label: 'Contact', href: '#contact' },
];

const LandingPage = () => {
  const navigate = useNavigate();
  const [mobileMenu, setMobileMenu] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const { scrollYProgress } = useScroll();
  const heroOpacity = useTransform(scrollYProgress, [0, 0.15], [1, 0]);
  const heroScale = useTransform(scrollYProgress, [0, 0.15], [1, 0.95]);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 50);
    window.addEventListener('scroll', onScroll);
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  const scrollTo = (href) => {
    setMobileMenu(false);
    const el = document.querySelector(href);
    if (el) el.scrollIntoView({ behavior: 'smooth' });
  };

  return (
    <div className="min-h-screen bg-[#FDFCFB] text-slate-900 selection:bg-emerald-100 selection:text-emerald-900 overflow-x-hidden">
      {/* ── Scroll Progress Bar ── */}
      <motion.div className="fixed top-0 left-0 right-0 h-[3px] bg-emerald-500 origin-left z-[60]" style={{ scaleX: scrollYProgress }} />

      {/* ── Navigation ── */}
      <nav className={`fixed top-0 left-0 right-0 z-50 transition-all duration-500 ${scrolled ? 'bg-white/90 backdrop-blur-xl shadow-sm border-b border-slate-100' : 'bg-transparent'}`}>
        <div className="max-w-7xl mx-auto px-6 h-20 flex items-center justify-between">
          <div className="flex items-center gap-3 cursor-pointer" onClick={() => scrollTo('#home')}>
            <img src={logo} alt="VillagKart" className="h-10 w-auto" />
            <span className="text-xl font-black tracking-tighter text-emerald-950"></span>
          </div>
          <div className="hidden lg:flex items-center gap-1">
            {navLinks.map((link) => (
              <button key={link.href} onClick={() => scrollTo(link.href)} className="text-[11px] font-black text-slate-500 hover:text-emerald-600 transition-colors px-4 py-2 rounded-xl hover:bg-emerald-50 uppercase tracking-widest">
                {link.label}
              </button>
            ))}
          </div>
          <div className="hidden lg:flex items-center gap-3">
            <button onClick={() => navigate('/login')} className="text-sm font-bold text-slate-600 hover:text-emerald-600 transition-colors px-5 py-2.5">Login</button>
            <button onClick={() => navigate('/register')} className="bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-black px-7 py-3 rounded-full shadow-lg shadow-emerald-200 transition-all active:scale-95">Start Free</button>
          </div>
          <button onClick={() => setMobileMenu(!mobileMenu)} className="lg:hidden w-10 h-10 flex items-center justify-center text-slate-700">
            {mobileMenu ? <X size={24} /> : <Menu size={24} />}
          </button>
        </div>
        {/* Mobile Menu */}
        {mobileMenu && (
          <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="lg:hidden bg-white border-t border-slate-100 p-6 space-y-2 shadow-xl">
            {navLinks.map((link) => (
              <button key={link.href} onClick={() => scrollTo(link.href)} className="block w-full text-left px-4 py-3 text-sm font-black text-slate-700 hover:bg-emerald-50 hover:text-emerald-600 rounded-xl transition-all uppercase tracking-widest">
                {link.label}
              </button>
            ))}
            <div className="pt-4 grid grid-cols-2 gap-3">
              <button onClick={() => navigate('/login')} className="py-3 bg-slate-100 text-slate-900 font-black rounded-xl text-sm">Login</button>
              <button onClick={() => navigate('/register')} className="py-3 bg-emerald-600 text-white font-black rounded-xl text-sm">Start Free</button>
            </div>
          </motion.div>
        )}
      </nav>

      {/* ── Hero ── */}
      <section id="home" className="relative min-h-screen flex items-center justify-center overflow-hidden">
        <div className="absolute inset-0 -z-10">
          <div className="absolute top-[-20%] left-[-10%] w-[60vw] h-[60vw] rounded-full bg-emerald-50/60 blur-[150px]" />
          <div className="absolute bottom-[-10%] right-[-5%] w-[45vw] h-[45vw] rounded-full bg-orange-50/50 blur-[120px]" />
          <div className="absolute top-[30%] right-[20%] w-[20vw] h-[20vw] rounded-full bg-violet-50/30 blur-[80px]" />
        </div>

        <motion.div style={{ opacity: heroOpacity, scale: heroScale }} className="max-w-7xl mx-auto px-6 pt-20 text-center">
          <motion.div initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.8, delay: 0.2 }}>
            <span className="inline-flex items-center gap-2 px-5 py-2 rounded-full bg-emerald-50 text-emerald-700 text-xs font-black uppercase tracking-[0.2em] mb-8 border border-emerald-100">
              <span className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse" />
              Empowering 10,000+ Businesses
            </span>
          </motion.div>

          <motion.h1 initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.8, delay: 0.4 }} className="text-6xl md:text-8xl font-black text-slate-900 tracking-tight leading-[1.05] mb-8">
            Digitize Every<br />
            <span className="bg-gradient-to-r from-emerald-600 to-emerald-500 bg-clip-text text-transparent">Small Business.</span><br />
            <span className="text-slate-300 text-5xl md:text-6xl">Scale Every Dream.</span>
          </motion.h1>

          <motion.p initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.8, delay: 0.6 }} className="max-w-2xl mx-auto text-lg md:text-xl text-slate-500 font-medium leading-relaxed mb-12">
            The all-in-one platform for street vendors, kirana stores, and small shops to manage POS, inventory, fleet, and finances — effortlessly.
          </motion.p>

          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.8, delay: 0.8 }} className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <button onClick={() => navigate('/register')} className="w-full sm:w-auto bg-emerald-600 hover:bg-emerald-700 text-white font-black text-lg px-10 py-5 rounded-2xl shadow-2xl shadow-emerald-200 transition-all active:scale-95 flex items-center justify-center gap-3 group">
              Create Free Account
              <ChevronRight size={20} className="group-hover:translate-x-1 transition-transform" />
            </button>
            <button onClick={() => navigate('/login')} className="w-full sm:w-auto bg-white hover:bg-slate-50 text-slate-900 font-black text-lg px-10 py-5 rounded-2xl border-2 border-slate-100 transition-all flex items-center justify-center gap-2">
              Login to Dashboard
            </button>
          </motion.div>

          {/* Floating badges */}
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 1.2, duration: 1 }} className="flex items-center justify-center gap-6 mt-16 text-slate-400">
            {['POS Billing', 'Inventory', 'Analytics', 'Fleet Mgmt', 'CRM'].map((t, i) => (
              <span key={i} className="hidden md:inline-block text-[9px] font-black uppercase tracking-[0.2em] px-4 py-2 bg-white rounded-full border border-slate-100 shadow-sm hover:border-emerald-100 hover:text-emerald-600 transition-all cursor-default">
                {t}
              </span>
            ))}
          </motion.div>
        </motion.div>

        {/* Scroll indicator */}
        <motion.div animate={{ y: [0, 10, 0] }} transition={{ repeat: Infinity, duration: 2 }} className="absolute bottom-10 left-1/2 -translate-x-1/2">
          <div className="w-6 h-10 border-2 border-slate-300 rounded-full flex justify-center pt-2">
            <div className="w-1.5 h-1.5 bg-emerald-500 rounded-full" />
          </div>
        </motion.div>
      </section>

      {/* ── All Sections ── */}
      <AboutSection />
      <ProductsSection />
      <PricingSection />
      <StoriesSection />
      <BlogSection />
      <GallerySection />
      <ContactSection />

      {/* ── CTA Banner ── */}
      <section className="py-32">
        <div className="max-w-5xl mx-auto px-6">
          <motion.div initial={{ opacity: 0, y: 30 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} className="bg-emerald-950 rounded-[3rem] p-12 md:p-20 text-center relative overflow-hidden">
            <div className="absolute top-0 right-0 w-80 h-80 bg-emerald-600/20 blur-[120px] rounded-full" />
            <div className="absolute bottom-0 left-0 w-64 h-64 bg-orange-600/10 blur-[100px] rounded-full" />
            <h2 className="text-4xl md:text-6xl font-black text-white tracking-tight mb-8 relative z-10">
              Ready to grow<br />your business?
            </h2>
            <p className="text-emerald-100/50 font-medium mb-12 max-w-xl mx-auto relative z-10 text-lg">
              Join thousands of entrepreneurs already scaling their dreams with VillagKart.
            </p>
            <button onClick={() => navigate('/register')} className="bg-white hover:bg-emerald-50 text-emerald-950 font-black text-xl px-12 py-6 rounded-2xl shadow-2xl transition-all active:scale-95 relative z-10 group inline-flex items-center gap-3">
              Start Free Trial
              <ArrowRight size={22} className="group-hover:translate-x-1 transition-transform" />
            </button>
          </motion.div>
        </div>
      </section>

      {/* ── Footer ── */}
      <footer className="py-20 border-t border-slate-100 bg-white">
        <div className="max-w-7xl mx-auto px-6">
          <div className="grid md:grid-cols-4 gap-12 mb-16">
            <div className="md:col-span-1">
              <div className="flex items-center gap-3 mb-4">
                <img src={logo} alt="VillagKart" className="h-8 w-auto" />
                <span className="text-lg font-black tracking-tighter text-slate-900">VillagKart</span>
              </div>
              <p className="text-sm text-slate-400 leading-relaxed">Empowering small businesses across India with enterprise-grade digital tools.</p>
            </div>
            {[
              { title: 'Product', links: ['POS Billing', 'Inventory', 'Analytics', 'Fleet Mgmt', 'CRM'] },
              { title: 'Company', links: ['About Us', 'Careers', 'Blog', 'Press Kit'] },
              { title: 'Support', links: ['Help Center', 'Contact', 'Privacy Policy', 'Terms of Service'] },
            ].map((col, i) => (
              <div key={i}>
                <p className="text-[10px] font-black text-slate-900 uppercase tracking-[0.2em] mb-4">{col.title}</p>
                <ul className="space-y-3">
                  {col.links.map((link, j) => (
                    <li key={j}><a href="#" className="text-sm font-medium text-slate-400 hover:text-emerald-600 transition-colors">{link}</a></li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
          <div className="border-t border-slate-100 pt-8 flex flex-col md:flex-row justify-between items-center gap-4">
            <p className="text-slate-300 font-black text-[10px] uppercase tracking-[0.3em]">© 2026 VillagKart Ecosystem. All Rights Reserved.</p>
            {/* <p className="text-slate-300 text-[10px] font-bold flex items-center gap-1">Made with <Heart size={10} className="text-rose-400 fill-rose-400" /> in India</p> */}
          </div>
        </div>
      </footer>
    </div>
  );
};

export default LandingPage;
