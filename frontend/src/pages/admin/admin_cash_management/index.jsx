import React, { useState, useEffect } from 'react';
import { useSearchParams, useLocation } from 'react-router-dom';
import { format } from 'date-fns';
import toast from 'react-hot-toast';
import { 
  Search, Calendar, Eye, Plus, Loader2, X, Sun, Moon, ArrowLeft, 
  Smartphone, BookOpen, User, Coins, Package, Printer, Shield, 
  CheckCircle2, Info, AlertTriangle, Clock, ArrowRight, Vault, Building2, Zap, ShoppingCart, Pencil, AlertCircle, Download, FileText
} from 'lucide-react';
import { exportReportToExcel, generateReportPDF } from '../adminreports/ReportUtils';

// Shared Components
const style = document.createElement('style');
style.textContent = `
  @keyframes bounce-short {
    0%, 100% { transform: translateY(0); }
    50% { transform: translateY(-4px); }
  }
  .animate-bounce-short {
    animation: bounce-short 2s ease-in-out infinite;
  }
`;
document.head.appendChild(style);

import ShiftStatusBadge from './ShiftStatusBadge';
import ShiftSelector from './ShiftSelector';
import DenominationGrid from './DenominationGrid';
import ShiftBreakdownView from './ShiftBreakdownView';
import StoreSafeHeader from './StoreSafeHeader';
import SimulatorTools from './SimulatorTools';
import DailyReconciliationTab from './DailyReconciliationTab';
import LiveCashTab from './LiveCashTab';
import AuditLedgerTab from './AuditLedgerTab';
import StoreSelector from '../StoreSelector';

// Modals
import { 
  OpenStoreModal, CloseStoreModal, EditStoreModal, SafeMovementModal, 
  BankDepositModal, DepositConfirmModal 
} from './StoreSafeModals';
import { 
  AssignFloatModal, EditReconciliationModal, DeleteModal, 
  UnapprovedWarningModal, ViewAgentDenomsModal, EditDepositModal, 
  ImagePreviewModal 
} from './AgentModals';
import AssignFloatView from './AssignFloatView';

// Services
import { 
  getAdminReconciliation, adminSubmitOpeningCash, adminUpdateReconciliation, 
  adminDeleteReconciliation, adminReviewClosing, getStoreCashRegister, 
  getStoreCashLedger, createSafeMovement, openStoreCashRegister, 
  closeStoreCashRegister, createStoreDeposit, updateStoreCashRegister, 
  updateStoreDeposit, deleteStoreDeposit, addBankDeposit, resetStoreCashRegister 
} from '../../../services/cashService';
import adminAPI from '../../../services/adminService';
import { useUserStore } from '../../../store/userStore';

export default function AdminCashManagementContent() {
  const [activeTab, setActiveTab] = useState('reconciliation');
  const [date, setDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [summaries, setSummaries] = useState([]);
  const [vehicles, setVehicles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [previewImage, setPreviewImage] = useState(null);
  const [viewingOrder, setViewingOrder] = useState(null);
  const [ledgerFilter, setLedgerFilter] = useState('ALL');
  const [viewingAssignFloat, setViewingAssignFloat] = useState(false);
  const [storeLoading, setStoreLoading] = useState(true);

  const user = useUserStore(s => s.user);
  const can = useUserStore(s => s.can);
  const [searchParams, setSearchParams] = useSearchParams();
  const location = useLocation();
  const isGlobalRole = user?.role === 'TENANT_OWNER' || user?.role === 'SUPER_ADMIN' || (user?.role === 'ADMIN' && !user?.customRoleId) || user?.portalType === 'ADMIN';
  const storeFilterId = searchParams.get('storeId') || (!isGlobalRole ? user?.storeId : null);
  const isTenantRoute = location.pathname.includes('/tenant/');

  // Assignment Modal
  const [showAssignModal, setShowAssignModal] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [assignmentData, setAssignmentData] = useState({
    vehicleId: '', shift: 1, amount: 0, isNoService: false,
    denominations: { "500": 0, "200": 0, "100": 0, "50": 0, "20": 0, "10": 0, "5": 0, "2": 0, "1": 0 }
  });

  // Edit Reconciliation Modal
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingSummary, setEditingSummary] = useState(null);
  const [editData, setEditData] = useState({
    openingCash: 0, shift: 1, remark: '', isNoService: false,
    denominations: { "500": 0, "200": 0, "100": 0, "50": 0, "20": 0, "10": 0, "5": 0, "2": 0, "1": 0 }
  });

  // Delete Confirmation Modal
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deletingSummary, setDeletingSummary] = useState(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const [viewingSummary, setViewingSummary] = useState(null);

  // Review (Closing Edit) State
  const [isReviewEditing, setIsReviewEditing] = useState(null);
  const [reviewEditData, setReviewEditData] = useState({
    actualCash: 0, upiSales: 0, cardSales: 0, remark: '',
    denominations: { "500": 0, "200": 0, "100": 0, "50": 0, "20": 0, "10": 0, "5": 0, "2": 0, "1": 0 }
  });
  const [activeCorrectionTab, setActiveCorrectionTab] = useState('CASH');
  const [appliedParts, setAppliedParts] = useState({ CASH: false, UPI: false, CARD: false });

  const [showUnapprovedWarning, setShowUnapprovedWarning] = useState(false);
  const [unapprovedInfo, setUnapprovedInfo] = useState({ count: 0, shift: 1 });

  const [showBankModal, setShowBankModal] = useState(false);
  const [bankData, setBankData] = useState({
    amount: 0, branchName: '', receiptImage: '', depositedBy: '', adminId: '', remark: ''
  });

  // Store Safe State
  const [storeRegisterData, setStoreRegisterData] = useState(null);
  const [showOpenStoreModal, setShowOpenStoreModal] = useState(false);
  const [storeModalStep, setStoreModalStep] = useState('VERIFY');
  const [showCloseStoreModal, setShowCloseStoreModal] = useState(false);
  const [storeDenomData, setStoreDenomData] = useState({
    amount: 0, remarks: '',
    denominations: { "500": 0, "200": 0, "100": 0, "50": 0, "20": 0, "10": 0, "5": 0, "2": 0, "1": 0 }
  });

  const [showDepositModal, setShowDepositModal] = useState(false);
  const [depositData, setDepositData] = useState({
    shift: 1, description: '', amount: 0,
    denominations: { "500": 0, "200": 0, "100": 0, "50": 0, "20": 0, "10": 0, "5": 0, "2": 0, "1": 0 }
  });

  const [showDepositConfirmModal, setShowDepositConfirmModal] = useState(false);
  const [depositConfirmData, setDepositConfirmData] = useState(null);

  const [viewingAgentDenoms, setViewingAgentDenoms] = useState(null);

  const [showEditStoreModal, setShowEditStoreModal] = useState(false);
  const [showEditDepositModal, setShowEditDepositModal] = useState(false);
  const [editingDeposit, setEditingDeposit] = useState(null);

  // Ledger State
  const [ledgerData, setLedgerData] = useState(null);
  const [ledgerLoading, setLedgerLoading] = useState(false);
  const [showSafeMovementModal, setShowSafeMovementModal] = useState(false);
  const [safeMovementData, setSafeMovementData] = useState({
    amount: '', type: 'DEPOSIT', description: '',
    denominations: { 500: 0, 200: 0, 100: 0, 50: 0, 20: 0, 10: 0, 5: 0, 2: 0, 1: 0 }
  });

  const denominationsList = [500, 200, 100, 50, 20, 10, 5, 2, 1];

  const canViewCashSection = (sectionKey) => {
    if (isGlobalRole) return true;
    if (can('CASH', 'READ', sectionKey)) return true;
    // Fallback for legacy roles
    return user?.permissions?.CASH_TARGET_SECTIONS?.includes(sectionKey);
  };

  const availableTabs = [
    { key: 'reconciliation', label: 'Daily Reconciliation', section: 'RECONCILIATION' },
    { key: 'live', label: 'Live Cash Status', section: 'LIVE_CASH' },
    { key: 'ledger', label: 'Audit Ledger', section: 'AUDIT_LEDGER' }
  ].filter(tab => canViewCashSection(tab.section));

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
      setAppliedParts(prev => ({ ...prev, CASH: false }));
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

  const isShiftDeposited = (shift) => storeRegisterData?.storeDeposits?.some(d => d.shift === shift);
  const hasShiftCompletions = (shift) => summaries.some(s => s.shiftDetails?.[`shift${shift}`]?.closing);

  const fetchSummaries = async () => {
    setLoading(true);
    try {
      const data = await getAdminReconciliation(date, storeFilterId);
      setSummaries(data);
    } catch (error) {
      toast.error('Failed to fetch cash summaries');
    } finally {
      setLoading(false);
    }
  };

  const fetchVehicles = async () => {
    try {
      const { data } = await adminAPI.getVehicles({ storeId: storeFilterId });
      setVehicles(data);
    } catch (error) {
      console.error('Error fetching vehicles:', error);
    }
  };

  const fetchStoreRegister = async () => {
    setStoreLoading(true);
    try {
      const data = await getStoreCashRegister(date, storeFilterId);
      setStoreRegisterData(data);
    } catch (error) {
      setStoreRegisterData(null);
    } finally {
      setStoreLoading(false);
    }
  };

  const fetchLedger = async () => {
    setLedgerLoading(true);
    try {
      const data = await getStoreCashLedger(date, storeFilterId);
      setLedgerData(data);
    } catch (error) {
      setLedgerData(null);
    } finally {
      setLedgerLoading(false);
    }
  };

  useEffect(() => {
    // Clear data to avoid showing stale state from previous selection
    setSummaries([]);
    setVehicles([]);
    setStoreRegisterData(null);
    setLedgerData(null);
    
    fetchSummaries();
    fetchVehicles();
    fetchStoreRegister();
  }, [date, storeFilterId]);

  useEffect(() => {
    if (activeTab === 'ledger') fetchLedger();
  }, [date, activeTab, storeFilterId]);

  useEffect(() => {
    if (availableTabs.length > 0 && !availableTabs.some(t => t.key === activeTab)) {
      setActiveTab(availableTabs[0].key);
    }
  }, [availableTabs, activeTab]);

  useEffect(() => {
    if (showOpenStoreModal) {
      if (storeRegisterData?.previousRegister) {
        setStoreModalStep('VERIFY');
        setStoreDenomData({
          amount: storeRegisterData.previousRegister.actualClosingCash,
          denominations: { ...(storeRegisterData.previousRegister.closingDenominations || {}) }
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

  const handleSafeMovement = async () => {
    const amount = parseFloat(safeMovementData.amount);
    if (!amount || amount <= 0) return toast.error('Enter a valid amount');
    if (safeMovementData.type === 'DEPOSIT') {
      const available = storeRegisterData?.liveMetrics?.availableCash || 0;
      if (amount > available) return toast.error(`Limit Exceeded (Max: ₹${Math.max(0, available).toFixed(2)})`);
    } else {
      const safe = storeRegisterData?.liveMetrics?.safeBalance || 0;
      if (amount > safe) return toast.error(`Limit Exceeded (Max: ₹${Math.max(0, safe).toFixed(2)})`);
    }
    try {
      await createSafeMovement({ date, amount, type: safeMovementData.type, description: safeMovementData.description, denominations: safeMovementData.denominations, storeId: storeFilterId });
      toast.success(safeMovementData.type === 'DEPOSIT' ? 'Moved to Safe' : 'Moved to Available');
      setShowSafeMovementModal(false);
      setSafeMovementData({ amount: '', type: 'DEPOSIT', description: '', denominations: { 500: 0, 200: 0, 100: 0, 50: 0, 20: 0, 10: 0, 5: 0, 2: 0, 1: 0 } });
      fetchStoreRegister();
      if (activeTab === 'ledger') fetchLedger();
    } catch (error) { toast.error('Failed to record movement'); }
  };

  const handleAssignFloat = async (e) => {
    e.preventDefault();
    if (!assignmentData.vehicleId) return toast.error('Select a vehicle');
    if (!assignmentData.isNoService && assignmentData.amount <= 0) return toast.error('Enter valid denominations');
    const agent = vehicles.find(v => v.id === assignmentData.vehicleId)?.assignedUsers?.find(u => u.role === 'SALES_AGENT');
    if (!agent) return toast.error('No agent assigned');
    const requestedAmount = assignmentData.isNoService ? 0 : assignmentData.amount;
    const availableSafeBalance = storeRegisterData?.liveMetrics?.liveExpected || 0;
    if (requestedAmount > availableSafeBalance) return toast.error(`Insufficient balance (Available: ₹${availableSafeBalance.toFixed(2)})`);
    setIsSubmitting(true);
    try {
      await adminSubmitOpeningCash({ 
        vehicleId: assignmentData.vehicleId, 
        userId: agent.id, 
        totalOpeningCash: requestedAmount, 
        denominations: assignmentData.isNoService ? {} : assignmentData.denominations, 
        shift: assignmentData.shift, 
        isNoService: assignmentData.isNoService || false, 
        date,
        storeId: storeFilterId 
      });
      toast.success('Float assigned');
      setShowAssignModal(false);
      setViewingAssignFloat(false);
      setAssignmentData({ vehicleId: '', shift: 1, amount: 0, isNoService: false, denominations: { "500": 0, "200": 0, "100": 0, "50": 0, "20": 0, "10": 0, "5": 0, "2": 0, "1": 0 } });
      fetchSummaries(); fetchStoreRegister();
    } catch (error) { toast.error(error.response?.data?.message || 'Failed'); } finally { setIsSubmitting(false); }
  };

  const handleOpenStoreRegister = async () => {
    if (storeDenomData.amount <= 0) return toast.error('Enter valid denominations');
    setIsSubmitting(true);
    try {
      await openStoreCashRegister({ date, openingCash: storeDenomData.amount, denominations: storeDenomData.denominations, storeId: storeFilterId });
      toast.success('Register opened'); setShowOpenStoreModal(false); fetchStoreRegister();
    } catch (err) { toast.error('Failed'); } finally { setIsSubmitting(false); }
  };

  const handleCloseStoreRegister = async () => {
    const expected = storeRegisterData?.liveMetrics?.availableCash || 0;
    const diff = storeDenomData.amount - expected;
    if (Math.abs(diff) > 0.01 && !storeDenomData.remarks) return toast.error('Description required for variance');
    setIsSubmitting(true);
    try {
      if (storeRegisterData?.storeRegister?.status === 'CLOSED') {
        await updateStoreCashRegister({ date, actualClosingCash: storeDenomData.amount, denominations: storeDenomData.denominations, remarks: storeDenomData.remarks, isClosingUpdate: true, storeId: storeFilterId });
      } else {
        await closeStoreCashRegister({ date, actualClosingCash: storeDenomData.amount, denominations: storeDenomData.denominations, remarks: storeDenomData.remarks, storeId: storeFilterId });
      }
      toast.success('Safe closed'); setShowCloseStoreModal(false); fetchStoreRegister();
    } catch (err) { toast.error('Failed'); } finally { setIsSubmitting(false); }
  };

  const handleInitiateDeposit = (shiftOverride, force = false) => {
    const shift = (typeof shiftOverride === 'number') ? shiftOverride : depositData.shift;
    if (!hasShiftCompletions(shift)) return toast.error(`Shift ${shift} cannot be deposited yet.`);
    const shiftKey = `shift${shift}`;
    const unapproved = summaries.filter(s => s.shiftDetails?.[shiftKey]?.opening && (!s.shiftDetails?.[shiftKey]?.closing || s.shiftDetails?.[shiftKey]?.closing.status !== 'APPROVED'));
    if (unapproved.length > 0 && !force) {
      setUnapprovedInfo({ count: unapproved.length, shift }); setShowUnapprovedWarning(true); return;
    }
    const autoAmount = summaries.reduce((sum, s) => sum + (s.shiftDetails?.[shiftKey]?.closing?.actualCash || 0), 0);
    if (autoAmount <= 0) return toast.error('No cash collected');
    const totalDenoms = { "500": 0, "200": 0, "100": 0, "50": 0, "20": 0, "10": 0, "5": 0, "2": 0, "1": 0 };
    summaries.forEach(s => {
      const denoms = s.shiftDetails?.[shiftKey]?.closing?.denominations || {};
      Object.entries(denoms).forEach(([d, c]) => { totalDenoms[d] += parseInt(c) || 0; });
    });
    setDepositConfirmData({ shift, amount: autoAmount, denominations: totalDenoms, description: (force && depositData.description) ? depositData.description : `Consolidated Deposit S${shift}` });
    setShowDepositConfirmModal(true);
  };

  const handleConfirmDeposit = async () => {
    setIsSubmitting(true);
    try {
      await createStoreDeposit({ date, shift: depositConfirmData.shift, amount: depositConfirmData.amount, denominations: depositConfirmData.denominations, description: depositConfirmData.description, storeId: storeFilterId });
      toast.success('Deposited'); setShowDepositConfirmModal(false); fetchStoreRegister();
    } catch (err) { toast.error('Failed'); } finally { setIsSubmitting(false); }
  };

  const handleCreateBankDeposit = async (e) => {
    e.preventDefault();
    if (bankData.amount <= 0) return toast.error('Invalid amount');
    if (bankData.amount > (storeRegisterData?.liveMetrics?.safeBalance || 0)) return toast.error('Exceeds safe balance');
    setIsSubmitting(true);
    try {
      await addBankDeposit({ date, ...bankData, storeId: storeFilterId });
      toast.success('Transferred'); setShowBankModal(false); fetchStoreRegister();
    } catch (err) { toast.error('Failed'); } finally { setIsSubmitting(false); }
  };

  const handleUpdateStoreRegister = async () => {
    setIsSubmitting(true);
    try {
      await updateStoreCashRegister({ date, openingCash: storeDenomData.amount, denominations: storeDenomData.denominations, storeId: storeFilterId });
      toast.success('Updated'); setShowEditStoreModal(false); fetchStoreRegister();
    } catch (err) { toast.error('Failed'); } finally { setIsSubmitting(false); }
  };

  const handleUpdateDeposit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      await updateStoreDeposit(editingDeposit.id, { amount: depositData.amount, denominations: depositData.denominations, description: depositData.description });
      toast.success('Updated'); setShowEditDepositModal(false); fetchStoreRegister();
    } catch (err) { toast.error('Failed'); } finally { setIsSubmitting(false); }
  };

  const handleDeleteDeposit = async (id) => {
    if (!window.confirm('Delete?')) return;
    setIsSubmitting(true);
    try {
      await deleteStoreDeposit(id); toast.success('Deleted'); fetchStoreRegister();
    } catch (err) { toast.error('Failed'); } finally { setIsSubmitting(false); }
  };

  const handleReviewClosing = async (vehicleId, date, shift, status, additionalData = {}) => {
    setIsSubmitting(true);
    try {
      await adminReviewClosing({ vehicleId, date, shift, status, ...additionalData, storeId: storeFilterId });
      toast.success(`Closing ${status.toLowerCase()}`);
      setIsReviewEditing(null); fetchSummaries(); fetchStoreRegister(); setViewingSummary(null);
    } catch (error) { toast.error('Failed to review'); } finally { setIsSubmitting(false); }
  };

  const handleOpenEdit = (summary) => {
    setEditingSummary(summary);
    const s1Opening = summary.shiftDetails?.shift1?.opening;
    setEditData({
      openingCash: s1Opening?.totalOpeningCash || 0,
      shift: 1,
      remark: s1Opening?.remark || '',
      isNoService: s1Opening?.isNoService || false,
      denominations: { ...(s1Opening?.denominations || { "500": 0, "200": 0, "100": 0, "50": 0, "20": 0, "10": 0, "5": 0, "2": 0, "1": 0 }) }
    });
    setShowEditModal(true);
  };

  const handleUpdateReconciliation = async (e) => {
    e.preventDefault();
    const available = storeRegisterData?.liveMetrics?.liveExpected || 0;
    const oldOpening = editingSummary.shiftDetails?.shift1?.opening?.totalOpeningCash || 0;
    const difference = (editData.isNoService ? 0 : editData.openingCash) - oldOpening;
    if (difference > available) return toast.error('Insufficient safe balance');
    setIsSubmitting(true);
    try {
      await adminUpdateReconciliation({ vehicleId: editingSummary.vehicleId, date: editingSummary.date, openingCash: editData.isNoService ? 0 : editData.openingCash, remark: editData.remark, denominations: editData.isNoService ? {} : editData.denominations, shift: 1, isNoService: editData.isNoService || false, storeId: storeFilterId });
      toast.success('Updated'); setShowEditModal(false); fetchSummaries(); fetchStoreRegister();
    } catch (error) { toast.error('Failed'); } finally { setIsSubmitting(false); }
  };

  const handleDeleteReconciliation = async () => {
    setIsDeleting(true);
    try {
      await adminDeleteReconciliation(deletingSummary.vehicleId, deletingSummary.date);
      toast.success('Deleted'); setShowDeleteModal(false); fetchSummaries(); fetchStoreRegister();
    } catch (error) { toast.error('Failed'); } finally { setIsDeleting(false); }
  };

  const handleExportExcel = () => {
    exportReportToExcel('cash-reconciliation', filteredSummaries);
  };

  const handleExportPDF = () => {
    generateReportPDF('cash-reconciliation', filteredSummaries);
  };

  const handlePrint = () => {
    generateReportPDF('cash-reconciliation', filteredSummaries, true);
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
            .a4-container { width: 210mm; min-height: 297mm; padding: 2.54cm; margin: 0 auto; background: white; box-shadow: 0 10px 25px rgba(0,0,0,0.1); border: 1px solid #e5e7eb; position: relative; display: flex; flex-direction: column; }
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
            .signature-section { margin-top: auto; display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 30px; padding-top: 40px; border-top: 1px solid #f1f1f1; }
            .sig-box { text-align: center; }
            .sig-line { border-top: 1px solid #1f2937; margin-bottom: 8px; }
            .sig-label { font-size: 10px; font-weight: 800; text-transform: uppercase; color: #6b7280; }
            @media print { body { background: white; padding: 0; } .a4-container { box-shadow: none; border: none; width: 100%; margin: 0; height: auto; } .no-print { display: none; } }
          </style>
        </head>
        <body>
          <div class="a4-container">
            <div class="header">
              <div class="logo-section"><h1>VILLAGKART</h1><p>Advanced Sales Tracking System</p></div>
              <div class="report-info"><div class="report-id">Document No</div><div class="report-val">REP/CASH/${date.replace(/-/g, '')}/${shift}</div></div>
            </div>
            <div class="main-title"><h2>Shift Deposit Report</h2></div>
            <div class="meta-grid">
              <div class="meta-box"><div class="meta-label">Operation Details</div><div class="meta-value">Store: VILLAGKART MAIN OFFICE</div><div class="meta-value">Collection Date: ${reportDate}</div></div>
              <div class="meta-box" style="border-left: 4px solid ${shift === 1 ? '#f59e0b' : '#6366f1'}"><div class="meta-label">Shift Identification</div><div class="meta-value" style="font-size: 16px">${shift === 1 ? 'Day' : 'Night'} (Shift ${shift})</div><div class="meta-value" style="color: #059669">${depositDetails ? 'Status: DEPOSITED' : 'Status: PENDING'}</div></div>
            </div>
            <table>
              <thead><tr><th style="width: 40%">Vehicle & Denominations</th><th style="width: 20%">Agent Name</th><th style="width: 25%">Status / Remarks</th><th style="width: 15%; text-align: right">Amount</th></tr></thead>
              <tbody>
                ${shiftData.map(v => {
                  const status = v.closing?.status || 'PENDING';
                  const isCorrected = v.closing?.isCorrected || v.closing?.remark;
                  return `
                  <tr>
                    <td>
                      <div class="v-num">${v.vehicle}</div>
                      <div class="v-denoms">
                        ${(Object.entries(v.closing?.denominations || {}).filter(([_, c]) => c > 0).map(([d, c]) => `<span class="v-denom-pill">₹${d} × ${c}</span>`).join('')) || '<span class="v-denom-pill">No Denoms</span>'}
                      </div>
                    </td>
                    <td style="font-weight: 700">${v.agentName}</td>
                    <td>
                      <div style="font-weight: 800; font-size: 9px; color: ${status === 'APPROVED' ? '#059669' : status === 'REJECTED' ? '#dc2626' : '#b45309'}">
                        ${status} ${isCorrected ? '• CORRECTED' : ''}
                      </div>
                      ${v.closing?.remark ? `<div style="font-size: 8px; color: #6b7280; font-style: italic; margin-top: 2px">"${v.closing.remark}"</div>` : ''}
                    </td>
                    <td style="text-align: right; font-weight: 800; font-family: monospace">₹${(v.closing?.actualCash || 0).toFixed(2)}</td>
                  </tr>`;
                }).join('')}
              </tbody>
            </table>
            <div class="total-section"><div class="total-label">Grand Total Shift Handover</div><div class="total-value">₹${totalCash.toFixed(2)}</div></div>
            <div class="cons-denoms">
              <div class="cons-title">Physical Cash Inventory Summary (Consolidated)</div>
              <div class="cons-grid">${[500, 200, 100, 50, 20, 10, 5, 2, 1].map(d => `<div class="cons-item"><div class="cons-d">₹${d}</div><div class="cons-c">${aggregatedDenoms[d] || 0}</div></div>`).join('')}</div>
            </div>
            <div class="signature-section"><div class="sig-box"><div class="sig-line"></div><div class="sig-label">Driver / Agent Signal</div></div><div class="sig-box"><div class="sig-line"></div><div class="sig-label">Cashier / Verifier</div><div style="font-size: 11px; font-weight: 800; margin-bottom: 2px">${adminName}</div></div><div class="sig-box"><div class="sig-line"></div><div class="sig-label">Operations Manager</div></div></div>
          </div>
          <div class="no-print" style="position: fixed; bottom: 30px; left: 50%; transform: translateX(-50%); display: flex; gap: 15px;">
            <button onclick="window.print()" style="background: #111827; color: white; border: none; padding: 14px 28px; border-radius: 12px; font-weight: 800; cursor: pointer;">Print Document</button>
            <button onclick="window.close()" style="background: white; color: #374151; border: 1px solid #e5e7eb; padding: 14px 28px; border-radius: 12px; font-weight: 800; cursor: pointer;">Close Preview</button>
          </div>
        </body>
      </html>
    `);
    printWindow.document.close();
  };


  if (viewingSummary) {
    return (
      <div className="p-6 max-w-7xl mx-auto space-y-6">
        <ShiftBreakdownView 
          viewingSummary={viewingSummary} setViewingSummary={setViewingSummary}
          isReviewEditing={isReviewEditing} setIsReviewEditing={setIsReviewEditing}
          activeCorrectionTab={activeCorrectionTab} setActiveCorrectionTab={setActiveCorrectionTab}
          reviewEditData={reviewEditData} setReviewEditData={setReviewEditData}
          appliedParts={appliedParts} setAppliedParts={setAppliedParts}
          handleDenominationChange={handleDenominationChange} handleReviewClosing={handleReviewClosing}
          isSubmitting={isSubmitting}
          can={can}
        />
      </div>
    );
  }

  if (viewingAssignFloat) {
    return (
      <div className="p-6 max-w-7xl mx-auto space-y-6">
        <AssignFloatView 
          onClose={() => setViewingAssignFloat(false)}
          assignmentData={assignmentData} setAssignmentData={setAssignmentData}
          vehicles={vehicles} summaries={summaries}
          handleDenominationChange={handleDenominationChange}
          handleAssignFloat={handleAssignFloat}
          isSubmitting={isSubmitting}
        />
      </div>
    );
  }

  return (
    <>
      {showDepositModal && canViewCashSection('SHIFT_DEPOSIT') ? (
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
            <div className="flex gap-2 bg-gray-100 p-1.5 rounded-2xl w-fit mx-auto md:mx-0">
              {[1, 2].map((s) => (
                <button
                  type="button" key={s}
                  onClick={() => setDepositData({ ...depositData, shift: s })}
                  className={`px-8 py-3 rounded-xl text-xs font-black uppercase tracking-wider transition-all flex items-center gap-2 ${depositData.shift === s ? (s === 1 ? 'bg-amber-500 text-white shadow-xl shadow-amber-500/20' : 'bg-indigo-500 text-white shadow-xl shadow-indigo-500/20') : 'text-gray-400 hover:text-gray-600 hover:bg-gray-200'}`}
                >
                  {s === 1 ? <Sun size={16} /> : <Moon size={16} />}
                  Shift {s}
                </button>
              ))}
            </div>

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
                if (closingDenoms) Object.keys(closingDenoms).forEach(d => { aggregatedDenominations[d] += parseInt(closingDenoms[d]) || 0; });
              });

              return (
                <div key={shift} className={`relative bg-white rounded-[2rem] border overflow-hidden shadow-sm animate-in fade-in duration-300 ${shift === 1 ? 'border-amber-100' : 'border-indigo-100'} ${isDeposited ? 'ring-4 ring-emerald-500/20' : ''}`}>
                  {/* Finalized Watermark */}
                  {isDeposited && (
                    <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 pointer-events-none opacity-[0.03] rotate-[-12deg]">
                      <CheckCircle2 size={400} />
                    </div>
                  )}

                  <div className={`px-6 py-5 flex items-center justify-between border-b ${shift === 1 ? 'bg-amber-50/50 border-amber-100' : 'bg-indigo-50/50 border-indigo-100'}`}>
                    <div className="flex items-center gap-3">
                      <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-white ${shift === 1 ? 'bg-amber-500' : 'bg-indigo-500'}`}>
                        {shift === 1 ? <Sun size={20} /> : <Moon size={20} />}
                      </div>
                      <div className="flex flex-col">
                        <h3 className={`text-lg font-black uppercase tracking-tight ${shift === 1 ? 'text-amber-900' : 'text-indigo-900'}`}>Shift {shift} Collection Report</h3>
                        {isDeposited && (
                          <div className="flex items-center gap-1.5 mt-0.5">
                        <CheckCircle2 size={12} className="text-emerald-500" />
                        <span className="text-[10px] font-black text-emerald-600 uppercase tracking-widest">Finalized & Deposited to Safe</span>
                      </div>
                    )}
                  </div>
                </div>
                {isDeposited && (
                  <div className="bg-emerald-500 text-white px-4 py-2 rounded-2xl flex items-center gap-2 shadow-lg shadow-emerald-500/20 animate-bounce-short">
                    <CheckCircle2 size={16} />
                    <span className="text-xs font-black uppercase tracking-widest">Completed</span>
                  </div>
                )}
                    {!isDeposited && isGlobalRole && (
                      <div className="text-right">
                        <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest">Shift Status</p>
                        <p className={`text-[11px] font-black uppercase tracking-tight ${hasCompletions ? 'text-amber-600' : 'text-gray-400'}`}>
                          {hasCompletions ? 'Awaiting Deposit' : 'In Progress'}
                        </p>
                      </div>
                    )}
                  </div>
                  <div className="p-6">
                    <table className="w-full text-left">
                      <thead>
                        <tr className="border-b border-gray-100 pb-2">
                          <th className="px-4 py-3 text-[10px] font-black text-gray-400 uppercase tracking-widest">Agent Info</th>
                          <th className="px-4 py-3 text-[10px] font-black text-gray-400 uppercase tracking-widest text-right">Cash Collected</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-50">
                        {shiftAgents.map((agentSum) => {
                          const details = agentSum.shiftDetails[shiftKey];
                          const agentName = agentSum.vehicle?.assignedUsers?.find(u => u.role === 'SALES_AGENT')?.name || 'Unknown Agent';
                          return (
                            <tr key={agentSum.id} className="hover:bg-gray-50/50">
                              <td className="px-4 py-4">
                                <p className="text-sm font-black text-gray-900">{agentName}</p>
                                <p className="text-[10px] font-bold text-gray-400 uppercase">{agentSum.vehicle?.vehicleNumber}</p>
                              </td>
                              <td className="px-4 py-4 text-right font-black">₹{(details.closing?.actualCash || 0).toFixed(2)}</td>
                            </tr>
                          );
                        })}
                      </tbody>
                      <tfoot>
                        <tr className="bg-gray-50/50">
                          <td className="px-4 py-4 text-right text-[10px] font-black text-gray-400 uppercase tracking-widest">Total Collection</td>
                          <td className="px-4 py-4 text-right font-black text-xl text-emerald-600">₹{totalCashCollected.toFixed(2)}</td>
                        </tr>
                      </tfoot>
                    </table>
                    <div className="mt-8 flex justify-between gap-4">
                      <button onClick={() => handlePrintShiftReport(shift, shiftAgents.map(a => ({ vehicle: a.vehicle?.vehicleNumber, agentName: a.vehicle?.assignedUsers?.find(u => u.role === 'SALES_AGENT')?.name || 'N/A', closing: a.shiftDetails[shiftKey].closing })), aggregatedDenominations, totalCashCollected)} className="px-8 py-4 rounded-2xl text-xs font-black uppercase tracking-widest text-emerald-700 bg-emerald-50 border-2 border-emerald-100 hover:bg-emerald-100 transition-all flex items-center gap-2">
                        <Printer size={18} /> Print Report
                      </button>
                      {!isDeposited && can('CASH', 'CREATE', 'SHIFT_DEPOSIT') && (
                        <button onClick={() => handleInitiateDeposit(shift)} disabled={!hasCompletions || isSubmitting} className={`px-10 py-4 rounded-2xl text-xs font-black uppercase tracking-widest text-white shadow-xl transition-all ${shift === 1 ? 'bg-amber-500 hover:bg-amber-600 shadow-amber-500/20' : 'bg-indigo-500 hover:bg-indigo-600 shadow-indigo-500/20'} disabled:opacity-50`}>
                          {isSubmitting ? <Loader2 className="animate-spin" size={18} /> : <CheckCircle2 size={18} />} Approve & Submit
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })()}
          </div>
        </div>
      ) : (
        <div className="p-4 sm:p-8 max-w-[1600px] mx-auto space-y-8 animate-in fade-in duration-700 bg-gray-50/30 min-h-screen">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6">
            <div className="flex items-center gap-4">
              {isGlobalRole && searchParams.get('storeId') && (
                <button
                  onClick={() => setSearchParams({})}
                  className="w-12 h-12 rounded-2xl bg-white border border-gray-100 text-gray-400 hover:text-emerald-600 hover:border-emerald-200 hover:shadow-lg hover:shadow-emerald-500/10 transition-all flex items-center justify-center group"
                  title="Back to all branches"
                >
                  <ArrowLeft size={22} className="group-hover:-translate-x-1 transition-transform" />
                </button>
              )}
              <div>
                <h1 className="text-3xl font-black text-gray-900 tracking-tight flex items-center gap-3">
                  <Coins className="text-emerald-500" size={32} /> Cash Management
                </h1>
                <p className="text-xs font-bold text-gray-400 uppercase tracking-[0.2em] mt-1">Daily Reconciliation & Safe Control</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <div className="relative group">
                <Calendar className="absolute left-4 top-1/2 -translate-y-1/2 text-emerald-500" size={18} />
                <input 
                  type="date" value={date} onChange={(e) => setDate(e.target.value)}
                  className="bg-white border border-gray-100 pl-12 pr-6 py-3.5 rounded-2xl text-sm font-black text-gray-700 focus:ring-4 focus:ring-emerald-500/10 focus:border-emerald-500 outline-none transition-all shadow-sm cursor-pointer"
                />
              </div>
              {can('CASH', 'CREATE', 'RECONCILIATION') && (
                <div className="flex items-center gap-2">
                  <button
                    onClick={handleExportPDF}
                    className="p-3.5 bg-white border border-gray-100 text-gray-500 hover:text-rose-600 hover:bg-rose-50 rounded-2xl transition-all shadow-sm flex items-center gap-2 font-black text-xs uppercase"
                    title="Export PDF"
                  >
                    <FileText size={18} />
                  </button>
                  <button
                    onClick={handlePrint}
                    className="p-3.5 bg-white border border-gray-100 text-gray-500 hover:text-blue-600 hover:bg-blue-50 rounded-2xl transition-all shadow-sm flex items-center gap-2 font-black text-xs uppercase"
                    title="Print Report"
                  >
                    <Printer size={18} />
                  </button>
                  <button
                    onClick={handleExportExcel}
                    className="p-3.5 bg-white border border-gray-100 text-gray-500 hover:text-emerald-600 hover:bg-emerald-50 rounded-2xl transition-all shadow-sm flex items-center gap-2 font-black text-xs uppercase"
                    title="Export Excel"
                  >
                    <Download size={18} />
                  </button>
                  <button 
                    onClick={() => {
                      if (!storeRegisterData?.storeRegister || storeRegisterData.storeRegister.status !== 'OPEN') return toast.error('Initialize Safe first');
                      setViewingAssignFloat(true);
                    }}
                    className="bg-emerald-600 hover:bg-emerald-700 text-white px-8 py-4 rounded-2xl text-xs font-black uppercase tracking-widest transition-all shadow-xl shadow-emerald-600/20 active:scale-95 flex items-center gap-2"
                  >
                    <Plus size={18} strokeWidth={3} /> Assign Float
                  </button>
                </div>
              )}
            </div>
          </div>

          {canViewCashSection('STORE_SAFE') || canViewCashSection('SHIFT_DEPOSIT') || canViewCashSection('LIVE_CASH') ? (
            <StoreSafeHeader 
              storeRegisterData={storeRegisterData} summaries={summaries} user={user}
              storeLoading={storeLoading}
              setShowOpenStoreModal={setShowOpenStoreModal} setShowDepositModal={setShowDepositModal}
              setShowSafeMovementModal={setShowSafeMovementModal} setShowBankModal={setShowBankModal}
              setShowCloseStoreModal={setShowCloseStoreModal} setShowEditStoreModal={setShowEditStoreModal}
              setSafeMovementData={setSafeMovementData} setBankData={setBankData} setStoreDenomData={setStoreDenomData}
              isShiftDeposited={isShiftDeposited} setActiveTab={setActiveTab}
              setEditingDeposit={setEditingDeposit} setDepositData={setDepositData}
              setShowEditDepositModal={setShowEditDepositModal} handleDeleteDeposit={handleDeleteDeposit} toast={toast}
              can={can}
              canViewCashSection={canViewCashSection}
            />
          ) : null}

          <SimulatorTools resetStoreCashRegister={resetStoreCashRegister} fetchStoreRegister={fetchStoreRegister} date={date} setDate={setDate} toast={toast} />

          {availableTabs.length > 0 && (
            <div className="space-y-6">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="flex gap-2 bg-gray-100 p-1 rounded-2xl w-fit">
                  {availableTabs.map(tab => (
                    <button 
                      key={tab.key} onClick={() => setActiveTab(tab.key)}
                      className={`px-6 py-2.5 rounded-xl text-xs font-bold uppercase tracking-wider transition-all ${activeTab === tab.key ? 'bg-white text-emerald-600 shadow-sm' : 'text-gray-400'}`}
                    >
                      {tab.label}
                    </button>
                  ))}
                </div>
                <div className="relative w-full md:w-80">
                  <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
                  <input 
                    type="text" placeholder="Search vehicle or agent..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full pl-11 pr-4 py-3 bg-white border border-gray-100 rounded-2xl text-sm focus:ring-2 focus:ring-emerald-500/20 outline-none shadow-sm"
                  />
                </div>
              </div>

              {activeTab === 'reconciliation' && (
                <DailyReconciliationTab 
                  loading={loading} filteredSummaries={filteredSummaries} storeRegisterData={storeRegisterData}
                  handleOpenView={setViewingSummary} handleOpenEdit={handleOpenEdit} setDeletingSummary={setDeletingSummary}
                  setShowDeleteModal={setShowDeleteModal} can={can}
                  setViewingAgentDenoms={setViewingAgentDenoms}
                />
              )}
              {activeTab === 'live' && <LiveCashTab filteredSummaries={filteredSummaries} handleOpenView={setViewingSummary} />}
              {activeTab === 'ledger' && (
                <AuditLedgerTab 
                  ledgerLoading={ledgerLoading} ledgerData={ledgerData} ledgerFilter={ledgerFilter} 
                  setLedgerFilter={setLedgerFilter} date={date} setViewingOrder={setViewingOrder} setPreviewImage={setPreviewImage} 
                />
              )}
            </div>
          )}
        </div>
      )}

      {/* Modals */}
      <OpenStoreModal show={showOpenStoreModal} setShow={setShowOpenStoreModal} storeModalStep={storeModalStep} setStoreModalStep={setStoreModalStep} storeRegisterData={storeRegisterData} storeDenomData={storeDenomData} handleDenominationChange={handleDenominationChange} handleOpenStoreRegister={handleOpenStoreRegister} isSubmitting={isSubmitting} />
      <CloseStoreModal show={showCloseStoreModal} setShow={setShowCloseStoreModal} storeRegisterData={storeRegisterData} storeDenomData={storeDenomData} setStoreDenomData={setStoreDenomData} handleDenominationChange={handleDenominationChange} handleCloseStoreRegister={handleCloseStoreRegister} isSubmitting={isSubmitting} />
      <EditStoreModal show={showEditStoreModal} setShow={setShowEditStoreModal} storeDenomData={storeDenomData} handleDenominationChange={handleDenominationChange} handleUpdateStoreRegister={handleUpdateStoreRegister} isSubmitting={isSubmitting} />
      <SafeMovementModal show={showSafeMovementModal} setShow={setShowSafeMovementModal} safeMovementData={safeMovementData} setSafeMovementData={setSafeMovementData} handleDenominationChange={handleDenominationChange} handleSafeMovement={handleSafeMovement} isSubmitting={isSubmitting} storeRegisterData={storeRegisterData} />
      <BankDepositModal show={showBankModal} setShow={setShowBankModal} bankData={bankData} setBankData={setBankData} storeRegisterData={storeRegisterData} user={user} handleCreateBankDeposit={handleCreateBankDeposit} isSubmitting={isSubmitting} setPreviewImage={setPreviewImage} adminAPI={adminAPI} toast={toast} />
      <DepositConfirmModal show={showDepositConfirmModal} setShow={setShowDepositConfirmModal} depositConfirmData={depositConfirmData} handleConfirmDeposit={handleConfirmDeposit} isSubmitting={isSubmitting} />
      <EditReconciliationModal show={showEditModal} setShow={setShowEditModal} editData={editData} setEditData={setEditData} editingSummary={editingSummary} handleDenominationChange={handleDenominationChange} handleUpdateReconciliation={handleUpdateReconciliation} isSubmitting={isSubmitting} />
      <DeleteModal show={showDeleteModal} setShow={setShowDeleteModal} deletingSummary={deletingSummary} handleDelete={handleDeleteReconciliation} isDeleting={isDeleting} />
      <UnapprovedWarningModal show={showUnapprovedWarning} setShow={setShowUnapprovedWarning} unapprovedInfo={unapprovedInfo} depositData={depositData} setDepositData={setDepositData} handleInitiateDeposit={handleInitiateDeposit} isSubmitting={isSubmitting} toast={toast} />
      <ViewAgentDenomsModal viewingAgentDenoms={viewingAgentDenoms} setViewingAgentDenoms={setViewingAgentDenoms} />
      <EditDepositModal show={showEditDepositModal} setShow={setShowEditDepositModal} depositData={depositData} setDepositData={setDepositData} handleDenominationChange={handleDenominationChange} handleUpdateDeposit={handleUpdateDeposit} isSubmitting={isSubmitting} />
      <ImagePreviewModal previewImage={previewImage} setPreviewImage={setPreviewImage} />

      {viewingOrder && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
          <div className="bg-white w-full max-w-4xl rounded-[2.5rem] p-8 shadow-2xl flex flex-col gap-6 animate-in zoom-in-95 duration-300 max-h-[90vh] overflow-y-auto">
             <div className="flex items-center justify-between">
                <h2 className="text-xl font-black">Sales Detail — {viewingOrder.metadata?.orderNumber}</h2>
                <button onClick={() => setViewingOrder(null)} className="p-2 bg-gray-100 rounded-xl"><X /></button>
             </div>
             <div className="space-y-4">
                {viewingOrder.metadata?.items?.map((item, idx) => (
                  <div key={idx} className="flex justify-between p-4 bg-gray-50 rounded-2xl border border-gray-100">
                    <div>
                      <p className="font-black text-gray-900">{item.name}</p>
                      <p className="text-xs text-gray-400">Qty: {item.qty} × ₹{item.price}</p>
                    </div>
                    <p className="font-black text-emerald-600">₹{(item.price * item.qty).toFixed(2)}</p>
                  </div>
                ))}
                <div className="pt-4 border-t border-gray-100 flex justify-between items-center">
                  <span className="font-black text-gray-400 uppercase tracking-widest">Total Collection</span>
                  <span className="text-2xl font-black text-emerald-600">₹{viewingOrder.amount?.toFixed(2)}</span>
                </div>
             </div>
          </div>
        </div>
      )}
    </>
  );
}
