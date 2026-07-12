import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Link, useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "../context/AuthContext.jsx";
import { useCart } from "../context/CartContext.jsx";
import InstallApp from "./InstallApp.jsx";
import DownloadApp from "./DownloadApp.jsx";
import ThemeToggle from "./ThemeToggle.jsx";
import NotificationBell from "./NotificationBell.jsx";

export default function Navbar() {
  const { user, logout } = useAuth();
  const { count } = useCart();
  const navigate = useNavigate();
  const location = useLocation();
  const [drawer, setDrawer] = useState(false);
  const [menu, setMenu] = useState(false); // desktop avatar dropdown
  const [term, setTerm] = useState("");
  const menuRef = useRef(null);

  // Close the mobile drawer and avatar menu whenever the route changes.
  useEffect(() => {
    setDrawer(false);
    setMenu(false);
  }, [location.pathname, location.search]);

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
    navigate(`/search?q=${encodeURIComponent(q)}`);
  };

  // Role-aware navigation links, shared by the avatar dropdown and the drawer.
  const roleLinks = (onClick) => (
    <>
      <Link to="/" onClick={onClick}>
        Home
      </Link>
      {(!user || user.role === "customer") && (
        <Link to="/favorites" onClick={onClick}>
          Favorites
        </Link>
      )}
      {user?.role === "customer" && (
        <Link to="/orders" onClick={onClick}>
          My Orders
        </Link>
      )}
      {user?.role === "shopkeeper" && (
        <Link to="/shop" onClick={onClick}>
          Shop Dashboard
        </Link>
      )}
      {user?.role === "admin" && (
        <Link to="/admin" onClick={onClick}>
          Admin
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

        {/* Center search (desktop) */}
        <form className="nav-search" onSubmit={submitSearch}>
          <span className="nav-search-ic">🔍</span>
          <input
            value={term}
            onChange={(e) => setTerm(e.target.value)}
            placeholder="Search shops & products…"
            aria-label="Search"
          />
        </form>

        {/* Desktop right cluster — kept minimal: Cart, alerts, and a single
            avatar menu that holds everything else (links, settings, theme,
            app install, logout). Logged-out users just get theme + Login. */}
        <div className="nav-links nav-desktop">
          <Link to="/cart" className="nav-cart" title="Cart">
            🛒 <span>Cart</span>
            {count > 0 && <span className="cart-badge">{count}</span>}
          </Link>

          {user && <NotificationBell />}

          {user ? (
            <div className="avatar-menu" ref={menuRef}>
              <button
                className="avatar-btn"
                aria-label="Account menu"
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
                      ⚙️ Settings
                    </Link>
                  </div>

                  <div className="avatar-panel-foot">
                    <ThemeToggle className="btn btn-ghost btn-sm btn-block" />
                    <DownloadApp className="btn btn-ghost btn-sm btn-block" />
                    <InstallApp className="btn btn-ghost btn-sm btn-block" />
                    <button className="btn btn-danger btn-sm btn-block" onClick={handleLogout}>
                      Logout
                    </button>
                  </div>
                </div>
              )}
            </div>
          ) : (
            <>
              <ThemeToggle className="btn btn-ghost btn-sm" />
              <Link to="/login" className="btn btn-sm">
                Login
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
                placeholder="Search shops & products…"
                aria-label="Search"
              />
              <button className="btn btn-sm" type="submit">
                Go
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
                    Notifications
                  </Link>
                  <Link to="/settings" onClick={() => setDrawer(false)}>
                    Settings
                  </Link>
                </>
              )}
            </div>

            <div className="drawer-foot">
              <ThemeToggle className="btn btn-ghost" />
              <DownloadApp className="btn btn-ghost" />
              <InstallApp className="btn btn-ghost" />
              {user ? (
                <button className="btn btn-danger" onClick={handleLogout}>
                  Logout
                </button>
              ) : (
                <>
                  <Link to="/login" className="btn" onClick={() => setDrawer(false)}>
                    Login
                  </Link>
                  <Link
                    to="/register"
                    className="btn btn-outline"
                    onClick={() => setDrawer(false)}
                  >
                    Create account
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
