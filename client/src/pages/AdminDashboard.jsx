import { useEffect, useState } from "react";
import { api } from "../api.js";
import { useLang } from "../context/LanguageContext.jsx";
import { rupee, statusLabel, statusBadgeClass } from "../utils.js";

export default function AdminDashboard() {
  const { t, tc } = useLang();
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

  if (loading) return <div className="loading">{t("admin.loading")}</div>;

  const TAB_LABELS = {
    overview: t("admin.tabOverview"),
    reports: t("admin.tabReports"),
    shops: t("admin.tabShops"),
    users: t("admin.tabUsers"),
    orders: t("admin.tabOrders"),
    banners: t("admin.tabBanners"),
  };

  return (
    <div className="container">
      <div className="page-head">
        <div>
          <h1>{t("admin.title")}</h1>
          <p className="sub">{t("admin.subtitle")}</p>
        </div>
        {stats && stats.pendingShops > 0 && (
          <span className="badge badge-amber" style={{ fontSize: 13 }}>
            {stats.pendingShops} {t("admin.scShops").toLowerCase()} {t("admin.awaiting")}
          </span>
        )}
      </div>

      <div className="tabs">
        {["overview", "reports", "shops", "users", "orders", "banners"].map((tk) => (
          <button
            key={tk}
            className={`tab ${tab === tk ? "active" : ""}`}
            onClick={() => setTab(tk)}
            style={{ textTransform: "capitalize" }}
          >
            {TAB_LABELS[tk]}
          </button>
        ))}
      </div>

      {tab === "overview" && stats && (
        <div className="grid grid-4">
          <StatCard num={stats.users} lbl={t("admin.scUsers")} icon="👥" cls="sc-blue" />
          <StatCard num={stats.shops} lbl={t("admin.scShops")} icon="🏪" cls="sc-red" />
          <StatCard num={stats.products} lbl={t("admin.scProducts")} icon="📦" cls="sc-amber" />
          <StatCard num={stats.orders} lbl={t("admin.scOrders")} icon="🧾" cls="sc-green" />
          <StatCard num={stats.pendingShops} lbl={t("admin.scPending")} icon="⏳" cls="sc-amber" />
          <StatCard num={rupee(stats.revenue)} lbl={t("admin.scRevenue")} icon="💰" cls="sc-green" />
        </div>
      )}

      {tab === "reports" && <AdminReports data={reports} />}

      {tab === "shops" && (
        <div className="card">
          {shops.length === 0 ? (
            <div className="empty">
              <div className="big">🏪</div>
              <p className="muted">{t("admin.noShops")}</p>
            </div>
          ) : (
          <div className="data-table">
          <table>
            <thead>
              <tr>
                <th>{t("admin.thShop")}</th>
                <th>{t("admin.thOwner")}</th>
                <th>{t("admin.thCategory")}</th>
                <th>{t("admin.thStatus")}</th>
                <th>{t("admin.thActions")}</th>
              </tr>
            </thead>
            <tbody>
              {shops.map((s) => (
                <tr key={s._id}>
                  <td>{tc(s.name)}</td>
                  <td className="small muted">{s.owner?.email}</td>
                  <td>
                    <span className="badge badge-cat">{tc(s.category)}</span>
                  </td>
                  <td>
                    {s.isApproved ? (
                      <span className="badge badge-green">{t("admin.approved")}</span>
                    ) : (
                      <span className="badge badge-amber">{t("admin.pending")}</span>
                    )}
                  </td>
                  <td>
                    {s.isApproved ? (
                      <button className="btn btn-ghost btn-sm" onClick={() => approveShop(s, false)}>
                        {t("admin.unapprove")}
                      </button>
                    ) : (
                      <button className="btn btn-sm" onClick={() => approveShop(s, true)}>
                        {t("admin.approve")}
                      </button>
                    )}{" "}
                    <button className="btn btn-danger btn-sm" onClick={() => deleteShop(s)}>
                      {t("admin.delete")}
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
              <p className="muted">{t("admin.noUsers")}</p>
            </div>
          ) : (
          <div className="data-table">
          <table>
            <thead>
              <tr>
                <th>{t("admin.thName")}</th>
                <th>{t("admin.thEmail")}</th>
                <th>{t("admin.thRole")}</th>
                <th>{t("admin.thActions")}</th>
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
                      {t("admin.delete")}
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
              <p className="muted">{t("admin.noOrders")}</p>
            </div>
          ) : (
          <div className="data-table">
          <table>
            <thead>
              <tr>
                <th>{t("admin.thOrder")}</th>
                <th>{t("admin.thCustomer")}</th>
                <th>{t("admin.thShop")}</th>
                <th>{t("admin.thTotal")}</th>
                <th>{t("admin.thPayment")}</th>
                <th>{t("admin.thStatus")}</th>
              </tr>
            </thead>
            <tbody>
              {orders.map((o) => (
                <tr key={o._id}>
                  <td>#{o.orderNo}</td>
                  <td>{o.customer?.name}</td>
                  <td>{tc(o.shop?.name)}</td>
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
            <h3 style={{ marginTop: 0 }}>{t("admin.addBanner")}</h3>
            <p className="muted small" style={{ marginTop: -6 }}>
              {t("admin.bannerHint")}
            </p>
            <form className="banner-form" onSubmit={addBanner}>
              <input
                placeholder={t("admin.bTitle")}
                value={newBanner.title}
                onChange={(e) => setNewBanner((b) => ({ ...b, title: e.target.value }))}
              />
              <input
                placeholder={t("admin.bSubtitle")}
                value={newBanner.subtitle}
                onChange={(e) => setNewBanner((b) => ({ ...b, subtitle: e.target.value }))}
              />
              <input
                placeholder={t("admin.bImage")}
                value={newBanner.image}
                onChange={(e) => setNewBanner((b) => ({ ...b, image: e.target.value }))}
              />
              <input
                placeholder={t("admin.bLink")}
                value={newBanner.link}
                onChange={(e) => setNewBanner((b) => ({ ...b, link: e.target.value }))}
              />
              <input
                placeholder={t("admin.bCta")}
                value={newBanner.cta}
                onChange={(e) => setNewBanner((b) => ({ ...b, cta: e.target.value }))}
              />
              <input
                type="number"
                placeholder={t("admin.bOrder")}
                value={newBanner.order}
                onChange={(e) => setNewBanner((b) => ({ ...b, order: e.target.value }))}
                style={{ maxWidth: 100 }}
              />
              <button className="btn" type="submit">
                {t("admin.addBannerBtn")}
              </button>
            </form>
          </div>

          <div className="card">
            {banners.length === 0 ? (
              <div className="empty">
                <div className="big">🖼️</div>
                <p className="muted">{t("admin.noBanners")}</p>
              </div>
            ) : (
              <div className="data-table">
                <table>
                  <thead>
                    <tr>
                      <th>{t("admin.thArt")}</th>
                      <th>{t("admin.thTitle")}</th>
                      <th>{t("admin.thLink")}</th>
                      <th>{t("admin.bOrder")}</th>
                      <th>{t("admin.thStatus")}</th>
                      <th>{t("admin.thActions")}</th>
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
                            <span className="badge badge-green">{t("admin.active")}</span>
                          ) : (
                            <span className="badge badge-amber">{t("admin.hidden")}</span>
                          )}
                        </td>
                        <td>
                          <button className="btn btn-ghost btn-sm" onClick={() => toggleBanner(b)}>
                            {b.isActive ? t("admin.hide") : t("admin.show")}
                          </button>{" "}
                          <button className="btn btn-danger btn-sm" onClick={() => deleteBanner(b)}>
                            {t("admin.delete")}
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
  const { t, tc } = useLang();
  if (!data) return <div className="loading">{t("admin.loadingReport")}</div>;

  const { totals, byDay = [], shopRanking = [] } = data;
  const maxDay = Math.max(1, ...byDay.map((d) => d.revenue));

  return (
    <>
      <div className="kpi-grid mb">
        <div className="kpi">
          <div className="kpi-label">{t("admin.earnedRevenue")}</div>
          <div className="kpi-value">{rupee(totals.revenue)}</div>
        </div>
        <div className="kpi">
          <div className="kpi-label">{t("admin.deliveredOrders")}</div>
          <div className="kpi-value">{totals.deliveredOrders}</div>
        </div>
        <div className="kpi">
          <div className="kpi-label">{t("admin.avgOrder")}</div>
          <div className="kpi-value">{rupee(totals.avgOrder)}</div>
        </div>
        <div className="kpi">
          <div className="kpi-label">{t("admin.itemsSold")}</div>
          <div className="kpi-value">{totals.items}</div>
        </div>
        <div className="kpi">
          <div className="kpi-label">{t("admin.activeShops")}</div>
          <div className="kpi-value">{totals.activeShops}</div>
        </div>
      </div>

      <div className="card mb">
        <h3 style={{ marginTop: 0 }}>{t("admin.revenue14")}</h3>
        <p className="muted small" style={{ marginTop: -6 }}>
          {t("admin.revenue14Hint")}
        </p>
        {byDay.every((d) => d.revenue === 0) ? (
          <div className="empty">
            <div className="big">📉</div>
            <p className="muted">{t("admin.noRevenue")}</p>
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
        <h3 style={{ marginTop: 0 }}>{t("admin.shopRanking")}</h3>
        <p className="muted small" style={{ marginTop: -6 }}>
          {t("admin.shopRankingHint")}
        </p>
        {shopRanking.length === 0 ? (
          <div className="empty">
            <div className="big">🏪</div>
            <p className="muted">{t("admin.noRanking")}</p>
          </div>
        ) : (
          <div className="data-table">
            <table>
              <thead>
                <tr>
                  <th>{t("admin.thRank")}</th>
                  <th>{t("admin.thShop")}</th>
                  <th>{t("admin.thCategory")}</th>
                  <th>{t("admin.thRevenue")}</th>
                  <th>{t("admin.tabOrders")}</th>
                  <th>{t("admin.thItems")}</th>
                </tr>
              </thead>
              <tbody>
                {shopRanking.map((s) => (
                  <tr key={s.shopId}>
                    <td>
                      <span className={`rank-badge${s.rank <= 3 ? " top" : ""}`}>#{s.rank}</span>
                    </td>
                    <td>{tc(s.name)}</td>
                    <td>
                      {s.category ? <span className="badge badge-cat">{tc(s.category)}</span> : "—"}
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
