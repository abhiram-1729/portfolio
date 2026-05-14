import { useState, useEffect } from 'react';
import { useNavigate, Link, useLocation } from 'react-router-dom';
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
import adminAPI from '../services/adminService';
import { useUserStore } from '../store/userStore';
import logo from '../assets/VillagKart_Logo.png';

const steps = [
  { id: 1, title: 'Nature of Business', icon: <Briefcase className="w-5 h-5" /> },
  { id: 2, title: 'Basic Info', icon: <Store className="w-5 h-5" /> },
  { id: 3, title: 'Contact Details', icon: <Phone className="w-5 h-5" /> },
  { id: 4, title: 'Address & Location', icon: <MapPin className="w-5 h-5" /> },
  { id: 5, title: 'Branch / Hub Config', icon: <Globe className="w-5 h-5" /> },
  { id: 6, title: 'Operations', icon: <Clock className="w-5 h-5" /> },
  { id: 7, title: 'Plan Selection', icon: <ShieldCheck className="w-5 h-5" /> }
];

export default function CreateBusiness() {
  const { currentUser, isLoaded } = useUserStore();
  const navigate = useNavigate();
  const location = useLocation();
  const [currentStep, setCurrentStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [editStoreId, setEditStoreId] = useState(null);
  
  const [formData, setFormData] = useState({
    // Step 1: Nature
    nature: currentUser?.tenant?.nature || 'Both',
    type: currentUser?.tenant?.type || 'Private Limited',
    
    // Step 2: Basic Info
    name: currentUser?.tenant?.name || '',
    category: 'FMCG',
    subcategory: 'Grocery',
    description: '',
    
    // Step 3: Contact
    contactName: '',
    contactMobile: currentUser?.mobile || '',
    contactEmail: currentUser?.email || '',
    role: 'Owner',
    whatsapp: '',
    
    // Step 4: Address
    address: currentUser?.tenant?.address || '',
    area: '',
    city: '',
    state: 'AP',
    pincode: '',
    
    // Step 5: Branch / Hub Config
    displayName: 'Main Hub',
    code: 'HUB-01',
    stateCode: 'AP',
    hubCode: 'HUB',
    branchAddress: '',
    
    // Step 6: Operations
    workingDays: [],
    openingTime: '09:00',
    closingTime: '21:00',
    deliveryAvailable: false,
    pickupAvailable: true,
    paymentModes: ['Cash', 'UPI'],
    // Step 7: Plan
    selectedPlan: 'Standard'
  });

  useEffect(() => {
    if (location.state?.editStore) {
      const st = location.state.editStore;
      setEditStoreId(st.id);

      // Intelligently parse existing address composite string
      let parsedAddress = st.address || '';
      let parsedArea = 'Central Commercial District';
      let parsedCity = 'Vijayawada';
      let parsedPincode = '520001';
      let parsedState = st.stateCode || 'AP';

      if (st.address && st.address.includes(',')) {
        const parts = st.address.split(',').map(p => p.trim());
        parsedAddress = parts[0] || '';
        if (parts.length > 1) parsedArea = parts[1] || '';
        if (parts.length > 2) {
          const tail = parts[parts.length - 1];
          if (tail.includes('-')) {
            const sub = tail.split('-').map(p => p.trim());
            parsedCity = parts.slice(2, parts.length - 1).join(', ') || sub[0];
            parsedPincode = sub[1]?.replace(/\D/g, '') || '520001';
          } else {
            parsedCity = parts[2];
          }
        }
      }

      setFormData(prev => ({
        ...prev,
        // Step 1: Nature
        nature: st.nature || 'Both',
        // Step 2: Basic Info
        name: st.name || '',
        type: st.type || 'Private Limited',
        category: st.category || 'Retail Operations',
        subcategory: st.subcategory || 'General Store',
        description: st.description || `Official Enterprise Registered Node for ${st.name || 'VillagKart'} branch operations.`,
        // Step 3: Contact Details
        contactName: st.contactName || 'Enterprise Route Administrator',
        contactMobile: st.contactPhone || '9876543210',
        contactEmail: st.contactEmail || 'admin@villagkart.com',
        role: 'Owner',
        whatsapp: st.contactPhone || '9876543210',
        // Step 4: Address
        address: parsedAddress || 'Route Base Main Road',
        area: parsedArea,
        city: parsedCity,
        state: parsedState,
        pincode: parsedPincode,
        // Step 5: Branch / Hub Config
        displayName: st.name || 'Main Hub',
        code: st.code || 'HUB-01',
        stateCode: st.stateCode || 'AP',
        hubCode: st.hubCode || 'HUB',
        branchAddress: st.address || '',
        // Step 6: Operations
        workingDays: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'],
        openingTime: st.openingTime || '08:30',
        closingTime: st.closingTime || '21:30',
        deliveryAvailable: st.deliveryAvailable ?? true,
        pickupAvailable: st.pickupAvailable ?? true,
        paymentModes: st.paymentModes?.length ? st.paymentModes : ['Cash', 'UPI', 'Card', 'Udhar (Credit)'],
        // Step 7: Plan Selection
        selectedPlan: st.selectedPlan || 'Standard'
      }));
    }
  }, [location.state]);

  useEffect(() => {
    if (isLoaded && currentUser?.tenant && !editStoreId && !location.state?.editStore) {
      setFormData(prev => ({
        ...prev,
        nature: currentUser.tenant.nature || prev.nature,
        type: currentUser.tenant.type || prev.type,
        name: currentUser.tenant.name || prev.name,
        contactEmail: currentUser.email || prev.contactEmail,
        contactMobile: currentUser.mobile || prev.contactMobile,
        address: currentUser.tenant.address || prev.address,
      }));
    }
  }, [isLoaded, currentUser, editStoreId, location.state]);

  const validateCurrentStep = () => {
    if (currentStep === 1) {
      if (!formData.nature) {
        toast.error('Please select the nature of your business');
        return false;
      }
    } else if (currentStep === 2) {
      if (!formData.name?.trim()) {
        toast.error('Business Name is required');
        return false;
      }
      if (!formData.type) {
        toast.error('Business Type is required');
        return false;
      }
      if (!formData.category?.trim()) {
        toast.error('Category is required');
        return false;
      }
    } else if (currentStep === 3) {
      if (!formData.contactName?.trim()) {
        toast.error('Primary Contact Name is required');
        return false;
      }
      if (!formData.contactMobile?.trim() || formData.contactMobile.length < 10) {
        toast.error('Please enter a valid 10-digit mobile number');
        return false;
      }
      if (!formData.contactEmail?.trim() || !formData.contactEmail.includes('@')) {
        toast.error('Please enter a valid email address');
        return false;
      }
    } else if (currentStep === 4) {
      if (!formData.address?.trim()) {
        toast.error('Full Address is required');
        return false;
      }
    } else if (currentStep === 5) {
      if (!formData.displayName?.trim()) {
        toast.error('Display Name is required');
        return false;
      }
      if (!formData.code?.trim()) {
        toast.error('Identifier Code is required');
        return false;
      }
    }
    return true;
  };

  const nextStep = () => {
    if (validateCurrentStep()) {
      setCurrentStep(prev => Math.min(prev + 1, steps.length));
    }
  };

  const prevStep = () => setCurrentStep(prev => Math.max(prev - 1, 1));

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    let processedValue = value;

    // Strict input constraints based on requested data type
    if (name === 'contactMobile' || name === 'whatsapp' || name === 'pincode') {
      // Numbers only constraint
      processedValue = value.replace(/\D/g, '');
      // Restrict maximum digits length
      if ((name === 'contactMobile' || name === 'whatsapp') && processedValue.length > 10) {
        processedValue = processedValue.slice(0, 10);
      }
      if (name === 'pincode' && processedValue.length > 6) {
        processedValue = processedValue.slice(0, 6);
      }
    } else if (name === 'contactName' || name === 'category' || name === 'subcategory' || name === 'city' || name === 'area') {
      // Pure alphabetic strings and spaces constraint
      processedValue = value.replace(/[^a-zA-Z\s]/g, '');
    }

    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : processedValue
    }));
  };

  const handleCreateBusiness = async () => {
    setLoading(true);
    try {
      // Map PRD fields to schema fields
      const storeData = {
        name: formData.displayName || formData.name,
        code: formData.code?.toUpperCase(),
        address: formData.branchAddress || `${formData.address}, ${formData.area}, ${formData.city}, ${formData.state} - ${formData.pincode}`,
        contactEmail: formData.contactEmail,
        contactPhone: formData.contactMobile,
        stateCode: formData.stateCode?.toUpperCase() || formData.state,
        hubCode: formData.hubCode?.toUpperCase() || formData.city.substring(0, 3).toUpperCase(),
        nature: formData.nature,
        type: formData.type,
      };

      if (editStoreId) {
        await adminAPI.updateStore(editStoreId, storeData);
        toast.success("Store branch parameters updated successfully!");
      } else {
        await storeAPI.create(storeData);
        toast.success("Store branch created successfully!");
      }
      navigate('/admin/stores');
    } catch (error) {
      toast.error(error.response?.data?.message || "Failed to submit business configuration");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="h-screen w-screen bg-slate-50 flex flex-col items-center py-3 px-4 overflow-hidden relative select-none">
      {/* Absolute Back Button */}
      <div className="absolute top-3 left-4 z-50">
        <Link 
          to="/admin/stores" 
          className="flex items-center gap-1.5 px-4 py-2 bg-white rounded-xl shadow-md border border-slate-100 text-slate-600 font-black text-[10px] uppercase tracking-widest hover:text-emerald-600 transition-all active:scale-95 group"
        >
          <Store size={14} className="group-hover:scale-110 transition-transform text-emerald-600" />
          Stores Management
        </Link>
      </div>

      {/* Background Decor */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden -z-10">
        <div className="absolute top-[-10%] right-[-10%] w-[40vw] h-[40vw] bg-emerald-100/50 blur-[120px] rounded-full" />
        <div className="absolute bottom-[-10%] left-[-10%] w-[40vw] h-[40vw] bg-orange-100/30 blur-[100px] rounded-full" />
      </div>

      <div className="w-full max-w-4xl flex-1 flex flex-col min-h-0">
        {/* Compact Header */}
        <div className="flex flex-col items-center mb-3 shrink-0">
          <img src={logo} alt="VillagKart" className="h-7 w-auto mb-1.5" />
          <h1 className="text-xl font-black text-emerald-950 tracking-tight text-center">
            {editStoreId ? "Update Business Settings" : "Set Up Your Business"}
          </h1>
        </div>

        {/* Compact Step Progress */}
        <div className="relative mb-3 hidden md:block shrink-0">
          <div className="absolute top-1/2 left-0 w-full h-0.5 bg-emerald-100 -translate-y-1/2 z-0" />
          <div 
            className="absolute top-1/2 left-0 h-0.5 bg-emerald-600 -translate-y-1/2 z-0 transition-all duration-500" 
            style={{ width: `${((currentStep - 1) / (steps.length - 1)) * 100}%` }}
          />
          <div className="relative z-10 flex justify-between">
            {steps.map((step) => (
              <div key={step.id} className="flex flex-col items-center">
                <div 
                  className={`w-8 h-8 rounded-full flex items-center justify-center transition-all duration-500 border-2 ${
                    currentStep >= step.id ? 'bg-emerald-600 border-white text-white shadow-md' : 'bg-white border-emerald-50 text-emerald-200'
                  }`}
                >
                  {currentStep > step.id ? <CheckCircle2 className="w-3.5 h-3.5" /> : step.icon}
                </div>
                <span className={`mt-1 text-[8px] font-black uppercase tracking-wider ${currentStep >= step.id ? 'text-emerald-900' : 'text-emerald-200'}`}>
                  {step.title}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Mobile Progress */}
        <div className="md:hidden flex items-center justify-between mb-3 px-2 shrink-0">
           <div className="flex flex-col">
              <span className="text-[9px] font-black text-emerald-600 uppercase tracking-widest">Step {currentStep} of {steps.length}</span>
              <span className="text-sm font-black text-emerald-950">{steps[currentStep-1].title}</span>
           </div>
           <div className="w-8 h-8 rounded-full border-2 border-emerald-100 flex items-center justify-center relative">
              <span className="text-[10px] font-black">{currentStep}</span>
           </div>
        </div>

        {/* Form Container Container */}
        <div className="glass bg-white/80 backdrop-blur-3xl rounded-3xl border border-white shadow-xl p-5 md:p-6 flex-1 flex flex-col min-h-0 relative overflow-hidden">
          <div className="flex-1 overflow-y-auto min-h-0 pr-1">
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
                      { id: 'Product Selling', title: 'Product Selling', desc: 'Retail, Kirana, Wholesale', icon: <Package className="w-6 h-6" /> },
                      { id: 'Service Providing', title: 'Service Providing', desc: 'Salon, Mechanic, Consultant', icon: <Smartphone className="w-6 h-6" /> },
                      { id: 'Both', title: 'Both', desc: 'Product + Services', icon: <Store className="w-6 h-6" /> }
                    ].map((opt) => (
                      <button
                        key={opt.id}
                        onClick={() => setFormData({...formData, nature: opt.id})}
                        className={`p-5 rounded-3xl border-2 transition-all flex flex-col items-center text-center gap-3 group ${
                          formData.nature?.toLowerCase() === opt.id.toLowerCase() || (formData.nature?.toLowerCase() === 'product' && opt.id === 'Product Selling') || (formData.nature?.toLowerCase() === 'service' && opt.id === 'Service Providing') ? 'border-emerald-500 bg-emerald-50 shadow-md shadow-emerald-100' : 'border-slate-100 hover:border-emerald-200 hover:bg-emerald-50/30'
                        }`}
                      >
                        <div className={`w-12 h-12 rounded-2xl flex items-center justify-center transition-all ${
                          formData.nature?.toLowerCase() === opt.id.toLowerCase() || (formData.nature?.toLowerCase() === 'product' && opt.id === 'Product Selling') || (formData.nature?.toLowerCase() === 'service' && opt.id === 'Service Providing') ? 'bg-emerald-600 text-white' : 'bg-slate-50 text-slate-400 group-hover:text-emerald-500'
                        }`}>
                          {opt.icon}
                        </div>
                        <div>
                          <h3 className="font-black text-emerald-950 text-sm">{opt.title}</h3>
                          <p className="text-[10px] text-slate-400 font-bold mt-0.5 uppercase tracking-tighter">{opt.desc}</p>
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {currentStep === 2 && (
                <div className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-1">
                      <label className="text-[10px] font-black uppercase tracking-widest text-emerald-800/40 ml-2">Business Name *</label>
                      <input
                        name="name"
                        value={formData.name}
                        onChange={handleChange}
                        placeholder="e.g. Sharma Kirana Store"
                        className="w-full px-4 py-3 rounded-xl border border-slate-100 bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500/10 focus:border-emerald-500 transition-all font-bold text-emerald-950 text-sm"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] font-black uppercase tracking-widest text-emerald-800/40 ml-2">Business Type *</label>
                      <select
                        name="type"
                        value={formData.type}
                        onChange={handleChange}
                        className="w-full px-4 py-3 rounded-xl border border-slate-100 bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500/10 focus:border-emerald-500 transition-all font-bold text-emerald-950 text-sm"
                      >
                        <option value="">Select Type</option>
                        <option value="Private Limited">Private Limited / Company</option>
                        <option value="Individual">Individual / Proprietorship</option>
                        <option value="Company">Company / LLP</option>
                        <option value="Partnership">Partnership</option>
                      </select>
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] font-black uppercase tracking-widest text-emerald-800/40 ml-2">Category *</label>
                      <input
                        name="category"
                        value={formData.category}
                        onChange={handleChange}
                        placeholder="e.g. FMCG"
                        className="w-full px-4 py-3 rounded-xl border border-slate-100 bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500/10 focus:border-emerald-500 transition-all font-bold text-emerald-950 text-sm"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] font-black uppercase tracking-widest text-emerald-800/40 ml-2">Subcategory</label>
                      <input
                        name="subcategory"
                        value={formData.subcategory}
                        onChange={handleChange}
                        placeholder="e.g. Retailer"
                        className="w-full px-4 py-3 rounded-xl border border-slate-100 bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500/10 focus:border-emerald-500 transition-all font-bold text-emerald-950 text-sm"
                      />
                    </div>
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-black uppercase tracking-widest text-emerald-800/40 ml-2">Short Description</label>
                    <textarea
                      name="description"
                      value={formData.description}
                      onChange={handleChange}
                      placeholder="Tell us a bit about your business..."
                      rows={2}
                      className="w-full px-4 py-2 rounded-xl border border-slate-100 bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500/10 focus:border-emerald-500 transition-all font-bold text-emerald-950 resize-none text-sm"
                    />
                  </div>
                </div>
              )}

              {currentStep === 3 && (
                <div className="space-y-4">
                   <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-1">
                      <label className="text-[10px] font-black uppercase tracking-widest text-emerald-800/40 ml-2">Primary Contact Name *</label>
                      <input
                        name="contactName"
                        value={formData.contactName}
                        onChange={handleChange}
                        placeholder="Full Name"
                        className="w-full px-4 py-3 rounded-xl border border-slate-100 bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500/10 focus:border-emerald-500 transition-all font-bold text-emerald-950 text-sm"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] font-black uppercase tracking-widest text-emerald-800/40 ml-2">Mobile Number *</label>
                      <div className="flex relative shadow-sm rounded-xl">
                        <span className="inline-flex items-center px-3.5 rounded-l-xl border border-r-0 border-slate-100 bg-slate-100/80 text-slate-500 font-black text-xs select-none">
                          +91
                        </span>
                        <input
                          name="contactMobile"
                          value={formData.contactMobile}
                          onChange={handleChange}
                          placeholder="1234567890"
                          className="w-full px-4 py-3 rounded-r-xl border border-slate-100 bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500/10 focus:border-emerald-500 transition-all font-bold text-emerald-950 text-sm"
                        />
                      </div>
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] font-black uppercase tracking-widest text-emerald-800/40 ml-2">Email ID *</label>
                      <input
                        name="contactEmail"
                        value={formData.contactEmail}
                        onChange={handleChange}
                        placeholder="email@example.com"
                        className="w-full px-4 py-3 rounded-xl border border-slate-100 bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500/10 focus:border-emerald-500 transition-all font-bold text-emerald-950 text-sm"
                      />
                    </div>
                    <div className="space-y-1">
                      <div className="flex items-center justify-between ml-2 mr-1">
                        <label className="text-[10px] font-black uppercase tracking-widest text-emerald-800/40">WhatsApp Number</label>
                        {formData.contactMobile && (
                          <button
                            type="button"
                            onClick={() => setFormData(prev => ({ ...prev, whatsapp: prev.contactMobile }))}
                            className="text-[9px] font-black text-emerald-600 hover:text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded transition-all active:scale-95 border border-emerald-100"
                          >
                            Same as Mobile Number
                          </button>
                        )}
                      </div>
                      <div className="flex relative shadow-sm rounded-xl">
                        <span className="inline-flex items-center px-3.5 rounded-l-xl border border-r-0 border-slate-100 bg-slate-100/80 text-slate-500 font-black text-xs select-none">
                          +91
                        </span>
                        <input
                          name="whatsapp"
                          value={formData.whatsapp}
                          onChange={handleChange}
                          placeholder="1234567890"
                          className="w-full px-4 py-3 rounded-r-xl border border-slate-100 bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500/10 focus:border-emerald-500 transition-all font-bold text-emerald-950 text-sm"
                        />
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {currentStep === 4 && (
                <div className="space-y-4">
                  <div className="space-y-1">
                    <label className="text-[10px] font-black uppercase tracking-widest text-emerald-800/40 ml-2">Full Address *</label>
                    <input
                      name="address"
                      value={formData.address}
                      onChange={handleChange}
                      placeholder="Shop No, Building, Street"
                      className="w-full px-4 py-3 rounded-xl border border-slate-100 bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500/10 focus:border-emerald-500 transition-all font-bold text-emerald-950 text-sm"
                    />
                  </div>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div className="space-y-1 col-span-2">
                      <label className="text-[10px] font-black uppercase tracking-widest text-emerald-800/40 ml-2">Area / Locality</label>
                      <input
                        name="area"
                        value={formData.area}
                        onChange={handleChange}
                        placeholder="e.g. Jubilee Hills"
                        className="w-full px-4 py-3 rounded-xl border border-slate-100 bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500/10 focus:border-emerald-500 transition-all font-bold text-emerald-950 text-sm"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] font-black uppercase tracking-widest text-emerald-800/40 ml-2">City</label>
                      <input
                        name="city"
                        value={formData.city}
                        onChange={handleChange}
                        placeholder="City"
                        className="w-full px-4 py-3 rounded-xl border border-slate-100 bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500/10 focus:border-emerald-500 transition-all font-bold text-emerald-950 text-sm"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] font-black uppercase tracking-widest text-emerald-800/40 ml-2">Pincode</label>
                      <input
                        name="pincode"
                        value={formData.pincode}
                        onChange={handleChange}
                        placeholder="6 Digits"
                        className="w-full px-4 py-3 rounded-xl border border-slate-100 bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500/10 focus:border-emerald-500 transition-all font-bold text-emerald-950 text-sm"
                      />
                    </div>
                  </div>
                  <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-100 flex items-center justify-between group cursor-pointer hover:bg-emerald-100 transition-all shadow-sm">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-emerald-600 text-white flex items-center justify-center shadow-md shadow-emerald-200">
                        <MapPin className="w-5 h-5" />
                      </div>
                      <div>
                        <h4 className="font-black text-emerald-950 text-xs">Geo-Location Integration</h4>
                        <p className="text-[9px] font-bold text-emerald-600 uppercase tracking-widest">Auto-detect business location</p>
                      </div>
                    </div>
                    <ChevronRight className="text-emerald-400 group-hover:translate-x-1 transition-transform w-4 h-4" />
                  </div>
                </div>
              )}

              {currentStep === 5 && (
                <div className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-1">
                      <label className="text-[10px] font-black uppercase tracking-widest text-emerald-800/40 ml-2">Display Name *</label>
                      <input
                        name="displayName"
                        value={formData.displayName}
                        onChange={handleChange}
                        placeholder="Main Hub"
                        className="w-full px-4 py-3 rounded-xl border border-slate-100 bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500/10 focus:border-emerald-500 transition-all font-bold text-emerald-950 text-sm"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] font-black uppercase tracking-widest text-emerald-800/40 ml-2">Identifier Code *</label>
                      <input
                        name="code"
                        value={formData.code}
                        onChange={handleChange}
                        placeholder="HUB-01"
                        className="w-full px-4 py-3 rounded-xl border border-slate-100 bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500/10 focus:border-emerald-500 transition-all font-bold text-emerald-950 text-sm uppercase"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] font-black uppercase tracking-widest text-emerald-800/40 ml-2">State Code</label>
                      <input
                        name="stateCode"
                        maxLength={2}
                        value={formData.stateCode}
                        onChange={handleChange}
                        placeholder="AP"
                        className="w-full px-4 py-3 rounded-xl border border-slate-100 bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500/10 focus:border-emerald-500 transition-all font-bold text-emerald-950 text-sm uppercase"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] font-black uppercase tracking-widest text-emerald-800/40 ml-2">Hub Code</label>
                      <input
                        name="hubCode"
                        maxLength={3}
                        value={formData.hubCode}
                        onChange={handleChange}
                        placeholder="HUB"
                        className="w-full px-4 py-3 rounded-xl border border-slate-100 bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500/10 focus:border-emerald-500 transition-all font-bold text-emerald-950 text-sm uppercase"
                      />
                    </div>
                  </div>
                  <div className="space-y-1">
                    <div className="flex items-center justify-between ml-2 mr-1">
                      <label className="text-[10px] font-black uppercase tracking-widest text-emerald-800/40">Full Address</label>
                      {formData.address && (
                        <button
                          type="button"
                          onClick={() => setFormData(prev => ({ ...prev, branchAddress: `${prev.address}, ${prev.area}, ${prev.city}, ${prev.state} - ${prev.pincode}`.replace(/,\s*,/g, ',').replace(/^,\s*/, '').replace(/-\s*$/, '').trim() }))}
                          className="text-[9px] font-black text-emerald-600 hover:text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded transition-all active:scale-95 border border-emerald-100"
                        >
                          Copy from Step 4
                        </button>
                      )}
                    </div>
                    <textarea
                      name="branchAddress"
                      value={formData.branchAddress}
                      onChange={handleChange}
                      placeholder="Street, City, Pincode"
                      rows={2}
                      className="w-full px-4 py-2 rounded-xl border border-slate-100 bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500/10 focus:border-emerald-500 transition-all font-bold text-emerald-950 resize-none text-sm"
                    />
                  </div>
                </div>
              )}

              {currentStep === 6 && (
                <div className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-1">
                       <label className="text-[10px] font-black uppercase tracking-widest text-emerald-800/40 ml-2">Working Hours</label>
                       <div className="grid grid-cols-2 gap-2">
                          <input
                            type="time"
                            name="openingTime"
                            value={formData.openingTime}
                            onChange={handleChange}
                            className="w-full px-4 py-3 rounded-xl border border-slate-100 bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500/10 focus:border-emerald-500 transition-all font-bold text-emerald-950 text-sm"
                          />
                          <input
                            type="time"
                            name="closingTime"
                            value={formData.closingTime}
                            onChange={handleChange}
                            className="w-full px-4 py-3 rounded-xl border border-slate-100 bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500/10 focus:border-emerald-500 transition-all font-bold text-emerald-950 text-sm"
                          />
                       </div>
                    </div>
                    <div className="space-y-1">
                       <label className="text-[10px] font-black uppercase tracking-widest text-emerald-800/40 ml-2">Delivery & Pickup</label>
                       <div className="flex gap-2">
                          <button
                            onClick={() => setFormData({...formData, deliveryAvailable: !formData.deliveryAvailable})}
                            className={`flex-1 py-3 rounded-xl border-2 font-black transition-all flex items-center justify-center gap-1.5 text-xs ${
                              formData.deliveryAvailable ? 'bg-emerald-600 border-emerald-600 text-white shadow-md shadow-emerald-100' : 'bg-white border-slate-100 text-slate-400'
                            }`}
                          >
                            <Truck size={14} /> Delivery
                          </button>
                          <button
                            onClick={() => setFormData({...formData, pickupAvailable: !formData.pickupAvailable})}
                            className={`flex-1 py-3 rounded-xl border-2 font-black transition-all flex items-center justify-center gap-1.5 text-xs ${
                              formData.pickupAvailable ? 'bg-emerald-600 border-emerald-600 text-white shadow-md shadow-emerald-100' : 'bg-white border-slate-100 text-slate-400'
                            }`}
                          >
                            <Package size={14} /> Pickup
                          </button>
                       </div>
                    </div>
                  </div>

                  <div className="space-y-1">
                    <label className="text-[10px] font-black uppercase tracking-widest text-emerald-800/40 ml-2">Payment Methods Supported</label>
                    <div className="flex flex-wrap gap-2">
                      {['Cash', 'UPI', 'Card', 'Udhar (Credit)'].map(mode => (
                         <button
                           key={mode}
                           onClick={() => {
                             const modes = formData.paymentModes.includes(mode)
                              ? formData.paymentModes.filter(m => m !== mode)
                              : [...formData.paymentModes, mode];
                             setFormData({...formData, paymentModes: modes});
                           }}
                           className={`px-4 py-2 rounded-full border-2 font-black text-xs transition-all flex items-center gap-1.5 ${
                             formData.paymentModes.includes(mode) ? 'bg-emerald-50 border-emerald-500 text-emerald-700' : 'bg-white border-slate-100 text-slate-400'
                           }`}
                         >
                           {formData.paymentModes.includes(mode) && <CheckCircle2 size={12} />}
                           {mode}
                         </button>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {currentStep === 7 && (
                <div className="space-y-4">
                  <div className="text-center">
                    <h2 className="text-xl font-black text-emerald-950 mb-1">Select Your Business Plan</h2>
                    <p className="text-xs text-slate-500 font-medium">Choose a plan to activate your dashboard.</p>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    {[
                      { name: 'Basic', price: '₹0', period: '/mo', color: 'slate' },
                      { name: 'Standard', price: '₹499', period: '/mo', color: 'emerald', highlight: true },
                      { name: 'Premium', price: '₹999', period: '/mo', color: 'orange' }
                    ].map((plan) => (
                      <button
                        key={plan.name}
                        onClick={() => setFormData({...formData, selectedPlan: plan.name})}
                        className={`p-5 rounded-3xl border-2 transition-all flex flex-col items-center gap-2.5 relative overflow-hidden ${
                          formData.selectedPlan === plan.name 
                            ? `border-${plan.color}-500 bg-white shadow-lg shadow-${plan.color}-100` 
                            : 'border-slate-100 bg-white hover:border-slate-200'
                        }`}
                      >
                        {plan.highlight && (
                          <div className="absolute top-0 right-0 px-3 py-0.5 bg-emerald-500 text-white text-[7px] font-black uppercase tracking-[0.2em] rounded-bl-lg">Best Value</div>
                        )}
                        <h3 className="font-black text-emerald-950 text-base">{plan.name}</h3>
                        <div className="flex items-baseline gap-1">
                          <span className="text-2xl font-black text-emerald-950">{plan.price}</span>
                          <span className="text-slate-400 text-[10px] font-bold">{plan.period}</span>
                        </div>
                        <div className={`w-full h-1 rounded-full ${formData.selectedPlan === plan.name ? `bg-${plan.color}-500` : 'bg-slate-100'}`} />
                        <ul className="text-left w-full space-y-1.5 mt-1">
                           {['POS Billing', 'Inventory', 'Reports'].map(f => (
                             <li key={f} className="flex items-center gap-1.5 text-[9px] font-bold text-slate-500 uppercase tracking-tighter">
                               <CheckCircle2 size={10} className={formData.selectedPlan === plan.name ? `text-${plan.color}-500` : 'text-slate-200'} />
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
          </div>

          {/* Compact Navigation Buttons */}
          <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between shrink-0">
            <button
              onClick={prevStep}
              disabled={currentStep === 1}
              className={`flex items-center gap-1 font-black text-xs uppercase tracking-widest transition-all ${
                currentStep === 1 ? 'opacity-0 pointer-events-none' : 'text-slate-400 hover:text-emerald-950'
              }`}
            >
              <ChevronLeft size={16} /> Back
            </button>
            
            {currentStep < steps.length ? (
              <button
                onClick={nextStep}
                className="bg-emerald-600 hover:bg-emerald-700 text-white font-black px-6 py-2.5 rounded-xl shadow-md shadow-emerald-200 transition-all active:scale-[0.98] flex items-center gap-1.5 group text-xs uppercase tracking-wider"
              >
                Next Step
                <ChevronRight size={16} className="group-hover:translate-x-0.5 transition-transform" />
              </button>
            ) : (
              <button
                onClick={handleCreateBusiness}
                disabled={loading}
                className="bg-emerald-950 hover:bg-black text-white font-black px-8 py-2.5 rounded-xl shadow-lg transition-all active:scale-[0.98] flex items-center gap-1.5 group disabled:opacity-70 text-xs uppercase tracking-wider"
              >
                {loading ? (
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                ) : (
                  <>
                    {editStoreId ? "Save Updates" : "Confirm & Launch"}
                    <CheckCircle2 size={16} className="group-hover:scale-110 transition-transform text-emerald-400" />
                  </>
                )}
              </button>
            )}
          </div>
        </div>

        {/* Compact Support Link */}
        <p className="mt-3 text-center text-slate-400 font-bold text-xs shrink-0">
          Need help setting up? <a href="#" className="text-emerald-600 hover:underline">Chat with a Specialist</a>
        </p>
      </div>
    </div>
  );
}
