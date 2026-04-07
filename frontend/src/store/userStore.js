import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { useCartStore } from './cartStore';

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
