import React, { createContext, useContext, useState, useEffect, useMemo } from "react";
import { MenuItem, CartItem, TableItem } from "../types";

interface CartContextType {
  items: CartItem[];
  specialInstructions: string;
  setSpecialInstructions: (val: string) => void;
  addItem: (product: MenuItem, quantity?: number, sugarSpoons?: number | null) => void;
  updateItemSugar: (productId: string, sugarSpoons: number | null) => void;
  removeItem: (productId: string) => void;
  updateQuantity: (productId: string, deltaOrQuantity: number, isAbsolute?: boolean) => void;
  clearCart: () => void;
  totalItems: number;
  totalMinor: number;
  tableToken: string | null;
  setTableToken: (token: string | null) => void;
  currentTable: TableItem | null;
  setCurrentTable: (table: TableItem | null) => void;
  isCartOpen: boolean;
  setIsCartOpen: (open: boolean) => void;
  customerOrderIds: string[];
  addCustomerOrderId: (orderId: string) => void;
}

const CartContext = createContext<CartContextType | undefined>(undefined);

export const CartProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [tableToken, setTableTokenState] = useState<string | null>(() => {
    const params = new URLSearchParams(window.location.search);
    const tokenParam = params.get("table");
    return tokenParam || localStorage.getItem("teatime_table_token") || null;
  });

  const [currentTable, setCurrentTable] = useState<TableItem | null>(null);
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [specialInstructions, setSpecialInstructions] = useState("");

  // Store cart items keyed by table token so switching tables preserves respective carts
  const storageKey = useMemo(() => {
    return tableToken ? `teatime_cart_${tableToken}` : "teatime_cart_default";
  }, [tableToken]);

  const [items, setItems] = useState<CartItem[]>(() => {
    try {
      const saved = localStorage.getItem(storageKey);
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  // Customer order tracking history in localStorage
  const [customerOrderIds, setCustomerOrderIds] = useState<string[]>(() => {
    try {
      const saved = localStorage.getItem("teatime_my_orders");
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  // Synchronize cart with localStorage whenever items change
  useEffect(() => {
    try {
      localStorage.setItem(storageKey, JSON.stringify(items));
    } catch (e) {
      console.warn("Error saving cart to localStorage:", e);
    }
  }, [items, storageKey]);

  // When tableToken changes, reload cart for that table
  const setTableToken = (token: string | null) => {
    setTableTokenState(token);
    if (token) {
      localStorage.setItem("teatime_table_token", token);
      try {
        const saved = localStorage.getItem(`teatime_cart_${token}`);
        setItems(saved ? JSON.parse(saved) : []);
      } catch {
        setItems([]);
      }
    }
  };

  const addCustomerOrderId = (orderId: string) => {
    setCustomerOrderIds((prev) => {
      if (prev.includes(orderId)) return prev;
      const updated = [orderId, ...prev];
      localStorage.setItem("teatime_my_orders", JSON.stringify(updated));
      return updated;
    });
  };

  const addItem = (
    product: MenuItem,
    quantity: number = 1,
    sugarSpoons?: number | null
  ) => {
    if (product.isAvailable === false || quantity <= 0) return;
    setItems((prev) => {
      const existing = prev.find((item) => item.product.id === product.id);
      if (existing) {
        return prev.map((item) =>
          item.product.id === product.id
            ? {
                ...item,
                quantity: item.quantity + quantity,
                ...(sugarSpoons !== undefined ? { sugarSpoons } : {}),
              }
            : item
        );
      }
      return [
        ...prev,
        {
          product,
          quantity,
          ...(sugarSpoons !== undefined ? { sugarSpoons } : {}),
        },
      ];
    });
  };

  const updateItemSugar = (productId: string, sugarSpoons: number | null) => {
    setItems((prev) =>
      prev.map((item) =>
        item.product.id === productId ? { ...item, sugarSpoons } : item
      )
    );
  };

  const removeItem = (productId: string) => {
    setItems((prev) => prev.filter((item) => item.product.id !== productId));
  };

  const updateQuantity = (productId: string, deltaOrQuantity: number, isAbsolute: boolean = false) => {
    setItems((prev) => {
      return prev
        .map((item) => {
          if (item.product.id === productId) {
            const newQty = isAbsolute ? deltaOrQuantity : item.quantity + deltaOrQuantity;
            return { ...item, quantity: newQty };
          }
          return item;
        })
        .filter((item) => item.quantity > 0);
    });
  };

  const clearCart = () => {
    setItems([]);
    setSpecialInstructions("");
    localStorage.removeItem(storageKey);
  };

  const totalItems = useMemo(() => {
    return items.reduce((sum, item) => sum + item.quantity, 0);
  }, [items]);

  const totalMinor = useMemo(() => {
    return items.reduce((sum, item) => sum + item.product.priceMinor * item.quantity, 0);
  }, [items]);

  return (
    <CartContext.Provider
      value={{
        items,
        specialInstructions,
        setSpecialInstructions,
        addItem,
        updateItemSugar,
        removeItem,
        updateQuantity,
        clearCart,
        totalItems,
        totalMinor,
        tableToken,
        setTableToken,
        currentTable,
        setCurrentTable,
        isCartOpen,
        setIsCartOpen,
        customerOrderIds,
        addCustomerOrderId,
      }}
    >
      {children}
    </CartContext.Provider>
  );
};

export const useCart = () => {
  const ctx = useContext(CartContext);
  if (!ctx) {
    throw new Error("useCart must be used within a CartProvider");
  }
  return ctx;
};

