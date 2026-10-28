import { initializeApp, getApps, getApp } from "firebase/app";
import { 
  getAuth, 
  connectAuthEmulator, 
  signInAnonymously,
  onAuthStateChanged,
  User 
} from "firebase/auth";
import { 
  getFirestore, 
  connectFirestoreEmulator 
} from "firebase/firestore";
import { 
  getStorage, 
  connectStorageEmulator 
} from "firebase/storage";
import { 
  getFunctions, 
  connectFunctionsEmulator, 
  httpsCallable 
} from "firebase/functions";

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || "demo-teatime-key",
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || "teatime-cafe-app.firebaseapp.com",
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || "teatime-cafe-app",
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || "teatime-cafe-app.appspot.com",
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || "123456789012",
  appId: import.meta.env.VITE_FIREBASE_APP_ID || "1:123456789012:web:abcdef123456",
};

// Initialize Firebase App
export const app = getApps().length > 0 ? getApp() : initializeApp(firebaseConfig);

export const auth = getAuth(app);
export const db = getFirestore(app);
export const storage = getStorage(app);
export const functions = getFunctions(app, import.meta.env.VITE_FIREBASE_FUNCTIONS_REGION || "us-central1");

// Connect to Emulators only if explicitly enabled
const shouldUseEmulators = import.meta.env.VITE_USE_FIREBASE_EMULATORS === "true";

let emulatorsConnected = false;

export function initEmulators() {
  if (shouldUseEmulators && !emulatorsConnected) {
    try {
      // Connect to local ports matching firebase.json
      connectAuthEmulator(auth, "http://127.0.0.1:9099", { disableWarnings: true });
      connectFirestoreEmulator(db, "127.0.0.1", 8080);
      connectStorageEmulator(storage, "127.0.0.1", 9199);
      connectFunctionsEmulator(functions, "127.0.0.1", 5001);
      emulatorsConnected = true;
      console.log("Connected to Firebase Emulators (Auth:9099, Firestore:8080, Functions:5001, Storage:9199)");
    } catch (err) {
      console.warn("Firebase emulator connection notice:", err);
    }
  }
}

// Call on startup
initEmulators();

/**
 * Silent anonymous authentication for customers.
 * Customers are never prompted for login/credentials.
 */
export async function getOrInitAnonymousCustomer(): Promise<User> {
  return new Promise((resolve, reject) => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (user) {
        unsubscribe();
        resolve(user);
      } else {
        try {
          const cred = await signInAnonymously(auth);
          unsubscribe();
          resolve(cred.user);
        } catch (error) {
          unsubscribe();
          reject(error);
        }
      }
    }, (error) => {
      unsubscribe();
      reject(error);
    });
  });
}

// Cloud Function callers
export const callCreateOrder = httpsCallable<
  { tableToken: string; items: { productId: string; quantity: number }[]; specialInstructions?: string; idempotencyKey: string },
  { success: boolean; orderId: string; orderNumber: number; orderNumberDisplay: string; tableNumber: string; totalMinor: number; duplicate?: boolean }
>(functions, "createOrder");

export const callUpdateOrderStatus = httpsCallable<
  { orderId: string; status: string; cancelReason?: string },
  { success: boolean; orderId: string; status: string }
>(functions, "updateOrderStatus");

export const callSetAdminClaim = httpsCallable<
  { targetEmail: string; secretKey: string },
  { success: boolean; message: string }
>(functions, "setAdminClaim");

