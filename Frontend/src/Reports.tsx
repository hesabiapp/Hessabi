import React, { useState, useRef, useEffect } from "react";
import "./Style/Reports.css";
import "./Style/System.css"
import Header from "./components/Header";
import Sidebar from "./components/Sidebar";
import { Scale, TrendingUp, Trophy, Wallet, Calendar, CreditCard, Package } from "lucide-react";
import * as XLSX from "xlsx";
import { FiArrowDown } from "react-icons/fi";

const API = import.meta.env.VITE_API_URL;

type ReportTemplate = {
  id: string;
  title: string;
  category: string;
  description: string;
  icon: React.ElementType;
  endpoint: string;
  filename: string;
  hasDateRange: boolean;
};

const TEMPLATES: ReportTemplate[] = [
  {
    id: "profit-loss",
    title: "Profit & Loss",
    category: "Business Overview",
    description: "Full income statement with COGS, expenses, and net profit.",
    icon: Scale,
    endpoint: "/reports/profit-loss",
    filename: "profit-loss.pdf",
    hasDateRange: true,
  },
  {
    id: "sales-summary",
    title: "Sales Report",
    category: "Sales",
    description: "All transactions with revenue, profit, and payment breakdown.",
    icon: TrendingUp,
    endpoint: "/reports/sales-summary",
    filename: "sales-summary.pdf",
    hasDateRange: true,
  },
  {
    id: "expenses-breakdown",
    title: "Expenses Report",
    category: "Expenses",
    description: "Expenses grouped by category with amounts and percentages.",
    icon: Wallet,
    endpoint: "/reports/expenses-breakdown",
    filename: "expenses-breakdown.pdf",
    hasDateRange: true,
  },
  {
    id: "top-products",
    title: "Top Products",
    category: "Sales",
    description: "Product performance ranked by revenue, units sold, and margin.",
    icon: Trophy,
    endpoint: "/reports/top-products",
    filename: "top-products.pdf",
    hasDateRange: true,
  },
  {
    id: "vat-report",
    title: "VAT Report",
    category: "Business Overview",
    description: "Total VAT collected per period, broken down by product.",
    icon: CreditCard,
    endpoint: "/reports/vat-report",
    filename: "vat-report.pdf",
    hasDateRange: true,
  },
  {
    id: "inventory-report",
    title: "Inventory Report",
    category: "Products",
    description: "Current stock levels per product with low stock alerts.",
    icon: Package,
    endpoint: "/reports/inventory-report",
    filename: "inventory-report.pdf",
    hasDateRange: false,
  },
  {
    id: "payment-methods",
    title: "Payment Methods",
    category: "Sales",
    description: "Breakdown of Cash vs BenefitPay sales totals and counts.",
    icon: Calendar,
    endpoint: "/reports/payment-methods",
    filename: "payment-methods.pdf",
    hasDateRange: true,
  },
];

const CATEGORIES = ["All", ...Array.from(new Set(TEMPLATES.map(t => t.category)))];

const today = new Date().toISOString().split("T")[0];
const firstOfMonth = new Date(new Date().getFullYear(), new Date().getMonth(), 1)
  .toISOString()
  .split("T")[0];

const Reports = () => {
  const [sidebarOpen, setSidebarOpen]       = useState(true);
  const [downloading, setDownloading]       = useState<string | null>(null);
  const [aiPrompt, setAiPrompt]             = useState("");
  const [aiGenerating, setAiGenerating]     = useState(false);
  const [aiError, setAiError]               = useState("");
  const [activeCategory, setActiveCategory] = useState("All");
  const [expandedRow, setExpandedRow]       = useState<string | null>(null);
  const [exportOpen, setExportOpen]         = useState(false);
  const [exporting, setExporting]           = useState(false);
  const exportRef                           = useRef<HTMLDivElement>(null);

  const [dateRanges, setDateRanges] = useState<Record<string, { start: string; end: string }>>(
    Object.fromEntries(TEMPLATES.map(t => [t.id, { start: firstOfMonth, end: today }]))
  );

  // Close dropdown when clicking outside
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (exportRef.current && !exportRef.current.contains(e.target as Node)) {
        setExportOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const setDate = (id: string, key: "start" | "end", val: string) =>
    setDateRanges(prev => ({ ...prev, [id]: { ...prev[id], [key]: val } }));

  const downloadReport = async (template: ReportTemplate) => {
    setDownloading(template.id);
    try {
      const body: any = {};
      if (template.hasDateRange) {
        body.startDate = dateRanges[template.id].start;
        body.endDate   = dateRanges[template.id].end;
      }
      const res = await fetch(`${API}${template.endpoint}`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!res.ok) throw new Error("Failed to generate report");
      const blob = await res.blob();
      const url  = URL.createObjectURL(blob);
      const a    = document.createElement("a");
      a.href     = url;
      a.download = template.filename;
      a.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error("Download error:", err);
    } finally {
      setDownloading(null);
    }
  };

  const fetchAllData = async () => {
    const [productsRes, salesRes, expensesRes] = await Promise.all([
      fetch(`${API}/product/viewProducts`, { credentials: "include" }),
      fetch(`${API}/sales/viewSales`,      { credentials: "include" }),
      fetch(`${API}/expenses/viewExpenses`, { credentials: "include" }),
    ]);

    if (!productsRes.ok) throw new Error("Failed to fetch products");
    // sales/expenses may return 400 when empty — that's fine, we handle it below

    const products = await productsRes.json();
    const sales    = salesRes.ok    ? await salesRes.json()    : { sales: [] };
    const expenses = expensesRes.ok ? await expensesRes.json() : { expenses: [] };

    return { products, sales, expenses };
  };

  const exportAsExcel = async () => {
    setExporting(true);
    setExportOpen(false);
    try {
      const { products, sales, expenses } = await fetchAllData();

      const wb = XLSX.utils.book_new();

      const productsSheet = XLSX.utils.json_to_sheet(
        (products.products ?? []).map((p: any) => ({
          "Item Name":     p.itemName,
          Category:        p.category ?? "",
          Color:           p.color ?? "",
          "Cost Price":    p.costPrice,
          "Selling Price": p.sellingPrice,
          "VAT Rate":      p.vatRate ?? 0,
          Stock:           p.stock ?? 0,
          Description:     p.description ?? "",
          Active:          p.active ?? true,
        }))
      );

      const salesSheet = XLSX.utils.json_to_sheet(
        (sales.sales ?? []).map((s: any) => ({
          "Invoice Number": s.invoiceNumber,
          Date:             s.date ? new Date(s.date).toLocaleDateString() : "",
          "Customer Name":  s.customerName ?? "",
          "Payment Method": s.paymentMethod ?? "",
          "Total Sales":    s.totalSales ?? "",
          "Net Sales":      s.totalNetSales ?? "",
          "Total VAT":      s.totalVat ?? "",
          "Total Cost":     s.totalCost ?? "",
          "Gross Profit":   s.grossProfit ?? "",
          Source:           s.source ?? "",
          "Created By":     s.createdBy ?? "",
        }))
      );

      const expensesSheet = XLSX.utils.json_to_sheet(
        (expenses.expenses ?? []).map((e: any) => ({
          Date:         e.date ? new Date(e.date).toLocaleDateString() : "",
          Category:     e.category ?? "",
          Amount:       e.amount,
          Description:  e.description ?? "",
          "Created By": e.createdBy ?? "",
        }))
      );

      XLSX.utils.book_append_sheet(wb, productsSheet, "Products");
      XLSX.utils.book_append_sheet(wb, salesSheet,    "Sales");
      XLSX.utils.book_append_sheet(wb, expensesSheet, "Expenses");

      XLSX.writeFile(wb, "hessabi-export.xlsx");
    } catch (err) {
      console.error("Export error:", err);
    } finally {
      setExporting(false);
    }
  };

  const exportAsJSON = async () => {
    setExporting(true);
    setExportOpen(false);
    try {
      const { products, sales, expenses } = await fetchAllData();

      const data = {
        products: products.products ?? products,
        sales:    sales.sales    ?? sales,
        expenses: expenses.expenses ?? expenses,
      };

      const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
      const url  = URL.createObjectURL(blob);
      const a    = document.createElement("a");
      a.href     = url;
      a.download = "hessabi-export.json";
      a.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error("Export error:", err);
    } finally {
      setExporting(false);
    }
  };

  const generateAiReport = async () => {
    if (!aiPrompt.trim() || aiGenerating) return;
    setAiError("");
    setAiGenerating(true);
    try {
      const res = await fetch(`${API}/reports/ai-custom`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt: aiPrompt }),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.message ?? "Failed to generate report");
      }
      const blob = await res.blob();
      const url  = URL.createObjectURL(blob);
      const a    = document.createElement("a");
      a.href     = url;
      a.download = "custom-report.pdf";
      a.click();
      URL.revokeObjectURL(url);
      setAiPrompt("");
    } catch (err: any) {
      setAiError(err.message ?? "Something went wrong.");
    } finally {
      setAiGenerating(false);
    }
  };

  const suggestions = [
    "Monthly profit broken down by product",
    "Products with highest profit margin",
    "Cash vs BenefitPay performance comparison",
    "Top expense categories and their impact",
    "Full business health summary with recommendations",
  ];

  const filtered = activeCategory === "All"
    ? TEMPLATES
    : TEMPLATES.filter(t => t.category === activeCategory);

  return (
    <div className="System-container">
      <div className="System-layout">
        <Sidebar sidebarOpen={sidebarOpen} setSidebarOpen={setSidebarOpen} />

        <div className="System-content-wrapper">
          <Header title="All Reports" sidebarOpen={sidebarOpen} setSidebarOpen={setSidebarOpen} />

          <div className="System-content">

            {/* Page header */}
            <div className="rp-header">
              <div>
                <p className="System-sub">Select a report to export as PDF</p>
              </div>
              <span className="rp-count">{filtered.length}</span>

              {/* Export Data Dropdown */}
              <div className="rp-export-dropdown" ref={exportRef}>
                <button
                  className="rp-export-data-btn"
                  onClick={() => setExportOpen(prev => !prev)}
                  disabled={exporting}
                >
                  {exporting ? "Exporting..." : <><FiArrowDown size={15} /> Export Data</>}
                </button>
                {exportOpen && (
                  <div className="rp-export-menu">
                    <button className="rp-export-option" onClick={exportAsExcel}>
                    
                      <div>
                        <div className="rp-export-option-title">Export as Excel</div>
                        <div className="rp-export-option-desc">Products, Sales & Expenses in one file</div>
                      </div>
                    </button>
                    <button className="rp-export-option" onClick={exportAsJSON}>
                      
                      <div>
                        <div className="rp-export-option-title">Export as JSON</div>
                        <div className="rp-export-option-desc">Raw data for developers & migration</div>
                      </div>
                    </button>
                  </div>
                )}
              </div>
            </div>

            {/* Category filter tabs */}
            <div className="rp-category-tabs">
              {CATEGORIES.map(cat => (
                <button
                  key={cat}
                  className={`rp-cat-tab ${activeCategory === cat ? "active" : ""}`}
                  onClick={() => setActiveCategory(cat)}
                >
                  {cat}
                </button>
              ))}
            </div>

            {/* Reports table */}
            <div className="rp-table-wrapper">
              <div className="rp-table-head">
                <span>REPORT NAME</span>
                <span>CATEGORY</span>
                <span>DATE RANGE</span>
                <span></span>
              </div>

              {filtered.map(t => (
                <div key={t.id} className="rp-table-row">
                  <div className="rp-row-main" onClick={() => setExpandedRow(expandedRow === t.id ? null : t.id)}>
                    <div className="rp-name-col">
                      <div className="rp-icon"><t.icon size={16} /></div>
                      <div>
                        <div className="rp-report-name">{t.title}</div>
                        <div className="rp-report-desc">{t.description}</div>
                      </div>
                    </div>

                    <div className="rp-category-col">
                      <span className="rp-category-badge">{t.category}</span>
                    </div>

                    <div className="rp-date-col" onClick={e => e.stopPropagation()}>
                      {t.hasDateRange ? (
                        <div className="rp-date-inputs">
                          <input
                            type="date"
                            value={dateRanges[t.id].start}
                            onChange={e => setDate(t.id, "start", e.target.value)}
                            className="rp-date-input"
                          />
                          <span className="rp-date-sep">—</span>
                          <input
                            type="date"
                            value={dateRanges[t.id].end}
                            onChange={e => setDate(t.id, "end", e.target.value)}
                            className="rp-date-input"
                          />
                        </div>
                      ) : (
                        <span className="rp-no-date">All time</span>
                      )}
                    </div>

                    <div className="rp-action-col" onClick={e => e.stopPropagation()}>
                      <button
                        className="rp-export-btn"
                        onClick={() => downloadReport(t)}
                        disabled={downloading === t.id}
                      >
                        {downloading === t.id ? "Generating..." : <><FiArrowDown size={15} /> Export PDF</>}
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* AI Custom Report */}
            <div className="rp-ai-section-label">
              <span>🤖 AI Custom Report</span>
              <span className="rp-ai-badge">Powered by Claude</span>
            </div>

            <div className="rp-ai-card">
              <div className="rp-ai-intro">
                <strong>Describe the report you need</strong>
                <p>Can't find what you're looking for? Tell AI what you want and it will analyze your data and generate a custom PDF.</p>
              </div>

              <div className="rp-ai-chips">
                {suggestions.map(s => (
                  <button key={s} className="rp-ai-chip" onClick={() => setAiPrompt(s)}>
                    {s}
                  </button>
                ))}
              </div>

              <textarea
                className="rp-ai-input"
                placeholder='e.g. "Show me monthly profit by product for the last 3 months"'
                value={aiPrompt}
                onChange={e => { setAiPrompt(e.target.value); setAiError(""); }}
                rows={3}
              />

              {aiError && <p className="rp-ai-error">⚠ {aiError}</p>}

              <div className="rp-ai-footer">
                <span className="rp-ai-hint">AI reads your real sales & expenses data to build this report</span>
                <button
                  className="rp-ai-btn"
                  onClick={generateAiReport}
                  disabled={aiGenerating || !aiPrompt.trim()}
                >
                  {aiGenerating ? "🤖 Generating PDF..." : "🤖 Generate & Download PDF"}
                </button>
              </div>
            </div>

          </div>
        </div>
      </div>
    </div>
  );
};

export default Reports;