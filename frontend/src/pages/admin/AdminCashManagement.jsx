import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { Coins, Truck, Search, Calendar, CheckCircle2, AlertCircle, AlertTriangle, Clock, Info, ArrowRight, Eye, Plus, Loader2, X, Pencil, Trash2, Sun, Moon, ArrowLeft, Building2, Camera, UploadCloud, User, BookOpen, ArrowDownLeft, ArrowUpRight, Shield, Lock, Vault, Printer, FileText, ExternalLink } from 'lucide-react';
import { useSearchParams, useNavigate, useLocation } from 'react-router-dom';
import StoreSelector from './StoreSelector';
import { useUserStore } from '../../store/userStore';
import { getAdminReconciliation, adminSubmitOpeningCash, adminUpdateReconciliation, adminDeleteReconciliation, adminReviewClosing, getStoreCashRegister, getStoreCashLedger, createSafeMovement, openStoreCashRegister, closeStoreCashRegister, createStoreDeposit, updateStoreCashRegister, updateStoreDeposit, deleteStoreDeposit, addBankDeposit, resetStoreCashRegister } from '../../services/cashService';
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
  const [previewImage, setPreviewImage] = useState(null);

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
  const [storeModalStep, setStoreModalStep] = useState('VERIFY'); // 'VERIFY' or 'INPUT'
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

  const [showDepositConfirmModal, setShowDepositConfirmModal] = useState(false);
  const [depositConfirmData, setDepositConfirmData] = useState(null);

  const [viewingAgentDenoms, setViewingAgentDenoms] = useState(null);

  // Edit Store Safe/Deposit States
  const [showEditStoreModal, setShowEditStoreModal] = useState(false);
  const [showEditDepositModal, setShowEditDepositModal] = useState(false);
  const [editingDeposit, setEditingDeposit] = useState(null);

  // Ledger State
  const [ledgerData, setLedgerData] = useState(null);
  const [ledgerLoading, setLedgerLoading] = useState(false);
  const [showSafeMovementModal, setShowSafeMovementModal] = useState(false);
  const [safeMovementData, setSafeMovementData] = useState({
    amount: '',
    type: 'DEPOSIT', // DEPOSIT to safe, WITHDRAW from safe
    description: '',
    denominations: {
      500: 0, 200: 0, 100: 0, 50: 0, 20: 0, 10: 0, 5: 0, 2: 0, 1: 0
    }
  });

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
    } else if (type === 'safe') {
      const newDenoms = { ...safeMovementData.denominations, [denom]: qty };
      const total = Object.entries(newDenoms).reduce((sum, [d, q]) => sum + (parseInt(d) * q), 0);
      setSafeMovementData({ ...safeMovementData, denominations: newDenoms, amount: total });
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

  const fetchLedger = async () => {
    setLedgerLoading(true);
    try {
      const data = await getStoreCashLedger(date);
      setLedgerData(data);
    } catch (error) {
      setLedgerData(null);
    } finally {
      setLedgerLoading(false);
    }
  };

  useEffect(() => {
    fetchSummaries();
    fetchVehicles();
    fetchStoreRegister();
  }, [date]);

  // Lazy-load ledger when tab is active
  useEffect(() => {
    if (['ledger', 'bank_history', 'safe_history'].includes(activeTab)) {
      fetchLedger();
    }
  }, [activeTab, date]);

  // 🆕 Reset Modal Step & Automate Auto-fill from yesterday
  useEffect(() => {
    if (showOpenStoreModal) {
      if (storeRegisterData?.previousRegister) {
        setStoreModalStep('VERIFY');
        const denoms = storeRegisterData.previousRegister.closingDenominations || {};
        setStoreDenomData({
          amount: storeRegisterData.previousRegister.actualClosingCash,
          denominations: { ...denoms }
        });
      } else {
        setStoreModalStep('INPUT');
        setStoreDenomData({
          amount: 0,
          denominations: { "500": 0, "200": 0, "100": 0, "50": 0, "20": 0, "10": 0, "5": 0, "2": 0, "1": 0 }
        });
      }
    }
  }, [showOpenStoreModal, storeRegisterData?.previousRegister]);

  const handleSafeMovement = async (e) => {
    const amount = parseFloat(safeMovementData.amount);
    if (!amount || amount <= 0) {
      return toast.error('Enter a valid amount');
    }

    // 🆕 Strict bounds validation
    if (safeMovementData.type === 'DEPOSIT') {
      const available = storeRegisterData?.liveMetrics?.availableCash || 0;
      if (amount > available) {
        return toast.error(`Limit Exceeded: You cannot move more than the available cash on hand (Max: ₹${Math.max(0, available).toFixed(2)})`);
      }
    } else if (safeMovementData.type === 'WITHDRAW') {
      const safe = storeRegisterData?.liveMetrics?.safeBalance || 0;
      if (amount > safe) {
        return toast.error(`Limit Exceeded: You cannot withdraw more than the currently available safe balance (Max: ₹${Math.max(0, safe).toFixed(2)})`);
      }
    }

    try {
      await createSafeMovement({
        date,
        amount: parseFloat(safeMovementData.amount),
        type: safeMovementData.type,
        description: safeMovementData.description,
        denominations: safeMovementData.denominations
      });
      toast.success(safeMovementData.type === 'DEPOSIT' ? 'Moved to Safe' : 'Moved to Available');
      setShowSafeMovementModal(false);
      setSafeMovementData({
        amount: '',
        type: 'DEPOSIT',
        description: '',
        denominations: { 500: 0, 200: 0, 100: 0, 50: 0, 20: 0, 10: 0, 5: 0, 2: 0, 1: 0 }
      });
      fetchStoreRegister();
      if (activeTab === 'ledger') fetchLedger();
    } catch (error) {
      toast.error('Failed to record movement');
    }
  };

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
      fetchStoreRegister();
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

  const handleInitiateDeposit = (shiftOverride, force = false) => {
    // Determine which shift to handle
    const shiftToDeposit = (typeof shiftOverride === 'number') ? shiftOverride : depositData.shift;

    // Hard block if no completions exist for this specific shift
    if (!hasShiftCompletions(shiftToDeposit)) {
      return toast.error(`Shift ${shiftToDeposit} cannot be deposited yet because no agents have submitted their closing reports for this shift.`);
    }

    // Check for unapproved collections in this shift
    const shiftKey = `shift${shiftToDeposit}`;
    const unapproved = summaries.filter(s => {
      // Must have an opening block to be considered for this shift
      const opening = s.shiftDetails?.[shiftKey]?.opening;
      if (!opening) return false;

      const closing = s.shiftDetails?.[shiftKey]?.closing;
      // Flag as unapproved if they haven't closed yet or are unapproved
      return !closing || closing.status !== 'APPROVED';
    });

    if (unapproved.length > 0 && !force) {
      setUnapprovedInfo({ count: unapproved.length, shift: shiftToDeposit });
      setDepositData({ ...depositData, shift: shiftToDeposit, description: '' });
      setShowUnapprovedWarning(true);
      return;
    }

    // Auto-calculate the total actual cash to deposit
    const autoAmount = summaries.reduce((sum, s) => {
      const closing = s.shiftDetails?.[shiftKey]?.closing;
      return sum + (closing?.actualCash || 0);
    }, 0);

    if (autoAmount <= 0) return toast.error(`No cash collected for Shift ${shiftToDeposit}`);

    const totalDenominations = { "500": 0, "200": 0, "100": 0, "50": 0, "20": 0, "10": 0, "5": 0, "2": 0, "1": 0 };
    summaries.forEach((s) => {
      const closing = s.shiftDetails?.[shiftKey]?.closing;
      if (closing?.denominations) {
        Object.entries(closing.denominations).forEach(([denom, count]) => {
          totalDenominations[denom] += parseInt(count) || 0;
        });
      }
    });

    setDepositConfirmData({
      shift: shiftToDeposit,
      amount: autoAmount,
      denominations: totalDenominations,
      description: (force && depositData.description) ? depositData.description : `Consolidated Deposit for Shift ${shiftToDeposit}`
    });
    setShowDepositConfirmModal(true);
  };

  const handleConfirmDeposit = async () => {
    if (!depositConfirmData) return;
    setIsSubmitting(true);
    try {
      await createStoreDeposit({
        date,
        shift: depositConfirmData.shift,
        amount: depositConfirmData.amount,
        denominations: depositConfirmData.denominations,
        description: depositConfirmData.description
      });
      toast.success(`Shift ${depositConfirmData.shift} cash deposited successfully`);
      setShowDepositConfirmModal(false);
      setDepositConfirmData(null);
      fetchStoreRegister();
      if (activeTab === 'ledger') fetchLedger();
      fetchStoreRegister();
      if (activeTab === 'ledger') fetchLedger();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to create deposit');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handlePrintShiftReport = (shift, shiftData, aggregatedDenoms, totalCash) => {
    const depositDetails = storeRegisterData?.storeDeposits?.find(d => d.shift === shift);
    const adminName = depositDetails?.user?.name || user?.name || 'Authorized Admin';
    const reportDate = format(new Date(date), 'dd MMMM yyyy');

    const printWindow = window.open('', '_blank');
    printWindow.document.write(`
      <html>
        <head>
          <title>Shift Deposit Report - ${date}</title>
          <style>
            @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;600;700;800&display=swap');
            * { margin: 0; padding: 0; box-sizing: border-box; }
            body { font-family: 'Inter', sans-serif; background-color: #f3f4f6; color: #1f2937; padding: 20px; line-height: 1.4; }
            
            /* A4 Perspective Container */
            .a4-container {
               width: 210mm;
               min-height: 297mm;
               padding: 2.54cm; /* Standard margins */
               margin: 0 auto;
               background: white;
               box-shadow: 0 10px 25px rgba(0,0,0,0.1);
               border: 1px solid #e5e7eb;
               position: relative;
               display: flex;
               flex-direction: column;
            }

            .header { display: flex; justify-content: space-between; align-items: start; border-bottom: 3px solid #059669; padding-bottom: 20px; margin-bottom: 30px; }
            .logo-section h1 { font-size: 28px; font-weight: 800; color: #059669; letter-spacing: -1px; }
            .logo-section p { font-size: 10px; font-weight: 700; color: #6b7280; text-transform: uppercase; letter-spacing: 1px; }
            
            .report-info { text-align: right; }
            .report-id { font-size: 10px; font-weight: 800; color: #9ca3af; text-transform: uppercase; }
            .report-val { font-size: 14px; font-weight: 700; color: #111827; }

            .main-title { text-align: center; margin-bottom: 35px; border-bottom: 1px solid #f1f1f1; padding-bottom: 15px; }
            .main-title h2 { font-size: 18px; text-transform: uppercase; letter-spacing: 3px; color: #374151; font-weight: 800; }

            .meta-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 40px; margin-bottom: 30px; }
            .meta-box { background: #f9fafb; padding: 15px; border-radius: 12px; border: 1px solid #f1f1f1; }
            .meta-label { font-size: 9px; font-weight: 800; color: #9ca3af; text-transform: uppercase; margin-bottom: 4px; }
            .meta-value { font-size: 13px; font-weight: 700; }

            table { width: 100%; border-collapse: collapse; margin-bottom: 30px; }
            th { text-align: left; background: #f3f4f6; padding: 10px 12px; font-size: 9px; font-weight: 800; color: #4b5563; text-transform: uppercase; border: 1px solid #e5e7eb; }
            td { padding: 10px 12px; font-size: 11px; border: 1px solid #e5e7eb; vertical-align: top; }
            
            .v-num { font-size: 12px; font-weight: 800; color: #111827; margin-bottom: 3px; }
            .v-denoms { display: flex; flex-wrap: wrap; gap: 4px; margin-top: 5px; }
            .v-denom-pill { font-size: 8px; font-weight: 700; background: #f0fdf4; color: #166534; padding: 1px 5px; border-radius: 4px; border: 1px solid #dcfce7; }

            .total-section { background: #111827; color: white; padding: 15px 20px; border-radius: 8px; display: flex; justify-content: space-between; align-items: center; margin-bottom: 30px; }
            .total-label { font-size: 12px; font-weight: 800; text-transform: uppercase; letter-spacing: 1px; }
            .total-value { font-size: 22px; font-weight: 800; font-family: 'Inter', monospace; }

            .cons-denoms { margin-bottom: 30px; border: 1px solid #e5e7eb; border-radius: 12px; padding: 15px; }
            .cons-title { font-size: 10px; font-weight: 800; color: #9ca3af; text-transform: uppercase; margin-bottom: 12px; border-bottom: 1px solid #f1f1f1; padding-bottom: 8px; }
            .cons-grid { display: grid; grid-template-columns: repeat(9, 1fr); gap: 8px; }
            .cons-item { text-align: center; border-right: 1px solid #f1f1f1; }
            .cons-item:last-child { border-right: none; }
            .cons-d { font-size: 9px; font-weight: 700; color: #6b7280; }
            .cons-c { font-size: 12px; font-weight: 800; color: #111827; }

            .notes-area { margin-bottom: 40px; }
            .notes-box { border-bottom: 1px dotted #9ca3af; min-height: 40px; padding: 10px 0; font-size: 11px; }

            .signature-section { margin-top: auto; display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 30px; padding-top: 40px; border-top: 1px solid #f1f1f1; }
            .sig-box { text-align: center; }
            .sig-line { border-top: 1px solid #1f2937; margin-bottom: 8px; }
            .sig-label { font-size: 10px; font-weight: 800; text-transform: uppercase; color: #6b7280; }

            @media print {
              body { background: white; padding: 0; }
              .a4-container { box-shadow: none; border: none; width: 100%; margin: 0; height: auto; }
              .no-print { display: none; }
            }
          </style>
        </head>
        <body>
          <div class="a4-container">
            <div class="header">
              <div class="logo-section">
                <h1>VILLAGKART</h1>
                <p>Advanced Sales Tracking System</p>
              </div>
              <div class="report-info">
                <div class="report-id">Document No</div>
                <div class="report-val">REP/CASH/${date.replace(/-/g, '')}/${shift}</div>
              </div>
            </div>

            <div class="main-title">
              <h2>Shift Deposit Report</h2>
            </div>

            <div class="meta-grid">
              <div class="meta-box">
                 <div class="meta-label">Operation Details</div>
                 <div class="meta-value">Store: VILLAGKART MAIN OFFICE</div>
                 <div class="meta-value">Collection Date: ${reportDate}</div>
              </div>
              <div class="meta-box" style="border-left: 4px solid ${shift === 1 ? '#f59e0b' : '#6366f1'}">
                 <div class="meta-label">Shift Identification</div>
                 <div class="meta-value" style="font-size: 16px">${shift === 1 ? 'Day' : 'Night'} (Shift ${shift})</div>
                 <div class="meta-value" style="color: #059669">${depositDetails ? 'Status: DEPOSITED' : 'Status: PENDING'}</div>
              </div>
            </div>

            <table>
              <thead>
                <tr>
                  <th style="width: 45%">Vehicle (Route) & Denominations</th>
                  <th style="width: 25%">Agent Name</th>
                  <th style="width: 15%">Status</th>
                  <th style="width: 15%; text-align: right">Amount</th>
                </tr>
              </thead>
              <tbody>
                ${shiftData.map(v => {
      const denoms = v.closing?.denominations || {};
      const activeDenoms = Object.entries(denoms).filter(([_, count]) => count > 0);

      return `
                    <tr>
                      <td>
                        <div class="v-num">${v.vehicle}</div>
                        <div class="v-denoms">
                          ${activeDenoms.length > 0 ? activeDenoms.map(([d, c]) => `
                            <span class="v-denom-pill">₹${d} × ${c}</span>
                          `).join('') : '<span class="v-denom-pill" style="background:#fef2f2; color:#991b1b; border-color:#fee2e2">No Denoms</span>'}
                        </div>
                      </td>
                      <td style="font-weight: 700">${v.agentName}</td>
                      <td style="font-weight: 700; color: ${v.closing ? '#059669' : '#b45309'}">${v.closing ? 'CLOSED' : 'PENDING'}</td>
                      <td style="text-align: right; font-weight: 800; font-family: monospace">₹${(v.closing?.actualCash || 0).toFixed(2)}</td>
                    </tr>
                  `;
    }).join('')}
              </tbody>
            </table>

            <div class="total-section">
              <div class="total-label">Grand Total Shift Handover</div>
              <div class="total-value">₹${totalCash.toFixed(2)}</div>
            </div>

            <div class="cons-denoms">
              <div class="cons-title">Physical Cash Inventory Summary (Consolidated)</div>
              <div class="cons-grid">
                ${[500, 200, 100, 50, 20, 10, 5, 2, 1].map(d => {
      const count = aggregatedDenoms[d] || 0;
      return `
                    <div class="cons-item">
                      <div class="cons-d">₹${d}</div>
                      <div class="cons-c">${count}</div>
                    </div>
                  `;
    }).join('')}
              </div>
            </div>

            <div class="notes-area">
               <div class="meta-label">Approver Remarks / Physical Discrepancy Notes</div>
               <div class="notes-box">${depositDetails?.description || 'No remarks provided.'}</div>
            </div>

            <div class="signature-section">
              <div class="sig-box">
                <div class="sig-line"></div>
                <div class="sig-label">Driver / Agent Signal</div>
                <div style="font-size: 8px; color: #9ca3af; margin-top: 5px">I hereby confirm the physical handover of above cash.</div>
              </div>
              <div class="sig-box">
                <div class="sig-line"></div>
                <div class="sig-label">Cashier / Verifier</div>
                <div style="font-size: 11px; font-weight: 800; margin-bottom: 2px">${adminName}</div>
                <div style="font-size: 8px; color: #9ca3af">System Authorized ID</div>
              </div>
              <div class="sig-box">
                <div class="sig-line"></div>
                <div class="sig-label">Operations Manager</div>
                <div style="font-size: 8px; color: #9ca3af; margin-top: 5px">Official Seal Required</div>
              </div>
            </div>
          </div>

          <div class="no-print" style="position: fixed; bottom: 30px; left: 50%; transform: translateX(-50%); display: flex; gap: 15px;">
            <button onclick="window.print()" style="background: #111827; color: white; border: none; padding: 14px 28px; border-radius: 12px; font-weight: 800; cursor: pointer; box-shadow: 0 10px 15px -3px rgba(0,0,0,0.2); display: flex; items-center: center gap: 10px;">
              Print Document
            </button>
            <button onclick="window.close()" style="background: white; color: #374151; border: 1px solid #e5e7eb; padding: 14px 28px; border-radius: 12px; font-weight: 800; cursor: pointer;">
              Close Preview
            </button>
          </div>
        </body>
      </html>
    `);
    printWindow.document.close();
  };

  const handleCreateBankDeposit = async (e) => {
    if (e) e.preventDefault();
    if (bankData.amount <= 0) return toast.error('Enter valid amount');
    if (!bankData.branchName) return toast.error('Branch name is mandatory');
    if (bankData.amount > (storeRegisterData?.liveMetrics?.safeBalance || 0)) {
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
      if (activeTab === 'ledger') fetchLedger();
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
    if (!editingDeposit?.id) {
      return toast.error('No deposit selected for editing');
    }
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
      console.error('[UpdateDeposit Error]:', err);
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
      if (activeTab === 'ledger') fetchLedger();
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
      fetchStoreRegister();
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
      fetchStoreRegister();
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
      fetchStoreRegister();
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
    <>
      {showDepositModal ? (
        <div className="bg-white rounded-[2.5rem] border border-gray-100 overflow-hidden flex flex-col shadow-sm animate-in fade-in slide-in-from-bottom-4 duration-300 min-h-[calc(100vh-6rem)] relative z-20">
          <div className="bg-white border-b border-gray-100 sticky top-0 z-10 px-8 py-5 flex items-center justify-between shadow-sm">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-sky-50 rounded-2xl flex items-center justify-center text-sky-600">
                <Coins size={24} />
              </div>
              <div>
                <h2 className="text-2xl font-black text-gray-900 tracking-tight">Deposit Shift Cash Report</h2>
                <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mt-1">Review Agent Collections & Submit to Store Safe</p>
              </div>
            </div>
            <button
              onClick={() => setShowDepositModal(false)}
              className="px-6 py-3 bg-gray-100 hover:bg-rose-50 text-gray-600 hover:text-rose-600 rounded-xl transition-all shadow-sm flex items-center gap-2 font-black text-xs uppercase"
            >
              <X size={18} /> Close View
            </button>
          </div>

          <div className="flex-1 p-8 w-full space-y-6 pb-32">
            {/* TABS NAVIGATION */}
            <div className="flex gap-2 bg-gray-100 p-1.5 rounded-2xl w-fit mx-auto md:mx-0">
              {[1, 2].map((s) => (
                <button
                  type="button"
                  key={s}
                  onClick={() => setDepositData({ ...depositData, shift: s })}
                  className={`px-8 py-3 rounded-xl text-xs font-black uppercase tracking-wider transition-all flex items-center gap-2 ${depositData.shift === s ? (s === 1 ? 'bg-amber-500 text-white shadow-xl shadow-amber-500/20' : 'bg-indigo-500 text-white shadow-xl shadow-indigo-500/20') : 'text-gray-400 hover:text-gray-600 hover:bg-gray-200'}`}
                >
                  {s === 1 ? <Sun size={16} /> : <Moon size={16} />}
                  Shift {s}
                </button>
              ))}
            </div>

            {/* TAB CONTENT */}
            {(() => {
              const shift = depositData.shift || 1;
              const shiftKey = `shift${shift}`;
              const shiftAgents = summaries.filter(s => s.shiftDetails?.[shiftKey]?.opening);

              if (shiftAgents.length === 0) return (
                <div key={shift} className={`bg-white rounded-[2rem] border overflow-hidden shadow-sm p-12 text-center flex flex-col items-center justify-center border-dashed animate-in fade-in duration-300 ${shift === 1 ? 'border-amber-200' : 'border-indigo-200'}`}>
                  {shift === 1 ? <Sun size={48} className="text-amber-200 mb-4" /> : <Moon size={48} className="text-indigo-200 mb-4" />}
                  <h3 className="text-lg font-black text-gray-300 uppercase tracking-widest">No Assignment for Shift {shift}</h3>
                </div>
              );

              const isDeposited = isShiftDeposited(shift);
              const hasCompletions = hasShiftCompletions(shift);
              const totalCashCollected = shiftAgents.reduce((sum, s) => sum + (s.shiftDetails?.[shiftKey]?.closing?.actualCash || 0), 0);

              const aggregatedDenominations = { "500": 0, "200": 0, "100": 0, "50": 0, "20": 0, "10": 0, "5": 0, "2": 0, "1": 0 };
              shiftAgents.forEach(agentSum => {
                const closingDenoms = agentSum.shiftDetails[shiftKey].closing?.denominations;
                if (closingDenoms) {
                  Object.keys(closingDenoms).forEach(d => {
                    aggregatedDenominations[d] += parseInt(closingDenoms[d]) || 0;
                  });
                }
              });

              return (
                <div key={shift} className={`bg-white rounded-[2rem] border overflow-hidden shadow-sm animate-in fade-in duration-300 ${shift === 1 ? 'border-amber-100' : 'border-indigo-100'}`}>
                  <div className={`px-6 py-5 flex items-center justify-between border-b ${shift === 1 ? 'bg-amber-50/50 border-amber-100' : 'bg-indigo-50/50 border-indigo-100'}`}>
                    <div className="flex items-center gap-3">
                      <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-white ${shift === 1 ? 'bg-amber-500' : 'bg-indigo-500'}`}>
                        {shift === 1 ? <Sun size={20} /> : <Moon size={20} />}
                      </div>
                      <div>
                        <h3 className={`text-lg font-black uppercase tracking-tight ${shift === 1 ? 'text-amber-900' : 'text-indigo-900'}`}>
                          Shift {shift} Collection Report
                        </h3>
                        <div className="flex items-center gap-3 mt-1.5 flex-wrap">
                          {isDeposited ? (
                            <span className="text-[10px] font-black bg-emerald-100 text-emerald-700 px-2.5 py-1 rounded-lg uppercase tracking-widest flex items-center gap-1.5 w-fit">
                              <CheckCircle2 size={12} /> Deposited
                            </span>
                          ) : (
                            <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest block bg-gray-100 px-2.5 py-1 rounded-lg w-fit">Awaiting Deposit</span>
                          )}

                        </div>
                      </div>
                    </div>

                    {isDeposited && (
                      <div className="flex flex-col items-end">
                        <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest">Submitted By</p>
                        <p className="text-[11px] font-black text-emerald-600 uppercase tracking-tight">
                          {storeRegisterData?.storeDeposits?.find(d => d.shift === shift)?.user?.name || 'Admin'}
                        </p>
                      </div>
                    )}
                  </div>

                  <div className="p-6">
                    <div className="overflow-x-auto">
                      <table className="w-full text-left">
                        <thead>
                          <tr className="border-b border-gray-100 pb-2">
                            <th className="px-4 py-3 text-[10px] font-black text-gray-400 uppercase tracking-widest">Agent Info</th>
                            <th className="px-4 py-3 text-[10px] font-black text-gray-400 uppercase tracking-widest">Initial Float</th>
                            <th className="px-4 py-3 text-[10px] font-black text-gray-400 uppercase tracking-widest">Closing Status</th>
                            <th className="px-4 py-3 text-[10px] font-black text-gray-400 uppercase tracking-widest">Admin Status</th>
                            <th className="px-4 py-3 text-[10px] font-black text-gray-400 uppercase tracking-widest text-right">Cash Collected</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-50">
                          {shiftAgents.map((agentSum) => {
                            const details = agentSum.shiftDetails[shiftKey];
                            const agentName = agentSum.vehicle?.assignedUsers?.find(u => u.role === 'SALES_AGENT')?.name || 'Unknown Agent';
                            const diff = details.closing?.difference || 0;
                            const isMatched = details.closing && diff === 0;

                            return (
                              <tr key={agentSum.id} className="hover:bg-gray-50/50 transition-colors">
                                <td className="px-4 py-4">
                                  <p className="text-sm font-black text-gray-900">{agentName}</p>
                                  <p className="text-[10px] font-bold text-gray-400 uppercase">{agentSum.vehicle?.vehicleNumber || agentSum.vehicle?.vehicleName}</p>
                                </td>
                                <td className="px-4 py-4">
                                  <span className="text-sm font-bold text-gray-500">₹{(details.opening?.totalOpeningCash || 0).toFixed(2)}</span>
                                </td>
                                <td className="px-4 py-4">
                                  {!details.closing ? (
                                    <span className="text-[10px] font-black text-amber-600 bg-amber-50 px-2.5 py-1 rounded-lg uppercase tracking-widest flex items-center w-fit gap-1"><Clock size={10} />Pending</span>
                                  ) : details.closing.isNoService ? (
                                    <span className="text-[10px] font-black text-rose-600 bg-rose-50 px-2.5 py-1 rounded-lg uppercase tracking-widest flex items-center w-fit gap-1"><AlertTriangle size={10} />Damage/Service</span>
                                  ) : (
                                    <span className={`text-[10px] font-black w-fit px-2.5 py-1 rounded-lg uppercase tracking-widest ${isMatched ? 'text-emerald-700 bg-emerald-50' : 'text-rose-700 bg-rose-50'
                                      }`}>
                                      {isMatched ? 'Matched' : diff > 0 ? `+₹${diff.toFixed(2)} Extra` : `-₹${Math.abs(diff).toFixed(2)} Short`}
                                    </span>
                                  )}
                                </td>
                                <td className="px-4 py-4">
                                  {!details.closing ? (
                                    <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Awaiting Shift</span>
                                  ) : details.closing.status === 'APPROVED' ? (
                                    <span className="text-[10px] font-black text-emerald-600 bg-emerald-50 px-2.5 py-1 rounded-lg uppercase tracking-widest flex items-center w-fit gap-1">
                                      <CheckCircle2 size={10} /> Approved
                                    </span>
                                  ) : (
                                    <span className="text-[10px] font-black text-amber-600 bg-amber-50 px-2.5 py-1 rounded-lg uppercase tracking-widest flex items-center w-fit gap-1">
                                      <Clock size={10} /> Pending
                                    </span>
                                  )}
                                </td>
                                <td className="px-4 py-4 text-right">
                                  <span className="text-base font-black text-gray-900 block">
                                    ₹{(details.closing?.actualCash || 0).toFixed(2)}
                                  </span>
                                  {details.closing?.denominations && Object.values(details.closing.denominations).some(d => d > 0) && (
                                    <button
                                      type="button"
                                      onClick={() => setViewingAgentDenoms({ agentName, vehicleInfo: agentSum.vehicle?.vehicleNumber || agentSum.vehicle?.vehicleName, denoms: details.closing.denominations, total: details.closing.actualCash, shift })}
                                      className="text-[9px] font-black text-emerald-600 hover:text-emerald-700 bg-emerald-50 px-2 py-1 rounded-lg uppercase tracking-widest mt-1.5 transition-colors cursor-pointer inline-flex items-center gap-1"
                                    >
                                      <Eye size={10} /> View Denoms
                                    </button>
                                  )}
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                        <tfoot>
                          <tr className="bg-gray-50/50">
                            <td colSpan="4" className="px-4 py-4 text-right text-[10px] font-black text-gray-400 uppercase tracking-widest">Total Shift Collection Amount</td>
                            <td className="px-4 py-4 text-right">
                              <span className={`text-xl font-black ${shift === 1 ? 'text-amber-600' : 'text-indigo-600'}`}>₹{totalCashCollected.toFixed(2)}</span>
                            </td>
                          </tr>
                        </tfoot>
                      </table>
                    </div>

                    {totalCashCollected > 0 && (
                      <div className="mt-6 p-5 bg-gray-50/50 rounded-[1.5rem] border border-gray-100">
                        <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-3">Shift {shift} Denominations Summary</p>
                        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-3">
                          {denominationsList.map((denom) => {
                            const count = aggregatedDenominations[denom] || 0;
                            if (count === 0) return null;
                            return (
                              <div key={denom} className="flex flex-col gap-1 bg-white p-3 rounded-xl border border-gray-100 shadow-sm">
                                <div className="flex items-center justify-between border-b border-gray-50 pb-1.5 mb-1.5">
                                  <span className="text-xs font-black text-gray-400">₹{denom}</span>
                                  <span className="text-[10px] font-bold text-emerald-600/60 uppercase">₹{(denom * count).toLocaleString()}</span>
                                </div>
                                <div className="flex items-center gap-2 justify-center">
                                  <span className="text-xs text-gray-300">×</span>
                                  <span className="text-sm font-black text-gray-800">{count}</span>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    )}

                    {totalCashCollected > 0 && (
                      <div className="mt-8 pt-8 border-t border-gray-100 flex flex-col md:flex-row justify-between items-center gap-4">
                        <button
                          onClick={() => handlePrintShiftReport(shift, shiftAgents.map(a => ({ vehicle: a.vehicle?.vehicleNumber || a.vehicle?.vehicleName, agentName: a.vehicle?.assignedUsers?.find(u => u.role === 'SALES_AGENT')?.name || 'N/A', closing: a.shiftDetails[shiftKey].closing })), aggregatedDenominations, totalCashCollected)}
                          className="w-full md:w-auto flex items-center justify-center gap-3 px-8 py-4 rounded-2xl text-xs font-black uppercase tracking-widest text-emerald-700 bg-emerald-50 hover:bg-emerald-100 border-2 border-emerald-100 transition-all shadow-sm group"
                        >
                          <Printer size={18} className="group-hover:scale-110 transition-transform" />
                          Download  Report
                        </button>

                        {!isDeposited && (
                          <button
                            onClick={() => handleInitiateDeposit(shift)}
                            disabled={!hasCompletions || isSubmitting}
                            className={`w-full md:w-auto flex items-center justify-center gap-3 px-10 py-4 rounded-2xl text-xs font-black uppercase tracking-widest text-white shadow-xl transition-all ${shift === 1 ? 'bg-amber-500 shadow-amber-500/20 hover:bg-amber-600' : 'bg-indigo-500 shadow-indigo-500/20 hover:bg-indigo-600'
                              } disabled:opacity-50 disabled:cursor-not-allowed`}
                          >
                            {isSubmitting ? <Loader2 className="animate-spin" size={18} /> : <CheckCircle2 size={18} />}
                            Approve & Submit Shift {shift} Report
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              );
            })()}
          </div>
        </div>
      ) : (
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
                  <div className="flex flex-col gap-0.5 mt-0.5">
                    <div className="text-[10px] font-bold text-emerald-400 uppercase tracking-widest">
                      {storeRegisterData?.storeRegister?.status === 'OPEN'
                        ? (
                          <div className="flex flex-col gap-2">
                            <span className="flex items-center gap-2">
                              <span className="bg-emerald-500 w-1.5 h-1.5 rounded-full animate-pulse" />
                              <span className="text-[10px] font-bold text-emerald-400 uppercase tracking-widest">Active • Opening: ₹{storeRegisterData.storeRegister.openingCash?.toLocaleString()}</span>
                            </span>

                            {/* Carry-over Mismatch Alert for Active Safe */}
                            {storeRegisterData.previousRegister && Math.abs(storeRegisterData.storeRegister.openingCash - storeRegisterData.previousRegister.actualClosingCash) > 0.01 && (
                              <div className="px-3 py-2 bg-rose-500/20 border border-rose-500/40 rounded-xl flex items-center gap-2.5 animate-pulse">
                                <AlertTriangle size={14} className="text-rose-400" />
                                <div className="flex flex-col">
                                  <span className="text-[8px] font-black text-rose-300 uppercase tracking-widest">Opening Mismatch Alert</span>
                                  <span className="text-[10px] font-bold text-white leading-tight">
                                    Started with ₹{(storeRegisterData.storeRegister.openingCash - storeRegisterData.previousRegister.actualClosingCash).toFixed(2)} {storeRegisterData.storeRegister.openingCash < storeRegisterData.previousRegister.actualClosingCash ? 'less' : 'more'} than yesterday's close
                                  </span>
                                </div>
                              </div>
                            )}
                          </div>
                        )
                        : storeRegisterData?.storeRegister?.status === 'CLOSED'
                          ? (
                            <div className="flex flex-col gap-1.5 mt-1">
                              <div className="flex items-center gap-2">
                                <span className="text-[10px] font-bold text-white/40 uppercase tracking-widest">Closed on {storeRegisterData.storeRegister.date}</span>
                                {storeRegisterData.storeRegister.closingDifference === 0 ? (
                                  <span className="bg-emerald-400/20 text-emerald-300 text-[8px] font-black px-2 py-0.5 rounded border border-emerald-400/30 uppercase">Status: Balanced</span>
                                ) : (
                                  <span className={`${storeRegisterData.storeRegister.closingDifference < 0 ? 'bg-rose-500/20 text-rose-300 border-rose-500/50' : 'bg-amber-500/20 text-amber-300 border-amber-500/50'} text-[8px] font-black px-2 py-0.5 rounded border uppercase`}>
                                    Status: {storeRegisterData.storeRegister.closingDifference < 0 ? 'Shortage' : 'Surplus'}
                                  </span>
                                )}
                              </div>

                              {storeRegisterData.storeRegister.closingDifference !== 0 && (
                                <div className={`mt-1 px-4 py-3 rounded-2xl flex items-center gap-4 border shadow-2xl animate-bounce ${storeRegisterData.storeRegister.closingDifference < 0
                                  ? 'bg-rose-600 border-rose-400 text-white'
                                  : 'bg-amber-500 border-amber-300 text-white'
                                  }`}>
                                  <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center">
                                    <AlertTriangle size={24} />
                                  </div>
                                  <div>
                                    <p className="text-[10px] font-black uppercase tracking-[0.1em] opacity-80">Variance Detected</p>
                                    <p className="text-lg font-black leading-none">
                                      {storeRegisterData.storeRegister.closingDifference < 0 ? '-' : '+'} ₹{Math.abs(storeRegisterData.storeRegister.closingDifference).toFixed(2)}
                                    </p>
                                  </div>
                                </div>
                              )}
                            </div>
                          )
                          : 'Awaiting Daily Initialization'}
                    </div>
                    {storeRegisterData?.storeRegister?.openedBy && (
                      <p className="text-[8px] font-black text-white/40 uppercase tracking-widest flex items-center gap-1.5">
                        <User size={8} /> Opened By {storeRegisterData.storeRegister.openedBy.name}
                        {storeRegisterData?.storeRegister?.closedBy && (
                          <>
                            <span className="opacity-20">|</span>
                            <CheckCircle2 size={8} /> Closed By {storeRegisterData.storeRegister.closedBy.name}
                          </>
                        )}
                      </p>
                    )}
                  </div>
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
                        setSafeMovementData(prev => ({ ...prev, type: 'DEPOSIT', amount: storeRegisterData.liveMetrics?.availableCash || 0 }));
                        setShowSafeMovementModal(true);
                      }}
                      className="bg-sky-500/10 hover:bg-sky-500/20 text-sky-400 border border-sky-500/20 px-6 py-3 rounded-2xl text-xs font-black uppercase tracking-widest transition-all active:scale-95 flex items-center gap-2 backdrop-blur-sm"
                    >
                      <Vault size={16} strokeWidth={3} />
                      Move to Safe
                    </button>

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
                <div className="grid grid-cols-2 lg:grid-cols-6 gap-4 relative z-10">
                  {/* TWO POOL SYSTEM IN HEADER */}

                  <div className="bg-emerald-950/50 p-4 rounded-2xl border border-emerald-800/50 group relative">
                    <p className="text-[10px] font-black tracking-widest uppercase text-emerald-500 mb-1">Opening Cash</p>
                    <div className="flex items-center justify-between">
                      <p className="text-xl font-black text-white">₹{Math.abs(storeRegisterData.storeRegister.openingCash || 0).toFixed(2)}</p>
                      <button
                        onClick={() => {
                          setStoreDenomData({
                            amount: storeRegisterData.storeRegister.openingCash,
                            denominations: storeRegisterData.storeRegister.openingDenominations || { "500": 0, "200": 0, "100": 0, "50": 0, "20": 0, "10": 0, "5": 0, "20": 0, "10": 0, "5": 0, "2": 0, "1": 0 }
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
                    <p className="text-xl font-black text-amber-400">-₹{Math.abs(storeRegisterData?.liveMetrics?.assignedOut || 0).toFixed(2)}</p>
                  </div>
                  <div className="bg-emerald-950/50 p-4 rounded-2xl border border-emerald-800/50">
                    <p className="text-[10px] font-black tracking-widest uppercase text-emerald-500 mb-1">Agent Inflow</p>
                    <p className="text-xl font-black text-emerald-400">+₹{Math.abs(storeRegisterData?.liveMetrics?.receivedIn || 0).toFixed(2)}</p>
                  </div>
                  <div className="bg-white/5 border border-white/10 p-4 rounded-2xl backdrop-blur-sm">
                    <p className="text-[10px] font-black tracking-widest uppercase text-rose-500 mb-1">Bank Transfer</p>
                    <p className="text-xl font-black text-rose-400">₹{Math.abs(storeRegisterData?.liveMetrics?.bankTransferred || 0).toFixed(2)}</p>
                  </div>


                  <div className="bg-sky-500/10 border border-sky-500/20 p-4 rounded-2xl">
                    <p className="text-[10px] font-black tracking-widest uppercase text-sky-400 mb-1">Available Cash</p>
                    <p className="text-xl font-black text-sky-400">₹{Math.abs(storeRegisterData?.liveMetrics?.availableCash || 0).toFixed(2)}</p>
                  </div>
                  <div className="bg-white rounded-2xl p-4 shadow-xl border-b-4 border-emerald-100">
                    <div className="flex items-center justify-between mb-1">
                      <p className="text-[10px] font-black tracking-widest uppercase text-emerald-600">Chest</p>
                      <div className="flex items-center gap-1 bg-emerald-50 px-1.5 py-0.5 rounded text-[8px] font-black text-emerald-600 border border-emerald-100">
                        SAFE: ₹{Math.abs(storeRegisterData?.liveMetrics?.safeBalance || 0).toFixed(0)}
                      </div>
                    </div>
                    <p className="text-xl font-black text-emerald-900">₹{Math.abs(storeRegisterData?.liveMetrics?.totalStoreCash || 0).toFixed(2)}</p>
                  </div>
                </div>

                {/* Today's Shift Safekeeping / Safekeeping Status */}
                <div className="bg-emerald-950/30 rounded-3xl p-5 border border-emerald-800/30 relative z-10">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-[10px] font-black text-emerald-500 uppercase tracking-widest flex items-center gap-2">
                      <Clock size={12} /> Today's Shift Safekeeping
                    </h3>
                    <p className="text-[9px] font-bold text-emerald-500/40 uppercase tracking-tighter">Reflecting from Collections Report</p>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {[1, 2].map(shiftNum => {
                      const depositRecord = storeRegisterData.storeDeposits?.find(d => d.shift === shiftNum);
                      const expectedAmount = storeRegisterData.shiftCollections?.find(c => c.shift === shiftNum)?._sum.actualCash || 0;
                      const isMismatched = depositRecord && Math.abs(depositRecord.amount - expectedAmount) > 0.1;

                      return (
                        <div key={shiftNum} className={`p-4 rounded-2xl border transition-all ${depositRecord
                          ? (isMismatched ? 'bg-amber-950/40 border-amber-800/50' : 'bg-emerald-900/50 border-emerald-800/50')
                          : (expectedAmount > 0 ? 'bg-emerald-950/10 border-emerald-900/20 border-dashed border-2' : 'bg-gray-900/10 border-gray-800/20 opacity-30')
                          }`}>
                          <div className="flex items-start justify-between">
                            <div className="flex items-start gap-3">
                              <div className={`w-10 h-10 rounded-xl flex items-center justify-center font-black shrink-0 ${depositRecord ? 'bg-emerald-800/50 text-emerald-400' : 'bg-gray-800/30 text-gray-600'
                                }`}>
                                S{shiftNum}
                              </div>
                              <div className="flex-1">
                                <div className="flex items-center flex-wrap gap-2">
                                  <p className="text-sm font-black text-white">
                                    ₹{(depositRecord?.amount || expectedAmount).toLocaleString()}
                                  </p>
                                  {isMismatched && (
                                    <div className="flex items-center gap-1 text-[8px] font-black bg-rose-500 text-white px-1.5 py-0.5 rounded-full uppercase tracking-tighter">
                                      <AlertTriangle size={8} /> Mismatch
                                    </div>
                                  )}
                                  {!depositRecord && expectedAmount > 0 && (
                                    <span className="text-[8px] bg-sky-500/20 text-sky-400 border border-sky-500/30 px-1.5 py-0.5 rounded-full uppercase font-black tracking-tighter">Draft</span>
                                  )}
                                </div>
                                <p className="text-[9px] font-medium text-emerald-500/60 uppercase tracking-wider mt-1 leading-relaxed">
                                  {depositRecord ? depositRecord.description : (expectedAmount > 0 ? 'Pending Safe Deposit' : 'No collections reported')}
                                </p>
                                {isMismatched && (
                                  <p className="text-[8px] font-bold text-rose-400 mt-1 flex items-center gap-1">
                                    <AlertCircle size={8} /> Needs Refresh: Expected ₹{expectedAmount.toLocaleString()}
                                  </p>
                                )}
                              </div>
                            </div>

                            {depositRecord && (
                              <div className="flex items-center gap-1">
                                <button
                                  onClick={() => {
                                    setEditingDeposit(depositRecord);
                                    setDepositData({
                                      shift: depositRecord.shift,
                                      description: depositRecord.description,
                                      amount: depositRecord.amount,
                                      denominations: depositRecord.denominations || { "500": 0, "200": 0, "100": 0, "50": 0, "20": 0, "10": 0, "5": 0, "2": 0, "1": 0 }
                                    });
                                    setShowEditDepositModal(true);
                                  }}
                                  className="p-1.5 text-emerald-500/50 hover:text-sky-400 hover:bg-sky-400/10 rounded-lg transition-all"
                                >
                                  {/* <Pencil size={13} /> */}
                                </button>
                                <button
                                  onClick={() => handleDeleteDeposit(depositRecord.id)}
                                  className="p-1.5 text-emerald-500/50 hover:text-rose-400 hover:bg-rose-400/10 rounded-lg transition-all"
                                >
                                  {/* <Trash2 size={13} /> */}
                                </button>
                              </div>
                            )}
                            {!depositRecord && expectedAmount > 0 && (
                              <button
                                onClick={() => setActiveTab('reconciliation')}
                                className="bg-sky-500/20 hover:bg-sky-500/30 text-sky-400 p-1.5 rounded-xl transition-all"
                                title="Go to Deposit"
                              >
                                <ArrowRight size={14} />
                              </button>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* SIMULATOR TOOLS (TEMPORARY) */}
          <div className="flex items-center gap-3 mb-6 bg-slate-900/5 p-4 rounded-[2rem] border border-slate-200 border-dashed">
            <div className="w-10 h-10 bg-slate-900 rounded-xl flex items-center justify-center text-white">
              <Clock size={20} />
            </div>
            <div>
              <h4 className="text-xs font-black text-slate-900 uppercase tracking-widest">Simulator Tools</h4>
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest leading-tight">Test your safe transition workflow</p>
            </div>
            <div className="ml-auto flex gap-2">
              <button
                onClick={async () => {
                  try {
                    await resetStoreCashRegister(date);
                    toast.success('Safe reset for today');
                    fetchStoreRegister();
                  } catch (e) {
                    toast.error('Failed to reset safe');
                  }
                }}
                className="px-4 py-2 bg-rose-100 text-rose-600 text-[10px] font-black uppercase tracking-widest rounded-lg hover:bg-rose-200 transition-all border border-rose-200"
              >
                Reset Today
              </button>
              <button
                onClick={() => {
                  const tomorrow = new Date(date);
                  tomorrow.setDate(tomorrow.getDate() + 1);
                  setDate(format(tomorrow, 'yyyy-MM-dd'));
                  toast.success('Jumped to Tomorrow');
                }}
                className="px-4 py-2 bg-emerald-100 text-emerald-600 text-[10px] font-black uppercase tracking-widest rounded-lg hover:bg-emerald-200 transition-all border border-emerald-200"
              >
                Jump to Next Day
              </button>
              <button
                onClick={() => {
                  const yesterday = new Date(date);
                  yesterday.setDate(yesterday.getDate() - 1);
                  setDate(format(yesterday, 'yyyy-MM-dd'));
                  toast.success('Jumped to Yesterday');
                }}
                className="px-4 py-2 bg-amber-100 text-amber-600 text-[10px] font-black uppercase tracking-widest rounded-lg hover:bg-amber-200 transition-all border border-amber-200"
              >
                Back to Yesterday
              </button>
            </div>
          </div>

          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">

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
            <button
              onClick={() => setActiveTab('ledger')}
              className={`px-6 py-2.5 rounded-xl text-xs font-bold uppercase tracking-wider transition-all flex items-center gap-1.5 ${activeTab === 'ledger' ? 'bg-white text-emerald-600 shadow-sm' : 'text-gray-400'}`}
            >
              <BookOpen size={14} /> Audit Ledger
            </button>
            <button
              onClick={() => setActiveTab('bank_history')}
              className={`px-4 py-2.5 rounded-xl text-xs font-bold uppercase tracking-wider transition-all flex items-center gap-1.5 ${activeTab === 'bank_history' ? 'bg-white text-rose-600 shadow-sm' : 'text-gray-400'}`}
            >
              <Building2 size={14} /> Bank History
            </button>
            <button
              onClick={() => setActiveTab('safe_history')}
              className={`px-4 py-2.5 rounded-xl text-xs font-bold uppercase tracking-wider transition-all flex items-center gap-1.5 ${activeTab === 'safe_history' ? 'bg-white text-slate-700 shadow-sm' : 'text-gray-400'}`}
            >
              <Vault size={14} /> Safe History
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
          ) : activeTab === 'live' ? (
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
          ) : ['ledger', 'bank_history', 'safe_history'].includes(activeTab) ? (
            /* ========== AUDIT LEDGER VIEW ========== */
            <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
              {ledgerLoading ? (
                <div className="flex items-center justify-center py-24">
                  <Loader2 className="animate-spin text-emerald-500" size={32} />
                </div>
              ) : !ledgerData || ledgerData.ledger.length === 0 ? (
                <div className="bg-white rounded-[2rem] border border-gray-100 shadow-sm p-16 text-center">
                  <BookOpen size={48} className="mx-auto text-gray-200 mb-4" />
                  <h3 className="text-lg font-black text-gray-300 uppercase tracking-widest">No Ledger Entries</h3>
                  <p className="text-sm font-medium text-gray-400 mt-2">Initialize the Store Safe to start recording transactions</p>
                </div>
              ) : (
                <>
                  {/* Cash Pool Cards */}
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {/* Available / Counter Cash */}
                    <div className="bg-white rounded-[2rem] p-6 shadow-sm border border-gray-100 relative group overflow-hidden">
                      <div className="absolute top-0 right-0 p-4 opacity-[0.03] group-hover:opacity-[0.05] transition-opacity">
                        <Coins size={80} />
                      </div>
                      <div className="flex items-center justify-between mb-4">
                        <div className="w-10 h-10 bg-sky-50 rounded-xl flex items-center justify-center text-sky-600">
                          <Coins size={20} />
                        </div>
                        <button
                          onClick={() => {
                            setSafeMovementData(prev => ({ ...prev, type: 'DEPOSIT', amount: ledgerData.summary.availableCash }));
                            setShowSafeMovementModal(true);
                          }}
                          className="text-[10px] font-black text-sky-600 uppercase tracking-widest bg-sky-50 px-3 py-1.5 rounded-lg hover:bg-sky-100 transition-colors flex items-center gap-1.5"
                        >
                          <ArrowRight size={12} /> Move to Safe
                        </button>
                      </div>
                      <h3 className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em]">At Hand (Counter)</h3>
                      <div className="mt-1 flex items-baseline gap-1.5">
                        <span className="text-2xl font-black text-gray-900 tabular-nums">₹{Math.abs(ledgerData.summary.availableCash).toFixed(2)}</span>
                      </div>
                      <p className="text-[10px] font-bold text-gray-400 mt-2">Opening − Outflow + Inflow</p>
                    </div>

                    {/* Safe Cash */}
                    <div className="bg-slate-900 rounded-[2rem] p-6 shadow-xl relative group overflow-hidden border border-slate-800">
                      <div className="absolute top-0 right-0 p-4 opacity-[0.05] group-hover:opacity-[0.1] transition-opacity">
                        <Vault size={80} className="text-white" />
                      </div>
                      <div className="flex items-center justify-between mb-4">
                        <div className="w-10 h-10 bg-emerald-500/10 rounded-xl flex items-center justify-center text-emerald-400 border border-emerald-500/20">
                          <Vault size={20} />
                        </div>
                        <div className="flex gap-2">
                          <button
                            onClick={() => {
                              setSafeMovementData(prev => ({ ...prev, type: 'WITHDRAW', amount: '' }));
                              setShowSafeMovementModal(true);
                            }}
                            className="text-[10px] font-black text-emerald-400 uppercase tracking-widest bg-white/5 px-3 py-1.5 rounded-lg hover:bg-white/10 transition-colors"
                          >
                            Withdraw
                          </button>
                        </div>
                      </div>
                      <h3 className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em]">Store Safe Balance</h3>
                      <div className="mt-1 flex items-baseline gap-1.5">
                        <span className="text-2xl font-black text-white tabular-nums">₹{Math.abs(ledgerData.summary.safeBalance).toFixed(2)}</span>
                      </div>
                      <p className="text-[10px] font-bold text-slate-500 mt-2">Deposits − Bank Transfers</p>
                    </div>

                    {/* Formula Visualization */}
                    <div className="bg-gradient-to-br from-gray-50 to-white rounded-[2rem] p-6 shadow-sm border border-gray-100 flex flex-col justify-center">
                      <h3 className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] mb-4">Total Store Cash</h3>
                      <div className="flex items-center gap-3">
                        <div className="text-center">
                          <p className="text-xs font-black text-gray-800">₹{Math.abs(ledgerData.summary.availableCash).toFixed(1)}</p>
                          <p className="text-[8px] font-bold text-gray-400 uppercase">Available</p>
                        </div>
                        <span className="text-gray-300 font-bold">+</span>
                        <div className="text-center">
                          <p className="text-xs font-black text-gray-800">₹{Math.abs(ledgerData.summary.safeBalance).toFixed(1)}</p>
                          <p className="text-[8px] font-bold text-gray-400 uppercase">Safe</p>
                        </div>
                        <span className="text-gray-300 font-bold">=</span>
                        <div className="bg-emerald-50 px-3 py-2 rounded-xl border border-emerald-100 text-center">
                          <p className="text-sm font-black text-emerald-600">₹{Math.abs(ledgerData.summary.totalStoreCash).toFixed(2)}</p>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Ledger Table */}
                  <div className="bg-white rounded-[2rem] border border-gray-100 shadow-sm overflow-hidden">
                    <div className="px-6 py-4 border-b border-gray-100 bg-gray-50/30 flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-slate-100 rounded-xl flex items-center justify-center text-slate-600">
                          <BookOpen size={20} />
                        </div>
                        <div>
                          <h3 className="text-sm font-black text-gray-900 uppercase tracking-tight">
                            {activeTab === 'bank_history' ? 'Bank Transfer History' :
                              activeTab === 'safe_history' ? 'Safe Movement History' :
                                'Immutable Cash Ledger'}
                          </h3>
                          <p className="text-[9px] font-bold text-gray-400 uppercase tracking-widest">
                            {ledgerData.ledger.filter(e => {
                              if (activeTab === 'bank_history') return e.type === 'BANK_TRANSFER';
                              if (activeTab === 'safe_history') return e.type === 'SAFE_MOVEMENT';
                              return true;
                            }).length} entries • {date} • {ledgerData.summary.status}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 bg-gray-100 px-3 py-1.5 rounded-lg">
                        <Lock size={12} className="text-gray-400" />
                        <span className="text-[9px] font-black text-gray-400 uppercase tracking-widest">Read-Only</span>
                      </div>
                    </div>

                    <div className="overflow-x-auto">
                      <table className="w-full text-left">
                        <thead>
                          <tr className="border-b border-gray-100">
                            <th className="px-5 py-3.5 text-[10px] font-black text-gray-400 uppercase tracking-widest w-[80px]">Time</th>
                            <th className="px-4 py-3.5 text-[10px] font-black text-gray-400 uppercase tracking-widest">Action</th>
                            <th className="px-4 py-3.5 text-[10px] font-black text-gray-400 uppercase tracking-widest">Reference</th>
                            <th className="px-4 py-3.5 text-[10px] font-black text-gray-400 uppercase tracking-widest">Performed By</th>
                            <th className="px-4 py-3.5 text-[10px] font-black text-gray-400 uppercase tracking-widest text-right">Amount</th>
                            <th className="px-5 py-3.5 text-[10px] font-black text-gray-400 uppercase tracking-widest text-right">Store Balance</th>
                            <th className="px-4 py-3.5 text-[10px] font-black text-gray-400 uppercase tracking-widest text-center">Docs</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-50">
                          {ledgerData.ledger
                            .filter(entry => {
                              if (activeTab === 'bank_history') return entry.type === 'BANK_TRANSFER';
                              if (activeTab === 'safe_history') return entry.type === 'SAFE_MOVEMENT';
                              return true;
                            })
                            .map((entry) => {
                            const typeConfig = {
                              'OPENING': { icon: Coins, bg: 'bg-emerald-50', text: 'text-emerald-600', badge: 'INIT' },
                              'AGENT_OUTFLOW': { icon: ArrowUpRight, bg: 'bg-amber-50', text: 'text-amber-600', badge: 'OUT' },
                              'AGENT_INFLOW': { icon: ArrowDownLeft, bg: 'bg-sky-50', text: 'text-sky-600', badge: 'IN' },
                              'BANK_TRANSFER': { icon: Building2, bg: 'bg-rose-50', text: 'text-rose-600', badge: 'BANK' },
                              'SAFE_MOVEMENT': { icon: Vault, bg: 'bg-slate-100', text: 'text-slate-600', badge: 'INTERNAL' },
                              'CLOSING': { icon: Lock, bg: 'bg-slate-100', text: 'text-slate-600', badge: 'CLOSE' },
                            };
                            const cfg = typeConfig[entry.type] || typeConfig['OPENING'];
                            const Icon = cfg.icon;

                            return (
                              <tr key={entry.id} className={`hover:bg-gray-50/80 transition-colors ${['CLOSING', 'SAFE_MOVEMENT'].includes(entry.type) ? 'bg-slate-50/30' : ''}`}>
                                <td className="px-5 py-3.5">
                                  <span className="text-[11px] font-bold text-gray-500 tabular-nums">
                                    {format(new Date(entry.timestamp), 'hh:mm a')}
                                  </span>
                                </td>
                                <td className="px-4 py-3.5">
                                  <div className="flex items-center gap-2.5">
                                    <div className={`w-8 h-8 rounded-lg ${cfg.bg} flex items-center justify-center ${cfg.text}`}>
                                      <Icon size={16} strokeWidth={2.5} />
                                    </div>
                                    <div>
                                      <span className="text-xs font-black text-gray-800 block leading-tight">{entry.label}</span>
                                      <span className={`text-[8px] font-black uppercase tracking-widest ${cfg.text} opacity-70`}>{cfg.badge}</span>
                                    </div>
                                  </div>
                                </td>
                                <td className="px-4 py-3.5">
                                  <span className="text-[10px] font-bold text-gray-400 leading-relaxed block max-w-[220px] truncate" title={entry.referenceName}>
                                    {entry.referenceName}
                                  </span>
                                </td>
                                <td className="px-4 py-3.5">
                                  <span className="text-[10px] font-black text-gray-500 uppercase tracking-wider">{entry.userName}</span>
                                </td>
                                <td className="px-4 py-3.5 text-right">
                                  <span className={`text-sm font-black tabular-nums ${entry.direction === 'IN' || entry.direction === 'IN_FROM_SAFE' ? 'text-emerald-600' :
                                    entry.direction === 'OUT' || entry.direction === 'OUT_TO_SAFE' ? 'text-rose-600' : 'text-gray-600'
                                    }`}>
                                    {['IN', 'IN_FROM_SAFE'].includes(entry.direction) ? '+' : ['OUT', 'OUT_TO_SAFE'].includes(entry.direction) ? '−' : ''}₹{Math.abs(entry.amount || 0).toFixed(2)}
                                    {entry.type === 'SAFE_MOVEMENT' && (
                                      <span className="text-[8px] font-black block text-gray-400 uppercase tracking-tighter">
                                        {entry.direction === 'OUT_TO_SAFE' ? 'MOVE TO SAFE' : 'MOVE TO AVAILABLE'}
                                      </span>
                                    )}
                                  </span>
                                </td>
                                <td className="px-5 py-3.5 text-right">
                                  <div className="flex flex-col items-end">
                                    <span className="text-[11px] font-black text-gray-700 tabular-nums">₹{Math.abs(entry.balanceAfter || 0).toFixed(2)}</span>
                                    <span className="text-[8px] font-black text-gray-300 uppercase tracking-widest">Total Store</span>
                                  </div>
                                </td>
                                <td className="px-4 py-3.5 text-center">
                                  {entry.metadata?.receiptImage ? (
                                    <button 
                                      onClick={() => setPreviewImage(entry.metadata.receiptImage)}
                                      className="p-1.5 hover:bg-white hover:shadow-sm rounded-lg text-sky-600 transition-all border border-transparent hover:border-gray-100"
                                      title="View Receipt"
                                    >
                                      <ExternalLink size={14} />
                                    </button>
                                  ) : (
                                    <span className="text-[10px] font-bold text-gray-200 uppercase tracking-widest">NA</span>
                                  )}
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>

                    {/* IMAGE PREVIEW MODAL */}
                    {previewImage && (
                      <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-md p-4" onClick={() => setPreviewImage(null)}>
                        <div className="relative max-w-4xl w-full flex flex-col items-center animate-in zoom-in-95 duration-200" onClick={e => e.stopPropagation()}>
                          <div className="absolute -top-12 right-0 flex gap-4">
                            <a 
                              href={previewImage} 
                              target="_blank" 
                              rel="noreferrer"
                              className="bg-white/10 hover:bg-white/20 text-white px-4 py-2 rounded-xl text-xs font-black uppercase tracking-widest flex items-center gap-2 backdrop-blur-md"
                            >
                              Open Original <ExternalLink size={14} />
                            </a>
                            <button 
                              onClick={() => setPreviewImage(null)}
                              className="bg-white/10 hover:bg-white/20 text-white px-4 py-2 rounded-xl text-xs font-black uppercase tracking-widest backdrop-blur-md"
                            >
                              Close
                            </button>
                          </div>
                          <img 
                            src={previewImage} 
                            alt="Receipt Preview" 
                            className="max-h-[85vh] w-auto rounded-3xl shadow-2xl border-4 border-white/10 object-contain bg-white/5"
                          />
                        </div>
                      </div>
                    )}

                    {/* Footer Legend */}
                    <div className="px-6 py-4 border-t border-gray-100 bg-gray-50/30 flex items-center justify-between">
                      <div className="flex items-center gap-4">
                        <div className="flex items-center gap-1.5">
                          <div className="w-2 h-2 rounded-full bg-emerald-500"></div>
                          <span className="text-[9px] font-black text-gray-400 uppercase tracking-widest">Inflow</span>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <div className="w-2 h-2 rounded-full bg-rose-500"></div>
                          <span className="text-[9px] font-black text-gray-400 uppercase tracking-widest">Outflow</span>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <div className="w-2 h-2 rounded-full bg-slate-400"></div>
                          <span className="text-[9px] font-black text-gray-400 uppercase tracking-widest">System</span>
                        </div>
                      </div>
                      <p className="text-[9px] font-bold text-gray-400 uppercase tracking-wider flex items-center gap-1">
                        <Shield size={10} /> All entries are immutable after creation
                      </p>
                    </div>
                  </div>
                </>
              )}
            </div>
          ) : null}

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

          {/* ========== SAFE MOVEMENT MODAL ========== */}
          {showSafeMovementModal && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4 overflow-y-auto">
              <div className="bg-white w-full max-w-lg rounded-[2.5rem] p-8 shadow-2xl flex flex-col gap-6 animate-in zoom-in-95 duration-200">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className={`w-12 h-12 rounded-[1.25rem] flex items-center justify-center ${safeMovementData.type === 'DEPOSIT' ? 'bg-sky-50 text-sky-600' : 'bg-amber-50 text-amber-600'}`}>
                      <Vault size={24} />
                    </div>
                    <div>
                      <h3 className="text-xl font-black text-gray-900 leading-tight">
                        {safeMovementData.type === 'DEPOSIT' ? 'Move to Safe' : 'Withdraw from Safe'}
                      </h3>
                      <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest leading-none">{date}</p>
                      <div className="flex items-center gap-2 mt-1.5">
                        <span className="text-[8px] font-black text-emerald-600 bg-emerald-50 px-1.5 py-0.5 rounded-lg border border-emerald-100 uppercase tracking-tighter">Safe: ₹{Math.abs(storeRegisterData?.liveMetrics?.safeBalance || 0).toFixed(0)}</span>
                        <span className="text-[8px] font-black text-sky-600 bg-sky-50 px-1.5 py-0.5 rounded-lg border border-sky-100 uppercase tracking-tighter">At Hand: ₹{Math.abs(storeRegisterData?.liveMetrics?.availableCash || 0).toFixed(0)}</span>
                      </div>
                    </div>
                  </div>
                  <button
                    onClick={() => setShowSafeMovementModal(false)}
                    className="w-10 h-10 flex items-center justify-center hover:bg-gray-100 rounded-2xl text-gray-400 transition-colors"
                  >
                    <X size={20} />
                  </button>
                </div>

                <form onSubmit={handleSafeMovement} className="space-y-6">
                  <div className="bg-gray-50 rounded-3xl p-6 border border-gray-100">
                    <div className="grid grid-cols-3 gap-3">
                      {denominationsList.map((denom) => (
                        <div key={denom} className="space-y-1.5 text-center">
                          <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest block">₹{denom}</label>
                          <input
                            type="number"
                            min="0"
                            value={safeMovementData.denominations[denom] || ''}
                            onChange={(e) => handleDenominationChange(e.target.value, denom, 'safe')}
                            placeholder="0"
                            className="w-full bg-white border border-gray-200 rounded-xl px-2 py-2 text-center text-sm font-black focus:ring-2 focus:ring-sky-500/20 focus:border-sky-500 outline-none transition-all"
                          />
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="flex flex-col gap-2">
                    <div className="flex items-center justify-between bg-slate-900 px-6 py-4 rounded-2xl shadow-lg border border-slate-800">
                      <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Total Amount</span>
                      <span className="text-xl font-black text-white tabular-nums">₹{Math.abs(parseFloat(safeMovementData.amount || 0)).toFixed(2)}</span>
                    </div>

                    {(safeMovementData.type === 'DEPOSIT' && parseFloat(safeMovementData.amount) > (storeRegisterData?.liveMetrics?.availableCash || 0)) && (
                      <div className="flex items-center gap-2 px-4 py-3 bg-rose-500/10 border border-rose-500/20 rounded-xl animate-in shake duration-300">
                        <AlertTriangle size={14} className="text-rose-500 shrink-0" />
                        <p className="text-[10px] font-bold text-rose-500 uppercase tracking-tight">
                          Limit Exceeded: Exceeds At Hand Cash (₹{Math.max(0, storeRegisterData?.liveMetrics?.availableCash || 0).toFixed(2)})
                        </p>
                      </div>
                    )}

                    {(safeMovementData.type === 'WITHDRAW' && parseFloat(safeMovementData.amount) > (storeRegisterData?.liveMetrics?.safeBalance || 0)) && (
                      <div className="flex items-center gap-2 px-4 py-3 bg-rose-500/10 border border-rose-500/20 rounded-xl animate-in shake duration-300">
                        <AlertTriangle size={14} className="text-rose-500 shrink-0" />
                        <p className="text-[10px] font-bold text-rose-500 uppercase tracking-tight">
                          Limit Exceeded: Exceeds Safe Balance (₹{Math.max(0, storeRegisterData?.liveMetrics?.safeBalance || 0).toFixed(2)})
                        </p>
                      </div>
                    )}
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest flex items-center gap-1.5">
                      Remark / Purpose
                    </label>
                    <textarea
                      value={safeMovementData.description}
                      onChange={(e) => setSafeMovementData({ ...safeMovementData, description: e.target.value })}
                      placeholder="e.g. End of day safe deposit"
                      className="w-full bg-gray-50 border border-gray-100 rounded-2xl px-4 py-3 text-sm font-bold text-gray-700 focus:bg-white focus:ring-2 focus:ring-sky-500/10 focus:border-sky-500 outline-none transition-all h-24 resize-none"
                    />
                  </div>

                  <div className="flex gap-4">
                    <button
                      type="button"
                      onClick={() => setShowSafeMovementModal(false)}
                      className="flex-1 bg-gray-100 text-gray-500 font-black text-xs py-4 rounded-2xl uppercase tracking-widest hover:bg-gray-200 transition-all border border-gray-200/50"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={
                        isSubmitting || 
                        !safeMovementData.amount || 
                        parseFloat(safeMovementData.amount) <= 0 ||
                        (safeMovementData.type === 'DEPOSIT' && parseFloat(safeMovementData.amount) > (storeRegisterData?.liveMetrics?.availableCash || 0)) ||
                        (safeMovementData.type === 'WITHDRAW' && parseFloat(safeMovementData.amount) > (storeRegisterData?.liveMetrics?.safeBalance || 0))
                      }
                      className={`flex-1 text-white font-black text-xs py-4 rounded-2xl uppercase tracking-widest transition-all shadow-xl flex items-center justify-center gap-2 disabled:opacity-40 disabled:cursor-not-allowed disabled:grayscale ${safeMovementData.type === 'DEPOSIT'
                        ? 'bg-sky-600 hover:bg-sky-700 shadow-sky-600/20'
                        : 'bg-amber-600 hover:bg-amber-700 shadow-amber-600/20'
                        }`}
                    >
                      {isSubmitting ? (
                        <Loader2 className="animate-spin" size={16} />
                      ) : safeMovementData.type === 'DEPOSIT' ? (
                        <Vault size={16} />
                      ) : (
                        <ArrowDownLeft size={16} />
                      )}
                      Confirm Movement
                    </button>
                  </div>
                </form>
              </div>
            </div>
          )}

          {/* ========== OPEN STORE CASH MODAL ========== */}
          {showOpenStoreModal && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
              <div className="bg-white w-full max-w-lg rounded-[2.5rem] p-6 shadow-2xl flex flex-col gap-4 animate-in zoom-in-95 duration-200">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-emerald-50 rounded-xl flex items-center justify-center text-emerald-600">
                      <Coins size={20} />
                    </div>
                    <div>
                      <h3 className="text-lg font-black text-gray-900 leading-tight">Open Store Safe</h3>
                      <p className="text-[9px] font-bold text-gray-400 uppercase tracking-widest leading-tight">
                        {storeModalStep === 'VERIFY' ? 'Step 1: Verify Carry-over' : 'Step 2: Physical Count Verification'}
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={() => setShowOpenStoreModal(false)}
                    className="p-1.5 hover:bg-gray-100 rounded-lg text-gray-400 transition-colors"
                  >
                    <X size={18} />
                  </button>
                </div>

                {storeModalStep === 'VERIFY' && storeRegisterData?.previousRegister ? (
                  <div className="space-y-4 animate-in fade-in slide-in-from-right-4 duration-300">
                    <div className="bg-slate-900 rounded-[1.5rem] p-6 border border-slate-800 shadow-xl overflow-hidden relative group">
                      <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:opacity-10 transition-opacity">
                        <Clock size={80} className="text-white" />
                      </div>
                      <div className="flex items-center justify-between mb-4">
                        <span className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em]">Previous Day's Closing</span>
                        <div className="px-2.5 py-1 bg-emerald-500/10 border border-emerald-500/20 rounded-lg">
                          <span className="text-[10px] font-black text-emerald-400 uppercase tracking-widest">Recorded Safe Balance</span>
                        </div>
                      </div>

                      <div className="flex items-baseline gap-2 mb-6">
                        <span className="text-3xl font-black text-white">₹{storeRegisterData.previousRegister.actualClosingCash?.toLocaleString()}</span>
                        <span className="text-xs font-bold text-slate-500 uppercase tracking-widest">Carry-over</span>
                      </div>

                      <div className="grid grid-cols-5 gap-2 pb-6 border-b border-white/5">
                        {Object.entries(storeRegisterData.previousRegister.closingDenominations || {})
                          .filter(([_, count]) => count > 0)
                          .map(([d, c]) => (
                            <div key={d} className="text-center bg-white/5 rounded-lg py-2 border border-white/5">
                              <p className="text-[8px] font-bold text-slate-500 uppercase mb-0.5">₹{d}</p>
                              <p className="text-[11px] font-black text-white">×{c}</p>
                            </div>
                          ))
                        }
                      </div>

                      <div className="mt-4 flex items-center justify-between text-[10px] font-bold text-slate-500 uppercase tracking-widest">
                        <span>By: {storeRegisterData.previousRegister.closedBy?.name || 'Admin'}</span>
                        <span>Date: {storeRegisterData.previousRegister.date}</span>
                      </div>
                    </div>

                    <div className="bg-amber-50 border border-amber-100 rounded-2xl p-4 flex gap-3">
                      <div className="w-8 h-8 bg-amber-500 rounded-lg flex items-center justify-center text-white shrink-0">
                        <Info size={18} />
                      </div>
                      <p className="text-[11px] font-bold text-amber-900/70 leading-relaxed uppercase">
                        Please conduct a physical audit of the safe now. You must enter the actual physical count to proceed.
                      </p>
                    </div>

                    <button
                      onClick={() => setStoreModalStep('INPUT')}
                      className="w-full bg-slate-900 text-white font-black text-sm py-4 rounded-2xl hover:bg-slate-800 transition-all shadow-xl shadow-slate-900/20 flex items-center justify-center gap-2"
                    >
                      Conduct Physical Audit <ArrowRight size={18} />
                    </button>
                  </div>
                ) : (
                  <div className="space-y-4 animate-in fade-in slide-in-from-right-4 duration-300">
                    {/* Professional Mismatch Alert */}
                    {storeRegisterData?.previousRegister && storeDenomData.amount > 0 && Math.abs(storeDenomData.amount - storeRegisterData.previousRegister.actualClosingCash) > 0.01 && (
                      <div className="bg-rose-50 border-2 border-rose-100 rounded-[2rem] p-5 flex flex-col gap-3 animate-in slide-in-from-top-4 duration-300 shadow-lg shadow-rose-900/5">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 bg-rose-500 rounded-xl flex items-center justify-center text-white shadow-lg shadow-rose-500/20">
                            <AlertTriangle size={24} />
                          </div>
                          <div>
                            <h4 className="text-sm font-black text-rose-600 uppercase tracking-widest">Physical Cash Mismatch</h4>
                            <p className="text-[10px] font-black text-rose-900/40 uppercase tracking-tighter">DISCREPANCY DETECTED FROM PREVIOUS CLOSE</p>
                          </div>
                        </div>
                        <div className="bg-white/60 backdrop-blur-sm rounded-2xl p-4 border border-rose-100">
                          <div className="flex justify-between items-center">
                            <span className="text-[10px] font-black text-rose-900/60 uppercase tracking-widest">Actual Variance</span>
                            <span className="text-xl font-black text-rose-600">
                              ₹{Math.abs(storeDenomData.amount - storeRegisterData.previousRegister.actualClosingCash).toFixed(2)}
                              {storeDenomData.amount > storeRegisterData.previousRegister.actualClosingCash ? ' Extra' : ' Short'}
                            </span>
                          </div>
                          <p className="text-[9px] font-bold text-rose-900/50 mt-1 uppercase leading-tight italic">
                            Expected ₹{storeRegisterData.previousRegister.actualClosingCash.toLocaleString()} but physical count is ₹{storeDenomData.amount.toLocaleString()}.
                          </p>
                        </div>
                      </div>
                    )}

                    <div className="space-y-2">
                      <div className="flex items-center justify-between pl-1">
                        <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Enter Today's Physical Count</label>
                        {storeRegisterData?.previousRegister && (
                          <button
                            onClick={() => {
                              const denoms = storeRegisterData.previousRegister.closingDenominations || {};
                              setStoreDenomData({
                                amount: storeRegisterData.previousRegister.actualClosingCash,
                                denominations: { ...denoms }
                              });
                              toast.success('Auto-filled from yesterday');
                            }}
                            className="text-[9px] font-black text-emerald-600 uppercase tracking-tight hover:underline"
                          >
                            Auto-Fill Reference
                          </button>
                        )}
                      </div>
                      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 bg-gray-50/50 p-2 rounded-2xl border border-gray-100">
                        {denominationsList.map((denom) => (
                          <div key={denom} className="flex flex-col gap-1 bg-white p-2 rounded-xl border border-gray-100 shadow-sm group hover:border-emerald-200 transition-all">
                            <div className="flex items-center justify-between border-b border-gray-50 pb-1 mb-1">
                              <span className="text-[10px] font-black text-gray-400 group-hover:text-emerald-600">₹{denom}</span>
                              <span className="text-[9px] font-bold text-emerald-600/40 uppercase font-mono">₹{(denom * (storeDenomData.denominations[denom] || 0)).toLocaleString()}</span>
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
                        <p className="text-[9px] font-black uppercase tracking-[0.2em] opacity-60 mb-0.5">Physical Opening Balance</p>
                        <h4 className="text-2xl font-black tracking-tight">₹{(storeDenomData.amount || 0).toFixed(2)}</h4>
                      </div>
                      <div className="w-10 h-10 bg-white/20 rounded-full flex items-center justify-center">
                        <Coins size={20} />
                      </div>
                    </div>

                    <div className="flex gap-3 mt-2">
                      {storeRegisterData?.previousRegister && (
                        <button
                          onClick={() => setStoreModalStep('VERIFY')}
                          className="flex-1 bg-gray-100 text-gray-500 font-black text-[10px] py-4 rounded-2xl uppercase tracking-widest hover:bg-gray-200 transition-all"
                        >
                          Back
                        </button>
                      )}
                      <button
                        onClick={handleOpenStoreRegister}
                        disabled={isSubmitting || storeDenomData.amount <= 0}
                        className="flex-[2] bg-emerald-600 text-white font-black text-[10px] py-4 rounded-2xl uppercase tracking-widest active:scale-[0.98] transition-all flex items-center justify-center gap-2 hover:bg-emerald-700 disabled:opacity-50 shadow-xl shadow-emerald-600/20"
                      >
                        {isSubmitting ? <Loader2 className="animate-spin" size={18} /> : <><CheckCircle2 size={18} />Confirm & Open Safe</>}
                      </button>
                    </div>
                  </div>
                )}
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
      {showUnapprovedWarning && createPortal(
        <div className="fixed inset-0 z-[99999] flex items-center justify-center bg-black/60 backdrop-blur-md p-4 animate-in fade-in duration-300">
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

            <form onSubmit={(e) => {
              e.preventDefault();
              if (!depositData.description) return toast.error('Mandatory description is required to override.');
              setShowUnapprovedWarning(false);
              handleInitiateDeposit(null, true);
            }} className="flex flex-col w-full gap-4 mt-2">
              <div className="space-y-1.5 text-left w-full">
                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest pl-1">Exception Reason (Mandatory)</label>
                <textarea
                  required
                  rows={2}
                  className="w-full bg-gray-50 border border-amber-100 rounded-xl px-4 py-3 text-sm font-bold text-gray-700 focus:ring-4 focus:ring-amber-500/10 focus:border-amber-500 transition-all outline-none resize-none placeholder:text-amber-300/50"
                  placeholder="Explain why you are depositing unapproved cash..."
                  value={depositData.description}
                  onChange={(e) => setDepositData({ ...depositData, description: e.target.value })}
                />
              </div>

              <div className="flex flex-col w-full gap-3 pt-2">
                <button
                  type="submit"
                  disabled={!depositData.description || isSubmitting}
                  className="w-full bg-amber-500 hover:bg-amber-600 text-white font-black py-4 rounded-2xl transition-all shadow-xl shadow-amber-500/20 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Yes, Override & Submit Deposit
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShowUnapprovedWarning(false);
                  }}
                  className="w-full bg-gray-100 hover:bg-gray-200 text-gray-600 font-bold py-4 rounded-2xl transition-all active:scale-95"
                >
                  No, Let Me Review Agents
                </button>
              </div>
            </form>
          </div>
        </div>
        , document.body)}

      {/* ========== AGENT DENOMINATIONS MODAL ========== */}
      {viewingAgentDenoms && (
        <div className="fixed inset-0 z-[9999999] flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
          <div className="bg-white w-full max-w-sm rounded-[2rem] p-6 shadow-2xl flex flex-col gap-4 animate-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-emerald-50 rounded-xl flex items-center justify-center text-emerald-600">
                  <Coins size={20} />
                </div>
                <div>
                  <h3 className="text-sm font-black text-gray-900 leading-tight">{viewingAgentDenoms.agentName}</h3>
                  <p className="text-[9px] font-bold text-gray-400 uppercase tracking-widest leading-tight">Shift {viewingAgentDenoms.shift} Denominations • {viewingAgentDenoms.vehicleInfo}</p>
                </div>
              </div>
              <button onClick={() => setViewingAgentDenoms(null)} className="p-1.5 hover:bg-gray-100 rounded-lg text-gray-400"><X size={16} /></button>
            </div>

            <div className="bg-gray-50 border border-gray-100 p-3 rounded-2xl flex justify-between items-center">
              <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Total Submitted</span>
              <span className="text-lg font-black text-emerald-600">₹{viewingAgentDenoms.total.toLocaleString()}</span>
            </div>

            <div className="grid grid-cols-2 gap-2">
              {denominationsList.map((denom) => {
                const count = viewingAgentDenoms.denoms[denom] || 0;
                if (count === 0) return null;
                return (
                  <div key={denom} className="flex flex-col gap-1 bg-gray-50/50 p-2 rounded-xl border border-gray-100">
                    <div className="flex items-center justify-between border-b border-gray-100 pb-1 mb-1">
                      <span className="text-[10px] font-black text-gray-500">₹{denom}</span>
                      <span className="text-[9px] font-bold text-gray-400">₹{(denom * count).toLocaleString()}</span>
                    </div>
                    <div className="flex items-center gap-1.5 justify-center mt-1">
                      <span className="text-[10px] text-gray-300">×</span>
                      <span className="text-xs font-black text-gray-700">{count}</span>
                    </div>
                  </div>
                );
              })}
            </div>

            <button
              onClick={() => setViewingAgentDenoms(null)}
              className="w-full bg-gray-100 hover:bg-gray-200 text-gray-600 font-bold py-3 rounded-xl transition-all"
            >
              Close Returns
            </button>
          </div>
        </div>
      )}

      {/* ========== CONFIRM DEPOSIT MODAL ========== */}
      {showDepositConfirmModal && depositConfirmData && (
        <div className="fixed inset-0 z-[999999] flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
          <div className="bg-white w-full max-w-lg rounded-[2.5rem] p-8 shadow-2xl flex flex-col gap-6 animate-in zoom-in-95 duration-200 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 bg-emerald-50 rounded-2xl flex items-center justify-center text-emerald-600">
                  <Coins size={24} />
                </div>
                <div>
                  <h3 className="text-xl font-black text-gray-900 leading-tight">Confirm Deposit</h3>
                  <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest leading-tight">Shift {depositConfirmData.shift} Consolidated Cash</p>
                </div>
              </div>
              <button onClick={() => setShowDepositConfirmModal(false)} className="p-2 hover:bg-gray-100 rounded-xl text-gray-400"><X size={20} /></button>
            </div>

            <div className="space-y-4">
              <div className="bg-gray-50 border border-gray-100 p-4 rounded-2xl">
                <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2">Total Amount to Deposit</p>
                <p className="text-3xl font-black text-emerald-600">₹{depositConfirmData.amount.toLocaleString()}</p>
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest pl-1">Aggregated Denominations</label>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 bg-gray-50/50 p-2 rounded-2xl border border-gray-100">
                  {denominationsList.map((denom) => {
                    const count = depositConfirmData.denominations[denom] || 0;
                    return (
                      <div key={denom} className="flex flex-col gap-1 bg-white p-2 rounded-xl border border-gray-100 shadow-sm">
                        <div className="flex items-center justify-between border-b border-gray-50 pb-1 mb-1">
                          <span className="text-[10px] font-black text-gray-400">₹{denom}</span>
                          <span className="text-[9px] font-bold text-emerald-600/40 uppercase">₹{(denom * count).toLocaleString()}</span>
                        </div>
                        <div className="flex items-center gap-1.5 justify-center mt-1">
                          <span className="text-[10px] text-gray-200">×</span>
                          <span className="text-sm font-black text-gray-700">{count}</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              <div className="bg-emerald-50 border border-emerald-100 p-3 rounded-xl">
                <p className="text-[10px] font-black text-emerald-600 uppercase tracking-widest mb-1">Description</p>
                <p className="text-xs text-emerald-700 font-bold">{depositConfirmData.description}</p>
              </div>

              <button
                onClick={handleConfirmDeposit}
                disabled={isSubmitting}
                className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-black py-4 rounded-2xl transition-all shadow-xl shadow-emerald-900/20 active:scale-95 flex items-center justify-center gap-2"
              >
                {isSubmitting ? <Loader2 className="animate-spin" size={20} /> : <><CheckCircle2 size={20} />Confirm & Submit Deposit</>}
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
                  <div className="flex flex-col gap-1.5">
                    <p className="text-[9px] font-bold text-gray-400 uppercase pl-1">Available in Safe: ₹{Math.abs(storeRegisterData?.liveMetrics?.safeBalance || 0).toFixed(2)}</p>
                    {(bankData.amount > (storeRegisterData?.liveMetrics?.safeBalance || 0)) && (
                      <div className="flex items-center gap-2 px-3 py-2 bg-rose-500/10 border border-rose-500/20 rounded-xl animate-in shake duration-300">
                        <AlertTriangle size={12} className="text-rose-500 shrink-0" />
                        <p className="text-[9px] font-bold text-rose-500 uppercase tracking-tight">
                          Limit Exceeded: Exceeds Safe Balance (Max: ₹{Math.max(0, storeRegisterData?.liveMetrics?.safeBalance || 0).toFixed(2)})
                        </p>
                      </div>
                    )}
                  </div>
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
                disabled={
                  isSubmitting || 
                  bankData.amount <= 0 || 
                  !bankData.branchName ||
                  (bankData.amount > (storeRegisterData?.liveMetrics?.safeBalance || 0))
                }
                className="w-full bg-sky-600 hover:bg-sky-700 text-white font-black py-4 rounded-2xl transition-all shadow-xl shadow-sky-900/20 active:scale-95 flex items-center justify-center gap-2 disabled:opacity-40 disabled:cursor-not-allowed disabled:grayscale"
              >
                {isSubmitting ? <Loader2 className="animate-spin" size={20} /> : <><Building2 size={20} />Confirm Bank Transfer</>}
              </button>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
