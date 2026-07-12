import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext.jsx";
import { useLang } from "../context/LanguageContext.jsx";

export default function Register() {
  const { register } = useAuth();
  const { t } = useLang();
  const navigate = useNavigate();
  const [form, setForm] = useState({
    name: "",
    email: "",
    phone: "",
    password: "",
    role: "customer",
    address: "",
  });
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  const set = (k) => (e) => setForm({ ...form, [k]: e.target.value });

  const submit = async (e) => {
    e.preventDefault();
    setError("");
    setBusy(true);
    try {
      const user = await register(form);
      if (user.role === "shopkeeper") navigate("/shop");
      else navigate("/");
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="auth-split">
      <div className="auth-aside">
        <div className="flogo" style={{ fontSize: 30, fontWeight: 900, letterSpacing: "-0.8px", marginBottom: 20 }}>
          Local<span style={{ color: "#fff", opacity: 0.85 }}>Mart</span>
        </div>
        <h2>{t("auth.registerTagline")}</h2>
        <p>{t("auth.registerBlurb")}</p>
        <div className="feat">{t("auth.rfeat1")}</div>
        <div className="feat">{t("auth.rfeat2")}</div>
        <div className="feat">{t("auth.rfeat3")}</div>
      </div>

      <div className="auth-main">
      <form className="form" onSubmit={submit}>
        <h1>{t("auth.registerTitle")}</h1>
        <p className="muted small" style={{ marginTop: 0, marginBottom: 18 }}>
          {t("auth.registerSub")}
        </p>
        {error && <div className="error">{error}</div>}
        <div className="field">
          <label>{t("auth.fullName")}</label>
          <input value={form.name} onChange={set("name")} required />
        </div>
        <div className="field">
          <label>{t("auth.email")}</label>
          <input type="email" value={form.email} onChange={set("email")} required />
        </div>
        <div className="field">
          <label>{t("auth.phone")}</label>
          <input value={form.phone} onChange={set("phone")} />
        </div>
        <div className="field">
          <label>{t("auth.passwordMin")}</label>
          <input
            type="password"
            value={form.password}
            onChange={set("password")}
            minLength={6}
            required
          />
        </div>
        <div className="field">
          <label>{t("auth.registerAs")}</label>
          <select value={form.role} onChange={set("role")}>
            <option value="customer">{t("auth.roleCustomer")}</option>
            <option value="shopkeeper">{t("auth.roleShopkeeper")}</option>
          </select>
        </div>
        {form.role === "customer" && (
          <div className="field">
            <label>{t("auth.deliveryAddress")}</label>
            <textarea rows={2} value={form.address} onChange={set("address")} />
          </div>
        )}
        <button className="btn btn-block" disabled={busy}>
          {busy ? t("auth.creating") : t("auth.signUp")}
        </button>
        <p className="center small mt">
          {t("auth.haveAccount")}{" "}
          <Link to="/login" style={{ color: "var(--brand)", fontWeight: 700 }}>
            {t("auth.signIn")}
          </Link>
        </p>
        {form.role === "shopkeeper" && (
          <p className="small muted center">
            {t("auth.shopApprovalNote")}
          </p>
        )}
      </form>
      </div>
    </div>
  );
}
