import { useEffect, useState, useCallback } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import { api, downloadFile } from "../api.js";
import { useCart } from "../context/CartContext.jsx";
import {
  rupee,
  STATUS_STEPS,
  statusLabel,
  statusBadgeClass,
  distanceKm,
  etaMinutes,
  formatDistance,
} from "../utils.js";

// An order is "live" (worth polling) until it reaches a terminal state.
const TERMINAL = ["delivered", "cancelled"];

export default function OrderDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { reorder } = useCart();
  const [order, setOrder] = useState(null);
  const [loading, setLoading] = useState(true);
  const [downloading, setDownloading] = useState(false);
  const [updatedAt, setUpdatedAt] = useState(null);

  const load = useCallback(() => {
    api
      .get(`/orders/${id}`)
      .then((o) => {
        setOrder(o);
        setUpdatedAt(new Date());
      })
      .finally(() => setLoading(false));
  }, [id]);

  useEffect(() => {
    load();
  }, [load]);

  // Auto-refresh tracking every 15s, but stop once the order is delivered or
  // cancelled — no point hammering the API for a finished order.
  const live = order && !TERMINAL.includes(order.status);
  useEffect(() => {
    if (!live) return;
    const t = setInterval(load, 15000);
    return () => clearInterval(t);
  }, [live, load]);

  const orderAgain = () => {
    const n = reorder(order.items, order.shop);
    if (n) navigate("/cart");
  };

  const getInvoice = async () => {
    setDownloading(true);
    try {
      await downloadFile(`/orders/${id}/invoice`, `invoice-${order.orderNo}.pdf`);
    } catch (e) {
      alert(e.message);
    } finally {
      setDownloading(false);
    }
  };

  if (loading) return <div className="loading">Loading order...</div>;
  if (!order)
    return (
      <div className="container">
        <div className="card empty" style={{ marginTop: 40 }}>
          <div className="big">🔍</div>
          <h2 style={{ margin: 0 }}>Order not found</h2>
          <p className="muted">This order may have been removed.</p>
        </div>
      </div>
    );

  const cancelled = order.status === "cancelled";
  const currentIdx = STATUS_STEPS.findIndex((s) => s.key === order.status);
  const delivered = order.status === "delivered";
  // Fill the progress bar proportionally to how far along the timeline we are.
  const progressPct =
    STATUS_STEPS.length > 1
      ? Math.max(0, Math.min(100, (currentIdx / (STATUS_STEPS.length - 1)) * 100))
      : 0;

  // Estimated delivery time from shop -> customer, shown while the order is
  // still in flight and we have both endpoints' coordinates.
  const dist = distanceKm(order.shop?.geo, order.geo);
  const eta = etaMinutes(dist);
  const showEta = eta != null && !cancelled && order.status !== "delivered";

  return (
    <div className="container">
      <div className="crumbs">
        <Link to="/orders">My Orders</Link>
        <span className="sep">›</span>
        <span>#{order.orderNo}</span>
      </div>
      <div className="page-head">
        <div>
          <h1>Order #{order.orderNo}</h1>
          <p className="sub">
            Placed {new Date(order.createdAt).toLocaleString("en-IN")} • {order.shop?.name}
          </p>
        </div>
        <span className={`badge ${statusBadgeClass(order.status)}`} style={{ fontSize: 13 }}>
          {statusLabel(order.status)}
        </span>
      </div>

      <div className="grid" style={{ gridTemplateColumns: "1fr 340px", alignItems: "start" }}>
        <div>
          {/* Tracking timeline */}
          <div className="card mb">
            <div className="row between" style={{ alignItems: "center" }}>
              <h3 style={{ margin: 0 }}>Track Order</h3>
              {live && (
                <span className="live-dot" title="Auto-updating every 15s">
                  <span className="live-blip" /> Live
                </span>
              )}
            </div>
            {showEta && (
              <div className="badge badge-blue" style={{ margin: "10px 0" }}>
                🕒 Est. delivery ~{eta} min • {formatDistance(dist)} away
              </div>
            )}
            {!cancelled && (
              <div className="track-progress" aria-hidden="true">
                <div
                  className="track-progress-fill"
                  style={{ width: `${progressPct}%` }}
                />
              </div>
            )}
            {cancelled ? (
              <div className="error">This order was cancelled.</div>
            ) : (
              <ul className="timeline">
                {STATUS_STEPS.map((step, idx) => {
                  const done = idx < currentIdx;
                  const current = idx === currentIdx;
                  const histItem = order.statusHistory?.find((h) => h.status === step.key);
                  return (
                    <li key={step.key} className={done ? "done" : current ? "current" : ""}>
                      <div className="t-title">{step.label}</div>
                      {histItem && (
                        <div className="muted small">
                          {new Date(histItem.at).toLocaleString("en-IN")}
                        </div>
                      )}
                    </li>
                  );
                })}
              </ul>
            )}
            {live && updatedAt && (
              <div className="muted small" style={{ marginTop: 10 }}>
                Last updated {updatedAt.toLocaleTimeString("en-IN")}
              </div>
            )}
          </div>

          {/* Items */}
          <div className="card">
            <h3 style={{ marginTop: 0 }}>Items</h3>
            {order.items.map((i, idx) => (
              <div className="row between" key={idx} style={{ padding: "6px 0" }}>
                <span>
                  {i.name} × {i.qty}
                </span>
                <span>{rupee(i.price * i.qty)}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="summary">
          <div className="card mb">
            <h3 style={{ marginTop: 0 }}>Bill Details</h3>
            <div className="line">
              <span>Items Total</span>
              <span>{rupee(order.itemsTotal)}</span>
            </div>
            <div className="line">
              <span>Delivery Fee</span>
              <span>{rupee(order.deliveryFee)}</span>
            </div>
            <div className="line total">
              <span>Total</span>
              <span className="price">{rupee(order.total)}</span>
            </div>
            <hr className="dashed-sep" />
            <div className="small">
              Payment:{" "}
              <strong>{order.paymentMethod.toUpperCase()}</strong>{" "}
              <span
                className={`badge ${
                  order.paymentStatus === "paid" ? "badge-green" : "badge-amber"
                }`}
              >
                {order.paymentStatus}
              </span>
            </div>
            <button className="btn btn-block mt" onClick={getInvoice} disabled={downloading}>
              {downloading ? "Preparing..." : "⬇ Download Invoice (PDF)"}
            </button>
            {(delivered || cancelled) && (
              <button className="btn btn-ghost btn-block mt" onClick={orderAgain}>
                🔁 Order again
              </button>
            )}
          </div>

          <div className="card">
            <h3 style={{ marginTop: 0 }}>Delivery</h3>
            <div className="info-row">
              <span className="ii">📍</span>
              <span>{order.deliveryAddress}</span>
            </div>
            <div className="info-row">
              <span className="ii">☎</span>
              <span className="muted">{order.phone}</span>
            </div>
            {order.geo?.lat != null && order.geo?.lng != null && (
              <div className="info-row">
                <span className="ii">🗺️</span>
                <a
                  href={`https://www.google.com/maps?q=${order.geo.lat},${order.geo.lng}`}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  Open pinned location on map
                  {order.geo.accuracy
                    ? ` (±${Math.round(order.geo.accuracy)}m)`
                    : ""}
                </a>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
