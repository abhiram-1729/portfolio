import React, { useState } from 'react';
import { X, Send, Users, Shield, Truck } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import toast from 'react-hot-toast';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5001';

export default function BroadcastModal({ isOpen, onClose, onSuccess }) {
  const [formData, setFormData] = useState({
    title: '',
    message: '',
    type: 'system',
    priority: 'low',
    target: 'all',
    role: 'SALES_AGENT',
    vehicleId: ''
  });
  const [sending, setSending] = useState(false);

  const handleBroadcast = async (e) => {
    e.preventDefault();
    setSending(true);
    try {
      const token = localStorage.getItem('token');
      const payload = {
        title: formData.title,
        message: formData.message,
        type: formData.type,
        priority: formData.priority,
        isBroadcast: formData.target === 'all',
        roles: formData.target === 'role' ? [formData.role] : [],
        vehicleIds: formData.target === 'vehicle' ? [formData.vehicleId] : []
      };

      const res = await fetch(`${API_URL}/api/notifications/broadcast`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(payload)
      });

      if (res.ok) {
        toast.success('Broadcast sent successfully!');
        setFormData({ ...formData, title: '', message: '' });
        onSuccess();
        onClose();
      } else {
        const err = await res.json();
        toast.error(err.message || 'Failed to send broadcast');
      }
    } catch (error) {
      console.error(error);
      toast.error('Network error');
    } finally {
      setSending(false);
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center px-4">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="absolute inset-0 bg-gray-900/60 backdrop-blur-sm"
          />
          
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 20 }}
            className="relative w-full max-w-2xl bg-white rounded-[2rem] shadow-2xl overflow-hidden"
          >
            <header className="px-8 py-6 border-b border-gray-50 flex items-center justify-between bg-white">
              <div>
                <h2 className="text-2xl font-black text-gray-900 flex items-center gap-3">
                  <div className="p-3 bg-emerald-100 text-emerald-600 rounded-2xl">
                    <Send size={24} strokeWidth={2.5} />
                  </div>
                  Broadcast Hub
                </h2>
                <p className="text-gray-400 text-xs mt-1 font-bold uppercase tracking-widest">fleet-wide live communications</p>
              </div>
              <button 
                onClick={onClose}
                className="p-3 hover:bg-gray-50 text-gray-400 rounded-full transition-colors"
              >
                <X size={24} strokeWidth={2.5} />
              </button>
            </header>

            <form onSubmit={handleBroadcast} className="p-8 space-y-8 max-h-[70vh] overflow-y-auto no-scrollbar">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <section className="space-y-6">
                  <div>
                    <label className="block text-[10px] font-black uppercase tracking-widest text-gray-400 mb-2 ml-1">Title</label>
                    <input
                      type="text"
                      required
                      className="w-full px-5 py-4 rounded-2xl bg-gray-50 border-none focus:ring-2 focus:ring-emerald-500 transition-all outline-none text-gray-900 font-medium"
                      placeholder="e.g. Schedule Update"
                      value={formData.title}
                      onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-black uppercase tracking-widest text-gray-400 mb-2 ml-1">Message Body</label>
                    <textarea
                      required
                      rows={5}
                      className="w-full px-5 py-4 rounded-2xl bg-gray-50 border-none focus:ring-2 focus:ring-emerald-500 transition-all outline-none text-gray-900 font-medium resize-none"
                      placeholder="Type your message here..."
                      value={formData.message}
                      onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                    />
                  </div>
                </section>

                <section className="space-y-6">
                  <div className="grid grid-cols-1 gap-6">
                    <div>
                      <label className="block text-[10px] font-black uppercase tracking-widest text-gray-400 mb-2 ml-1">Category</label>
                      <select
                        className="w-full px-5 py-3 rounded-xl bg-gray-50 border-none focus:ring-2 focus:ring-emerald-500 outline-none text-gray-700 font-bold"
                        value={formData.type}
                        onChange={(e) => setFormData({ ...formData, type: e.target.value })}
                      >
                        <option value="system">🚀 System</option>
                        <option value="sales">📈 Sales</option>
                        <option value="inventory">📦 Inventory</option>
                        <option value="cash">💰 Cash</option>
                        <option value="route">🗺️ Route</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-[10px] font-black uppercase tracking-widest text-gray-400 mb-2 ml-1">Importance</label>
                      <select
                        className="w-full px-5 py-3 rounded-xl bg-gray-50 border-none focus:ring-2 focus:ring-emerald-500 outline-none text-gray-700 font-bold"
                        value={formData.priority}
                        onChange={(e) => setFormData({ ...formData, priority: e.target.value })}
                      >
                        <option value="low">🟢 Low</option>
                        <option value="medium">🟡 Medium</option>
                        <option value="high">🔴 High</option>
                      </select>
                    </div>
                  </div>

                  <div>
                    <label className="block text-[10px] font-black uppercase tracking-widest text-gray-400 mb-3 ml-1">Target Audience</label>
                    <div className="grid grid-cols-3 gap-2">
                      {[
                        { id: 'all', icon: Users, label: 'All' },
                        { id: 'role', icon: Shield, label: 'Role' },
                        { id: 'vehicle', icon: Truck, label: 'Vehicle' }
                      ].map((t) => (
                        <button
                          key={t.id}
                          type="button"
                          onClick={() => setFormData({ ...formData, target: t.id })}
                          className={`flex flex-col items-center justify-center gap-1.5 p-3 rounded-xl border-2 transition-all ${
                            formData.target === t.id 
                              ? 'bg-emerald-600 border-emerald-600 text-white shadow-lg z-10' 
                              : 'bg-white border-gray-100 text-gray-400 hover:border-emerald-200'
                          }`}
                        >
                          <t.icon size={18} strokeWidth={2.5} />
                          <span className="text-[9px] font-black uppercase tracking-tighter">{t.label}</span>
                        </button>
                      ))}
                    </div>
                  </div>

                  {formData.target === 'role' && (
                    <div className="p-4 bg-emerald-50 rounded-xl border border-emerald-100">
                      <select
                        className="w-full bg-white px-3 py-2.5 rounded-lg border border-emerald-200 outline-none text-emerald-900 text-sm font-bold"
                        value={formData.role}
                        onChange={(e) => setFormData({ ...formData, role: e.target.value })}
                      >
                        <option value="SALES_AGENT">Agents / Drivers</option>
                        <option value="SUPERVISOR">Supervisors</option>
                        <option value="ADMIN">Administrators</option>
                      </select>
                    </div>
                  )}

                  {formData.target === 'vehicle' && (
                    <div className="p-4 bg-emerald-50 rounded-xl border border-emerald-100">
                      <input
                        type="text"
                        required
                        className="w-full bg-white px-3 py-2.5 rounded-lg border border-emerald-200 outline-none text-emerald-900 text-sm font-bold"
                        placeholder="Vehicle ID..."
                        value={formData.vehicleId}
                        onChange={(e) => setFormData({ ...formData, vehicleId: e.target.value })}
                      />
                    </div>
                  )}
                </section>
              </div>

              <button
                type="submit"
                disabled={sending}
                className="w-full h-14 flex items-center justify-center gap-3 bg-gray-900 hover:bg-emerald-600 disabled:bg-gray-400 text-white font-black rounded-2xl shadow-xl transition-all active:scale-95 group"
              >
                {sending ? (
                  <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                ) : (
                  <>
                    <Send size={18} className="group-hover:translate-x-1 group-hover:-translate-y-1 transition-transform" />
                    Deliver Broadcast Now
                  </>
                )}
              </button>
            </form>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
