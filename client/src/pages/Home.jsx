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

  // Attach a distance (km) to each shop when we know the user's location, then
  // sort ascending if "Near me" is active. Shops without geo sink to the bottom.
  const shopsView = shops.map((s) => ({
    ...s,
    _dist: userGeo ? distanceKm(userGeo, s.geo) : null,
  }));
  if (nearMe && userGeo) {
    shopsView.sort((a, b) => {
      const da = a._dist == null ? Infinity : a._dist;
      const db = b._dist == null ? Infinity : b._dist;
      return da - db;
    });
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

        <div className="row between" style={{ alignItems: "center" }}>
          <h2 className="section-title" style={{ marginBottom: 0 }}>
            {category === "all" ? "All shops near you" : catLabel(category) + " shops"}
          </h2>
          <button
            className={`btn btn-sm ${nearMe ? "" : "btn-ghost"}`}
            onClick={toggleNearMe}
            disabled={geoBusy}
          >
            {geoBusy ? "Locating…" : nearMe ? "📍 Near me • On" : "📍 Near me"}
          </button>
        </div>
        {geoErr && (
          <p className="muted small" style={{ margin: "6px 0 0" }}>
            {geoErr}
          </p>
        )}

        {loading ? (
          <div className="loading">Loading shops…</div>
        ) : shops.length === 0 ? (
          <div className="empty">
            <div className="big">🛍️</div>
            <p>No shops available in this category yet.</p>
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

        <GetAppBanner />
      </div>
    </div>
  );
}
