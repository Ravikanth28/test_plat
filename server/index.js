import express from "express";
import cors from "cors";
import helmet from "helmet";
import rateLimit from "express-rate-limit";
import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";

import { connectDB } from "./config/db.js";
import { notFound, errorHandler } from "./middleware/error.js";
import Shop from "./models/Shop.js";
import Product from "./models/Product.js";
import { ensureTranslations } from "./utils/translate.js";

import authRoutes from "./routes/auth.js";
import shopRoutes from "./routes/shops.js";
import productRoutes from "./routes/products.js";
import orderRoutes from "./routes/orders.js";
import adminRoutes from "./routes/admin.js";
import favoriteRoutes from "./routes/favorites.js";
import notificationRoutes from "./routes/notifications.js";
import bannerRoutes from "./routes/banners.js";
import i18nRoutes from "./routes/i18n.js";
import { initPush } from "./utils/push.js";

dotenv.config();

// Fail fast if the JWT signing secret is missing or left at an insecure
// placeholder — tokens signed with a weak/blank secret are trivially forgeable.
const JWT_SECRET = process.env.JWT_SECRET;
if (!JWT_SECRET || JWT_SECRET.length < 16 || JWT_SECRET === "changeme") {
  console.error(
    "FATAL: JWT_SECRET is missing or too weak. Set a long, random JWT_SECRET (>= 16 chars)."
  );
  process.exit(1);
}

// Configure Web Push (VAPID) once at startup. No-ops if keys aren't set.
initPush();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();

// Render terminates TLS at its proxy; trust it so rate-limit / secure cookies
// see the real client IP and protocol.
app.set("trust proxy", 1);

// Security headers. CSP and COEP are disabled because the SPA loads the
// Razorpay checkout script and inline styles; enabling the strict defaults
// would break checkout and the PWA. Everything else (HSTS, no-sniff, frameguard)
// stays on.
app.use(
  helmet({
    contentSecurityPolicy: false,
    crossOriginEmbedderPolicy: false,
  })
);

// Lock CORS to known origins. In production the client is served from the same
// origin, so browsers don't send cross-origin API calls; the dev Vite server
// (:5173) and any explicit CLIENT_URL are allowed. Requests with no Origin
// header (curl, health checks, same-origin) are permitted.
//
// A disallowed origin must NOT throw — throwing turns the CORS decision into a
// hard 500 (application/json) for ANY request that carries that Origin header.
// Crucially, Vite emits the app shell as <script type="module" crossorigin>,
// which the browser fetches in CORS mode WITH an Origin header even though the
// asset is same-origin. If the site's own Render origin isn't in the allowlist,
// throwing made every module/asset load 500 -> the bundle never executed and
// the page rendered blank. Returning cb(null, false) instead simply omits the
// Access-Control-Allow-Origin header: same-origin requests (the app shell,
// modules, and same-origin API calls) still succeed because the browser doesn't
// require ACAO for same-origin, while genuine cross-origin callers from unknown
// origins get no ACAO and are blocked by the browser — same protection, no 500.
const allowedOrigins = [
  process.env.CLIENT_URL,
  "http://localhost:5173",
  "http://127.0.0.1:5173",
].filter(Boolean);
app.use(
  cors({
    origin(origin, cb) {
      if (!origin || allowedOrigins.includes(origin)) return cb(null, true);
      return cb(null, false);
    },
    credentials: true,
  })
);

app.use(express.json({ limit: "1mb" }));

// Rate limiting. A generous global cap protects the API from abuse/scraping,
// and a tight limiter on the auth routes slows credential-stuffing/brute force.
const generalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 600,
  standardHeaders: true,
  legacyHeaders: false,
});
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 30,
  standardHeaders: true,
  legacyHeaders: false,
  message: { message: "Too many attempts. Please try again later." },
});
app.use("/api", generalLimiter);

// Health check (useful for Render)
app.get("/api/health", (req, res) => res.json({ status: "ok", time: new Date() }));

// API routes
app.use("/api/auth", authLimiter, authRoutes);
app.use("/api/shops", shopRoutes);
app.use("/api/products", productRoutes);
app.use("/api/orders", orderRoutes);
app.use("/api/admin", adminRoutes);
app.use("/api/favorites", favoriteRoutes);
app.use("/api/notifications", notificationRoutes);
app.use("/api/banners", bannerRoutes);
app.use("/api/i18n", i18nRoutes);

// Serve React build in production (single service on Render)
if (process.env.NODE_ENV === "production") {
  const clientDist = path.join(__dirname, "..", "client", "dist");
  app.use(express.static(clientDist));
  app.get("*", (req, res) => {
    // A request for a hashed asset that reached here means the file does not
    // exist (a stale client is asking for an old build's chunk). Return a clean
    // 404 instead of the SPA index.html — otherwise the browser executes HTML
    // as a JS module ("Failed to load module script" MIME error) and the page
    // renders blank. Only genuine SPA routes (no file extension) get index.html.
    if (path.extname(req.path)) {
      res.status(404).type("text/plain").send("Not found");
      return;
    }
    // index.html must never be cached stale: it points at build-hashed assets
    // that change every deploy. no-store forces the browser to always fetch the
    // current shell, so it can never reference a chunk the server no longer has.
    res.set("Cache-Control", "no-store, must-revalidate");
    res.sendFile(path.join(clientDist, "index.html"));
  });
} else {
  app.get("/", (req, res) => res.send("LocalMart API running (dev). Client on :5173"));
}

app.use(notFound);
app.use(errorHandler);

const PORT = process.env.PORT || 5000;

// Bind the port FIRST so the hosting platform (Render) detects an open port
// and the /api/health check succeeds immediately — even while MongoDB is still
// connecting. Binding to 0.0.0.0 is required for Render's internal health check.
app.listen(PORT, "0.0.0.0", () => console.log(`Server listening on port ${PORT}`));

// Backfill shop coordinates for the "Near me" feature. Shops seeded before the
// `geo` field existed have no lat/lng, so distance sorting silently no-ops.
// This assigns deterministic ring-scattered coordinates around the city centre
// to any shop missing valid finite geo. Idempotent: shops that already have
// coordinates are left untouched, so it's safe to run on every startup.
const GEO_CENTER = { lat: 17.385, lng: 78.4867 }; // Hyderabad

function shopGeo(i, total) {
  const angle = (i / Math.max(total, 1)) * 2 * Math.PI;
  const radiusKm = 1.5 + (i % 5) * 1.8;
  const latRad = (GEO_CENTER.lat * Math.PI) / 180;
  const dLat = (radiusKm / 111) * Math.cos(angle);
  const dLng = (radiusKm / (111 * Math.cos(latRad))) * Math.sin(angle);
  return {
    lat: +(GEO_CENTER.lat + dLat).toFixed(6),
    lng: +(GEO_CENTER.lng + dLng).toFixed(6),
  };
}

async function backfillShopGeo() {
  const missing = await Shop.find({
    $or: [
      { geo: { $exists: false } },
      { "geo.lat": { $exists: false } },
      { "geo.lng": { $exists: false } },
      { "geo.lat": null },
      { "geo.lng": null },
    ],
  }).select("_id");
  if (missing.length === 0) return;
  const total = await Shop.countDocuments();
  for (let i = 0; i < missing.length; i++) {
    await Shop.updateOne(
      { _id: missing[i]._id },
      { $set: { geo: shopGeo(i, total) } }
    );
  }
  console.log(`Backfilled geo coordinates for ${missing.length} shop(s).`);
}

// Backfill content translations for existing shops/products so anything seeded
// or created before auto-translation existed also renders in Tamil/Hindi. Only
// uncached (text × lang) pairs hit the translation API; everything else is a
// no-op, so this is safe (and cheap) to run on every startup. Runs in the
// background — never blocks server start.
async function backfillContentTranslations() {
  const [shops, products] = await Promise.all([
    Shop.find().select("name description"),
    Product.find().select("name description"),
  ]);
  const texts = [];
  for (const s of shops) texts.push(s.name, s.description);
  for (const p of products) texts.push(p.name, p.description);
  const added = await ensureTranslations(texts);
  if (added) console.log(`Cached ${added} new content translation(s).`);
}

// Connect to MongoDB in the background; a slow/failed DB connection must not
// prevent the web process from opening its port.
connectDB()
  .then(async () => {
    await backfillShopGeo().catch((err) =>
      console.error("Shop geo backfill failed:", err.message)
    );
    backfillContentTranslations().catch((err) =>
      console.error("Content translation backfill failed:", err.message)
    );
  })
  .catch((err) => {
    console.error("Initial MongoDB connection failed:", err.message);
  });
