import React from 'react';
import { CreditCard, Percent, FileText, ChevronRight, Bell, Lock, User } from 'lucide-react';

export default function AdminSettings() {
  const sections = [
    { 
      title: 'Payment Settings', 
      icon: CreditCard, 
      items: ['Add/Edit Payment Modes', 'UPI Settings', 'Card Terminal Config'] 
    },
    { 
      title: 'Tax & Billing', 
      icon: Percent, 
      items: ['Tax Settings (GST)', 'Currency Options'] 
    },
    { 
      title: 'Invoice Format', 
      icon: FileText, 
      items: ['Header/Footer Text', 'Upload Logo', 'Sequential Numbering'] 
    },
    { 
      title: 'Notifications', 
      icon: Bell, 
      items: ['Low Stock Alerts', 'Daily Sales Report Email'] 
    },
    { 
      title: 'Security & Roles', 
      icon: Lock, 
      items: ['Role Permissions', 'Audit Logs'] 
    }
  ];

  return (
    <div className="space-y-6 pb-4">
      <div className="flex flex-col gap-1">
        <h2 className="text-2xl font-bold text-gray-900">Settings</h2>
        <p className="text-sm text-gray-500">Configure your platform behavior</p>
      </div>

      <div className="space-y-4">
        {sections.map((section) => (
          <div key={section.title} className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
            <div className="p-4 bg-gray-50 border-b border-gray-100 flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-emerald-100 flex items-center justify-center text-emerald-600">
                <section.icon size={18} />
              </div>
              <h3 className="font-bold text-gray-900 text-sm">{section.title}</h3>
            </div>
            <div className="divide-y divide-gray-50">
              {section.items.map((item) => (
                <button key={item} className="w-full flex items-center justify-between px-6 py-4 hover:bg-gray-50 transition-colors group">
                  <span className="text-sm text-gray-600 group-hover:text-emerald-600 font-medium transition-colors">{item}</span>
                  <ChevronRight size={16} className="text-gray-300 group-hover:text-emerald-500 transition-colors" />
                </button>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
