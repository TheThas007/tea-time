import { initializeApp, getApps, getApp, cert, App } from "firebase-admin/app";
import { getFirestore, Timestamp } from "firebase-admin/firestore";
import { getAuth } from "firebase-admin/auth";
import {
  CustomClaimsPayload,
  PlatformApiError,
  PlatformAuthProvider,
  PlatformDataStore,
  PlatformTransaction,
  VerifiedCaller,
} from "./storeTypes";

function getOrInitAdminApp(): App {
  if (getApps().length > 0) {
    return getApp();
  }

  const serviceAccountJson = process.env.FIREBASE_SERVICE_ACCOUNT_JSON;
  if (serviceAccountJson && serviceAccountJson.trim()) {
    const parsed = JSON.parse(serviceAccountJson);
    if (typeof parsed.private_key === "string") {
      parsed.private_key = parsed.private_key.replace(/\\n/g, "\n");
    }
    return initializeApp({
      credential: cert(parsed),
      projectId:
        parsed.project_id ||
        process.env.FIREBASE_PROJECT_ID ||
        process.env.VITE_FIREBASE_PROJECT_ID,
      storageBucket:
        process.env.FIREBASE_STORAGE_BUCKET ||
        process.env.VITE_FIREBASE_STORAGE_BUCKET,
    });
  }

  const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
  const privateKey = process.env.FIREBASE_PRIVATE_KEY;
  const projectId =
    process.env.FIREBASE_PROJECT_ID ||
    process.env.GCLOUD_PROJECT ||
    process.env.VITE_FIREBASE_PROJECT_ID;

  if (clientEmail && privateKey && projectId) {
    return initializeApp({
      credential: cert({
        projectId,
        clientEmail,
        privateKey: privateKey.replace(/\\n/g, "\n"),
      }),
      projectId,
      storageBucket:
        process.env.FIREBASE_STORAGE_BUCKET ||
        process.env.VITE_FIREBASE_STORAGE_BUCKET,
    });
  }

  // Default initialization (works automatically in Firebase Cloud Functions & Emulators)
  return initializeApp(projectId ? { projectId } : undefined);
}

/**
 * Normalizes Firestore Timestamp values cleanly when reading documents into plain objects,
 * while preserving numeric `*Ms` fields used across the platform engine.
 */
function normalizeDocData<T = Record<string, any>>(
  id: string,
  raw: FirebaseFirestore.DocumentData | undefined
): T | null {
  if (!raw) return null;
  return { id, ...raw } as unknown as T;
}

/**
 * Adds Firestore native Timestamp mirrors automatically whenever `*Ms` epoch fields are written
 * so both Firestore Security Rules (`request.time < resource.data.expiresAt`) and numeric server
 * checks (`nowMs < access.expiresAtMs`) stay 100% synchronized.
 */
function enrichWithFirestoreTimestamps(
  data: Record<string, any>
): Record<string, any> {
  const out: Record<string, any> = { ...data };
  if (typeof out.activatedAtMs === "number") {
    out.activatedAt = Timestamp.fromMillis(out.activatedAtMs);
  }
  if (typeof out.startsAtMs === "number") {
    out.startsAt = Timestamp.fromMillis(out.startsAtMs);
  }
  if (out.expiresAtMs === null) {
    out.expiresAt = null;
  } else if (typeof out.expiresAtMs === "number") {
    out.expiresAt = Timestamp.fromMillis(out.expiresAtMs);
  }
  if (typeof out.createdAtMs === "number" && out.createdAt === undefined) {
    out.createdAt = Timestamp.fromMillis(out.createdAtMs);
  }
  if (typeof out.updatedAtMs === "number") {
    out.updatedAt = Timestamp.fromMillis(out.updatedAtMs);
  }
  return out;
}

export function createFirebaseAdminStore(): PlatformDataStore {
  const app = getOrInitAdminApp();
  const db = getFirestore(app);

  return {
    async getDoc<T = Record<string, any>>(path: string): Promise<T | null> {
      const snap = await db.doc(path).get();
      if (!snap.exists) return null;
      return normalizeDocData<T>(snap.id, snap.data());
    },

    async setDoc(
      path: string,
      data: Record<string, any>,
      options?: { merge?: boolean }
    ): Promise<void> {
      const payload = enrichWithFirestoreTimestamps(data);
      if (options?.merge) {
        await db.doc(path).set(payload, { merge: true });
      } else {
        await db.doc(path).set(payload);
      }
    },

    async updateDoc(path: string, data: Record<string, any>): Promise<void> {
      const payload = enrichWithFirestoreTimestamps(data);
      await db.doc(path).update(payload);
    },

    async deleteDoc(path: string): Promise<void> {
      await db.doc(path).delete();
    },

    async listCollection<T = Record<string, any>>(
      collectionPath: string
    ): Promise<(T & { id: string })[]> {
      const snap = await db.collection(collectionPath).get();
      return snap.docs.map(
        (d) => ({ id: d.id, ...d.data() } as unknown as T & { id: string })
      );
    },

    async countCollection(collectionPath: string): Promise<number> {
      const agg = await db.collection(collectionPath).count().get();
      return agg.data().count;
    },

    async runTransaction<R>(
      fn: (tx: PlatformTransaction) => Promise<R>
    ): Promise<R> {
      return db.runTransaction(async (fsTx) => {
        const wrappedTx: PlatformTransaction = {
          async getDoc<T = Record<string, any>>(path: string): Promise<T | null> {
            const snap = await fsTx.get(db.doc(path));
            if (!snap.exists) return null;
            return normalizeDocData<T>(snap.id, snap.data());
          },
          setDoc(
            path: string,
            data: Record<string, any>,
            options?: { merge?: boolean }
          ): void {
            const payload = enrichWithFirestoreTimestamps(data);
            if (options?.merge) {
              fsTx.set(db.doc(path), payload, { merge: true });
            } else {
              fsTx.set(db.doc(path), payload);
            }
          },
          updateDoc(path: string, data: Record<string, any>): void {
            const payload = enrichWithFirestoreTimestamps(data);
            fsTx.update(db.doc(path), payload);
          },
          deleteDoc(path: string): void {
            fsTx.delete(db.doc(path));
          },
        };
        return fn(wrappedTx);
      });
    },
  };
}

export function createFirebaseAdminAuthProvider(): PlatformAuthProvider {
  const app = getOrInitAdminApp();
  const adminAuth = getAuth(app);

  return {
    async verifyIdToken(idToken: string): Promise<VerifiedCaller> {
      try {
        const decoded = await adminAuth.verifyIdToken(idToken, true);
        return {
          uid: decoded.uid,
          email: decoded.email,
          isAnonymous: decoded.firebase?.sign_in_provider === "anonymous",
          claims: decoded,
        };
      } catch {
        throw new PlatformApiError(
          "unauthenticated",
          "Invalid or expired authentication session. Please sign in again."
        );
      }
    },

    async verifyPasswordWithProvider(
      email: string,
      password: string
    ): Promise<{ uid: string; email: string }> {
      const apiKey =
        process.env.FIREBASE_WEB_API_KEY ||
        process.env.VITE_FIREBASE_API_KEY ||
        "demo-api-key";

      const emulatorHost = process.env.FIREBASE_AUTH_EMULATOR_HOST;
      const endpoint = emulatorHost
        ? `http://${emulatorHost}/identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=${encodeURIComponent(
            apiKey
          )}`
        : `https://identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=${encodeURIComponent(
            apiKey
          )}`;

      if (!emulatorHost && apiKey === "demo-api-key") {
        throw new PlatformApiError(
          "failed-precondition",
          "Server authentication provider requires FIREBASE_WEB_API_KEY (or VITE_FIREBASE_API_KEY) to be configured."
        );
      }

      const res = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email,
          password,
          returnSecureToken: false,
        }),
      });

      if (!res.ok) {
        throw new PlatformApiError(
          "unauthenticated",
          "Invalid username/email or password."
        );
      }

      const json = (await res.json()) as { localId?: string; email?: string };
      if (!json.localId) {
        throw new PlatformApiError(
          "unauthenticated",
          "Invalid username/email or password."
        );
      }

      return {
        uid: json.localId,
        email: json.email || email,
      };
    },

    async createUser(params): Promise<{ uid: string; email: string }> {
      try {
        const rec = await adminAuth.createUser({
          email: params.email,
          password: params.password,
          displayName: params.displayName,
          emailVerified: true,
        });
        return { uid: rec.uid, email: rec.email || params.email };
      } catch (err: any) {
        if (err?.code === "auth/email-already-exists") {
          throw new PlatformApiError(
            "already-exists",
            "An account with this owner email already exists."
          );
        }
        throw new PlatformApiError(
          "internal",
          err?.message || "Failed to create authentication account."
        );
      }
    },

    async getUserByEmail(email: string): Promise<{ uid: string; email: string } | null> {
      try {
        const rec = await adminAuth.getUserByEmail(email);
        return { uid: rec.uid, email: rec.email || email };
      } catch (err: any) {
        if (err?.code === "auth/user-not-found") {
          return null;
        }
        throw err;
      }
    },

    async updateUser(uid, params): Promise<void> {
      const updatePayload: Record<string, any> = {};
      if (params.email !== undefined) updatePayload.email = params.email;
      if (params.password !== undefined) updatePayload.password = params.password;
      if (params.displayName !== undefined) updatePayload.displayName = params.displayName;
      if (params.disabled !== undefined) updatePayload.disabled = params.disabled;
      await adminAuth.updateUser(uid, updatePayload);
    },

    async deleteUser(uid: string): Promise<void> {
      await adminAuth.deleteUser(uid);
    },

    async setCustomUserClaims(uid: string, claims: CustomClaimsPayload): Promise<void> {
      await adminAuth.setCustomUserClaims(uid, {
        role: claims.role,
        businessId: claims.businessId,
        mustChangePassword: claims.mustChangePassword,
        admin: claims.role === "SUPER_ADMIN",
      });
    },

    async revokeRefreshTokens(uid: string): Promise<void> {
      await adminAuth.revokeRefreshTokens(uid);
    },

    async createCustomToken(
      uid: string,
      developerClaims?: Record<string, any>
    ): Promise<string> {
      return adminAuth.createCustomToken(uid, developerClaims);
    },
  };
}

export const createFirebaseAdminAuth = createFirebaseAdminAuthProvider;

