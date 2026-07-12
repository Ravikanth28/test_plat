import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { api } from "../api.js";
import FavoriteButton from "../components/FavoriteButton.jsx";
import GetAppBanner from "../components/GetAppBanner.jsx";
import {
  CATEGORIES,
  catIcon,
  catLabel,
  rupee,
  isImageUrl,
  tileGradient,
  deliveryTime,
  distanceKm,
  formatDistance,
} from "../utils.js";

const SORTS = [
  { key: "recommended", label: "Recommended" },
  { key: "rating", label: "Top rated" },
  { key: "delivery", label: "Fastest" },
];

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
  // "Near me" sorting: once the user shares their location we sort shops by
  // distance and show a distance badge. geoBusy guards the async permission
  // prompt; geoErr surfaces a denied/unavailable message.
  const [userGeo, setUserGeo] = useState(null);
  const [nearMe, setNearMe] = useState(false);
  const [geoBusy, setGeoBusy] = useState(false);
  const [geoErr, setGeoErr] = useState("");
  // Sidebar filters applied to the shops within the chosen category.
  const [sort, setSort] = useState("recommended");
  const [minRating, setMinRating] = useState(0);

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

  // Toggle "Near me". When turning on, ask the browser for the user's location
  // (once) and remember it; turning off just clears the sort flag. We keep the
  // captured coordinates so re-toggling doesn't prompt again.
  const toggleNearMe = () => {
    if (nearMe) {
      setNearMe(false);
      return;
    }
    if (userGeo) {
      setNearMe(true);
      return;
    }
    if (!navigator.geolocation) {
      setGeoErr("Location isn't supported on this device.");
      return;
    }
    setGeoBusy(true);
    setGeoErr("");
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setUserGeo({ lat: pos.coords.latitude, lng: pos.coords.longitude });
        setNearMe(true);
        setGeoBusy(false);
      },
      () => {
        setGeoErr("Couldn't get your location. Please allow access and retry.");
        setGeoBusy(false);
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 60000 }
    );
  };

  // Attach a distance (km) to each shop when we know the user's location, apply
  // the minimum-rating filter, then order the list. "Near me" (when active)
  // takes priority and sorts by distance; otherwise the chosen sort applies.
  let shopsView = shops.map((s) => ({
    ...s,
    _dist: userGeo ? distanceKm(userGeo, s.geo) : null,
  }));
  if (minRating > 0) {
    shopsView = shopsView.filter((s) => (s.rating || 0) >= minRating);
  }
  if (nearMe && userGeo) {
    shopsView.sort((a, b) => {
      const da = a._dist == null ? Infinity : a._dist;
      const db = b._dist == null ? Infinity : b._dist;
      return da - db;
    });
  } else if (sort === "rating") {
    shopsView.sort((a, b) => (b.rating || 0) - (a.rating || 0));
  } else if (sort === "delivery") {
    shopsView.sort((a, b) => deliveryTime(a._id) - deliveryTime(b._id));
  }

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

        <div className="shops-layout">
          {/* Filter sidebar — applies to the shops in the chosen category. */}
          <aside className="filter-panel">
            <h3 className="filter-title">Filters</h3>

            <div className="filter-group">
              <span className="filter-label">Showing</span>
              <div className="filter-showing">
                {catIcon(category)}{" "}
                {category === "all" ? "All shops" : catLabel(category)}
              </div>
            </div>

            <div className="filter-group">
              <span className="filter-label">Sort by</span>
              <div className="filter-opts">
                {SORTS.map((o) => (
                  <button
                    key={o.key}
                    className={`filter-chip ${sort === o.key && !nearMe ? "active" : ""}`}
                    onClick={() => setSort(o.key)}
                  >
                    {o.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="filter-group">
              <span className="filter-label">Minimum rating</span>
              <div className="filter-opts">
                {[0, 4, 4.5].map((r) => (
                  <button
                    key={r}
                    className={`filter-chip ${minRating === r ? "active" : ""}`}
                    onClick={() => setMinRating(r)}
                  >
                    {r === 0 ? "Any" : `★ ${r}+`}
                  </button>
                ))}
              </div>
            </div>

            <div className="filter-group">
              <span className="filter-label">Location</span>
              <button
                className={`btn btn-sm btn-block ${nearMe ? "" : "btn-ghost"}`}
                onClick={toggleNearMe}
                disabled={geoBusy}
              >
                {geoBusy ? "Locating…" : nearMe ? "📍 Near me • On" : "📍 Near me"}
              </button>
              {geoErr && (
                <p className="muted small" style={{ margin: "6px 0 0" }}>
                  {geoErr}
                </p>
              )}
            </div>
          </aside>

          {/* Shops grid */}
          <div className="shops-main">
            <div className="row between" style={{ alignItems: "center" }}>
              <h2 className="section-title" style={{ marginBottom: 0 }}>
                {category === "all" ? "All shops near you" : catLabel(category) + " shops"}
              </h2>
              {!loading && (
                <span className="muted small">
                  {shopsView.length} {shopsView.length === 1 ? "shop" : "shops"}
                </span>
              )}
            </div>

            {loading ? (
              <div className="loading">Loading shops…</div>
            ) : shops.length === 0 ? (
              <div className="empty">
                <div className="big">🛍️</div>
                <p>No shops available in this category yet.</p>
              </div>
            ) : shopsView.length === 0 ? (
              <div className="empty">
                <div className="big">🔍</div>
                <p>No shops match your filters.</p>
                <button
                  className="btn btn-ghost btn-sm mt"
                  onClick={() => {
                    setMinRating(0);
                    setSort("recommended");
                  }}
                >
                  Reset filters
                </button>
              </div>
            ) : (
              <div className="grid grid-3">
                {shopsView.map((s) => (
                  <Link to={`/shop/${s._id}`} key={s._id} className="card shop-card">
                    <Thumb
                      className="shop-thumb"
                      image={s.image}
                      fallback={catIcon(s.category)}
                      style={{ background: tileGradient(s.name) }}
                    >
                      <span className="eta">🕒 {deliveryTime(s._id)} min</span>
                      {s._dist != null && (
                        <span className="eta" style={{ left: "auto", right: 10 }}>
                          📍 {formatDistance(s._dist)}
                        </span>
                      )}
                      <FavoriteButton shopId={s._id} />
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

        <GetAppBanner />
      </div>
    </div>
  );
}
