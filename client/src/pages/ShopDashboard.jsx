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

// Downscale an uploaded image on the client to a small JPEG data URL so we can
// store it inline (no file server needed) without bloating the DB.
function downscaleImage(file, maxSize = 400, quality = 0.7) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const img = new Image();
      img.onload = () => {
        const scale = Math.min(1, maxSize / Math.max(img.width, img.height));
        const w = Math.round(img.width * scale);
        const h = Math.round(img.height * scale);
        const canvas = document.createElement("canvas");
        canvas.width = w;
        canvas.height = h;
        const ctx = canvas.getContext("2d");
        ctx.drawImage(img, 0, 0, w, h);
        resolve(canvas.toDataURL("image/jpeg", quality));
      };
      img.onerror = () => reject(new Error("Couldn't read that image."));
      img.src = reader.result;
    };
    reader.onerror = () => reject(new Error("Couldn't read that file."));
    reader.readAsDataURL(file);
  });
}

// Minimal CSV parser supporting quoted fields, escaped quotes ("") and commas
// inside quotes. Returns an array of row-objects keyed by the header row.
function parseCsv(text) {
  const rows = [];
  let row = [];
  let field = "";
  let inQuotes = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (inQuotes) {
      if (c === '"') {
        if (text[i + 1] === '"') {
          field += '"';
          i++;
        } else {
          inQuotes = false;
        }
      } else {
        field += c;
      }
    } else if (c === '"') {
      inQuotes = true;
    } else if (c === ",") {
      row.push(field);
      field = "";
    } else if (c === "\n" || c === "\r") {
      if (c === "\r" && text[i + 1] === "\n") i++;
      row.push(field);
      field = "";
      if (row.some((v) => v.trim() !== "")) rows.push(row);
      row = [];
    } else {
      field += c;
    }
  }
  if (field !== "" || row.length) {
    row.push(field);
    if (row.some((v) => v.trim() !== "")) rows.push(row);
  }
  if (rows.length < 2) return [];
  const headers = rows[0].map((h) => h.trim().toLowerCase());
  return rows.slice(1).map((r) => {
    const obj = {};
    headers.forEach((h, idx) => {
      obj[h] = (r[idx] ?? "").trim();
    });
    return obj;
  });
}

export default function ShopDashboard() {
  const [tab, setTab] = useState("orders");
  const [shop, setShop] = useState(null);
  const [orders, setOrders] = useState([]);
  const [products, setProducts] = useState([]);
  const [analytics, setAnalytics] = useState(null);
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

  // Fetch analytics lazily the first time the tab is opened (and refresh on
  // re-open so numbers stay current after advancing orders).
  useEffect(() => {
    if (tab !== "analytics") return;
    api.get("/orders/shop/analytics").then(setAnalytics).catch(() => {});
  }, [tab]);

  const advance = async (order) => {
    const next = NEXT_STATUS[order.status];
    if (!next) return;
    const updated = await api.put(`/orders/${order._id}/status`, { status: next });
    setOrders((prev) => prev.map((o) => (o._id === order._id ? { ...o, ...updated } : o)));
  };

  // Toggle a shop-level flag (isOpen / freeDelivery / isPureVeg) from the dashboard.
  const toggleShopFlag = async (key) => {
    const updated = await api.put(`/shops/${shop._id}`, { [key]: !shop[key] });
    setShop(updated);
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

      <div className="card mt row gap wrap" style={{ alignItems: "center" }}>
        <span className="filter-label" style={{ marginRight: 4 }}>Shop settings:</span>
        <button
          className={`filter-chip ${shop.isOpen ? "active" : ""}`}
          onClick={() => toggleShopFlag("isOpen")}
        >
          {shop.isOpen ? "🟢 Open" : "⛔ Closed"}
        </button>
        <button
          className={`filter-chip ${shop.freeDelivery ? "active" : ""}`}
          onClick={() => toggleShopFlag("freeDelivery")}
        >
          🚴 Free delivery
        </button>
        <button
          className={`filter-chip ${shop.isPureVeg ? "active" : ""}`}
          onClick={() => toggleShopFlag("isPureVeg")}
        >
          🥗 Pure veg
        </button>
      </div>

      <div className="tabs mt">
        <button className={`tab ${tab === "orders" ? "active" : ""}`} onClick={() => setTab("orders")}>
          Orders ({orders.length})
        </button>
        <button className={`tab ${tab === "products" ? "active" : ""}`} onClick={() => setTab("products")}>
          Products ({products.length})
        </button>
        <button className={`tab ${tab === "analytics" ? "active" : ""}`} onClick={() => setTab("analytics")}>
          📊 Analytics
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

      {tab === "analytics" && <ShopAnalytics data={analytics} />}
    </div>
  );
}

function ShopAnalytics({ data }) {
  if (!data) return <div className="loading">Crunching your numbers...</div>;

  const { totals, byDay, topProducts, statusBreakdown } = data;
  const maxDay = Math.max(1, ...byDay.map((d) => d.revenue));
  const maxProd = Math.max(1, ...topProducts.map((p) => p.revenue));

  return (
    <div>
      {/* Headline KPIs */}
      <div className="kpi-grid mb">
        <div className="card kpi">
          <div className="kpi-label">Revenue (delivered)</div>
          <div className="kpi-value">{rupee(totals.revenue)}</div>
        </div>
        <div className="card kpi">
          <div className="kpi-label">Delivered orders</div>
          <div className="kpi-value">{totals.delivered}</div>
        </div>
        <div className="card kpi">
          <div className="kpi-label">Avg order value</div>
          <div className="kpi-value">{rupee(totals.avgOrder)}</div>
        </div>
        <div className="card kpi">
          <div className="kpi-label">Items sold</div>
          <div className="kpi-value">{totals.items}</div>
        </div>
      </div>

      <div className="grid" style={{ gridTemplateColumns: "1fr 1fr", alignItems: "start" }}>
        {/* Revenue over the last 14 days */}
        <div className="card mb">
          <h3 style={{ marginTop: 0 }}>Revenue · last 14 days</h3>
          {totals.revenue === 0 ? (
            <p className="muted small">No delivered revenue yet.</p>
          ) : (
            <div className="bar-chart">
              {byDay.map((d) => (
                <div className="bar-col" key={d.date} title={`${d.date}: ${rupee(d.revenue)}`}>
                  <div className="bar-track">
                    <div
                      className="bar-fill"
                      style={{ height: `${(d.revenue / maxDay) * 100}%` }}
                    />
                  </div>
                  <div className="bar-x">{d.date.slice(8)}</div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Order status mix */}
        <div className="card mb">
          <h3 style={{ marginTop: 0 }}>Order status mix</h3>
          {statusBreakdown.length === 0 ? (
            <p className="muted small">No orders yet.</p>
          ) : (
            statusBreakdown.map((s) => (
              <div className="row between" key={s.status} style={{ padding: "6px 0" }}>
                <span className={`badge ${statusBadgeClass(s.status)}`}>
                  {statusLabel(s.status)}
                </span>
                <strong>{s.count}</strong>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Top products by revenue */}
      <div className="card">
        <h3 style={{ marginTop: 0 }}>Top products by revenue</h3>
        {topProducts.length === 0 ? (
          <p className="muted small">No sales yet — top products will show here.</p>
        ) : (
          topProducts.map((p) => (
            <div className="top-prod" key={p.name}>
              <div className="row between">
                <span>{p.name}</span>
                <span className="muted small">
                  {p.qty} sold · {rupee(p.revenue)}
                </span>
              </div>
              <div className="track-progress" style={{ margin: "6px 0 0" }}>
                <div
                  className="track-progress-fill"
                  style={{ width: `${(p.revenue / maxProd) * 100}%` }}
                />
              </div>
            </div>
          ))
        )}
      </div>
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
  const empty = { name: "", price: "", unit: "piece", category: "general", description: "", stock: 100, isVeg: true, image: "" };
  const [form, setForm] = useState(empty);
  const [editId, setEditId] = useState(null);
  const [imgBusy, setImgBusy] = useState(false);
  const set = (k) => (e) => setForm({ ...form, [k]: e.target.value });

  const pickImage = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setImgBusy(true);
    setMsg("");
    try {
      const dataUrl = await downscaleImage(file);
      setForm((f) => ({ ...f, image: dataUrl }));
    } catch (err) {
      setMsg(err.message);
    } finally {
      setImgBusy(false);
    }
  };

  const submit = async (e) => {
    e.preventDefault();
    setMsg("");
    const payload = { ...form, price: Number(form.price), stock: Number(form.stock) };
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
      stock: p.stock ?? 100,
      isVeg: p.isVeg !== false,
      image: p.image || "",
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
        <div className="field">
          <label>Stock quantity</label>
          <input
            type="number"
            min="0"
            value={form.stock}
            onChange={set("stock")}
            placeholder="100"
          />
        </div>
        <div className="field">
          <label>Food type</label>
          <div className="row gap">
            <button
              type="button"
              className={`filter-chip ${form.isVeg ? "active" : ""}`}
              onClick={() => setForm({ ...form, isVeg: true })}
            >
              🟢 Veg
            </button>
            <button
              type="button"
              className={`filter-chip ${!form.isVeg ? "active" : ""}`}
              onClick={() => setForm({ ...form, isVeg: false })}
            >
              🔴 Non-veg
            </button>
          </div>
        </div>
        <div className="field">
          <label>Product image</label>
          {form.image ? (
            <div className="img-upload">
              <img src={form.image} alt="" className="img-preview" />
              <button
                type="button"
                className="btn btn-ghost btn-sm"
                onClick={() => setForm((f) => ({ ...f, image: "" }))}
              >
                Remove
              </button>
            </div>
          ) : (
            <input type="file" accept="image/*" onChange={pickImage} disabled={imgBusy} />
          )}
          {imgBusy && <div className="muted small" style={{ marginTop: 4 }}>Processing image…</div>}
        </div>
        <button className="btn btn-block" disabled={imgBusy}>
          {editId ? "Update" : "Add Product"}
        </button>
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

      <div>
      <CsvImport setProducts={setProducts} setMsg={setMsg} />
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
                    <div className="muted small" style={{ marginTop: 2 }}>
                      {p.stock ?? 0} left {p.isVeg === false ? "· 🔴" : "· 🟢"}
                    </div>
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
    </div>
  );
}

function CsvImport({ setProducts, setMsg }) {
  const [result, setResult] = useState(null);
  const [busy, setBusy] = useState(false);
  const [open, setOpen] = useState(false);

  const onFile = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setBusy(true);
    setResult(null);
    setMsg("");
    try {
      const text = await file.text();
      const rows = parseCsv(text);
      if (rows.length === 0) {
        setResult({ error: "No rows found. Include a header row: name,price,unit,category,description,stock,isVeg" });
        return;
      }
      const products = rows.map((r) => ({
        name: r.name || r.title || "",
        price: r.price,
        unit: r.unit || "piece",
        category: r.category || "general",
        description: r.description || "",
        stock: r.stock !== undefined && r.stock !== "" ? Number(r.stock) : 100,
        isVeg: /^(false|no|non-veg|nonveg|0)$/i.test(String(r.isveg ?? r.isVeg ?? "").trim())
          ? false
          : true,
      }));
      const res = await api.post("/products/bulk", { products });
      if (res.products?.length) {
        setProducts((prev) => [...res.products, ...prev]);
      }
      setResult({ created: res.created, skipped: res.skipped, errors: res.errors || [] });
      setMsg(`Imported ${res.created} product${res.created === 1 ? "" : "s"}.`);
    } catch (err) {
      setResult({ error: err.message });
    } finally {
      setBusy(false);
      e.target.value = "";
    }
  };

  return (
    <div className="card mb">
      <div className="row between" style={{ alignItems: "center" }}>
        <h3 style={{ margin: 0 }}>📄 Bulk import (CSV)</h3>
        <button className="btn btn-ghost btn-sm" onClick={() => setOpen((o) => !o)}>
          {open ? "Hide" : "Import CSV"}
        </button>
      </div>
      {open && (
        <div style={{ marginTop: 10 }}>
          <p className="muted small" style={{ marginTop: 0 }}>
            Upload a CSV with a header row. Columns:{" "}
            <code>name, price, unit, category, description, stock, isVeg</code>. Only{" "}
            <code>name</code> and <code>price</code> are required.
          </p>
          <input type="file" accept=".csv,text/csv" onChange={onFile} disabled={busy} />
          {busy && <div className="muted small" style={{ marginTop: 6 }}>Importing…</div>}
          {result && (
            <div style={{ marginTop: 10 }}>
              {result.error ? (
                <div className="error">{result.error}</div>
              ) : (
                <>
                  <div className="success">
                    Added {result.created}
                    {result.skipped ? ` · skipped ${result.skipped}` : ""}
                  </div>
                  {result.errors?.length > 0 && (
                    <ul className="muted small" style={{ margin: "8px 0 0", paddingLeft: 18 }}>
                      {result.errors.slice(0, 8).map((er, i) => (
                        <li key={i}>
                          Row {er.row}: {er.reason}
                        </li>
                      ))}
                    </ul>
                  )}
                </>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
