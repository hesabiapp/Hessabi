import React, { useState, useEffect, useRef } from "react";
import { Link, useLocation, } from "react-router-dom";
import "./Style/Users.css";
import "./Style/System.css";
import { FaBoxOpen, FaChartLine, FaFileAlt, FaThLarge, FaUserCircle } from "react-icons/fa";
import  UserDropdown  from "./components/UserDropdown";
import Sidebar from "./components/Sidebar";
import Header from "./components/Header";
import { useUserRole } from "./hooks/useUserRole";

const API = import.meta.env.VITE_API_URL;

type User = {
  userId: string;
  username: string;
  Fname: string;
  Lname: string;
  email: string;
  mobile: string | null;
  photo: string | null;
  role: string;
  userStatus: boolean;
};

type FormState = {
  username: string;
  Fname: string;
  Lname: string;
  email: string;
  password: string;
  mobile: string;
  role: string;
  errors: Record<string, string>;
};

const emptyForm = (): FormState => ({
  username: "",
  Fname: "",
  Lname: "",
  email: "",
  password: "",
  mobile: "",
  role: "Accountant",
  errors: {},
});

const Users = () => {
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [search, setSearch] = useState("");
  const [form, setForm] = useState<FormState>(emptyForm());
  const [submitError, setSubmitError] = useState("");
  const location = useLocation();
  const role = useUserRole();
  const isAdmin = role === "Admin";
  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API}/auth/viewUsers`, { headers: { Authorization: `Bearer ${localStorage.getItem("token")}` } });
      const data = await res.json();
      if (res.ok) setUsers(data.users ?? []);
    } catch (err) {
      console.error("Failed to fetch users:", err);
    } finally {
      setLoading(false);
    }
  };

  const setField = (key: keyof FormState, value: any) =>
    setForm(f => ({ ...f, [key]: value, errors: { ...f.errors, [key]: "" } }));

  const validateForm = (isEdit = false): boolean => {
    const errs: Record<string, string> = {};
    if (!form.username.trim()) errs.username = "Username is required";
    if (!form.Fname.trim()) errs.Fname = "First name is required";
    if (!form.Lname.trim()) errs.Lname = "Last name is required";
    if (!form.email.trim()) errs.email = "Email is required";
    if (!isEdit && !form.password.trim()) errs.password = "Password is required";
    if (!isEdit && form.password.length < 8) errs.password = "Password must be at least 8 characters";
    setForm(f => ({ ...f, errors: errs }));
    return Object.keys(errs).length === 0;
  };

  const handleAdd = async () => {
    if (!validateForm()) return;
    setSubmitError("");
    try {
      const res = await fetch(`${API}/auth/createUsers`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${localStorage.getItem("token")}` },
        body: JSON.stringify({
          username: form.username,
          Fname: form.Fname,
          Lname: form.Lname,
          email: form.email,
          password: form.password,
          mobile: form.mobile,
          role: form.role,
        }),
      });
      const text = await res.text();
      let data: any = {};
      try { data = JSON.parse(text); } catch {}
      if (res.ok) {
        await fetchUsers();
        setShowAddModal(false);
        setForm(emptyForm());
      } else {
        setSubmitError(data.message ?? `Error ${res.status}`);
      }
    } catch (err) {
      setSubmitError("Something went wrong.");
    }
  };

  const handleUpdate = async () => {
    if (!editingUser) return;
    setSubmitError("");
    try {
      const res = await fetch(`${API}/auth/editUsers`, {
        method: "PUT",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${localStorage.getItem("token")}` },
        body: JSON.stringify({
          userId: editingUser.userId,
          username: form.username,
          Fname: form.Fname,
          Lname: form.Lname,
          email: form.email,
          mobile: form.mobile,
          role: form.role,
          ...(form.password ? { password: form.password } : {}),
        }),
      });
      const text = await res.text();
      let data: any = {};
      try { data = JSON.parse(text); } catch {}
      if (res.ok) {
        await fetchUsers();
        setEditingUser(null);
        setForm(emptyForm());
      } else {
        setSubmitError(data.message ?? `Error ${res.status}`);
      }
    } catch (err) {
      setSubmitError("Something went wrong.");
    }
  };

  const handleToggleStatus = async (user: User) => {
    try {
      const res = await fetch(`${API}/auth/editUsers`, {
        method: "PUT",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${localStorage.getItem("token")}` },
        body: JSON.stringify({
          userId: user.userId,
          username: user.username,
          userStatus: !user.userStatus,
        }),
      });
      if (res.ok) await fetchUsers();
    } catch (err) {
      console.error("Toggle status error:", err);
    }
  };

  const handelDelete = async (userId: string) => {
    
    try {
      const res = await fetch(`${API}/auth/deleteUsers`, {
        method: "DELETE",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${localStorage.getItem("token")}` },
        body: JSON.stringify({ userId }),
      });
      if (res.ok) await fetchUsers();
      else{
        const data = await res.json();
        alert(data.message ?? "Failed to delete user.");
      }
    } catch (err) {
      console.error("Delete user error:", err);
    }
  };

  const openEdit = (user: User) => {
    setEditingUser(user);
    setForm({
      username: user.username,
      Fname: user.Fname,
      Lname: user.Lname,
      email: user.email,
      password: "",
      mobile: user.mobile ?? "",
      role: user.role,
      errors: {},
    });
    setSubmitError("");
  };

  const filtered = users.filter(u =>
    `${u.Fname} ${u.Lname}`.toLowerCase().includes(search.toLowerCase()) ||
    u.email.toLowerCase().includes(search.toLowerCase()) ||
    u.username.toLowerCase().includes(search.toLowerCase())
  );

  const renderForm = (onConfirm: () => void, onCancel: () => void, title: string, isEdit = false) => (
    <div className="modal-overlay" onClick={onCancel}>
      <div className="modal" onClick={e => e.stopPropagation()}>
        <h2>{title}</h2>

        <label>First Name *</label>
        <input
          value={form.Fname}
          onChange={e => setField("Fname", e.target.value)}
          placeholder="e.g. Fatima"
          className={form.errors.Fname ? "input-error-border" : ""}
        />
        {form.errors.Fname && <p className="input-error">{form.errors.Fname}</p>}

        <label>Last Name *</label>
        <input
          value={form.Lname}
          onChange={e => setField("Lname", e.target.value)}
          placeholder="e.g. Al-Ali"
          className={form.errors.Lname ? "input-error-border" : ""}
        />
        {form.errors.Lname && <p className="input-error">{form.errors.Lname}</p>}

        <label>Username *</label>
        <input
          value={form.username}
          onChange={e => setField("username", e.target.value)}
          placeholder="e.g. fatima123"
          className={form.errors.username ? "input-error-border" : ""}
        />
        {form.errors.username && <p className="input-error">{form.errors.username}</p>}

        <label>Email *</label>
        <input
          value={form.email}
          onChange={e => setField("email", e.target.value)}
          placeholder="e.g. fatima@example.com"
          className={form.errors.email ? "input-error-border" : ""}
        />
        {form.errors.email && <p className="input-error">{form.errors.email}</p>}

        <label>Mobile</label>
        <input
          value={form.mobile}
          onChange={e => setField("mobile", e.target.value)}
          placeholder="e.g. +973 3812 4576"
        />

        <label>{isEdit ? "New Password (leave blank to keep)" : "Password *"}</label>
        <input
          type="password"
          value={form.password}
          onChange={e => setField("password", e.target.value)}
          placeholder="Min 8 characters"
          className={form.errors.password ? "input-error-border" : ""}
        />
        {form.errors.password && <p className="input-error">{form.errors.password}</p>}

        <label>Role</label>
        <div className="image-toggle">
          <button type="button"
            className={form.role === "Accountant" ? "toggle-active" : ""}
            onClick={() => setField("role", "Accountant")}>Accountant</button>
          <button type="button"
            className={form.role === "Admin" ? "toggle-active" : ""}
            onClick={() => setField("role", "Admin")}>Admin</button>
        </div>

        {submitError && <p className="input-error" style={{ textAlign: "center" }}>{submitError}</p>}

        <div className="modal-actions">
          <button type="button" className="cancel-btn" onClick={onCancel}>Cancel</button>
          <button type="button" className="confirm-btn" onClick={onConfirm}>{title}</button>
        </div>
      </div>
    </div>
  );

  return (
    <div className="System-container">
      
      <div className="System-layout">
        <Sidebar sidebarOpen={sidebarOpen} setSidebarOpen={setSidebarOpen} />
        <div className="System-content-wrapper">
          <Header title="All Users" sidebarOpen={sidebarOpen} setSidebarOpen={setSidebarOpen} />

        <div className="System-content">
          <div className="System-toolbar">
            <input
              className="search-input"
              placeholder="Search by name, username or email..."
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
            {isAdmin && (
              <button className="add-btn" onClick={() => { setForm(emptyForm()); setSubmitError(""); setShowAddModal(true); }}>
                + Add New
              </button>
            )}
          </div>

          <div className="Users-table-wrapper">
            {loading ? (
              <p className="empty-msg">Loading users...</p>
            ) : filtered.length === 0 ? (
              <p className="empty-msg">No users found.</p>
            ) : (
              <table className="Users-table">
                <thead>
                  <tr>
                    <th>Photo</th>
                    <th>Member Name</th>
                    <th>Mobile</th>
                    <th>Email</th>
                    <th>Role</th>
                    <th>Status</th>
                    <th>Edit Details</th>
                    <th>Delete User</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map(user => (
                    <tr key={user.userId} className="sale-row">
                      <td>
                        {user.photo
                          ? <img src={user.photo} alt={user.Fname} className="user-avatar" />
                          : <div className="user-avatar-placeholder">{user.Fname.charAt(0)}{user.Lname.charAt(0)}</div>
                        }
                      </td>
                      <td>
                        <div className="user-name">{user.Fname} {user.Lname}</div>
                        <div className="user-username">@{user.username}</div>
                      </td>
                      <td>{user.mobile ?? "—"}</td>
                      <td>{user.email}</td>
                      <td>
                        <span className={`role-badge ${user.role === "Admin" ? "admin" : "Accountant"}`}>
                          {user.role}
                        </span>
                      </td>
                      <td>
                        <button
                          className={`status-toggle ${user.userStatus ? "active" : "inactive"}`}
                          onClick={() => handleToggleStatus(user)}
                        >
                          {user.userStatus ? "Active" : "Disabled"}
                        </button>
                      </td>
                      <td className="text-center">
                        <button className="view-btn" onClick={() => openEdit(user)}>
                          Edit
                        </button>
                    
                      </td>
                      <td> 
                         <button className="delete-btn" onClick={() => handelDelete(user.userId)}>
                          x
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      </div>

      {/* Add Modal */}
      {showAddModal && renderForm(handleAdd, () => { setShowAddModal(false); setForm(emptyForm()); }, "Add New User")}

      {/* Edit Modal */}
      {editingUser && renderForm(handleUpdate, () => { setEditingUser(null); setForm(emptyForm()); }, "Edit User", true)}

    </div>
    </div>
  );
};


export default Users;