import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { api } from "../api.js";
import { useAuth } from "../context/AuthContext.jsx";

function Stars({ value = 0, size = 16, onSelect }) {
  const stars = [1, 2, 3, 4, 5];
  return (
    <span className="stars" style={{ fontSize: size }}>
      {stars.map((n) => (
        <span
          key={n}
          className={`star ${n <= Math.round(value) ? "on" : ""} ${
            onSelect ? "pick" : ""
          }`}
          onClick={onSelect ? () => onSelect(n) : undefined}
          role={onSelect ? "button" : undefined}
          aria-label={onSelect ? `${n} star${n > 1 ? "s" : ""}` : undefined}
        >
          ★
        </span>
      ))}
    </span>
  );
}

function timeAgo(d) {
  const diff = (Date.now() - new Date(d).getTime()) / 1000;
  if (diff < 60) return "just now";
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return `${Math.floor(diff / 86400)}d ago`;
}

// Reviews list + write/edit form for a shop.
// Calls onRatingChange({ rating, numReviews }) after a successful submit.
export default function Reviews({ shopId, onRatingChange }) {
  const { user } = useAuth();
  const [reviews, setReviews] = useState([]);
  const [loading, setLoading] = useState(true);
  const [rating, setRating] = useState(0);
  const [comment, setComment] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [ok, setOk] = useState("");

  useEffect(() => {
    setLoading(true);
    api
      .get(`/shops/${shopId}/reviews`, { auth: false })
      .then((r) => setReviews(r || []))
      .catch(() => setReviews([]))
      .finally(() => setLoading(false));
  }, [shopId]);

  const canReview = user && (user.role === "customer" || user.role === "admin");
  const mine = user ? reviews.find((r) => r.customer === user._id) : null;

  // Prefill the form when editing an existing review.
  useEffect(() => {
    if (mine) {
      setRating(mine.rating);
      setComment(mine.comment || "");
    }
  }, [mine?._id]); // eslint-disable-line react-hooks/exhaustive-deps

  const submit = async (e) => {
    e.preventDefault();
    setError("");
    setOk("");
    if (!rating) {
      setError("Please pick a star rating.");
      return;
    }
    setBusy(true);
    try {
      const res = await api.post(`/shops/${shopId}/reviews`, { rating, comment });
      setReviews(res.reviews || []);
      setOk(mine ? "Review updated. Thanks!" : "Thanks for your review!");
      onRatingChange?.({ rating: res.rating, numReviews: res.numReviews });
    } catch (err) {
      setError(err.message || "Could not submit review.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="card mt">
      <h2 className="section-title" style={{ marginTop: 0 }}>
        Ratings & reviews
        {reviews.length > 0 && (
          <span className="muted small" style={{ fontWeight: 500, marginLeft: 8 }}>
            ({reviews.length})
          </span>
        )}
      </h2>

      {canReview ? (
        <form className="review-form" onSubmit={submit}>
          <div className="row gap wrap" style={{ alignItems: "center" }}>
            <span className="muted small">Your rating:</span>
            <Stars value={rating} size={24} onSelect={setRating} />
          </div>
          <textarea
            className="review-input"
            placeholder="Share details about your experience (optional)…"
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            rows={3}
          />
          {error && <p className="form-error small">{error}</p>}
          {ok && <p className="small" style={{ color: "var(--green)" }}>{ok}</p>}
          <div>
            <button className="btn btn-sm" type="submit" disabled={busy}>
              {busy ? "Saving…" : mine ? "Update review" : "Submit review"}
            </button>
          </div>
        </form>
      ) : (
        <p className="muted small">
          <Link to="/login">Log in</Link> as a customer to leave a review for a shop
          you've ordered from.
        </p>
      )}

      <div className="review-list">
        {loading ? (
          <p className="muted small">Loading reviews…</p>
        ) : reviews.length === 0 ? (
          <p className="muted small">No reviews yet. Be the first to review!</p>
        ) : (
          reviews.map((r) => (
            <div className="review-card" key={r._id}>
              <div className="row between gap">
                <strong>{r.name || "Customer"}</strong>
                <span className="muted small">{timeAgo(r.createdAt)}</span>
              </div>
              <Stars value={r.rating} size={14} />
              {r.comment && <p className="small" style={{ margin: "6px 0 0" }}>{r.comment}</p>}
            </div>
          ))
        )}
      </div>
    </div>
  );
}
