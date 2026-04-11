import React, { useState, useEffect } from 'react';
import { Store, Loader2, MapPin, ChevronRight } from 'lucide-react';
import adminAPI from '../../services/adminService';
import { useUserStore } from '../../store/userStore';

export default function StoreSelector({ onSelect, title, description }) {
  const [stores, setStores] = useState([]);
  const [loading, setLoading] = useState(true);
  const user = useUserStore(s => s.user);

  useEffect(() => {
    adminAPI.getStores().then(res => {
      let fetchedStores = res.data?.data || [];
      // Filter if user is locked to a store (but Tenant Owners see all)
      if (user?.storeId && user?.role !== 'TENANT_OWNER' && user?.role !== 'SUPER_ADMIN') {
        fetchedStores = fetchedStores.filter(s => s.id === user.storeId);
      }
      setStores(fetchedStores);
      setLoading(false);
    }).catch(err => {
      console.error(err);
      setLoading(false);
    });
  }, [user]);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[40vh] gap-4">
        <Loader2 className="animate-spin text-emerald-600" size={32} />
        <p className="text-emerald-900/40 text-[10px] font-black uppercase tracking-widest mt-2">Loading Branches...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div>
        <h2 className="text-2xl font-black text-gray-900 tracking-tight">{title || 'Select Branch'}</h2>
        <p className="text-sm font-medium text-gray-500 mt-1">{description || 'Choose a specific store outlet to view its associated operational data.'}</p>
      </div>

      <div className="flex flex-col gap-3">
        {stores.map(store => (
          <button 
            key={store.id} 
            onClick={() => onSelect(store.id)} 
            className="text-left bg-white p-4 rounded-[1.5rem] border border-gray-100 hover:border-emerald-300 hover:shadow-md hover:-translate-y-0.5 transition-all duration-300 group relative overflow-hidden flex items-center justify-between"
          >
            <div className={`absolute top-0 left-0 w-1.5 h-full ${store.status === 'ACTIVE' ? 'bg-emerald-500' : 'bg-red-400'}`} />
            
            <div className="flex items-center gap-4 pl-3">
              <div className="w-14 h-14 rounded-2xl bg-emerald-50 flex items-center justify-center text-emerald-600 transition-transform group-hover:scale-105 shrink-0">
                <Store size={26} strokeWidth={2} />
              </div>
              
              <div>
                <h3 className="text-lg font-black text-gray-900 tracking-tight leading-none mb-1.5">{store.name}</h3>
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-black px-2 py-0.5 rounded-md bg-gray-100 text-gray-500 uppercase tracking-widest">{store.code}</span>
                  {store.address && (
                    <span className="text-xs font-bold text-gray-400 flex items-center gap-1">
                      <MapPin size={12} /> {store.address}
                    </span>
                  )}
                </div>
              </div>
            </div>

            <div className="w-10 h-10 rounded-xl bg-gray-50 flex items-center justify-center text-gray-400 group-hover:bg-emerald-600 group-hover:text-white transition-all shrink-0 mr-1">
               <ChevronRight size={18} strokeWidth={3} />
            </div>
          </button>
        ))}
        {stores.length === 0 && (
          <div className="col-span-full py-10 text-center bg-white rounded-3xl border border-dashed border-gray-200">
             <Store size={40} className="mx-auto text-gray-300 mb-3" />
             <h3 className="text-lg font-black text-gray-900">No Stores Found</h3>
             <p className="text-xs font-bold text-gray-400 uppercase tracking-widest">Create a store first</p>
          </div>
        )}
      </div>
    </div>
  );
}
