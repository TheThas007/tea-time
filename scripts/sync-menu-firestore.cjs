/**
 * Idempotent Live Firestore Sync for Official TEA TIME Menu (15 Categories, 107 Unique Products)
 * - Reads Firebase config from .env
 * - Authenticates as administrator
 * - Removes legacy Unsplash demo items/categories ONLY
 * - Upserts 15 categories & 107 unique products by deterministic ID ({ merge: true })
 * - Never modifies orders, tables, settings, admins, or counters
 */

const fs = require("fs");
const path = require("path");
const { initializeApp } = require("firebase/app");
const { getAuth, signInWithEmailAndPassword } = require("firebase/auth");
const {
  getFirestore,
  collection,
  getDocs,
  doc,
  writeBatch,
  serverTimestamp,
} = require("firebase/firestore");

function loadEnv(envPath) {
  const env = {};
  if (!fs.existsSync(envPath)) return env;
  const content = fs.readFileSync(envPath, "utf8");
  for (const line of content.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eqIdx = trimmed.indexOf("=");
    if (eqIdx === -1) continue;
    const key = trimmed.slice(0, eqIdx).trim();
    let val = trimmed.slice(eqIdx + 1).trim();
    if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
      val = val.slice(1, -1);
    }
    env[key] = val;
  }
  return env;
}

async function main() {
  const rootDir = path.resolve(__dirname, "..");
  const env = loadEnv(path.join(rootDir, ".env"));

  if (!env.VITE_FIREBASE_API_KEY || !env.VITE_FIREBASE_PROJECT_ID) {
    throw new Error("Missing VITE_FIREBASE_API_KEY or VITE_FIREBASE_PROJECT_ID in .env");
  }

  // Load canonical menu data directly from src/data/seedData.ts JSON blocks
  const seedTs = fs.readFileSync(path.join(rootDir, "src", "data", "seedData.ts"), "utf8");
  const catMatch = seedTs.match(/export const INITIAL_CATEGORIES:\s*Category\[\]\s*=\s*(\[\s*\{[\s\S]*?\n\]);/);
  const menuMatch = seedTs.match(/export const INITIAL_MENU_ITEMS:\s*MenuItem\[\]\s*=\s*(\[\s*\{[\s\S]*?\n\]);/);

  if (!catMatch || !menuMatch) {
    throw new Error("Could not parse INITIAL_CATEGORIES or INITIAL_MENU_ITEMS from src/data/seedData.ts");
  }

  const categories = JSON.parse(catMatch[1]);
  const menuItems = JSON.parse(menuMatch[1]);

  console.log(`Parsed ${categories.length} categories and ${menuItems.length} unique products from seedData.ts`);

  const firebaseConfig = {
    apiKey: env.VITE_FIREBASE_API_KEY,
    authDomain: env.VITE_FIREBASE_AUTH_DOMAIN,
    projectId: env.VITE_FIREBASE_PROJECT_ID,
    storageBucket: env.VITE_FIREBASE_STORAGE_BUCKET,
    messagingSenderId: env.VITE_FIREBASE_MESSAGING_SENDER_ID,
    appId: env.VITE_FIREBASE_APP_ID,
  };

  const app = initializeApp(firebaseConfig);
  const auth = getAuth(app);
  const db = getFirestore(app);

  const adminEmail = process.env.TEATIME_ADMIN_EMAIL || "admin@teatime.lk";
  const adminPassword = process.env.TEATIME_ADMIN_PASSWORD || "Admin@TeaTime2026!";

  console.log(`Authenticating with Firebase project "${firebaseConfig.projectId}"...`);
  await signInWithEmailAndPassword(auth, adminEmail, adminPassword);
  console.log("Authenticated as admin.");

  // Inspect existing collections before syncing
  const existingCatsSnap = await getDocs(collection(db, "categories"));
  const existingMenuSnap = await getDocs(collection(db, "menu"));
  console.log(
    `Before sync: ${existingCatsSnap.size} docs in 'categories', ${existingMenuSnap.size} docs in 'menu'`
  );

  const officialCatIds = new Set(categories.map((c) => c.id));
  const officialMenuIds = new Set(menuItems.map((m) => m.id));

  const legacyCatIds = new Set(["cat_tea", "cat_coffee", "cat_snacks", "cat_desserts"]);
  const batch = writeBatch(db);
  let deletedLegacyCats = 0;
  let deletedLegacyItems = 0;

  existingCatsSnap.forEach((docSnap) => {
    const data = docSnap.data();
    const isLegacyUnsplash =
      typeof data.iconUrl === "string" && data.iconUrl.includes("images.unsplash.com");
    if ((legacyCatIds.has(docSnap.id) || isLegacyUnsplash) && !officialCatIds.has(docSnap.id)) {
      batch.delete(doc(db, "categories", docSnap.id));
      deletedLegacyCats++;
    }
  });

  existingMenuSnap.forEach((docSnap) => {
    const data = docSnap.data();
    const isLegacyDemoId = docSnap.id.startsWith("prod_");
    const isLegacyUnsplash =
      typeof data.imageUrl === "string" && data.imageUrl.includes("images.unsplash.com");
    if ((isLegacyDemoId || isLegacyUnsplash) && !officialMenuIds.has(docSnap.id)) {
      batch.delete(doc(db, "menu", docSnap.id));
      deletedLegacyItems++;
    }
  });

  for (const cat of categories) {
    batch.set(doc(db, "categories", cat.id), cat, { merge: true });
  }

  for (const item of menuItems) {
    batch.set(
      doc(db, "menu", item.id),
      {
        ...item,
        updatedAt: serverTimestamp(),
      },
      { merge: true }
    );
  }

  await batch.commit();
  console.log(
    `Batch committed: upserted ${categories.length} categories, ${menuItems.length} menu items (removed ${deletedLegacyCats} legacy demo categories, ${deletedLegacyItems} legacy demo items).`
  );

  // Verify live Firestore counts after sync
  const afterCatsSnap = await getDocs(collection(db, "categories"));
  const afterMenuSnap = await getDocs(collection(db, "menu"));
  console.log(
    `After sync verification: ${afterCatsSnap.size} docs in 'categories', ${afterMenuSnap.size} docs in 'menu'.`
  );

  process.exit(0);
}

main().catch((err) => {
  console.error("Firestore sync error:", err);
  process.exit(1);
});

