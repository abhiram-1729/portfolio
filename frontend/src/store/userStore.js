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

      updateUserProfile: async (formData) => {
        try {
          const { data } = await authAPI.updateProfile(formData);
          if (data.success) {
            set((state) => ({
              user: state.user ? { ...state.user, name: data.data.name, avatar: data.data.avatar } : data.data
            }));
            return data;
          }
        } catch (error) {
          console.error('Failed to update user profile:', error);
          throw error;
        }
      },

      updateBusinessProfile: async (formData) => {
        try {
          const { data } = await authAPI.updateBusinessProfile(formData);
          if (data.success) {
            await get().refreshUserProfile();
            return data;
          }
        } catch (error) {
          console.error('Failed to update business profile:', error);
          throw error;
        }
      },

      can: (module, action, section) => {
        const user = get().user;
        if (!user) return false;
        
        // Super Admins & Owners bypass everything
        if (['SUPER_ADMIN', 'TENANT_OWNER'].includes(user.role)) return true;
        
        // Standard Admins (Global, no custom role) bypass everything
        if (user.role === 'ADMIN' && !user.customRoleId) return true;

        // Support for Target Sections pattern (e.g. ROUTE_TARGET_SECTIONS, REPORT_TARGET_SECTIONS)
        // These modules treat any presence in target sections as full CRUD access for that section
        const baseModule = module.endsWith('S') ? module.slice(0, -1) : module;
        const targetSections = 
          user.permissions?.[`${baseModule}_TARGET_SECTIONS`] || 
          user.permissions?.[`${module}_TARGET_SECTIONS`] ||
          user.permissions?.[`${baseModule}S_TARGET_SECTIONS`] ||
          user.permissions?.[`${module}S_TARGET_SECTIONS`];
        
        if (targetSections && Array.isArray(targetSections)) {
          if (section) {
            return targetSections.includes(section);
          }
          // If no section, check if module itself has permission or any target section is active
          return targetSections.length > 0 || (user.permissions?.[module] || []).includes(action);
        }

        // If a specific section is provided, check its granular permissions
        if (section) {
          if (section === 'MAIN_MASTER') return true;
          // Support both MODULE_SECTIONS pattern and direct MODULE key for newer granular modules
          const sectionPerms = 
            user.permissions?.[`${module}_SECTIONS`]?.[section] || 
            user.permissions?.[module]?.[section] || 
            [];
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
