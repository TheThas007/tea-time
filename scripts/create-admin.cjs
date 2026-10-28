/**
 * Admin User Provisioning Script for TEA TIME
 * Creates or updates an admin user with email/password and sets { admin: true } custom claims.
 *
 * Usage:
 *   node scripts/create-admin.cjs <email> <password>
 * Example:
 *   node scripts/create-admin.cjs admin@teatime.lk Admin@TeaTime2026!
 */

const { initializeApp } = require("firebase-admin/app");
const { getAuth } = require("firebase-admin/auth");
const { getFirestore, FieldValue } = require("firebase-admin/firestore");

if (!process.env.FIREBASE_AUTH_EMULATOR_HOST && process.env.USE_EMULATOR !== "false") {
  process.env.FIREBASE_AUTH_EMULATOR_HOST = "127.0.0.1:9099";
  process.env.FIRESTORE_EMULATOR_HOST = "127.0.0.1:8080";
  console.log("Connecting to Auth & Firestore Emulators at 127.0.0.1:9099 & :8080");
}

const app = initializeApp({
  projectId: process.env.GCLOUD_PROJECT || "teatime-f4005",
});

const auth = getAuth(app);
const db = getFirestore(app);

async function createAdmin() {
  const args = process.argv.slice(2);
  const email = args[0] || "admin@teatime.lk";
  const password = args[1] || "Admin@TeaTime2026!";

  console.log(`Setting up admin user for: ${email}...`);

  let user;
  try {
    user = await auth.getUserByEmail(email);
    console.log(`Existing user found with UID: ${user.uid}`);
    if (password) {
      await auth.updateUser(user.uid, { password });
      console.log(`Password updated.`);
    }
  } catch (error) {
    if (error.code === "auth/user-not-found") {
      user = await auth.createUser({
        email,
        password,
        displayName: "TEA TIME Manager",
        emailVerified: true,
      });
      console.log(`New user created with UID: ${user.uid}`);
    } else {
      throw error;
    }
  }

  // Set Firebase Auth custom claims: { admin: true }
  await auth.setCustomUserClaims(user.uid, { admin: true });
  console.log(`✅ Set custom claims: { admin: true }`);

  // Record in Firestore admins collection
  await db.collection("admins").doc(user.uid).set({
    email: user.email,
    displayName: user.displayName || "TEA TIME Manager",
    active: true,
    grantedAt: FieldValue.serverTimestamp(),
  }, { merge: true });
  console.log(`✅ Registered in Firestore /admins/${user.uid}`);

  console.log(`\n🎉 Admin user is ready!`);
  console.log(`Email:    ${email}`);
  console.log(`Password: ${password}`);
  console.log(`You can now sign in at http://localhost:3000/admin\n`);
  process.exit(0);
}

createAdmin().catch((err) => {
  console.error("❌ Failed to create admin:", err);
  process.exit(1);
});

