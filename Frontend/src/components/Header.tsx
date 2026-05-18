import React from "react";
import { useNavigate } from "react-router-dom";
import UserDropdown from "./UserDropdown";
import { useSubscription } from "../context/SubscriptionContext";
import { useUserRole } from "../hooks/useUserRole";

interface HeaderProps {
  title: string;
  sidebarOpen: boolean;
  setSidebarOpen: (open: boolean) => void;
}

const Header = ({ title, sidebarOpen, setSidebarOpen }: HeaderProps) => {
  const navigate = useNavigate();
  const { subscription, loading } = useSubscription();
  const role = useUserRole(); 
  const isAdmin = role === "Admin";

  const getBadge = () => {
    if (loading || !subscription) return null;
    const { planType, planStatus, daysLeft } = subscription;

    if (planType === "trial" && planStatus === "active") {
      const urgent = daysLeft !== null && daysLeft <= 3;
      return {
        dot:     urgent ? "#e6a817" : "#2e7d32",
        bg:      urgent ? "#fff8e1" : "#e8f5e9",
        border:  urgent ? "#e6a817" : "#2e7d32",
        color:   urgent ? "#b36a00" : "#1b5e20",
        label:   `Free Trial · ${daysLeft} day${daysLeft === 1 ? "" : "s"} left`,
        showBtn: true,
      };
    }
    if (planType === "trial" && (planStatus === "expired" || planStatus === "overdue")) {
      return {
        dot: "#c0392b", bg: "#fff5f5", border: "#c0392b",
        color: "#c0392b", label: "Trial Expired", showBtn: true,
      };
    }
    if (planStatus === "active") {
      return {
        dot: "#2e7d32", bg: "#e8f5e9", border: "#2e7d32",
        color: "#1b5e20",
        label: planType === "full" ? "Full Access" : "Subscription · Active",
        showBtn: false,
      };
    }
    if (planStatus === "overdue") {
      return {
        dot: "#c0392b", bg: "#fff5f5", border: "#c0392b",
        color: "#c0392b", label: "Subscription Overdue", showBtn: true,
      };
    }
    return null;
  };

  const badge = getBadge();

  return (
    <header className="System-header">
      <h2>{title}</h2>

      {badge && isAdmin && (
        <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
          <div style={{
            display: "flex", alignItems: "center", gap: "8px",
            background: badge.bg, border: `1px solid ${badge.border}`,
            borderRadius: "20px", padding: "5px 14px",
            fontSize: "13px", fontWeight: 600, color: badge.color,
          }}>
            <span style={{
              width: "8px", height: "8px", borderRadius: "50%",
              background: badge.dot, display: "inline-block", flexShrink: 0,
            }} />
            {badge.label}
          </div>
          {badge.showBtn && (
            <button
              onClick={() => navigate("/Pricing")}
              style={{
                background: "#1e3a5f", color: "#fff", border: "none",
                borderRadius: "20px", padding: "5px 16px",
                fontSize: "13px", fontWeight: 600,
                cursor: "pointer", whiteSpace: "nowrap",
              }}
            >
              Upgrade
            </button>
          )}
        </div>
      )}

      <UserDropdown />
    </header>
  );
};

export default Header;