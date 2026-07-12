import { useEffect, useState } from "react";
import { api } from "../api.js";
import { rupee, statusLabel, statusBadgeClass } from "../utils.js";

export default function AdminDashboard() {
  const [tab, setTab] = useState("overview");
  const [stats, setStats] = useState(null);
  const [shops, setShops] = useState([]);
  const [users, setUsers] = useState([]);
  const [orders, setOrders] = useState([]);
  const [banners, setBanners] = useState([]);
  const [reports, setReports] = useState(null);
  const [loading, setLoading] = useState(true);
  const emptyBanner = { title: "", subtitle: "", image: "", link: "/", cta: "Shop now", order: 0 };
  const [newBanner, setNewBanner] = useState(emptyBanner);

  const load = async () => {
    const [s, sh, u, o, b] = await Promise.all([
      api.get("/admin/stats"),
      api.get("/admin/shops"),
      api.get("/admin/users"),
      api.get("/admin/orders"),
      api.get("/admin/banners"),
    ]);
    setStats(s);
    setShops(sh);
    setUsers(u);
    setOrders(o);
    setBanners(b);
    setLoading(false);
  };

  useEffect(() => {
    load().catch(() => setLoading(false));
  }, []);

  // Lazy-load the platform revenue report only when the tab is opened.
  useEffect(() => {
    if (tab !== "reports" || reports) return;
    api.get("/admin/analytics").then(setReports).catch(() => {});
  }, [tab, reports]);

  const approveShop = async (shop, isApproved) => {
    const updated = await api.put(`/admin/shops/${shop._id}/approve`, { isApproved });
    setShops((prev) => prev.map((s) => (s._id === shop._id ? { ...s, ...updated } : s)));
  };

  const deleteShop = async (shop) => {
    if (!window.confirm(`Delete shop "${shop.name}" and all its products?`)) return;
    await api.del(`/admin/shops/${shop._id}`);
    setShops((prev) => prev.filter((s) => s._id !== shop._id));
  };

  const changeRole = async (user, role) => {
    const updated = await api.put(`/admin/users/${user._id}/role`, { role });
    setUsers((prev) => prev.map((u) => (u._id === user._id ? { ...u, ...updated } : u)));
  };

  const deleteUser = async (user) => {
    if (!window.confirm(`Delete user "${user.name}"?`)) return;
    try {
      await api.del(`/admin/users/${user._id}`);
      setUsers((prev) => prev.filter((u) => u._id !== user._id));
    } catch (e) {
      alert(e.message);
    }
  };

  const addBanner = async (e) => {
    e.preventDefault();
    if (!newBanner.title.trim()) return alert("Banner title is required");
    try {
      const created = await api.post("/admin/banners", newBanner);
      setBanners((prev) => [...prev, created]);
      setNewBanner(emptyBanner);
    } catch (err) {
      alert(err.message);
    }
  };

  const toggleBanner = async (banner) => {
    const updated = await api.put(`/admin/banners/${banner._id}`, {
      isActive: !banner.isActive,
    });
    setBanners((prev) => prev.map((b) => (b._id === banner._id ? { ...b, ...updated } : b)));
  };

  const deleteBanner = async (banner) => {
    if (!window.confirm(`Delete banner "${banner.title}"?`)) return;
    await api.del(`/admin/banners/${banner._id}`);
    setBanners((prev) => prev.filter((b) => b._id !== banner._id));
  };

  if (loading) return <div className="loading">Loading admin panel...</div>;

  return (
    <div className="container">
      <div className="page-head">
        <div>
          <h1>Admin Control Panel</h1>
          <p className="sub">Manage shops, users, orders & platform health</p>
        </div>
        {stats && stats.pendingShops > 0 && (
          <span className="badge badge-amber" style={{ fontSize: 13 }}>
            {stats.pendingShops} shop{stats.pendingShops > 1 ? "s" : ""} awaiting approval
          </span>
        )}
      </div>

      <div className="tabs">
        {["overview", "reports", "shops", "users", "orders", "banners"].map((t) => (
          <button
            key={t}
            className={`tab ${tab === t ? "active" : ""}`}
            onClick={() => setTab(t)}
            style={{ textTransform: "capitalize" }}
          >
            {t}
          </button>
        ))}
      </div>

      {tab === "overview" && stats && (
        <div className="grid grid-4">
          <StatCard num={stats.users} lbl="Total Users" icon="👥" cls="sc-blue" />
          <StatCard num={stats.shops} lbl="Shops" icon="🏪" cls="sc-red" />
          <StatCard num={stats.products} lbl="Products" icon="📦" cls="sc-amber" />
          <StatCard num={stats.orders} lbl="Orders" icon="🧾" cls="sc-green" />
          <StatCard num={stats.pendingShops} lbl="Pending Approvals" icon="⏳" cls="sc-amber" />
          <StatCard num={rupee(stats.revenue)} lbl="Paid Revenue" icon="💰" cls="sc-green" />
        </div>
      )}

      {tab === "reports" && <AdminReports data={reports} />}

      {tab === "shops" && (
        <div className="card">
          {shops.length === 0 ? (
            <div className="empty">
              <div className="big">🏪</div>
              <p className="muted">No shops registered yet.</p>
            </div>
          ) : (
          <div className="data-table">
          <table>
            <thead>
              <tr>
                <th>Shop</th>
                <th>Owner</th>
                <th>Category</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {shops.map((s) => (
                <tr key={s._id}>
                  <td>{s.name}</td>
                  <td className="small muted">{s.owner?.email}</td>
                  <td>
                    <span className="badge badge-cat">{s.category}</span>
                  </td>
                  <td>
                    {s.isApproved ? (
                      <span className="badge badge-green">Approved</span>
                    ) : (
                      <span className="badge badge-amber">Pending</span>
                    )}
                  </td>
                  <td>
                    {s.isApproved ? (
                      <button className="btn btn-ghost btn-sm" onClick={() => approveShop(s, false)}>
                        Unapprove
                      </button>
                    ) : (
                      <button className="btn btn-sm" onClick={() => approveShop(s, true)}>
                        Approve
                      </button>
                    )}{" "}
                    <button className="btn btn-danger btn-sm" onClick={() => deleteShop(s)}>
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
      )}

      {tab === "users" && (
        <div className="card">
          {users.length === 0 ? (
            <div className="empty">
              <div className="big">👥</div>
              <p className="muted">No users found.</p>
            </div>
          ) : (
          <div className="data-table">
          <table>
            <thead>
              <tr>
                <th>Name</th>
                <th>Email</th>
                <th>Role</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {users.map((u) => (
                <tr key={u._id}>
                  <td>{u.name}</td>
                  <td className="small muted">{u.email}</td>
                  <td>
                    <select
                      value={u.role}
                      onChange={(e) => changeRole(u, e.target.value)}
                      style={{ padding: "4px 8px", borderRadius: 6 }}
                    >
                      <option value="customer">customer</option>
                      <option value="shopkeeper">shopkeeper</option>
                      <option value="admin">admin</option>
                    </select>
                  </td>
                  <td>
                    <button className="btn btn-danger btn-sm" onClick={() => deleteUser(u)}>
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
      )}

      {tab === "orders" && (
        <div className="card">
          {orders.length === 0 ? (
            <div className="empty">
              <div className="big">🧾</div>
              <p className="muted">No orders placed yet.</p>
            </div>
          ) : (
          <div className="data-table">
          <table>
            <thead>
              <tr>
                <th>Order</th>
                <th>Customer</th>
                <th>Shop</th>
                <th>Total</th>
                <th>Payment</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {orders.map((o) => (
                <tr key={o._id}>
                  <td>#{o.orderNo}</td>
                  <td>{o.customer?.name}</td>
                  <td>{o.shop?.name}</td>
                  <td>{rupee(o.total)}</td>
                  <td>
                    {o.paymentMethod.toUpperCase()}{" "}
                    <span
                      className={`badge ${
                        o.paymentStatus === "paid" ? "badge-green" : "badge-amber"
                      }`}
                    >
                      {o.paymentStatus}
                    </span>
                  </td>
                  <td>
                    <span className={`badge ${statusBadgeClass(o.status)}`}>
                      {statusLabel(o.status)}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          </div>
          )}
        </div>
      )}

      {tab === "banners" && (
        <>
          <div className="card" style={{ marginBottom: 16 }}>
            <h3 style={{ marginTop: 0 }}>Add a hero banner</h3>
            <p className="muted small" style={{ marginTop: -6 }}>
              Banners rotate in the home page hero. Use an emoji (e.g. 🥦) or an
              image URL for the artwork.
            </p>
            <form className="banner-form" onSubmit={addBanner}>
              <input
                placeholder="Title *"
                value={newBanner.title}
                onChange={(e) => setNewBanner((b) => ({ ...b, title: e.target.value }))}
              />
              <input
                placeholder="Subtitle"
                value={newBanner.subtitle}
                onChange={(e) => setNewBanner((b) => ({ ...b, subtitle: e.target.value }))}
              />
              <input
                placeholder="Image (emoji or URL)"
                value={newBanner.image}
                onChange={(e) => setNewBanner((b) => ({ ...b, image: e.target.value }))}
              />
              <input
                placeholder="Link (e.g. /?cat=food)"
                value={newBanner.link}
                onChange={(e) => setNewBanner((b) => ({ ...b, link: e.target.value }))}
              />
              <input
                placeholder="CTA label"
                value={newBanner.cta}
                onChange={(e) => setNewBanner((b) => ({ ...b, cta: e.target.value }))}
              />
              <input
                type="number"
                placeholder="Order"
                value={newBanner.order}
                onChange={(e) => setNewBanner((b) => ({ ...b, order: e.target.value }))}
                style={{ maxWidth: 100 }}
              />
              <button className="btn" type="submit">
                Add banner
              </button>
            </form>
          </div>

          <div className="card">
            {banners.length === 0 ? (
              <div className="empty">
                <div className="big">🖼️</div>
                <p className="muted">No banners yet. Add one above.</p>
              </div>
            ) : (
              <div className="data-table">
                <table>
                  <thead>
                    <tr>
                      <th>Art</th>
                      <th>Title</th>
                      <th>Link</th>
                      <th>Order</th>
                      <th>Status</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {banners.map((b) => (
                      <tr key={b._id}>
                        <td style={{ fontSize: 24 }}>
                          {/^https?:\/\//i.test(b.image) ? (
                            <img
                              src={b.image}
                              alt=""
                              style={{ width: 40, height: 40, objectFit: "cover", borderRadius: 8 }}
                            />
                          ) : (
                            b.image || "🛍️"
                          )}
                        </td>
                        <td>
                          <div>{b.title}</div>
                          <div className="small muted">{b.subtitle}</div>
                        </td>
                        <td className="small muted">{b.link}</td>
                        <td>{b.order}</td>
                        <td>
                          {b.isActive ? (
                            <span className="badge badge-green">Active</span>
                          ) : (
                            <span className="badge badge-amber">Hidden</span>
                          )}
                        </td>
                        <td>
                          <button className="btn btn-ghost btn-sm" onClick={() => toggleBanner(b)}>
                            {b.isActive ? "Hide" : "Show"}
                          </button>{" "}
                          <button className="btn btn-danger btn-sm" onClick={() => deleteBanner(b)}>
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
        </>
      )}
    </div>
  );
}

function AdminReports({ data }) {
  if (!data) return <div className="loading">Loading revenue report...</div>;

  const { totals, byDay = [], shopRanking = [] } = data;
  const maxDay = Math.max(1, ...byDay.map((d) => d.revenue));

  return (
    <>
      <div className="kpi-grid mb">
        <div className="kpi">
          <div className="kpi-label">Earned Revenue</div>
          <div className="kpi-value">{rupee(totals.revenue)}</div>
        </div>
        <div className="kpi">
          <div className="kpi-label">Delivered Orders</div>
          <div className="kpi-value">{totals.deliveredOrders}</div>
        </div>
        <div className="kpi">
          <div className="kpi-label">Avg Order</div>
          <div className="kpi-value">{rupee(totals.avgOrder)}</div>
        </div>
        <div className="kpi">
          <div className="kpi-label">Items Sold</div>
          <div className="kpi-value">{totals.items}</div>
        </div>
        <div className="kpi">
          <div className="kpi-label">Active Shops</div>
          <div className="kpi-value">{totals.activeShops}</div>
        </div>
      </div>

      <div className="card mb">
        <h3 style={{ marginTop: 0 }}>Revenue — last 14 days</h3>
        <p className="muted small" style={{ marginTop: -6 }}>
          Earned revenue from delivered orders across the platform.
        </p>
        {byDay.every((d) => d.revenue === 0) ? (
          <div className="empty">
            <div className="big">📉</div>
            <p className="muted">No delivered-order revenue in this window yet.</p>
          </div>
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
                <div className="bar-x">{d.date.slice(5)}</div>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="card">
        <h3 style={{ marginTop: 0 }}>Shop performance ranking</h3>
        <p className="muted small" style={{ marginTop: -6 }}>
          Shops ranked by earned revenue (delivered orders only).
        </p>
        {shopRanking.length === 0 ? (
          <div className="empty">
            <div className="big">🏪</div>
            <p className="muted">No shop revenue to rank yet.</p>
          </div>
        ) : (
          <div className="data-table">
            <table>
              <thead>
                <tr>
                  <th>Rank</th>
                  <th>Shop</th>
                  <th>Category</th>
                  <th>Revenue</th>
                  <th>Orders</th>
                  <th>Items</th>
                </tr>
              </thead>
              <tbody>
                {shopRanking.map((s) => (
                  <tr key={s.shopId}>
                    <td>
                      <span className={`rank-badge${s.rank <= 3 ? " top" : ""}`}>#{s.rank}</span>
                    </td>
                    <td>{s.name}</td>
                    <td>
                      {s.category ? <span className="badge badge-cat">{s.category}</span> : "—"}
                    </td>
                    <td>
                      <strong>{rupee(s.revenue)}</strong>
                    </td>
                    <td>{s.orders}</td>
                    <td>{s.items}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </>
  );
}

function StatCard({ num, lbl, icon, cls }) {
  return (
    <div className={`stat-card ${cls}`}>
      <div className="ic">{icon}</div>
      <div className="num">{num}</div>
      <div className="lbl">{lbl}</div>
    </div>
  );
}
