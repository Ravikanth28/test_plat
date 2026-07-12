import { useEffect, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { api } from "../api.js";
import { useLang } from "../context/LanguageContext.jsx";
import {
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

export default function SearchResults() {
  const [params] = useSearchParams();
  const { t, tc } = useLang();
  const q = (params.get("q") || "").trim();
  const [shops, setShops] = useState([]);
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!q) {
      setShops([]);
      setProducts([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    Promise.all([
      api.get(`/shops?q=${encodeURIComponent(q)}`, { auth: false }).catch(() => []),
      api
        .get(`/products?search=${encodeURIComponent(q)}`, { auth: false })
        .catch(() => []),
    ])
      .then(([s, p]) => {
        setShops(s || []);
        setProducts(p || []);
      })
      .finally(() => setLoading(false));
  }, [q]);

  const total = shops.length + products.length;

  return (
    <div className="container mt">
      <h1 className="section-title" style={{ marginTop: 0 }}>
        {q ? <>{t("search.resultsFor")} “{q}”</> : t("search.title")}
      </h1>

      {!q ? (
        <p className="muted">{t("search.prompt")}</p>
      ) : loading ? (
        <div className="loading">{t("search.searching")}</div>
      ) : total === 0 ? (
        <div className="empty">
          <div className="big">🔍</div>
          <p>{t("search.noMatch")}</p>
          <Link to="/" className="btn btn-outline btn-sm">
            {t("search.backHome")}
          </Link>
        </div>
      ) : (
        <>
          {products.length > 0 && (
            <>
              <h2 className="section-title">{t("search.items")} ({products.length})</h2>
              <div className="grid grid-4">
                {products.map((p) => (
                  <Link
                    to={`/shop/${p.shop._id}`}
                    key={p._id}
                    className="card result-card"
                  >
                    <Thumb
                      className="result-thumb"
                      image={p.image}
                      fallback={catIcon(p.shop.category)}
                      style={{ background: tileGradient(p.name) }}
                    />
                    <div className="badge badge-cat">
                      {catIcon(p.shop.category)} {tc(p.shop.name)}
                    </div>
                    <h4 style={{ margin: "10px 0 4px" }}>{tc(p.name)}</h4>
                    <div className="price">{rupee(p.price)}</div>
                    <div className="muted small">{t("search.tapToView")}</div>
                  </Link>
                ))}
              </div>
            </>
          )}

          {shops.length > 0 && (
            <>
              <h2 className="section-title">{t("search.shops")} ({shops.length})</h2>
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
                        <h3>{tc(s.name)}</h3>
                        <span className="rating-pill">★ {s.rating}</span>
                      </div>
                      <div>
                        <span className="badge badge-cat">{tc(catLabel(s.category))}</span>
                      </div>
                      <p className="muted small" style={{ margin: "2px 0 0" }}>
                        {tc(s.description)}
                      </p>
                      <p className="muted small" style={{ margin: 0 }}>
                        📍 {tc(s.address)}
                      </p>
                    </div>
                  </Link>
                ))}
              </div>
            </>
          )}
        </>
      )}
    </div>
  );
}
