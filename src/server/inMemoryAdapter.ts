import crypto from "crypto";
import {
  CustomClaimsPayload,
  PlatformApiError,
  PlatformAuthProvider,
  PlatformClock,
  PlatformDataStore,
  PlatformTransaction,
  VerifiedCaller,
} from "./storeTypes";

function cloneDeep<T>(val: T): T {
  return val === undefined ? val : JSON.parse(JSON.stringify(val));
}

export class MutableClock implements PlatformClock {
  private currentMs: number;
  constructor(initialMs: number = Date.now()) {
    this.currentMs = initialMs;
  }
  now(): number {
    return this.currentMs;
  }
  setNow(ms: number): void {
    this.currentMs = ms;
  }
  advanceMs(deltaMs: number): void {
    this.currentMs += deltaMs;
  }
}

export class InMemoryPlatformDataStore implements PlatformDataStore {
  private docs = new Map<string, Record<string, any>>();

  private normalizePath(p: string): string {
    return p.replace(/^\/+|\/+$/g, "");
  }

  private getIdFromPath(p: string): string {
    const parts = this.normalizePath(p).split("/");
    return parts[parts.length - 1] || "";
  }

  async getDoc<T = Record<string, any>>(path: string): Promise<T | null> {
    const key = this.normalizePath(path);
    const existing = this.docs.get(key);
    if (!existing) return null;
    return cloneDeep({ id: this.getIdFromPath(key), ...existing }) as unknown as T;
  }

  async setDoc(
    path: string,
    data: Record<string, any>,
    options?: { merge?: boolean }
  ): Promise<void> {
    const key = this.normalizePath(path);
    if (options?.merge && this.docs.has(key)) {
      const prev = this.docs.get(key)!;
      this.docs.set(key, { ...cloneDeep(prev), ...cloneDeep(data) });
    } else {
      this.docs.set(key, cloneDeep(data));
    }
  }

  async updateDoc(path: string, data: Record<string, any>): Promise<void> {
    const key = this.normalizePath(path);
    const prev = this.docs.get(key);
    if (!prev) {
      throw new PlatformApiError("not-found", `Document not found at ${key}`);
    }
    this.docs.set(key, { ...cloneDeep(prev), ...cloneDeep(data) });
  }

  async deleteDoc(path: string): Promise<void> {
    const key = this.normalizePath(path);
    this.docs.delete(key);
  }

  async listCollection<T = Record<string, any>>(
    collectionPath: string
  ): Promise<(T & { id: string })[]> {
    const prefix = this.normalizePath(collectionPath);
    const prefixDepth = prefix.split("/").length;
    const results: (T & { id: string })[] = [];

    for (const [docPath, docVal] of this.docs.entries()) {
      if (!docPath.startsWith(prefix + "/")) continue;
      const parts = docPath.split("/");
      if (parts.length !== prefixDepth + 1) continue;
      const id = parts[parts.length - 1];
      results.push(cloneDeep({ id, ...docVal }) as unknown as T & { id: string });
    }
    return results;
  }

  async getCollection<T = Record<string, any>>(
    collectionPath: string
  ): Promise<(T & { id: string })[]> {
    return this.listCollection<T>(collectionPath);
  }

  async countCollection(collectionPath: string): Promise<number> {
    const all = await this.listCollection(collectionPath);
    return all.length;
  }

  async runTransaction<R>(
    fn: (tx: PlatformTransaction) => Promise<R>
  ): Promise<R> {
    // Snapshot entire map so any thrown error rolls back 100% atomically
    const snapshot = new Map<string, Record<string, any>>();
    for (const [k, v] of this.docs.entries()) {
      snapshot.set(k, cloneDeep(v));
    }

    const working = new Map<string, Record<string, any>>();
    for (const [k, v] of snapshot.entries()) {
      working.set(k, cloneDeep(v));
    }

    const tx: PlatformTransaction = {
      getDoc: async <T = Record<string, any>>(path: string): Promise<T | null> => {
        const key = this.normalizePath(path);
        const existing = working.get(key);
        if (!existing) return null;
        return cloneDeep({
          id: this.getIdFromPath(key),
          ...existing,
        }) as unknown as T;
      },
      setDoc: (
        path: string,
        data: Record<string, any>,
        options?: { merge?: boolean }
      ): void => {
        const key = this.normalizePath(path);
        if (options?.merge && working.has(key)) {
          working.set(key, {
            ...cloneDeep(working.get(key)!),
            ...cloneDeep(data),
          });
        } else {
          working.set(key, cloneDeep(data));
        }
      },
      updateDoc: (path: string, data: Record<string, any>): void => {
        const key = this.normalizePath(path);
        const existing = working.get(key);
        if (!existing) {
          throw new PlatformApiError("not-found", `Document not found at ${key}`);
        }
        working.set(key, { ...cloneDeep(existing), ...cloneDeep(data) });
      },
      deleteDoc: (path: string): void => {
        const key = this.normalizePath(path);
        working.delete(key);
      },
    };

    const result = await fn(tx);
    this.docs = working;
    return result;
  }
}

interface StoredAuthAccount {
  uid: string;
  email: string;
  passwordHash: string;
  displayName: string;
  disabled: boolean;
  claims: Record<string, any>;
  tokenVersion: number;
}

export class InMemoryPlatformAuthProvider implements PlatformAuthProvider {
  private usersByUid = new Map<string, StoredAuthAccount>();
  public failNextCreateUser = false;

  private hashPw(pw: string): string {
    return crypto.createHash("sha256").update(pw).digest("hex");
  }

  /**
   * Test helper to issue a verifiable ID token for a user or anonymous guest.
   */
  issueTestIdToken(uid: string, anonymous: boolean = false): string {
    if (anonymous) {
      return JSON.stringify({ uid, isAnonymous: true, tokenVersion: 0 });
    }
    const u = this.usersByUid.get(uid);
    if (!u) throw new Error(`Unknown test uid ${uid}`);
    return JSON.stringify({
      uid: u.uid,
      email: u.email,
      isAnonymous: false,
      tokenVersion: u.tokenVersion,
    });
  }

  async verifyIdToken(idToken: string): Promise<VerifiedCaller> {
    try {
      const parsed = JSON.parse(idToken);
      if (parsed.isAnonymous) {
        return {
          uid: parsed.uid,
          isAnonymous: true,
          claims: {},
        };
      }
      const u = this.usersByUid.get(parsed.uid);
      if (!u || u.disabled || u.tokenVersion !== parsed.tokenVersion) {
        throw new Error("Revoked or disabled token");
      }
      return {
        uid: u.uid,
        email: u.email,
        isAnonymous: false,
        claims: { ...u.claims },
      };
    } catch {
      throw new PlatformApiError("unauthenticated", "Invalid authentication token.");
    }
  }

  async verifyPasswordWithProvider(
    email: string,
    password: string
  ): Promise<{ uid: string; email: string }> {
    const normalized = email.trim().toLowerCase();
    for (const u of this.usersByUid.values()) {
      if (u.email === normalized) {
        if (u.disabled || u.passwordHash !== this.hashPw(password)) {
          throw new PlatformApiError(
            "unauthenticated",
            "Invalid username/email or password."
          );
        }
        return { uid: u.uid, email: u.email };
      }
    }
    throw new PlatformApiError(
      "unauthenticated",
      "Invalid username/email or password."
    );
  }

  async createUser(params: {
    email: string;
    password: string;
    displayName: string;
  }): Promise<{ uid: string; email: string }> {
    if (this.failNextCreateUser) {
      this.failNextCreateUser = false;
      throw new PlatformApiError("internal", "Simulated Auth provider outage.");
    }
    const normalized = params.email.trim().toLowerCase();
    for (const u of this.usersByUid.values()) {
      if (u.email === normalized) {
        throw new PlatformApiError(
          "already-exists",
          "An account with this owner email already exists."
        );
      }
    }
    const uid = "uid_" + crypto.randomBytes(6).toString("hex");
    this.usersByUid.set(uid, {
      uid,
      email: normalized,
      passwordHash: this.hashPw(params.password),
      displayName: params.displayName,
      disabled: false,
      claims: {},
      tokenVersion: 1,
    });
    return { uid, email: normalized };
  }

  async getUserByEmail(
    email: string
  ): Promise<{ uid: string; email: string } | null> {
    const normalized = email.trim().toLowerCase();
    for (const u of this.usersByUid.values()) {
      if (u.email === normalized) {
        return { uid: u.uid, email: u.email };
      }
    }
    return null;
  }

  async updateUser(
    uid: string,
    params: {
      email?: string;
      password?: string;
      displayName?: string;
      disabled?: boolean;
    }
  ): Promise<void> {
    const u = this.usersByUid.get(uid);
    if (!u) throw new PlatformApiError("not-found", "Auth user not found.");
    if (params.email !== undefined) {
      const normalized = params.email.trim().toLowerCase();
      for (const other of this.usersByUid.values()) {
        if (other.uid !== uid && other.email === normalized) {
          throw new PlatformApiError(
            "already-exists",
            "Email already used by another account."
          );
        }
      }
      u.email = normalized;
    }
    if (params.password !== undefined) {
      u.passwordHash = this.hashPw(params.password);
    }
    if (params.displayName !== undefined) u.displayName = params.displayName;
    if (params.disabled !== undefined) u.disabled = params.disabled;
  }

  async deleteUser(uid: string): Promise<void> {
    this.usersByUid.delete(uid);
  }

  async setCustomUserClaims(
    uid: string,
    claims: CustomClaimsPayload
  ): Promise<void> {
    const u = this.usersByUid.get(uid);
    if (!u) throw new PlatformApiError("not-found", "Auth user not found.");
    u.claims = {
      role: claims.role,
      businessId: claims.businessId,
      mustChangePassword: claims.mustChangePassword,
      admin: claims.role === "SUPER_ADMIN",
    };
  }

  async revokeRefreshTokens(uid: string): Promise<void> {
    const u = this.usersByUid.get(uid);
    if (u) {
      u.tokenVersion += 1;
    }
  }

  async createCustomToken(
    uid: string,
    developerClaims?: Record<string, any>
  ): Promise<string> {
    const u = this.usersByUid.get(uid);
    if (!u) throw new PlatformApiError("not-found", "Auth user not found.");
    if (developerClaims) {
      u.claims = { ...u.claims, ...developerClaims };
    }
    return this.issueTestIdToken(uid, false);
  }
}

