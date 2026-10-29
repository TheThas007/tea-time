export type OrderStatus = 'new' | 'preparing' | 'ready' | 'served' | 'cancelled';

export interface MenuProduct {
  id: string;
  name: string;
  price: number;
  category: string;
  image: string;
  available: boolean;
  featured?: boolean;
  description?: string;
}

export interface MenuItem extends MenuProduct {
  description: string;
  categories?: string[]; // Supports multi-category products without duplicating records
  priceMinor: number; // LKR minor units (e.g. 40000 for Rs. 400)
  priceDisplay: number; // LKR integer display price (e.g. 400)
  imageUrl: string;
  imageUrls?: string[]; // Up to 3 verified product photos
  isAvailable: boolean;
  displayOrder: number;
  badge?: string; // e.g. "Wednesday Special"
  availabilityNote?: string; // e.g. "Wednesday only • Pre-order before 10:00 AM"
  imageMatchStatus?:
    | "VERIFIED"
    | "IMAGE_MISSING"
    | "IMAGE_REVIEW_REQUIRED"
    | "PRICE_REVIEW_REQUIRED";
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
  sugarNote?: string | null;
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
  sugarSpoons?: number | null;
}

