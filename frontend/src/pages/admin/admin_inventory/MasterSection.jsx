import React from 'react';
import { 
  Search, Filter, CheckSquare, Square, Barcode, Grid, 
  Package, Gift, Pencil, Trash2, Loader2, ArrowLeft, Check, Plus, FileText, RefreshCw
} from 'lucide-react';

const MasterSection = ({
  selectedItems,
  toggleSelectItem,
  handleToggleStatus,
  openEditModal,
  handleDeleteItem,
  deletingId,
  handleSelectAll,
  filteredItems,
  masterSearch,
  setMasterSearch,
  setShowScanner,
  setScannerTarget,
  masterFreeOnly,
  setMasterFreeOnly,
  showFilters,
  setShowFilters,
  handleBulkDelete,
  isUploading,
  categories,
  masterCategory,
  setMasterCategory,
  masterSubCategory,
  setMasterSubCategory,
  subCategories,
  masterStatus,
  setMasterStatus,
  paginatedItems,
  totalPages,
  currentPage,
  setCurrentPage,
  itemsPerPage,
  can,
  setIsCreateView,
  setModalTab
}) => {

  const renderProductCard = (item) => {
    const isSelected = selectedItems.includes(item.id);
    return (
      <div
        key={item.id}
        className={`bg-white p-4 rounded-2xl border transition-all duration-200 ${isSelected ? 'border-emerald-500 bg-emerald-50/10' : item.isFree ? 'border-emerald-100 bg-emerald-50/20' : 'border-gray-100'} shadow-sm flex items-center justify-between group relative`}
      >
        <div className="flex items-center gap-4">
          <button
            onClick={() => toggleSelectItem(item.id)}
            className={`p-1 rounded-md transition-colors ${isSelected ? 'text-emerald-600' : 'text-gray-300'}`}
          >
            {isSelected ? <CheckSquare size={18} /> : <Square size={18} />}
          </button>
          <div className={`w-12 h-12 rounded-xl flex items-center justify-center overflow-hidden border shadow-inner ${item.isFree ? 'bg-emerald-50 border-emerald-100 text-emerald-600' : 'bg-gray-50 border-gray-100 text-gray-600'}`}>
            {item.image ? (
              <img src={item.image} alt={item.name} className="w-full h-full object-cover" />
            ) : (
              item.isFree ? <Gift size={24} /> : <Package size={24} />
            )}
          </div>
          <div className="flex flex-col">
            <div className="flex items-center gap-2">
              <h3 className={`text-[11px] font-black uppercase tracking-tight ${item.isFree ? 'text-emerald-950' : 'text-gray-900'}`}>{item.name}</h3>
              {item.displayId && <span className="text-[9px] font-black text-teal-600 bg-teal-50 px-1.5 py-0.5 rounded tracking-wider">{item.displayId}</span>}
              <div className="flex items-center gap-1.5 ml-auto">
                <div className="flex flex-col items-end">
                  <span className="text-[7px] font-black text-gray-400 uppercase tracking-widest">Stock</span>
                  <span className={`text-[10px] font-black ${item.stock > (item.minStockAlert || 5) ? 'text-emerald-700' : 'text-rose-600'}`}>
                    {item.stock || 0}
                  </span>
                </div>
              </div>
              {item.unit && (
                <span className="text-[9px] font-black text-gray-500 bg-gray-100 px-1.5 py-0.5 rounded uppercase tracking-tighter">
                  {item.unitValue || ''} {item.unit.type}
                </span>
              )}
              <span className={`text-[8px] font-black px-1.5 py-0.5 rounded uppercase tracking-widest shadow-sm ${item.status === 'INACTIVE' ? 'bg-orange-500 text-white' : (item.isFree ? 'bg-emerald-100 text-emerald-600' : 'bg-blue-100 text-blue-600')}`}>
                {item.status || 'ACTIVE'}
              </span>
            </div>
            <div className="flex items-center gap-2 mt-1">
              <span className="text-[9px] text-gray-400 uppercase font-black tracking-widest">{item.category?.name || 'Uncategorized'}</span>
              <span className="text-[8px] text-gray-300 font-bold">•</span>
              <span className="text-[9px] text-gray-500 uppercase font-black tracking-widest">{item.subCategory?.name || 'General Item'}</span>
            </div>
            <div className="flex items-center gap-3 mt-1.5 flex-wrap">
              <div className="flex flex-col">
                <span className="text-[10px] text-gray-400 uppercase font-black tracking-tighter">Selling</span>
                <span className="text-xs font-black text-emerald-700">₹{item.price}</span>
              </div>
              <div className="flex flex-col border-l border-gray-100 pl-3">
                <span className="text-[10px] text-gray-400 uppercase font-black tracking-tighter">MRP</span>
                <span className="text-[10px] text-gray-400 line-through">₹{item.mrp || 0}</span>
              </div>
              <div className="flex flex-col border-l border-gray-100 pl-3">
                <span className="text-[10px] text-gray-400 uppercase font-black tracking-tighter">Discount</span>
                <span className="text-[10px] text-orange-600 font-bold">₹{item.discount || 0}</span>
              </div>
              <div className="flex flex-col border-l border-gray-100 pl-3">
                <span className="text-[10px] text-gray-400 uppercase font-black tracking-tighter">Lnd. Price</span>
                <span className="text-[10px] text-slate-500 font-bold">₹{item.landingPrice || 0}</span>
              </div>
              <div className="flex flex-col border-l border-gray-100 pl-3">
                <span className="text-[10px] text-gray-400 uppercase font-black tracking-tighter">GST</span>
                <span className="text-[10px] text-blue-600 font-bold">{item.gst || 0}%</span>
              </div>
              {item.isFree && (
                <div className="flex flex-col border-l border-gray-100 pl-3">
                  <span className="text-[10px] text-emerald-600 uppercase font-black tracking-tighter">Free Above</span>
                  <span className="text-[10px] text-emerald-600 font-bold">₹{item.minShopAmount || 0}</span>
                </div>
              )}
            </div>
          </div>
        </div>
        <div className="flex items-center gap-1">
          {can('INVENTORY', 'TOGGLE_STATUS', 'MASTER') && (
            <button
              onClick={() => handleToggleStatus(item)}
              className={`text-xs font-bold p-2 rounded-lg flex items-center gap-1 transition-colors ${item.status === 'INACTIVE' ? 'text-emerald-600 hover:bg-emerald-50' : 'text-orange-600 hover:bg-orange-50'}`}
              title={item.status === 'INACTIVE' ? "Activate Item" : "Deactivate Item"}
            >
              <RefreshCw size={14} className={item.status === 'INACTIVE' ? 'text-emerald-600' : 'text-orange-600'} />
            </button>
          )}
          <div className="w-px h-4 bg-gray-200 mx-1 border-r border-gray-100" />
          {can('INVENTORY', 'UPDATE', 'MASTER') && (
            <button
              onClick={() => openEditModal(item)}
              className="text-gray-600 text-xs font-bold p-2 hover:bg-gray-100 rounded-lg flex items-center gap-1"
            >
              <Pencil size={14} />
            </button>
          )}
          {can('INVENTORY', 'DELETE', 'MASTER') && (
            <button
              onClick={() => handleDeleteItem(item)}
              title="Delete Item"
              disabled={deletingId === item.id}
              className="p-2 text-gray-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {deletingId === item.id
                ? <Loader2 size={14} className="animate-spin text-rose-400" />
                : <Trash2 size={14} />}
            </button>
          )}
        </div>
      </div>
    );
  };

  const allSelected = filteredItems.length > 0 && selectedItems.length === filteredItems.length;

  const renderDesktopTable = (itemsToRender) => (
    <div className="hidden md:block bg-white rounded-3xl border border-gray-100 shadow-sm overflow-hidden mb-6">
      <table className="w-full text-left border-collapse">
        <thead>
          <tr className="bg-gray-50/50">
            <th className="px-6 py-4 w-10">
              <button
                onClick={() => handleSelectAll(itemsToRender)}
                className={`p-1 rounded-md transition-colors ${selectedItems.length === itemsToRender.length && itemsToRender.length > 0 ? 'text-emerald-600' : 'text-gray-300'}`}
              >
                {selectedItems.length === itemsToRender.length && itemsToRender.length > 0 ? <CheckSquare size={18} /> : <Square size={18} />}
              </button>
            </th>
            <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-gray-400">Product</th>
            <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-gray-400">Category</th>
            <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-gray-400 text-center">Pricing</th>
            <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-gray-400 text-center">Tax</th>
            <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-emerald-600 text-center bg-emerald-50/30">Store Stock</th>
            <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-gray-400 text-center">Status</th>
            <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-gray-400 text-right">Actions</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-50">
          {itemsToRender.map((item) => {
            const isSelected = selectedItems.includes(item.id);
            return (
              <tr key={item.id} className={`hover:bg-gray-50/30 transition-colors group ${isSelected ? 'bg-emerald-50/10' : ''}`}>
                <td className="px-6 py-4">
                  <button
                    onClick={() => toggleSelectItem(item.id)}
                    className={`p-1 rounded-md transition-colors ${isSelected ? 'text-emerald-600' : 'text-gray-300'}`}
                  >
                    {isSelected ? <CheckSquare size={18} /> : <Square size={18} />}
                  </button>
                </td>
                <td className="px-6 py-4">
                  <div className="flex items-center gap-3">
                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center overflow-hidden border shadow-inner shrink-0 ${item.isFree ? 'bg-emerald-50 border-emerald-100 text-emerald-600' : 'bg-gray-50 border-gray-100 text-gray-600'}`}>
                      {item.image ? (
                        <img src={item.image} alt={item.name} className="w-full h-full object-cover" />
                      ) : (
                        item.isFree ? <Gift size={18} /> : <Package size={18} />
                      )}
                    </div>
                    <div className="flex flex-col">
                      <span className="text-sm font-bold text-gray-900 leading-tight">{item.name}</span>
                      {item.displayId && <span className="text-[9px] font-black w-fit text-teal-600 bg-teal-50 px-1.5 py-0.5 rounded tracking-wider mt-0.5">{item.displayId}</span>}
                      {item.unit && (
                        <span className="text-[9px] font-black text-gray-400 uppercase tracking-tighter">
                          {item.unitValue || ''} {item.unit.type}
                        </span>
                      )}
                    </div>
                  </div>
                </td>
                <td className="px-6 py-4">
                  <div className="flex flex-col gap-1">
                    <span className="text-[9px] font-black text-gray-400 uppercase tracking-widest w-fit bg-gray-50 px-2 py-1 rounded-lg border border-gray-100">
                      {item.category?.name || 'Uncategorized'}
                    </span>
                    <span className="text-[8px] font-bold text-gray-500 uppercase tracking-wider pl-1">
                      ↳ {item.subCategory?.name || 'General Item'}
                    </span>
                  </div>
                </td>
                <td className="px-6 py-4">
                  <div className="flex items-center justify-center gap-4">
                    <div className="flex flex-col items-center">
                      <span className="text-[8px] font-black text-gray-300 uppercase tracking-tighter">Selling</span>
                      <span className="text-xs font-black text-emerald-700">₹{item.price}</span>
                    </div>
                    <div className="flex flex-col items-center border-l border-gray-100 pl-4 text-gray-400">
                      <span className="text-[8px] font-black uppercase tracking-tighter">MRP</span>
                      <span className="text-[10px] line-through">₹{item.mrp || 0}</span>
                    </div>
                    <div className="flex flex-col items-center border-l border-gray-100 pl-4">
                      <span className="text-[8px] font-black text-orange-400 uppercase tracking-tighter">Disc</span>
                      <span className="text-[10px] text-orange-600 font-bold">₹{item.discount || 0}</span>
                    </div>
                  </div>
                </td>
                <td className="px-6 py-4 text-center">
                  <span className="text-[10px] font-black text-blue-600 bg-blue-50 px-2 py-1 rounded-full uppercase tracking-widest border border-blue-100">
                    {item.gst || 0}%
                  </span>
                </td>
                <td className="px-6 py-4 text-center bg-emerald-50/10">
                  <div className="flex flex-col items-center">
                    <span className={`text-xs font-black ${item.stock > (item.minStockAlert || 5) ? 'text-emerald-700' : 'text-rose-600'}`}>
                      {item.stock || 0}
                    </span>
                    <span className="text-[7px] font-black text-gray-400 uppercase tracking-widest leading-none mt-0.5">Stock</span>
                  </div>
                </td>
                <td className="px-6 py-4 text-center">
                  <span className={`text-[8px] font-black px-2 py-1 rounded-full uppercase tracking-widest shadow-sm ${item.status === 'INACTIVE' ? 'bg-orange-500 text-white' : (item.isFree ? 'bg-emerald-100 text-emerald-600' : 'bg-emerald-500 text-white')}`}>
                    {item.status || 'ACTIVE'}
                  </span>
                </td>
                <td className="px-6 py-4">
                  <div className="flex items-center justify-end gap-1 transition-all">
                    {can('INVENTORY', 'UPDATE', 'MASTER') && (
                      <button
                        onClick={() => openEditModal(item)}
                        className="p-2 text-indigo-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-xl transition-all"
                        title="Edit Item"
                      >
                        <Pencil size={16} />
                      </button>
                    )}
                    {can('INVENTORY', 'DELETE', 'MASTER') && (
                      <button
                        onClick={() => handleDeleteItem(item)}
                        disabled={deletingId === item.id}
                        className="p-2 text-rose-400 hover:text-rose-600 hover:bg-rose-50 rounded-xl transition-all disabled:opacity-50"
                        title="Delete Item"
                      >
                        {deletingId === item.id ? <Loader2 size={16} className="animate-spin" /> : <Trash2 size={16} />}
                      </button>
                    )}
                  </div>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <div className="flex-1 flex items-center gap-2 bg-white p-2.5 rounded-2xl border border-gray-100 shadow-sm">
          <div className="flex items-center gap-2 pl-2">
            <button
              onClick={() => handleSelectAll(filteredItems)}
              className={`p-1 rounded-md transition-colors ${allSelected ? 'text-emerald-600' : 'text-gray-300'}`}
              title="Select All"
            >
              {allSelected ? <CheckSquare size={18} /> : <Square size={18} />}
            </button>
          </div>
          <Search size={18} className="text-gray-400 shrink-0" />
          <input
            type="text"
            placeholder="Search items by name or barcode..."
            className="w-full bg-transparent border-none focus:outline-none text-sm min-w-0"
            value={masterSearch}
            onChange={(e) => setMasterSearch(e.target.value)}
          />
          <button
            onClick={() => {
              setScannerTarget('master');
              setShowScanner(true);
            }}
            className="p-1.5 rounded-xl hover:bg-gray-50 text-gray-400 hover:text-blue-600 transition-all border border-transparent hover:border-gray-100 flex items-center justify-center shrink-0"
            title="Scan Barcode to Search"
          >
            <Barcode size={18} />
          </button>
          <div className="flex items-center gap-1.5 shrink-0 border-l border-gray-100 pl-2">
            <button
              onClick={() => setMasterFreeOnly(!masterFreeOnly)}
              className={`px-2.5 py-1.5 rounded-xl text-[10px] uppercase tracking-wider font-bold transition-all border ${masterFreeOnly ? 'bg-emerald-50 border-emerald-200 text-emerald-700 shadow-sm' : 'bg-gray-50 border-gray-100 text-gray-500 hover:bg-gray-100'}`}
            >
              {masterFreeOnly ? '✓ Free Only' : 'Free'}
            </button>
            <button
              onClick={() => setShowFilters(!showFilters)}
              className={`p-1.5 rounded-xl transition-colors border ${showFilters ? 'bg-emerald-50 border-emerald-100 text-emerald-600 shadow-sm' : 'bg-white border-transparent hover:bg-gray-50 text-gray-400'}`}
              title="Advanced Filters"
            >
              <Filter size={16} />
            </button>
          </div>
        </div>
        {selectedItems.length > 0 && (
          <button
            onClick={handleBulkDelete}
            disabled={isUploading}
            className="bg-rose-50 text-rose-600 px-4 py-3 rounded-2xl border border-rose-100 shadow-sm hover:bg-rose-100 transition-all flex items-center gap-2 font-bold text-sm"
          >
            <Trash2 size={18} />
            <span>Delete {selectedItems.length}</span>
          </button>
        )}
      </div>

      {/* Categories Quick Filter */}
      <div className="relative group mb-4">
        <div className="flex items-center gap-2 overflow-x-auto pb-1 no-scrollbar scroll-smooth">
          <button
            onClick={() => { setMasterCategory('ALL'); setMasterSubCategory('ALL'); }}
            className={`whitespace-nowrap px-5 py-2.5 rounded-2xl text-[10px] uppercase tracking-widest font-black transition-all border ${masterCategory === 'ALL'
              ? 'bg-emerald-600 border-emerald-600 text-white shadow-lg shadow-emerald-500/20'
              : 'bg-white border-gray-100 text-gray-400 hover:border-emerald-200 hover:text-emerald-600'
              }`}
          >
            All Items
          </button>
          {categories.map((cat) => (
            <button
              key={cat.id}
              onClick={() => { setMasterCategory(cat.name); setMasterSubCategory('ALL'); }}
              className={`flex items-center gap-2 whitespace-nowrap px-5 py-2.5 rounded-2xl text-[10px] uppercase tracking-widest font-black transition-all border ${masterCategory === cat.name
                ? 'bg-emerald-600 border-emerald-600 text-white shadow-lg shadow-emerald-500/20'
                : 'bg-white border-gray-100 text-gray-400 hover:border-emerald-200 hover:text-emerald-600'
                }`}
            >
              {cat.name}
            </button>
          ))}
        </div>
      </div>

      {/* Sub-Categories Quick Filter */}
      {masterCategory !== 'ALL' && (
        <div className="relative group mb-6 animate-in slide-in-from-top-2 duration-300">
          <div className="flex items-center gap-2 overflow-x-auto pb-1 no-scrollbar scroll-smooth">
            <div className="flex items-center gap-2 px-3 py-1 bg-emerald-50 rounded-xl border border-emerald-100 mr-2">
              <Grid size={12} className="text-emerald-500" />
              <span className="text-[10px] font-black text-emerald-700 uppercase tracking-widest">Sub Categories</span>
            </div>
            <button
              onClick={() => setMasterSubCategory('ALL')}
              className={`whitespace-nowrap px-4 py-2 rounded-xl text-[9px] uppercase tracking-widest font-black transition-all border ${masterSubCategory === 'ALL'
                ? 'bg-emerald-500 border-emerald-500 text-white shadow-md'
                : 'bg-white border-gray-100 text-gray-400 hover:border-emerald-200'
                }`}
            >
              All {masterCategory}
            </button>
            {subCategories
              .filter(sub => {
                const parentCat = categories.find(c => c.name === masterCategory);
                return sub.categoryId === parentCat?.id;
              })
              .map((sub) => (
                <button
                  key={sub.id}
                  onClick={() => setMasterSubCategory(sub.name)}
                  className={`whitespace-nowrap px-4 py-2 rounded-xl text-[9px] uppercase tracking-widest font-black transition-all border ${masterSubCategory === sub.name
                    ? 'bg-emerald-500 border-emerald-500 text-white shadow-md'
                    : 'bg-white border-gray-100 text-gray-400 hover:border-emerald-200'
                    }`}
                >
                  {sub.name}
                </button>
              ))}
          </div>
        </div>
      )}

      {showFilters && (
        <div className="bg-white p-4 rounded-2xl border border-gray-100 shadow-sm flex flex-wrap gap-4 animate-in slide-in-from-top-2 duration-200">
          <div className="space-y-1 flex-1 min-w-[150px]">
            <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Additional Filters</label>
            <div className="flex items-center gap-2 text-xs font-medium text-gray-500 bg-gray-50 p-2 rounded-xl border border-gray-100">
              <Check size={14} className="text-emerald-500" />
              Category Filter is active ({masterCategory})
            </div>
          </div>
          <div className="space-y-1 flex-1 min-w-[150px]">
            <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Status</label>
            <select
              className="w-full bg-gray-50 border border-gray-100 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20 appearance-none"
              value={masterStatus}
              onChange={(e) => setMasterStatus(e.target.value)}
            >
              <option value="ALL">All Status</option>
              <option value="ACTIVE">Active</option>
              <option value="INACTIVE">Inactive</option>
            </select>
          </div>

          <div className="flex items-end">
            <button
              onClick={() => { setMasterCategory('ALL'); setMasterSubCategory('ALL'); setMasterStatus('ALL'); setMasterSearch(''); setMasterFreeOnly(false); }}
              className="text-xs font-bold text-gray-400 hover:text-gray-600 px-3 py-2"
            >
              Clear Filters
            </button>
          </div>
        </div>
      )}

      <div className="space-y-6">
        {filteredItems.length === 0 ? (
          <div className="py-12 bg-white rounded-2xl border border-gray-100 text-center shadow-sm">
            <Package size={32} className="mx-auto text-gray-200 mb-2" />
            <p className="text-sm font-bold text-gray-400">No items match your filters</p>
          </div>
        ) : (
          <>
            {/* Mobile Card View */}
            <div className="md:hidden space-y-8">
              {paginatedItems.filter(i => !i.isFree).length > 0 && (
                <div className="space-y-3">
                  <h4 className="text-[10px] font-black text-gray-400 uppercase tracking-widest pl-2">Regular Products</h4>
                  {paginatedItems.filter(i => !i.isFree).map(renderProductCard)}
                </div>
              )}
              {paginatedItems.filter(i => i.isFree).length > 0 && (
                <div className="space-y-3 mt-4">
                  <h4 className="text-[10px] font-black text-emerald-500 uppercase tracking-widest pl-2 flex items-center gap-1.5"><Gift size={14} /> Promotional Gifts</h4>
                  {paginatedItems.filter(i => i.isFree).map(renderProductCard)}
                </div>
              )}
            </div>

            {/* Desktop Table View */}
            <div className="hidden md:block space-y-8">
              {paginatedItems.filter(i => !i.isFree).length > 0 && (
                <div className="space-y-3">
                  <h4 className="text-[10px] font-black text-gray-400 uppercase tracking-widest pl-4">Regular Products</h4>
                  {renderDesktopTable(paginatedItems.filter(i => !i.isFree))}
                </div>
              )}
              {paginatedItems.filter(i => i.isFree).length > 0 && (
                <div className="space-y-3 mt-8">
                  <h4 className="text-[10px] font-black text-emerald-500 uppercase tracking-widest pl-4 flex items-center gap-1.5"><Gift size={14} /> Promotional Gifts</h4>
                  {renderDesktopTable(paginatedItems.filter(i => i.isFree))}
                </div>
              )}
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex flex-col md:flex-row items-center justify-between gap-4 mt-8 px-2 border-t border-gray-100 pt-6">
                <div className="text-[10px] font-black text-gray-400 uppercase tracking-widest">
                  Showing {Math.min(filteredItems.length, (currentPage - 1) * itemsPerPage + 1)} to {Math.min(filteredItems.length, currentPage * itemsPerPage)} of {filteredItems.length} Products
                </div>
                <div className="flex items-center gap-2">
                  <button
                    disabled={currentPage === 1}
                    onClick={() => { setCurrentPage(p => Math.max(1, p - 1)); window.scrollTo({ top: 0, behavior: 'smooth' }); }}
                    className="p-2.5 rounded-xl border border-gray-100 bg-white text-gray-600 disabled:opacity-30 disabled:cursor-not-allowed hover:bg-gray-50 transition-all font-black text-[10px] uppercase tracking-widest flex items-center gap-2"
                  >
                    <ArrowLeft size={14} /> Previous
                  </button>
                  {(() => {
                    let pages = [];
                    let startPage = Math.max(1, currentPage - 2);
                    let endPage = Math.min(totalPages, startPage + 4);
                    if (endPage - startPage < 4) startPage = Math.max(1, endPage - 4);

                    for (let i = startPage; i <= endPage; i++) {
                      if (i > 0) {
                        pages.push(
                          <button
                            key={i}
                            onClick={() => { setCurrentPage(i); window.scrollTo({ top: 0, behavior: 'smooth' }); }}
                            className={`w-10 h-10 rounded-xl text-xs font-black transition-all ${currentPage === i ? 'bg-emerald-600 text-white shadow-lg shadow-emerald-500/20' : 'bg-white border border-gray-100 text-gray-400 hover:border-emerald-200'}`}
                          >
                            {i}
                          </button>
                        );
                      }
                    }
                    return pages;
                  })()}
                  <button
                    disabled={currentPage === totalPages}
                    onClick={() => { setCurrentPage(p => Math.min(totalPages, p + 1)); window.scrollTo({ top: 0, behavior: 'smooth' }); }}
                    className="p-2.5 rounded-xl border border-gray-100 bg-white text-gray-600 disabled:opacity-30 disabled:cursor-not-allowed hover:bg-gray-50 transition-all font-black text-[10px] uppercase tracking-widest flex items-center gap-2"
                  >
                    Next <ArrowLeft size={14} className="rotate-180" />
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
};

export default MasterSection;
