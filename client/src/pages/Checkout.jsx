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
  const [geo, setGeo] = useState(null); // { lat, lng, accuracy }
  const [locating, setLocating] = useState(false);
  const [locMsg, setLocMsg] = useState("");

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

  // Capture the customer's GPS position (with permission) so the shop can find
  // them precisely. Best-effort reverse-geocode fills the address if it's empty.
  const useMyLocation = () => {
    if (!("geolocation" in navigator)) {
      setLocMsg("Location isn't supported on this device.");
      return;
    }
    setLocating(true);
    setLocMsg("");
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const { latitude, longitude, accuracy } = pos.coords;
        setGeo({ lat: latitude, lng: longitude, accuracy });
        setLocating(false);
        setLocMsg(`Location captured ✓ (±${Math.round(accuracy)}m)`);
        if (!address.trim()) {
          try {
            const r = await fetch(
              `https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}`
            );
            const j = await r.json();
            if (j?.display_name) setAddress(j.display_name);
          } catch {
            /* reverse geocode is optional — coords are still sent */
          }
        }
      },
      (err) => {
        setLocating(false);
        setLocMsg(
          err.code === 1
            ? "Permission denied — you can type the address instead."
            : "Couldn't get your location. Please type the address."
        );
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
    );
  };

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
        geo,
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
    <div className="container">
      <div className="page-head">
        <div>
          <h1>Checkout</h1>
          <p className="sub">Almost there — confirm your details</p>
        </div>
      </div>
      <div className="grid" style={{ gridTemplateColumns: "1fr 360px", alignItems: "start" }}>
        <div>
          <div className="card mb">
            <h3 style={{ marginTop: 0 }}>📍 Delivery Details</h3>
            <div className="mini-map">🗺️</div>
            <div className="field">
              <label>Delivery Address</label>
              <textarea
                rows={3}
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                placeholder="House no, street, area, landmark..."
              />
              <button
                type="button"
                className="btn btn-ghost btn-sm"
                onClick={useMyLocation}
                disabled={locating}
                style={{ marginTop: 8 }}
              >
                {locating ? "Locating…" : "📍 Use my current location"}
              </button>
              {locMsg && (
                <div className="muted small" style={{ marginTop: 6 }}>
                  {locMsg}
                </div>
              )}
              {geo && (
                <div className="muted small" style={{ marginTop: 2 }}>
                  Sharing precise location with the shop for faster delivery.
                </div>
              )}
            </div>
            <div className="field" style={{ marginBottom: 0 }}>
              <label>Phone Number</label>
              <input
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="10-digit mobile number"
              />
            </div>
          </div>

          <div className="card">
            <h3 style={{ marginTop: 0 }}>💳 Payment Method</h3>
            <div
              className={`pay-option ${method === "cod" ? "active" : ""}`}
              onClick={() => setMethod("cod")}
            >
              <span className="pi">💵</span>
              <div>
                <div className="pt">Cash on Delivery</div>
                <div className="muted small">Pay when your order arrives</div>
              </div>
              <input type="radio" checked={method === "cod"} readOnly />
            </div>
            <div
              className={`pay-option ${method === "online" ? "active" : ""}`}
              onClick={() => setMethod("online")}
              style={{ marginBottom: 0 }}
            >
              <span className="pi">💳</span>
              <div>
                <div className="pt">Pay Online</div>
                <div className="muted small">UPI, Cards & Wallets via Razorpay</div>
              </div>
              <input type="radio" checked={method === "online"} readOnly />
            </div>
          </div>
        </div>

        <div className="card summary">
          <h3 style={{ marginTop: 0 }}>Order Summary</h3>
          <p className="muted small" style={{ marginTop: -4 }}>
            From {shopName}
          </p>
          {items.map((i) => (
            <div className="line" key={i.product}>
              <span style={{ color: "var(--text)" }}>
                {i.name} × {i.qty}
              </span>
              <span>{rupee(i.price * i.qty)}</span>
            </div>
          ))}
          <hr className="dashed-sep" />
          <div className="line">
            <span>Items Total</span>
            <span>{rupee(itemsTotal)}</span>
          </div>
          <div className="line">
            <span>Delivery Fee</span>
            <span>{rupee(DELIVERY_FEE)}</span>
          </div>
          <div className="line total">
            <span>To Pay</span>
            <span className="price">{rupee(total)}</span>
          </div>
          {error && <div className="error mt">{error}</div>}
          <button className="btn btn-block mt" onClick={placeOrder} disabled={busy}>
            {busy
              ? "Placing order..."
              : method === "cod"
              ? `Place Order • ${rupee(total)}`
              : `Pay ${rupee(total)}`}
          </button>
        </div>
      </div>
    </div>
  );
}
