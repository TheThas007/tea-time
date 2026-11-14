/**
 * Compatibility bridge re-exporting the Supabase Auth, PostgreSQL Store, and Storage handles.
 * Zero Firebase SDK dependencies remain in the client runtime.
 */
export {
  auth,
  storage,
  getOrInitAnonymousCustomer,
  type AppUser,
  type User,
} from "./supabase";

export { db } from "./supabaseStore";
