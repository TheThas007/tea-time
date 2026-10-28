# ☕ TEA TIME — Digital Menu & Ordering System

A complete, responsive digital menu and real-time kitchen ordering web application custom-built for **TEA TIME** café.

Matches the café brand design:
* **Backgrounds**: Warm off-white (`#FAF8F5`)
* **Headers & Sidebar**: Dark Charcoal (`#18181B`)
* **Primary Accents & Buttons**: Golden Yellow (`#EDA724` / hover `#DB9619`)
* **Borders & Dividers**: Subtle Warm Gray (`#E7E4DD`)
* **Typography**: Inter (Clean, modern sans-serif)
* **Currency**: Sri Lankan Rupees (`Rs.`)
* **Brand Assets**: TEA TIME Clock-Cup & Steam logo

---

## 📱 Feature Overview

### 1. Customer Experience (Mobile-First)
* **Zero Friction**: Customers **never** register, log in, or enter personal info.
* **Silent Anonymous Authentication**: Firebase Anonymous Auth runs seamlessly in the background.
* **Table QR Resolution**: Deep-links via `/menu?table=<token>` automatically resolve the table and display **Table 07** (or scanned table) prominently. Inactive or invalid tokens display friendly recovery guidance.
* **Visual Menu Catalog**:
  * 2-column mobile grid matching the reference mockup.
  * Categories: **Tea**, **Coffee**, **Snacks**, **Desserts**.
  * Real-time search by item name and description.
  * Live stock indicator (*In Stock* vs *Sold Out* badge).
  * Prices formatted in Sri Lankan Rupees (e.g. `Rs. 250`).
* **Sticky Cart Bar**:
  * Floating pill with item count and real-time total (`View order • 3 items | Rs. 950 >`).
* **Cart & Review Screen**:
  * Item thumbnails, stepper controls `[- 2 +]`, delete buttons.
  * Optional special instructions textarea (e.g. *"Less sugar, no ice, extra milk..."*).
  * Cart state is preserved in `localStorage` across page refreshes scoped to the specific table.
  * *Pay at counter* guidance.
* **Server-Authoritative Order Placement**:
  * Orders are submitted strictly via a callable Cloud Function (`createOrder`).
  * Backend calculates all prices and totals from Firestore; client prices are never trusted.
  * Idempotency key protection prevents duplicate submissions on double-taps or network retries.
  * Rate-limiting prevents order spam.
* **Live Order Tracking**:
  * Confirmation badge: `Order #1042 received - Sent to the kitchen. We'll notify you when it's ready.`
  * Real-time stepper: **Received** → **Preparing** → **Ready** → **Served**.
  * Customers can track their placed orders at any time without logging in.

---

### 2. Admin & Kitchen Dashboard (`/admin`)
* **Dedicated Staff Portal**: Email/Password authentication restricted to authorized admins via Firebase Custom Claims (`{ admin: true }`).
* **Live Orders Kanban Board**:
  * Stat counters for **New**, **Preparing**, and **Ready** orders.
  * Real-time Firestore snapshot listeners.
  * Elapsed time indicators (*Just now*, *2 min ago*, *18 min ago*).
  * Audio chime alert synthesized via Web Audio API on new incoming orders, with persistent Mute/Unmute toggle.
  * Actions: `✓ Accept order` (moves to Preparing), `👨‍🍳 Mark ready` (moves to Ready), `✓ Complete` (moves to Served), and `Cancel order` with custom reason.
  * Order History view for completed and cancelled tickets.
* **Menu Management**:
  * Create, edit, and delete products and categories.
  * Adjust prices, descriptions, and category assignment.
  * Toggle availability (*In Stock* vs *Sold Out*) without deleting items.
  * Upload product images directly to Firebase Storage.
* **Table Management & Printable Tent Cards**:
  * Create, rename, and activate/deactivate tables.
  * Generate unique QR links for each table (`/menu?table=<token>`).
  * Rotate security tokens when physical table cards need replacement.
  * **Printable QR Tent Cards**: Renders the exact folded black tent card from the mockup with the TEA TIME logo, square QR code, table number, and *"Scan to order"* callout.
* **Café Settings**:
  * Café name, tagline, opening hours, and currency symbol (`Rs.`).
  * **Pause Orders Toggle**: Freeze new incoming orders during peak kitchen rushes while still allowing guests to browse the menu.
  * **One-Click Seed Utility**: Populates sample categories, Ceylon teas, cakes, snacks, and tables into Firestore.

---

## 🛠 Architecture & Tech Stack

| Component | Technology | Description |
| :--- | :--- | :--- |
| **Frontend** | React 18 + TypeScript + Vite | Ultra-fast build & HMR |
| **Styling** | Tailwind CSS | Custom theme with `#EDA724` brand tokens |
| **Icons** | Lucide React | Modern, lightweight SVG icons |
| **Database** | Cloud Firestore | Real-time listeners for orders, menu, tables, and settings |
| **Backend Logic** | Cloud Functions (v2 HTTPS onCall) | Server-authoritative order validation, pricing, rate limiting |
| **Authentication** | Firebase Auth | Silent Anonymous for guests; Email/Password + Custom Claims for staff |
| **Storage** | Firebase Storage | Menu product photo uploads (validated <= 5MB images) |
| **Audio** | Web Audio API | Zero-dependency melodic kitchen chime |
| **Security Rules** | `firestore.rules` & `storage.rules` | Production-grade access control, customer-scoped reads |

---

## 🚀 Quick Start (Local Development)

### Prerequisites
* Node.js v20+ (tested on v24)
* npm v10+
* Firebase CLI: `npm install -g firebase-tools`

### 1. Install Dependencies
```bash
# Install root frontend dependencies
npm install

# Install Cloud Functions dependencies
cd functions
npm install
cd ..
```

### 2. Configure Environment (.env)
The repository includes `.env.example`. For local development with Firebase Emulators, use:
```env
VITE_FIREBASE_API_KEY=demo-teatime-key
VITE_FIREBASE_AUTH_DOMAIN=teatime-cafe-app.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=teatime-cafe-app
VITE_FIREBASE_STORAGE_BUCKET=teatime-cafe-app.appspot.com
VITE_FIREBASE_MESSAGING_SENDER_ID=123456789012
VITE_FIREBASE_APP_ID=1:123456789012:web:abcdef123456
VITE_USE_FIREBASE_EMULATORS=true
VITE_FIREBASE_FUNCTIONS_REGION=us-central1
```

### 3. Start Firebase Emulators
In a dedicated terminal:
```bash
npm run emulators
```
This boots the local emulators:
* **Emulator UI**: `http://localhost:4000`
* **Firestore**: `localhost:8080`
* **Auth**: `localhost:9099`
* **Functions**: `localhost:5001`
* **Storage**: `localhost:9199`

### 4. Seed Database & Create Admin User
In another terminal, run:
```bash
# Seed sample Ceylon teas, cakes, tables, and settings
npm run seed

# Create initial admin user with custom claim { admin: true }
npm run create-admin admin@teatime.lk Admin@TeaTime2026!
```

### 5. Launch Frontend Dev Server
```bash
npm run dev
```
Open in browser:
* **Customer Menu**: `http://localhost:3000/menu?table=tbl_07_k8j3m` (Table 07 from mockup)
* **Admin Dashboard**: `http://localhost:3000/admin`
  * Login: `admin@teatime.lk`
  * Password: `Admin@TeaTime2026!`

---

## 🛡 Security Rules Summary

### `firestore.rules`
* **Menu (`/menu/{id}`) & Categories (`/categories/{id}`)**: Publicly readable (`read: if true`) so anonymous guests can browse without credentials. Writes restricted exclusively to `isAdmin()`.
* **Tables (`/tables/{id}`)**: Publicly readable so customers can verify their table tokens; writes restricted exclusively to `isAdmin()`.
* **Settings (`/settings/cafe`)**: Publicly readable; writes restricted to `isAdmin()`.
* **Orders (`/orders/{id}`)**:
  * **Direct client creation is DENIED** (`allow create: if false;`). Orders are created exclusively via the `createOrder` Cloud Function using the Firebase Admin SDK.
  * **Customer read**: Allowed only if `request.auth.uid == resource.data.customerId`.
  * **Admin read & update**: Allowed for `isAdmin()`.
* **Counters (`/counters/orders`)**: Client access blocked; updated atomically by Cloud Functions transactions.

### `storage.rules`
* **Products (`/products/{imageId}`)**: Public read; uploads restricted to authenticated administrators, limited to image MIME types and files <= 5MB.

---

## ☁️ Production Deployment Guide

When you are ready to deploy to your live Firebase project:

### Step 1: Login to Firebase CLI
```bash
firebase login
```

### Step 2: Select or Link your Firebase Project
```bash
firebase use --add
# Select your Firebase project ID (e.g. teatime-cafe-prod)
```

### Step 3: Enable Authentication Providers in Firebase Console
Go to [Firebase Console](https://console.firebase.google.com/) → **Authentication** → **Sign-in method**:
1. Enable **Anonymous** provider (for café customers).
2. Enable **Email/Password** provider (for staff/admin).

### Step 4: Enable Firestore & Storage
1. Go to **Firestore Database** → **Create Database** (Production mode).
2. Go to **Storage** → **Get Started** (Standard bucket).

### Step 5: Update `.env` for Production
In `.env` (or CI/CD environment secrets):
```env
VITE_FIREBASE_API_KEY=<your-production-api-key>
VITE_FIREBASE_AUTH_DOMAIN=<your-project-id>.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=<your-project-id>
VITE_FIREBASE_STORAGE_BUCKET=<your-project-id>.appspot.com
VITE_FIREBASE_MESSAGING_SENDER_ID=<your-sender-id>
VITE_FIREBASE_APP_ID=<your-app-id>
VITE_USE_FIREBASE_EMULATORS=false
```

### Step 6: Build & Deploy
```bash
# Build frontend and compile Cloud Functions
npm run build:all

# Deploy everything (Hosting, Functions, Firestore rules, Storage rules, Indexes)
firebase deploy
```

### Step 7: Create Production Admin & Seed Data
```bash
# Set USE_EMULATOR=false to target live Firebase
USE_EMULATOR=false GCLOUD_PROJECT=<your-project-id> node scripts/seed.cjs
USE_EMULATOR=false GCLOUD_PROJECT=<your-project-id> node scripts/create-admin.cjs admin@teatime.lk <YourSecurePassword>
```
You can also use the **Seed Sample Menu & Tables** button inside the Admin Dashboard Settings at `/admin`.

---

## 🧪 Testing Checklist

- [x] **Customer QR scan**: Visiting `/menu?table=tbl_07_k8j3m` resolves to **Table 07**.
- [x] **Anonymous session**: Inspecting Auth state reveals a silent anonymous UID; no login prompt is shown.
- [x] **Cart persistence**: Adding Ceylon Milk Tea and Chocolate Cake persists across page reloads.
- [x] **Server-side price calculation**: Order submission triggers `createOrder` Cloud Function, which fetches item prices from Firestore and stores totals in minor units (`priceMinor: 25000` = `Rs. 250`).
- [x] **Idempotency**: Tapping *Place Order* twice with the same idempotency key returns the existing order rather than charging/creating duplicates.
- [x] **Real-time Live Tracker**: Order transitions from Received → Preparing → Ready → Served update instantaneously.
- [x] **Admin Kitchen Live Kanban**: New order appears immediately in the *New* column with audio chime, table badge, and *Accept order* button.
- [x] **Printable tent card**: Table Manager generates 4x6" printable cards with the TEA TIME logo and QR code.
- [x] **Pause ordering**: Toggling *Pause Ordering* in Settings freezes new orders while preserving customer browsing.

