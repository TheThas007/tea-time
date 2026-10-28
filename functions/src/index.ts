import { initializeApp } from "firebase-admin/app";
import { getFirestore, FieldValue, Timestamp } from "firebase-admin/firestore";
import { getAuth } from "firebase-admin/auth";
import { onCall, HttpsError } from "firebase-functions/v2/https";

// Initialize Firebase Admin SDK
initializeApp();
const db = getFirestore();
const auth = getAuth();

interface OrderItemInput {
  productId: string;
  quantity: number;
}

interface CreateOrderData {
  tableToken: string;
  items: OrderItemInput[];
  specialInstructions?: string;
  idempotencyKey: string;
}

interface OrderItemSnapshot {
  productId: string;
  name: string;
  category: string;
  priceMinor: number;
  quantity: number;
  subtotalMinor: number;
  imageUrl?: string | null;
}

/**
 * Validates whether the caller has admin privileges (via custom claims or admin role document).
 */
async function verifyIsAdmin(uid: string, tokenClaims?: Record<string, any>): Promise<boolean> {
  if (tokenClaims && tokenClaims.admin === true) {
    return true;
  }
  // Fallback check against Firestore admin users collection
  const adminDoc = await db.collection("admins").doc(uid).get();
  return adminDoc.exists && adminDoc.data()?.active === true;
}

/**
 * Callable Cloud Function: createOrder
 * Securely validates and processes incoming customer orders.
 * NEVER trusts client-submitted prices, table numbers, totals, or statuses.
 */
export const createOrder = onCall<CreateOrderData>({ cors: true }, async (request) => {
  // 1. Validate caller authentication (anonymous or registered)
  const customerId = request.auth?.uid;
  if (!customerId) {
    throw new HttpsError(
      "unauthenticated",
      "Authentication session required. Please reload the menu to establish a session."
    );
  }

  const { tableToken, items, specialInstructions, idempotencyKey } = request.data;

  // 2. Validate input parameters
  if (!tableToken || typeof tableToken !== "string" || tableToken.trim() === "") {
    throw new HttpsError("invalid-argument", "Valid table token is required.");
  }

  if (!idempotencyKey || typeof idempotencyKey !== "string" || idempotencyKey.length < 8) {
    throw new HttpsError("invalid-argument", "Valid idempotency key is required.");
  }

  if (!Array.isArray(items) || items.length === 0) {
    throw new HttpsError("invalid-argument", "Order must contain at least one item.");
  }

  if (items.length > 50) {
    throw new HttpsError("invalid-argument", "Order contains too many distinct items.");
  }

  const sanitizedInstructions = (specialInstructions || "").trim().slice(0, 300);

  // 3. Idempotency Check: Prevent duplicate order placement from double-taps / retries
  const existingOrderSnap = await db
    .collection("orders")
    .where("customerId", "==", customerId)
    .where("idempotencyKey", "==", idempotencyKey)
    .limit(1)
    .get();

  if (!existingOrderSnap.empty) {
    const existingDoc = existingOrderSnap.docs[0];
    const data = existingDoc.data();
    return {
      success: true,
      orderId: existingDoc.id,
      orderNumber: data.orderNumber,
      orderNumberDisplay: data.orderNumberDisplay,
      tableNumber: data.tableNumber,
      totalMinor: data.totalMinor,
      duplicate: true,
      message: "Order already processed."
    };
  }

  // 4. Rate Limiting: Customer cannot place orders faster than once every 10 seconds
  const tenSecondsAgo = Timestamp.fromMillis(Date.now() - 10 * 1000);
  const recentOrdersSnap = await db
    .collection("orders")
    .where("customerId", "==", customerId)
    .where("createdAt", ">", tenSecondsAgo)
    .limit(1)
    .get();

  if (!recentOrdersSnap.empty) {
    throw new HttpsError(
      "resource-exhausted",
      "Please wait a moment before submitting another order."
    );
  }

  // 5. Verify Café Ordering Status (from settings/cafe)
  const cafeSettingsDoc = await db.collection("settings").doc("cafe").get();
  if (cafeSettingsDoc.exists) {
    const settings = cafeSettingsDoc.data();
    if (settings?.isOrderingPaused === true) {
      throw new HttpsError(
        "failed-precondition",
        settings.pauseMessage || "New orders are temporarily paused by café staff. Please check back shortly."
      );
    }
  }

  // 6. Verify Table Token and Activity
  const tablesSnap = await db
    .collection("tables")
    .where("token", "==", tableToken.trim())
    .limit(1)
    .get();

  if (tablesSnap.empty) {
    throw new HttpsError(
      "failed-precondition",
      "Invalid table QR code. Please scan a valid table QR code."
    );
  }

  const tableDoc = tablesSnap.docs[0];
  const tableData = tableDoc.data();

  if (tableData.active !== true) {
    throw new HttpsError(
      "failed-precondition",
      `Table ${tableData.number || ""} is currently inactive. Please speak with café staff.`
    );
  }

  // 7. Validate Products, Quantities, Availability & Calculate Server-Authoritative Totals
  const itemSnapshots: OrderItemSnapshot[] = [];
  let totalMinor = 0;
  let totalItemCount = 0;

  // Fetch unique products in batch
  const productIds = Array.from(new Set(items.map((i) => i.productId)));
  const productRefs = productIds.map((id) => db.collection("menu").doc(id));
  const productDocs = await db.getAll(...productRefs);
  const productMap = new Map<string, FirebaseFirestore.DocumentData>();

  for (const doc of productDocs) {
    if (doc.exists) {
      productMap.set(doc.id, doc.data()!);
    }
  }

  for (const item of items) {
    const qty = Math.floor(Number(item.quantity));
    if (isNaN(qty) || qty <= 0 || qty > 25) {
      throw new HttpsError(
        "invalid-argument",
        `Invalid quantity (${item.quantity}) for item.`
      );
    }

    const product = productMap.get(item.productId);
    if (!product) {
      throw new HttpsError(
        "not-found",
        `A requested product (${item.productId}) was not found in the menu.`
      );
    }

    if (product.isAvailable === false) {
      throw new HttpsError(
        "failed-precondition",
        `"${product.name}" is currently sold out. Please remove it from your cart.`
      );
    }

    const priceMinor = Number(product.priceMinor);
    if (isNaN(priceMinor) || priceMinor < 0) {
      throw new HttpsError("internal", `Corrupted price configuration for ${product.name}`);
    }

    const subtotalMinor = priceMinor * qty;
    totalMinor += subtotalMinor;
    totalItemCount += qty;

    itemSnapshots.push({
      productId: item.productId,
      name: product.name,
      category: product.category || "General",
      priceMinor,
      quantity: qty,
      subtotalMinor,
      imageUrl: product.imageUrl || null,
    });
  }

  // 8. Atomic Transaction: Increment sequential order number and write order record
  const counterRef = db.collection("counters").doc("orders");
  const newOrderRef = db.collection("orders").doc();

  const result = await db.runTransaction(async (transaction) => {
    const counterDoc = await transaction.get(counterRef);
    let nextOrderNumber = 1001; // Base starting order number matching TEA TIME mockup (e.g. 1042)

    if (counterDoc.exists) {
      const current = counterDoc.data()?.lastOrderNumber;
      if (typeof current === "number" && current >= 1000) {
        nextOrderNumber = current + 1;
      }
    }

    // Set updated counter
    transaction.set(
      counterRef,
      {
        lastOrderNumber: nextOrderNumber,
        updatedAt: FieldValue.serverTimestamp(),
      },
      { merge: true }
    );

    const orderData = {
      orderNumber: nextOrderNumber,
      orderNumberDisplay: `#${nextOrderNumber}`,
      tableId: tableDoc.id,
      tableNumber: tableData.number, // e.g. "Table 07"
      tableToken: tableToken.trim(),
      customerId: customerId,
      status: "new", // 'new' | 'preparing' | 'ready' | 'served' | 'cancelled'
      items: itemSnapshots,
      itemCount: totalItemCount,
      totalMinor: totalMinor,
      currency: "LKR",
      specialInstructions: sanitizedInstructions,
      idempotencyKey: idempotencyKey,
      paymentStatus: "pay_at_counter",
      createdAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
    };

    transaction.set(newOrderRef, orderData);

    return {
      orderId: newOrderRef.id,
      orderNumber: nextOrderNumber,
      orderNumberDisplay: `#${nextOrderNumber}`,
      tableNumber: tableData.number,
      totalMinor: totalMinor,
    };
  });

  return {
    success: true,
    ...result,
  };
});

/**
 * Callable Cloud Function: updateOrderStatus
 * Allows authenticated admins to advance or cancel orders.
 */
interface UpdateOrderStatusData {
  orderId: string;
  status: "new" | "preparing" | "ready" | "served" | "cancelled";
  cancelReason?: string;
}

export const updateOrderStatus = onCall<UpdateOrderStatusData>({ cors: true }, async (request) => {
  const uid = request.auth?.uid;
  if (!uid) {
    throw new HttpsError("unauthenticated", "Admin authentication required.");
  }

  const isAdmin = await verifyIsAdmin(uid, request.auth?.token);
  if (!isAdmin) {
    throw new HttpsError("permission-denied", "Only authorized administrators can update order status.");
  }

  const { orderId, status, cancelReason } = request.data;
  const allowedStatuses = ["new", "preparing", "ready", "served", "cancelled"];

  if (!orderId || !allowedStatuses.includes(status)) {
    throw new HttpsError("invalid-argument", "Invalid order ID or target status.");
  }

  const orderRef = db.collection("orders").doc(orderId);
  const orderDoc = await orderRef.get();

  if (!orderDoc.exists) {
    throw new HttpsError("not-found", "Order not found.");
  }

  const updatePayload: Record<string, any> = {
    status,
    updatedAt: FieldValue.serverTimestamp(),
    updatedBy: uid,
  };

  if (status === "cancelled" && cancelReason) {
    updatePayload.cancelReason = cancelReason.slice(0, 200);
  }

  if (status === "served") {
    updatePayload.servedAt = FieldValue.serverTimestamp();
  }

  await orderRef.update(updatePayload);

  return {
    success: true,
    orderId,
    status,
  };
});

/**
 * Callable Cloud Function: setAdminClaim
 * For initializing admin privileges.
 */
interface SetAdminClaimData {
  targetEmail: string;
  secretKey: string;
}

export const setAdminClaim = onCall<SetAdminClaimData>({ cors: true }, async (request) => {
  const { targetEmail, secretKey } = request.data;
  
  // Guard with environment secret or default dev secret
  const configuredSecret = process.env.ADMIN_SETUP_SECRET || "TEA_TIME_ADMIN_SETUP_2026";
  if (!secretKey || secretKey !== configuredSecret) {
    throw new HttpsError("permission-denied", "Invalid admin initialization secret key.");
  }

  try {
    const user = await auth.getUserByEmail(targetEmail);
    await auth.setCustomUserClaims(user.uid, { admin: true });

    // Also register in Firestore admins collection for record-keeping
    await db.collection("admins").doc(user.uid).set({
      email: targetEmail,
      active: true,
      grantedAt: FieldValue.serverTimestamp(),
    }, { merge: true });

    return {
      success: true,
      message: `Admin custom claim successfully granted to ${targetEmail} (UID: ${user.uid})`,
    };
  } catch (error: any) {
    throw new HttpsError("internal", error.message || "Failed to set admin custom claim.");
  }
});

