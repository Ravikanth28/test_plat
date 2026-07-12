import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { api } from "../api.js";
import { useAuth } from "../context/AuthContext.jsx";
import { useLang } from "../context/LanguageContext.jsx";
import FavoriteButton from "../components/FavoriteButton.jsx";
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

export default function Favorites() {
  const { user } = useAuth();
  const { t, tc } = useLang();
  const [shops, setShops] = useState([]);
  const [loading, setLoading] = useState(true);

  const load = () => {
    setLoading(true);
    api
      .get("/favorites")
      .then(setShops)
      .catch(() => setShops([]))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // When the user's favourites change (via a heart toggle) refetch.
  const favKey = (user?.favorites || []).join(",");
  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [favKey]);

  return (
    <div className="container mt">
      <h1 className="section-title" style={{ marginTop: 0 }}>
        ♥ {t("fav.title")}
      </h1>

      {loading ? (
        <div className="loading">{t("fav.loading")}</div>
      ) : shops.length === 0 ? (
        <div className="empty">
          <div className="big">💔</div>
          <p>{t("fav.empty")}</p>
          <Link to="/" className="btn btn-sm">
            {t("fav.browse")}
          </Link>
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
                <FavoriteButton shopId={s._id} />
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
      )}
    </div>
  );
}
