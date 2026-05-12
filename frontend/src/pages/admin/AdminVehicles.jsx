import React, { useState, useEffect, useMemo } from 'react';
import { Plus, Truck, User, ArrowRight, CheckCircle2, XCircle, X, Loader2, Pencil, Trash2, FileText, Search, Store, ArrowLeft, ChevronLeft, ChevronRight, Package, Download, MapPin, Users, Fuel, IndianRupee, Wrench, Zap, Settings, ClipboardCheck, Activity, BarChart3, RotateCcw, ShoppingBag, History, Grid, PlusCircle, AlertCircle, ScanBarcode, Building2 } from 'lucide-react';
import adminAPI from '../../services/adminService';
import toast from 'react-hot-toast';
import { useSearchParams, useLocation, useNavigate } from 'react-router-dom';
import { useUserStore } from '../../store/userStore';
import * as XLSX from 'xlsx';
import { generateReportPDF } from './adminreports/ReportUtils';

// Modular Components Integration
import FuelLogsSection from './admin_inventory/FuelLogsSection';
import MaintenanceSection from './admin_inventory/MaintenanceSection';
import TripManagementSection from './admin_inventory/TripManagementSection';
import VehicleStockSection from './admin_inventory/VehicleStockSection';
import LoadingSection from './admin_inventory/LoadingSection';
import ReturnSection from './admin_inventory/ReturnSection';
import RefillsSection from './admin_inventory/RefillsSection';
import OpeningStockSection from './admin_inventory/OpeningStockSection';
import RouteMappingSection from './admin_vehicles/RouteMappingSection';
import VehicleSalesSection from './admin_vehicles/VehicleSalesSection';
import RouteCollectionSection from './admin_vehicles/RouteCollectionSection';
import VehicleDamagesSection from './admin_vehicles/VehicleDamagesSection';

export default function AdminVehicles() {
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();
  const activeSub = searchParams.get('sub') || 'master';
  const storeFilterId = searchParams.get('storeId');
  const location = useLocation();
  const isTenantRoute = location.pathname.startsWith('/tenant');
  const currentUser = useUserStore(s => s.user);
  const can = useUserStore(s => s.can);

  const [vehicles, setVehicles] = useState([]);
  const [users, setUsers] = useState([]);
  const [stores, setStores] = useState([]);
  const [loading, setLoading] = useState(true);
  const [allVehiclesStock, setAllVehiclesStock] = useState({});
  const [loadingTracking, setLoadingTracking] = useState(false);
  const [auditHistory, setAuditHistory] = useState([]);
  const [isAuditMode, setIsAuditMode] = useState(false);
  const [auditQuantities, setAuditQuantities] = useState({});
  const [auditRemark, setAuditRemark] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [viewingVehicleId, setViewingVehicleId] = useState(null);
  const [vehicleSearch, setVehicleSearch] = useState('');
  const [showScanner, setShowScanner] = useState(false);
  const [scannerTarget, setScannerTarget] = useState('tracking');
  const [loadingVehicles, setLoadingVehicles] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showAssignModal, setShowAssignModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [selectedVehicle, setSelectedVehicle] = useState(null);
  const [editingVehicle, setEditingVehicle] = useState(null);
  const [editDocuments, setEditDocuments] = useState({ rcDocument: null, insuranceDocument: null, permitDocument: null });
  const [deletingId, setDeletingId] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  
  // Audit Modal States
  const [showAuditModal, setShowAuditModal] = useState(false);
  const [showPolicyModal, setShowPolicyModal] = useState(false);
  const [handoverPolicy, setHandoverPolicy] = useState('INHERIT'); // 'INHERIT' | 'CARRY_OVER'
  const [existingStockPolicy, setExistingStockPolicy] = useState('MERGE'); // 'MERGE' | 'SWAP_TO_SOURCE' | 'FLUSH_TO_WAREHOUSE'
  const [carryOverTargetVehicleId, setCarryOverTargetVehicleId] = useState('WAREHOUSE');
  const [carryOverTargetUserId, setCarryOverTargetUserId] = useState('');
  const [destExistingStocks, setDestExistingStocks] = useState([]);
  const [loadingDestStocks, setLoadingDestStocks] = useState(false);
  const [auditTargetUser, setAuditTargetUser] = useState(null);
  const [vehicleInventory, setVehicleInventory] = useState([]);
  const [isAuditing, setIsAuditing] = useState(false);
  const [auditSearch, setAuditSearch] = useState('');
  const [agentSearch, setAgentSearch] = useState('');
  const [mappingSearch, setMappingSearch] = useState('');
  
  // Inventory Operation States
  const [items, setItems] = useState([]);
  const [stockQuantities, setStockQuantities] = useState({});
  const [opsSearch, setOpsSearch] = useState('');
  const [refillSearch, setRefillSearch] = useState('');
  const [opsCategory, setOpsCategory] = useState('ALL');
  const [opsSubCategory, setOpsSubCategory] = useState('ALL');
  const [itemsPerPage] = useState(25);
  const [selectedVehicleId, setSelectedVehicleId] = useState('');
  const [showLoadConfirmModal, setShowLoadConfirmModal] = useState(false);
  const [pendingLoadItems, setPendingLoadItems] = useState([]);
  const [returnSearch, setReturnSearch] = useState('');
  const [openingSearch, setOpeningSearch] = useState('');
  const [vehicleInventoryMap, setVehicleInventoryMap] = useState({});
  const [refillRequests, setRefillRequests] = useState([]);
  const [viewingAgentId, setViewingAgentId] = useState(null);

  useEffect(() => {
    setViewingAgentId(null);
  }, [activeSub]);
  const [unselectedRefillItems, setUnselectedRefillItems] = useState([]);
  const [editedQuantities, setEditedQuantities] = useState({});
  const [processingItems, setProcessingItems] = useState(new Set());
  const [stockInputs, setStockInputs] = useState({});
  const [loadingRefills, setLoadingRefills] = useState(false);

  const ITEMS_PER_PAGE = 10;

  const [newVehicle, setNewVehicle] = useState({
    vehicleNumber: '',
    vehicleName: '',
    assignedUserId: '',
    status: true,
    storeId: storeFilterId || currentUser?.storeId || ''
  });
  const [documents, setDocuments] = useState({ rcDocument: null, insuranceDocument: null, permitDocument: null });

  const fetchData = async () => {
    try {
      setLoading(true);
      const [vRes, uRes, sRes, stockRes, auditRes] = await Promise.all([
        adminAPI.getVehicles({ storeId: storeFilterId }), 
        adminAPI.getUsers({ storeId: storeFilterId }), 
        adminAPI.getStores(),
        adminAPI.getInventoryInit({ storeId: storeFilterId }),
        adminAPI.getAuditHistory({ storeId: storeFilterId })
      ]);
      setVehicles(vRes.data);
      const fetchedStores = sRes.data?.success ? sRes.data.data : (sRes.data || []);
      setStores(fetchedStores);
      // Filter out Consumers AND Admins - only show agents/staff for vehicles
      setUsers(uRes.data.filter(u => u.role !== 'CONSUMER' && u.role !== 'ADMIN'));
      
      if (stockRes.data?.items) {
          setItems(stockRes.data.items);
      }
      if (stockRes.data?.vehicleStock) {
        setAllVehiclesStock(stockRes.data.vehicleStock);
      }
      setAuditHistory(auditRes.data || []);

      // Auto-select if only one store exists
      if (fetchedStores.length === 1 && !storeFilterId) {
        setSearchParams({ storeId: fetchedStores[0].id });
      }
    } catch {
      toast.error('Failed to fetch vehicle data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchData(); }, [storeFilterId]);

  // --- Inventory Memos & Logic ---
  const loadingFilteredItems = useMemo(() => {
    const q = opsSearch.toLowerCase();
    return items.filter(i => {
      const matchesSearch = i.name.toLowerCase().includes(q) ||
        (i.barcode && i.barcode.toLowerCase().includes(q)) ||
        (i.displayId && i.displayId.toLowerCase().includes(q));
      const hasStock = (i.stock || 0) > 0;
      return matchesSearch && hasStock;
    });
  }, [items, opsSearch]);

  const groupedLoadingItems = useMemo(() => {
    const regular = [];
    const free = [];
    loadingFilteredItems.forEach(i => {
      if (i.isFree) free.push(i);
      else regular.push(i);
    });
    return { regular, free };
  }, [loadingFilteredItems]);

  const totalLoadingValue = useMemo(() => {
    return Object.entries(stockQuantities).reduce((acc, [pid, qty]) => {
      const item = items.find(i => i.id === pid);
      return acc + ((item?.price || 0) * (qty || 0));
    }, 0);
  }, [stockQuantities, items]);

  const hasInvalidQuantities = useMemo(() => {
    return Object.entries(stockQuantities).some(([pid, qty]) => {
      const prod = items.find(p => p.id === pid);
      return prod && (parseInt(qty) || 0) > (prod.stock || 0);
    });
  }, [stockQuantities, items]);

  const handleQuantityChange = (productId, qty) => {
    setStockQuantities(prev => ({ ...prev, [productId]: qty }));
  };

  const handleInitiateLoad = () => {
    if (!selectedVehicleId) return toast.error('Please select a vehicle');
    const actionItems = Object.entries(stockQuantities)
      .filter(([_, qty]) => qty > 0)
      .map(([productId, quantity]) => {
        const itemDetails = items.find(i => i.id === productId);
        return {
          productId,
          quantity: parseInt(quantity),
          name: itemDetails?.name,
          price: itemDetails?.price
        };
      });
    if (actionItems.length === 0) return toast.error('Please enter quantities');
    setPendingLoadItems(actionItems);
    handleConfirmLoad(actionItems); // Directly confirm for now to match simplicity or add modal if requested
  };

  const handleConfirmLoad = async (itemsToLoadOverride) => {
    setIsSubmitting(true);
    try {
      const itemsToLoad = (itemsToLoadOverride || pendingLoadItems).map(i => ({ productId: i.productId, quantity: i.quantity }));
      await adminAPI.loadStock({ vehicleId: selectedVehicleId, items: itemsToLoad });
      toast.success('Stock loaded successfully');
      setStockQuantities({});
      fetchData();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to load stock');
    } finally {
      setIsSubmitting(false);
    }
  };

  // --- Return Logic ---
  const returnFilteredItems = useMemo(() => {
    const q = returnSearch.toLowerCase();
    return items.filter(i => {
      const matchesSearch = i.name.toLowerCase().includes(q) ||
        (i.barcode && i.barcode.toLowerCase().includes(q)) ||
        (i.displayId && i.displayId.toLowerCase().includes(q));
      return matchesSearch;
    });
  }, [items, returnSearch]);

  const groupedReturnItems = useMemo(() => {
    const regular = [];
    const free = [];
    returnFilteredItems.forEach(i => {
      if (i.isFree) free.push(i);
      else regular.push(i);
    });
    return { regular, free };
  }, [returnFilteredItems]);

  const totalReturnInventoryValue = useMemo(() => {
    return Object.entries(stockQuantities).reduce((acc, [pid, qty]) => {
      const item = items.find(i => i.id === pid);
      return acc + ((item?.price || 0) * (qty || 0));
    }, 0);
  }, [stockQuantities, items]);

  const hasInvalidReturnQuantities = useMemo(() => {
    return Object.entries(stockQuantities).some(([pid, qty]) => {
      const currentVehicleStock = vehicleInventoryMap[pid] || 0;
      return (parseInt(qty) || 0) > currentVehicleStock;
    });
  }, [stockQuantities, vehicleInventoryMap]);

  const handleStockAction = async (type) => {
    if (!selectedVehicleId) return toast.error('Please select a vehicle');
    const actionItems = Object.entries(stockQuantities)
      .filter(([_, qty]) => qty > 0)
      .map(([productId, quantity]) => ({ productId, quantity: parseInt(quantity) }));
    if (actionItems.length === 0) return toast.error('Please enter quantities');

    setIsSubmitting(true);
    try {
      if (type === 'RETURN') {
        await adminAPI.returnStock({ vehicleId: selectedVehicleId, items: actionItems });
        toast.success('Stock returned successfully');
      }
      setStockQuantities({});
      fetchData();
    } catch (error) {
      toast.error(error.response?.data?.message || `Failed to ${type.toLowerCase()} stock`);
    } finally {
      setIsSubmitting(false);
    }
  };

  // --- Refill Logic ---
  const loadRefillRequests = async (silent = false) => {
    if (!silent) setLoadingRefills(true);
    try {
      const { data } = await adminAPI.getRefillRequests({ storeId: storeFilterId });
      setRefillRequests(data);
    } catch (error) {
      if (!silent) toast.error('Failed to load refill requests');
    } finally {
      if (!silent) setLoadingRefills(false);
    }
  };

  useEffect(() => {
    if (activeSub === 'refill') loadRefillRequests();
  }, [activeSub, storeFilterId]);

  const groupedRefills = useMemo(() => {
    const groups = {};
    (refillRequests || []).forEach(req => {
      const uId = req.user?.id || req.user?.name || 'unknown';
      const vId = req.vehicleId || req.vehicle?.id || 'unknown';
      const groupKey = `${uId}_${vId}`;
      
      if (!groups[groupKey]) {
        groups[groupKey] = { 
          id: groupKey,
          user: req.user, 
          vehicle: req.vehicle, 
          requests: [], 
          latestDate: new Date(req.createdAt) 
        };
      }
      groups[groupKey].requests.push(req);
      const reqDate = new Date(req.createdAt);
      if (reqDate > groups[groupKey].latestDate) groups[groupKey].latestDate = reqDate;
    });
    return Object.values(groups).sort((a, b) => b.latestDate - a.latestDate);
  }, [refillRequests]);

  const activeRefillGroup = useMemo(() => {
    if (!viewingAgentId) return null;
    return groupedRefills.find(g => g.id === viewingAgentId);
  }, [groupedRefills, viewingAgentId]);

  const toggleRefillItemSelection = (itemId) => {
    setUnselectedRefillItems(prev => prev.includes(itemId) ? prev.filter(id => id !== itemId) : [...prev, itemId]);
  };

  const handleApproveRefill = async (refillId, items, skipReload = false) => {
    if (!skipReload) setIsSubmitting(true);
    try {
      const approvedItemIds = items.filter(i => !unselectedRefillItems.includes(i.id)).map(i => i.id);
      const qtys = {};
      items.forEach(i => {
        qtys[i.id] = editedQuantities[i.id] ?? i.quantity;
      });
      await adminAPI.approveRefillRequest(refillId, { approvedItemIds, quantities: qtys });
      if (!skipReload) {
        toast.success('Refill approved');
        loadRefillRequests();
      }
    } catch (error) {
      if (!skipReload) toast.error('Failed to approve refill');
      throw error; // Rethrow for bulk handling
    } finally {
      if (!skipReload) setIsSubmitting(false);
    }
  };

  const handleRejectRefill = async (refillId, skipReload = false) => {
    if (!skipReload) setIsSubmitting(true);
    try {
      await adminAPI.rejectRefillRequest(refillId);
      if (!skipReload) {
        toast.success('Refill rejected');
        loadRefillRequests();
      }
    } catch (error) {
      if (!skipReload) toast.error('Failed to reject refill');
      throw error;
    } finally {
      if (!skipReload) setIsSubmitting(false);
    }
  };

  const handleApproveSingleItem = async (refillId, itemId) => {
    setProcessingItems(prev => new Set(prev).add(itemId));
    try {
      const qty = editedQuantities[itemId];
      await adminAPI.approveRefillItem(refillId, itemId, { quantity: qty });
      toast.success('Item approved');
      loadRefillRequests();
    } catch (error) {
      toast.error('Failed to approve item');
    } finally {
      setProcessingItems(prev => {
        const next = new Set(prev);
        next.delete(itemId);
        return next;
      });
    }
  };

  const handleRejectSingleItem = async (refillId, itemId) => {
    setProcessingItems(prev => new Set(prev).add(itemId));
    try {
      await adminAPI.rejectRefillItem(refillId, itemId);
      toast.success('Item rejected');
      loadRefillRequests();
    } catch (error) {
      toast.error('Failed to reject item');
    } finally {
      setProcessingItems(prev => {
        const next = new Set(prev);
        next.delete(itemId);
        return next;
      });
    }
  };

  // --- Opening Stock Logic ---
  const handleUpdateStock = async (productId, quantity, type) => {
    setProcessingItems(prev => new Set(prev).add(productId));
    try {
      await adminAPI.updateInventory({ productId, quantity, mode: type });
      toast.success('Stock updated');
      fetchData();
    } catch (error) {
      toast.error('Failed to update stock');
    } finally {
      setProcessingItems(prev => {
        const next = new Set(prev);
        next.delete(productId);
        return next;
      });
    }
  };

  const handleAuditSave = async (vehicleId, quantities, remark) => {
    setIsSubmitting(true);
    try {
      const items = Object.entries(quantities).map(([productId, quantity]) => ({
        productId,
        quantity: parseInt(quantity)
      }));
      await adminAPI.saveVehicleAudit(vehicleId, { items, remark });
      toast.success('Audit saved successfully');
      setIsAuditMode(false);
      setAuditQuantities({});
      setAuditRemark('');
      fetchData();
    } catch (error) {
      toast.error('Failed to save audit');
    } finally {
      setIsSubmitting(false);
    }
  };

  useEffect(() => {
    if (selectedVehicleId && activeSub === 'return') {
      adminAPI.getVehicleInventory(selectedVehicleId).then(res => {
        const map = {};
        res.data.forEach(i => map[i.productId] = i.quantity);
        setVehicleInventoryMap(map);
      });
    }
  }, [selectedVehicleId, activeSub]);

  const renderSubTabContent = () => {
    switch(activeSub) {
      case 'inventory':
        return (
          <VehicleStockSection 
            loadingVehicles={loading}
            vehicles={vehicles}
            allVehiclesStock={allVehiclesStock}
            vehicleSearch={vehicleSearch}
            setVehicleSearch={setVehicleSearch}
            viewingVehicleId={viewingVehicleId}
            setViewingVehicleId={setViewingVehicleId}
            auditHistory={auditHistory}
            isAuditMode={isAuditMode}
            setIsAuditMode={setIsAuditMode}
            auditQuantities={auditQuantities}
            setAuditQuantities={setAuditQuantities}
            auditRemark={auditRemark}
            setAuditRemark={setAuditRemark}
            handleAuditSave={handleAuditSave}
            isSubmitting={isSubmitting}
            setShowScanner={setShowScanner}
            setScannerTarget={setScannerTarget}
            can={can}
            currentUser={currentUser}
          />
        );
      case 'fuel':
        return <FuelLogsSection storeId={storeFilterId} vehicles={vehicles} />;
      case 'maintenance':
        return <MaintenanceSection storeId={storeFilterId} vehicles={vehicles} />;
      case 'route_mapping':
        return (
          <RouteMappingSection 
            storeId={storeFilterId}
            can={can}
            currentUser={currentUser}
            vehicles={vehicles}
            users={users}
          />
        );
      case 'driver_mapping':
        return (
            <div className="bg-white p-8 rounded-[2.5rem] border border-gray-100 shadow-sm">
              <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8">
                <h3 className="text-xl font-black text-gray-900 tracking-tight">Driver Mapping Status</h3>
                <div className="relative group w-full md:w-72">
                  <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-emerald-500 transition-colors" size={16} />
                  <input 
                    type="text" 
                    placeholder="Search vehicle or driver..." 
                    value={mappingSearch}
                    onChange={(e) => setMappingSearch(e.target.value)}
                    className="w-full pl-12 pr-4 py-3 bg-gray-50 border border-gray-100 rounded-2xl text-sm font-medium focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none transition-all"
                  />
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-8">
                 {vehicles
                   .filter(v => v.assignedUsers?.length > 0)
                   .filter(v => 
                     v.vehicleNumber?.toLowerCase().includes(mappingSearch.toLowerCase()) || 
                     v.assignedUsers[0].name.toLowerCase().includes(mappingSearch.toLowerCase())
                   )
                   .map(v => (
                   <div key={v.id} className="p-6 bg-gray-50 rounded-[2rem] border border-gray-100 flex flex-col gap-4">
                      <div className="flex items-center gap-4">
                         <div className="w-12 h-12 bg-white rounded-2xl flex items-center justify-center text-emerald-600 shadow-sm">
                            <User size={24} />
                         </div>
                         <div className="flex flex-col">
                            <span className="text-sm font-black text-gray-900">{v.assignedUsers[0].name}</span>
                            <span className="text-[10px] font-black text-emerald-600 uppercase tracking-widest">{v.vehicleNumber}</span>
                         </div>
                      </div>
                   </div>
                 ))}
              </div>
            </div>
        );
      case 'loading':
        return (
          <LoadingSection 
            groupedLoadingItems={groupedLoadingItems}
            itemsPerPage={itemsPerPage}
            currentPage={currentPage}
            setCurrentPage={setCurrentPage}
            stockQuantities={stockQuantities}
            handleQuantityChange={handleQuantityChange}
            selectedVehicleId={selectedVehicleId}
            setSelectedVehicleId={setSelectedVehicleId}
            vehicles={vehicles}
            opsSearch={opsSearch}
            setOpsSearch={setOpsSearch}
            setScannerTarget={setScannerTarget}
            setShowScanner={setShowScanner}
            totalLoadingValue={totalLoadingValue}
            handleInitiateLoad={handleInitiateLoad}
            isSubmitting={isSubmitting}
            hasInvalidQuantities={hasInvalidQuantities}
            can={can}
            currentUser={currentUser}
          />
        );
      case 'sales':
        return <VehicleSalesSection storeId={storeFilterId} />;
      case 'collection':
        return <RouteCollectionSection storeId={storeFilterId} />;
      case 'damages':
        return <VehicleDamagesSection storeId={storeFilterId} />;
      case 'return':
        return (
          <ReturnSection 
            groupedReturnItems={groupedReturnItems}
            itemsPerPage={itemsPerPage}
            currentPage={currentPage}
            setCurrentPage={setCurrentPage}
            stockQuantities={stockQuantities}
            handleQuantityChange={handleQuantityChange}
            selectedVehicleId={selectedVehicleId}
            setSelectedVehicleId={setSelectedVehicleId}
            vehicles={vehicles}
            returnSearch={returnSearch}
            setReturnSearch={setReturnSearch}
            setScannerTarget={setScannerTarget}
            setShowScanner={setShowScanner}
            totalReturnInventoryValue={totalReturnInventoryValue}
            handleStockAction={handleStockAction}
            isSubmitting={isSubmitting}
            hasInvalidReturnQuantities={hasInvalidReturnQuantities}
            vehicleInventoryMap={vehicleInventoryMap}
            can={can}
            currentUser={currentUser}
          />
        );
      case 'refill':
        return (
          <RefillsSection 
            activeRefillGroup={activeRefillGroup}
            setViewingAgentId={setViewingAgentId}
            loadingRefills={loadingRefills}
            groupedRefills={groupedRefills}
            refillSearch={refillSearch}
            setRefillSearch={setRefillSearch}
            unselectedRefillItems={unselectedRefillItems}
            toggleRefillItemSelection={toggleRefillItemSelection}
            items={items}
            allVehiclesStock={allVehiclesStock}
            editedQuantities={editedQuantities}
            setEditedQuantities={setEditedQuantities}
            handleRejectSingleItem={handleRejectSingleItem}
            handleApproveSingleItem={handleApproveSingleItem}
            processingItems={processingItems}
            isSubmitting={isSubmitting}
            handleRejectRefill={handleRejectRefill}
            handleApproveRefill={handleApproveRefill}
            can={can}
            currentUser={currentUser}
          />
        );
      case 'opening_stock':
        return (
          <OpeningStockSection 
            items={items}
            openingSearch={openingSearch}
            setOpeningSearch={setOpeningSearch}
            setCurrentPage={setCurrentPage}
            setShowScanner={setShowScanner}
            setScannerTarget={setScannerTarget}
            itemsPerPage={itemsPerPage}
            currentPage={currentPage}
            stockInputs={stockInputs}
            setStockInputs={setStockInputs}
            handleUpdateStock={handleUpdateStock}
            processingItems={processingItems}
            can={can}
          />
        );
      case 'closing':
        return <TripManagementSection storeId={storeFilterId} vehicles={vehicles} />;
      default:
        return null;
    }
  };

  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, storeFilterId]);

  // ── Create ──────────────────────────────────────────────
  const handleCreateVehicle = async (e) => {
    e.preventDefault();
    if (isSubmitting) return;
    setIsSubmitting(true);
    try {
      const fd = new FormData();
      fd.append('vehicleNumber', newVehicle.vehicleNumber);
      if (newVehicle.vehicleName) fd.append('vehicleName', newVehicle.vehicleName);
      if (newVehicle.storeId) fd.append('storeId', newVehicle.storeId);
      fd.append('status', newVehicle.status);
      if (documents.rcDocument) fd.append('rcDocument', documents.rcDocument);
      if (documents.insuranceDocument) fd.append('insuranceDocument', documents.insuranceDocument);
      if (documents.permitDocument) fd.append('permitDocument', documents.permitDocument);

      await adminAPI.createVehicle(fd);
      toast.success('Vehicle added successfully');
      setShowAddModal(false);
      setNewVehicle({ vehicleNumber: '', vehicleName: '', assignedUserId: '', status: true });
      setDocuments({ rcDocument: null, insuranceDocument: null, permitDocument: null });
      fetchData();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to add vehicle');
    } finally {
      setIsSubmitting(false);
    }
  };

  // ── Edit ─────────────────────────────────────────────────
  const openEditModal = (vehicle) => {
    // Find the currently assigned user id for this vehicle
    const currentUserId = users.find(u => u.assignedVehicleId === vehicle.id)?.id || '';
    setEditingVehicle({ ...vehicle, assignedUserId: currentUserId });
    setEditDocuments({ rcDocument: null, insuranceDocument: null, permitDocument: null });
    setShowEditModal(true);
  };

  const handleUpdateVehicle = async (e) => {
    e.preventDefault();
    if (isSubmitting) return;
    setIsSubmitting(true);
    try {
      const fd = new FormData();
      fd.append('vehicleNumber', editingVehicle.vehicleNumber);
      fd.append('vehicleName', editingVehicle.vehicleName || '');
      fd.append('status', editingVehicle.status);
      if (editingVehicle.storeId) fd.append('storeId', editingVehicle.storeId);
      if (editDocuments.rcDocument) fd.append('rcDocument', editDocuments.rcDocument);
      if (editDocuments.insuranceDocument) fd.append('insuranceDocument', editDocuments.insuranceDocument);
      if (editDocuments.permitDocument) fd.append('permitDocument', editDocuments.permitDocument);

      await adminAPI.updateVehicle(editingVehicle.id, fd);
      toast.success('Vehicle updated successfully');
      setShowEditModal(false);
      setEditingVehicle(null);
      fetchData();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to update vehicle');
    } finally {
      setIsSubmitting(false);
    }
  };

  // ── Toggle Status ───────────────────────────────────────────────
  const handleToggleStatus = async (vehicle) => {
    try {
      const fd = new FormData();
      fd.append('status', !vehicle.status);
      await adminAPI.updateVehicle(vehicle.id, fd);
      toast.success(`Vehicle marked ${!vehicle.status ? 'Active' : 'Inactive'}`);
      fetchData();
    } catch (error) {
      toast.error('Failed to update vehicle status');
    }
  };

  // ── Delete ───────────────────────────────────────────────
  const handleDeleteVehicle = async (vehicle) => {
    if (!window.confirm(`Delete vehicle "${vehicle.vehicleNumber}"?\n\nThis will remove all stock records for this vehicle. Order history will be preserved.`)) return;
    setDeletingId(vehicle.id);
    try {
      await adminAPI.deleteVehicle(vehicle.id);
      toast.success('Vehicle deleted');
      fetchData();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to delete vehicle');
    } finally {
      setDeletingId(null);
    }
  };

  const filteredVehicles = vehicles.filter((v) => {
    if (storeFilterId && v.storeId !== storeFilterId) return false;
    const searchLower = searchTerm.toLowerCase();
    const assignedUser = users.find(u => u.assignedVehicleId === v.id);
    return (
      v.vehicleNumber?.toLowerCase().includes(searchLower) ||
      v.vehicleName?.toLowerCase().includes(searchLower) ||
      assignedUser?.name?.toLowerCase().includes(searchLower)
    );
  });

  const totalPages = Math.ceil(filteredVehicles.length / ITEMS_PER_PAGE);
  const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
  const paginatedVehicles = filteredVehicles.slice(startIndex, startIndex + ITEMS_PER_PAGE);

  const handleExportPDF = () => {
    generateReportPDF('vehicles', filteredVehicles);
  };

  const handleExportExcel = () => {
    try {
      const exportData = filteredVehicles.map(v => ({
        'Vehicle Number': v.vehicleNumber,
        'Model Name': v.vehicleName || 'N/A',
        'Store': v.store?.name || 'Unassigned',
        'Assigned Driver': v.assignedUsers?.[0]?.name || 'Not Assigned',
        'Status': v.status ? 'ACTIVE' : 'INACTIVE',
        'RC Document': v.rcDocument || 'N/A',
        'Insurance': v.insuranceDocument || 'N/A',
        'Permit': v.permitDocument || 'N/A'
      }));

      const ws = XLSX.utils.json_to_sheet(exportData);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, "Vehicles");
      XLSX.writeFile(wb, `Vehicles_Export_${new Date().toISOString().split('T')[0]}.xlsx`);
      toast.success('Excel exported successfully');
    } catch (error) {
      toast.error('Failed to export Excel');
    }
  };

  // ── Assign driver & Audit ─────────────────────────────────────────
  const initiateAssignDriver = async (user) => {
    setAuditTargetUser(user);
    setIsSubmitting(true);
    try {
      const res = await adminAPI.getVehicleInventory(selectedVehicle.id);
      const inv = res.data || [];
      setVehicleInventory(inv.map(item => ({
        productId: item.productId,
        name: item.product?.name || 'Unknown Item',
        sku: item.product?.skuCode || item.productId.slice(-6).toUpperCase(),
        oldQuantity: item.quantity,
        newQuantity: item.quantity,
        unit: item.product?.unit?.name || 'pcs'
      })));

      // Pre-select outgoing driver if present
      const currentAssigned = users.find(u => u.assignedVehicleId === selectedVehicle.id);
      setCarryOverTargetUserId(currentAssigned ? currentAssigned.id : '');

      // Fetch destination vehicle inventory if user is already bound to another active vehicle
      if (user.assignedVehicleId && user.assignedVehicleId !== selectedVehicle.id) {
        setLoadingDestStocks(true);
        setCarryOverTargetVehicleId(user.assignedVehicleId);
        try {
          const destRes = await adminAPI.getVehicleStock(user.assignedVehicleId);
          setDestExistingStocks(destRes.data || []);
        } catch (e) {
          console.error('Failed to fetch destination vehicle stocks', e);
          setDestExistingStocks([]);
        } finally {
          setLoadingDestStocks(false);
        }
      } else {
        setCarryOverTargetVehicleId('WAREHOUSE');
        setDestExistingStocks([]);
      }

      setShowAssignModal(false);
      setHandoverPolicy('INHERIT');
      setExistingStockPolicy('MERGE');
      setShowPolicyModal(true);
    } catch (error) {
      toast.error('Failed to fetch vehicle inventory for handover');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleConfirmPolicySelection = async () => {
    if (handoverPolicy === 'INHERIT') {
      setShowPolicyModal(false);
      setShowAuditModal(true);
    } else {
      setIsAuditing(true);
      try {
        await adminAPI.executeVehicleHandover(selectedVehicle.id, {
          targetUserId: auditTargetUser.id,
          policy: 'CARRY_OVER',
          existingStockPolicy,
          carryOverTargetVehicleId,
          carryOverTargetUserId
        });
        toast.success(`Vehicle assigned to ${auditTargetUser.name} & stock carried over`);
        setShowPolicyModal(false);
        setAuditTargetUser(null);
        setSelectedVehicle(null);
        setVehicleInventory([]);
        setDestExistingStocks([]);
        fetchData();
      } catch (error) {
        toast.error(error.response?.data?.message || 'Failed to complete carry-over handover');
      } finally {
        setIsAuditing(false);
      }
    }
  };

  const handleUnassignDriver = async () => {
    setIsSubmitting(true);
    try {
      await adminAPI.assignDriver(selectedVehicle.id, '');
      toast.success('Vehicle driver unassigned successfully');
      setShowAssignModal(false);
      setSelectedVehicle(null);
      fetchData();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to unassign driver');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleConfirmAuditAndAssign = async () => {
    setIsAuditing(true);
    try {
      const auditItems = vehicleInventory.map(item => ({
        productId: item.productId,
        quantity: item.newQuantity
      }));
      
      await adminAPI.executeVehicleHandover(selectedVehicle.id, {
        targetUserId: auditTargetUser.id,
        policy: 'INHERIT',
        auditItems,
        remark: auditRemark || `Handover audit to ${auditTargetUser.name}`
      });

      toast.success(`Vehicle assigned to ${auditTargetUser.name} & stock audited`);
      setShowAuditModal(false);
      setAuditTargetUser(null);
      setSelectedVehicle(null);
      setVehicleInventory([]);
      setAuditRemark('');
      fetchData();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to complete audit and assignment');
    } finally {
      setIsAuditing(false);
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
        <Loader2 className="animate-spin text-emerald-600" size={40} />
        <p className="text-gray-500 font-medium tracking-wide">Loading Vehicles...</p>
      </div>
    );
  }

  // ── Document upload field helper ──────────────────────────
  const DocUpload = ({ label, fieldKey, existing, files, setFiles }) => (
    <div className="space-y-1">
      <label className="text-xs font-bold text-gray-400 uppercase tracking-wider">{label}</label>
      <div className="flex items-center gap-3">
        {existing && !files[fieldKey] && (
          <a href={existing} target="_blank" rel="noreferrer"
            className="flex items-center gap-1 text-[10px] bg-emerald-100 text-emerald-700 px-2 py-1 rounded-md font-bold shrink-0">
            <FileText size={10} /> Current
          </a>
        )}
        <input
          type="file" accept=".jpg,.jpeg,.png,.pdf"
          className="w-full text-xs text-gray-500 file:mr-3 file:py-1.5 file:px-3 file:rounded-full file:border-0 file:text-xs file:font-semibold file:bg-emerald-50 file:text-emerald-700 hover:file:bg-emerald-100 cursor-pointer"
          onChange={(e) => setFiles(prev => ({ ...prev, [fieldKey]: e.target.files[0] }))}
        />
      </div>
      {files[fieldKey] && <p className="text-[10px] text-emerald-600 font-bold">✓ {files[fieldKey].name}</p>}
    </div>
  );

  const renderGroup = (groupVehicles) => (
    <>
      <div className="grid grid-cols-1 gap-4 md:hidden mb-6">
        {groupVehicles.map((vehicle) => (
          <div key={vehicle.id} className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm flex flex-col gap-4">
            <div className="flex justify-between items-start">
              <div className="flex items-center gap-4">
                <div className={cn('w-12 h-12 rounded-xl flex items-center justify-center',
                  vehicle.status ? 'bg-emerald-50 text-emerald-600' : 'bg-gray-100 text-gray-400')}>
                  <Truck size={24} />
                </div>
                <div className="flex flex-col">
                  <h3 className="font-bold text-gray-900">{vehicle.vehicleNumber}</h3>
                  {vehicle.displayId && <span className="text-[9px] font-black text-teal-600 bg-teal-50 px-1.5 py-0.5 rounded w-fit tracking-wider">{vehicle.displayId}</span>}
                  {vehicle.vehicleName && <span className="text-xs text-gray-500">{vehicle.vehicleName}</span>}
                  <div className="flex items-center gap-2 mt-1">
                    {vehicle.status ? (
                      <span className="flex items-center gap-1 text-[10px] font-bold text-emerald-600 uppercase">
                        <CheckCircle2 size={12} /> Active
                      </span>
                    ) : (
                      <span className="flex items-center gap-1 text-[10px] font-bold text-gray-400 uppercase">
                        <XCircle size={12} /> Inactive
                      </span>
                    )}
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-1">
                {can('VEHICLES', 'TOGGLE_STATUS') && (
                  <button
                    onClick={() => handleToggleStatus(vehicle)}
                    className={cn(
                      "relative inline-flex h-5 w-9 shrink-0 cursor-pointer items-center rounded-full border-2 border-transparent transition-colors duration-300 focus:outline-none",
                      vehicle.status ? "bg-emerald-500" : "bg-gray-200"
                    )}
                  >
                    <span className={cn(
                      "pointer-events-none inline-block h-3 w-3 transform rounded-full bg-white shadow-lg ring-0 transition-all duration-300",
                      vehicle.status ? "translate-x-4" : "translate-x-0"
                    )} />
                  </button>
                )}
                {can('VEHICLES', 'UPDATE') && (
                  <button onClick={() => openEditModal(vehicle)} title="Edit Vehicle"
                    className="p-2 text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-xl transition-all">
                    <Pencil size={16} />
                  </button>
                )}
                {can('VEHICLES', 'DELETE') && (
                  <button onClick={() => handleDeleteVehicle(vehicle)} title="Delete Vehicle"
                    disabled={deletingId === vehicle.id}
                    className="p-2 text-gray-400 hover:text-rose-600 hover:bg-rose-50 rounded-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed">
                    {deletingId === vehicle.id
                      ? <Loader2 size={16} className="animate-spin text-rose-400" />
                      : <Trash2 size={16} />}
                  </button>
                )}
              </div>
            </div>

            {(vehicle.rcDocument || vehicle.insuranceDocument || vehicle.permitDocument) && (
              <div className="flex gap-2">
                {vehicle.rcDocument && <a href={vehicle.rcDocument} target="_blank" rel="noreferrer" className="text-[10px] bg-emerald-100 text-emerald-700 px-2 py-1 rounded-md font-bold">RC</a>}
                {vehicle.insuranceDocument && <a href={vehicle.insuranceDocument} target="_blank" rel="noreferrer" className="text-[10px] bg-emerald-100 text-emerald-700 px-2 py-1 rounded-md font-bold">Insurance</a>}
                {vehicle.permitDocument && <a href={vehicle.permitDocument} target="_blank" rel="noreferrer" className="text-[10px] bg-emerald-100 text-emerald-700 px-2 py-1 rounded-md font-bold">Permit</a>}
              </div>
            )}

            <div className="bg-gray-50 rounded-xl p-4 flex items-center justify-between border border-gray-100">
              <div className="flex flex-col gap-1">
                <span className="text-[10px] uppercase tracking-wider font-semibold text-gray-400">Assigned Driver</span>
                <div className="flex items-center gap-2">
                  <User size={14} className="text-emerald-500" />
                  <span className="text-sm font-bold text-gray-800">{vehicle.assignedUsers?.[0]?.name || 'Not Assigned'}</span>
                </div>
              </div>
              <button onClick={() => { setSelectedVehicle(vehicle); setShowAssignModal(true); }}
                className="text-emerald-600 hover:bg-emerald-50 p-2 rounded-full transition-colors">
                <ArrowRight size={20} />
              </button>
            </div>
          </div>
        ))}
      </div>

      <div className="hidden md:block bg-white rounded-3xl border border-gray-100 shadow-sm overflow-hidden mb-6">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-gray-50/50">
              <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-gray-400">Vehicle Info</th>
              <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-gray-400 text-center">Status</th>
              <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-gray-400">Driver Assignment</th>
              <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-gray-400">Vehicle Proofs</th>
              <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-gray-400 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {groupVehicles.map((vehicle) => (
              <tr key={vehicle.id} className="hover:bg-gray-50/30 transition-colors group">
                <td className="px-6 py-4">
                  <div className="flex items-center gap-3">
                    <div className={cn('w-10 h-10 rounded-xl flex items-center justify-center shrink-0',
                      vehicle.status ? 'bg-emerald-50 text-emerald-600' : 'bg-gray-100 text-gray-400')}>
                      <Truck size={20} />
                    </div>
                    <div className="flex flex-col">
                      <span className="font-bold text-gray-900 tracking-tight">{vehicle.vehicleNumber}</span>
                      {vehicle.displayId && <span className="text-[9px] font-black text-teal-600 bg-teal-50 px-1.5 py-0.5 rounded w-fit tracking-wider mt-0.5">{vehicle.displayId}</span>}
                      {vehicle.vehicleName && <span className="text-[10px] font-bold text-gray-400 uppercase tracking-tighter">{vehicle.vehicleName}</span>}
                    </div>
                  </div>
                </td>
                <td className="px-6 py-4">
                  <div className="flex justify-center">
                    {can('VEHICLES', 'TOGGLE_STATUS') ? (
                      <button
                        onClick={() => handleToggleStatus(vehicle)}
                        className={cn(
                          "relative inline-flex h-6 w-11 shrink-0 cursor-pointer items-center rounded-full border-2 border-transparent transition-colors duration-300 focus:outline-none",
                          vehicle.status ? "bg-emerald-500" : "bg-gray-200"
                        )}
                      >
                        <span className={cn(
                          "pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow-lg ring-0 transition-all duration-300",
                          vehicle.status ? "translate-x-5" : "translate-x-0"
                        )} />
                      </button>
                    ) : (
                      <span className={cn(
                        "px-2 py-0.5 rounded text-[9px] font-black uppercase tracking-widest",
                        vehicle.status ? "bg-emerald-50 text-emerald-600 border border-emerald-100" : "bg-gray-50 text-gray-400 border border-gray-100"
                      )}>
                        {vehicle.status ? 'Active' : 'Inactive'}
                      </span>
                    )}
                  </div>
                </td>
                <td className="px-6 py-4">
                  <div className="flex items-center justify-between gap-4 bg-gray-50/50 p-2 rounded-xl border border-transparent hover:border-gray-100 transition-all group/driver">
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 rounded-full bg-white flex items-center justify-center text-emerald-500 shadow-sm border border-gray-50">
                        <User size={14} />
                      </div>
                      <span className="text-sm font-bold text-gray-700">{vehicle.assignedUsers?.[0]?.name || 'Unassigned'}</span>
                    </div>
                    <button onClick={() => { setSelectedVehicle(vehicle); setShowAssignModal(true); }}
                      className="text-emerald-600 hover:bg-emerald-100 p-1.5 rounded-full transition-colors">
                      <ArrowRight size={16} />
                    </button>
                  </div>
                </td>
                <td className="px-6 py-4">
                  <div className="flex gap-1.5">
                    {vehicle.rcDocument ? (
                      <a href={vehicle.rcDocument} target="_blank" rel="noreferrer" title="RC Document"
                        className="w-8 h-8 flex items-center justify-center text-[10px] font-black bg-emerald-600/10 text-emerald-700 rounded-lg hover:bg-emerald-600 hover:text-white transition-all">RC</a>
                    ) : <div className="w-8 h-8 border border-dashed border-gray-200 rounded-lg" />}
                    {vehicle.insuranceDocument ? (
                      <a href={vehicle.insuranceDocument} target="_blank" rel="noreferrer" title="Insurance"
                        className="w-8 h-8 flex items-center justify-center text-[10px] font-black bg-blue-600/10 text-blue-700 rounded-lg hover:bg-blue-600 hover:text-white transition-all">IN</a>
                    ) : <div className="w-8 h-8 border border-dashed border-gray-200 rounded-lg" />}
                    {vehicle.permitDocument ? (
                      <a href={vehicle.permitDocument} target="_blank" rel="noreferrer" title="Permit"
                        className="w-8 h-8 flex items-center justify-center text-[10px] font-black bg-orange-600/10 text-orange-700 rounded-lg hover:bg-orange-600 hover:text-white transition-all">PM</a>
                    ) : <div className="w-8 h-8 border border-dashed border-gray-200 rounded-lg" />}
                  </div>
                </td>
                <td className="px-6 py-4">
                  <div className="flex items-center justify-end gap-1 transition-all">
                    {can('VEHICLES', 'UPDATE') && (
                      <button onClick={() => openEditModal(vehicle)} title="Edit Details"
                        className="p-2 text-indigo-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-xl transition-all">
                        <Pencil size={16} />
                      </button>
                    )}
                    {can('VEHICLES', 'DELETE') && (
                      <button onClick={() => handleDeleteVehicle(vehicle)} title="Delete"
                        disabled={deletingId === vehicle.id}
                        className="p-2 text-rose-400 hover:text-rose-600 hover:bg-rose-50 rounded-xl transition-all disabled:opacity-50">
                        {deletingId === vehicle.id ? <Loader2 size={16} className="animate-spin" /> : <Trash2 size={16} />}
                      </button>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );

  const renderClassifiedVehicles = () => {
    if (!storeFilterId && stores.length > 1) {
      const personnelByStore = users.reduce((acc, u) => {
        if (u.storeId && u.id !== currentUser?.id) {
          acc[u.storeId] = (acc[u.storeId] || 0) + 1;
        }
        return acc;
      }, {});

      return (
        <div className="flex flex-col gap-4 pt-4 animate-in fade-in slide-in-from-bottom-6 max-w-5xl">
          <div className="mb-2">
            <h3 className="text-xl font-black tracking-tight text-gray-900">Platform Branches</h3>
            <p className="text-[10px] font-bold text-gray-400 tracking-widest uppercase mt-1 italic">Select a branch to manage its transport assets</p>
          </div>
          {stores.map(store => {
            const groupVehicles = filteredVehicles.filter(v => v.storeId === store.id);
            const personnelCount = personnelByStore[store.id] || 0;
            return (
              <button
                key={store.id}
                onClick={() => setSearchParams({ storeId: store.id })}
                className="group w-full bg-white p-5 rounded-[1.5rem] border border-gray-100 shadow-sm hover:shadow-xl hover:border-emerald-200 transition-all duration-300 flex items-center justify-between gap-6 relative overflow-hidden"
              >
                <div className="absolute left-0 top-0 w-2 h-full bg-emerald-500/10 group-hover:bg-emerald-500 transition-all" />
                
                <div className="flex items-center gap-5">
                  <div className="w-12 h-12 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center group-hover:bg-emerald-600 group-hover:text-white transition-colors shrink-0">
                    <Truck size={24} strokeWidth={2.5} />
                  </div>
                  <div className="flex flex-col text-left">
                    <h4 className="text-lg font-black text-gray-900 tracking-tight leading-none mb-1">{store.name}</h4>
                    <div className="flex items-center gap-2">
                      <span className="text-[9px] font-black text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded tracking-widest uppercase">{store.code || 'Branch'}</span>
                      {store.stateCode && <span className="text-[9px] font-bold text-gray-400 uppercase tracking-widest">• {store.stateCode}</span>}
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-8">
                  <div className="hidden md:flex flex-col items-end">
                    <span className="text-[10px] font-black uppercase text-gray-400 tracking-widest">Fleet Capacity</span>
                    <span className="text-sm font-bold text-gray-900">{groupVehicles.length} Vehicles</span>
                  </div>
                  <div className="hidden md:flex flex-col items-end">
                    <span className="text-[10px] font-black uppercase text-gray-400 tracking-widest">Personnel</span>
                    <span className="text-sm font-bold text-gray-900">{personnelCount} Members</span>
                  </div>
                  <div className="w-10 h-10 rounded-xl bg-gray-50 flex items-center justify-center text-gray-400 group-hover:bg-emerald-600 group-hover:text-white transition-all">
                    <ArrowRight size={20} strokeWidth={3} />
                  </div>
                </div>
              </button>
            );
          })}
          {stores.length === 0 && (
            <div className="py-12 text-center bg-white rounded-[2rem] border border-dashed border-gray-200">
              <Store size={48} className="mx-auto text-gray-300 mb-4" />
              <p className="text-sm font-bold text-gray-400 uppercase tracking-widest">No Active Branches Found</p>
            </div>
          )}
        </div>
      );
    }

    return (
      <div className="flex flex-col gap-6">
        {renderGroup(paginatedVehicles)}

        {totalPages > 1 && (
          <div className="flex items-center justify-between bg-white px-6 py-4 rounded-3xl border border-gray-100 shadow-sm animate-in fade-in slide-in-from-bottom-2">
            <div className="flex items-center gap-2">
              <p className="text-[10px] font-black uppercase text-gray-400 tracking-widest">
                Showing {startIndex + 1}-{Math.min(startIndex + ITEMS_PER_PAGE, filteredVehicles.length)} of {filteredVehicles.length}
              </p>
            </div>

            <div className="flex items-center gap-1.5">
              <button
                onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                disabled={currentPage === 1}
                className="p-2 rounded-xl border border-gray-100 text-gray-400 hover:text-emerald-600 hover:border-emerald-100 hover:bg-emerald-50 disabled:opacity-30 disabled:hover:bg-transparent disabled:hover:border-gray-100 disabled:hover:text-gray-400 transition-all"
              >
                <ChevronLeft size={16} />
              </button>

              <div className="flex items-center gap-1">
                {[...Array(totalPages)].map((_, i) => {
                  const pageNum = i + 1;
                  if (
                    pageNum === 1 ||
                    pageNum === totalPages ||
                    (pageNum >= currentPage - 1 && pageNum <= currentPage + 1)
                  ) {
                    return (
                      <button
                        key={pageNum}
                        onClick={() => setCurrentPage(pageNum)}
                        className={`w-9 h-9 rounded-xl text-[10px] font-black transition-all ${currentPage === pageNum
                          ? 'bg-emerald-600 text-white shadow-lg shadow-emerald-200'
                          : 'text-gray-400 hover:text-gray-600 hover:bg-gray-50'
                          }`}
                      >
                        {pageNum}
                      </button>
                    );
                  } else if (
                    pageNum === currentPage - 2 ||
                    pageNum === currentPage + 2
                  ) {
                    return <span key={pageNum} className="text-gray-300 px-1">...</span>;
                  }
                  return null;
                })}
              </div>

              <button
                onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                disabled={currentPage === totalPages}
                className="p-2 rounded-xl border border-gray-100 text-gray-400 hover:text-emerald-600 hover:border-emerald-100 hover:bg-emerald-50 disabled:opacity-30 disabled:hover:bg-transparent disabled:hover:border-gray-100 disabled:hover:text-gray-400 transition-all"
              >
                <ChevronRight size={16} />
              </button>
            </div>
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500 pb-20">
      {/* ── Full Page Add Vehicle View ───────────────── */}
      {showAddModal ? (
        <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-500 min-h-screen">
          <div className="flex items-center justify-between">
            <div className="flex flex-col gap-1">
              <h2 className="text-2xl font-black text-gray-900 tracking-tight">Register New Vehicle</h2>
              <p className="text-[10px] font-black uppercase text-gray-400 tracking-widest mt-1 italic">Fleet Expansion & Asset Registration</p>
            </div>
            <button onClick={() => setShowAddModal(false)} className="flex items-center gap-2 text-gray-500 hover:text-gray-900 border border-gray-100 bg-white px-6 py-3 rounded-2xl text-[10px] font-black uppercase tracking-widest shadow-sm transition-all hover:border-gray-200">
              <ArrowLeft size={16} /> Back
            </button>
          </div>

          <div className="bg-white rounded-[2.5rem] border border-gray-50 shadow-2xl shadow-slate-200/50 overflow-hidden">
            <div className="p-8 md:p-12">
              <form onSubmit={handleCreateVehicle} className="max-w-4xl mx-auto space-y-12">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
                  <div className="space-y-6">
                    <div className="space-y-2">
                      <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest flex items-center gap-2">
                        <Truck size={12} className="text-emerald-500" /> Vehicle Number <span className="text-red-500">*</span>
                      </label>
                      <input type="text" required placeholder="e.g. KA 01 AB 1234"
                        className="w-full bg-slate-50 border border-slate-100 rounded-2xl px-6 py-5 text-base focus:ring-4 focus:ring-emerald-500/10 focus:border-emerald-500 focus:bg-white outline-none transition-all font-bold tracking-tight"
                        value={newVehicle.vehicleNumber} onChange={(e) => setNewVehicle({ ...newVehicle, vehicleNumber: e.target.value })} />
                    </div>

                    <div className="space-y-2">
                      <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest flex items-center gap-2">
                        <Package size={12} className="text-emerald-500" /> Vehicle Model / Name
                      </label>
                      <input type="text" placeholder="e.g. Tata Ace Gold"
                        className="w-full bg-slate-50 border border-slate-100 rounded-2xl px-6 py-5 text-base focus:ring-4 focus:ring-emerald-500/10 focus:border-emerald-500 focus:bg-white outline-none transition-all font-bold tracking-tight"
                        value={newVehicle.vehicleName} onChange={(e) => setNewVehicle({ ...newVehicle, vehicleName: e.target.value })} />
                    </div>
                  </div>

                  <div className="space-y-6">
                    <div className="space-y-2">
                      <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest flex items-center gap-2">
                        <User size={12} className="text-emerald-500" /> Driver Assignment
                      </label>
                      <div className="w-full bg-slate-50 border border-slate-100 rounded-2xl px-6 py-5 text-sm text-gray-500 font-medium tracking-tight mt-0.5">
                        Register this vehicle first to assign a driver & audit initial stock.
                      </div>
                    </div>

                    <div className="flex items-center justify-between p-6 bg-slate-50 rounded-2xl border border-dotted border-slate-200">
                      <div className="flex flex-col">
                        <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">Initial Asset Status</span>
                        <span className={cn("text-xs font-black uppercase mt-1", newVehicle.status ? "text-emerald-600" : "text-rose-400")}>
                          {newVehicle.status ? "Active Fleet" : "Pending Activation"}
                        </span>
                      </div>
                      <button type="button" onClick={() => setNewVehicle({ ...newVehicle, status: !newVehicle.status })}
                        className={cn('w-14 h-7 rounded-full relative transition-all shadow-inner', newVehicle.status ? 'bg-emerald-500' : 'bg-slate-300')}>
                        <div className={cn('absolute top-1.5 w-4 h-4 rounded-full bg-white shadow-md transition-all duration-300', newVehicle.status ? 'right-1.5' : 'left-1.5')} />
                      </button>
                    </div>
                  </div>
                </div>

                <div className="space-y-6">
                  <div className="flex items-center gap-3 border-b border-slate-100 pb-4">
                    <FileText size={20} className="text-emerald-500" />
                    <h4 className="text-xs font-black uppercase tracking-widest text-slate-800">Compliance & Registration</h4>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                    <DocUpload label="RC (Certificate)" fieldKey="rcDocument" existing={null} files={documents} setFiles={setDocuments} />
                    <DocUpload label="Insurance" fieldKey="insuranceDocument" existing={null} files={documents} setFiles={setDocuments} />
                    <DocUpload label="Permit" fieldKey="permitDocument" existing={null} files={documents} setFiles={setDocuments} />
                  </div>
                </div>

                <div className="flex flex-col md:flex-row items-center justify-end gap-4 pt-8 border-t border-slate-100">
                  <button type="button" onClick={() => setShowAddModal(false)}
                    className="w-full md:w-auto px-10 py-5 rounded-2xl font-black text-[10px] uppercase tracking-widest text-gray-400 hover:text-gray-900 transition-all border border-transparent hover:border-gray-50">
                    Discard Changes
                  </button>
                  <button type="submit" disabled={isSubmitting}
                    className={cn('w-full md:w-auto px-16 py-5 rounded-2xl shadow-2xl shadow-emerald-500/30 text-white font-black text-[10px] uppercase tracking-widest transition-all active:scale-95 flex items-center justify-center gap-3',
                      isSubmitting ? 'bg-emerald-400 cursor-not-allowed' : 'bg-emerald-600 hover:bg-emerald-700')}>
                    {isSubmitting ? <><Loader2 className="animate-spin" size={18} /> Processing...</> : <><CheckCircle2 size={18} /> Register Vehicle</>}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      ) : showEditModal && editingVehicle ? (
        <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-500 min-h-screen">
          <div className="flex items-center justify-between">
            <div className="flex flex-col gap-1">
              <h2 className="text-2xl font-black text-gray-900 tracking-tight">Edit Vehicle</h2>
              <p className="text-[10px] font-black uppercase text-gray-400 tracking-widest mt-1 italic">Update Details & Documents</p>
            </div>
            <button onClick={() => { setShowEditModal(false); setEditingVehicle(null); }} className="flex items-center gap-2 text-gray-500 hover:text-gray-900 border border-gray-100 bg-white px-6 py-3 rounded-2xl text-[10px] font-black uppercase tracking-widest shadow-sm transition-all hover:border-gray-200">
              <ArrowLeft size={16} /> Back
            </button>
          </div>

          <div className="bg-white rounded-[2.5rem] border border-gray-50 shadow-2xl shadow-slate-200/50 overflow-hidden">
            <div className="p-8 md:p-12">
              <form onSubmit={handleUpdateVehicle} className="max-w-4xl mx-auto space-y-12">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
                  <div className="space-y-6">
                    <div className="space-y-2">
                      <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest flex items-center gap-2">
                        <Truck size={12} className="text-emerald-500" /> Vehicle Number <span className="text-red-500">*</span>
                      </label>
                      <input type="text" required placeholder="e.g. KA 01 AB 1234"
                        className="w-full bg-slate-50 border border-slate-100 rounded-2xl px-6 py-5 text-base focus:ring-4 focus:ring-emerald-500/10 focus:border-emerald-500 focus:bg-white outline-none transition-all font-bold tracking-tight"
                        value={editingVehicle.vehicleNumber}
                        onChange={(e) => setEditingVehicle({ ...editingVehicle, vehicleNumber: e.target.value })} />
                    </div>

                    <div className="space-y-2">
                      <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest flex items-center gap-2">
                        <Package size={12} className="text-emerald-500" /> Vehicle Model / Name
                      </label>
                      <input type="text" placeholder="e.g. Tata Ace Gold"
                        className="w-full bg-slate-50 border border-slate-100 rounded-2xl px-6 py-5 text-base focus:ring-4 focus:ring-emerald-500/10 focus:border-emerald-500 focus:bg-white outline-none transition-all font-bold tracking-tight"
                        value={editingVehicle.vehicleName || ''}
                        onChange={(e) => setEditingVehicle({ ...editingVehicle, vehicleName: e.target.value })} />
                    </div>
                  </div>

                  <div className="space-y-6">
                    <div className="space-y-2">
                      <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest flex items-center gap-2">
                        <User size={12} className="text-emerald-500" /> Driver Assignment
                      </label>
                      <div className="w-full bg-slate-50 border border-slate-100 rounded-2xl px-6 py-4 flex items-center justify-between mt-0.5">
                        <div className="flex flex-col">
                          <span className="text-sm font-bold text-gray-900">
                            {users.find(u => u.assignedVehicleId === editingVehicle.id)?.name || 'Unassigned'}
                          </span>
                          <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mt-1">Current Driver</span>
                        </div>
                        <button type="button" onClick={() => { setSelectedVehicle(editingVehicle); setShowAssignModal(true); }}
                          className="px-4 py-2 bg-emerald-100 text-emerald-700 hover:bg-emerald-600 hover:text-white rounded-xl text-xs font-bold uppercase tracking-widest transition-colors flex items-center gap-2">
                          <User size={14} /> Assign
                        </button>
                      </div>
                    </div>

                    {can('VEHICLES', 'TOGGLE_STATUS') && (
                      <div className="flex items-center justify-between p-6 bg-slate-50 rounded-2xl border border-dotted border-slate-200">
                        <div className="flex flex-col">
                          <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">Current Asset Status</span>
                          <span className={cn("text-xs font-black uppercase mt-1", editingVehicle.status ? "text-emerald-600" : "text-rose-400")}>
                            {editingVehicle.status ? "Active Fleet" : "Inactive Asset"}
                          </span>
                        </div>
                        <button type="button" onClick={() => setEditingVehicle({ ...editingVehicle, status: !editingVehicle.status })}
                          className={cn('w-14 h-7 rounded-full relative transition-all shadow-inner', editingVehicle.status ? 'bg-emerald-500' : 'bg-slate-300')}>
                          <div className={cn('absolute top-1.5 w-4 h-4 rounded-full bg-white shadow-md transition-all duration-300', editingVehicle.status ? 'right-1.5' : 'left-1.5')} />
                        </button>
                      </div>
                    )}
                  </div>
                </div>

                <div className="space-y-6">
                  <div className="flex items-center gap-3 border-b border-slate-100 pb-4">
                    <FileText size={20} className="text-emerald-500" />
                    <h4 className="text-xs font-black uppercase tracking-widest text-slate-800">Compliance & Registration</h4>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                    <DocUpload label="RC Document" fieldKey="rcDocument" existing={editingVehicle.rcDocument} files={editDocuments} setFiles={setEditDocuments} />
                    <DocUpload label="Insurance Document" fieldKey="insuranceDocument" existing={editingVehicle.insuranceDocument} files={editDocuments} setFiles={setEditDocuments} />
                    <DocUpload label="Permit Document" fieldKey="permitDocument" existing={editingVehicle.permitDocument} files={editDocuments} setFiles={setEditDocuments} />
                  </div>
                </div>

                <div className="flex flex-col md:flex-row items-center justify-end gap-4 pt-8 border-t border-slate-100">
                  <button type="button" onClick={() => { setShowEditModal(false); setEditingVehicle(null); }}
                    className="w-full md:w-auto px-10 py-5 rounded-2xl font-black text-[10px] uppercase tracking-widest text-gray-400 hover:text-gray-900 transition-all border border-transparent hover:border-gray-50">
                    Discard Changes
                  </button>
                  <button type="submit" disabled={isSubmitting}
                    className={cn('w-full md:w-auto px-16 py-5 rounded-2xl shadow-2xl shadow-emerald-500/30 text-white font-black text-[10px] uppercase tracking-widest transition-all active:scale-95 flex items-center justify-center gap-3',
                      isSubmitting ? 'bg-emerald-400 cursor-not-allowed' : 'bg-emerald-600 hover:bg-emerald-700')}>
                    {isSubmitting ? <><Loader2 className="animate-spin" size={18} /> Processing...</> : <><CheckCircle2 size={18} /> Save Changes</>}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      ) : (
        <>
          {/* Navigation and Context Header Card */}
          <div className="flex flex-col gap-5 bg-white p-6 rounded-[2rem] border border-gray-100 shadow-xs mb-8">
            {/* Top Row: Title, Description & Actions */}
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
              {/* Left: Title & Subtitle */}
              <div className="flex items-start gap-3">
                {storeFilterId && activeSub === 'master' && (
                  <button
                    onClick={() => setSearchParams({ sub: activeSub })}
                    className="p-2.5 bg-gray-50 border border-gray-100/80 rounded-xl text-gray-400 hover:text-emerald-600 hover:border-emerald-100 hover:bg-emerald-50/50 transition-all shadow-2xs active:scale-95 mt-0.5"
                    title="Back to All Branches"
                  >
                    <ChevronLeft size={18} strokeWidth={2.5} />
                  </button>
                )}
                <div className="flex flex-col gap-1 text-left">
                  <div className="flex items-center gap-3">
                    <h2 className="text-2xl font-black text-gray-900 tracking-tight leading-none capitalize">
                      {activeSub === 'master' ? 'Fleet Management' : activeSub.replace('_', ' ')}
                    </h2>
                    {activeSub === 'master' && stores.length > 1 && (
                      <select
                        value={storeFilterId || ''}
                        onChange={(e) => setSearchParams({ sub: 'master', storeId: e.target.value })}
                        className="bg-emerald-50 text-emerald-700 text-[10px] font-black uppercase tracking-widest pl-2.5 pr-6 py-1 rounded-lg border-none outline-none appearance-none focus:ring-2 focus:ring-emerald-500/20 cursor-pointer"
                        style={{
                          backgroundImage: `url("data:image/svg+xml,%3csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 20 20'%3e%3cpath stroke='%23047857' stroke-linecap='round' stroke-linejoin='round' stroke-width='2' d='M5.25 7.5L10 12.25L14.75 7.5'/%3e%3c/svg%3e")`,
                          backgroundPosition: 'right 0.35rem center',
                          backgroundRepeat: 'no-repeat',
                          backgroundSize: '1rem'
                        }}
                      >
                        <option value="">All Branches</option>
                        {stores.map(s => (
                          <option key={s.id} value={s.id}>{s.name}</option>
                        ))}
                      </select>
                    )}
                  </div>
                  <p className="text-xs font-bold text-gray-400 tracking-wide">
                    {activeSub === 'master' ? 'Monitor transport assets, track driver allocations, and record operating metrics' : `Manage ${activeSub.replace('_', ' ')} records across operational transport hubs`}
                  </p>
                </div>
              </div>

              {/* Right: Search & Fleet Actions */}
              {activeSub === 'master' && (
                <div className="flex flex-wrap items-center gap-2.5 self-end lg:self-center shrink-0">
                  <div className="relative group hidden sm:block">
                    <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-emerald-500 transition-colors" size={15} strokeWidth={2.5} />
                    <input
                      type="text"
                      placeholder="Search fleet or driver..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="pl-9 pr-4 py-2 bg-gray-50 border-none rounded-xl text-xs focus:bg-white focus:ring-2 focus:ring-emerald-500/20 transition-all w-48 outline-none font-bold"
                    />
                  </div>
                  <div className="flex items-center gap-1.5">
                    <button
                      onClick={handleExportPDF}
                      className="flex items-center gap-1.5 px-2.5 py-2 bg-white border border-gray-100 rounded-xl text-rose-500 hover:bg-rose-50 hover:border-rose-100 transition-all shadow-2xs text-xs font-bold"
                      title="Export PDF Report"
                    >
                      <FileText size={14} strokeWidth={2.5} />
                      <span className="hidden md:inline">PDF</span>
                    </button>
                    <button
                      onClick={handleExportExcel}
                      className="flex items-center gap-1.5 px-2.5 py-2 bg-white border border-gray-100 rounded-xl text-emerald-600 hover:bg-emerald-50 hover:border-emerald-100 transition-all shadow-2xs text-xs font-bold"
                      title="Export Excel Report"
                    >
                      <Download size={14} strokeWidth={2.5} />
                      <span className="hidden md:inline">Excel</span>
                    </button>
                    {can('VEHICLES', 'CREATE') && (
                      <button
                        onClick={() => setShowAddModal(true)}
                        className="px-3.5 py-2 bg-emerald-600 text-white rounded-xl text-xs font-black uppercase tracking-wider hover:bg-emerald-700 transition-all shadow-md shadow-emerald-500/10 flex items-center gap-1.5 active:scale-95 shrink-0"
                      >
                        <Plus size={15} strokeWidth={2.5} />
                        <span>Add</span>
                      </button>
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* Bottom Row: Fully Horizontally Scrollable Professional Tabs Bar */}
            <div className="pt-2 border-t border-gray-50">
              <div className="w-full overflow-x-auto custom-scrollbar pb-1.5">
                <div className="flex items-center gap-1.5 bg-gray-50/80 p-1.5 rounded-2xl w-fit min-w-max border border-gray-100/80 shadow-2xs">
                  <button
                    onClick={() => setSearchParams({ sub: 'master', storeId: storeFilterId || '' })}
                    className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-black uppercase tracking-wider transition-all shrink-0 ${activeSub === 'master' ? 'bg-white text-emerald-700 shadow-xs ring-1 ring-black/5' : 'text-gray-400 hover:text-gray-900 hover:bg-white/50'}`}
                  >
                    <Truck size={15} strokeWidth={2.5} />
                    <span>Master</span>
                  </button>

                  <button
                    onClick={() => setSearchParams({ sub: 'fuel', storeId: storeFilterId || '' })}
                    className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-black uppercase tracking-wider transition-all shrink-0 ${activeSub === 'fuel' ? 'bg-white text-emerald-700 shadow-xs ring-1 ring-black/5' : 'text-gray-400 hover:text-gray-900 hover:bg-white/50'}`}
                  >
                    <Fuel size={15} strokeWidth={2.5} />
                    <span>Fuel Logs</span>
                  </button>

                  <button
                    onClick={() => setSearchParams({ sub: 'maintenance', storeId: storeFilterId || '' })}
                    className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-black uppercase tracking-wider transition-all shrink-0 ${activeSub === 'maintenance' ? 'bg-white text-emerald-700 shadow-xs ring-1 ring-black/5' : 'text-gray-400 hover:text-gray-900 hover:bg-white/50'}`}
                  >
                    <Settings size={15} strokeWidth={2.5} />
                    <span>Maintenance</span>
                  </button>

                  <button
                    onClick={() => setSearchParams({ sub: 'damages', storeId: storeFilterId || '' })}
                    className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-black uppercase tracking-wider transition-all shrink-0 ${activeSub === 'damages' ? 'bg-white text-emerald-700 shadow-xs ring-1 ring-black/5' : 'text-gray-400 hover:text-gray-900 hover:bg-white/50'}`}
                  >
                    <AlertCircle size={15} strokeWidth={2.5} />
                    <span>Vehicle Damages</span>
                  </button>
                </div>
              </div>
            </div>
          </div>

          {activeSub === 'master' ? (
             <div className="space-y-4">
                {filteredVehicles.length === 0 ? (
                  <div className="text-center py-12 bg-white rounded-2xl border border-dashed border-gray-200">
                    <Truck size={48} className="mx-auto text-gray-300 mb-2" />
                    <p className="text-gray-500">No vehicles found</p>
                  </div>
                ) : (
                  renderClassifiedVehicles()
                )}
              </div>
          ) : (
             renderSubTabContent()
          )}
        </>
      )}

      {/* ── Assign Driver Modal ─────────────────────────────── */}
      {showAssignModal && (
        <div className="fixed inset-0 z-50 flex items-end md:items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="bg-white w-full max-w-md rounded-3xl p-6 shadow-2xl animate-in slide-in-from-bottom duration-300 max-h-[80vh] flex flex-col">
            <div className="flex items-center justify-between mb-6 shrink-0">
              <div>
                <h3 className="text-xl font-bold text-gray-900">Assign Driver</h3>
                <p className="text-xs text-gray-400 font-medium tracking-wide">Vehicle: {selectedVehicle?.vehicleNumber}</p>
              </div>
              <button onClick={() => setShowAssignModal(false)} className="p-2 hover:bg-gray-100 rounded-full text-gray-400"><X size={20} /></button>
            </div>

            <div className="mb-4 relative group shrink-0">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-emerald-500 transition-colors" size={16} />
              <input 
                type="text" 
                placeholder="Search drivers..." 
                value={agentSearch}
                onChange={(e) => setAgentSearch(e.target.value)}
                className="w-full pl-12 pr-4 py-3 bg-gray-50 border border-gray-100 rounded-2xl text-sm font-medium focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none transition-all"
              />
            </div>

            <div className="flex-1 overflow-y-auto space-y-2 pr-1">
              {users
                .filter(u => u.storeId === selectedVehicle?.storeId)
                .filter(u => u.name.toLowerCase().includes(agentSearch.toLowerCase()))
                .map(user => (
                  <button key={user.id} disabled={isSubmitting} onClick={() => initiateAssignDriver(user)}
                  className="w-full flex items-center justify-between p-4 hover:bg-emerald-50 rounded-2xl border border-transparent hover:border-emerald-100 transition-all group disabled:opacity-50">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center text-gray-500 group-hover:bg-emerald-100 group-hover:text-emerald-600 transition-colors">
                      {isSubmitting ? <Loader2 size={18} className="animate-spin" /> : <User size={20} />}
                    </div>
                    <div className="flex flex-col items-start">
                      <span className="font-bold text-gray-900 text-sm">{user.name}</span>
                      <div className="flex items-center gap-1.5 mt-0.5">
                        <span className={`text-[9px] font-black uppercase px-1.5 py-0.5 rounded-md border tracking-tighter ${user.role === 'SALES_AGENT' ? 'bg-emerald-50 text-emerald-700 border-emerald-100' : 'bg-amber-50 text-amber-700 border-amber-100'}`}>
                          {user.role === 'SALES_AGENT' ? 'Field Agent' : user.role === 'HELPER' ? 'Helper' : user.role}
                        </span>
                        {user.assignedVehicleId && (
                          <span className="text-[9px] font-bold bg-purple-50 text-purple-700 border border-purple-100 px-1.5 py-0.5 rounded-md">
                            Assigned
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                  {!isSubmitting && <ArrowRight size={18} className="text-gray-300 group-hover:text-emerald-500 transition-colors" />}
                </button>
              ))}
              <button onClick={() => {
                if (window.confirm("Are you sure you want to unassign the current driver?")) {
                   handleUnassignDriver();
                }
              }} className="w-full py-4 bg-gray-50 text-gray-500 font-bold text-sm uppercase tracking-widest rounded-2xl hover:bg-rose-50 hover:text-rose-600 transition-colors border border-gray-100 hover:border-rose-100 mt-4">
                Unassign Current Driver
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Audit Vehicle Stock Modal ───────────────────────── */}
      {showAuditModal && selectedVehicle && auditTargetUser && (
        <div className="fixed inset-0 z-50 flex items-end md:items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="bg-white w-full max-w-3xl rounded-3xl p-6 shadow-2xl animate-in slide-in-from-bottom duration-300 max-h-[90vh] flex flex-col">
            <div className="flex items-center justify-between mb-6 shrink-0">
              <div>
                <h3 className="text-xl font-bold text-gray-900">Audit & Assign</h3>
                <p className="text-xs text-gray-500 font-medium tracking-wide">
                  Vehicle: <span className="text-gray-900 font-bold">{selectedVehicle.vehicleNumber}</span> → Driver: <span className="text-emerald-600 font-bold">{auditTargetUser.name}</span>
                </p>
              </div>
              <button onClick={() => { setShowAuditModal(false); setAuditTargetUser(null); setVehicleInventory([]); }} className="p-2 hover:bg-gray-100 rounded-full text-gray-400"><X size={20} /></button>
            </div>

            <div className="flex-1 overflow-y-auto pr-2 space-y-4">
              {vehicleInventory.length > 0 && (
                <div className="relative group shrink-0">
                  <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-emerald-500 transition-colors" size={16} />
                  <input 
                    type="text" 
                    placeholder="Search items in vehicle..." 
                    value={auditSearch}
                    onChange={(e) => setAuditSearch(e.target.value)}
                    className="w-full pl-12 pr-4 py-3 bg-gray-50 border border-gray-100 rounded-2xl text-sm font-medium focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none transition-all"
                  />
                </div>
              )}

              {vehicleInventory.length === 0 ? (
                <div className="p-8 text-center bg-gray-50 rounded-2xl border border-dashed border-gray-200">
                  <Package size={32} className="mx-auto text-gray-300 mb-3" />
                  <p className="text-gray-500 font-medium text-sm">Vehicle has no stock assigned.</p>
                  <p className="text-gray-400 text-xs mt-1">You can proceed to assign the driver directly.</p>
                </div>
              ) : (
                <div className="border border-gray-100 rounded-2xl overflow-hidden bg-white">
                  <table className="w-full text-left">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-4 py-3 text-[10px] font-black uppercase text-gray-400 tracking-widest">Product</th>
                        <th className="px-4 py-3 text-[10px] font-black uppercase text-gray-400 tracking-widest text-center">Current Qty</th>
                        <th className="px-4 py-3 text-[10px] font-black uppercase text-gray-400 tracking-widest text-center">Audited Qty</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-50">
                      {vehicleInventory
                        .filter(item => 
                          item.name.toLowerCase().includes(auditSearch.toLowerCase()) || 
                          item.sku.toLowerCase().includes(auditSearch.toLowerCase())
                        )
                        .map((item, idx) => {
                          // Find original index in vehicleInventory for update logic
                          const originalIdx = vehicleInventory.findIndex(orig => orig.productId === item.productId);
                          return (
                            <tr key={item.productId} className={item.oldQuantity !== item.newQuantity ? 'bg-orange-50/30' : ''}>
                          <td className="px-4 py-3">
                            <p className="text-xs font-bold text-gray-900 line-clamp-1">{item.name}</p>
                            <p className="text-[10px] text-gray-400 tracking-wider font-mono mt-0.5">{item.sku}</p>
                          </td>
                          <td className="px-4 py-3 text-center">
                            <span className="text-xs font-bold text-gray-500 bg-gray-100 px-2 py-1 rounded-md">
                              {item.oldQuantity} {item.unit}
                            </span>
                          </td>
                          <td className="px-4 py-3">
                            <div className="flex items-center justify-center">
                              <input 
                                type="number"
                                min="0"
                                value={item.newQuantity}
                                onChange={(e) => {
                                  const val = parseInt(e.target.value) || 0;
                                  const newInv = [...vehicleInventory];
                                  newInv[originalIdx].newQuantity = Math.max(0, val);
                                  setVehicleInventory(newInv);
                                }}
                                className={cn(
                                  "w-20 px-2 py-1.5 text-center text-sm font-bold border rounded-lg outline-none transition-all focus:ring-2",
                                  item.oldQuantity !== item.newQuantity 
                                    ? "border-orange-200 bg-orange-50 text-orange-700 focus:ring-orange-500/20 focus:border-orange-500"
                                    : "border-gray-200 bg-gray-50 focus:ring-emerald-500/20 focus:border-emerald-500"
                                )}
                              />
                            </div>
                          </td>
                        </tr>
                      )})}
                    </tbody>
                  </table>
                </div>
              )}

              <div className="pt-2">
                <label className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2 block">Audit Remark (Optional)</label>
                <input 
                  type="text" 
                  placeholder="e.g. Broken items found during handover..."
                  value={auditRemark}
                  onChange={(e) => setAuditRemark(e.target.value)}
                  className="w-full px-4 py-3 bg-gray-50 border border-gray-100 rounded-xl text-sm focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none transition-all"
                />
              </div>
            </div>

            <div className="pt-6 border-t border-gray-100 flex items-center justify-end gap-3 shrink-0 mt-4">
              <button onClick={() => { setShowAuditModal(false); setAuditTargetUser(null); setVehicleInventory([]); }} 
                className="px-6 py-3 rounded-xl font-bold text-xs uppercase tracking-widest text-gray-500 hover:bg-gray-50 transition-all">
                Cancel
              </button>
              <button onClick={handleConfirmAuditAndAssign} disabled={isAuditing}
                className="px-8 py-3 bg-emerald-600 text-white rounded-xl font-black text-xs uppercase tracking-widest shadow-lg shadow-emerald-600/20 hover:bg-emerald-700 transition-all active:scale-95 disabled:opacity-70 flex items-center gap-2">
                {isAuditing ? <><Loader2 className="animate-spin" size={16} /> Submitting...</> : <><CheckCircle2 size={16} /> Confirm Audit & Assign</>}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Handover Policy Selector Modal ───────────────────────── */}
      {showPolicyModal && selectedVehicle && auditTargetUser && (
        <div className="fixed inset-0 z-50 flex items-end md:items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="bg-white w-full max-w-xl rounded-3xl p-6 shadow-2xl animate-in slide-in-from-bottom duration-300 flex flex-col gap-6">
            <div className="flex items-center justify-between shrink-0">
              <div>
                <h3 className="text-xl font-black text-gray-900 tracking-tight">Select Handover Strategy</h3>
                <p className="text-xs text-gray-400 font-bold mt-1">
                  Assigning <span className="text-emerald-600">{auditTargetUser.name}</span> to vehicle <span className="text-gray-700">{selectedVehicle.vehicleNumber}</span>
                </p>
              </div>
              <button onClick={() => { setShowPolicyModal(false); setAuditTargetUser(null); }} className="p-2 hover:bg-gray-100 rounded-full text-gray-400">
                <X size={20} />
              </button>
            </div>

            <div className="grid grid-cols-1 gap-4">
              {/* Policy A: Inherit */}
              <div 
                onClick={() => setHandoverPolicy('INHERIT')}
                className={`p-4 rounded-2xl border-2 cursor-pointer transition-all flex items-center justify-between ${handoverPolicy === 'INHERIT' ? 'bg-emerald-50/50 border-emerald-500 shadow-sm' : 'bg-gray-50/50 border-gray-100 hover:border-gray-200'}`}
              >
                <div className="flex items-center gap-3">
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center font-bold ${handoverPolicy === 'INHERIT' ? 'bg-emerald-600 text-white' : 'bg-white text-gray-400 shadow-sm'}`}>
                    A
                  </div>
                  <h4 className="text-sm font-black text-gray-900">Assign agent</h4>
                </div>
                <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${handoverPolicy === 'INHERIT' ? 'border-emerald-600 bg-emerald-600' : 'border-gray-300'}`}>
                  {handoverPolicy === 'INHERIT' && <div className="w-2 h-2 rounded-full bg-white" />}
                </div>
              </div>

              {/* Policy B: Carry-Over */}
              <div 
                onClick={() => setHandoverPolicy('CARRY_OVER')}
                className={`p-4 rounded-2xl border-2 cursor-pointer transition-all flex items-center justify-between ${handoverPolicy === 'CARRY_OVER' ? 'bg-emerald-50/50 border-emerald-500 shadow-sm' : 'bg-gray-50/50 border-gray-100 hover:border-gray-200'}`}
              >
                <div className="flex items-center gap-3">
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center font-bold ${handoverPolicy === 'CARRY_OVER' ? 'bg-emerald-600 text-white' : 'bg-white text-gray-400 shadow-sm'}`}>
                    B
                  </div>
                  <h4 className="text-sm font-black text-gray-900">Assign agent + Stock</h4>
                </div>
                <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${handoverPolicy === 'CARRY_OVER' ? 'border-emerald-600 bg-emerald-600' : 'border-gray-300'}`}>
                  {handoverPolicy === 'CARRY_OVER' && <div className="w-2 h-2 rounded-full bg-white" />}
                </div>
              </div>

              {/* Destination Pre-Routing Flow for Already Assigned Vehicles */}
              {handoverPolicy === 'CARRY_OVER' && auditTargetUser?.assignedVehicleId && auditTargetUser.assignedVehicleId !== selectedVehicle.id && (
                <div className="mt-2 p-4 rounded-2xl bg-amber-50/50 border border-amber-200/80 animate-in fade-in duration-200 flex flex-col gap-2">
                  <div className="flex items-center gap-2 text-amber-800 font-bold text-xs">
                    <span className="flex h-2 w-2 rounded-full bg-amber-500 animate-pulse" />
                    <span>Incoming Agent Context Detected</span>
                  </div>
                  <p className="text-xs font-medium text-amber-900 leading-relaxed">
                    <span className="font-bold">{auditTargetUser.name}</span> brings their stock from <span className="font-extrabold underline">{auditTargetUser.assignedVehicle?.vehicleNumber || 'Assigned Configuration'}</span>. 
                    {loadingDestStocks ? (
                      <span className="text-gray-500 inline-flex items-center gap-1 ml-1"><Loader2 className="animate-spin inline" size={12} /> Checking incoming items...</span>
                    ) : destExistingStocks.length > 0 ? (
                      <span className="text-emerald-700 font-bold ml-1">Contains {destExistingStocks.length} line items that will automatically pull into this vehicle.</span>
                    ) : (
                      <span className="text-gray-500 ml-1">Currently holds zero existing lines.</span>
                    )}
                  </p>
                </div>
              )}

              {/* Manual Destination Vehicle Selector for Current Stock */}
              {handoverPolicy === 'CARRY_OVER' && (
                <div className="mt-1 p-4 rounded-2xl bg-emerald-50/40 border border-emerald-100 flex flex-col gap-3 animate-in fade-in duration-200">
                  <label className="text-xs font-black uppercase tracking-wider text-emerald-950">
                    Route Current Vehicle's Leaving Stock ({vehicleInventory.length} items) To:
                  </label>
                  <select
                    value={carryOverTargetVehicleId}
                    onChange={(e) => setCarryOverTargetVehicleId(e.target.value)}
                    className="w-full p-3 rounded-xl border border-emerald-200 bg-white text-xs font-bold text-gray-800 outline-none focus:border-emerald-500 shadow-2xs cursor-pointer"
                  >
                    <option value="WAREHOUSE">🏢 Return to Main Branch / Warehouse Reserves</option>
                    {vehicles
                      .filter(v => v.id !== selectedVehicle.id)
                      .map(v => (
                        <option key={v.id} value={v.id}>
                          🚚 {v.vehicleNumber} {v.vehicleName ? `(${v.vehicleName})` : ''} {v.assignedUsers?.length > 0 ? `— Driver: ${v.assignedUsers.map(u => u.name).join(', ')}` : '— (Unassigned)'}
                        </option>
                      ))
                    }
                  </select>
                  <p className="text-[11px] text-emerald-800 font-medium">
                    {carryOverTargetVehicleId === 'WAREHOUSE' 
                      ? 'Flushes leaving stock line-items back into aggregate master inventory reserves.' 
                      : `Instantly reallocates piece-level quantities into the chosen vehicle matrix.`
                    }
                  </p>

                  {carryOverTargetVehicleId !== 'WAREHOUSE' && (
                    <div className="pt-2 border-t border-emerald-100 flex flex-col gap-2">
                      <label className="text-xs font-black uppercase tracking-wider text-emerald-950">
                        Simultaneously Assign Agent To Destination Vehicle:
                      </label>
                      <select
                        value={carryOverTargetUserId}
                        onChange={(e) => setCarryOverTargetUserId(e.target.value)}
                        className="w-full p-3 rounded-xl border border-emerald-200 bg-white text-xs font-bold text-gray-800 outline-none focus:border-emerald-500 shadow-2xs cursor-pointer"
                      >
                        <option value="">🚫 Do Not Assign / Leave Driverless</option>
                        {users.map(u => (
                          <option key={u.id} value={u.id}>
                            👤 {u.name} {u.role ? `(${u.role})` : ''} {u.store ? `— ${u.store.name}` : ''}
                          </option>
                        ))}
                      </select>
                      <p className="text-[10px] text-emerald-700 font-bold">
                        Tip: Pre-selected to the leaving driver of the current vehicle so driver & stock transfer together.
                      </p>
                    </div>
                  )}
                </div>
              )}
            </div>

            <div className="pt-4 border-t border-gray-100 flex items-center justify-end gap-3">
              <button 
                onClick={() => { setShowPolicyModal(false); setAuditTargetUser(null); }}
                className="px-6 py-3 rounded-xl font-bold text-xs uppercase tracking-widest text-gray-500 hover:bg-gray-50 transition-all"
              >
                Cancel
              </button>
              <button 
                onClick={handleConfirmPolicySelection}
                disabled={isAuditing}
                className="px-8 py-3 bg-emerald-600 text-white rounded-xl font-black text-xs uppercase tracking-widest shadow-lg shadow-emerald-600/20 hover:bg-emerald-700 transition-all active:scale-95 disabled:opacity-70 flex items-center gap-2"
              >
                {isAuditing ? <><Loader2 className="animate-spin" size={16} /> Processing...</> : <><ArrowRight size={16} /> Continue Handover</>}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function cn(...inputs) {
  return inputs.filter(Boolean).join(' ');
}
