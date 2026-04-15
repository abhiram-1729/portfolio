import { useUserStore } from '../store/userStore';

/**
 * PermissionGate - Conditionally renders children based on user permissions.
 * 
 * Admin, Tenant Owner, and Super Admin roles automatically bypass all checks.
 * For other roles, it checks the user's customRole permissions JSON.
 * 
 * @param {string} module - The module name (e.g., 'INVENTORY', 'SALES')
 * @param {string} action - The action (e.g., 'READ', 'CREATE', 'UPDATE', 'DELETE')
 * @param {boolean} disabled - If true, renders children as disabled instead of hiding
 * @param {React.ReactNode} children - The content to conditionally render
 * @param {React.ReactNode} fallback - Optional fallback content when permission denied
 */
export default function PermissionGate({ module, action, disabled = false, children, fallback = null }) {
  const user = useUserStore((s) => s.user);

  // Bypass roles always have full access
  const bypassRoles = ['SUPER_ADMIN', 'TENANT_OWNER', 'ADMIN'];
  if (user && bypassRoles.includes(user.role)) {
    return children;
  }

  // Check permissions from the user's custom role
  const permissions = user?.permissions;
  
  if (!permissions) {
    return disabled ? (
      <div style={{ opacity: 0.4, pointerEvents: 'none' }}>{children}</div>
    ) : fallback;
  }

  const modulePerms = permissions[module];
  const hasPermission = modulePerms && Array.isArray(modulePerms) && modulePerms.includes(action);

  if (hasPermission) {
    return children;
  }

  if (disabled) {
    return <div style={{ opacity: 0.4, pointerEvents: 'none' }}>{children}</div>;
  }

  return fallback;
}

/**
 * Utility hook to check permissions imperatively
 */
export function useHasPermission(module, action) {
  const user = useUserStore((s) => s.user);
  
  const bypassRoles = ['SUPER_ADMIN', 'TENANT_OWNER', 'ADMIN'];
  if (user && bypassRoles.includes(user.role)) return true;
  
  const permissions = user?.permissions;
  if (!permissions) return false;
  
  const modulePerms = permissions[module];
  return modulePerms && Array.isArray(modulePerms) && modulePerms.includes(action);
}
