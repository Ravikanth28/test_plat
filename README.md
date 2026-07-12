# LocalMart 🛒

A hyperlocal **multi-vendor marketplace** (Swiggy / Zomato / Instamart style) that connects
local shops — department stores, medical, stationery, juice bars, food outlets and grocery —
with customers in the same area.

Built with the **MERN** stack (MongoDB, Express, React, Node.js).

---

## ✨ Features

### Customer
- Browse approved shops by category and **search across all products**
- Add items to a single-shop cart with quantity steppers
- Checkout with **Cash on Delivery** or **Online Payment** (Razorpay)
- **Download the bill as a PDF invoice**
- **Live order tracking** (placed → accepted → preparing → out for delivery → delivered)

### Shopkeeper
- Register a shop (goes live after admin approval)
- Manage products (add / edit / delete, stock toggle)
- View incoming orders + payment details
- Advance order status: accept → prepare → dispatch → deliver

### Admin
- Full control panel: overview stats, shops, users, orders
- Approve / unapprove / delete shops
- Change user roles, remove users
- View every order across the platform

### Notifications
- **Real-time in-app alerts** over Server-Sent Events (SSE) — no refresh needed
- **Bell dropdown** with unread badge, **toast popups**, and a **sound chime**
- **Background Web Push** (VAPID) — alerts arrive even when the tab is closed,
  with **action buttons**, **grouping**, and **deep-links** into the relevant page
- Smart **focus suppression** (no duplicate push when the app is already open)
- **Preferences** (synced across devices): mute-all, mute per notification type,
  and **quiet hours**
- **Sound settings** (per-device): pick a tone (chime / ding / triad / low) + volume
- **Notification history** page with pagination
- Live **tab-title counter** + **app-icon badge**

### Platform / PWA
- Installable **Progressive Web App** with a service worker
- Responsive layout with **dark mode**
- Keep-awake workflow to avoid Render cold starts

---

## 🧱 Tech Stack

| Layer     | Technology                                   |
|-----------|----------------------------------------------|
| Frontend  | React 18, Vite 5, React Router v6            |
| Backend   | Node.js, Express 4                           |
| Database  | MongoDB (Atlas) + Mongoose                   |
| Auth      | JWT + bcryptjs                               |
| Payments  | Razorpay (auto **demo mode** without keys)   |
| Invoices  | PDFKit                                        |

---

## 📁 Project Structure

```
zom/
├── server/
│   ├── config/db.js          # MongoDB connection
│   ├── models/               # User, Shop, Product, Order
│   ├── middleware/           # auth (protect/authorize), error handlers
│   ├── routes/               # auth, shops, products, orders, admin
│   ├── utils/                # token, razorpay, invoice (PDF)
│   ├── index.js              # Express app + serves client build in prod
│   └── seed.js               # demo data seeder
├── client/
│   ├── src/
│   │   ├── context/          # AuthContext, CartContext
│   │   ├── components/       # Navbar, ProtectedRoute
│   │   ├── pages/            # Home, ShopDetail, Cart, Checkout, ...
│   │   ├── api.js            # fetch wrapper + auth + file download
│   │   └── index.css
│   └── vite.config.js        # dev proxy /api -> :5000
├── render.yaml               # Render deploy blueprint
├── .env.example
└── package.json              # root scripts (run everything from here)
```

---

## 🚀 Local Setup

### 1. Prerequisites
- Node.js 18+
- A MongoDB connection string (MongoDB Atlas free tier works great)

### 2. Install dependencies
```bash
npm install            # backend deps
npm run install-client # frontend deps
```

### 3. Configure environment
Copy `.env.example` to `.env` and fill in your values:
```bash
cp .env.example .env
```
```env
PORT=5000
NODE_ENV=development
MONGO_URI=your-mongodb-atlas-connection-string
JWT_SECRET=change-me-to-a-long-random-string
JWT_EXPIRES_IN=7d
# Leave the two below BLANK to use built-in demo payment mode:
RAZORPAY_KEY_ID=
RAZORPAY_KEY_SECRET=
```

### 4. Seed demo data (optional but recommended)
```bash
npm run seed
```

### 5. Run in development (server + client together)
```bash
npm run dev
```
- API: http://localhost:5000
- App: http://localhost:5173

---

## 🔑 Demo Login Credentials (after seeding)

| Role        | Email                     | Password  |
|-------------|---------------------------|-----------|
| Admin       | admin@localmart.com       | admin123  |
| Customer    | customer@localmart.com    | cust123   |
| Shopkeeper  | ravi@shop.com             | shop123   |
| Shopkeeper  | med@shop.com              | shop123   |
| Shopkeeper  | stat@shop.com             | shop123   |
| Shopkeeper  | juice@shop.com            | shop123   |
| Shopkeeper  | food@shop.com             | shop123   |

---

## 💳 Payments

- **Demo mode (default):** if `RAZORPAY_KEY_ID` / `RAZORPAY_KEY_SECRET` are not set,
  online payments are auto-approved so you can test the full flow without real keys.
- **Live/test mode:** add your Razorpay keys to enable the real checkout widget.

---

## ☁️ Deploy to Render

This app deploys as a **single web service** — Express serves the built React app.

### Option A — Blueprint (recommended)
1. Push this repo to GitHub.
2. In Render, click **New → Blueprint** and select the repo (uses `render.yaml`).
3. Set the `MONGO_URI` env var (and optional Razorpay keys) in the dashboard.
4. Deploy.

### Option B — Manual Web Service
- **Build Command:** `npm install && npm run build`
- **Start Command:** `npm start`
- **Health Check Path:** `/api/health`
- **Env vars:** `NODE_ENV=production`, `MONGO_URI`, `JWT_SECRET`, and optionally the Razorpay keys.

### Enabling background push (optional)
Web Push needs a VAPID key pair. Generate one with:
```bash
npx web-push generate-vapid-keys
```
Then set these on the **server** (Render dashboard) — the client fetches the
public key at runtime, so no client rebuild is required:
```env
VAPID_PUBLIC_KEY=your-public-key
VAPID_PRIVATE_KEY=your-private-key
VAPID_SUBJECT=mailto:you@example.com
```
> If these are left blank, background push is simply skipped —
> in-app (real-time) notifications keep working.

> After the first deploy, run `npm run seed` locally (pointed at the same Atlas DB)
> or via a Render one-off job to populate demo data.

---

## 📜 API Overview

| Area      | Endpoints                                                        |
|-----------|------------------------------------------------------------------|
| Auth      | `POST /api/auth/register`, `POST /api/auth/login`, `GET/PUT /api/auth/me` |
| Shops     | `GET /api/shops`, `GET /api/shops/:id`, `POST/PUT /api/shops`     |
| Products  | `GET /api/products`, `POST/PUT/DELETE /api/products/:id`          |
| Orders    | `POST /api/orders`, `GET /api/orders/mine`, `GET /api/orders/:id`, `PUT /api/orders/:id/status`, `GET /api/orders/:id/invoice` |
| Admin     | `GET /api/admin/stats|users|shops|orders`, approval & role routes |

---

## 📝 License

For educational / demonstration use.
