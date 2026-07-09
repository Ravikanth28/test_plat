import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { api } from "../api.js";
import {
  CATEGORIES,
  catIcon,
  catLabel,
  rupee,
  isImageUrl,
  tileGradient,
  deliveryTime,
} from "../utils.js";

function Thumb({ image, fallback, className, style, children }) {
  return (
    <div className={className} style={style}>
      {isImageUrl(image) ? (
        <img src={image} alt="" loading="lazy" />
      ) : (
        <span>{image || fallback}</span>
      )}
      {children}
    </div>
  );
}

export default function Home() {
  const [shops, setShops] = useState([]);
  const [products, setProducts] = useState([]);
  const [category, setCategory] = useState("all");
  const [search, setSearch] = useState("");
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    const params = new URLSearchParams();
    if (category !== "all") params.set("category", category);
    api
      .get(`/shops?${params.toString()}`, { auth: false })
      .then(setShops)
      .finally(() => setLoading(false));
  }, [category]);

  // Global product search across all shops
  useEffect(() => {
    if (!query.trim()) {
      setProducts([]);
      return;
    }
    api
      .get(`/products?search=${encodeURIComponent(query)}`, { auth: false })
      .then(setProducts)
      .catch(() => setProducts([]));
  }, [query]);

  const runSearch = (e) => {
    e.preventDefault();
    setQuery(search.trim());
  };

  return (
    <div>
      <div className="hero">
        <div className="container">
          <h1>Groceries, food & essentials — delivered fast</h1>
          <p className="sub">
            From department stores, pharmacies, juice bars, restaurants & more near you.
          </p>
          <form className="search-bar" onSubmit={runSearch}>
            <input
              placeholder='Search "paracetamol", "dosa", "milk", "pens"...'
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
            <button className="btn" type="submit">
              Search
            </button>
          </form>
        </div>
      </div>

      <div className="container">
        {query && (
          <>
            <div className="row between mt">
              <h2 className="section-title" style={{ margin: 0 }}>
                Results for "{query}"
              </h2>
              <button
                className="btn btn-ghost btn-sm"
                onClick={() => {
                  setQuery("");
                  setSearch("");
                }}
              >
                Clear
              </button>
            </div>
            {products.length === 0 ? (
              <p className="muted">No items found. Try a different keyword.</p>
            ) : (
              <div className="grid grid-4 mt">
                {products.map((p) => (
                  <Link to={`/shop/${p.shop._id}`} key={p._id} className="card result-card">
                    <Thumb
                      className="result-thumb"
                      image={p.image}
                      fallback={catIcon(p.shop.category)}
                      style={{ background: tileGradient(p.name) }}
                    />
                    <div className="badge badge-cat">
                      {catIcon(p.shop.category)} {p.shop.name}
                    </div>
                    <h4 style={{ margin: "10px 0 4px" }}>{p.name}</h4>
                    <div className="price">{rupee(p.price)}</div>
                    <div className="muted small">Tap to view shop</div>
                  </Link>
                ))}
              </div>
            )}
          </>
        )}

        <h2 className="section-title">Shop by category</h2>
        <div className="cat-scroll">
          {CATEGORIES.map((c) => (
            <button
              key={c.key}
              className={`cat-tile ${category === c.key ? "active" : ""}`}
              onClick={() => setCategory(c.key)}
            >
              <span className="ico">{c.icon}</span>
              <span className="lbl">{c.label}</span>
            </button>
          ))}
        </div>

        <h2 className="section-title">
          {category === "all" ? "All shops near you" : catLabel(category) + " shops"}
        </h2>

        {loading ? (
          <div className="loading">Loading shops…</div>
        ) : shops.length === 0 ? (
          <div className="empty">
            <div className="big">🛍️</div>
            <p>No shops available in this category yet.</p>
          </div>
        ) : (
          <div className="grid grid-3">
            {shops.map((s) => (
              <Link to={`/shop/${s._id}`} key={s._id} className="card shop-card">
                <Thumb
                  className="shop-thumb"
                  image={s.image}
                  fallback={catIcon(s.category)}
                  style={{ background: tileGradient(s.name) }}
                >
                  <span className="eta">🕒 {deliveryTime(s._id)} min</span>
                </Thumb>
                <div className="shop-body">
                  <div className="row between gap">
                    <h3>{s.name}</h3>
                    <span className="rating-pill">★ {s.rating}</span>
                  </div>
                  <div>
                    <span className="badge badge-cat">{catLabel(s.category)}</span>
                  </div>
                  <p className="muted small" style={{ margin: "2px 0 0" }}>
                    {s.description}
                  </p>
                  <p className="muted small" style={{ margin: 0 }}>
                    📍 {s.address}
                  </p>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
