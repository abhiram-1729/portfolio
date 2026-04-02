import React, { useState, useEffect } from 'react';
import { CreditCard, Percent, FileText, ChevronRight, Bell, Lock, X, Loader2, Save, Store, Mail, Phone, MapPin, Hash } from 'lucide-react';
import adminAPI from '../../services/adminService';
import toast from 'react-hot-toast';

export default function AdminSettings() {
  const [settings, setSettings] = useState({
    businessName: '',
    gstNo: '',
    contactNo: '',
    email: '',
    address: '',
    taxRates: '0,5,12,18'
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [activeModal, setActiveModal] = useState(null); // 'TAX' or 'BUSINESS'

  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    try {
      const { data } = await adminAPI.getSettings();
      if (data.success) {
        setSettings(data.data);
      }
    } catch (error) {
      toast.error('Failed to load settings');
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateSettings = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      const { data } = await adminAPI.updateSettings(settings);
      if (data.success) {
        toast.success('Settings updated!');
        setActiveModal(null);
      }
    } catch (error) {
      toast.error('Failed to update settings');
    } finally {
      setSaving(false);
    }
  };

  const sections = [
    { 
      title: 'Payment Settings', 
      icon: CreditCard, 
      items: [
        { label: 'Add/Edit Payment Modes', action: () => toast.error('This feature is coming soon') },
        { label: 'UPI Settings', action: () => toast.error('This feature is coming soon') },
        { label: 'Card Terminal Config', action: () => toast.error('This feature is coming soon') }
      ] 
    },
    { 
      title: 'Business Details', 
      icon: Store, 
      items: [
        { label: 'Tax Settings (GST)', action: () => setActiveModal('TAX') },
        { label: 'Business Profile Details', action: () => setActiveModal('BUSINESS') },
        { label: 'Currency Options', action: () => toast.error('This feature is coming soon') }
      ] 
    },
    { 
      title: 'Invoice Format', 
      icon: FileText, 
      items: [
        { label: 'Header/Footer Text', action: () => toast.error('Coming soon') },
        { label: 'Upload Logo', action: () => toast.error('Coming soon') },
        { label: 'Sequential Numbering', action: () => toast.error('Coming soon') }
      ] 
    },
    { 
      title: 'Notifications', 
      icon: Bell, 
      items: [
        { label: 'Low Stock Alerts', action: () => {} },
        { label: 'Daily Sales Report Email', action: () => {} }
      ] 
    }
  ];

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[50vh] gap-4">
        <Loader2 className="animate-spin text-emerald-600" size={32} />
        <p className="text-gray-500 font-medium tracking-wide text-sm">Loading Settings...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-20">
      <div className="flex flex-col gap-1 px-2">
        <h2 className="text-2xl font-bold text-gray-900">Settings</h2>
        <p className="text-sm text-gray-500 font-medium">Configure your platform behavior</p>
      </div>

      <div className="space-y-4">
        {sections.map((section) => (
          <div key={section.title} className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden mx-1">
            <div className="p-4 bg-gray-50/50 border-b border-gray-100 flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-emerald-100 flex items-center justify-center text-emerald-600">
                <section.icon size={18} />
              </div>
              <h3 className="font-bold text-gray-900 text-sm">{section.title}</h3>
            </div>
            <div className="divide-y divide-gray-50">
              {section.items.map((item) => (
                <button 
                  key={item.label} 
                  onClick={item.action}
                  className="w-full flex items-center justify-between px-6 py-4 hover:bg-gray-50 transition-colors group text-left"
                >
                  <span className="text-sm text-gray-600 group-hover:text-emerald-600 font-bold transition-colors">{item.label}</span>
                  <ChevronRight size={16} className="text-gray-300 group-hover:text-emerald-500 transition-colors" />
                </button>
              ))}
            </div>
          </div>
        ))}
      </div>

      {/* Tax Settings Modal */}
      {activeModal === 'TAX' && (
        <div className="fixed inset-0 z-[60] flex items-end md:items-center justify-center bg-black/40 backdrop-blur-sm p-4 animate-in fade-in duration-200">
          <div className="bg-white w-full max-w-md rounded-3xl p-6 shadow-2xl animate-in slide-in-from-bottom-4 duration-300">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-emerald-100 text-emerald-600 rounded-xl">
                    <Percent size={20} fontWeight="bold" />
                </div>
                <h3 className="text-xl font-bold text-gray-900">Tax Settings</h3>
              </div>
              <button 
                onClick={() => setActiveModal(null)}
                className="p-2 hover:bg-slate-100 rounded-full text-slate-400 transition-colors"
                disabled={saving}
              >
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleUpdateSettings} className="space-y-5">
              <div className="space-y-2">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">GST Slabs (Comma Separated)</label>
                <div className="relative">
                  <input 
                    type="text"
                    required
                    placeholder="e.g. 0,5,12,18"
                    className="w-full bg-slate-50 border border-slate-100 rounded-xl px-4 py-3 text-sm font-bold focus:ring-2 focus:ring-emerald-500/20 text-emerald-900"
                    value={settings.taxRates}
                    onChange={(e) => setSettings({...settings, taxRates: e.target.value})}
                  />
                  <Hash size={16} className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-300" />
                </div>
                <p className="text-[9px] text-slate-400 font-bold uppercase tracking-tight ml-1 leading-relaxed">
                  These percentages will appear in the "Add Product" modal dropdown for tax selection.
                </p>
              </div>

              <div className="pt-2">
                <button 
                  type="submit"
                  disabled={saving}
                  className="w-full bg-emerald-600 text-white font-bold py-4 rounded-xl shadow-lg shadow-emerald-600/20 hover:bg-emerald-700 transition-all text-sm uppercase tracking-wider flex items-center justify-center gap-2 disabled:opacity-50"
                >
                  {saving ? <Loader2 size={18} className="animate-spin" /> : <Save size={18} />}
                  {saving ? 'Saving...' : 'Update Tax Slabs'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Business Details Modal */}
      {activeModal === 'BUSINESS' && (
        <div className="fixed inset-0 z-[60] flex items-end md:items-center justify-center bg-black/40 backdrop-blur-sm p-4 animate-in fade-in duration-200">
          <div className="bg-white w-full max-w-lg rounded-3xl p-6 shadow-2xl animate-in slide-in-from-bottom-4 duration-300 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-6 sticky top-0 bg-white z-10 pb-2">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-emerald-100 text-emerald-600 rounded-xl">
                    <Store size={20} />
                </div>
                <h3 className="text-xl font-bold text-gray-900">Business Details</h3>
              </div>
              <button 
                onClick={() => setActiveModal(null)}
                className="p-2 hover:bg-slate-100 rounded-full text-slate-400 transition-colors"
                disabled={saving}
              >
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleUpdateSettings} className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">Business Name</label>
                <div className="relative">
                  <input 
                    type="text" required
                    className="w-full bg-slate-50 border border-slate-100 rounded-xl px-4 py-3 text-sm font-bold focus:ring-2 focus:ring-emerald-500/20 text-emerald-900"
                    placeholder="Enter Business Name"
                    value={settings.businessName}
                    onChange={(e) => setSettings({...settings, businessName: e.target.value})}
                  />
                  <Store size={16} className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-300" />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">GST Number</label>
                  <div className="relative">
                    <input 
                      type="text"
                      className="w-full bg-slate-50 border border-slate-100 rounded-xl px-4 py-3 text-sm font-bold focus:ring-2 focus:ring-emerald-500/20 text-emerald-900"
                      placeholder="GSTIN"
                      value={settings.gstNo || ''}
                      onChange={(e) => setSettings({...settings, gstNo: e.target.value})}
                    />
                    <Hash size={16} className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-300" />
                  </div>
                </div>
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">Contact Number</label>
                  <div className="relative">
                    <input 
                      type="text"
                      className="w-full bg-slate-50 border border-slate-100 rounded-xl px-4 py-3 text-sm font-bold focus:ring-2 focus:ring-emerald-500/20 text-emerald-900"
                      placeholder="+91"
                      value={settings.contactNo || ''}
                      onChange={(e) => setSettings({...settings, contactNo: e.target.value})}
                    />
                    <Phone size={16} className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-300" />
                  </div>
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">Business Email</label>
                <div className="relative">
                  <input 
                    type="email"
                    className="w-full bg-slate-50 border border-slate-100 rounded-xl px-4 py-3 text-sm font-bold focus:ring-2 focus:ring-emerald-500/20 text-emerald-900"
                    placeholder="email@example.com"
                    value={settings.email || ''}
                    onChange={(e) => setSettings({...settings, email: e.target.value})}
                  />
                  <Mail size={16} className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-300" />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">Business Address</label>
                <div className="relative">
                  <textarea 
                    className="w-full bg-slate-50 border border-slate-100 rounded-xl px-4 py-3 text-sm font-bold focus:ring-2 focus:ring-emerald-500/20 text-emerald-900 min-h-[80px]"
                    placeholder="Physical location"
                    value={settings.address || ''}
                    onChange={(e) => setSettings({...settings, address: e.target.value})}
                  />
                  <MapPin size={16} className="absolute right-4 top-6 text-slate-300" />
                </div>
              </div>

              <div className="pt-2">
                <button 
                  type="submit"
                  disabled={saving}
                  className="w-full bg-emerald-600 text-white font-bold py-4 rounded-xl shadow-lg shadow-emerald-600/20 hover:bg-emerald-700 transition-all text-sm uppercase tracking-wider flex items-center justify-center gap-2 disabled:opacity-50"
                >
                  {saving ? <Loader2 size={18} className="animate-spin" /> : <Store size={18} />}
                  {saving ? 'Updating...' : 'Save Business Profile'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
