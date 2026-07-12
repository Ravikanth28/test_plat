import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { api } from "../api.js";
import { useCart } from "../context/CartContext.jsx";
import { useLang } from "../context/LanguageContext.jsx";
import { rupee, statusLabel, statusBadgeClass, catIcon } from "../utils.js";

export default function MyOrders() {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const { reorder } = useCart();
  const { t, tc } = useLang();
  const navigate = useNavigate();

  // Re-add a past order's items to the cart and jump to it. Prevent the
  // parent card <Link> from also navigating to the order detail page.
  const orderAgain = (e, o) => {
    e.preventDefault();
    e.stopPropagation();
    if (!o.shop?._id) return;
    reorder(o.items, o.shop);
    navigate("/cart");
  };

  useEffect(() => {
    api
      .get("/orders/mine")
      .then(setOrders)
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="container">
        <div className="page-head">
          <div>
            <h1>{t("orders.title")}</h1>
            <p className="sub">{t("orders.subtitle")}</p>
          </div>
        </div>
        <div className="grid grid-3">
          {[0, 1, 2].map((i) => (
            <div className="card" key={i}>
              <div className="skel" style={{ height: 18, width: "50%" }} />
              <div className="skel" style={{ height: 46, width: "100%", marginTop: 14 }} />
              <div className="skel" style={{ height: 14, width: "70%", marginTop: 14 }} />
            </div>
          ))}
        </div>
      </div>
    );
  }

  const active = orders.filter(
    (o) => !["delivered", "cancelled"].includes(o.status)
  ).length;

  return (
    <div className="container">
      <div className="page-head">
        <div>
          <h1>{t("orders.title")}</h1>
          <p className="sub">
            {orders.length} {orders.length !== 1 ? t("orders.ordersPlural") : t("orders.order")}
            {active > 0 && ` • ${active} ${t("orders.inProgress")}`}
          </p>
        </div>
        <Link to="/" className="btn btn-sm btn-outline">
          + {t("orders.orderMore")}
        </Link>
      </div>

      {orders.length === 0 ? (
        <div className="card empty">
          <div className="big">🧾</div>
          <h2 style={{ margin: "0 0 6px" }}>{t("orders.none")}</h2>
          <p className="muted">{t("orders.emptyMsg")}</p>
          <Link to="/" className="btn mt">
            {t("orders.startOrdering")}
          </Link>
        </div>
      ) : (
        <div className="grid grid-3">
          {orders.map((o) => (
            <Link to={`/orders/${o._id}`} key={o._id} className="card order-card">
              <div className="oc-top">
                <div className="oc-icon">{catIcon(o.shop?.category)}</div>
                <div style={{ minWidth: 0, flex: 1 }}>
                  <div className="row between">
                    <strong style={{ fontSize: 15 }}>#{o.orderNo}</strong>
                    <span className={`badge ${statusBadgeClass(o.status)}`}>
                      {tc(statusLabel(o.status))}
                    </span>
                  </div>
                  <div className="muted small" style={{ marginTop: 2 }}>
                    {o.shop?.name ? tc(o.shop.name) : t("orders.shop")}
                  </div>
                </div>
              </div>

              <div className="oc-items">
                {o.items.length} {o.items.length !== 1 ? t("orders.items") : t("orders.item")}
                <span className="dot-sep" />
                {o.paymentMethod.toUpperCase()}
                <span className="dot-sep" />
                {new Date(o.createdAt).toLocaleDateString("en-IN", {
                  day: "numeric",
                  month: "short",
                })}
              </div>

              <div className="row between">
                <span className="price" style={{ fontSize: 17 }}>
                  {rupee(o.total)}
                </span>
                <span className="small" style={{ color: "var(--brand)", fontWeight: 700 }}>
                  {t("orders.viewDetails")} →
                </span>
              </div>

              <button
                type="button"
                className="btn btn-sm btn-outline btn-block oc-reorder"
                onClick={(e) => orderAgain(e, o)}
              >
                🔁 {t("orders.reorder")}
              </button>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
