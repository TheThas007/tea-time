import assert from "assert";
import {
  DEFAULT_PACKAGES,
  DEFAULT_PLATFORM_PUBLIC_CONFIG,
  validateBusinessSlug,
  validatePasswordStrength,
  validateUsername,
} from "../src/shared/constants";
import {
  addCalendarMonthsColombo,
  computeInitialSubscriptionWindow,
  computeRenewalSubscriptionWindow,
  evaluateBusinessAccess,
  getColomboDateString,
  getColomboYearMonth,
  isLeapYear,
  parseColomboCalendarDateStartMs,
} from "../src/shared/subscriptionMath";
import {
  InMemoryPlatformDataStore,
  InMemoryPlatformAuthProvider,
  MutableClock,
} from "../src/server/inMemoryAdapter";
import { PlatformEngine } from "../src/server/platformEngine";
import { PlatformApiError, VerifiedCaller } from "../src/server/storeTypes";

class TestRunner {
  private passed = 0;
  private failed = 0;

  async test(name: string, fn: () => Promise<void> | void) {
    try {
      await fn();
      console.log(`  ✅ PASS: ${name}`);
      this.passed++;
    } catch (err: any) {
      console.error(`  ❌ FAIL: ${name}`);
      console.error(`     Error: ${err?.message || err}`);
      if (err?.stack) {
        console.error(err.stack.split("\n").slice(1, 4).join("\n"));
      }
      this.failed++;
    }
  }

  summary() {
    console.log("\n=======================================================");
    console.log(`   Verification Results: ${this.passed} Passed, ${this.failed} Failed`);
    console.log("=======================================================\n");
    if (this.failed > 0) {
      process.exit(1);
    }
  }
}

async function main() {
  const runner = new TestRunner();
  console.log("\n=======================================================");
  console.log("   AEVONIX Restaurant Menu SaaS - Automated Verification");
  console.log("=======================================================\n");

  // -----------------------------------------------------------------
  // 1. Pure Calendar Month Arithmetic & Colombo Timezone Math
  // -----------------------------------------------------------------
  console.log("Suite 1: Calendar Month Math & Colombo Timezone (Asia/Colombo UTC+05:30)");

  await runner.test("Leap year calculation: 2024 is leap, 2025 is not", () => {
    assert.strictEqual(isLeapYear(2024), true);
    assert.strictEqual(isLeapYear(2025), false);
    assert.strictEqual(isLeapYear(2000), true);
    assert.strictEqual(isLeapYear(1900), false);
  });

  await runner.test("End-of-month clamping in Colombo: Jan 31 2024 + 1 month = Feb 29 2024", () => {
    const jan31Ms = parseColomboCalendarDateStartMs("2024-01-31");
    const feb29Ms = addCalendarMonthsColombo(jan31Ms, 1);
    assert.strictEqual(getColomboDateString(feb29Ms), "2024-02-29");
  });

  await runner.test("End-of-month clamping in Colombo: Jan 31 2025 + 1 month = Feb 28 2025", () => {
    const jan31Ms = parseColomboCalendarDateStartMs("2025-01-31");
    const feb28Ms = addCalendarMonthsColombo(jan31Ms, 1);
    assert.strictEqual(getColomboDateString(feb28Ms), "2025-02-28");
  });

  await runner.test("End-of-month clamping in Colombo: May 31 2026 + 1 month = June 30 2026", () => {
    const may31Ms = parseColomboCalendarDateStartMs("2026-05-31");
    const jun30Ms = addCalendarMonthsColombo(may31Ms, 1);
    assert.strictEqual(getColomboDateString(jun30Ms), "2026-06-30");
  });

  await runner.test("Initial subscription window: 3 Months starter", () => {
    const win = computeInitialSubscriptionWindow("3_months", "2026-01-15");
    assert.strictEqual(win.isLifetime, false);
    assert.strictEqual(win.expiryDateColombo, "2026-04-15");
  });

  await runner.test("Initial subscription window: 6 Months growth", () => {
    const win = computeInitialSubscriptionWindow("6_months", "2026-03-31");
    assert.strictEqual(win.isLifetime, false);
    // March 31 + 6 months = September 30 (clamped from 31)
    assert.strictEqual(win.expiryDateColombo, "2026-09-30");
  });

  await runner.test("Initial subscription window: Lifetime has null expiry", () => {
    const win = computeInitialSubscriptionWindow("lifetime", "2026-01-01");
    assert.strictEqual(win.isLifetime, true);
    assert.strictEqual(win.expiresAtMs, null);
    assert.strictEqual(win.expiryDateColombo, null);
  });

  await runner.test("Renewal extends active subscription seamlessly from existing expiry", () => {
    const currentExpiryColombo = "2026-06-15";
    const currentExpiryMs = parseColomboCalendarDateStartMs(currentExpiryColombo);
    const serverNowMs = parseColomboCalendarDateStartMs("2026-06-01"); // still active

    const renewal = computeRenewalSubscriptionWindow({
      currentIsLifetime: false,
      currentExpiresAtMs: currentExpiryMs,
      newPackageId: "3_months",
      serverNowMs,
    });

    assert.strictEqual(renewal.startsAtMs, currentExpiryMs);
    assert.strictEqual(renewal.expiryDateColombo, "2026-09-15");
  });

  await runner.test("Renewal of expired subscription starts from renewal date", () => {
    const expiredMs = parseColomboCalendarDateStartMs("2026-01-01");
    const serverNowMs = parseColomboCalendarDateStartMs("2026-04-10"); // expired

    const renewal = computeRenewalSubscriptionWindow({
      currentIsLifetime: false,
      currentExpiresAtMs: expiredMs,
      newPackageId: "3_months",
      serverNowMs,
      explicitActivationDateColombo: "2026-04-10",
    });

    assert.strictEqual(getColomboDateString(renewal.startsAtMs), "2026-04-10");
    assert.strictEqual(renewal.expiryDateColombo, "2026-07-10");
  });

  await runner.test("evaluateBusinessAccess respects operationalStatus and expiration independently", () => {
    const nowMs = parseColomboCalendarDateStartMs("2026-06-01");

    // Active & unexpired
    const activeOk = evaluateBusinessAccess(
      {
        operationalStatus: "ACTIVE",
        startsAtMs: parseColomboCalendarDateStartMs("2026-01-01"),
        expiresAtMs: parseColomboCalendarDateStartMs("2026-07-01"),
        isLifetime: false,
      } as any,
      nowMs
    );
    assert.strictEqual(activeOk.allowed, true);
    assert.strictEqual(activeOk.effectiveStatus, "active");

    // Suspended (even if unexpired)
    const suspended = evaluateBusinessAccess(
      {
        operationalStatus: "SUSPENDED",
        startsAtMs: parseColomboCalendarDateStartMs("2026-01-01"),
        expiresAtMs: parseColomboCalendarDateStartMs("2026-07-01"),
        isLifetime: false,
      } as any,
      nowMs
    );
    assert.strictEqual(suspended.allowed, false);
    assert.strictEqual(suspended.effectiveStatus, "suspended");

    // Expired
    const expired = evaluateBusinessAccess(
      {
        operationalStatus: "ACTIVE",
        startsAtMs: parseColomboCalendarDateStartMs("2026-01-01"),
        expiresAtMs: parseColomboCalendarDateStartMs("2026-05-01"),
        isLifetime: false,
      } as any,
      nowMs
    );
    assert.strictEqual(expired.allowed, false);
    assert.strictEqual(expired.effectiveStatus, "expired");
  });

  // -----------------------------------------------------------------
  // 2. Platform Engine: Bootstrap & Security
  // -----------------------------------------------------------------
  console.log("\nSuite 2: Platform Engine Bootstrap & Security");

  const store = new InMemoryPlatformDataStore();
  const authMock = new InMemoryPlatformAuthProvider();
  const engine = new PlatformEngine({
    store,
    auth: authMock,
    bootstrapSecret: "TEST_SECRET_2026",
  });

  let superAdminUid = "";
  const superAdminCaller: VerifiedCaller = {
    uid: "",
    email: "admin@aevonix.lk",
    role: "SUPER_ADMIN",
    businessId: null,
    mustChangePassword: false,
  };

  await runner.test("Bootstrap Super Admin succeeds with valid secret and strong password", async () => {
    const res = await engine.bootstrapSuperAdmin({
      secret: "TEST_SECRET_2026",
      username: "aevonix_super",
      email: "admin@aevonix.lk",
      password: "SuperPassword2026!",
      fullName: "Super Admin",
    });

    assert.strictEqual(res.success, true);
    assert.strictEqual(res.username, "aevonix_super");
    superAdminUid = res.uid;
    superAdminCaller.uid = res.uid;

    const profile = await store.getDoc<any>(`userProfiles/${res.uid}`);
    assert.strictEqual(profile.role, "SUPER_ADMIN");
    assert.strictEqual(profile.active, true);
    assert.strictEqual(profile.mustChangePassword, false);
  });

  await runner.test("Second bootstrap attempt is rejected (one-time bootstrap guarantee)", async () => {
    await assert.rejects(
      async () => {
        await engine.bootstrapSuperAdmin({
          secret: "TEST_SECRET_2026",
          username: "second_admin",
          email: "second@aevonix.lk",
          password: "SuperPassword2026!",
        });
      },
      (err: any) => err instanceof PlatformApiError && err.code === "failed-precondition"
    );
  });

  await runner.test("Login by username or email succeeds and issues custom token", async () => {
    // By username
    const loginUser = await engine.loginWithIdentifier(
      { identifier: "aevonix_super", password: "SuperPassword2026!" },
      "127.0.0.1"
    );
    assert.strictEqual(loginUser.role, "SUPER_ADMIN");
    assert.ok(loginUser.customToken);

    // By email
    const loginEmail = await engine.loginWithIdentifier(
      { identifier: "admin@aevonix.lk", password: "SuperPassword2026!" },
      "127.0.0.1"
    );
    assert.strictEqual(loginEmail.role, "SUPER_ADMIN");
  });

  await runner.test("Login failure produces generic error without leaking account existence", async () => {
    await assert.rejects(
      async () => {
        await engine.loginWithIdentifier(
          { identifier: "non_existent_user", password: "WrongPassword123!" },
          "127.0.0.1"
        );
      },
      (err: any) => err instanceof PlatformApiError && err.code === "unauthenticated"
    );
  });

  // -----------------------------------------------------------------
  // 3. Multi-Tenant Business Onboarding & Isolation
  // -----------------------------------------------------------------
  console.log("\nSuite 3: Multi-Tenant Business Onboarding & Isolation");

  let business1: any;
  let business2: any;
  const owner1Caller: VerifiedCaller = {
    uid: "",
    email: "owner@teatime.lk",
    role: "BUSINESS_OWNER",
    businessId: "",
    mustChangePassword: false,
  };

  await runner.test("Super Admin creates Business 1 (TEA TIME) with owner account and payment", async () => {
    business1 = await engine.createBusinessWithOwner(superAdminCaller, {
      businessName: "TEA TIME",
      businessSlug: "teatime",
      ownerName: "Tea Time Manager",
      username: "teatime_owner",
      ownerEmail: "owner@teatime.lk",
      temporaryPassword: "TempPassword2026!",
      packageId: "lifetime",
      paymentAmountRupees: 30000,
      paymentMethod: "BANK_TRANSFER",
      paymentReference: "SLIP-001",
    });

    assert.strictEqual(business1.success, true);
    assert.strictEqual(business1.businessSlug, "teatime");
    owner1Caller.uid = business1.ownerUid;
    owner1Caller.businessId = business1.businessId;

    // Verify tenant documents
    const pub = await store.getDoc<any>(`businesses/${business1.businessId}`);
    assert.strictEqual(pub.name, "TEA TIME");
    assert.strictEqual(pub.slug, "teatime");

    const access = await store.getDoc<any>(`businessAccess/${business1.businessId}`);
    assert.strictEqual(access.operationalStatus, "ACTIVE");
    assert.strictEqual(access.isLifetime, true);
    assert.strictEqual(access.expiresAtMs, null);

    const priv = await store.getDoc<any>(`businessPrivate/${business1.businessId}`);
    assert.strictEqual(priv.ownerUsername, "teatime_owner");
  });

  await runner.test("Super Admin creates Business 2 (Royal Cafe) with 3 Months starter", async () => {
    business2 = await engine.createBusinessWithOwner(superAdminCaller, {
      businessName: "Royal Cafe",
      businessSlug: "royalcafe",
      ownerName: "Royal Manager",
      username: "royal_owner",
      ownerEmail: "owner@royal.lk",
      temporaryPassword: "TempPassword2026!",
      packageId: "3_months",
      paymentAmountRupees: 6000,
      paymentMethod: "CASH",
    });

    assert.strictEqual(business2.success, true);
    assert.strictEqual(business2.businessSlug, "royalcafe");
  });

  await runner.test("New owner is forced to change temporary password on first login", async () => {
    const ownerLogin = await engine.loginWithIdentifier(
      { identifier: "teatime_owner", password: "TempPassword2026!" },
      "127.0.0.1"
    );
    assert.strictEqual(ownerLogin.mustChangePassword, true);

    const ownerCaller: VerifiedCaller = {
      uid: business1.ownerUid,
      email: "owner@teatime.lk",
      role: "BUSINESS_OWNER",
      businessId: business1.businessId,
      mustChangePassword: true,
    };

    // Owner changes password
    const pwdRes = await engine.completeRequiredPasswordChange(
      ownerCaller,
      "PermanentOwner2026!"
    );
    assert.strictEqual(pwdRes.success, true);

    // Subsequent login shows mustChangePassword is false
    const ownerLogin2 = await engine.loginWithIdentifier(
      { identifier: "teatime_owner", password: "PermanentOwner2026!" },
      "127.0.0.1"
    );
    assert.strictEqual(ownerLogin2.mustChangePassword, false);
  });

  await runner.test("Tenant Isolation: Owner 1 CANNOT modify Business 2 data", async () => {
    const owner1Caller: VerifiedCaller = {
      uid: business1.ownerUid,
      email: "owner@teatime.lk",
      role: "BUSINESS_OWNER",
      businessId: business1.businessId,
      mustChangePassword: false,
    };

    // Attempting to modify Business 2 category
    await assert.rejects(
      async () => {
        await engine.ownerUpsertCategory(owner1Caller, {
          name: "Hacked Category",
          slug: "hacked",
          businessId: business2.businessId,
        });
      },
      (err: any) => err instanceof PlatformApiError && err.code === "permission-denied",
      "Owner can only write to their own tenant"
    );

    // Verify Business 1 gets the category, while Business 2 remains empty
    const cat = await engine.ownerUpsertCategory(owner1Caller, {
      name: "Special Coffee",
      slug: "special-coffee",
    });

    const b1Cats = await store.getCollection(`businesses/${business1.businessId}/categories`);
    const b2Cats = await store.getCollection(`businesses/${business2.businessId}/categories`);

    assert.strictEqual(b1Cats.length, 1);
    assert.strictEqual(b2Cats.length, 0);
  });

  // -----------------------------------------------------------------
  // 4. Products, Safe Category Archiving & Tables
  // -----------------------------------------------------------------
  console.log("\nSuite 4: Products, Safe Category Archiving & Tables");

  let cat1: any;
  let cat2: any;
  let prod1: any;
  let table1: any;



  await runner.test("Owner creates categories and products", async () => {
    cat1 = await engine.ownerUpsertCategory(owner1Caller, { name: "Hot Drinks" });
    cat2 = await engine.ownerUpsertCategory(owner1Caller, { name: "Cold Beverages" });

    prod1 = await engine.ownerUpsertProduct(owner1Caller, {
      name: "Milk Coffee",
      categoryId: cat1.id,
      priceRupees: 100,
      description: "Creamy aromatic coffee",
    });

    assert.strictEqual(prod1.priceRupees, 100);
    assert.strictEqual(prod1.priceMinor, 10000);
  });

  await runner.test("Safe Category Archiving: prevents deletion if products exist unless reassigned", async () => {
    // Attempting to archive cat1 without reassignment should fail because prod1 is in cat1
    await assert.rejects(
      async () => {
        await engine.ownerArchiveCategory(owner1Caller, cat1.id);
      },
      (err: any) => err instanceof PlatformApiError && err.code === "failed-precondition"
    );

    // Reassigning to cat2 succeeds and moves prod1 to cat2
    const archRes = await engine.ownerArchiveCategory(owner1Caller, cat1.id, cat2.id);
    assert.strictEqual(archRes.reassignedCount, 1);

    const updatedProd = await store.getDoc<any>(
      `businesses/${business1.businessId}/products/${prod1.id}`
    );
    assert.strictEqual(updatedProd.categoryId, cat2.id);
  });

  await runner.test("Owner creates table and O(1) table token mapping is registered", async () => {
    table1 = await engine.ownerUpsertTable(owner1Caller, {
      tableNumber: "Table 07",
      capacity: 4,
    });

    assert.ok(table1.token);

    // Token doc is stored for O(1) customer resolution
    const tokenDoc = await store.getDoc<any>(
      `businesses/${business1.businessId}/tableTokens/${table1.token}`
    );
    assert.ok(tokenDoc);
    assert.strictEqual(tokenDoc.tableNumber, "Table 07");
  });

  // -----------------------------------------------------------------
  // 5. Server-Authoritative Order Placement & Tracking
  // -----------------------------------------------------------------
  console.log("\nSuite 5: Server-Authoritative Order Placement & Tracking");

  let placedOrder: any;

  await runner.test("Customer order creation calculates server totals and enforces idempotency", async () => {
    const idempotencyKey = "idem_order_test_12345";

    // 1. Place order
    placedOrder = await engine.createTenantOrder({
      businessSlug: "teatime",
      tableToken: table1.token,
      items: [{ productId: prod1.id, quantity: 2, sugarSpoons: 2 }],
      specialInstructions: "Less ice please",
      idempotencyKey,
      ip: "192.168.1.100",
    });

    assert.strictEqual(placedOrder.success, true);
    // 2 x Rs. 100 = Rs. 200 (20,000 minor)
    assert.strictEqual(placedOrder.totalRupees, 200);
    assert.strictEqual(placedOrder.totalMinor, 20000);
    assert.ok(placedOrder.trackingToken);

    // 2. Duplicate order with same idempotency key returns existing order without recharging
    const dupOrder = await engine.createTenantOrder({
      businessSlug: "teatime",
      tableToken: table1.token,
      items: [{ productId: prod1.id, quantity: 2, sugarSpoons: 2 }],
      idempotencyKey,
      ip: "192.168.1.100",
    });

    assert.strictEqual(dupOrder.orderId, placedOrder.orderId);
  });

  await runner.test("Customer order tracking status resolves via tracking token", async () => {
    const tracking = await engine.getOrderTrackingStatus({
      businessSlug: "teatime",
      trackingToken: placedOrder.trackingToken,
    });

    assert.strictEqual(tracking.orderId, placedOrder.orderId);
    assert.strictEqual(tracking.businessName, "TEA TIME");
    assert.strictEqual(tracking.tableNumber, "Table 07");
    assert.strictEqual(tracking.totalRupees, 200);
  });

  await runner.test("Owner updates order status: PENDING -> PREPARING -> SERVED -> COMPLETED", async () => {
    const step1 = await engine.ownerUpdateOrderStatus(owner1Caller, placedOrder.orderId, "PREPARING");
    assert.strictEqual(step1.status, "PREPARING");

    const step2 = await engine.ownerUpdateOrderStatus(owner1Caller, placedOrder.orderId, "SERVED");
    assert.strictEqual(step2.status, "SERVED");

    const step3 = await engine.ownerUpdateOrderStatus(owner1Caller, placedOrder.orderId, "COMPLETED");
    assert.strictEqual(step3.status, "COMPLETED");
  });

  // -----------------------------------------------------------------
  // 6. Super Admin Operations & Pricing Update
  // -----------------------------------------------------------------
  console.log("\nSuite 6: Super Admin Operations & Pricing Update");

  await runner.test("Super Admin Dashboard calculates income strictly from recorded payments", async () => {
    const dash = await engine.getSuperAdminDashboard(superAdminCaller);
    // Business 1 paid Rs. 30,000; Business 2 paid Rs. 6,000 => Total = Rs. 36,000
    assert.strictEqual(dash.metrics.totalBusinesses, 2);
    assert.strictEqual(dash.metrics.incomeTotalRupees, 36000);
  });

  await runner.test("Super Admin suspends business: menu becomes unavailable with zero data leak", async () => {
    await engine.setBusinessOperationalStatus(
      superAdminCaller,
      business2.businessId,
      "SUSPENDED",
      "Payment audit"
    );

    const publicMenu = await engine.resolvePublicMenuTenant({
      businessSlug: "royalcafe",
    });

    assert.strictEqual(publicMenu.business.isAvailable, false);
    // Verify no payment or internal notes are leaked
    assert.strictEqual((publicMenu.business as any).ownerEmail, undefined);
    assert.strictEqual((publicMenu.business as any).subscriptionExpiresAt, undefined);

    // Orders cannot be placed for suspended business
    await assert.rejects(
      async () => {
        await engine.createTenantOrder({
          businessSlug: "royalcafe",
          tableToken: "any_token",
          items: [{ productId: "p1", quantity: 1 }],
          idempotencyKey: "test_suspended_key",
        });
      },
      (err: any) => err instanceof PlatformApiError && err.code === "failed-precondition"
    );
  });

  await runner.test("Super Admin reactivates business: menu becomes available again", async () => {
    await engine.setBusinessOperationalStatus(
      superAdminCaller,
      business2.businessId,
      "ACTIVE",
      "Resolved"
    );

    const publicMenu = await engine.resolvePublicMenuTenant({
      businessSlug: "royalcafe",
    });

    assert.strictEqual(publicMenu.business.isAvailable, true);
  });

  await runner.test("Super Admin updates package pricing: affects only future purchases", async () => {
    const updatedPackages = [
      ...DEFAULT_PACKAGES.map((p) =>
        p.id === "3_months" ? { ...p, priceDisplay: 7000, priceRupees: 7000, priceMinor: 700000 } : p
      ),
    ];

    await engine.updatePlatformPackagesAndSettings(superAdminCaller, {
      packages: updatedPackages,
      salesContactPhone: "0779999999",
      salesContactWhatsapp: "94779999999",
    });

    // Verify existing business access still has historical snapshot of Rs. 30,000 / Rs. 6,000
    const b2Access = await store.getDoc<any>(`businessAccess/${business2.businessId}`);
    assert.strictEqual(b2Access.packagePriceMinorSnapshot, 600000);

    // Verify platform public config has updated pricing
    const conf = await store.getDoc<any>("platformSettings/public");
    const p3m = conf.packages.find((p: any) => p.id === "3_months");
    assert.strictEqual(p3m.priceDisplay, 7000);
  });

  // -----------------------------------------------------------------
  // 7. Menyo Packaging, Pricing & Independent Branding Suite
  // -----------------------------------------------------------------
  console.log("\nSuite 7: Menyo Packaging & Independent Business Branding");

  await runner.test("Menyo active packages: Monthly (Rs. 2,000), 6 Months (Rs. 10,000), Yearly (Rs. 18,000)", () => {
    const monthly = DEFAULT_PACKAGES.find((p) => p.id === "monthly");
    const sixMonths = DEFAULT_PACKAGES.find((p) => p.id === "6_months");
    const yearly = DEFAULT_PACKAGES.find((p) => p.id === "yearly");

    assert.ok(monthly, "Monthly package must exist");
    assert.strictEqual(monthly.priceRupees, 2000);
    assert.strictEqual(monthly.durationMonths, 1);

    assert.ok(sixMonths, "6 Months package must exist");
    assert.strictEqual(sixMonths.priceRupees, 10000);
    assert.strictEqual(sixMonths.durationMonths, 6);
    assert.strictEqual(sixMonths.isPopular, true);
    assert.strictEqual(sixMonths.savingsDisplay, "Save Rs. 2,000");

    assert.ok(yearly, "Yearly package must exist");
    assert.strictEqual(yearly.priceRupees, 18000);
    assert.strictEqual(yearly.durationMonths, 12);
    assert.strictEqual(yearly.savingsDisplay, "Save Rs. 6,000");
  });

  await runner.test("Subscription window math: Monthly (1 month), 6 Months, and Yearly (12 months)", () => {
    // 1 Month from Jan 31 2026 -> Feb 28 2026
    const win1m = computeInitialSubscriptionWindow("monthly", "2026-01-31");
    assert.strictEqual(win1m.expiryDateColombo, "2026-02-28");

    // 6 Months from Aug 31 2026 -> Feb 28 2027
    const win6m = computeInitialSubscriptionWindow("6_months", "2026-08-31");
    assert.strictEqual(win6m.expiryDateColombo, "2027-02-28");

    // 12 Months from Feb 29 2024 -> Feb 28 2025
    const win1y = computeInitialSubscriptionWindow("yearly", "2024-02-29");
    assert.strictEqual(win1y.expiryDateColombo, "2025-02-28");
  });

  await runner.test("Owner customizes branding and resets to default theme independently", async () => {
    const owner1Caller: VerifiedCaller = {
      uid: business1.ownerUid,
      email: "teatime_owner@teatime.lk",
      role: "BUSINESS_OWNER",
      businessId: business1.businessId,
      mustChangePassword: false,
    };

    // 1. Owner updates custom colors
    await engine.ownerUpdateSettings(owner1Caller, {
      branding: {
        logoUrl: "https://example.com/custom-logo.png",
        primaryColor: "#112233",
        accentColor: "#445566",
        backgroundColor: "#EFEFEF",
        textColor: "#121212",
      },
    });

    const teatimePublic = await engine.resolvePublicMenuTenant({ businessSlug: "teatime" });
    assert.strictEqual(teatimePublic.business.branding?.primaryColor, "#112233");
    assert.strictEqual(teatimePublic.business.branding?.backgroundColor, "#EFEFEF");

    // 2. Business 2 (Royal Cafe) is unaffected by Business 1's branding changes
    const royalPublic = await engine.resolvePublicMenuTenant({ businessSlug: "royalcafe" });
    assert.notStrictEqual(royalPublic.business.branding?.primaryColor, "#112233");

    // 3. Reset to default theme restores Tea Time's espresso/gold/cream theme
    await engine.ownerResetBrandingSettings(owner1Caller);
    const teatimeReset = await engine.resolvePublicMenuTenant({ businessSlug: "teatime" });
    assert.strictEqual(teatimeReset.business.branding?.primaryColor, "#2C190E");
    assert.strictEqual(teatimeReset.business.branding?.accentColor, "#E8B64F");
    assert.strictEqual(teatimeReset.business.branding?.backgroundColor, "#FAF7F0");
  });

  runner.summary();
}

main().catch((err) => {
  console.error("Test runner execution crashed:", err);
  process.exit(1);
});
