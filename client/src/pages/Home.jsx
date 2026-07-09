import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { api } from "../api.js";
import { CATEGORIES, catIcon, rupee } from "../utils.js";

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
          <h1>Order from shops near you</h1>
          <p style={{ margin: 0, opacity: 0.95 }}>
            Department stores, medical, stationery, juice & food — delivered fast.
          </p>
          <form className="search-bar" onSubmit={runSearch}>
            <input
              placeholder="Search for items (e.g. paracetamol, dosa, pen)..."
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
                  <Link to={`/shop/${p.shop._id}`} key={p._id} className="card">
                    <div className="badge badge-cat">{catIcon(p.shop.category)} {p.shop.name}</div>
                    <h4 style={{ margin: "10px 0 4px" }}>{p.name}</h4>
                    <div className="price">{rupee(p.price)}</div>
                    <div className="muted small">Tap to view shop</div>
                  </Link>
                ))}
              </div>
            )}
          </>
        )}

        <div className="chips">
          {CATEGORIES.map((c) => (
            <button
              key={c.key}
              className={`chip ${category === c.key ? "active" : ""}`}
              onClick={() => setCategory(c.key)}
            >
              {c.icon} {c.label}
            </button>
          ))}
        </div>

        <h2 className="section-title">
          {category === "all" ? "All Shops" : CATEGORIES.find((c) => c.key === category)?.label + " Shops"}
        </h2>

        {loading ? (
          <div className="loading">Loading shops...</div>
        ) : shops.length === 0 ? (
          <p className="muted">No shops available in this category yet.</p>
        ) : (
          <div className="grid grid-3">
            {shops.map((s) => (
              <Link to={`/shop/${s._id}`} key={s._id} className="card shop-card">
                <div className="shop-thumb">{catIcon(s.category)}</div>
                <div className="row between">
                  <h3 style={{ margin: 0 }}>{s.name}</h3>
                  <span className="badge badge-green">★ {s.rating}</span>
                </div>
                <div className="badge badge-cat mt" style={{ marginTop: 6 }}>
                  {s.category}
                </div>
                <p className="muted small" style={{ marginBottom: 4 }}>
                  {s.description}
                </p>
                <p className="muted small" style={{ margin: 0 }}>
                  📍 {s.address}
                </p>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
