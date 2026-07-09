import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { api } from "../api.js";
import { useCart } from "../context/CartContext.jsx";
import { catIcon, rupee } from "../utils.js";

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

  if (loading) return <div className="loading">Loading shop...</div>;
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
          <div style={{ fontSize: 46 }}>{catIcon(shop.category)}</div>
          <div>
            <h1 style={{ margin: 0 }}>{shop.name}</h1>
            <div className="badge badge-cat">{shop.category}</div>
            <p className="muted small" style={{ margin: "6px 0 0" }}>
              📍 {shop.address} &nbsp;•&nbsp; ☎ {shop.phone}
            </p>
            <p className="muted small" style={{ margin: 0 }}>
              {shop.description}
            </p>
          </div>
        </div>
      </div>

      <div className="row between mb">
        <h2 className="section-title" style={{ margin: 0 }}>
          Menu / Items
        </h2>
        <input
          className="search-item"
          placeholder="Search in this shop..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          style={{
            padding: "8px 12px",
            border: "1px solid var(--border)",
            borderRadius: 8,
          }}
        />
      </div>

      <div className="card">
        {filtered.length === 0 ? (
          <p className="muted">No items found.</p>
        ) : (
          filtered.map((p) => (
            <div className="product-item" key={p._id}>
              <div>
                <div style={{ fontWeight: 600 }}>{p.name}</div>
                <div className="muted small">
                  {p.description || p.category} • per {p.unit}
                </div>
                <div className="price">{rupee(p.price)}</div>
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
                  <button className="btn btn-outline btn-sm" onClick={() => addItem(p, shop)}>
                    ADD +
                  </button>
                )}
              </div>
            </div>
          ))
        )}
      </div>

      {count > 0 && (
        <div className="card mt row between" style={{ position: "sticky", bottom: 12 }}>
          <span>{count} item(s) in cart</span>
          <Link to="/cart" className="btn">
            View Cart →
          </Link>
        </div>
      )}
    </div>
  );
}
