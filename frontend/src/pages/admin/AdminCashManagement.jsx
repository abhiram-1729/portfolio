import React from 'react';
import AdminCashManagementContent from './admin_cash_management/index';

/**
 * AdminCashManagement Entry Point
 * 
 * This component acts as the main entry point for the modularized Cash Management module.
 * All core logic has been moved to the /admin_cash_management directory for better maintainability.
 */
export default function AdminCashManagement() {
  return <AdminCashManagementContent />;
}
