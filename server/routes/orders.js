import express from "express";
import Order, { ORDER_STATUSES } from "../models/Order.js";
import Product from "../models/Product.js";
import Shop from "../models/Shop.js";
import { protect, authorize } from "../middleware/auth.js";
import {
  createPaymentOrder,
  verifyPaymentSignature,
  getPublicKey,
  isRazorpayLive,
} from "../utils/razorpay.js";
import { streamInvoice } from "../utils/invoice.js";
import { notify } from "../utils/notify.js";

const router = express.Router();

const DELIVERY_FEE = 20;

// Human-friendly copy for each order status, shown to the customer.
const STATUS_COPY = {
  accepted: { title: "Order accepted", body: "The shop accepted your order." },
  preparing: { title: "Order being prepared", body: "Your order is being prepared." },
  out_for_delivery: { title: "Out for delivery", body: "Your order is on the way!" },
  delivered: { title: "Order delivered", body: "Your order has been delivered. Enjoy!" },
  cancelled: { title: "Order cancelled", body: "Your order was cancelled." },
};

// Allowed forward transitions. A shop may cancel from any pre-delivery state.
// This stops out-of-order jumps (e.g. placed -> delivered) or reopening a
// finished order.
const NEXT_ALLOWED = {
  placed: ["accepted", "cancelled"],
  accepted: ["preparing", "cancelled"],
  preparing: ["out_for_delivery", "cancelled"],
  out_for_delivery: ["delivered", "cancelled"],
  delivered: [],
  cancelled: [],
};

// POST /api/orders  -> customer places an order
router.post("/", protect, async (req, res, next) => {
  try {
    const { items, shopId, deliveryAddress, phone, paymentMethod, geo, idempotencyKey } = req.body;

    // Idempotency: if the client retries the same checkout (double-tap, flaky
    // network), return the already-created order instead of duplicating it.
    if (idempotencyKey) {
      const dup = await Order.findOne({
        customer: req.user._id,
        idempotencyKey: String(idempotencyKey),
      });
      if (dup) return res.status(200).json({ order: dup, payment: null });
    }

    if (!items || !items.length) {
      res.status(400);
      throw new Error("Cart is empty");
    }
    if (!deliveryAddress) {
      res.status(400);
      throw new Error("Delivery address is required");
    }
    const shop = await Shop.findById(shopId);
    if (!shop) {
      res.status(404);
      throw new Error("Shop not found");
    }

    // Rebuild items from DB to prevent price tampering, and enforce stock so a
    // customer can't buy more than is available (or buy an out-of-stock item).
    const orderItems = [];
    const stockUpdates = []; // { product, qty } to decrement after the order saves
    let itemsTotal = 0;
    for (const line of items) {
      const product = await Product.findById(line.product);
      if (!product) continue;
      const qty = Math.max(1, Number(line.qty) || 1);
      if (!product.inStock || product.stock <= 0) {
        res.status(409);
        throw new Error(`"${product.name}" is out of stock`);
      }
      if (product.stock < qty) {
        res.status(409);
        throw new Error(`Only ${product.stock} of "${product.name}" left`);
      }
      itemsTotal += product.price * qty;
      orderItems.push({
        product: product._id,
        name: product.name,
        price: product.price,
        qty,
        unit: product.unit,
      });
      stockUpdates.push({ product, qty });
    }
    if (!orderItems.length) {
      res.status(400);
      throw new Error("No valid products in cart");
    }

    // Free-delivery shops waive the flat fee; everyone else pays it.
    const deliveryFee = shop.freeDelivery ? 0 : DELIVERY_FEE;
    const total = itemsTotal + deliveryFee;
    const method = paymentMethod === "online" ? "online" : "cod";

    // Keep the shared coordinates only if they're valid numbers.
    let location;
    if (geo && Number.isFinite(Number(geo.lat)) && Number.isFinite(Number(geo.lng))) {
      location = {
        lat: Number(geo.lat),
        lng: Number(geo.lng),
        accuracy: Number.isFinite(Number(geo.accuracy)) ? Number(geo.accuracy) : undefined,
      };
    }

    const order = await Order.create({
      customer: req.user._id,
      shop: shop._id,
      items: orderItems,
      itemsTotal,
      deliveryFee,
      total,
      deliveryAddress,
      geo: location,
      phone: phone || req.user.phone,
      paymentMethod: method,
      paymentStatus: "pending",
      idempotencyKey: idempotencyKey ? String(idempotencyKey) : undefined,
    });

    // For online payment, create a payment order (live or demo)
    let payment = null;
    if (method === "online") {
      try {
        const pay = await createPaymentOrder(total, order.orderNo);
        order.razorpay.orderId = pay.id;
        await order.save();
        payment = {
          mode: pay.mode,
          razorpayOrderId: pay.id,
          amount: pay.amount,
          currency: pay.currency,
          key: getPublicKey(),
        };
      } catch (payErr) {
        // Don't leave an orphaned pending order if the gateway call fails.
        await order.deleteOne();
        res.status(502);
        throw new Error("Could not start payment. Please try again.");
      }
    }

    // Decrement stock now that the order exists. When a product hits zero we
    // flip it out of stock so it shows the "Out of stock" badge everywhere.
    for (const { product, qty } of stockUpdates) {
      product.stock = Math.max(0, product.stock - qty);
      if (product.stock === 0) product.inStock = false;
      await product.save();
    }

    // Notify the shopkeeper (new incoming order) and the customer (confirmation).
    notify(shop.owner, {
      type: "order_new",
      title: "New order received",
      body: `Order ${order.orderNo} • ₹${total} • ${orderItems.length} item(s)${
        location ? " • 📍 location shared" : ""
      }`,
      link: "/shop",
    });
    notify(req.user._id, {
      type: "order_placed",
      title: "Order placed",
      body: `Your order ${order.orderNo} at ${shop.name} was placed.`,
      link: `/orders/${order._id}`,
    });

    res.status(201).json({ order, payment });
  } catch (err) {
    next(err);
  }
});

// POST /api/orders/:id/verify-payment  -> confirm online payment
router.post("/:id/verify-payment", protect, async (req, res, next) => {
  try {
    const { razorpayPaymentId, razorpaySignature } = req.body;
    const order = await Order.findById(req.params.id).populate("shop", "owner name");
    if (!order) {
      res.status(404);
      throw new Error("Order not found");
    }
    // Only the customer who placed the order (or an admin) may confirm its
    // payment. Without this, any authenticated user could POST a paymentId for
    // someone else's order and flip it to "paid" (demo signatures always pass).
    if (
      req.user.role !== "admin" &&
      order.customer.toString() !== req.user._id.toString()
    ) {
      res.status(403);
      throw new Error("Not allowed to pay for this order");
    }
    const ok = verifyPaymentSignature({
      orderId: order.razorpay.orderId,
      paymentId: razorpayPaymentId,
      signature: razorpaySignature,
    });
    if (!ok) {
      order.paymentStatus = "failed";
      await order.save();
      notify(order.customer, {
        type: "payment",
        title: "Payment failed",
        body: `Payment for order ${order.orderNo} could not be verified.`,
        link: `/orders/${order._id}`,
      });
      res.status(400);
      throw new Error("Payment verification failed");
    }
    order.paymentStatus = "paid";
    order.razorpay.paymentId = razorpayPaymentId;
    order.razorpay.signature = razorpaySignature;
    await order.save();

    // Notify customer (payment confirmed) and shopkeeper (paid order).
    notify(order.customer, {
      type: "payment",
      title: "Payment successful",
      body: `Payment for order ${order.orderNo} was received. ₹${order.total}`,
      link: `/orders/${order._id}`,
    });
    if (order.shop?.owner) {
      notify(order.shop.owner, {
        type: "payment",
        title: "Order paid",
        body: `Order ${order.orderNo} was paid online.`,
        link: "/shop",
      });
    }

    res.json({ message: "Payment verified", order });
  } catch (err) {
    next(err);
  }
});

// GET /api/orders/mine  -> customer's orders
router.get("/mine", protect, async (req, res, next) => {
  try {
    const orders = await Order.find({ customer: req.user._id })
      .populate("shop", "name category")
      .sort({ createdAt: -1 });
    res.json(orders);
  } catch (err) {
    next(err);
  }
});

// GET /api/orders/shop  -> shopkeeper's incoming orders
router.get("/shop", protect, authorize("shopkeeper", "admin"), async (req, res, next) => {
  try {
    const shop = await Shop.findOne({ owner: req.user._id });
    if (!shop) return res.json([]);
    const orders = await Order.find({ shop: shop._id })
      .populate("customer", "name phone")
      .sort({ createdAt: -1 });
    res.json(orders);
  } catch (err) {
    next(err);
  }
});

// GET /api/orders/shop/analytics  -> sales analytics for the shopkeeper's shop
// Aggregates delivered/paid revenue, orders-per-day, top products, and a status
// breakdown so the dashboard can render charts without a client-side crunch.
router.get(
  "/shop/analytics",
  protect,
  authorize("shopkeeper", "admin"),
  async (req, res, next) => {
    try {
      const shop = await Shop.findOne({ owner: req.user._id });
      if (!shop) {
        return res.json({
          hasShop: false,
          totals: { revenue: 0, orders: 0, delivered: 0, avgOrder: 0, items: 0 },
          byDay: [],
          topProducts: [],
          statusBreakdown: [],
        });
      }

      const orders = await Order.find({ shop: shop._id }).sort({ createdAt: 1 });

      // "Earned" revenue = orders that actually completed (delivered). Cancelled
      // orders never count; in-flight orders are tracked separately as pipeline.
      const isEarned = (o) => o.status === "delivered";

      let revenue = 0;
      let itemsSold = 0;
      let deliveredCount = 0;
      const dayMap = new Map(); // yyyy-mm-dd -> { revenue, orders }
      const prodMap = new Map(); // name -> { qty, revenue }
      const statusMap = new Map();

      // Seed the last 14 days so the chart shows a continuous axis even on
      // days with zero orders.
      const DAYS = 14;
      const today = new Date();
      for (let i = DAYS - 1; i >= 0; i--) {
        const d = new Date(today);
        d.setDate(today.getDate() - i);
        const key = d.toISOString().slice(0, 10);
        dayMap.set(key, { date: key, revenue: 0, orders: 0 });
      }

      for (const o of orders) {
        statusMap.set(o.status, (statusMap.get(o.status) || 0) + 1);

        if (!isEarned(o)) continue;
        deliveredCount += 1;
        revenue += o.total;

        const key = new Date(o.createdAt).toISOString().slice(0, 10);
        if (dayMap.has(key)) {
          const row = dayMap.get(key);
          row.revenue += o.total;
          row.orders += 1;
        }

        for (const it of o.items || []) {
          itemsSold += it.qty || 0;
          const p = prodMap.get(it.name) || { name: it.name, qty: 0, revenue: 0 };
          p.qty += it.qty || 0;
          p.revenue += (it.price || 0) * (it.qty || 0);
          prodMap.set(it.name, p);
        }
      }

      const topProducts = [...prodMap.values()]
        .sort((a, b) => b.revenue - a.revenue)
        .slice(0, 6);

      const statusBreakdown = [...statusMap.entries()].map(([status, count]) => ({
        status,
        count,
      }));

      res.json({
        hasShop: true,
        shopName: shop.name,
        totals: {
          revenue,
          orders: orders.length,
          delivered: deliveredCount,
          avgOrder: deliveredCount ? Math.round(revenue / deliveredCount) : 0,
          items: itemsSold,
        },
        byDay: [...dayMap.values()],
        topProducts,
        statusBreakdown,
      });
    } catch (err) {
      next(err);
    }
  }
);

// GET /api/orders/:id  -> single order (owner customer, shop owner, or admin)
router.get("/:id", protect, async (req, res, next) => {
  try {
    const order = await Order.findById(req.params.id)
      .populate("shop", "name category address phone owner geo")
      .populate("customer", "name phone email");
    if (!order) {
      res.status(404);
      throw new Error("Order not found");
    }
    const isCustomer = order.customer._id.toString() === req.user._id.toString();
    const isShopOwner =
      order.shop.owner && order.shop.owner.toString() === req.user._id.toString();
    if (!isCustomer && !isShopOwner && req.user.role !== "admin") {
      res.status(403);
      throw new Error("Not allowed to view this order");
    }
    res.json(order);
  } catch (err) {
    next(err);
  }
});

// PUT /api/orders/:id/status  -> shopkeeper/admin advances status
router.put("/:id/status", protect, authorize("shopkeeper", "admin"), async (req, res, next) => {
  try {
    const { status } = req.body;
    if (!ORDER_STATUSES.includes(status)) {
      res.status(400);
      throw new Error("Invalid status");
    }
    const order = await Order.findById(req.params.id).populate("shop", "owner");
    if (!order) {
      res.status(404);
      throw new Error("Order not found");
    }
    if (
      req.user.role !== "admin" &&
      order.shop.owner.toString() !== req.user._id.toString()
    ) {
      res.status(403);
      throw new Error("Not your shop's order");
    }
    // Enforce forward-only transitions so a status can't jump out of order
    // (e.g. placed -> delivered) or reopen a finished order. Admins are held
    // to the same state machine to keep the audit trail sane.
    const allowed = NEXT_ALLOWED[order.status] || [];
    if (status !== order.status && !allowed.includes(status)) {
      res.status(400);
      throw new Error(`Cannot change status from ${order.status} to ${status}`);
    }
    order.status = status;
    order.statusHistory.push({ status, at: new Date() });
    // Mark COD as paid when delivered
    if (status === "delivered" && order.paymentMethod === "cod") {
      order.paymentStatus = "paid";
    }
    await order.save();

    // Notify the customer about the status change.
    const copy = STATUS_COPY[status];
    if (copy) {
      notify(order.customer, {
        type: status === "cancelled" ? "order_cancelled" : "order_status",
        title: copy.title,
        body: `${copy.body} (Order ${order.orderNo})`,
        link: `/orders/${order._id}`,
      });
    }

    res.json(order);
  } catch (err) {
    next(err);
  }
});

// GET /api/orders/:id/invoice  -> PDF download
router.get("/:id/invoice", protect, async (req, res, next) => {
  try {
    const order = await Order.findById(req.params.id)
      .populate("shop", "name address phone owner")
      .populate("customer", "name phone email");
    if (!order) {
      res.status(404);
      throw new Error("Order not found");
    }
    const isCustomer = order.customer._id.toString() === req.user._id.toString();
    const isShopOwner =
      order.shop.owner && order.shop.owner.toString() === req.user._id.toString();
    if (!isCustomer && !isShopOwner && req.user.role !== "admin") {
      res.status(403);
      throw new Error("Not allowed");
    }
    streamInvoice(order, res);
  } catch (err) {
    next(err);
  }
});

// meta for frontend
router.get("/meta/payment", (req, res) => {
  res.json({ razorpayLive: isRazorpayLive, key: getPublicKey() });
});

export default router;
