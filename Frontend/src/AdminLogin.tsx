import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import "./Style/Admin.css";

const API = import.meta.env.VITE_API_URL;

const AdminLogin = () => {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleLogin = async () => {
    if (!username.trim() || !password.trim()) {
      setError("Username and password are required.");
      return;
    }
    setLoading(true);
    setError("");
    try {
      const res = await fetch(`${API}/admin/login`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password }),
      });
      const data = await res.json();
      if (res.ok) {
        navigate("/admin-dashboard");
      } else {
        setError(data.message ?? "Login failed.");
      }
    } catch {
      setError("Something went wrong.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="admin-login-container">
      <div className="admin-login-card">
        <img src="/images/HLogo.png" alt="Hessabi" className="admin-login-logo" />
        <h2>Super Admin</h2>
        <p className="admin-login-subtitle">System Management Panel</p>

        <label>Username</label>
        <input
          value={username}
          onChange={e => setUsername(e.target.value)}
          placeholder="Enter username"
          onKeyDown={e => e.key === "Enter" && handleLogin()}
        />

        <label>Password</label>
        <input
          type="password"
          value={password}
          onChange={e => setPassword(e.target.value)}
          placeholder="Enter password"
          onKeyDown={e => e.key === "Enter" && handleLogin()}
        />

        {error && <p className="admin-login-error">{error}</p>}

        <button className="admin-login-btn" onClick={handleLogin} disabled={loading}>
          {loading ? "Logging in..." : "Login"}
        </button>
      </div>
    </div>
  );
};

export default AdminLogin;