import "./Style/Home.css";
import {
  FaChartBar, FaCreditCard, FaFileAlt, FaInstagram,
  FaShoppingCart, FaUserCircle, FaLightbulb, FaGlobe
} from "react-icons/fa";
import React, { useEffect, useRef } from "react";
import { Link } from "react-router-dom";
import { FaArrowRight, FaGithub, FaLinkedinIn, FaX } from "react-icons/fa6";
import { motion } from "framer-motion";

const HomePage: React.FC = () => {
  const [dropdownOpen, setDropdownOpen] = React.useState<boolean>(false);
  const [menuOpen, setMenuOpen] = React.useState<boolean>(false);
  const featuresRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) entry.target.classList.add("visible");
        });
      },
      { threshold: 0.15 }
    );
    const cards = featuresRef.current?.querySelectorAll(".Home-feature-card");
    cards?.forEach((card) => observer.observe(card));
    return () => observer.disconnect();
  }, []);

  return (
    <div className="Home-container">
      <header className="Home-header">
        <div className="Home-logo">
          <img src="images/HLogo.png" alt="Hessabi Logo" className="Home-logo-img" />
        </div>
        <div className="Home-right">
          <nav className="Home-menu">
            <Link to="/Pricing"><span>Pricing and Plans</span></Link>
            <span onClick={() => document.getElementById("Contact-us")?.scrollIntoView({ behavior: "smooth" })}>Contact Us</span>
            <span onClick={() => document.getElementById("about-us")?.scrollIntoView({ behavior: "smooth" })}>About Us</span>
            <Link to="/Ourstory"><span>Our Story</span></Link>
          </nav>

          <button className="Home-hamburger" onClick={() => setMenuOpen(!menuOpen)}>
            {menuOpen ? "✕" : "☰"}
          </button>

          <div className="Home-user-menu">
            <FaUserCircle size={28} className="Home-login-icon" onClick={() => setDropdownOpen(!dropdownOpen)} />
            {dropdownOpen && (
              <div className="Home-dropdown">
                <Link to="/Auth" onClick={() => setDropdownOpen(false)}>Login</Link>
                <Link to="/Auth?signup=true" onClick={() => setDropdownOpen(false)}>Sign Up</Link>
              </div>
            )}
          </div>
        </div>

        {menuOpen && (
          <div className="Home-mobile-menu">
            <Link to="/Pricing" onClick={() => setMenuOpen(false)}><span>Pricing and Plans</span></Link>
            <span onClick={() => { document.getElementById("Contact-us")?.scrollIntoView({ behavior: "smooth" }); setMenuOpen(false); }}>Contact Us</span>
            <span onClick={() => { document.getElementById("about-us")?.scrollIntoView({ behavior: "smooth" }); setMenuOpen(false); }}>About Us</span>
            <Link to="/Ourstory" onClick={() => setMenuOpen(false)}><span>Our Story</span></Link>
          </div>
        )}
      </header>
      <div className="Home">
        <div className="Home-text">
          <div className="Home-eyebrow">Built for Bahrain's Home Businesses</div>
          <h1>Run your business<br />from home.</h1>
          <p>Stay in control of your finances with ease and confidence — all from the comfort of your home.</p>
          <div className="Home-cta-row">
            <Link to="/pricing">
              <button className="Home-btn">
                <span className="circle"><span className="arrow"><FaArrowRight /></span></span>
                <span className="text">See Pricing & Plans</span>
              </button>
            </Link>
            <span
              className="Home-secondary-link"
              onClick={() => document.getElementById("about-us")?.scrollIntoView({ behavior: "smooth" })}
            >
              Learn more ↓
            </span>
          </div>
        </div>

        {/* Dashboard mock */}
        <div className="Home-image-container">
          <div className="Home-dashboard-mock">

            {/* Sidebar */}
            <div className="mock-sidebar">
              <div className="mock-sidebar-logo">
                <div className="mock-sidebar-icon" />
                <span className="mock-sidebar-name">HESSABI</span>
              </div>
              <div className="mock-sidebar-label">MAIN MENU</div>
              {[
                { label: "Dashboard", active: true },
                { label: "Products" },
                { label: "Sales" },
                { label: "Expenses" },
                { label: "Reports" },
              ].map((item, i) => (
                <div key={i} className={`mock-nav-item${item.active ? " active" : ""}`}>
                  {item.label}
                </div>
              ))}
            </div>

            {/* Main area */}
            <div className="mock-main">
              {/* Topbar */}
              <div className="mock-topbar">
                <span className="mock-topbar-title">Dashboard</span>
                <div className="mock-topbar-right">
                  <span className="mock-trial-badge">
                    <span className="mock-trial-dot" /> Free Trial · 14 days left
                  </span>
                  <span className="mock-upgrade-btn">Upgrade</span>
                  <span className="mock-avatar">ZA</span>
                </div>
              </div>

              <div className="mock-tabs">
                <span className="mock-tab active">Overview</span>
                <span className="mock-tab">Ask AI</span>
                <span className="mock-tab">Instagram</span>
                <div className="mock-tabs-right">
                  <span className="mock-time-btn">All Time</span>
                  <span className="mock-time-outline">Date Range</span>
                </div>
              </div>
              <div className="mock-content">
                {/* Alert */}
                <div className="mock-alert">
                  <span className="mock-alert-title">⚠️ Low Stock Alert — 4 products running low</span>
                  <div className="mock-alert-tags">
                    {["Eid Embroidery Abaya", "Classic Black Abaya", "Blazer Style Abaya", "Gray Casual Abaya"].map((t, i) => (
                      <span key={i} className="mock-alert-tag">{t}</span>
                    ))}
                  </div>
                </div>

                {/* AI Summary */}
                <div className="mock-ai-card">
                  <div className="mock-ai-header">
                    <span className="mock-ai-label">✦ AI Summary</span>
                    <span className="mock-ai-refresh">↻ Refresh</span>
                  </div>
                  <p className="mock-ai-text">
                    <strong>Executive Summary</strong> The business generated BHD 452.000 in revenue from 15 transactions in May 2026, operating at a net deficit of BHD -2,403.041.
                    The Classic Black Abaya drives 69% of revenue. <strong>Immediate action required:</strong> Conduct an urgent expense audit to reduce fixed costs by 80–85% to reach break-even.
                  </p>
                </div>

                {/* Stat cards */}
                <div className="mock-stat-row">
                  {[
                    { label: "TOTAL REVENUE",   value: "BHD 452.000",    sub: "15 transactions",    color: "" },
                    { label: "GROSS PROFIT",     value: "BHD 183.909",    sub: "After cost of goods", color: "green" },
                    { label: "TOTAL EXPENSES",   value: "BHD 2,586.950",  sub: "16 expense records",  color: "red" },
                    { label: "NET PROFIT",       value: "BHD -2,403.041", sub: "-531.6% margin",      color: "red", highlight: true },
                    { label: "AVG ORDER VALUE",  value: "BHD 30.133",     sub: "Per transaction",     color: "" },
                  ].map((s, i) => (
                    <div key={i} className={`mock-stat-card${s.highlight ? " highlight" : ""}`}>
                      <span className="mock-stat-label">{s.label}</span>
                      <span className={`mock-stat-value${s.color ? ` ${s.color}` : ""}`}>{s.value}</span>
                      <span className="mock-stat-sub">{s.sub}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="custom-shape-divider-bottom-1776816989">
          <svg data-name="Layer 1" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1200 120" preserveAspectRatio="none">
            <path d="M985.66,92.83C906.67,72,823.78,31,743.84,14.19c-82.26-17.34-168.06-16.33-250.45.39-57.84,11.73-114,31.07-172,41.86A600.21,600.21,0,0,1,0,27.35V120H1200V95.8C1132.19,118.92,1055.71,111.31,985.66,92.83Z" className="shape-fill" />
          </svg>
        </div>
      </div>

      {/* FEATURES */}
      <div className="offers-container">
        <div className="Home-offers">
          <h1>What We Offer</h1>
        </div>
        <div className="Home-features" ref={featuresRef}>
          {[
            { icon: <FaShoppingCart size={28} />, cls: "icon-1", title: "Easy Inventory Management", desc: "Keep track of stock levels, manage orders, and streamline your inventory with a user-friendly system." },
            { icon: <FaCreditCard size={28} />, cls: "icon-2", title: "Financial Insights", desc: "Gain valuable insights into your business finances with comprehensive reporting and analytics tools." },
            { icon: <FaFileAlt size={28} />, cls: "icon-3", title: "Invoicing Made Simple", desc: "Create and send professional invoices in just a few clicks, making payment collection hassle-free." },
            { icon: <FaChartBar size={28} />, cls: "icon-4", title: "User-Friendly Interface", desc: "Navigate an intuitive interface designed to make managing your business finances a breeze." },
          ].map((f, i) => (
            <div className="Home-feature-card" key={i} style={{ transitionDelay: `${i * 0.12}s` }}>
              <div className={`Home-feature-icon ${f.cls}`}>{f.icon}</div>
              <div className="Home-feature-content">
                <h3>{f.title}</h3>
                <p>{f.desc}</p>
              </div>
            </div>
          ))}
        </div>

        {/* WHY HESSABI  */}
        <div className="Home-benefits-container">
          <div className="about-header">
            <h1>Why choose Hessabi</h1>
            <p>Empowering Home Businesses to Grow with Confidence</p>
            <div className="about-grid">
              {[
                { icon: <FaLightbulb size={30} />, cls: "icon-simplicity", title: "Simplicity", desc: "A clean interface designed for users who aren't necessarily accountants." },
                { icon: <FaGlobe size={30} />, cls: "icon-accessibility", title: "Accessibility", desc: "A web-based architecture that lets you manage your business from anywhere." },
                { icon: <FaChartBar size={30} />, cls: "icon-precision", title: "Precision", desc: "Tools built to ensure every transaction is accounted for and every report is accurate." },
              ].map((c, i) => (
                <motion.div whileHover={{ y: -6 }} className="about-card" key={i}>
                  <div className={`about-icon-wrapper ${c.cls}`}>{c.icon}</div>
                  <h3>{c.title}</h3>
                  <p>{c.desc}</p>
                </motion.div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* ABOUT US */}
      <div id="about-us" className="about-us-cont">
        <div className="about-header">
          <h1>About Us</h1>
          <p>Hessabi helps home-based businesses in Bahrain take control of their finances simply and clearly.
            We make it easy to track income, manage expenses and invoices, and stay organized without needing accounting expertise. With a clean,
            intuitive platform, Hessabi turns everyday transactions into clear insights so you always understand where your business stands.
            Our goal is simple: remove the stress and confusion from financial management, so you can focus on what you do best.
            Because running a business is hard enough. Your finances shouldn't be.</p>
        </div>
      </div>

      {/* FOOTER */}
 <footer className="footer">
  <div className="footer-top">
    <div id="Contact-us" className="Contact">
      <img src="images/HLogo.png" alt="Hessabi" className="footer-logo" />
      <div className="Contact-info">
        <p><strong>Address:</strong> 123 Main Street, Manama, Kingdom of Bahrain</p>
        <p><strong>Email:</strong> tryhessabi.app@gmail.com</p>
      </div>
      <div className="Contact-social">
        <div className="social-icon" onClick={() => window.open("https://www.instagram.com/hessabi.app?igsh=MnJhMXJlOHp4NjY3&utm_source=qr", "_blank")} style={{ cursor: "pointer" }}>
          <FaInstagram size={16} />
        </div>
        <div className="social-icon" onClick={() => window.open("", "_blank")} style={{ cursor: "pointer" }}>
          <FaX size={16} />
        </div>
        <div className="social-icon" onClick={() => window.open("", "_blank")} style={{ cursor: "pointer" }}>
          <FaLinkedinIn size={16} />
        </div>
        <div className="social-icon" onClick={() => window.open("", "_blank")} style={{ cursor: "pointer" }}>
          <FaGithub size={16} />
        </div>
      </div>
    </div>
  </div>
  <div className="footer-bottom">
    ©2026 Hessabi Inc. — All rights reserved.
  </div>
</footer>

    </div>
  );
};

export default HomePage;