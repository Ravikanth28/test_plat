import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { api } from "../api.js";
import { useCart } from "../context/CartContext.jsx";
import { useAuth } from "../context/AuthContext.jsx";
import { useLang } from "../context/LanguageContext.jsx";
import { rupee } from "../utils.js";

const DELIVERY_FEE = 20;

export default function Checkout() {
  const { items, shopId, shopName, itemsTotal, clearCart } = useCart();
  const { user, refreshUser } = useAuth();
  const { t, tc } = useLang();
  const navigate = useNavigate();

  const saved = user?.addresses || [];
  // Preselect the first saved address (if any); else fall back to legacy string.
  const [address, setAddress] = useState(saved[0]?.line || user?.address || "");
  const [selectedId, setSelectedId] = useState(saved[0]?._id || "");
  const [saveAddr, setSaveAddr] = useState(saved.length === 0);
  const [saveLabel, setSaveLabel] = useState("");
  const [phone, setPhone] = useState(user?.phone || "");
  const [method, setMethod] = useState("cod");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [geo, setGeo] = useState(
    saved[0]?.geo?.lat != null
      ? { lat: saved[0].geo.lat, lng: saved[0].geo.lng }
      : null
  ); // { lat, lng, accuracy }
  const [locating, setLocating] = useState(false);
  const [locMsg, setLocMsg] = useState("");

  // Pick a saved address: fill the textarea + reuse its pinned coords (if any).
  const pickSaved = (a) => {
    setSelectedId(a._id);
    setAddress(a.line);
    setGeo(a.geo?.lat != null ? { lat: a.geo.lat, lng: a.geo.lng } : null);
    setSaveAddr(false);
    setLocMsg("");
  };

  const total = itemsTotal + DELIVERY_FEE;

  if (items.length === 0) {
    return (
      <div className="container mt center">
        <div className="card">
          <p>{t("checkout.emptyCart")}</p>
          <button className="btn" onClick={() => navigate("/")}>
            {t("checkout.browseShops")}
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
        setSelectedId(""); // fresh location ≠ a saved entry
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
      // Optionally save this address to the book (best-effort — never blocks
      // the order if it fails).
      if (saveAddr && address.trim()) {
        try {
          await api.post("/auth/me/addresses", {
            label: saveLabel.trim(),
            line: address.trim(),
            geo: geo ? { lat: geo.lat, lng: geo.lng } : undefined,
          });
          await refreshUser();
        } catch {
          /* saving the address is optional */
        }
      }

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
          <h1>{t("checkout.title")}</h1>
          <p className="sub">{t("checkout.subtitle")}</p>
        </div>
      </div>
      <div className="grid" style={{ gridTemplateColumns: "1fr 360px", alignItems: "start" }}>
        <div>
          <div className="card mb">
            <h3 style={{ marginTop: 0 }}>📍 {t("checkout.deliveryDetails")}</h3>

            {saved.length > 0 && (
              <div className="field">
                <label>{t("checkout.savedAddresses")}</label>
                <div className="addr-book">
                  {saved.map((a) => (
                    <button
                      key={a._id}
                      type="button"
                      className={`addr-card ${selectedId === a._id ? "active" : ""}`}
                      onClick={() => pickSaved(a)}
                    >
                      <span className="addr-card-label">
                        {a.label ? tc(a.label) : t("checkout.address")}
                        {a.geo?.lat != null && (
                          <span className="addr-pin" title="Pinned location">
                            📍
                          </span>
                        )}
                      </span>
                      <span className="addr-card-line">{tc(a.line)}</span>
                    </button>
                  ))}
                </div>
              </div>
            )}

            <div className="mini-map">🗺️</div>
            <div className="field">
              <label>{t("checkout.deliveryAddress")}</label>
              <textarea
                rows={3}
                value={address}
                onChange={(e) => {
                  setAddress(e.target.value);
                  setSelectedId(""); // typing = a new/edited address
                }}
                placeholder={t("checkout.addressPlaceholder")}
              />
              <button
                type="button"
                className="btn btn-ghost btn-sm"
                onClick={useMyLocation}
                disabled={locating}
                style={{ marginTop: 8 }}
              >
                {locating ? t("checkout.locating") : `📍 ${t("checkout.useLocation")}`}
              </button>
              {locMsg && (
                <div className="muted small" style={{ marginTop: 6 }}>
                  {locMsg}
                </div>
              )}
              {geo && (
                <div className="muted small" style={{ marginTop: 2 }}>
                  {t("checkout.sharingLocation")}
                </div>
              )}
            </div>

            {/* Offer to save the address only when it isn't already a saved one. */}
            {!selectedId && address.trim() && (
              <div className="field" style={{ marginBottom: 0 }}>
                <label className="addr-save-row">
                  <input
                    type="checkbox"
                    checked={saveAddr}
                    onChange={(e) => setSaveAddr(e.target.checked)}
                  />
                  <span>{t("checkout.saveAddress")}</span>
                </label>
                {saveAddr && (
                  <input
                    value={saveLabel}
                    onChange={(e) => setSaveLabel(e.target.value)}
                    placeholder={t("checkout.labelPlaceholder")}
                    style={{ marginTop: 8 }}
                  />
                )}
              </div>
            )}
            <div className="field" style={{ marginBottom: 0 }}>
              <label>{t("checkout.phone")}</label>
              <input
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder={t("checkout.phonePlaceholder")}
              />
            </div>
          </div>

          <div className="card">
            <h3 style={{ marginTop: 0 }}>💳 {t("checkout.paymentMethod")}</h3>
            <div
              className={`pay-option ${method === "cod" ? "active" : ""}`}
              onClick={() => setMethod("cod")}
            >
              <span className="pi">💵</span>
              <div>
                <div className="pt">{t("checkout.cod")}</div>
                <div className="muted small">{t("checkout.codHint")}</div>
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
                <div className="pt">{t("checkout.payOnline")}</div>
                <div className="muted small">{t("checkout.payOnlineHint")}</div>
              </div>
              <input type="radio" checked={method === "online"} readOnly />
            </div>
          </div>
        </div>

        <div className="card summary">
          <h3 style={{ marginTop: 0 }}>{t("checkout.orderSummary")}</h3>
          <p className="muted small" style={{ marginTop: -4 }}>
            {t("checkout.from")} {tc(shopName)}
          </p>
          {items.map((i) => (
            <div className="line" key={i.product}>
              <span style={{ color: "var(--text)" }}>
                {tc(i.name)} × {i.qty}
              </span>
              <span>{rupee(i.price * i.qty)}</span>
            </div>
          ))}
          <hr className="dashed-sep" />
          <div className="line">
            <span>{t("order.itemsTotal")}</span>
            <span>{rupee(itemsTotal)}</span>
          </div>
          <div className="line">
            <span>{t("order.deliveryFee")}</span>
            <span>{rupee(DELIVERY_FEE)}</span>
          </div>
          <div className="line total">
            <span>{t("checkout.toPay")}</span>
            <span className="price">{rupee(total)}</span>
          </div>
          {error && <div className="error mt">{error}</div>}
          <button className="btn btn-block mt" onClick={placeOrder} disabled={busy}>
            {busy
              ? t("checkout.placing")
              : method === "cod"
              ? `${t("checkout.title")} • ${rupee(total)}`
              : `${t("checkout.pay")} ${rupee(total)}`}
          </button>
        </div>
      </div>
    </div>
  );
}
