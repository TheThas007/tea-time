import { UserRole } from "../types";

export type PlatformErrorCode =
  | "unauthenticated"
  | "permission-denied"
  | "invalid-argument"
  | "not-found"
  | "already-exists"
  | "failed-precondition"
  | "resource-exhausted"
  | "internal";

export class PlatformApiError extends Error {
  public readonly code: PlatformErrorCode;
  public readonly details?: Record<string, any>;

  constructor(
    code: PlatformErrorCode,
    message: string,
    details?: Record<string, any>
  ) {
    super(message);
    this.name = "PlatformApiError";
    this.code = code;
    this.details = details;
  }
}

export interface VerifiedCaller {
  uid: string;
  email?: string;
  isAnonymous?: boolean;
  claims: Record<string, any>;
}

export interface CustomClaimsPayload {
  role: UserRole;
  businessId: string | null;
  mustChangePassword: boolean;
  admin?: boolean; // Kept true ONLY for SUPER_ADMIN legacy compatibility if needed
}

export interface PlatformTransaction {
  getDoc<T = Record<string, any>>(path: string): Promise<T | null>;
  setDoc(path: string, data: Record<string, any>, options?: { merge?: boolean }): void;
  updateDoc(path: string, data: Record<string, any>): void;
  deleteDoc(path: string): void;
}

export interface PlatformDataStore {
  getDoc<T = Record<string, any>>(path: string): Promise<T | null>;
  setDoc(
    path: string,
    data: Record<string, any>,
    options?: { merge?: boolean }
  ): Promise<void>;
  updateDoc(path: string, data: Record<string, any>): Promise<void>;
  deleteDoc(path: string): Promise<void>;
  listCollection<T = Record<string, any>>(
    collectionPath: string
  ): Promise<(T & { id: string })[]>;
  countCollection(collectionPath: string): Promise<number>;
  runTransaction<R>(fn: (tx: PlatformTransaction) => Promise<R>): Promise<R>;
}

export interface PlatformAuthProvider {
  verifyIdToken(idToken: string): Promise<VerifiedCaller>;
  verifyPasswordWithProvider(
    email: string,
    password: string
  ): Promise<{ uid: string; email: string }>;
  createUser(params: {
    email: string;
    password: string;
    displayName: string;
  }): Promise<{ uid: string; email: string }>;
  getUserByEmail(email: string): Promise<{ uid: string; email: string } | null>;
  updateUser(
    uid: string,
    params: {
      email?: string;
      password?: string;
      displayName?: string;
      disabled?: boolean;
    }
  ): Promise<void>;
  deleteUser(uid: string): Promise<void>;
  setCustomUserClaims(uid: string, claims: CustomClaimsPayload): Promise<void>;
  revokeRefreshTokens(uid: string): Promise<void>;
  createCustomToken(
    uid: string,
    developerClaims?: Record<string, any>
  ): Promise<string>;
}

export interface PlatformClock {
  now(): number;
}

