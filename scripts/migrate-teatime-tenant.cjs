/**
 * Idempotent Tea Time Café Multi-Tenant Migration Script
 *
 * Migrates existing Tea Time menu catalog, categories, tables, and settings
 * into the tenant-isolated schema (/businesses/teatime/...) while preserving
 * all existing root data and table tokens.
 *
 * Usage:
 *   node scripts/migrate-teatime-tenant.cjs [--dry-run] [--backup] [--rollback <backup-file>]
 *
 * Examples:
 *   node scripts/migrate-teatime-tenant.cjs --dry-run
 *   node scripts/migrate-teatime-tenant.cjs --backup
 */

const fs = require("fs");
const path = require("path");
const { initializeApp } = require("firebase-admin/app");
const { getFirestore, Timestamp } = require("firebase-admin/firestore");

if (process.env.USE_EMULATOR === "true" || process.argv.includes("--emulator")) {
  process.env.FIREBASE_AUTH_EMULATOR_HOST = process.env.FIREBASE_AUTH_EMULATOR_HOST || "127.0.0.1:9099";
  process.env.FIRESTORE_EMULATOR_HOST = process.env.FIRESTORE_EMULATOR_HOST || "127.0.0.1:8080";
  console.log("Connecting to Emulators at 127.0.0.1:9099 & :8080");
}

const app = initializeApp({
  projectId:
    process.env.FIREBASE_PROJECT_ID ||
    process.env.GCLOUD_PROJECT ||
    "teatime-f4005",
});

const db = getFirestore(app);

function parseArgs() {
  const args = process.argv.slice(2);
  const out = {};
  for (let i = 0; i < args.length; i++) {
    if (args[i].startsWith("--")) {
      const key = args[i].slice(2);
      const val = args[i + 1] && !args[i + 1].startsWith("--") ? args[i + 1] : "true";
      out[key] = val;
      if (val !== "true") i++;
    }
  }
  return out;
}

async function runMigration() {
  const args = parseArgs();
  const isDryRun = Boolean(args["dry-run"]);
  const shouldBackup = Boolean(args["backup"]);
  const rollbackFile = args["rollback"];

  console.log("\n=======================================================");
  console.log("   TEA TIME Café Multi-Tenant SaaS Migration");
  console.log(`   Mode: ${isDryRun ? "DRY RUN (Read-Only Simulation)" : "LIVE EXECUTION"}`);
  console.log("=======================================================\n");

  const businessId = "teatime";
  const slug = "teatime";
  const nowMs = Date.now();

  // 1. Rollback mode
  if (rollbackFile) {
    console.log(`Loading rollback data from: ${rollbackFile}...`);
    const raw = fs.readFileSync(rollbackFile, "utf-8");
    const backupData = JSON.parse(raw);

    if (isDryRun) {
      console.log(`[DRY RUN] Would restore ${Object.keys(backupData).length} documents.`);
      return;
    }

    const batch = db.batch();
    for (const [docPath, data] of Object.entries(backupData)) {
      if (data === null) {
        batch.delete(db.doc(docPath));
      } else {
        batch.set(db.doc(docPath), data);
      }
    }
    await batch.commit();
    console.log("✅ Rollback completed successfully.");
    return;
  }

  // 2. Fetch existing collections for migration
  console.log("Inspecting existing collections in Firestore...");

  // Categories
  const catSnap = await db.collection("categories").get();
  console.log(`Found ${catSnap.size} existing categories in root /categories.`);

  // Products
  const prodSnap = await db.collection("menu").get();
  console.log(`Found ${prodSnap.size} existing products in root /menu.`);

  // Tables
  const tableSnap = await db.collection("tables").get();
  console.log(`Found ${tableSnap.size} existing tables in root /tables.`);

  // Café settings
  const cafeSettingsDoc = await db.collection("settings").doc("cafe").get();
  const cafeSettings = cafeSettingsDoc.exists ? cafeSettingsDoc.data() : {};

  // 3. Create Backup if requested
  if (shouldBackup) {
    const backupDir = path.resolve(__dirname, "../backups");
    if (!fs.existsSync(backupDir)) {
      fs.mkdirSync(backupDir, { recursive: true });
    }
    const backupFile = path.join(backupDir, `teatime-migration-backup-${nowMs}.json`);

    const backupMap = {
      [`businesses/${businessId}`]: (await db.doc(`businesses/${businessId}`).get()).data() || null,
      [`businessAccess/${businessId}`]: (await db.doc(`businessAccess/${businessId}`).get()).data() || null,
      [`businessPrivate/${businessId}`]: (await db.doc(`businessPrivate/${businessId}`).get()).data() || null,
      [`businessSlugs/${slug}`]: (await db.doc(`businessSlugs/${slug}`).get()).data() || null,
    };

    fs.writeFileSync(backupFile, JSON.stringify(backupMap, null, 2), "utf-8");
    console.log(`💾 Backup saved to: ${backupFile}`);
  }

  // 4. Prepare tenant documents
  const businessProfile = {
    id: businessId,
    name: cafeSettings.cafeName || "TEA TIME",
    slug,
    tagline: cafeSettings.tagline || "Freshly Brewed Moments",
    phone: cafeSettings.phone || "0771234567",
    whatsapp: cafeSettings.whatsapp || "0771234567",
    address: cafeSettings.address || "Vavuniya, Sri Lanka",
    openingHours: cafeSettings.openingHours || "8:00 AM - 10:00 PM",
    currencyCode: "LKR",
    currencySymbol: "Rs.",
    branding: {
      logoUrl: cafeSettings.logoUrl || null,
      primaryColor: cafeSettings.primaryColor || "#0A0A0A",
      accentColor: cafeSettings.accentColor || "#E8B64F",
    },
    googleReviewUrl:
      "https://www.google.com/maps/place/TeaTime/@8.7505273,80.5002708,1075m/data=!3m1!1e3!4m8!3m7!1s0x3afc150061716423:0xd3dafef0e97cac0d!8m2!3d8.7505273!4d80.5028457!9m1!1b1!16s%2Fg%2F11x038s1mv",
    instagramUrl: "https://www.instagram.com/teatime_vavuniya/",
    facebookUrl: "https://www.facebook.com/teatime.vavuniya/",
    operationalStatus: "ACTIVE",
    isOrderingPaused: Boolean(cafeSettings.isOrderingPaused),
    pauseMessage: cafeSettings.pauseMessage || "We are currently preparing fresh batches. Ordering resumes shortly.",
    legacyTeaTime: true,
    createdAtMs: nowMs,
    updatedAtMs: nowMs,
  };

  const businessAccess = {
    businessId,
    operationalStatus: "ACTIVE",
    packageId: "lifetime",
    packageNameSnapshot: "Lifetime Partner",
    packagePriceMinorSnapshot: 3_000_000,
    isLifetime: true,
    activatedAtMs: nowMs,
    startsAtMs: nowMs,
    expiresAtMs: null,
    activatedDateColombo: "2026-01-01",
    ownerUid: "teatime_owner",
    updatedAtMs: nowMs,
  };

  const businessPrivate = {
    businessId,
    ownerName: "TEA TIME Management",
    ownerUsername: "teatime_admin",
    ownerEmail: "owner@teatime.lk",
    internalNotes: "Original flagship business migrated to AEVONIX platform with Lifetime entitlement.",
    updatedAtMs: nowMs,
  };

  if (isDryRun) {
    console.log("\n[DRY RUN SUMMARY]");
    console.log(`- Would set /businesses/${businessId}`);
    console.log(`- Would set /businessAccess/${businessId} (Lifetime)`);
    console.log(`- Would set /businessPrivate/${businessId}`);
    console.log(`- Would set /businessSlugs/${slug} -> ${businessId}`);
    console.log(`- Would migrate ${catSnap.size} categories into /businesses/${businessId}/categories`);
    console.log(`- Would migrate ${prodSnap.size} products into /businesses/${businessId}/products`);
    console.log(`- Would migrate ${tableSnap.size} tables into /businesses/${businessId}/tables and /businesses/${businessId}/tableTokens`);
    console.log("\nDry run completed with 0 errors. Run without --dry-run to apply changes.");
    return;
  }

  // 5. Apply migration writes atomically or in batches
  console.log("Applying tenant root records...");
  const rootBatch = db.batch();
  rootBatch.set(db.doc(`businesses/${businessId}`), businessProfile, { merge: true });
  rootBatch.set(db.doc(`businessAccess/${businessId}`), businessAccess, { merge: true });
  rootBatch.set(db.doc(`businessPrivate/${businessId}`), businessPrivate, { merge: true });
  rootBatch.set(db.doc(`businessSlugs/${slug}`), { businessId, slug, updatedAtMs: nowMs });
  await rootBatch.commit();
  console.log("✅ Tenant root documents created.");

  // Migrate Categories
  if (!catSnap.empty) {
    console.log(`Migrating ${catSnap.size} categories...`);
    const catBatch = db.batch();
    catSnap.forEach((doc) => {
      const data = doc.data();
      catBatch.set(db.doc(`businesses/${businessId}/categories/${doc.id}`), {
        id: doc.id,
        businessId,
        name: data.name,
        slug: data.slug || doc.id,
        displayOrder: data.displayOrder ?? data.sortOrder ?? 0,
        sortOrder: data.sortOrder ?? data.displayOrder ?? 0,
        icon: data.icon || undefined,
        iconUrl: data.iconUrl || undefined,
        isVisible: data.isVisible !== false,
        updatedAtMs: nowMs,
      }, { merge: true });
    });
    await catBatch.commit();
    console.log("✅ Categories migrated.");
  }

  // Migrate Products
  if (!prodSnap.empty) {
    console.log(`Migrating ${prodSnap.size} products...`);
    // Batch in chunks of 400
    const docs = prodSnap.docs;
    for (let i = 0; i < docs.length; i += 400) {
      const chunk = docs.slice(i, i + 400);
      const prodBatch = db.batch();
      chunk.forEach((doc) => {
        const data = doc.data();
        prodBatch.set(db.doc(`businesses/${businessId}/products/${doc.id}`), {
          id: doc.id,
          businessId,
          name: data.name,
          categoryId: data.category || data.categoryId || "General",
          category: data.category || "General",
          categories: data.categories || [data.category || "General"],
          priceMinor: data.priceMinor || (data.price ? data.price * 100 : 10000),
          priceDisplay: data.priceDisplay || data.price || 100,
          priceRupees: data.priceDisplay || data.price || 100,
          description: data.description || "",
          imageUrl: data.imageUrl || data.image || null,
          imageUrls: data.imageUrls || (data.imageUrl ? [data.imageUrl] : []),
          isAvailable: data.isAvailable !== false && data.available !== false,
          isVeg: Boolean(data.isVeg),
          isPopular: Boolean(data.featured || data.isPopular),
          sortOrder: data.displayOrder ?? data.sortOrder ?? 0,
          displayOrder: data.displayOrder ?? data.sortOrder ?? 0,
          updatedAtMs: nowMs,
        }, { merge: true });
      });
      await prodBatch.commit();
    }
    console.log("✅ Products migrated.");
  }

  // Migrate Tables and create O(1) Table Tokens
  if (!tableSnap.empty) {
    console.log(`Migrating ${tableSnap.size} tables and setting up direct token maps...`);
    const tableBatch = db.batch();
    tableSnap.forEach((doc) => {
      const data = doc.data();
      const token = data.token || `tbl_${doc.id}`;
      const tableNumber = data.number || data.tableNumber || `Table ${doc.id}`;

      tableBatch.set(db.doc(`businesses/${businessId}/tables/${doc.id}`), {
        id: doc.id,
        businessId,
        number: tableNumber,
        tableNumber: tableNumber,
        token,
        capacity: data.capacity || 4,
        notes: data.notes || undefined,
        active: data.active !== false,
        updatedAtMs: nowMs,
      }, { merge: true });

      // O(1) direct single-token lookup
      tableBatch.set(db.doc(`businesses/${businessId}/tableTokens/${token}`), {
        token,
        tableId: doc.id,
        tableNumber,
        businessId,
        active: data.active !== false,
        updatedAtMs: nowMs,
      }, { merge: true });
    });

    await tableBatch.commit();
    console.log("✅ Tables and table tokens migrated.");
  }

  console.log("\n=======================================================");
  console.log("🎉 TEA TIME Café Migration Completed Successfully!");
  console.log(`Tenant Route: /${slug}/menu`);
  console.log(`Public Profile: /businesses/${businessId}`);
  console.log("=======================================================\n");
}

runMigration().catch((err) => {
  console.error("Migration failed:", err);
  process.exit(1);
});
