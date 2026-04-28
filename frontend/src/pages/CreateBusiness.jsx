import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Store, 
  MapPin, 
  Phone, 
  Clock, 
  ChevronRight, 
  ChevronLeft, 
  CheckCircle2, 
  Smartphone, 
  Globe, 
  ShieldCheck,
  Package,
  Truck,
  CreditCard,
  Briefcase,
  User,
  Image as ImageIcon,
  ArrowLeft,
  LayoutDashboard
} from 'lucide-react';
import toast from 'react-hot-toast';
import { storeAPI } from '../services/api';
import logo from '../assets/VillagKart_Logo.png';

const steps = [
  { id: 1, title: 'Nature of Business', icon: <Briefcase className="w-5 h-5" /> },
  { id: 2, title: 'Basic Info', icon: <Store className="w-5 h-5" /> },
  { id: 3, title: 'Contact Details', icon: <Phone className="w-5 h-5" /> },
  { id: 4, title: 'Address & Location', icon: <MapPin className="w-5 h-5" /> },
  { id: 5, title: 'Operations', icon: <Clock className="w-5 h-5" /> },
  { id: 6, title: 'Plan Selection', icon: <ShieldCheck className="w-5 h-5" /> }
];

export default function CreateBusiness() {
  const navigate = useNavigate();
  const [currentStep, setCurrentStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    // Step 1: Nature
    nature: '', // Product, Service, Both
    // Step 2: Basic Info
    name: '',
    type: '', // Individual, Company, Partnership
    category: '',
    subcategory: '',
    description: '',
    // Step 3: Contact
    contactName: '',
    contactMobile: '',
    contactEmail: '',
    role: 'Owner',
    whatsapp: '',
    // Step 4: Address
    address: '',
    area: '',
    city: '',
    state: 'AP',
    pincode: '',
    // Step 5: Operations
    workingDays: [],
    openingTime: '09:00',
    closingTime: '21:00',
    deliveryAvailable: false,
    pickupAvailable: true,
    paymentModes: ['Cash', 'UPI'],
    // Step 6: Plan
    selectedPlan: 'Standard'
  });

  const nextStep = () => setCurrentStep(prev => Math.min(prev + 1, steps.length));
  const prevStep = () => setCurrentStep(prev => Math.max(prev - 1, 1));

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
  };

  const handleCreateBusiness = async () => {
    setLoading(true);
    try {
      // Map PRD fields to schema fields
      const storeData = {
        name: formData.name,
        code: formData.name.substring(0, 3).toUpperCase() + Math.floor(Math.random() * 1000),
        address: `${formData.address}, ${formData.area}, ${formData.city}, ${formData.state} - ${formData.pincode}`,
        contactEmail: formData.contactEmail,
        contactPhone: formData.contactMobile,
        stateCode: formData.state,
        hubCode: formData.city.substring(0, 3).toUpperCase(),
        // Additional info can be sent if backend supports it, or ignored for now
      };

      await storeAPI.create(storeData);
      toast.success("Business created successfully!");
      navigate('/tenant');
    } catch (error) {
      toast.error(error.response?.data?.message || "Failed to create business");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col items-center py-8 px-6 overflow-x-hidden relative">
      {/* Fixed Back Button */}
      <div className="fixed top-8 left-8 z-50">
        <Link 
          to="/tenant" 
          className="flex items-center gap-2 px-6 py-3 bg-white rounded-2xl shadow-xl shadow-slate-200 border border-slate-100 text-slate-600 font-black text-xs uppercase tracking-widest hover:text-emerald-600 transition-all active:scale-95 group"
        >
          <LayoutDashboard size={16} className="group-hover:rotate-12 transition-transform" />
          Back to Dashboard
        </Link>
      </div>

      {/* Background Decor */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden -z-10">
        <div className="absolute top-[-10%] right-[-10%] w-[40vw] h-[40vw] bg-emerald-100/50 blur-[120px] rounded-full" />
        <div className="absolute bottom-[-10%] left-[-10%] w-[40vw] h-[40vw] bg-orange-100/30 blur-[100px] rounded-full" />
      </div>

      <div className="w-full max-w-4xl pt-12">
        {/* Header */}
        <div className="flex flex-col items-center mb-12">
          <img src={logo} alt="VillagKart" className="h-16 w-auto mb-6" />
          <h1 className="text-4xl font-black text-emerald-950 tracking-tighter text-center">
            Set Up Your Business
          </h1>
          <p className="text-emerald-600/60 font-bold mt-2 uppercase tracking-widest text-sm text-center">
            Build your digital dashboard in minutes
          </p>
        </div>

        {/* Step Progress */}
        <div className="relative mb-16 hidden md:block">
          <div className="absolute top-1/2 left-0 w-full h-1 bg-emerald-100 -translate-y-1/2 z-0" />
          <div 
            className="absolute top-1/2 left-0 h-1 bg-emerald-600 -translate-y-1/2 z-0 transition-all duration-500" 
            style={{ width: `${((currentStep - 1) / (steps.length - 1)) * 100}%` }}
          />
          <div className="relative z-10 flex justify-between">
            {steps.map((step) => (
              <div key={step.id} className="flex flex-col items-center">
                <div 
                  className={`w-12 h-12 rounded-full flex items-center justify-center transition-all duration-500 border-4 ${
                    currentStep >= step.id ? 'bg-emerald-600 border-white text-white shadow-xl shadow-emerald-200' : 'bg-white border-emerald-50 text-emerald-200'
                  }`}
                >
                  {currentStep > step.id ? <CheckCircle2 className="w-6 h-6" /> : step.icon}
                </div>
                <span className={`mt-3 text-[10px] font-black uppercase tracking-wider ${currentStep >= step.id ? 'text-emerald-900' : 'text-emerald-200'}`}>
                  {step.title}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Mobile Progress */}
        <div className="md:hidden flex items-center justify-between mb-8 px-4">
           <div className="flex flex-col">
              <span className="text-[10px] font-black text-emerald-600 uppercase tracking-widest">Step {currentStep} of {steps.length}</span>
              <span className="text-lg font-black text-emerald-950">{steps[currentStep-1].title}</span>
           </div>
           <div className="w-12 h-12 rounded-full border-4 border-emerald-100 flex items-center justify-center relative">
              <svg className="w-10 h-10 -rotate-90">
                <circle cx="20" cy="20" r="16" fill="transparent" stroke="currentColor" strokeWidth="4" className="text-emerald-50" />
                <circle cx="20" cy="20" r="16" fill="transparent" stroke="currentColor" strokeWidth="4" strokeDasharray={100.5} strokeDashoffset={100.5 - (currentStep/steps.length)*100.5} className="text-emerald-600" />
              </svg>
              <span className="absolute inset-0 flex items-center justify-center text-xs font-black">{currentStep}</span>
           </div>
        </div>

        {/* Form Container */}
        <div className="glass bg-white/80 backdrop-blur-3xl rounded-[3rem] border border-white shadow-2xl p-8 md:p-12 relative overflow-hidden">
          <AnimatePresence mode="wait">
            <motion.div
              key={currentStep}
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.4 }}
            >
              {currentStep === 1 && (
                <div className="space-y-8">
                  <div className="text-center">
                    <h2 className="text-2xl font-black text-emerald-950 mb-2">What is the nature of your business?</h2>
                    <p className="text-slate-500 font-medium">Select the option that best describes your operations.</p>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    {[
                      { id: 'product', title: 'Product Selling', desc: 'Retail, Kirana, Wholesale', icon: <Package className="w-8 h-8" /> },
                      { id: 'service', title: 'Service Providing', desc: 'Salon, Mechanic, Consultant', icon: <Smartphone className="w-8 h-8" /> },
                      { id: 'both', title: 'Both', desc: 'Product + Services', icon: <Store className="w-8 h-8" /> }
                    ].map((opt) => (
                      <button
                        key={opt.id}
                        onClick={() => setFormData({...formData, nature: opt.id})}
                        className={`p-8 rounded-[2.5rem] border-2 transition-all flex flex-col items-center text-center gap-4 group ${
                          formData.nature === opt.id ? 'border-emerald-500 bg-emerald-50 shadow-xl shadow-emerald-100' : 'border-slate-100 hover:border-emerald-200 hover:bg-emerald-50/30'
                        }`}
                      >
                        <div className={`w-16 h-16 rounded-2xl flex items-center justify-center transition-all ${
                          formData.nature === opt.id ? 'bg-emerald-600 text-white' : 'bg-slate-50 text-slate-400 group-hover:text-emerald-500'
                        }`}>
                          {opt.icon}
                        </div>
                        <div>
                          <h3 className="font-black text-emerald-950">{opt.title}</h3>
                          <p className="text-xs text-slate-400 font-bold mt-1 uppercase tracking-tighter">{opt.desc}</p>
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {currentStep === 2 && (
                <div className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-2">
                      <label className="text-xs font-black uppercase tracking-widest text-emerald-800/40 ml-2">Business Name *</label>
                      <input
                        name="name"
                        value={formData.name}
                        onChange={handleChange}
                        placeholder="e.g. Sharma Kirana Store"
                        className="w-full px-6 py-4 rounded-2xl border border-slate-100 bg-slate-50 focus:bg-white focus:outline-none focus:ring-4 focus:ring-emerald-500/10 focus:border-emerald-500 transition-all font-bold text-emerald-950"
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-xs font-black uppercase tracking-widest text-emerald-800/40 ml-2">Business Type *</label>
                      <select
                        name="type"
                        value={formData.type}
                        onChange={handleChange}
                        className="w-full px-6 py-4 rounded-2xl border border-slate-100 bg-slate-50 focus:bg-white focus:outline-none focus:ring-4 focus:ring-emerald-500/10 focus:border-emerald-500 transition-all font-bold text-emerald-950"
                      >
                        <option value="">Select Type</option>
                        <option value="Individual">Individual / Proprietor</option>
                        <option value="Company">Company / LLP</option>
                        <option value="Partnership">Partnership</option>
                      </select>
                    </div>
                    <div className="space-y-2">
                      <label className="text-xs font-black uppercase tracking-widest text-emerald-800/40 ml-2">Category *</label>
                      <input
                        name="category"
                        value={formData.category}
                        onChange={handleChange}
                        placeholder="e.g. FMCG"
                        className="w-full px-6 py-4 rounded-2xl border border-slate-100 bg-slate-50 focus:bg-white focus:outline-none focus:ring-4 focus:ring-emerald-500/10 focus:border-emerald-500 transition-all font-bold text-emerald-950"
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-xs font-black uppercase tracking-widest text-emerald-800/40 ml-2">Subcategory</label>
                      <input
                        name="subcategory"
                        value={formData.subcategory}
                        onChange={handleChange}
                        placeholder="e.g. Retailer"
                        className="w-full px-6 py-4 rounded-2xl border border-slate-100 bg-slate-50 focus:bg-white focus:outline-none focus:ring-4 focus:ring-emerald-500/10 focus:border-emerald-500 transition-all font-bold text-emerald-950"
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs font-black uppercase tracking-widest text-emerald-800/40 ml-2">Short Description</label>
                    <textarea
                      name="description"
                      value={formData.description}
                      onChange={handleChange}
                      placeholder="Tell us a bit about your business..."
                      rows={3}
                      className="w-full px-6 py-4 rounded-2xl border border-slate-100 bg-slate-50 focus:bg-white focus:outline-none focus:ring-4 focus:ring-emerald-500/10 focus:border-emerald-500 transition-all font-bold text-emerald-950 resize-none"
                    />
                  </div>
                </div>
              )}

              {currentStep === 3 && (
                <div className="space-y-6">
                   <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-2">
                      <label className="text-xs font-black uppercase tracking-widest text-emerald-800/40 ml-2">Primary Contact Name *</label>
                      <input
                        name="contactName"
                        value={formData.contactName}
                        onChange={handleChange}
                        placeholder="Full Name"
                        className="w-full px-6 py-4 rounded-2xl border border-slate-100 bg-slate-50 focus:bg-white focus:outline-none focus:ring-4 focus:ring-emerald-500/10 focus:border-emerald-500 transition-all font-bold text-emerald-950"
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-xs font-black uppercase tracking-widest text-emerald-800/40 ml-2">Mobile Number *</label>
                      <input
                        name="contactMobile"
                        value={formData.contactMobile}
                        onChange={handleChange}
                        placeholder="+91"
                        className="w-full px-6 py-4 rounded-2xl border border-slate-100 bg-slate-50 focus:bg-white focus:outline-none focus:ring-4 focus:ring-emerald-500/10 focus:border-emerald-500 transition-all font-bold text-emerald-950"
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-xs font-black uppercase tracking-widest text-emerald-800/40 ml-2">Email ID *</label>
                      <input
                        name="contactEmail"
                        value={formData.contactEmail}
                        onChange={handleChange}
                        placeholder="email@example.com"
                        className="w-full px-6 py-4 rounded-2xl border border-slate-100 bg-slate-50 focus:bg-white focus:outline-none focus:ring-4 focus:ring-emerald-500/10 focus:border-emerald-500 transition-all font-bold text-emerald-950"
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-xs font-black uppercase tracking-widest text-emerald-800/40 ml-2">WhatsApp Number</label>
                      <input
                        name="whatsapp"
                        value={formData.whatsapp}
                        onChange={handleChange}
                        placeholder="WhatsApp Number (optional)"
                        className="w-full px-6 py-4 rounded-2xl border border-slate-100 bg-slate-50 focus:bg-white focus:outline-none focus:ring-4 focus:ring-emerald-500/10 focus:border-emerald-500 transition-all font-bold text-emerald-950"
                      />
                    </div>
                  </div>
                </div>
              )}

              {currentStep === 4 && (
                <div className="space-y-6">
                  <div className="space-y-2">
                    <label className="text-xs font-black uppercase tracking-widest text-emerald-800/40 ml-2">Full Address *</label>
                    <input
                      name="address"
                      value={formData.address}
                      onChange={handleChange}
                      placeholder="Shop No, Building, Street"
                      className="w-full px-6 py-4 rounded-2xl border border-slate-100 bg-slate-50 focus:bg-white focus:outline-none focus:ring-4 focus:ring-emerald-500/10 focus:border-emerald-500 transition-all font-bold text-emerald-950"
                    />
                  </div>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
                    <div className="space-y-2 col-span-2">
                      <label className="text-xs font-black uppercase tracking-widest text-emerald-800/40 ml-2">Area / Locality</label>
                      <input
                        name="area"
                        value={formData.area}
                        onChange={handleChange}
                        placeholder="e.g. Jubilee Hills"
                        className="w-full px-6 py-4 rounded-2xl border border-slate-100 bg-slate-50 focus:bg-white focus:outline-none focus:ring-4 focus:ring-emerald-500/10 focus:border-emerald-500 transition-all font-bold text-emerald-950"
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-xs font-black uppercase tracking-widest text-emerald-800/40 ml-2">City</label>
                      <input
                        name="city"
                        value={formData.city}
                        onChange={handleChange}
                        placeholder="City"
                        className="w-full px-6 py-4 rounded-2xl border border-slate-100 bg-slate-50 focus:bg-white focus:outline-none focus:ring-4 focus:ring-emerald-500/10 focus:border-emerald-500 transition-all font-bold text-emerald-950"
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-xs font-black uppercase tracking-widest text-emerald-800/40 ml-2">Pincode</label>
                      <input
                        name="pincode"
                        value={formData.pincode}
                        onChange={handleChange}
                        placeholder="6 Digits"
                        className="w-full px-6 py-4 rounded-2xl border border-slate-100 bg-slate-50 focus:bg-white focus:outline-none focus:ring-4 focus:ring-emerald-500/10 focus:border-emerald-500 transition-all font-bold text-emerald-950"
                      />
                    </div>
                  </div>
                  <div className="p-8 rounded-[2rem] bg-emerald-50 border border-emerald-100 flex items-center justify-between group cursor-pointer hover:bg-emerald-100 transition-all">
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 rounded-xl bg-emerald-600 text-white flex items-center justify-center shadow-lg shadow-emerald-200">
                        <MapPin className="w-6 h-6" />
                      </div>
                      <div>
                        <h4 className="font-black text-emerald-950 text-sm">Geo-Location Integration</h4>
                        <p className="text-[10px] font-bold text-emerald-600 uppercase tracking-widest">Auto-detect business location</p>
                      </div>
                    </div>
                    <ChevronRight className="text-emerald-400 group-hover:translate-x-1 transition-transform" />
                  </div>
                </div>
              )}

              {currentStep === 5 && (
                <div className="space-y-8">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
                    <div className="space-y-4">
                       <label className="text-xs font-black uppercase tracking-widest text-emerald-800/40 ml-2">Working Hours</label>
                       <div className="grid grid-cols-2 gap-4">
                          <input
                            type="time"
                            name="openingTime"
                            value={formData.openingTime}
                            onChange={handleChange}
                            className="w-full px-6 py-4 rounded-2xl border border-slate-100 bg-slate-50 focus:bg-white focus:outline-none focus:ring-4 focus:ring-emerald-500/10 focus:border-emerald-500 transition-all font-bold text-emerald-950"
                          />
                          <input
                            type="time"
                            name="closingTime"
                            value={formData.closingTime}
                            onChange={handleChange}
                            className="w-full px-6 py-4 rounded-2xl border border-slate-100 bg-slate-50 focus:bg-white focus:outline-none focus:ring-4 focus:ring-emerald-500/10 focus:border-emerald-500 transition-all font-bold text-emerald-950"
                          />
                       </div>
                    </div>
                    <div className="space-y-4">
                       <label className="text-xs font-black uppercase tracking-widest text-emerald-800/40 ml-2">Delivery & Pickup</label>
                       <div className="flex gap-4">
                          <button
                            onClick={() => setFormData({...formData, deliveryAvailable: !formData.deliveryAvailable})}
                            className={`flex-1 py-4 rounded-2xl border-2 font-black transition-all flex items-center justify-center gap-2 ${
                              formData.deliveryAvailable ? 'bg-emerald-600 border-emerald-600 text-white shadow-lg shadow-emerald-100' : 'bg-white border-slate-100 text-slate-400'
                            }`}
                          >
                            <Truck size={18} /> Delivery
                          </button>
                          <button
                            onClick={() => setFormData({...formData, pickupAvailable: !formData.pickupAvailable})}
                            className={`flex-1 py-4 rounded-2xl border-2 font-black transition-all flex items-center justify-center gap-2 ${
                              formData.pickupAvailable ? 'bg-emerald-600 border-emerald-600 text-white shadow-lg shadow-emerald-100' : 'bg-white border-slate-100 text-slate-400'
                            }`}
                          >
                            <Package size={18} /> Pickup
                          </button>
                       </div>
                    </div>
                  </div>

                  <div className="space-y-4">
                    <label className="text-xs font-black uppercase tracking-widest text-emerald-800/40 ml-2">Payment Methods Supported</label>
                    <div className="flex flex-wrap gap-4">
                      {['Cash', 'UPI', 'Card', 'Udhar (Credit)'].map(mode => (
                         <button
                           key={mode}
                           onClick={() => {
                             const modes = formData.paymentModes.includes(mode)
                              ? formData.paymentModes.filter(m => m !== mode)
                              : [...formData.paymentModes, mode];
                             setFormData({...formData, paymentModes: modes});
                           }}
                           className={`px-6 py-3 rounded-full border-2 font-black text-sm transition-all flex items-center gap-2 ${
                             formData.paymentModes.includes(mode) ? 'bg-emerald-50 border-emerald-500 text-emerald-700' : 'bg-white border-slate-100 text-slate-400'
                           }`}
                         >
                           {formData.paymentModes.includes(mode) && <CheckCircle2 size={16} />}
                           {mode}
                         </button>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {currentStep === 6 && (
                <div className="space-y-8">
                  <div className="text-center">
                    <h2 className="text-2xl font-black text-emerald-950 mb-2">Select Your Business Plan</h2>
                    <p className="text-slate-500 font-medium">Choose a plan to activate your dashboard.</p>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    {[
                      { name: 'Basic', price: '₹0', period: '/mo', color: 'slate' },
                      { name: 'Standard', price: '₹499', period: '/mo', color: 'emerald', highlight: true },
                      { name: 'Premium', price: '₹999', period: '/mo', color: 'orange' }
                    ].map((plan) => (
                      <button
                        key={plan.name}
                        onClick={() => setFormData({...formData, selectedPlan: plan.name})}
                        className={`p-8 rounded-[2.5rem] border-2 transition-all flex flex-col items-center gap-4 relative overflow-hidden ${
                          formData.selectedPlan === plan.name 
                            ? `border-${plan.color}-500 bg-white shadow-2xl shadow-${plan.color}-100` 
                            : 'border-slate-100 bg-white hover:border-slate-200'
                        }`}
                      >
                        {plan.highlight && (
                          <div className="absolute top-0 right-0 px-4 py-1 bg-emerald-500 text-white text-[8px] font-black uppercase tracking-[0.2em] rounded-bl-xl">Best Value</div>
                        )}
                        <h3 className="font-black text-emerald-950 text-xl">{plan.name}</h3>
                        <div className="flex items-baseline gap-1">
                          <span className="text-3xl font-black text-emerald-950">{plan.price}</span>
                          <span className="text-slate-400 text-xs font-bold">{plan.period}</span>
                        </div>
                        <div className={`w-full h-1.5 rounded-full ${formData.selectedPlan === plan.name ? `bg-${plan.color}-500` : 'bg-slate-100'}`} />
                        <ul className="text-left w-full space-y-2 mt-2">
                           {['POS Billing', 'Inventory', 'Reports'].map(f => (
                             <li key={f} className="flex items-center gap-2 text-[10px] font-bold text-slate-500 uppercase tracking-tighter">
                               <CheckCircle2 size={12} className={formData.selectedPlan === plan.name ? `text-${plan.color}-500` : 'text-slate-200'} />
                               {f}
                             </li>
                           ))}
                        </ul>
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </motion.div>
          </AnimatePresence>

          {/* Navigation Buttons */}
          <div className="mt-12 flex items-center justify-between">
            <button
              onClick={prevStep}
              disabled={currentStep === 1}
              className={`flex items-center gap-2 font-black text-sm uppercase tracking-widest transition-all ${
                currentStep === 1 ? 'opacity-0' : 'text-slate-400 hover:text-emerald-950'
              }`}
            >
              <ChevronLeft size={20} /> Back
            </button>
            
            {currentStep < steps.length ? (
              <button
                onClick={nextStep}
                className="bg-emerald-600 hover:bg-emerald-700 text-white font-black px-10 py-5 rounded-2xl shadow-xl shadow-emerald-200 transition-all active:scale-[0.98] flex items-center gap-2 group"
              >
                Next Step
                <ChevronRight size={20} className="group-hover:translate-x-1 transition-transform" />
              </button>
            ) : (
              <button
                onClick={handleCreateBusiness}
                disabled={loading}
                className="bg-emerald-950 hover:bg-black text-white font-black px-12 py-5 rounded-2xl shadow-2xl transition-all active:scale-[0.98] flex items-center gap-2 group disabled:opacity-70"
              >
                {loading ? (
                  <div className="w-6 h-6 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                ) : (
                  <>
                    Confirm & Launch
                    <CheckCircle2 size={20} className="group-hover:scale-110 transition-transform text-emerald-400" />
                  </>
                )}
              </button>
            )}
          </div>
        </div>

        {/* Support Link */}
        <p className="mt-8 text-center text-slate-400 font-bold text-sm">
          Need help setting up? <a href="#" className="text-emerald-600 hover:underline">Chat with a Specialist</a>
        </p>
      </div>
    </div>
  );
}
