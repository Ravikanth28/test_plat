import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { api } from "../api.js";
import { useCart } from "../context/CartContext.jsx";
import { useLang } from "../context/LanguageContext.jsx";
import FavoriteButton from "../components/FavoriteButton.jsx";
import Reviews from "../components/Reviews.jsx";
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
  const [ratingInfo, setRatingInfo] = useState(null);
  // Menu filters: veg preference (all/veg/nonveg) + price sort.
  const [vegPref, setVegPref] = useState("all");
  const [priceSort, setPriceSort] = useState("default");
  const { items, addItem, decItem, count } = useCart();
  const { t, tc } = useLang();

  useEffect(() => {
    setLoading(true);
    api
      .get(`/shops/${id}`, { auth: false })
      .then((d) => {
        setData(d);
        setRatingInfo({ rating: d.shop.rating, numReviews: d.shop.numReviews || 0 });
      })
      .finally(() => setLoading(false));
  }, [id]);

  if (loading) return <div className="loading">{t("shop.loading")}</div>;
  if (!data) return <div className="container mt">{t("shop.notFound")}</div>;

  const { shop, products } = data;
  const shownRating = ratingInfo?.rating ?? shop.rating;
  const shownReviews = ratingInfo?.numReviews ?? shop.numReviews ?? 0;
  const qtyOf = (pid) => items.find((i) => i.product === pid)?.qty || 0;
  let filtered = products.filter((p) =>
    p.name.toLowerCase().includes(search.toLowerCase())
  );
  if (vegPref === "veg") filtered = filtered.filter((p) => p.isVeg);
  else if (vegPref === "nonveg") filtered = filtered.filter((p) => !p.isVeg);
  if (priceSort === "low") filtered = [...filtered].sort((a, b) => a.price - b.price);
  else if (priceSort === "high") filtered = [...filtered].sort((a, b) => b.price - a.price);

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
            <div className="row gap wrap" style={{ gap: 8, alignItems: "center" }}>
              <h1 style={{ margin: 0, fontSize: 26, letterSpacing: "-0.5px" }}>
                {tc(shop.name)}
              </h1>
              <span className="rating-pill">
                ★ {shownRating}
                {shownReviews > 0 && (
                  <span className="muted" style={{ fontWeight: 500 }}>
                    {" "}
                    ({shownReviews})
                  </span>
                )}
              </span>
              <FavoriteButton shopId={shop._id} variant="button" />
            </div>
            <div className="row gap wrap" style={{ gap: 8, marginTop: 8 }}>
              <span className="badge badge-cat">{tc(catLabel(shop.category))}</span>
              <span className="badge badge-gray">🕒 {deliveryTime(shop._id)} min</span>
              {shop.isOpen ? (
                <span className="badge badge-green">{t("shop.openNow")}</span>
              ) : (
                <span className="badge badge-red">{t("home.closed")}</span>
              )}
            </div>
            <p className="muted small" style={{ margin: "8px 0 0" }}>
              {tc(shop.description)}
            </p>
            <p className="muted small" style={{ margin: "2px 0 0" }}>
              📍 {shop.address} &nbsp;•&nbsp; ☎ {shop.phone}
            </p>
          </div>
        </div>
      </div>

      <div className="row between mb wrap gap">
        <h2 className="section-title" style={{ margin: 0 }}>
          {t("shop.menu")} · {products.length} {t("shop.items")}
        </h2>
        <input
          className="search-item"
          placeholder={t("shop.searchInShop")}
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

      <div className="row gap wrap mb" style={{ alignItems: "center" }}>
        {[
          { key: "all", label: t("common.all") },
          { key: "veg", label: t("shop.veg") },
          { key: "nonveg", label: t("shop.nonVeg") },
        ].map((o) => (
          <button
            key={o.key}
            className={`filter-chip ${vegPref === o.key ? "active" : ""}`}
            onClick={() => setVegPref(o.key)}
          >
            {o.label}
          </button>
        ))}
        <span style={{ flex: 1 }} />
        {[
          { key: "default", label: t("shop.sort") },
          { key: "low", label: t("shop.priceLowHigh") },
          { key: "high", label: t("shop.priceHighLow") },
        ].map((o) => (
          <button
            key={o.key}
            className={`filter-chip ${priceSort === o.key ? "active" : ""}`}
            onClick={() => setPriceSort(o.key)}
          >
            {o.label}
          </button>
        ))}
      </div>

      <div className="card">
        {filtered.length === 0 ? (
          <p className="muted">{t("shop.noItems")}</p>
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
                  <div className="nm">
                    <span
                      className={`veg-dot ${p.isVeg ? "veg" : "nonveg"}`}
                      title={p.isVeg ? t("common.veg") : t("common.nonVeg")}
                    />
                    {tc(p.name)}
                  </div>
                  <div className="muted small">
                    {tc(p.description || p.category)} • {t("shop.per")} {p.unit}
                  </div>
                  <div className="price" style={{ marginTop: 4 }}>
                    {rupee(p.price)}
                  </div>
                </div>
              </div>
              <div>
                {!p.inStock ? (
                  <span className="badge badge-red">{t("common.outOfStock")}</span>
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
                    {t("shop.addPlus")}
                  </button>
                )}
              </div>
            </div>
          ))
        )}
      </div>

      <Reviews shopId={shop._id} onRatingChange={setRatingInfo} />

      {count > 0 && (
        <div
          className="card mt row between"
          style={{ position: "sticky", bottom: 12, boxShadow: "var(--shadow-lg)" }}
        >
          <span style={{ fontWeight: 700 }}>{count} {t("shop.itemsInCart")}</span>
          <Link to="/cart" className="btn">
            {t("shop.viewCart")}
          </Link>
        </div>
      )}
    </div>
  );
}
