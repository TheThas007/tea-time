export type OrderStatus = 'new' | 'preparing' | 'ready' | 'served' | 'cancelled';

export interface MenuItem {
  id: string;
  name: string;
  description: string;
  category: string; // "Tea" | "Coffee" | "Snacks" | "Desserts"
  priceMinor: number; // e.g. 25000 (cents) or 250
  priceDisplay: number; // e.g. 250
  imageUrl: string;
  imageUrls?: string[]; // Up to 3 product photos
  isAvailable: boolean;
  displayOrder: number;
  createdAt?: any;
  updatedAt?: any;
}

export interface Category {
  id: string;
  name: string;
  slug: string;
  displayOrder: number;
  iconUrl?: string;
}

export interface TableItem {
  id: string;
  number: string; // e.g. "Table 07"
  token: string;  // e.g. "tbl_07_k8j3m"
  active: boolean;
  createdAt?: any;
  updatedAt?: any;
}

export interface OrderItemSnapshot {
  productId: string;
  name: string;
  category?: string;
  priceMinor: number;
  quantity: number;
  subtotalMinor: number;
  imageUrl?: string | null;
}

export interface Order {
  id: string;
  orderNumber: number;
  orderNumberDisplay: string; // e.g. "#1042"
  tableId: string;
  tableNumber: string; // e.g. "Table 07"
  tableToken: string;
  customerId: string;
  status: OrderStatus;
  items: OrderItemSnapshot[];
  itemCount: number;
  totalMinor: number;
  currency: string; // "LKR"
  specialInstructions?: string;
  idempotencyKey: string;
  paymentStatus: 'pay_at_counter';
  cancelReason?: string;
  createdAt: any;
  updatedAt: any;
  servedAt?: any;
}

export interface CafeSettings {
  cafeName: string;
  tagline: string;
  currencySymbol: string;
  currencyCode: string;
  openingHours: string;
  isOrderingPaused: boolean;
  pauseMessage: string;
  logoUrl?: string;
}

export interface CartItem {
  product: MenuItem;
  quantity: number;
}

