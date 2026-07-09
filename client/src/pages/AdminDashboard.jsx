import { useEffect, useState } from "react";
import { api } from "../api.js";
import { rupee, statusLabel, statusBadgeClass } from "../utils.js";

export default function AdminDashboard() {
  const [tab, setTab] = useState("overview");
  const [stats, setStats] = useState(null);
  const [shops, setShops] = useState([]);
  const [users, setUsers] = useState([]);
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    const [s, sh, u, o] = await Promise.all([
      api.get("/admin/stats"),
      api.get("/admin/shops"),
      api.get("/admin/users"),
      api.get("/admin/orders"),
    ]);
    setStats(s);
    setShops(sh);
    setUsers(u);
    setOrders(o);
    setLoading(false);
  };

  useEffect(() => {
    load().catch(() => setLoading(false));
  }, []);

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

  if (loading) return <div className="loading">Loading admin panel...</div>;

  return (
    <div className="container mt">
      <h1>Admin Control Panel</h1>

      <div className="tabs">
        {["overview", "shops", "users", "orders"].map((t) => (
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
          <Stat num={stats.users} lbl="Users" />
          <Stat num={stats.shops} lbl="Shops" />
          <Stat num={stats.products} lbl="Products" />
          <Stat num={stats.orders} lbl="Orders" />
          <Stat num={stats.pendingShops} lbl="Pending Approvals" />
          <Stat num={rupee(stats.revenue)} lbl="Paid Revenue" />
        </div>
      )}

      {tab === "shops" && (
        <div className="card">
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

      {tab === "users" && (
        <div className="card">
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

      {tab === "orders" && (
        <div className="card">
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
  );
}

function Stat({ num, lbl }) {
  return (
    <div className="card stat">
      <div className="num">{num}</div>
      <div className="lbl">{lbl}</div>
    </div>
  );
}
