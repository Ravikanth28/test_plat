import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext.jsx";
import { useCart } from "../context/CartContext.jsx";

export default function Navbar() {
  const { user, logout } = useAuth();
  const { count } = useCart();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate("/");
  };

  return (
    <nav className="navbar">
      <div className="container navbar-inner">
        <Link to="/" className="logo">
          Local<span>Mart</span>
        </Link>
        <div className="nav-links">
          <Link to="/" className="hide-sm">
            Home
          </Link>

          {user?.role === "customer" && (
            <Link to="/orders" className="hide-sm">
              My Orders
            </Link>
          )}
          {user?.role === "shopkeeper" && <Link to="/shop">Shop Dashboard</Link>}
          {user?.role === "admin" && <Link to="/admin">Admin</Link>}

          <Link to="/cart">
            Cart
            {count > 0 && <span className="cart-badge">{count}</span>}
          </Link>

          {user ? (
            <>
              <span className="muted small hide-sm">Hi, {user.name.split(" ")[0]}</span>
              <button onClick={handleLogout}>Logout</button>
            </>
          ) : (
            <Link to="/login" className="btn btn-sm">
              Login
            </Link>
          )}
        </div>
      </div>
    </nav>
  );
}
