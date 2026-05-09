import React, { useState, useEffect, useMemo } from 'react';
import {
  Plus, Minus, Package, Truck, ArrowDownCircle, ArrowUpCircle, Search, Filter, X, Loader2,
  Pencil, Trash2, Gift, FileText, CheckSquare, Square, ArrowLeft, Grid, Check, Barcode,
  RefreshCw, ScanBarcode, ClipboardList, CheckCircle, Camera, PlusCircle, CheckCircle2, AlertCircle,
  Building2, ArrowRight, ChevronLeft
} from 'lucide-react';
import { BrowserMultiFormatReader, BarcodeFormat } from '@zxing/browser';
import { DecodeHintType } from '@zxing/library';
import BarcodeScannerOverlay from '../../components/BarcodeScannerOverlay';
import { useSearchParams, useNavigate, useLocation } from 'react-router-dom';
import StoreSelector from './StoreSelector';
import { useUserStore } from '../../store/userStore';
import adminAPI from '../../services/adminService';
import { procurementAPI } from '../../services/procurementService';
import toast from 'react-hot-toast';
import * as XLSX from 'xlsx';

// Modular Components
import MasterSection from './admin_inventory/MasterSection';
import StoreStockSection from './admin_inventory/StoreStockSection';
import LoadingSection from './admin_inventory/LoadingSection';
import ReturnSection from './admin_inventory/ReturnSection';
import VehicleStockSection from './admin_inventory/VehicleStockSection';
import AuditsSection from './admin_inventory/AuditsSection';
import RefillsSection from './admin_inventory/RefillsSection';
import OpeningStockSection from './admin_inventory/OpeningStockSection';
import CreateItemView from './admin_inventory/CreateItemView';
import EditItemView from './admin_inventory/EditItemView';

export default function AdminInventory() {
  const [searchParams, setSearchParams] = useSearchParams();
  const activeTab = searchParams.get('tab') || 'master';
  const subTab = searchParams.get('sub') || 'loading';

  const setActiveTab = React.useCallback((tab) => {
    const params = new URLSearchParams(searchParams);
    params.set('tab', tab);
    setSearchParams(params);
  }, [searchParams, setSearchParams]);

  const setSubTab = React.useCallback((sub) => {
    const params = new URLSearchParams(searchParams);
    params.set('sub', sub);
    setSearchParams(params);
  }, [searchParams, setSearchParams]);

  const [searchQuery, setSearchQuery] = useState('');
  const [trackingSearch, setTrackingSearch] = useState('');
  const [masterSearch, setMasterSearch] = useState('');
  const [warehouseSearch, setWarehouseSearch] = useState('');
  const [auditSearch, setAuditSearch] = useState('');
  const [vehicleSearch, setVehicleSearch] = useState('');
  const [categorySearch, setCategorySearch] = useState('');
  const [subCategorySearch, setSubCategorySearch] = useState('');
  const [opsSearch, setOpsSearch] = useState('');
  const [returnSearch, setReturnSearch] = useState('');
  const [openingSearch, setOpeningSearch] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  const [masterCategory, setMasterCategory] = useState('ALL');
  const [warehouseCategory, setWarehouseCategory] = useState('ALL');
  const [masterSubCategory, setMasterSubCategory] = useState('ALL');
  const [opsCategory, setOpsCategory] = useState('ALL');
  const [returnCategory, setReturnCategory] = useState('ALL');
  const [opsSubCategory, setOpsSubCategory] = useState('ALL');
  const [returnSubCategory, setReturnSubCategory] = useState('ALL');
  const [masterStatus, setMasterStatus] = useState('ALL');
  const [masterFreeOnly, setMasterFreeOnly] = useState(false);
  const [items, setItems] = useState([]);
  const [vehicles, setVehicles] = useState([]);
  const [stores, setStores] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isCreateView, setIsCreateView] = useState(false);
  const [isEditView, setIsEditView] = useState(false);
  const [showBulkUploadModal, setShowBulkUploadModal] = useState(false);
  const [showZipImportModal, setShowZipImportModal] = useState(false);
  const [editItem, setEditItem] = useState(null);
  const [selectedFile, setSelectedFile] = useState(null);
  const [selectedEditFile, setSelectedEditFile] = useState(null);
  const [previewUrl, setPreviewUrl] = useState(null);
  const [editPreviewUrl, setEditPreviewUrl] = useState(null);
  const [isUploading, setIsUploading] = useState(false);
  const [selectedItems, setSelectedItems] = useState([]); // [id, id, ...]
  const [refillRequests, setRefillRequests] = useState([]);
  const [unselectedRefillItems, setUnselectedRefillItems] = useState([]);
  const [editedQuantities, setEditedQuantities] = useState({});
  const [itemRemarks, setItemRemarks] = useState({});
  const [expandedAgentId, setExpandedAgentId] = useState(null);
  const [viewingAgentId, setViewingAgentId] = useState(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(25);
  const [sales, setSales] = useState([]);
  const [users, setUsers] = useState([]);

  const storeFilterId = searchParams.get('storeId');
  const location = useLocation();
  const currentUser = useUserStore(s => s.user);
  const can = useUserStore(s => s.can);
  const isGlobalRole = currentUser?.role === 'TENANT_OWNER' || currentUser?.role === 'SUPER_ADMIN' || (currentUser?.role === 'ADMIN' && !currentUser?.customRoleId) || currentUser?.portalType === 'ADMIN';
  const [showScanner, setShowScanner] = useState(false);
  const [showRegistryModal, setShowRegistryModal] = useState(false); // Deprecated but keeping state for now if needed elsewhere
  const [isRegistryView, setIsRegistryView] = useState(false);
  const [registryItems, setRegistryItems] = useState([]);
  const [loadingRegistry, setLoadingRegistry] = useState(false);
  const [selectedRegistryIds, setSelectedRegistryIds] = useState([]);
  const [registrySearch, setRegistrySearch] = useState('');
  const [registryQuantities, setRegistryQuantities] = useState({}); // { [productId]: quantity }
  const [scannerTarget, setScannerTarget] = useState('create');

  // States for stock actions
  const [selectedVehicleId, setSelectedVehicleId] = useState('');
  const [stockQuantities, setStockQuantities] = useState({}); // { productId: quantity }
  const [vehicleInventory, setVehicleInventory] = useState([]);
  const [loadingMaster, setLoadingMaster] = useState(false);
  const [loadingInventory, setLoadingInventory] = useState(false);
  const [loadingRefills, setLoadingRefills] = useState(false);
  const [loadingAudit, setLoadingAudit] = useState(false);
  const [loadingVehicles, setLoadingVehicles] = useState(false);

  const [allVehiclesStock, setAllVehiclesStock] = useState({}); // { [vehicleId]: inventoryList }
  const [loadingTracking, setLoadingTracking] = useState(false);
  const [intakeItems, setIntakeItems] = useState([]); // Draft list for bulk stock intake
  const [intakeQuantities, setIntakeQuantities] = useState({}); // { productId: quantity }
  const [quickIntake, setQuickIntake] = useState({ productId: '', quantity: '' });
  const [intakeSearch, setIntakeSearch] = useState('');
  const [viewingVehicleId, setViewingVehicleId] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [deletingId, setDeletingId] = useState(null);
  const [taxRates, setTaxRates] = useState(['0', '5', '12', '18']);
  const [categories, setCategories] = useState([]);
  const [subCategories, setSubCategories] = useState([]);
  const [units, setUnits] = useState([]);
  const [isAuditMode, setIsAuditMode] = useState(false);
  const [auditQuantities, setAuditQuantities] = useState({}); // { productId: quantity }
  const [showLoadConfirmModal, setShowLoadConfirmModal] = useState(false);
  const [pendingLoadItems, setPendingLoadItems] = useState([]);
  const [modalTab, setModalTab] = useState('info'); // info or price
  const [auditHistory, setAuditHistory] = useState([]);
  const [auditRemark, setAuditRemark] = useState('');
  const [selectedAuditId, setSelectedAuditId] = useState(null);
  const [processingItems, setProcessingItems] = useState(new Set());
  const [warehouseStock, setWarehouseStock] = useState([]);
  const [stockInputs, setStockInputs] = useState({}); // { productId: quantity }

  const handleUpdateStock = async (productId, quantity, mode = 'set') => {
    if (quantity === undefined || quantity === '' || isNaN(quantity) || parseInt(quantity) < 0) {
      toast.error('Please enter a valid positive quantity');
      return;
    }

    try {
      setProcessingItems(prev => new Set(prev).add(productId));
      await adminAPI.updateProductStock({
        productId,
        quantity: parseInt(quantity),
        mode
      });

      toast.success('Stock updated successfully');
      setStockInputs(prev => ({ ...prev, [productId]: '' }));
      fetchData(); // Refresh all data
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to update stock');
    } finally {
      setProcessingItems(prev => {
        const next = new Set(prev);
        next.delete(productId);
        return next;
      });
    }
  };

  const [newItem, setNewItem] = useState({
    name: '',
    description: '',
    mrp: '',
    price: '',
    landingPrice: '',
    discount: '',
    discountType: 'RUPEE',
    categoryId: 'default',
    subCategoryId: 'default',
    brandId: 'default',
    unitId: '',
    unitValue: '',
    gst: '0',
    isFree: false,
    minShopAmount: '0',
    status: 'ACTIVE',
    barcode: '',
    skuCode: '',
    stock: ''
  });

  const fetchData = async () => {
    try {
      setLoading(true);
      setLoadingMaster(true);
      setLoadingInventory(true);
      setLoadingRefills(true);
      setLoadingAudit(true);
      setLoadingVehicles(true);

      // Clear states to avoid showing old data from previous store selection (glitch fix)
      setItems([]);
      setVehicles([]);
      setAuditHistory([]);
      setWarehouseStock([]);
      setSales([]);
      setUsers([]);
      setRegistryItems([]);
      setRefillRequests([]);
      setAllVehiclesStock({});
      setIntakeItems([]);
      setVehicleInventory([]);

      // 1. Primary Mega-Fetch (Consolidated from newexpenses)
      const { data: initData } = await adminAPI.getInventoryInit({ 
        storeId: activeTab === 'main_master' ? undefined : storeFilterId 
      });
      
      if (initData?.success) {
        setItems(initData.items || []);
        setVehicles(initData.vehicles || []);
        setCategories(initData.categories || []);
        setSubCategories(initData.subCategories || []);
        setUnits(initData.units || []);
        setRefillRequests(initData.refillRequests || []);
        setAllVehiclesStock(initData.vehicleStock || {});

        const settings = initData.settings?.find(s => s.storeId === storeFilterId) || initData.settings?.[0];
        if (settings?.taxRates) {
          setTaxRates(settings.taxRates.split(',').map(r => r.trim()));
        } else {
          setTaxRates(['0', '5', '12', '18']); // Default fallback
        }
      }

      // 2. Secondary Fetches (Settled so one failure doesn't crash the page)
      const results = await Promise.allSettled([
        adminAPI.getAuditHistory({ storeId: storeFilterId }),
        activeTab === 'inventory' ? procurementAPI.getStockReport({ storeId: storeFilterId }) : Promise.resolve({ data: [] }),
        adminAPI.getStores(),
        adminAPI.getSales().catch(() => ({ data: [] })),
        adminAPI.getUsers().catch(() => ({ data: [] }))
      ]);

      // Process settled results
      if (results[0].status === 'fulfilled') setAuditHistory(results[0].value.data || []);
      if (results[1].status === 'fulfilled') setWarehouseStock(results[1].value.data || []);
      if (results[2].status === 'fulfilled' && results[2].value.data?.success) {
        const fetchedStores = results[2].value.data.data;
        setStores(fetchedStores);
        // Auto-select if only one store exists (HEAD logic)
        if (fetchedStores.length === 1 && !storeFilterId) {
          const params = new URLSearchParams(searchParams);
          params.set('storeId', fetchedStores[0].id);
          setSearchParams(params);
        }
      }
      if (results[3].status === 'fulfilled') setSales(results[3].value.data || []);
      if (results[4].status === 'fulfilled') setUsers(results[4].value.data || []);
    } catch (error) {
      console.error('❌ fetchData Error:', error);
      const msg = error.response?.data?.message || 'Failed to fetch inventory data';
      toast.error(msg);
    } finally {
      setLoading(false);
      setLoadingMaster(false);
      setLoadingInventory(false);
      setLoadingRefills(false);
      setLoadingAudit(false);
      setLoadingVehicles(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [storeFilterId, activeTab]);

  const fetchRegistry = async () => {
    try {
      setLoadingRegistry(true);
      // Clear previous registry items
      setRegistryItems([]);
      const res = await adminAPI.getItems({ all: 'true' });
      // Filter out items already in this store
      const currentItemNames = new Set(items.map(i => i.name.toLowerCase()));
      const available = res.data.filter(item => !currentItemNames.has(item.name.toLowerCase()));
      setRegistryItems(available);
    } catch (error) {
      toast.error('Failed to fetch registry items');
    } finally {
      setLoadingRegistry(false);
    }
  };

  useEffect(() => {
    if (isRegistryView) {
      fetchRegistry();
    }
  }, [isRegistryView]);

  const handleBulkImport = async () => {
    const transfers = selectedRegistryIds.map(id => ({
      productId: id,
      quantity: registryQuantities[id] || 0
    })).filter(t => t.quantity > 0);

    if (transfers.length === 0) {
      toast.error('Please specify sync quantities for selected products');
      return;
    }

    try {
      setIsUploading(true);
      const res = await adminAPI.bulkImportItems({
        transfers,
        targetStoreId: storeFilterId
      });

      if (res.data.success) {
        toast.success(res.data.message);
        setIsRegistryView(false);
        setSelectedRegistryIds([]);
        setRegistryQuantities({});
        fetchData();
      }
    } catch (error) {
      console.error('Import error:', error);
      toast.error(error.response?.data?.message || 'Failed to sync products');
    } finally {
      setIsUploading(false);
    }
  };

  useEffect(() => {
    setCurrentPage(1);
  }, [
    masterSearch, warehouseSearch, auditSearch, opsSearch, returnSearch,
    intakeSearch, vehicleSearch, trackingSearch, openingSearch,
    masterCategory, masterSubCategory, masterStatus, masterFreeOnly,
    activeTab, subTab
  ]);

  const handleQuantityChange = React.useCallback((id, val) => {
    setStockQuantities(prev => ({ ...prev, [id]: val }));
  }, []);

  // Optimized lookup map for vehicle inventory
  const vehicleInventoryMap = React.useMemo(() => {
    const map = {};
    (vehicleInventory || []).forEach(vi => {
      map[vi.productId] = vi.quantity;
    });
    return map;
  }, [vehicleInventory]);

  // Optimized totals and filtering
  const totalLoadingValue = React.useMemo(() => {
    return items.reduce((acc, item) => {
      const qty = parseFloat(stockQuantities[item.id]) || 0;
      return acc + (qty * (parseFloat(item.price) || 0));
    }, 0);
  }, [items, stockQuantities]);

  const totalReturnInventoryValue = React.useMemo(() => {
    return items.reduce((acc, item) => {
      const currentStock = vehicleInventoryMap[item.id] || 0;
      return acc + (currentStock * (parseFloat(item.price) || 0));
    }, 0);
  }, [items, vehicleInventoryMap]);

  const loadingFilteredItems = React.useMemo(() => {
    const q = opsSearch.toLowerCase();
    return items.filter(i => {
      const matchesSearch = i.name.toLowerCase().includes(q) ||
        (i.barcode && i.barcode.toLowerCase().includes(q)) ||
        (i.displayId && i.displayId.toLowerCase().includes(q));
      const matchesCategory = opsCategory === 'ALL' || i.category?.name === opsCategory;
      const matchesSubCategory = opsSubCategory === 'ALL' || i.subCategory?.name === opsSubCategory;
      const hasStock = (i.stock || 0) > 0;
      return matchesSearch && matchesCategory && matchesSubCategory && hasStock;
    });
  }, [items, opsSearch, opsCategory, opsSubCategory]);

  const groupedLoadingItems = React.useMemo(() => {
    const regular = [];
    const free = [];
    loadingFilteredItems.forEach(i => {
      if (i.isFree) free.push(i);
      else regular.push(i);
    });
    return { regular, free };
  }, [loadingFilteredItems]);

  const returnFilteredItems = React.useMemo(() => {
    const q = returnSearch.toLowerCase();
    return items.filter(i => {
      const matchesSearch = i.name.toLowerCase().includes(q) ||
        (i.barcode && i.barcode.toLowerCase().includes(q)) ||
        (i.displayId && i.displayId.toLowerCase().includes(q));
      const matchesCategory = returnCategory === 'ALL' || i.category?.name === returnCategory;
      const matchesSubCategory = returnSubCategory === 'ALL' || i.subCategory?.name === returnSubCategory;
      return matchesSearch && matchesCategory && matchesSubCategory;
    });
  }, [items, returnSearch, returnCategory, returnSubCategory]);

  const groupedReturnItems = React.useMemo(() => {
    const regular = [];
    const free = [];
    returnFilteredItems.forEach(i => {
      if (i.isFree) free.push(i);
      else regular.push(i);
    });
    return { regular, free };
  }, [returnFilteredItems]);

  const hasInvalidQuantities = React.useMemo(() => {
    return Object.entries(stockQuantities).some(([pid, qty]) => {
      const prod = items.find(p => p.id === pid);
      return prod && (parseInt(qty) || 0) > (prod.stock || 0);
    });
  }, [stockQuantities, items]);

  const hasInvalidReturnQuantities = React.useMemo(() => {
    return Object.entries(stockQuantities).some(([pid, qty]) => {
      const currentVehicleStock = vehicleInventoryMap[pid] || 0;
      return (parseInt(qty) || 0) > currentVehicleStock;
    });
  }, [stockQuantities, vehicleInventoryMap]);

  const hasInvalidRegistryQuantities = React.useMemo(() => {
    return Object.entries(registryQuantities).some(([pid, qty]) => {
      const prod = registryItems.find(p => p.id === pid);
      return prod && (parseInt(qty) || 0) > (prod.stock || 0);
    });
  }, [registryQuantities, registryItems]);

  const groupedRefills = React.useMemo(() => {
    const groups = {};
    (refillRequests || []).forEach(req => {
      // Use both name and ID for more reliable grouping if ID is missing from old records
      const userId = req.user?.id || req.user?.name || 'unknown';
      if (!groups[userId]) {
        groups[userId] = {
          user: req.user,
          vehicle: req.vehicle,
          requests: [],
          latestDate: new Date(req.createdAt)
        };
      }
      groups[userId].requests.push(req);
      const reqDate = new Date(req.createdAt);
      if (reqDate > groups[userId].latestDate) {
        groups[userId].latestDate = reqDate;
      }
    });

    // Sort requests within each group by date (newest first)
    Object.values(groups).forEach(group => {
      group.requests.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    });

    return Object.values(groups).sort((a, b) => b.latestDate - a.latestDate);
  }, [refillRequests]);

  const activeRefillGroup = React.useMemo(() => {
    if (!viewingAgentId) return null;
    return groupedRefills.find(g => (g.user?.id || g.user?.name || 'unknown') === viewingAgentId);
  }, [groupedRefills, viewingAgentId]);

  useEffect(() => {
    if (selectedVehicleId && activeTab === 'return' && subTab === 'return') {
      fetchVehicleInventory(selectedVehicleId);
    }
  }, [selectedVehicleId, activeTab, subTab]);

  useEffect(() => {
    if (activeTab === 'return') {
      if (subTab === 'tracking') {
        loadAllVehiclesStock();
      }
      if (subTab === 'refills') {
        loadRefillRequests();
        loadAllVehiclesStock();
      }
    }
  }, [activeTab, subTab, vehicles]);

  const loadRefillRequests = async () => {
    try {
      const { data } = await adminAPI.getRefillRequests({ storeId: storeFilterId });
      setRefillRequests(data);
    } catch (error) {
      toast.error('Failed to load refill requests');
    }
  };

  const loadAllVehiclesStock = async (force = false) => {
    if (vehicles.length === 0) return;
    
    // Skip if we already have data from the Mega-Fetch (unless forced)
    if (!force && Object.keys(allVehiclesStock).length > 0) return;

    try {
      // Use Promise.allSettled for much faster parallel fetching than the previous sequential loop
      const results = await Promise.allSettled(vehicles.map(v => adminAPI.getVehicleInventory(v.id)));
      
      const stockMap = {};
      results.forEach((res, idx) => {
        if (res.status === 'fulfilled') {
          stockMap[vehicles[idx].id] = res.value.data;
        }
      });
      
      setAllVehiclesStock(prev => ({ ...prev, ...stockMap }));
    } catch (err) {
      console.error('❌ loadAllVehiclesStock Error:', err);
      toast.error('Failed to load tracking data for all vehicles');
    } finally {
      setLoadingTracking(false);
    }
  };

  const refreshSingleVehicleStock = async (vId) => {
    try {
      const res = await adminAPI.getVehicleInventory(vId);
      setAllVehiclesStock(prev => ({ ...prev, [vId]: res.data }));
    } catch (err) {
      console.error(`Failed to refresh stock for vehicle ${vId}:`, err);
    }
  };

  const fetchSubCategories = async () => {
    try {
      const { data } = await adminAPI.getSubCategories();
      setSubCategories(data);
    } catch (error) {
      toast.error('Failed to fetch sub-categories');
    }
  };

  const fetchVehicleInventory = async (vId) => {
    try {
      const { data } = await adminAPI.getVehicleInventory(vId);
      setVehicleInventory(data);
    } catch (error) {
      toast.error('Failed to fetch vehicle inventory');
    }
  };

  const calculateFinalPrice = (mrp, discount, type = 'RUPEE') => {
    const m = parseFloat(mrp) || 0;
    const d = parseFloat(discount) || 0;

    let base;
    if (type === 'PERCENT') {
      base = m - (m * (d / 100));
    } else {
      base = m - d;
    }

    return base.toFixed(2);
  };

  const handleDownloadSample = () => {
    const ws = XLSX.utils.json_to_sheet([
      {
        "Product Name": "Basmati Rice 1kg",
        "Category": "Staples",
        "Sub Category": "Rice",
        "Unit Type": "KG",
        "Unit Value": "1",
        "Landing Price": "80.00",
        "MRP": "120.00",
        "Selling Price": "110.00",
        "Discount Value": "10.00",
        "Discount Type": "RUPEE",
        "GST Slab": "0",
        "Image Filename": "rice_packet.jpg",
        "Description": "Premium aged long grain basmati rice"
      }
    ]);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "villagkart");
    XLSX.writeFile(wb, "villagkart.xlsx");
  };

  const handleExcelUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    setIsUploading(true);
    const reader = new FileReader();

    reader.onload = async (evt) => {
      try {
        const bstr = evt.target.result;
        const wb = XLSX.read(bstr, { type: 'binary' });
        const wsname = wb.SheetNames[0];
        const ws = wb.Sheets[wsname];
        const data = XLSX.utils.sheet_to_json(ws);

        if (data.length === 0) {
          toast.error('Excel file is empty');
          setIsUploading(false);
          return;
        }

        const products = data
          .map((row) => {
            // Identify columns case-insensitively
            const keys = Object.keys(row);
            const findKey = (search) => keys.find(k => k.toLowerCase().includes(search.toLowerCase()));

            const nameKey = findKey('product name') || findKey('name') || keys[0];
            const landingPriceKey = findKey('landing price') || findKey('landing');
            const mrpKey = findKey('mrp');
            const discountValueKey = findKey('discount value') || findKey('discount');
            const discountTypeKey = findKey('discount type');
            const gstKey = findKey('gst slab') || findKey('gst') || findKey('tax');
            const descriptionKey = findKey('description');

            // New hierarchical keys
            const subCategoryKey = keys.find(k => k.toLowerCase().includes('sub category') || k.toLowerCase().includes('sub-category'));
            const categoryKey = keys.find(k => k.toLowerCase() === 'category' || k.toLowerCase() === 'main category');
            const unitTypeKey = findKey('unit type');
            const unitValueKey = findKey('unit value');

            if (!row[nameKey]) return null;

            // Identify discount type from column name containing "discount"
            let discountType = 'RUPEE';
            if (discountValueKey && (discountValueKey.includes('%') || discountValueKey.toLowerCase().includes('percent'))) {
              discountType = 'PERCENT';
            } else if (row[discountTypeKey] && (row[discountTypeKey].toString().includes('%') || row[discountTypeKey].toString().toLowerCase().includes('percent'))) {
              discountType = 'PERCENT';
            }

            const mrp = parseFloat(row[mrpKey]) || 0;
            const discount = parseFloat(row[discountValueKey]) || 0;
            const gst = parseFloat(row[gstKey]) || 0;
            const price = calculateFinalPrice(mrp, discount, discountType);

            return {
              name: row[nameKey],
              landingPrice: parseFloat(row[landingPriceKey]) || 0,
              mrp,
              discount,
              discountType,
              gst,
              description: row[descriptionKey] || '',
              price: parseFloat(price),
              status: 'ACTIVE',
              isFree: false,
              categoryName: categoryKey ? row[categoryKey] : null,
              subCategoryName: subCategoryKey ? row[subCategoryKey] : null,
              unitType: unitTypeKey ? row[unitTypeKey] : null,
              unitValue: unitValueKey ? row[unitValueKey] : null
            };
          })
          .filter(p => p && p.name);

        if (products.length === 0) {
          toast.error('No valid products found in Excel');
          setIsUploading(false);
          return;
        }

        await adminAPI.bulkCreateItems(products);
        toast.success(`Successfully uploaded ${products.length} products`);
        setShowBulkUploadModal(false);
        fetchData();
      } catch (error) {
        console.error('Excel upload error:', error);
        toast.error('Failed to process Excel file');
      } finally {
        setIsUploading(false);
        e.target.value = ''; // Reset input
      }
    };

    reader.readAsBinaryString(file);
  };

  const handleZipUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    if (!file.name.endsWith('.zip')) {
      toast.error('Please upload a valid ZIP file');
      return;
    }

    setIsUploading(true);
    try {
      const formData = new FormData();
      formData.append('zipFile', file);

      const response = await adminAPI.importZipInventory(formData);
      toast.success(`ZIP Import Complete: ${response.data.success} successful, ${response.data.failed} failed`);
      setShowZipImportModal(false);
      fetchData();
    } catch (error) {
      console.error('ZIP upload error:', error);
      toast.error(error.response?.data?.message || 'Failed to process ZIP file');
    } finally {
      setIsUploading(false);
      e.target.value = ''; // Reset input
    }
  };

  const handleCreateItem = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      const formData = new FormData();
      Object.keys(newItem).forEach(key => {
        if (newItem[key] !== undefined && newItem[key] !== null) {
          formData.append(key, newItem[key]);
        }
      });

      // Enforce storeId isolation during creation
      const currentStoreId = storeFilterId || currentUser.storeId;
      if (currentStoreId) {
        formData.append('storeId', currentStoreId);
      }

      if (selectedFile) {
        formData.append('image', selectedFile);
      }

      await adminAPI.createItem(formData);
      toast.success('Item added to master');
      setIsCreateView(false);
      setSelectedFile(null);
      setPreviewUrl(null);
      setNewItem({
        name: '',
        description: '',
        mrp: '',
        price: '',
        landingPrice: '',
        discount: '',
        discountType: 'RUPEE',
        categoryId: 'default',
        subCategoryId: 'default',
        brandId: 'default',
        unitId: '',
        unitValue: '',
        gst: '0',
        isFree: false,
        minShopAmount: '0',
        status: 'ACTIVE',
        barcode: '',
        skuCode: '',
        stock: ''
      });
      fetchData();
    } catch (error) {
      console.error('Create item error:', error);
      toast.error(error.response?.data?.message || 'Failed to add item');
    } finally {
      setIsSubmitting(false);
    }
  };

  const openEditModal = (item) => {
    setModalTab('info');
    setEditItem({
      id: item.id,
      name: item.name || '',
      description: item.description || '',
      mrp: item.mrp?.toString() || '',
      price: item.price?.toString() || '',
      landingPrice: item.landingPrice?.toString() || '',
      discount: item.discount?.toString() || '',
      discountType: item.discountType || 'RUPEE',
      image: item.image || '',
      status: item.status || 'ACTIVE',
      categoryId: item.categoryId || 'default',
      subCategoryId: item.subCategoryId || 'default',
      brandId: item.brandId || 'default',
      unitId: item.unitId || '',
      unitValue: item.unitValue?.toString() || '',
      gst: item.gst?.toString() || '0',
      isFree: item.isFree || false,
      minShopAmount: item.minShopAmount?.toString() || '0',
      barcode: item.barcode || '',
      stock: item.stock?.toString() || '0',
      storeId: item.storeId || ''
    });
    setEditPreviewUrl(item.image || null);
    setIsEditView(true);
  };

  const generateBarcode = (isEdit = false) => {
    const timestamp = Date.now().toString().slice(-8);
    const random = Math.floor(Math.random() * 10000).toString().padStart(4, '0');
    const code = timestamp + random;
    if (isEdit) {
      setEditItem(prev => ({ ...prev, barcode: code }));
    } else {
      setNewItem(prev => ({ ...prev, barcode: code }));
    }
    toast.success('Unique Barcode Generated');
  };



  const handleUpdateItem = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      const formData = new FormData();
      Object.keys(editItem).forEach(key => {
        if (key !== 'image' && editItem[key] !== undefined && editItem[key] !== null) {
          formData.append(key, editItem[key]);
        }
      });

      // Store ID is already included in editItem state

      if (selectedEditFile) {
        formData.append('image', selectedEditFile);
      }

      await adminAPI.updateItem(editItem.id, formData);
      toast.success('Item updated successfully');
      setIsEditView(false);
      setEditItem(null);
      setSelectedEditFile(null);
      setEditPreviewUrl(null);
      fetchData();
    } catch (error) {
      console.error('Update item error:', error);
      toast.error(error.response?.data?.message || 'Failed to update item');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleToggleStatus = async (item) => {
    try {
      const updatedStatus = item.status === 'ACTIVE' ? 'INACTIVE' : 'ACTIVE';
      const formData = new FormData();
      formData.append('status', updatedStatus);

      await adminAPI.updateItem(item.id, formData);
      toast.success(`Item marked as ${updatedStatus.toLowerCase()}`);
      fetchData();
    } catch (error) {
      toast.error('Failed to update item status');
    }
  };

  const handleDeleteItem = async (item) => {
    if (!window.confirm(`Delete "${item.name}" from inventory? This cannot be undone.`)) return;
    setDeletingId(item.id);
    try {
      await adminAPI.deleteItem(item.id);
      toast.success('Item deleted successfully');
      setIsEditView(false);
      setEditItem(null);
      fetchData();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to delete item');
    } finally {
      setDeletingId(null);
    }
  };

  const handleBulkDelete = async () => {
    if (selectedItems.length === 0) return;
    if (!window.confirm(`Delete ${selectedItems.length} selected items? This cannot be undone.`)) return;

    setIsUploading(true);
    try {
      await adminAPI.bulkDeleteItems(selectedItems);
      toast.success(`Successfully deleted ${selectedItems.length} items`);
      setSelectedItems([]);
      fetchData();
    } catch (error) {
      toast.error('Failed to delete selected items');
    } finally {
      setIsUploading(false);
    }
  };

  const toggleSelectItem = (id) => {
    setSelectedItems(prev =>
      prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
    );
  };

  const handleSelectAll = (filteredItems) => {
    if (selectedItems.length === filteredItems.length && filteredItems.length > 0) {
      setSelectedItems([]);
    } else {
      setSelectedItems(filteredItems.map(i => i.id));
    }
  };

  const handleFileChange = (e, isEdit = false) => {
    const file = e.target.files[0];
    if (file) {
      if (isEdit) {
        setSelectedEditFile(file);
        setEditPreviewUrl(URL.createObjectURL(file));
      } else {
        setSelectedFile(file);
        setPreviewUrl(URL.createObjectURL(file));
      }
    }
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
          price: itemDetails?.price,
          isFree: itemDetails?.isFree,
          unitValue: itemDetails?.unitValue,
          unitType: itemDetails?.unit?.type
        };
      });

    if (actionItems.length === 0) return toast.error('Please enter quantities');

    setPendingLoadItems(actionItems);
    setShowLoadConfirmModal(true);
  };

  const handleConfirmLoad = async () => {
    setIsSubmitting(true);
    try {
      const itemsToLoad = pendingLoadItems.map(i => ({ productId: i.productId, quantity: i.quantity }));
      await adminAPI.loadStock({ vehicleId: selectedVehicleId, items: itemsToLoad });
      toast.success('Stock loaded successfully');
      setStockQuantities({});
      setShowLoadConfirmModal(false);
    } catch (error) {
      console.error('❌ Load Error:', error);
      const msg = error.response?.data?.message || 'Failed to load stock';
      toast.error(msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleStockAction = async (type) => {
    if (!selectedVehicleId) return toast.error('Please select a vehicle');

    const actionItems = Object.entries(stockQuantities)
      .filter(([_, qty]) => qty > 0)
      .map(([productId, quantity]) => ({ productId, quantity: parseInt(quantity) }));

    if (actionItems.length === 0) return toast.error('Please enter quantities');

    if (type === 'LOAD') {
      const overStockItems = actionItems.filter(ai => {
        const prod = items.find(p => p.id === ai.productId);
        return prod && ai.quantity > (prod.stock || 0);
      });

      if (overStockItems.length > 0) {
        const names = overStockItems.map(oi => items.find(p => p.id === oi.productId)?.name).join(', ');
        return toast.error(`Insufficient stock for: ${names}`);
      }
    }

    setIsSubmitting(true);
    try {
      if (type === 'LOAD') {
        await adminAPI.loadStock({ vehicleId: selectedVehicleId, items: actionItems });
        toast.success('Stock loaded successfully');
      } else {
        await adminAPI.returnStock({ vehicleId: selectedVehicleId, items: actionItems });
        toast.success('Stock returned successfully');
      }
      setStockQuantities({});
      if (type === 'RETURN') fetchVehicleInventory(selectedVehicleId);
    } catch (error) {
      console.error(`❌ ${type} Error:`, error);
      const msg = error.response?.data?.message || `Failed to ${type === 'LOAD' ? 'load' : 'return'} stock`;
      toast.error(msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleAuditSave = async () => {
    if (!viewingVehicleId) return;

    // items to update [{productId, quantity}]
    const auditItems = Object.entries(auditQuantities).map(([productId, quantity]) => ({
      productId,
      quantity: parseInt(quantity) || 0
    }));

    if (auditItems.length === 0) {
      setIsAuditMode(false);
      return;
    }

    setIsSubmitting(true);
    try {
      await adminAPI.auditVehicleStock(viewingVehicleId, { items: auditItems, remark: auditRemark });
      toast.success('Inventory audited successfully');
      setIsAuditMode(false);
      setAuditQuantities({});
      setAuditRemark('');

      // OPTIMIZATION: Instead of full reload, refresh only the audited vehicle
      await refreshSingleVehicleStock(viewingVehicleId);

      const aRes = await adminAPI.getAuditHistory({ storeId: storeFilterId });
      setAuditHistory(aRes.data || []);
    } catch (error) {
      console.error('Audit Save Error:', error);
      toast.error('Failed to audit inventory');
    } finally {
      setIsSubmitting(false);
    }
  };

  const uniqueCategories = [...new Set(items.map(i => i.category?.name).filter(Boolean))];

  const filteredItems = React.useMemo(() => {
    return items.filter(item => {
      const matchesSearch = item.name.toLowerCase().includes(masterSearch.toLowerCase()) ||
        (item.barcode && item.barcode.toLowerCase().includes(masterSearch.toLowerCase())) ||
        (item.displayId && item.displayId.toLowerCase().includes(masterSearch.toLowerCase()));
      const matchesCategory = masterCategory === 'ALL' || item.category?.name === masterCategory;
      const matchesSubCategory = masterSubCategory === 'ALL' || item.subCategory?.name === masterSubCategory;
      const matchesStatus = masterStatus === 'ALL' || item.status === masterStatus;
      const matchesFree = !masterFreeOnly || item.isFree;
      return matchesSearch && matchesCategory && matchesSubCategory && matchesStatus && matchesFree;
    });
  }, [items, masterSearch, masterCategory, masterSubCategory, masterStatus, masterFreeOnly]);

  const paginatedItems = React.useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    return filteredItems.slice(start, start + itemsPerPage);
  }, [filteredItems, currentPage, itemsPerPage]);

  const totalPages = Math.ceil(filteredItems.length / itemsPerPage);

  // Gatekeeper removed for Tenant Owners to allow "All Stores" inventory view

  // Filter vehicles specifically for the selected store scope inside Inventory Tracking/Returns
  const activeVehicles = vehicles.filter(v => (!storeFilterId || v.storeId === storeFilterId));

  const renderMaster = () => {
    if (isRegistryView) {
      return (
        <div className="flex flex-col h-full animate-in fade-in slide-in-from-bottom-4 duration-500">
          {/* Registry Header */}
          <div className="mb-6 flex items-center justify-between">
            <div className="flex items-center gap-4">
              <button
                onClick={() => { setIsRegistryView(false); setSelectedRegistryIds([]); }}
                className="w-10 h-10 rounded-xl bg-gray-50 text-gray-400 flex items-center justify-center hover:bg-indigo-50 hover:text-indigo-600 transition-all border border-gray-100 shadow-sm"
              >
                <ChevronLeft size={20} />
              </button>
              <div>
                <h3 className="text-xl font-black text-gray-900 tracking-tight leading-none mb-1">Global Product Registry</h3>
                <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Select products from Main Master to import into this branch</p>
              </div>
            </div>

            <div className="flex items-center gap-3 bg-white px-4 py-2.5 rounded-2xl border border-gray-100 shadow-sm focus-within:ring-2 focus-within:ring-indigo-500/20 transition-all w-full max-w-md">
              <Search size={16} className="text-gray-400" />
              <input
                type="text"
                placeholder="Search Registry..."
                value={registrySearch}
                onChange={(e) => setRegistrySearch(e.target.value)}
                className="flex-1 bg-transparent border-none focus:outline-none text-[11px] font-black uppercase tracking-tight"
              />
            </div>
          </div>

          {/* Registry Table Content */}
          <div className="flex-1 overflow-auto bg-white rounded-[2rem] border border-gray-100 shadow-sm relative no-scrollbar">
            {loadingRegistry ? (
              <div className="flex flex-col items-center justify-center h-64 gap-4">
                <Loader2 size={40} className="animate-spin text-emerald-500" />
                <p className="text-[10px] font-black text-emerald-600 uppercase tracking-widest animate-pulse">Syncing Global Catalog...</p>
              </div>
            ) : registryItems.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-64 text-center">
                <div className="w-20 h-20 bg-gray-50 rounded-3xl flex items-center justify-center mx-auto mb-4 border border-gray-100">
                  <Package size={32} className="text-gray-200" />
                </div>
                <h4 className="text-sm font-black text-gray-400 uppercase tracking-widest">Everything is in sync</h4>
                <p className="text-[10px] font-bold text-gray-300 mt-1">All products are already present in this branch</p>
              </div>
            ) : (
              <div className="min-w-[800px] p-6 pb-32">
                <table className="w-full border-separate border-spacing-y-2">
                  <thead className="sticky top-0 bg-white/80 backdrop-blur-md z-10">
                    <tr className="text-[9px] font-black text-gray-400 uppercase tracking-[0.2em] border-b border-gray-50">
                      <th className="px-6 py-4 text-left w-16">
                        <button
                          onClick={() => {
                            const allOnPage = registryItems.filter(item =>
                              item.name.toLowerCase().includes(registrySearch.toLowerCase()) ||
                              (item.barcode && item.barcode.includes(registrySearch))
                            ).map(i => i.id);

                            if (selectedRegistryIds.length === allOnPage.length) setSelectedRegistryIds([]);
                            else setSelectedRegistryIds(allOnPage);
                          }}
                          className={`w-5 h-5 rounded-md border-2 transition-colors flex items-center justify-center ${selectedRegistryIds.length > 0 ? 'bg-emerald-600 border-emerald-600' : 'border-emerald-200 hover:border-emerald-500'}`}
                        >
                          {selectedRegistryIds.length > 0 && <Check size={14} className="text-white" strokeWidth={4} />}
                        </button>
                      </th>
                      <th className="px-4 py-4 text-left">Product / Category</th>
                      <th className="px-4 py-4 text-left">
                        <div className="flex flex-col">
                          <span className="text-[11px] font-black text-gray-900 uppercase tracking-widest">Identity & Source</span>
                          <span className="text-[7px] font-black text-gray-400 uppercase tracking-widest leading-none">Barcode • ID • Origin</span>
                        </div>
                      </th>
                      <th className="px-4 py-4 text-center">MRP</th>
                      <th className="px-4 py-4 text-center">Selling</th>
                      <th className="px-4 py-4 text-center">Available</th>
                      <th className="px-4 py-4 text-center w-32">Sync Qty</th>
                    </tr>
                  </thead>
                  <tbody>
                    {registryItems
                      .filter(item =>
                        item.name.toLowerCase().includes(registrySearch.toLowerCase()) ||
                        (item.barcode && item.barcode.includes(registrySearch))
                      )
                      .map(item => {
                        const isSelected = selectedRegistryIds.includes(item.id);
                        return (
                          <tr
                            key={item.id}
                            onClick={() => {
                              setSelectedRegistryIds(prev =>
                                isSelected ? prev.filter(id => id !== item.id) : [...prev, item.id]
                              );
                            }}
                            className={`group cursor-pointer transition-all ${isSelected ? 'bg-emerald-50/50' : 'hover:bg-gray-50'}`}
                          >
                            <td className="px-6 py-4 rounded-l-[1.5rem] border-y border-l border-gray-100 group-hover:border-emerald-100 transition-colors">
                              <div className={`w-5 h-5 rounded-md border-2 flex items-center justify-center transition-all ${isSelected ? 'bg-emerald-600 border-emerald-600' : 'border-gray-200'}`}>
                                {isSelected && <Check size={14} className="text-white" strokeWidth={4} />}
                              </div>
                            </td>
                            <td className="px-4 py-4 border-y border-gray-100 group-hover:border-emerald-100">
                              <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-xl bg-gray-50 border border-gray-100 overflow-hidden shrink-0">
                                  {item.image ? (
                                    <img src={item.image} className="w-full h-full object-cover" />
                                  ) : (
                                    <div className="w-full h-full flex items-center justify-center text-gray-300">
                                      <Package size={18} />
                                    </div>
                                  )}
                                </div>
                                <div className="flex flex-col min-w-0">
                                  <span className="text-[11px] font-black text-gray-900 uppercase tracking-tight truncate leading-tight mb-0.5">{item.name}</span>
                                  <span className="text-[8px] font-black text-gray-400 uppercase tracking-widest leading-none">{item.category?.name || 'Uncategorized'}</span>
                                </div>
                              </div>
                            </td>
                            <td className="px-4 py-4 border-y border-gray-100 group-hover:border-emerald-100">
                              <div className="flex flex-col gap-2">
                                {/* Store Badge */}
                                <div className="flex items-center gap-1.5">
                                  <div className="w-4 h-4 rounded-md bg-emerald-50 flex items-center justify-center border border-emerald-100">
                                    <Building2 size={10} className="text-emerald-600" />
                                  </div>
                                  <span className="text-[9px] font-black text-emerald-700 uppercase tracking-widest bg-emerald-50/50 px-2 py-0.5 rounded-full border border-emerald-100/50">
                                    {item.storeName || 'Global Registry'}
                                  </span>
                                </div>
                                
                                {/* Barcode & ID */}
                                <div className="flex flex-col">
                                  <div className="flex items-center gap-1.5 text-gray-400">
                                    <Barcode size={12} className="opacity-50" />
                                    <span className="text-[10px] font-bold text-gray-600 tracking-tight">{item.barcode || 'NO-BARCODE'}</span>
                                  </div>
                                  <div className="ml-[18px]">
                                    <span className="text-[8px] font-black text-gray-300 uppercase tracking-widest leading-none">ID: {item.displayId || 'NEW'}</span>
                                  </div>
                                </div>
                              </div>
                            </td>
                            <td className="px-4 py-4 border-y border-gray-100 group-hover:border-emerald-100 text-center">
                              <span className="text-[11px] font-black text-gray-400 line-through">₹{item.mrp || 0}</span>
                            </td>
                            <td className="px-4 py-4 border-y border-gray-100 group-hover:border-emerald-100 text-center">
                              <span className="text-[12px] font-black text-emerald-600">₹{item.price || 0}</span>
                            </td>
                            <td className="px-4 py-4 border-y border-gray-100 group-hover:border-emerald-100 text-center">
                              <div className="flex flex-col items-center">
                                <span className={`text-[11px] font-black ${item.stock > 0 ? 'text-gray-900' : 'text-rose-500'}`}>{item.stock || 0}</span>
                                <span className="text-[8px] font-black text-gray-400 uppercase tracking-widest">Source</span>
                              </div>
                            </td>
                            <td className="px-4 py-4 border-y border-r border-gray-100 rounded-r-[1.5rem] group-hover:border-emerald-100 text-center" onClick={(e) => e.stopPropagation()}>
                              <div className={`flex items-center gap-2 bg-white border-2 rounded-xl p-1 transition-all ${isSelected ? ( (registryQuantities[item.id] || 0) > (item.stock || 0) ? 'border-rose-500 ring-4 ring-rose-500/10' : 'border-emerald-500 ring-4 ring-emerald-500/10' ) : 'border-gray-100 group-hover:border-emerald-200'}`}>
                                <input
                                  type="number"
                                  min="0"
                                  max={item.stock}
                                  value={registryQuantities[item.id] || ''}
                                  onChange={(e) => {
                                    const val = parseInt(e.target.value) || 0;
                                    setRegistryQuantities(prev => ({ ...prev, [item.id]: val }));
                                    if (val > 0 && !isSelected) {
                                      setSelectedRegistryIds(prev => [...prev, item.id]);
                                    }
                                  }}
                                  placeholder="0"
                                  className="w-full bg-transparent border-none text-center text-[11px] font-black focus:outline-none [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                                />
                              </div>
                            </td>
                          </tr>
                        );
                      })
                    }
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Sticky Footer for Registry - TRULY FIXED TO VIEWPORT */}
          <div className={`fixed bottom-10 left-1/2 -translate-x-1/2 w-full max-w-sm px-6 z-[200] transition-all duration-500 ${selectedRegistryIds.length > 0 ? 'translate-y-0 opacity-100 scale-100' : 'translate-y-20 opacity-0 scale-95 pointer-events-none'}`}>
            <div className="bg-white/90 backdrop-blur-2xl p-1.5 rounded-[2rem] border-4 border-white shadow-[0_20px_50px_-12px_rgba(16,185,129,0.4)]">
              <button
                onClick={handleBulkImport}
                disabled={isUploading || hasInvalidRegistryQuantities}
                className="w-full bg-emerald-600 text-white py-3 rounded-[1.5rem] shadow-md hover:bg-emerald-700 transition-all flex items-center justify-center gap-3 font-black text-[10px] uppercase tracking-[0.2em] group relative overflow-hidden disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <div className="absolute inset-0 bg-gradient-to-r from-emerald-600 via-emerald-400 to-emerald-600 opacity-0 group-hover:opacity-10 transition-opacity" />
                {isUploading ? (
                  <Loader2 size={18} className="animate-spin" />
                ) : (
                  <>
                    <div className="w-8 h-8 bg-white/20 rounded-xl flex items-center justify-center group-hover:scale-110 transition-transform">
                      <CheckCircle2 size={16} />
                    </div>
                    <div className="flex flex-col items-start text-left leading-tight">
                      <span className="opacity-70 font-bold tracking-widest text-[8px]">READY TO SYNC</span>
                      <span className="tracking-normal font-black">Import {selectedRegistryIds.length} Items</span>
                    </div>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      );
    }

    return (
      <MasterSection
        masterSearch={masterSearch}
        setMasterSearch={setMasterSearch}
        setScannerTarget={setScannerTarget}
        setShowScanner={setShowScanner}
        masterFreeOnly={masterFreeOnly}
        setMasterFreeOnly={setMasterFreeOnly}
        showFilters={showFilters}
        setShowFilters={setShowFilters}
        selectedItems={selectedItems}
        handleBulkDelete={handleBulkDelete}
        isUploading={isUploading}
        masterCategory={masterCategory}
        setMasterCategory={setMasterCategory}
        setMasterSubCategory={setMasterSubCategory}
        categories={categories}
        masterSubCategory={masterSubCategory}
        subCategories={subCategories}
        masterStatus={masterStatus}
        setMasterStatus={setMasterStatus}
        filteredItems={filteredItems}
        paginatedItems={paginatedItems}
        toggleSelectItem={toggleSelectItem}
        handleToggleStatus={handleToggleStatus}
        openEditModal={openEditModal}
        handleDeleteItem={handleDeleteItem}
        deletingId={deletingId}
        can={can}
        currentPage={currentPage}
        setCurrentPage={setCurrentPage}
        itemsPerPage={itemsPerPage}
        totalPages={totalPages}
        handleSelectAll={handleSelectAll}
      />
    );
  };

  const renderLoading = () => (
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
    />
  );


  const renderReturn = () => (
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
    />
  );


  const renderInventory = () => (
    <StoreStockSection
      loadingInventory={loadingInventory}
      warehouseStock={warehouseStock}
      warehouseSearch={warehouseSearch}
      setWarehouseSearch={setWarehouseSearch}
      warehouseCategory={warehouseCategory}
      setWarehouseCategory={setWarehouseCategory}
      categories={categories}
      can={can}
    />
  );


  const renderTracking = () => (
    <VehicleStockSection
      loadingVehicles={loadingVehicles}
      loadingTracking={loadingTracking}
      viewingVehicleId={viewingVehicleId}
      setViewingVehicleId={setViewingVehicleId}
      vehicles={vehicles}
      allVehiclesStock={allVehiclesStock}
      vehicleSearch={vehicleSearch}
      setVehicleSearch={setVehicleSearch}
      setScannerTarget={setScannerTarget}
      setShowScanner={setShowScanner}
      isAuditMode={isAuditMode}
      setIsAuditMode={setIsAuditMode}
      auditQuantities={auditQuantities}
      setAuditQuantities={setAuditQuantities}
      handleAuditSave={handleAuditSave}
      isSubmitting={isSubmitting}
      auditRemark={auditRemark}
      setAuditRemark={setAuditRemark}
      auditHistory={auditHistory}
      setSubTab={setSubTab}
      units={units}
      can={can}
    />
  );

  const renderOpeningStock = () => (
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

  const renderAuditHistory = () => (
    <AuditsSection
      selectedAuditId={selectedAuditId}
      setSelectedAuditId={setSelectedAuditId}
      auditHistory={auditHistory}
      loadingAudit={loadingAudit}
      auditSearch={auditSearch}
      setAuditSearch={setAuditSearch}
      fetchData={fetchData}
      loading={loading}
    />
  );

  const toggleRefillItemSelection = (itemId) => {
    setUnselectedRefillItems(prev =>
      prev.includes(itemId) ? prev.filter(id => id !== itemId) : [...prev, itemId]
    );
  };

  const handleApproveRefill = async (id, allItems) => {
    try {
      setIsSubmitting(true);
      const approvedItemIds = allItems.filter(i => !unselectedRefillItems.includes(i.id)).map(i => i.id);

      if (approvedItemIds.length === 0) {
        toast.error('Please select at least one item to approve, or reject the entire session.');
        setIsSubmitting(false);
        return;
      }

      await adminAPI.approveRefillRequest(id, {
        approvedItemIds,
        quantities: editedQuantities,
        remarks: itemRemarks
      });
      toast.success('Refill approved and stock loaded successfully');
      setUnselectedRefillItems([]); // reset
      setEditedQuantities({});
      setItemRemarks({});
      loadRefillRequests();
    } catch (error) {
      console.error('Approve Error:', error);
      const msg = error.response?.data?.message || 'Failed to approve refill';
      toast.error(msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleApproveSingleItem = async (reqId, itemId) => {
    try {
      setProcessingItems(prev => new Set(prev).add(itemId));
      await adminAPI.approveRefillRequest(reqId, {
        approvedItemIds: [itemId],
        quantities: editedQuantities,
        remarks: itemRemarks
      });
      toast.success('Product approved successfully');
      loadRefillRequests();
    } catch (error) {
      toast.error('Failed to approve product');
    } finally {
      setProcessingItems(prev => {
        const next = new Set(prev);
        next.delete(itemId);
        return next;
      });
    }
  };

  const handleRejectSingleItem = async (reqId, itemId) => {
    try {
      setProcessingItems(prev => new Set(prev).add(itemId));
      await adminAPI.rejectRefillRequest(reqId, { rejectedItemIds: [itemId] });
      toast.success('Product request rejected');
      loadRefillRequests();
    } catch (error) {
      toast.error('Failed to reject product');
    } finally {
      setProcessingItems(prev => {
        const next = new Set(prev);
        next.delete(itemId);
        return next;
      });
    }
  };

  const handleRejectRefill = async (id) => {
    try {
      setIsSubmitting(true);
      await adminAPI.rejectRefillRequest(id);
      toast.success('Refill request rejected');
      loadRefillRequests();
    } catch (error) {
      console.error('Reject Error:', error);
      const msg = error.response?.data?.message || 'Failed to reject refill';
      toast.error(msg);
    } finally {
      setIsSubmitting(false);
    }
  };


  const renderRefills = () => (
    <RefillsSection
      activeRefillGroup={activeRefillGroup}
      setViewingAgentId={setViewingAgentId}
      items={items}
      allVehiclesStock={allVehiclesStock}
      unselectedRefillItems={unselectedRefillItems}
      toggleRefillItemSelection={toggleRefillItemSelection}
      editedQuantities={editedQuantities}
      setEditedQuantities={setEditedQuantities}
      handleRejectSingleItem={handleRejectSingleItem}
      handleApproveSingleItem={handleApproveSingleItem}
      processingItems={processingItems}
      handleRejectRefill={handleRejectRefill}
      handleApproveRefill={handleApproveRefill}
      isSubmitting={isSubmitting}
      loadingRefills={loadingRefills}
      groupedRefills={groupedRefills}
      auditSearch={auditSearch}
      can={can}
    />
  );

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
        <Loader2 className="animate-spin text-emerald-600" size={40} />
        <p className="text-gray-500 font-medium tracking-wide">Loading Inventory...</p>
      </div>
    );
  }

  const renderCreateItemView = () => (
    <CreateItemView
      setIsCreateView={setIsCreateView}
      modalTab={modalTab}
      setModalTab={setModalTab}
      newItem={newItem}
      setNewItem={setNewItem}
      categories={categories}
      subCategories={subCategories}
      units={units}
      setScannerTarget={setScannerTarget}
      setShowScanner={setShowScanner}
      generateBarcode={generateBarcode}
      taxRates={taxRates}
      calculateFinalPrice={calculateFinalPrice}
      previewUrl={previewUrl}
      handleFileChange={handleFileChange}
      handleCreateItem={handleCreateItem}
      isSubmitting={isSubmitting}
    />
  );



  const renderEditItemView = () => (
    <EditItemView
      editItem={editItem}
      setIsEditView={setIsEditView}
      setEditItem={setEditItem}
      modalTab={modalTab}
      setModalTab={setModalTab}
      categories={categories}
      subCategories={subCategories}
      units={units}
      setScannerTarget={setScannerTarget}
      setShowScanner={setShowScanner}
      generateBarcode={generateBarcode}
      calculateFinalPrice={calculateFinalPrice}
      previewUrl={previewUrl}
      handleFileChange={handleFileChange}
      handleUpdateItem={handleUpdateItem}
      isSubmitting={isSubmitting}
      taxRates={taxRates}
    />
  );
  const renderClassifiedInventory = () => {
    if (storeFilterId || activeTab === 'main_master' || !isGlobalRole || stores.length <= 1) return null;

    const salesByStore = sales.reduce((acc, s) => {
      if (s.storeId) {
        acc[s.storeId] = (acc[s.storeId] || 0) + (s.totalAmount || 0);
      }
      return acc;
    }, {});

    const ordersByStore = sales.reduce((acc, s) => {
      if (s.storeId) {
        acc[s.storeId] = (acc[s.storeId] || 0) + 1;
      }
      return acc;
    }, {});

    const personnelByStore = users.reduce((acc, u) => {
      if (u.storeId && u.id !== currentUser?.id) {
        acc[u.storeId] = (acc[u.storeId] || 0) + 1;
      }
      return acc;
    }, {});

    return (
      <div className="space-y-8 animate-in fade-in duration-500 max-w-6xl mx-auto px-4 py-8">
        <div className="flex flex-col gap-1">
          <h2 className="text-3xl font-black text-gray-900 tracking-tight">Organization Inventory</h2>
          <p className="text-sm font-medium text-gray-500 uppercase tracking-widest italic">Global Stock Distribution & Branch Oversight</p>
        </div>

        <div className="grid grid-cols-1 gap-4 max-w-5xl">
          {stores.map(store => {
            const totalRevenue = salesByStore[store.id] || 0;
            const totalOrders = ordersByStore[store.id] || 0;
            const personnelCount = personnelByStore[store.id] || 0;

            return (
              <div 
                key={store.id}
                onClick={() => {
                  const params = { storeId: store.id, tab: activeTab };
                  if (subTab) params.sub = subTab;
                  setSearchParams(params);
                }}
                className="group bg-white p-8 rounded-[2.5rem] border border-gray-100 shadow-sm hover:shadow-2xl hover:shadow-emerald-500/10 hover:border-emerald-100 transition-all cursor-pointer relative overflow-hidden"
              >
                <div className="absolute top-0 right-0 p-6 opacity-[0.03] group-hover:opacity-[0.08] transition-opacity">
                  <Package size={120} />
                </div>

                <div className="relative z-10 flex items-center justify-between gap-8">
                  <div className="flex items-center gap-6">
                    <div className="w-16 h-16 rounded-3xl bg-emerald-50 text-emerald-600 flex items-center justify-center group-hover:bg-emerald-600 group-hover:text-white transition-all duration-500 shrink-0">
                      <Building2 size={32} strokeWidth={2.5} />
                    </div>
                    <div className="flex flex-col">
                      <h3 className="text-xl font-black text-gray-900 tracking-tight group-hover:text-emerald-600 transition-colors">{store.name}</h3>
                      <div className="flex items-center gap-2 mt-1">
                        <span className="text-[10px] font-black px-2.5 py-0.5 bg-emerald-50 text-emerald-600 rounded-md uppercase tracking-widest">
                          {store.code || 'BRANCH'}
                        </span>
                        <span className="text-xs font-bold text-gray-400 uppercase tracking-tighter flex items-center gap-1.5">
                          • <Package size={12} /> {store.address || 'Location Unspecified'}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-12">
                    <div className="hidden lg:flex flex-col items-end">
                      <span className="text-[10px] font-black uppercase text-gray-400 tracking-widest">Revenue & Sales</span>
                      <span className="text-sm font-bold text-gray-900 mt-1">₹{totalRevenue.toLocaleString()} <span className="text-[10px] text-gray-400 ml-1">({totalOrders} Orders)</span></span>
                    </div>
                    <div className="hidden md:flex flex-col items-end border-l border-gray-100 pl-12">
                      <span className="text-[10px] font-black uppercase text-gray-400 tracking-widest">Team size</span>
                      <span className="text-sm font-bold text-gray-900 mt-1">{personnelCount} Members</span>
                    </div>
                    <div className="w-12 h-12 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center opacity-40 group-hover:opacity-100 group-hover:bg-emerald-600 group-hover:text-white transition-all">
                      <ArrowRight size={24} strokeWidth={3} />
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  const classifiedView = renderClassifiedInventory();
  if (classifiedView) return classifiedView;

  return (
    <>
      {isCreateView && renderCreateItemView()}
      {isEditView && renderEditItemView()}
      {!isCreateView && !isEditView && (
    <div key={storeFilterId} className="space-y-6">
          <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
            <div className="flex flex-col gap-1">
              <div className="flex items-center gap-3">
                {storeFilterId && stores.length > 1 && (
                  <button
                    onClick={() => {
                      const params = { tab: activeTab };
                      if (subTab) params.sub = subTab;
                      setSearchParams(params);
                    }}
                    className="p-3 bg-white border border-gray-100 rounded-2xl text-gray-400 hover:text-emerald-600 hover:border-emerald-100 transition-all shadow-sm active:scale-90"
                    title="Back to Organizational Overview"
                  >
                    <ChevronLeft size={20} />
                  </button>
                )}
                <h2 className="text-2xl font-bold text-gray-900">
                  {(() => {
                    const selectedStore = stores.find(s => s.id === storeFilterId);
                    const storePrefix = selectedStore ? `${selectedStore.name} ` : '';
                    let label = 'Inventory Management';
                    if (activeTab === 'main_master') label = 'Main Master Registry';
                    else if (activeTab === 'master') label = 'Master';
                    else if (activeTab === 'inventory') label = 'Store Stock';
                    else if (activeTab === 'damage') label = 'Damage';
                    else if (activeTab === 'return') {
                      if (subTab === 'loading') label = 'Loading';
                      else if (subTab === 'return') label = 'Return';
                      else if (subTab === 'tracking') label = 'Vehicle Stock';
                      else if (subTab === 'refills') label = 'Refills';
                      else if (subTab === 'audits') label = 'Audit History';
                      else if (subTab === 'opening') label = 'Opening Stock';
                    }
                    return activeTab === 'main_master' ? label : `${storePrefix}${label}`;
                  })()}
                </h2>
              </div>
              <div className="flex items-center gap-2">
                {activeTab === 'inventory' ? (
                  <div className="flex items-center gap-3 w-full">
                    <div className="flex-1 min-w-[350px] md:min-w-[500px] flex items-center gap-2 bg-white px-3 py-1.5 rounded-xl border border-gray-100 shadow-sm transition-all focus-within:ring-2 focus-within:ring-emerald-500/20">
                      <Search size={14} className="text-gray-400" />
                      <input
                        type="text"
                        placeholder="Search stock by name or barcode..."
                        value={warehouseSearch}
                        onChange={(e) => setWarehouseSearch(e.target.value)}
                        className="bg-transparent text-[10px] font-bold text-gray-700 focus:outline-none w-full"
                      />
                      <button
                        onClick={() => {
                          setScannerTarget('warehouse');
                          setShowScanner(true);
                        }}
                        className="p-1 rounded-lg hover:bg-gray-50 text-gray-400 hover:text-blue-600 transition-all"
                        title="Scan Barcode"
                      >
                        <Barcode size={14} />
                      </button>
                    </div>
                  </div>
                ) : (
                  <p className="text-sm text-gray-500">Track your items and vehicle stocks</p>
                )}
                {isGlobalRole && (
                  <>
                    <span className="text-gray-300">•</span>
                    <select
                      value={storeFilterId || ''}
                      onChange={(e) => {
                        if (e.target.value) {
                          setSearchParams({ storeId: e.target.value });
                        } else {
                          setSearchParams({});
                        }
                      }}
                      className="bg-emerald-50 text-emerald-700 text-[10px] font-black uppercase tracking-widest pl-2 pr-6 py-1 rounded-md border-none outline-none appearance-none focus:ring-1 focus:ring-emerald-500 cursor-pointer mt-0.5"
                      style={{
                        backgroundImage: `url("data:image/svg+xml,%3csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 20 20'%3e%3cpath stroke='%23047857' stroke-linecap='round' stroke-linejoin='round' stroke-width='2' d='M5.25 7.5L10 12.25L14.75 7.5'/%3e%3c/svg%3e")`,
                        backgroundPosition: 'right 0.25rem center',
                        backgroundRepeat: 'no-repeat',
                        backgroundSize: '1rem'
                      }}
                    >
                      <option value="">All Branches</option>
                      {stores.map(s => (
                        <option key={s.id} value={s.id}>{s.name}</option>
                      ))}
                    </select>
                  </>
                )}
              </div>
            </div>
            {activeTab === 'master' && (
              <div className="flex gap-2">
                <input
                  type="file"
                  id="excel-upload"
                  accept=".xlsx, .xls, .csv"
                  className="hidden"
                  onChange={handleExcelUpload}
                  disabled={isUploading}
                />
                <input
                  type="file"
                  id="zip-upload"
                  accept=".zip"
                  className="hidden"
                  onChange={handleZipUpload}
                  disabled={isUploading}
                />
                {can('INVENTORY', 'CREATE', 'MASTER') && (
                  <button
                    onClick={() => setShowBulkUploadModal(true)}
                    disabled={isUploading}
                    className="bg-emerald-50 text-emerald-600 p-3 rounded-xl border border-emerald-100 shadow-sm hover:bg-emerald-100 transition-colors flex items-center gap-2 font-bold text-sm"
                    title="Bulk Upload Excel"
                  >
                    {isUploading ? <Loader2 size={24} className="animate-spin" /> : <FileText size={24} />}
                    <span className="hidden md:block">Bulk Upload</span>
                  </button>
                )}
                {can('INVENTORY', 'CREATE', 'MASTER') && (
                  <button
                    onClick={() => setShowZipImportModal(true)}
                    disabled={isUploading}
                    className="bg-orange-50 text-orange-600 p-3 rounded-xl border border-orange-100 shadow-sm hover:bg-orange-100 transition-colors flex items-center gap-2 font-bold text-sm"
                    title="Import ZIP (Excel + Images)"
                  >
                    {isUploading ? <Loader2 size={24} className="animate-spin" /> : <Package size={24} />}
                    <span className="hidden md:block">Zip Import</span>
                  </button>
                )}
                {can('INVENTORY', 'CREATE', 'MASTER') && storeFilterId && !isRegistryView && (
                  <button
                    onClick={() => setIsRegistryView(true)}
                    className="bg-indigo-50 text-indigo-600 p-3 rounded-xl border border-indigo-100 shadow-sm hover:bg-indigo-100 transition-colors flex items-center gap-2 font-bold text-sm"
                    title="Import from Main Master"
                  >
                    <Grid size={24} />
                    <span className="hidden md:block text-[11px] uppercase tracking-widest font-black">Import</span>
                  </button>
                )}
                {can('INVENTORY', 'CREATE', 'MASTER') && (
                  <button
                    onClick={() => { setIsCreateView(true); setModalTab('info'); }}
                    className="bg-emerald-600 text-white p-3 rounded-xl shadow-lg hover:bg-emerald-700 transition-colors"
                    title="Add New Registry Item"
                  >
                    <Plus size={24} />
                  </button>
                )}
              </div>
            )}
          </div>

          {/* Main tab navigation removed for sidebar dropdown */}

          {/* Sub-tab navigation removed for sidebar dropdown */}

          {['master', 'main_master'].includes(activeTab) && renderMaster()}
          {activeTab === 'inventory' && renderInventory()}
          {activeTab === 'return' && (
            <>
              {/* Sub-tab Category Filter (Visible for relevant operational subtabs) */}
              {['loading', 'return'].includes(subTab) && (
                <div className="space-y-4 mb-8">
                  <div className="relative group">
                    <div className="flex items-center gap-2 overflow-x-auto pb-1 no-scrollbar scroll-smooth">
                      <button
                        onClick={() => {
                          if (subTab === 'loading') { setOpsCategory('ALL'); setOpsSubCategory('ALL'); }
                          else { setReturnCategory('ALL'); setReturnSubCategory('ALL'); }
                        }}
                        className={`whitespace-nowrap px-5 py-2.5 rounded-2xl text-[10px] uppercase tracking-widest font-black transition-all border ${(subTab === 'loading' ? opsCategory : returnCategory) === 'ALL'
                          ? 'bg-emerald-600 border-emerald-600 text-white shadow-lg shadow-emerald-500/20'
                          : 'bg-white border-gray-100 text-gray-400 hover:border-emerald-200 hover:text-emerald-600'
                          }`}
                      >
                        All Items
                      </button>
                      {categories.map((cat) => (
                        <button
                          key={`subcat-filter-${cat.id}`}
                          onClick={() => {
                            if (subTab === 'loading') { setOpsCategory(cat.name); setOpsSubCategory('ALL'); }
                            else { setReturnCategory(cat.name); setReturnSubCategory('ALL'); }
                          }}
                          className={`whitespace-nowrap px-5 py-2.5 rounded-2xl text-[10px] uppercase tracking-widest font-black transition-all border ${(subTab === 'loading' ? opsCategory : returnCategory) === cat.name
                            ? 'bg-emerald-600 border-emerald-600 text-white shadow-lg shadow-emerald-500/20'
                            : 'bg-white border-gray-100 text-gray-400 hover:border-emerald-200 hover:text-emerald-600'
                            }`}
                        >
                          {cat.name}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Hierarchical Sub-Category Filter */}
                  {(subTab === 'loading' ? opsCategory : returnCategory) !== 'ALL' && (
                    <div className="animate-in slide-in-from-top-1 duration-200">
                      <div className="flex items-center gap-2 overflow-x-auto pb-1 no-scrollbar scroll-smooth">
                        <button
                          onClick={() => {
                            if (subTab === 'loading') setOpsSubCategory('ALL');
                            else setReturnSubCategory('ALL');
                          }}
                          className={`whitespace-nowrap px-4 py-2 rounded-xl text-[9px] uppercase tracking-widest font-black transition-all border ${(subTab === 'loading' ? opsSubCategory : returnSubCategory) === 'ALL'
                            ? 'bg-emerald-500 border-emerald-500 text-white shadow-md'
                            : 'bg-white border-gray-100 text-gray-400 hover:border-emerald-200'
                            }`}
                        >
                          All {subTab === 'loading' ? opsCategory : returnCategory}
                        </button>
                        {subCategories
                          .filter(sub => {
                            const parentCat = categories.find(c => c.name === (subTab === 'loading' ? opsCategory : returnCategory));
                            return sub.categoryId === parentCat?.id;
                          })
                          .map((sub) => (
                            <button
                              key={`subtab-subcat-${sub.id}`}
                              onClick={() => {
                                if (subTab === 'loading') setOpsSubCategory(sub.name);
                                else setReturnSubCategory(sub.name);
                              }}
                              className={`whitespace-nowrap px-4 py-2 rounded-xl text-[9px] uppercase tracking-widest font-black transition-all border ${(subTab === 'loading' ? opsSubCategory : returnSubCategory) === sub.name
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
                </div>
              )}

              {subTab === 'loading' && renderLoading()}
              {subTab === 'return' && renderReturn()}
              {subTab === 'tracking' && renderTracking()}
              {subTab === 'refills' && renderRefills()}
              {subTab === 'audits' && renderAuditHistory()}
              {subTab === 'opening' && renderOpeningStock()}
            </>
          )}

          {activeTab === 'damage' && (
            <div className="bg-white rounded-[2rem] border border-gray-100 p-12 text-center shadow-sm">
              <AlertCircle size={64} className="mx-auto text-red-500 mb-6" />
              <h3 className="text-2xl font-black text-gray-900 mb-2">Redirecting to Damage Management</h3>
              <p className="text-gray-500 mb-8 max-w-md mx-auto">You will be redirected to the specialized Damage & Deductions module for this branch.</p>
              <button
                onClick={() => navigate(`/admin/damage?storeId=${storeFilterId}`)}
                className="px-8 py-3 bg-red-600 text-white rounded-xl font-black uppercase tracking-widest shadow-lg shadow-red-500/20 hover:bg-red-700 transition-all"
              >
                Go to Damage Management
              </button>
            </div>
          )}

          {/* Bulk Upload Modal */}
          {showBulkUploadModal && (
            <div className="fixed inset-0 z-50 flex items-end md:items-center justify-center bg-black/50 backdrop-blur-sm p-4">
              <div className="bg-white w-full max-w-sm rounded-[2rem] p-6 shadow-2xl animate-in slide-in-from-bottom duration-300">
                <div className="flex items-center justify-between mb-6">
                  <h3 className="text-xl font-bold text-gray-900 flex items-center gap-2">
                    <FileText className="text-emerald-500" />
                    Bulk Upload
                  </h3>
                  <button
                    onClick={() => setShowBulkUploadModal(false)}
                    className="p-1 hover:bg-gray-100 rounded-full text-gray-400"
                  >
                    <X size={18} />
                  </button>
                </div>

                <div className="space-y-4">
                  <div
                    onClick={() => document.getElementById('excel-upload').click()}
                    className="w-full border-2 border-dashed border-emerald-200 bg-emerald-50/50 hover:bg-emerald-50 rounded-[1.5rem] p-6 flex flex-col items-center justify-center cursor-pointer transition-colors group"
                    style={{ pointerEvents: isUploading ? 'none' : 'auto' }}
                  >
                    <div className="w-14 h-14 bg-white rounded-2xl shadow-sm flex items-center justify-center mb-3 text-emerald-600 group-hover:scale-110 transition-transform">
                      {isUploading ? <Loader2 size={24} className="animate-spin" /> : <ArrowUpCircle size={28} />}
                    </div>
                    <span className="font-bold text-emerald-800 text-sm">Upload Excel File</span>
                    <span className="text-xs text-emerald-600/70 mt-1 font-medium select-none">Click to browse your files</span>
                  </div>

                  <div className="relative flex items-center py-2">
                    <div className="flex-grow border-t border-gray-100"></div>
                    <span className="flex-shrink-0 mx-4 text-[10px] font-black text-gray-300 uppercase tracking-widest">Or</span>
                    <div className="flex-grow border-t border-gray-100"></div>
                  </div>

                  <button
                    onClick={handleDownloadSample}
                    className="w-full bg-gray-50 hover:bg-gray-100 text-gray-700 font-bold py-4 rounded-[1.5rem] flex items-center justify-center gap-2 transition-colors border border-gray-200 text-sm"
                  >
                    <ArrowDownCircle size={18} className="text-gray-500" />
                    Download Sample Excel
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Zip Import Modal */}
          {showZipImportModal && (
            <div className="fixed inset-0 z-50 flex items-end md:items-center justify-center bg-black/50 backdrop-blur-sm p-4">
              <div className="bg-white w-full max-w-sm rounded-[2rem] p-6 shadow-2xl animate-in slide-in-from-bottom duration-300">
                <div className="flex items-center justify-between mb-6">
                  <h3 className="text-xl font-bold text-gray-900 flex items-center gap-2">
                    <Package className="text-orange-500" />
                    ZIP Import
                  </h3>
                  <button
                    onClick={() => setShowZipImportModal(false)}
                    className="p-1 hover:bg-gray-100 rounded-full text-gray-400"
                  >
                    <X size={18} />
                  </button>
                </div>

                <div className="space-y-4">
                  <div
                    onClick={() => document.getElementById('zip-upload').click()}
                    className="w-full border-2 border-dashed border-orange-200 bg-orange-50/50 hover:bg-orange-50 rounded-[1.5rem] p-6 flex flex-col items-center justify-center cursor-pointer transition-colors group"
                    style={{ pointerEvents: isUploading ? 'none' : 'auto' }}
                  >
                    <div className="w-14 h-14 bg-white rounded-2xl shadow-sm flex items-center justify-center mb-3 text-orange-600 group-hover:scale-110 transition-transform">
                      {isUploading ? <Loader2 size={24} className="animate-spin" /> : <ArrowUpCircle size={28} />}
                    </div>
                    <span className="font-bold text-orange-800 text-sm">Upload ZIP File</span>
                    <span className="text-xs text-orange-600/70 mt-1 font-medium select-none text-center">Contains Excel + Images Folder</span>
                  </div>

                  <div className="relative flex items-center py-2">
                    <div className="flex-grow border-t border-gray-100"></div>
                    <span className="flex-shrink-0 mx-4 text-[10px] font-black text-gray-300 uppercase tracking-widest">Or</span>
                    <div className="flex-grow border-t border-gray-100"></div>
                  </div>

                  <button
                    onClick={handleDownloadSample}
                    className="w-full bg-gray-50 hover:bg-gray-100 text-gray-700 font-bold py-4 rounded-[1.5rem] flex items-center justify-center gap-2 transition-colors border border-gray-200 text-sm"
                  >
                    <ArrowDownCircle size={18} className="text-gray-500" />
                    Download Zip Template
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Load Confirmation Modal */}
          {showLoadConfirmModal && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
              <div className="bg-white w-full max-w-lg rounded-3xl shadow-2xl animate-in fade-in duration-200 flex flex-col max-h-[85vh]">
                <div className="p-5 border-b border-gray-100 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-emerald-100 rounded-xl flex items-center justify-center text-emerald-600">
                      <ArrowUpCircle size={20} />
                    </div>
                    <div>
                      <h3 className="text-lg font-bold text-gray-900 tracking-tight leading-none">Confirm Loading</h3>
                      <span className="text-xs text-gray-500 font-medium">Please review before confirming</span>
                    </div>
                  </div>
                  <button
                    onClick={() => setShowLoadConfirmModal(false)}
                    className="p-2 bg-gray-50 rounded-full text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors"
                    disabled={isSubmitting}
                  >
                    <X size={18} />
                  </button>
                </div>

                <div className="p-5 overflow-y-auto space-y-3 bg-gray-50/50">
                  {pendingLoadItems.map((item, idx) => {
                    const totalValue = item.quantity * (item.price || 0);
                    return (
                      <div key={idx} className="bg-white p-3 rounded-2xl border border-gray-100 shadow-sm flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className={`w-9 h-9 rounded-xl flex items-center justify-center ${item.isFree ? 'bg-emerald-50 text-emerald-500' : 'bg-gray-50 text-gray-400'}`}>
                            <Package size={16} />
                          </div>
                          <div className="flex flex-col">
                            <span className="text-sm font-bold text-gray-800 leading-tight">{item.name}</span>
                            {item.unitValue && item.unitType && (
                              <span className="text-[9px] font-black text-gray-400 uppercase tracking-widest">{item.unitValue} {item.unitType}</span>
                            )}
                            {!item.isFree && <span className="text-[10px] text-gray-500 mt-0.5">Rate: ₹{item.price}</span>}
                            {item.isFree && <span className="text-[10px] font-bold text-emerald-500 mt-0.5">Free Item</span>}
                          </div>
                        </div>
                        <div className="flex flex-col items-end">
                          <span className="text-lg font-black text-emerald-600">{item.quantity}</span>
                          <span className="text-[9px] font-black text-gray-400 uppercase tracking-widest">Qty</span>
                          {!item.isFree && <span className="text-xs font-bold text-gray-600 mt-1 block">₹{totalValue.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>}
                        </div>
                      </div>
                    );
                  })}
                </div>

                <div className="p-5 border-t border-gray-100 bg-white rounded-b-3xl">
                  <div className="flex justify-between items-center mb-4 px-2">
                    <span className="text-sm font-bold text-gray-400 uppercase tracking-widest">Total Items: <span className="text-gray-900">{pendingLoadItems.length}</span></span>
                    <span className="text-sm font-bold text-gray-400 uppercase tracking-widest">Total Value: <span className="text-emerald-600">₹{pendingLoadItems.reduce((acc, item) => acc + (item.quantity * (item.price || 0)), 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span></span>
                  </div>
                  <div className="flex gap-3">
                    <button
                      onClick={() => setShowLoadConfirmModal(false)}
                      disabled={isSubmitting}
                      className="flex-1 py-3 px-4 rounded-xl font-bold text-gray-500 border border-gray-200 hover:bg-gray-50 transition-colors"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={handleConfirmLoad}
                      disabled={isSubmitting}
                      className="flex-[2] py-3 px-4 bg-emerald-600 text-white font-bold rounded-xl shadow-lg shadow-emerald-500/20 hover:bg-emerald-700 transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
                    >
                      {isSubmitting ? <Loader2 size={16} className="animate-spin" /> : 'Confirm Loading'}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      )}
      {showScanner && (
        <BarcodeScannerOverlay
          onScan={(code) => {
            if (scannerTarget === 'create') setNewItem(prev => ({ ...prev, barcode: code }));
            else if (scannerTarget === 'master') setMasterSearch(code);
            else if (scannerTarget === 'warehouse') setWarehouseSearch(code);
            else if (scannerTarget === 'ops') setOpsSearch(code);
            else if (scannerTarget === 'returnOps') setReturnSearch(code);
            else if (scannerTarget === 'opening') setOpeningSearch(code);
            else if (scannerTarget === 'tracking') setVehicleSearch(code);
            else setEditItem(prev => ({ ...prev, barcode: code }));
            toast.success("Barcode Scanned!");
            setShowScanner(false);
          }}
          onClose={() => setShowScanner(false)}
        />
      )}
    </>
  );
}



