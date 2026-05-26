import { useEffect, useState } from "react";
import { Navigate } from "react-router-dom";

const API = import.meta.env.VITE_API_URL;

const ProtectedRoute = ({ children }: { children: React.ReactNode }) => {
  const [status, setStatus] = useState<"loading" | "auth" | "unauth">("loading");

  useEffect(() => {
    const token = localStorage.getItem("token");
    if (!token) {
      setStatus("unauth");
      return;
    }

    fetch(`${API}/auth/viewUser`, {
      headers: { Authorization: `Bearer ${token}` }
    }).then(res => {
      if (res.ok) setStatus("auth");
      else {
        localStorage.removeItem("token");
        setStatus("unauth");
      }
    }).catch(() => setStatus("unauth"));
  }, []);

  if (status === "loading") return <div>Loading...</div>;
  if (status === "unauth") return <Navigate to="/Auth" replace />;
  return <>{children}</>;
};

export default ProtectedRoute;