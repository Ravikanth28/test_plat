import { useEffect, useState } from "react";
import { api } from "../api.js";
import { CATEGORIES, rupee, statusLabel, statusBadgeClass } from "../utils.js";

const NEXT_STATUS = {
  placed: "accepted",
  accepted: "preparing",
  preparing: "out_for_delivery",
  out_for_delivery: "delivered",
};
const NEXT_LABEL = {
  placed: "Accept Order",
  accepted: "Start Preparing",
  preparing: "Mark Out for Delivery",
  out_for_delivery: "Mark Delivered",
};

export default function ShopDashboard() {
  const [tab, setTab] = useState("orders");
  const [shop, setShop] = useState(null);
  const [orders, setOrders] = useState([]);
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [msg, setMsg] = useState("");

  const loadAll = async () => {
    const [s, o, p] = await Promise.all([
      api.get("/shops/mine"),
      api.get("/orders/shop"),
      api.get("/products/mine"),
    ]);
    setShop(s);
    setOrders(o);
    setProducts(p);
    setLoading(false);
  };

  useEffect(() => {
    loadAll().catch(() => setLoading(false));
  }, []);

  const advance = async (order) => {
    const next = NEXT_STATUS[order.status];
    if (!next) return;
    const updated = await api.put(`/orders/${order._id}/status`, { status: next });
    setOrders((prev) => prev.map((o) => (o._id === order._id ? { ...o, ...updated } : o)));
  };

  if (loading) return <div className="loading">Loading dashboard...</div>;

  // No shop yet -> create form
  if (!shop) return <CreateShop onCreated={(s) => setShop(s)} />;

  return (
    <div className="container">
      <div className="page-head">
        <div>
          <h1>{shop.name}</h1>
          <div className="row gap" style={{ marginTop: 6 }}>
            <span className="badge badge-cat">{shop.category}</span>
            {shop.isApproved ? (
              <span className="badge badge-green">Approved</span>
            ) : (
              <span className="badge badge-amber">Awaiting admin approval</span>
            )}
          </div>
        </div>
      </div>

      {!shop.isApproved && (
        <div className="error mt">
          Your shop is not yet approved by admin, so it won't appear to customers.
        </div>
      )}

      <div className="tabs mt">
        <button className={`tab ${tab === "orders" ? "active" : ""}`} onClick={() => setTab("orders")}>
          Orders ({orders.length})
        </button>
        <button className={`tab ${tab === "products" ? "active" : ""}`} onClick={() => setTab("products")}>
          Products ({products.length})
        </button>
      </div>

      {tab === "orders" && (
        <div>
          {orders.length === 0 ? (
            <div className="card empty">
              <div className="big">🧾</div>
              <p className="muted">No orders yet. They'll show up here as customers order.</p>
            </div>
          ) : (
            orders.map((o) => (
              <div className="card mb" key={o._id}>
                <div className="row between">
                  <div>
                    <strong>#{o.orderNo}</strong>{" "}
                    <span className={`badge ${statusBadgeClass(o.status)}`}>
                      {statusLabel(o.status)}
                    </span>
                  </div>
                  <span className="muted small">
                    {new Date(o.createdAt).toLocaleString("en-IN")}
                  </span>
                </div>
                <div className="row between mt" style={{ alignItems: "flex-start" }}>
                  <div className="small">
                    <div>Customer: {o.customer?.name} ({o.customer?.phone})</div>
                    <div className="muted">📍 {o.deliveryAddress}</div>
                    {o.geo?.lat != null && o.geo?.lng != null && (
                      <div style={{ marginTop: 2 }}>
                        <a
                          href={`https://www.google.com/maps?q=${o.geo.lat},${o.geo.lng}`}
                          target="_blank"
                          rel="noopener noreferrer"
                        >
                          🗺️ Navigate to customer
                          {o.geo.accuracy ? ` (±${Math.round(o.geo.accuracy)}m)` : ""}
                        </a>
                      </div>
                    )}
                    <div style={{ marginTop: 6 }}>
                      {o.items.map((i, idx) => (
                        <div key={idx}>
                          {i.name} × {i.qty} — {rupee(i.price * i.qty)}
                        </div>
                      ))}
                    </div>
                  </div>
                  <div className="center">
                    <div className="price">{rupee(o.total)}</div>
                    <div className="small">
                      {o.paymentMethod.toUpperCase()}{" "}
                      <span
                        className={`badge ${
                          o.paymentStatus === "paid" ? "badge-green" : "badge-amber"
                        }`}
                      >
                        {o.paymentStatus}
                      </span>
                    </div>
                    {NEXT_STATUS[o.status] && (
                      <button className="btn btn-sm mt" onClick={() => advance(o)}>
                        {NEXT_LABEL[o.status]}
                      </button>
                    )}
                    {o.status === "delivered" && (
                      <div className="badge badge-green mt">Completed ✓</div>
                    )}
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {tab === "products" && (
        <ProductManager
          products={products}
          setProducts={setProducts}
          msg={msg}
          setMsg={setMsg}
        />
      )}
    </div>
  );
}

function CreateShop({ onCreated }) {
  const [form, setForm] = useState({
    name: "",
    category: "department",
    description: "",
    address: "",
    phone: "",
  });
  const [geo, setGeo] = useState(null);
  const [geoBusy, setGeoBusy] = useState(false);
  const [error, setError] = useState("");
  const set = (k) => (e) => setForm({ ...form, [k]: e.target.value });

  // Capture the shop's location so it can be sorted by distance for nearby
  // customers on the home page. Optional — the shop still works without it.
  const useMyLocation = () => {
    if (!navigator.geolocation) {
      setError("Location isn't supported on this device.");
      return;
    }
    setGeoBusy(true);
    setError("");
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setGeo({ lat: pos.coords.latitude, lng: pos.coords.longitude });
        setGeoBusy(false);
      },
      () => {
        setError("Couldn't get your location. Please allow access and retry.");
        setGeoBusy(false);
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 60000 }
    );
  };

  const submit = async (e) => {
    e.preventDefault();
    setError("");
    try {
      const shop = await api.post("/shops", geo ? { ...form, geo } : form);
      onCreated(shop);
    } catch (err) {
      setError(err.message);
    }
  };

  return (
    <div className="container">
      <form className="form card" onSubmit={submit}>
        <h1 style={{ marginTop: 0 }}>Set up your shop</h1>
        {error && <div className="error">{error}</div>}
        <div className="field">
          <label>Shop Name</label>
          <input value={form.name} onChange={set("name")} required />
        </div>
        <div className="field">
          <label>Category</label>
          <select value={form.category} onChange={set("category")}>
            {CATEGORIES.filter((c) => c.key !== "all").map((c) => (
              <option key={c.key} value={c.key}>
                {c.label}
              </option>
            ))}
          </select>
        </div>
        <div className="field">
          <label>Description</label>
          <input value={form.description} onChange={set("description")} />
        </div>
        <div className="field">
          <label>Address</label>
          <input value={form.address} onChange={set("address")} />
        </div>
        <div className="field">
          <label>Phone</label>
          <input value={form.phone} onChange={set("phone")} />
        </div>
        <div className="field">
          <label>Shop location (optional)</label>
          <button
            type="button"
            className="btn btn-ghost btn-block"
            onClick={useMyLocation}
            disabled={geoBusy}
          >
            {geoBusy
              ? "Locating…"
              : geo
              ? `📍 Location set (${geo.lat.toFixed(4)}, ${geo.lng.toFixed(4)})`
              : "📍 Use my current location"}
          </button>
          <p className="muted small" style={{ margin: "6px 0 0" }}>
            Helps nearby customers find your shop with distance sorting.
          </p>
        </div>
        <button className="btn btn-block">Create Shop</button>
      </form>
    </div>
  );
}

function ProductManager({ products, setProducts, msg, setMsg }) {
  const empty = { name: "", price: "", unit: "piece", category: "general", description: "" };
  const [form, setForm] = useState(empty);
  const [editId, setEditId] = useState(null);
  const set = (k) => (e) => setForm({ ...form, [k]: e.target.value });

  const submit = async (e) => {
    e.preventDefault();
    setMsg("");
    const payload = { ...form, price: Number(form.price) };
    try {
      if (editId) {
        const updated = await api.put(`/products/${editId}`, payload);
        setProducts((p) => p.map((x) => (x._id === editId ? updated : x)));
        setEditId(null);
      } else {
        const created = await api.post("/products", payload);
        setProducts((p) => [created, ...p]);
      }
      setForm(empty);
      setMsg("Saved!");
    } catch (err) {
      setMsg(err.message);
    }
  };

  const edit = (p) => {
    setEditId(p._id);
    setForm({
      name: p.name,
      price: p.price,
      unit: p.unit,
      category: p.category,
      description: p.description,
    });
  };

  const toggleStock = async (p) => {
    const updated = await api.put(`/products/${p._id}`, { inStock: !p.inStock });
    setProducts((prev) => prev.map((x) => (x._id === p._id ? updated : x)));
  };

  const remove = async (p) => {
    if (!window.confirm(`Delete "${p.name}"?`)) return;
    await api.del(`/products/${p._id}`);
    setProducts((prev) => prev.filter((x) => x._id !== p._id));
  };

  return (
    <div className="grid" style={{ gridTemplateColumns: "320px 1fr" }}>
      <form className="card" onSubmit={submit} style={{ height: "fit-content" }}>
        <h3 style={{ marginTop: 0 }}>{editId ? "Edit Product" : "Add Product"}</h3>
        {msg && <div className="success">{msg}</div>}
        <div className="field">
          <label>Name</label>
          <input value={form.name} onChange={set("name")} required />
        </div>
        <div className="field">
          <label>Price (₹)</label>
          <input type="number" min="0" value={form.price} onChange={set("price")} required />
        </div>
        <div className="field">
          <label>Unit</label>
          <input value={form.unit} onChange={set("unit")} placeholder="piece / kg / glass" />
        </div>
        <div className="field">
          <label>Category</label>
          <input value={form.category} onChange={set("category")} />
        </div>
        <div className="field">
          <label>Description</label>
          <input value={form.description} onChange={set("description")} />
        </div>
        <button className="btn btn-block">{editId ? "Update" : "Add Product"}</button>
        {editId && (
          <button
            type="button"
            className="btn btn-ghost btn-block mt"
            onClick={() => {
              setEditId(null);
              setForm(empty);
            }}
          >
            Cancel
          </button>
        )}
      </form>

      <div className="card">
        {products.length === 0 ? (
          <div className="empty">
            <div className="big">📦</div>
            <p className="muted">No products yet. Add your first product using the form.</p>
          </div>
        ) : (
          <div className="data-table">
          <table>
            <thead>
              <tr>
                <th>Name</th>
                <th>Price</th>
                <th>Stock</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {products.map((p) => (
                <tr key={p._id}>
                  <td>
                    {p.name}
                    <div className="muted small">{p.category}</div>
                  </td>
                  <td>{rupee(p.price)}</td>
                  <td>
                    <button
                      className={`badge ${p.inStock ? "badge-green" : "badge-red"}`}
                      style={{ border: "none", cursor: "pointer" }}
                      onClick={() => toggleStock(p)}
                    >
                      {p.inStock ? "In stock" : "Out"}
                    </button>
                  </td>
                  <td>
                    <button className="btn btn-ghost btn-sm" onClick={() => edit(p)}>
                      Edit
                    </button>{" "}
                    <button className="btn btn-danger btn-sm" onClick={() => remove(p)}>
                      Delete
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          </div>
        )}
      </div>
    </div>
  );
}
