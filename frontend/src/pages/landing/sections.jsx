import { motion } from 'framer-motion';
import { CheckCircle2, Package, BarChart3, Users, LayoutDashboard, ShieldCheck, Smartphone, Store, Truck, Phone, Mail, MapPin, ChevronRight, Star, Quote, Camera, ArrowRight, Sparkles, Heart, Globe, Zap, Clock, CreditCard } from 'lucide-react';

const fadeUp = { hidden: { opacity: 0, y: 40 }, visible: { opacity: 1, y: 0, transition: { duration: 0.7 } } };
const stagger = { visible: { transition: { staggerChildren: 0.15 } } };

// ─── ABOUT US ───
export const AboutSection = () => (
  <section id="about" className="py-32 bg-white relative overflow-hidden">
    <div className="absolute -top-40 -right-40 w-96 h-96 bg-emerald-50 rounded-full blur-[120px] opacity-60" />
    <div className="max-w-7xl mx-auto px-6">
      <motion.div variants={stagger} initial="hidden" whileInView="visible" viewport={{ once: true }} className="grid lg:grid-cols-2 gap-20 items-center">
        <motion.div variants={fadeUp}>
          <span className="text-[10px] font-black text-emerald-600 uppercase tracking-[0.3em] mb-4 block">Our Story</span>
          <h2 className="text-5xl font-black text-slate-900 tracking-tight leading-[1.1] mb-6">
            Born in <span className="text-emerald-600">Rural India.</span><br />Built for <span className="text-orange-500">Every Business.</span>
          </h2>
          <p className="text-slate-500 text-lg leading-relaxed mb-8">
            VillagKart started with a simple mission — to bring enterprise-grade technology to the smallest businesses in India. From kirana stores to street vendors, we believe every entrepreneur deserves powerful tools to grow.
          </p>
          <div className="grid grid-cols-2 gap-6">
            {[{ n: '10K+', l: 'Active Businesses' }, { n: '50+', l: 'Cities' }, { n: '₹50L+', l: 'Daily GMV' }, { n: '99.9%', l: 'Uptime' }].map((s, i) => (
              <div key={i} className="p-5 bg-slate-50 rounded-2xl">
                <p className="text-2xl font-black text-slate-900">{s.n}</p>
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-1">{s.l}</p>
              </div>
            ))}
          </div>
        </motion.div>
        <motion.div variants={fadeUp} className="relative">
          <div className="bg-emerald-600 rounded-[3rem] p-12 text-white relative overflow-hidden">
            <div className="absolute -top-10 -right-10 w-40 h-40 bg-white/10 rounded-full blur-2xl" />
            <Sparkles className="w-12 h-12 mb-6 text-emerald-200" />
            <h3 className="text-3xl font-black mb-4">Our Vision</h3>
            <p className="text-emerald-100 text-lg leading-relaxed mb-8">To digitally empower 1 million small businesses across rural and semi-urban India by 2030.</p>
            <div className="space-y-4">
              {['AI-Powered Insights', 'Zero Learning Curve', 'Works Offline', 'Multi-language Support'].map((v, i) => (
                <div key={i} className="flex items-center gap-3">
                  <CheckCircle2 size={18} className="text-emerald-300 shrink-0" />
                  <span className="font-bold text-sm">{v}</span>
                </div>
              ))}
            </div>
          </div>
        </motion.div>
      </motion.div>
    </div>
  </section>
);

// ─── PRODUCTS ───
export const ProductsSection = () => {
  const products = [
    { icon: LayoutDashboard, title: 'Smart POS', desc: 'Lightning-fast billing with thermal print, WhatsApp invoicing, and split payments.', color: 'emerald' },
    { icon: Package, title: 'Inventory Engine', desc: 'Real-time stock tracking with low-stock alerts, batch management, and supplier integration.', color: 'blue' },
    { icon: BarChart3, title: 'Business Analytics', desc: 'Actionable dashboards with daily P&L, trend analysis, and predictive forecasting.', color: 'violet' },
    { icon: Users, title: 'CRM & Udhar', desc: 'Customer credit management, purchase history tracking, and automated reminders.', color: 'amber' },
    { icon: Truck, title: 'Fleet & Routes', desc: 'Manage delivery vehicles, optimize routes, and track agents in real-time.', color: 'rose' },
    { icon: ShieldCheck, title: 'Role Access', desc: 'Granular permissions for owners, managers, and staff with full audit trails.', color: 'cyan' },
  ];
  const colors = { emerald: 'bg-emerald-50 text-emerald-600 border-emerald-100', blue: 'bg-blue-50 text-blue-600 border-blue-100', violet: 'bg-violet-50 text-violet-600 border-violet-100', amber: 'bg-amber-50 text-amber-600 border-amber-100', rose: 'bg-rose-50 text-rose-600 border-rose-100', cyan: 'bg-cyan-50 text-cyan-600 border-cyan-100' };
  return (
    <section id="products" className="py-32 bg-[#FAFAFA]">
      <div className="max-w-7xl mx-auto px-6">
        <motion.div initial="hidden" whileInView="visible" viewport={{ once: true }} variants={fadeUp} className="text-center mb-20">
          <span className="text-[10px] font-black text-emerald-600 uppercase tracking-[0.3em] mb-4 block">Product Suite</span>
          <h2 className="text-5xl font-black text-slate-900 tracking-tight mb-4">Everything You Need.<br /><span className="text-emerald-600">Nothing You Don't.</span></h2>
          <p className="text-slate-500 font-medium text-lg max-w-2xl mx-auto">Six powerful modules working together seamlessly to run your entire business.</p>
        </motion.div>
        <motion.div variants={stagger} initial="hidden" whileInView="visible" viewport={{ once: true }} className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {products.map((p, i) => (
            <motion.div key={i} variants={fadeUp} whileHover={{ y: -8, transition: { duration: 0.3 } }} className="bg-white p-8 rounded-[2rem] border border-slate-100 hover:border-emerald-100 hover:shadow-xl hover:shadow-emerald-50 transition-all group cursor-pointer">
              <div className={`w-14 h-14 rounded-2xl ${colors[p.color]} border flex items-center justify-center mb-6 group-hover:scale-110 transition-transform`}>
                <p.icon size={24} />
              </div>
              <h3 className="text-xl font-black text-slate-900 mb-3">{p.title}</h3>
              <p className="text-slate-500 text-sm leading-relaxed mb-4">{p.desc}</p>
              <span className="text-emerald-600 text-xs font-black uppercase tracking-widest flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                Learn more <ArrowRight size={12} />
              </span>
            </motion.div>
          ))}
        </motion.div>
      </div>
    </section>
  );
};

// ─── PRICING ───
export const PricingSection = () => {
  const plans = [
    { name: 'Starter', price: '₹0', period: '/forever', features: ['1 Store', 'Basic POS', 'Simple Inventory', 'Daily Reports', 'Email Support'], cta: 'Start Free' },
    { name: 'Growth', price: '₹499', period: '/month', features: ['3 Stores', 'Advanced POS + UPI', 'Full Inventory', 'Udhar System', 'Supplier Mgmt', 'Priority Support'], highlight: true, cta: 'Most Popular' },
    { name: 'Enterprise', price: '₹999', period: '/month', features: ['Unlimited Stores', 'Multi-user Roles', 'Advanced Analytics', 'Fleet Management', 'Custom Branding', 'Dedicated Manager'], cta: 'Contact Sales' },
  ];
  return (
    <section id="pricing" className="py-32 bg-white">
      <div className="max-w-7xl mx-auto px-6">
        <motion.div initial="hidden" whileInView="visible" viewport={{ once: true }} variants={fadeUp} className="text-center mb-20">
          <span className="text-[10px] font-black text-emerald-600 uppercase tracking-[0.3em] mb-4 block">Pricing</span>
          <h2 className="text-5xl font-black text-slate-900 tracking-tight mb-4">Simple. Transparent. <span className="text-emerald-600">Fair.</span></h2>
          <p className="text-slate-500 font-medium text-lg">No hidden fees. Cancel anytime. Start free today.</p>
        </motion.div>
        <motion.div variants={stagger} initial="hidden" whileInView="visible" viewport={{ once: true }} className="grid md:grid-cols-3 gap-8 max-w-5xl mx-auto">
          {plans.map((p, i) => (
            <motion.div key={i} variants={fadeUp} className={`p-10 rounded-[2.5rem] border relative ${p.highlight ? 'border-emerald-500 bg-emerald-600 text-white shadow-2xl shadow-emerald-200 scale-105' : 'border-slate-100 bg-white'}`}>
              {p.highlight && <span className="absolute -top-4 left-1/2 -translate-x-1/2 px-4 py-1.5 bg-orange-500 text-white text-[9px] font-black uppercase tracking-widest rounded-full">Best Value</span>}
              <h3 className={`text-xl font-black mb-2 ${p.highlight ? '' : 'text-slate-900'}`}>{p.name}</h3>
              <div className="flex items-baseline gap-1 mb-8">
                <span className={`text-5xl font-black ${p.highlight ? '' : 'text-slate-900'}`}>{p.price}</span>
                <span className={`font-bold ${p.highlight ? 'text-emerald-100' : 'text-slate-400'}`}>{p.period}</span>
              </div>
              <ul className="space-y-3 mb-10">
                {p.features.map((f, j) => (
                  <li key={j} className={`flex items-center gap-3 text-sm font-bold ${p.highlight ? 'text-emerald-50' : 'text-slate-600'}`}>
                    <CheckCircle2 size={16} className={p.highlight ? 'text-emerald-200' : 'text-emerald-500'} />
                    {f}
                  </li>
                ))}
              </ul>
              <button className={`w-full py-4 rounded-2xl font-black transition-all active:scale-95 ${p.highlight ? 'bg-white text-emerald-700 hover:bg-emerald-50' : 'bg-slate-900 text-white hover:bg-slate-800'}`}>
                {p.cta}
              </button>
            </motion.div>
          ))}
        </motion.div>
      </div>
    </section>
  );
};

// ─── CUSTOMER STORIES ───
export const StoriesSection = () => {
  const stories = [
    { name: 'Ramesh Kumar', role: 'Kirana Store Owner, Madhapur', quote: 'VillagKart transformed my shop. I went from paper ledgers to digital billing in one day. My sales tracking is now 100% accurate.', rating: 5 },
    { name: 'Priya Sharma', role: 'Vegetable Vendor, HiTech City', quote: 'The Udhar system alone saved me ₹15,000 monthly in uncollected dues. Now every credit is tracked automatically.', rating: 5 },
    { name: 'Mohammed Arif', role: 'General Store, Raidurg', quote: 'Fleet management helped me expand to 3 delivery routes. My revenue grew 40% in just 2 months using VillagKart.', rating: 5 },
  ];
  return (
    <section id="stories" className="py-32 bg-slate-950 text-white relative overflow-hidden">
      <div className="absolute top-0 left-0 w-full h-full">
        <div className="absolute top-20 left-20 w-72 h-72 bg-emerald-600/10 rounded-full blur-[100px]" />
        <div className="absolute bottom-20 right-20 w-96 h-96 bg-orange-600/5 rounded-full blur-[120px]" />
      </div>
      <div className="max-w-7xl mx-auto px-6 relative z-10">
        <motion.div initial="hidden" whileInView="visible" viewport={{ once: true }} variants={fadeUp} className="text-center mb-20">
          <span className="text-[10px] font-black text-emerald-400 uppercase tracking-[0.3em] mb-4 block">Customer Stories</span>
          <h2 className="text-5xl font-black tracking-tight mb-4">Loved by <span className="text-emerald-400">Thousands.</span></h2>
          <p className="text-slate-400 font-medium text-lg">Real businesses. Real growth. Real stories.</p>
        </motion.div>
        <motion.div variants={stagger} initial="hidden" whileInView="visible" viewport={{ once: true }} className="grid md:grid-cols-3 gap-8">
          {stories.map((s, i) => (
            <motion.div key={i} variants={fadeUp} className="bg-white/5 backdrop-blur-md border border-white/10 rounded-[2.5rem] p-8 hover:bg-white/10 transition-all">
              <div className="flex gap-1 mb-6">{[...Array(s.rating)].map((_, j) => <Star key={j} size={16} className="text-amber-400 fill-amber-400" />)}</div>
              <p className="text-slate-200 text-sm leading-relaxed mb-8 italic">"{s.quote}"</p>
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-emerald-600 rounded-full flex items-center justify-center font-black text-lg">{s.name[0]}</div>
                <div>
                  <p className="font-black text-sm">{s.name}</p>
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{s.role}</p>
                </div>
              </div>
            </motion.div>
          ))}
        </motion.div>
      </div>
    </section>
  );
};

// ─── BLOG PREVIEW ───
export const BlogSection = () => {
  const posts = [
    { tag: 'Growth', title: 'How to Increase Your Kirana Store Revenue by 30%', excerpt: 'Proven strategies from top-performing VillagKart merchants to boost daily sales.', date: 'Apr 25, 2026' },
    { tag: 'Technology', title: 'Why Every Small Business Needs Digital Billing', excerpt: 'The hidden costs of paper billing and how digital POS pays for itself in 30 days.', date: 'Apr 20, 2026' },
    { tag: 'Success Story', title: 'From ₹5K to ₹5L Monthly: Priya\'s Journey', excerpt: 'How a Jaipur vegetable vendor used VillagKart to scale her business 100x.', date: 'Apr 15, 2026' },
  ];
  return (
    <section id="blog" className="py-32 bg-[#FAFAFA]">
      <div className="max-w-7xl mx-auto px-6">
        <motion.div initial="hidden" whileInView="visible" viewport={{ once: true }} variants={fadeUp} className="flex flex-col md:flex-row md:items-end justify-between mb-16">
          <div>
            <span className="text-[10px] font-black text-emerald-600 uppercase tracking-[0.3em] mb-4 block">Blog & Insights</span>
            <h2 className="text-5xl font-black text-slate-900 tracking-tight">Latest from <span className="text-emerald-600">VillagKart</span></h2>
          </div>
          <a href="#" className="text-emerald-600 font-black text-sm flex items-center gap-2 mt-4 md:mt-0 hover:gap-3 transition-all">View All Posts <ArrowRight size={14} /></a>
        </motion.div>
        <motion.div variants={stagger} initial="hidden" whileInView="visible" viewport={{ once: true }} className="grid md:grid-cols-3 gap-8">
          {posts.map((p, i) => (
            <motion.article key={i} variants={fadeUp} className="bg-white rounded-[2rem] border border-slate-100 overflow-hidden group hover:shadow-xl hover:shadow-emerald-50 transition-all cursor-pointer">
              <div className="h-48 bg-gradient-to-br from-emerald-100 to-emerald-50 flex items-center justify-center">
                <Globe size={48} className="text-emerald-300 group-hover:scale-110 transition-transform" />
              </div>
              <div className="p-8">
                <div className="flex items-center gap-3 mb-4">
                  <span className="text-[9px] font-black text-emerald-600 bg-emerald-50 px-3 py-1 rounded-full uppercase tracking-widest">{p.tag}</span>
                  <span className="text-[10px] font-bold text-slate-400">{p.date}</span>
                </div>
                <h3 className="text-lg font-black text-slate-900 mb-2 group-hover:text-emerald-600 transition-colors">{p.title}</h3>
                <p className="text-slate-500 text-sm leading-relaxed">{p.excerpt}</p>
              </div>
            </motion.article>
          ))}
        </motion.div>
      </div>
    </section>
  );
};

// ─── GALLERY ───
export const GallerySection = () => {
  const items = [
    { label: 'POS Dashboard', gradient: 'from-emerald-500 to-emerald-700' },
    { label: 'Inventory View', gradient: 'from-blue-500 to-blue-700' },
    { label: 'Analytics Suite', gradient: 'from-violet-500 to-violet-700' },
    { label: 'Mobile App', gradient: 'from-amber-500 to-amber-700' },
    { label: 'Fleet Tracking', gradient: 'from-rose-500 to-rose-700' },
    { label: 'CRM Module', gradient: 'from-cyan-500 to-cyan-700' },
  ];
  return (
    <section id="gallery" className="py-32 bg-white">
      <div className="max-w-7xl mx-auto px-6">
        <motion.div initial="hidden" whileInView="visible" viewport={{ once: true }} variants={fadeUp} className="text-center mb-16">
          <span className="text-[10px] font-black text-emerald-600 uppercase tracking-[0.3em] mb-4 block">Gallery</span>
          <h2 className="text-5xl font-black text-slate-900 tracking-tight mb-4">See It in <span className="text-emerald-600">Action</span></h2>
          <p className="text-slate-500 font-medium text-lg">A glimpse into the VillagKart experience.</p>
        </motion.div>
        <motion.div variants={stagger} initial="hidden" whileInView="visible" viewport={{ once: true }} className="grid grid-cols-2 md:grid-cols-3 gap-4">
          {items.map((item, i) => (
            <motion.div key={i} variants={fadeUp} whileHover={{ scale: 1.03 }} className={`aspect-[4/3] bg-gradient-to-br ${item.gradient} rounded-[2rem] flex items-end p-6 cursor-pointer relative overflow-hidden group`}>
              <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-all" />
              <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 opacity-10">
                <Camera size={64} className="text-white" />
              </div>
              <p className="text-white font-black text-sm uppercase tracking-widest relative z-10">{item.label}</p>
            </motion.div>
          ))}
        </motion.div>
      </div>
    </section>
  );
};

// ─── CONTACT ───
export const ContactSection = () => (
  <section id="contact" className="py-32 bg-[#FAFAFA]">
    <div className="max-w-7xl mx-auto px-6">
      <motion.div initial="hidden" whileInView="visible" viewport={{ once: true }} variants={stagger} className="grid lg:grid-cols-2 gap-16">
        <motion.div variants={fadeUp}>
          <span className="text-[10px] font-black text-emerald-600 uppercase tracking-[0.3em] mb-4 block">Get in Touch</span>
          <h2 className="text-5xl font-black text-slate-900 tracking-tight mb-6">Let's Build<br /><span className="text-emerald-600">Together.</span></h2>
          <p className="text-slate-500 text-lg leading-relaxed mb-10">Have questions? Need a custom plan? Our team is ready to help you grow.</p>
          <div className="space-y-6">
            {[
              { icon: Mail, label: 'support@villagkart.com' },
              { icon: Phone, label: '+91 98765 43210' },
              { icon: MapPin, label: 'Hyderabad, Telangana, India' },
            ].map((c, i) => (
              <div key={i} className="flex items-center gap-4">
                <div className="w-12 h-12 bg-emerald-50 text-emerald-600 rounded-2xl flex items-center justify-center border border-emerald-100"><c.icon size={20} /></div>
                <span className="font-bold text-slate-700">{c.label}</span>
              </div>
            ))}
          </div>
        </motion.div>
        <motion.div variants={fadeUp}>
          <div className="bg-white rounded-[2.5rem] border border-slate-100 p-10 shadow-sm">
            <div className="space-y-5">
              <div className="grid grid-cols-2 gap-4">
                <input placeholder="First Name" className="px-5 py-4 bg-slate-50 rounded-2xl border border-slate-100 text-sm font-bold outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-200 placeholder:text-slate-300" />
                <input placeholder="Last Name" className="px-5 py-4 bg-slate-50 rounded-2xl border border-slate-100 text-sm font-bold outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-200 placeholder:text-slate-300" />
              </div>
              <input placeholder="Email Address" className="w-full px-5 py-4 bg-slate-50 rounded-2xl border border-slate-100 text-sm font-bold outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-200 placeholder:text-slate-300" />
              <input placeholder="Phone Number" className="w-full px-5 py-4 bg-slate-50 rounded-2xl border border-slate-100 text-sm font-bold outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-200 placeholder:text-slate-300" />
              <textarea placeholder="Your Message..." rows={4} className="w-full px-5 py-4 bg-slate-50 rounded-2xl border border-slate-100 text-sm font-bold outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-200 placeholder:text-slate-300 resize-none" />
              <button className="w-full py-5 bg-emerald-600 text-white font-black rounded-2xl hover:bg-emerald-700 transition-all active:scale-[0.98] shadow-lg shadow-emerald-200 text-sm uppercase tracking-widest">
                Send Message
              </button>
            </div>
          </div>
        </motion.div>
      </motion.div>
    </div>
  </section>
);
