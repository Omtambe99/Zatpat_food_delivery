# 🛵 Zatpat — Hyperlocal Community Food Delivery, Neighbor Batching & Group Cart Platform

[![MERN Stack](https://img.shields.io/badge/MERN-Full%20Stack-success?style=for-the-badge&logo=mongodb)](https://github.com/)
[![React 19](https://img.shields.io/badge/React%2019-Vite-blue?style=for-the-badge&logo=react)](https://react.dev/)
[![Socket.io](https://img.shields.io/badge/Socket.io-Real--Time-010101?style=for-the-badge&logo=socketdotio)](https://socket.io/)
[![Tailwind CSS 4](https://img.shields.io/badge/Tailwind%20CSS-v4.1-38B2AC?style=for-the-badge&logo=tailwind-css)](https://tailwindcss.com/)
[![Razorpay](https://img.shields.io/badge/Razorpay-Payment%20Gateway-02042B?style=for-the-badge&logo=razorpay)](https://razorpay.com/)
[![Leaflet.js](https://img.shields.io/badge/Leaflet-Geospatial%20Maps-199900?style=for-the-badge&logo=leaflet)](https://leafletjs.com/)
[![Node Test Runner](https://img.shields.io/badge/Node.js%20Test%20Runner-31%20Passed-brightgreen?style=for-the-badge&logo=node.js)](https://nodejs.org/api/test.html)

> **Live Deployed Application**: [https://zatpat-food-delivery-m3xi-awqj0gadp-om-tambes-projects.vercel.app/](https://zatpat-food-delivery-m3xi-awqj0gadp-om-tambes-projects.vercel.app/)

---

## 📖 Executive Summary

**Zatpat** is an advanced hyperlocal community food delivery platform that reimagines the traditional, isolated food delivery model. By fusing **geospatial clustering**, **real-time WebSocket collaboration**, and **community-driven incentives**, Zatpat enables neighbors, friends, and colleagues to combine deliveries, slash delivery charges by up to **80%**, and reduce courier carbon emissions while maintaining lightning-fast turnaround times.

Unlike conventional apps where every order deploys an independent rider, Zatpat introduces:
1. **Hyperlocal Neighbor Batching**: A 10-minute pooling window opening within a 300-meter radius whenever an order is placed from a restaurant. Nearby residents receive instant real-time invites to piggyback on the order. A single rider handles the combined delivery via an automated multi-stop route, and online prepaid customers receive automatic refunds as the discount ladder climbs.
2. **Real-Time Collaborative Shared Group Cart**: A synchronous room (joinable via 6-character room codes or shareable links) where multiple participants add dishes, synchronize ready states, and preview live, deterministic whole-rupee bill splits. Host controls allow locking/unlocking the cart, with real-time exit and restaurant decline handling.
3. **Comprehensive Multi-Role Ecosystem**: Unified architecture serving **Consumers**, **Restaurant Merchants**, and **Delivery Riders** with dedicated dashboards, automated routing, delivery OTP verification, and live GPS map tracking.
4. **Gamification & Community Impact Tracking**: Unlocking milestone badges, tracking lifetime rupee savings, and rewarding collective neighborhood sustainability.

---

## 📸 Deployed Application Snapshots

### 1. 👤 Consumer Experience
| **Hyperlocal Discovery & Restaurant Menu** | **Real-Time Multi-Stop Order Tracking** |
|:---:|:---:|
| ![User Home](./demo/user_home.png) | ![User Map Tracking](./demo/user_tracking.png) |
| *Browse nearby restaurants, filter categories, discover Neighbor Batches, or launch a Group Cart.* | *Live Leaflet map showing rider GPS location, destination markers, and live kitchen progress.* |

### 2. 👨‍🍳 Restaurant Owner (Merchant) Command Center
| **Merchant Sales & Order Overview** | **Kitchen Order Pipeline & Status** |
|:---:|:---:|
| ![Restaurant Dashboard](./demo/restaurant_dashboard.png) | ![Restaurant Orders](./demo/restaurant_orders.png) |
| *Real-time sales analytics, active batch alerts, and automated multi-order incoming notifications.* | *Kitchen status pipeline (Pending, Preparing, Out for Delivery, Delivered, or Decline Order).* |

### 3. 🛵 Delivery Partner (Rider) Logistics
| **Rider Job Broadcast Panel** | **Multi-Stop Navigation & OTP Delivery** |
|:---:|:---:|
| ![Rider Dashboard](./demo/rider_home.png) | ![Rider Map](./demo/rider_map.png) |
| *Accept batched multi-stop jobs within 5km radius with base pay + incentive stop bonuses.* | *Greedy nearest-neighbour sequence drop-offs with per-stop 4-digit OTP email verification.* |

---

## 🏛️ System Architecture

```
                                 ┌──────────────────────────────────────────────────────────┐
                                 │                 Zatpat Web Clients                       │
                                 │       React 19 + Vite + Tailwind CSS 4 + Redux           │
                                 └────────────▲──────────────────────────────▲──────────────┘
                                              │                              │
                                 HTTP REST    │                              │  WebSocket
                                 (Axios / JWT)│                              │  (Socket.IO)
                                              ▼                              ▼
                                 ┌──────────────────────────────────────────────────────────┐
                                 │                 Express 5 API Gateway                    │
                                 │      In-Memory Token Bucket Limiter + Auth Middleware     │
                                 └────────────┬──────────────┬───────────────┬──────────────┘
                                              │              │               │
                      ┌───────────────────────┘              │               └───────────────────────┐
                      ▼                                      ▼                                       ▼
       ┌─────────────────────────────┐        ┌─────────────────────────────┐         ┌─────────────────────────────┐
       │     MongoDB Atlas (M0/M10)  │        │       Cloudinary CDN        │         │    External Microservices   │
       │  - 2dsphere Geo Indexes     │        │  - Restaurant Logos         │         │  - Razorpay Online Payments │
       │  - Batches, Orders, Carts   │        │  - Menu Dish Photography    │         │  - Nodemailer OTP Delivery  │
       │  - Users & Gamification     │        │  - Delivery Proofs          │         │  - OpenStreetMap Nominatim  │
       └─────────────────────────────┘        └─────────────────────────────┘         └─────────────────────────────┘
```

---

## ✨ Exhaustive Feature Breakdown

### 🛒 1. Real-Time Shared Group Cart
Collaborative dining engineered for offices, college dorms, and families:
- **Instant Room Generation**: Host initiates a collaborative cart for any restaurant, producing an unambiguous 6-character room code (e.g., `4RCRMD`) with zero ambiguous glyphs (`0`, `O`, `1`, `I` excluded).
- **One-Click Social Sharing**: Instant copy-to-clipboard URL and deep-linked WhatsApp invitation generation.
- **Isolated User State Architecture**: Participant states are strictly identified by Redux user credentials (`currentUserId`), ensuring one member's actions never overwrite another client's state over broadcast channels.
- **2-Step Participant Guidance**:
  - *Step 1*: Clear prompts to browse and add dishes to personal shares.
  - *Step 2*: Prominent **`✓ I'm Ready — Confirm Share`** action with real-time dish count and subtotal indicators.
  - *Confirmed*: Green check state with an accessible *"Need to change? Edit dishes"* unready toggle.
- **Host Controls & Freeze Engine**:
  - Live ready tracker: *"🎉 All participants are Ready! (X of X ready)"*.
  - Dynamic **Lock / Unlock** toggle: Host can lock the room to freeze dish pickers for checkout, or unlock it at any time to allow edits.
  - Proceed to Checkout modal with automated coordinates fallback (`userData.location.coordinates`) preventing checkout validation failures.
- **Persistent Access & Resumption**:
  - An **Active Group Cart banner** appears at the top of the personal `/cart` page (showing room code, shop name, status, and a **"Resume Group Cart"** button) even when personal cart items are empty.
  - A persistent **`Group Cart (#CODE)`** pill with a live pulsing status dot sits permanently in the navigation bar across all pages.
- **Real-Time Voluntary Exit**:
  - Participants can click **"Leave Cart"** at any time. The server removes their dishes, recalibrates the fair bill split, and broadcasts `participantLeft` and `cartUpdated` in real time.
- **Merchant Decline Graceful Degradation**:
  - If a restaurant declines the order, a real-time `cartDeclined` event is pushed to all room participants, displaying an explanatory alert and enabling the host to unlock and re-order.
- **Deterministic Whole-Rupee Bill Split Algorithm**:
  - Accurately allocates dish subtotals and divides delivery fees equally.
  - Any remainder odd rupees are deterministically distributed to the first participants so that:
    $$\sum \text{Shares} \equiv \text{Grand Total (Exact Rupee Match)}$$

---

### 🏘️ 2. Hyperlocal Neighbor Batching Engine
A breakthrough community logistics system that turns individual deliveries into eco-friendly group runs:
- **Automatic 10-Minute Window**: The first customer (Host) to order from a restaurant can enable *"Open to Neighbor Batch"*, initiating a 10-minute pooling window (`BATCH_WINDOW_MS = 600,000 ms`).
- **Geospatial Clustering (300m)**: Queries MongoDB using `$near` 2dsphere indexing to find active residents within 300 meters (`BATCH_RADIUS_M = 300 m`).
- **Real-Time Push Invitations**: Connected neighbors receive an animated toast notification (`batchInvite`) with shop details, distance, and the live discount ladder.
- **Community Discount Ladder**:
  | Batch Members | Community Discount | Delivery Fee Paid (₹40 Base) | Savings per Order |
  | :---: | :---: | :---: | :---: |
  | **1 Member** (Host) | **0%** | ₹40 | ₹0 |
  | **2 Members** | **30%** | ₹28 | ₹12 |
  | **3 Members** | **50%** | ₹20 | ₹20 |
  | **4 Members** | **65%** | ₹14 | ₹26 |
  | **5 Members (Full)**| **80%** | **₹8** | **₹32** |
- **Automated Prepaid Refunds**: When online prepaid customers join, the platform computes their refund difference upon batch closure and records it in the database and Razorpay reconciliation logs.
- **Single Rider, Multi-Stop Route Sequencing**: When the window closes, an automated nearest-neighbour algorithm arranges stops (Stop 1, Stop 2...) minimizing rider travel distance.
- **Rider Incentive Payouts**: Riders earn ₹50 base stop pay + ₹20 incentive bonus for every extra pooled drop-off.
- **Non-Destructive Sweeper**: An automated 10-second background daemon checks and cleanly finalizes batches whose timers expire without data loss.

---

### 👤 3. Customer (Consumer) Portal
- **Interactive Location Pinning**: Leaflet map modal with OpenStreetMap reverse-geocoding, geolocation auto-detection, and manual draggable pin precision.
- **Explore & Filter**: Real-time filtering by city, shop name, dish category (Pizza, Biryani, North Indian, Burgers, Chinese, Desserts), and diet (Veg / Non-Veg).
- **Personal Cart Management**: Quantity increments/decrements, subtotal updates, delivery quote previews, and smooth checkout.
- **Dual Payment Integration**:
  - **Razorpay**: Integrated UPI, Credit/Debit cards, and Net Banking with server-side HMAC-SHA256 signature verification.
  - **Cash on Delivery (COD)**: Instant order creation with real-time merchant notification.
- **Live Order Tracking**: Interactive timeline showing kitchen status, assigned rider contact, real-time rider GPS tracking, and delivery OTP status.

---

### 👨‍🍳 4. Restaurant Owner (Merchant) Command Center
- **Restaurant Onboarding**: Create and edit restaurant profile with custom banner imagery (Cloudinary CDN), business address, city, and GPS coordinates.
- **Menu Management (CRUD)**: Add, edit, or delete food items with dish photo uploads, pricing, food type indicators, and category tags.
- **Live Order Stream**: Instant incoming orders with audio/visual notification via Socket.io `newOrder`.
- **Order Status Control**: Advance order lifecycle through `Pending` ➔ `Preparing` ➔ `Out of Delivery` ➔ `Delivered`.
- **Decline Order Capability**: Dedicated decline button with confirmation dialogue that safely marks order as `declined` and notifies all customers and group cart members in real time.
- **Multi-Stop Batch Dispatch**: Single-click dispatch of entire neighbor batches to nearby available riders.

---

### 🛵 5. Delivery Partner (Rider) Logistics
- **Geospatial Broadcast Inbox**: Real-time delivery assignment broadcasts within a 5-kilometer radius of the restaurant anchor.
- **Multi-Stop Job Card**: Displays total drop stops, sequenced address list, and estimated payout breakdown.
- **One-Click Acceptance**: Atomic assignment locking prevents race conditions between multiple riders.
- **Secure Delivery OTP Verification**: Generates a cryptographically random 4-digit OTP sent to the recipient's verified email. The rider must enter the customer's OTP to successfully mark an order as `delivered`.
- **Live GPS Broadcasting**: Periodic location streaming via `updateDeliveryLocation` renders live rider movement on the customer's tracking map.

---

### 🏆 6. Gamification & Community Rewards
Encourages sustainable neighborhood ordering through milestones and savings trackers:
- **Lifetime Money Saved**: Tracks aggregate delivery fee savings across all batches.
- **Community Saver Badges**:
  - 🌅 **Early Bird**: Joined a Neighbor Batch within the first 2 minutes of the pooling window.
  - 👑 **Batch Captain**: Hosted 3 or more successfully closed Neighbor Batches.
  - 🌿 **Eco Warrior**: Participated in 5 or more pooled deliveries, saving fuel and courier trips.
  - ⚡ **Street Legend**: Participated in 10 or more community batches.
- **Anti-Abuse Protections**: Daily fair-play cap (maximum 10 batch rewards counted per day) prevents spam exploitation.

---

## 📡 Real-Time WebSocket Event Matrix

| Event Name | Direction | Channel / Room | Payload Highlights | Trigger & Purpose |
| :--- | :---: | :--- | :--- | :--- |
| `batchInvite` | Server ➔ Client | User Socket | `{ batchId, shopName, approxDistanceM, expiresAt, discountTiers }` | Emitted to active neighbors within 300m when a batch window opens |
| `batchUpdate` | Server ➔ Client | `batch:<batchId>` | `{ batchId, memberCount, discountPct, expiresAt }` | Broadcasts when a neighbor joins/leaves an open batch |
| `batchClosed` | Server ➔ Client | `batch:<batchId>` | `{ batchId, finalDiscountPct, finalDeliveryFee, refundAmount }` | Signals pooling window closure and initiates delivery routing |
| `joinCart` | Client ➔ Server | Server Socket | `{ code }` | Joins the client socket to the group cart room `cart:<code>` |
| `cartUpdated` | Server ➔ Client | `cart:<code>` | `{ code, shop, participants, total, billSplit }` | Broadcasts dish modifications, quantity steppers, and readiness changes |
| `cartLocked` | Server ➔ Client | `cart:<code>` | `{ code }` | Emitted when the host freezes dishes for final checkout |
| `cartUnlocked` | Server ➔ Client | `cart:<code>` | `{ code }` | Emitted when host unfreezes the room to allow item editing |
| `cartDeclined` | Server ➔ Client | `cart:<code>` & User Sockets | `{ code, orderId, shopName, message }` | Pushed when the restaurant merchant declines the group order |
| `participantLeft` | Server ➔ Client | `cart:<code>` | `{ code, userId, name, newHostId }` | Notifies remaining room members that a participant exited |
| `cartCheckedOut` | Server ➔ Client | `cart:<code>` | `{ code, orderId, totalAmount, splits }` | Automatically redirects all participants to the live tracking page |
| `newOrder` | Server ➔ Client | Owner Socket | `{ _id, shopOrders, deliveryAddress, paymentMethod }` | Notifies the restaurant owner of an incoming order in real time |
| `update-status` | Server ➔ Client | Customer Socket | `{ orderId, shopId, status }` | Pushes kitchen status changes (`preparing`, `out of delivery`, `declined`) |
| `newAssignment` | Server ➔ Client | Rider Socket | `{ assignmentId, orderId, shopName, stops, estimatedPayout }` | Broadcasts available multi-stop delivery jobs to riders within 5km |
| `updateDeliveryLocation`| Server ➔ Client | `order:<orderId>` | `{ deliveryBoyId, latitude, longitude }` | Streams live rider GPS coordinates to the tracking map |

---

## 🌐 REST API Reference

### 🔐 1. Authentication Endpoints (`/api/auth`)
| Method | Endpoint | Auth | Description |
| :--- | :--- | :---: | :--- |
| `POST` | `/api/auth/signup` | Public | Register new user account (`user`, `owner`, `deliveryBoy`) |
| `POST` | `/api/auth/signin` | Public | Authenticate credentials and issue secure HTTP-only JWT cookie |
| `GET` | `/api/auth/signout` | Public | Clear JWT auth cookie |
| `POST` | `/api/auth/send-otp` | Public | Send 6-digit password reset OTP to user email |
| `POST` | `/api/auth/verify-otp` | Public | Verify validity of email OTP |
| `POST` | `/api/auth/reset-password` | Public | Set new password upon successful OTP validation |
| `POST` | `/api/auth/google-auth` | Public | Google OAuth integration with Firebase tokens |

### 👤 2. User & Gamification Endpoints (`/api/user`)
| Method | Endpoint | Auth | Description |
| :--- | :--- | :---: | :--- |
| `GET` | `/api/user/current` | JWT | Get authenticated profile, role, address, and coordinates |
| `POST` | `/api/user/update-location` | JWT | Update user geo-coordinates (Lat, Lon) with 2dsphere indexing |
| `GET` | `/api/user/rewards` | JWT | Retrieve unlocked badges, total money saved, and milestone stats |

### 🏪 3. Restaurant & Shop Endpoints (`/api/shop`)
| Method | Endpoint | Auth | Description |
| :--- | :--- | :---: | :--- |
| `POST` | `/api/shop/create-edit` | Merchant | Create or update restaurant profile with Cloudinary image upload |
| `GET` | `/api/shop/get-my` | Merchant | Fetch current merchant's owned restaurant profile |
| `GET` | `/api/shop/get-by-city/:city` | JWT | Browse restaurants operating in a specific city |

### 🍔 4. Menu & Food Item Endpoints (`/api/item`)
| Method | Endpoint | Auth | Description |
| :--- | :--- | :---: | :--- |
| `POST` | `/api/item/add-item` | Merchant | Add new dish with name, price, category, food type, and photo |
| `POST` | `/api/item/edit-item/:itemId` | Merchant | Modify dish details and pricing |
| `GET` | `/api/item/get-by-id/:itemId` | JWT | Fetch full details for a single dish |
| `GET` | `/api/item/delete/:itemId` | Merchant | Remove dish from restaurant menu |
| `GET` | `/api/item/get-by-city/:city` | JWT | Fetch available dishes in customer's city |
| `GET` | `/api/item/get-by-shop/:shopId` | Public | Fetch all menu dishes for a specific restaurant |
| `GET` | `/api/item/search-items` | JWT | Multi-field search across dish names, categories, and tags |
| `POST` | `/api/item/rating` | JWT | Submit customer ratings and reviews |

### 📦 5. Orders & Logistics Endpoints (`/api/order`)
| Method | Endpoint | Auth | Description |
| :--- | :--- | :---: | :--- |
| `POST` | `/api/order/quote` | JWT | Compute items subtotal, delivery fee tiers, and discount breakdown |
| `POST` | `/api/order/place-order` | JWT | Create COD or initialize online order |
| `POST` | `/api/order/verify-payment` | JWT | Verify Razorpay HMAC-SHA256 signature and finalize order |
| `GET` | `/api/order/my-orders` | JWT | Retrieve customer orders or merchant shop orders |
| `GET` | `/api/order/get-order-by-id/:orderId` | JWT | Fetch full order details with status, rider, and items |
| `POST` | `/api/order/update-status/:orderId/:shopId` | Merchant | Update kitchen status (`pending`, `preparing`, `out of delivery`, `declined`) |
| `GET` | `/api/order/get-assignments` | Rider | Fetch broadcasted delivery assignments within 5km |
| `GET` | `/api/order/accept-order/:assignmentId` | Rider | Atomically claim delivery assignment |
| `POST` | `/api/order/send-delivery-otp` | Rider | Generate 4-digit delivery OTP sent to customer email |
| `POST` | `/api/order/verify-delivery-otp` | Rider | Verify OTP and mark order delivered |
| `GET` | `/api/order/get-today-deliveries` | Rider | Fetch rider's completed deliveries and daily earnings |

### 🏘️ 6. Neighbor Batch Endpoints (`/api/batch`)
| Method | Endpoint | Auth | Rate Limited | Description |
| :--- | :--- | :---: | :---: | :--- |
| `GET` | `/api/batch/nearby` | JWT | No | Find active batches within 300m of customer coordinates |
| `GET` | `/api/batch/:batchId` | JWT | No | Get live batch timer, member list, and discount tier |
| `POST` | `/api/batch/:batchId/join` | JWT | **Yes (5/min)** | Join open batch with own cart and address |
| `POST` | `/api/batch/:batchId/close` | JWT | No | Host manually finalizes batch window before timer ends |
| `POST` | `/api/batch/:batchId/leave` | JWT | No | Cancel pending join before batch window closure |

### 👥 7. Collaborative Shared Cart Endpoints (`/api/group-cart`)
| Method | Endpoint | Auth | Rate Limited | Description |
| :--- | :--- | :---: | :---: | :--- |
| `POST` | `/api/group-cart/create` | JWT | No | Create shared cart room for a shop; returns 6-character code |
| `GET` | `/api/group-cart/user/active` | JWT | No | Fetch customer's most recent active open/locked group cart |
| `GET` | `/api/group-cart/:code` | Optional | No | Get shared cart status, participants, and live bill split |
| `POST` | `/api/group-cart/:code/join` | JWT | No | Join active shared cart session as participant |
| `PUT` | `/api/group-cart/:code/items` | JWT | **Yes (30/min)** | Add/update items in caller's personal share |
| `POST` | `/api/group-cart/:code/ready` | JWT | No | Toggle individual participant readiness state |
| `POST` | `/api/group-cart/:code/lock` | Host | No | Host locks cart to freeze items before checkout |
| `POST` | `/api/group-cart/:code/unlock` | Host | No | Host unlocks cart to allow participants to edit dishes again |
| `POST` | `/api/group-cart/:code/leave` | JWT | No | Real-time exit: removes caller's dishes and recalculates bill |
| `POST` | `/api/group-cart/:code/checkout` | Host | No | Place master order and lock final bill shares |

---

## 🧪 Automated Test Suite (100% Pass)

Zatpat includes a native test suite powered by Node.js 22 built-in `node:test` and `node:assert/strict` with zero external test runners:

```bash
cd Backend
npm test
```

### Verified Test Suite Results:
```text
✔ Geospatial & Configuration Test Suite (13 tests passed)
  - haversineMeters calculation accuracy
  - extractCoords parsing GeoJSON Point, arrays, and lat/lon objects
  - isWithinRadius 300m threshold checks
  - Tier lookups matching { 1: 0%, 2: 30%, 3: 50%, 4: 65%, 5: 80% }

✔ Join Race & Atomic Capacity Test Suite (3 tests passed)
  - Capacity enforcement under 10 concurrent requests racing for 5 slots
  - Rejection of duplicate concurrent joins from identical users

✔ Pricing Utilities Test Suite (12 tests passed)
  - computeDeliveryFee discount tier calculations
  - Free delivery threshold verification above ₹500
  - Deterministic whole-rupee bill split ensuring sum(shares) === total

✔ Token Bucket Rate Limiter Test Suite (3 tests passed)
  - Capacity enforcement and burst blocking
  - User-isolated bucket counters
  - Refill interval accuracy

# tests 31
# suites 11
# pass 31
# fail 0
```

---

## 🛠️ Local Development & Setup

### Prerequisites
- **Node.js**: v18.0.0 or higher (v22 LTS recommended)
- **MongoDB**: Local MongoDB instance or free MongoDB Atlas cluster with 2dsphere indexing enabled
- **Cloudinary Account**: For menu and shop photo storage
- **Razorpay Test Account**: For payment checkout testing

---

### Step 1: Clone Repository
```bash
git clone https://github.com/your-username/zatpat-food-delivery.git
cd zatpat-food-delivery
```

---

### Step 2: Backend Configuration
Navigate to the `Backend` directory and install dependencies:
```bash
cd Backend
npm install
```

Create a `.env` file in the `Backend` directory:
```env
PORT=8001
MONGODB_URL="mongodb+srv://<username>:<password>@cluster0.example.mongodb.net/zatpat?retryWrites=true&w=majority"
JWT_SECRET="your_ultra_secure_jwt_secret_key_here"

# Email Service (Nodemailer for OTP verification)
EMAIL="your-email@gmail.com"
PASS="your-gmail-app-password"

# Cloudinary Media CDN
CLOUDINARY_CLOUD_NAME="your_cloudinary_cloud_name"
CLOUDINARY_API_KEY="your_cloudinary_api_key"
CLOUDINARY_API_SECRET="your_cloudinary_api_secret"

# Razorpay Payment Gateway (Test Mode)
RAZORPAY_KEY_ID="rzp_test_yourKeyId"
RAZORPAY_KEY_SECRET="yourRazorpayKeySecret"

# Allowed Frontend Origins for CORS
FRONTEND_URL1="http://localhost:5173"
FRONTEND_URL2="https://zatpat-food-delivery-m3xi-awqj0gadp-om-tambes-projects.vercel.app"
```

Start the backend development server:
```bash
npm run dev
```
*Backend runs on `http://localhost:8001`.*

---

### Step 3: Frontend Configuration
In a separate terminal, navigate to the `Frontend` directory and install dependencies:
```bash
cd ../Frontend
npm install
```

Create a `.env` file in the `Frontend` directory:
```env
VITE_SERVER_URL=http://localhost:8001
VITE_RAZORPAY_KEY_ID=rzp_test_yourKeyId
VITE_GEOAPIKEY=50e27a0477ca49a79e87fbf39bdbd1c4
VITE_FIREBASE_APIKEY=AIzaSyAMhl1o2SoS-SFf_XzrnJuYIYFrqgupRhk
```

Start the Vite development server:
```bash
npm run dev
```
*Frontend runs on `http://localhost:5173`.*

---

## 📁 Repository Directory Structure

```
zatpat-food-delivery/
├── README.md                           # Master Project Documentation
├── demo/                               # Visual Snapshot Assets
│   ├── restaurant_dashboard.png        # Merchant Dashboard Snapshot
│   ├── restaurant_orders.png           # Kitchen Orders Pipeline Snapshot
│   ├── rider_home.png                  # Rider Job Broadcasts Snapshot
│   ├── rider_map.png                   # Rider Multi-Stop Map Snapshot
│   ├── user_home.png                   # Consumer Home Discovery Snapshot
│   └── user_tracking.png               # Consumer Live GPS Tracking Snapshot
│
├── Backend/
│   ├── app.js                          # Express Server Entry & Socket.IO Initialization
│   ├── config/
│   │   └── batch.config.js             # Batching constants, pricing tiers, and rider pay rates
│   ├── controllers/
│   │   ├── auth.controllers.js         # JWT Auth, Google Auth, Password Reset OTPs
│   │   ├── batch.controllers.js        # Neighbor Batching lifecycle & invites
│   │   ├── item.controllers.js         # Menu CRUD & dish search
│   │   ├── order.controllers.js        # Checkout, status pipeline, OTP verification
│   │   ├── sharedCart.controllers.js   # Collaborative cart, bill split, lock/unlock, exit
│   │   ├── shop.controllers.js         # Merchant shop profile & city indexing
│   │   └── user.controllers.js         # Geolocation updates & gamification rewards
│   ├── middlewares/
│   │   ├── isAuth.js                   # JWT cookie verification & optional auth
│   │   ├── multer.js                   # Multi-part image file processing
│   │   └── rateLimiter.js              # In-memory Token Bucket rate limiter
│   ├── models/
│   │   ├── batch.model.js              # Batch schema with members and discount tracking
│   │   ├── deliveryAssignment.model.js # Multi-stop rider assignment schema
│   │   ├── item.model.js               # Food item schema with category & diet tags
│   │   ├── order.model.js              # Master order schema with shopOrders & OTPs
│   │   ├── sharedCart.model.js         # Collaborative cart schema with participants
│   │   ├── shop.model.js               # Restaurant profile schema with 2dsphere index
│   │   └── user.model.js               # User account schema with role & coordinates
│   ├── routes/                         # Express REST API Route Definitions
│   ├── tests/                          # Built-in Node.js 22 test suite (31 tests)
│   └── utils/
│       ├── batchScheduler.js           # Automated 10-second non-destructive sweeper
│       ├── gamification.js             # Achievement badges & savings calculations
│       ├── geo.js                      # Haversine distance & 300m boundary math
│       ├── mail.js                     # Nodemailer delivery OTP & password reset templates
│       └── pricing.js                  # Tiered pricing & deterministic fair bill split
│
└── Frontend/
    ├── index.html                      # HTML5 Canvas Entry
    ├── vite.config.js                  # Vite Build Configuration & Tailwind Plugin
    ├── src/
    │   ├── App.jsx                     # Route Configuration & Global Socket Listeners
    │   ├── index.css                   # Artisanal Forest Emerald Design System Tokens
    │   ├── components/
    │   │   ├── BatchInviteToast.jsx    # Real-time Neighbor Batch invite popups
    │   │   ├── CartItemCard.jsx        # Food cart item stepper card
    │   │   ├── CategoryCard.jsx        # Food category icon pill
    │   │   ├── DeliveryBoyTracking.jsx # Leaflet live GPS rider map
    │   │   ├── FoodCard.jsx            # Restaurant menu dish card
    │   │   ├── LocationPickerModal.jsx # Interactive Leaflet pin location selector
    │   │   ├── Nav.jsx                 # Header navigation with live Group Cart pill
    │   │   ├── OwnerOrderCard.jsx      # Merchant order management with decline action
    │   │   ├── RewardToast.jsx         # Achievement celebratory badge toast
    │   │   └── UserOrderCard.jsx       # Customer order summary card
    │   ├── hooks/
    │   │   ├── useBatchSocket.js       # Real-time WebSocket event bridge
    │   │   ├── useCountdown.js         # High-precision countdown timer hook
    │   │   └── useGetCurrentUser.jsx   # Profile & coordinate sync
    │   ├── pages/
    │   │   ├── BatchPage.jsx           # Dedicated Neighbor Batch live room page
    │   │   ├── CartPage.jsx            # Personal cart with Active Group Cart banner
    │   │   ├── CheckOut.jsx            # Dual COD / Razorpay payment gateway page
    │   │   ├── Home.jsx                # Restaurant discovery & batch alerts home
    │   │   ├── MyOrders.jsx            # Multi-role order history
    │   │   ├── Rewards.jsx             # Gamification badges & savings dashboard
    │   │   ├── SharedCartPage.jsx      # Collaborative group cart with live bill split
    │   │   ├── Shop.jsx                # Restaurant profile & menu page
    │   │   └── TrackOrderPage.jsx      # Live multi-stop GPS order tracking
    │   └── redux/
    │       ├── batchSlice.js           # Neighbor batch state management
    │       ├── store.js                # Redux Toolkit store configuration
    │       └── userSlice.js            # User session & cart state
```

---

## 🛡️ Reliability & Security Best Practices

- **Zero-Dependency Token Bucket Rate Limiting**: In-memory token bucket rate limiters protect sensitive endpoints (`POST /api/batch/:batchId/join` and `PUT /api/group-cart/:code/items`) against spamming bursts and network jitter with automatic cleanup of idle keys.
- **Race-Condition-Proof MongoDB Atomic Mutations**: Batch joining uses conditional `$expr: { $lt: [{ $size: "$members" }, "$maxMembers"] }` queries inside atomic `findOneAndUpdate` operations to mathematically prevent exceeding batch limits during simultaneous joins.
- **Strict Role-Based Access Control (RBAC)**: Secure JWT cookies signed with `HS256` enforce permissions across `user`, `owner`, and `deliveryBoy` endpoints.
- **Deterministic Financial Precision**: Avoids floating-point discrepancies by computing all subtotal distributions in integer paise/rupees with deterministic odd-rupee allocation.
- **Safe Non-Destructive Sweeper**: Background timers mark records as `closed` or `expired` rather than issuing hard deletes, ensuring financial audit trails remain completely preserved.

---

## 👤 Author & Support

**Om Tambe**  
Full Stack Developer & Logistics Technology Enthusiast

- 🌐 **Portfolio**: [omtambeportfolio.vercel.app](https://omtambeportfolio.vercel.app)
- 💼 **LinkedIn**: [linkedin.com/in/om-tambe09](https://linkedin.com/in/om-tambe09)
- 📧 **Email**: [tambeom09official@gmail.com](mailto:tambeom09official@gmail.com)

⭐ **If you find this project innovative or helpful, please consider starring the repository!**
