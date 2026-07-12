import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext.jsx";
import { useNotifications, TONES } from "../context/NotificationContext.jsx";
import { api } from "../api.js";
import ThemeToggle from "../components/ThemeToggle.jsx";
import LanguageToggle from "../components/LanguageToggle.jsx";
import { useLang } from "../context/LanguageContext.jsx";

// Human labels + icons for the per-type notification toggles.
const TYPE_LABELS = {
  order_new: "New orders",
  order_placed: "Order placed",
  order_status: "Order status",
  order_cancelled: "Order cancelled",
  payment: "Payments",
  shop_new: "New shops",
  shop_approved: "Shop approved",
  signup: "Welcome",
  generic: "General",
};
const ICON = {
  order_new: "🛍️",
  order_placed: "✅",
  order_status: "🚚",
  order_cancelled: "❌",
  payment: "💳",
  shop_new: "🏪",
  shop_approved: "🎉",
  signup: "👋",
  generic: "🔔",
};

const minutesToHHMM = (m) => {
  const h = Math.floor((m || 0) / 60);
  const mm = (m || 0) % 60;
  return `${String(h).padStart(2, "0")}:${String(mm).padStart(2, "0")}`;
};
const hhmmToMinutes = (s) => {
  const [h, m] = String(s).split(":").map(Number);
  return (h || 0) * 60 + (m || 0);
};

export default function SettingsPage() {
  const { user, logout, refreshUser } = useAuth();
  const { t, tc } = useLang();
  const navigate = useNavigate();
  const {
    soundOn,
    toggleSound,
    tone,
    setTone,
    volume,
    setVolume,
    previewSound,
    voiceOn,
    toggleVoice,
    prefs,
    updatePrefs,
    enablePush,
  } = useNotifications();

  // --- Profile edit form ----------------------------------------------------
  const [name, setName] = useState(user?.name || "");
  const [phone, setPhone] = useState(user?.phone || "");
  const [address, setAddress] = useState(user?.address || "");
  const [saving, setSaving] = useState(false);
  const [savedMsg, setSavedMsg] = useState("");
  const [error, setError] = useState("");

  const dirty =
    name.trim() !== (user?.name || "") ||
    phone !== (user?.phone || "") ||
    address !== (user?.address || "");

  const saveProfile = async (e) => {
    e.preventDefault();
    if (!name.trim()) {
      setError("Name can't be empty.");
      return;
    }
    setSaving(true);
    setError("");
    setSavedMsg("");
    try {
      await api.put("/auth/me", { name: name.trim(), phone, address });
      await refreshUser();
      setSavedMsg("Profile updated.");
    } catch (err) {
      setError(err.message || "Couldn't save changes.");
    } finally {
      setSaving(false);
    }
  };

  const handleLogout = () => {
    logout();
    navigate("/");
  };

  // --- Address book ---------------------------------------------------------
  const addresses = user?.addresses || [];
  const [addrLabel, setAddrLabel] = useState("");
  const [addrLine, setAddrLine] = useState("");
  const [addrGeo, setAddrGeo] = useState(null); // { lat, lng }
  const [addrBusy, setAddrBusy] = useState(false);
  const [addrMsg, setAddrMsg] = useState("");
  const [editId, setEditId] = useState(null); // null = add mode
  const [locating, setLocating] = useState(false);

  const resetAddrForm = () => {
    setEditId(null);
    setAddrLabel("");
    setAddrLine("");
    setAddrGeo(null);
    setAddrMsg("");
  };

  const startEdit = (a) => {
    setEditId(a._id);
    setAddrLabel(a.label || "");
    setAddrLine(a.line || "");
    setAddrGeo(a.geo?.lat != null ? { lat: a.geo.lat, lng: a.geo.lng } : null);
    setAddrMsg("");
  };

  const pinLocation = () => {
    if (!("geolocation" in navigator)) {
      setAddrMsg("Location isn't supported on this device.");
      return;
    }
    setLocating(true);
    setAddrMsg("");
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const { latitude, longitude } = pos.coords;
        setAddrGeo({ lat: latitude, lng: longitude });
        setLocating(false);
        setAddrMsg("Location pinned ✓");
        if (!addrLine.trim()) {
          try {
            const r = await fetch(
              `https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}`
            );
            const j = await r.json();
            if (j?.display_name) setAddrLine(j.display_name);
          } catch {
            /* reverse geocode is optional */
          }
        }
      },
      () => {
        setLocating(false);
        setAddrMsg("Couldn't get your location — type the address instead.");
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
    );
  };

  const submitAddress = async (e) => {
    e.preventDefault();
    if (!addrLine.trim()) {
      setAddrMsg("Address line is required.");
      return;
    }
    setAddrBusy(true);
    setAddrMsg("");
    const body = {
      label: addrLabel.trim(),
      line: addrLine.trim(),
      geo: addrGeo ? { lat: addrGeo.lat, lng: addrGeo.lng } : undefined,
    };
    try {
      if (editId) await api.put(`/auth/me/addresses/${editId}`, body);
      else await api.post("/auth/me/addresses", body);
      await refreshUser();
      resetAddrForm();
    } catch (err) {
      setAddrMsg(err.message || "Couldn't save the address.");
    } finally {
      setAddrBusy(false);
    }
  };

  const deleteAddress = async (id) => {
    setAddrBusy(true);
    try {
      await api.del(`/auth/me/addresses/${id}`);
      await refreshUser();
      if (editId === id) resetAddrForm();
    } catch (err) {
      setAddrMsg(err.message || "Couldn't delete the address.");
    } finally {
      setAddrBusy(false);
    }
  };

  // --- Notification prefs ---------------------------------------------------
  const p = prefs || {};
  const mutedTypes = p.mutedTypes || [];
  const quiet = p.quietHours || { enabled: false, start: 1320, end: 420 };
  const toggleType = (type) => {
    const next = mutedTypes.includes(type)
      ? mutedTypes.filter((t) => t !== type)
      : [...mutedTypes, type];
    updatePrefs({ mutedTypes: next });
  };

  return (
    <div className="container mt settings-page">
      <div className="page-head">
        <h1>{t("settings.title")}</h1>
        <p className="muted">{t("settings.subtitle")}</p>
      </div>

      {/* Profile */}
      <section className="card settings-card">
        <div className="settings-card-head">
          <div className="settings-avatar">
            {(user?.name || "?").charAt(0).toUpperCase()}
          </div>
          <div>
            <h2>{t("settings.profile")}</h2>
            <span className="muted small">
              {user?.email}
              {user?.role && <span className="role-pill">{user.role}</span>}
            </span>
          </div>
        </div>

        <form className="settings-form" onSubmit={saveProfile}>
          <label className="field">
            <span>{t("settings.fullName")}</span>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder={t("settings.yourName")}
            />
          </label>
          <label className="field">
            <span>{t("settings.email")}</span>
            <input value={user?.email || ""} disabled />
          </label>
          <label className="field">
            <span>{t("settings.phone")}</span>
            <input
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder={t("settings.optional")}
            />
          </label>
          <label className="field">
            <span>{t("settings.address")}</span>
            <textarea
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              placeholder={t("settings.deliveryAddress")}
              rows={2}
            />
          </label>

          {error && <div className="settings-msg err">{error}</div>}
          {savedMsg && <div className="settings-msg ok">{savedMsg}</div>}

          <div className="settings-actions">
            <button className="btn" type="submit" disabled={saving || !dirty}>
              {saving ? t("settings.saving") : t("settings.saveChanges")}
            </button>
          </div>
        </form>
      </section>

      {/* Address book */}
      <section className="card settings-card">
        <h2>{t("settings.addrBook")}</h2>
        <p className="muted small" style={{ marginTop: -6 }}>
          {t("settings.addrBookHint")}
        </p>

        {addresses.length > 0 && (
          <div className="addr-book" style={{ marginBottom: 14 }}>
            {addresses.map((a) => (
              <div
                key={a._id}
                className={`addr-card ${editId === a._id ? "active" : ""}`}
                style={{ cursor: "default" }}
              >
                <span className="addr-card-label">
                  {a.label ? tc(a.label) : t("settings.addressFallback")}
                  {a.geo?.lat != null && (
                    <span className="addr-pin" title="Pinned location">
                      📍
                    </span>
                  )}
                </span>
                <span className="addr-card-line">{tc(a.line)}</span>
                <div className="row gap" style={{ marginTop: 8 }}>
                  <button
                    type="button"
                    className="btn btn-ghost btn-sm"
                    onClick={() => startEdit(a)}
                    disabled={addrBusy}
                  >
                    {t("settings.edit")}
                  </button>
                  <button
                    type="button"
                    className="btn btn-ghost btn-sm"
                    onClick={() => deleteAddress(a._id)}
                    disabled={addrBusy}
                  >
                    {t("settings.delete")}
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        <form className="settings-form" onSubmit={submitAddress}>
          <label className="field">
            <span>{t("settings.label")}</span>
            <input
              value={addrLabel}
              onChange={(e) => setAddrLabel(e.target.value)}
              placeholder={t("settings.labelPlaceholder")}
            />
          </label>
          <label className="field">
            <span>{t("settings.address")}</span>
            <textarea
              value={addrLine}
              onChange={(e) => setAddrLine(e.target.value)}
              placeholder={t("settings.addrPlaceholder")}
              rows={2}
            />
          </label>
          <div className="row gap wrap" style={{ alignItems: "center" }}>
            <button
              type="button"
              className="btn btn-ghost btn-sm"
              onClick={pinLocation}
              disabled={locating}
            >
              {locating ? t("settings.locating") : addrGeo ? t("settings.locationPinned") : t("settings.pinLocation")}
            </button>
            {addrGeo && (
              <button
                type="button"
                className="btn btn-ghost btn-sm"
                onClick={() => setAddrGeo(null)}
              >
                {t("settings.clearPin")}
              </button>
            )}
          </div>

          {addrMsg && (
            <div
              className={`settings-msg ${addrMsg.includes("✓") ? "ok" : "err"}`}
            >
              {addrMsg}
            </div>
          )}

          <div className="settings-actions">
            <button className="btn" type="submit" disabled={addrBusy || !addrLine.trim()}>
              {addrBusy ? t("settings.saving") : editId ? t("settings.updateAddress") : t("settings.addAddress")}
            </button>
            {editId && (
              <button
                type="button"
                className="btn btn-ghost"
                onClick={resetAddrForm}
                disabled={addrBusy}
              >
                {t("settings.cancel")}
              </button>
            )}
          </div>
        </form>
      </section>

      {/* Notifications — Alerts */}
      <section className="card settings-card">
        <h2>{t("settings.notifAlerts")}</h2>
        <label className="notif-row">
          <span>
            <strong>{t("settings.muteAll")}</strong>
            <span className="muted small">{t("settings.muteAllHint")}</span>
          </span>
          <input
            type="checkbox"
            checked={!!p.muteAll}
            onChange={(e) => updatePrefs({ muteAll: e.target.checked })}
          />
        </label>

        <div className="notif-row notif-col">
          <strong>{t("settings.alertMe")}</strong>
          <div className="notif-types">
            {Object.keys(TYPE_LABELS).map((type) => (
              <label
                key={type}
                className={`notif-chip ${mutedTypes.includes(type) ? "off" : "on"}`}
              >
                <input
                  type="checkbox"
                  checked={!mutedTypes.includes(type)}
                  onChange={() => toggleType(type)}
                  disabled={!!p.muteAll}
                />
                <span>
                  {ICON[type]} {t("notifType." + type)}
                </span>
              </label>
            ))}
          </div>
        </div>

        <label className="notif-row">
          <span>
            <strong>{t("settings.quietHours")}</strong>
            <span className="muted small">{t("settings.quietHint")}</span>
          </span>
          <input
            type="checkbox"
            checked={!!quiet.enabled}
            onChange={(e) =>
              updatePrefs({ quietHours: { ...quiet, enabled: e.target.checked } })
            }
          />
        </label>
        {quiet.enabled && (
          <div className="notif-row notif-quiet">
            <label>
              {t("settings.from")}
              <input
                type="time"
                value={minutesToHHMM(quiet.start)}
                onChange={(e) =>
                  updatePrefs({
                    quietHours: { ...quiet, start: hhmmToMinutes(e.target.value) },
                  })
                }
              />
            </label>
            <label>
              {t("settings.to")}
              <input
                type="time"
                value={minutesToHHMM(quiet.end)}
                onChange={(e) =>
                  updatePrefs({
                    quietHours: { ...quiet, end: hhmmToMinutes(e.target.value) },
                  })
                }
              />
            </label>
          </div>
        )}
      </section>

      {/* Notifications — Sound */}
      <section className="card settings-card">
        <h2>{t("settings.notifSound")}</h2>
        <label className="notif-row">
          <span>
            <strong>{t("settings.chime")}</strong>
          </span>
          <input type="checkbox" checked={soundOn} onChange={toggleSound} />
        </label>
        <div className="notif-row">
          <span><strong>{t("settings.tone")}</strong></span>
          <div className="notif-tone-opts">
            {Object.keys(TONES).map((key) => (
              <button
                key={key}
                type="button"
                className={`btn btn-sm ${tone === key ? "" : "btn-ghost"}`}
                onClick={() => setTone(key)}
                disabled={!soundOn}
              >
                {TONES[key].label}
              </button>
            ))}
          </div>
        </div>
        <div className="notif-row">
          <span><strong>{t("settings.volume")}</strong></span>
          <div className="notif-vol">
            <input
              type="range"
              min="0"
              max="1"
              step="0.05"
              value={volume}
              onChange={(e) => setVolume(e.target.value)}
              disabled={!soundOn}
            />
            <button
              type="button"
              className="btn btn-ghost btn-sm"
              onClick={previewSound}
              disabled={!soundOn}
            >
              {t("settings.test")}
            </button>
          </div>
        </div>
        <label className="notif-row">
          <span>
            <strong>{t("settings.speakAlerts")}</strong>
            <span className="muted small">
              {t("settings.speakHint")}
            </span>
          </span>
          <input type="checkbox" checked={voiceOn} onChange={toggleVoice} />
        </label>
        <div className="notif-row">
          <span>
            <strong>{t("settings.bgPush")}</strong>
            <span className="muted small">{t("settings.bgPushHint")}</span>
          </span>
          <button className="btn btn-sm" onClick={enablePush}>
            {t("settings.enablePush")}
          </button>
        </div>
      </section>

      {/* Language */}
      <section className="card settings-card">
        <h2>{t("settings.language")}</h2>
        <div className="notif-row">
          <span>
            <strong>{t("settings.language")}</strong>
            <span className="muted small">{t("settings.languageHint")}</span>
          </span>
          <LanguageToggle className="btn btn-ghost btn-sm" />
        </div>
      </section>

      {/* Appearance */}
      <section className="card settings-card">
        <h2>{t("settings.theme")}</h2>
        <div className="notif-row">
          <span>
            <strong>{t("settings.theme")}</strong>
            <span className="muted small">{t("settings.themeHint")}</span>
          </span>
          <ThemeToggle className="btn btn-ghost btn-sm" />
        </div>
      </section>

      {/* Account */}
      <section className="card settings-card">
        <h2>{t("settings.account")}</h2>
        <div className="notif-row">
          <span>
            <strong>{t("settings.signOut")}</strong>
            <span className="muted small">{t("settings.signOutHint")}</span>
          </span>
          <button className="btn btn-danger btn-sm" onClick={handleLogout}>
            {t("settings.logout")}
          </button>
        </div>
      </section>
    </div>
  );
}
