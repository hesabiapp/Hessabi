import "./Style/Home.css";
import {
  FaChartBar, FaCreditCard, FaFileAlt, FaInstagram,
  FaShoppingCart, FaUserCircle, FaLightbulb, FaGlobe
} from "react-icons/fa";
import React, { useEffect, useRef } from "react";
import { Link } from "react-router-dom";
import { FaArrowRight, FaGithub, FaLinkedin, FaX } from "react-icons/fa6";
import { motion } from "framer-motion";

const HomePage = () => {
  const [dropdownOpen, setDropdownOpen] = React.useState(false);
  const [menuOpen, setMenuOpen] = React.useState(false);
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

      {/* ── HEADER ── */}
      <header className="Home-header">
        <div className="Home-logo">
          <img src="images/HLogo.png" alt="Hessabi Logo" className="Home-logo-img" />
        </div>
        <div className="Home-right">
          {/* Desktop nav */}
          <nav className="Home-menu">
             <Link to="/Pricing"><span>Pricing and Plans</span></Link>
            <span onClick={() => document.getElementById("Contact-us")?.scrollIntoView({ behavior: "smooth" })}>Contact Us</span>
            <span onClick={() => document.getElementById("about-us")?.scrollIntoView({ behavior: "smooth" })}>About Us</span>
            <Link to="/Ourstory"><span>Our Story</span></Link>
          </nav>

          {/* Hamburger button — mobile only */}
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

        {/* Mobile dropdown menu */}
        {menuOpen && (
          <div className="Home-mobile-menu">
             <Link to="/Pricing" onClick={() => setMenuOpen(false)}><span>Pricing and Plans</span></Link>
            <span onClick={() => { document.getElementById("Contact-us")?.scrollIntoView({ behavior: "smooth" }); setMenuOpen(false); }}>Contact Us</span>
            <span onClick={() => { document.getElementById("about-us")?.scrollIntoView({ behavior: "smooth" }); setMenuOpen(false); }}>About Us</span>
            <Link to="/Ourstory" onClick={() => setMenuOpen(false)}><span>Our Story</span></Link>
            <Link to="/Auth" onClick={() => setMenuOpen(false)}><span>Login</span></Link>
            <Link to="/Auth?signup=true" onClick={() => setMenuOpen(false)}><span>Sign Up</span></Link>
          </div>
        )}
      </header>

      <div className="Home">
        <div className="Home-text">
          <div className="Home-eyebrow">Built for Bahrain's Home Businesses</div>
          <h1>Run your business<br />from home.</h1>
          <h2>Stay in control</h2>
          <p>Manage your finances with ease and confidence <br />all from the comfort of your home.</p>
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

        <div className="Home-image-container">
          <img src="images/Desk.png" alt="Home Image" className="Home-image" />
        </div>

        <div className="custom-shape-divider-bottom-1776816989">
          <svg data-name="Layer 1" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1200 120" preserveAspectRatio="none">
            <path d="M985.66,92.83C906.67,72,823.78,31,743.84,14.19c-82.26-17.34-168.06-16.33-250.45.39-57.84,11.73-114,31.07-172,41.86A600.21,600.21,0,0,1,0,27.35V120H1200V95.8C1132.19,118.92,1055.71,111.31,985.66,92.83Z" className="shape-fill" />
          </svg>
        </div>
      </div>

      {/* Features */}
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

        {/* Why Hessabi */}
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

      {/* About us */}
      <div id="about-us" className="about-us-cont">
        <div className="about-header">
          <h1>About Us</h1>
          <p>Hessabi helps home-based businesses in Bahrain take control of their finances simply and clearly.
             We make it easy to track income, manage expenses and invoices, and stay organized without needing accounting expertise. With a clean, 
             intuitive platform, Hessabi turns everyday transactions into clear insights so you always understand where your business stands.
             Our goal is simple: remove the stress and confusion from financial management, so you can focus on what you do best.
             Because running a business is hard enough. Your finances shouldn’t be.</p>
        </div>
      </div>

      {/* ── FOOTER ── */}
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
              <div className="social-icon"><FaX size={16} /></div>
              <div className="social-icon"><FaLinkedin size={16} /></div>
              <div className="social-icon"><FaGithub size={16} /></div>
            </div>
          </div>
        </div>
        <div className="footer-bottom">
          <a href="#">Terms of Service</a> | <a href="#">Privacy Policy</a>&nbsp;&nbsp;©2026 Hessabi Inc.
        </div>
      </footer>

    </div>
  );
};

export default HomePage;