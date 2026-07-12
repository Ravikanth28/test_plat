import { useEffect, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { api } from "../api.js";
import FavoriteButton from "../components/FavoriteButton.jsx";
import GetAppBanner from "../components/GetAppBanner.jsx";
import AdCarousel from "../components/AdCarousel.jsx";
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

// Sub-category chips shown per chosen category. Each chip carries keywords that
// are matched (best-effort) against a shop's name + description so, e.g. picking
// "Meals" under Food surfaces shops that mention meals/thali/tiffin.
const SUBCATS = {
  food: [
    { key: "veg", label: "🥗 Veg", kw: ["veg", "vegetarian", "pure veg"] },
    { key: "nonveg", label: "🍗 Non-veg", kw: ["non-veg", "nonveg", "chicken", "mutton", "egg", "biryani"] },
    { key: "meals", label: "🍛 Meals", kw: ["meal", "thali", "tiffin", "lunch"] },
    { key: "starter", label: "🍢 Starters", kw: ["starter", "snack", "appetizer"] },
    { key: "snacks", label: "🍟 Snacks", kw: ["snack", "chaat", "fries", "roll"] },
  ],
  grocery: [
    { key: "biscuit", label: "🍪 Biscuits", kw: ["biscuit", "cookie"] },
    { key: "chocolate", label: "🍫 Chocolate", kw: ["chocolate", "candy", "sweet"] },
    { key: "cereal", label: "🥣 Cereal", kw: ["cereal", "oats", "corn flakes", "muesli"] },
    { key: "beverage", label: "🧃 Beverages", kw: ["beverage", "drink", "juice", "soda"] },
    { key: "staples", label: "🌾 Staples", kw: ["rice", "atta", "flour", "dal", "pulses", "staple"] },
  ],
  department: [
    { key: "household", label: "🧺 Household", kw: ["household", "home", "cleaning"] },
    { key: "kitchen", label: "🍳 Kitchen", kw: ["kitchen", "utensil", "cookware"] },
    { key: "toys", label: "🧸 Toys & puzzles", kw: ["toy", "puzzle", "game"] },
    { key: "stationery", label: "✏️ Stationery", kw: ["stationery", "pen", "book", "notebook"] },
  ],
  medical: [
    { key: "prescription", label: "💊 Prescription", kw: ["prescription", "medicine", "chemist", "pharmacy"] },
    { key: "wellness", label: "🩹 Wellness", kw: ["wellness", "vitamin", "supplement", "health"] },
    { key: "baby", label: "🍼 Baby care", kw: ["baby", "diaper", "infant"] },
  ],
  stationery: [
    { key: "school", label: "🎒 School", kw: ["school", "student"] },
    { key: "office", label: "🖇️ Office", kw: ["office", "work"] },
    { key: "art", label: "🎨 Art", kw: ["art", "craft", "colour", "color", "paint"] },
    { key: "books", label: "📚 Books", kw: ["book", "notebook"] },
  ],
  juice: [
    { key: "fresh", label: "🧃 Fresh juice", kw: ["juice", "fresh"] },
    { key: "smoothie", label: "🥤 Smoothies", kw: ["smoothie", "shake"] },
    { key: "milkshake", label: "🥛 Milkshakes", kw: ["milkshake", "shake", "milk"] },
  ],
};

const shopText = (s) => `${s.name || ""} ${s.description || ""}`.toLowerCase();

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
  // Sub-category chip within the chosen category ("all" = no sub-filter).
  const [sub, setSub] = useState("all");
  // Quick toggles: only open shops, only free-delivery shops, only pure-veg shops.
  const [openNow, setOpenNow] = useState(false);
  const [freeDelivery, setFreeDelivery] = useState(false);
  const [pureVeg, setPureVeg] = useState(false);

  // Hero ad banners link to /?cat=food etc. Apply that category when present so
  // clicking a banner CTA filters the shop list.
  const [searchParams] = useSearchParams();
  useEffect(() => {
    const cat = searchParams.get("cat");
    if (cat && CATEGORIES.some((c) => c.key === cat)) setCategory(cat);
  }, [searchParams]);

  // Reset the sub-category whenever the top-level category changes so a stale
  // chip (e.g. "Meals") doesn't linger after switching to Grocery.
  useEffect(() => {
    setSub("all");
  }, [category]);

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
  if (openNow) shopsView = shopsView.filter((s) => s.isOpen);
  if (freeDelivery) shopsView = shopsView.filter((s) => s.freeDelivery);
  if (pureVeg) shopsView = shopsView.filter((s) => s.isPureVeg);
  // Sub-category keyword match (best-effort on name + description).
  const subOpts = SUBCATS[category] || null;
  if (sub !== "all" && subOpts) {
    const opt = subOpts.find((o) => o.key === sub);
    if (opt) {
      shopsView = shopsView.filter((s) => {
        const t = shopText(s);
        return opt.kw.some((k) => t.includes(k));
      });
    }
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
        <div className="container hero-inner">
          <div className="hero-copy">
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
          <AdCarousel />
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

            {subOpts && (
              <div className="filter-group">
                <span className="filter-label">{catLabel(category)} type</span>
                <div className="filter-opts">
                  <button
                    className={`filter-chip ${sub === "all" ? "active" : ""}`}
                    onClick={() => setSub("all")}
                  >
                    All
                  </button>
                  {subOpts.map((o) => (
                    <button
                      key={o.key}
                      className={`filter-chip ${sub === o.key ? "active" : ""}`}
                      onClick={() => setSub(o.key)}
                    >
                      {o.label}
                    </button>
                  ))}
                </div>
              </div>
            )}

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
              <span className="filter-label">Quick filters</span>
              <div className="filter-opts">
                <button
                  className={`filter-chip ${openNow ? "active" : ""}`}
                  onClick={() => setOpenNow((v) => !v)}
                >
                  🟢 Open now
                </button>
                <button
                  className={`filter-chip ${freeDelivery ? "active" : ""}`}
                  onClick={() => setFreeDelivery((v) => !v)}
                >
                  🚴 Free delivery
                </button>
                <button
                  className={`filter-chip ${pureVeg ? "active" : ""}`}
                  onClick={() => setPureVeg((v) => !v)}
                >
                  🥗 Pure veg
                </button>
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
                    setSub("all");
                    setOpenNow(false);
                    setFreeDelivery(false);
                    setPureVeg(false);
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
                      <div className="row gap" style={{ flexWrap: "wrap" }}>
                        <span className="badge badge-cat">{catLabel(s.category)}</span>
                        {s.freeDelivery && <span className="badge badge-green">🚴 Free delivery</span>}
                        {s.isPureVeg && <span className="badge badge-green">🥗 Pure veg</span>}
                        {!s.isOpen && <span className="badge badge-red">Closed</span>}
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
