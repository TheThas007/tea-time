import { MenuItem, Category, TableItem, CafeSettings } from "../types";

export const DEFAULT_CATEGORY_ICONS: Record<string, string> = {
  all: "https://images.unsplash.com/photo-1554118811-1e0d58224f24?auto=format&fit=crop&w=200&q=80",
  tea: "https://images.unsplash.com/photo-1544787219-7f47ccb76574?auto=format&fit=crop&w=200&q=80",
  coffee: "https://images.unsplash.com/photo-1534778101976-62847782c213?auto=format&fit=crop&w=200&q=80",
  snacks: "https://images.unsplash.com/photo-1601050690597-df0568f70950?auto=format&fit=crop&w=200&q=80",
  desserts: "https://images.unsplash.com/photo-1578985545062-69928b1d9587?auto=format&fit=crop&w=200&q=80",
};

export const INITIAL_CATEGORIES: Category[] = [
  {
    id: "cat_tea",
    name: "Tea",
    slug: "tea",
    displayOrder: 1,
    iconUrl: DEFAULT_CATEGORY_ICONS.tea,
  },
  {
    id: "cat_coffee",
    name: "Coffee",
    slug: "coffee",
    displayOrder: 2,
    iconUrl: DEFAULT_CATEGORY_ICONS.coffee,
  },
  {
    id: "cat_snacks",
    name: "Snacks",
    slug: "snacks",
    displayOrder: 3,
    iconUrl: DEFAULT_CATEGORY_ICONS.snacks,
  },
  {
    id: "cat_desserts",
    name: "Desserts",
    slug: "desserts",
    displayOrder: 4,
    iconUrl: DEFAULT_CATEGORY_ICONS.desserts,
  },
];

export const INITIAL_MENU_ITEMS: MenuItem[] = [
  {
    id: "prod_ceylon_milk_tea",
    name: "Ceylon Milk Tea",
    description: "Rich, aromatic Ceylon black tea brewed with fresh milk and gentle sweetness.",
    category: "Tea",
    priceMinor: 25000, // Rs. 250
    priceDisplay: 250,
    imageUrl: "https://images.unsplash.com/photo-1544787219-7f47ccb76574?auto=format&fit=crop&w=800&q=80",
    imageUrls: [
      "https://images.unsplash.com/photo-1544787219-7f47ccb76574?auto=format&fit=crop&w=800&q=80",
      "https://images.unsplash.com/photo-1571934811356-5cc061b6821f?auto=format&fit=crop&w=800&q=80",
      "https://images.unsplash.com/photo-1594631252845-29fc4cc8cde9?auto=format&fit=crop&w=800&q=80",
    ],
    isAvailable: true,
    displayOrder: 1,
  },
  {
    id: "prod_masala_chai",
    name: "Masala Chai",
    description: "Traditional slow-brewed spiced tea with cardamom, cinnamon, cloves, and ginger.",
    category: "Tea",
    priceMinor: 30000, // Rs. 300
    priceDisplay: 300,
    imageUrl: "https://images.unsplash.com/photo-1576092768241-dec231879fc3?auto=format&fit=crop&w=800&q=80",
    imageUrls: [
      "https://images.unsplash.com/photo-1576092768241-dec231879fc3?auto=format&fit=crop&w=800&q=80",
      "https://images.unsplash.com/photo-1561336313-0bd5e0b27ec8?auto=format&fit=crop&w=800&q=80",
      "https://images.unsplash.com/photo-1544787219-7f47ccb76574?auto=format&fit=crop&w=800&q=80",
    ],
    isAvailable: true,
    displayOrder: 2,
  },
  {
    id: "prod_iced_lemon_tea",
    name: "Iced Lemon Tea",
    description: "Refreshing chilled Ceylon tea infused with fresh citrus slices and garden mint.",
    category: "Tea",
    priceMinor: 35000, // Rs. 350
    priceDisplay: 350,
    imageUrl: "https://images.unsplash.com/photo-1556679343-c7306c1976bc?auto=format&fit=crop&w=800&q=80",
    imageUrls: [
      "https://images.unsplash.com/photo-1556679343-c7306c1976bc?auto=format&fit=crop&w=800&q=80",
      "https://images.unsplash.com/photo-1499638673689-79a0b5115d87?auto=format&fit=crop&w=800&q=80",
      "https://images.unsplash.com/photo-1513558161293-cdaf765ed2fd?auto=format&fit=crop&w=800&q=80",
    ],
    isAvailable: true,
    displayOrder: 3,
  },
  {
    id: "prod_chocolate_cake",
    name: "Chocolate Cake",
    description: "Decadent multi-layered Belgian chocolate sponge with silky dark chocolate ganache.",
    category: "Desserts",
    priceMinor: 45000, // Rs. 450
    priceDisplay: 450,
    imageUrl: "https://images.unsplash.com/photo-1578985545062-69928b1d9587?auto=format&fit=crop&w=800&q=80",
    imageUrls: [
      "https://images.unsplash.com/photo-1578985545062-69928b1d9587?auto=format&fit=crop&w=800&q=80",
      "https://images.unsplash.com/photo-1606890737304-57a1ca8a5b62?auto=format&fit=crop&w=800&q=80",
      "https://images.unsplash.com/photo-1588195538326-c5b1e9f80a1b?auto=format&fit=crop&w=800&q=80",
    ],
    isAvailable: true,
    displayOrder: 4,
  },
  {
    id: "prod_cappuccino",
    name: "Cappuccino",
    description: "Espresso pulled from freshly roasted beans with velvety steamed milk foam.",
    category: "Coffee",
    priceMinor: 40000, // Rs. 400
    priceDisplay: 400,
    imageUrl: "https://images.unsplash.com/photo-1534778101976-62847782c213?auto=format&fit=crop&w=800&q=80",
    imageUrls: [
      "https://images.unsplash.com/photo-1534778101976-62847782c213?auto=format&fit=crop&w=800&q=80",
      "https://images.unsplash.com/photo-1509042239860-f550ce710b93?auto=format&fit=crop&w=800&q=80",
      "https://images.unsplash.com/photo-1495474472287-4d71bcdd2085?auto=format&fit=crop&w=800&q=80",
    ],
    isAvailable: true,
    displayOrder: 5,
  },
  {
    id: "prod_iced_caramel_latte",
    name: "Iced Caramel Latte",
    description: "Chilled double espresso over creamy milk and rich salted caramel syrup.",
    category: "Coffee",
    priceMinor: 48000, // Rs. 480
    priceDisplay: 480,
    imageUrl: "https://images.unsplash.com/photo-1517701550927-30cf4ba1dba5?auto=format&fit=crop&w=800&q=80",
    imageUrls: [
      "https://images.unsplash.com/photo-1517701550927-30cf4ba1dba5?auto=format&fit=crop&w=800&q=80",
      "https://images.unsplash.com/photo-1461023058943-07fcbe16d735?auto=format&fit=crop&w=800&q=80",
    ],
    isAvailable: true,
    displayOrder: 6,
  },
  {
    id: "prod_vegetable_roti",
    name: "Spicy Vegetable Roti",
    description: "Golden griddle-toasted flatbread stuffed with spiced potatoes and tender vegetables.",
    category: "Snacks",
    priceMinor: 20000, // Rs. 200
    priceDisplay: 200,
    imageUrl: "https://images.unsplash.com/photo-1601050690597-df0568f70950?auto=format&fit=crop&w=800&q=80",
    imageUrls: [
      "https://images.unsplash.com/photo-1601050690597-df0568f70950?auto=format&fit=crop&w=800&q=80",
      "https://images.unsplash.com/photo-1626777552726-4a6b54c97e46?auto=format&fit=crop&w=800&q=80",
    ],
    isAvailable: true,
    displayOrder: 7,
  },
  {
    id: "prod_fish_cutlets",
    name: "Crispy Fish Cutlets (3 pcs)",
    description: "Crispy breadcrumbed croquettes filled with spiced tuna and seasoned potatoes.",
    category: "Snacks",
    priceMinor: 32000, // Rs. 320
    priceDisplay: 320,
    imageUrl: "https://images.unsplash.com/photo-1626777552726-4a6b54c97e46?auto=format&fit=crop&w=800&q=80",
    imageUrls: [
      "https://images.unsplash.com/photo-1626777552726-4a6b54c97e46?auto=format&fit=crop&w=800&q=80",
      "https://images.unsplash.com/photo-1601050690597-df0568f70950?auto=format&fit=crop&w=800&q=80",
    ],
    isAvailable: true,
    displayOrder: 8,
  },
  {
    id: "prod_butter_cake",
    name: "Traditional Butter Cake",
    description: "Fluffy Sri Lankan teatime yellow sponge cake with sweet buttery crumb.",
    category: "Desserts",
    priceMinor: 28000, // Rs. 280
    priceDisplay: 280,
    imageUrl: "https://images.unsplash.com/photo-1588195538326-c5b1e9f80a1b?auto=format&fit=crop&w=800&q=80",
    imageUrls: [
      "https://images.unsplash.com/photo-1588195538326-c5b1e9f80a1b?auto=format&fit=crop&w=800&q=80",
      "https://images.unsplash.com/photo-1578985545062-69928b1d9587?auto=format&fit=crop&w=800&q=80",
    ],
    isAvailable: true,
    displayOrder: 9,
  },
];

export const INITIAL_TABLES: TableItem[] = [
  { id: "tbl_01", number: "Table 01", token: "tbl_01_f3a1", active: true },
  { id: "tbl_02", number: "Table 02", token: "tbl_02_e8c4", active: true },
  { id: "tbl_03", number: "Table 03", token: "tbl_03_d7b9", active: true },
  { id: "tbl_04", number: "Table 04", token: "tbl_04_c2a8", active: true },
  { id: "tbl_05", number: "Table 05", token: "tbl_05_b5d6", active: true },
  { id: "tbl_06", number: "Table 06", token: "tbl_06_a1e3", active: true },
  { id: "tbl_07", number: "Table 07", token: "tbl_07_k8j3m", active: true }, // Featured mockup table!
  { id: "tbl_08", number: "Table 08", token: "tbl_08_9c4f", active: true },
  { id: "tbl_09", number: "Table 09", token: "tbl_09_8b2e", active: true },
  { id: "tbl_10", number: "Table 10", token: "tbl_10_7a1d", active: true },
  { id: "tbl_11", number: "Table 11", token: "tbl_11_6f5c", active: true },
];

export const INITIAL_SETTINGS: CafeSettings = {
  cafeName: "TEA TIME",
  tagline: "Scan. Pick. Enjoy.",
  currencySymbol: "Rs.",
  currencyCode: "LKR",
  openingHours: "7:30 AM – 10:30 PM",
  isOrderingPaused: false,
  pauseMessage: "New orders are temporarily paused by café staff. Please check back shortly.",
  logoUrl: "/assets/logo.png",
};

