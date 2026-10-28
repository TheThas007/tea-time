/**
 * TEA TIME Database Seeder
 * Populates Firestore with categories, menu items, tables, settings, and counter.
 * Supports both local Firestore Emulator and live Cloud Firestore.
 */

const { initializeApp, cert } = require("firebase-admin/app");
const { getFirestore, FieldValue } = require("firebase-admin/firestore");

// If running against emulator, set environment variable
if (!process.env.FIRESTORE_EMULATOR_HOST && process.env.USE_EMULATOR !== "false") {
  process.env.FIRESTORE_EMULATOR_HOST = "127.0.0.1:8080";
  console.log("Using Firestore Emulator at 127.0.0.1:8080");
}

const app = initializeApp({
  projectId: process.env.GCLOUD_PROJECT || "teatime-f4005",
});

const db = getFirestore(app);

const CATEGORIES = [
  {
    id: "cat_tea",
    name: "Tea",
    slug: "tea",
    displayOrder: 1,
    iconUrl: "https://images.unsplash.com/photo-1544787219-7f47ccb76574?auto=format&fit=crop&w=200&q=80",
  },
  {
    id: "cat_coffee",
    name: "Coffee",
    slug: "coffee",
    displayOrder: 2,
    iconUrl: "https://images.unsplash.com/photo-1534778101976-62847782c213?auto=format&fit=crop&w=200&q=80",
  },
  {
    id: "cat_snacks",
    name: "Snacks",
    slug: "snacks",
    displayOrder: 3,
    iconUrl: "https://images.unsplash.com/photo-1601050690597-df0568f70950?auto=format&fit=crop&w=200&q=80",
  },
  {
    id: "cat_desserts",
    name: "Desserts",
    slug: "desserts",
    displayOrder: 4,
    iconUrl: "https://images.unsplash.com/photo-1578985545062-69928b1d9587?auto=format&fit=crop&w=200&q=80",
  },
];

const MENU_ITEMS = [
  {
    id: "prod_ceylon_milk_tea",
    name: "Ceylon Milk Tea",
    description: "Rich, aromatic Ceylon black tea brewed with fresh milk and gentle sweetness.",
    category: "Tea",
    priceMinor: 25000,
    priceDisplay: 250,
    imageUrl: "https://images.unsplash.com/photo-1544787219-7f47ccb76574?auto=format&fit=crop&w=600&q=80",
    isAvailable: true,
    displayOrder: 1,
  },
  {
    id: "prod_masala_chai",
    name: "Masala Chai",
    description: "Traditional slow-brewed spiced tea with cardamom, cinnamon, cloves, and ginger in a clay cup.",
    category: "Tea",
    priceMinor: 30000,
    priceDisplay: 300,
    imageUrl: "https://images.unsplash.com/photo-1576092768241-dec231879fc3?auto=format&fit=crop&w=600&q=80",
    isAvailable: true,
    displayOrder: 2,
  },
  {
    id: "prod_iced_lemon_tea",
    name: "Iced Lemon Tea",
    description: "Refreshing chilled Ceylon tea infused with fresh citrus slices and garden mint.",
    category: "Tea",
    priceMinor: 35000,
    priceDisplay: 350,
    imageUrl: "https://images.unsplash.com/photo-1556679343-c7306c1976bc?auto=format&fit=crop&w=600&q=80",
    isAvailable: true,
    displayOrder: 3,
  },
  {
    id: "prod_chocolate_cake",
    name: "Chocolate Cake",
    description: "Decadent multi-layered Belgian chocolate sponge with silky dark chocolate ganache.",
    category: "Desserts",
    priceMinor: 45000,
    priceDisplay: 450,
    imageUrl: "https://images.unsplash.com/photo-1578985545062-69928b1d9587?auto=format&fit=crop&w=600&q=80",
    isAvailable: true,
    displayOrder: 4,
  },
  {
    id: "prod_cappuccino",
    name: "Cappuccino",
    description: "Espresso pulled from freshly roasted beans with velvety steamed milk foam.",
    category: "Coffee",
    priceMinor: 40000,
    priceDisplay: 400,
    imageUrl: "https://images.unsplash.com/photo-1534778101976-62847782c213?auto=format&fit=crop&w=600&q=80",
    isAvailable: true,
    displayOrder: 5,
  },
  {
    id: "prod_iced_caramel_latte",
    name: "Iced Caramel Latte",
    description: "Chilled double espresso over creamy milk and rich salted caramel syrup.",
    category: "Coffee",
    priceMinor: 48000,
    priceDisplay: 480,
    imageUrl: "https://images.unsplash.com/photo-1517701550927-30cf4ba1dba5?auto=format&fit=crop&w=600&q=80",
    isAvailable: true,
    displayOrder: 6,
  },
  {
    id: "prod_vegetable_roti",
    name: "Spicy Vegetable Roti",
    description: "Golden griddle-toasted flatbread stuffed with spiced potatoes and tender vegetables.",
    category: "Snacks",
    priceMinor: 20000,
    priceDisplay: 200,
    imageUrl: "https://images.unsplash.com/photo-1601050690597-df0568f70950?auto=format&fit=crop&w=600&q=80",
    isAvailable: true,
    displayOrder: 7,
  },
  {
    id: "prod_fish_cutlets",
    name: "Crispy Fish Cutlets (3 pcs)",
    description: "Crispy breadcrumbed croquettes filled with spiced tuna and seasoned potatoes.",
    category: "Snacks",
    priceMinor: 32000,
    priceDisplay: 320,
    imageUrl: "https://images.unsplash.com/photo-1626777552726-4a6b54c97e46?auto=format&fit=crop&w=600&q=80",
    isAvailable: true,
    displayOrder: 8,
  },
  {
    id: "prod_butter_cake",
    name: "Traditional Butter Cake",
    description: "Fluffy Sri Lankan teatime yellow sponge cake with sweet buttery crumb.",
    category: "Desserts",
    priceMinor: 28000,
    priceDisplay: 280,
    imageUrl: "https://images.unsplash.com/photo-1588195538326-c5b1e9f80a1b?auto=format&fit=crop&w=600&q=80",
    isAvailable: true,
    displayOrder: 9,
  },
];

const TABLES = [
  { id: "tbl_01", number: "Table 01", token: "tbl_01_f3a1", active: true },
  { id: "tbl_02", number: "Table 02", token: "tbl_02_e8c4", active: true },
  { id: "tbl_03", number: "Table 03", token: "tbl_03_d7b9", active: true },
  { id: "tbl_04", number: "Table 04", token: "tbl_04_c2a8", active: true },
  { id: "tbl_05", number: "Table 05", token: "tbl_05_b5d6", active: true },
  { id: "tbl_06", number: "Table 06", token: "tbl_06_a1e3", active: true },
  { id: "tbl_07", number: "Table 07", token: "tbl_07_k8j3m", active: true },
  { id: "tbl_08", number: "Table 08", token: "tbl_08_9c4f", active: true },
  { id: "tbl_09", number: "Table 09", token: "tbl_09_8b2e", active: true },
  { id: "tbl_10", number: "Table 10", token: "tbl_10_7a1d", active: true },
  { id: "tbl_11", number: "Table 11", token: "tbl_11_6f5c", active: true },
];

async function seed() {
  console.log("🌱 Starting TEA TIME Firestore Seeding...");

  // 1. Categories
  console.log("Adding categories...");
  for (const cat of CATEGORIES) {
    await db.collection("categories").doc(cat.id).set(cat, { merge: true });
  }

  // 2. Menu Items
  console.log("Adding menu items...");
  for (const item of MENU_ITEMS) {
    await db.collection("menu").doc(item.id).set({
      ...item,
      updatedAt: FieldValue.serverTimestamp(),
    }, { merge: true });
  }

  // 3. Tables
  console.log("Adding tables...");
  for (const tbl of TABLES) {
    await db.collection("tables").doc(tbl.id).set({
      ...tbl,
      updatedAt: FieldValue.serverTimestamp(),
    }, { merge: true });
  }

  // 4. Café Settings
  console.log("Adding café settings...");
  await db.collection("settings").doc("cafe").set({
    cafeName: "TEA TIME",
    tagline: "Scan. Pick. Enjoy.",
    currencySymbol: "Rs.",
    currencyCode: "LKR",
    openingHours: "7:30 AM – 10:30 PM",
    isOrderingPaused: false,
    pauseMessage: "New orders are temporarily paused by café staff. Please check back shortly.",
    logoUrl: "/assets/logo.png",
    updatedAt: FieldValue.serverTimestamp(),
  }, { merge: true });

  // 5. Order Counter
  console.log("Initializing order counter...");
  await db.collection("counters").doc("orders").set({
    lastOrderNumber: 1041, // Next will be #1042 matching the mockup!
    updatedAt: FieldValue.serverTimestamp(),
  }, { merge: true });

  console.log("✅ Seeding complete! TEA TIME menu, tables, and settings ready.");
  process.exit(0);
}

seed().catch((err) => {
  console.error("❌ Seeding failed:", err);
  process.exit(1);
});

