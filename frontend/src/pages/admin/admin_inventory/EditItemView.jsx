import React from 'react';
import { ArrowLeft, Pencil, Package, Camera, Info, Barcode, Grid, Check, Loader2, ScanBarcode } from 'lucide-react';

const EditItemView = ({
  setIsEditView,
  modalTab,
  setModalTab,
  editItem,
  setEditItem,
  editPreviewUrl,
  handleEditFileChange,
  categories,
  subCategories,
  units,
  taxRates,
  handleUpdateItem,
  isUploading,
  setScannerTarget,
  setShowScanner
}) => {
  return (
    <div className="space-y-6 animate-in slide-in-from-right-4 duration-300">
      <div className="flex items-center justify-between">
        <button
          onClick={() => setIsEditView(false)}
          className="flex items-center gap-2 text-gray-500 hover:text-indigo-600 transition-colors font-bold text-sm bg-white px-4 py-2 rounded-xl border border-gray-100 shadow-sm"
        >
          <ArrowLeft size={18} />
          Back to List
        </button>
        <div className="flex items-center gap-2 bg-indigo-50 px-4 py-2 rounded-xl border border-indigo-100">
          <Pencil size={18} className="text-indigo-600" />
          <span className="text-indigo-700 font-black text-[10px] uppercase tracking-widest">Updating SKU: {editItem.displayId || editItem.id.substring(0, 8)}</span>
        </div>
      </div>

      <div className="bg-white rounded-[2.5rem] border border-gray-100 shadow-sm overflow-hidden">
        <div className="flex items-center border-b border-gray-50 bg-gray-50/30">
          <button
            onClick={() => setModalTab('info')}
            className={`flex-1 py-5 text-[10px] font-black uppercase tracking-[0.2em] transition-all flex items-center justify-center gap-2 ${modalTab === 'info' ? 'bg-white text-indigo-600 border-b-2 border-indigo-600' : 'text-gray-400 hover:text-gray-600'}`}
          >
            <Info size={16} /> Basic Information
          </button>
          <button
            onClick={() => setModalTab('price')}
            className={`flex-1 py-5 text-[10px] font-black uppercase tracking-[0.2em] transition-all flex items-center justify-center gap-2 ${modalTab === 'price' ? 'bg-white text-indigo-600 border-b-2 border-indigo-600' : 'text-gray-400 hover:text-gray-600'}`}
          >
            <Package size={16} /> Pricing & Meta
          </button>
        </div>

        <div className="p-8">
          {modalTab === 'info' ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 animate-in fade-in duration-300">
              <div className="space-y-6">
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] pl-1">Product Visual</label>
                  <div className="relative group aspect-square max-w-[200px] bg-gray-50 rounded-[2rem] border-2 border-dashed border-gray-200 overflow-hidden transition-all hover:border-indigo-300 flex items-center justify-center">
                    {editPreviewUrl || editItem.image ? (
                      <img src={editPreviewUrl || editItem.image} alt="Preview" className="w-full h-full object-cover group-hover:scale-105 transition-transform" />
                    ) : (
                      <div className="flex flex-col items-center gap-2 text-gray-300">
                        <Camera size={40} />
                        <span className="text-[9px] font-black uppercase tracking-widest">Update Image</span>
                      </div>
                    )}
                    <input
                      type="file"
                      onChange={handleEditFileChange}
                      className="absolute inset-0 opacity-0 cursor-pointer"
                      accept="image/*"
                    />
                  </div>
                </div>

                <div className="space-y-4">
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest pl-1">Display Name *</label>
                    <div className="relative flex items-center bg-gray-50 border border-gray-100 rounded-2xl px-4 focus-within:bg-white focus-within:ring-4 focus-within:ring-indigo-500/10 transition-all">
                      <Package size={16} className="text-gray-300" />
                      <input
                        type="text"
                        placeholder="Product name"
                        className="w-full py-4 bg-transparent outline-none text-sm font-bold text-gray-900 ml-3"
                        value={editItem.name}
                        onChange={(e) => setEditItem({ ...editItem, name: e.target.value })}
                      />
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest pl-1">Barcode / SKU ID</label>
                    <div className="relative flex items-center bg-gray-50 border border-gray-100 rounded-2xl px-4 focus-within:bg-white focus-within:ring-4 focus-within:ring-indigo-500/10 transition-all">
                      <Barcode size={16} className="text-gray-300" />
                      <input
                        type="text"
                        placeholder="Barcode"
                        className="w-full py-4 bg-transparent outline-none text-sm font-bold text-gray-900 ml-3"
                        value={editItem.barcode || ''}
                        onChange={(e) => setEditItem({ ...editItem, barcode: e.target.value })}
                      />
                      <button
                        type="button"
                        onClick={() => {
                          setScannerTarget('edit');
                          setShowScanner(true);
                        }}
                        className="p-2 m-1 bg-indigo-50 text-indigo-600 rounded-xl hover:bg-indigo-100 transition-colors"
                        title="Scan Barcode with Camera"
                      >
                        <ScanBarcode size={18} />
                      </button>
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-[10px] font-black text-emerald-600 uppercase tracking-widest pl-1">Stock Entry (Current)</label>
                    <div className="relative flex items-center bg-emerald-50/50 border border-emerald-100 rounded-2xl px-4 focus-within:bg-white focus-within:ring-4 focus-within:ring-emerald-500/10 transition-all">
                      <Package size={16} className="text-emerald-500" />
                      <input
                        type="number"
                        placeholder="Current Stock"
                        className="w-full py-4 bg-transparent outline-none text-sm font-black text-emerald-700 ml-3"
                        value={editItem.stock || '0'}
                        onChange={(e) => setEditItem({ ...editItem, stock: e.target.value })}
                      />
                    </div>
                  </div>
                </div>
              </div>

              <div className="space-y-6">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest pl-1">Category *</label>
                    <div className="relative">
                      <select
                        className="w-full bg-gray-50 border border-gray-100 rounded-2xl px-4 py-4 text-sm font-bold text-gray-900 focus:outline-none focus:ring-4 focus:ring-indigo-500/10 appearance-none"
                        value={editItem.categoryId}
                        onChange={(e) => setEditItem({ ...editItem, categoryId: e.target.value, subCategoryId: '' })}
                      >
                        {categories.map(cat => <option key={cat.id} value={cat.id}>{cat.name}</option>)}
                      </select>
                      <Grid size={16} className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-300 pointer-events-none" />
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest pl-1">Sub Category *</label>
                    <div className="relative">
                      <select
                        className="w-full bg-gray-50 border border-gray-100 rounded-2xl px-4 py-4 text-sm font-bold text-gray-900 focus:outline-none focus:ring-4 focus:ring-indigo-500/10 appearance-none"
                        value={editItem.subCategoryId}
                        onChange={(e) => setEditItem({ ...editItem, subCategoryId: e.target.value })}
                      >
                        <option value="">Select Sub Category</option>
                        {subCategories
                          .filter(sub => sub.categoryId === editItem.categoryId)
                          .map(sub => <option key={sub.id} value={sub.id}>{sub.name}</option>)
                        }
                      </select>
                      <Grid size={16} className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-300 pointer-events-none" />
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest pl-1">Unit Type *</label>
                    <select
                      className="w-full bg-gray-50 border border-gray-100 rounded-2xl px-4 py-4 text-sm font-bold text-gray-900 focus:outline-none"
                      value={editItem.unitId}
                      onChange={(e) => setEditItem({ ...editItem, unitId: e.target.value })}
                    >
                      {units.map(u => <option key={u.id} value={u.id}>{u.type}</option>)}
                    </select>
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest pl-1">Unit Value</label>
                    <input
                      type="text"
                      className="w-full bg-gray-50 border border-gray-100 rounded-2xl px-4 py-4 text-sm font-bold text-gray-900 focus:outline-none"
                      value={editItem.unitValue || ''}
                      onChange={(e) => setEditItem({ ...editItem, unitValue: e.target.value })}
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest pl-1">Product Description</label>
                  <textarea
                    rows={4}
                    className="w-full bg-gray-50 border border-gray-100 rounded-2xl px-4 py-4 text-sm font-bold text-gray-900 focus:outline-none resize-none"
                    value={editItem.description || ''}
                    onChange={(e) => setEditItem({ ...editItem, description: e.target.value })}
                  />
                </div>
              </div>
            </div>
          ) : (
            <div className="space-y-8 animate-in fade-in duration-300">
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                <div className="space-y-1.5">
                  <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest pl-1">Selling Price *</label>
                  <div className="relative flex items-center bg-gray-50 border border-gray-100 rounded-2xl px-4">
                    <span className="text-gray-400 font-bold">₹</span>
                    <input
                      type="number"
                      step="any"
                      className="w-full py-4 bg-transparent outline-none text-sm font-black text-emerald-600 ml-2"
                      value={editItem.price}
                      onChange={(e) => setEditItem({ ...editItem, price: e.target.value })}
                    />
                  </div>
                </div>
                <div className="space-y-1.5">
                  <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest pl-1">MRP Price</label>
                  <div className="relative flex items-center bg-gray-50 border border-gray-100 rounded-2xl px-4">
                    <span className="text-gray-400 font-bold">₹</span>
                    <input
                      type="number"
                      step="any"
                      className="w-full py-4 bg-transparent outline-none text-sm font-bold text-gray-400 ml-2"
                      value={editItem.mrp || ''}
                      onChange={(e) => setEditItem({ ...editItem, mrp: e.target.value })}
                    />
                  </div>
                </div>
                <div className="space-y-1.5">
                  <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest pl-1">Landing Price</label>
                  <div className="relative flex items-center bg-gray-50 border border-gray-100 rounded-2xl px-4">
                    <span className="text-gray-400 font-bold">₹</span>
                    <input
                      type="number"
                      step="any"
                      className="w-full py-4 bg-transparent outline-none text-sm font-bold text-indigo-600 ml-2"
                      value={editItem.landingPrice || ''}
                      onChange={(e) => setEditItem({ ...editItem, landingPrice: e.target.value })}
                    />
                  </div>
                </div>
                <div className="space-y-1.5">
                  <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest pl-1">GST Rate (%)</label>
                  <select
                    className="w-full bg-gray-50 border border-gray-100 rounded-2xl px-4 py-4 text-sm font-bold text-gray-900 focus:outline-none"
                    value={editItem.gst || '0'}
                    onChange={(e) => setEditItem({ ...editItem, gst: e.target.value })}
                  >
                    {taxRates.map(rate => <option key={rate} value={rate}>{rate}%</option>)}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 pt-4 border-t border-gray-50">
                <div className="space-y-1.5">
                  <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest pl-1">Low Stock Alert</label>
                  <input
                    type="number"
                    className="w-full bg-gray-50 border border-gray-100 rounded-2xl px-4 py-4 text-sm font-bold text-gray-900"
                    value={editItem.minStockAlert || '5'}
                    onChange={(e) => setEditItem({ ...editItem, minStockAlert: e.target.value })}
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest pl-1">Status</label>
                  <select
                    className="w-full bg-gray-50 border border-gray-100 rounded-2xl px-4 py-4 text-sm font-bold text-gray-900 focus:outline-none"
                    value={editItem.status || 'ACTIVE'}
                    onChange={(e) => setEditItem({ ...editItem, status: e.target.value })}
                  >
                    <option value="ACTIVE">Active</option>
                    <option value="INACTIVE">Inactive</option>
                  </select>
                </div>
                <div className="space-y-1.5">
                  <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest pl-1">Promotional</label>
                  <div className="flex items-center gap-3 py-3 px-4 bg-gray-50 rounded-2xl border border-gray-100">
                    <input
                      type="checkbox"
                      className="w-5 h-5 rounded-lg border-gray-300 text-indigo-600 focus:ring-indigo-500"
                      checked={editItem.isFree || false}
                      onChange={(e) => setEditItem({ ...editItem, isFree: e.target.checked })}
                    />
                    <span className="text-xs font-bold text-gray-700">Free Item</span>
                  </div>
                </div>
                {editItem.isFree && (
                  <div className="space-y-1.5 animate-in slide-in-from-left-2">
                    <label className="text-[10px] font-black text-emerald-600 uppercase tracking-widest pl-1">Min Bill Amount</label>
                    <div className="relative flex items-center bg-emerald-50 border border-emerald-100 rounded-2xl px-4">
                      <span className="text-emerald-400 font-bold">₹</span>
                      <input
                        type="number"
                        className="w-full py-4 bg-transparent outline-none text-sm font-black text-emerald-700 ml-2"
                        value={editItem.minShopAmount || ''}
                        onChange={(e) => setEditItem({ ...editItem, minShopAmount: e.target.value })}
                      />
                    </div>
                  </div>
                )}
              </div>

              <div className="pt-6 flex items-center justify-end gap-3 border-t border-gray-50">
                <button
                  onClick={() => setIsEditView(false)}
                  className="px-8 py-4 rounded-2xl text-[10px] font-black uppercase tracking-widest text-gray-400 hover:bg-gray-50 transition-all border border-transparent"
                >
                  Cancel
                </button>
                <button
                  onClick={handleUpdateItem}
                  disabled={isUploading || !editItem.name}
                  className="px-12 py-4 rounded-2xl bg-indigo-600 text-white text-[10px] font-black uppercase tracking-[0.2em] shadow-xl shadow-indigo-600/20 hover:bg-indigo-700 active:scale-95 transition-all disabled:opacity-50 flex items-center gap-2"
                >
                  {isUploading ? <><Loader2 size={18} className="animate-spin" /> Saving...</> : 'Save Changes'}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default EditItemView;
