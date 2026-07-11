import { useEffect, useState } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "../context/AuthContext.jsx";
import { useCart } from "../context/CartContext.jsx";
import InstallApp from "./InstallApp.jsx";
import DownloadApp from "./DownloadApp.jsx";

export default function Navbar() {
  const { user, logout } = useAuth();
  const { count } = useCart();
  const navigate = useNavigate();
  const location = useLocation();
  const [drawer, setDrawer] = useState(false);
  const [term, setTerm] = useState("");

  // Close the mobile drawer whenever the route changes.
  useEffect(() => {
    setDrawer(false);
  }, [location.pathname, location.search]);

  // Prevent background scroll while the drawer is open.
  useEffect(() => {
    document.body.style.overflow = drawer ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [drawer]);

  const handleLogout = () => {
    logout();
    setDrawer(false);
    navigate("/");
  };

  const submitSearch = (e) => {
    e.preventDefault();
    const q = term.trim();
    if (!q) return;
    navigate(`/search?q=${encodeURIComponent(q)}`);
  };

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

        {/* Desktop links */}
        <div className="nav-links nav-desktop">
          {roleLinks()}

          <Link to="/cart" className="nav-cart" title="Cart">
            🛒 <span>Cart</span>
            {count > 0 && <span className="cart-badge">{count}</span>}
          </Link>

          <DownloadApp className="btn btn-ghost btn-sm" />
          <InstallApp className="btn btn-ghost btn-sm" />

          {user ? (
            <>
              <span className="muted small">Hi, {user.name.split(" ")[0]}</span>
              <button className="btn btn-ghost btn-sm" onClick={handleLogout}>
                Logout
              </button>
            </>
          ) : (
            <Link to="/login" className="btn btn-sm">
              Login
            </Link>
          )}
        </div>

        {/* Mobile controls */}
        <div className="nav-mobile">
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

      {/* Mobile drawer */}
      {drawer && (
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
              <div className="drawer-user">
                <div className="avatar">{user.name.charAt(0).toUpperCase()}</div>
                <div>
                  <div className="nm">{user.name}</div>
                  <div className="muted small">{user.email}</div>
                </div>
              </div>
            )}

            <div className="drawer-links">{roleLinks(() => setDrawer(false))}</div>

            <div className="drawer-foot">
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
        </div>
      )}
    </nav>
  );
}
