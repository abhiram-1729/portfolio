import React, { useState, useEffect } from 'react';
import { Coins, Truck, Search, Calendar, CheckCircle2, AlertCircle, AlertTriangle, Clock, ArrowRight, Eye, Plus, Loader2, X, Pencil, Trash2, Sun, Moon, ArrowLeft, Building2, Camera, UploadCloud, User } from 'lucide-react';
import { useSearchParams, useNavigate, useLocation } from 'react-router-dom';
import StoreSelector from './StoreSelector';
import { useUserStore } from '../../store/userStore';
import { getAdminReconciliation, adminSubmitOpeningCash, adminUpdateReconciliation, adminDeleteReconciliation, adminReviewClosing, getStoreCashRegister, openStoreCashRegister, closeStoreCashRegister, createStoreDeposit, updateStoreCashRegister, updateStoreDeposit, deleteStoreDeposit, addBankDeposit } from '../../services/cashService';
import adminAPI from '../../services/adminService';
import { format } from 'date-fns';
import toast from 'react-hot-toast';

export default function AdminCashManagement() {
  const [activeTab, setActiveTab] = useState('reconciliation');
  const [date, setDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [summaries, setSummaries] = useState([]);
  const [vehicles, setVehicles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  const [searchParams, setSearchParams] = useSearchParams();
  const storeFilterId = searchParams.get('storeId');
  const location = useLocation();
  const user = useUserStore(s => s.user);
  const can = useUserStore(s => s.can);

  // Assignment Modal
  const [showAssignModal, setShowAssignModal] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [assignmentData, setAssignmentData] = useState({
    vehicleId: '',
    shift: 1,
    amount: 0,
    denominations: {
      "500": 0, "200": 0, "100": 0, "50": 0, "20": 0, "10": 0, "5": 0, "2": 0, "1": 0
    }
  });

  // Edit Reconciliation Modal
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingSummary, setEditingSummary] = useState(null);
  const [editData, setEditData] = useState({
    openingCash: 0,
    shift: 1,
    remark: '',
    denominations: {
      "500": 0, "200": 0, "100": 0, "50": 0, "20": 0, "10": 0, "5": 0, "2": 0, "1": 0
    }
  });

  // Delete Confirmation Modal
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deletingSummary, setDeletingSummary] = useState(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const [viewingSummary, setViewingSummary] = useState(null);

  // Review (Closing Edit) State
  const [isReviewEditing, setIsReviewEditing] = useState(null); // null, 1, or 2 (shift)
  const [reviewEditData, setReviewEditData] = useState({
    actualCash: 0,
    upiSales: 0,
    cardSales: 0,
    denominations: { "500": 0, "200": 0, "100": 0, "50": 0, "20": 0, "10": 0, "5": 0, "2": 0, "1": 0 },
    remark: ''
  });

  const [showUnapprovedWarning, setShowUnapprovedWarning] = useState(false);
  const [unapprovedInfo, setUnapprovedInfo] = useState({ count: 0, shift: 1 });

  const [showBankModal, setShowBankModal] = useState(false);
  const [bankData, setBankData] = useState({
    amount: 0,
    branchName: '',
    receiptImage: '',
    depositedBy: '',
    adminId: '',
    remark: ''
  });

  // Store Safe State
  const [storeRegisterData, setStoreRegisterData] = useState(null);
  const [showOpenStoreModal, setShowOpenStoreModal] = useState(false);
  const [showCloseStoreModal, setShowCloseStoreModal] = useState(false);
  const [storeDenomData, setStoreDenomData] = useState({
    amount: 0,
    denominations: { "500": 0, "200": 0, "100": 0, "50": 0, "20": 0, "10": 0, "5": 0, "2": 0, "1": 0 }
  });

  const [showDepositModal, setShowDepositModal] = useState(false);
  const [depositData, setDepositData] = useState({
    shift: 1,
    description: '',
    amount: 0,
    denominations: { "500": 0, "200": 0, "100": 0, "50": 0, "20": 0, "10": 0, "5": 0, "2": 0, "1": 0 }
  });

  // Edit Store Safe/Deposit States
  const [showEditStoreModal, setShowEditStoreModal] = useState(false);
  const [showEditDepositModal, setShowEditDepositModal] = useState(false);
  const [editingDeposit, setEditingDeposit] = useState(null);

  const denominationsList = [500, 200, 100, 50, 20, 10, 5, 2, 1];

  const handleDenominationChange = (value, denom, type = 'assign') => {
    const qty = Math.max(0, parseInt(value) || 0);
    if (type === 'assign') {
      const newDenoms = { ...assignmentData.denominations, [denom]: qty };
      const total = Object.entries(newDenoms).reduce((sum, [d, q]) => sum + (parseInt(d) * q), 0);
      setAssignmentData({ ...assignmentData, denominations: newDenoms, amount: total });
    } else if (type === 'edit') {
      const newDenoms = { ...editData.denominations, [denom]: qty };
      const total = Object.entries(newDenoms).reduce((sum, [d, q]) => sum + (parseInt(d) * q), 0);
      setEditData({ ...editData, denominations: newDenoms, openingCash: total });
    } else if (type === 'review') {
      const newDenoms = { ...reviewEditData.denominations, [denom]: qty };
      const total = Object.entries(newDenoms).reduce((sum, [d, q]) => sum + (parseInt(d) * q), 0);
      setReviewEditData({ ...reviewEditData, denominations: newDenoms, actualCash: total });
    } else if (type === 'store') {
      const newDenoms = { ...storeDenomData.denominations, [denom]: qty };
      const total = Object.entries(newDenoms).reduce((sum, [d, q]) => sum + (parseInt(d) * q), 0);
      setStoreDenomData({ ...storeDenomData, denominations: newDenoms, amount: total });
    } else if (type === 'deposit') {
      const newDenoms = { ...depositData.denominations, [denom]: qty };
      const total = Object.entries(newDenoms).reduce((sum, [d, q]) => sum + (parseInt(d) * q), 0);
      setDepositData({ ...depositData, denominations: newDenoms, amount: total });
    }
  };

  const isShiftDeposited = (shift) => {
    return storeRegisterData?.storeDeposits?.some(d => d.shift === shift);
  };

  const hasShiftCompletions = (shift) => {
    const shiftKey = `shift${shift}`;
    return summaries.some(s => s.shiftDetails?.[shiftKey]?.closing);
  };

  const fetchSummaries = async () => {
    setLoading(true);
    try {
      const data = await getAdminReconciliation(date);
      setSummaries(data);
    } catch (error) {
      toast.error('Failed to fetch cash summaries');
    } finally {
      setLoading(false);
    }
  };

  const fetchVehicles = async () => {
    try {
      const { data } = await adminAPI.getVehicles();
      setVehicles(data);
    } catch (error) {
      console.error('Error fetching vehicles:', error);
    }
  };

  const fetchStoreRegister = async () => {
    try {
      const data = await getStoreCashRegister(date);
      setStoreRegisterData(data);
    } catch (error) {
      setStoreRegisterData(null);
    }
  };

  useEffect(() => {
    fetchSummaries();
    fetchVehicles();
    fetchStoreRegister();
  }, [date]);

  const handleAssignFloat = async (e) => {
    e.preventDefault();
    if (!assignmentData.vehicleId) return toast.error('Select a vehicle');
    if (!assignmentData.isNoService && assignmentData.amount <= 0) {
      return toast.error('Enter valid denominations or mark as No Service');
    }

    const selectedVehicle = vehicles.find(v => v.id === assignmentData.vehicleId);
    const agent = selectedVehicle?.assignedUsers?.find(u => u.role === 'SALES_AGENT');
    if (!agent) {
      return toast.error('This vehicle has no Sales Agent assigned');
    }

    // Balance check
    const requestedAmount = assignmentData.isNoService ? 0 : assignmentData.amount;
    const availableSafeBalance = storeRegisterData?.liveMetrics?.liveExpected || 0;
    if (requestedAmount > availableSafeBalance) {
      return toast.error(`Insufficient safe balance! Available: ₹${availableSafeBalance.toFixed(2)}, Requested: ₹${requestedAmount.toFixed(2)}`);
    }

    setIsSubmitting(true);
    try {
      await adminSubmitOpeningCash({
        vehicleId: assignmentData.vehicleId,
        userId: agent.id,
        totalOpeningCash: assignmentData.isNoService ? 0 : assignmentData.amount,
        denominations: assignmentData.isNoService ? {} : assignmentData.denominations,
        shift: assignmentData.shift,
        isNoService: assignmentData.isNoService || false,
        date: date
      });

      const msg = assignmentData.isNoService
        ? `Shift ${assignmentData.shift} marked as No Service for ${selectedVehicle.vehicleNumber}`
        : `Shift ${assignmentData.shift} float assigned to ${selectedVehicle.vehicleNumber}`;

      toast.success(msg);
      setShowAssignModal(false);
      setAssignmentData({
        vehicleId: '',
        shift: 1,
        amount: 0,
        isNoService: false,
        denominations: { "500": 0, "200": 0, "100": 0, "50": 0, "20": 0, "10": 0, "5": 0, "2": 0, "1": 0 }
      });
      fetchSummaries();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to assign float');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleOpenStoreRegister = async () => {
    if (storeDenomData.amount <= 0) return toast.error('Enter valid denominations');
    setIsSubmitting(true);
    try {
      await openStoreCashRegister({
        date,
        openingCash: storeDenomData.amount,
        denominations: storeDenomData.denominations
      });
      toast.success('Store Cash Register opened successfully');
      setShowOpenStoreModal(false);
      setStoreDenomData({
        amount: 0,
        denominations: { "500": 0, "200": 0, "100": 0, "50": 0, "20": 0, "10": 0, "5": 0, "2": 0, "1": 0 }
      });
      fetchStoreRegister();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to open register');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCloseStoreRegister = async () => {
    if (storeDenomData.amount <= 0 && storeRegisterData?.liveMetrics?.liveExpected > 0) return toast.error('Enter valid denominations');
    setIsSubmitting(true);
    try {
      if (storeRegisterData?.storeRegister?.status === 'CLOSED') {
        // Just update existing closing if already closed
        await updateStoreCashRegister({
          date,
          actualClosingCash: storeDenomData.amount,
          denominations: storeDenomData.denominations,
          isClosingUpdate: true // hint for backend if needed
        });
      } else {
        await closeStoreCashRegister({
          date,
          actualClosingCash: storeDenomData.amount,
          denominations: storeDenomData.denominations
        });
      }
      toast.success(storeRegisterData?.storeRegister?.status === 'CLOSED' ? 'Store Closing Cash updated' : 'Store Cash Register closed successfully');
      setShowCloseStoreModal(false);
      setStoreDenomData({
        amount: 0,
        denominations: { "500": 0, "200": 0, "100": 0, "50": 0, "20": 0, "10": 0, "5": 0, "2": 0, "1": 0 }
      });
      fetchStoreRegister();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to process closing');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCreateDeposit = async (e, force = false) => {
    if (e) e.preventDefault();
    if (depositData.amount <= 0) return toast.error('Enter valid denominations');
    if (!depositData.description) return toast.error('Description is mandatory');

    // Hard block if no completions exist for this specific shift
    if (!hasShiftCompletions(depositData.shift)) {
      return toast.error(`Shift ${depositData.shift} cannot be deposited yet because no agents have submitted their closing reports for this shift.`);
    }

    // Check for unapproved collections in this shift
    const shiftKey = `shift${depositData.shift}`;
    const unapproved = summaries.filter(s => {
      const closing = s.shiftDetails?.[shiftKey]?.closing;
      return closing && closing.status !== 'APPROVED';
    });

    if (unapproved.length > 0 && !force) {
      setUnapprovedInfo({ count: unapproved.length, shift: depositData.shift });
      setShowUnapprovedWarning(true);
      return;
    }

    setIsSubmitting(true);
    try {
      await createStoreDeposit({
        date,
        shift: depositData.shift,
        amount: depositData.amount,
        denominations: depositData.denominations,
        description: depositData.description
      });
      toast.success(`Shift ${depositData.shift} cash deposited successfully`);
      setShowDepositModal(false);
      setDepositData({
        shift: 1,
        description: '',
        amount: 0,
        denominations: { "500": 0, "200": 0, "100": 0, "50": 0, "20": 0, "10": 0, "5": 0, "2": 0, "1": 0 }
      });
      fetchStoreRegister();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to create deposit');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCreateBankDeposit = async (e) => {
    if (e) e.preventDefault();
    if (bankData.amount <= 0) return toast.error('Enter valid amount');
    if (!bankData.branchName) return toast.error('Branch name is mandatory');
    if (bankData.amount > storeRegisterData.liveMetrics.liveAvailable) {
      return toast.error('Transfer amount exceeds currently available safe balance');
    }

    setIsSubmitting(true);
    try {
      await addBankDeposit({
        date,
        ...bankData
      });
      toast.success('Money transferred to bank successfully');
      setShowBankModal(false);
      setBankData({
        amount: 0,
        branchName: '',
        receiptImage: '',
        depositedBy: user?.name || '',
        adminId: user?.id,
        remark: ''
      });
      fetchStoreRegister();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to transfer money');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleUpdateStoreRegister = async () => {
    if (storeDenomData.amount <= 0) return toast.error('Enter valid denominations');
    setIsSubmitting(true);
    try {
      await updateStoreCashRegister({
        date,
        openingCash: storeDenomData.amount,
        denominations: storeDenomData.denominations
      });
      toast.success('Store Opening Cash updated successfully');
      setShowEditStoreModal(false);
      fetchStoreRegister();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to update opening cash');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleUpdateDeposit = async (e) => {
    e.preventDefault();
    if (depositData.amount <= 0) return toast.error('Enter valid denominations');
    if (!depositData.description) return toast.error('Description is mandatory');

    setIsSubmitting(true);
    try {
      await updateStoreDeposit(editingDeposit.id, {
        amount: depositData.amount,
        denominations: depositData.denominations,
        description: depositData.description
      });
      toast.success(`Shift ${depositData.shift} deposit updated successfully`);
      setShowEditDepositModal(false);
      setEditingDeposit(null);
      fetchStoreRegister();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to update deposit');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteDeposit = async (id) => {
    if (!window.confirm('Are you sure you want to delete this deposit? This will affect your safe balance.')) return;
    setIsSubmitting(true);
    try {
      await deleteStoreDeposit(id);
      toast.success('Deposit deleted successfully');
      fetchStoreRegister();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to delete deposit');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleOpenEdit = (summary) => {
    setEditingSummary(summary);
    const s1Opening = summary.shiftDetails?.shift1?.opening;
    setEditData({
      openingCash: s1Opening?.totalOpeningCash || 0,
      shift: 1,
      remark: s1Opening?.isNoService ? 'Removing No Service state' : 'Corrected by Admin',
      denominations: s1Opening?.denominations && Object.keys(s1Opening.denominations).length > 0
        ? s1Opening.denominations
        : { "500": 0, "200": 0, "100": 0, "50": 0, "20": 0, "10": 0, "5": 0, "2": 0, "1": 0 },
      isNoService: s1Opening?.isNoService || false
    });
    setShowEditModal(true);
  };

  const handleUpdateReconciliation = async (e) => {
    e.preventDefault();

    // Balance check for edit
    const shiftKey = `shift${editData.shift}`;
    const oldOpening = editingSummary.shiftDetails?.[shiftKey]?.opening?.totalOpeningCash || 0;
    const newOpening = editData.isNoService ? 0 : editData.openingCash;
    const difference = newOpening - oldOpening;
    const availableSafeBalance = storeRegisterData?.liveMetrics?.liveExpected || 0;

    if (difference > availableSafeBalance) {
      return toast.error(`Insufficient safe balance for this adjustment! You need ₹${difference.toFixed(2)} more, but safe only has ₹${availableSafeBalance.toFixed(2)}`);
    }

    setIsSubmitting(true);
    try {
      await adminUpdateReconciliation({
        vehicleId: editingSummary.vehicleId,
        date: editingSummary.date,
        openingCash: editData.isNoService ? 0 : editData.openingCash,
        denominations: editData.isNoService ? {} : editData.denominations,
        remark: editData.remark,
        shift: editData.shift,
        isNoService: editData.isNoService || false,
      });
      toast.success(`Shift ${editData.shift} opening cash updated`);
      setShowEditModal(false);
      fetchSummaries();
    } catch (error) {
      toast.error('Failed to update opening cash');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleConfirmDelete = async () => {
    setIsDeleting(true);
    try {
      await adminDeleteReconciliation(deletingSummary.vehicleId, deletingSummary.date);
      toast.success(`Records deleted for ${deletingSummary.vehicle.vehicleNumber}`);
      setShowDeleteModal(false);
      setDeletingSummary(null);
      fetchSummaries();
    } catch (error) {
      toast.error('Failed to delete records');
    } finally {
      setIsDeleting(false);
    }
  };

  const handleReviewClosing = async (vehicleId, date, shift, status, additionalData = {}) => {
    setIsSubmitting(true);
    try {
      await adminReviewClosing({
        vehicleId,
        date,
        shift,
        status,
        ...additionalData
      });
      toast.success(`Shift ${shift} closing ${status.toLowerCase()}`);
      fetchSummaries();
      setViewingSummary(null);
    } catch (error) {
      toast.error('Failed to review closing');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleOpenView = (summary) => {
    setViewingSummary(summary);
    setIsReviewEditing(null);
  };

  const filteredSummaries = summaries.filter(s => {
    if (storeFilterId && s.vehicle?.storeId !== storeFilterId) return false;
    const searchLower = searchTerm.toLowerCase();
    const agent = s.vehicle?.assignedUsers?.find(u => u.role === 'SALES_AGENT');
    return (
      s.vehicle?.vehicleNumber?.toLowerCase().includes(searchLower) ||
      s.vehicle?.vehicleName?.toLowerCase().includes(searchLower) ||
      agent?.name?.toLowerCase().includes(searchLower)
    );
  });

  // Helper: shift status badge
  const ShiftStatusBadge = ({ opening, closing }) => {
    if (closing) {
      if (closing.isNoService) return (
        <div className="flex items-center gap-1 text-rose-600">
          <AlertTriangle size={12} />
          <span className="text-[9px] font-black uppercase tracking-widest">No Service</span>
        </div>
      );

      if (closing.status === 'PENDING') return (
        <div className="flex items-center gap-1 text-orange-600">
          <Clock size={12} className="animate-pulse" />
          <span className="text-[9px] font-black uppercase tracking-widest">Pending Review</span>
        </div>
      );

      if (closing.status === 'REJECTED') return (
        <div className="flex items-center gap-1 text-rose-600">
          <X size={12} strokeWidth={3} />
          <span className="text-[9px] font-black uppercase tracking-widest">Rejected</span>
        </div>
      );

      const diff = closing.difference || 0;
      if (diff === 0) return (
        <div className="flex items-center gap-1 text-emerald-600">
          <CheckCircle2 size={12} />
          <span className="text-[9px] font-black uppercase tracking-widest">Matched</span>
        </div>
      );
      return (
        <div className="flex items-center gap-1 text-rose-600">
          <AlertCircle size={12} />
          <span className="text-[9px] font-black uppercase tracking-widest">
            {diff > 0 ? `+₹${diff.toFixed(2)}` : `-₹${Math.abs(diff).toFixed(2)}`}
          </span>
        </div>
      );
    }
    if (opening) return (
      <div className="flex items-center gap-1">
        <Clock size={12} className="text-orange-500" />
        <span className="text-[9px] font-black uppercase tracking-widest text-orange-600">Open</span>
      </div>
    );
    return <span className="text-[9px] font-black text-gray-300 uppercase tracking-widest">Not Assigned</span>;
  };

  // Shift selector component
  const ShiftSelector = ({ value, onChange, disabledShifts = [] }) => (
    <div className="flex gap-2">
      {[
        { id: 1, label: 'Shift 1', sub: 'Morning', icon: Sun, color: 'amber' },
        { id: 2, label: 'Shift 2', sub: 'Afternoon', icon: Moon, color: 'indigo' },
      ].map(s => {
        const isDisabled = disabledShifts.includes(s.id);
        return (
          <button
            key={s.id}
            type="button"
            disabled={isDisabled}
            onClick={() => onChange(s.id)}
            className={`flex-1 flex items-center gap-2 px-4 py-3 rounded-xl border-2 transition-all font-bold text-xs uppercase tracking-wider ${isDisabled ? 'border-gray-50 bg-gray-50 text-gray-300 cursor-not-allowed opacity-50' :
              value === s.id
                ? s.color === 'amber'
                  ? 'border-amber-400 bg-amber-50 text-amber-700'
                  : 'border-indigo-400 bg-indigo-50 text-indigo-700'
                : 'border-gray-100 bg-white text-gray-400 hover:border-gray-200'
              }`}
          >
            <s.icon size={16} />
            <div className="flex flex-col items-start text-left">
              <span className="text-[10px] font-black">{s.label}</span>
              <span className="text-[8px] font-bold opacity-60 truncate">
                {isDisabled ? 'Close S1 first' : s.sub}
              </span>
            </div>
          </button>
        );
      })}
    </div>
  );

  // Denomination display grid (for view modal)
  const DenominationGrid = ({ denominations, label }) => {
    if (!denominations || Object.keys(denominations).length === 0) return null;
    const nonZero = denominationsList.filter(d => denominations[d] > 0);
    if (nonZero.length === 0) return null;
    return (
      <div className="space-y-1.5">
        <span className="text-[9px] font-black text-gray-400 uppercase tracking-widest">{label}</span>
        <div className="grid grid-cols-3 gap-1.5">
          {nonZero.map(d => (
            <div key={d} className="bg-gray-50 rounded-lg p-2 text-center border border-gray-100">
              <span className="text-[9px] font-black text-gray-400 block">₹{d}</span>
              <span className="text-xs font-black text-gray-700">× {denominations[d]}</span>
              <span className="text-[8px] text-gray-400 block">= ₹{(d * denominations[d]).toLocaleString()}</span>
            </div>
          ))}
        </div>
      </div>
    );
  };

  // Gatekeeper integration
  const isGlobalRole = user?.role === 'TENANT_OWNER' || user?.role === 'SUPER_ADMIN';
  const isTenantRoute = location.pathname.includes('/tenant/');

  if (isGlobalRole && isTenantRoute && !storeFilterId) {
    return (
      <StoreSelector
        title="Cash Management"
        description="Please select a store branch to manage its assigned daily shifts and cash reconciliations."
        onSelect={(id) => {
          setSearchParams({ storeId: id });
        }}
      />
    );
  }

  if (viewingSummary) {
    const s1 = viewingSummary.shiftDetails?.shift1;
    const s2 = viewingSummary.shiftDetails?.shift2;

    return (
      <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-500">
        <div className="flex items-center gap-4">
          <button
            onClick={() => setViewingSummary(null)}
            className="p-2.5 bg-white border border-gray-100 rounded-2xl text-gray-400 hover:text-emerald-600 hover:border-emerald-100 shadow-sm transition-all hover:bg-emerald-50"
          >
            <ArrowLeft size={20} />
          </button>
          <div>
            <h2 className="text-2xl font-black text-gray-900 tracking-tight">Shift Breakdown</h2>
            <p className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em]">
              {viewingSummary.vehicle.vehicleNumber} • {viewingSummary.date}
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Shift 1 Card */}
          <div className="rounded-[2.5rem] border-2 border-amber-200 overflow-hidden shadow-xl shadow-amber-900/5">
            <div className="bg-amber-50 px-6 py-4 flex items-center justify-between border-b border-amber-100">
              <div className="flex items-center gap-3">
                <Sun size={18} className="text-amber-600" />
                <span className="text-xs font-black text-amber-700 uppercase tracking-[0.1em]">Shift 1 — Morning</span>
              </div>
              <ShiftStatusBadge opening={s1?.opening} closing={s1?.closing} />
            </div>
            <div className="p-6 space-y-6 bg-white">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Initial Float</span>
                <span className={`text-base font-black ${s1?.opening ? 'text-amber-700' : 'text-gray-300'}`}>
                  ₹{(s1?.opening?.totalOpeningCash || 0).toFixed(2)}
                </span>
              </div>
              <DenominationGrid denominations={s1?.opening?.denominations} label="Float Denominations" />

              {s1?.closing ? (
                <div className="space-y-6 animate-in fade-in duration-300">
                  {isReviewEditing === 1 ? (
                    <div className="bg-orange-50/50 p-5 rounded-[2rem] space-y-4 border border-orange-200 shadow-inner">
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] font-black text-orange-600 uppercase tracking-widest">Correction Mode</span>
                        <button onClick={() => setIsReviewEditing(null)} className="text-orange-400 hover:text-orange-600"><X size={16} /></button>
                      </div>
                      <div className="grid grid-cols-3 gap-2">
                        {denominationsList.map(denom => (
                          <div key={denom} className="flex flex-col gap-1 bg-white p-2.5 rounded-xl border border-orange-100 shadow-sm">
                            <span className="text-[8px] font-black text-gray-400">₹{denom}</span>
                            <input
                              type="number"
                              className="w-full text-xs font-black text-orange-700 bg-transparent border-none p-0 focus:ring-0"
                              value={reviewEditData.denominations[denom] || ''}
                              onChange={(e) => handleDenominationChange(e.target.value, denom, 'review')}
                              placeholder="0"
                            />
                          </div>
                        ))}
                      </div>
                      <div className="grid grid-cols-2 gap-3 pt-2">
                        <div className="bg-white p-3 rounded-xl border border-orange-100 shadow-sm">
                          <span className="text-[8px] font-black text-orange-500 uppercase block mb-0.5">Correct UPI</span>
                          <input
                            type="number"
                            className="w-full text-sm font-black text-orange-700 bg-transparent border-none p-0 focus:ring-0"
                            value={reviewEditData.upiSales}
                            onChange={(e) => setReviewEditData({ ...reviewEditData, upiSales: parseFloat(e.target.value) || 0 })}
                          />
                        </div>
                        <div className="bg-white p-3 rounded-xl border border-orange-100 shadow-sm">
                          <span className="text-[8px] font-black text-blue-500 uppercase block mb-0.5">Correct Card</span>
                          <input
                            type="number"
                            className="w-full text-sm font-black text-blue-700 bg-transparent border-none p-0 focus:ring-0"
                            value={reviewEditData.cardSales}
                            onChange={(e) => setReviewEditData({ ...reviewEditData, cardSales: parseFloat(e.target.value) || 0 })}
                          />
                        </div>
                      </div>
                      <div className="space-y-3 pt-3 border-t border-orange-200">
                        {(() => {
                          const originalExpected = s1?.closing?.expectedCash || 0;
                          const originalUpi = s1?.closing?.upiSales || 0;
                          const originalCard = s1?.closing?.cardSales || 0;
                          const liveExpected = originalExpected - ((reviewEditData.upiSales || 0) - originalUpi) - ((reviewEditData.cardSales || 0) - originalCard);
                          const liveDiff = reviewEditData.actualCash - liveExpected;
                          return (
                            <div className="flex items-center justify-between px-1 bg-white p-2 rounded-xl border border-orange-100 shadow-sm">
                              <div>
                                <span className="text-[9px] font-black text-gray-400 uppercase block">Expected: ₹{liveExpected.toFixed(2)}</span>
                                <span className="text-xs font-black text-orange-700 uppercase">Input: ₹{reviewEditData.actualCash.toFixed(2)}</span>
                              </div>
                              <div className={`px-2.5 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-tight ${Math.abs(liveDiff) <= 0.01 ? 'bg-emerald-50 text-emerald-600' : 'bg-rose-50 text-rose-600'}`}>
                                {Math.abs(liveDiff) <= 0.01 ? 'MATCHED ✓' : liveDiff > 0 ? `Extra: ₹${liveDiff.toFixed(2)}` : `Short: ₹${Math.abs(liveDiff).toFixed(2)}`}
                              </div>
                            </div>
                          );
                        })()}
                        <input
                          className="w-full bg-white border border-orange-100 p-3 text-sm rounded-xl outline-none focus:ring-2 focus:ring-orange-200"
                          placeholder="Admin reason for correction..."
                          value={reviewEditData.remark}
                          onChange={(e) => setReviewEditData({ ...reviewEditData, remark: e.target.value })}
                        />
                        <button
                          onClick={() => handleReviewClosing(viewingSummary.vehicleId, viewingSummary.date, 1, 'APPROVED', {
                            actualCash: reviewEditData.actualCash,
                            upiSales: reviewEditData.upiSales,
                            cardSales: reviewEditData.cardSales,
                            denominations: reviewEditData.denominations,
                            remark: reviewEditData.remark
                          })}
                          disabled={isSubmitting}
                          className="w-full bg-orange-600 text-white py-3.5 rounded-2xl text-[10px] font-black uppercase tracking-[0.2em] hover:bg-orange-700 transition-all flex items-center justify-center gap-2 shadow-lg shadow-orange-600/20"
                        >
                          {isSubmitting ? <Loader2 className="animate-spin" size={16} /> : 'Save Corrections & Approve'}
                        </button>
                      </div>
                    </div>
                  ) : (
                    <>
                      <div className="bg-gray-50/50 p-5 rounded-[2rem] border border-gray-100 space-y-3">
                        <div className="flex justify-between items-center">
                          <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Cash Sales</span>
                          <span className="text-sm font-black text-emerald-600">₹{(s1.closing.cashSales || 0).toFixed(2)}</span>
                        </div>
                        <div className="flex justify-between items-center">
                          <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">UPI Sales</span>
                          <span className="text-sm font-black text-orange-600">₹{(s1.closing.upiSales || 0).toFixed(2)}</span>
                        </div>
                        <div className="flex justify-between items-center">
                          <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Card Sales</span>
                          <span className="text-sm font-black text-blue-600">₹{(s1.closing.cardSales || 0).toFixed(2)}</span>
                        </div>
                        <div className="flex justify-between items-center">
                          <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Expenses</span>
                          <span className="text-sm font-black text-rose-500">-₹{(s1.closing.expenses || 0).toFixed(2)}</span>
                        </div>
                        <div className="pt-2 border-t border-gray-100 flex justify-between items-center">
                          <span className="text-[10px] font-black text-gray-600 uppercase tracking-widest">Submission</span>
                          <div className="flex flex-col items-end">
                            <span className="text-base font-black text-slate-900">₹{(s1.closing.actualCash || 0).toFixed(2)}</span>
                            <span className={`text-[9px] font-black px-2 py-0.5 rounded-full ${s1.closing.difference === 0 ? 'bg-emerald-50 text-emerald-600' : s1.closing.difference > 0 ? 'bg-blue-50 text-blue-600' : 'bg-rose-50 text-rose-600'}`}>
                              {s1.closing.difference === 0 ? 'MATCHED' : `${s1.closing.difference > 0 ? '+' : ''}₹${s1.closing.difference.toFixed(2)}`}
                            </span>
                          </div>
                        </div>
                      </div>
                      <DenominationGrid denominations={s1.closing.denominations} label="Submission Denominations" />

                      {s1.closing.remark && (
                        <div className="p-4 bg-amber-50 rounded-2xl border border-amber-100 italic font-medium text-xs text-amber-900">
                          <span className="text-[8px] font-black text-amber-500 uppercase block not-italic mb-1 tracking-widest">Agent Note</span>
                          "{s1.closing.remark}"
                        </div>
                      )}

                      <div className="flex gap-3 pt-2">
                        <button
                          onClick={() => {
                            setIsReviewEditing(1);
                            setReviewEditData({
                              actualCash: s1.closing.actualCash,
                              upiSales: s1.closing.upiSales,
                              cardSales: s1.closing.cardSales,
                              denominations: s1.closing.denominations,
                              remark: s1.closing.remark || ''
                            });
                          }}
                          className="flex-1 flex items-center justify-center gap-2 bg-white border border-gray-200 text-gray-700 text-[10px] font-black uppercase py-3.5 rounded-2xl hover:bg-gray-50 transition-all"
                        >
                          <Pencil size={12} /> Edit
                        </button>
                        {s1.closing.status === 'PENDING' && (
                          <>
                            <button
                              onClick={() => handleReviewClosing(viewingSummary.vehicleId, viewingSummary.date, 1, 'APPROVED')}
                              className="flex-[2] bg-emerald-600 text-white text-[10px] font-black uppercase py-3.5 rounded-2xl hover:bg-emerald-700 transition-shadow shadow-lg shadow-emerald-600/20"
                            >
                              Quick Approve
                            </button>
                            <button
                              onClick={() => handleReviewClosing(viewingSummary.vehicleId, viewingSummary.date, 1, 'REJECTED')}
                              className="flex-1 bg-rose-50 text-rose-600 text-[10px] font-black uppercase py-3.5 rounded-2xl hover:bg-rose-100 transition-colors"
                            >
                              Reject
                            </button>
                          </>
                        )}
                      </div>
                    </>
                  )}
                </div>
              ) : (
                <div className="p-8 text-center bg-gray-50/50 rounded-3xl border border-dashed border-gray-200">
                  <Clock size={24} className="mx-auto text-gray-300 mb-2" />
                  <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Closing Not Submitted</p>
                </div>
              )}
            </div>
          </div>

          {/* Shift 2 Card */}
          <div className="rounded-[2.5rem] border-2 border-indigo-200 overflow-hidden shadow-xl shadow-indigo-900/5">
            <div className="bg-indigo-50 px-6 py-4 flex items-center justify-between border-b border-indigo-100">
              <div className="flex items-center gap-3">
                <Moon size={18} className="text-indigo-600" />
                <span className="text-xs font-black text-indigo-700 uppercase tracking-[0.1em]">Shift 2 — Afternoon</span>
              </div>
              <ShiftStatusBadge opening={s2?.opening} closing={s2?.closing} />
            </div>
            <div className="p-6 space-y-6 bg-white">
              {s2?.opening ? (
                <>
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Initial Float</span>
                    <span className="text-base font-black text-indigo-700">
                      ₹{(s2.opening.totalOpeningCash || 0).toFixed(2)}
                    </span>
                  </div>
                  <DenominationGrid denominations={s2.opening.denominations} label="Float Denominations" />

                  {s2?.closing ? (
                    <div className="space-y-6 animate-in fade-in duration-300">
                      {isReviewEditing === 2 ? (
                        <div className="bg-indigo-50/30 p-5 rounded-[2rem] space-y-4 border border-indigo-200 shadow-inner">
                          <div className="flex items-center justify-between">
                            <span className="text-[10px] font-black text-indigo-600 uppercase tracking-widest">Correction Mode</span>
                            <button onClick={() => setIsReviewEditing(null)} className="text-indigo-400 hover:text-indigo-600"><X size={16} /></button>
                          </div>
                          <div className="grid grid-cols-3 gap-2">
                            {denominationsList.map(denom => (
                              <div key={denom} className="flex flex-col gap-1 bg-white p-2.5 rounded-xl border border-indigo-100 shadow-sm">
                                <span className="text-[8px] font-black text-gray-400">₹{denom}</span>
                                <input
                                  type="number"
                                  className="w-full text-xs font-black text-indigo-700 bg-transparent border-none p-0 focus:ring-0"
                                  value={reviewEditData.denominations[denom] || ''}
                                  onChange={(e) => handleDenominationChange(e.target.value, denom, 'review')}
                                  placeholder="0"
                                />
                              </div>
                            ))}
                          </div>
                          <div className="grid grid-cols-2 gap-3 pt-2">
                            <div className="bg-white p-3 rounded-xl border border-indigo-100 shadow-sm">
                              <span className="text-[8px] font-black text-orange-500 uppercase block mb-0.5">Correct UPI</span>
                              <input
                                type="number"
                                className="w-full text-sm font-black text-orange-700 bg-transparent border-none p-0 focus:ring-0"
                                value={reviewEditData.upiSales}
                                onChange={(e) => setReviewEditData({ ...reviewEditData, upiSales: parseFloat(e.target.value) || 0 })}
                              />
                            </div>
                            <div className="bg-white p-3 rounded-xl border border-indigo-100 shadow-sm">
                              <span className="text-[8px] font-black text-blue-500 uppercase block mb-0.5">Correct Card</span>
                              <input
                                type="number"
                                className="w-full text-sm font-black text-blue-700 bg-transparent border-none p-0 focus:ring-0"
                                value={reviewEditData.cardSales}
                                onChange={(e) => setReviewEditData({ ...reviewEditData, cardSales: parseFloat(e.target.value) || 0 })}
                              />
                            </div>
                          </div>
                          <div className="space-y-3 pt-3 border-t border-indigo-200">
                            {(() => {
                              const originalExpected = s2?.closing?.expectedCash || 0;
                              const originalUpi = s2?.closing?.upiSales || 0;
                              const originalCard = s2?.closing?.cardSales || 0;
                              const liveExpected = originalExpected - ((reviewEditData.upiSales || 0) - originalUpi) - ((reviewEditData.cardSales || 0) - originalCard);
                              const liveDiff = reviewEditData.actualCash - liveExpected;
                              return (
                                <div className="flex items-center justify-between px-1 bg-white p-2 rounded-xl border border-indigo-100 shadow-sm">
                                  <div>
                                    <span className="text-[9px] font-black text-gray-400 uppercase block">Expected: ₹{liveExpected.toFixed(2)}</span>
                                    <span className="text-xs font-black text-indigo-700 uppercase">Input: ₹{reviewEditData.actualCash.toFixed(2)}</span>
                                  </div>
                                  <div className={`px-2.5 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-tight ${Math.abs(liveDiff) <= 0.01 ? 'bg-emerald-50 text-emerald-600' : 'bg-rose-50 text-rose-600'}`}>
                                    {Math.abs(liveDiff) <= 0.01 ? 'MATCHED ✓' : liveDiff > 0 ? `Extra: ₹${liveDiff.toFixed(2)}` : `Short: ₹${Math.abs(liveDiff).toFixed(2)}`}
                                  </div>
                                </div>
                              );
                            })()}
                            <input
                              className="w-full bg-white border border-indigo-100 p-3 text-sm rounded-xl outline-none focus:ring-2 focus:ring-indigo-200"
                              placeholder="Admin reason for correction..."
                              value={reviewEditData.remark}
                              onChange={(e) => setReviewEditData({ ...reviewEditData, remark: e.target.value })}
                            />
                            <button
                              onClick={() => handleReviewClosing(viewingSummary.vehicleId, viewingSummary.date, 2, 'APPROVED', {
                                actualCash: reviewEditData.actualCash,
                                upiSales: reviewEditData.upiSales,
                                cardSales: reviewEditData.cardSales,
                                denominations: reviewEditData.denominations,
                                remark: reviewEditData.remark
                              })}
                              disabled={isSubmitting}
                              className="w-full bg-indigo-600 text-white py-3.5 rounded-2xl text-[10px] font-black uppercase tracking-[0.2em] hover:bg-indigo-700 transition-all flex items-center justify-center gap-2 shadow-lg shadow-indigo-600/20"
                            >
                              {isSubmitting ? <Loader2 className="animate-spin" size={16} /> : 'Save Corrections & Approve'}
                            </button>
                          </div>
                        </div>
                      ) : (
                        <>
                          <div className="bg-gray-50/50 p-5 rounded-[2rem] border border-gray-100 space-y-3">
                            <div className="flex justify-between items-center">
                              <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Cash Sales</span>
                              <span className="text-sm font-black text-emerald-600">₹{(s2.closing.cashSales || 0).toFixed(2)}</span>
                            </div>
                            <div className="flex justify-between items-center">
                              <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">UPI Sales</span>
                              <span className="text-sm font-black text-orange-600">₹{(s2.closing.upiSales || 0).toFixed(2)}</span>
                            </div>
                            <div className="flex justify-between items-center">
                              <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Card Sales</span>
                              <span className="text-sm font-black text-blue-600">₹{(s2.closing.cardSales || 0).toFixed(2)}</span>
                            </div>
                            <div className="flex justify-between items-center">
                              <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Expenses</span>
                              <span className="text-sm font-black text-rose-500">-₹{(s2.closing.expenses || 0).toFixed(2)}</span>
                            </div>
                            <div className="pt-2 border-t border-gray-100 flex justify-between items-center">
                              <span className="text-[10px] font-black text-gray-600 uppercase tracking-widest">Submission</span>
                              <div className="flex flex-col items-end">
                                <span className="text-base font-black text-slate-900">₹{(s2.closing.actualCash || 0).toFixed(2)}</span>
                                <span className={`text-[9px] font-black px-2 py-0.5 rounded-full ${s2.closing.difference === 0 ? 'bg-emerald-50 text-emerald-600' : s2.closing.difference > 0 ? 'bg-blue-50 text-blue-600' : 'bg-rose-50 text-rose-600'}`}>
                                  {s2.closing.difference === 0 ? 'MATCHED' : `${s2.closing.difference > 0 ? '+' : ''}₹${s2.closing.difference.toFixed(2)}`}
                                </span>
                              </div>
                            </div>
                          </div>
                          <DenominationGrid denominations={s2.closing.denominations} label="Submission Denominations" />

                          {s2.closing.remark && (
                            <div className="p-4 bg-indigo-50/50 rounded-2xl border border-indigo-100 italic font-medium text-xs text-indigo-900">
                              <span className="text-[8px] font-black text-indigo-500 uppercase block not-italic mb-1 tracking-widest">Agent Note</span>
                              "{s2.closing.remark}"
                            </div>
                          )}

                          <div className="flex gap-3 pt-2">
                            <button
                              onClick={() => {
                                setIsReviewEditing(2);
                                setReviewEditData({
                                  actualCash: s2.closing.actualCash,
                                  upiSales: s2.closing.upiSales,
                                  cardSales: s2.closing.cardSales,
                                  denominations: s2.closing.denominations,
                                  remark: s2.closing.remark || ''
                                });
                              }}
                              className="flex-1 flex items-center justify-center gap-2 bg-white border border-gray-200 text-gray-700 text-[10px] font-black uppercase py-3.5 rounded-2xl hover:bg-gray-50 transition-all"
                            >
                              <Pencil size={12} /> Edit
                            </button>
                            {s2.closing.status === 'PENDING' && (
                              <>
                                <button
                                  onClick={() => handleReviewClosing(viewingSummary.vehicleId, viewingSummary.date, 2, 'APPROVED')}
                                  className="flex-[2] bg-emerald-600 text-white text-[10px] font-black uppercase py-3.5 rounded-2xl hover:bg-emerald-700 transition-shadow shadow-lg shadow-emerald-600/20"
                                >
                                  Quick Approve
                                </button>
                                <button
                                  onClick={() => handleReviewClosing(viewingSummary.vehicleId, viewingSummary.date, 2, 'REJECTED')}
                                  className="flex-1 bg-rose-50 text-rose-600 text-[10px] font-black uppercase py-3.5 rounded-2xl hover:bg-rose-100 transition-colors"
                                >
                                  Reject
                                </button>
                              </>
                            )}
                          </div>
                        </>
                      )}
                    </div>
                  ) : (
                    <div className="p-8 text-center bg-gray-50/50 rounded-3xl border border-dashed border-gray-200">
                      <Clock size={24} className="mx-auto text-gray-300 mb-2" />
                      <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Closing Not Submitted</p>
                    </div>
                  )}
                </>
              ) : (
                <div className="flex flex-col items-center justify-center py-12 text-center space-y-3 bg-gray-50/30 rounded-[3rem] border border-dashed border-gray-100">
                  <Moon size={32} className="text-gray-200" />
                  <p className="text-[10px] font-black text-gray-300 uppercase tracking-widest">Shift 2 Not Operational</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="bg-emerald-900 rounded-[2.5rem] p-6 shadow-xl mb-6 relative overflow-hidden group">
        <div className="absolute top-0 right-0 p-8 opacity-10 pointer-events-none">
          <Coins size={120} />
        </div>

        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 relative z-10">
          <div className="flex items-center gap-4">
            <div className={`w-14 h-14 rounded-2xl flex items-center justify-center text-white ${storeRegisterData?.storeRegister?.status === 'OPEN' ? 'bg-emerald-600 shadow-lg shadow-emerald-900/50' : 'bg-gray-800'}`}>
              <Coins size={28} />
            </div>
            <div>
              <h2 className="text-xl font-black text-white uppercase tracking-tight">Store Cash</h2>
              <p className="text-xs font-bold text-emerald-400 uppercase tracking-widest mt-1">
                {storeRegisterData?.storeRegister?.status === 'OPEN'
                  ? (
                    <span className="flex items-center gap-2">
                      <span className="bg-emerald-500 w-1.5 h-1.5 rounded-full animate-pulse" />
                      Active • Opening Cash: ₹{storeRegisterData.storeRegister.openingCash?.toLocaleString()}
                    </span>
                  )
                  : storeRegisterData?.storeRegister?.status === 'CLOSED'
                    ? `Closed • Day Diff ₹${storeRegisterData.storeRegister.closingDifference?.toFixed(2)}`
                    : 'Awaiting Daily Initialization'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {!storeRegisterData?.storeRegister ? (
              <button
                onClick={() => setShowOpenStoreModal(true)}
                className="bg-white hover:bg-emerald-50 text-emerald-950 px-8 py-3.5 rounded-2xl text-xs font-black uppercase tracking-widest transition-all shadow-2xl active:scale-95 border-b-4 border-emerald-100"
              >
                Initialize Store Safe
              </button>
            ) : storeRegisterData.storeRegister.status === 'OPEN' ? (
              <div className="flex items-center gap-3">
                <div className="flex flex-col gap-1.5">
                  <button
                    onClick={() => {
                      const hasSubmissions = summaries.some(s => s.shiftDetails.shift1.closing || s.shiftDetails.shift2.closing);
                      if (!hasSubmissions) {
                        return toast.error('No agent has completed their shift yet. Shifts must be closed by agents before depositing cash.');
                      }
                      setShowDepositModal(true);
                    }}
                    className="bg-gradient-to-r from-amber-400 to-orange-400 hover:from-amber-300 hover:to-orange-300 text-amber-950 px-6 py-3 rounded-2xl text-xs font-black uppercase tracking-widest transition-all shadow-xl shadow-amber-950/20 active:scale-95 flex items-center gap-2"
                  >
                    <Plus size={16} strokeWidth={3} />
                    Deposit Shift Cash
                  </button>
                  <div className="flex items-center justify-around px-2">
                    <div className="flex items-center gap-1">
                      <div className={`w-1.5 h-1.5 rounded-full ${isShiftDeposited(1) ? 'bg-emerald-500' : 'bg-white/20'}`} />
                      <span className={`text-[8px] font-black uppercase tracking-widest ${isShiftDeposited(1) ? 'text-emerald-400' : 'text-white/40'}`}>S1</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <div className={`w-1.5 h-1.5 rounded-full ${isShiftDeposited(2) ? 'bg-emerald-500' : 'bg-white/20'}`} />
                      <span className={`text-[8px] font-black uppercase tracking-widest ${isShiftDeposited(2) ? 'text-emerald-400' : 'text-white/40'}`}>S2</span>
                    </div>
                  </div>
                </div>

                <button
                  onClick={() => {
                    setBankData(prev => ({ ...prev, adminId: user?.id, depositedBy: user?.name || '' }));
                    setShowBankModal(true);
                  }}
                  className="bg-white/10 hover:bg-white/20 text-white border border-white/10 px-6 py-3 rounded-2xl text-xs font-black uppercase tracking-widest transition-all active:scale-95 flex items-center gap-2 backdrop-blur-sm"
                >
                  <Building2 size={16} strokeWidth={3} />
                  Account Transfer
                </button>

                <button
                  onClick={() => setShowCloseStoreModal(true)}
                  className="bg-white hover:bg-rose-50 text-rose-600 px-6 py-3 rounded-2xl text-xs font-black uppercase tracking-widest transition-all shadow-xl active:scale-95 flex items-center gap-2"
                >
                  <Moon size={16} strokeWidth={3} />
                  Close Safe
                </button>
              </div>
            ) : (
              <div className="flex items-center gap-3">
                <div className="px-6 py-3 bg-emerald-950/50 rounded-2xl border border-emerald-800 text-emerald-300 text-xs font-black uppercase tracking-widest flex items-center gap-3">
                  Safe Closed: Diff ₹{storeRegisterData.storeRegister.closingDifference?.toFixed(2)}
                  <button
                    onClick={() => {
                      setStoreDenomData({
                        amount: storeRegisterData.storeRegister.actualClosingCash,
                        denominations: storeRegisterData.storeRegister.closingDenominations || { "500": 0, "200": 0, "100": 0, "50": 0, "20": 0, "10": 0, "5": 0, "2": 0, "1": 0 }
                      });
                      setShowCloseStoreModal(true); // Re-use close modal for editing closing
                    }}
                    className="p-1 px-2 bg-emerald-800/50 hover:bg-emerald-700 text-emerald-400 hover:text-white rounded-lg transition-all text-[10px]"
                  >
                    Edit Closing
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>

        {storeRegisterData?.storeRegister && (
          <div className="space-y-6 mt-6">
            <div className="grid grid-cols-2 lg:grid-cols-5 gap-4 relative z-10">
              <div className="bg-emerald-950/50 p-4 rounded-2xl border border-emerald-800/50 group relative">
                <p className="text-[10px] font-black tracking-widest uppercase text-emerald-500 mb-1">Opening Cash</p>
                <div className="flex items-center justify-between">
                  <p className="text-xl font-black text-white">₹{storeRegisterData.storeRegister.openingCash?.toFixed(2)}</p>
                  <button
                    onClick={() => {
                      setStoreDenomData({
                        amount: storeRegisterData.storeRegister.openingCash,
                        denominations: storeRegisterData.storeRegister.openingDenominations || { "500": 0, "200": 0, "100": 0, "50": 0, "20": 0, "10": 0, "5": 0, "2": 0, "1": 0 }
                      });
                      setShowEditStoreModal(true);
                    }}
                    className="p-1.5 bg-emerald-800/50 text-emerald-400 hover:text-white rounded-lg opacity-0 group-hover:opacity-100 transition-all"
                  >
                    <Pencil size={12} />
                  </button>
                </div>
              </div>
              <div className="bg-emerald-950/50 p-4 rounded-2xl border border-emerald-800/50">
                <p className="text-[10px] font-black tracking-widest uppercase text-amber-500 mb-1">Agent Outflow</p>
                <p className="text-xl font-black text-amber-400">-₹{storeRegisterData.liveMetrics?.assignedOut?.toFixed(2)}</p>
              </div>
              <div className="bg-emerald-950/50 p-4 rounded-2xl border border-emerald-800/50">
                <p className="text-[10px] font-black tracking-widest uppercase text-sky-500 mb-1">Agent Inflow</p>
                <p className="text-xl font-black text-sky-400">+₹{storeRegisterData.liveMetrics?.receivedIn?.toFixed(2)}</p>
              </div>
              <div className="bg-white/5 border border-white/10 p-4 rounded-3xl backdrop-blur-sm">
                <p className="text-[10px] font-black tracking-widest uppercase text-rose-500 mb-1">Bank Transfer</p>
                <p className="text-xl font-black text-rose-400">-₹{storeRegisterData.liveMetrics?.bankTransferred?.toFixed(2)}</p>
              </div>
              <div className="bg-white rounded-3xl p-4 shadow-xl border-b-4 border-emerald-100">
                <p className="text-[10px] font-black tracking-widest uppercase text-emerald-600 mb-1">Safe Balance</p>
                <p className="text-xl font-black text-emerald-900">₹{storeRegisterData.liveMetrics?.liveExpected?.toFixed(2)}</p>
              </div>
            </div>

            {/* Shift Deposits List */}
            {storeRegisterData.storeDeposits?.length > 0 && (
              <div className="bg-emerald-950/30 rounded-3xl p-5 border border-emerald-800/30 relative z-10">
                <h3 className="text-[10px] font-black text-emerald-500 uppercase tracking-widest mb-4 flex items-center gap-2">
                  <Clock size={12} /> Recent Shift Deposits
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {storeRegisterData.storeDeposits.map((dep) => (
                    <div key={dep.id} className="bg-emerald-900/50 border border-emerald-800/50 rounded-2xl p-4 flex items-center justify-between group hover:border-emerald-700/50 transition-all">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-emerald-800/50 flex items-center justify-center text-emerald-400 font-black">
                          S{dep.shift}
                        </div>
                        <div>
                          <p className="text-xs font-black text-white">₹{dep.amount.toLocaleString()}</p>
                          <p className="text-[9px] font-medium text-emerald-500/60 uppercase tracking-wider truncate max-w-[150px]">{dep.description}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => {
                            setEditingDeposit(dep);
                            setDepositData({
                              shift: dep.shift,
                              description: dep.description,
                              amount: dep.amount,
                              denominations: dep.denominations || { "500": 0, "200": 0, "100": 0, "50": 0, "20": 0, "10": 0, "5": 0, "2": 0, "1": 0 }
                            });
                            setShowEditDepositModal(true);
                          }}
                          className="p-2 text-emerald-500/50 hover:text-sky-400 hover:bg-sky-400/10 rounded-lg transition-all"
                        >
                          <Pencil size={14} />
                        </button>
                        <button
                          onClick={() => handleDeleteDeposit(dep.id)}
                          className="p-2 text-emerald-500/50 hover:text-rose-400 hover:bg-rose-400/10 rounded-lg transition-all"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">

        <div className="flex flex-col gap-1">
          <h2 className="text-2xl font-black text-gray-900 tracking-tight">Cash Management</h2>
          <div className="flex items-center gap-2">
            <p className="text-sm font-medium text-gray-500">Track and reconcile daily vehicle cash — Shift 1 & Shift 2 (Independent)</p>
            {isTenantRoute && storeFilterId && (
              <>
                <span className="text-gray-300">•</span>
                <button
                  onClick={() => setSearchParams({})}
                  className="text-[10px] font-black text-emerald-600 hover:text-emerald-700 uppercase tracking-widest bg-emerald-50 px-2 py-0.5 rounded transition-colors mt-0.5"
                >
                  Change Store
                </button>
              </>
            )}
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div className="relative group hidden sm:block">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-emerald-500 transition-colors" size={16} />
            <input
              type="text"
              placeholder="Search by vehicle or agent..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 pr-4 py-2 bg-white border border-gray-100 rounded-xl text-sm focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none transition-all w-64 shadow-sm font-medium"
            />
          </div>
          {can('CASH', 'CREATE') && (
            <button
              onClick={() => {
                if (!storeRegisterData?.storeRegister || storeRegisterData.storeRegister.status !== 'OPEN') {
                  return toast.error('You must initialize the Store Safe before assigning cash to agents.');
                }
                setShowAssignModal(true);
              }}
              className="flex items-center gap-2 bg-emerald-600 text-white px-5 py-2.5 rounded-2xl font-bold text-sm hover:bg-emerald-700 transition-all shadow-lg shadow-emerald-600/20"
            >
              <Plus size={18} strokeWidth={2.5} />
              Assign
            </button>
          )}
          <div className="flex items-center gap-3 bg-white p-2 rounded-2xl border border-gray-100 shadow-sm">
            <Calendar size={18} className="text-emerald-500 ml-2" />
            <input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="bg-transparent border-none focus:outline-none text-sm font-bold text-gray-700 pr-2"
            />
          </div>
        </div>
      </div>

      {/* Mobile Search */}
      <div className="sm:hidden relative group px-1">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
        <input
          type="text"
          placeholder="Search by vehicle or agent..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full pl-11 pr-4 py-3 bg-white border border-gray-100 rounded-2xl text-sm focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none transition-all shadow-sm font-medium"
        />
      </div>



      {/* Tabs */}
      <div className="flex gap-2 bg-gray-100 p-1 rounded-2xl w-fit">
        <button
          onClick={() => setActiveTab('reconciliation')}
          className={`px-6 py-2.5 rounded-xl text-xs font-bold uppercase tracking-wider transition-all ${activeTab === 'reconciliation' ? 'bg-white text-emerald-600 shadow-sm' : 'text-gray-400'}`}
        >
          Daily Reconciliation
        </button>
        <button
          onClick={() => setActiveTab('live')}
          className={`px-6 py-2.5 rounded-xl text-xs font-bold uppercase tracking-wider transition-all ${activeTab === 'live' ? 'bg-white text-emerald-600 shadow-sm' : 'text-gray-400'}`}
        >
          Live Cash Status
        </button>
      </div>

      {/* TAB CONTENT */}
      {activeTab === 'reconciliation' ? (
        <div className="bg-white rounded-[2rem] border border-gray-100 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="bg-gray-50/50 border-b border-gray-100">
                  <th className="px-5 py-4 text-[10px] font-black uppercase tracking-widest text-gray-400">Agent / Vehicle</th>
                  <th className="px-4 py-4 text-[10px] font-black uppercase tracking-widest text-amber-500">S1 Open</th>
                  <th className="px-4 py-4 text-[10px] font-black uppercase tracking-widest text-amber-400">S1 Close</th>
                  <th className="px-4 py-4 text-[10px] font-black uppercase tracking-widest text-indigo-500">S2 Open</th>
                  <th className="px-4 py-4 text-[10px] font-black uppercase tracking-widest text-indigo-400">S2 Close</th>
                  <th className="px-4 py-4 text-[10px] font-black uppercase tracking-widest text-amber-500">S1 Status</th>
                  <th className="px-4 py-4 text-[10px] font-black uppercase tracking-widest text-indigo-500">S2 Status</th>
                  <th className="px-4 py-4 text-[10px] font-black uppercase tracking-widest text-rose-500">Day Exp.</th>
                  <th className="px-4 py-4 text-[10px] font-black uppercase tracking-widest text-gray-400 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {loading ? (
                  <tr>
                    <td colSpan="9" className="px-6 py-12 text-center text-gray-400 font-bold italic">
                      Loading cash summaries...
                    </td>
                  </tr>
                ) : filteredSummaries.length === 0 ? (
                  <tr>
                    <td colSpan="9" className="px-6 py-12 text-center">
                      <Coins size={32} className="mx-auto text-gray-200 mb-2" />
                      <p className="text-sm font-bold text-gray-400">No matching cash records found</p>
                    </td>
                  </tr>
                ) : (
                  filteredSummaries.map((summary) => {
                    const s1 = summary.shiftDetails?.shift1;
                    const s2 = summary.shiftDetails?.shift2;
                    const s1Open = s1?.opening?.totalOpeningCash || 0;
                    const s1Close = s1?.closing?.actualCash || s1?.live?.expected || 0;
                    const s2Open = s2?.opening?.totalOpeningCash || 0;
                    const s2Close = s2?.closing?.actualCash || s2?.live?.expected || 0;

                    return (
                      <tr key={summary.id} className="hover:bg-gray-50/50 transition-colors">
                        <td className="px-5 py-4">
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-lg bg-emerald-50 flex items-center justify-center text-emerald-600">
                              <User size={16} strokeWidth={2.5} />
                            </div>
                            <div className="flex flex-col">
                              <span className="text-sm font-black text-gray-900 leading-none">
                                {summary.vehicle?.assignedUsers?.find(u => u.role === 'SALES_AGENT')?.name || 'No Agent'}
                              </span>
                              <span className="text-[10px] text-gray-400 font-bold uppercase">
                                {summary.vehicle?.vehicleName || summary.vehicle?.vehicleNumber || 'Standard'}
                              </span>
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-4">
                          <span className={`text-sm font-bold ${s1Open > 0 ? 'text-amber-600' : 'text-gray-300'}`}>
                            ₹{s1Open.toFixed(2)}
                          </span>
                        </td>
                        <td className="px-4 py-4">
                          {s1?.closing ? (
                            <span className="text-sm font-bold text-amber-700">₹{s1Close.toFixed(2)}</span>
                          ) : (
                            <span className="text-[9px] font-bold text-gray-300 uppercase">—</span>
                          )}
                        </td>
                        <td className="px-4 py-4">
                          <span className={`text-sm font-bold ${s2Open > 0 ? 'text-indigo-600' : 'text-gray-300'}`}>
                            ₹{s2Open.toFixed(2)}
                          </span>
                        </td>
                        <td className="px-4 py-4">
                          {s2?.closing ? (
                            <span className="text-sm font-bold text-indigo-700">₹{s2Close.toFixed(2)}</span>
                          ) : (
                            <span className="text-[9px] font-bold text-gray-300 uppercase">—</span>
                          )}
                        </td>
                        <td className="px-4 py-4">
                          <ShiftStatusBadge opening={s1?.opening} closing={s1?.closing} />
                        </td>
                        <td className="px-4 py-4">
                          <ShiftStatusBadge opening={s2?.opening} closing={s2?.closing} />
                        </td>
                        <td className="px-4 py-4">
                          <span className="text-sm font-bold text-rose-500">₹{(summary.dailySales?.totalCash === 0 && summary.dailySales?.grandTotal > 0 ? 0 : summary.shiftDetails?.shift1?.live?.expenses + summary.shiftDetails?.shift2?.live?.expenses || 0).toFixed(2)}</span>
                        </td>
                        <td className="px-4 py-4 text-right">
                          <div className="flex items-center justify-end gap-1.5 text-gray-400">
                            <button onClick={() => handleOpenView(summary)} className="p-2 hover:bg-emerald-50 rounded-xl hover:text-emerald-600 transition-all"><Eye size={18} /></button>
                            <>
                              {can('CASH', 'UPDATE') && (
                                <button
                                  onClick={() => {
                                    if (!storeRegisterData?.storeRegister || storeRegisterData.storeRegister.status !== 'OPEN') {
                                      return toast.error('You must initialize the Store Safe before editing agent cash.');
                                    }
                                    handleOpenEdit(summary);
                                  }}
                                  className="p-2 hover:bg-orange-50 rounded-xl hover:text-orange-600 transition-all"
                                >
                                  <Pencil size={18} />
                                </button>
                              )}
                              {can('CASH', 'DELETE') && (
                                <button onClick={() => { setDeletingSummary(summary); setShowDeleteModal(true); }} className="p-2 hover:bg-rose-50 rounded-xl hover:text-rose-600 transition-all"><Trash2 size={18} /></button>
                              )}
                            </>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        /* LIVE CASH STATUS TABLE */
        <div className="bg-white rounded-[2rem] border border-gray-100 shadow-sm overflow-hidden animate-in fade-in slide-in-from-bottom-4 duration-500">
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="bg-emerald-50/50 border-b border-emerald-100">
                  <th className="px-5 py-5 text-[10px] font-black uppercase tracking-widest text-emerald-600">Vehicle / Agent</th>
                  <th className="px-4 py-5 text-[10px] font-black uppercase tracking-widest text-emerald-600">Active Status</th>
                  <th className="px-4 py-5 text-[10px] font-black uppercase tracking-widest text-emerald-600 font-bold">Total Sales</th>
                  <th className="px-4 py-5 text-[10px] font-black uppercase tracking-widest text-emerald-500">Cash Sales</th>
                  <th className="px-4 py-5 text-[10px] font-black uppercase tracking-widest text-orange-500">UPI Sales</th>
                  <th className="px-4 py-5 text-[10px] font-black uppercase tracking-widest text-blue-500">Card Sales</th>
                  <th className="px-4 py-5 text-[10px] font-black uppercase tracking-widest text-rose-500">Live Exp.</th>
                  <th className="px-4 py-5 text-[10px] font-black uppercase tracking-widest text-emerald-700">In-Hand Cash</th>
                  <th className="px-5 py-5 text-[10px] font-black uppercase tracking-widest text-gray-400 text-right">Details</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {filteredSummaries.length === 0 ? (
                  <tr>
                    <td colSpan="8" className="px-6 py-12 text-center text-gray-400 font-bold">No active vehicles found</td>
                  </tr>
                ) : (
                  filteredSummaries.map((summary) => {
                    const s1 = summary.shiftDetails?.shift1;
                    const s2 = summary.shiftDetails?.shift2;
                    const activeShift = s2?.opening && !s2?.closing ? 2 : (s1?.opening && !s1?.closing ? 1 : null);
                    const metrics = activeShift === 2 ? s2.live : (activeShift === 1 ? s1.live : null);
                    const agent = summary.vehicle?.assignedUsers?.find(u => u.role === 'SALES_AGENT');

                    return (
                      <tr key={summary.id} className="hover:bg-emerald-50/20 transition-colors group">
                        <td className="px-5 py-4">
                          <div className="flex items-center gap-3">
                            <div className="w-9 h-9 rounded-xl bg-gray-50 flex items-center justify-center text-gray-400 group-hover:bg-white group-hover:shadow-sm transition-all">
                              <Truck size={18} />
                            </div>
                            <div className="flex flex-col">
                              <span className="text-sm font-black text-gray-900 leading-none">{summary.vehicle.vehicleNumber}</span>
                              <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mt-1 group-hover:text-emerald-600 transition-colors">{agent?.name || 'No Agent'}</span>
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-4">
                          {activeShift ? (
                            <div className="flex items-center gap-2">
                              <div className="relative">
                                <div className="w-2 h-2 rounded-full bg-emerald-500" />
                                <div className="absolute inset-0 w-2 h-2 rounded-full bg-emerald-500 animate-ping opacity-75" />
                              </div>
                              <span className="text-[10px] font-black text-emerald-700 uppercase">Live — Shift {activeShift}</span>
                            </div>
                          ) : (
                            <span className="text-[10px] font-black text-gray-400 uppercase">Closed / Pending</span>
                          )}
                        </td>
                        <td className="px-4 py-4">
                          <span className="text-sm font-black text-gray-900 leading-none">₹{summary.dailySales.grandTotal.toFixed(2)}</span>
                        </td>
                        <td className="px-4 py-4">
                          <span className="text-sm font-bold text-emerald-600">₹{summary.dailySales.totalCash.toFixed(2)}</span>
                        </td>
                        <td className="px-4 py-4">
                          <span className="text-sm font-bold text-orange-600">₹{summary.dailySales.totalUpi.toFixed(2)}</span>
                        </td>
                        <td className="px-4 py-4">
                          <span className="text-sm font-bold text-blue-600">₹{summary.dailySales.totalCard.toFixed(2)}</span>
                        </td>
                        <td className="px-4 py-4">
                          <span className="text-sm font-bold text-rose-500">₹{(metrics?.expenses || 0).toFixed(2)}</span>
                        </td>
                        <td className="px-4 py-4">
                          <div className="bg-emerald-100/50 px-3 py-1.5 rounded-lg w-fit border border-emerald-200/50">
                            <span className="text-sm font-black text-emerald-700">₹{(metrics?.expected || 0).toFixed(2)}</span>
                          </div>
                        </td>
                        <td className="px-5 py-4 text-right">
                          <button
                            onClick={() => handleOpenView(summary)}
                            className="p-2 hover:bg-white hover:shadow-sm rounded-xl text-gray-400 hover:text-emerald-600 transition-all"
                          >
                            <ArrowRight size={18} />
                          </button>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ========== FLOAT ASSIGNMENT MODAL ========== */}
      {showAssignModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
          <div className="bg-white w-full max-w-lg rounded-[2rem] p-6 shadow-2xl flex flex-col gap-4 animate-in zoom-in-95 duration-200 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-emerald-50 rounded-xl flex items-center justify-center text-emerald-600">
                  <Coins size={24} />
                </div>
                <div>
                  <h3 className="text-lg font-black text-gray-900 leading-tight">Assign Float</h3>
                  <p className="text-[9px] font-bold text-gray-400 uppercase tracking-widest leading-tight">Daily Opening Cash</p>
                </div>
              </div>
              <button
                onClick={() => setShowAssignModal(false)}
                className="p-1.5 hover:bg-gray-100 rounded-lg text-gray-400 transition-colors"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleAssignFloat} className="space-y-4">
              {/* Shift Selector */}
              <div className="space-y-1.5">
                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest pl-1">Select Shift</label>
                <ShiftSelector
                  value={assignmentData.shift}
                  onChange={(s) => setAssignmentData({ ...assignmentData, shift: s })}
                  disabledShifts={(() => {
                    if (!assignmentData.vehicleId) return [];
                    const summary = summaries.find(s => s.vehicleId === assignmentData.vehicleId);
                    const s1Closed = summary?.shiftDetails?.shift1?.closing;
                    // If S1 is not closed, disable S2 assignment
                    return !s1Closed ? [2] : [];
                  })()}
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest pl-1">Target Vehicle / Agent</label>
                <select
                  required
                  className="w-full bg-gray-50 border border-gray-100 rounded-xl px-4 py-3 text-sm font-bold text-gray-700 focus:ring-4 focus:ring-emerald-500/10 focus:border-emerald-500 transition-all outline-none"
                  value={assignmentData.vehicleId}
                  onChange={(e) => setAssignmentData({ ...assignmentData, vehicleId: e.target.value })}
                >
                  <option value="">Select a vehicle...</option>
                  {vehicles
                    .map((v) => {
                      const agent = v.assignedUsers?.find(u => u.role === 'SALES_AGENT');
                      if (!agent) return null;
                      return (
                        <option key={v.id} value={v.id}>
                          {agent.name} ({v.vehicleNumber})
                        </option>
                      );
                    })
                    .filter(Boolean)
                  }
                </select>
              </div>

              {(() => {
                if (!assignmentData.vehicleId) return null;
                const summary = summaries.find(s => s.vehicleId === assignmentData.vehicleId);
                const shiftData = assignmentData.shift === 1 ? summary?.shiftDetails?.shift1 : summary?.shiftDetails?.shift2;
                const opening = shiftData?.opening;
                const closing = shiftData?.closing;

                if (!opening) return (
                  <>
                    <div className="flex items-center gap-3 p-4 bg-rose-50 rounded-2xl border border-rose-100/50 group cursor-pointer" onClick={() => setAssignmentData({ ...assignmentData, isNoService: !assignmentData.isNoService })}>
                      <div className={`w-10 h-10 rounded-xl flex items-center justify-center transition-colors ${assignmentData.isNoService ? 'bg-rose-500 text-white' : 'bg-white text-rose-300 group-hover:text-rose-400'}`}>
                        <AlertTriangle size={20} />
                      </div>
                      <div className="flex-1">
                        <span className="text-[10px] font-black text-rose-500 uppercase tracking-widest block leading-none mb-1">Vehicle Damage / Service</span>
                        <span className="text-xs font-bold text-rose-900 opacity-70">Mark Shift {assignmentData.shift} as "No Service" for today</span>
                      </div>
                      <input
                        type="checkbox"
                        checked={assignmentData.isNoService || false}
                        onChange={(e) => setAssignmentData({ ...assignmentData, isNoService: e.target.checked })}
                        className="w-5 h-5 rounded-lg border-rose-200 text-rose-500 focus:ring-rose-500 cursor-pointer"
                      />
                    </div>

                    {!assignmentData.isNoService && (
                      <div className="space-y-2">
                        <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest pl-1">Denominations</label>
                        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 bg-gray-50/50 p-2 rounded-2xl border border-gray-100">
                          {denominationsList.map((denom) => (
                            <div key={denom} className="flex flex-col gap-1 bg-white p-2 rounded-xl border border-gray-100 shadow-sm group hover:border-emerald-200 transition-all">
                              <div className="flex items-center justify-between border-b border-gray-50 pb-1 mb-1">
                                <span className="text-[10px] font-black text-gray-400 group-hover:text-emerald-600">₹{denom}</span>
                                <span className="text-[9px] font-bold text-emerald-600/40 uppercase">₹{(denom * (assignmentData.denominations[denom] || 0)).toLocaleString()}</span>
                              </div>
                              <div className="flex items-center gap-1.5 justify-center">
                                <span className="text-[10px] text-gray-200">×</span>
                                <input
                                  type="number"
                                  placeholder="0"
                                  min="0"
                                  className="w-full bg-transparent border-none p-0 text-sm font-black text-gray-700 focus:ring-0 placeholder:text-gray-200 text-center"
                                  value={assignmentData.denominations[denom] || ''}
                                  onChange={(e) => handleDenominationChange(e.target.value, denom, 'assign')}
                                />
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    <div className={`flex items-center justify-between px-5 py-4 rounded-2xl shadow-lg text-white group overflow-hidden transition-all ${assignmentData.isNoService
                      ? 'bg-rose-600 shadow-rose-600/20'
                      : (assignmentData.shift === 1 ? 'bg-amber-600 shadow-amber-600/20' : 'bg-indigo-600 shadow-indigo-600/20')
                      }`}>
                      <div className="flex flex-col">
                        <p className="text-[9px] font-black uppercase tracking-[0.2em] opacity-60 mb-0.5">
                          {assignmentData.isNoService ? 'No Service Applied' : `Shift ${assignmentData.shift} Total`}
                        </p>
                        <h4 className="text-2xl font-black tracking-tight">₹{assignmentData.isNoService ? '0.00' : (assignmentData.amount || 0).toFixed(2)}</h4>
                      </div>
                      <div className="w-10 h-10 bg-white/10 rounded-full flex items-center justify-center">
                        {assignmentData.isNoService ? <AlertTriangle size={20} className="text-white opacity-40" /> : assignmentData.shift === 1 ? <Sun size={20} className="text-white opacity-40" /> : <Moon size={20} className="text-white opacity-40" />}
                      </div>
                    </div>

                    <button
                      type="submit"
                      disabled={isSubmitting || (!assignmentData.isNoService && assignmentData.amount <= 0)}
                      className="w-full bg-emerald-600 text-white font-black text-base py-3.5 rounded-xl active:scale-[0.98] transition-all shadow-xl shadow-emerald-600/20 flex items-center justify-center gap-2 hover:bg-emerald-700 disabled:opacity-50"
                    >
                      {isSubmitting ? <Loader2 className="animate-spin" size={20} /> : <><CheckCircle2 size={20} />Confirm & Submit</>}
                    </button>
                  </>
                );

                if (opening.isNoService) {
                  return (
                    <div className="bg-rose-950 rounded-[1.5rem] p-5 text-white shadow-xl animate-in fade-in slide-in-from-top-2 duration-300 border border-rose-900/50">
                      <div className="flex items-center justify-between border-b border-white/10 pb-3 mb-4">
                        <div className="flex items-center gap-2">
                          <AlertTriangle size={16} className="text-rose-400" />
                          <span className="text-[10px] font-black uppercase tracking-[0.2em] text-rose-400">Shift Cancelled</span>
                        </div>
                      </div>
                      <div className="space-y-3">
                        <span className="text-xs font-black text-rose-100 block">Vehicle Damage / Service</span>
                        <div className="p-3 bg-white/5 rounded-xl border border-white/5">
                          <p className="text-[10px] font-bold text-rose-200/60 leading-relaxed uppercase tracking-wider">
                            This shift was marked as non-operational by administration. No assignment or sales possible.
                          </p>
                        </div>
                      </div>
                      <button type="button" onClick={() => setShowAssignModal(false)} className="w-full mt-6 py-3 bg-white/10 hover:bg-white/20 rounded-xl text-xs font-black uppercase tracking-widest transition-colors">Close View</button>
                    </div>
                  );
                }

                if (closing) {
                  return (
                    <div className="bg-slate-900 rounded-[1.5rem] p-5 text-white shadow-xl animate-in fade-in slide-in-from-top-2 duration-300">
                      <div className="flex items-center justify-between border-b border-white/10 pb-3 mb-4">
                        <div className="flex items-center gap-2">
                          <CheckCircle2 size={16} className="text-emerald-400" />
                          <span className="text-[10px] font-black uppercase tracking-[0.2em] text-emerald-400">Shift Completed</span>
                        </div>
                        <span className="text-[10px] font-bold text-white/40">Final Summary</span>
                      </div>

                      <div className="grid grid-cols-3 gap-4">
                        <div className="space-y-1">
                          <span className="text-[9px] font-black uppercase text-white/30 block">Sales</span>
                          <span className="text-sm font-black">₹{closing.cashSales?.toLocaleString()}</span>
                        </div>
                        <div className="space-y-1">
                          <span className="text-[9px] font-black uppercase text-white/30 block">Actual</span>
                          <span className="text-sm font-black text-emerald-400">₹{closing.actualCash?.toLocaleString()}</span>
                        </div>
                        <div className="space-y-1">
                          <span className="text-[9px] font-black uppercase text-white/30 block">Status</span>
                          <div className="flex items-center gap-1">
                            <span className={`text-[10px] font-black uppercase truncate ${closing.difference === 0 ? 'text-white' : 'text-rose-400'}`}>
                              {closing.difference === 0 ? 'Matched' : closing.difference > 0 ? `+₹${closing.difference.toFixed(2)}` : `-₹${Math.abs(closing.difference).toFixed(2)}`}
                            </span>
                          </div>
                        </div>
                      </div>

                      <div className="mt-4 pt-3 border-t border-white/10 flex items-center justify-between">
                        <div className="flex flex-col">
                          <span className="text-[8px] font-bold text-white/40 uppercase">Float Used</span>
                          <span className="text-xs font-black opacity-80">₹{opening.totalOpeningCash?.toLocaleString()}</span>
                        </div>
                        <div className="px-3 py-1 bg-white/10 rounded-lg border border-white/5">
                          <span className="text-[9px] font-black uppercase tracking-widest text-white/60">Session Ended</span>
                        </div>
                      </div>
                      <button type="button" onClick={() => setShowAssignModal(false)} className="w-full mt-6 py-3 bg-white/10 hover:bg-white/20 rounded-xl text-xs font-black uppercase tracking-widest transition-colors">Close View</button>
                    </div>
                  );
                }

                // Assigned but not closed
                return (
                  <div className="bg-slate-900 rounded-[1.5rem] p-5 text-white shadow-xl animate-in fade-in slide-in-from-top-2 duration-300">
                    <div className="flex items-center justify-between border-b border-white/10 pb-3 mb-4">
                      <div className="flex items-center gap-2">
                        <Clock size={16} className="text-amber-400" />
                        <span className="text-[10px] font-black uppercase tracking-[0.2em] text-amber-400">Float Assigned</span>
                      </div>
                      <span className="text-[10px] font-bold text-white/40">Work in Progress</span>
                    </div>

                    <div className="text-center py-4 space-y-4">
                      <div className="space-y-1">
                        <span className="text-[10px] font-black uppercase text-white/30 block">Current Float In Hand</span>
                        <span className="text-4xl font-black text-white tracking-tighter">₹{(opening?.totalOpeningCash || 0).toFixed(2)}</span>
                      </div>
                      <p className="text-[10px] font-bold text-white/40 leading-relaxed max-w-[200px] mx-auto uppercase tracking-wider">
                        The agent is currently operating with this float. Re-assignment is locked.
                      </p>
                    </div>

                    <button type="button" onClick={() => setShowAssignModal(false)} className="w-full mt-6 py-3 bg-white/10 hover:bg-white/20 rounded-xl text-xs font-black uppercase tracking-widest transition-colors">Close View</button>
                  </div>
                );
              })()}
            </form>
          </div>
        </div>
      )}

      {/* ========== EDIT RECONCILIATION MODAL ========== */}
      {showEditModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
          <div className="bg-white w-full max-w-lg rounded-[2rem] p-6 shadow-2xl flex flex-col gap-4 animate-in zoom-in-95 duration-200 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-orange-50 rounded-xl flex items-center justify-center text-orange-600">
                  <Pencil size={20} />
                </div>
                <div>
                  <h3 className="text-lg font-black text-gray-900 leading-tight">Edit reconciliation</h3>
                  <p className="text-[9px] font-bold text-gray-400 uppercase tracking-widest leading-tight">{editingSummary.vehicle.vehicleNumber} • {editingSummary.date}</p>
                </div>
              </div>
              <button
                onClick={() => setShowEditModal(false)}
                className="p-1.5 hover:bg-gray-100 rounded-lg text-gray-400 transition-colors"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleUpdateReconciliation} className="space-y-4">
              {/* Shift Selector */}
              <div className="space-y-1.5">
                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest pl-1">Which Shift to Edit?</label>
                <ShiftSelector
                  value={editData.shift}
                  onChange={(s) => {
                    const shiftOpening = editingSummary.shiftDetails[`shift${s}`]?.opening;
                    setEditData({
                      ...editData,
                      shift: s,
                      openingCash: shiftOpening?.totalOpeningCash || 0,
                      denominations: shiftOpening?.denominations && Object.keys(shiftOpening.denominations).length > 0
                        ? shiftOpening.denominations
                        : { "500": 0, "200": 0, "100": 0, "50": 0, "20": 0, "10": 0, "5": 0, "2": 0, "1": 0 },
                      isNoService: shiftOpening?.isNoService || false,
                      remark: shiftOpening?.isNoService ? 'Removing No Service state' : 'Corrected by Admin'
                    });
                  }}
                />
              </div>

              <div className="flex items-center gap-3 p-4 bg-rose-50 rounded-2xl border border-rose-100/50 group cursor-pointer" onClick={() => setEditData({ ...editData, isNoService: !editData.isNoService })}>
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center transition-colors ${editData.isNoService ? 'bg-rose-500 text-white' : 'bg-white text-rose-300 group-hover:text-rose-400'}`}>
                  <AlertTriangle size={20} />
                </div>
                <div className="flex-1">
                  <span className="text-[10px] font-black text-rose-500 uppercase tracking-widest block leading-none mb-1">Vehicle Damage / Service</span>
                  <span className="text-xs font-bold text-rose-900 opacity-70">Mark Shift {editData.shift} as "No Service" for today</span>
                </div>
                <input
                  type="checkbox"
                  checked={editData.isNoService || false}
                  onChange={(e) => setEditData({ ...editData, isNoService: e.target.checked })}
                  className="w-5 h-5 rounded-lg border-rose-200 text-rose-500 focus:ring-rose-500 cursor-pointer"
                />
              </div>

              {!editData.isNoService && (
                <>
                  <div className="bg-orange-50/50 p-3 rounded-xl border border-orange-100">
                    <span className="text-[10px] font-black uppercase text-orange-600 block mb-1">New S{editData.shift} Opening</span>
                    <span className="text-sm font-black text-orange-700">₹{(editData.openingCash || 0).toFixed(2)}</span>
                  </div>

                  {/* Denominations */}
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest pl-1">Shift {editData.shift} Denominations</label>
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 bg-gray-50/50 p-2 rounded-2xl border border-gray-100">
                      {denominationsList.map((denom) => (
                        <div key={denom} className="flex flex-col gap-1 bg-white p-2 rounded-xl border border-gray-100 shadow-sm group hover:border-orange-200 transition-all">
                          <div className="flex items-center justify-between border-b border-gray-50 pb-1 mb-1">
                            <span className="text-[10px] font-black text-gray-400 group-hover:text-orange-600">₹{denom}</span>
                            <span className="text-[9px] font-bold text-orange-600/40 uppercase">₹{(denom * (editData.denominations[denom] || 0)).toLocaleString()}</span>
                          </div>
                          <div className="flex items-center gap-1.5 justify-center">
                            <span className="text-[10px] text-gray-200">×</span>
                            <input
                              type="number"
                              placeholder="0"
                              min="0"
                              className="w-full bg-transparent border-none p-0 text-sm font-black text-gray-700 focus:ring-0 placeholder:text-gray-200 text-center"
                              value={editData.denominations[denom] || ''}
                              onChange={(e) => handleDenominationChange(e.target.value, denom, 'edit')}
                            />
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </>
              )}

              <div className="bg-blue-50 border border-blue-100 rounded-xl px-4 py-3">
                <p className="text-[10px] font-black text-blue-600 uppercase tracking-widest mb-1">Independent Shifts</p>
                <p className="text-xs text-blue-500 font-bold">
                  Each shift is recalculated independently: Opening + Sales − Expenses
                </p>
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest pl-1">Adjustment Reason</label>
                <textarea
                  required
                  className="w-full bg-gray-50 border border-gray-100 rounded-xl px-4 py-3 text-sm font-bold text-gray-700 focus:ring-4 focus:ring-orange-500/10 focus:border-orange-500 transition-all outline-none h-20 resize-none"
                  placeholder="Why are you changing the physical count?"
                  value={editData.remark}
                  onChange={(e) => setEditData({ ...editData, remark: e.target.value })}
                />
              </div>

              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full bg-orange-600 text-white font-black text-base py-3.5 rounded-xl active:scale-[0.98] transition-all shadow-xl shadow-orange-600/20 flex items-center justify-center gap-2 hover:bg-orange-700 disabled:opacity-50"
              >
                {isSubmitting ? (
                  <Loader2 className="animate-spin" size={20} />
                ) : (
                  <>
                    <CheckCircle2 size={20} />
                    Update Reconciliation
                  </>
                )}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* ========== DELETE CONFIRMATION MODAL ========== */}
      {showDeleteModal && deletingSummary && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
          <div className="bg-white w-full max-w-sm rounded-[2rem] p-6 shadow-2xl flex flex-col gap-5 animate-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-rose-50 rounded-xl flex items-center justify-center text-rose-600">
                  <Trash2 size={20} />
                </div>
                <div>
                  <h3 className="text-lg font-black text-gray-900 leading-tight">Delete Records</h3>
                  <p className="text-[9px] font-bold text-gray-400 uppercase tracking-widest leading-tight">This action cannot be undone</p>
                </div>
              </div>
              <button
                onClick={() => { setShowDeleteModal(false); setDeletingSummary(null); }}
                className="p-1.5 hover:bg-gray-100 rounded-lg text-gray-400 transition-colors"
              >
                <X size={18} />
              </button>
            </div>

            <div className="bg-rose-50 border border-rose-100 rounded-2xl px-4 py-4 space-y-2">
              <p className="text-xs font-bold text-rose-700">
                You are about to permanently delete all cash records (both shifts) for:
              </p>
              <div className="flex items-center gap-2 mt-1">
                <div className="w-7 h-7 rounded-lg bg-rose-100 flex items-center justify-center text-rose-600">
                  <Truck size={14} strokeWidth={2.5} />
                </div>
                <div>
                  <p className="text-sm font-black text-gray-900 leading-none">{deletingSummary.vehicle.vehicleNumber}</p>
                  <p className="text-[10px] text-gray-400 font-bold">{deletingSummary.date}</p>
                </div>
              </div>
              <p className="text-[10px] text-rose-500 font-bold mt-2">
                Both shifts' opening cash, closing cash &amp; daily summary will all be removed.
              </p>
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => { setShowDeleteModal(false); setDeletingSummary(null); }}
                className="flex-1 bg-gray-100 text-gray-600 font-black text-sm py-3 rounded-xl hover:bg-gray-200 transition-all"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmDelete}
                disabled={isDeleting}
                className="flex-1 bg-rose-600 text-white font-black text-sm py-3 rounded-xl hover:bg-rose-700 transition-all shadow-lg shadow-rose-600/20 flex items-center justify-center gap-2 disabled:opacity-50"
              >
                {isDeleting ? (
                  <Loader2 className="animate-spin" size={18} />
                ) : (
                  <>
                    <Trash2 size={16} />
                    Delete
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========== OPEN STORE CASH MODAL ========== */}
      {showOpenStoreModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
          <div className="bg-white w-full max-w-lg rounded-[2rem] p-6 shadow-2xl flex flex-col gap-4 animate-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-emerald-50 rounded-xl flex items-center justify-center text-emerald-600">
                  <Coins size={20} />
                </div>
                <div>
                  <h3 className="text-lg font-black text-gray-900 leading-tight">Open Store Safe</h3>
                  <p className="text-[9px] font-bold text-gray-400 uppercase tracking-widest leading-tight">Initialize central money for the day</p>
                </div>
              </div>
              <button
                onClick={() => setShowOpenStoreModal(false)}
                className="p-1.5 hover:bg-gray-100 rounded-lg text-gray-400 transition-colors"
              >
                <X size={18} />
              </button>
            </div>

            <div className="space-y-2">
              <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest pl-1">Denominations</label>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 bg-gray-50/50 p-2 rounded-2xl border border-gray-100">
                {denominationsList.map((denom) => (
                  <div key={denom} className="flex flex-col gap-1 bg-white p-2 rounded-xl border border-gray-100 shadow-sm group hover:border-emerald-200 transition-all">
                    <div className="flex items-center justify-between border-b border-gray-50 pb-1 mb-1">
                      <span className="text-[10px] font-black text-gray-400 group-hover:text-emerald-600">₹{denom}</span>
                      <span className="text-[9px] font-bold text-emerald-600/40 uppercase">₹{(denom * (storeDenomData.denominations[denom] || 0)).toLocaleString()}</span>
                    </div>
                    <div className="flex items-center gap-1.5 justify-center">
                      <span className="text-[10px] text-gray-200">×</span>
                      <input
                        type="number"
                        placeholder="0"
                        min="0"
                        className="w-full bg-transparent border-none p-0 text-sm font-black text-gray-700 focus:ring-0 placeholder:text-gray-200 text-center"
                        value={storeDenomData.denominations[denom] || ''}
                        onChange={(e) => handleDenominationChange(e.target.value, denom, 'store')}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="flex items-center justify-between px-5 py-4 rounded-2xl shadow-lg text-white bg-emerald-600 shadow-emerald-600/20">
              <div className="flex flex-col">
                <p className="text-[9px] font-black uppercase tracking-[0.2em] opacity-60 mb-0.5">Total Opening Value</p>
                <h4 className="text-2xl font-black tracking-tight">₹{(storeDenomData.amount || 0).toFixed(2)}</h4>
              </div>
            </div>

            <button
              onClick={handleOpenStoreRegister}
              disabled={isSubmitting || storeDenomData.amount <= 0}
              className="w-full bg-emerald-600 text-white font-black text-base py-3.5 rounded-xl active:scale-[0.98] transition-all flex items-center justify-center gap-2 hover:bg-emerald-700 disabled:opacity-50"
            >
              {isSubmitting ? <Loader2 className="animate-spin" size={20} /> : <><CheckCircle2 size={20} />Confirm & Open Safe</>}
            </button>
          </div>
        </div>
      )}

      {/* ========== CLOSE STORE CASH MODAL ========== */}
      {showCloseStoreModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
          <div className="bg-white w-full max-w-lg rounded-[2rem] p-6 shadow-2xl flex flex-col gap-4 animate-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-rose-50 rounded-xl flex items-center justify-center text-rose-600">
                  <Coins size={20} />
                </div>
                <div>
                  <h3 className="text-lg font-black text-gray-900 leading-tight">Close Store Safe</h3>
                  <p className="text-[9px] font-bold text-gray-400 uppercase tracking-widest leading-tight">Final physical end-of-day count</p>
                </div>
              </div>
              <button
                onClick={() => setShowCloseStoreModal(false)}
                className="p-1.5 hover:bg-gray-100 rounded-lg text-gray-400 transition-colors"
              >
                <X size={18} />
              </button>
            </div>

            <div className="flex items-center justify-between p-3 bg-gray-50 rounded-xl border border-gray-100">
              <p className="text-xs font-bold text-gray-500 uppercase tracking-wider">Expected Safe Balance</p>
              <p className="text-lg font-black text-gray-900">₹{storeRegisterData?.liveMetrics?.liveExpected?.toFixed(2)}</p>
            </div>

            <div className="space-y-2">
              <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest pl-1">Actual Physical Denominations</label>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 bg-gray-50/50 p-2 rounded-2xl border border-gray-100">
                {denominationsList.map((denom) => (
                  <div key={denom} className="flex flex-col gap-1 bg-white p-2 rounded-xl border border-gray-100 shadow-sm group hover:border-rose-200 transition-all">
                    <div className="flex items-center justify-between border-b border-gray-50 pb-1 mb-1">
                      <span className="text-[10px] font-black text-gray-400 group-hover:text-rose-600">₹{denom}</span>
                      <span className="text-[9px] font-bold text-rose-600/40 uppercase">₹{(denom * (storeDenomData.denominations[denom] || 0)).toLocaleString()}</span>
                    </div>
                    <div className="flex items-center gap-1.5 justify-center">
                      <span className="text-[10px] text-gray-200">×</span>
                      <input
                        type="number"
                        placeholder="0"
                        min="0"
                        className="w-full bg-transparent border-none p-0 text-sm font-black text-gray-700 focus:ring-0 placeholder:text-gray-200 text-center"
                        value={storeDenomData.denominations[denom] || ''}
                        onChange={(e) => handleDenominationChange(e.target.value, denom, 'store')}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="flex items-center justify-between px-5 py-4 rounded-2xl shadow-lg text-white bg-rose-600 shadow-rose-600/20">
              <div className="flex flex-col">
                <p className="text-[9px] font-black uppercase tracking-[0.2em] opacity-60 mb-0.5">Total Counted Value</p>
                <h4 className="text-2xl font-black tracking-tight">₹{(storeDenomData.amount || 0).toFixed(2)}</h4>
              </div>
              <div className="flex flex-col text-right">
                <p className="text-[9px] font-black uppercase tracking-[0.2em] opacity-60 mb-0.5">Variance</p>
                {(() => {
                  const expected = storeRegisterData?.liveMetrics?.liveExpected || 0;
                  const diff = storeDenomData.amount - expected;
                  return (
                    <span className={`text-sm font-black ${diff === 0 ? 'text-white' : 'text-rose-200'}`}>
                      {diff === 0 ? 'Matched' : diff > 0 ? `+₹${diff.toFixed(2)}` : `-₹${Math.abs(diff).toFixed(2)}`}
                    </span>
                  );
                })()}
              </div>
            </div>

            <button
              onClick={handleCloseStoreRegister}
              disabled={isSubmitting}
              className="w-full bg-rose-600 text-white font-black text-base py-3.5 rounded-xl active:scale-[0.98] transition-all flex items-center justify-center gap-2 hover:bg-rose-700 disabled:opacity-50"
            >
              {isSubmitting ? <Loader2 className="animate-spin" size={20} /> : <><CheckCircle2 size={20} />Confirm & Close Safe</>}
            </button>
          </div>
        </div>
      )}

      {/* ========== DEPOSIT SHIFT CASH MODAL ========== */}
      {showDepositModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
          <div className="bg-white w-full max-w-lg rounded-[2rem] p-6 shadow-2xl flex flex-col gap-4 animate-in zoom-in-95 duration-200 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-sky-50 rounded-xl flex items-center justify-center text-sky-600">
                  <Coins size={20} />
                </div>
                <div>
                  <h3 className="text-lg font-black text-gray-900 leading-tight">Deposit Shift Cash</h3>
                  <p className="text-[9px] font-bold text-gray-400 uppercase tracking-widest leading-tight">Collect agent cash after shift completion</p>
                </div>
              </div>
              <button
                onClick={() => setShowDepositModal(false)}
                className="p-1.5 hover:bg-gray-100 rounded-lg text-gray-400 transition-colors"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleCreateDeposit} className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest pl-1">Select Shift to Deposit</label>
                <div className="flex gap-2 bg-gray-100 p-1 rounded-xl">
                  {[1, 2].map((s) => {
                    const deposited = isShiftDeposited(s);
                    const hasCompletions = hasShiftCompletions(s);
                    const isSelected = depositData.shift === s;
                    return (
                      <button
                        key={s}
                        type="button"
                        onClick={() => hasCompletions && setDepositData({ ...depositData, shift: s })}
                        className={`flex-1 py-2 rounded-lg text-xs font-black uppercase tracking-widest transition-all relative ${
                          isSelected ? 'bg-white text-sky-600 shadow-sm' : 
                          !hasCompletions ? 'opacity-30 cursor-not-allowed grayscale' : 'text-gray-400 hover:text-gray-600'
                        }`}
                      >
                        Shift {s}
                        {deposited && (
                          <div className="absolute -top-1 -right-1 bg-emerald-500 text-white p-0.5 rounded-full ring-2 ring-white">
                            <CheckCircle2 size={8} strokeWidth={4} />
                          </div>
                        )}
                        {deposited && <span className="block text-[7px] opacity-60">Deposited</span>}
                        {!hasCompletions && <span className="block text-[7px] opacity-60">No Closings</span>}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between pl-1">
                  <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Denominations to Deposit</label>
                  {isShiftDeposited(depositData.shift) && (
                    <span className="text-[9px] font-black text-amber-600 bg-amber-50 px-2 py-0.5 rounded-full uppercase tracking-widest">Already Deposited — Use Edit below</span>
                  )}
                </div>
                <div className={`grid grid-cols-2 sm:grid-cols-3 gap-2 bg-gray-50/50 p-2 rounded-2xl border border-gray-100 ${isShiftDeposited(depositData.shift) ? 'opacity-50 pointer-events-none' : ''}`}>
                  {denominationsList.map((denom) => (
                    <div key={denom} className="flex flex-col gap-1 bg-white p-2 rounded-xl border border-gray-100 shadow-sm group hover:border-sky-200 transition-all">
                      <div className="flex items-center justify-between border-b border-gray-50 pb-1 mb-1">
                        <span className="text-[10px] font-black text-gray-400 group-hover:text-sky-600">₹{denom}</span>
                        <span className="text-[9px] font-bold text-sky-600/40 uppercase">₹{(denom * (depositData.denominations[denom] || 0)).toLocaleString()}</span>
                      </div>
                      <div className="flex items-center gap-1.5 justify-center">
                        <span className="text-[10px] text-gray-200">×</span>
                        <input
                          type="number"
                          placeholder="0"
                          min="0"
                          className="w-full bg-transparent border-none p-0 text-sm font-black text-gray-700 focus:ring-0 placeholder:text-gray-200 text-center"
                          value={depositData.denominations[denom] || ''}
                          onChange={(e) => handleDenominationChange(e.target.value, denom, 'deposit')}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest pl-1">Mandatory Description</label>
                <textarea
                  required
                  rows={2}
                  disabled={isShiftDeposited(depositData.shift)}
                  className="w-full bg-gray-50 border border-gray-100 rounded-xl px-4 py-3 text-sm font-bold text-gray-700 focus:ring-4 focus:ring-sky-500/10 focus:border-sky-500 transition-all outline-none resize-none disabled:bg-gray-100 disabled:text-gray-400"
                  placeholder="E.g. Collected cash from 5 agents for Shift 1"
                  value={depositData.description}
                  onChange={(e) => setDepositData({ ...depositData, description: e.target.value })}
                />
              </div>

              <div className="flex items-center justify-between px-5 py-4 rounded-2xl shadow-lg text-white bg-sky-600 shadow-sky-600/20">
                <div className="flex flex-col">
                  <p className="text-[9px] font-black uppercase tracking-[0.2em] opacity-60 mb-0.5">Total Deposit Value</p>
                  <h4 className="text-2xl font-black tracking-tight">₹{(depositData.amount || 0).toFixed(2)}</h4>
                </div>
              </div>

              <button
                type="submit"
                disabled={isSubmitting || depositData.amount <= 0 || !depositData.description || isShiftDeposited(depositData.shift)}
                className="w-full bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 text-amber-950 font-black text-base py-3.5 rounded-xl active:scale-[0.98] transition-all flex items-center justify-center gap-2 disabled:opacity-50 shadow-xl shadow-amber-900/20"
              >
                {isSubmitting ? <Loader2 className="animate-spin" size={20} /> : <><CheckCircle2 size={20} />Confirm & Submit Deposit</>}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* ========== EDIT STORE SAFE MODAL ========== */}
      {showEditStoreModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
          <div className="bg-white w-full max-w-lg rounded-[2rem] p-6 shadow-2xl flex flex-col gap-4 animate-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-emerald-50 rounded-xl flex items-center justify-center text-emerald-600">
                  <Pencil size={20} />
                </div>
                <div>
                  <h3 className="text-lg font-black text-gray-900 leading-tight">Edit Opening Cash</h3>
                  <p className="text-[9px] font-bold text-gray-400 uppercase tracking-widest leading-tight">Correct the daily starting safe balance</p>
                </div>
              </div>
              <button
                onClick={() => setShowEditStoreModal(false)}
                className="p-1.5 hover:bg-gray-100 rounded-lg text-gray-400 transition-colors"
              >
                <X size={18} />
              </button>
            </div>

            <div className="space-y-4">
              <div className="grid grid-cols-3 gap-2 py-2">
                {denominationsList.map((denom) => (
                  <div key={denom} className="flex flex-col gap-1 bg-gray-50 p-2 rounded-xl border border-gray-100 group hover:border-emerald-200 transition-all">
                    <span className="text-[10px] font-black text-gray-400 group-hover:text-emerald-600">₹{denom}</span>
                    <input
                      type="number"
                      placeholder="0"
                      min="0"
                      className="w-full bg-transparent border-none p-0 text-sm font-black text-gray-700 focus:ring-0 placeholder:text-gray-200"
                      value={storeDenomData.denominations[denom] || ''}
                      onChange={(e) => handleDenominationChange(e.target.value, denom, 'store')}
                    />
                  </div>
                ))}
              </div>

              <div className="flex items-center justify-between px-5 py-4 rounded-2xl shadow-lg text-white bg-emerald-600 shadow-emerald-600/20">
                <div className="flex flex-col">
                  <p className="text-[9px] font-black uppercase tracking-[0.2em] opacity-60 mb-0.5">Corrected Total</p>
                  <h4 className="text-2xl font-black tracking-tight">₹{(storeDenomData.amount || 0).toFixed(2)}</h4>
                </div>
              </div>

              <button
                onClick={handleUpdateStoreRegister}
                disabled={isSubmitting || storeDenomData.amount <= 0}
                className="w-full bg-emerald-600 text-white font-black text-base py-3.5 rounded-xl active:scale-[0.98] transition-all flex items-center justify-center gap-2 hover:bg-emerald-700 disabled:opacity-50"
              >
                {isSubmitting ? <Loader2 className="animate-spin" size={20} /> : <><CheckCircle2 size={20} />Confirm Corrections</>}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========== EDIT DEPOSIT MODAL ========== */}
      {showEditDepositModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
          <div className="bg-white w-full max-w-lg rounded-[2rem] p-6 shadow-2xl flex flex-col gap-4 animate-in zoom-in-95 duration-200 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-sky-50 rounded-xl flex items-center justify-center text-sky-600">
                  <Pencil size={20} />
                </div>
                <div>
                  <h3 className="text-lg font-black text-gray-900 leading-tight">Edit Shift {depositData.shift} Deposit</h3>
                  <p className="text-[9px] font-bold text-gray-400 uppercase tracking-widest leading-tight">Adjust collected amount or description</p>
                </div>
              </div>
              <button
                onClick={() => {
                  setShowEditDepositModal(false);
                  setEditingDeposit(null);
                }}
                className="p-1.5 hover:bg-gray-100 rounded-lg text-gray-400 transition-colors"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleUpdateDeposit} className="space-y-4">
              <div className="space-y-2">
                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest pl-1">Denominations to Adjust</label>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 bg-gray-50/50 p-2 rounded-2xl border border-gray-100">
                  {denominationsList.map((denom) => (
                    <div key={denom} className="flex flex-col gap-1 bg-white p-2 rounded-xl border border-gray-100 shadow-sm group hover:border-sky-200 transition-all">
                      <div className="flex items-center justify-between border-b border-gray-50 pb-1 mb-1">
                        <span className="text-[10px] font-black text-gray-400 group-hover:text-sky-600">₹{denom}</span>
                        <span className="text-[9px] font-bold text-sky-600/40 uppercase">₹{(denom * (depositData.denominations[denom] || 0)).toLocaleString()}</span>
                      </div>
                      <div className="flex items-center gap-1.5 justify-center">
                        <span className="text-[10px] text-gray-200">×</span>
                        <input
                          type="number"
                          placeholder="0"
                          min="0"
                          className="w-full bg-transparent border-none p-0 text-sm font-black text-gray-700 focus:ring-0 placeholder:text-gray-200 text-center"
                          value={depositData.denominations[denom] || ''}
                          onChange={(e) => handleDenominationChange(e.target.value, denom, 'deposit')}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest pl-1">Correction Description</label>
                <textarea
                  required
                  rows={2}
                  className="w-full bg-gray-50 border border-gray-100 rounded-xl px-4 py-3 text-sm font-bold text-gray-700 focus:ring-4 focus:ring-sky-500/10 focus:border-sky-500 transition-all outline-none resize-none"
                  placeholder="Reason for editing this deposit..."
                  value={depositData.description}
                  onChange={(e) => setDepositData({ ...depositData, description: e.target.value })}
                />
              </div>

              <div className="flex items-center justify-between px-5 py-4 rounded-2xl shadow-lg text-white bg-sky-600 shadow-sky-600/20">
                <div className="flex flex-col">
                  <p className="text-[9px] font-black uppercase tracking-[0.2em] opacity-60 mb-0.5">Corrected Deposit Value</p>
                  <h4 className="text-2xl font-black tracking-tight">₹{(depositData.amount || 0).toFixed(2)}</h4>
                </div>
              </div>

              <button
                type="submit"
                disabled={isSubmitting || depositData.amount <= 0 || !depositData.description}
                className="w-full bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 text-amber-950 font-black text-base py-3.5 rounded-xl active:scale-[0.98] transition-all flex items-center justify-center gap-2 disabled:opacity-50 shadow-xl shadow-amber-900/20"
              >
                {isSubmitting ? <Loader2 className="animate-spin" size={20} /> : <><CheckCircle2 size={20} />Save Changes</>}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* ========== UNAPPROVED WARNING MODAL ========== */}
      {showUnapprovedWarning && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/60 backdrop-blur-md p-4 animate-in fade-in duration-300">
          <div className="bg-white w-full max-w-md rounded-[2.5rem] p-8 shadow-2xl flex flex-col items-center text-center gap-6 animate-in zoom-in-95 duration-300">
            <div className="w-20 h-20 bg-amber-50 rounded-3xl flex items-center justify-center text-amber-500 shadow-inner">
              <AlertTriangle size={40} strokeWidth={2.5} className="animate-bounce" />
            </div>
            
            <div className="space-y-2">
              <h3 className="text-xl font-black text-gray-900 leading-tight">Wait! Unapproved Collections Found</h3>
              <p className="text-sm font-medium text-gray-500 leading-relaxed">
                There are <span className="text-amber-600 font-black">{unapprovedInfo.count} vehicle collection(s)</span> in Shift {unapprovedInfo.shift} that are not yet approved by you. 
              </p>
              <p className="text-xs font-bold text-gray-400 uppercase tracking-widest pt-2">
                Are you sure you want to continue to deposit cash in the store safe?
              </p>
            </div>

            <div className="flex flex-col w-full gap-3">
              <button
                onClick={() => {
                  setShowUnapprovedWarning(false);
                  handleCreateDeposit(null, true);
                }}
                className="w-full bg-amber-500 hover:bg-amber-600 text-white font-black py-4 rounded-2xl transition-all shadow-xl shadow-amber-500/20 active:scale-95"
              >
                Yes, Continue Deposit
              </button>
              <button
                onClick={() => {
                  setShowUnapprovedWarning(false);
                  setShowDepositModal(false);
                  setActiveTab('reconciliation');
                }}
                className="w-full bg-gray-100 hover:bg-gray-200 text-gray-600 font-bold py-4 rounded-2xl transition-all active:scale-95"
              >
                No, Let Me Review Agents
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========== BANK DEPOSIT MODAL ========== */}
      {showBankModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
          <div className="bg-white w-full max-w-lg rounded-[2.5rem] p-8 shadow-2xl flex flex-col gap-6 animate-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 bg-sky-50 rounded-2xl flex items-center justify-center text-sky-600">
                  <Building2 size={24} />
                </div>
                <div>
                  <h3 className="text-xl font-black text-gray-900 leading-tight">Bank Deposit</h3>
                  <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest leading-tight">Transfer cash from safe to account</p>
                </div>
              </div>
              <button onClick={() => setShowBankModal(false)} className="p-2 hover:bg-gray-100 rounded-xl text-gray-400"><X size={20} /></button>
            </div>

            <form onSubmit={handleCreateBankDeposit} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest pl-1">Amount to Transfer</label>
                  <input
                    type="number"
                    required
                    className="w-full bg-gray-50 border border-gray-100 rounded-xl px-4 py-3 text-lg font-black text-gray-900 focus:ring-4 focus:ring-sky-500/10 outline-none"
                    placeholder="0.00"
                    value={bankData.amount || ''}
                    onChange={(e) => setBankData({ ...bankData, amount: parseFloat(e.target.value) || 0 })}
                  />
                  <p className="text-[9px] font-bold text-gray-400 uppercase pl-1">Available: ₹{storeRegisterData.liveMetrics.liveAvailable.toFixed(2)}</p>
                </div>
                <div className="space-y-1.5">
                  <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest pl-1">Branch Name</label>
                  <input
                    type="text"
                    required
                    className="w-full bg-gray-50 border border-gray-100 rounded-xl px-4 py-3 text-sm font-bold text-gray-900 focus:ring-4 focus:ring-sky-500/10 outline-none"
                    placeholder="E.g. HDFC Main Branch"
                    value={bankData.branchName}
                    onChange={(e) => setBankData({ ...bankData, branchName: e.target.value })}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest pl-1">Deposited By</label>
                  <input
                    type="text"
                    required
                    className="w-full bg-gray-50 border border-gray-100 rounded-xl px-4 py-3 text-sm font-bold text-gray-900 focus:ring-4 focus:ring-sky-500/10 outline-none"
                    value={bankData.depositedBy}
                    onChange={(e) => setBankData({ ...bankData, depositedBy: e.target.value })}
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest pl-1">Admin (Verified By)</label>
                  <div className="w-full bg-gray-100 border border-gray-200 rounded-xl px-4 py-3 text-sm font-black text-gray-500">
                    {user?.name}
                  </div>
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest pl-1">Deposit Receipt</label>
                <div className="relative group cursor-pointer">
                  <input
                    type="file"
                    accept="image/*"
                    className="absolute inset-0 opacity-0 cursor-pointer z-10"
                    onChange={async (e) => {
                      const file = e.target.files[0];
                      if (file) {
                        const formData = new FormData();
                        formData.append('image', file);
                        try {
                          const { data } = await adminAPI.uploadProductImage(formData);
                          setBankData({ ...bankData, receiptImage: data.data.url }); // Assuming standard response
                          toast.success('Receipt uploaded successfully');
                        } catch (err) {
                          toast.error('Scan upload failed');
                        }
                      }
                    }}
                  />
                  <div className={`w-full py-8 border-2 border-dashed rounded-[2rem] flex flex-col items-center justify-center gap-3 transition-all ${bankData.receiptImage ? 'border-emerald-200 bg-emerald-50 text-emerald-600' : 'border-gray-200 bg-gray-50 text-gray-400 group-hover:border-sky-300'}`}>
                    {bankData.receiptImage ? (
                      <div className="flex flex-col items-center">
                        <CheckCircle2 size={32} />
                        <span className="text-[10px] font-black uppercase tracking-widest mt-2">Receipt Attached</span>
                      </div>
                    ) : (
                      <>
                        <UploadCloud size={32} />
                        <span className="text-[10px] font-black uppercase tracking-widest">Click to upload deposit slip</span>
                      </>
                    )}
                  </div>
                </div>
              </div>

              <button
                type="submit"
                disabled={isSubmitting || bankData.amount <= 0 || !bankData.branchName}
                className="w-full bg-sky-600 hover:bg-sky-700 text-white font-black py-4 rounded-2xl transition-all shadow-xl shadow-sky-900/20 active:scale-95 flex items-center justify-center gap-2"
              >
                {isSubmitting ? <Loader2 className="animate-spin" size={20} /> : <><Building2 size={20} />Confirm Bank Transfer</>}
              </button>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
