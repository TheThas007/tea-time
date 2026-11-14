import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import {
  CustomClaimsPayload,
  PlatformApiError,
  PlatformAuthProvider,
  PlatformDataStore,
  PlatformTransaction,
  VerifiedCaller,
} from "./storeTypes";
import {
  resolveCollectionSpec,
  resolveDocSpec,
} from "../shared/supabasePathMap";

export function hasSupabaseServerAdminConfig(): boolean {
  const url = (process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || "").trim();
  const secretKey = (
    process.env.SUPABASE_SECRET_KEY ||
    process.env.SUPABASE_SERVICE_ROLE_KEY ||
    ""
  ).trim();
  return Boolean(url && secretKey);
}

let cachedAdminClient: SupabaseClient | null = null;

function getSupabaseAdminClient(): SupabaseClient {
  if (cachedAdminClient) return cachedAdminClient;

  const url = (process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || "").trim();
  const secretKey = (
    process.env.SUPABASE_SECRET_KEY ||
    process.env.SUPABASE_SERVICE_ROLE_KEY ||
    ""
  ).trim();

  if (!url || !secretKey) {
    throw new PlatformApiError(
      "failed-precondition",
      "SUPABASE_URL and SUPABASE_SECRET_KEY (or SUPABASE_SERVICE_ROLE_KEY) are required for server admin execution."
    );
  }

  cachedAdminClient = createClient(url, secretKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
      detectSessionInUrl: false,
    },
  });
  return cachedAdminClient;
}

function getSupabaseVerifyClient(): SupabaseClient {
  const url = (process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || "").trim();
  const pubKey = (
    process.env.SUPABASE_PUBLISHABLE_KEY ||
    process.env.VITE_SUPABASE_PUBLISHABLE_KEY ||
    process.env.SUPABASE_ANON_KEY ||
    process.env.SUPABASE_SECRET_KEY ||
    process.env.SUPABASE_SERVICE_ROLE_KEY ||
    ""
  ).trim();

  if (!url || !pubKey) {
    throw new PlatformApiError(
      "failed-precondition",
      "Supabase URL and publishable key are required for password verification."
    );
  }

  return createClient(url, pubKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
      detectSessionInUrl: false,
    },
  });
}

export function createSupabaseAdminStore(): PlatformDataStore {
  const supabase = getSupabaseAdminClient();

  const store: PlatformDataStore = {
    async getDoc<T = Record<string, any>>(path: string): Promise<T | null> {
      const spec = resolveDocSpec(path);
      let q = supabase.from(spec.table).select("*");
      for (const [col, val] of Object.entries(spec.pkFilter)) {
        q = q.eq(col, val);
      }
      const { data, error } = await q.maybeSingle();
      if (error) {
        throw new PlatformApiError("internal", error.message);
      }
      if (!data) return null;
      const parsed = spec.fromRow(data);
      return { id: parsed.id, ...parsed.data } as unknown as T;
    },

    async setDoc(
      path: string,
      data: Record<string, any>,
      options?: { merge?: boolean }
    ): Promise<void> {
      const spec = resolveDocSpec(path);
      let existingData: Record<string, any> = {};
      if (options?.merge) {
        const existing = await store.getDoc<Record<string, any>>(path);
        if (existing) existingData = existing;
      }
      const row = spec.toRow(spec.docId, data, existingData);
      const { error } = await supabase
        .from(spec.table)
        .upsert(row, { onConflict: spec.pkColumns.join(",") });
      if (error) {
        throw new PlatformApiError("internal", error.message);
      }
    },

    async updateDoc(path: string, data: Record<string, any>): Promise<void> {
      await store.setDoc(path, data, { merge: true });
    },

    async deleteDoc(path: string): Promise<void> {
      const spec = resolveDocSpec(path);
      let q = supabase.from(spec.table).delete();
      for (const [col, val] of Object.entries(spec.pkFilter)) {
        q = q.eq(col, val);
      }
      const { error } = await q;
      if (error) {
        throw new PlatformApiError("internal", error.message);
      }
    },

    async listCollection<T = Record<string, any>>(
      collectionPath: string
    ): Promise<(T & { id: string })[]> {
      const spec = resolveCollectionSpec(collectionPath);
      let q = supabase.from(spec.table).select("*");
      for (const [col, val] of Object.entries(spec.fixedFilters)) {
        q = q.eq(col, val);
      }
      const { data, error } = await q;
      if (error) {
        throw new PlatformApiError("internal", error.message);
      }
      return (data || []).map((row) => {
        const parsed = spec.fromRow(row);
        return { id: parsed.id, ...parsed.data } as unknown as T & { id: string };
      });
    },

    async countCollection(collectionPath: string): Promise<number> {
      const spec = resolveCollectionSpec(collectionPath);
      let q = supabase.from(spec.table).select("*", { count: "exact", head: true });
      for (const [col, val] of Object.entries(spec.fixedFilters)) {
        q = q.eq(col, val);
      }
      const { count, error } = await q;
      if (error) {
        throw new PlatformApiError("internal", error.message);
      }
      return count || 0;
    },

    async runTransaction<R>(fn: (tx: PlatformTransaction) => Promise<R>): Promise<R> {
      const pendingOps: Array<() => Promise<void>> = [];
      const stagedCache = new Map<string, Record<string, any> | null>();

      const tx: PlatformTransaction = {
        async getDoc<T = Record<string, any>>(path: string): Promise<T | null> {
          if (stagedCache.has(path)) {
            return stagedCache.get(path) as T | null;
          }
          const docVal = await store.getDoc<T>(path);
          stagedCache.set(path, (docVal as any) ?? null);
          return docVal;
        },
        setDoc(path: string, data: Record<string, any>, options?: { merge?: boolean }): void {
          const prev = stagedCache.get(path) || {};
          const next = options?.merge ? { ...prev, ...data } : { ...data };
          stagedCache.set(path, next);
          pendingOps.push(() => store.setDoc(path, data, options));
        },
        updateDoc(path: string, data: Record<string, any>): void {
          const prev = stagedCache.get(path) || {};
          stagedCache.set(path, { ...prev, ...data });
          pendingOps.push(() => store.updateDoc(path, data));
        },
        deleteDoc(path: string): void {
          stagedCache.set(path, null);
          pendingOps.push(() => store.deleteDoc(path));
        },
      };

      const result = await fn(tx);
      for (const op of pendingOps) {
        await op();
      }
      return result;
    },
  };

  return store;
}

export function createSupabaseAdminAuthProvider(): PlatformAuthProvider {
  const supabase = getSupabaseAdminClient();

  return {
    async verifyIdToken(idToken: string): Promise<VerifiedCaller> {
      const { data, error } = await supabase.auth.getUser(idToken);
      if (error || !data.user) {
        throw new PlatformApiError(
          "unauthenticated",
          "Invalid or expired authentication session. Please sign in again."
        );
      }
      const u = data.user;
      const appMeta = u.app_metadata || {};
      const isAnonymous = Boolean((u as any).is_anonymous);
      return {
        uid: u.id,
        email: u.email,
        isAnonymous,
        claims: {
          ...appMeta,
          email: u.email,
          role: appMeta.role,
          businessId: appMeta.businessId ?? null,
          mustChangePassword: Boolean(appMeta.mustChangePassword),
          admin: appMeta.role === "SUPER_ADMIN" || Boolean(appMeta.admin),
        },
      };
    },

    async verifyPasswordWithProvider(
      email: string,
      password: string
    ): Promise<{ uid: string; email: string }> {
      const verifyClient = getSupabaseVerifyClient();
      const { data, error } = await verifyClient.auth.signInWithPassword({
        email: email.trim(),
        password,
      });
      if (error || !data.user) {
        throw new PlatformApiError(
          "unauthenticated",
          "Invalid username/email or password."
        );
      }
      return {
        uid: data.user.id,
        email: data.user.email || email,
      };
    },

    async createUser(params): Promise<{ uid: string; email: string }> {
      const { data, error } = await supabase.auth.admin.createUser({
        email: params.email.trim(),
        password: params.password,
        email_confirm: true,
        user_metadata: {
          full_name: params.displayName,
        },
      });
      if (error || !data.user) {
        if (error?.message?.toLowerCase().includes("already")) {
          throw new PlatformApiError(
            "already-exists",
            "An account with this owner email already exists."
          );
        }
        throw new PlatformApiError(
          "internal",
          error?.message || "Failed to create Supabase authentication account."
        );
      }
      return {
        uid: data.user.id,
        email: data.user.email || params.email,
      };
    },

    async getUserByEmail(email: string): Promise<{ uid: string; email: string } | null> {
      const target = email.trim().toLowerCase();
      const { data, error } = await supabase.auth.admin.listUsers({
        page: 1,
        perPage: 1000,
      });
      if (error || !data?.users) return null;
      const found = (data.users as Array<{ id: string; email?: string }>).find(
        (u) => (u.email || "").toLowerCase() === target
      );
      if (!found) return null;
      return { uid: found.id, email: found.email || target };
    },

    async updateUser(uid, params): Promise<void> {
      const payload: Record<string, any> = {};
      if (params.email !== undefined) payload.email = params.email;
      if (params.password !== undefined) payload.password = params.password;
      if (params.displayName !== undefined) {
        payload.user_metadata = { full_name: params.displayName };
      }
      if (params.disabled !== undefined) {
        payload.ban_duration = params.disabled ? "876000h" : "none";
      }
      const { error } = await supabase.auth.admin.updateUserById(uid, payload);
      if (error) {
        throw new PlatformApiError("internal", error.message);
      }
    },

    async deleteUser(uid: string): Promise<void> {
      const { error } = await supabase.auth.admin.deleteUser(uid);
      if (error) {
        throw new PlatformApiError("internal", error.message);
      }
    },

    async setCustomUserClaims(uid: string, claims: CustomClaimsPayload): Promise<void> {
      const { error } = await supabase.auth.admin.updateUserById(uid, {
        app_metadata: {
          role: claims.role,
          businessId: claims.businessId,
          mustChangePassword: claims.mustChangePassword,
          admin: claims.role === "SUPER_ADMIN",
        },
      });
      if (error) {
        throw new PlatformApiError("internal", error.message);
      }
    },

    async revokeRefreshTokens(_uid: string): Promise<void> {
      // Handled automatically by Supabase Auth on password/ban updates
    },

    async createCustomToken(
      _uid: string,
      _developerClaims?: Record<string, any>
    ): Promise<string> {
      // Supabase uses direct JWT sessions via signInWithPassword rather than Firebase custom tokens
      return "";
    },
  };
}
