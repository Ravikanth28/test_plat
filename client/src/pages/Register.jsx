import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext.jsx";

export default function Register() {
  const { register } = useAuth();
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
    <div className="container">
      <form className="form card" onSubmit={submit}>
        <h1 style={{ marginTop: 0 }}>Create your account</h1>
        {error && <div className="error">{error}</div>}
        <div className="field">
          <label>Full Name</label>
          <input value={form.name} onChange={set("name")} required />
        </div>
        <div className="field">
          <label>Email</label>
          <input type="email" value={form.email} onChange={set("email")} required />
        </div>
        <div className="field">
          <label>Phone</label>
          <input value={form.phone} onChange={set("phone")} />
        </div>
        <div className="field">
          <label>Password (min 6 chars)</label>
          <input
            type="password"
            value={form.password}
            onChange={set("password")}
            minLength={6}
            required
          />
        </div>
        <div className="field">
          <label>I want to register as</label>
          <select value={form.role} onChange={set("role")}>
            <option value="customer">Customer (order items)</option>
            <option value="shopkeeper">Shopkeeper (sell items)</option>
          </select>
        </div>
        {form.role === "customer" && (
          <div className="field">
            <label>Delivery Address</label>
            <textarea rows={2} value={form.address} onChange={set("address")} />
          </div>
        )}
        <button className="btn btn-block" disabled={busy}>
          {busy ? "Creating..." : "Register"}
        </button>
        <p className="center small mt">
          Already have an account? <Link to="/login">Login</Link>
        </p>
        {form.role === "shopkeeper" && (
          <p className="small muted center">
            Note: your shop needs admin approval before it appears publicly.
          </p>
        )}
      </form>
    </div>
  );
}
