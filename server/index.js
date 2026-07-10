import express from "express";
import cors from "cors";
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

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();

app.use(cors());
app.use(express.json({ limit: "1mb" }));

// Health check (useful for Render)
app.get("/api/health", (req, res) => res.json({ status: "ok", time: new Date() }));

// API routes
app.use("/api/auth", authRoutes);
app.use("/api/shops", shopRoutes);
app.use("/api/products", productRoutes);
app.use("/api/orders", orderRoutes);
app.use("/api/admin", adminRoutes);

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
