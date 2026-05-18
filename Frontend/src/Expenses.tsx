import React, { useState, useEffect, useRef } from "react";
import "./Style/Expenses.css";
import "./Style/System.css";
import * as XLSX from "xlsx";
import Header from "./components/Header";
import Sidebar from "./components/Sidebar";
import { useUserRole } from "./hooks/useUserRole";
import { FiArrowDown } from "react-icons/fi";

const API = "http://localhost:3000";

type Expense = {
  _id: string;
  date: string;
  category: string;
  amount: number;
  description: string;
  createdBy: string;
};

type FormState = {
  date: string;
  category: string;
  amount: string;
  description: string;
  errors: Record<string, string>;
};

type ImportRow = {
  date: string;
  category: string;
  amount: string;
  description: string;
  error?: string;
};

type ImportResult = {
  description: string;
  status: string;
  message?: string;
};

const CATEGORIES = ["salary", "rent", "utilities", "delivery", "marketing", "maintenance", "supplies"];

const emptyForm = (): FormState => ({
  date: new Date().toISOString().split("T")[0],
  category: "",
  amount: "",
  description: "",
  errors: {},
});

const Expenses = () => {
  
  const [sidebarOpen, setSidebarOpen]         = useState(true);
  const [expenses, setExpenses]               = useState<Expense[]>([]);
  const [loading, setLoading]                 = useState(true);
  const [showModal, setShowModal]             = useState(false);
  const [showImportModal, setShowImportModal] = useState(false);
  const [selectedExpense, setSelectedExpense] = useState<Expense | null>(null);
  const [search, setSearch]                   = useState("");
  const [form, setForm]                       = useState<FormState>(emptyForm());
  const [submitError, setSubmitError]         = useState("");
  const [importRows, setImportRows]           = useState<ImportRow[]>([]);
  const [importResults, setImportResults]     = useState<ImportResult[]>([]);
  const [importing, setImporting]             = useState(false);
  const [mappingHeaders, setMappingHeaders]   = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const role = useUserRole();
  const isAdmin = role === "Admin";

  useEffect(() => { fetchExpenses(); }, []);

  const fetchExpenses = async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API}/expenses/viewExpenses`, { credentials: "include" });
      const data = await res.json();
      if (res.ok) setExpenses(data.expenses ?? []);
      else setExpenses([]);
    } catch (err) {
      console.error("Failed to fetch expenses:", err);
      setExpenses([]);
    } finally {
      setLoading(false);
    }
  };

  const setField = (key: keyof FormState, value: any) =>
    setForm(f => ({ ...f, [key]: value, errors: { ...f.errors, [key]: "" } }));

  const validateForm = (): boolean => {
    const errs: Record<string, string> = {};
    if (!form.date.trim()) errs.date = "Date is required";
    if (!form.category.trim()) errs.category = "Category is required";
    if (!form.amount.trim()) errs.amount = "Amount is required";
    else if (isNaN(Number(form.amount)) || Number(form.amount) <= 0) errs.amount = "Enter a valid amount";
    if (!form.description.trim()) errs.description = "Description is required";
    setForm(f => ({ ...f, errors: errs }));
    return Object.keys(errs).length === 0;
  };

  const handleAdd = async () => {
    if (!validateForm()) return;
    setSubmitError("");
    try {
      const res = await fetch(`${API}/expenses/addExpenses`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          date: form.date,
          category: form.category,
          amount: Number(form.amount),
          description: form.description,
        }),
      });

      const text = await res.text();
      let data: any = {};
      try { data = JSON.parse(text); } catch {}

      if (res.ok) {
        await fetchExpenses();
        setShowModal(false);
        setForm(emptyForm());
      } else {
        setSubmitError(data.message ?? `Error ${res.status}`);
      }
    } catch (err) {
      console.error("Add expense error:", err);
      setSubmitError("Something went wrong. Please try again.");
    }
  };

  const handleDeleteExpense = async (expenseId: string) => {
    if (!confirm("Are you sure you want to delete this expense?")) return;
    try {
      const res = await fetch(`${API}/expenses/deleteExpense`, {
        method: "DELETE",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ expenseId }),
      });
      if (res.ok) {
        setExpenses(prev => prev.filter(e => e._id !== expenseId));
        setSelectedExpense(null);
      } else {
        const data = await res.json();
        alert(data.message ?? "Failed to delete expense.");
      }
    } catch (err) {
      console.error("Delete expense error:", err);
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (evt) => {
      try {
        const data     = new Uint8Array(evt.target?.result as ArrayBuffer);
        const workbook = XLSX.read(data, { type: "array" });
        const sheet    = workbook.Sheets[workbook.SheetNames[0]];
        const rows: any[] = XLSX.utils.sheet_to_json(sheet, { header: 1 });

        if (rows.length < 2) return;

        const excelHeaders: string[] = rows[0].map((h: any) => String(h ?? "").trim());

        setMappingHeaders(true);
        let colIndex: Record<string, number> = {
          date: -1, category: -1, amount: -1, description: -1,
        };

        try {
          const aiRes = await fetch(`${API}/expenses/mapHeaders`, {
            method: "POST",
            credentials: "include",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ headers: excelHeaders, type: "expenses" }),
          });
          const aiData = await aiRes.json();
          if (aiRes.ok && aiData.mapping) {
            colIndex = aiData.mapping;
          } else {
            colIndex = { date: 0, category: 1, amount: 2, description: 3 };
          }
        } catch (aiErr) {
          console.error("Header mapping failed, using positional fallback:", aiErr);
          colIndex = { date: 0, category: 1, amount: 2, description: 3 };
        } finally {
          setMappingHeaders(false);
        }

        const getCell = (row: any[], field: string): string => {
          const idx = colIndex[field];
          return idx !== -1 && row[idx] != null ? String(row[idx]).trim() : "";
        };

        const parsed: ImportRow[] = rows.slice(1).filter(row => row.length > 0).map(row => {
          const rawDate    = getCell(row, "date");
          const category   = getCell(row, "category").toLowerCase();
          const amount     = getCell(row, "amount");
          const description = getCell(row, "description");

          let date = rawDate;
          if (!isNaN(Number(rawDate)) && rawDate !== "") {
            const d = XLSX.SSF.parse_date_code(Number(rawDate));
            date = `${d.y}-${String(d.m).padStart(2, "0")}-${String(d.d).padStart(2, "0")}`;
          }

          let error = "";
          if (!date)                                 error = "Missing date";
          else if (!category)                        error = "Missing category";
          else if (!CATEGORIES.includes(category))   error = `Invalid category: ${category}`;
          else if (!amount || isNaN(Number(amount))) error = "Invalid amount";
          else if (!description)                     error = "Missing description";

          return { date, category, amount, description, error };
        });

        setImportRows(parsed);
        setImportResults([]);
        setShowImportModal(true);
      } catch (err) {
        console.error("File upload error:", err);
        setMappingHeaders(false);
      }
    };

    reader.readAsArrayBuffer(file);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const handleImportConfirm = async () => {
    const validRows = importRows.filter(r => !r.error);
    if (validRows.length === 0) return;

    setImporting(true);
    try {
      const res = await fetch(`${API}/expenses/importExpenses`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ rows: validRows }),
      });
      const data = await res.json();
      setImportResults(data.results ?? []);
      await fetchExpenses();
    } catch (err) {
      console.error("Import error:", err);
    } finally {
      setImporting(false);
    }
  };

  const closeImportModal = () => {
    setShowImportModal(false);
    setImportRows([]);
    setImportResults([]);
  };

  const filtered = expenses.filter(e =>
    e.category?.toLowerCase().includes(search.toLowerCase()) ||
    e.description?.toLowerCase().includes(search.toLowerCase())
  );

  const formatDate = (dateStr: string) =>
    new Date(dateStr).toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" });

  const capitalize = (str: string) => str ? str.charAt(0).toUpperCase() + str.slice(1) : "";

  return (
    <div className="System-container">
      
      <div className="System-layout">
        <Sidebar sidebarOpen={sidebarOpen} setSidebarOpen={setSidebarOpen} />
          <div className="System-content-wrapper">
          <Header title="All Expenses" sidebarOpen={sidebarOpen} setSidebarOpen={setSidebarOpen} />

        <div className="System-content">
          <div className="System-toolbar">
            <input
              className="search-input"
              placeholder="Search by category or description..."
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
            <div style={{ display: "flex", gap: "10px" }}>
              <input
                ref={fileInputRef}
                type="file"
                accept=".xlsx,.xls,.csv"
                style={{ display: "none" }}
                onChange={handleFileUpload}
              />
             
              <button
                className="import-btn"
                onClick={() => fileInputRef.current?.click()}
                disabled={mappingHeaders}
              >
                {mappingHeaders ? "Analyzing..." : <><FiArrowDown size={15} /> Import</>}
              </button>
              
               
              <button
                className="add-btn"
                onClick={() => { setForm(emptyForm()); setSubmitError(""); setShowModal(true); }}
              >
                + Add Expenses
              </button>
             
            </div>
          </div>

          {mappingHeaders && (
            <div className="ai-mapping-banner">
              <span>🤖</span>
              AI is analyzing your Excel column headers...
            </div>
          )}

          <div className="Expenses-table-wrapper">
            {loading ? (
              <p className="empty-msg">Loading expenses...</p>
            ) : filtered.length === 0 ? (
              <p className="empty-msg">No expenses yet. Click "+ Add Expenses" to get started!</p>
            ) : (
              <table className="Expenses-table">
                <thead>
                  <tr>
                    <th>Date</th>
                    <th>Category</th>
                    <th>Description</th>
                    <th>Amount</th>
                    <th>Created By</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map(expense => (
                    <tr key={expense._id} onClick={() => setSelectedExpense(expense)} className="Expenses-row">
                      <td>{formatDate(expense.date)}</td>
                      <td><span className="Expenses-category-badge">{capitalize(expense.category)}</span></td>
                      <td className="Expenses-description">{expense.description}</td>
                      <td className="Expenses-amount">BHD {Number(expense.amount).toFixed(3)}</td>
                      <td>{expense.createdBy}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      </div>

      {/* ── View Expense Modal ── */}
      {selectedExpense && (
        <div className="modal-overlay" onClick={() => setSelectedExpense(null)}>
          <div className="modal view-modal" onClick={e => e.stopPropagation()}>
            <div className="view-modal-body">
              <h2>{capitalize(selectedExpense.category)}</h2>
              <div className="view-detail-row">
                <span className="view-label">Date</span>
                <span className="view-value">{formatDate(selectedExpense.date)}</span>
              </div>
              <div className="view-detail-row">
                <span className="view-label">Amount</span>
                <span className="view-value" style={{ color: "#e6a817" }}>BHD {Number(selectedExpense.amount).toFixed(3)}</span>
              </div>
              <div className="view-detail-row">
                <span className="view-label">Description</span>
                <span className="view-value">{selectedExpense.description}</span>
              </div>
              <div className="view-detail-row">
                <span className="view-label">Created By</span>
                <span className="view-value">{selectedExpense.createdBy}</span>
              </div>
              <div className="view-modal-actions">
                <button className="cancel-btn" onClick={() => setSelectedExpense(null)}>Close</button>
                {isAdmin && (
                  <button className="delete-btn-modal" onClick={() => handleDeleteExpense(selectedExpense._id)}>Delete</button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── Add Expense Modal ── */}
      {showModal && (
        <div className="modal-overlay" onClick={() => { setShowModal(false); setForm(emptyForm()); }}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <h2>Add New Expense</h2>

            <label>Date *</label>
            <input type="date" value={form.date} onChange={e => setField("date", e.target.value)} className={form.errors.date ? "input-error-border" : ""} />
            {form.errors.date && <p className="input-error">{form.errors.date}</p>}

            <label>Category *</label>
            <select value={form.category} onChange={e => setField("category", e.target.value)} className={`Expenses-select ${form.errors.category ? "input-error-border" : ""}`}>
              <option value="">Select category...</option>
              {CATEGORIES.map(cat => <option key={cat} value={cat}>{capitalize(cat)}</option>)}
            </select>
            {form.errors.category && <p className="input-error">{form.errors.category}</p>}

            <label>Amount (BHD) *</label>
            <input
              type="number"
              value={form.amount}
              onChange={e => setField("amount", e.target.value)}
              placeholder="0.000"
              min={0}
              className={`price-input-bhd${form.errors.amount ? " input-error-border" : ""}`}
            />
            {form.errors.amount && <p className="input-error">{form.errors.amount}</p>}

            <label>Description *</label>
            <input value={form.description} onChange={e => setField("description", e.target.value)} placeholder="e.g. Monthly rent payment" className={form.errors.description ? "input-error-border" : ""} />
            {form.errors.description && <p className="input-error">{form.errors.description}</p>}

            {submitError && <p className="input-error" style={{ textAlign: "center" }}>{submitError}</p>}

            <div className="modal-actions">
              <button type="button" className="cancel-btn" onClick={() => { setShowModal(false); setForm(emptyForm()); }}>Cancel</button>
              <button type="button" className="confirm-btn" onClick={handleAdd}>Add Expense</button>
            </div>
          </div>
        </div>
      )}

      {/* ── Import Preview Modal ── */}
      {showImportModal && (
        <div className="modal-overlay" onClick={closeImportModal}>
          <div className="modal import-modal" onClick={e => e.stopPropagation()}>
            <h2>Import Preview</h2>

            {importResults.length === 0 && (
              <>
                <p style={{ fontSize: "13px", color: "#888", margin: "-4px 0 8px" }}>
                  {importRows.filter(r => !r.error).length} valid rows,{" "}
                  {importRows.filter(r => r.error).length} with errors
                </p>
                <div className="import-table-wrapper">
                  <table className="Expenses-table">
                    <thead>
                      <tr><th>Date</th><th>Category</th><th>Amount</th><th>Description</th><th>Status</th></tr>
                    </thead>
                    <tbody>
                      {importRows.map((row, i) => (
                        <tr key={i} className={row.error ? "import-row-error" : "import-row-ok"}>
                          <td>{row.date}</td>
                          <td>{capitalize(row.category)}</td>
                          <td>BHD {Number(row.amount).toFixed(3)}</td>
                          <td>{row.description}</td>
                          <td>
                            {row.error
                              ? <span className="import-error-badge">✕ {row.error}</span>
                              : <span className="import-ok-badge">✓ OK</span>
                            }
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <div className="modal-actions">
                  <button type="button" className="cancel-btn" onClick={closeImportModal}>Cancel</button>
                  <button
                    type="button"
                    className="confirm-btn"
                    onClick={handleImportConfirm}
                    disabled={importing || importRows.filter(r => !r.error).length === 0}
                  >
                    {importing ? "Importing..." : `Import ${importRows.filter(r => !r.error).length} Rows`}
                  </button>
                </div>
              </>
            )}

            {importResults.length > 0 && (
              <>
                <p style={{ fontSize: "13px", color: "#888", margin: "-4px 0 8px" }}>
                  {importResults.filter(r => r.status === "success").length} imported,{" "}
                  {importResults.filter(r => r.status === "error").length} failed,{" "}
                  {importResults.filter(r => r.status === "skipped").length} skipped
                </p>
                <div className="import-table-wrapper">
                  <table className="Expenses-table">
                    <thead>
                      <tr><th>Description</th><th>Result</th><th>Details</th></tr>
                    </thead>
                    <tbody>
                      {importResults.map((r, i) => (
                        <tr key={i} className={r.status === "success" ? "import-row-ok" : "import-row-error"}>
                          <td>{r.description}</td>
                          <td>
                            {r.status === "success" && <span className="import-ok-badge">✓ Saved</span>}
                            {r.status === "error"   && <span className="import-error-badge">✕ Failed</span>}
                            {r.status === "skipped" && <span style={{ color: "#888", fontSize: "12px", fontWeight: 600 }}>⚠ Skipped</span>}
                          </td>
                          <td style={{ fontSize: "12px", color: "#666" }}>{r.message ?? "—"}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <div className="modal-actions">
                  <button type="button" className="confirm-btn" onClick={closeImportModal}>Done</button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
    </div>
  );
};

export default Expenses;