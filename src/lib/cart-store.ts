"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";

export interface CartItem {
  productId: string;
  name: string;
  price: number;
  image: string;
  quantity: number;
}

interface CartState {
  items: CartItem[];
  addItem: (item: CartItem) => void;
  removeItem: (productId: string) => void;
  updateQty: (productId: string, quantity: number) => void;
  clearCart: () => void;
}

export const useCartStore = create<CartState>()(
  persist(
    (set) => ({
      items: [],

      addItem: (item) =>
        set((state) => {
          const existing = state.items.find(
            (i) => i.productId === item.productId
          );
          if (existing) {
            return {
              items: state.items.map((i) =>
                i.productId === item.productId
                  ? {
                      ...i,
                      // MED-13: cap accumulated quantity at 99
                      quantity: Math.min(i.quantity + item.quantity, 99),
                    }
                  : i
              ),
            };
          }
          return { items: [...state.items, item] };
        }),

      removeItem: (productId) =>
        set((state) => ({
          items: state.items.filter((i) => i.productId !== productId),
        })),

      // MED-12: clamp to at least 1 to prevent 0 / negative quantities
      updateQty: (productId, quantity) =>
        set((state) => {
          const clamped = Math.max(1, quantity);
          return {
            items: state.items.map((i) =>
              i.productId === productId ? { ...i, quantity: clamped } : i
            ),
          };
        }),

      clearCart: () => set({ items: [] }),
    }),
    { name: "bb_cart" }
  )
);

export function useTotalItems() {
  return useCartStore((s) => s.items.reduce((sum, i) => sum + i.quantity, 0));
}

export function useTotalPrice() {
  return useCartStore((s) =>
    s.items.reduce((sum, i) => sum + i.price * i.quantity, 0)
  );
}
