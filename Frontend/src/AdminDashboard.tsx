import React, { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  LineChart, Line, CartesianGrid,
} from "recharts";
import {
  LayoutDashboard, Building2, CreditCard, Users,
  KeyRound, LogOut, ChevronDown, ChevronUp,
} from "lucide-react";
import "./Style/Admin.css";

const API = import.meta.env.VITE_API_URL;

const getToken = () => localStorage.getItem("adminToken");

const getAdminUsername = () => {
  try {
    const token = getToken();
    if (!token) return "Admin";
    const payload = JSON.parse(atob(token.split(".")[1]));
    return payload.username ?? "Admin";
  } catch {
    return "Admin";
  }
};

type Stats = {
  totalUsers:    number;
  totalAdmins:   number;
  activeUsers:   number;
  totalProducts: number;
  totalSales:    number;
  totalExpenses: number;
  totalProfit:   number;
};

type PlanType   = "trial" | "subscription" | "full";
type PlanStatus = "active" | "overdue" | "expired" | "cancelled";

type Business = {
  businessId:        string;
  ownerName:         string;
  username:          string;
  email:             string;
  userStatus:        boolean;
  staffCount:        number;
  productCount:      number;
  totalSales:        number;
  totalExpenses:     number;
  createdAt:         string;
  planType:          PlanType | null;
  planStatus:        PlanStatus | null;
  paidAmount:        number;
  totalAmount:       number;
  installmentMonths: number | null;
  lastLogin:         string | null;
};

type User = {
  userId:     string;
  username:   string;
  Fname:      string;
  Lname:      string;
  email:      string;
  role:       string;
  userStatus: boolean;
  createdAt:  string;
};

type Subscription = {
  businessId:        string;
  ownerName:         string;
  email:             string;
  planType:          PlanType;
  planStatus:        PlanStatus;
  startDate:         string;
  endDate:           string;
  totalAmount:       number;
  paidAmount:        number;
  installmentMonths: number | null;
  lastLogin:         string | null;
};

const mockRevenueData = [
  { month: "Nov", revenue: 18 },
  { month: "Dec", revenue: 27 },
  { month: "Jan", revenue: 33 },
  { month: "Feb", revenue: 21 },
  { month: "Mar", revenue: 45 },
  { month: "Apr", revenue: 39 },
];

const fmt    = (n: number) => n?.toFixed(3) ?? "0.000";
const fmtBHD = (n: number) => `BHD ${n.toFixed(3)}`;

const formatDate = (d: string) =>
  new Date(d).toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" });

const formatLastLogin = (d: string) => {
  const diff  = Date.now() - new Date(d).getTime();
  const hours = Math.floor(diff / 3600000);
  if (hours < 1)  return "Just now";
  if (hours < 24) return `${hours}h ago`;
  return `${Math.floor(hours / 24)}d ago`;
};

const planLabel: Record<PlanType, string> = {
  trial:        "Free Trial",
  subscription: "Monthly",
  full:         "Full Purchase",
};

const planColor: Record<PlanType, string> = {
  trial:        "#54768B",
  subscription: "#2F4157",
  full:         "#EFB036",
};

const statusColor: Record<PlanStatus, { bg: string; color: string }> = {
  active:    { bg: "#e8f5e9", color: "#2e7d32" },
  overdue:   { bg: "#fff3e0", color: "#e65100" },
  expired:   { bg: "#fde8e8", color: "#c0392b" },
  cancelled: { bg: "#f5f5f5", color: "#888"    },
};

// ── Change Password Modal ──────────────────────
const ChangePasswordModal = ({ onClose }: { onClose: () => void }) => {
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword,     setNewPassword]     = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error,           setError]           = useState("");
  const [success,         setSuccess]         = useState("");
  const [loading,         setLoading]         = useState(false);

  const handleSubmit = async () => {
    setError(""); setSuccess("");
    if (!currentPassword || !newPassword || !confirmPassword) { setError("All fields are required."); return; }
    if (newPassword.length < 6) { setError("New password must be at least 6 characters."); return; }
    if (newPassword !== confirmPassword) { setError("New passwords don't match."); return; }
    setLoading(true);
    try {
      const res  = await fetch(`${API}/admin/change-password`, {
        method: "PUT",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${getToken()}` },
        body: JSON.stringify({ currentPassword, newPassword }),
      });
      const data = await res.json();
      if (res.ok) { setSuccess("Password changed successfully!"); setTimeout(onClose, 1500); }
      else { setError(data.message ?? "Failed to change password."); }
    } catch { setError("Something went wrong."); }
    finally { setLoading(false); }
  };

  return (
    <div className="ad-modal-overlay" onClick={onClose}>
      <div className="ad-modal" onClick={e => e.stopPropagation()}>
        <div className="ad-modal-header">
          <div><h2>Change Password</h2><p className="ad-modal-sub">Update your Super Admin password</p></div>
          <button className="ad-modal-close" onClick={onClose}>✕</button>
        </div>
        <div className="ad-modal-section">
          <label className="ad-modal-label">Current Password</label>
          <input className="payment-input" type="password" placeholder="Enter current password" value={currentPassword} onChange={e => setCurrentPassword(e.target.value)} />
        </div>
        <div className="ad-modal-section">
          <label className="ad-modal-label">New Password</label>
          <input className="payment-input" type="password" placeholder="Enter new password (min 6 characters)" value={newPassword} onChange={e => setNewPassword(e.target.value)} />
        </div>
        <div className="ad-modal-section">
          <label className="ad-modal-label">Confirm New Password</label>
          <input className="payment-input" type="password" placeholder="Confirm new password" value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)} onKeyDown={e => e.key === "Enter" && handleSubmit()} />
        </div>
        {error   && <p style={{ color: "#c0392b", fontSize: "13px", padding: "0 24px", fontWeight: 600 }}>{error}</p>}
        {success && <p style={{ color: "#2e7d32", fontSize: "13px", padding: "0 24px", fontWeight: 600 }}>{success}</p>}
        <div className="ad-modal-actions">
          <button className="ad-cancel-btn" onClick={onClose}>Cancel</button>
          <button className="ad-save-btn" onClick={handleSubmit} disabled={loading}>{loading ? "Saving..." : "Change Password"}</button>
        </div>
      </div>
    </div>
  );
};

// ── Manage Modal ───────────────────────────────
const ManageModal = ({
  business, onClose, onSave,
}: {
  business: Business;
  onClose: () => void;
  onSave: (updates: { userStatus: boolean; planType: PlanType; extendMonths: number }) => void;
}) => {
  const [userStatus,   setUserStatus]   = useState(business.userStatus);
  const [planType,     setPlanType]     = useState<PlanType>(business.planType ?? "subscription");
  const [extendMonths, setExtendMonths] = useState(0);

  return (
    <div className="ad-modal-overlay" onClick={onClose}>
      <div className="ad-modal" onClick={e => e.stopPropagation()}>
        <div className="ad-modal-header">
          <div><h2>{business.ownerName}</h2><p className="ad-modal-sub">@{business.username} · {business.email}</p></div>
          <button className="ad-modal-close" onClick={onClose}>✕</button>
        </div>
        <div className="ad-modal-section">
          <label className="ad-modal-label">Business Status</label>
          <div className="ad-toggle-row">
            <button className={`ad-toggle-option ${userStatus ? "active-green" : ""}`}  onClick={() => setUserStatus(true)}>✓ Active</button>
            <button className={`ad-toggle-option ${!userStatus ? "active-red" : ""}`}   onClick={() => setUserStatus(false)}>✕ Disabled</button>
          </div>
        </div>
        <div className="ad-modal-section">
          <label className="ad-modal-label">Plan Type</label>
          <div className="ad-toggle-row">
            {(["trial", "subscription", "full"] as PlanType[]).map(p => (
              <button key={p} className={`ad-toggle-option ${planType === p ? "active-blue" : ""}`} onClick={() => setPlanType(p)}>{planLabel[p]}</button>
            ))}
          </div>
        </div>
        <div className="ad-modal-section">
          <label className="ad-modal-label">Extend Subscription (months)</label>
          <div className="ad-toggle-row">
            {[0, 1, 3, 6, 12].map(m => (
              <button key={m} className={`ad-toggle-option ${extendMonths === m ? "active-blue" : ""}`} onClick={() => setExtendMonths(m)}>{m === 0 ? "No change" : `+${m}mo`}</button>
            ))}
          </div>
        </div>
        <div className="ad-modal-actions">
          <button className="ad-cancel-btn" onClick={onClose}>Cancel</button>
          <button className="ad-save-btn" onClick={() => { onSave({ userStatus, planType, extendMonths }); onClose(); }}>Save Changes</button>
        </div>
      </div>
    </div>
  );
};

// ── Payment Modal ──────────────────────────────
const PaymentModal = ({
  sub, onClose, onSave,
}: {
  sub: Subscription;
  onClose: () => void;
  onSave: (amount: number) => void;
}) => {
  const [amount, setAmount] = useState("");
  const remaining        = sub.totalAmount - sub.paidAmount;
  const suggestedMonthly = sub.installmentMonths
    ? (sub.totalAmount / sub.installmentMonths).toFixed(3)
    : remaining.toFixed(3);

  return (
    <div className="ad-modal-overlay" onClick={onClose}>
      <div className="ad-modal" onClick={e => e.stopPropagation()}>
        <div className="ad-modal-header">
          <div><h2>Record Payment</h2><p className="ad-modal-sub">{sub.ownerName} · {sub.email}</p></div>
          <button className="ad-modal-close" onClick={onClose}>✕</button>
        </div>
        <div className="ad-modal-section">
          <div className="payment-summary">
            <div className="payment-summary-row"><span>Plan</span><strong>{planLabel[sub.planType]}{sub.installmentMonths && ` · ${sub.installmentMonths} months`}</strong></div>
            <div className="payment-summary-row"><span>Total Amount</span><strong>{fmtBHD(sub.totalAmount)}</strong></div>
            <div className="payment-summary-row"><span>Already Paid</span><strong className="paid-val">{fmtBHD(sub.paidAmount)}</strong></div>
            <div className="payment-summary-row highlight"><span>Remaining</span><strong className="remaining-val">{fmtBHD(remaining)}</strong></div>
          </div>
          <label className="ad-modal-label" style={{ marginTop: "16px" }}>Payment Amount (BHD)</label>
          <input className="payment-input" type="number" step="0.001" max={remaining} value={amount} onChange={e => setAmount(e.target.value)} placeholder={`Suggested: BHD ${suggestedMonthly}`} />
          {sub.installmentMonths && <button className="payment-autofill-btn" onClick={() => setAmount(suggestedMonthly)}>Use monthly installment — BHD {suggestedMonthly}</button>}
        </div>
        <div className="ad-modal-actions">
          <button className="ad-cancel-btn" onClick={onClose}>Cancel</button>
          <button className="ad-save-btn" onClick={() => {
            const amt = parseFloat(amount);
            if (!amt || amt <= 0 || amt > remaining) { alert(`Please enter a valid amount between BHD 0.001 and ${fmtBHD(remaining)}`); return; }
            onSave(amt); onClose();
          }}>Confirm Payment</button>
        </div>
      </div>
    </div>
  );
};

// ── Main Dashboard ─────────────────────────────
const AdminDashboard = () => {
  const [stats,           setStats]           = useState<Stats | null>(null);
  const [businesses,      setBusinesses]      = useState<Business[]>([]);
  const [users,           setUsers]           = useState<User[]>([]);
  const [subscriptions,   setSubscriptions]   = useState<Subscription[]>([]);
  const [activeTab,       setActiveTab]       = useState<"overview" | "businesses" | "subscriptions" | "users">("overview");
  const [search,          setSearch]          = useState("");
  const [loading,         setLoading]         = useState(true);
  const [manageBusiness,  setManageBusiness]  = useState<Business | null>(null);
  const [paymentSub,      setPaymentSub]      = useState<Subscription | null>(null);
  const [showAccountMenu, setShowAccountMenu] = useState(false);
  const [showChangePass,  setShowChangePass]  = useState(false);
  const accountMenuRef = useRef<HTMLDivElement>(null);
  const navigate       = useNavigate();
  const adminUsername  = getAdminUsername();

  useEffect(() => {
    const token = getToken();
    if (!token) { navigate("/admin-login"); return; }
    fetchAll();
  }, []);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (accountMenuRef.current && !accountMenuRef.current.contains(e.target as Node)) {
        setShowAccountMenu(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const fetchAll = async () => {
    try {
      const [statsRes, bizRes, usersRes, subsRes] = await Promise.all([
        fetch(`${API}/admin/stats`,         { headers: { Authorization: `Bearer ${getToken()}` } }),
        fetch(`${API}/admin/businesses`,    { headers: { Authorization: `Bearer ${getToken()}` } }),
        fetch(`${API}/admin/users`,         { headers: { Authorization: `Bearer ${getToken()}` } }),
        fetch(`${API}/admin/subscriptions`, { headers: { Authorization: `Bearer ${getToken()}` } }),
      ]);
      if (statsRes.status === 401) { navigate("/admin-login"); return; }
      const [statsData, bizData, usersData, subsData] = await Promise.all([
        statsRes.json(), bizRes.json(), usersRes.json(), subsRes.json(),
      ]);
      if (statsRes.ok) setStats(statsData.stats ?? null);
      if (bizRes.ok)   setBusinesses(bizData.businesses ?? []);
      if (usersRes.ok) setUsers(usersData.users ?? []);
      if (subsRes.ok) {
        setSubscriptions((subsData.subscriptions ?? []).map((s: any) => ({
          businessId: s.businessId, ownerName: s.ownerName, email: s.email,
          planType: s.planType, planStatus: s.planStatus, startDate: s.startDate,
          endDate: s.endDate, totalAmount: s.totalAmount, paidAmount: s.paidAmount,
          installmentMonths: s.installmentMonths ?? null, lastLogin: s.lastLogin ?? null,
        })));
      }
    } catch (err) { console.error("fetchAll error:", err); }
    finally { setLoading(false); }
  };

  const handleLogout = async () => {
    await fetch(`${API}/admin/logout`, { method: "POST", headers: { Authorization: `Bearer ${getToken()}` } });
    localStorage.removeItem("adminToken");
    navigate("/admin-login");
  };

  const handleManageSave = async (businessId: string, updates: { userStatus: boolean; planType: PlanType; extendMonths: number }) => {
    try {
      await fetch(`${API}/admin/toggleUser`, { method: "PUT", headers: { "Content-Type": "application/json", Authorization: `Bearer ${getToken()}` }, body: JSON.stringify({ userId: businessId, userStatus: updates.userStatus }) });
      const currentBiz = businesses.find(b => b.businessId === businessId);
      if (currentBiz?.planType !== updates.planType) {
        await fetch(`${API}/subscriptions/`, { method: "POST", headers: { "Content-Type": "application/json", Authorization: `Bearer ${getToken()}` }, body: JSON.stringify({ businessId, planType: updates.planType }) });
      }
      if (updates.extendMonths > 0) {
        await fetch(`${API}/subscriptions/extend`, { method: "PUT", headers: { "Content-Type": "application/json", Authorization: `Bearer ${getToken()}` }, body: JSON.stringify({ businessId, months: updates.extendMonths }) });
      }
      await fetchAll();
    } catch (err) { console.error("handleManageSave error:", err); }
  };

  const handleRecordPayment = async (businessId: string, amount: number) => {
    try {
      const res = await fetch(`${API}/subscriptions/pay`, { method: "PUT", headers: { "Content-Type": "application/json", Authorization: `Bearer ${getToken()}` }, body: JSON.stringify({ businessId, amount }) });
      if (res.ok) { await fetchAll(); } else { alert("Failed to record payment. Please try again."); }
    } catch (err) { console.error("handleRecordPayment error:", err); alert("Something went wrong."); }
  };

  const totalRevenue    = subscriptions.reduce((s, sub) => s + sub.paidAmount, 0);
  const activeCount     = subscriptions.filter(s => s.planStatus === "active").length;
  const overdueCount    = subscriptions.filter(s => s.planStatus === "overdue").length;
  const fullBuyersCount = subscriptions.filter(s => s.planType === "full").length;

  const filteredBusinesses = businesses.filter(b => b.ownerName.toLowerCase().includes(search.toLowerCase()) || b.email.toLowerCase().includes(search.toLowerCase()));
  const filteredUsers      = users.filter(u => `${u.Fname} ${u.Lname}`.toLowerCase().includes(search.toLowerCase()) || u.email.toLowerCase().includes(search.toLowerCase()));
  const filteredSubs       = subscriptions.filter(s => s.ownerName.toLowerCase().includes(search.toLowerCase()) || s.email.toLowerCase().includes(search.toLowerCase()));

  const tabLabels: Record<string, string> = {
    overview: "System Overview", businesses: "Businesses",
    subscriptions: "Subscriptions", users: "All Users",
  };

  const navItems = [
    { key: "overview",      label: "Overview",      icon: <LayoutDashboard size={16} /> },
    { key: "businesses",    label: "Businesses",    icon: <Building2       size={16} /> },
    { key: "subscriptions", label: "Subscriptions", icon: <CreditCard      size={16} /> },
    { key: "users",         label: "All Users",     icon: <Users           size={16} /> },
  ] as const;

  return (
    <div className="ad-dashboard">
      <aside className="ad-sidebar">

        {/* ── Logo — centered ── */}
        <div className="ad-sidebar-logo">
          <img src="/images/HLogo.png" alt="Hessabi" style={{ height: "32px", filter: "brightness(0) invert(1)" }} />
        </div>

        {/* ── Nav ── */}
        <nav className="ad-nav">
          {navItems.map(({ key, label, icon }) => (
            <button
              key={key}
              className={activeTab === key ? "active" : ""}
              onClick={() => { setActiveTab(key); setSearch(""); }}
            >
              {icon}
              {label}
            </button>
          ))}
        </nav>

        {/* ── Account Menu ── */}
        <div className="ad-account-wrapper" ref={accountMenuRef}>

          {/* Dropdown — renders ABOVE the button */}
          {showAccountMenu && (
            <div className="ad-account-menu">
              <button className="ad-account-menu-item" onClick={() => { setShowChangePass(true); setShowAccountMenu(false); }}>
                <KeyRound size={14} /> Change Password
              </button>
              <div className="ad-account-menu-divider" />
              <button className="ad-account-menu-item danger" onClick={handleLogout}>
                <LogOut size={14} /> Logout
              </button>
            </div>
          )}

          <button className="ad-account-btn" onClick={() => setShowAccountMenu(prev => !prev)}>
            <div className="ad-account-avatar">{adminUsername.charAt(0).toUpperCase()}</div>
            <div className="ad-account-info">
              <span className="ad-account-name">{adminUsername}</span>
              <span className="ad-account-role">Super Admin</span>
            </div>
            {showAccountMenu ? <ChevronUp size={14} color="rgba(255,255,255,0.5)" /> : <ChevronDown size={14} color="rgba(255,255,255,0.5)" />}
          </button>
        </div>
      </aside>

      <main className="ad-main">
        <div className="ad-topbar">
          <h1>{tabLabels[activeTab]}</h1>
          {activeTab !== "overview" && (
            <input className="search-input" placeholder="Search..." value={search} onChange={e => setSearch(e.target.value)} style={{ width: "280px" }} />
          )}
        </div>

        {loading ? <p className="empty-msg">Loading...</p> : (
          <>
            {/* ── OVERVIEW ── */}
            {activeTab === "overview" && stats && (
              <>
                <div className="ad-cards">
                  <div className="ad-card"><p className="ad-card-label">Total Businesses</p><p className="ad-card-value" style={{ color: "#2F4157" }}>{stats.totalAdmins}</p></div>
                  <div className="ad-card"><p className="ad-card-label">Total Users</p><p className="ad-card-value" style={{ color: "#2F4157" }}>{stats.totalUsers}</p></div>
                  <div className="ad-card"><p className="ad-card-label">Active Users</p><p className="ad-card-value green">{stats.activeUsers}</p></div>
                  <div className="ad-card"><p className="ad-card-label">Total Products</p><p className="ad-card-value" style={{ color: "#2F4157" }}>{stats.totalProducts}</p></div>
                </div>
                <div className="ad-cards" style={{ marginTop: "0" }}>
                  <div className="ad-card ad-card-highlight"><p className="ad-card-label">Hessabi Revenue</p><p className="ad-card-value green">{fmtBHD(totalRevenue)}</p><span className="ad-card-sub">All time collected</span></div>
                  <div className="ad-card"><p className="ad-card-label">Active Subscriptions</p><p className="ad-card-value green">{activeCount}</p></div>
                  <div className="ad-card"><p className="ad-card-label">Overdue Payments</p><p className="ad-card-value" style={{ color: overdueCount > 0 ? "#c0392b" : "#2F4157" }}>{overdueCount}</p></div>
                  <div className="ad-card"><p className="ad-card-label">Full Buyers</p><p className="ad-card-value" style={{ color: "#EFB036" }}>{fullBuyersCount}</p></div>
                </div>
                <div className="ad-charts-row">
                  <div className="ad-chart-card">
                    <h3>Monthly Revenue (BHD)</h3>
                    <ResponsiveContainer width="100%" height={220}>
                      <LineChart data={mockRevenueData}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                        <XAxis dataKey="month" tick={{ fontSize: 12, fill: "#888" }} />
                        <YAxis tick={{ fontSize: 12, fill: "#888" }} />
                        <Tooltip formatter={(v: any) => [`BHD ${Number(v).toFixed(3)}`, "Revenue"]} />
                        <Line type="monotone" dataKey="revenue" stroke="#2F4157" strokeWidth={2.5} dot={{ fill: "#2F4157", r: 4 }} />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                  <div className="ad-chart-card">
                    <h3>Platform Financials</h3>
                    <div className="ad-stat-rows">
                      <div className="ad-stat-row"><span>Platform Sales</span><span className="green-val">BHD {fmt(stats.totalSales)}</span></div>
                      <div className="ad-stat-row"><span>Platform Expenses</span><span className="yellow-val">BHD {fmt(stats.totalExpenses)}</span></div>
                      <div className="ad-stat-row"><span>Platform Profit</span><span className={stats.totalProfit >= 0 ? "green-val" : "red-val"}>BHD {fmt(stats.totalProfit)}</span></div>
                      <div className="ad-stat-divider" />
                      <div className="ad-stat-row"><span>Hessabi Revenue</span><span className="green-val">{fmtBHD(totalRevenue)}</span></div>
                      <div className="ad-stat-row"><span>Overdue Businesses</span><span className="red-val">{overdueCount}</span></div>
                    </div>
                  </div>
                </div>
                <div className="ad-chart-card" style={{ marginTop: "16px" }}>
                  <h3>Recent Businesses</h3>
                  <table className="sales-table">
                    <thead><tr><th>Owner</th><th>Email</th><th>Staff</th><th>Sales</th><th>Plan</th><th>Status</th><th>Joined</th></tr></thead>
                    <tbody>
                      {businesses.slice(0, 5).map(b => (
                        <tr key={b.businessId} className="sale-row">
                          <td><strong>{b.ownerName}</strong><br /><span style={{ color: "#888", fontSize: "12px" }}>@{b.username}</span></td>
                          <td>{b.email}</td><td>{b.staffCount}</td>
                          <td className="sale-amount">BHD {fmt(b.totalSales)}</td>
                          <td>{b.planType ? <span className="ad-plan-badge" style={{ background: `${planColor[b.planType]}20`, color: planColor[b.planType] }}>{planLabel[b.planType]}</span> : <span style={{ color: "#ccc" }}>—</span>}</td>
                          <td><span className={`status-toggle ${b.userStatus ? "active" : "inactive"}`}>{b.userStatus ? "Active" : "Disabled"}</span></td>
                          <td>{formatDate(b.createdAt)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </>
            )}

            {/* ── BUSINESSES ── */}
            {activeTab === "businesses" && (
              <div className="sales-table-wrapper">
                <table className="sales-table">
                  <thead><tr><th>Owner</th><th>Email</th><th>Staff</th><th>Products</th><th>Total Sales</th><th>Plan</th><th>Payment</th><th>Last Login</th><th>Status</th></tr></thead>
                  <tbody>
                    {filteredBusinesses.map(b => {
                      const sc = b.planStatus ? statusColor[b.planStatus] : null;
                      return (
                        <tr key={b.businessId} className="sale-row">
                          <td><strong>{b.ownerName}</strong><br /><span style={{ color: "#888", fontSize: "12px" }}>@{b.username}</span></td>
                          <td>{b.email}</td><td>{b.staffCount}</td><td>{b.productCount}</td>
                          <td className="sale-amount">BHD {fmt(b.totalSales)}</td>
                          <td>{b.planType ? <span className="ad-plan-badge" style={{ background: `${planColor[b.planType]}20`, color: planColor[b.planType] }}>{planLabel[b.planType]}</span> : <span style={{ color: "#ccc" }}>—</span>}</td>
                          <td>{b.planStatus && sc ? <span className="ad-status-pill" style={{ background: sc.bg, color: sc.color }}>{b.planStatus.charAt(0).toUpperCase() + b.planStatus.slice(1)}</span> : <span style={{ color: "#ccc" }}>—</span>}</td>
                          <td style={{ color: "#888", fontSize: "13px" }}>{b.lastLogin ? formatLastLogin(b.lastLogin) : "—"}</td>
                          <td><span className={`status-toggle ${b.userStatus ? "active" : "inactive"}`}>{b.userStatus ? "Active" : "Disabled"}</span></td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}

            {/* ── SUBSCRIPTIONS ── */}
            {activeTab === "subscriptions" && (
              <>
                <div className="ad-cards" style={{ marginBottom: "24px" }}>
                  <div className="ad-card ad-card-highlight"><p className="ad-card-label">Total Revenue</p><p className="ad-card-value green">{fmtBHD(totalRevenue)}</p></div>
                  <div className="ad-card"><p className="ad-card-label">Active Plans</p><p className="ad-card-value green">{activeCount}</p></div>
                  <div className="ad-card"><p className="ad-card-label">Overdue</p><p className="ad-card-value" style={{ color: "#c0392b" }}>{overdueCount}</p></div>
                  <div className="ad-card"><p className="ad-card-label">Full Buyers</p><p className="ad-card-value" style={{ color: "#EFB036" }}>{fullBuyersCount}</p></div>
                </div>
                <div className="ad-chart-card" style={{ marginBottom: "24px" }}>
                  <h3>Revenue by Month (BHD)</h3>
                  <ResponsiveContainer width="100%" height={200}>
                    <BarChart data={mockRevenueData}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                      <XAxis dataKey="month" tick={{ fontSize: 12, fill: "#888" }} />
                      <YAxis tick={{ fontSize: 12, fill: "#888" }} />
                      <Tooltip formatter={(v: any) => [`BHD ${Number(v).toFixed(3)}`, "Revenue"]} />
                      <Bar dataKey="revenue" fill="#2F4157" radius={[6, 6, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
                <div className="sales-table-wrapper">
                  <table className="sales-table">
                    <thead><tr><th>Business</th><th>Plan</th><th>Status</th><th>Start Date</th><th>End Date</th><th>Total</th><th>Paid</th><th>Remaining</th><th>Days Left</th><th>Action</th></tr></thead>
                    <tbody>
                      {filteredSubs.map(s => {
                        const sc        = statusColor[s.planStatus];
                        const remaining = s.totalAmount - s.paidAmount;
                        const daysLeft  = s.endDate ? Math.ceil((new Date(s.endDate).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24)) : null;
                        return (
                          <tr key={s.businessId} className="sale-row">
                            <td><strong>{s.ownerName}</strong><br /><span style={{ color: "#888", fontSize: "12px" }}>{s.email}</span></td>
                            <td><span className="ad-plan-badge" style={{ background: `${planColor[s.planType]}20`, color: planColor[s.planType] }}>{planLabel[s.planType]}{s.installmentMonths && ` · ${s.installmentMonths}mo`}</span></td>
                            <td><span className="ad-status-pill" style={{ background: sc.bg, color: sc.color }}>{s.planStatus.charAt(0).toUpperCase() + s.planStatus.slice(1)}</span></td>
                            <td style={{ fontSize: "13px" }}>{formatDate(s.startDate)}</td>
                            <td style={{ fontSize: "13px" }}>{s.endDate ? formatDate(s.endDate) : "—"}</td>
                            <td className="sale-amount">{fmtBHD(s.totalAmount)}</td>
                            <td style={{ color: "#2e7d32", fontWeight: 700 }}>{fmtBHD(s.paidAmount)}</td>
                            <td style={{ color: remaining > 0 ? "#c0392b" : "#2e7d32", fontWeight: 700 }}>{fmtBHD(remaining)}</td>
                            <td style={{ fontSize: "13px", fontWeight: 700 }}>
                              {daysLeft === null ? <span style={{ color: "#888" }}>—</span> : daysLeft < 0 ? <span style={{ color: "#c0392b" }}>Expired</span> : daysLeft <= 3 ? <span style={{ color: "#e65100" }}>{daysLeft}d ⚠️</span> : <span style={{ color: "#2e7d32" }}>{daysLeft}d left</span>}
                            </td>
                            <td>
                              <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
                                <button className="ad-manage-btn" onClick={() => { const biz = businesses.find(b => b.businessId === s.businessId); if (biz) setManageBusiness(biz); }}>Manage</button>
                                {s.planType === "full" && remaining > 0 && <button className="ad-manage-btn payment-btn" onClick={() => setPaymentSub(s)}>Record Payment</button>}
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </>
            )}

            {/* ── ALL USERS ── */}
            {activeTab === "users" && (
              <div className="sales-table-wrapper">
                <table className="sales-table">
                  <thead><tr><th>Name</th><th>Username</th><th>Email</th><th>Role</th><th>Status</th><th>Joined</th></tr></thead>
                  <tbody>
                    {filteredUsers.map(u => (
                      <tr key={u.userId} className="sale-row">
                        <td>{u.Fname} {u.Lname}</td>
                        <td className="invoice-num">@{u.username}</td>
                        <td>{u.email}</td>
                        <td><span className={`role-badge ${u.role === "Admin" ? "admin" : "accountant"}`}>{u.role}</span></td>
                        <td><span className={`status-toggle ${u.userStatus ? "active" : "inactive"}`}>{u.userStatus ? "Active" : "Disabled"}</span></td>
                        <td>{formatDate(u.createdAt)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </>
        )}
      </main>

      {manageBusiness && <ManageModal business={manageBusiness} onClose={() => setManageBusiness(null)} onSave={updates => handleManageSave(manageBusiness.businessId, updates)} />}
      {paymentSub     && <PaymentModal sub={paymentSub} onClose={() => setPaymentSub(null)} onSave={amount => handleRecordPayment(paymentSub.businessId, amount)} />}
      {showChangePass && <ChangePasswordModal onClose={() => setShowChangePass(false)} />}
    </div>
  );
};

export default AdminDashboard;