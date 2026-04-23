import React from 'react';
import { ArrowLeft, PlusCircle, Package, Camera, Info, Barcode, Grid, Plus, Trash2 } from 'lucide-react';

const CreateItemView = ({
  setIsCreateView,
  modalTab,
  setModalTab,
  newItem,
  setNewItem,
  previewUrl,
  handleFileChange,
  categories,
  subCategories,
  units,
  taxRates,
  handleCreateItem,
  isUploading
}) => {
  return (
    <div className="space-y-6 animate-in slide-in-from-right-4 duration-300">
      <div className="flex items-center justify-between">
        <button
          onClick={() => setIsCreateView(false)}
          className="flex items-center gap-2 text-gray-500 hover:text-emerald-600 transition-colors font-bold text-sm bg-white px-4 py-2 rounded-xl border border-gray-100 shadow-sm"
        >
          <ArrowLeft size={18} />
          Back to List
        </button>
        <div className="flex items-center gap-2 bg-emerald-50 px-4 py-2 rounded-xl border border-emerald-100">
          <PlusCircle size={18} className="text-emerald-600" />
          <span className="text-emerald-700 font-black text-[10px] uppercase tracking-widest">Drafting New SKU</span>
        </div>
      </div>

      <div className="bg-white rounded-[2.5rem] border border-gray-100 shadow-sm overflow-hidden">
        <div className="flex items-center border-b border-gray-50 bg-gray-50/30">
          <button
            onClick={() => setModalTab('info')}
            className={`flex-1 py-5 text-[10px] font-black uppercase tracking-[0.2em] transition-all flex items-center justify-center gap-2 ${modalTab === 'info' ? 'bg-white text-emerald-600 border-b-2 border-emerald-600' : 'text-gray-400 hover:text-gray-600'}`}
          >
            <Info size={16} /> Basic Information
          </button>
          <button
            onClick={() => setModalTab('price')}
            className={`flex-1 py-5 text-[10px] font-black uppercase tracking-[0.2em] transition-all flex items-center justify-center gap-2 ${modalTab === 'price' ? 'bg-white text-emerald-600 border-b-2 border-emerald-600' : 'text-gray-400 hover:text-gray-600'}`}
          >
            <Package size={16} /> Pricing & Stock
          </button>
        </div>

        <div className="p-8">
          {modalTab === 'info' ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 animate-in fade-in duration-300">
              <div className="space-y-6">
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] pl-1">Product Visual</label>
                  <div className="relative group aspect-square max-w-[200px] bg-gray-50 rounded-[2rem] border-2 border-dashed border-gray-200 overflow-hidden transition-all hover:border-emerald-300 flex items-center justify-center">
                    {previewUrl ? (
                      <img src={previewUrl} alt="Preview" className="w-full h-full object-cover group-hover:scale-105 transition-transform" />
                    ) : (
                      <div className="flex flex-col items-center gap-2 text-gray-300">
                        <Camera size={40} />
                        <span className="text-[9px] font-black uppercase tracking-widest">Select Image</span>
                      </div>
                    )}
                    <input
                      type="file"
                      onChange={handleFileChange}
                      className="absolute inset-0 opacity-0 cursor-pointer"
                      accept="image/*"
                    />
                  </div>
                </div>

                <div className="space-y-4">
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest pl-1">Display Name *</label>
                    <div className="relative flex items-center bg-gray-50 border border-gray-100 rounded-2xl px-4 focus-within:bg-white focus-within:ring-4 focus-within:ring-emerald-500/10 transition-all">
                      <Package size={16} className="text-gray-300" />
                      <input
                        type="text"
                        placeholder="e.g. Organic Tomato Ketchup"
                        className="w-full py-4 bg-transparent outline-none text-sm font-bold text-gray-900 ml-3"
                        value={newItem.name}
                        onChange={(e) => setNewItem({ ...newItem, name: e.target.value })}
                      />
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest pl-1">Barcode / SKU ID</label>
                    <div className="relative flex items-center bg-gray-50 border border-gray-100 rounded-2xl px-4 focus-within:bg-white focus-within:ring-4 focus-within:ring-emerald-500/10 transition-all">
                      <Barcode size={16} className="text-gray-300" />
                      <input
                        type="text"
                        placeholder="Scan or type barcode..."
                        className="w-full py-4 bg-transparent outline-none text-sm font-bold text-gray-900 ml-3"
                        value={newItem.barcode}
                        onChange={(e) => setNewItem({ ...newItem, barcode: e.target.value })}
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
                        className="w-full bg-gray-50 border border-gray-100 rounded-2xl px-4 py-4 text-sm font-bold text-gray-900 focus:outline-none focus:ring-4 focus:ring-emerald-500/10 appearance-none"
                        value={newItem.categoryId}
                        onChange={(e) => setNewItem({ ...newItem, categoryId: e.target.value })}
                      >
                        <option value="">Select Category</option>
                        {categories.map(cat => <option key={cat.id} value={cat.id}>{cat.name}</option>)}
                      </select>
                      <Grid size={16} className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-300 pointer-events-none" />
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest pl-1">Sub Category *</label>
                    <div className="relative">
                      <select
                        className="w-full bg-gray-50 border border-gray-100 rounded-2xl px-4 py-4 text-sm font-bold text-gray-900 focus:outline-none focus:ring-4 focus:ring-emerald-500/10 appearance-none"
                        value={newItem.subCategoryId}
                        onChange={(e) => setNewItem({ ...newItem, subCategoryId: e.target.value })}
                        disabled={!newItem.categoryId}
                      >
                        <option value="">Select Sub Category</option>
                        {subCategories
                          .filter(sub => sub.categoryId === newItem.categoryId)
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
                      className="w-full bg-gray-50 border border-gray-100 rounded-2xl px-4 py-4 text-sm font-bold text-gray-900 focus:outline-none focus:ring-4 focus:ring-emerald-500/10 appearance-none"
                      value={newItem.unitId}
                      onChange={(e) => setNewItem({ ...newItem, unitId: e.target.value })}
                    >
                      <option value="">Select Unit</option>
                      {units.map(u => <option key={u.id} value={u.id}>{u.type}</option>)}
                    </select>
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest pl-1">Unit Value</label>
                    <input
                      type="text"
                      placeholder="e.g. 500 (for 500g)"
                      className="w-full bg-gray-50 border border-gray-100 rounded-2xl px-4 py-4 text-sm font-bold text-gray-900 focus:outline-none focus:ring-4 focus:ring-emerald-500/10"
                      value={newItem.unitValue}
                      onChange={(e) => setNewItem({ ...newItem, unitValue: e.target.value })}
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest pl-1">Product Description</label>
                  <textarea
                    rows={4}
                    placeholder="Describe the product details..."
                    className="w-full bg-gray-50 border border-gray-100 rounded-2xl px-4 py-4 text-sm font-bold text-gray-900 focus:outline-none focus:ring-4 focus:ring-emerald-500/10 resize-none"
                    value={newItem.description}
                    onChange={(e) => setNewItem({ ...newItem, description: e.target.value })}
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
                      placeholder="0.00"
                      className="w-full py-4 bg-transparent outline-none text-sm font-black text-emerald-600 ml-2"
                      value={newItem.price}
                      onChange={(e) => setNewItem({ ...newItem, price: e.target.value })}
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
                      placeholder="0.00"
                      className="w-full py-4 bg-transparent outline-none text-sm font-bold text-gray-400 ml-2"
                      value={newItem.mrp}
                      onChange={(e) => setNewItem({ ...newItem, mrp: e.target.value })}
                    />
                  </div>
                </div>
                <div className="space-y-1.5">
                  <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest pl-1">Purchase Price (Lnd)</label>
                  <div className="relative flex items-center bg-gray-50 border border-gray-100 rounded-2xl px-4">
                    <span className="text-gray-400 font-bold">₹</span>
                    <input
                      type="number"
                      step="any"
                      placeholder="0.00"
                      className="w-full py-4 bg-transparent outline-none text-sm font-bold text-indigo-600 ml-2"
                      value={newItem.landingPrice}
                      onChange={(e) => setNewItem({ ...newItem, landingPrice: e.target.value })}
                    />
                  </div>
                </div>
                <div className="space-y-1.5">
                  <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest pl-1">GST Rate (%)</label>
                  <select
                    className="w-full bg-gray-50 border border-gray-100 rounded-2xl px-4 py-4 text-sm font-bold text-gray-900 focus:outline-none"
                    value={newItem.gst}
                    onChange={(e) => setNewItem({ ...newItem, gst: e.target.value })}
                  >
                    {taxRates.map(rate => <option key={rate} value={rate}>{rate}%</option>)}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 pt-4 border-t border-gray-50">
                <div className="space-y-1.5">
                  <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest pl-1">Initial Store Stock</label>
                  <input
                    type="number"
                    placeholder="0"
                    className="w-full bg-gray-50 border border-gray-100 rounded-2xl px-4 py-4 text-sm font-bold text-gray-900"
                    value={newItem.stock}
                    onChange={(e) => setNewItem({ ...newItem, stock: e.target.value })}
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest pl-1">Low Stock Alert (Qty)</label>
                  <input
                    type="number"
                    placeholder="5"
                    className="w-full bg-gray-50 border border-gray-100 rounded-2xl px-4 py-4 text-sm font-bold text-gray-900"
                    value={newItem.minStockAlert}
                    onChange={(e) => setNewItem({ ...newItem, minStockAlert: e.target.value })}
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest pl-1">Promotional (Free)</label>
                  <div className="flex items-center gap-3 py-3 px-4 bg-gray-50 rounded-2xl border border-gray-100">
                    <input
                      type="checkbox"
                      className="w-5 h-5 rounded-lg border-gray-300 text-emerald-600 focus:ring-emerald-500"
                      checked={newItem.isFree}
                      onChange={(e) => setNewItem({ ...newItem, isFree: e.target.checked })}
                    />
                    <span className="text-xs font-bold text-gray-700">Mark as Free Item</span>
                  </div>
                </div>
                {newItem.isFree && (
                  <div className="space-y-1.5 animate-in slide-in-from-left-2">
                    <label className="text-[10px] font-black text-emerald-600 uppercase tracking-widest pl-1">Min Bill Amount</label>
                    <div className="relative flex items-center bg-emerald-50 border border-emerald-100 rounded-2xl px-4">
                      <span className="text-emerald-400 font-bold">₹</span>
                      <input
                        type="number"
                        placeholder="0.00"
                        className="w-full py-4 bg-transparent outline-none text-sm font-black text-emerald-700 ml-2"
                        value={newItem.minShopAmount}
                        onChange={(e) => setNewItem({ ...newItem, minShopAmount: e.target.value })}
                      />
                    </div>
                  </div>
                )}
              </div>

              <div className="pt-6 flex items-center justify-between gap-4 border-t border-gray-50">
                <div className="flex-1">
                  <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest">Calculated Landing Price: <span className="text-gray-900">₹{newItem.landingPrice || '0.00'}</span></p>
                  <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest">Gross Margin: <span className="text-emerald-600">₹{((parseFloat(newItem.price) || 0) - (parseFloat(newItem.landingPrice) || 0)).toFixed(2)}</span></p>
                </div>
                <div className="flex items-center gap-3">
                  <button
                    onClick={() => setIsCreateView(false)}
                    className="px-8 py-4 rounded-2xl text-[10px] font-black uppercase tracking-widest text-gray-400 hover:bg-gray-50 transition-all border border-transparent"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleCreateItem}
                    disabled={isUploading || !newItem.name || !newItem.categoryId}
                    className="px-12 py-4 rounded-2xl bg-emerald-600 text-white text-[10px] font-black uppercase tracking-[0.2em] shadow-xl shadow-emerald-600/20 hover:bg-emerald-700 active:scale-95 transition-all disabled:opacity-50 flex items-center gap-2"
                  >
                    {isUploading ? <><Loader2 size={18} className="animate-spin" /> Uploading...</> : 'Save & Publish SKU'}
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default CreateItemView;
