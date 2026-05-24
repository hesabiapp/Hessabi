import React, { useState, useEffect } from "react";
import { useLocation } from "react-router-dom";
import "./Style/Product.css";
import Header from "./components/Header";
import Sidebar from "./components/Sidebar";
import { useUserRole } from "./hooks/useUserRole";



const API = import.meta.env.VITE_API_URL;

type SizeEntry = { size: string; stock: number };

type Product = {
  productId: string;
  itemName: string;
  category: string;
  color: string;
  costPrice: number;
  sellingPrice: number;
  vatRate: number;
  description: string;
  stock: number;
  sizes: SizeEntry[];
  photo: string;
  photoUrl: string;
  active: boolean;
};

type FormState = {
  itemName: string;
  category: string;
  color: string;
  costPrice: string;
  sellingPrice: string;
  vatRate: string;
  description: string;
  stock: string;
  sizes: SizeEntry[];
  imageType: "url" | "upload";
  imageUrl: string;
  imageFile: File | null;
  imagePreview: string;
  errors: Record<string, string>;
};

const emptyForm = (): FormState => ({
  itemName: "",
  category: "",
  color: "",
  costPrice: "",
  sellingPrice: "",
  vatRate: "10", 
  description: "",
  stock: "0",
  sizes: [],
  imageType: "url",
  imageUrl: "",
  imageFile: null,
  imagePreview: "",
  errors: {},
});


const calcNetPrice = (sellingPrice: number, vatRate: number): number =>
  sellingPrice / (1 + vatRate / 100);

const calcVatAmount = (sellingPrice: number, vatRate: number): number =>
  sellingPrice - calcNetPrice(sellingPrice, vatRate);

const calcProfit = (sellingPrice: number, vatRate: number, costPrice: number): number =>
  calcNetPrice(sellingPrice, vatRate) - costPrice;

const calcMargin = (sellingPrice: number, vatRate: number, costPrice: number): number => {
  const net = calcNetPrice(sellingPrice, vatRate);
  if (net === 0) return 0;
  return ((net - costPrice) / net) * 100;
};

const Products = () => {
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [search, setSearch] = useState("");
  const [form, setForm] = useState<FormState>(emptyForm());
  const role = useUserRole();
  const isAdmin = role === "Admin";

  useEffect(() => {
    fetchProducts();
  }, []);

  const fetchProducts = async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API}/product/viewProducts`, { headers: { Authorization: `Bearer ${localStorage.getItem("token")}` } });
      const data = await res.json();
      if (res.ok) setProducts(data.products ?? []);
    } catch (err) {
      console.error("Failed to fetch products:", err);
    } finally {
      setLoading(false);
    }
  };

  const setField = (key: keyof FormState, value: any) =>
    setForm(f => ({ ...f, [key]: value, errors: { ...f.errors, [key]: "" } }));

  const validateForm = (): boolean => {
    const errs: Record<string, string> = {};
    if (!form.itemName.trim()) errs.itemName = "Product name is required";
    if (!form.costPrice.trim()) errs.costPrice = "Cost price is required";
    else if (isNaN(Number(form.costPrice))) errs.costPrice = "Numbers only";
    if (!form.sellingPrice.trim()) errs.sellingPrice = "Selling price is required";
    else if (isNaN(Number(form.sellingPrice))) errs.sellingPrice = "Numbers only";
    if (isNaN(Number(form.vatRate))) errs.vatRate = "Numbers only";
    if (!form.category.trim()) errs.category = "Category is required";
    if (!form.color.trim()) errs.color = "Color is required";
    if (!form.description.trim()) errs.description = "Description is required";
    form.sizes.forEach((s, i) => {
      if (s.size.trim() !== "" && s.stock < 0) errs[`stock_${i}`] = "Stock can't be negative";
    });
    setForm(f => ({ ...f, errors: errs }));
    return Object.keys(errs).length === 0;
  };

  const addSizeRow = () => setField("sizes", [...form.sizes, { size: "", stock: 0 }]);

  const updateSize = (i: number, key: keyof SizeEntry, val: string | number) => {
    const updated = form.sizes.map((s, idx) =>
      idx === i ? { ...s, [key]: key === "stock" ? Number(val) : val } : s
    );
    setField("sizes", updated);
  };

  const removeSize = (i: number) =>
    setField("sizes", form.sizes.filter((_, idx) => idx !== i));

  const buildFormData = (): FormData => {
    const fd = new FormData();
    fd.append("itemName", form.itemName);
    fd.append("category", form.category);
    fd.append("color", form.color);
    fd.append("costPrice", form.costPrice);
    fd.append("sellingPrice", form.sellingPrice);
    fd.append("vatRate", form.vatRate);
    fd.append("description", form.description);
    fd.append("stock", form.stock);
    const validSizes = form.sizes.filter(s => s.size.trim() !== "");
    if (validSizes.length > 0) fd.append("sizes", JSON.stringify(validSizes));
    if (form.imageType === "upload" && form.imageFile) {
      fd.append("photo", form.imageFile);
    } else if (form.imageType === "url" && form.imageUrl.trim()) {
      fd.append("photo", form.imageUrl);
    } else {
      fd.append("photo", "null");
    }
    return fd;
  };

  const handleAdd = async () => {
    if (!validateForm()) {
      console.log("Validation failed:", form.errors);
      return;
    }
    try {
      const res = await fetch(`${API}/product/addProduct`, {
        method: "POST",
        headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
        body: buildFormData(),
      });
      const data = await res.json();
      console.log("Add product response:", res.status, data);
      if (res.ok) {
        setProducts(prev => [...prev, data.product]);
        setShowModal(false);
        setForm(emptyForm());
      } else {
        setForm(f => ({ ...f, errors: { [data.input?.[0] ?? "general"]: data.message } }));
      }
    } catch (err) {
      console.error("Add product error:", err);
    }
  };

  const openEdit = (product: Product) => {
    setEditingProduct(product);
    setSelectedProduct(null);
    setForm({
      itemName: product.itemName,
      category: product.category,
      color: product.color,
      costPrice: String(product.costPrice),
      sellingPrice: String(product.sellingPrice),
      vatRate: String(product.vatRate ?? 10),
      description: product.description,
      stock: String(product.stock ?? 0),
      sizes: product.sizes ?? [],
      imageType: "url",
      imageUrl: product.photoUrl ?? "",
      imageFile: null,
      imagePreview: product.photoUrl ?? "",
      errors: {},
    });
  };

  const handleUpdate = async () => {
    if (!validateForm() || !editingProduct) return;
    try {
      const fd = buildFormData();
      fd.append("productId", editingProduct.productId);
      const res = await fetch(`${API}/product/editProduct`, {
        method: "PUT",
        headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
        body: fd,
      });
      const data = await res.json();
      if (res.ok) {
        setProducts(prev =>
          prev.map(p => p.productId === editingProduct.productId ? { ...data, productId: data.productId } : p)
        );
        setEditingProduct(null);
        setForm(emptyForm());
      } else {
        setForm(f => ({ ...f, errors: { [data.input?.[0] ?? "general"]: data.message } }));
      }
    } catch (err) {
      console.error("Update product error:", err);
    }
  };

  const handleDelete = async (productId: string) => {
    try {
      const res = await fetch(`${API}/product/deleteProduct`, {
        method: "DELETE",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${localStorage.getItem("token")}` },
        body: JSON.stringify({ productId }),
      });
      if (res.ok) setProducts(prev => prev.filter(p => p.productId !== productId));
    } catch (err) {
      console.error("Delete product error:", err);
    }
  };

  const filtered = products.filter(p =>
    p.itemName?.toLowerCase().includes(search.toLowerCase())
  );

  const renderForm = (onConfirm: () => void, onCancel: () => void, title: string) => (
    <div className="modal-overlay" onClick={onCancel}>
      <div className="modal" onClick={e => e.stopPropagation()}>
        <h2>{title}</h2>

        <label>Product Name *</label>
        <input
          value={form.itemName}
          onChange={e => setField("itemName", e.target.value)}
          placeholder="e.g. Blue Abaya"
          className={form.errors.itemName ? "input-error-border" : ""}
        />
        {form.errors.itemName && <p className="input-error">{form.errors.itemName}</p>}

        <label>Category *</label>
        <input
          value={form.category}
          onChange={e => setField("category", e.target.value)}
          placeholder="e.g. Clothing"
          className={form.errors.category ? "input-error-border" : ""}
        />
        {form.errors.category && <p className="input-error">{form.errors.category}</p>}

        <label>Color *</label>
        <input
          value={form.color}
          onChange={e => setField("color", e.target.value)}
          placeholder="e.g. Black"
          className={form.errors.color ? "input-error-border" : ""}
        />
        {form.errors.color && <p className="input-error">{form.errors.color}</p>}

        <label>Cost Price (BHD) *</label>
        <input
          value={form.costPrice}
          onChange={e => setField("costPrice", e.target.value)}
          placeholder="0.000"
          className={`price-input-bhd${form.errors.costPrice ? " input-error-border" : ""}`}
        />
        {form.errors.costPrice && <p className="input-error">{form.errors.costPrice}</p>}

       
        <label>Selling Price incl. VAT (BHD) *</label>
        <input
          value={form.sellingPrice}
          onChange={e => setField("sellingPrice", e.target.value)}
          placeholder="0.000"
          className={`price-input-bhd${form.errors.sellingPrice ? " input-error-border" : ""}`}
        />
        {form.errors.sellingPrice && <p className="input-error">{form.errors.sellingPrice}</p>}

        <label>VAT Rate (%)</label>
        <input
          type="number"
          value={form.vatRate}
          onChange={e => setField("vatRate", e.target.value)}
          placeholder="e.g. 10"
          min={0}
          max={100}
          className={`price-input-pct${form.errors.vatRate ? " input-error-border" : ""}`}
        />
        {form.errors.vatRate && <p className="input-error">{form.errors.vatRate}</p>}

       
        {form.sellingPrice && form.vatRate && !isNaN(Number(form.sellingPrice)) && !isNaN(Number(form.vatRate)) && (
          <div className="vat-preview">
            <div className="vat-preview-row">
              <span>Net Price</span>
              <span>BHD {calcNetPrice(Number(form.sellingPrice), Number(form.vatRate)).toFixed(3)}</span>
            </div>
            <div className="vat-preview-row">
              <span>VAT Amount</span>
              <span>BHD {calcVatAmount(Number(form.sellingPrice), Number(form.vatRate)).toFixed(3)}</span>
            </div>
            {form.costPrice && !isNaN(Number(form.costPrice)) && (
              <>
                <div className="vat-preview-row profit">
                  <span>Profit</span>
                  <span>BHD {calcProfit(Number(form.sellingPrice), Number(form.vatRate), Number(form.costPrice)).toFixed(3)}</span>
                </div>
                <div className="vat-preview-row profit">
                  <span>Profit Margin</span>
                  <span>{calcMargin(Number(form.sellingPrice), Number(form.vatRate), Number(form.costPrice)).toFixed(1)}%</span>
                </div>
              </>
            )}
          </div>
        )}

        <label>Description *</label>
        <input
          value={form.description}
          onChange={e => setField("description", e.target.value)}
          placeholder="Short product description"
          className={form.errors.description ? "input-error-border" : ""}
        />
        {form.errors.description && <p className="input-error">{form.errors.description}</p>}

        <label>Stock *</label>
        <input
          type="number"
          value={form.stock}
          onChange={e => setField("stock", e.target.value)}
          placeholder="0"
          min={0}
          className={form.errors.stock ? "input-error-border" : ""}
        />
        {form.errors.stock && <p className="input-error">{form.errors.stock}</p>}

        <label>Sizes (optional)</label>
        {form.sizes.map((s, i) => (
          <div key={i}>
            <div className="size-row">
              <input
                value={s.size}
                onChange={e => updateSize(i, "size", e.target.value)}
                placeholder="Size (e.g. M)"
              />
              <input
                type="number"
                value={s.stock}
                onChange={e => updateSize(i, "stock", e.target.value)}
                placeholder="Stock"
                min={0}
              />
              <button className="delete-btn" onClick={() => removeSize(i)}>✕</button>
            </div>
            {form.errors[`size_${i}`] && <p className="input-error">{form.errors[`size_${i}`]}</p>}
          </div>
        ))}
        <button className="add-size-btn" onClick={addSizeRow}>+ Add Size</button>

        <label>Image</label>
        <div className="image-toggle">
          <button
            className={form.imageType === "url" ? "toggle-active" : ""}
            onClick={() => setForm(f => ({ ...f, imageType: "url", imageFile: null, imagePreview: "" }))}
          >URL</button>
          <button
            className={form.imageType === "upload" ? "toggle-active" : ""}
            onClick={() => setForm(f => ({ ...f, imageType: "upload", imageUrl: "" }))}
          >Upload</button>
        </div>

        {form.imageType === "url" ? (
          <input
            value={form.imageUrl}
            onChange={e => setField("imageUrl", e.target.value)}
            placeholder="https://..."
          />
        ) : (
          <>
            <input
              id="imgUpload"
              type="file"
              accept="image/*"
              style={{ display: "none" }}
              onChange={e => {
                const file = e.target.files?.[0];
                if (!file) return;
                const reader = new FileReader();
                reader.onload = () => {
                  setForm(f => ({ ...f, imageFile: file, imagePreview: reader.result as string }));
                };
                reader.readAsDataURL(file);
              }}
            />
            {form.imagePreview ? (
              <img
                src={form.imagePreview}
                alt="preview"
                onClick={() => document.getElementById("imgUpload")?.click()}
                style={{ width: "100%", height: "120px", objectFit: "cover", borderRadius: "10px", cursor: "pointer" }}
              />
            ) : (
              <input
                readOnly
                value="Click to upload image"
                onClick={() => document.getElementById("imgUpload")?.click()}
                style={{ cursor: "pointer", textAlign: "center", color: "#aaa", background: "#fafafa", borderStyle: "dashed" }}
              />
            )}
          </>
        )}

        <div className="modal-actions">
          <button className="cancel-btn" onClick={onCancel}>Cancel</button>
          <button className="confirm-btn" onClick={onConfirm}>Confirm</button>
        </div>
      </div>
    </div>
  );

  return (
    <div className="System-container">
      
      <div className="System-layout">
        <Sidebar sidebarOpen={sidebarOpen} setSidebarOpen={setSidebarOpen} />
        <div className="System-content-wrapper">
          <Header title="All Products" sidebarOpen={sidebarOpen} setSidebarOpen={setSidebarOpen} />

        <div className="System-content">
          <div className="System-toolbar">
            <input
              className="search-input"
              placeholder="Search"
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
            {isAdmin && (
              <button className="add-btn" onClick={() => { setForm(emptyForm()); setShowModal(true); }}>+ Add</button>
            )}
          </div>

          <div className="product-grid">
            {loading ? (
              <p className="empty-msg">Loading products...</p>
            ) : filtered.length === 0 ? (
              <p className="empty-msg">No products yet. Click "+ Add" to get started!</p>
            ) : (
              filtered.map(product => (
                <div key={product.productId} className="product-card">
                  {product.photoUrl
                    ? <img src={product.photoUrl} alt={product.itemName} />
                    : <div className="placeholder-img" />
                  }
                  <div className="card-info">
                    <p className="product-name">{product.itemName}</p>
                    {product.category && <p className="product-category">{product.category}</p>}
                    {product.sellingPrice && <p className="product-price">BHD {Number(product.sellingPrice).toFixed(3)}</p>}
                  </div>
                  <div className="card-actions">
                    {isAdmin && (
                    <button className="delete-btn" onClick={() => handleDelete(product.productId)}>✕</button>
                    )}
                    <button className="view-btn" onClick={() => setSelectedProduct(product)}>View details</button>
                  </div>
                </div>
              ))
            )}
          </div>

          {/* View Modal */}
          {selectedProduct && (
            <div className="modal-overlay" onClick={() => setSelectedProduct(null)}>
              <div className="modal view-modal" onClick={e => e.stopPropagation()}>
                {selectedProduct.photoUrl
                  ? <img src={selectedProduct.photoUrl} alt={selectedProduct.itemName} className="view-modal-img" />
                  : <div className="view-modal-placeholder" />
                }
                <div className="view-modal-body">
                  <h2>{selectedProduct.itemName}</h2>

                  <div className="view-detail-row">
                    <span className="view-label">Category</span>
                    <span className="view-value">{selectedProduct.category}</span>
                  </div>
                  <div className="view-detail-row">
                    <span className="view-label">Color</span>
                    <span className="view-value">{selectedProduct.color}</span>
                  </div>
                  <div className="view-detail-row">
                    <span className="view-label">Cost Price</span>
                    <span className="view-value">BHD {Number(selectedProduct.costPrice).toFixed(3)}</span>
                  </div>

                 
                  <div className="view-detail-row">
                    <span className="view-label">Selling Price (incl. VAT)</span>
                    <span className="view-value">BHD {Number(selectedProduct.sellingPrice).toFixed(3)}</span>
                  </div>

                  <div className="view-detail-row">
                    <span className="view-label">VAT Rate</span>
                    <span className="view-value">{selectedProduct.vatRate ?? 10}%</span>
                  </div>

                  {/* VAT Amount — auto-calculated */}
                  <div className="view-detail-row">
                    <span className="view-label">VAT Amount</span>
                    <span className="view-value" style={{ color: "#e6a817" }}>
                      BHD {calcVatAmount(Number(selectedProduct.sellingPrice), Number(selectedProduct.vatRate ?? 10)).toFixed(3)}
                    </span>
                  </div>

                  {/* Net Price — auto-calculated */}
                  <div className="view-detail-row">
                    <span className="view-label">Net Price</span>
                    <span className="view-value">
                      BHD {calcNetPrice(Number(selectedProduct.sellingPrice), Number(selectedProduct.vatRate ?? 10)).toFixed(3)}
                    </span>
                  </div>

                  {/* Profit — auto-calculated */}
                  <div className="view-detail-row">
                    <span className="view-label">Profit</span>
                    <span className="view-value" style={{ color: "#2ecc71" }}>
                      BHD {calcProfit(Number(selectedProduct.sellingPrice), Number(selectedProduct.vatRate ?? 10), Number(selectedProduct.costPrice)).toFixed(3)}
                    </span>
                  </div>

                  {/* Profit Margin — auto-calculated */}
                  <div className="view-detail-row">
                    <span className="view-label">Profit Margin</span>
                    <span className="view-value" style={{ color: "#2ecc71" }}>
                      {calcMargin(Number(selectedProduct.sellingPrice), Number(selectedProduct.vatRate ?? 10), Number(selectedProduct.costPrice)).toFixed(1)}%
                    </span>
                  </div>

                  <div className="view-detail-row">
                    <span className="view-label">Stock</span>
                    <span className="view-value">{selectedProduct.stock} Units</span>
                  </div>

                  {selectedProduct.description && (
                    <div className="view-detail-row">
                      <span className="view-label">Description</span>
                      <span className="view-value">{selectedProduct.description}</span>
                    </div>
                  )}

                  {selectedProduct.sizes?.length > 0 && (
                    <div className="view-detail-row">
                      <span className="view-label">Sizes</span>
                      <span className="view-value">
                        {selectedProduct.sizes.map(s => `${s.size}: ${s.stock} units`).join(", ")}
                      </span>
                    </div>
                  )}

                  <div className="view-modal-actions">
                    <button className="cancel-btn" onClick={() => setSelectedProduct(null)}>Close</button>
                    {isAdmin && (
                      <button className="delete-btn-modal" onClick={() => openEdit(selectedProduct)}>Edit Product</button>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Add Modal */}
      {showModal && renderForm(handleAdd, () => { setShowModal(false); setForm(emptyForm()); }, "Add Product")}

      {/* Edit Modal */}
      {editingProduct && renderForm(handleUpdate, () => { setEditingProduct(null); setForm(emptyForm()); }, "Edit Product")}

    </div>
    </div> 
  );
};

export default Products;