import { create } from 'zustand';
import { persist } from 'zustand/middleware';

const calculateTotals = (items) => {
  // Subtotal of non-free items
  const subtotal = items.reduce((sum, i) => {
    const isFree = i.isFree === true || i.isFree === 'true';
    if (!isFree) return sum + Number(i.price || 0) * i.quantity;
    return sum;
  }, 0);

  // Grand total calculation:
  // isFree items are ONLY counted if subtotal >= minShopAmount
  // and if they are counted, their price is 0.
  const totalAmount = items.reduce((sum, i) => {
    const isFree = i.isFree === true || i.isFree === 'true';
    if (isFree) {
      if (subtotal >= Number(i.minShopAmount || 0)) return sum + 0;
      return sum; 
    }
    return sum + Number(i.price || 0) * i.quantity;
  }, 0);

  const totalItems = items.reduce((sum, i) => sum + i.quantity, 0);

  return { totalAmount, totalItems };
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
        let newItems;

        if (existing) {
          newItems = items.map((i) =>
            i.productId === product.id
              ? { ...i, quantity: i.quantity + quantity }
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
              isFree: product.isFree === true || product.isFree === 'true',
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
