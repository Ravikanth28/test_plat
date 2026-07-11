import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { api } from "../api.js";
import { useAuth } from "../context/AuthContext.jsx";

// Heart toggle to save/unsave a shop. Works for logged-in customers;
// prompts login otherwise. `variant="icon"` renders a floating circle
// (for cards), `variant="button"` renders a labelled pill (for headers).
export default function FavoriteButton({ shopId, variant = "icon", className = "" }) {
  const { user, refreshUser } = useAuth();
  const navigate = useNavigate();
  const [busy, setBusy] = useState(false);

  const favorites = user?.favorites || [];
  const active = favorites.includes(shopId);

  const toggle = async (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (!user) {
      navigate("/login");
      return;
    }
    if (busy) return;
    setBusy(true);
    try {
      await api.post(`/favorites/${shopId}`);
      await refreshUser();
    } catch {
      /* ignore */
    } finally {
      setBusy(false);
    }
  };

  if (variant === "button") {
    return (
      <button
        type="button"
        onClick={toggle}
        disabled={busy}
        className={`btn btn-sm ${active ? "btn" : "btn-outline"} ${className}`}
        aria-pressed={active}
        title={active ? "Remove from favourites" : "Add to favourites"}
      >
        {active ? "♥ Saved" : "♡ Save"}
      </button>
    );
  }

  return (
    <button
      type="button"
      onClick={toggle}
      disabled={busy}
      className={`fav-heart ${active ? "active" : ""} ${className}`}
      aria-pressed={active}
      aria-label={active ? "Remove from favourites" : "Add to favourites"}
      title={active ? "Remove from favourites" : "Add to favourites"}
    >
      {active ? "♥" : "♡"}
    </button>
  );
}
