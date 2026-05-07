import React from 'react';
import AdminCashManagementContent from './admin_cash_management/index';

/**
 * AdminCashManagement Entry Point
 * 
 * This component acts as the main entry point for the modularized Cash Management module.
 * All core logic has been moved to the /admin_cash_management directory for better maintainability.
 */
import { useSearchParams, useLocation } from 'react-router-dom';
import { useUserStore } from '../../store/userStore';
import BranchCashOverview from './admin_cash_management/BranchCashOverview';

export default function AdminCashManagement() {
  const [searchParams, setSearchParams] = useSearchParams();
  const storeId = searchParams.get('storeId');
  const user = useUserStore(s => s.user);
  const location = useLocation();
  const isGlobalRole = user?.role === 'TENANT_OWNER' || user?.role === 'SUPER_ADMIN' || (user?.role === 'ADMIN' && !user?.customRoleId) || user?.portalType === 'ADMIN';

  // If global role and no store selected, show branch overview
  if (isGlobalRole && !storeId) {
    return (
      <div className="p-4 sm:p-8 max-w-[1600px] mx-auto min-h-screen">
        <BranchCashOverview
          onSelect={(id) => setSearchParams({ storeId: id })}
        />
      </div>
    );
  }

  return <AdminCashManagementContent key={storeId || 'default'} />;
}
