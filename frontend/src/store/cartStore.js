import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export const checkIsFree = (val) => val === true || val === 'true' || val === 1 || val === '1';

const calculateTotals = (items) => {
  // Subtotal of non-free items
  const subtotalRaw = items.reduce((sum, i) => {
    if (!checkIsFree(i.isFree)) return sum + Number(i.price || 0) * i.quantity;
    return sum;
  }, 0);

  // Round subtotal for precision matching with backend
  const subtotal = Math.round(subtotalRaw * 100) / 100;

  // Grand total calculation:
  // isFree items are 0 ONLY if subtotal >= minShopAmount
  // Otherwise, they are charged at their regular price.
  const totalAmount = items.reduce((sum, i) => {
    const isFreeInCart = checkIsFree(i.isFree);
    const threshold = Number(i.minShopAmount || 0);
    
    if (isFreeInCart && subtotal >= threshold) {
      return sum; // Free!
    }
    // Regular price (either it's not a free item, or threshold not met)
    return sum + Number(i.price || 0) * i.quantity;
  }, 0);

  const totalItems = items.reduce((sum, i) => sum + i.quantity, 0);

  return { 
    totalAmount: Math.round(totalAmount * 100) / 100, 
    totalItems 
  };
};

export const useCartStore = create(
  persist(
    (set, get) => ({
      items: [],
      customerMobile: '',
      customerName: '',
      totalAmount: 0,
      totalItems: 0,

      setCustomerMobile: (mobile) => set({ customerMobile: mobile }),
      setCustomerName: (name) => set({ customerName: name }),

      addItem: (product, quantity = 1) => {
        const items = get().items;
        const existing = items.find((i) => i.productId === product.id);
        const isFree = checkIsFree(product.isFree);
        let newItems;

        if (existing) {
          // IMPORTANT: Even for existing items, we refresh their info 
          // (Legacy data might have missing isFree or minShopAmount)
          newItems = items.map((i) =>
            i.productId === product.id
              ? { 
                  ...i, 
                  quantity: i.quantity + quantity, 
                  isFree: isFree,
                  minShopAmount: Number(product.minShopAmount || 0)
                }
              : i
          );
        } else {
          newItems = [
            ...items,
            {
              productId: product.id,
              name: product.name,
              price: Number(product.price || 0),
              mrp: Number(product.mrp || 0),
              discount: Number(product.discount || 0),
              landingPrice: Number(product.landingPrice || 0),
              image: product.image,
              isFree: isFree,
              minShopAmount: Number(product.minShopAmount || 0),
              quantity,
            },
          ];
        }
        set({ items: newItems, ...calculateTotals(newItems) });
      },

      removeItem: (productId) => {
        const newItems = get().items.filter((i) => i.productId !== productId);
        set({ items: newItems, ...calculateTotals(newItems) });
      },

      updateQuantity: (productId, quantity) => {
        if (quantity <= 0) {
          get().removeItem(productId);
          return;
        }
        const newItems = get().items.map((i) =>
          i.productId === productId ? { ...i, quantity } : i
        );
        set({ items: newItems, ...calculateTotals(newItems) });
      },

      clearCart: () => set({ items: [], customerName: '', customerMobile: '', totalAmount: 0, totalItems: 0 }),
    }),
    {
      name: 'cart-storage',
    }
  )
);
