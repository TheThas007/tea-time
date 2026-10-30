export type OrderStatus =
  | "new"
  | "accepted"
  | "preparing"
  | "ready"
  | "served"
  | "completed"
  | "cancelled"
  | "PENDING"
  | "PREPARING"
  | "READY"
  | "SERVED"
  | "COMPLETED"
  | "CANCELLED";

export type UserRole = "SUPER_ADMIN" | "BUSINESS_OWNER";

export type PackageId =
  | "trial"
  | "2_days_trial"
  | "monthly"
  | "6_months"
  | "yearly"
  | "3_months"
  | "lifetime";

export type BusinessOperationalStatus =
  | "active"
  | "suspended"
  | "archived"
  | "ACTIVE"
  | "SUSPENDED"
  | "ARCHIVED";

export type EffectiveBusinessStatus =
  | "active"
  | "expiring_soon"
  | "expired"
  | "suspended"
  | "archived"
  | "scheduled";

export type PaymentMethod =
  | "cash"
  | "bank_transfer"
  | "card_manual"
  | "other"
  | "CASH"
  | "BANK_TRANSFER"
  | "CARD_MANUAL"
  | "ONLINE"
  | "CHEQUE"
  | "OTHER";

export interface SubscriptionPackage {
  id: PackageId;
  name: string;
  durationMonths: number | null;
  isLifetime: boolean;
  priceMinor: number; // LKR minor units (cents), e.g. 200000 = Rs. 2,000
  priceDisplay: number; // LKR rupees, e.g. 2000
  priceRupees: number;
  priceUsdDisplay?: string; // Dollar equivalent display, e.g. "$7 USD", "$33 USD", "$60 USD"
  currency: "LKR";
  description: string;
  scopeNote: string;
  active: boolean;
  sortOrder: number;
  isPopular?: boolean;
  savingsDisplay?: string; // e.g. "Save Rs. 2,000", "Save Rs. 6,000"
  isLegacy?: boolean;
  upfrontNote?: string;
  updatedAt?: any;
}

export interface PlatformPublicConfig {
  platformName: string; // "Menyo"
  productTitle: string; // "Menyo — by AEVONIX"
  tagline: string; // "Your Menu. One Scan."
  supportEmail: string;
  supportPhone: string;
  supportWhatsApp: string;
  salesContactPhone?: string;
  salesContactWhatsapp?: string;
  packages: SubscriptionPackage[];
  updatedAt?: any;
}

export type SocialPlatform =
  | "google"
  | "instagram"
  | "facebook"
  | "whatsapp"
  | "tiktok"
  | "youtube"
  | "x"
  | "website"
  | "other";

export interface SocialLinkItem {
  id: string;
  platform: SocialPlatform;
  label: string;
  url: string;
  isActive: boolean;
}

export interface BusinessSocialLinks {
  instagram?: string;
  facebook?: string;
  googleReview?: string;
  items?: SocialLinkItem[];
}

/**
 * Public storefront document stored at /businesses/{businessId}
 * Contains ZERO owner PII, subscription dates, payment info, or internal notes.
 */
export interface BusinessPublicProfile {
  id: string;
  slug: string;
  name: string;
  tagline: string;
  logoUrl: string;
  primaryColor: string; // Accent button / highlight hex
  accentColor: string; // Secondary badge / selection hex
  backgroundColor?: string; // Page background hex
  textColor?: string; // Body and heading text hex
  headerBackgroundColor?: string; // Header background hex
  headerTextColor?: string; // Header text and icon hex
  branding?: {
    logoUrl?: string | null;
    primaryColor?: string;
    accentColor?: string;
    backgroundColor?: string;
    textColor?: string;
    headerBackgroundColor?: string;
    headerTextColor?: string;
    qrHeaderTitle?: string;
    qrSubtitle?: string;
    qrFooterNote?: string;
    qrLogoSize?: number | "small" | "medium" | "large" | "xlarge" | "huge" | string;
  };
  phone: string;
  whatsapp: string;
  address: string;
  openingHours: string;
  currencyCode: "LKR";
  currencySymbol: string;
  socialLinks: BusinessSocialLinks;
  socialLinkItems?: SocialLinkItem[];
  googleReviewUrl?: string;
  instagramUrl?: string;
  facebookUrl?: string;
  isOrderingPaused: boolean;
  pauseMessage: string;
  isTrial?: boolean;
  activationKey?: string;
  createdAt?: any;
  updatedAt?: any;
}

/**
 * Private access & subscription gate stored at /businessAccess/{businessId}
 * Readable ONLY by Super Admin and the assigned Business Owner; evaluated by Firestore Rules via get().
 */
export interface BusinessAccessRecord {
  businessId: string;
  operationalStatus: BusinessOperationalStatus;
  packageId: PackageId;
  packageNameSnapshot: string;
  packagePriceMinorSnapshot: number;
  isLifetime: boolean;
  activatedAtMs: number;
  startsAtMs: number;
  expiresAtMs: number | null; // Exclusive expiry instant in UTC epoch ms (null for lifetime)
  activatedAt?: any;
  startsAt?: any;
  expiresAt?: any | null;
  suspendReason?: string | null;
  suspendedAtMs?: number | null;
  archivedAtMs?: number | null;
  updatedAt?: any;
}

/**
 * Super-Admin-only private metadata stored at /businessPrivate/{businessId}
 */
export interface BusinessPrivateRecord {
  businessId: string;
  ownerUid: string;
  ownerName: string;
  ownerUsername: string;
  ownerEmail: string;
  provisioningState: "provisioning" | "ready" | "failed_recoverable";
  internalNotes?: string;
  createdAt?: any;
  updatedAt?: any;
}

export interface UserProfileRecord {
  uid: string;
  role: UserRole;
  businessId: string | null;
  username: string;
  displayName: string;
  email: string;
  mustChangePassword: boolean;
  active: boolean;
  createdAt?: any;
  updatedAt?: any;
}

export interface SubscriptionHistoryRecord {
  id: string;
  businessId: string;
  packageId: PackageId;
  packageNameSnapshot: string;
  priceMinorSnapshot: number;
  currency: "LKR";
  isLifetime: boolean;
  actionType: "initial" | "renewal" | "package_change";
  activatedAtMs: number;
  startsAtMs: number;
  expiresAtMs: number | null;
  paymentId?: string | null;
  recordedByUid: string;
  note?: string;
  createdAtMs: number;
  createdAt?: any;
}

export interface ManualPaymentRecord {
  id: string;
  businessId: string;
  businessNameSnapshot: string;
  businessSlugSnapshot: string;
  subscriptionId: string;
  packageId: PackageId;
  packageNameSnapshot: string;
  amountMinor: number;
  currency: "LKR";
  paymentDateColombo: string; // YYYY-MM-DD in Asia/Colombo
  paymentMonthColombo: string; // YYYY-MM in Asia/Colombo
  paymentTimestampMs: number;
  method: PaymentMethod;
  reference: string;
  note?: string;
  idempotencyKey: string;
  recordedByUid: string;
  createdAtMs: number;
  createdAt?: any;
}

export interface AuditLogRecord {
  id: string;
  actorUid: string;
  actorEmail?: string;
  actorRole: UserRole;
  businessId?: string | null;
  action: string;
  summary: string;
  metadata?: Record<string, any>;
  createdAtMs: number;
  createdAt?: any;
}

export interface EffectiveAccessEvaluation {
  allowed: boolean; // True iff operationalStatus === 'active' AND subscriptionValidNow
  subscriptionValidNow: boolean;
  effectiveStatus: EffectiveBusinessStatus;
  expiringWithin7Days: boolean;
  daysRemaining: number | null;
  reason?:
  | "OK"
  | "ARCHIVED"
  | "SUSPENDED"
  | "EXPIRED"
  | "NOT_STARTED_YET";
}

export interface SuperAdminBusinessRow {
  id: string;
  name: string;
  slug: string;
  logoUrl?: string;
  ownerName: string;
  ownerUsername: string;
  ownerEmail: string;
  packageId: PackageId;
  isTrial?: boolean;
  activationKey?: string;
  activationDateColombo: string;
  expiryDateColombo: string | null;
  isLifetime: boolean;
  daysRemaining: number | null;
  effectiveStatus: string;
  status: string;
  business?: BusinessPublicProfile;
  access?: BusinessAccessRecord;
  privateInfo?: BusinessPrivateRecord;
  evaluation?: EffectiveAccessEvaluation;
}

export interface SuperAdminMetrics {
  totalBusinesses: number;
  activeBusinesses: number;
  expiredBusinesses: number;
  suspendedBusinesses: number;
  expiringWithin7Days: number;
  paymentsThisMonthMinor: number;
  totalPaymentsMinor: number;
  incomeThisMonthRupees: number;
  incomeTotalRupees: number;
  archivedBusinesses: number;
}

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
  businessId?: string;
  categoryId?: string;
  description: string;
  categories?: string[]; // Supports multi-category products without duplicating records
  priceMinor: number; // LKR minor units (e.g. 40000 for Rs. 400)
  priceDisplay: number; // LKR integer display price (e.g. 400)
  priceRupees?: number;
  imageUrl: string;
  imageUrls?: string[]; // Up to 3 verified product photos
  isAvailable: boolean;
  isVeg?: boolean;
  isPopular?: boolean;
  isArchived?: boolean;
  displayOrder: number;
  sortOrder?: number;
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
  businessId?: string;
  name: string;
  slug: string;
  displayOrder: number;
  sortOrder?: number;
  icon?: string;
  iconUrl?: string;
  isVisible?: boolean;
  isArchived?: boolean;
  createdAt?: any;
  updatedAt?: any;
}

export interface TableItem {
  id: string;
  businessId?: string;
  number: string; // e.g. "Table 07"
  tableNumber?: string;
  capacity?: number;
  notes?: string;
  token: string; // e.g. "tbl_07_k8j3m"
  active: boolean;
  isArchived?: boolean;
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
  subtotalRupees?: number;
  imageUrl?: string | null;
  sugarNote?: string | null;
  specialInstruction?: string | null;
}

export interface Order {
  id: string;
  businessId?: string;
  businessSlug?: string;
  trackingToken?: string;
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
  totalRupees?: number;
  currency: string; // "LKR"
  specialInstructions?: string;
  idempotencyKey: string;
  paymentStatus: "pay_at_counter";
  cancelReason?: string;
  createdAt: any;
  updatedAt: any;
  acceptedAt?: any;
  servedAt?: any;
}

export interface CreateOrderPayload {
  businessSlug?: string;
  tableToken: string;
  items: Array<{
    productId: string;
    quantity: number;
    sugarSpoons?: number | null;
  }>;
  specialInstructions?: string;
  idempotencyKey: string;
  ip?: string;
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
  primaryColor?: string;
  accentColor?: string;
  backgroundColor?: string;
  textColor?: string;
  headerBackgroundColor?: string;
  headerTextColor?: string;
  qrHeaderTitle?: string;
  qrSubtitle?: string;
  qrFooterNote?: string;
  qrLogoSize?: number | "small" | "medium" | "large" | "xlarge" | "huge" | string;
  phone?: string;
  whatsapp?: string;
  address?: string;
  googleReviewUrl?: string;
  instagramUrl?: string;
  facebookUrl?: string;
  socialLinks?: SocialLinkItem[] | BusinessSocialLinks;
}

export interface CartItem {
  product: MenuItem;
  quantity: number;
  sugarSpoons?: number | null;
}
