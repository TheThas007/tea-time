/**
 * Legacy server adapter entrypoint — now delegates directly to the Supabase Admin Adapter.
 */
import {
  createSupabaseAdminAuthProvider,
  createSupabaseAdminStore,
} from "./supabaseAdminAdapter";

export const createFirebaseAdminStore = createSupabaseAdminStore;
export const createFirebaseAdminAuthProvider = createSupabaseAdminAuthProvider;
export const createFirebaseAdminAuth = createSupabaseAdminAuthProvider;
