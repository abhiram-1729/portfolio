import React, { useState, useEffect, useMemo } from 'react';
import { Plus, Minus, Package, Truck, ArrowDownCircle, ArrowUpCircle, Search, Filter, X, Loader2, Pencil, Trash2, Gift, FileText, CheckSquare, Square, ArrowLeft, Grid, Check, Barcode, RefreshCw, Camera, PlusCircle, CheckCircle2, AlertCircle, ClipboardList } from 'lucide-react';
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

  const storeFilterId = searchParams.get('storeId');
  const location = useLocation();
  const isTenantRoute = location.pathname.includes('/tenant/');
  const currentUser = useUserStore(s => s.user);
  const can = useUserStore(s => s.can);
  const [showScanner, setShowScanner] = useState(false);
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
    skuCode: ''
  });

  const fetchData = async () => {
    try {
      setLoadingMaster(true);
      setLoadingInventory(true);
      setLoadingRefills(true);
      setLoadingAudit(true);
      setLoadingVehicles(true);

      const [iRes, vRes, sRes, cRes, uRes, subRes, storeRes, aRes, stockRes] = await Promise.all([
        adminAPI.getItems({ storeId: storeFilterId }).finally(() => setLoadingMaster(false)),
        adminAPI.getVehicles({ storeId: storeFilterId }).finally(() => setLoadingVehicles(false)),
        adminAPI.getSettings(),
        adminAPI.getCategories(),
        adminAPI.getUnits(),
        adminAPI.getSubCategories(),
        adminAPI.getStores(),
        adminAPI.getAuditHistory({ storeId: storeFilterId }).finally(() => setLoadingAudit(false)),
        activeTab === 'inventory' ? procurementAPI.getStockReport({ storeId: storeFilterId }).finally(() => setLoadingInventory(false)) : Promise.resolve({ data: [] })
      ]);

      // Handle refills separately if it exists in another call or similar
      // For now we assume refills come from another source or are part of these responses
      setLoadingRefills(false);

      setItems(iRes.data);
      setVehicles(vRes.data);
      setAuditHistory(aRes.data || []);
      setCategories(cRes.data || []);
      setSubCategories(subRes.data || []);
      setUnits(uRes.data || []);
      setWarehouseStock(stockRes.data || []);
      if (sRes.data?.success && sRes.data?.data?.taxRates) {
        setTaxRates(sRes.data.data.taxRates.split(',').map(r => r.trim()));
      }
      if (storeRes.data?.success) {
        setStores(storeRes.data.data);
      }
    } catch (error) {
      toast.error('Failed to fetch inventory data');
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

  useEffect(() => {
    setCurrentPage(1);
  }, [masterSearch, warehouseSearch, auditSearch, masterCategory, masterSubCategory, masterStatus, masterFreeOnly, activeTab, subTab]);

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

  const loadAllVehiclesStock = async () => {
    if (vehicles.length === 0) return;
    try {
      // Fetch sequentially to prevent connection pool exhaustion (500 errors)
      const stockRes = [];
      for (const v of vehicles) {
        const res = await adminAPI.getVehicleInventory(v.id);
        stockRes.push({ id: v.id, data: res.data });
      }

      const stockMap = {};
      stockRes.forEach(r => {
        stockMap[r.id] = r.data;
      });
      setAllVehiclesStock(stockMap);
    } catch (err) {
      toast.error('Failed to load tracking data for all vehicles');
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
        barcode: ''
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
      barcode: item.barcode || ''
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

      // Enforce storeId isolation during update
      const currentStoreId = storeFilterId || currentUser.storeId;
      if (currentStoreId) {
        formData.append('storeId', currentStoreId);
      }

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
      toast.error('Failed to load stock');
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
      toast.error(`Failed to ${type === 'LOAD' ? 'load' : 'return'} stock`);
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
      await loadAllVehiclesStock(); // Refresh tracking data
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

  const renderMaster = () => (
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


  return (
    <>
      {isCreateView && renderCreateItemView()}
      {isEditView && renderEditItemView()}
      {!isCreateView && !isEditView && (
        <div className="space-y-6">
          <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
            <div className="flex flex-col gap-1">
              <h2 className="text-2xl font-bold text-gray-900">
                {activeTab === 'inventory' ? '' : 'Inventory Management'}
              </h2>
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
                {isTenantRoute && (
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

          {activeTab === 'master' && renderMaster()}
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



