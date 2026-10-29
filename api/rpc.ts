import {
  createFirebaseAdminAuthProvider,
  createFirebaseAdminStore,
} from "../src/server/firebaseAdminAdapter";
import { PlatformEngine } from "../src/server/platformEngine";
import { PlatformApiError, VerifiedCaller } from "../src/server/storeTypes";

let cachedEngine: PlatformEngine | null = null;

function getEngine(): PlatformEngine {
  if (!cachedEngine) {
    const store = createFirebaseAdminStore();
    const auth = createFirebaseAdminAuthProvider();
    cachedEngine = new PlatformEngine({
      store,
      auth,
      bootstrapSecret: process.env.BOOTSTRAP_SECRET || process.env.SUPER_ADMIN_BOOTSTRAP_SECRET,
    });
  }
  return cachedEngine;
}

function parseBody(req: any): Promise<any> {
  if (req.body && typeof req.body === "object") {
    return Promise.resolve(req.body);
  }
  if (typeof req.body === "string" && req.body.trim().length > 0) {
    try {
      return Promise.resolve(JSON.parse(req.body));
    } catch {
      return Promise.resolve({});
    }
  }

  return new Promise((resolve) => {
    let raw = "";
    req.on("data", (chunk: any) => {
      raw += chunk;
    });
    req.on("end", () => {
      try {
        resolve(raw ? JSON.parse(raw) : {});
      } catch {
        resolve({});
      }
    });
  });
}

function getHttpStatusForError(code: string): number {
  switch (code) {
    case "invalid-argument":
      return 400;
    case "unauthenticated":
      return 401;
    case "permission-denied":
      return 403;
    case "not-found":
      return 404;
    case "already-exists":
      return 409;
    case "failed-precondition":
      return 412;
    case "resource-exhausted":
      return 429;
    default:
      return 500;
  }
}

export default async function handler(req: any, res: any) {
  // CORS configuration
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");

  if (req.method === "OPTIONS") {
    return res.status(204).end();
  }

  if (req.method !== "POST" && req.method !== "GET") {
    return res.status(405).json({
      success: false,
      error: { code: "invalid-argument", message: "Only POST/GET requests supported." },
    });
  }

  try {
    const body = req.method === "POST" ? await parseBody(req) : req.query;
    const action = (body?.action || req.query?.action || "").trim();
    const data = body?.data !== undefined ? body.data : body;

    if (!action) {
      return res.status(400).json({
        success: false,
        error: { code: "invalid-argument", message: "Missing RPC action." },
      });
    }

    const engine = getEngine();
    const authProvider = createFirebaseAdminAuthProvider();

    // Verify Authorization Bearer token if present
    const authHeader = (req.headers?.authorization || req.headers?.Authorization || "") as string;
    let caller: VerifiedCaller | null = null;

    if (authHeader.startsWith("Bearer ")) {
      const token = authHeader.slice(7).trim();
      if (token) {
        try {
          caller = await authProvider.verifyIdToken(token);
        } catch {
          // Token verification failed
          caller = null;
        }
      }
    }

    const ip = (
      (req.headers?.["x-forwarded-for"] as string) ||
      req.socket?.remoteAddress ||
      "127.0.0.1"
    )
      .split(",")[0]
      .trim();

    let result: any;

    switch (action) {
      // Public / Unauthenticated RPCs
      case "resolvePublicMenuTenant":
        result = await engine.resolvePublicMenuTenant(data);
        break;

      case "createTenantOrder":
        result = await engine.createTenantOrder({ ...data, ip });
        break;

      case "getOrderTrackingStatus":
        result = await engine.getOrderTrackingStatus(data);
        break;

      case "loginWithIdentifier":
        result = await engine.loginWithIdentifier(
          { identifier: data?.identifier, password: data?.password },
          ip
        );
        break;

      case "bootstrapSuperAdmin":
        result = await engine.bootstrapSuperAdmin(data);
        break;

      // Authenticated User & Session RPCs
      case "getSessionContext":
        result = await engine.getSessionContext(caller);
        break;

      case "completeRequiredPasswordChange":
        result = await engine.completeRequiredPasswordChange(caller, data?.newPassword);
        break;

      // Super Admin RPCs
      case "getSuperAdminDashboard":
        result = await engine.getSuperAdminDashboard(caller);
        break;

      case "createBusinessWithOwner":
        result = await engine.createBusinessWithOwner(caller, data);
        break;

      case "getBusinessDetailsForSuperAdmin":
        result = await engine.getBusinessDetailsForSuperAdmin(caller, data?.businessId);
        break;

      case "updateBusinessBySuperAdmin":
        result = await engine.updateBusinessBySuperAdmin(caller, data);
        break;

      case "renewOrChangeSubscription":
        result = await engine.renewOrChangeSubscription(caller, data);
        break;

      case "setBusinessOperationalStatus":
        result = await engine.setBusinessOperationalStatus(
          caller,
          data?.businessId,
          data?.status,
          data?.reason
        );
        break;

      case "resetOwnerAccess":
        result = await engine.resetOwnerAccess(caller, data);
        break;

      case "updatePlatformPackagesAndSettings":
        result = await engine.updatePlatformPackagesAndSettings(caller, data);
        break;

      // Business Owner Tenant RPCs
      case "ownerUpsertCategory":
        result = await engine.ownerUpsertCategory(caller, data);
        break;

      case "ownerArchiveCategory":
        result = await engine.ownerArchiveCategory(
          caller,
          data?.categoryId,
          data?.reassignToCategoryId
        );
        break;

      case "ownerUpsertProduct":
        result = await engine.ownerUpsertProduct(caller, data);
        break;

      case "ownerArchiveProduct":
        result = await engine.ownerArchiveProduct(caller, data?.productId);
        break;

      case "ownerUpsertTable":
        result = await engine.ownerUpsertTable(caller, data);
        break;

      case "ownerUpdateOrderStatus":
        result = await engine.ownerUpdateOrderStatus(caller, data?.orderId, data?.status);
        break;

      case "ownerUpdateSettings":
        result = await engine.ownerUpdateSettings(caller, data);
        break;

      case "ownerResetBrandingSettings":
        result = await engine.ownerResetBrandingSettings(caller, data);
        break;

      default:
        throw new PlatformApiError("invalid-argument", `Unknown RPC action: ${action}`);
    }

    return res.status(200).json({
      success: true,
      data: result,
    });
  } catch (err: any) {
    if (err instanceof PlatformApiError) {
      return res.status(getHttpStatusForError(err.code)).json({
        success: false,
        error: { code: err.code, message: err.message },
      });
    }

    const message = err?.message || "Internal server error";
    return res.status(500).json({
      success: false,
      error: { code: "internal", message },
    });
  }
}
