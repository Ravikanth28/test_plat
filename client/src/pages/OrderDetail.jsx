import { useEffect, useState, useCallback } from "react";
import { useParams } from "react-router-dom";
import { api, downloadFile } from "../api.js";
import {
  rupee,
  STATUS_STEPS,
  statusLabel,
  statusBadgeClass,
} from "../utils.js";

export default function OrderDetail() {
  const { id } = useParams();
  const [order, setOrder] = useState(null);
  const [loading, setLoading] = useState(true);
  const [downloading, setDownloading] = useState(false);

  const load = useCallback(() => {
    api
      .get(`/orders/${id}`)
      .then(setOrder)
      .finally(() => setLoading(false));
  }, [id]);

  useEffect(() => {
    load();
    // Auto-refresh tracking every 15s while not delivered/cancelled
    const t = setInterval(load, 15000);
    return () => clearInterval(t);
  }, [load]);

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
  if (!order) return <div className="container mt">Order not found.</div>;

  const cancelled = order.status === "cancelled";
  const currentIdx = STATUS_STEPS.findIndex((s) => s.key === order.status);

  return (
    <div className="container mt">
      <div className="row between">
        <h1 style={{ margin: 0 }}>Order #{order.orderNo}</h1>
        <span className={`badge ${statusBadgeClass(order.status)}`}>
          {statusLabel(order.status)}
        </span>
      </div>
      <p className="muted small">
        Placed on {new Date(order.createdAt).toLocaleString("en-IN")} • {order.shop?.name}
      </p>

      <div className="grid" style={{ gridTemplateColumns: "1fr 340px" }}>
        <div>
          {/* Tracking timeline */}
          <div className="card mb">
            <h3 style={{ marginTop: 0 }}>Track Order</h3>
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

        <div>
          <div className="card mb">
            <h3 style={{ marginTop: 0 }}>Bill Details</h3>
            <div className="row between small">
              <span className="muted">Items Total</span>
              <span>{rupee(order.itemsTotal)}</span>
            </div>
            <div className="row between small">
              <span className="muted">Delivery Fee</span>
              <span>{rupee(order.deliveryFee)}</span>
            </div>
            <div className="row between mt">
              <strong>Total</strong>
              <strong className="price">{rupee(order.total)}</strong>
            </div>
            <hr style={{ border: "none", borderTop: "1px solid var(--border)", margin: "12px 0" }} />
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
          </div>

          <div className="card">
            <h3 style={{ marginTop: 0 }}>Delivery</h3>
            <p className="small" style={{ margin: 0 }}>
              📍 {order.deliveryAddress}
            </p>
            <p className="small muted">☎ {order.phone}</p>
          </div>
        </div>
      </div>
    </div>
  );
}
