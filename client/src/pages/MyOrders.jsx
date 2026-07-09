import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { api } from "../api.js";
import { rupee, statusLabel, statusBadgeClass, catIcon } from "../utils.js";

export default function MyOrders() {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api
      .get("/orders/mine")
      .then(setOrders)
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="loading">Loading your orders...</div>;

  return (
    <div className="container mt">
      <h1>My Orders</h1>
      {orders.length === 0 ? (
        <div className="card center">
          <p className="muted">You haven't placed any orders yet.</p>
          <Link to="/" className="btn">
            Start Ordering
          </Link>
        </div>
      ) : (
        <div className="grid grid-3">
          {orders.map((o) => (
            <Link to={`/orders/${o._id}`} key={o._id} className="card shop-card">
              <div className="row between">
                <strong>#{o.orderNo}</strong>
                <span className={`badge ${statusBadgeClass(o.status)}`}>
                  {statusLabel(o.status)}
                </span>
              </div>
              <p className="muted small" style={{ margin: "6px 0" }}>
                {catIcon(o.shop?.category)} {o.shop?.name}
              </p>
              <p className="small" style={{ margin: 0 }}>
                {o.items.length} item(s) • {o.paymentMethod.toUpperCase()}
              </p>
              <div className="row between mt">
                <span className="price">{rupee(o.total)}</span>
                <span className="muted small">
                  {new Date(o.createdAt).toLocaleDateString("en-IN")}
                </span>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
