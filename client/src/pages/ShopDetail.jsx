import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { api } from "../api.js";
import { useCart } from "../context/CartContext.jsx";
import {
  catIcon,
  catLabel,
  rupee,
  isImageUrl,
  tileGradient,
  deliveryTime,
} from "../utils.js";

function Thumb({ image, fallback, className, style }) {
  return (
    <div className={className} style={style}>
      {isImageUrl(image) ? (
        <img src={image} alt="" loading="lazy" />
      ) : (
        <span>{image || fallback}</span>
      )}
    </div>
  );
}

export default function ShopDetail() {
  const { id } = useParams();
  const [data, setData] = useState(null);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const { items, addItem, decItem, count } = useCart();

  useEffect(() => {
    setLoading(true);
    api
      .get(`/shops/${id}`, { auth: false })
      .then(setData)
      .finally(() => setLoading(false));
  }, [id]);

  if (loading) return <div className="loading">Loading shop…</div>;
  if (!data) return <div className="container mt">Shop not found.</div>;

  const { shop, products } = data;
  const qtyOf = (pid) => items.find((i) => i.product === pid)?.qty || 0;
  const filtered = products.filter((p) =>
    p.name.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="container mt">
      <div className="card mb">
        <div className="row gap">
          <Thumb
            className="prod-thumb"
            image={shop.image}
            fallback={catIcon(shop.category)}
            style={{
              width: 92,
              height: 92,
              fontSize: 46,
              background: tileGradient(shop.name),
            }}
          />
          <div style={{ minWidth: 0 }}>
            <div className="row gap wrap" style={{ gap: 8 }}>
              <h1 style={{ margin: 0, fontSize: 26, letterSpacing: "-0.5px" }}>
                {shop.name}
              </h1>
              <span className="rating-pill">★ {shop.rating}</span>
            </div>
            <div className="row gap wrap" style={{ gap: 8, marginTop: 8 }}>
              <span className="badge badge-cat">{catLabel(shop.category)}</span>
              <span className="badge badge-gray">🕒 {deliveryTime(shop._id)} min</span>
              {shop.isOpen ? (
                <span className="badge badge-green">Open now</span>
              ) : (
                <span className="badge badge-red">Closed</span>
              )}
            </div>
            <p className="muted small" style={{ margin: "8px 0 0" }}>
              {shop.description}
            </p>
            <p className="muted small" style={{ margin: "2px 0 0" }}>
              📍 {shop.address} &nbsp;•&nbsp; ☎ {shop.phone}
            </p>
          </div>
        </div>
      </div>

      <div className="row between mb wrap gap">
        <h2 className="section-title" style={{ margin: 0 }}>
          Menu · {products.length} items
        </h2>
        <input
          className="search-item"
          placeholder="Search in this shop…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          style={{
            padding: "10px 14px",
            border: "1px solid var(--border)",
            borderRadius: 10,
            minWidth: 220,
          }}
        />
      </div>

      <div className="card">
        {filtered.length === 0 ? (
          <p className="muted">No items found.</p>
        ) : (
          filtered.map((p) => (
            <div className="product-item" key={p._id}>
              <div className="prod-main">
                <Thumb
                  className="prod-thumb"
                  image={p.image}
                  fallback={catIcon(shop.category)}
                  style={{ background: tileGradient(p.name) }}
                />
                <div className="prod-info">
                  <div className="nm">{p.name}</div>
                  <div className="muted small">
                    {p.description || p.category} • per {p.unit}
                  </div>
                  <div className="price" style={{ marginTop: 4 }}>
                    {rupee(p.price)}
                  </div>
                </div>
              </div>
              <div>
                {!p.inStock ? (
                  <span className="badge badge-red">Out of stock</span>
                ) : qtyOf(p._id) > 0 ? (
                  <div className="qty">
                    <button onClick={() => decItem(p._id)}>−</button>
                    <span>{qtyOf(p._id)}</span>
                    <button onClick={() => addItem(p, shop)}>+</button>
                  </div>
                ) : (
                  <button
                    className="btn btn-outline btn-sm"
                    onClick={() => addItem(p, shop)}
                  >
                    ADD +
                  </button>
                )}
              </div>
            </div>
          ))
        )}
      </div>

      {count > 0 && (
        <div
          className="card mt row between"
          style={{ position: "sticky", bottom: 12, boxShadow: "var(--shadow-lg)" }}
        >
          <span style={{ fontWeight: 700 }}>{count} item(s) in cart</span>
          <Link to="/cart" className="btn">
            View Cart →
          </Link>
        </div>
      )}
    </div>
  );
}
