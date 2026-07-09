import { useState } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "../context/AuthContext.jsx";

export default function Login() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  const redirectTo = (role) => {
    const from = location.state?.from?.pathname;
    if (from) return from;
    if (role === "admin") return "/admin";
    if (role === "shopkeeper") return "/shop";
    return "/";
  };

  const submit = async (e) => {
    e.preventDefault();
    setError("");
    setBusy(true);
    try {
      const user = await login(email, password);
      navigate(redirectTo(user.role), { replace: true });
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="container">
      <form className="form card" onSubmit={submit}>
        <h1 style={{ marginTop: 0 }}>Welcome back</h1>
        {error && <div className="error">{error}</div>}
        <div className="field">
          <label>Email</label>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
        </div>
        <div className="field">
          <label>Password</label>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />
        </div>
        <button className="btn btn-block" disabled={busy}>
          {busy ? "Signing in..." : "Login"}
        </button>
        <p className="center small mt">
          New here? <Link to="/register">Create an account</Link>
        </p>
        <div className="small muted mt" style={{ background: "#f8fafc", padding: 10, borderRadius: 8 }}>
          <strong>Demo logins:</strong>
          <br />
          Customer: customer@localmart.com / cust123
          <br />
          Shopkeeper: ravi@shop.com / shop123
          <br />
          Admin: admin@localmart.com / admin123
        </div>
      </form>
    </div>
  );
}
