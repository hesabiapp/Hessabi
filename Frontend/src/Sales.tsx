import React, { useState, useEffect, useRef } from "react";
import "./Style/Sales.css";
import "./Style/System.css";
import * as XLSX from "xlsx";
import Header from "./components/Header";
import Sidebar from "./components/Sidebar";
import { useUserRole } from "./hooks/useUserRole";
import { FiArrowDown } from "react-icons/fi";



const API = import.meta.env.VITE_API_URL;

type SaleItem = {
  productId: string;
  itemName: string;
  color: string;
  size: string;
  quantity: number;
  unitPrice: number;
  unitCost: number;
  vatRate: number;
  itemTotalPrice: number;
  itemNetPrice: number;
  itemVatAmount: number;
  itemTotalCost: number;
};

type Sale = {
  invoiceNumber: string;
  date: string;
  customerName: string;
  items: SaleItem[];
  totalSales: number;
  totalNetSales: number;
  totalVat: number;
  source: string;
  paymentMethod: string;
  createdBy: string;
};

type Product = {
  productId: string;
  itemName: string;
  sellingPrice: number;
  costPrice: number;
  vatRate: number;
  color: string;
  sizes: { size: string; stock: number }[];
};

type FormItem = {
  productId: string;
  size: string;
  quantity: string;
  unitPrice: string;
};

type FormState = {
  invoiceNumber: string;
  date: string;
  customerName: string;
  paymentMethod: string;
  items: FormItem[];
  errors: Record<string, string>;
};

type ImportRow = {
  invoice: string;
  date: string;
  customer: string;
  payment: string;
  productName: string;
  size: string;
  quantity: string;
  price: string;
  error?: string;
  warning?: string;
};

const emptyItem = (): FormItem => ({
  productId: "",
  size: "",
  quantity: "1",
  unitPrice: "",
});

// FIX: removed count parameter — invoice number is now fetched from the backend
const emptyForm = (): FormState => ({
  invoiceNumber: "...",
  date: new Date().toISOString().split("T")[0],
  customerName: "",
  paymentMethod: "Cash",
  items: [emptyItem()],
  errors: {},
});

const getNetPrice  = (unitPrice: number, vatRate: number) => unitPrice / (1 + vatRate / 100);
const getVatAmount = (unitPrice: number, vatRate: number) => unitPrice - getNetPrice(unitPrice, vatRate);

const Sales = () => {
  const [sidebarOpen, setSidebarOpen]         = useState(true);
  const [sales, setSales]                     = useState<Sale[]>([]);
  const [products, setProducts]               = useState<Product[]>([]);
  const [loading, setLoading]                 = useState(true);
  const [showModal, setShowModal]             = useState(false);
  const [showImportModal, setShowImportModal] = useState(false);
  const [selectedSale, setSelectedSale]       = useState<Sale | null>(null);
  const [search, setSearch]                   = useState("");
  const [form, setForm]                       = useState<FormState>(emptyForm());
  const [submitError, setSubmitError]         = useState("");
  const [importRows, setImportRows]           = useState<ImportRow[]>([]);
  const [importing, setImporting]             = useState(false);
  const [mappingHeaders, setMappingHeaders]   = useState(false);
  const [importResults, setImportResults]     = useState<{ invoice: string; status: string; message?: string }[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const role = useUserRole();
  const isAdmin = role === "Admin";


  useEffect(() => {
    fetchSales();
    fetchProducts();
  }, []);

  const fetchSales = async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API}/sales/viewSales`, { headers: { Authorization: `Bearer ${localStorage.getItem("token")}` } });
      const data = await res.json();
      if (res.ok) setSales(data.sales ?? []);
      else setSales([]);
    } catch (err) {
      console.error("Failed to fetch sales:", err);
      setSales([]);
    } finally {
      setLoading(false);
    }
  };

  const fetchProducts = async () => {
    try {
      const res = await fetch(`${API}/product/viewProducts`, { headers: { Authorization: `Bearer ${localStorage.getItem("token")}` } });
      const data = await res.json();
      if (res.ok) setProducts(data.products ?? []);
    } catch (err) {
      console.error("Failed to fetch products:", err);
    }
  };

  // FIX: fetch the next invoice number from the backend counter instead of calculating client-side
  const fetchNextInvoiceNumber = async (): Promise<string> => {
    try {
      const res = await fetch(`${API}/sales/nextInvoiceNumber`, {
        headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
      });
      const data = await res.json();
      return data.invoiceNumber ?? "INV-???";
    } catch {
      return "INV-???";
    }
  };

  const setField = (key: keyof FormState, value: any) =>
    setForm(f => ({ ...f, [key]: value, errors: { ...f.errors, [key]: "" } }));

  const updateItem = (i: number, key: keyof FormItem, val: string) => {
    const updated = form.items.map((item, idx) => {
      if (idx !== i) return item;
      const newItem = { ...item, [key]: val };
      if (key === "productId") {
        const product = products.find(p => p.productId === val);
        if (product) {
          newItem.unitPrice = String(product.sellingPrice);
          newItem.size = "";
        }
      }
      return newItem;
    });
    setForm(f => ({ ...f, items: updated }));
  };

  const addItem = () => setForm(f => ({ ...f, items: [...f.items, emptyItem()] }));

  const removeItem = (i: number) =>
    setForm(f => ({ ...f, items: f.items.filter((_, idx) => idx !== i) }));

  const calcTotalWithVat = () =>
    form.items.reduce((sum, item) =>
      sum + (Number(item.quantity) || 0) * (Number(item.unitPrice) || 0), 0);

  const calcTotalNet = () =>
    form.items.reduce((sum, item) => {
      const product = getSelectedProduct(item.productId);
      const vatRate = product?.vatRate ?? 0;
      const net = getNetPrice(Number(item.unitPrice) || 0, vatRate);
      return sum + (Number(item.quantity) || 0) * net;
    }, 0);

  const calcTotalVat = () => calcTotalWithVat() - calcTotalNet();

  const validateForm = (): boolean => {
    const errs: Record<string, string> = {};
    if (!form.invoiceNumber.trim()) errs.invoiceNumber = "Invoice number is required";
    if (!form.date.trim())          errs.date = "Date is required";
    if (!form.customerName.trim())  errs.customerName = "Customer name is required";
    form.items.forEach((item, i) => {
      if (!item.productId)                                errs[`product_${i}`] = "Select a product";
      const product = getSelectedProduct(item.productId);
      const hasSizes = product && product.sizes && product.sizes.length > 0;
      if (hasSizes && !item.size.trim())                  errs[`size_${i}`]    = "Size is required";
      if (!item.quantity || Number(item.quantity) <= 0)   errs[`qty_${i}`]     = "Quantity must be > 0";
      if (!item.unitPrice || Number(item.unitPrice) <= 0) errs[`price_${i}`]   = "Price is required";
    });
    setForm(f => ({ ...f, errors: errs }));
    return Object.keys(errs).length === 0;
  };

  const handleAdd = async () => {
    if (!validateForm()) return;
    setSubmitError("");
    try {
      const payload = {
        invoiceNumber: form.invoiceNumber,
        date:          form.date,
        customerName:  form.customerName,
        paymentMethod: form.paymentMethod,
        source:        "manual",
        items: form.items.map(item => ({
          productId: item.productId,
          size:      item.size,
          quantity:  Number(item.quantity),
          unitPrice: Number(item.unitPrice),
        })),
      };

      const res = await fetch(`${API}/sales/addSales`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${localStorage.getItem("token")}` },
        body: JSON.stringify(payload),
      });

      const text = await res.text();
      let data: any = {};
      try { data = JSON.parse(text); } catch {}

      if (res.ok) {
        await fetchSales();
        await fetchProducts();
        setShowModal(false);
        setForm(emptyForm());
      } else {
        setSubmitError(data.message ?? `Error ${res.status}`);
      }
    } catch (err) {
      console.error("Add sale error:", err);
      setSubmitError("Something went wrong. Please try again.");
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
          invoice: -1, date: -1, customer: -1, payment: -1,
          productName: -1, size: -1, quantity: -1, price: -1,
        };

        try {
          const aiRes = await fetch(`${API}/sales/mapHeaders`, {
            method: "POST",
            headers: { "Content-Type": "application/json", Authorization: `Bearer ${localStorage.getItem("token")}` },
            body: JSON.stringify({ headers: excelHeaders }),
          });
          const aiData = await aiRes.json();
          if (aiRes.ok && aiData.mapping) {
            colIndex = aiData.mapping;
          } else {
            colIndex = { invoice: 0, date: 1, customer: 2, payment: 3, productName: 4, size: 5, quantity: 6, price: 7 };
          }
        } catch (aiErr) {
          console.error("Header mapping failed, using positional fallback:", aiErr);
          colIndex = { invoice: 0, date: 1, customer: 2, payment: 3, productName: 4, size: 5, quantity: 6, price: 7 };
        } finally {
          setMappingHeaders(false);
        }

        const getCell = (row: any[], field: string): string => {
          const idx = colIndex[field];
          return idx !== -1 && row[idx] != null ? String(row[idx]).trim() : "";
        };

        const parsed: ImportRow[] = rows.slice(1).filter(row => row.length > 0).map(row => {
          const invoice     = getCell(row, "invoice");
          const rawDate     = getCell(row, "date");
          const customer    = getCell(row, "customer");
          const payment     = getCell(row, "payment") || "Cash";
          const productName = getCell(row, "productName");
          const size        = getCell(row, "size");
          const quantity    = getCell(row, "quantity");
          const price       = getCell(row, "price");

          let date = rawDate;
          if (!isNaN(Number(rawDate)) && rawDate !== "") {
            const d = XLSX.SSF.parse_date_code(Number(rawDate));
            date = `${d.y}-${String(d.m).padStart(2, "0")}-${String(d.d).padStart(2, "0")}`;
          }

          let error   = "";
          let warning = "";

          if (!invoice)                                  error = "Missing invoice number";
          else if (!date)                                error = "Missing date";
          else if (!customer)                            error = "Missing customer name";
          else if (!productName)                         error = "Missing product name";
          else if (!quantity || isNaN(Number(quantity))) error = "Invalid quantity";
          else if (!price || isNaN(Number(price)))       error = "Invalid price";
          else {
            const found = products.find(p => p.itemName.toLowerCase() === productName.toLowerCase());
            if (!found) error = `Product not found: ${productName}`;
          }

          if (!error && !["Cash", "BenefitPay"].includes(payment)) {
            warning = `Invalid payment "${payment}", will default to Cash`;
          }

          return { invoice, date, customer, payment, productName, size, quantity, price, error, warning };
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
      const res = await fetch(`${API}/sales/importSales`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${localStorage.getItem("token")}` },
        body: JSON.stringify({ rows: validRows }),
      });

      const data = await res.json();
      setImportResults(data.results ?? []);
      await fetchSales();
    } catch (err) {
      console.error("Import error:", err);
    } finally {
      setImporting(false);
    }
  };

  const handleDeleteSale = async (invoiceNumber: string) => {
    if (!confirm(`Are you sure you want to delete ${invoiceNumber}? Stock will be restored.`)) return;
    try {
      const res = await fetch(`${API}/sales/deleteSale`, {
        method: "DELETE",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${localStorage.getItem("token")}` },
        body: JSON.stringify({ invoiceNumber }),
      });
      if (res.ok) {
        setSales(prev => prev.filter(s => s.invoiceNumber !== invoiceNumber));
        await fetchProducts();
        setSelectedSale(null);
      } else {
        const data = await res.json();
        alert(data.message ?? "Failed to delete sale.");
      }
    } catch (err) {
      console.error("Delete sale error:", err);
    }
  };

  const closeImportModal = () => {
    setShowImportModal(false);
    setImportRows([]);
    setImportResults([]);
  };

  const filtered = sales.filter(s =>
    s.customerName?.toLowerCase().includes(search.toLowerCase()) ||
    s.invoiceNumber?.toLowerCase().includes(search.toLowerCase())
  );

  const formatDate = (dateStr: string) =>
    new Date(dateStr).toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" });

  const getSelectedProduct = (productId: string) =>
    products.find(p => p.productId === productId);

  return (
    <div className="System-container">
      <div className="System-layout">
        <Sidebar sidebarOpen={sidebarOpen} setSidebarOpen={setSidebarOpen} />
        <div className="System-content-wrapper">
          <Header title="All Sales" sidebarOpen={sidebarOpen} setSidebarOpen={setSidebarOpen} />

          <div className="System-content">
            <div className="System-toolbar">
              <input
                className="search-input"
                placeholder="Search by customer or invoice..."
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

                {/* FIX: fetch next invoice number from backend before opening the modal */}
                <button
                  className="add-btn"
                  onClick={async () => {
                    const invoiceNumber = await fetchNextInvoiceNumber();
                    setForm({ ...emptyForm(), invoiceNumber });
                    setSubmitError("");
                    setShowModal(true);
                  }}
                >
                  + Add Sale
                </button>
              </div>
            </div>

            {mappingHeaders && (
              <div className="ai-mapping-banner">
                <span>🤖</span>
                AI is analyzing your Excel column headers...
              </div>
            )}

            <div className="sales-table-wrapper">
              {loading ? (
                <p className="empty-msg">Loading sales...</p>
              ) : filtered.length === 0 ? (
                <p className="empty-msg">No sales yet. Click "+ Add Sale" to get started!</p>
              ) : (
                <table className="sales-table">
                  <thead>
                    <tr>
                      <th>Date</th>
                      <th>Invoice</th>
                      <th>Customer</th>
                      <th>Description</th>
                      <th>Items</th>
                      <th>Qty</th>
                      <th>Amount</th>
                      <th>Payment</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filtered.map(sale => (
                      <tr key={sale.invoiceNumber} onClick={() => setSelectedSale(sale)} className="sale-row">
                        <td>{formatDate(sale.date)}</td>
                        <td className="invoice-num">{sale.invoiceNumber}</td>
                        <td>{sale.customerName}</td>
                        <td className="sale-description">
                          {sale.items.map(item => `${item.itemName} (${item.size})`).join(", ")}
                        </td>
                        <td>{sale.items.length} item{sale.items.length !== 1 ? "s" : ""}</td>
                        <td>{sale.items.reduce((sum, item) => sum + item.quantity, 0)}</td>
                        <td className="sale-amount">BHD {sale.totalSales?.toFixed(3)}</td>
                        <td>
                          <span className={`payment-badge ${sale.paymentMethod === "Cash" ? "cash" : "benefit"}`}>
                            {sale.paymentMethod}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        </div>

        {/* View Sale Modal */}
        {selectedSale && (
          <div className="modal-overlay" onClick={() => setSelectedSale(null)}>
            <div className="modal view-modal" onClick={e => e.stopPropagation()}>
              <div className="view-modal-body">
                <h2>{selectedSale.customerName}</h2>
                <div className="view-detail-row">
                  <span className="view-label">Invoice</span>
                  <span className="view-value">{selectedSale.invoiceNumber}</span>
                </div>
                <div className="view-detail-row">
                  <span className="view-label">Date</span>
                  <span className="view-value">{formatDate(selectedSale.date)}</span>
                </div>
                <div className="view-detail-row">
                  <span className="view-label">Payment</span>
                  <span className="view-value">{selectedSale.paymentMethod}</span>
                </div>
                <div className="view-detail-row">
                  <span className="view-label">Created By</span>
                  <span className="view-value">{selectedSale.createdBy}</span>
                </div>

                <label style={{ marginTop: "12px", display: "block" }}>Items</label>
                <table className="sales-items-table">
                  <thead>
                    <tr>
                      <th>Product</th>
                      <th>Size</th>
                      <th>Qty</th>
                      <th>Unit Price</th>
                      <th>VAT</th>
                      <th>Total</th>
                    </tr>
                  </thead>
                  <tbody>
                    {selectedSale.items.map((item, i) => (
                      <tr key={i}>
                        <td>{item.itemName}</td>
                        <td>{item.size}</td>
                        <td>{item.quantity}</td>
                        <td>BHD {item.unitPrice?.toFixed(3)}</td>
                        <td>
                          {item.vatRate > 0
                            ? <span style={{ color: "#888", fontSize: "12px" }}>{item.vatRate}%</span>
                            : <span style={{ color: "#ccc", fontSize: "12px" }}>—</span>
                          }
                        </td>
                        <td>BHD {item.itemTotalPrice?.toFixed(3)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>

                {(() => {
                  const totalIncVat = selectedSale.totalSales ?? 0;
                  const totalNet    = selectedSale.totalNetSales
                    ?? selectedSale.items.reduce((s, item) => {
                      const net = (item.itemNetPrice ?? item.itemTotalPrice / (1 + (item.vatRate ?? 0) / 100)) ?? 0;
                      return s + net;
                    }, 0);
                  const vatAmount = selectedSale.totalVat ?? (totalIncVat - totalNet);
                  const hasVat    = vatAmount > 0.001;

                  return (
                    <>
                      {hasVat && (
                        <>
                          <div className="view-detail-row" style={{ marginTop: "12px" }}>
                            <span className="view-label">Net Total (excl. VAT)</span>
                            <span className="view-value">BHD {totalNet.toFixed(3)}</span>
                          </div>
                          <div className="view-detail-row">
                            <span className="view-label">VAT Amount</span>
                            <span className="view-value" style={{ color: "#888" }}>BHD {vatAmount.toFixed(3)}</span>
                          </div>
                        </>
                      )}
                      <div className="view-detail-row" style={{ marginTop: hasVat ? "0" : "12px" }}>
                        <span className="view-label">Total {hasVat ? "(incl. VAT)" : ""}</span>
                        <span className="view-value" style={{ color: "#e6a817", fontWeight: 700 }}>
                          BHD {totalIncVat.toFixed(3)}
                        </span>
                      </div>
                    </>
                  );
                })()}

                <div className="view-modal-actions">
                  <button className="cancel-btn" onClick={() => setSelectedSale(null)}>Close</button>
                  {isAdmin && (
                    <button className="delete-btn-modal" onClick={() => handleDeleteSale(selectedSale.invoiceNumber)}>Delete Sale</button>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Add Sale Modal */}
        {showModal && (
          <div className="modal-overlay" onClick={() => { setShowModal(false); setForm(emptyForm()); }}>
            <div className="modal sales-modal" onClick={e => e.stopPropagation()}>
              <h2>Add New Sale</h2>

              <label>Invoice Number</label>
              <p className="invoice-display">{form.invoiceNumber}</p>

              <label>Date *</label>
              <input
                type="date"
                value={form.date}
                onChange={e => setField("date", e.target.value)}
                className={form.errors.date ? "input-error-border" : ""}
              />
              {form.errors.date && <p className="input-error">{form.errors.date}</p>}

              <label>Customer Name *</label>
              <input
                value={form.customerName}
                onChange={e => setField("customerName", e.target.value)}
                placeholder="e.g. Fatima Al-Ali"
                className={form.errors.customerName ? "input-error-border" : ""}
              />
              {form.errors.customerName && <p className="input-error">{form.errors.customerName}</p>}

              <label>Payment Method</label>
              <div className="image-toggle">
                <button type="button" className={form.paymentMethod === "Cash" ? "toggle-active" : ""} onClick={() => setField("paymentMethod", "Cash")}>Cash</button>
                <button type="button" className={form.paymentMethod === "BenefitPay" ? "toggle-active" : ""} onClick={() => setField("paymentMethod", "BenefitPay")}>BenefitPay</button>
              </div>

              <label>Items *</label>
              {form.items.map((item, i) => {
                const selectedProduct = getSelectedProduct(item.productId);
                const hasSizes = selectedProduct && selectedProduct.sizes && selectedProduct.sizes.length > 0;

                return (
                  <div key={i} className="sale-item-row">
                    <div className="sale-item-grid">
                      <div>
                        <select
                          value={item.productId}
                          onChange={e => updateItem(i, "productId", e.target.value)}
                          className={`sale-select ${form.errors[`product_${i}`] ? "input-error-border" : ""}`}
                        >
                          <option value="">Select product...</option>
                          {products.map(p => (
                            <option key={p.productId} value={p.productId}>{p.itemName} ({p.color})</option>
                          ))}
                        </select>
                        {form.errors[`product_${i}`] && <p className="input-error">{form.errors[`product_${i}`]}</p>}
                      </div>

                      {hasSizes ? (
                        <div>
                          <select
                            value={item.size}
                            onChange={e => updateItem(i, "size", e.target.value)}
                            className={`sale-select ${form.errors[`size_${i}`] ? "input-error-border" : ""}`}
                          >
                            <option value="">Size...</option>
                            {selectedProduct.sizes.map(s => (
                              <option key={s.size} value={s.size}>{s.size} ({s.stock} left)</option>
                            ))}
                          </select>
                          {form.errors[`size_${i}`] && <p className="input-error">{form.errors[`size_${i}`]}</p>}
                        </div>
                      ) : (
                        <div style={{ display: "flex", alignItems: "center", padding: "8px 10px", background: "#f5f6fa", borderRadius: "8px", fontSize: "13px", color: "#aaa" }}>
                          No sizes
                        </div>
                      )}

                      <div>
                        <input
                          type="number"
                          value={item.quantity}
                          onChange={e => updateItem(i, "quantity", e.target.value)}
                          placeholder="Qty"
                          min={1}
                          className={form.errors[`qty_${i}`] ? "input-error-border" : ""}
                        />
                        {form.errors[`qty_${i}`] && <p className="input-error">{form.errors[`qty_${i}`]}</p>}
                      </div>

                      <div>
                        <input
                          type="number"
                          value={item.unitPrice}
                          onChange={e => updateItem(i, "unitPrice", e.target.value)}
                          placeholder="Price incl. VAT (BHD)"
                          min={0}
                          className={form.errors[`price_${i}`] ? "input-error-border" : ""}
                        />
                        {form.errors[`price_${i}`] && <p className="input-error">{form.errors[`price_${i}`]}</p>}
                      </div>
                    </div>

                    {form.items.length > 1 && (
                      <div style={{ display: "flex", justifyContent: "flex-end", marginTop: "6px" }}>
                        <button type="button" className="delete-btn" onClick={() => removeItem(i)}>✕ Remove</button>
                      </div>
                    )}
                  </div>
                );
              })}

              <button type="button" className="add-size-btn" onClick={addItem}>+ Add Item</button>

              <div className="sale-total-preview">
                <div style={{ width: "100%" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", gap: "40px" }}>
                    <span style={{ color: "#888", fontSize: "13px", fontWeight: 400 }}>Net Total (excl. VAT)</span>
                    <span style={{ color: "#2F4157", fontSize: "13px" }}>BHD {calcTotalNet().toFixed(3)}</span>
                  </div>
                  <div style={{ display: "flex", justifyContent: "space-between", gap: "40px", marginTop: "6px" }}>
                    <span style={{ color: "#888", fontSize: "13px", fontWeight: 400 }}>VAT</span>
                    <span style={{ color: "#888", fontSize: "13px" }}>BHD {calcTotalVat().toFixed(3)}</span>
                  </div>
                  <div style={{ display: "flex", justifyContent: "space-between", gap: "40px", marginTop: "8px", paddingTop: "8px", borderTop: "1px solid #e0e0e0" }}>
                    <span style={{ fontWeight: 700 }}>Total (incl. VAT)</span>
                    <span style={{ color: "#e6a817", fontWeight: 700, fontSize: "16px" }}>BHD {calcTotalWithVat().toFixed(3)}</span>
                  </div>
                </div>
              </div>

              {submitError && <p className="input-error" style={{ textAlign: "center" }}>{submitError}</p>}

              <div className="modal-actions">
                <button type="button" className="cancel-btn" onClick={() => { setShowModal(false); setForm(emptyForm()); }}>Cancel</button>
                <button type="button" className="confirm-btn" onClick={handleAdd}>Add Sale</button>
              </div>
            </div>
          </div>
        )}

        {/* Import Preview Modal */}
        {showImportModal && (
          <div className="modal-overlay" onClick={closeImportModal}>
            <div className="modal import-modal" onClick={e => e.stopPropagation()}>
              <h2>Import Preview</h2>

              {importResults.length === 0 && (
                <>
                  <p className="import-summary-text">
                    {importRows.filter(r => !r.error).length} valid rows,{" "}
                    {importRows.filter(r => r.error).length} with errors
                  </p>
                  <div className="import-table-wrapper">
                    <table className="sales-table">
                      <thead>
                        <tr>
                          <th>Invoice</th><th>Date</th><th>Customer</th><th>Product</th>
                          <th>Size</th><th>Qty</th><th>Price (incl. VAT)</th><th>Status</th>
                        </tr>
                      </thead>
                      <tbody>
                        {importRows.map((row, i) => (
                          <tr key={i} className={row.error ? "import-row-error" : "import-row-ok"}>
                            <td>{row.invoice}</td>
                            <td>{row.date}</td>
                            <td>{row.customer}</td>
                            <td>{row.productName}</td>
                            <td>{row.size}</td>
                            <td>{row.quantity}</td>
                            <td>BHD {Number(row.price).toFixed(3)}</td>
                            <td>
                              {row.error
                                ? <span className="import-error-badge">✕ {row.error}</span>
                                : row.warning
                                  ? <span className="import-warning-badge">⚠ {row.warning}</span>
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
                  <p className="import-summary-text">
                    {importResults.filter(r => r.status === "success").length} imported,{" "}
                    {importResults.filter(r => r.status === "error").length} failed,{" "}
                    {importResults.filter(r => r.status === "skipped").length} skipped
                  </p>
                  <div className="import-table-wrapper">
                    <table className="sales-table">
                      <thead>
                        <tr><th>Invoice</th><th>Result</th><th>Details</th></tr>
                      </thead>
                      <tbody>
                        {importResults.map((r, i) => (
                          <tr key={i} className={r.status === "success" ? "import-row-ok" : "import-row-error"}>
                            <td>{r.invoice}</td>
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

export default Sales;