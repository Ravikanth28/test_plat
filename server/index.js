import express from "express";
import cors from "cors";
import helmet from "helmet";
import rateLimit from "express-rate-limit";
import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";

import { connectDB } from "./config/db.js";
import { notFound, errorHandler } from "./middleware/error.js";

import authRoutes from "./routes/auth.js";
import shopRoutes from "./routes/shops.js";
import productRoutes from "./routes/products.js";
import orderRoutes from "./routes/orders.js";
import adminRoutes from "./routes/admin.js";
import favoriteRoutes from "./routes/favorites.js";
import notificationRoutes from "./routes/notifications.js";
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
const allowedOrigins = [
  process.env.CLIENT_URL,
  "http://localhost:5173",
  "http://127.0.0.1:5173",
].filter(Boolean);
app.use(
  cors({
    origin(origin, cb) {
      if (!origin || allowedOrigins.includes(origin)) return cb(null, true);
      return cb(new Error("Not allowed by CORS"));
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

// Serve React build in production (single service on Render)
if (process.env.NODE_ENV === "production") {
  const clientDist = path.join(__dirname, "..", "client", "dist");
  app.use(express.static(clientDist));
  app.get("*", (req, res) => {
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

// Connect to MongoDB in the background; a slow/failed DB connection must not
// prevent the web process from opening its port.
connectDB().catch((err) => {
  console.error("Initial MongoDB connection failed:", err.message);
});
