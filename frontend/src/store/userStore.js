import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export const useUserStore = create(
  persist(
    (set) => ({
      user: null,
      token: null,

      setUser: (user, token) => {
        localStorage.setItem('token', token);
        set({ user, token });
      },

      clearUser: () => {
        localStorage.removeItem('token');
        set({ user: null, token: null });
      },
    }),
    {
      name: 'user-storage',
    }
  )
);
