import React, { createContext, useContext, useEffect, useState } from "react";
import { User, onAuthStateChanged, signOut as fbSignOut } from "firebase/auth";
import { auth, getOrInitAnonymousCustomer } from "../lib/firebase";

interface AuthContextType {
  user: User | null;
  isAdmin: boolean;
  isLoading: boolean;
  isAnonymous: boolean;
  signOutAdmin: () => Promise<void>;
  refreshAdminClaims: () => Promise<boolean>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  const checkAdminStatus = async (currentUser: User | null): Promise<boolean> => {
    if (!currentUser) return false;
    if (currentUser.isAnonymous) return false;

    try {
      // Force token refresh to fetch custom claims
      const tokenResult = await currentUser.getIdTokenResult(true);
      if (tokenResult.claims.admin === true) {
        return true;
      }
    } catch (e) {
      console.warn("Error checking admin claims:", e);
    }
    return false;
  };

  const refreshAdminClaims = async (): Promise<boolean> => {
    if (user && !user.isAnonymous) {
      const adminStatus = await checkAdminStatus(user);
      setIsAdmin(adminStatus);
      return adminStatus;
    }
    return false;
  };

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      setUser(currentUser);

      if (currentUser) {
        if (!currentUser.isAnonymous) {
          const adminStatus = await checkAdminStatus(currentUser);
          setIsAdmin(adminStatus);
        } else {
          setIsAdmin(false);
        }
        setIsLoading(false);
      } else {
        // If no user exists, silently sign in anonymously in background for customer
        try {
          const anonUser = await getOrInitAnonymousCustomer();
          setUser(anonUser);
          setIsAdmin(false);
        } catch (err) {
          console.warn("Silent anonymous login initialization error:", err);
        } finally {
          setIsLoading(false);
        }
      }
    });

    return () => unsubscribe();
  }, []);

  const signOutAdmin = async () => {
    await fbSignOut(auth);
    // After signing out of admin, restore anonymous customer session
    const anon = await getOrInitAnonymousCustomer();
    setUser(anon);
    setIsAdmin(false);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        isAdmin,
        isLoading,
        isAnonymous: !!user?.isAnonymous,
        signOutAdmin,
        refreshAdminClaims,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return ctx;
};

