import React, { useEffect } from "react";
import { Link, useLocation } from "react-router-dom";
import { FaThLarge, FaBoxOpen, FaChartLine, FaFileAlt, FaUserCircle, FaChevronLeft } from "react-icons/fa";

interface SidebarProps {
  sidebarOpen: boolean;
  setSidebarOpen: (open: boolean) => void;
}


const Sidebar = ({ sidebarOpen, setSidebarOpen }: SidebarProps) => {
  const location = useLocation();
 useEffect(() => {
  if (window.innerWidth <= 768) setSidebarOpen(false);
}, [location.pathname]);

  const links = [
    { to: "/Dashboard", icon: <FaThLarge size={18} />,   label: "Dashboard" },
    { to: "/Products",  icon: <FaBoxOpen size={18} />,   label: "Products"  },
    { to: "/sales",     icon: <FaChartLine size={18} />, label: "Sales"     },
    { to: "/Expenses",  icon: <FaFileAlt size={18} />,   label: "Expenses"  },
    { to: "/Reports",   icon: <FaChartLine size={18} />, label: "Reports"   },
    { to: "/Users",     icon: <FaUserCircle size={18} />,label: "Users"     },
  ];

  return (
    <aside className={`System-sidebar ${sidebarOpen ? "open" : "closed"}`}>
      <img
        src="images/2HLogo.png"
        alt="Hessabi Logo"
        className="System-topbar-logo" 
        style={{ cursor: "pointer",
          marginTop: "8px"
         }}
      />

      {/* Minimize button */}
       <div className="sidebar-divider" style={{ marginTop: "18px" }} />
      <button
        className="sidebar-minimize-btn"
        onClick={() => setSidebarOpen(!sidebarOpen)}
        aria-label="Toggle sidebar"
      >
        <FaChevronLeft
          size={12}
          style={{
            transform: sidebarOpen ? "rotate(0deg)" : "rotate(180deg)",
            transition: "transform 0.3s",
          }}
        />
        {sidebarOpen && <span>Minimize</span>}
      </button>

      <div className="sidebar-divider" />

      {/* Nav label */}
      {sidebarOpen && <p className="sidebar-section-label">MAIN MENU</p>}

      {/* Nav links */}
      <nav className="System-Nav">
        {links.map(({ to, icon, label }) => (
          <Link
            key={to}
            to={to}
            className={location.pathname === to ? "active" : ""}
            title={!sidebarOpen ? label : undefined}
          >
            {icon}
            {sidebarOpen && <span>{label}</span>}
          </Link>
        ))}
      </nav>
    </aside>
  );
};

export default Sidebar;