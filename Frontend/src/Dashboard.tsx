import React, { useState, useEffect, useRef } from "react";
import Header from "./components/Header";
import Sidebar from "./components/Sidebar";
import InstagramTab from "./components/InstagramTab";
import "./Style/Dashboard.css";
import "./Style/System.css";
import { Bot, LayoutDashboard, Sparkles } from "lucide-react";
import { FaInstagram } from "react-icons/fa";



const API = import.meta.env.VITE_API_URL;
const LOW_STOCK_THRESHOLD = 5;

type Summary = {
  totalSales: number;
  totalCost: number;
  grossProfit: number;
  totalExpenses: number;
  netProfit: number;
};

type Sale = {
  invoiceNumber: string;
  date: string;
  customerName: string;
  paymentMethod: string;
  items: any[];
  totalSales: number;
  totalCost: number;
  grossProfit: number;
  source: string;
  createdBy: string;
};

type Expense = {
  _id: string;
  date: string;
  category: string;
  amount: number;
  description: string;
  createdBy: string;
};

type Product = {
  productId: string;
  itemName: string;
  stock: number;
  sizes: { size: string; stock: number }[];
  active: boolean;
};

type ChatMessage = {
  role: "user" | "assistant";
  content: string;
};

type RangeFilter = "all" | "custom";

const CATEGORY_COLORS: Record<string, string> = {
  salary:      "#1e3a5f",
  rent:        "#e6a817",
  utilities:   "#2e7d32",
  delivery:    "#6a1b9a",
  marketing:   "#0277bd",
  maintenance: "#c0392b",
  supplies:    "#00838f",
};

const Dashboard = () => {
  const [sidebarOpen, setSidebarOpen]   = useState(true);
  const [summary, setSummary]           = useState<Summary | null>(null);
  const [sales, setSales]               = useState<Sale[]>([]);
  const [expenses, setExpenses]         = useState<Expense[]>([]);
  const [products, setProducts]         = useState<Product[]>([]);
  const [loading, setLoading]           = useState(true);
  const [range, setRange]               = useState<RangeFilter>("all");
  const [customFrom, setCustomFrom]     = useState("");
  const [customTo, setCustomTo]         = useState("");
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [aiLoading, setAiLoading]       = useState(false);
  const [autoInsight, setAutoInsight]   = useState("");
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [chatInput, setChatInput]       = useState("");
  const [chatLoading, setChatLoading]   = useState(false);
  const [activeTab, setActiveTab] = useState<"overview" | "chat" | "instagram">(() => {
    const params = new URLSearchParams(window.location.search);
    return params.get("ig") === "connected" ? "instagram" : "overview";
  });
  const chatEndRef = useRef<HTMLDivElement>(null);
  const datePickerRef = useRef<HTMLDivElement>(null);

  useEffect(() => { fetchAll(); }, []);
  useEffect(() => { chatEndRef.current?.scrollIntoView({ behavior: "smooth" }); }, [chatMessages]);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (datePickerRef.current && !datePickerRef.current.contains(e.target as Node)) {
        setShowDatePicker(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get("ig") === "connected") {
      window.history.replaceState({}, "", window.location.pathname);
    }
  }, []);

  const fetchAll = async () => {
    setLoading(true);
    try {
      const [summaryRes, salesRes, expensesRes, productsRes] = await Promise.all([
        fetch(`${API}/summary/getSummary`,    { headers: { Authorization: `Bearer ${localStorage.getItem("token")}` } }),
        fetch(`${API}/sales/viewSales`,       { headers: { Authorization: `Bearer ${localStorage.getItem("token")}` } }),
        fetch(`${API}/expenses/viewExpenses`, { headers: { Authorization: `Bearer ${localStorage.getItem("token")}` } }),
        fetch(`${API}/product/viewProducts`,  { headers: { Authorization: `Bearer ${localStorage.getItem("token")}` } }),
      ]);
      const summaryData  = await summaryRes.json();
      const salesData    = await salesRes.json();
      const expensesData = await expensesRes.json();
      const productsData = await productsRes.json();

      const s  = Array.isArray(salesData.sales)       ? salesData.sales       : [];
      const e  = Array.isArray(expensesData.expenses) ? expensesData.expenses : [];
      const p  = Array.isArray(productsData.products) ? productsData.products : [];
      const sm = summaryData.summary ?? null;

      setSummary(sm); setSales(s); setExpenses(e); setProducts(p);
      generateAutoInsight(s, e);
    } catch (err) {
      console.error("fetchAll error:", err);
    } finally {
      setLoading(false);
    }
  };

  const filterByRange = <T extends { date: string }>(data: T[]): T[] => {
    if (range === "custom" && customFrom && customTo) {
      const from = new Date(customFrom);
      const to   = new Date(customTo);
      to.setHours(23, 59, 59);
      return data.filter(d => {
        const date = new Date(d.date);
        return date >= from && date <= to;
      });
    }
    return data;
  };

  const filteredSales    = filterByRange(sales);
  const filteredExpenses = filterByRange(expenses);

  const useFiltered   = range !== "all";
  const totalRevenue  = useFiltered ? filteredSales.reduce((s, x) => s + x.totalSales,  0) : summary?.totalSales    ?? 0;
  const totalProfit   = useFiltered ? filteredSales.reduce((s, x) => s + x.grossProfit, 0) : summary?.grossProfit   ?? 0;
  const totalExpenses = useFiltered ? filteredExpenses.reduce((s, x) => s + x.amount,   0) : summary?.totalExpenses ?? 0;
  const netProfit     = useFiltered ? totalProfit - totalExpenses                           : summary?.netProfit     ?? 0;
  const margin        = totalRevenue > 0 ? ((netProfit / totalRevenue) * 100).toFixed(1) : "0.0";
  const avgOrderValue = filteredSales.length > 0 ? totalRevenue / filteredSales.length : 0;

  // Low stock
  const lowStockProducts = products.filter(p => {
    if (!p.active) return false;
    if (p.sizes?.length > 0) return p.sizes.some(s => s.stock <= LOW_STOCK_THRESHOLD);
    return p.stock <= LOW_STOCK_THRESHOLD;
  });
  const getStockLabel = (p: Product) => {
    if (p.sizes?.length > 0)
      return p.sizes.filter(s => s.stock <= LOW_STOCK_THRESHOLD).map(s => `Size ${s.size}: ${s.stock}`).join(", ");
    return `${p.stock} left`;
  };

  // Top products
  const productMap: Record<string, { revenue: number; qty: number }> = {};
  filteredSales.forEach(sale =>
    sale.items.forEach((item: any) => {
      if (!productMap[item.itemName]) productMap[item.itemName] = { revenue: 0, qty: 0 };
      productMap[item.itemName].revenue += item.itemTotalPrice ?? 0;
      productMap[item.itemName].qty     += item.quantity       ?? 0;
    })
  );
  const topProducts = Object.entries(productMap).sort((a, b) => b[1].revenue - a[1].revenue).slice(0, 5);

  // Monthly breakdown
  const monthMap: Record<string, { revenue: number; profit: number; expenses: number }> = {};
  sales.forEach(s => {
    const key = new Date(s.date).toLocaleDateString("en-US", { year: "numeric", month: "short" });
    if (!monthMap[key]) monthMap[key] = { revenue: 0, profit: 0, expenses: 0 };
    monthMap[key].revenue += s.totalSales;
    monthMap[key].profit  += s.grossProfit;
  });
  expenses.forEach(e => {
    const key = new Date(e.date).toLocaleDateString("en-US", { year: "numeric", month: "short" });
    if (!monthMap[key]) monthMap[key] = { revenue: 0, profit: 0, expenses: 0 };
    monthMap[key].expenses += e.amount;
  });
  const monthlyData     = Object.entries(monthMap).slice(-6);
  const maxMonthRevenue = Math.max(...monthlyData.map(([, d]) => d.revenue), 1);
  const maxLineVal      = Math.max(...monthlyData.map(([, d]) => Math.max(d.revenue, d.expenses)), 1);

  // Daily trend
  const dailyMap: Record<string, number> = {};
  const today = new Date();
  for (let i = 13; i >= 0; i--) {
    const d = new Date(today); d.setDate(today.getDate() - i);
    const key = d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
    dailyMap[key] = 0;
  }
  filteredSales.forEach(s => {
    const key = new Date(s.date).toLocaleDateString("en-US", { month: "short", day: "numeric" });
    if (key in dailyMap) dailyMap[key] += s.totalSales;
  });
  const dailyData   = Object.entries(dailyMap);
  const maxDailyRev = Math.max(...dailyData.map(([, v]) => v), 1);

  // Expenses by category
  const categoryMap: Record<string, number> = {};
  filteredExpenses.forEach(e => {
    if (!categoryMap[e.category]) categoryMap[e.category] = 0;
    categoryMap[e.category] += e.amount;
  });
  const categoryData = Object.entries(categoryMap).sort((a, b) => b[1] - a[1]);
  const totalCatExp  = categoryData.reduce((s, [, v]) => s + v, 0) || 1;

  // Sales by source
  const manualSales = filteredSales.filter(s => s.source !== "excel").length;
  const excelSales  = filteredSales.filter(s => s.source === "excel").length;
  const totalSrcTx  = manualSales + excelSales || 1;

  // Payment split
  const cashSales    = filteredSales.filter(s => s.paymentMethod === "Cash").length;
  const benefitSales = filteredSales.filter(s => s.paymentMethod === "BenefitPay").length;
  const totalTx      = cashSales + benefitSales || 1;

  // Stock levels
  const activeProducts = products.filter(p => p.active).slice(0, 8);

  // Top customers
  const customerMap: Record<string, { spend: number; orders: number }> = {};
  filteredSales.forEach(s => {
    if (!customerMap[s.customerName]) customerMap[s.customerName] = { spend: 0, orders: 0 };
    customerMap[s.customerName].spend  += s.totalSales;
    customerMap[s.customerName].orders += 1;
  });
  const topCustomers = Object.entries(customerMap).sort((a, b) => b[1].spend - a[1].spend).slice(0, 5);
  const maxCustSpend = Math.max(...topCustomers.map(([, d]) => d.spend), 1);

  // Best selling sizes
  const sizeMap: Record<string, number> = {};
  filteredSales.forEach(sale =>
    sale.items.forEach((item: any) => {
      const sz = item.size ?? "N/A";
      if (!sizeMap[sz]) sizeMap[sz] = 0;
      sizeMap[sz] += item.quantity ?? 0;
    })
  );
  const sizeData   = Object.entries(sizeMap).sort((a, b) => b[1] - a[1]);
  const maxSizeQty = Math.max(...sizeData.map(([, v]) => v), 1);

  // SVG line path helper
  const buildLinePath = (data: number[], maxVal: number, w: number, h: number) => {
    if (data.length < 2) return "";
    const step = w / (data.length - 1);
    return data.map((v, i) => `${i === 0 ? "M" : "L"} ${i * step} ${h - (v / maxVal) * h}`).join(" ");
  };

  // Custom range label for button
  const customRangeLabel = () => {
    if (range === "custom" && customFrom && customTo) {
      const from = new Date(customFrom).toLocaleDateString("en-GB");
      const to   = new Date(customTo).toLocaleDateString("en-GB");
      return `${from} - ${to}`;
    }
    return "Date Range ";
  };

  // AI
  const buildContext = (s: Sale[], e: Expense[]) => {
    const rev  = s.reduce((x, i) => x + i.totalSales,  0);
    const prof = s.reduce((x, i) => x + i.grossProfit, 0);
    const exp  = e.reduce((x, i) => x + i.amount,      0);
    const pm: Record<string, { revenue: number; qty: number }> = {};
    s.forEach(sale => sale.items.forEach((item: any) => {
      if (!pm[item.itemName]) pm[item.itemName] = { revenue: 0, qty: 0 };
      pm[item.itemName].revenue += item.itemTotalPrice ?? 0;
      pm[item.itemName].qty     += item.quantity       ?? 0;
    }));
    const top5 = Object.entries(pm).sort((a, b) => b[1].revenue - a[1].revenue).slice(0, 5);
    const mm: Record<string, { revenue: number; profit: number }> = {};
    s.forEach(sale => {
      const key = new Date(sale.date).toLocaleDateString("en-US", { year: "numeric", month: "short" });
      if (!mm[key]) mm[key] = { revenue: 0, profit: 0 };
      mm[key].revenue += sale.totalSales;
      mm[key].profit  += sale.grossProfit;
    });
    return `Business Sales Data:
- Transactions: ${s.length}, Revenue: BHD ${rev.toFixed(3)}, Gross Profit: BHD ${prof.toFixed(3)}, Expenses: BHD ${exp.toFixed(3)}, Net Profit: BHD ${(prof - exp).toFixed(3)}, Margin: ${rev > 0 ? (((prof - exp) / rev) * 100).toFixed(1) : 0}%
- Payment: ${s.filter(x => x.paymentMethod === "Cash").length} Cash, ${s.filter(x => x.paymentMethod === "BenefitPay").length} BenefitPay
- Top Products: ${top5.map(([n, d]) => `${n} (BHD ${d.revenue.toFixed(3)}, ${d.qty} units)`).join("; ")}
- Monthly: ${Object.entries(mm).map(([m, d]) => `${m}: Rev BHD ${d.revenue.toFixed(3)}, Profit BHD ${d.profit.toFixed(3)}`).join("; ")}
- Expense Categories: ${[...new Set(e.map(x => x.category))].join(", ")}
Currency: BHD`.trim();
  };

  const generateAutoInsight = async (s: Sale[], e: Expense[]) => {
    if (s.length === 0 && e.length === 0) return;
    setAiLoading(true);
    try {
      const res = await fetch(`${API}/ai/insight`, { method: "POST", headers: { "Content-Type": "application/json", Authorization: `Bearer ${localStorage.getItem("token")}` }, body: JSON.stringify({ context: buildContext(s, e) }) });
      const data = await res.json();
      setAutoInsight(data.reply ?? "");
    } catch (err) { console.error(err); } finally { setAiLoading(false); }
  };

  const sendChatMessage = async () => {
    const msg = chatInput.trim();
    if (!msg || chatLoading) return;
    const newMessages: ChatMessage[] = [...chatMessages, { role: "user", content: msg }];
    setChatMessages(newMessages); setChatInput(""); setChatLoading(true);
    try {
      const res = await fetch(`${API}/ai/chat`, { method: "POST", headers: { "Content-Type": "application/json", Authorization: `Bearer ${localStorage.getItem("token")}` }, body: JSON.stringify({ context: buildContext(sales, expenses), messages: newMessages }) });
      const data = await res.json();
      setChatMessages(prev => [...prev, { role: "assistant", content: data.reply ?? "Sorry, I couldn't generate a response." }]);
    } catch { setChatMessages(prev => [...prev, { role: "assistant", content: "Something went wrong." }]); }
    finally { setChatLoading(false); }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); sendChatMessage(); } };
  const formatBHD  = (n: number) => `BHD ${n.toFixed(3)}`;
  const formatDate = (d: string) => new Date(d).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });

  const suggestedQuestions = [
    "What was my best selling product?",
    "Which month had the highest profit?",
    "What's my average order value?",
    "How are my expenses trending?",
  ];

  return (
    <div className="System-container">
      <div className="System-layout">
        <Sidebar sidebarOpen={sidebarOpen} setSidebarOpen={setSidebarOpen} />
        <div className="System-content-wrapper">
          <Header title="Dashboard" sidebarOpen={sidebarOpen} setSidebarOpen={setSidebarOpen} />
       
        <div className="System-content">

          {/* Top bar */}
          <div className="dash-topbar">
          <div className="dash-tabs">
           <button className={`dash-tab ${activeTab === "overview" ? "active" : ""}`} onClick={() => setActiveTab("overview")}>
           <LayoutDashboard size={15} /> Overview
           </button>
           <button className={`dash-tab ${activeTab === "chat" ? "active" : ""}`} onClick={() => setActiveTab("chat")}>
           <Bot size={15} /> Ask AI
           </button>
           <button className={`dash-tab ${activeTab === "instagram" ? "active" : ""}`} onClick={() => setActiveTab("instagram")}>
           <FaInstagram size={15} /> Instagram
            </button>
               </div>


            <div className="dash-range-filters">
              {([ "all"] as RangeFilter[]).map(r => (
                <button
                  key={r}
                  className={`dash-range-btn ${range === r ? "active" : ""}`}
                  onClick={() => { setRange(r); setShowDatePicker(false); }}
                >
                  { "All Time"}
                </button>
              ))}

              {/* Custom date range picker */}
              <div className="dash-custom-range-wrapper" ref={datePickerRef}>
                <button
                  className={`dash-custom-range-btn ${range === "custom" ? "active" : ""}`}
                  onClick={() => setShowDatePicker(prev => !prev)}
                >
                  {customRangeLabel()}
                  <span className="dash-chevron">▾</span>
                </button>

                {showDatePicker && (
                  <div className="dash-datepicker-dropdown">
                    <div className="dash-datepicker-row">
                      <div className="dash-datepicker-field">
                        <label>From</label>
                        <input
                          type="date"
                          value={customFrom}
                          onChange={e => setCustomFrom(e.target.value)}
                        />
                      </div>
                      <span className="dash-datepicker-to">→</span>
                      <div className="dash-datepicker-field">
                        <label>To</label>
                        <input
                          type="date"
                          value={customTo}
                          onChange={e => setCustomTo(e.target.value)}
                        />
                      </div>
                    </div>
                    <button
                      className="dash-datepicker-apply"
                      disabled={!customFrom || !customTo}
                      onClick={() => { setRange("custom"); setShowDatePicker(false); }}
                    >
                      Apply
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>

          {loading ? (
            <div className="dash-loading"><div className="dash-spinner" /><p>Loading dashboard...</p></div>
          ) : activeTab === "overview" ? (
            <>
            
              {/* Low stock */}
              {lowStockProducts.length > 0 && (
                <div className="dash-low-stock">
                  <span className="dash-low-stock-icon">⚠️</span>
                  <div className="dash-low-stock-body">
                    <div className="dash-low-stock-title">Low Stock Alert — {lowStockProducts.length} product{lowStockProducts.length > 1 ? "s" : ""} running low</div>
                    <div className="dash-low-stock-tags">
                      {lowStockProducts.map((p, i) => (
                        <span key={i} className="dash-low-stock-tag">{p.itemName}<span className="dash-low-stock-qty">{getStockLabel(p)}</span></span>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {/* AI Insight */}
              <div className="dash-ai-card">
                <div className="dash-ai-header">
                  <span className="dash-ai-badge"><Sparkles size={13}/> AI Summary</span>
                  <button className="dash-ai-refresh" onClick={() => generateAutoInsight(sales, expenses)} disabled={aiLoading}>
                    {aiLoading ? "Analyzing..." : "↻ Refresh"}
                  </button>
                </div>
                <p className="dash-ai-text">{aiLoading ? "Analyzing your business data..." : autoInsight || "No insight yet — click Refresh."}</p>
              </div>

              {/* KPIs */}
              <div className="dash-kpi-grid">
                <div className="dash-kpi-card">
                  <span className="dash-kpi-label">Total Revenue</span>
                  <span className="dash-kpi-value">{formatBHD(totalRevenue)}</span>
                  <span className="dash-kpi-sub">{filteredSales.length} transactions</span>
                </div>
                <div className="dash-kpi-card">
                  <span className="dash-kpi-label">Gross Profit</span>
                  <span className="dash-kpi-value profit">{formatBHD(totalProfit)}</span>
                  <span className="dash-kpi-sub">After cost of goods</span>
                </div>
                <div className="dash-kpi-card">
                  <span className="dash-kpi-label">Total Expenses</span>
                  <span className="dash-kpi-value expenses">{formatBHD(totalExpenses)}</span>
                  <span className="dash-kpi-sub">{filteredExpenses.length} expense records</span>
                </div>
                <div className="dash-kpi-card highlight">
                  <span className="dash-kpi-label">Net Profit</span>
                  <span className={`dash-kpi-value ${netProfit >= 0 ? "profit" : "loss"}`}>{formatBHD(netProfit)}</span>
                  <span className="dash-kpi-sub">{margin}% margin</span>
                </div>
                <div className="dash-kpi-card">
                  <span className="dash-kpi-label">Avg Order Value</span>
                  <span className="dash-kpi-value">{formatBHD(avgOrderValue)}</span>
                  <span className="dash-kpi-sub">Per transaction</span>
                </div>
              </div>

              {/* Row 1 — Daily sales trend */}
              <div className="dash-row">
                <div className="dash-card full">
                  <h3 className="dash-card-title">Daily Sales Trend — Last 14 Days</h3>
                  {dailyData.every(([, v]) => v === 0) ? <p className="dash-empty">No sales in this period</p> : (
                    <div className="dash-line-wrapper">
                      <svg viewBox="0 0 600 120" className="dash-line-svg" preserveAspectRatio="none">
                        <defs>
                          <linearGradient id="lineGrad" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="0%" stopColor="#1e3a5f" stopOpacity="0.4" />
                            <stop offset="100%" stopColor="#1e3a5f" stopOpacity="0" />
                          </linearGradient>
                        </defs>
                        {[0, 0.25, 0.5, 0.75, 1].map(t => <line key={t} x1="0" y1={120 - t * 110} x2="600" y2={120 - t * 110} stroke="#f0f0f0" strokeWidth="1" />)}
                        <path d={`${buildLinePath(dailyData.map(([, v]) => v), maxDailyRev, 600, 110)} L 600 120 L 0 120 Z`} fill="url(#lineGrad)" />
                        <path d={buildLinePath(dailyData.map(([, v]) => v), maxDailyRev, 600, 110)} fill="none" stroke="#1e3a5f" strokeWidth="2.5" strokeLinejoin="round" />
                        {dailyData.map(([, v], i) => {
                          const x = (i / (dailyData.length - 1)) * 600;
                          const y = 110 - (v / maxDailyRev) * 110;
                          return v > 0 ? <circle key={i} cx={x} cy={y} r="3.5" fill="#e6a817" stroke="#fff" strokeWidth="1.5"><title>{formatBHD(v)}</title></circle> : null;
                        })}
                      </svg>
                      <div className="dash-line-labels">
                        {dailyData.filter((_, i) => i % 2 === 0).map(([label]) => <span key={label} className="dash-line-label">{label}</span>)}
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Row 2 - Top products + Last transactions */}
              <div className="dash-row">
                <div className="dash-card wide">
                  <h3 className="dash-card-title">Top Products by Revenue</h3>
                  {topProducts.length === 0 ? <p className="dash-empty">No products sold yet</p> : (
                    <div className="dash-top-products">
                      {topProducts.map(([name, data], i) => {
                        const pct = totalRevenue > 0 ? (data.revenue / totalRevenue) * 100 : 0;
                        return (
                          <div key={name} className="dash-product-row">
                            <span className="dash-rank-num">{i + 1}</span>
                            <div className="dash-product-info">
                              <div className="dash-product-header">
                                <span className="dash-product-name">{name}</span>
                                <span className="dash-product-revenue">{formatBHD(data.revenue)}</span>
                              </div>
                              <div className="dash-rank-bar-bg"><div className="dash-rank-bar-fill" style={{ width: `${pct}%` }} /></div>
                              <span className="dash-product-qty">{data.qty} units sold</span>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>

                <div className="dash-card">
                  <h3 className="dash-card-title">Recent Transactions</h3>
                  <div className="dash-recent-list">
                    {filteredSales.length === 0 ? <p className="dash-empty">No transactions</p> : (
                      filteredSales.slice(-6).reverse().map(sale => (
                        <div key={sale.invoiceNumber} className="dash-recent-item">
                          <div className="dash-recent-left">
                            <span className="dash-recent-invoice">{sale.invoiceNumber}</span>
                            <span className="dash-recent-customer">{sale.customerName}</span>
                            <span className="dash-recent-date">{formatDate(sale.date)}</span>
                          </div>
                          <span className="dash-recent-amount">{formatBHD(sale.totalSales)}</span>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              </div>

              {/* Row 3 — Revenue vs Expenses + Monthly Revenue */}
              <div className="dash-row">
                <div className="dash-card wide">
                  <h3 className="dash-card-title">Revenue vs Expenses Over Time</h3>
                  {monthlyData.length === 0 ? <p className="dash-empty">No data yet</p> : (
                    <div className="dash-line-wrapper">
                      <svg viewBox="0 0 600 120" className="dash-line-svg" preserveAspectRatio="none">
                        {[0, 0.25, 0.5, 0.75, 1].map(t => <line key={t} x1="0" y1={120 - t * 110} x2="600" y2={120 - t * 110} stroke="#f0f0f0" strokeWidth="1" />)}
                        <path d={buildLinePath(monthlyData.map(([, d]) => d.revenue), maxLineVal, 600, 110)} fill="none" stroke="#1e3a5f" strokeWidth="2.5" strokeLinejoin="round" />
                        <path d={buildLinePath(monthlyData.map(([, d]) => d.expenses), maxLineVal, 600, 110)} fill="none" stroke="#c0392b" strokeWidth="2.5" strokeLinejoin="round" strokeDasharray="6 3" />
                        {monthlyData.map(([, d], i) => {
                          const x    = monthlyData.length > 1 ? (i / (monthlyData.length - 1)) * 600 : 300;
                          const yRev = 110 - (d.revenue  / maxLineVal) * 110;
                          const yExp = 110 - (d.expenses / maxLineVal) * 110;
                          return (
                            <g key={i}>
                              <circle cx={x} cy={yRev} r="3.5" fill="#1e3a5f" stroke="#fff" strokeWidth="1.5"><title>Revenue: {formatBHD(d.revenue)}</title></circle>
                              <circle cx={x} cy={yExp} r="3.5" fill="#c0392b" stroke="#fff" strokeWidth="1.5"><title>Expenses: {formatBHD(d.expenses)}</title></circle>
                            </g>
                          );
                        })}
                      </svg>
                      <div className="dash-line-labels">
                        {monthlyData.map(([label]) => <span key={label} className="dash-line-label">{label}</span>)}
                      </div>
                    </div>
                  )}
                </div>

                <div className="dash-row">
                  <div className="dash-card wide">
                    <h3 className="dash-card-title">Monthly Revenue</h3>
                    {monthlyData.length === 0 ? <p className="dash-empty">No data yet</p> : (
                      <div className="dash-bar-chart">
                        {monthlyData.map(([month, data]) => (
                          <div key={month} className="dash-bar-group">
                            <div className="dash-bars">
                              <div className="dash-bar revenue" style={{ height: `${(data.revenue / maxMonthRevenue) * 140}px` }} title={`Revenue: ${formatBHD(data.revenue)}`} />
                              <div className="dash-bar profit"  style={{ height: `${(data.profit  / maxMonthRevenue) * 140}px` }} title={`Profit: ${formatBHD(data.profit)}`} />
                              <div className="dash-bar expense" style={{ height: `${((data.expenses || 0) / maxMonthRevenue) * 140}px` }} title={`Expenses: ${formatBHD(data.expenses || 0)}`} />
                            </div>
                            <span className="dash-bar-label">{month}</span>
                          </div>
                        ))}
                      </div>
                    )}
                    <div className="dash-chart-legend">
                      <span><span className="dash-legend-dot revenue" />Revenue</span>
                      <span><span className="dash-legend-dot profit"  />Profit</span>
                      <span><span className="dash-legend-dot expense" />Expenses</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Row 4 — Stock levels + Best selling sizes + Payment Methods */}
              <div className="dash-row">
                <div className="dash-card wide">
                  <h3 className="dash-card-title">Stock Levels by Product</h3>
                  {activeProducts.length === 0 ? <p className="dash-empty">No active products</p> : (
                    <div className="dash-stock-chart">
                      {activeProducts.map(p => {
                        const totalStock = p.sizes?.length > 0 ? p.sizes.reduce((s, sz) => s + sz.stock, 0) : p.stock;
                        const maxStock   = Math.max(...activeProducts.map(pr => pr.sizes?.length > 0 ? pr.sizes.reduce((s, sz) => s + sz.stock, 0) : pr.stock), 1);
                        const pct        = (totalStock / maxStock) * 100;
                        const isLow      = totalStock <= LOW_STOCK_THRESHOLD * (p.sizes?.length || 1);
                        return (
                          <div key={p.productId ?? p.itemName} className="dash-stock-row">
                            <span className="dash-stock-name">{p.itemName}</span>
                            <div className="dash-rank-bar-bg" style={{ flex: 1 }}>
                              <div className="dash-rank-bar-fill" style={{ width: `${pct}%`, background: isLow ? "#c0392b" : "#2e7d32" }} />
                            </div>
                            <span className={`dash-stock-qty ${isLow ? "low" : ""}`}>{totalStock}</span>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>

                <div className="dash-card">
                  <h3 className="dash-card-title">Best Selling Sizes</h3>
                  {sizeData.length === 0 ? <p className="dash-empty">No sales data yet</p> : (
                    <div className="dash-top-products">
                      {sizeData.slice(0, 6).map(([size, qty]) => {
                        const pct = (qty / maxSizeQty) * 100;
                        return (
                          <div key={size} className="dash-product-row">
                            <span className="dash-rank-num" style={{ background: "#0277bd", color: "#fff", fontSize: 11 }}>{size}</span>
                            <div className="dash-product-info">
                              <div className="dash-product-header">
                                <span className="dash-product-name">Size {size}</span>
                                <span className="dash-product-revenue" style={{ color: "#0277bd" }}>{qty} units</span>
                              </div>
                              <div className="dash-rank-bar-bg"><div className="dash-rank-bar-fill" style={{ width: `${pct}%`, background: "linear-gradient(90deg,#0277bd,#1e3a5f)" }} /></div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>

                <div className="dash-card">
                  <h3 className="dash-card-title">Payment Methods</h3>
                  <div className="dash-donut-wrapper">
                    <svg viewBox="0 0 100 100" className="dash-donut-svg">
                      <circle cx="50" cy="50" r="35" fill="none" stroke="#e8edf2" strokeWidth="18" />
                      <circle cx="50" cy="50" r="35" fill="none" stroke="#e6a817" strokeWidth="18" strokeDasharray={`${(cashSales / totalTx) * 219.9} 219.9`} strokeDashoffset="54.975" transform="rotate(-90 50 50)" />
                      <circle cx="50" cy="50" r="35" fill="none" stroke="#1e3a5f" strokeWidth="18" strokeDasharray={`${(benefitSales / totalTx) * 219.9} 219.9`} strokeDashoffset={`${54.975 - (cashSales / totalTx) * 219.9}`} transform="rotate(-90 50 50)" />
                    </svg>
                    <div className="dash-donut-center"><span className="dash-donut-total">{cashSales + benefitSales}</span><span className="dash-donut-label">Sales</span></div>
                  </div>
                  <div className="dash-payment-legend">
                    <div className="dash-payment-item"><span className="dash-legend-dot" style={{ background: "#e6a817" }} /><span>Cash</span><span className="dash-legend-count">{cashSales} ({Math.round((cashSales / totalTx) * 100)}%)</span></div>
                    <div className="dash-payment-item"><span className="dash-legend-dot" style={{ background: "#1e3a5f" }} /><span>BenefitPay</span><span className="dash-legend-count">{benefitSales} ({Math.round((benefitSales / totalTx) * 100)}%)</span></div>
                  </div>
                </div>
              </div>

              {/* Row 5 — Expenses by category */}
              <div className="dash-row">
                <div className="dash-card wide">
                  <h3 className="dash-card-title">Expenses by Category</h3>
                  {categoryData.length === 0 ? <p className="dash-empty">No expenses in this period</p> : (
                    <div className="dash-category-list">
                      {categoryData.map(([cat, amt]) => {
                        const pct = (amt / totalCatExp) * 100;
                        return (
                          <div key={cat} className="dash-category-row">
                            <div className="dash-category-header">
                              <div className="dash-category-name">
                                <span className="dash-category-dot" style={{ background: CATEGORY_COLORS[cat] ?? "#888" }} />
                                {cat.charAt(0).toUpperCase() + cat.slice(1)}
                              </div>
                              <div className="dash-category-right">
                                <span className="dash-category-pct">{pct.toFixed(1)}%</span>
                                <span className="dash-category-amt">{formatBHD(amt)}</span>
                              </div>
                            </div>
                            <div className="dash-rank-bar-bg">
                              <div className="dash-rank-bar-fill" style={{ width: `${pct}%`, background: CATEGORY_COLORS[cat] ?? "#888" }} />
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>
            </>
          ) : activeTab === "chat" ? (
            <div className="dash-chat-container">
              <div className="dash-chat-intro">
                <div className="dash-chat-icon"> <Bot size={27} /></div>
                <h3>Ask me anything about your business</h3>
                <p>I have full access to your sales and expenses data.</p>
                {chatMessages.length === 0 && (
                  <div className="dash-suggested-questions">
                    {suggestedQuestions.map(q => <button key={q} className="dash-suggested-q" onClick={() => setChatInput(q)}>{q}</button>)}
                  </div>
                )}
              </div>
              <div className="dash-chat-messages">
                {chatMessages.map((msg, i) => (
                  <div key={i} className={`dash-chat-msg ${msg.role}`}>
                    <div className="dash-chat-bubble">{msg.content}</div>
                  </div>
                ))}
                {chatLoading && <div className="dash-chat-msg assistant"><div className="dash-chat-bubble typing"><span /><span /><span /></div></div>}
                <div ref={chatEndRef} />
              </div>
              <div className="dash-chat-input-row">
                <textarea className="dash-chat-input" placeholder="Ask about your sales, profits, top products..." value={chatInput} onChange={e => setChatInput(e.target.value)} onKeyDown={handleKeyDown} rows={1} />
                <button className="dash-chat-send" onClick={sendChatMessage} disabled={chatLoading || !chatInput.trim()}>➤</button>
              </div>
              <p className="dash-chat-hint">Press Enter to send · Shift+Enter for new line</p>
            </div>
          ) : (
            <InstagramTab />
          )}
           </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;