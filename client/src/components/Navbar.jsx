import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Link, useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "../context/AuthContext.jsx";
import { useCart } from "../context/CartContext.jsx";
import { useLang } from "../context/LanguageContext.jsx";
import { api } from "../api.js";
import { rupee, catIcon } from "../utils.js";
import InstallApp from "./InstallApp.jsx";
import DownloadApp from "./DownloadApp.jsx";
import ThemeToggle from "./ThemeToggle.jsx";
import LanguageToggle from "./LanguageToggle.jsx";
import NotificationBell from "./NotificationBell.jsx";

export default function Navbar() {
  const { user, logout } = useAuth();
  const { count } = useCart();
  const { t } = useLang();
  const navigate = useNavigate();
  const location = useLocation();
  const [drawer, setDrawer] = useState(false);
  const [menu, setMenu] = useState(false); // desktop avatar dropdown
  const [term, setTerm] = useState("");
  const [sug, setSug] = useState({ shops: [], products: [] });
  const [sugOpen, setSugOpen] = useState(false);
  const [sugLoading, setSugLoading] = useState(false);
  const menuRef = useRef(null);
  const searchRef = useRef(null);

  // Close the mobile drawer and avatar menu whenever the route changes.
  useEffect(() => {
    setDrawer(false);
    setMenu(false);
    setSugOpen(false);
  }, [location.pathname, location.search]);

  // Debounced autocomplete: fetch matching shops + products as the user types.
  // Both endpoints are public, so we skip the auth header.
  useEffect(() => {
    const q = term.trim();
    if (q.length < 2) {
      setSug({ shops: [], products: [] });
      setSugLoading(false);
      return undefined;
    }
    setSugLoading(true);
    const t = setTimeout(async () => {
      try {
        const [shops, products] = await Promise.all([
          api.get(`/shops?q=${encodeURIComponent(q)}`, { auth: false }),
          api.get(`/products?search=${encodeURIComponent(q)}`, { auth: false }),
        ]);
        setSug({
          shops: (Array.isArray(shops) ? shops : []).slice(0, 4),
          products: (Array.isArray(products) ? products : []).slice(0, 5),
        });
      } catch {
        setSug({ shops: [], products: [] });
      } finally {
        setSugLoading(false);
      }
    }, 220);
    return () => clearTimeout(t);
  }, [term]);

  // Close the suggestions dropdown on outside click.
  useEffect(() => {
    if (!sugOpen) return undefined;
    const onClick = (e) => {
      if (searchRef.current && !searchRef.current.contains(e.target)) {
        setSugOpen(false);
      }
    };
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, [sugOpen]);

  // Prevent background scroll while the drawer is open.
  useEffect(() => {
    document.body.style.overflow = drawer ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [drawer]);

  // Close the avatar dropdown on outside click / Escape.
  useEffect(() => {
    if (!menu) return;
    const onClick = (e) => {
      if (menuRef.current && !menuRef.current.contains(e.target)) setMenu(false);
    };
    const onKey = (e) => e.key === "Escape" && setMenu(false);
    document.addEventListener("mousedown", onClick);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onClick);
      document.removeEventListener("keydown", onKey);
    };
  }, [menu]);

  const handleLogout = () => {
    logout();
    setDrawer(false);
    setMenu(false);
    navigate("/");
  };

  const submitSearch = (e) => {
    e.preventDefault();
    const q = term.trim();
    if (!q) return;
    setSugOpen(false);
    navigate(`/search?q=${encodeURIComponent(q)}`);
  };

  // Jump straight to a suggestion and clear the search box.
  const goTo = (path) => {
    setSugOpen(false);
    setTerm("");
    navigate(path);
  };

  const hasSug = sug.shops.length > 0 || sug.products.length > 0;

  // Role-aware navigation links, shared by the avatar dropdown and the drawer.
  const roleLinks = (onClick) => (
    <>
      <Link to="/" onClick={onClick}>
        {t("nav.home")}
      </Link>
      {(!user || user.role === "customer") && (
        <Link to="/favorites" onClick={onClick}>
          {t("nav.favorites")}
        </Link>
      )}
      {user?.role === "customer" && (
        <Link to="/orders" onClick={onClick}>
          {t("nav.orders")}
        </Link>
      )}
      {user?.role === "shopkeeper" && (
        <Link to="/shop" onClick={onClick}>
          {t("nav.shop")}
        </Link>
      )}
      {user?.role === "admin" && (
        <Link to="/admin" onClick={onClick}>
          {t("nav.admin")}
        </Link>
      )}
    </>
  );

  return (
    <nav className="navbar">
      <div className="container navbar-inner">
        <Link to="/" className="logo">
          Local<span>Mart</span>
        </Link>

        {/* Center search (desktop) with live autocomplete */}
        <div className="nav-search-wrap" ref={searchRef}>
          <form className="nav-search" onSubmit={submitSearch}>
            <span className="nav-search-ic">🔍</span>
            <input
              value={term}
              onChange={(e) => {
                setTerm(e.target.value);
                setSugOpen(true);
              }}
              onFocus={() => setSugOpen(true)}
              placeholder={t("nav.search")}
              aria-label="Search"
            />
          </form>

          {sugOpen && term.trim().length >= 2 && (
            <div className="search-suggest">
              {sugLoading && !hasSug && (
                <div className="ss-empty muted small">{t("nav.searching")}</div>
              )}
              {!sugLoading && !hasSug && (
                <div className="ss-empty muted small">
                  {t("nav.noMatches")} — “{term.trim()}”
                </div>
              )}

              {sug.shops.length > 0 && (
                <div className="ss-group">
                  <div className="ss-head">{t("nav.shops")}</div>
                  {sug.shops.map((s) => (
                    <button
                      key={s._id}
                      type="button"
                      className="ss-item"
                      onClick={() => goTo(`/shop/${s._id}`)}
                    >
                      <span className="ss-ic">{catIcon(s.category)}</span>
                      <span className="ss-txt">
                        <span className="ss-name">{s.name}</span>
                        <span className="muted small">{s.category}</span>
                      </span>
                    </button>
                  ))}
                </div>
              )}

              {sug.products.length > 0 && (
                <div className="ss-group">
                  <div className="ss-head">{t("nav.products")}</div>
                  {sug.products.map((p) => (
                    <button
                      key={p._id}
                      type="button"
                      className="ss-item"
                      onClick={() => goTo(`/shop/${p.shop}`)}
                    >
                      <span className="ss-ic">🛍️</span>
                      <span className="ss-txt">
                        <span className="ss-name">{p.name}</span>
                        <span className="muted small">{rupee(p.price)}</span>
                      </span>
                    </button>
                  ))}
                </div>
              )}

              {hasSug && (
                <button
                  type="button"
                  className="ss-all"
                  onClick={() => goTo(`/search?q=${encodeURIComponent(term.trim())}`)}
                >
                  {t("nav.seeAll")} — “{term.trim()}” →
                </button>
              )}
            </div>
          )}
        </div>

        {/* Desktop right cluster — kept minimal: Cart, alerts, and a single
            avatar menu that holds everything else (links, settings, theme,
            app install, logout). Logged-out users just get theme + Login. */}
        <div className="nav-links nav-desktop">
          <DownloadApp className="btn btn-ghost btn-sm nav-getapp" />

          <Link to="/cart" className="nav-cart" title={t("nav.cart")}>
            🛒 <span>{t("nav.cart")}</span>
            {count > 0 && <span className="cart-badge">{count}</span>}
          </Link>

          {user && <NotificationBell />}

          {user ? (
            <div className="avatar-menu" ref={menuRef}>
              <button
                className="avatar-btn"
                aria-label={t("nav.account")}
                aria-expanded={menu}
                onClick={() => setMenu((m) => !m)}
              >
                {user.name.charAt(0).toUpperCase()}
              </button>

              {menu && (
                <div className="avatar-panel" role="menu">
                  <div className="avatar-panel-head">
                    <div className="avatar-lg">{user.name.charAt(0).toUpperCase()}</div>
                    <div className="avatar-id">
                      <div className="nm">{user.name}</div>
                      <div className="muted small">{user.email}</div>
                    </div>
                  </div>

                  <div className="avatar-links">
                    {roleLinks(() => setMenu(false))}
                    <Link to="/settings" onClick={() => setMenu(false)}>
                      ⚙️ {t("nav.settings")}
                    </Link>
                  </div>

                  <div className="avatar-panel-foot">
                    <LanguageToggle className="btn btn-ghost btn-sm btn-block" />
                    <ThemeToggle className="btn btn-ghost btn-sm btn-block" />
                    <InstallApp className="btn btn-ghost btn-sm btn-block" />
                    <button className="btn btn-danger btn-sm btn-block" onClick={handleLogout}>
                      {t("nav.logout")}
                    </button>
                  </div>
                </div>
              )}
            </div>
          ) : (
            <>
              <LanguageToggle className="btn btn-ghost btn-sm" />
              <ThemeToggle className="btn btn-ghost btn-sm" />
              <Link to="/login" className="btn btn-sm">
                {t("nav.login")}
              </Link>
            </>
          )}
        </div>

        {/* Mobile controls */}
        <div className="nav-mobile">
          {user && <NotificationBell />}
          <Link to="/cart" className="nav-cart" title="Cart">
            🛒
            {count > 0 && <span className="cart-badge">{count}</span>}
          </Link>
          <button
            className="hamburger"
            aria-label="Open menu"
            aria-expanded={drawer}
            onClick={() => setDrawer(true)}
          >
            <span />
            <span />
            <span />
          </button>
        </div>
      </div>

      {/* Mobile drawer — portaled to <body> so it escapes the navbar's
          backdrop-filter containing block and can cover the full viewport. */}
      {drawer &&
        createPortal(
          <div className="drawer-overlay" onClick={() => setDrawer(false)}>
          <aside className="drawer" onClick={(e) => e.stopPropagation()}>
            <div className="drawer-head">
              <span className="logo">
                Local<span>Mart</span>
              </span>
              <button
                className="drawer-close"
                aria-label="Close menu"
                onClick={() => setDrawer(false)}
              >
                ✕
              </button>
            </div>

            <form className="drawer-search" onSubmit={submitSearch}>
              <input
                value={term}
                onChange={(e) => setTerm(e.target.value)}
                placeholder={t("nav.search")}
                aria-label="Search"
              />
              <button className="btn btn-sm" type="submit">
                {t("nav.go")}
              </button>
            </form>

            {user && (
              <Link
                to="/settings"
                className="drawer-user"
                onClick={() => setDrawer(false)}
              >
                <div className="avatar">{user.name.charAt(0).toUpperCase()}</div>
                <div>
                  <div className="nm">{user.name}</div>
                  <div className="muted small">{user.email}</div>
                </div>
              </Link>
            )}

            <div className="drawer-links">
              {roleLinks(() => setDrawer(false))}
              {user && (
                <>
                  <Link to="/notifications" onClick={() => setDrawer(false)}>
                    {t("nav.notifications")}
                  </Link>
                  <Link to="/settings" onClick={() => setDrawer(false)}>
                    {t("nav.settings")}
                  </Link>
                </>
              )}
            </div>

            <div className="drawer-foot">
              <LanguageToggle className="btn btn-ghost" />
              <ThemeToggle className="btn btn-ghost" />
              <DownloadApp className="btn btn-ghost" />
              <InstallApp className="btn btn-ghost" />
              {user ? (
                <button className="btn btn-danger" onClick={handleLogout}>
                  {t("nav.logout")}
                </button>
              ) : (
                <>
                  <Link to="/login" className="btn" onClick={() => setDrawer(false)}>
                    {t("nav.login")}
                  </Link>
                  <Link
                    to="/register"
                    className="btn btn-outline"
                    onClick={() => setDrawer(false)}
                  >
                    {t("nav.register")}
                  </Link>
                </>
              )}
            </div>
          </aside>
        </div>,
          document.body
        )}
    </nav>
  );
}
