import {
  createClient,
  type SupabaseClient,
  type User as SupabaseAuthUser,
  type Session,
} from "@supabase/supabase-js";

const DEFAULT_SUPABASE_URL = "https://gcuspdyavyqeetevcptg.supabase.co";
const DEFAULT_SUPABASE_PUBLISHABLE_KEY = "sb_publishable_l-nFWwfyZuIDHW2gsvBDNw_WuEYB8Ag";

export function getSupabaseConfig(): { url: string; key: string } {
  const url = (import.meta.env.VITE_SUPABASE_URL || DEFAULT_SUPABASE_URL).trim();
  const key = (
    import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY || DEFAULT_SUPABASE_PUBLISHABLE_KEY
  ).trim();

  if (!url || !key) {
    throw new Error("Supabase project URL and publishable key are not configured.");
  }
  if (key.startsWith("sb_secret_")) {
    throw new Error("Use a Supabase publishable key in the browser, never a secret key.");
  }
  return { url, key };
}

let client: SupabaseClient | undefined;

/** Singleton browser Supabase client. */
export function getSupabase(): SupabaseClient {
  if (client) return client;

  const { url, key } = getSupabaseConfig();
  client = createClient(url, key, {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true,
    },
  });
  return client;
}

/**
 * Isolated non-persisting Supabase client used when Super Admin provisions a new
 * restaurant owner account without replacing the active Super Admin session.
 */
export function createEphemeralSupabaseClient(): SupabaseClient {
  const { url, key } = getSupabaseConfig();
  return createClient(url, key, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
      detectSessionInUrl: false,
      storageKey: `menyo_ephemeral_${Date.now()}_${Math.random().toString(36).slice(2)}`,
    },
  });
}

// =============================================================================
// Unified Auth Layer (Supabase Auth)
// =============================================================================

export interface AppUser {
  uid: string;
  email: string | null;
  displayName: string | null;
  isAnonymous: boolean;
  appMetadata: Record<string, any>;
  getIdToken: (forceRefresh?: boolean) => Promise<string>;
  getIdTokenResult: (forceRefresh?: boolean) => Promise<{
    token: string;
    claims: Record<string, any>;
  }>;
}

export type User = AppUser;

function buildClaimsFromSupabaseUser(sbUser: SupabaseAuthUser): Record<string, any> {
  const appMeta = sbUser.app_metadata || {};
  const emailLower = (sbUser.email || "").toLowerCase();
  const isAnon = Boolean((sbUser as any).is_anonymous);
  const isSuperAdmin =
    !isAnon && (appMeta.role === "SUPER_ADMIN" || emailLower === "admin@aevonix.lk");
  const isTeaTimeAdmin =
    !isAnon && (emailLower === "admin@teatime.lk" || appMeta.businessId === "teatime");

  return {
    ...appMeta,
    email: sbUser.email || undefined,
    role: appMeta.role || (isSuperAdmin ? "SUPER_ADMIN" : !isAnon ? "BUSINESS_OWNER" : undefined),
    businessId: appMeta.businessId ?? (isTeaTimeAdmin ? "teatime" : null),
    mustChangePassword: Boolean(appMeta.mustChangePassword),
    admin: Boolean(appMeta.admin || isSuperAdmin || isTeaTimeAdmin || !isAnon),
  };
}

export function mapSupabaseUser(sbUser: SupabaseAuthUser | null, session?: Session | null): AppUser | null {
  if (!sbUser) return null;
  const isAnon = Boolean((sbUser as any).is_anonymous);
  const userMeta = sbUser.user_metadata || {};
  const displayName =
    userMeta.full_name || userMeta.name || userMeta.display_name || null;

  return {
    uid: sbUser.id,
    email: sbUser.email ?? null,
    displayName,
    isAnonymous: isAnon,
    appMetadata: sbUser.app_metadata || {},
    async getIdToken(forceRefresh?: boolean): Promise<string> {
      const supabase = getSupabase();
      if (forceRefresh) {
        const { data } = await supabase.auth.refreshSession();
        if (data.session?.access_token) return data.session.access_token;
      }
      const { data } = await supabase.auth.getSession();
      return data.session?.access_token || session?.access_token || "";
    },
    async getIdTokenResult(forceRefresh?: boolean) {
      const supabase = getSupabase();
      let activeSession = session ?? null;
      let activeUser: SupabaseAuthUser = sbUser;
      if (forceRefresh) {
        const { data } = await supabase.auth.refreshSession();
        if (data.session) activeSession = data.session;
        if (data.user) activeUser = data.user;
      } else if (!activeSession) {
        const { data } = await supabase.auth.getSession();
        if (data.session) activeSession = data.session;
        if (data.session?.user) activeUser = data.session.user;
      }
      return {
        token: activeSession?.access_token || "",
        claims: buildClaimsFromSupabaseUser(activeUser),
      };
    },
  };
}

function createLocalGuestUser(): AppUser {
  let guestUid = "guest_local";
  if (typeof window !== "undefined") {
    const existing = localStorage.getItem("menyo_guest_uid");
    if (existing) {
      guestUid = existing;
    } else {
      guestUid = `guest_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
      localStorage.setItem("menyo_guest_uid", guestUid);
    }
  }
  return {
    uid: guestUid,
    email: null,
    displayName: "Guest Customer",
    isAnonymous: true,
    appMetadata: {},
    async getIdToken() {
      return "";
    },
    async getIdTokenResult() {
      return { token: "", claims: { isAnonymous: true, admin: false } };
    },
  };
}

type AuthListener = (user: AppUser | null) => void;

class SupabaseAuthManager {
  public currentUser: AppUser | null = null;
  private initialized = false;
  private listeners = new Set<AuthListener>();

  constructor() {
    this.ensureInitialized();
  }

  private ensureInitialized() {
    if (this.initialized) return;
    this.initialized = true;

    try {
      const supabase = getSupabase();
      supabase.auth.getSession().then(({ data }) => {
        const mapped = mapSupabaseUser(data.session?.user ?? null, data.session);
        if (mapped) {
          this.currentUser = mapped;
          this.notify();
        }
      }).catch(() => {});

      supabase.auth.onAuthStateChange((_event, session) => {
        const mapped = mapSupabaseUser(session?.user ?? null, session);
        this.currentUser = mapped;
        this.notify();
      });
    } catch {
      // Ignore during SSR or test without env
    }
  }

  public setFallbackGuest(guest: AppUser) {
    if (!this.currentUser) {
      this.currentUser = guest;
      this.notify();
    }
  }

  private notify() {
    for (const cb of Array.from(this.listeners)) {
      try {
        cb(this.currentUser);
      } catch (e) {
        console.warn("Auth listener error:", e);
      }
    }
  }

  public subscribe(onNext: AuthListener, onError?: (err: any) => void): () => void {
    this.ensureInitialized();
    this.listeners.add(onNext);

    const supabase = getSupabase();
    supabase.auth
      .getSession()
      .then(({ data }) => {
        const mapped = mapSupabaseUser(data.session?.user ?? null, data.session);
        this.currentUser = mapped ?? this.currentUser;
        onNext(this.currentUser);
      })
      .catch((err) => {
        if (onError) onError(err);
        else onNext(null);
      });

    return () => {
      this.listeners.delete(onNext);
    };
  }
}

export const auth = new SupabaseAuthManager();

export function onAuthStateChanged(
  authInstance: SupabaseAuthManager,
  onNext: (user: AppUser | null) => void,
  onError?: (error: any) => void
): () => void {
  return authInstance.subscribe(onNext, onError);
}

function normalizeSupabaseAuthError(error: any): Error & { code?: string } {
  const msg = String(error?.message || "Authentication failed.");
  const lower = msg.toLowerCase();
  const wrapped = new Error(msg) as Error & { code?: string };

  if (lower.includes("invalid login credentials") || lower.includes("invalid_credentials")) {
    wrapped.code = "auth/invalid-credential";
  } else if (lower.includes("already registered") || lower.includes("already exists")) {
    wrapped.code = "auth/email-already-in-use";
  } else if (lower.includes("email not confirmed")) {
    wrapped.code = "auth/email-not-confirmed";
  } else {
    wrapped.code = error?.code || "auth/error";
  }
  return wrapped;
}

export async function signInWithEmailAndPassword(
  _authInstance: SupabaseAuthManager,
  email: string,
  password: string,
  customClient?: SupabaseClient
): Promise<{ user: AppUser }> {
  const sb = customClient || getSupabase();
  const { data, error } = await sb.auth.signInWithPassword({
    email: email.trim(),
    password,
  });
  if (error || !data.user) {
    throw normalizeSupabaseAuthError(error);
  }
  const mapped = mapSupabaseUser(data.user, data.session)!;
  if (!customClient) {
    auth.currentUser = mapped;
  }
  return { user: mapped };
}

export async function createUserWithEmailAndPassword(
  _authInstance: SupabaseAuthManager,
  email: string,
  password: string,
  options?: { displayName?: string; customClient?: SupabaseClient }
): Promise<{ user: AppUser }> {
  const sb = options?.customClient || getSupabase();
  const { data, error } = await sb.auth.signUp({
    email: email.trim(),
    password,
    options: options?.displayName
      ? { data: { full_name: options.displayName } }
      : undefined,
  });
  if (error || !data.user) {
    throw normalizeSupabaseAuthError(error);
  }
  const mapped = mapSupabaseUser(data.user, data.session)!;
  if (!options?.customClient && data.session) {
    auth.currentUser = mapped;
  }
  return { user: mapped };
}

export async function signInAnonymously(
  _authInstance?: SupabaseAuthManager
): Promise<{ user: AppUser }> {
  const supabase = getSupabase();
  const { data, error } = await supabase.auth.signInAnonymously();
  if (!error && data.user) {
    const mapped = mapSupabaseUser(data.user, data.session)!;
    auth.currentUser = mapped;
    return { user: mapped };
  }

  // Graceful guest fallback if Anonymous Sign-Ins provider is not yet enabled in Supabase Dashboard
  const guest = createLocalGuestUser();
  auth.setFallbackGuest(guest);
  return { user: guest };
}

export async function signOut(
  _authInstance?: SupabaseAuthManager,
  customClient?: SupabaseClient
): Promise<void> {
  const sb = customClient || getSupabase();
  await sb.auth.signOut();
  if (!customClient) {
    auth.currentUser = null;
  }
}

export async function updateUserPassword(newPassword: string): Promise<void> {
  const supabase = getSupabase();
  const { error } = await supabase.auth.updateUser({ password: newPassword });
  if (error) {
    throw normalizeSupabaseAuthError(error);
  }
}

export async function signInWithOAuthProvider(provider: "google" | "apple"): Promise<void> {
  const supabase = getSupabase();
  const redirectTo =
    typeof window !== "undefined" ? `${window.location.origin}/admin` : undefined;
  const { error } = await supabase.auth.signInWithOAuth({
    provider,
    options: {
      redirectTo,
      queryParams: provider === "google" ? { prompt: "select_account" } : undefined,
    },
  });
  if (error) {
    throw normalizeSupabaseAuthError(error);
  }
}

/**
 * Silent anonymous authentication for QR menu customers.
 * Customers are never prompted for login/credentials.
 */
export async function getOrInitAnonymousCustomer(): Promise<AppUser> {
  const supabase = getSupabase();
  const { data } = await supabase.auth.getSession();
  if (data.session?.user) {
    const mapped = mapSupabaseUser(data.session.user, data.session)!;
    auth.currentUser = mapped;
    return mapped;
  }
  const res = await signInAnonymously(auth);
  return res.user;
}

// =============================================================================
// Supabase Storage Layer (`media` bucket)
// =============================================================================

export interface StorageObjectRef {
  bucket: string;
  path: string;
}

export const storage = { bucket: "media" };

export function ref(
  storageInstance: { bucket?: string } | null | undefined,
  objectPath: string
): StorageObjectRef {
  return {
    bucket: storageInstance?.bucket || "media",
    path: objectPath.replace(/^\/+/, ""),
  };
}

export async function uploadBytes(
  storageRef: StorageObjectRef,
  file: Blob | File
): Promise<{ path: string }> {
  const supabase = getSupabase();
  const contentType = (file as File).type || "application/octet-stream";
  const { data, error } = await supabase.storage
    .from(storageRef.bucket)
    .upload(storageRef.path, file, {
      upsert: true,
      contentType,
    });
  if (error) {
    throw new Error(error.message || "Failed to upload file to Supabase Storage.");
  }
  return { path: data.path };
}

export async function getDownloadURL(storageRef: StorageObjectRef): Promise<string> {
  const supabase = getSupabase();
  const { data } = supabase.storage.from(storageRef.bucket).getPublicUrl(storageRef.path);
  return data.publicUrl;
}
