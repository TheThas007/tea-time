import crypto from "crypto";
import {
  AuditLogRecord,
  BusinessAccessRecord,
  BusinessOperationalStatus,
  BusinessPrivateRecord,
  BusinessPublicProfile,
  Category,
  ManualPaymentRecord,
  MenuItem,
  Order,
  OrderItemSnapshot,
  OrderStatus,
  PackageId,
  PaymentMethod,
  PlatformPublicConfig,
  SubscriptionHistoryRecord,
  SubscriptionPackage,
  SuperAdminBusinessRow,
  SuperAdminMetrics,
  TableItem,
  UserProfileRecord,
} from "../types";
import {
  DEFAULT_PACKAGES,
  DEFAULT_PLATFORM_PUBLIC_CONFIG,
  isValidPackageId,
  normalizeBusinessSlug,
  normalizeUsername,
  validateBusinessSlug,
  validateEmailAddress,
  validateHexColor,
  validateLkrPriceRupees,
  validatePasswordStrength,
  validateUsername,
  TEATIME_DEFAULT_THEME,
  MENYO_DEFAULT_THEME,
} from "../shared/constants";
import {
  computeInitialSubscriptionWindow,
  computeRenewalSubscriptionWindow,
  evaluateBusinessAccess,
  getColomboDateString,
  getColomboYearMonth,
  parseColomboCalendarDateStartMs,
} from "../shared/subscriptionMath";
import {
  PlatformApiError,
  PlatformAuthProvider,
  PlatformClock,
  PlatformDataStore,
  VerifiedCaller,
} from "./storeTypes";

export interface PlatformEngineDeps {
  store: PlatformDataStore;
  auth: PlatformAuthProvider;
  clock?: PlatformClock;
  bootstrapSecret?: string;
}

function sha256Short(input: string): string {
  return crypto.createHash("sha256").update(input).digest("hex").slice(0, 32);
}

function generateId(prefix: string): string {
  return `${prefix}_${crypto.randomBytes(8).toString("hex")}`;
}

function generateTableToken(): string {
  return `tbl_${crypto.randomBytes(5).toString("hex")}`;
}

function formatSugarNoteServer(spoons?: number | null): string | null {
  if (typeof spoons !== "number" || !Number.isInteger(spoons)) return null;
  if (spoons < 0 || spoons > 5) return null;
  if (spoons === 0) return "No sugar";
  if (spoons === 1) return "1 tea spoon sugar";
  return `${spoons} spoons sugar`;
}

function supportsSugarServer(product: Partial<MenuItem>): boolean {
  const targets = ["coffee & milk tea", "non-milk tea"];
  const primary = (product.category || "").trim().toLowerCase();
  if (targets.includes(primary)) return true;
  if (Array.isArray(product.categories)) {
    return product.categories.some((c) => targets.includes((c || "").trim().toLowerCase()));
  }
  return false;
}

const ALLOWED_PAYMENT_METHODS: PaymentMethod[] = [
  "cash",
  "bank_transfer",
  "card_manual",
  "other",
  "CASH",
  "BANK_TRANSFER",
  "CARD_MANUAL",
  "OTHER",
];

const ALLOWED_ORDER_STATUSES: OrderStatus[] = [
  "new",
  "accepted",
  "preparing",
  "ready",
  "served",
  "completed",
  "cancelled",
  "PENDING",
  "PREPARING",
  "READY",
  "SERVED",
  "COMPLETED",
  "CANCELLED",
];

export class PlatformEngine {
  private readonly store: PlatformDataStore;
  private readonly auth: PlatformAuthProvider;
  private readonly clock: PlatformClock;
  private readonly bootstrapSecret?: string;

  constructor(deps: PlatformEngineDeps) {
    this.store = deps.store;
    this.auth = deps.auth;
    this.clock = deps.clock || { now: () => Date.now() };
    this.bootstrapSecret =
      deps.bootstrapSecret ?? process.env.SUPER_ADMIN_BOOTSTRAP_SECRET;
  }

  private async writeAuditLog(params: {
    actorUid: string;
    actorEmail?: string;
    actorRole: "SUPER_ADMIN" | "BUSINESS_OWNER";
    businessId?: string | null;
    action: string;
    summary: string;
    metadata?: Record<string, any>;
  }): Promise<void> {
    const id = generateId("aud");
    const nowMs = this.clock.now();
    // Sanitize metadata so passwords/secrets can never enter audit logs
    const safeMetadata: Record<string, any> = {};
    if (params.metadata) {
      for (const [k, v] of Object.entries(params.metadata)) {
        if (/password|secret|token|key/i.test(k) && k !== "packageId") continue;
        safeMetadata[k] = v;
      }
    }
    const record: AuditLogRecord = {
      id,
      actorUid: params.actorUid,
      actorEmail: params.actorEmail,
      actorRole: params.actorRole,
      businessId: params.businessId || null,
      action: params.action,
      summary: params.summary,
      metadata: safeMetadata,
      createdAtMs: nowMs,
    };
    await this.store.setDoc(`auditLogs/${id}`, record);
  }

  private async ensureDefaultPackagesSeeded(): Promise<SubscriptionPackage[]> {
    const existing = await this.store.listCollection<SubscriptionPackage>("packages");
    const existingMap = new Map(existing.map((p) => [p.id, p]));
    const nowMs = this.clock.now();

    for (const pkg of DEFAULT_PACKAGES) {
      if (!existingMap.has(pkg.id)) {
        await this.store.setDoc(
          `packages/${pkg.id}`,
          { ...pkg, updatedAt: nowMs },
          { merge: true }
        );
        existingMap.set(pkg.id, { ...pkg, updatedAt: nowMs });
      }
    }

    const sorted = Array.from(existingMap.values()).sort(
      (a, b) => (a.sortOrder ?? 99) - (b.sortOrder ?? 99)
    );

    const pubCfg = await this.store.getDoc<PlatformPublicConfig>(
      "platform/publicConfig"
    );
    if (!pubCfg) {
      const cfg: PlatformPublicConfig = {
        ...DEFAULT_PLATFORM_PUBLIC_CONFIG,
        packages: sorted,
        updatedAt: nowMs,
      };
      await Promise.all([
        this.store.setDoc("platform/publicConfig", cfg),
        this.store.setDoc("platformSettings/public", cfg),
      ]);
    }

    return sorted;
  }

  private async requireSuperAdmin(caller: VerifiedCaller | null): Promise<UserProfileRecord> {
    if (!caller || caller.isAnonymous) {
      throw new PlatformApiError("unauthenticated", "Authentication required.");
    }
    const profile = await this.store.getDoc<UserProfileRecord>(
      `userProfiles/${caller.uid}`
    );
    if (!profile || !profile.active || profile.role !== "SUPER_ADMIN") {
      throw new PlatformApiError(
        "permission-denied",
        "Super Admin privileges are required for this action."
      );
    }
    if (profile.mustChangePassword) {
      throw new PlatformApiError(
        "failed-precondition",
        "Password change required before performing administrative actions.",
        { reason: "PASSWORD_CHANGE_REQUIRED" }
      );
    }
    return profile;
  }

  /**
   * Verifies caller is an active BUSINESS_OWNER, enforces mustChangePassword === false,
   * NEVER trusts client-supplied businessId (throws permission-denied if mismatched),
   * and optionally enforces active operational status & non-expired subscription at server time.
   */
  private async requireBusinessOwner(
    caller: VerifiedCaller | null,
    options: {
      clientSubmittedBusinessId?: string;
      requireActiveSubscription: boolean;
    }
  ): Promise<{
    profile: UserProfileRecord;
    businessId: string;
    business: BusinessPublicProfile;
    access: BusinessAccessRecord;
  }> {
    if (!caller || caller.isAnonymous) {
      throw new PlatformApiError("unauthenticated", "Authentication required.");
    }
    const profile = await this.store.getDoc<UserProfileRecord>(
      `userProfiles/${caller.uid}`
    );
    if (
      !profile ||
      !profile.active ||
      profile.role !== "BUSINESS_OWNER" ||
      !profile.businessId
    ) {
      throw new PlatformApiError(
        "permission-denied",
        "Business owner access is required."
      );
    }

    if (
      options.clientSubmittedBusinessId &&
      options.clientSubmittedBusinessId !== profile.businessId
    ) {
      throw new PlatformApiError(
        "permission-denied",
        "Cross-business authorization attempt rejected."
      );
    }

    if (profile.mustChangePassword || caller.claims?.mustChangePassword === true) {
      throw new PlatformApiError(
        "failed-precondition",
        "You must change your temporary password before accessing business management.",
        { reason: "PASSWORD_CHANGE_REQUIRED" }
      );
    }

    const businessId = profile.businessId;
    const [business, access] = await Promise.all([
      this.store.getDoc<BusinessPublicProfile>(`businesses/${businessId}`),
      this.store.getDoc<BusinessAccessRecord>(`businessAccess/${businessId}`),
    ]);

    if (!business || !access) {
      throw new PlatformApiError(
        "not-found",
        "Assigned business profile could not be found."
      );
    }

    if (options.requireActiveSubscription) {
      const evaluation = evaluateBusinessAccess(access, this.clock.now());
      if (!evaluation.allowed) {
        throw new PlatformApiError(
          "permission-denied",
          evaluation.reason === "SUSPENDED"
            ? "Your business account is currently suspended. Please contact platform support."
            : "Your subscription has expired. Please contact platform support to renew.",
          { reason: evaluation.reason }
        );
      }
    }

    return { profile, businessId, business, access };
  }

  // ============================================================================
  // 1. ONE-TIME SUPER ADMIN BOOTSTRAP
  // ============================================================================

  async bootstrapSuperAdmin(input: {
    bootstrapSecret: string;
    username: string;
    email: string;
    password: string;
    displayName?: string;
  }): Promise<{ success?: boolean; uid: string; username: string; email: string }> {
    const expectedSecret = (this.bootstrapSecret || "").trim();
    if (!expectedSecret || expectedSecret.length < 16) {
      throw new PlatformApiError(
        "failed-precondition",
        "SUPER_ADMIN_BOOTSTRAP_SECRET environment variable (minimum 16 characters) is not configured on the server."
      );
    }

    const providedBuf = Buffer.from(
      (input.bootstrapSecret || (input as any).secret || "").trim(),
      "utf8"
    );
    const expectedBuf = Buffer.from(expectedSecret, "utf8");
    if (
      providedBuf.length !== expectedBuf.length ||
      !crypto.timingSafeEqual(providedBuf, expectedBuf)
    ) {
      throw new PlatformApiError("permission-denied", "Invalid bootstrap secret.");
    }

    const uCheck = validateUsername(input.username);
    if (!uCheck.valid) {
      throw new PlatformApiError("invalid-argument", uCheck.error!);
    }
    const eCheck = validateEmailAddress(input.email);
    if (!eCheck.valid) {
      throw new PlatformApiError("invalid-argument", eCheck.error!);
    }
    const pCheck = validatePasswordStrength(input.password);
    if (!pCheck.valid) {
      throw new PlatformApiError("invalid-argument", pCheck.error!);
    }

    const displayName = (input.displayName || "AEVONIX Super Admin")
      .trim()
      .slice(0, 80);
    const nowMs = this.clock.now();

    // Reserve bootstrap lock & username atomically
    await this.store.runTransaction(async (tx) => {
      const bootDoc = await tx.getDoc<{ completed?: boolean; inProgress?: boolean }>(
        "platform/bootstrap"
      );
      if (bootDoc?.completed || bootDoc?.inProgress) {
        throw new PlatformApiError(
          "failed-precondition",
          "Super Admin bootstrap has already been completed."
        );
      }
      const existingUsername = await tx.getDoc(`usernames/${uCheck.normalized}`);
      if (existingUsername) {
        throw new PlatformApiError("already-exists", "Username is already reserved.");
      }
      tx.setDoc("platform/bootstrap", {
        completed: false,
        inProgress: true,
        startedAtMs: nowMs,
      });
      tx.setDoc(`usernames/${uCheck.normalized}`, {
        username: uCheck.normalized,
        uid: "PENDING_BOOTSTRAP",
        email: eCheck.normalized,
        role: "SUPER_ADMIN",
        businessId: null,
        createdAtMs: nowMs,
      });
    });

    let createdAuthUid: string | null = null;
    let authUserExisted = false;

    try {
      const existingAuth = await this.auth.getUserByEmail(eCheck.normalized);
      let uid: string;
      if (existingAuth) {
        authUserExisted = true;
        uid = existingAuth.uid;
        await this.auth.updateUser(uid, {
          password: input.password,
          displayName,
          disabled: false,
        });
      } else {
        const created = await this.auth.createUser({
          email: eCheck.normalized,
          password: input.password,
          displayName,
        });
        createdAuthUid = created.uid;
        uid = created.uid;
      }

      await this.auth.setCustomUserClaims(uid, {
        role: "SUPER_ADMIN",
        businessId: null,
        mustChangePassword: false,
        admin: true,
      });

      await this.ensureDefaultPackagesSeeded();

      const profile: UserProfileRecord = {
        uid,
        role: "SUPER_ADMIN",
        businessId: null,
        username: uCheck.normalized,
        displayName,
        email: eCheck.normalized,
        mustChangePassword: false,
        active: true,
        createdAt: nowMs,
        updatedAt: nowMs,
      };

      await this.store.runTransaction(async (tx) => {
        tx.setDoc(`userProfiles/${uid}`, {
          ...profile,
          createdAtMs: nowMs,
          updatedAtMs: nowMs,
        });
        tx.setDoc(`usernames/${uCheck.normalized}`, {
          username: uCheck.normalized,
          uid,
          email: eCheck.normalized,
          role: "SUPER_ADMIN",
          businessId: null,
          createdAtMs: nowMs,
        });
        tx.setDoc("platform/bootstrap", {
          completed: true,
          inProgress: false,
          superAdminUid: uid,
          completedAtMs: nowMs,
        });
      });

      await this.writeAuditLog({
        actorUid: uid,
        actorEmail: eCheck.normalized,
        actorRole: "SUPER_ADMIN",
        action: "SUPER_ADMIN_BOOTSTRAPPED",
        summary: `Initialized primary Super Admin (${uCheck.normalized})`,
        metadata: { username: uCheck.normalized },
      });

      return {
        success: true,
        uid,
        username: uCheck.normalized,
        email: eCheck.normalized,
      };
    } catch (err) {
      // Rollback lock and Auth user on partial failure
      if (createdAuthUid && !authUserExisted) {
        try {
          await this.auth.deleteUser(createdAuthUid);
        } catch {
          // Best-effort cleanup
        }
      }
      await this.store.deleteDoc(`usernames/${uCheck.normalized}`).catch(() => {});
      await this.store.deleteDoc("platform/bootstrap").catch(() => {});
      throw err;
    }
  }

  // ============================================================================
  // 2. RATE-LIMITED USERNAME / EMAIL LOGIN & PASSWORD CHANGE
  // ============================================================================

  async loginWithIdentifier(
    input: { identifier: string; password: string },
    clientIp: string = "unknown"
  ): Promise<{
    customToken: string;
    role: "SUPER_ADMIN" | "BUSINESS_OWNER";
    businessId: string | null;
    mustChangePassword: boolean;
  }> {
    const rawId = (input.identifier || "").trim();
    const rawPw = input.password || "";
    if (!rawId || !rawPw || rawId.length > 160 || rawPw.length > 128) {
      throw new PlatformApiError(
        "unauthenticated",
        "Invalid username/email or password."
      );
    }

    const nowMs = this.clock.now();
    const windowMs = 15 * 60 * 1000;
    const rateKey = `login_${sha256Short(`${clientIp}|${rawId.toLowerCase()}`)}`;
    const rateDoc = await this.store.getDoc<{
      attempts: number;
      windowStartMs: number;
    }>(`securityRateLimits/${rateKey}`);

    if (
      rateDoc &&
      nowMs - rateDoc.windowStartMs < windowMs &&
      rateDoc.attempts >= 8
    ) {
      throw new PlatformApiError(
        "resource-exhausted",
        "Too many failed sign-in attempts. Please wait 15 minutes before trying again."
      );
    }

    const recordFailureAndThrow = async (): Promise<never> => {
      const freshWindow = !rateDoc || nowMs - rateDoc.windowStartMs >= windowMs;
      await this.store.setDoc(`securityRateLimits/${rateKey}`, {
        attempts: freshWindow ? 1 : rateDoc.attempts + 1,
        windowStartMs: freshWindow ? nowMs : rateDoc.windowStartMs,
        updatedAtMs: nowMs,
      });
      throw new PlatformApiError(
        "unauthenticated",
        "Invalid username/email or password."
      );
    };

    let resolvedEmail = "";
    if (rawId.includes("@")) {
      const eCheck = validateEmailAddress(rawId);
      if (!eCheck.valid) {
        return recordFailureAndThrow();
      }
      resolvedEmail = eCheck.normalized;
    } else {
      const normalizedU = normalizeUsername(rawId);
      const uDoc = await this.store.getDoc<{
        uid: string;
        email: string;
      }>(`usernames/${normalizedU}`);
      if (!uDoc || !uDoc.email) {
        return recordFailureAndThrow();
      }
      resolvedEmail = uDoc.email;
    }

    let verified: { uid: string; email: string };
    try {
      verified = await this.auth.verifyPasswordWithProvider(resolvedEmail, rawPw);
    } catch (err: any) {
      if (err instanceof PlatformApiError && err.code === "failed-precondition") {
        throw err;
      }
      return recordFailureAndThrow();
    }

    const profile = await this.store.getDoc<UserProfileRecord>(
      `userProfiles/${verified.uid}`
    );
    if (!profile || !profile.active) {
      return recordFailureAndThrow();
    }

    // Clear failed attempts upon valid sign-in
    if (rateDoc) {
      await this.store.deleteDoc(`securityRateLimits/${rateKey}`).catch(() => {});
    }

    const claims = {
      role: profile.role,
      businessId: profile.businessId || null,
      mustChangePassword: Boolean(profile.mustChangePassword),
      admin: profile.role === "SUPER_ADMIN",
    };

    await this.auth.setCustomUserClaims(verified.uid, claims);
    const customToken = await this.auth.createCustomToken(verified.uid, claims);

    return {
      customToken,
      role: profile.role,
      businessId: profile.businessId || null,
      mustChangePassword: Boolean(profile.mustChangePassword),
    };
  }

  async getSessionContext(caller: VerifiedCaller | null): Promise<{
    profile: UserProfileRecord;
    business: BusinessPublicProfile | null;
    access: BusinessAccessRecord | null;
    evaluation: ReturnType<typeof evaluateBusinessAccess> | null;
    publicConfig: PlatformPublicConfig;
  }> {
    if (!caller || caller.isAnonymous) {
      throw new PlatformApiError("unauthenticated", "Sign in required.");
    }
    const profile = await this.store.getDoc<UserProfileRecord>(
      `userProfiles/${caller.uid}`
    );
    if (!profile || !profile.active) {
      throw new PlatformApiError(
        "permission-denied",
        "No active platform membership found for this account."
      );
    }

    const packages = await this.ensureDefaultPackagesSeeded();
    const storedPub = await this.store.getDoc<PlatformPublicConfig>(
      "platform/publicConfig"
    );
    const publicConfig: PlatformPublicConfig = {
      ...(storedPub || DEFAULT_PLATFORM_PUBLIC_CONFIG),
      packages,
    };

    if (profile.role === "SUPER_ADMIN" || !profile.businessId) {
      return {
        profile,
        business: null,
        access: null,
        evaluation: null,
        publicConfig,
      };
    }

    const [business, access] = await Promise.all([
      this.store.getDoc<BusinessPublicProfile>(`businesses/${profile.businessId}`),
      this.store.getDoc<BusinessAccessRecord>(
        `businessAccess/${profile.businessId}`
      ),
    ]);

    const evaluation = access
      ? evaluateBusinessAccess(access, this.clock.now())
      : null;

    return {
      profile,
      business,
      access,
      evaluation,
      publicConfig,
    };
  }

  async completeRequiredPasswordChange(
    caller: VerifiedCaller | null,
    arg2: any
  ): Promise<{ success: true }> {
    if (!caller || caller.isAnonymous) {
      throw new PlatformApiError("unauthenticated", "Authentication required.");
    }
    const profile = await this.store.getDoc<UserProfileRecord>(
      `userProfiles/${caller.uid}`
    );
    if (!profile || !profile.active) {
      throw new PlatformApiError("permission-denied", "Account is not active.");
    }

    let newPassword = "";
    let currentPassword = "";

    if (typeof arg2 === "string") {
      newPassword = arg2;
    } else if (arg2 && typeof arg2 === "object") {
      newPassword = arg2.newPassword || "";
      currentPassword = arg2.currentPassword || "";
    }

    const pwCheck = validatePasswordStrength(newPassword);
    if (!pwCheck.valid) {
      throw new PlatformApiError("invalid-argument", pwCheck.error!);
    }

    if (currentPassword) {
      if (currentPassword === newPassword) {
        throw new PlatformApiError(
          "invalid-argument",
          "New password must be different from your temporary password."
        );
      }
      await this.auth.verifyPasswordWithProvider(
        profile.email,
        currentPassword
      );
    }

    await this.auth.updateUser(caller.uid, { password: newPassword });
    await this.auth.setCustomUserClaims(caller.uid, {
      role: profile.role,
      businessId: profile.businessId || null,
      mustChangePassword: false,
      admin: profile.role === "SUPER_ADMIN",
    });

    const nowMs = this.clock.now();
    await this.store.updateDoc(`userProfiles/${caller.uid}`, {
      mustChangePassword: false,
      updatedAtMs: nowMs,
    });

    await this.writeAuditLog({
      actorUid: caller.uid,
      actorEmail: profile.email,
      actorRole: profile.role,
      businessId: profile.businessId,
      action: "OWNER_PASSWORD_CHANGED",
      summary: `Account ${profile.username} completed mandatory password change.`,
    });

    return { success: true };
  }

  // ============================================================================
  // 3. SUPER ADMIN OPERATIONS
  // ============================================================================

  async getSuperAdminDashboard(caller: VerifiedCaller | null): Promise<{
    metrics: SuperAdminMetrics;
    businesses: SuperAdminBusinessRow[];
    packages: SubscriptionPackage[];
    publicConfig: PlatformPublicConfig;
  }> {
    await this.requireSuperAdmin(caller);
    const nowMs = this.clock.now();
    const currentColomboMonth = getColomboYearMonth(nowMs);

    const packages = await this.ensureDefaultPackagesSeeded();
    const storedConfig = await this.store.getDoc<PlatformPublicConfig>(
      "platform/publicConfig"
    );
    const publicConfig: PlatformPublicConfig = {
      ...(storedConfig || DEFAULT_PLATFORM_PUBLIC_CONFIG),
      packages,
    };

    const [businessesList, accessList, privateList, paymentsList] =
      await Promise.all([
        this.store.listCollection<BusinessPublicProfile>("businesses"),
        this.store.listCollection<BusinessAccessRecord>("businessAccess"),
        this.store.listCollection<BusinessPrivateRecord>("businessPrivate"),
        this.store.listCollection<ManualPaymentRecord>("payments"),
      ]);

    const accessMap = new Map(accessList.map((a) => [a.businessId || a.id, a]));
    const privateMap = new Map(privateList.map((p) => [p.businessId || p.id, p]));

    const rows: SuperAdminBusinessRow[] = [];
    let totalBusinesses = 0;
    let activeBusinesses = 0;
    let expiredBusinesses = 0;
    let suspendedBusinesses = 0;
    let expiringWithin7Days = 0;
    let archivedBusinesses = 0;

    for (const biz of businessesList) {
      const access = accessMap.get(biz.id);
      const priv = privateMap.get(biz.id);
      if (!access || !priv) continue;

      const evaluation = evaluateBusinessAccess(access, nowMs);
      rows.push({
        id: biz.id,
        name: biz.name,
        slug: biz.slug,
        logoUrl: biz.logoUrl || (biz as any).branding?.logoUrl || undefined,
        ownerName: priv.ownerName,
        ownerUsername: priv.ownerUsername,
        ownerEmail: priv.ownerEmail,
        packageId: access.packageId,
        activationDateColombo:
          (access as any).activatedDateColombo || getColomboDateString(access.activatedAtMs),
        expiryDateColombo: access.expiresAtMs ? getColomboDateString(access.expiresAtMs) : null,
        isLifetime: access.isLifetime,
        daysRemaining: evaluation.daysRemaining,
        effectiveStatus: evaluation.effectiveStatus.toUpperCase(),
        status: access.operationalStatus.toUpperCase(),
        business: biz,
        access,
        privateInfo: priv,
        evaluation,
      });

      if (access.operationalStatus === "archived") {
        archivedBusinesses += 1;
        continue;
      }

      totalBusinesses += 1;
      if (access.operationalStatus === "suspended") {
        suspendedBusinesses += 1;
      } else if (!evaluation.subscriptionValidNow) {
        expiredBusinesses += 1;
      } else {
        activeBusinesses += 1;
        if (evaluation.expiringWithin7Days) {
          expiringWithin7Days += 1;
        }
      }
    }

    // Calculate income strictly from recorded payment ledger (NEVER packagePrice * businessCount)
    let paymentsThisMonthMinor = 0;
    let totalPaymentsMinor = 0;
    for (const pay of paymentsList) {
      const amt = Number(pay.amountMinor) || 0;
      if (amt <= 0) continue;
      totalPaymentsMinor += amt;
      if (pay.paymentMonthColombo === currentColomboMonth) {
        paymentsThisMonthMinor += amt;
      }
    }

    rows.sort((a, b) => a.name.localeCompare(b.name));

    return {
      metrics: {
        totalBusinesses,
        activeBusinesses,
        expiredBusinesses,
        suspendedBusinesses,
        expiringWithin7Days,
        paymentsThisMonthMinor,
        totalPaymentsMinor,
        incomeThisMonthRupees: Math.round(paymentsThisMonthMinor / 100),
        incomeTotalRupees: Math.round(totalPaymentsMinor / 100),
        archivedBusinesses,
      },
      businesses: rows,
      packages,
      publicConfig,
    };
  }

  async createBusinessWithOwner(
    caller: VerifiedCaller | null,
    input: {
      businessName: string;
      slug: string;
      ownerName: string;
      username: string;
      ownerEmail: string;
      temporaryPassword: string;
      phone?: string;
      whatsapp?: string;
      address?: string;
      logoUrl?: string;
      primaryColor?: string;
      accentColor?: string;
      packageId: PackageId;
      activationDateColombo: string;
      paymentAmountRupees: number;
      paymentDateColombo: string;
      paymentMethod: PaymentMethod;
      paymentReference?: string;
      paymentNote?: string;
      idempotencyKey: string;
    }
  ): Promise<{
    success?: boolean;
    businessId: string;
    slug: string;
    businessSlug?: string;
    ownerUid: string;
    duplicate?: boolean;
  }> {
    const superAdmin = await this.requireSuperAdmin(caller);
    const nowMs = this.clock.now();

    const effectiveIdem =
      input.idempotencyKey &&
      typeof input.idempotencyKey === "string" &&
      input.idempotencyKey.trim().length >= 8
        ? input.idempotencyKey.trim()
        : `idem_biz_${crypto.randomBytes(8).toString("hex")}`;

    const idemPath = `idempotencyLocks/create_biz_${sha256Short(effectiveIdem)}`;
    const existingIdem = await this.store.getDoc<{
      completed?: boolean;
      businessId: string;
      slug: string;
      ownerUid: string;
    }>(idemPath);
    if (existingIdem?.completed) {
      return {
        success: true,
        businessId: existingIdem.businessId,
        slug: existingIdem.slug,
        businessSlug: existingIdem.slug,
        ownerUid: existingIdem.ownerUid,
        duplicate: true,
      };
    }

    const businessName = (input.businessName || "").trim();
    if (businessName.length < 2 || businessName.length > 80) {
      throw new PlatformApiError(
        "invalid-argument",
        "Business name must be between 2 and 80 characters."
      );
    }

    const rawSlug = (input as any).slug || (input as any).businessSlug || "";
    const slugCheck = validateBusinessSlug(rawSlug);
    if (!slugCheck.valid) {
      throw new PlatformApiError("invalid-argument", slugCheck.error!);
    }

    const ownerName = (input.ownerName || "").trim();
    if (ownerName.length < 2 || ownerName.length > 80) {
      throw new PlatformApiError(
        "invalid-argument",
        "Owner name must be between 2 and 80 characters."
      );
    }

    const uCheck = validateUsername(input.username);
    if (!uCheck.valid) {
      throw new PlatformApiError("invalid-argument", uCheck.error!);
    }

    const eCheck = validateEmailAddress(input.ownerEmail);
    if (!eCheck.valid) {
      throw new PlatformApiError("invalid-argument", eCheck.error!);
    }

    const pwCheck = validatePasswordStrength(input.temporaryPassword);
    if (!pwCheck.valid) {
      throw new PlatformApiError("invalid-argument", pwCheck.error!);
    }

    const isTeaTime = slugCheck.normalized === "teatime";
    const defaultTheme = isTeaTime ? TEATIME_DEFAULT_THEME : MENYO_DEFAULT_THEME;

    const primaryCheck = validateHexColor(
      input.primaryColor || defaultTheme.primaryColor,
      defaultTheme.primaryColor
    );
    if (!primaryCheck.valid) {
      throw new PlatformApiError("invalid-argument", primaryCheck.error!);
    }
    const accentCheck = validateHexColor(
      input.accentColor || defaultTheme.accentColor,
      defaultTheme.accentColor
    );
    if (!accentCheck.valid) {
      throw new PlatformApiError("invalid-argument", accentCheck.error!);
    }
    const bgCheck = validateHexColor(
      (input as any).backgroundColor || defaultTheme.backgroundColor,
      defaultTheme.backgroundColor
    );
    const textCheck = validateHexColor(
      (input as any).textColor || defaultTheme.textColor,
      defaultTheme.textColor
    );
    const headerBgCheck = validateHexColor(
      (input as any).headerBackgroundColor || defaultTheme.headerBackgroundColor,
      defaultTheme.headerBackgroundColor
    );
    const headerTextCheck = validateHexColor(
      (input as any).headerTextColor || defaultTheme.headerTextColor,
      defaultTheme.headerTextColor
    );

    if (!isValidPackageId(input.packageId)) {
      throw new PlatformApiError("invalid-argument", "Invalid package selected.");
    }

    let windowCalc: ReturnType<typeof computeInitialSubscriptionWindow>;
    const activationDateColombo =
      input.activationDateColombo || getColomboDateString(nowMs);
    try {
      windowCalc = computeInitialSubscriptionWindow({
        packageId: input.packageId,
        activationDateColombo,
        serverNowMs: nowMs,
      });
    } catch (err: any) {
      throw new PlatformApiError(
        "invalid-argument",
        err?.message || "Invalid activation date."
      );
    }

    let paymentTimestampMs: number;
    const paymentDateColombo =
      input.paymentDateColombo || getColomboDateString(nowMs);
    try {
      paymentTimestampMs = parseColomboCalendarDateStartMs(paymentDateColombo);
    } catch (err: any) {
      throw new PlatformApiError(
        "invalid-argument",
        `Payment date invalid: ${err?.message || "Use YYYY-MM-DD"}`
      );
    }

    const amountNum = Number(input.paymentAmountRupees);
    if (!Number.isFinite(amountNum) || amountNum < 0 || amountNum > 10_000_000) {
      throw new PlatformApiError(
        "invalid-argument",
        "Payment amount must be a valid non-negative LKR amount."
      );
    }
    const paymentAmountMinor = Math.round(amountNum * 100);

    const paymentMethod = input.paymentMethod || "CASH";
    if (!ALLOWED_PAYMENT_METHODS.includes(paymentMethod)) {
      throw new PlatformApiError("invalid-argument", "Invalid payment method.");
    }

    const packages = await this.ensureDefaultPackagesSeeded();
    const pkg =
      packages.find((p) => p.id === input.packageId) ||
      DEFAULT_PACKAGES.find((p) => p.id === input.packageId)!;

    const businessId = generateId("biz");

    // Step 1: Atomic reservation of slug & username
    await this.store.runTransaction(async (tx) => {
      const idemSnap = await tx.getDoc<{ completed?: boolean }>(idemPath);
      if (idemSnap?.completed) {
        throw new PlatformApiError(
          "already-exists",
          "Request already processed."
        );
      }

      const existingSlug = await tx.getDoc(`businessSlugs/${slugCheck.normalized}`);
      if (existingSlug) {
        throw new PlatformApiError(
          "already-exists",
          `The business slug "${slugCheck.normalized}" is already taken.`
        );
      }

      const existingUser = await tx.getDoc(`usernames/${uCheck.normalized}`);
      if (existingUser) {
        throw new PlatformApiError(
          "already-exists",
          `The username "${uCheck.normalized}" is already taken.`
        );
      }

      tx.setDoc(`businessSlugs/${slugCheck.normalized}`, {
        slug: slugCheck.normalized,
        businessId,
        isAlias: false,
        canonicalSlug: slugCheck.normalized,
        createdAtMs: nowMs,
      });

      tx.setDoc(`usernames/${uCheck.normalized}`, {
        username: uCheck.normalized,
        uid: "PROVISIONING",
        email: eCheck.normalized,
        role: "BUSINESS_OWNER",
        businessId,
        createdAtMs: nowMs,
      });

      tx.setDoc(`businessPrivate/${businessId}`, {
        businessId,
        ownerUid: "PROVISIONING",
        ownerName,
        ownerUsername: uCheck.normalized,
        ownerEmail: eCheck.normalized,
        provisioningState: "provisioning",
        createdAtMs: nowMs,
        updatedAtMs: nowMs,
      });
    });

    // Step 2: Provision Firebase Auth Owner User
    let ownerUid = "";
    try {
      const created = await this.auth.createUser({
        email: eCheck.normalized,
        password: input.temporaryPassword,
        displayName: ownerName,
      });
      ownerUid = created.uid;

      await this.auth.setCustomUserClaims(ownerUid, {
        role: "BUSINESS_OWNER",
        businessId,
        mustChangePassword: true,
        admin: false,
      });
    } catch (authErr) {
      // Clean rollback of reserved slug, username, and provisioning doc
      await Promise.all([
        this.store.deleteDoc(`businessSlugs/${slugCheck.normalized}`).catch(() => {}),
        this.store.deleteDoc(`usernames/${uCheck.normalized}`).catch(() => {}),
        this.store.deleteDoc(`businessPrivate/${businessId}`).catch(() => {}),
      ]);
      throw authErr;
    }

    // Step 3: Commit tenant storefront, access gate, subscription, payment & starter table
    const subId = generateId("sub");
    const payId = paymentAmountMinor > 0 ? generateId("pay") : null;
    const starterTableId = "tbl_01";
    const starterTableToken = generateTableToken();

    try {
      await this.store.runTransaction(async (tx) => {
        const publicProfile: BusinessPublicProfile = {
          id: businessId,
          slug: slugCheck.normalized,
          name: businessName,
          tagline: "Scan. Pick. Enjoy.",
          logoUrl: (input.logoUrl || "").trim().slice(0, 500),
          primaryColor: primaryCheck.normalized,
          accentColor: accentCheck.normalized,
          backgroundColor: bgCheck.normalized,
          textColor: textCheck.normalized,
          headerBackgroundColor: headerBgCheck.normalized,
          headerTextColor: headerTextCheck.normalized,
          phone: (input.phone || "").trim().slice(0, 40),
          whatsapp: (input.whatsapp || "").trim().slice(0, 40),
          address: (input.address || "").trim().slice(0, 240),
          openingHours: "8:00 AM – 10:00 PM",
          currencyCode: "LKR",
          currencySymbol: "Rs.",
          socialLinks: {},
          isOrderingPaused: false,
          pauseMessage:
            "New orders are temporarily paused by staff. Please check back shortly.",
        };

        const accessRecord: BusinessAccessRecord = {
          businessId,
          operationalStatus: "ACTIVE",
          packageId: pkg.id,
          packageNameSnapshot: pkg.name,
          packagePriceMinorSnapshot: pkg.priceMinor,
          isLifetime: windowCalc.isLifetime,
          activatedAtMs: windowCalc.activatedAtMs,
          startsAtMs: windowCalc.startsAtMs,
          expiresAtMs: windowCalc.expiresAtMs,
          suspendReason: null,
          suspendedAtMs: null,
          archivedAtMs: null,
        };

        const privateRecord: BusinessPrivateRecord = {
          businessId,
          ownerUid,
          ownerName,
          ownerUsername: uCheck.normalized,
          ownerEmail: eCheck.normalized,
          provisioningState: "ready",
        };

        const userProfile: UserProfileRecord = {
          uid: ownerUid,
          role: "BUSINESS_OWNER",
          businessId,
          username: uCheck.normalized,
          displayName: ownerName,
          email: eCheck.normalized,
          mustChangePassword: true,
          active: true,
        };

        const subRecord: SubscriptionHistoryRecord = {
          id: subId,
          businessId,
          packageId: pkg.id,
          packageNameSnapshot: pkg.name,
          priceMinorSnapshot: pkg.priceMinor,
          currency: "LKR",
          isLifetime: windowCalc.isLifetime,
          actionType: "initial",
          activatedAtMs: windowCalc.activatedAtMs,
          startsAtMs: windowCalc.startsAtMs,
          expiresAtMs: windowCalc.expiresAtMs,
          paymentId: payId,
          recordedByUid: superAdmin.uid,
          note: (input.paymentNote || "").trim().slice(0, 240),
          createdAtMs: nowMs,
        };

        tx.setDoc(`businesses/${businessId}`, {
          ...publicProfile,
          createdAtMs: nowMs,
          updatedAtMs: nowMs,
        });
        tx.setDoc(`businessAccess/${businessId}`, {
          ...accessRecord,
          updatedAtMs: nowMs,
        });
        tx.setDoc(`businessPrivate/${businessId}`, {
          ...privateRecord,
          createdAtMs: nowMs,
          updatedAtMs: nowMs,
        });
        tx.setDoc(`userProfiles/${ownerUid}`, {
          ...userProfile,
          createdAtMs: nowMs,
          updatedAtMs: nowMs,
        });
        tx.setDoc(`usernames/${uCheck.normalized}`, {
          username: uCheck.normalized,
          uid: ownerUid,
          email: eCheck.normalized,
          role: "BUSINESS_OWNER",
          businessId,
          createdAtMs: nowMs,
        });
        tx.setDoc(`subscriptions/${subId}`, subRecord);

        if (payId) {
          const paymentRecord: ManualPaymentRecord = {
            id: payId,
            businessId,
            businessNameSnapshot: businessName,
            businessSlugSnapshot: slugCheck.normalized,
            subscriptionId: subId,
            packageId: pkg.id,
            packageNameSnapshot: pkg.name,
            amountMinor: paymentAmountMinor,
            currency: "LKR",
            paymentDateColombo,
            paymentMonthColombo: getColomboYearMonth(paymentTimestampMs),
            paymentTimestampMs,
            method: paymentMethod,
            reference: (input.paymentReference || "").trim().slice(0, 120),
            note: (input.paymentNote || "").trim().slice(0, 240),
            idempotencyKey: effectiveIdem,
            recordedByUid: superAdmin.uid,
            createdAtMs: nowMs,
          };
          tx.setDoc(`payments/${payId}`, paymentRecord);
        }

        // Provision starter Table 01 & opaque token
        tx.setDoc(`businesses/${businessId}/tables/${starterTableId}`, {
          id: starterTableId,
          businessId,
          number: "Table 01",
          tableNumber: "Table 01",
          token: starterTableToken,
          active: true,
          isArchived: false,
          createdAtMs: nowMs,
          updatedAtMs: nowMs,
        });
        tx.setDoc(`businesses/${businessId}/tableTokens/${starterTableToken}`, {
          token: starterTableToken,
          tableId: starterTableId,
          number: "Table 01",
          tableNumber: "Table 01",
          businessId,
          active: true,
          updatedAtMs: nowMs,
        });
        tx.setDoc(`businesses/${businessId}/counters/orders`, {
          lastOrderNumber: 1000,
          updatedAtMs: nowMs,
        });

        tx.setDoc(idemPath, {
          completed: true,
          businessId,
          slug: slugCheck.normalized,
          ownerUid,
          createdAtMs: nowMs,
        });
      });

      await this.writeAuditLog({
        actorUid: superAdmin.uid,
        actorEmail: superAdmin.email,
        actorRole: "SUPER_ADMIN",
        businessId,
        action: "BUSINESS_CREATED",
        summary: `Created business "${businessName}" (/${slugCheck.normalized}) with package ${pkg.name}`,
        metadata: {
          slug: slugCheck.normalized,
          ownerUsername: uCheck.normalized,
          packageId: pkg.id,
          paymentAmountMinor,
        },
      });

      return {
        success: true,
        businessId,
        slug: slugCheck.normalized,
        businessSlug: slugCheck.normalized,
        ownerUid,
        duplicate: false,
      };
    } catch (dbErr) {
      // Rollback Auth user + reservations on transaction failure
      try {
        await this.auth.deleteUser(ownerUid);
        await Promise.all([
          this.store.deleteDoc(`businessSlugs/${slugCheck.normalized}`).catch(() => {}),
          this.store.deleteDoc(`usernames/${uCheck.normalized}`).catch(() => {}),
          this.store.deleteDoc(`businessPrivate/${businessId}`).catch(() => {}),
        ]);
      } catch {
        await this.store
          .setDoc(
            `businessPrivate/${businessId}`,
            { ownerUid, provisioningState: "failed_recoverable", updatedAtMs: nowMs },
            { merge: true }
          )
          .catch(() => {});
      }
      throw dbErr;
    }
  }

  async getBusinessDetailsForSuperAdmin(
    caller: VerifiedCaller | null,
    businessId: string
  ): Promise<{
    business: BusinessPublicProfile;
    access: BusinessAccessRecord;
    privateInfo: BusinessPrivateRecord;
    ownerProfile: UserProfileRecord | null;
    evaluation: ReturnType<typeof evaluateBusinessAccess>;
    subscriptions: SubscriptionHistoryRecord[];
    payments: ManualPaymentRecord[];
    auditLogs: AuditLogRecord[];
    counts: {
      products: number;
      categories: number;
      tables: number;
      orders: number;
    };
  }> {
    await this.requireSuperAdmin(caller);
    const [business, access, privateInfo] = await Promise.all([
      this.store.getDoc<BusinessPublicProfile>(`businesses/${businessId}`),
      this.store.getDoc<BusinessAccessRecord>(`businessAccess/${businessId}`),
      this.store.getDoc<BusinessPrivateRecord>(`businessPrivate/${businessId}`),
    ]);

    if (!business || !access || !privateInfo) {
      throw new PlatformApiError("not-found", "Business not found.");
    }

    const [
      ownerProfile,
      allSubs,
      allPayments,
      allAudits,
      productsCount,
      categoriesCount,
      tablesCount,
      ordersCount,
    ] = await Promise.all([
      privateInfo.ownerUid
        ? this.store.getDoc<UserProfileRecord>(`userProfiles/${privateInfo.ownerUid}`)
        : Promise.resolve(null),
      this.store.listCollection<SubscriptionHistoryRecord>("subscriptions"),
      this.store.listCollection<ManualPaymentRecord>("payments"),
      this.store.listCollection<AuditLogRecord>("auditLogs"),
      this.store.countCollection(`businesses/${businessId}/products`),
      this.store.countCollection(`businesses/${businessId}/categories`),
      this.store.countCollection(`businesses/${businessId}/tables`),
      this.store.countCollection(`businesses/${businessId}/orders`),
    ]);

    const subscriptions = allSubs
      .filter((s) => s.businessId === businessId)
      .sort((a, b) => (b.createdAtMs || 0) - (a.createdAtMs || 0));

    const payments = allPayments
      .filter((p) => p.businessId === businessId)
      .sort((a, b) => (b.createdAtMs || 0) - (a.createdAtMs || 0));

    const auditLogs = allAudits
      .filter((a) => a.businessId === businessId)
      .sort((a, b) => (b.createdAtMs || 0) - (a.createdAtMs || 0));

    return {
      business,
      access,
      privateInfo,
      ownerProfile,
      evaluation: evaluateBusinessAccess(access, this.clock.now()),
      subscriptions,
      payments,
      auditLogs,
      counts: {
        products: productsCount,
        categories: categoriesCount,
        tables: tablesCount,
        orders: ordersCount,
      },
    };
  }

  async updateBusinessBySuperAdmin(
    caller: VerifiedCaller | null,
    input: {
      businessId: string;
      name: string;
      newSlug?: string;
      phone?: string;
      whatsapp?: string;
      address?: string;
      logoUrl?: string;
      primaryColor?: string;
      accentColor?: string;
      internalNotes?: string;
    }
  ): Promise<{ slug: string }> {
    const superAdmin = await this.requireSuperAdmin(caller);
    const nowMs = this.clock.now();

    const business = await this.store.getDoc<BusinessPublicProfile>(
      `businesses/${input.businessId}`
    );
    if (!business) {
      throw new PlatformApiError("not-found", "Business not found.");
    }

    const name = (input.name !== undefined ? input.name : (business.name || "")).trim();
    if (name.length < 2 || name.length > 80) {
      throw new PlatformApiError(
        "invalid-argument",
        "Business name must be between 2 and 80 characters."
      );
    }

    const pColor = validateHexColor(
      input.primaryColor || business.primaryColor,
      business.primaryColor
    );
    if (!pColor.valid) throw new PlatformApiError("invalid-argument", pColor.error!);
    const aColor = validateHexColor(
      input.accentColor || business.accentColor,
      business.accentColor
    );
    if (!aColor.valid) throw new PlatformApiError("invalid-argument", aColor.error!);

    let targetSlug = business.slug;
    const requestedSlug = input.newSlug
      ? normalizeBusinessSlug(input.newSlug)
      : business.slug;

    if (requestedSlug !== business.slug) {
      const sCheck = validateBusinessSlug(requestedSlug);
      if (!sCheck.valid) {
        throw new PlatformApiError("invalid-argument", sCheck.error!);
      }
      targetSlug = sCheck.normalized;
    }

    await this.store.runTransaction(async (tx) => {
      if (targetSlug !== business.slug) {
        const existingTarget = await tx.getDoc<{ businessId: string }>(
          `businessSlugs/${targetSlug}`
        );
        if (existingTarget && existingTarget.businessId !== business.id) {
          throw new PlatformApiError(
            "already-exists",
            `Slug "${targetSlug}" is already assigned to another business.`
          );
        }

        // Convert old slug into an explicit redirect alias and update any prior aliases
        tx.setDoc(`businessSlugs/${business.slug}`, {
          slug: business.slug,
          businessId: business.id,
          isAlias: true,
          canonicalSlug: targetSlug,
          updatedAtMs: nowMs,
        });

        tx.setDoc(`businessSlugs/${targetSlug}`, {
          slug: targetSlug,
          businessId: business.id,
          isAlias: false,
          canonicalSlug: targetSlug,
          createdAtMs: nowMs,
          updatedAtMs: nowMs,
        });
      }

      tx.updateDoc(`businesses/${business.id}`, {
        name,
        slug: targetSlug,
        phone: (input.phone ?? business.phone).trim().slice(0, 40),
        whatsapp: (input.whatsapp ?? business.whatsapp).trim().slice(0, 40),
        address: (input.address ?? business.address).trim().slice(0, 240),
        logoUrl: (input.logoUrl ?? business.logoUrl).trim().slice(0, 500),
        primaryColor: pColor.normalized,
        accentColor: aColor.normalized,
        updatedAtMs: nowMs,
      });

      if (input.internalNotes !== undefined) {
        tx.updateDoc(`businessPrivate/${business.id}`, {
          internalNotes: input.internalNotes.trim().slice(0, 1000),
          updatedAtMs: nowMs,
        });
      }
    });

    await this.writeAuditLog({
      actorUid: superAdmin.uid,
      actorEmail: superAdmin.email,
      actorRole: "SUPER_ADMIN",
      businessId: business.id,
      action:
        targetSlug !== business.slug ? "BUSINESS_SLUG_CHANGED" : "BUSINESS_UPDATED",
      summary:
        targetSlug !== business.slug
          ? `Updated business "${name}" and aliased slug /${business.slug} -> /${targetSlug}`
          : `Updated business profile for "${name}"`,
      metadata: {
        previousSlug: business.slug,
        currentSlug: targetSlug,
      },
    });

    return { slug: targetSlug };
  }

  async renewOrChangeSubscription(
    caller: VerifiedCaller | null,
    input: {
      businessId: string;
      packageId: PackageId;
      explicitActivationDateColombo?: string;
      paymentAmountRupees: number;
      paymentDateColombo: string;
      paymentMethod: PaymentMethod;
      paymentReference?: string;
      paymentNote?: string;
      reactivateIfSuspended?: boolean;
      idempotencyKey: string;
    }
  ): Promise<{
    subscriptionId: string;
    paymentId: string | null;
    expiresAtMs: number | null;
    isLifetime: boolean;
    duplicate?: boolean;
  }> {
    const superAdmin = await this.requireSuperAdmin(caller);
    const nowMs = this.clock.now();

    if (!input.idempotencyKey || input.idempotencyKey.trim().length < 8) {
      throw new PlatformApiError(
        "invalid-argument",
        "Valid idempotencyKey is required."
      );
    }

    const idemPath = `idempotencyLocks/renew_${sha256Short(
      input.idempotencyKey.trim()
    )}`;
    const existingIdem = await this.store.getDoc<{
      completed?: boolean;
      subscriptionId: string;
      paymentId: string | null;
      expiresAtMs: number | null;
      isLifetime: boolean;
    }>(idemPath);
    if (existingIdem?.completed) {
      return { ...existingIdem, duplicate: true };
    }

    if (!isValidPackageId(input.packageId)) {
      throw new PlatformApiError("invalid-argument", "Invalid package selected.");
    }

    const amountNum = Number(input.paymentAmountRupees);
    if (!Number.isFinite(amountNum) || amountNum < 0 || amountNum > 10_000_000) {
      throw new PlatformApiError(
        "invalid-argument",
        "Payment amount must be a valid non-negative LKR amount."
      );
    }
    const paymentAmountMinor = Math.round(amountNum * 100);

    if (!ALLOWED_PAYMENT_METHODS.includes(input.paymentMethod)) {
      throw new PlatformApiError("invalid-argument", "Invalid payment method.");
    }

    let paymentTimestampMs: number;
    try {
      paymentTimestampMs = parseColomboCalendarDateStartMs(
        input.paymentDateColombo
      );
    } catch (err: any) {
      throw new PlatformApiError(
        "invalid-argument",
        `Invalid payment date: ${err?.message || "Use YYYY-MM-DD"}`
      );
    }

    const packages = await this.ensureDefaultPackagesSeeded();
    const pkg =
      packages.find((p) => p.id === input.packageId) ||
      DEFAULT_PACKAGES.find((p) => p.id === input.packageId)!;

    const subId = generateId("sub");
    const payId = paymentAmountMinor > 0 ? generateId("pay") : null;

    const txResult = await this.store.runTransaction(async (tx) => {
      const idemCheck = await tx.getDoc<{ completed?: boolean }>(idemPath);
      if (idemCheck?.completed) {
        throw new PlatformApiError(
          "already-exists",
          "Renewal request already processed."
        );
      }

      const business = await tx.getDoc<BusinessPublicProfile>(
        `businesses/${input.businessId}`
      );
      const access = await tx.getDoc<BusinessAccessRecord>(
        `businessAccess/${input.businessId}`
      );
      if (!business || !access) {
        throw new PlatformApiError("not-found", "Business not found.");
      }

      if (access.operationalStatus === "archived") {
        throw new PlatformApiError(
          "failed-precondition",
          "Cannot renew an archived business. Unarchive/reactivate it first."
        );
      }

      let windowCalc: ReturnType<typeof computeRenewalSubscriptionWindow>;
      try {
        windowCalc = computeRenewalSubscriptionWindow({
          currentIsLifetime: access.isLifetime,
          currentExpiresAtMs: access.expiresAtMs,
          newPackageId: input.packageId,
          serverNowMs: nowMs,
          explicitActivationDateColombo: input.explicitActivationDateColombo,
        });
      } catch (calcErr: any) {
        throw new PlatformApiError(
          "invalid-argument",
          calcErr?.message || "Invalid subscription renewal period."
        );
      }

      const nextOpStatus: BusinessOperationalStatus =
        input.reactivateIfSuspended && access.operationalStatus === "suspended"
          ? "active"
          : access.operationalStatus;

      tx.updateDoc(`businessAccess/${input.businessId}`, {
        operationalStatus: nextOpStatus,
        packageId: pkg.id,
        packageNameSnapshot: pkg.name,
        packagePriceMinorSnapshot: pkg.priceMinor,
        isLifetime: windowCalc.isLifetime,
        activatedAtMs: windowCalc.activatedAtMs,
        startsAtMs: windowCalc.startsAtMs,
        expiresAtMs: windowCalc.expiresAtMs,
        ...(nextOpStatus === "active"
          ? { suspendReason: null, suspendedAtMs: null }
          : {}),
        updatedAtMs: nowMs,
      });

      const subRecord: SubscriptionHistoryRecord = {
        id: subId,
        businessId: input.businessId,
        packageId: pkg.id,
        packageNameSnapshot: pkg.name,
        priceMinorSnapshot: pkg.priceMinor,
        currency: "LKR",
        isLifetime: windowCalc.isLifetime,
        actionType: windowCalc.actionType,
        activatedAtMs: windowCalc.activatedAtMs,
        startsAtMs: windowCalc.startsAtMs,
        expiresAtMs: windowCalc.expiresAtMs,
        paymentId: payId,
        recordedByUid: superAdmin.uid,
        note: (input.paymentNote || "").trim().slice(0, 240),
        createdAtMs: nowMs,
      };
      tx.setDoc(`subscriptions/${subId}`, subRecord);

      if (payId) {
        const payRecord: ManualPaymentRecord = {
          id: payId,
          businessId: input.businessId,
          businessNameSnapshot: business.name,
          businessSlugSnapshot: business.slug,
          subscriptionId: subId,
          packageId: pkg.id,
          packageNameSnapshot: pkg.name,
          amountMinor: paymentAmountMinor,
          currency: "LKR",
          paymentDateColombo: input.paymentDateColombo.trim(),
          paymentMonthColombo: getColomboYearMonth(paymentTimestampMs),
          paymentTimestampMs,
          method: input.paymentMethod,
          reference: (input.paymentReference || "").trim().slice(0, 120),
          note: (input.paymentNote || "").trim().slice(0, 240),
          idempotencyKey: input.idempotencyKey.trim(),
          recordedByUid: superAdmin.uid,
          createdAtMs: nowMs,
        };
        tx.setDoc(`payments/${payId}`, payRecord);
      }

      const out = {
        subscriptionId: subId,
        paymentId: payId,
        expiresAtMs: windowCalc.expiresAtMs,
        isLifetime: windowCalc.isLifetime,
        businessName: business.name,
      };
      tx.setDoc(idemPath, { completed: true, ...out, createdAtMs: nowMs });
      return out;
    });

    await this.writeAuditLog({
      actorUid: superAdmin.uid,
      actorEmail: superAdmin.email,
      actorRole: "SUPER_ADMIN",
      businessId: input.businessId,
      action: "SUBSCRIPTION_RENEWED",
      summary: `Renewed "${txResult.businessName}" on ${pkg.name} (Rs. ${Math.round(
        paymentAmountMinor / 100
      ).toLocaleString("en-LK")})`,
      metadata: {
        packageId: pkg.id,
        expiresAtMs: txResult.expiresAtMs,
        isLifetime: txResult.isLifetime,
        paymentAmountMinor,
      },
    });

    return {
      subscriptionId: txResult.subscriptionId,
      paymentId: txResult.paymentId,
      expiresAtMs: txResult.expiresAtMs,
      isLifetime: txResult.isLifetime,
    };
  }

  async setBusinessOperationalStatus(
    caller: VerifiedCaller | null,
    arg2: any,
    arg3?: any,
    arg4?: any
  ): Promise<{ status: BusinessOperationalStatus }> {
    const superAdmin = await this.requireSuperAdmin(caller);
    const nowMs = this.clock.now();

    let businessId: string;
    let statusRaw: string;
    let reason: string | undefined;

    if (typeof arg2 === "string") {
      businessId = arg2;
      statusRaw = arg3;
      reason = arg4;
    } else {
      businessId = arg2?.businessId;
      statusRaw = arg2?.status;
      reason = arg2?.reason;
    }

    const lowerStatus = (statusRaw || "").toLowerCase();
    if (!["active", "suspended", "archived"].includes(lowerStatus)) {
      throw new PlatformApiError("invalid-argument", "Invalid operational status.");
    }
    const storedStatus = (statusRaw.toUpperCase() === "ACTIVE" ? "ACTIVE" : statusRaw.toUpperCase() === "SUSPENDED" ? "SUSPENDED" : "ARCHIVED") as BusinessOperationalStatus;

    const [business, access] = await Promise.all([
      this.store.getDoc<BusinessPublicProfile>(`businesses/${businessId}`),
      this.store.getDoc<BusinessAccessRecord>(`businessAccess/${businessId}`),
    ]);

    if (!business || !access) {
      throw new PlatformApiError("not-found", "Business not found.");
    }

    await this.store.updateDoc(`businessAccess/${businessId}`, {
      operationalStatus: storedStatus,
      suspendReason:
        lowerStatus === "suspended"
          ? (reason || "Suspended by platform administrator")
              .trim()
              .slice(0, 240)
          : null,
      suspendedAtMs: lowerStatus === "suspended" ? nowMs : null,
      archivedAtMs: lowerStatus === "archived" ? nowMs : null,
      updatedAtMs: nowMs,
    });

    const actionMap: Record<string, string> = {
      active: "BUSINESS_REACTIVATED",
      suspended: "BUSINESS_SUSPENDED",
      archived: "BUSINESS_ARCHIVED",
    };

    await this.writeAuditLog({
      actorUid: superAdmin.uid,
      actorEmail: superAdmin.email,
      actorRole: "SUPER_ADMIN",
      businessId,
      action: actionMap[lowerStatus],
      summary: `Set operational status of "${business.name}" to ${storedStatus}`,
      metadata: {
        previousStatus: access.operationalStatus,
        newStatus: storedStatus,
        reason: reason ? reason.slice(0, 240) : null,
      },
    });

    return { status: storedStatus };
  }

  async resetOwnerAccess(
    caller: VerifiedCaller | null,
    input: {
      businessId: string;
      temporaryPassword: string;
      newOwnerEmail?: string;
      newUsername?: string;
    }
  ): Promise<{ ownerUid: string; mustChangePassword: true }> {
    const superAdmin = await this.requireSuperAdmin(caller);
    const nowMs = this.clock.now();

    const pwCheck = validatePasswordStrength(input.temporaryPassword);
    if (!pwCheck.valid) {
      throw new PlatformApiError("invalid-argument", pwCheck.error!);
    }

    const priv = await this.store.getDoc<BusinessPrivateRecord>(
      `businessPrivate/${input.businessId}`
    );
    if (!priv || !priv.ownerUid) {
      throw new PlatformApiError("not-found", "Business owner record not found.");
    }

    const ownerProfile = await this.store.getDoc<UserProfileRecord>(
      `userProfiles/${priv.ownerUid}`
    );
    if (!ownerProfile) {
      throw new PlatformApiError("not-found", "Owner user profile not found.");
    }

    let nextEmail = ownerProfile.email;
    if (input.newOwnerEmail && input.newOwnerEmail.trim()) {
      const eCheck = validateEmailAddress(input.newOwnerEmail);
      if (!eCheck.valid) {
        throw new PlatformApiError("invalid-argument", eCheck.error!);
      }
      nextEmail = eCheck.normalized;
    }

    let nextUsername = ownerProfile.username;
    if (input.newUsername && input.newUsername.trim()) {
      const uCheck = validateUsername(input.newUsername);
      if (!uCheck.valid) {
        throw new PlatformApiError("invalid-argument", uCheck.error!);
      }
      nextUsername = uCheck.normalized;
    }

    if (nextUsername !== ownerProfile.username) {
      await this.store.runTransaction(async (tx) => {
        const existingU = await tx.getDoc<{ uid: string }>(
          `usernames/${nextUsername}`
        );
        if (existingU && existingU.uid !== priv.ownerUid) {
          throw new PlatformApiError(
            "already-exists",
            `Username "${nextUsername}" is already taken.`
          );
        }
        tx.deleteDoc(`usernames/${ownerProfile.username}`);
        tx.setDoc(`usernames/${nextUsername}`, {
          username: nextUsername,
          uid: priv.ownerUid,
          email: nextEmail,
          role: "BUSINESS_OWNER",
          businessId: input.businessId,
          createdAtMs: nowMs,
        });
      });
    } else if (nextEmail !== ownerProfile.email) {
      await this.store.updateDoc(`usernames/${nextUsername}`, {
        email: nextEmail,
        updatedAtMs: nowMs,
      });
    }

    await this.auth.updateUser(priv.ownerUid, {
      email: nextEmail !== ownerProfile.email ? nextEmail : undefined,
      password: input.temporaryPassword,
      disabled: false,
    });

    await this.auth.setCustomUserClaims(priv.ownerUid, {
      role: "BUSINESS_OWNER",
      businessId: input.businessId,
      mustChangePassword: true,
      admin: false,
    });
    await this.auth.revokeRefreshTokens(priv.ownerUid);

    await Promise.all([
      this.store.updateDoc(`userProfiles/${priv.ownerUid}`, {
        email: nextEmail,
        username: nextUsername,
        mustChangePassword: true,
        active: true,
        updatedAtMs: nowMs,
      }),
      this.store.updateDoc(`businessPrivate/${input.businessId}`, {
        ownerEmail: nextEmail,
        ownerUsername: nextUsername,
        updatedAtMs: nowMs,
      }),
    ]);

    await this.writeAuditLog({
      actorUid: superAdmin.uid,
      actorEmail: superAdmin.email,
      actorRole: "SUPER_ADMIN",
      businessId: input.businessId,
      action: "OWNER_ACCESS_RESET",
      summary: `Reset temporary password & forced first-login password change for owner ${nextUsername}`,
      metadata: {
        ownerUid: priv.ownerUid,
        username: nextUsername,
      },
    });

    return { ownerUid: priv.ownerUid, mustChangePassword: true };
  }

  async updatePlatformPackagesAndSettings(
    caller: VerifiedCaller | null,
    input: {
      packagePricesRupees?: Partial<Record<PackageId, number>>;
      supportEmail?: string;
      supportPhone?: string;
      supportWhatsApp?: string;
    }
  ): Promise<PlatformPublicConfig> {
    const superAdmin = await this.requireSuperAdmin(caller);
    const nowMs = this.clock.now();

    if (input && (input as any).packages && Array.isArray((input as any).packages)) {
      if (!input.packagePricesRupees) {
        input.packagePricesRupees = {};
      }
      for (const p of (input as any).packages) {
        if (p.priceRupees !== undefined) {
          input.packagePricesRupees[p.id as PackageId] = p.priceRupees;
        } else if (p.priceDisplay !== undefined) {
          input.packagePricesRupees[p.id as PackageId] = p.priceDisplay;
        } else if (p.priceMinor !== undefined) {
          input.packagePricesRupees[p.id as PackageId] = Math.round(p.priceMinor / 100);
        }
      }
    }

    const currentPackages = await this.ensureDefaultPackagesSeeded();
    const updatedPackages: SubscriptionPackage[] = [];

    for (const pkg of currentPackages) {
      const candidateRupees = input.packagePricesRupees?.[pkg.id];
      if (candidateRupees !== undefined) {
        const isTrialPkg = pkg.id === "2_days_trial" || pkg.id === "trial";
        const priceCheck = validateLkrPriceRupees(candidateRupees, isTrialPkg);
        if (!priceCheck.valid) {
          throw new PlatformApiError(
            "invalid-argument",
            `${pkg.name}: ${priceCheck.error}`
          );
        }
        const nextPkg: SubscriptionPackage = {
          ...pkg,
          priceMinor: priceCheck.priceMinor,
          priceDisplay: priceCheck.priceDisplay,
        };
        await this.store.setDoc(
          `packages/${pkg.id}`,
          { ...nextPkg, updatedAtMs: nowMs },
          { merge: true }
        );
        updatedPackages.push(nextPkg);
      } else {
        updatedPackages.push(pkg);
      }
    }

    const existingPub =
      (await this.store.getDoc<PlatformPublicConfig>("platform/publicConfig")) ||
      DEFAULT_PLATFORM_PUBLIC_CONFIG;

    const supportEmail = (input.supportEmail ?? existingPub.supportEmail)
      .trim()
      .slice(0, 160);
    if (supportEmail) {
      const check = validateEmailAddress(supportEmail);
      if (!check.valid) {
        throw new PlatformApiError("invalid-argument", `Support email: ${check.error}`);
      }
    }

    const nextConfig: PlatformPublicConfig = {
      platformName: "Menyo",
      productTitle: "Menyo — by AEVONIX",
      tagline: "Your Menu. One Scan.",
      supportEmail,
      supportPhone: (input.supportPhone ?? (input as any).salesContactPhone ?? existingPub.supportPhone)
        .trim()
        .slice(0, 40),
      supportWhatsApp: (input.supportWhatsApp ?? (input as any).salesContactWhatsapp ?? existingPub.supportWhatsApp)
        .trim()
        .slice(0, 40),
      packages: updatedPackages,
    };

    await Promise.all([
      this.store.setDoc("platform/publicConfig", {
        ...nextConfig,
        updatedAtMs: nowMs,
      }),
      this.store.setDoc("platformSettings/public", {
        ...nextConfig,
        updatedAtMs: nowMs,
      }),
    ]);

    await this.writeAuditLog({
      actorUid: superAdmin.uid,
      actorEmail: superAdmin.email,
      actorRole: "SUPER_ADMIN",
      action: "PLATFORM_SETTINGS_UPDATED",
      summary: "Updated central package pricing / platform support contact settings.",
      metadata: {
        pricesMinor: Object.fromEntries(
          updatedPackages.map((p) => [p.id, p.priceMinor])
        ),
        supportEmail: nextConfig.supportEmail,
        supportPhone: nextConfig.supportPhone,
      },
    });

    return nextConfig;
  }

  // ============================================================================
  // 4. BUSINESS OWNER OPERATIONS (TENANT-SCOPED + SUBSCRIPTION-ENFORCED)
  // ============================================================================

  async ownerUpsertCategory(
    caller: VerifiedCaller | null,
    input: {
      businessId?: string;
      id?: string;
      name: string;
      iconUrl?: string;
      displayOrder?: number;
      isVisible?: boolean;
    }
  ): Promise<Category> {
    const { businessId } = await this.requireBusinessOwner(caller, {
      clientSubmittedBusinessId: input.businessId,
      requireActiveSubscription: true,
    });

    const name = (input.name || "").trim();
    if (!name || name.length > 60) {
      throw new PlatformApiError(
        "invalid-argument",
        "Category name must be between 1 and 60 characters."
      );
    }

    const nowMs = this.clock.now();
    const catId =
      input.id && input.id.trim()
        ? input.id.trim()
        : `cat_${normalizeBusinessSlug(name) || crypto.randomBytes(4).toString("hex")}`;

    const existing = await this.store.getDoc<Category>(
      `businesses/${businessId}/categories/${catId}`
    );

    const category: Category = {
      id: catId,
      businessId,
      name,
      slug: normalizeBusinessSlug(name) || catId,
      displayOrder:
        typeof input.displayOrder === "number"
          ? Math.floor(input.displayOrder)
          : existing?.displayOrder ?? 100,
      iconUrl: (input.iconUrl ?? existing?.iconUrl ?? "").trim().slice(0, 500),
      isVisible: input.isVisible ?? existing?.isVisible ?? true,
      isArchived: false,
    };

    await this.store.setDoc(
      `businesses/${businessId}/categories/${catId}`,
      {
        ...category,
        // If category was renamed, keep products aligned below
        createdAtMs: (existing as any)?.createdAtMs ?? nowMs,
        updatedAtMs: nowMs,
      },
      { merge: true }
    );

    // If an existing category was renamed, update products in this business referencing the old name
    if (existing && existing.name !== name) {
      const products = await this.store.listCollection<MenuItem>(
        `businesses/${businessId}/products`
      );
      for (const prod of products) {
        let changed = false;
        let nextPrimary = prod.category;
        if (prod.category === existing.name) {
          nextPrimary = name;
          changed = true;
        }
        let nextCats = prod.categories;
        if (Array.isArray(prod.categories) && prod.categories.includes(existing.name)) {
          nextCats = prod.categories.map((c) => (c === existing.name ? name : c));
          changed = true;
        }
        if (changed) {
          await this.store.updateDoc(
            `businesses/${businessId}/products/${prod.id}`,
            {
              category: nextPrimary,
              ...(nextCats ? { categories: nextCats } : {}),
              updatedAtMs: nowMs,
            }
          );
        }
      }
    }

    return category;
  }

  async ownerArchiveCategory(
    caller: VerifiedCaller | null,
    arg2: any,
    arg3?: any
  ): Promise<{ archivedId: string; reassignedCount: number; reassignedProductsCount: number }> {
    let input: {
      businessId?: string;
      categoryId: string;
      reassignToCategoryId?: string;
    };
    if (typeof arg2 === "string") {
      input = {
        categoryId: arg2,
        reassignToCategoryId: arg3,
      };
    } else {
      input = arg2;
    }

    const { businessId } = await this.requireBusinessOwner(caller, {
      clientSubmittedBusinessId: input.businessId,
      requireActiveSubscription: true,
    });

    const targetCat = await this.store.getDoc<Category>(
      `businesses/${businessId}/categories/${input.categoryId}`
    );
    if (!targetCat || targetCat.isArchived) {
      throw new PlatformApiError("not-found", "Category not found.");
    }

    const allProducts = await this.store.listCollection<MenuItem>(
      `businesses/${businessId}/products`
    );
    const activeAssigned = allProducts.filter(
      (p) =>
        !p.isArchived &&
        (p.category === targetCat.name ||
          (Array.isArray(p.categories) && p.categories.includes(targetCat.name)))
    );

    let replacementCategory: Category | null = null;
    if (activeAssigned.length > 0) {
      if (!input.reassignToCategoryId) {
        throw new PlatformApiError(
          "failed-precondition",
          `Cannot remove "${targetCat.name}" while ${activeAssigned.length} active menu item(s) belong to it. Choose a target category to reassign those items first.`
        );
      }
      if (input.reassignToCategoryId === input.categoryId) {
        throw new PlatformApiError(
          "invalid-argument",
          "Reassignment category must be different from the category being removed."
        );
      }
      replacementCategory = await this.store.getDoc<Category>(
        `businesses/${businessId}/categories/${input.reassignToCategoryId}`
      );
      if (!replacementCategory || replacementCategory.isArchived) {
        throw new PlatformApiError(
          "not-found",
          "Selected reassignment category does not exist."
        );
      }
    }

    const nowMs = this.clock.now();
    for (const prod of activeAssigned) {
      const nextPrimary =
        prod.category === targetCat.name ? replacementCategory!.name : prod.category;
      const nextCategories = Array.isArray(prod.categories)
        ? Array.from(
            new Set(
              prod.categories.map((c) =>
                c === targetCat.name ? replacementCategory!.name : c
              )
            )
          )
        : undefined;

      await this.store.updateDoc(`businesses/${businessId}/products/${prod.id}`, {
        category: nextPrimary,
        categoryId: replacementCategory!.id,
        ...(nextCategories ? { categories: nextCategories } : {}),
        updatedAtMs: nowMs,
      });
    }

    await this.store.updateDoc(
      `businesses/${businessId}/categories/${input.categoryId}`,
      {
        isArchived: true,
        isVisible: false,
        updatedAtMs: nowMs,
      }
    );

    return {
      archivedId: input.categoryId,
      reassignedCount: activeAssigned.length,
      reassignedProductsCount: activeAssigned.length,
    };
  }

  async ownerUpsertProduct(
    caller: VerifiedCaller | null,
    input: {
      businessId?: string;
      id?: string;
      name: string;
      description?: string;
      priceRupees: number;
      category: string;
      categories?: string[];
      imageUrls?: string[];
      displayOrder?: number;
      isAvailable?: boolean;
      badge?: string;
      availabilityNote?: string;
    }
  ): Promise<MenuItem> {
    const { businessId } = await this.requireBusinessOwner(caller, {
      clientSubmittedBusinessId: input.businessId,
      requireActiveSubscription: true,
    });

    const name = (input.name || "").trim();
    if (!name || name.length > 100) {
      throw new PlatformApiError(
        "invalid-argument",
        "Product name must be between 1 and 100 characters."
      );
    }

    const priceCheck = validateLkrPriceRupees(input.priceRupees);
    if (!priceCheck.valid) {
      throw new PlatformApiError("invalid-argument", priceCheck.error!);
    }

    let category = (input.category || (input as any).categoryId || "").trim();
    let categoryId = (input as any).categoryId;
    if (!category && !categoryId) {
      throw new PlatformApiError("invalid-argument", "Category is required.");
    }
    if (categoryId && !input.category) {
      const catDoc = await this.store.getDoc<Category>(
        `businesses/${businessId}/categories/${categoryId}`
      );
      if (catDoc) {
        category = catDoc.name;
      }
    }

    const cleanImages = (input.imageUrls || [])
      .map((u) => (typeof u === "string" ? u.trim() : ""))
      .filter((u) => Boolean(u) && u.length <= 600)
      .slice(0, 3);

    const primaryImage = cleanImages[0] || "";
    const prodId =
      input.id && input.id.trim()
        ? input.id.trim()
        : `${normalizeBusinessSlug(name) || "item"}_${crypto
            .randomBytes(3)
            .toString("hex")}`;

    const nowMs = this.clock.now();
    const existing = await this.store.getDoc<MenuItem>(
      `businesses/${businessId}/products/${prodId}`
    );

    const isAvailable = input.isAvailable ?? existing?.isAvailable ?? true;
    const item: MenuItem = {
      id: prodId,
      businessId,
      name,
      price: priceCheck.priceDisplay,
      priceMinor: priceCheck.priceMinor,
      priceDisplay: priceCheck.priceDisplay,
      priceRupees: priceCheck.priceDisplay,
      category,
      categoryId,
      ...(Array.isArray(input.categories) && input.categories.length > 0
        ? { categories: input.categories }
        : existing?.categories
        ? { categories: existing.categories }
        : {}),
      description: (input.description ?? existing?.description ?? "")
        .trim()
        .slice(0, 400),
      image: primaryImage,
      imageUrl: primaryImage,
      imageUrls: cleanImages,
      available: isAvailable,
      isAvailable,
      isArchived: false,
      displayOrder:
        typeof input.displayOrder === "number"
          ? Math.floor(input.displayOrder)
          : existing?.displayOrder ?? 100,
      ...(input.badge !== undefined
        ? input.badge.trim()
          ? { badge: input.badge.trim().slice(0, 40) }
          : {}
        : existing?.badge
        ? { badge: existing.badge }
        : {}),
      ...(input.availabilityNote !== undefined
        ? input.availabilityNote.trim()
          ? { availabilityNote: input.availabilityNote.trim().slice(0, 120) }
          : {}
        : existing?.availabilityNote
        ? { availabilityNote: existing.availabilityNote }
        : {}),
      imageMatchStatus: primaryImage ? "VERIFIED" : "IMAGE_MISSING",
    };

    await this.store.setDoc(`businesses/${businessId}/products/${prodId}`, {
      ...item,
      createdAtMs: (existing as any)?.createdAtMs ?? nowMs,
      updatedAtMs: nowMs,
    });

    return item;
  }

  async ownerArchiveProduct(
    caller: VerifiedCaller | null,
    input: { businessId?: string; productId: string }
  ): Promise<{ archivedId: string }> {
    const { businessId } = await this.requireBusinessOwner(caller, {
      clientSubmittedBusinessId: input.businessId,
      requireActiveSubscription: true,
    });

    const existing = await this.store.getDoc<MenuItem>(
      `businesses/${businessId}/products/${input.productId}`
    );
    if (!existing) {
      throw new PlatformApiError("not-found", "Menu item not found.");
    }

    await this.store.updateDoc(
      `businesses/${businessId}/products/${input.productId}`,
      {
        isArchived: true,
        isAvailable: false,
        available: false,
        updatedAtMs: this.clock.now(),
      }
    );

    return { archivedId: input.productId };
  }

  async ownerUpsertTable(
    caller: VerifiedCaller | null,
    input: {
      businessId?: string;
      tableId?: string;
      number: string;
      active?: boolean;
      rotateToken?: boolean;
    }
  ): Promise<TableItem> {
    const { businessId } = await this.requireBusinessOwner(caller, {
      clientSubmittedBusinessId: input.businessId,
      requireActiveSubscription: true,
    });

    const rawLabel = (input.number || (input as any).tableNumber || "").trim();
    if (!rawLabel || rawLabel.length > 40) {
      throw new PlatformApiError(
        "invalid-argument",
        "Table label must be between 1 and 40 characters."
      );
    }

    const nowMs = this.clock.now();
    const tableId =
      input.tableId && input.tableId.trim()
        ? input.tableId.trim()
        : generateId("tbl");

    return this.store.runTransaction(async (tx) => {
      const existing = await tx.getDoc<TableItem>(
        `businesses/${businessId}/tables/${tableId}`
      );

      const nextActive = input.active ?? existing?.active ?? true;
      const nextToken =
        !existing || input.rotateToken ? generateTableToken() : existing.token;

      if (existing && existing.token && existing.token !== nextToken) {
        tx.deleteDoc(`businesses/${businessId}/tableTokens/${existing.token}`);
      }

      const tableRecord: TableItem = {
        id: tableId,
        businessId,
        number: rawLabel,
        tableNumber: rawLabel,
        token: nextToken,
        active: nextActive,
        isArchived: false,
      };

      tx.setDoc(`businesses/${businessId}/tables/${tableId}`, {
        ...tableRecord,
        createdAtMs: (existing as any)?.createdAtMs ?? nowMs,
        updatedAtMs: nowMs,
      });

      tx.setDoc(`businesses/${businessId}/tableTokens/${nextToken}`, {
        token: nextToken,
        tableId,
        number: rawLabel,
        tableNumber: rawLabel,
        businessId,
        active: nextActive,
        updatedAtMs: nowMs,
      });

      return tableRecord;
    });
  }

  async ownerUpdateOrderStatus(
    caller: VerifiedCaller | null,
    arg2: any,
    arg3?: any,
    arg4?: any
  ): Promise<{ orderId: string; status: OrderStatus }> {
    let input: {
      businessId?: string;
      orderId: string;
      status: OrderStatus;
      cancelReason?: string;
    };
    if (typeof arg2 === "string") {
      input = {
        orderId: arg2,
        status: arg3,
        cancelReason: arg4,
      };
    } else {
      input = arg2;
    }

    const { businessId, profile } = await this.requireBusinessOwner(caller, {
      clientSubmittedBusinessId: input.businessId,
      requireActiveSubscription: true,
    });

    const statusNorm = (input.status || "").toLowerCase();
    const isAllowed = ALLOWED_ORDER_STATUSES.some(
      (s) => s.toLowerCase() === statusNorm
    );
    if (!input.orderId || !isAllowed) {
      throw new PlatformApiError(
        "invalid-argument",
        "Invalid order ID or order status."
      );
    }
    const targetStatus = (input.status || "").toUpperCase() as OrderStatus;

    const orderPath = `businesses/${businessId}/orders/${input.orderId}`;
    const order = await this.store.getDoc<Order>(orderPath);
    if (!order) {
      throw new PlatformApiError("not-found", "Order not found in your business.");
    }

    const nowMs = this.clock.now();
    const updatePayload: Record<string, any> = {
      status: targetStatus,
      updatedBy: profile.uid,
      updatedAtMs: nowMs,
    };

    if (statusNorm === "accepted" || statusNorm === "preparing") {
      updatePayload.acceptedAt = nowMs;
    }
    if (statusNorm === "served" || statusNorm === "completed") {
      updatePayload.servedAt = nowMs;
    }
    if (statusNorm === "cancelled") {
      updatePayload.cancelReason = (input.cancelReason || "Cancelled by restaurant")
        .trim()
        .slice(0, 200);
    }

    await this.store.updateDoc(orderPath, updatePayload);

    if (order.trackingToken) {
      await this.store
        .updateDoc(
          `businesses/${businessId}/orderTracking/${order.trackingToken}`,
          {
            status: targetStatus,
            cancelReason: updatePayload.cancelReason || null,
            updatedAtMs: nowMs,
          }
        )
        .catch(() => {});
    }

    return { orderId: input.orderId, status: targetStatus };
  }

  async ownerUpdateSettings(
    caller: VerifiedCaller | null,
    input: {
      businessId?: string;
      name: string;
      tagline?: string;
      logoUrl?: string;
      primaryColor?: string;
      accentColor?: string;
      phone?: string;
      whatsapp?: string;
      address?: string;
      openingHours?: string;
      isOrderingPaused?: boolean;
      pauseMessage?: string;
      socialLinks?: {
        instagram?: string;
        facebook?: string;
        googleReview?: string;
      };
    }
  ): Promise<BusinessPublicProfile> {
    const { businessId, business } = await this.requireBusinessOwner(caller, {
      clientSubmittedBusinessId: input.businessId,
      requireActiveSubscription: true,
    });

    const name = (input.name !== undefined ? input.name : (business.name || "")).trim();
    if (name.length < 2 || name.length > 80) {
      throw new PlatformApiError(
        "invalid-argument",
        "Business name must be between 2 and 80 characters."
      );
    }

    const isTeaTime = business.slug === "teatime" || businessId === "biz_teatime";
    const defaultTheme = isTeaTime ? TEATIME_DEFAULT_THEME : MENYO_DEFAULT_THEME;

    const bInput = (input as any).branding || {};
    const pColorVal = input.primaryColor ?? bInput.primaryColor ?? business.primaryColor ?? business.branding?.primaryColor ?? defaultTheme.primaryColor;
    const aColorVal = input.accentColor ?? bInput.accentColor ?? business.accentColor ?? business.branding?.accentColor ?? defaultTheme.accentColor;
    const bgColorVal = (input as any).backgroundColor ?? bInput.backgroundColor ?? business.backgroundColor ?? business.branding?.backgroundColor ?? defaultTheme.backgroundColor;
    const txtColorVal = (input as any).textColor ?? bInput.textColor ?? business.textColor ?? business.branding?.textColor ?? defaultTheme.textColor;
    const hBgColorVal = (input as any).headerBackgroundColor ?? bInput.headerBackgroundColor ?? business.headerBackgroundColor ?? business.branding?.headerBackgroundColor ?? defaultTheme.headerBackgroundColor;
    const hTxtColorVal = (input as any).headerTextColor ?? bInput.headerTextColor ?? business.headerTextColor ?? business.branding?.headerTextColor ?? defaultTheme.headerTextColor;
    const logoVal = input.logoUrl !== undefined ? input.logoUrl : (bInput.logoUrl !== undefined ? bInput.logoUrl : (business.logoUrl ?? business.branding?.logoUrl));

    const pColor = validateHexColor(pColorVal, defaultTheme.primaryColor);
    if (!pColor.valid) throw new PlatformApiError("invalid-argument", pColor.error!);

    const aColor = validateHexColor(aColorVal, defaultTheme.accentColor);
    if (!aColor.valid) throw new PlatformApiError("invalid-argument", aColor.error!);

    const bgColor = validateHexColor(bgColorVal, defaultTheme.backgroundColor);
    if (!bgColor.valid) throw new PlatformApiError("invalid-argument", bgColor.error!);

    const txtColor = validateHexColor(txtColorVal, defaultTheme.textColor);
    if (!txtColor.valid) throw new PlatformApiError("invalid-argument", txtColor.error!);

    const hBgColor = validateHexColor(hBgColorVal, defaultTheme.headerBackgroundColor);
    if (!hBgColor.valid) throw new PlatformApiError("invalid-argument", hBgColor.error!);

    const hTxtColor = validateHexColor(hTxtColorVal, defaultTheme.headerTextColor);
    if (!hTxtColor.valid) throw new PlatformApiError("invalid-argument", hTxtColor.error!);

    const cleanUrl = (u?: string | null) => (u === "" || u === null ? "" : (u || "").trim().slice(0, 500));
    const nextLogo = cleanUrl(logoVal);

    const updated: BusinessPublicProfile = {
      ...business,
      // Slug is intentionally immutable by Business Owners!
      slug: business.slug,
      name,
      tagline: (input.tagline ?? business.tagline ?? "").trim().slice(0, 120),
      logoUrl: nextLogo,
      primaryColor: pColor.normalized,
      accentColor: aColor.normalized,
      backgroundColor: bgColor.normalized,
      textColor: txtColor.normalized,
      headerBackgroundColor: hBgColor.normalized,
      headerTextColor: hTxtColor.normalized,
      branding: {
        logoUrl: nextLogo || null,
        primaryColor: pColor.normalized,
        accentColor: aColor.normalized,
        backgroundColor: bgColor.normalized,
        textColor: txtColor.normalized,
        headerBackgroundColor: hBgColor.normalized,
        headerTextColor: hTxtColor.normalized,
      },
      phone: (input.phone ?? business.phone ?? "").trim().slice(0, 40),
      whatsapp: (input.whatsapp ?? business.whatsapp ?? "").trim().slice(0, 40),
      address: (input.address ?? business.address ?? "").trim().slice(0, 240),
      openingHours: (input.openingHours ?? business.openingHours ?? "")
        .trim()
        .slice(0, 80),
      isOrderingPaused:
        input.isOrderingPaused ?? business.isOrderingPaused ?? false,
      pauseMessage: (input.pauseMessage ?? business.pauseMessage ?? "")
        .trim()
        .slice(0, 240),
      socialLinks: {
        instagram: cleanUrl(
          input.socialLinks?.instagram ?? (input as any).instagramUrl ?? business.socialLinks?.instagram
        ),
        facebook: cleanUrl(
          input.socialLinks?.facebook ?? (input as any).facebookUrl ?? business.socialLinks?.facebook
        ),
        googleReview: cleanUrl(
          input.socialLinks?.googleReview ?? (input as any).googleReviewUrl ?? business.socialLinks?.googleReview
        ),
      },
      socialLinkItems: Array.isArray((input as any).socialLinks)
        ? (input as any).socialLinks
        : ((input as any).socialLinkItems ?? (business as any).socialLinkItems ?? []),
      googleReviewUrl: cleanUrl((input as any).googleReviewUrl ?? (business as any).googleReviewUrl ?? input.socialLinks?.googleReview),
      instagramUrl: cleanUrl((input as any).instagramUrl ?? (business as any).instagramUrl ?? input.socialLinks?.instagram),
      facebookUrl: cleanUrl((input as any).facebookUrl ?? (business as any).facebookUrl ?? input.socialLinks?.facebook),
    };

    await this.store.updateDoc(`businesses/${businessId}`, {
      ...updated,
      updatedAtMs: this.clock.now(),
    });

    return updated;
  }

  async ownerResetBrandingSettings(
    caller: VerifiedCaller | null,
    input?: { businessId?: string }
  ): Promise<BusinessPublicProfile> {
    const { businessId, business } = await this.requireBusinessOwner(caller, {
      clientSubmittedBusinessId: input?.businessId,
      requireActiveSubscription: true,
    });

    const isTeaTime = business.slug === "teatime" || businessId === "biz_teatime";
    const defaultTheme = isTeaTime ? TEATIME_DEFAULT_THEME : MENYO_DEFAULT_THEME;

    const updated: BusinessPublicProfile = {
      ...business,
      primaryColor: defaultTheme.primaryColor,
      accentColor: defaultTheme.accentColor,
      backgroundColor: defaultTheme.backgroundColor,
      textColor: defaultTheme.textColor,
      headerBackgroundColor: defaultTheme.headerBackgroundColor,
      headerTextColor: defaultTheme.headerTextColor,
      branding: {
        logoUrl: business.logoUrl || null,
        primaryColor: defaultTheme.primaryColor,
        accentColor: defaultTheme.accentColor,
        backgroundColor: defaultTheme.backgroundColor,
        textColor: defaultTheme.textColor,
        headerBackgroundColor: defaultTheme.headerBackgroundColor,
        headerTextColor: defaultTheme.headerTextColor,
      },
      updatedAt: this.clock.now(),
    };

    await this.store.updateDoc(`businesses/${businessId}`, {
      ...updated,
      updatedAtMs: this.clock.now(),
    });

    return updated;
  }

  // ============================================================================
  // 5. PUBLIC MENU RESOLUTION & SECURE SERVER-AUTHORITATIVE ORDERING
  // ============================================================================

  async resolvePublicMenuTenant(input: {
    slug?: string;
    businessSlug?: string;
    tableToken?: string;
  }): Promise<
    | { status: "NOT_FOUND" }
    | { status: "REDIRECT"; canonicalSlug: string }
    | { status: "UNAVAILABLE"; business: BusinessPublicProfile & { isAvailable: false }; businessName: string; logoUrl: string }
    | {
        status: "OK";
        business: BusinessPublicProfile & { isAvailable: true };
        table: { id: string; number: string; token: string } | null;
        tableStatus: "NONE" | "VALID" | "INVALID_OR_INACTIVE";
      }
  > {
    const rawSlug = input.slug || input.businessSlug || "";
    const normalized = normalizeBusinessSlug(rawSlug);
    if (!normalized) return { status: "NOT_FOUND" };

    const slugDoc = await this.store.getDoc<{
      slug: string;
      businessId: string;
      isAlias: boolean;
      canonicalSlug: string;
    }>(`businessSlugs/${normalized}`);

    if (!slugDoc) {
      return { status: "NOT_FOUND" };
    }

    if (slugDoc.isAlias && slugDoc.canonicalSlug && slugDoc.canonicalSlug !== normalized) {
      return { status: "REDIRECT", canonicalSlug: slugDoc.canonicalSlug };
    }

    const [business, access] = await Promise.all([
      this.store.getDoc<BusinessPublicProfile>(`businesses/${slugDoc.businessId}`),
      this.store.getDoc<BusinessAccessRecord>(
        `businessAccess/${slugDoc.businessId}`
      ),
    ]);

    if (!business || !access || access.operationalStatus === "archived") {
      return { status: "NOT_FOUND" };
    }

    const evaluation = evaluateBusinessAccess(access, this.clock.now());
    if (!evaluation.allowed) {
      // Never disclose payment/billing/expiry details publicly
      return {
        status: "UNAVAILABLE",
        business: { ...business, isAvailable: false },
        businessName: business.name,
        logoUrl: business.logoUrl || "",
      };
    }

    const safeBusiness = {
      ...business,
      branding: business.branding || {
        logoUrl: business.logoUrl || null,
        primaryColor: business.primaryColor || (business.slug === "teatime" ? "#2C190E" : "#7BBBFF"),
        accentColor: business.accentColor || (business.slug === "teatime" ? "#E8B64F" : "#B8A9FF"),
        backgroundColor: business.backgroundColor || (business.slug === "teatime" ? "#FAF7F0" : "#F2FDFF"),
        textColor: business.textColor || (business.slug === "teatime" ? "#301C10" : "#050F2A"),
        headerBackgroundColor: business.headerBackgroundColor || (business.slug === "teatime" ? "#2C190E" : "#050F2A"),
        headerTextColor: business.headerTextColor || (business.slug === "teatime" ? "#FAF7F0" : "#F2FDFF"),
      },
      isAvailable: true as const,
    };

    const rawToken = (input.tableToken || "").trim();
    if (!rawToken) {
      return {
        status: "OK",
        business: safeBusiness,
        table: null,
        tableStatus: "NONE",
      };
    }

    const tokenDoc = await this.store.getDoc<{
      token: string;
      tableId: string;
      number: string;
      businessId: string;
      active: boolean;
    }>(`businesses/${business.id}/tableTokens/${rawToken}`);

    if (!tokenDoc || !tokenDoc.active || tokenDoc.businessId !== business.id) {
      return {
        status: "OK",
        business: safeBusiness,
        table: null,
        tableStatus: "INVALID_OR_INACTIVE",
      };
    }

    return {
      status: "OK",
      business: safeBusiness,
      table: {
        id: tokenDoc.tableId,
        number: tokenDoc.number,
        token: tokenDoc.token,
      },
      tableStatus: "VALID",
    };
  }

  async createTenantOrder(
    arg1: any,
    arg2?: any,
    arg3?: any
  ): Promise<{
    success: true;
    orderId: string;
    trackingToken: string;
    orderNumber: number;
    orderNumberDisplay: string;
    tableNumber: string;
    totalMinor: number;
    totalRupees: number;
    duplicate?: boolean;
  }> {
    let caller: VerifiedCaller | null = null;
    let input: {
      businessSlug: string;
      tableToken: string;
      items: {
        productId: string;
        quantity: number;
        sugarSpoons?: number | null;
        priceMinor?: unknown;
        price?: unknown;
      }[];
      specialInstructions?: string;
      idempotencyKey: string;
      ip?: string;
    };
    let clientIp: string;

    if (arg2) {
      caller = arg1;
      input = arg2;
      clientIp = arg3 || arg2.ip || "unknown";
    } else {
      caller = null;
      input = arg1;
      clientIp = arg1?.ip || "unknown";
    }

    const slug = normalizeBusinessSlug(input.businessSlug);
    if (!slug) {
      throw new PlatformApiError("invalid-argument", "Valid business slug is required.");
    }

    const rawTableToken = (input.tableToken || "").trim();
    if (!rawTableToken) {
      throw new PlatformApiError(
        "failed-precondition",
        "Please scan a valid table QR code before placing a dine-in order."
      );
    }

    if (
      !input.idempotencyKey ||
      typeof input.idempotencyKey !== "string" ||
      input.idempotencyKey.trim().length < 8 ||
      input.idempotencyKey.trim().length > 128
    ) {
      throw new PlatformApiError(
        "invalid-argument",
        "Valid idempotency key is required."
      );
    }

    if (!Array.isArray(input.items) || input.items.length === 0) {
      throw new PlatformApiError(
        "invalid-argument",
        "Your order must include at least one menu item."
      );
    }
    if (input.items.length > 50) {
      throw new PlatformApiError(
        "invalid-argument",
        "Order exceeds the maximum number of line items (50)."
      );
    }

    const slugDoc = await this.store.getDoc<{ businessId: string }>(
      `businessSlugs/${slug}`
    );
    if (!slugDoc) {
      throw new PlatformApiError("not-found", "Restaurant not found.");
    }

    const businessId = slugDoc.businessId;
    const nowMs = this.clock.now();

    const [business, access] = await Promise.all([
      this.store.getDoc<BusinessPublicProfile>(`businesses/${businessId}`),
      this.store.getDoc<BusinessAccessRecord>(`businessAccess/${businessId}`),
    ]);

    if (!business || !access) {
      throw new PlatformApiError("not-found", "Restaurant not found.");
    }

    // 1. Check operational status AND subscription validity using trusted server time
    const evaluation = evaluateBusinessAccess(access, nowMs);
    if (!evaluation.allowed) {
      throw new PlatformApiError(
        "failed-precondition",
        "Menu temporarily unavailable. Please contact the restaurant."
      );
    }

    if (business.isOrderingPaused) {
      throw new PlatformApiError(
        "failed-precondition",
        business.pauseMessage ||
          "New orders are temporarily paused by restaurant staff."
      );
    }

    // 2. Check idempotency BEFORE rate-limit so legitimate network retries return cleanly
    const idemHash = sha256Short(input.idempotencyKey.trim());
    const idemPath = `businesses/${businessId}/orderIdempotency/${idemHash}`;
    const existingIdem = await this.store.getDoc<{
      orderId: string;
      trackingToken: string;
      orderNumber: number;
      orderNumberDisplay: string;
      tableNumber: string;
      totalMinor: number;
    }>(idemPath);

    if (existingIdem) {
      return {
        success: true,
        ...existingIdem,
        totalRupees: Math.round(existingIdem.totalMinor / 100),
        duplicate: true,
      };
    }

    // 3. Practical rate-limiting per customer UID / IP
    const customerId =
      caller?.uid || `anon_${sha256Short(`${clientIp}|${rawTableToken}`)}`;
    const rlKey = `ord_${businessId}_${sha256Short(`${customerId}|${clientIp}`)}`;
    const rlDoc = await this.store.getDoc<{
      lastOrderAtMs: number;
      windowStartMs: number;
      windowCount: number;
    }>(`orderRateLimits/${rlKey}`);

    const fifteenMinMs = 15 * 60 * 1000;
    if (rlDoc) {
      if (nowMs - rlDoc.lastOrderAtMs < 5_000) {
        throw new PlatformApiError(
          "resource-exhausted",
          "Please wait a few seconds before submitting another order."
        );
      }
      if (
        nowMs - rlDoc.windowStartMs < fifteenMinMs &&
        rlDoc.windowCount >= 15
      ) {
        throw new PlatformApiError(
          "resource-exhausted",
          "Order rate limit reached. Please speak with restaurant staff."
        );
      }
    }

    // 4. Validate table token belongs strictly to THIS business and is active
    const tokenDoc = await this.store.getDoc<{
      token: string;
      tableId: string;
      number: string;
      businessId: string;
      active: boolean;
    }>(`businesses/${businessId}/tableTokens/${rawTableToken}`);

    if (!tokenDoc || tokenDoc.businessId !== businessId) {
      throw new PlatformApiError(
        "failed-precondition",
        "Invalid table QR code for this restaurant."
      );
    }

    const tableDoc = await this.store.getDoc<TableItem>(
      `businesses/${businessId}/tables/${tokenDoc.tableId}`
    );
    if (!tokenDoc.active || !tableDoc || !tableDoc.active || tableDoc.isArchived) {
      throw new PlatformApiError(
        "failed-precondition",
        `Table ${tokenDoc.number || ""} is currently inactive. Please contact staff.`
      );
    }

    // 5. Fetch all products strictly from THIS business's subcollection & compute server totals
    const uniqueIds = Array.from(
      new Set(input.items.map((i) => (i.productId || "").trim()))
    );
    if (uniqueIds.some((id) => !id)) {
      throw new PlatformApiError("invalid-argument", "Invalid product ID in cart.");
    }

    const productDocs = await Promise.all(
      uniqueIds.map((pid) =>
        this.store.getDoc<MenuItem>(`businesses/${businessId}/products/${pid}`)
      )
    );
    const productMap = new Map<string, MenuItem>();
    productDocs.forEach((docItem) => {
      if (docItem) productMap.set(docItem.id, docItem);
    });

    const itemSnapshots: OrderItemSnapshot[] = [];
    let totalMinor = 0;
    let totalItemCount = 0;

    for (const rawItem of input.items) {
      const pid = rawItem.productId.trim();
      const qty = Number(rawItem.quantity);
      if (!Number.isInteger(qty) || qty < 1 || qty > 25) {
        throw new PlatformApiError(
          "invalid-argument",
          `Invalid quantity (${String(rawItem.quantity)}). Must be between 1 and 25.`
        );
      }

      const product = productMap.get(pid);
      if (!product || product.isArchived) {
        throw new PlatformApiError(
          "not-found",
          `Menu item "${pid}" does not belong to this restaurant.`
        );
      }

      if (product.isAvailable === false || product.available === false) {
        throw new PlatformApiError(
          "failed-precondition",
          `"${product.name}" is currently sold out.`
        );
      }

      const unitPriceMinor =
        typeof product.priceMinor === "number" && product.priceMinor > 0
          ? Math.round(product.priceMinor)
          : Math.round(Number(product.price) * 100);

      if (!Number.isFinite(unitPriceMinor) || unitPriceMinor <= 0) {
        throw new PlatformApiError(
          "internal",
          `Invalid server price configuration for "${product.name}".`
        );
      }

      const subtotalMinor = unitPriceMinor * qty;
      totalMinor += subtotalMinor;
      totalItemCount += qty;

      const sugarNote = supportsSugarServer(product)
        ? formatSugarNoteServer(rawItem.sugarSpoons)
        : null;

      itemSnapshots.push({
        productId: product.id,
        name: product.name,
        category: product.category || "General",
        priceMinor: unitPriceMinor,
        quantity: qty,
        subtotalMinor,
        imageUrl: product.imageUrl || product.image || null,
        sugarNote,
      });
    }

    const sanitizedInstructions = (input.specialInstructions || "")
      .trim()
      .slice(0, 300);

    // 6. Atomic order creation + sequential order counter + idempotency lock + narrow tracking doc
    const orderId = generateId("ord");
    const trackingToken = crypto.randomBytes(16).toString("hex");

    const committed = await this.store.runTransaction(async (tx) => {
      const idemInside = await tx.getDoc<{
        orderId: string;
        trackingToken: string;
        orderNumber: number;
        orderNumberDisplay: string;
        tableNumber: string;
        totalMinor: number;
      }>(idemPath);

      if (idemInside) {
        return { ...idemInside, duplicate: true as const };
      }

      const counterPath = `businesses/${businessId}/counters/orders`;
      const counterSnap = await tx.getDoc<{ lastOrderNumber?: number }>(
        counterPath
      );
      const nextOrderNumber =
        typeof counterSnap?.lastOrderNumber === "number" &&
        counterSnap.lastOrderNumber >= 1000
          ? counterSnap.lastOrderNumber + 1
          : 1001;

      tx.setDoc(
        counterPath,
        { lastOrderNumber: nextOrderNumber, updatedAtMs: nowMs },
        { merge: true }
      );

      const tblNum = tableDoc.number || (tableDoc as any).tableNumber || "Table 01";
      const orderNumberDisplay = `#${nextOrderNumber}`;
      const orderRecord: Order = {
        id: orderId,
        businessId,
        businessSlug: business.slug,
        trackingToken,
        orderNumber: nextOrderNumber,
        orderNumberDisplay,
        tableId: tableDoc.id,
        tableNumber: tblNum,
        tableToken: rawTableToken,
        customerId,
        status: "PENDING",
        items: itemSnapshots,
        itemCount: totalItemCount,
        totalMinor,
        currency: "LKR",
        specialInstructions: sanitizedInstructions,
        idempotencyKey: input.idempotencyKey.trim(),
        paymentStatus: "pay_at_counter",
        createdAt: nowMs,
        updatedAt: nowMs,
      };

      tx.setDoc(`businesses/${businessId}/orders/${orderId}`, {
        ...orderRecord,
        createdAtMs: nowMs,
        updatedAtMs: nowMs,
      });

      // Narrowly-scoped customer status document keyed by unguessable trackingToken
      tx.setDoc(`businesses/${businessId}/orderTracking/${trackingToken}`, {
        trackingToken,
        orderId,
        businessId,
        businessName: business.name,
        orderNumber: nextOrderNumber,
        orderNumberDisplay,
        tableNumber: tblNum,
        status: "PENDING",
        items: itemSnapshots,
        totalMinor,
        totalRupees: Math.round(totalMinor / 100),
        currency: "LKR",
        specialInstructions: sanitizedInstructions,
        createdAtMs: nowMs,
        updatedAtMs: nowMs,
      });

      const summary = {
        orderId,
        trackingToken,
        orderNumber: nextOrderNumber,
        orderNumberDisplay,
        tableNumber: tblNum,
        totalMinor,
      };

      tx.setDoc(idemPath, {
        ...summary,
        createdAtMs: nowMs,
      });

      return { ...summary, duplicate: false as const };
    });

    // Update rate-limit window after successful new order
    if (!committed.duplicate) {
      const freshWindow =
        !rlDoc || nowMs - rlDoc.windowStartMs >= fifteenMinMs;
      await this.store.setDoc(`orderRateLimits/${rlKey}`, {
        lastOrderAtMs: nowMs,
        windowStartMs: freshWindow ? nowMs : rlDoc.windowStartMs,
        windowCount: freshWindow ? 1 : rlDoc.windowCount + 1,
      });
    }

    return {
      success: true,
      ...committed,
      totalRupees: Math.round(committed.totalMinor / 100),
    };
  }

  async getOrderTrackingStatus(input: {
    businessSlug: string;
    trackingToken: string;
  }): Promise<Record<string, any>> {
    const slug = normalizeBusinessSlug(input.businessSlug);
    const token = (input.trackingToken || "").trim();
    if (!slug || !token || token.length < 16) {
      throw new PlatformApiError("invalid-argument", "Invalid tracking link.");
    }

    const slugDoc = await this.store.getDoc<{ businessId: string }>(
      `businessSlugs/${slug}`
    );
    if (!slugDoc) {
      throw new PlatformApiError("not-found", "Order not found.");
    }

    const tracking = await this.store.getDoc<Record<string, any>>(
      `businesses/${slugDoc.businessId}/orderTracking/${token}`
    );
    if (!tracking) {
      throw new PlatformApiError("not-found", "Order tracking session not found.");
    }
    return tracking;
  }
}

