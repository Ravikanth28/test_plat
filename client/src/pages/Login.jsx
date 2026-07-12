import { useState } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "../context/AuthContext.jsx";
import { useLang } from "../context/LanguageContext.jsx";

export default function Login() {
  const { login } = useAuth();
  const { t } = useLang();
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

  const fill = (em, pw) => {
    setEmail(em);
    setPassword(pw);
  };

  return (
    <div className="auth-split">
      <div className="auth-aside">
        <div className="flogo" style={{ fontSize: 30, fontWeight: 900, letterSpacing: "-0.8px", marginBottom: 20 }}>
          Local<span style={{ color: "#fff", opacity: 0.85 }}>Mart</span>
        </div>
        <h2>{t("auth.loginTagline")}</h2>
        <p>{t("auth.loginBlurb")}</p>
        <div className="feat">{t("auth.feat1")}</div>
        <div className="feat">{t("auth.feat2")}</div>
        <div className="feat">{t("auth.feat3")}</div>
      </div>

      <div className="auth-main">
        <form className="form" onSubmit={submit}>
          <h1>{t("auth.loginTitle")}</h1>
          <p className="muted small" style={{ marginTop: 0, marginBottom: 18 }}>
            {t("auth.loginSub")}
          </p>
          {error && <div className="error">{error}</div>}
          <div className="field">
            <label>{t("auth.email")}</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>
          <div className="field">
            <label>{t("auth.password")}</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </div>
          <button className="btn btn-block" disabled={busy}>
            {busy ? t("auth.signingIn") : t("auth.signIn")}
          </button>
          <p className="center small mt">
            {t("auth.newHere")} <Link to="/register" style={{ color: "var(--brand)", fontWeight: 700 }}>{t("auth.createAccount")}</Link>
          </p>
          <div className="demo-box">
            <b>{t("auth.tryDemo")}</b>
            <div className="row gap wrap" style={{ marginTop: 8 }}>
              <button type="button" className="demo-fill" onClick={() => fill("customer@localmart.com", "cust123")}>
                {t("auth.customer")}
              </button>
              <button type="button" className="demo-fill" onClick={() => fill("ravi@shop.com", "shop123")}>
                {t("auth.shopkeeper")}
              </button>
              <button type="button" className="demo-fill" onClick={() => fill("admin@localmart.com", "admin123")}>
                {t("auth.admin")}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
