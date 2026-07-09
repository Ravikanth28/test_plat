import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { api } from "../api.js";
import { useCart } from "../context/CartContext.jsx";
import { useAuth } from "../context/AuthContext.jsx";
import { rupee } from "../utils.js";

const DELIVERY_FEE = 20;

export default function Checkout() {
  const { items, shopId, shopName, itemsTotal, clearCart } = useCart();
  const { user } = useAuth();
  const navigate = useNavigate();

  const [address, setAddress] = useState(user?.address || "");
  const [phone, setPhone] = useState(user?.phone || "");
  const [method, setMethod] = useState("cod");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  const total = itemsTotal + DELIVERY_FEE;

  if (items.length === 0) {
    return (
      <div className="container mt center">
        <div className="card">
          <p>Your cart is empty.</p>
          <button className="btn" onClick={() => navigate("/")}>
            Browse Shops
          </button>
        </div>
      </div>
    );
  }

  // Open Razorpay checkout (live mode)
  const openRazorpay = (order, payment) =>
    new Promise((resolve, reject) => {
      if (!window.Razorpay) {
        reject(new Error("Payment SDK not loaded. Please retry."));
        return;
      }
      const rzp = new window.Razorpay({
        key: payment.key,
        amount: payment.amount,
        currency: payment.currency,
        name: "LocalMart",
        description: `Order ${order.orderNo}`,
        order_id: payment.razorpayOrderId,
        prefill: { name: user?.name, email: user?.email, contact: phone },
        theme: { color: "#e23744" },
        handler: async (resp) => {
          try {
            await api.post(`/orders/${order._id}/verify-payment`, {
              razorpayPaymentId: resp.razorpay_payment_id,
              razorpaySignature: resp.razorpay_signature,
            });
            resolve();
          } catch (e) {
            reject(e);
          }
        },
        modal: {
          ondismiss: () => reject(new Error("Payment cancelled")),
        },
      });
      rzp.open();
    });

  const placeOrder = async () => {
    setError("");
    if (!address.trim()) return setError("Please enter a delivery address.");
    setBusy(true);
    try {
      const { order, payment } = await api.post("/orders", {
        items: items.map((i) => ({ product: i.product, qty: i.qty })),
        shopId,
        deliveryAddress: address,
        phone,
        paymentMethod: method,
      });

      if (method === "online") {
        if (payment.mode === "demo") {
          // Simulate a successful gateway payment
          await api.post(`/orders/${order._id}/verify-payment`, {
            razorpayPaymentId: "demo_pay_" + Date.now(),
            razorpaySignature: "demo_sig",
          });
        } else {
          await openRazorpay(order, payment);
        }
      }

      clearCart();
      navigate(`/orders/${order._id}`, { replace: true });
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="container mt">
      <h1>Checkout</h1>
      <div className="grid" style={{ gridTemplateColumns: "1fr 340px" }}>
        <div>
          <div className="card mb">
            <h3 style={{ marginTop: 0 }}>Delivery Details</h3>
            <div className="field">
              <label>Delivery Address</label>
              <textarea
                rows={3}
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                placeholder="House no, street, area, landmark..."
              />
            </div>
            <div className="field">
              <label>Phone Number</label>
              <input value={phone} onChange={(e) => setPhone(e.target.value)} />
            </div>
          </div>

          <div className="card">
            <h3 style={{ marginTop: 0 }}>Payment Method</h3>
            <label className="row gap" style={{ padding: "8px 0", cursor: "pointer" }}>
              <input
                type="radio"
                checked={method === "cod"}
                onChange={() => setMethod("cod")}
              />
              <span>💵 Cash on Delivery</span>
            </label>
            <label className="row gap" style={{ padding: "8px 0", cursor: "pointer" }}>
              <input
                type="radio"
                checked={method === "online"}
                onChange={() => setMethod("online")}
              />
              <span>💳 Pay Online (Razorpay)</span>
            </label>
          </div>
        </div>

        <div>
          <div className="card">
            <h3 style={{ marginTop: 0 }}>Order Summary</h3>
            <p className="muted small">From: {shopName}</p>
            {items.map((i) => (
              <div className="row between small" key={i.product} style={{ padding: "4px 0" }}>
                <span>
                  {i.name} × {i.qty}
                </span>
                <span>{rupee(i.price * i.qty)}</span>
              </div>
            ))}
            <hr style={{ border: "none", borderTop: "1px solid var(--border)", margin: "10px 0" }} />
            <div className="row between small">
              <span className="muted">Items Total</span>
              <span>{rupee(itemsTotal)}</span>
            </div>
            <div className="row between small">
              <span className="muted">Delivery Fee</span>
              <span>{rupee(DELIVERY_FEE)}</span>
            </div>
            <div className="row between mt">
              <strong>To Pay</strong>
              <strong className="price">{rupee(total)}</strong>
            </div>
            {error && <div className="error mt">{error}</div>}
            <button className="btn btn-block mt" onClick={placeOrder} disabled={busy}>
              {busy
                ? "Placing order..."
                : method === "cod"
                ? "Place Order (COD)"
                : `Pay ${rupee(total)}`}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
