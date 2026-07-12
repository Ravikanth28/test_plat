import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { api } from "../api.js";
import { isImageUrl } from "../utils.js";

// Auto-rotating advertisement carousel shown in the home hero. Banners are
// managed by admin (GET /api/banners returns the active ones, ordered).
// Renders nothing until at least one banner loads, so the hero stays clean.
export default function AdCarousel() {
  const [banners, setBanners] = useState([]);
  const [idx, setIdx] = useState(0);
  const timer = useRef(null);

  useEffect(() => {
    api
      .get("/banners", { auth: false })
      .then((b) => setBanners(Array.isArray(b) ? b : []))
      .catch(() => setBanners([]));
  }, []);

  // Auto-advance every 4s. Reset the interval whenever the slide or count
  // changes so manual navigation restarts the countdown.
  useEffect(() => {
    if (banners.length <= 1) return undefined;
    timer.current = setInterval(() => {
      setIdx((i) => (i + 1) % banners.length);
    }, 4000);
    return () => clearInterval(timer.current);
  }, [banners.length, idx]);

  if (banners.length === 0) return null;

  const active = banners[idx];

  return (
    <div className="ad-carousel">
      <div className="ad-track">
        {banners.map((b, i) => (
          <Link
            key={b._id}
            to={b.link || "/"}
            className={`ad-slide ${i === idx ? "active" : ""}`}
            aria-hidden={i === idx ? "false" : "true"}
          >
            <div className="ad-art" aria-hidden="true">
              {isImageUrl(b.image) ? (
                <img src={b.image} alt="" loading="lazy" />
              ) : (
                <span>{b.image || "🛍️"}</span>
              )}
            </div>
            <div className="ad-copy">
              <h3>{b.title}</h3>
              {b.subtitle && <p>{b.subtitle}</p>}
              {b.cta && <span className="ad-cta">{b.cta} →</span>}
            </div>
          </Link>
        ))}
      </div>

      {banners.length > 1 && (
        <div className="ad-dots">
          {banners.map((b, i) => (
            <button
              key={b._id}
              type="button"
              className={`ad-dot ${i === idx ? "active" : ""}`}
              aria-label={`Show ad ${i + 1}`}
              onClick={() => setIdx(i)}
            />
          ))}
        </div>
      )}
    </div>
  );
}
