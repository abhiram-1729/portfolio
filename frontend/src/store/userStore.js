import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { useCartStore } from './cartStore';
import { authAPI } from '../services/api';

export const useUserStore = create(
  persist(
    (set, get) => ({
      user: null,
      token: null,

      setUser: (user, token) => {
        localStorage.setItem('token', token);
        
        // Prevent cart leakage: clear cart if a different user logs in
        const currentUser = get().user;
        if (!currentUser || currentUser.id !== user.id) {
          useCartStore.getState().clearCart();
        }

        set({ user, token });
      },

      refreshUserProfile: async () => {
        try {
          const { data } = await authAPI.me();
          // Merge permissions data from customRole into user object
          set({ user: {
            ...data,
            permissions: data.permissions || data.customRole?.permissions || null,
            customRoleName: data.customRoleName || data.customRole?.name || null,
            portalType: data.portalType || data.customRole?.portalType || null,
            customRoleId: data.customRoleId || data.customRole?.id || null,
          }});
        } catch (error) {
          console.error('Failed to refresh user profile:', error);
        }
      },

      can: (module, action, section) => {
        const user = get().user;
        if (!user) return false;
        
        // Super Admins & Owners bypass everything
        if (['SUPER_ADMIN', 'TENANT_OWNER'].includes(user.role)) return true;
        
        // Standard Admins (Global, no custom role) bypass everything
        if (user.role === 'ADMIN' && !user.customRoleId) return true;

        // If a specific section is provided, check its granular permissions
        if (section) {
          if (section === 'MAIN_MASTER') return true;
          const sectionPerms = user.permissions?.[`${module}_SECTIONS`]?.[section] || [];
          return sectionPerms.includes(action);
        }

        const perms = user.permissions?.[module] || [];
        return perms.includes(action);
      },

      clearUser: () => {
        localStorage.removeItem('token');
        set({ user: null, token: null });
        
        // Clear cart on logout
        useCartStore.getState().clearCart();
      },
    }),
    {
      name: 'user-storage',
    }
  )
);
