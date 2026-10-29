/**
 * One-Time Super Admin Bootstrap Script for AEVONIX Restaurant Menu SaaS
 *
 * Usage:
 *   node scripts/bootstrap-super-admin.cjs --username aevonix_admin --email admin@aevonix.lk --password SuperAdmin2026!
 *
 * Environment variables:
 *   FIREBASE_AUTH_EMULATOR_HOST (defaults to 127.0.0.1:9099 if emulator is active)
 *   FIRESTORE_EMULATOR_HOST (defaults to 127.0.0.1:8080 if emulator is active)
 *   FIREBASE_PROJECT_ID (defaults to teatime-f4005 or teatime-cafe-app)
 */

const { initializeApp } = require("firebase-admin/app");
const { getAuth } = require("firebase-admin/auth");
const { getFirestore, Timestamp } = require("firebase-admin/firestore");

if (process.env.USE_EMULATOR === "true" || process.argv.includes("--emulator")) {
  process.env.FIREBASE_AUTH_EMULATOR_HOST = process.env.FIREBASE_AUTH_EMULATOR_HOST || "127.0.0.1:9099";
  process.env.FIRESTORE_EMULATOR_HOST = process.env.FIRESTORE_EMULATOR_HOST || "127.0.0.1:8080";
  console.log("Connecting to Auth & Firestore Emulators at 127.0.0.1:9099 & :8080");
}

const app = initializeApp({
  projectId:
    process.env.FIREBASE_PROJECT_ID ||
    process.env.GCLOUD_PROJECT ||
    "teatime-f4005",
});

const auth = getAuth(app);
const db = getFirestore(app);

function parseArgs() {
  const args = process.argv.slice(2);
  const out = {};
  for (let i = 0; i < args.length; i++) {
    if (args[i].startsWith("--")) {
      const key = args[i].slice(2);
      const val = args[i + 1] && !args[i + 1].startsWith("--") ? args[i + 1] : "true";
      out[key] = val;
      if (val !== "true") i++;
    }
  }
  return out;
}

function validatePassword(pwd) {
  if (!pwd || pwd.length < 8) return "Password must be at least 8 characters.";
  if (!/[A-Z]/.test(pwd)) return "Password must contain at least one uppercase letter.";
  if (!/[0-9]/.test(pwd)) return "Password must contain at least one number.";
  return null;
}

async function runBootstrap() {
  const args = parseArgs();
  const username = (args.username || process.env.BOOTSTRAP_USERNAME || "").trim().toLowerCase();
  const email = (args.email || process.env.BOOTSTRAP_EMAIL || "").trim().toLowerCase();
  const password = args.password || process.env.BOOTSTRAP_PASSWORD || "";
  const fullName = args.name || "AEVONIX Platform Owner";

  console.log("\n=======================================================");
  console.log("   AEVONIX SaaS - Secure Super Admin Bootstrap");
  console.log("=======================================================\n");

  if (!username || !email || !password) {
    console.error("❌ Missing required arguments.");
    console.error("Usage: node scripts/bootstrap-super-admin.cjs --username <user> --email <email> --password <password>");
    process.exit(1);
  }

  const pwdError = validatePassword(password);
  if (pwdError) {
    console.error(`❌ Weak password: ${pwdError}`);
    process.exit(1);
  }

  // 1. Check if a Super Admin is already active
  const existingSuperAdmins = await db
    .collection("userProfiles")
    .where("role", "==", "SUPER_ADMIN")
    .where("active", "==", true)
    .limit(1)
    .get();

  if (!existingSuperAdmins.empty) {
    const existing = existingSuperAdmins.docs[0].data();
    console.error(`❌ Super Admin already exists: @${existing.username} (${existing.email}).`);
    console.error("One-time bootstrap cannot overwrite an existing Super Admin account.");
    process.exit(1);
  }

  // 2. Check if username is already taken
  const uDoc = await db.collection("usernames").doc(username).get();
  if (uDoc.exists) {
    console.error(`❌ Username "${username}" is already assigned.`);
    process.exit(1);
  }

  console.log(`Creating Super Admin user for @${username} (${email})...`);

  let authUser;
  try {
    authUser = await auth.getUserByEmail(email);
    console.log(`Updating existing auth record (UID: ${authUser.uid})...`);
    await auth.updateUser(authUser.uid, {
      password,
      displayName: fullName,
      emailVerified: true,
      disabled: false,
    });
  } catch (err) {
    if (err.code === "auth/user-not-found") {
      authUser = await auth.createUser({
        email,
        password,
        displayName: fullName,
        emailVerified: true,
        disabled: false,
      });
      console.log(`Created new auth user (UID: ${authUser.uid}).`);
    } else {
      console.error("❌ Failed to create/update auth record:", err.message);
      process.exit(1);
    }
  }

  const uid = authUser.uid;
  const nowMs = Date.now();

  try {
    // 3. Set custom user claims
    await auth.setCustomUserClaims(uid, {
      role: "SUPER_ADMIN",
      businessId: null,
      mustChangePassword: false,
      admin: true,
    });
    console.log("✅ Set Custom Claims: { role: 'SUPER_ADMIN', admin: true }");

    // 4. Batch write Firestore profile and username mapping
    const batch = db.batch();

    batch.set(db.collection("userProfiles").doc(uid), {
      uid,
      username,
      email,
      fullName,
      role: "SUPER_ADMIN",
      businessId: null,
      active: true,
      mustChangePassword: false,
      createdAtMs: nowMs,
      updatedAtMs: nowMs,
      createdAt: Timestamp.fromMillis(nowMs),
      updatedAt: Timestamp.fromMillis(nowMs),
    });

    batch.set(db.collection("usernames").doc(username), {
      username,
      uid,
      email,
      role: "SUPER_ADMIN",
      businessId: null,
      createdAtMs: nowMs,
    });

    // Also mirror to legacy admins collection for backward compatibility
    batch.set(db.collection("admins").doc(uid), {
      email,
      active: true,
      role: "SUPER_ADMIN",
      grantedAt: Timestamp.fromMillis(nowMs),
    });

    // Write audit log
    const logId = `log_${nowMs}_${Math.random().toString(36).slice(2, 8)}`;
    batch.set(db.collection("auditLogs").doc(logId), {
      id: logId,
      actorUid: uid,
      actorEmail: email,
      actorRole: "SUPER_ADMIN",
      businessId: null,
      action: "BOOTSTRAP_SUPER_ADMIN",
      summary: `Initial Super Admin @${username} bootstrapped successfully`,
      createdAtMs: nowMs,
      createdAt: Timestamp.fromMillis(nowMs),
    });

    await batch.commit();
    console.log("✅ Written Firestore userProfiles, usernames, and audit log.");

    console.log("\n=======================================================");
    console.log("🎉 Super Admin Bootstrapped Successfully!");
    console.log(`Username: @${username}`);
    console.log(`Email:    ${email}`);
    console.log("Role:     SUPER_ADMIN");
    console.log("Dashboard URL: /super-admin");
    console.log("=======================================================\n");
  } catch (dbErr) {
    console.error("❌ Failed to write database records. Attempting rollback...", dbErr.message);
    await auth.deleteUser(uid).catch(() => {});
    process.exit(1);
  }
}

runBootstrap().catch((err) => {
  console.error("Unexpected bootstrap error:", err);
  process.exit(1);
});
