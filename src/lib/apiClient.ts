import {
  auth,
  createEphemeralSupabaseClient,
  onAuthStateChanged,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut,
  updateUserPassword,
  signInWithOAuthProvider,
  type User,
} from "./supabase";
import {
  db,
  collection,
  doc,
  getDoc,
  getDocs,
  setDoc,
  updateDoc,
  deleteDoc,
  query,
  where,
  serverTimestamp,
} from "./supabaseStore";
import { INITIAL_MENU_ITEMS, INITIAL_TABLES } from "../data/seedData";
import {
  DEFAULT_PACKAGES,
  DEFAULT_PLATFORM_PUBLIC_CONFIG,
  normalizeBusinessSlug
} from "../shared/constants";
import {
  getColomboDateString,
  ONE_DAY_MS,
  computeInitialSubscriptionWindow,
} from "../shared/subscriptionMath";
import {
  AuditLogRecord,
  BusinessOperationalStatus,
  Category,
  CreateOrderPayload,
  MenuItem,
  Order,
  OrderStatus,
  PackageId,
  PaymentMethod,
  PlatformPublicConfig,
  SocialLinkItem,
  SubscriptionPackage,
  SuperAdminBusinessRow,
  SuperAdminMetrics,
  TableItem,
  UserProfileRecord,
} from "../types";

export interface ApiRpcResponse<T = any> {
  success: boolean;
  data?: T;
  error?: {
    code: string;
    message: string;
  };
}

export class ApiError extends Error {
  code: string;
  constructor(code: string, message: string) {
    super(message);
    this.name = "ApiError";
    this.code = code;
  }
}

/**
 * Helper to ensure Supabase Auth has resolved its initial session before evaluating context.
 */
function waitForAuthUser(): Promise<User | null> {
  if (auth.currentUser && !auth.currentUser.isAnonymous) {
    return Promise.resolve(auth.currentUser);
  }
  return new Promise((resolve) => {
    let resolved = false;
    const unsub = onAuthStateChanged(auth, (u) => {
      if (!resolved) {
        resolved = true;
        unsub();
        resolve(u);
      }
    });
    setTimeout(() => {
      if (!resolved) {
        resolved = true;
        unsub();
        resolve(auth.currentUser);
      }
    }, 1200);
  });
}

async function provisionTrialWorkspaceForExistingUser(params: {
  uid: string;
  email: string;
  ownerName: string;
  businessName: string;
  phone?: string;
  whatsapp?: string;
}): Promise<{ businessId: string; slug: string }> {
  const email = params.email.trim().toLowerCase();
  const businessName = params.businessName.trim() || "My Restaurant";
  const ownerName = params.ownerName.trim() || "Restaurant Owner";

  let slug = normalizeBusinessSlug(businessName);
  if (!slug || slug.length < 3) slug = `cafe-${Math.random().toString(36).substring(2, 6)}`;

  // Automatically ensure slug uniqueness so signup never fails on duplicate business names
  try {
    let checkSlug = slug;
    let collisionIndex = 1;
    while (true) {
      const snap = await getDocs(query(collection(db, "businesses"), where("slug", "==", checkSlug))).catch(() => null);
      if (!snap || snap.empty) {
        slug = checkSlug;
        break;
      }
      collisionIndex++;
      checkSlug = `${slug}-${collisionIndex}`;
      if (collisionIndex > 5) {
        slug = `${slug}-${Math.random().toString(36).substring(2, 6)}`;
        break;
      }
    }
  } catch {
    // fallback safe random suffix
    slug = `${slug}-${Math.random().toString(36).substring(2, 6)}`;
  }

  const businessId = `biz_${slug}_${Math.random().toString(36).substring(2, 6)}`;
  const nowMs = Date.now();
  const expiresAtMs = nowMs + 2 * ONE_DAY_MS;

  await setDoc(doc(db, "userProfiles", params.uid), {
    uid: params.uid,
    email,
    displayName: ownerName,
    username: slug,
    role: "BUSINESS_OWNER",
    businessId,
    mustChangePassword: false,
    active: true,
    createdAt: serverTimestamp(),
    createdAtMs: nowMs,
    updatedAt: serverTimestamp(),
  }, { merge: true });

  await setDoc(doc(db, "businesses", businessId), {
    id: businessId,
    slug,
    name: businessName,
    ownerName,
    ownerUsername: slug,
    ownerEmail: email,
    ownerUid: params.uid,
    phone: params.phone || "",
    whatsapp: params.whatsapp || params.phone || "",
    address: "Sri Lanka",
    currencyCode: "LKR",
    currencySymbol: "Rs.",
    openingHours: "8:00 AM – 10:00 PM",
    status: "ACTIVE",
    isTrial: true,
    packageId: "2_days_trial",
    trialExpiresAtMs: expiresAtMs,
    branding: {
      primaryColor: "#050F2A",
      accentColor: "#7BBBFF",
      backgroundColor: "#F2FDFF",
      textColor: "#050F2A",
      headerBackgroundColor: "#050F2A",
      headerTextColor: "#F2FDFF",
    },
    createdAt: serverTimestamp(),
    createdAtMs: nowMs,
    updatedAt: serverTimestamp(),
  }, { merge: true });

  await setDoc(doc(db, "businessSlugs", slug), {
    slug,
    businessId,
    isAlias: false,
    canonicalSlug: slug,
  }, { merge: true });

  // Also index the businessId directly in businessSlugs so lookups by ID or slug succeed seamlessly
  await setDoc(doc(db, "businessSlugs", businessId), {
    slug,
    businessId,
    isAlias: true,
    canonicalSlug: slug,
  }, { merge: true });

  await setDoc(doc(db, "businessAccess", businessId), {
    businessId,
    operationalStatus: "ACTIVE",
    packageId: "2_days_trial",
    packageNameSnapshot: "2-Day Free Trial",
    isLifetime: false,
    activatedAtMs: nowMs,
    startsAtMs: nowMs,
    expiresAtMs,
    updatedAt: serverTimestamp(),
  }, { merge: true });

  const sampleTables = [
    { id: "tbl_01", tableNumber: "Table 01", number: "Table 01", token: `tbl_01_${Math.random().toString(36).substring(2, 6)}`, active: true },
    { id: "tbl_02", tableNumber: "Table 02", number: "Table 02", token: `tbl_02_${Math.random().toString(36).substring(2, 6)}`, active: true },
    { id: "tbl_03", tableNumber: "Table 03", number: "Table 03", token: `tbl_03_${Math.random().toString(36).substring(2, 6)}`, active: true },
  ];
  for (const t of sampleTables) {
    await setDoc(doc(db, `businesses/${businessId}/tables`, t.id), t, { merge: true });
    await setDoc(doc(db, `businesses/${businessId}/tableTokens`, t.token), {
      token: t.token,
      tableId: t.id,
      number: t.tableNumber,
      tableNumber: t.tableNumber,
      businessId,
      active: true,
      updatedAtMs: nowMs,
    }, { merge: true });
  }

  const sampleCats = [
    { id: "cat_hot", name: "Hot Beverages", slug: "hot-beverages", sortOrder: 1, active: true },
    { id: "cat_cold", name: "Cold Drinks", slug: "cold-drinks", sortOrder: 2, active: true },
    { id: "cat_snacks", name: "Snacks & Quick Bites", slug: "snacks", sortOrder: 3, active: true },
  ];
  for (const c of sampleCats) {
    await setDoc(doc(db, `businesses/${businessId}/categories`, c.id), c, { merge: true });
  }

  const sampleProds = [
    {
      id: "prod_ceylon_tea",
      name: "Ceylon Milk Tea",
      category: "Hot Beverages",
      categoryId: "cat_hot",
      priceRupees: 150,
      priceMinor: 15000,
      description: "Freshly brewed classic Ceylon black tea with milk and sugar.",
      isAvailable: true,
      sortOrder: 1,
    },
    {
      id: "prod_iced_coffee",
      name: "Artisan Iced Coffee",
      category: "Cold Drinks",
      categoryId: "cat_cold",
      priceRupees: 350,
      priceMinor: 35000,
      description: "Chilled rich espresso blended with condensed milk.",
      isAvailable: true,
      sortOrder: 2,
    },
  ];
  for (const p of sampleProds) {
    await setDoc(doc(db, `businesses/${businessId}/products`, p.id), p, { merge: true });
  }

  return { businessId, slug };
}

/**
 * Client-side fallback handler when /api/rpc is unavailable (e.g. local Vite dev mode).
 */
async function clientRpcHandler<T = any>(action: string, data?: any): Promise<T> {
  // 1. Session Context
  if (action === "getSessionContext") {
    let user = auth.currentUser;
    if (!user || user.isAnonymous) {
      user = await waitForAuthUser();
    }

    const storedRole = typeof window !== "undefined" ? localStorage.getItem("menyo_auth_role") : null;
    const storedEmail = typeof window !== "undefined" ? localStorage.getItem("menyo_auth_email") : null;

    const isSuperAdmin =
      user?.email?.toLowerCase() === "admin@aevonix.lk" ||
      user?.email?.toLowerCase() === "thasmilan0@gmail.com" ||
      storedRole === "SUPER_ADMIN" ||
      storedEmail?.toLowerCase() === "admin@aevonix.lk" ||
      storedEmail?.toLowerCase() === "thasmilan0@gmail.com";

    if (isSuperAdmin) {
      return {
        user: {
          uid: user?.uid || "6x2TDTYs6bhfBLXqDWk6gQqEIOh1",
          username: "admin",
          email: "admin@aevonix.lk",
          fullName: "Menyo Super Admin",
          role: "SUPER_ADMIN",
          businessId: null,
          mustChangePassword: false,
          createdAtMs: Date.now() - 30 * 86400000,
          updatedAtMs: Date.now(),
        },
        claims: {
          role: "SUPER_ADMIN",
          businessId: null,
          mustChangePassword: false,
        },
        business: null,
      } as unknown as T;
    }

    // Check if authenticated user has a custom Firestore profile (e.g. from 2-Day Trial Sign-up, created business, or OAuth)
    if (user && !user.isAnonymous && user.email?.toLowerCase() !== "admin@teatime.lk") {
      try {
        let profile: any = null;
        let bId: string | null = null;

        // 1. Check doc by user.uid
        const profileSnap = await getDoc(doc(db, "userProfiles", user.uid));
        if (profileSnap.exists()) {
          profile = profileSnap.data();
          bId = profile.businessId || null;
        }

        // 2. Query userProfiles by user.email
        if (!bId && user.email) {
          const qP = query(collection(db, "userProfiles"), where("email", "==", user.email.toLowerCase()));
          const sP = await getDocs(qP);
          if (!sP.empty) {
            profile = sP.docs[0].data();
            bId = profile.businessId || null;
            // Link to user.uid
            await setDoc(doc(db, "userProfiles", user.uid), profile, { merge: true }).catch(() => { });
          }
        }

        // 3. Query businesses by ownerEmail
        if (!bId && user.email) {
          const qBiz = query(collection(db, "businesses"), where("ownerEmail", "==", user.email.toLowerCase()));
          const sBiz = await getDocs(qBiz);
          if (!sBiz.empty) {
            bId = sBiz.docs[0].id;
          }
        }

        // 4. Query businesses by ownerUid
        if (!bId) {
          const qUid = query(collection(db, "businesses"), where("ownerUid", "==", user.uid));
          const sUid = await getDocs(qUid);
          if (!sUid.empty) {
            bId = sUid.docs[0].id;
          }
        }

        // 5. Check localStorage fallback
        if (!bId && typeof window !== "undefined") {
          const stored = localStorage.getItem("menyo_auth_businessId");
          if (stored && stored !== "teatime") bId = stored;
        }

        if (bId) {
          if (typeof window !== "undefined") {
            localStorage.setItem("menyo_auth_businessId", bId);
          }
          const bizSnap = await getDoc(doc(db, "businesses", bId));
          const accessSnap = await getDoc(doc(db, "businessAccess", bId));

          const bizData = bizSnap.exists() ? bizSnap.data() : null;
          const accessData = accessSnap.exists() ? accessSnap.data() : null;

          const nowMs = Date.now();
          const expiresAtMs = accessData?.expiresAtMs ?? bizData?.trialExpiresAtMs ?? (nowMs + 2 * ONE_DAY_MS);
          const isLifetime = accessData?.isLifetime || false;
          const isExpired = !isLifetime && expiresAtMs !== null && nowMs >= expiresAtMs;
          const isSuspended = accessData?.operationalStatus === "suspended" || bizData?.status === "SUSPENDED";
          const effectiveStatus = isSuspended ? "SUSPENDED" : (isExpired ? "EXPIRED" : "ACTIVE");
          const daysRemaining = expiresAtMs ? Math.max(0, Math.ceil((expiresAtMs - nowMs) / ONE_DAY_MS)) : null;

          const branding = bizData?.branding || {};
          const mustChange = Boolean(profile?.mustChangePassword);

          return {
            user: {
              uid: user.uid,
              username: profile?.username || user.email?.split("@")[0] || "owner",
              email: user.email || "",
              fullName: profile?.displayName || user.displayName || "Restaurant Owner",
              role: "BUSINESS_OWNER",
              businessId: bId,
              mustChangePassword: mustChange,
              createdAtMs: profile?.createdAtMs || Date.now(),
              updatedAtMs: Date.now(),
            },
            claims: {
              role: "BUSINESS_OWNER",
              businessId: bId,
              mustChangePassword: mustChange,
            },
            business: {
              id: bId,
              name: bizData?.name || "My Restaurant",
              slug: bizData?.slug || bId,
              ownerEmail: user.email || "",
              phone: bizData?.phone || "",
              country: bizData?.country || "",
              setupCompleted: Boolean(bizData?.setupCompleted),
              whatsapp: bizData?.whatsapp || "",
              address: bizData?.address || "",
              googleReviewUrl: bizData?.googleReviewUrl || "",
              instagramUrl: bizData?.instagramUrl || "",
              facebookUrl: bizData?.facebookUrl || "",
              socialLinks: bizData?.socialLinks || bizData?.socialLinkItems || [],
              status: effectiveStatus as BusinessOperationalStatus,
              isTrial: bizData?.isTrial ?? (accessData?.packageId === "2_days_trial"),
              branding: {
                primaryColor: branding.primaryColor || bizData?.primaryColor || "#050F2A",
                accentColor: branding.accentColor || bizData?.accentColor || "#7BBBFF",
                backgroundColor: branding.backgroundColor || bizData?.backgroundColor || "#F2FDFF",
                textColor: branding.textColor || bizData?.textColor || "#050F2A",
                headerBackgroundColor: branding.headerBackgroundColor || bizData?.headerBackgroundColor || "#050F2A",
                headerTextColor: branding.headerTextColor || bizData?.headerTextColor || "#F2FDFF",
                logoUrl: branding.logoUrl || bizData?.logoUrl || null,
                qrHeaderTitle: branding.qrHeaderTitle ?? bizData?.qrHeaderTitle ?? (bizData?.slug === "teatime" ? "SCAN TO ORDER • TEA TIME" : ""),
                qrSubtitle: branding.qrSubtitle || bizData?.qrSubtitle || "SCAN TO ORDER",
                qrFooterNote: (branding.qrFooterNote && !branding.qrFooterNote.includes("Good tea brings people together"))
                  ? branding.qrFooterNote
                  : (bizData?.qrFooterNote && !bizData.qrFooterNote.includes("Good tea brings people together"))
                    ? bizData.qrFooterNote
                    : (bizData?.slug === "teatime" ? "It's time for you!" : "Enjoy your visit!"),
                qrLogoSize: branding.qrLogoSize || bizData?.qrLogoSize || 112,
              },
              subscription: {
                packageId: (accessData?.packageId || bizData?.packageId || "2_days_trial") as PackageId,
                startsAtMs: accessData?.startsAtMs || nowMs,
                expiresAtMs,
                isLifetime,
                effectiveStatus,
                daysRemaining,
              },
            },
          } as unknown as T;
        }
      } catch (profileErr) {
        console.warn("Supabase profile lookup notice:", profileErr);
      }
    }

    const isTeaTimeOwner =
      user?.email?.toLowerCase() === "admin@teatime.lk" ||
      storedEmail?.toLowerCase() === "admin@teatime.lk" ||
      (storedRole === "BUSINESS_OWNER" && !user?.email);

    if (isTeaTimeOwner) {
      return {
        user: {
          uid: user?.uid || "hl22pC1uY9eFmUvmrOjaWvjl2Qy1",
          username: "teatime",
          email: user?.email || "admin@teatime.lk",
          fullName: "TEA TIME Manager",
          role: "BUSINESS_OWNER",
          businessId: "teatime",
          mustChangePassword: false,
          createdAtMs: Date.now() - 30 * 86400000,
          updatedAtMs: Date.now(),
        },
        claims: {
          role: "BUSINESS_OWNER",
          businessId: "teatime",
          mustChangePassword: false,
        },
        business: {
          id: "teatime",
          name: "TEA TIME",
          slug: "teatime",
          phone: "0764847081",
          whatsapp: "0764847081",
          address: "Vavuniya, Sri Lanka",
          googleReviewUrl: "https://g.page/r/teatime-review",
          instagramUrl: "https://instagram.com/teatime",
          facebookUrl: "https://facebook.com/teatime",
          status: "ACTIVE" as BusinessOperationalStatus,
          branding: {
            primaryColor: "#2C190E",
            accentColor: "#E8B64F",
            backgroundColor: "#FAF7F0",
            textColor: "#301C10",
            headerBackgroundColor: "#2C190E",
            headerTextColor: "#FAF7F0",
          },
          subscription: {
            packageId: "yearly" as PackageId,
            startsAtMs: Date.now(),
            expiresAtMs: Date.now() + 365 * 86400000,
            isLifetime: false,
            effectiveStatus: "ACTIVE",
            daysRemaining: 365,
          },
        },
      } as unknown as T;
    }

    throw new ApiError("unauthenticated", "User is not authenticated.");
  }

  // 2. Super Admin Dashboard
  if (action === "getSuperAdminDashboard") {
    let businessList: SuperAdminBusinessRow[] = [];
    const nowMs = Date.now();

    try {
      const snap = await getDocs(collection(db, "businesses"));
      if (!snap.empty) {
        for (const d of snap.docs) {
          const data = d.data();
          const bId = d.id;
          let accessData: any = null;
          try {
            const aSnap = await getDoc(doc(db, "businessAccess", bId));
            if (aSnap.exists()) accessData = aSnap.data();
          } catch { }

          const expiresAtMs = accessData?.expiresAtMs ?? data.trialExpiresAtMs ?? data.expiresAtMs ?? null;
          const isLifetime = accessData?.isLifetime || data.isLifetime || false;
          const isExpired = !isLifetime && expiresAtMs !== null && nowMs >= expiresAtMs;
          const isSuspended = accessData?.operationalStatus === "suspended" || data.status === "SUSPENDED";
          const effectiveStatus = isSuspended ? "SUSPENDED" : (isExpired ? "EXPIRED" : "ACTIVE");
          const daysRemaining = expiresAtMs ? Math.max(0, Math.ceil((expiresAtMs - nowMs) / ONE_DAY_MS)) : null;

          businessList.push({
            id: bId,
            name: data.name || bId,
            slug: data.slug || bId,
            logoUrl: data.logoUrl || data.branding?.logoUrl,
            ownerName: data.ownerName || "Owner",
            ownerUsername: data.ownerUsername || data.slug || bId,
            ownerEmail: data.ownerEmail || (bId === "teatime" ? "admin@teatime.lk" : ""),
            packageId: (accessData?.packageId || data.packageId || (data.isTrial ? "2_days_trial" : "yearly")) as PackageId,
            isTrial: data.isTrial ?? (accessData?.packageId === "2_days_trial"),
            activationKey: data.activationKey || accessData?.reference,
            activationDateColombo: accessData?.activationDateColombo || getColomboDateString(data.createdAtMs || nowMs),
            expiryDateColombo: expiresAtMs ? getColomboDateString(expiresAtMs) : null,
            isLifetime,
            daysRemaining,
            effectiveStatus,
            status: effectiveStatus,
          });
        }
      }
    } catch (err) {
      console.warn("Super admin businesses fetch notice:", err);
    }

    // Exclude demo-only Tea Time from Super Admin tenant list
    businessList = businessList.filter((b) => b.id !== "teatime" && b.slug !== "teatime");

    const activeCount = businessList.filter((b) => b.effectiveStatus === "ACTIVE").length;
    const expiredCount = businessList.filter((b) => b.effectiveStatus === "EXPIRED").length;
    const suspendedCount = businessList.filter((b) => b.effectiveStatus === "SUSPENDED").length;
    const expiringSoon = businessList.filter(
      (b) => b.daysRemaining !== null && b.daysRemaining <= 7 && b.daysRemaining > 0
    ).length;

    // Fetch all registered/logged-in users from userProfiles
    let usersList: any[] = [];
    try {
      const uSnap = await getDocs(collection(db, "userProfiles"));
      if (!uSnap.empty) {
        usersList = uSnap.docs.map((d) => {
          const u = d.data();
          const linkedBiz = businessList.find((b) => b.id === u.businessId);
          return {
            uid: d.id,
            email: u.email || "",
            displayName: u.displayName || u.fullName || u.username || "User",
            username: u.username || "",
            role: u.role || "BUSINESS_OWNER",
            businessId: u.businessId || null,
            businessName: linkedBiz?.name || (u.businessId === "teatime" ? "TEA TIME" : u.businessId || "—"),
            active: u.active !== false,
            createdAtMs: u.createdAtMs || 0,
            phone: u.phone || "",
          };
        });
        usersList.sort((a, b) => (b.createdAtMs || 0) - (a.createdAtMs || 0));
      }
    } catch (err) {
      console.warn("Super admin users fetch notice:", err);
    }

    // Fetch all purchase / payment records from payments
    let paymentsList: any[] = [];
    try {
      const pSnap = await getDocs(collection(db, "payments"));
      if (!pSnap.empty) {
        paymentsList = pSnap.docs.map((d) => {
          const p = d.data();
          const linkedBiz = businessList.find((b) => b.id === p.businessId);
          return {
            id: d.id,
            businessId: p.businessId || "",
            businessName: p.businessName || linkedBiz?.name || p.businessId || "Unknown",
            packageId: p.packageId || linkedBiz?.packageId || "—",
            amountRupees: p.amountRupees ?? (p.amountMinor ? Math.round(p.amountMinor / 100) : 0),
            amountMinor: p.amountMinor ?? ((p.amountRupees || 0) * 100),
            paymentMethod: p.paymentMethod || "BANK_TRANSFER",
            reference: p.reference || "",
            notes: p.notes || "",
            dateColombo: p.dateColombo || getColomboDateString(p.createdAtMs || nowMs),
            createdAtMs: p.createdAtMs || 0,
          };
        });
        paymentsList.sort((a, b) => (b.createdAtMs || 0) - (a.createdAtMs || 0));
      }
    } catch (err) {
      console.warn("Super admin payments fetch notice:", err);
    }

    const currentMonthPrefix = getColomboDateString(nowMs).slice(0, 7); // YYYY-MM
    const totalPaymentsMinor = paymentsList.reduce((acc, p) => acc + (p.amountMinor || 0), 0);
    const paymentsThisMonthMinor = paymentsList
      .filter((p) => (p.dateColombo || "").startsWith(currentMonthPrefix))
      .reduce((acc, p) => acc + (p.amountMinor || 0), 0);

    return {
      metrics: {
        totalBusinesses: businessList.length,
        activeBusinesses: activeCount,
        expiredBusinesses: expiredCount,
        suspendedBusinesses: suspendedCount,
        expiringWithin7Days: expiringSoon,
        paymentsThisMonthMinor,
        totalPaymentsMinor,
        incomeThisMonthRupees: Math.round(paymentsThisMonthMinor / 100),
        incomeTotalRupees: Math.round(totalPaymentsMinor / 100),
        archivedBusinesses: 0,
      },
      businesses: businessList,
      users: usersList,
      payments: paymentsList,
      packages: DEFAULT_PACKAGES,
      platformConfig: DEFAULT_PLATFORM_PUBLIC_CONFIG,
    } as unknown as T;
  }

  // 3. Renew / Change Subscription & Activate Key
  if (action === "renewOrChangeSubscription") {
    const bId = data?.businessId;
    const pkgId = data?.packageId || "monthly";
    const ref = data?.reference || `MENYO-ACT-${Math.floor(1000 + Math.random() * 9000)}`;

    const pkg = DEFAULT_PACKAGES.find((p) => p.id === pkgId);
    const months = pkg?.durationMonths || (pkgId === "yearly" ? 12 : pkgId === "6_months" ? 6 : 1);
    const isLifetime = pkgId === "lifetime";
    const nowMs = Date.now();
    const expiresAtMs = isLifetime ? null : nowMs + months * 30 * ONE_DAY_MS;

    try {
      await setDoc(doc(db, "businesses", bId), {
        status: "ACTIVE",
        packageId: pkgId,
        isTrial: false,
        activationKey: ref,
        expiresAtMs,
        updatedAt: serverTimestamp(),
      }, { merge: true });

      await setDoc(doc(db, "businessAccess", bId), {
        businessId: bId,
        packageId: pkgId,
        packageNameSnapshot: pkg?.name || pkgId,
        operationalStatus: "ACTIVE",
        isLifetime,
        startsAtMs: nowMs,
        expiresAtMs,
        reference: ref,
        updatedAt: serverTimestamp(),
      }, { merge: true });

      const amountRupees = data?.paymentAmountRupees ?? pkg?.priceRupees ?? 0;
      if (amountRupees > 0) {
        const payId = `pay_${bId}_${nowMs}`;
        await setDoc(doc(db, "payments", payId), {
          id: payId,
          businessId: bId,
          packageId: pkgId,
          amountRupees,
          amountMinor: amountRupees * 100,
          paymentMethod: data?.paymentMethod || "BANK_TRANSFER",
          reference: ref,
          notes: data?.notes || `Subscription renewal (${pkg?.name || pkgId})`,
          dateColombo: getColomboDateString(nowMs),
          createdAt: serverTimestamp(),
          createdAtMs: nowMs,
        }, { merge: true });
      }
    } catch (err) {
      console.warn("Direct Firestore renewal sync:", err);
    }

    return { success: true, activationKey: ref } as unknown as T;
  }

  // 4. Create Business With Owner (Super Admin Onboarding)
  if (action === "createBusinessWithOwner") {
    const rawSlug = data?.businessSlug || data?.businessName || "cafe";
    let slug = normalizeBusinessSlug(rawSlug);
    if (!slug || slug.length < 2) slug = `biz${Math.random().toString(36).substring(2, 6)}`;
    const businessId = slug;

    const email = (data?.ownerEmail || "").trim().toLowerCase();
    const tempPassword = data?.temporaryPassword || "Welcome2026!";
    const ownerName = data?.ownerName || "Restaurant Owner";
    const username = (data?.username || slug).trim().toLowerCase();
    const nowMs = Date.now();

    // 1. Compute Subscription Window
    const pkgId = (data?.packageId || "6_months") as PackageId;
    const pkg = DEFAULT_PACKAGES.find((p) => p.id === pkgId);
    let windowCalc: { startsAtMs: number; expiresAtMs: number | null; expiryDateColombo: string | null; isLifetime: boolean };
    try {
      windowCalc = computeInitialSubscriptionWindow(pkgId, data?.activationDateColombo || getColomboDateString());
    } catch {
      const months = pkg?.durationMonths || 6;
      windowCalc = {
        startsAtMs: nowMs,
        expiresAtMs: nowMs + months * 30 * ONE_DAY_MS,
        expiryDateColombo: getColomboDateString(nowMs + months * 30 * ONE_DAY_MS),
        isLifetime: false,
      };
    }

    // 2. Create Supabase Auth user in an isolated ephemeral client without affecting active Super Admin session
    let ownerUid = "usr_" + Math.random().toString(36).substring(2, 10);
    try {
      const ephemeralClient = createEphemeralSupabaseClient();
      try {
        const cred = await createUserWithEmailAndPassword(auth, email, tempPassword, {
          displayName: ownerName,
          customClient: ephemeralClient,
        });
        ownerUid = cred.user.uid;
      } catch (authErr: any) {
        if (authErr?.code === "auth/email-already-in-use") {
          try {
            const cred = await signInWithEmailAndPassword(
              auth,
              email,
              tempPassword,
              ephemeralClient
            );
            ownerUid = cred.user.uid;
          } catch { }
        } else {
          console.warn("Secondary Supabase auth user creation notice:", authErr);
        }
      }
      await signOut(auth, ephemeralClient).catch(() => { });
    } catch (e) {
      console.warn("Ephemeral client setup notice:", e);
    }

    // 3. Write userProfiles document
    try {
      await setDoc(doc(db, "userProfiles", ownerUid), {
        uid: ownerUid,
        email,
        displayName: ownerName,
        username,
        role: "BUSINESS_OWNER",
        businessId,
        mustChangePassword: true,
        temporaryPassword: tempPassword,
        active: true,
        createdAt: serverTimestamp(),
        createdAtMs: nowMs,
        updatedAt: serverTimestamp(),
      }, { merge: true });
    } catch (err) {
      console.warn("userProfiles creation notice:", err);
    }

    // 4. Write businesses document
    try {
      await setDoc(doc(db, "businesses", businessId), {
        id: businessId,
        slug,
        name: data?.businessName || "New Restaurant",
        ownerName,
        ownerUsername: username,
        ownerEmail: email,
        ownerUid,
        phone: data?.phone || "",
        whatsapp: data?.whatsapp || data?.phone || "",
        address: data?.address || "Sri Lanka",
        currencyCode: "LKR",
        currencySymbol: "Rs.",
        openingHours: "8:00 AM – 10:00 PM",
        status: "ACTIVE",
        packageId: pkgId,
        isTrial: pkgId === "2_days_trial" || pkgId === "trial",
        activationDateColombo: data?.activationDateColombo || getColomboDateString(),
        expiryDateColombo: windowCalc.expiryDateColombo,
        expiresAtMs: windowCalc.expiresAtMs,
        branding: {
          logoUrl: data?.branding?.logoUrl || null,
          primaryColor: data?.branding?.primaryColor || "#050F2A",
          accentColor: data?.branding?.accentColor || "#7BBBFF",
          backgroundColor: data?.branding?.backgroundColor || "#F2FDFF",
          textColor: data?.branding?.textColor || "#050F2A",
          headerBackgroundColor: data?.branding?.headerBackgroundColor || "#050F2A",
          headerTextColor: data?.branding?.headerTextColor || "#F2FDFF",
        },
        createdAt: serverTimestamp(),
        createdAtMs: nowMs,
        updatedAt: serverTimestamp(),
      }, { merge: true });
    } catch (err) {
      console.warn("businesses creation notice:", err);
    }

    // 5. Write businessAccess document
    try {
      await setDoc(doc(db, "businessAccess", businessId), {
        businessId,
        operationalStatus: "ACTIVE",
        packageId: pkgId,
        packageNameSnapshot: pkg?.name || pkgId,
        isLifetime: windowCalc.isLifetime,
        startsAtMs: windowCalc.startsAtMs,
        expiresAtMs: windowCalc.expiresAtMs,
        activationDateColombo: data?.activationDateColombo || getColomboDateString(),
        expiryDateColombo: windowCalc.expiryDateColombo,
        reference: data?.paymentReference || `INITIAL-${businessId}`,
        updatedAt: serverTimestamp(),
      }, { merge: true });
    } catch (err) {
      console.warn("businessAccess creation notice:", err);
    }

    // 6. Record Payment if provided
    if (data?.paymentAmountRupees && data.paymentAmountRupees > 0) {
      try {
        const payId = `pay_${businessId}_${nowMs}`;
        await setDoc(doc(db, "payments", payId), {
          id: payId,
          businessId,
          amountRupees: data.paymentAmountRupees,
          amountMinor: data.paymentAmountRupees * 100,
          paymentMethod: data.paymentMethod || "BANK_TRANSFER",
          reference: data.paymentReference || "",
          notes: data.paymentNote || "",
          dateColombo: data.paymentDateColombo || getColomboDateString(),
          createdAt: serverTimestamp(),
          createdAtMs: nowMs,
        }, { merge: true });
      } catch (err) {
        console.warn("payments creation notice:", err);
      }
    }

    // 6b. Write slug index so public /:slug/menu & order placement resolve cleanly
    await setDoc(doc(db, "businessSlugs", slug), {
      slug,
      businessId,
      isAlias: false,
      canonicalSlug: slug,
    }, { merge: true }).catch(() => { });

    // 7. Seed sample tables & tableTokens
    const sampleTables = [
      { id: "tbl_01", tableNumber: "Table 01", number: "Table 01", token: `tbl_01_${Math.random().toString(36).substring(2, 6)}`, active: true },
      { id: "tbl_02", tableNumber: "Table 02", number: "Table 02", token: `tbl_02_${Math.random().toString(36).substring(2, 6)}`, active: true },
      { id: "tbl_03", tableNumber: "Table 03", number: "Table 03", token: `tbl_03_${Math.random().toString(36).substring(2, 6)}`, active: true },
    ];
    for (const t of sampleTables) {
      await setDoc(doc(db, `businesses/${businessId}/tables`, t.id), t, { merge: true }).catch(() => { });
      await setDoc(doc(db, `businesses/${businessId}/tableTokens`, t.token), {
        token: t.token,
        tableId: t.id,
        number: t.tableNumber,
        tableNumber: t.tableNumber,
        businessId,
        active: true,
        updatedAtMs: nowMs,
      }, { merge: true }).catch(() => { });
    }

    // 8. Seed sample categories
    const sampleCats = [
      { id: "cat_hot", name: "Hot Beverages", slug: "hot-beverages", sortOrder: 1, active: true },
      { id: "cat_cold", name: "Cold Beverages", slug: "cold-beverages", sortOrder: 2, active: true },
      { id: "cat_snacks", name: "Food & Snacks", slug: "snacks", sortOrder: 3, active: true },
    ];
    for (const c of sampleCats) {
      await setDoc(doc(db, `businesses/${businessId}/categories`, c.id), c, { merge: true }).catch(() => { });
    }

    // 9. Seed sample products
    const sampleProds = [
      {
        id: "prod_01",
        name: "Special Coffee",
        categoryId: "cat_hot",
        priceRupees: 250,
        priceMinor: 25000,
        description: "Freshly brewed house blend.",
        isAvailable: true,
        sortOrder: 1,
      },
      {
        id: "prod_02",
        name: "Signature Mocktail",
        categoryId: "cat_cold",
        priceRupees: 400,
        priceMinor: 40000,
        description: "Chilled fruity artisan refresher.",
        isAvailable: true,
        sortOrder: 2,
      },
    ];
    for (const p of sampleProds) {
      await setDoc(doc(db, `businesses/${businessId}/products`, p.id), p, { merge: true }).catch(() => { });
    }

    return {
      success: true,
      businessId,
      businessSlug: slug,
      ownerUid,
      username,
      temporaryPassword: tempPassword,
    } as unknown as T;
  }

  // 5. Set Business Operational Status
  if (action === "setBusinessOperationalStatus") {
    const bId = data?.businessId;
    const status = data?.status || "active";
    try {
      await setDoc(doc(db, "businesses", bId), {
        status: status === "active" ? "ACTIVE" : status === "suspended" ? "SUSPENDED" : "ARCHIVED",
        updatedAt: serverTimestamp(),
      }, { merge: true });
      await setDoc(doc(db, "businessAccess", bId), {
        operationalStatus: status,
        updatedAt: serverTimestamp(),
      }, { merge: true });
    } catch (e) {
      console.warn("setBusinessOperationalStatus notice:", e);
    }
    return { success: true } as unknown as T;
  }

  // 5b. Permanently Delete Business (protect demo "teatime")
  if (action === "deleteBusiness") {
    const bId = data?.businessId;
    if (!bId) throw new Error("Missing businessId");
    if (bId === "teatime") {
      throw new Error("Demo business (TEA TIME) cannot be deleted.");
    }
    const subCols = ["products", "categories", "orders", "tables", "rewards"];
    for (const sub of subCols) {
      try {
        const snap = await getDocs(collection(db, "businesses", bId, sub));
        await Promise.allSettled(snap.docs.map((d) => deleteDoc(doc(db, "businesses", bId, sub, d.id))));
      } catch {
        // ignore if subcollection is empty or missing
      }
    }
    try {
      const usersSnap = await getDocs(query(collection(db, "userProfiles"), where("businessId", "==", bId)));
      await Promise.allSettled(usersSnap.docs.map((u) => deleteDoc(doc(db, "userProfiles", u.id))));
    } catch {
      // ignore if no linked user profiles
    }
    await Promise.allSettled([
      deleteDoc(doc(db, "businesses", bId)),
      deleteDoc(doc(db, "businessAccess", bId)),
      deleteDoc(doc(db, "businessSettings", bId)),
    ]);
    return { success: true } as unknown as T;
  }

  // 5c. Permanently Delete User Profile
  if (action === "deleteUserProfile") {
    const uid = data?.uid;
    if (!uid) throw new Error("Missing uid");
    await deleteDoc(doc(db, "userProfiles", uid));
    return { success: true } as unknown as T;
  }

  // 5d. Reset All Recorded Payments
  if (action === "resetAllPayments") {
    try {
      const snap = await getDocs(collection(db, "payments"));
      await Promise.allSettled(snap.docs.map((d) => deleteDoc(doc(db, "payments", d.id))));
    } catch {
      // ignore if empty
    }
    return { success: true } as unknown as T;
  }

  // 5e. Update Platform Packages & Settings
  if (action === "updatePlatformPackagesAndSettings") {
    if (typeof window !== "undefined" && Array.isArray(data?.packages)) {
      localStorage.setItem("menyo_platform_packages", JSON.stringify(data.packages));
    }
    await setDoc(
      doc(db, "platformConfig", "public"),
      {
        ...(data || {}),
        updatedAt: serverTimestamp(),
      },
      { merge: true }
    );
    return { success: true } as unknown as T;
  }

  // 6. Reset Owner Access
  if (action === "resetOwnerAccess") {
    const bId = data?.businessId;
    const newPwd = data?.temporaryPassword || "Reset2026!";
    try {
      const bSnap = await getDoc(doc(db, "businesses", bId));
      if (bSnap.exists()) {
        const bData = bSnap.data();
        const ownerUid = bData.ownerUid;
        if (ownerUid) {
          await setDoc(doc(db, "userProfiles", ownerUid), {
            mustChangePassword: true,
            temporaryPassword: newPwd,
            updatedAt: serverTimestamp(),
          }, { merge: true });
        }
      }
    } catch (e) {
      console.warn("resetOwnerAccess notice:", e);
    }
    return { success: true, temporaryPassword: newPwd } as unknown as T;
  }

  // 7. Get Business Details for Super Admin
  if (action === "getBusinessDetailsForSuperAdmin") {
    const bId = data?.businessId;
    let bData: any = null;
    let accessData: any = null;
    try {
      const bSnap = await getDoc(doc(db, "businesses", bId));
      if (bSnap.exists()) bData = bSnap.data();
      const aSnap = await getDoc(doc(db, "businessAccess", bId));
      if (aSnap.exists()) accessData = aSnap.data();
    } catch { }

    return {
      business: bData || { id: bId, name: bId, slug: bId },
      access: accessData || { operationalStatus: "ACTIVE", packageId: "6_months" },
      private: {},
      ownerProfile: null,
      subscriptions: [],
      payments: [],
      auditLogs: [],
      stats: {
        productsCount: 0,
        categoriesCount: 0,
        tablesCount: 0,
        ordersCount: 0,
      },
    } as unknown as T;
  }

  // 8. Resolve Public Menu Tenant
  if (action === "resolvePublicMenuTenant") {
    const rawSlug = (data?.businessSlug || data?.slug || "demo").trim().toLowerCase();
    const isTeaTimeSlug = false;

    let business: any = null;
    let bId = rawSlug;

    if (false) {
      const [cafeSnap, bizSnap] = await Promise.all([
        getDoc(doc(db, "settings", "cafe")),
        getDoc(doc(db, "businesses", "teatime")),
      ]);
      const c = cafeSnap.exists() ? cafeSnap.data() : {};
      const b = bizSnap.exists() ? bizSnap.data() : {};
      business = {
        id: "teatime",
        name: c.cafeName || b.name || "TEA TIME",
        slug: "teatime",
        status: "ACTIVE" as BusinessOperationalStatus,
        isAvailable: !(c.isOrderingPaused ?? b.isOrderingPaused),
        pauseMessage: c.pauseMessage || b.pauseMessage || "",
        phone: c.phone || b.phone || "076 484 1111",
        whatsapp: c.whatsapp || b.whatsapp || "076 484 1111",
        address: c.address || b.address || "",
        googleReviewUrl: c.googleReviewUrl || b.googleReviewUrl,
        instagramUrl: c.instagramUrl || b.instagramUrl,
        facebookUrl: c.facebookUrl || b.facebookUrl,
        socialLinks: c.socialLinks || b.socialLinks,
        branding: {
          primaryColor: c.primaryColor || b.branding?.primaryColor || "#2C190E",
          accentColor: c.accentColor || b.branding?.accentColor || "#E8B64F",
          backgroundColor: c.backgroundColor || b.branding?.backgroundColor || "#FAF7F0",
          textColor: c.textColor || b.branding?.textColor || "#301C10",
          headerBackgroundColor: c.headerBackgroundColor || b.branding?.headerBackgroundColor || "#000000",
          headerTextColor: c.headerTextColor || b.branding?.headerTextColor || "#FAF7F0",
          logoUrl: c.logoUrl || b.branding?.logoUrl || null,
          qrHeaderTitle: c.qrHeaderTitle || b.branding?.qrHeaderTitle,
          qrSubtitle: c.qrSubtitle || b.branding?.qrSubtitle,
          qrFooterNote: c.qrFooterNote || b.branding?.qrFooterNote,
          qrLogoSize: c.qrLogoSize || b.branding?.qrLogoSize || 88,
        },
      };
    } else {
      // 1. Try businessSlugs
      try {
        const slugSnap = await getDoc(doc(db, "businessSlugs", rawSlug));
        if (slugSnap.exists()) {
          bId = slugSnap.data().businessId || bId;
        }
      } catch { }

      // 2. Fetch business doc
      let bizSnap = await getDoc(doc(db, "businesses", bId));
      if (!bizSnap.exists()) {
        const q = query(collection(db, "businesses"), where("slug", "==", rawSlug));
        const s = await getDocs(q);
        if (!s.empty) {
          bizSnap = s.docs[0];
          bId = bizSnap.id;
        } else {
          // Fallback: check if rawSlug was sanitized or lowercase
          const qAll = await getDocs(collection(db, "businesses")).catch(() => null);
          if (qAll && !qAll.empty) {
            const matched = qAll.docs.find(
              (d) =>
                d.id.toLowerCase() === rawSlug ||
                (d.data()?.slug && d.data().slug.toLowerCase() === rawSlug)
            );
            if (matched) {
              bizSnap = matched;
              bId = matched.id;
            }
          }
        }
      }

      if (bizSnap.exists()) {
        const b = bizSnap.data();
        const accessSnap = await getDoc(doc(db, "businessAccess", bId));
        const a = accessSnap.exists() ? accessSnap.data() : null;

        const isSuspended = a?.operationalStatus === "suspended" || b.status === "SUSPENDED";
        const isPaused = !!b.isOrderingPaused;
        const branding = b.branding || {};

        business = {
          id: bId,
          name: b.name || rawSlug,
          slug: b.slug || rawSlug,
          status: (isSuspended ? "SUSPENDED" : "ACTIVE") as BusinessOperationalStatus,
          isAvailable: !isSuspended && !isPaused,
          isOrderingPaused: isPaused,
          pauseMessage: b.pauseMessage || "",
          phone: b.phone || "",
          whatsapp: b.whatsapp || "",
          address: b.address || "",
          googleReviewUrl: b.googleReviewUrl || "",
          instagramUrl: b.instagramUrl || "",
          facebookUrl: b.facebookUrl || "",
          socialLinks: b.socialLinks || b.socialLinkItems || [],
          socialLinkItems: b.socialLinkItems || b.socialLinks || [],
          branding: {
            primaryColor: branding.primaryColor || b.primaryColor || "#7BBBFF",
            accentColor: branding.accentColor || b.accentColor || "#B8A9FF",
            backgroundColor: branding.backgroundColor || b.backgroundColor || "#F2FDFF",
            textColor: branding.textColor || b.textColor || "#050F2A",
            headerBackgroundColor: branding.headerBackgroundColor || b.headerBackgroundColor || "#050F2A",
            headerTextColor: branding.headerTextColor || b.headerTextColor || "#F2FDFF",
            logoUrl: branding.logoUrl || b.logoUrl || null,
            qrHeaderTitle: branding.qrHeaderTitle || b.qrHeaderTitle,
            qrSubtitle: branding.qrSubtitle || b.qrSubtitle,
            qrFooterNote: branding.qrFooterNote || b.qrFooterNote,
            qrLogoSize: branding.qrLogoSize || b.qrLogoSize || 88,
          },
        };
      }
    }

    // Load categories & products
    let categories: Category[] = [];
    let products: MenuItem[] = [];
    if (!isTeaTimeSlug && business) {
      try {
        const catSnap = await getDocs(collection(db, `businesses/${bId}/categories`));
        if (!catSnap.empty) {
          categories = catSnap.docs
            .map((d) => {
              const data = d.data();
              return {
                id: d.id,
                name: data.name || "Category",
                sortOrder: data.sortOrder ?? data.displayOrder ?? 0,
                icon: data.icon || "🍽️",
              } as Category;
            })
            .sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0));
        }
        const prodSnap = await getDocs(collection(db, `businesses/${bId}/products`));
        if (!prodSnap.empty) {
          products = prodSnap.docs
            .map((d) => {
              const data = d.data();
              const pRupees =
                data.priceRupees || (data.priceMinor ? Math.round(data.priceMinor / 100) : 0);
              return {
                id: d.id,
                name: data.name || "Product",
                category: data.category || data.categoryId || "General",
                categoryId: data.categoryId || data.category || "cat_general",
                priceMinor: data.priceMinor || pRupees * 100,
                priceRupees: pRupees,
                price: pRupees,
                priceDisplay: `Rs. ${pRupees}`,
                description: data.description || "",
                imageUrl: data.imageUrl || data.image || null,
                image: data.imageUrl || data.image || null,
                isAvailable: data.isAvailable !== false,
                available: data.isAvailable !== false,
                displayOrder: data.displayOrder ?? data.sortOrder ?? 0,
                isArchived: !!data.archived || !!data.isArchived,
                sugarSelection: data.sugarSelection,
              } as unknown as MenuItem;
            })
            .filter((i: any) => !i.isArchived && !i.archived);
        }
      } catch (err) {
        console.warn("Tenant catalog fetch fallback:", err);
      }
    }

    return {
      business,
      categories,
      products,
      table: data?.tableToken ? {
        id: "tbl_07",
        tableNumber: "07",
        token: data.tableToken,
      } : null,
    } as unknown as T;
  }

  // 4. Owner Update Settings Fallback
  if (action === "ownerUpdateSettings") {
    const user = auth.currentUser;
    let bId = data?.businessId;
    if (!bId && user && !user.isAnonymous) {
      try {
        const profSnap = await getDoc(doc(db, "userProfiles", user.uid));
        if (profSnap.exists()) {
          bId = profSnap.data().businessId;
        } else if (user.email) {
          const q = query(collection(db, "userProfiles"), where("email", "==", user.email.toLowerCase()));
          const s = await getDocs(q);
          if (!s.empty) bId = s.docs[0].data().businessId;
          if (!bId) {
            const qB = query(collection(db, "businesses"), where("ownerEmail", "==", user.email.toLowerCase()));
            const sB = await getDocs(qB);
            if (!sB.empty) bId = sB.docs[0].id;
          }
        }
      } catch { }
    }
    if (!bId && typeof window !== "undefined") {
      bId = localStorage.getItem("menyo_auth_businessId") || "teatime";
    }
    if (!bId) bId = "teatime";

    const updatePayload: any = {
      updatedAt: serverTimestamp(),
    };
    if (data.name !== undefined) updatePayload.name = data.name;
    if (data.tagline !== undefined) updatePayload.tagline = data.tagline;
    if (data.phone !== undefined) updatePayload.phone = data.phone;
    if (data.whatsapp !== undefined) updatePayload.whatsapp = data.whatsapp;
    if (data.address !== undefined) updatePayload.address = data.address;
    if (data.openingHours !== undefined) updatePayload.openingHours = data.openingHours;
    if (data.googleReviewUrl !== undefined) updatePayload.googleReviewUrl = data.googleReviewUrl;
    if (data.instagramUrl !== undefined) updatePayload.instagramUrl = data.instagramUrl;
    if (data.facebookUrl !== undefined) updatePayload.facebookUrl = data.facebookUrl;
    if (data.socialLinks !== undefined) {
      updatePayload.socialLinks = data.socialLinks;
      updatePayload.socialLinkItems = data.socialLinks;
    }
    if (data.isOrderingPaused !== undefined) updatePayload.isOrderingPaused = data.isOrderingPaused;
    if (data.pauseMessage !== undefined) updatePayload.pauseMessage = data.pauseMessage;

    // Handle branding
    const bInput = data.branding || {};
    const mergedBranding = {
      ...(data.branding || {}),
      logoUrl: data.logoUrl !== undefined ? data.logoUrl : bInput.logoUrl,
      primaryColor: data.primaryColor || bInput.primaryColor,
      accentColor: data.accentColor || bInput.accentColor,
      backgroundColor: data.backgroundColor || bInput.backgroundColor,
      textColor: data.textColor || bInput.textColor,
      headerBackgroundColor: data.headerBackgroundColor || bInput.headerBackgroundColor,
      headerTextColor: data.headerTextColor || bInput.headerTextColor,
      qrHeaderTitle: data.qrHeaderTitle || bInput.qrHeaderTitle,
      qrSubtitle: data.qrSubtitle || bInput.qrSubtitle,
      qrFooterNote: data.qrFooterNote || bInput.qrFooterNote,
      qrLogoSize: data.qrLogoSize || bInput.qrLogoSize,
    };
    updatePayload.branding = mergedBranding;

    // Copy to root fields
    if (mergedBranding.primaryColor) updatePayload.primaryColor = mergedBranding.primaryColor;
    if (mergedBranding.accentColor) updatePayload.accentColor = mergedBranding.accentColor;
    if (mergedBranding.backgroundColor) updatePayload.backgroundColor = mergedBranding.backgroundColor;
    if (mergedBranding.textColor) updatePayload.textColor = mergedBranding.textColor;
    if (mergedBranding.headerBackgroundColor) updatePayload.headerBackgroundColor = mergedBranding.headerBackgroundColor;
    if (mergedBranding.headerTextColor) updatePayload.headerTextColor = mergedBranding.headerTextColor;
    if (mergedBranding.logoUrl !== undefined) updatePayload.logoUrl = mergedBranding.logoUrl;
    if (mergedBranding.qrHeaderTitle !== undefined) updatePayload.qrHeaderTitle = mergedBranding.qrHeaderTitle;
    if (mergedBranding.qrSubtitle !== undefined) updatePayload.qrSubtitle = mergedBranding.qrSubtitle;
    if (mergedBranding.qrFooterNote !== undefined) updatePayload.qrFooterNote = mergedBranding.qrFooterNote;
    if (mergedBranding.qrLogoSize !== undefined) updatePayload.qrLogoSize = mergedBranding.qrLogoSize;
    if ((data as any).memoryLogoUrl !== undefined || (mergedBranding as any).memoryLogoUrl !== undefined) {
      updatePayload.memoryLogoUrl = (data as any).memoryLogoUrl || (mergedBranding as any).memoryLogoUrl;
      mergedBranding.memoryLogoUrl = updatePayload.memoryLogoUrl;
    }
    if ((data as any).memoryLogoPos !== undefined || (mergedBranding as any).memoryLogoPos !== undefined) {
      updatePayload.memoryLogoPos = (data as any).memoryLogoPos || (mergedBranding as any).memoryLogoPos;
      mergedBranding.memoryLogoPos = updatePayload.memoryLogoPos;
    }

    try {
      await setDoc(doc(db, "businesses", bId), updatePayload, { merge: true });
      if (bId === "teatime" || bId === "biz_teatime") {
        await setDoc(doc(db, "settings", "cafe"), {
          ...updatePayload,
          cafeName: data.name ?? undefined,
        }, { merge: true });
      }
    } catch (e) {
      console.warn("Client fallback update settings:", e);
    }
    return { success: true } as unknown as T;
  }

  // 5. Owner Upsert Product (Direct client fallback)
  if (action === "ownerUpsertProduct") {
    let bId = data.businessId || (typeof window !== "undefined" ? localStorage.getItem("menyo_auth_businessId") : null) || "teatime";
    const name = (data.name || "").trim();
    const prodId = data.id && data.id.trim() ? data.id.trim() : `prod_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
    const priceRupees = typeof data.priceRupees === "number" ? data.priceRupees : (typeof data.priceMinor === "number" ? Math.round(data.priceMinor / 100) : 0);
    const priceMinor = typeof data.priceMinor === "number" ? data.priceMinor : Math.round(priceRupees * 100);

    let category = (data.category || data.categoryId || "General").trim();
    let categoryId = data.categoryId || "cat_general";

    const imageUrls = Array.isArray(data.imageUrls)
      ? data.imageUrls.filter((u: any) => typeof u === "string" && u.trim()).slice(0, 5)
      : (data.imageUrl ? [data.imageUrl.trim()] : []);
    const primaryImage = imageUrls[0] || data.imageUrl || null;

    const productRecord: Record<string, any> = {
      id: prodId,
      businessId: bId,
      name,
      category,
      categoryId,
      priceRupees,
      priceMinor,
      priceDisplay: priceRupees,
      price: priceRupees,
      description: data.description || "",
      imageUrl: primaryImage,
      image: primaryImage,
      ...(imageUrls.length > 0 ? { imageUrls } : {}),
      isAvailable: data.isAvailable !== false,
      available: data.isAvailable !== false,
      isVeg: data.isVeg ?? false,
      isPopular: data.isPopular ?? false,
      sortOrder: Number(data.sortOrder) || 0,
      isArchived: false,
      updatedAt: serverTimestamp(),
      updatedAtMs: Date.now(),
    };

    if (typeof window !== "undefined") {
      try {
        const key = `menyo_products_${bId}`;
        const existing: any[] = JSON.parse(localStorage.getItem(key) || "[]");
        const idx = existing.findIndex((p) => p.id === prodId);
        const plainRecord = { ...productRecord, updatedAt: productRecord.updatedAtMs };
        if (idx >= 0) existing[idx] = { ...existing[idx], ...plainRecord };
        else existing.push(plainRecord);
        localStorage.setItem(key, JSON.stringify(existing));
      } catch {}
    }

    try {
      await setDoc(doc(db, "businesses", bId, "products", prodId), productRecord, { merge: true });
      if (bId === "teatime" || bId === "biz_teatime") {
        await setDoc(doc(db, "menu", prodId), productRecord, { merge: true });
      }
      // Ensure category doc exists
      await setDoc(doc(db, "businesses", bId, "categories", categoryId), {
        id: categoryId,
        businessId: bId,
        name: category,
        slug: category.toLowerCase().replace(/[^a-z0-9]+/g, "-"),
        isVisible: true,
        updatedAtMs: Date.now(),
      }, { merge: true });
    } catch (e) {
      console.warn("Client fallback upsert product:", e);
    }

    return productRecord as unknown as T;
  }

  // 6. Owner Archive Product
  if (action === "ownerArchiveProduct") {
    let bId = data.businessId || (typeof window !== "undefined" ? localStorage.getItem("menyo_auth_businessId") : null) || "teatime";
    const productId = data.productId;
    if (productId) {
      if (typeof window !== "undefined") {
        try {
          const key = `menyo_products_${bId}`;
          const existing: any[] = JSON.parse(localStorage.getItem(key) || "[]");
          const filtered = existing.filter((p) => p.id !== productId);
          localStorage.setItem(key, JSON.stringify(filtered));
        } catch {}
      }
      try {
        await updateDoc(doc(db, "businesses", bId, "products", productId), {
          isArchived: true,
          isAvailable: false,
          available: false,
          updatedAt: serverTimestamp(),
          updatedAtMs: Date.now(),
        });
        await deleteDoc(doc(db, "businesses", bId, "products", productId)).catch(() => {});
        if (bId === "teatime" || bId === "biz_teatime") {
          await updateDoc(doc(db, "menu", productId), {
            isArchived: true,
            isAvailable: false,
            available: false,
          }).catch(() => { });
          await deleteDoc(doc(db, "menu", productId)).catch(() => {});
        }
      } catch (e) {
        console.warn("Client fallback archive product:", e);
      }
    }
    return { success: true } as unknown as T;
  }

  // 7. Owner Upsert Category
  if (action === "ownerUpsertCategory") {
    let bId = data.businessId || (typeof window !== "undefined" ? localStorage.getItem("menyo_auth_businessId") : null) || "teatime";
    const name = (data.name || "").trim();
    const catId = data.id && data.id.trim() ? data.id.trim() : `cat_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
    const categoryRecord = {
      id: catId,
      businessId: bId,
      name,
      slug: name.toLowerCase().replace(/[^a-z0-9]+/g, "-"),
      sortOrder: Number(data.sortOrder) || 0,
      icon: data.icon || "",
      iconUrl: data.iconUrl || data.icon || null,
      isVisible: true,
      updatedAt: serverTimestamp(),
      updatedAtMs: Date.now(),
    };

    if (typeof window !== "undefined") {
      try {
        const key = `menyo_categories_${bId}`;
        const existing: any[] = JSON.parse(localStorage.getItem(key) || "[]");
        const idx = existing.findIndex((c) => c.id === catId);
        const plainRecord = { ...categoryRecord, updatedAt: categoryRecord.updatedAtMs };
        if (idx >= 0) existing[idx] = { ...existing[idx], ...plainRecord };
        else existing.push(plainRecord);
        localStorage.setItem(key, JSON.stringify(existing));
      } catch {}
    }

    try {
      await setDoc(doc(db, "businesses", bId, "categories", catId), categoryRecord, { merge: true });
      if (bId === "teatime" || bId === "biz_teatime") {
        await setDoc(doc(db, "categories", catId), categoryRecord, { merge: true });
      }
    } catch (e) {
      console.warn("Client fallback upsert category:", e);
    }
    return categoryRecord as unknown as T;
  }

  // 8. Owner Archive Category
  if (action === "ownerArchiveCategory") {
    let bId = data.businessId || (typeof window !== "undefined" ? localStorage.getItem("menyo_auth_businessId") : null) || "demo";
    const categoryId = data.categoryId;
    if (categoryId) {
      if (typeof window !== "undefined") {
        try {
          const key = `menyo_categories_${bId}`;
          const existing: any[] = JSON.parse(localStorage.getItem(key) || "[]");
          const filtered = existing.filter((c) => c.id !== categoryId);
          localStorage.setItem(key, JSON.stringify(filtered));
        } catch {}
      }
      try {
        await deleteDoc(doc(db, "businesses", bId, "categories", categoryId));
        if (bId === "teatime" || bId === "biz_teatime") {
          await deleteDoc(doc(db, "categories", categoryId)).catch(() => { });
        }
      } catch (e) {
        console.warn("Client fallback archive category:", e);
      }
    }
    return { success: true } as unknown as T;
  }

  // 9. Owner Upsert Table
  if (action === "ownerUpsertTable") {
    let bId = data.businessId || (typeof window !== "undefined" ? localStorage.getItem("menyo_auth_businessId") : null) || "teatime";
    const rawNum = (data.tableNumber || data.number || "").trim();
    const tId = data.id || data.tableId || `tbl_${Date.now().toString().slice(-4)}`;
    const token = data.token || `tok_${Math.random().toString(36).substring(2, 10)}`;

    const tableRecord = {
      id: tId,
      businessId: bId,
      number: rawNum,
      tableNumber: rawNum,
      token,
      capacity: Number(data.capacity) || 4,
      notes: data.notes || "",
      active: data.active ?? true,
      isArchived: false,
      updatedAt: serverTimestamp(),
      updatedAtMs: Date.now(),
    };

    try {
      await setDoc(doc(db, "businesses", bId, "tables", tId), tableRecord, { merge: true });
      await setDoc(doc(db, "businesses", bId, "tableTokens", token), {
        token,
        tableId: tId,
        number: rawNum,
        tableNumber: rawNum,
        businessId: bId,
        active: data.active ?? true,
        updatedAtMs: Date.now(),
      }, { merge: true });
      if (bId === "teatime" || bId === "biz_teatime") {
        await setDoc(doc(db, "tables", tId), tableRecord, { merge: true });
      }
    } catch (e) {
      console.warn("Client fallback upsert table:", e);
    }
    return tableRecord as unknown as T;
  }

  // 10. Owner Update Order Status
  if (action === "ownerUpdateOrderStatus") {
    let bId = data.businessId || (typeof window !== "undefined" ? localStorage.getItem("menyo_auth_businessId") : null) || "teatime";
    const orderId = data.orderId;
    const status = data.status;
    if (orderId && status) {
      const nowMs = Date.now();
      const updatePayload: Record<string, any> = {
        status,
        updatedAt: serverTimestamp(),
        updatedAtMs: nowMs,
      };
      const statusLower = String(status).toLowerCase();
      if (statusLower === "served" || statusLower === "completed") {
        updatePayload.servedAt = serverTimestamp();
      }

      try {
        await updateDoc(doc(db, "businesses", bId, "orders", orderId), updatePayload);
      } catch (e) {
        console.warn("Client fallback update tenant order status:", e);
      }

      try {
        await updateDoc(doc(db, "orders", orderId), updatePayload);
      } catch {
        // non-critical if root order doc does not exist
      }
    }
    return { success: true, orderId, status } as unknown as T;
  }

  // 11. Create Tenant Order (Direct client fallback)
  if (action === "createTenantOrder") {
    const slug = (data.businessSlug || "").toLowerCase().trim();
    let bId = "teatime";
    let bizName = "Restaurant";
    if (slug && slug !== "teatime") {
      try {
        const slugSnap = await getDoc(doc(db, "businessSlugs", slug));
        if (slugSnap.exists()) {
          bId = slugSnap.data()?.businessId || bId;
        }
        const bSnap = await getDoc(doc(db, "businesses", bId));
        if (bSnap.exists()) {
          bizName = bSnap.data()?.name || bizName;
        }
      } catch { }
    }

    const orderId = `ord_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
    const trackingToken = `trk_${Math.random().toString(36).substring(2, 12)}`;
    const nextOrderNum = Math.floor(1000 + Math.random() * 9000);
    const orderNumberDisplay = `#${nextOrderNum}`;

    let resolvedTableNumber = "Table 01";
    if (data.tableToken) {
      const trimmedTok = data.tableToken.trim();
      try {
        const tSnap = await getDoc(doc(db, "businesses", bId, "tableTokens", trimmedTok));
        if (tSnap.exists()) {
          resolvedTableNumber = tSnap.data()?.tableNumber || tSnap.data()?.number || resolvedTableNumber;
        } else {
          const qT = query(collection(db, "businesses", bId, "tables"), where("token", "==", trimmedTok));
          const sT = await getDocs(qT);
          if (!sT.empty) {
            resolvedTableNumber = sT.docs[0].data()?.tableNumber || sT.docs[0].data()?.number || resolvedTableNumber;
          } else if (bId === "teatime") {
            const seedTbl = INITIAL_TABLES.find((t) => t.token === trimmedTok);
            if (seedTbl) resolvedTableNumber = seedTbl.number;
          }
        }
      } catch {
        if (bId === "teatime") {
          const seedTbl = INITIAL_TABLES.find((t) => t.token === trimmedTok);
          if (seedTbl) resolvedTableNumber = seedTbl.number;
        }
      }
    }

    const rawItems: any[] = Array.isArray(data.items) ? data.items : [];
    let computedTotalMinor = 0;
    const itemSnapshots: any[] = [];

    // Fetch product details from businesses/{bId}/products (with seed fallback for Tea Time)
    for (const it of rawItems) {
      let pName = "Menu Item";
      let pPriceMinor = 10000;
      let pImage: string | null = null;
      let pCat = "General";
      let resolvedFromDb = false;
      try {
        const pSnap = await getDoc(doc(db, "businesses", bId, "products", it.productId));
        if (pSnap.exists()) {
          const pd = pSnap.data();
          pName = pd.name || pName;
          pPriceMinor = pd.priceMinor || (pd.priceRupees ? pd.priceRupees * 100 : pPriceMinor);
          pImage = pd.imageUrl || pd.image || null;
          pCat = pd.category || pCat;
          resolvedFromDb = true;
        }
      } catch { }

      if (!resolvedFromDb && bId === "teatime") {
        const seedItem = INITIAL_MENU_ITEMS.find((m) => m.id === it.productId);
        if (seedItem) {
          pName = seedItem.name;
          pPriceMinor = seedItem.priceMinor || (seedItem.price ? seedItem.price * 100 : pPriceMinor);
          pImage = seedItem.imageUrl || seedItem.image || null;
          pCat = seedItem.category || pCat;
        }
      }

      const qty = Number(it.quantity) || 1;
      const subtotalMinor = pPriceMinor * qty;
      computedTotalMinor += subtotalMinor;

      itemSnapshots.push({
        productId: it.productId,
        name: pName,
        category: pCat,
        priceMinor: pPriceMinor,
        quantity: qty,
        subtotalMinor,
        imageUrl: pImage,
        sugarNote: it.sugarSpoons !== undefined && it.sugarSpoons !== null ? `${it.sugarSpoons} spoons sugar` : null,
      });
    }

    const nowMs = Date.now();
    const initialStatus = bId === "teatime" ? "new" : "PENDING";
    const orderDocData = {
      id: orderId,
      businessId: bId,
      businessSlug: slug || "teatime",
      trackingToken,
      orderNumber: nextOrderNum,
      orderNumberDisplay,
      tableNumber: resolvedTableNumber,
      tableToken: data.tableToken || "",
      customerId: auth.currentUser?.uid || `guest_${Math.random().toString(36).substring(2, 9)}`,
      status: initialStatus,
      items: itemSnapshots,
      itemCount: itemSnapshots.reduce((acc, i) => acc + i.quantity, 0),
      totalMinor: computedTotalMinor,
      totalRupees: Math.round(computedTotalMinor / 100),
      currency: "LKR",
      specialInstructions: data.specialInstructions || "",
      idempotencyKey: data.idempotencyKey || "",
      paymentStatus: "pay_at_counter",
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
      createdAtMs: nowMs,
      updatedAtMs: nowMs,
    };

    try {
      await setDoc(doc(db, "businesses", bId, "orders", orderId), orderDocData);
      await setDoc(doc(db, "businesses", bId, "orderTracking", trackingToken), {
        trackingToken,
        orderId,
        businessId: bId,
        businessName: bizName,
        orderNumber: nextOrderNum,
        orderNumberDisplay,
        tableNumber: resolvedTableNumber,
        status: initialStatus,
        items: itemSnapshots,
        totalMinor: computedTotalMinor,
        totalRupees: Math.round(computedTotalMinor / 100),
        currency: "LKR",
        createdAtMs: nowMs,
      });
    } catch (e) {
      console.warn("Client fallback create tenant order:", e);
    }

    return {
      success: true,
      orderId,
      trackingToken,
      orderNumber: nextOrderNum,
      orderNumberDisplay,
      tableNumber: resolvedTableNumber,
      totalMinor: computedTotalMinor,
      totalRupees: Math.round(computedTotalMinor / 100),
      businessSlug: slug || "teatime",
    } as unknown as T;
  }

  // 12. Get Order Tracking Status
  if (action === "getOrderTrackingStatus") {
    const slug = (data?.businessSlug || "teatime").toLowerCase().trim();
    let bId = slug || "teatime";
    if (slug && slug !== "teatime") {
      try {
        const slugSnap = await getDoc(doc(db, "businessSlugs", slug));
        if (slugSnap.exists()) bId = slugSnap.data()?.businessId || bId;
      } catch { }
    }
    const trackingToken = (data?.trackingToken || "").trim();
    if (trackingToken) {
      const q = query(collection(db, "businesses", bId, "orders"), where("trackingToken", "==", trackingToken));
      const snap = await getDocs(q);
      if (!snap.empty) {
        const d = snap.docs[0].data();
        return {
          orderId: snap.docs[0].id,
          orderNumber: d.orderNumberDisplay || `#${d.orderNumber}`,
          status: d.status,
          tableNumber: d.tableNumber,
          businessName: bId === "teatime" ? "TEA TIME" : slug,
          businessSlug: slug,
          items: (d.items || []).map((it: any) => ({
            name: it.name,
            quantity: it.quantity,
            subtotalRupees: Math.round((it.subtotalMinor || 0) / 100),
            specialInstruction: it.sugarNote || null,
          })),
          totalRupees: Math.round((d.totalMinor || 0) / 100),
          createdAt: d.createdAt,
          updatedAt: d.updatedAt,
        } as unknown as T;
      }
    }
    throw new ApiError("not-found", "Order tracking session could not be found.");
  }

  // 13. Customer Rewards Client Fallback
  if (action === "getCustomerReward") {
    const phone = String(data?.phone || "").replace(/[^0-9]/g, "").trim();
    let bId = (data?.businessId || "").trim();
    if (!bId && data?.businessSlug) {
      const slug = (data.businessSlug || "").toLowerCase().trim();
      try {
        const sSnap = await getDoc(doc(db, "businessSlugs", slug));
        if (sSnap.exists()) bId = sSnap.data()?.businessId || slug;
      } catch {}
    }
    if (!bId || bId === "teatime") bId = "teatime";

    if (phone.length >= 7) {
      try {
        const snap = await getDoc(doc(db, "businesses", bId, "customers", phone));
        if (snap.exists()) {
          return { record: snap.data() } as unknown as T;
        }
      } catch {}
      if (bId === "teatime") {
        try {
          const rootSnap = await getDoc(doc(db, "customers", phone));
          if (rootSnap.exists()) {
            return { record: rootSnap.data() } as unknown as T;
          }
        } catch {}
      }
    }
    return { record: null } as unknown as T;
  }

  if (action === "saveCustomerReward") {
    const phone = String(data?.phone || "").replace(/[^0-9]/g, "").trim();
    if (phone.length < 7) {
      throw new ApiError("invalid-argument", "Valid mobile number is required.");
    }
    let bId = (data?.businessId || "").trim();
    if (!bId && data?.businessSlug) {
      const slug = (data.businessSlug || "").toLowerCase().trim();
      try {
        const sSnap = await getDoc(doc(db, "businessSlugs", slug));
        if (sSnap.exists()) bId = sSnap.data()?.businessId || slug;
      } catch {}
    }
    if (!bId || bId === "teatime") bId = "teatime";

    const ref = doc(db, "businesses", bId, "customers", phone);
    let existing: any = null;
    try {
      const snap = await getDoc(ref);
      if (snap.exists()) existing = snap.data();
    } catch {}

    const nowMs = Date.now();
    const redeemed = Math.max(0, Number(data?.pointsRedeemed) || 0);
    const rpp = Number(data?.rupeePerPoint) > 0 ? Number(data?.rupeePerPoint) : 5;
    const netSpent = Math.max(0, (Number(data?.orderAmountRupees) || 0) - redeemed * rpp);
    const earnedPoints = Math.floor((netSpent / 100) * 2);
    const welcomeBonus = existing ? 0 : 20;
    const currentPoints = Math.max(0, (existing?.points || 0) - redeemed + earnedPoints + welcomeBonus);

    const record = {
      phone,
      name: String(data?.name || existing?.name || "Guest").trim(),
      points: currentPoints,
      totalSpentRupees: (existing?.totalSpentRupees || 0) + netSpent,
      totalOrders: (existing?.totalOrders || 0) + 1,
      claimedOrdersCount: (existing?.claimedOrdersCount || 0) + (redeemed > 0 ? 1 : 0),
      lastOrderAtMs: nowMs,
      createdAtMs: existing?.createdAtMs || nowMs,
      updatedAtMs: nowMs,
    };

    try {
      await setDoc(ref, record, { merge: true });
    } catch (err) {
      console.warn("Direct customer save fallback:", err);
    }

    return { record, earnedPoints } as unknown as T;
  }

  // 13. Complete Required Password Change
  if (action === "completeRequiredPasswordChange") {
    const newPwd = String(data?.newPassword || "");
    if (newPwd.length < 8) {
      throw new ApiError("invalid-argument", "Password must be at least 8 characters.");
    }
    await updateUserPassword(newPwd);
    if (auth.currentUser?.uid) {
      await setDoc(doc(db, "userProfiles", auth.currentUser.uid), {
        mustChangePassword: false,
        temporaryPassword: null,
        updatedAt: serverTimestamp(),
      }, { merge: true }).catch(() => { });
    }
    return { success: true } as unknown as T;
  }

  // Default success response for other actions
  return { success: true } as unknown as T;
}

/**
 * Executes an RPC call to the server engine via /api/rpc.
 * Automatically attaches the current user's Supabase JWT for authenticated endpoints.
 * Automatically falls back to Supabase RLS client execution if /api/rpc is not available.
 */
export async function callRpc<T = any>(action: string, data?: any): Promise<T> {
  let token: string | null = null;
  if (auth.currentUser && !auth.currentUser.isAnonymous) {
    try {
      token = await auth.currentUser.getIdToken();
    } catch {
      token = null;
    }
  }

  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };
  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }

  try {
    const response = await fetch("/api/rpc", {
      method: "POST",
      headers,
      body: JSON.stringify({ action, data: data ?? {} }),
    });

    const contentType = response.headers.get("content-type") || "";
    if (response.ok && contentType.includes("application/json")) {
      const payload: ApiRpcResponse<T> = await response.json();
      if (payload.success) {
        return payload.data as T;
      }
      throw new ApiError(payload.error?.code || "unknown", payload.error?.message || "An unexpected error occurred.");
    }
  } catch (err: any) {
    if (err instanceof ApiError && err.code !== "unknown") {
      throw err;
    }
    // Fall through to Supabase RLS client handler if endpoint doesn't exist or server admin key is omitted
  }

  return await clientRpcHandler<T>(action, data);
}

export const platformApi = {
  // Public Menu & Tenant Resolution
  async resolvePublicMenuTenant(params: {
    businessSlug: string;
    tableToken?: string | null;
  }) {
    return callRpc<{
      business: {
        id: string;
        name: string;
        slug: string;
        branding?: {
          logoUrl?: string | null;
          primaryColor?: string | null;
          accentColor?: string | null;
        };
        phone?: string;
        whatsapp?: string;
        address?: string;
        googleReviewUrl?: string;
        instagramUrl?: string;
        facebookUrl?: string;
        socialLinks?: SocialLinkItem[];
        status: BusinessOperationalStatus;
        isAvailable: boolean;
        unavailableReason?: string;
      };
      categories: Category[];
      products: MenuItem[];
      table?: {
        id: string;
        tableNumber: string;
        token: string;
      } | null;
    }>("resolvePublicMenuTenant", params);
  },

  async createTenantOrder(payload: CreateOrderPayload) {
    return callRpc<{
      success: boolean;
      orderId: string;
      orderNumber: string | number;
      orderNumberDisplay?: string;
      tableNumber?: string;
      totalMinor: number;
      totalRupees: number;
      trackingToken: string;
      businessSlug: string;
    }>("createTenantOrder", payload);
  },

  async getOrderTrackingStatus(params: {
    businessSlug: string;
    trackingToken: string;
  }) {
    return callRpc<{
      orderId: string;
      orderNumber: string;
      status: OrderStatus;
      tableNumber: string;
      businessName: string;
      businessSlug: string;
      items: Array<{
        name: string;
        quantity: number;
        subtotalRupees: number;
        specialInstruction?: string | null;
      }>;
      totalRupees: number;
      createdAt: any;
      updatedAt: any;
    }>("getOrderTrackingStatus", params);
  },

  async getCustomerReward(params: {
    businessId?: string;
    businessSlug?: string;
    phone: string;
  }) {
    return callRpc<{ record: any | null }>("getCustomerReward", params);
  },

  async saveCustomerReward(params: {
    businessId?: string;
    businessSlug?: string;
    phone: string;
    name: string;
    orderAmountRupees: number;
    pointsRedeemed?: number;
    rupeePerPoint?: number;
  }) {
    return callRpc<{ record: any; earnedPoints: number }>("saveCustomerReward", params);
  },

  // Authentication & Session
  async loginWithIdentifier(params: { identifier: string; password: string }) {
    const rawId = params.identifier.trim();
    const lowerId = rawId.toLowerCase();
    let targetEmail = lowerId;

    if (!rawId.includes("@")) {
      // Check if phone number (e.g. 0771234567 or +94771234567)
      const digitsOnly = lowerId.replace(/[^0-9]/g, "");
      if (digitsOnly.length >= 9) {
        targetEmail = `${digitsOnly}@phone.menyo.lk`;
      } else if (lowerId === "admin" || lowerId === "aevonix") {
        targetEmail = "admin@aevonix.lk";
      } else if (lowerId === "teatime") {
        targetEmail = "admin@teatime.lk";
      } else {
        let resolvedEmail: string | null = null;
        try {
          const qBizSlug = query(collection(db, "businesses"), where("slug", "==", lowerId));
          const sBizSlug = await getDocs(qBizSlug);
          if (!sBizSlug.empty && sBizSlug.docs[0].data()?.ownerEmail) {
            resolvedEmail = String(sBizSlug.docs[0].data().ownerEmail).toLowerCase();
          }
          if (!resolvedEmail) {
            const qU = query(collection(db, "userProfiles"), where("username", "==", lowerId));
            const sU = await getDocs(qU);
            if (!sU.empty && sU.docs[0].data()?.email) {
              resolvedEmail = String(sU.docs[0].data().email).toLowerCase();
            }
          }
        } catch { }
        if (!resolvedEmail) {
          const notCreatedErr = new Error(
            "No account found. Please create an account first before signing in."
          ) as Error & { code?: string };
          notCreatedErr.code = "auth/account-not-created";
          throw notCreatedErr;
        }
        targetEmail = resolvedEmail;
      }
    }

    const normalizedEmail = targetEmail.toLowerCase();
    const isSystemAccount =
      normalizedEmail === "admin@aevonix.lk" ||
      normalizedEmail === "thasmilan0@gmail.com" ||
      normalizedEmail === "admin@teatime.lk";

    // Block Sign In if no account has been created yet (except for Super Admins)
    if (!isSystemAccount) {
      let hasRegisteredBusiness = false;
      try {
        const qCheckBiz = query(
          collection(db, "businesses"),
          where("ownerEmail", "==", normalizedEmail)
        );
        const sCheckBiz = await getDocs(qCheckBiz);
        if (!sCheckBiz.empty) {
          hasRegisteredBusiness = true;
        } else {
          // Check userProfiles
          const qCheckProf = query(
            collection(db, "userProfiles"),
            where("email", "==", normalizedEmail)
          );
          const sCheckProf = await getDocs(qCheckProf);
          if (!sCheckProf.empty) {
            hasRegisteredBusiness = true;
          }
        }
      } catch { }

      if (!hasRegisteredBusiness) {
        const notCreatedErr = new Error(
          "No account found. Please create an account first before signing in."
        ) as Error & { code?: string };
        notCreatedErr.code = "auth/account-not-created";
        throw notCreatedErr;
      }
    }

    // Sign in directly with Supabase Auth
    let cred: { user: User };
    try {
      cred = await signInWithEmailAndPassword(auth, targetEmail, params.password);
    } catch (signInErr: any) {
      if (signInErr?.code === "auth/invalid-credential") {
        const wrongPassErr = new Error(
          "Incorrect password. Please check your email and password and try again, or click 'Forgot password?' below."
        ) as Error & { code?: string };
        wrongPassErr.code = "auth/wrong-password";
        throw wrongPassErr;
      }
      throw signInErr;
    }
    const emailLower = (cred.user.email || targetEmail).toLowerCase();
    const isSuperAdmin =
      emailLower === "admin@aevonix.lk" ||
      emailLower === "thasmilan0@gmail.com" ||
      cred.user.appMetadata?.role === "SUPER_ADMIN";

    let role: "SUPER_ADMIN" | "BUSINESS_OWNER" = isSuperAdmin ? "SUPER_ADMIN" : "BUSINESS_OWNER";
    let businessId: string | null = isSuperAdmin
      ? null
      : emailLower === "admin@teatime.lk"
      ? "teatime"
      : null;
    let businessSlug: string | null = emailLower === "admin@teatime.lk" ? "teatime" : null;
    let mustChangePassword = false;

    if (!isSuperAdmin && emailLower !== "admin@teatime.lk") {
      try {
        const pSnap = await getDoc(doc(db, "userProfiles", cred.user.uid));
        if (pSnap.exists()) {
          const pData = pSnap.data();
          businessId = pData.businessId || null;
          mustChangePassword = Boolean(pData.mustChangePassword);
        } else {
          const qE = query(collection(db, "userProfiles"), where("email", "==", emailLower));
          const sE = await getDocs(qE);
          if (!sE.empty) {
            const pData = sE.docs[0].data();
            businessId = pData.businessId || null;
            mustChangePassword = Boolean(pData.mustChangePassword);
          }
        }

        // If businessId is found, resolve its canonical slug
        if (businessId) {
          const bDoc = await getDoc(doc(db, "businesses", businessId)).catch(() => null);
          if (bDoc && bDoc.exists()) {
            businessSlug = bDoc.data()?.slug || businessId;
          } else {
            businessSlug = businessId;
          }
        } else {
          // Check if user is business owner by email in businesses collection
          const qBiz = query(collection(db, "businesses"), where("ownerEmail", "==", emailLower));
          const sBiz = await getDocs(qBiz).catch(() => null);
          if (sBiz && !sBiz.empty) {
            businessId = sBiz.docs[0].id;
            businessSlug = sBiz.docs[0].data()?.slug || businessId;
          }
        }
      } catch { }

      if (!businessId) {
        await signOut(auth).catch(() => { });
        const notCreatedErr = new Error(
          "No account found. Please create an account first before signing in."
        ) as Error & { code?: string };
        notCreatedErr.code = "auth/account-not-created";
        throw notCreatedErr;
      }
    }

    if (typeof window !== "undefined") {
      localStorage.setItem("menyo_auth_role", role);
      localStorage.setItem("menyo_auth_email", emailLower);
      if (businessId) {
        localStorage.setItem("menyo_auth_businessId", businessId);
      }
      if (businessSlug) {
        localStorage.setItem("menyo_auth_businessSlug", businessSlug);
      }
    }

    return {
      user: cred.user,
      role,
      businessId,
      slug: businessSlug,
      mustChangePassword,
    };
  },

  // Register new owner with 2-Day Free Trial
  async registerOwnerWithTrial(params: {
    businessName: string;
    ownerName: string;
    email: string;
    password?: string;
    phone?: string;
    whatsapp?: string;
  }) {
    let email = params.email.trim().toLowerCase();
    // Allow phone number as primary credential if no '@' present
    if (!email.includes("@")) {
      const digits = email.replace(/[^0-9]/g, "");
      email = `${digits}@phone.menyo.lk`;
    }
    const password = params.password || "MenyoTrial2026!";
    const businessName = params.businessName.trim();
    const ownerName = params.ownerName.trim();

    // Prevent duplicate account creation if an account already exists for this email/phone
    try {
      const qExistingBiz = query(collection(db, "businesses"), where("ownerEmail", "==", email));
      const sExistingBiz = await getDocs(qExistingBiz);
      if (!sExistingBiz.empty) {
        const existsErr = new Error(
          "This email is already registered. Please Sign in with your password instead."
        ) as Error & { code?: string };
        existsErr.code = "auth/account-already-exists";
        throw existsErr;
      }
    } catch (checkErr: any) {
      if (checkErr?.code === "auth/account-already-exists") {
        throw checkErr;
      }
    }

    let user: User;
    try {
      const cred = await createUserWithEmailAndPassword(auth, email, password, {
        displayName: ownerName,
      });
      user = cred.user;
    } catch (err: any) {
      if (err?.code === "auth/email-already-in-use") {
        try {
          const cred = await signInWithEmailAndPassword(auth, email, password);
          user = cred.user;
        } catch {
          const existsErr = new Error(
            "This email is already registered. Please Sign in with your password instead (or use 'Forgot password?' to reset it)."
          ) as Error & { code?: string };
          existsErr.code = "auth/account-already-exists";
          throw existsErr;
        }
      } else {
        throw err;
      }
    }

    const { businessId, slug } = await provisionTrialWorkspaceForExistingUser({
      uid: user.uid,
      email,
      ownerName,
      businessName,
      phone: params.phone,
      whatsapp: params.whatsapp,
    });

    if (typeof window !== "undefined") {
      localStorage.setItem("menyo_auth_role", "BUSINESS_OWNER");
      localStorage.setItem("menyo_auth_email", email);
      localStorage.setItem("menyo_auth_businessId", businessId);
    }

    return { user, businessId, slug };
  },

  // Google OAuth Login & 2-Day Trial Onboarding (Redirects via Supabase Auth)
  async loginWithGoogleOAuth(): Promise<{
    redirecting?: boolean;
    user: User | null;
    role: "SUPER_ADMIN" | "BUSINESS_OWNER";
    businessId: string | null;
  }> {
    await signInWithOAuthProvider("google");
    return {
      redirecting: true,
      user: auth.currentUser,
      role: "BUSINESS_OWNER",
      businessId: null,
    };
  },

  // Apple OAuth Login & 2-Day Trial Onboarding (Redirects via Supabase Auth)
  async loginWithAppleOAuth(): Promise<{
    redirecting?: boolean;
    user: User | null;
    role: "SUPER_ADMIN" | "BUSINESS_OWNER";
    businessId: string | null;
  }> {
    await signInWithOAuthProvider("apple");
    return {
      redirecting: true,
      user: auth.currentUser,
      role: "BUSINESS_OWNER",
      businessId: null,
    };
  },

  async getSessionContext() {
    return callRpc<{
      user: UserProfileRecord;
      claims: {
        role: "SUPER_ADMIN" | "BUSINESS_OWNER";
        businessId: string | null;
        mustChangePassword: boolean;
      };
      business?: {
        id: string;
        name: string;
        slug: string;
        branding?: any;
        phone?: string;
        whatsapp?: string;
        address?: string;
        googleReviewUrl?: string;
        instagramUrl?: string;
        facebookUrl?: string;
        socialLinks?: SocialLinkItem[];
        status: BusinessOperationalStatus;
        subscription?: {
          packageId: PackageId;
          startsAtMs: number;
          expiresAtMs: number | null;
          isLifetime: boolean;
          effectiveStatus: string;
          daysRemaining: number | null;
        };
      } | null;
    }>("getSessionContext");
  },

  async completeRequiredPasswordChange(newPassword: string) {
    return callRpc<{ success: boolean }>(
      "completeRequiredPasswordChange",
      { newPassword }
    );
  },

  // Super Admin
  async bootstrapSuperAdmin(params: {
    secret: string;
    username: string;
    email: string;
    password: string;
    fullName?: string;
  }) {
    return callRpc<{ success: boolean; uid: string; username: string }>(
      "bootstrapSuperAdmin",
      params
    );
  },

  async getSuperAdminDashboard() {
    return callRpc<{
      metrics: SuperAdminMetrics;
      businesses: SuperAdminBusinessRow[];
      users?: any[];
      payments?: any[];
      packages: SubscriptionPackage[];
      platformConfig: PlatformPublicConfig;
    }>("getSuperAdminDashboard");
  },

  async createBusinessWithOwner(data: {
    businessName: string;
    businessSlug: string;
    ownerName: string;
    username: string;
    ownerEmail: string;
    temporaryPassword?: string;
    phone?: string;
    whatsapp?: string;
    address?: string;
    branding?: {
      logoUrl?: string;
      primaryColor?: string;
      accentColor?: string;
      backgroundColor?: string;
      textColor?: string;
      headerBackgroundColor?: string;
      headerTextColor?: string;
    };
    packageId: PackageId;
    activationDateColombo?: string;
    paymentAmountRupees?: number;
    paymentDateColombo?: string;
    paymentMethod?: PaymentMethod;
    paymentReference?: string;
    paymentNote?: string;
  }) {
    return callRpc<{
      success: boolean;
      businessId: string;
      businessSlug: string;
      ownerUid: string;
      username: string;
      temporaryPassword: string;
    }>("createBusinessWithOwner", data);
  },

  async getBusinessDetailsForSuperAdmin(businessId: string) {
    return callRpc<{
      business: any;
      access: any;
      private: any;
      ownerProfile: UserProfileRecord | null;
      subscriptions: any[];
      payments: any[];
      auditLogs: AuditLogRecord[];
      stats: {
        productsCount: number;
        categoriesCount: number;
        tablesCount: number;
        ordersCount: number;
      };
    }>("getBusinessDetailsForSuperAdmin", { businessId });
  },

  async updateBusinessBySuperAdmin(data: {
    businessId: string;
    name?: string;
    phone?: string;
    whatsapp?: string;
    address?: string;
    branding?: any;
    internalNotes?: string;
  }) {
    return callRpc("updateBusinessBySuperAdmin", data);
  },

  async renewOrChangeSubscription(data: {
    businessId: string;
    packageId: PackageId;
    startDateColombo?: string;
    amountRupees?: number;
    paymentMethod?: PaymentMethod;
    reference?: string;
    notes?: string;
  }) {
    return callRpc("renewOrChangeSubscription", data);
  },

  async setBusinessOperationalStatus(
    businessId: string,
    status: BusinessOperationalStatus,
    reason?: string
  ) {
    return callRpc("setBusinessOperationalStatus", { businessId, status, reason });
  },

  async deleteBusiness(businessId: string) {
    return callRpc<{ success: boolean }>("deleteBusiness", { businessId });
  },

  async deleteUserProfile(uid: string) {
    return callRpc<{ success: boolean }>("deleteUserProfile", { uid });
  },

  async resetAllPayments() {
    return callRpc<{ success: boolean }>("resetAllPayments", {});
  },

  async resetOwnerAccess(data: {
    businessId: string;
    newEmail?: string;
    temporaryPassword?: string;
  }) {
    return callRpc<{ success: boolean; temporaryPassword?: string }>(
      "resetOwnerAccess",
      data
    );
  },

  async updatePlatformPackagesAndSettings(data: {
    packages?: SubscriptionPackage[];
    salesContactPhone?: string;
    salesContactWhatsapp?: string;
  }) {
    return callRpc("updatePlatformPackagesAndSettings", data);
  },

  // Business Owner Tenant RPCs
  async ownerUpsertCategory(data: {
    businessId?: string;
    id?: string;
    name: string;
    slug?: string;
    sortOrder?: number;
    icon?: string;
    iconUrl?: string;
  }) {
    return callRpc("ownerUpsertCategory", data);
  },

  async ownerArchiveCategory(
    categoryIdOrData: string | { categoryId: string; reassignToCategoryId?: string; businessId?: string },
    reassignToCategoryId?: string,
    businessId?: string
  ) {
    if (typeof categoryIdOrData === "string") {
      return callRpc("ownerArchiveCategory", { categoryId: categoryIdOrData, reassignToCategoryId, businessId });
    }
    return callRpc("ownerArchiveCategory", categoryIdOrData);
  },

  async ownerUpsertProduct(data: {
    businessId?: string;
    id?: string;
    name: string;
    categoryId?: string;
    category?: string;
    priceRupees: number;
    description?: string;
    imageUrl?: string | null;
    imageUrls?: string[];
    isAvailable?: boolean;
    isVeg?: boolean;
    isPopular?: boolean;
    sortOrder?: number;
  }) {
    return callRpc("ownerUpsertProduct", data);
  },

  async ownerArchiveProduct(productIdOrData: string | { productId: string; businessId?: string }) {
    if (typeof productIdOrData === "string") {
      return callRpc("ownerArchiveProduct", { productId: productIdOrData });
    }
    return callRpc("ownerArchiveProduct", productIdOrData);
  },

  async ownerUpsertTable(data: {
    businessId?: string;
    id?: string;
    tableId?: string;
    tableNumber?: string;
    number?: string;
    capacity?: number;
    notes?: string;
    active?: boolean;
    rotateToken?: boolean;
  }) {
    const payload = {
      ...data,
      tableId: data.tableId || data.id,
      number: data.number || data.tableNumber,
    };
    return callRpc("ownerUpsertTable", payload);
  },

  async ownerUpdateOrderStatus(
    orderIdOrPayload: string | { orderId: string; status: OrderStatus; businessId?: string },
    status?: OrderStatus,
    businessId?: string
  ) {
    if (typeof orderIdOrPayload === "string") {
      return callRpc("ownerUpdateOrderStatus", { orderId: orderIdOrPayload, status, businessId });
    }
    return callRpc("ownerUpdateOrderStatus", orderIdOrPayload);
  },

  async ownerUpdateSettings(data: {
    businessId?: string;
    name?: string;
    tagline?: string;
    phone?: string;
    whatsapp?: string;
    address?: string;
    openingHours?: string;
    isOrderingPaused?: boolean;
    pauseMessage?: string;
    logoUrl?: string | null;
    primaryColor?: string | null;
    accentColor?: string | null;
    backgroundColor?: string | null;
    textColor?: string | null;
    headerBackgroundColor?: string | null;
    headerTextColor?: string | null;
    googleReviewUrl?: string;
    instagramUrl?: string;
    facebookUrl?: string;
    socialLinks?: any[];
    qrHeaderTitle?: string;
    qrSubtitle?: string;
    qrFooterNote?: string;
    qrLogoSize?: number | string;
    branding?: {
      logoUrl?: string | null;
      primaryColor?: string | null;
      accentColor?: string | null;
      backgroundColor?: string | null;
      textColor?: string | null;
      headerBackgroundColor?: string | null;
      headerTextColor?: string | null;
      qrHeaderTitle?: string;
      qrSubtitle?: string;
      qrFooterNote?: string;
      qrLogoSize?: number | string;
      [key: string]: any;
    };
  }) {
    // Flatten branding fields if passed nested
    const payload = {
      ...data,
      logoUrl: data.logoUrl !== undefined ? data.logoUrl : data.branding?.logoUrl,
      primaryColor: data.primaryColor ?? data.branding?.primaryColor,
      accentColor: data.accentColor ?? data.branding?.accentColor,
      backgroundColor: data.backgroundColor ?? data.branding?.backgroundColor,
      textColor: data.textColor ?? data.branding?.textColor,
      headerBackgroundColor: data.headerBackgroundColor ?? data.branding?.headerBackgroundColor,
      headerTextColor: data.headerTextColor ?? data.branding?.headerTextColor,
      qrHeaderTitle: data.qrHeaderTitle ?? data.branding?.qrHeaderTitle,
      qrSubtitle: data.qrSubtitle ?? data.branding?.qrSubtitle,
      qrFooterNote: data.qrFooterNote ?? data.branding?.qrFooterNote,
      qrLogoSize: data.qrLogoSize ?? data.branding?.qrLogoSize,
    };
    return callRpc("ownerUpdateSettings", payload);
  },

  async ownerResetBrandingSettings() {
    return callRpc("ownerResetBrandingSettings", {});
  },
};
