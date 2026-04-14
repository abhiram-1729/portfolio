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
          set({ user: data });
        } catch (error) {
          console.error('Failed to refresh user profile:', error);
          // If 401, the interceptor handles it, but we should be careful here
        }
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
