import { useSyncExternalStore } from 'react';
import type { MenuItem } from './api';

type CartLine = {
  menu_item_id: string;
  name: string;
  price: number;
  quantity: number;
  image_base64?: string | null;
};

let cart: Record<string, CartLine> = {};
const listeners = new Set<() => void>();

function emit() {
  listeners.forEach(l => l());
}

export const cartStore = {
  subscribe(cb: () => void) {
    listeners.add(cb);
    return () => listeners.delete(cb);
  },
  getSnapshot() {
    return cart;
  },
  add(item: MenuItem) {
    const existing = cart[item.id];
    cart = {
      ...cart,
      [item.id]: existing
        ? { ...existing, quantity: existing.quantity + 1 }
        : {
            menu_item_id: item.id,
            name: item.name,
            price: item.price,
            quantity: 1,
            image_base64: item.image_base64 ?? null,
          },
    };
    emit();
  },
  increment(id: string) {
    const existing = cart[id];
    if (!existing) return;
    cart = { ...cart, [id]: { ...existing, quantity: existing.quantity + 1 } };
    emit();
  },
  decrement(id: string) {
    const existing = cart[id];
    if (!existing) return;
    if (existing.quantity <= 1) {
      const next = { ...cart };
      delete next[id];
      cart = next;
    } else {
      cart = { ...cart, [id]: { ...existing, quantity: existing.quantity - 1 } };
    }
    emit();
  },
  remove(id: string) {
    const next = { ...cart };
    delete next[id];
    cart = next;
    emit();
  },
  clear() {
    cart = {};
    emit();
  },
};

export function useCart() {
  const snapshot = useSyncExternalStore(cartStore.subscribe, cartStore.getSnapshot, cartStore.getSnapshot);
  const lines = Object.values(snapshot);
  const totalQty = lines.reduce((s, l) => s + l.quantity, 0);
  const totalPrice = lines.reduce((s, l) => s + l.price * l.quantity, 0);
  return { cart: snapshot, lines, totalQty, totalPrice };
}
