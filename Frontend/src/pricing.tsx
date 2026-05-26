import React, { useState, useEffect } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { FaCheck, FaTimes, FaArrowRight, FaCrown, FaRocket, FaStar, FaInfinity } from "react-icons/fa";
import "./Style/Pricing.css";
import "./Style/System.css";
const API = import.meta.env.VITE_API_URL;
const installmentPrices: Record<number, { total: number; monthly: number; savings: number }> = {
  3:  { total: 50, monthly: 16.667, savings: 25 },
  6:  { total: 50, monthly: 8.333,  savings: 25 },
  9:  { total: 50, monthly: 5.556,  savings: 28 },
  12: { total: 50, monthly: 4.167,  savings: 30 },
};

const MONTHLY_PRICE = 3;
const FULL_PRICE = 50;
const fmt = (n: number) => n.toFixed(3);

type Feature = { text: string; ok: boolean; soon?: boolean };

const FeatureList = ({ features, dark = false }: { features: Feature[]; dark?: boolean }) => (
  <ul className="pricing-feature-list">
    {features.map((f, i) => (
      <li key={i} className="pricing-feature-item">
        <span className={`pricing-feature-icon ${f.ok ? (dark ? "ok-dark" : "ok-light") : (dark ? "no-dark" : "no-light")}`}>
          {f.ok
            ? <FaCheck size={10} color={dark ? "#81c784" : "#4caf50"} />
            : <FaTimes size={10} color={dark ? "rgba(255,255,255,0.3)" : "#ccc"} />
          }
        </span>
        <span className={`pricing-feature-text ${f.ok ? (dark ? "ok-dark" : "ok-light") : (dark ? "no-dark" : "no-light")}`}>
          {f.text}
          {f.soon && (
            <span style={{
              marginLeft: "8px",
              fontSize: "10px",
              fontWeight: 700,
              background: "#EFB036",
              color: "#1a1a1a",
              borderRadius: "6px",
              padding: "2px 6px",
             }}>
             SOON
          </span>
         )}

        </span>
      </li>
    ))}
  </ul>
);

const SavingsBadge = ({ months, total }: { months: number; total: number }) => {
  const subTotal = months * MONTHLY_PRICE;
  const saved = subTotal - total;
  if (saved <= 0) return null;
  return (
    <div style={{
      background: "linear-gradient(135deg, #EFB036, #f5c842)",
      color: "#1a1a1a",
      borderRadius: "20px",
      padding: "6px 14px",
      fontSize: "12px",
      fontWeight: 700,
      display: "inline-block",
      marginTop: "8px",
      letterSpacing: "0.3px",
    }}>
      💰 Save BHD {fmt(saved)} vs subscription
    </div>
  );
};

const PricingPage = () => {
  const [plan, setPlan]               = useState<"subscription" | "full">("subscription");
  const [installment, setInstallment] = useState<3 | 6 | 9 | 12>(12);
  const [paymentMode, setPaymentMode] = useState<"installment" | "onetime">("installment");
  const [isLoggedIn, setIsLoggedIn]   = useState(false);
  const [loading, setLoading]         = useState(false);
  const navigate = useNavigate();

  const currentPlan = installmentPrices[installment];

  // Check if user is logged in 
useEffect(() => {
  const token = localStorage.getItem("token");
  if (!token) return;

  fetch(`${API}/auth/viewUser`, {
    headers: { Authorization: `Bearer ${token}` }
  }).then(res => {
    if (res.ok) setIsLoggedIn(true);
    else {
      localStorage.removeItem("token");
      setIsLoggedIn(false);
    }
  }).catch(() => setIsLoggedIn(false));
}, []);
 
   //  demo activate instead of charge
  const choosePlan = async (
  planType: "trial" | "subscription" | "full",
  installmentMonths?: number,
  isOnetime?: boolean
) => {
  if (!isLoggedIn) {
    navigate(`/Auth?signup=true&redirect=/Dashboard`);
    return;
  }

  if (planType === "trial") {
    navigate("/Dashboard");
    return;
  }

  setLoading(true);

  try {
  
   const res = await fetch(`${API}/subscriptions/demo-activate`, {
  method: "POST",
  headers: {
    "Content-Type": "application/json",
    Authorization: `Bearer ${localStorage.getItem("token")}`,
  },
  body: JSON.stringify({ planType, installmentMonths }),
});

    const data = await res.json();

    if (data.success) {
      navigate("/Dashboard");
    } else {
      alert("Activation failed. Please try again.");
    }

  } catch (err) {
    alert("Something went wrong. Please try again.");
  } finally {
    setLoading(false);
  }
};



 /* Main plan chooser 
  const choosePlan = async (
    planType: "trial" | "subscription" | "full",
    installmentMonths?: number,
    isOnetime?: boolean
  ) => {
    if (!isLoggedIn) {
      navigate(`/Auth?signup=true&redirect=/pricing`);
      return;
    }

    if (planType === "trial") {
      navigate("/Dashboard");
      return;
    }

    // Determine amount to charge via Tap
    let amount = 0;
    if (planType === "subscription") {
      amount = MONTHLY_PRICE; // 3 BHD
    } else if (planType === "full") {
      if (isOnetime) {
        amount = FULL_PRICE; // pay full 50 BHD at once
      } else {
        amount = installmentPrices[installmentMonths!].monthly; // first installment e.g. 4.167
      }
    }

    setLoading(true);

    try {
      const res = await fetch(`${API}/subscriptions/charge`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
        body: JSON.stringify({
          amount,
          planType,
          installmentMonths: isOnetime ? null : installmentMonths,
          isOnetime: isOnetime ?? false,
        }),
      });

      const charge = await res.json();

      if (!charge.transaction?.url) {
        alert("Payment setup failed. Please try again.");
        setLoading(false);
        return;
      }

      // Redirect to Tap payment page
      window.location.href = charge.transaction.url;

    } catch (err) {
      alert("Something went wrong. Please try again.");
      setLoading(false);
    }
  };
  */

  return (
    <div className="pricing-container">

      {/* Header */}
      <header className="pricing-header">
        <Link to="/">
          <img src="/images/HLogo.png" alt="Hessabi" className="pricing-header-logo" />
        </Link>
        <nav className="pricing-header-nav">
          <Link to="/">Home</Link>
          <Link to="/Auth" className="pricing-header-btn">Get Started</Link>
        </nav>
      </header>

      {/* Hero */}
      <div className="pricing-hero">
        <div className="pricing-hero-circle-1" />
        <div className="pricing-hero-circle-2" />

        <motion.div initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6 }}>
          <span className="pricing-trial-badge">🎉 14-Day Free Trial — No Credit Card Required</span>
          <h1>Simple, Affordable Pricing</h1>
          <p>Use it monthly — or get your own version with full customization.</p>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6, delay: 0.2 }}>
          <div className="pricing-toggle">
            {(["subscription", "full"] as const).map(p => (
              <button
                key={p}
                onClick={() => setPlan(p)}
                className={`pricing-toggle-btn ${plan === p ? "active" : "inactive"}`}
              >
                {p === "subscription" ? "📅 Monthly Subscription" :(
                  <>
                  "👑 Get Your Own Version"
                <span style={{
                  marginLeft: "8px",
                  fontSize: "10px",
                  fontWeight: 700,
                  background: "#EFB036",
                  color: "#1a1a1a",
                  borderRadius: "6px",
                  padding: "2px 6px",
               }}>
                     SOON
              </span>
    </>
     )}
              </button>
            ))}
          </div>
        </motion.div>
      </div>

      {/* Wave */}
      <div className="pricing-wave">
        <svg viewBox="0 0 1200 80" xmlns="http://www.w3.org/2000/svg">
          <path d="M0,40 C300,80 900,0 1200,40 L1200,0 L0,0 Z" fill="#4a6fa5" opacity="0.3" />
          <path d="M0,50 C400,90 800,10 1200,50 L1200,0 L0,0 Z" fill="#3d5a7a" opacity="0.2" />
        </svg>
      </div>

      {/* Content */}
      <div className="pricing-content">
        <AnimatePresence mode="wait">

          {/*  Subs */}
          {plan === "subscription" && (
            <motion.div
              key="subscription"
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.4 }}
              className="pricing-cards-grid"
            >
              {/* Free Trial Card */}
              <div className="pricing-card">
                <div className="pricing-card-icon light-green">🎁</div>
                <h2>Free Trial</h2>
                <p className="pricing-card-subtitle">Try everything free for 14 days</p>
                <div className="pricing-price-wrap">
                  <span className="pricing-price-amount">BHD 0</span>
                  <span className="pricing-price-period"> / 14 days</span>
                </div>
                <FeatureList features={[
                  { text: "Full system access", ok: true },
                  { text: "All features unlocked", ok: true },
                  { text: "Up to 3 staff accounts", ok: true },
                  { text: "No credit card needed", ok: true },
                  { text: "Customize logo & layout", ok: false },
                  { text: "Add custom pages", ok: false },
                ]} />
                <button onClick={() => choosePlan("trial")} className="pricing-card-btn" style={{ marginTop: "28px" }}>
                  Start Free Trial <FaArrowRight size={13} />
                </button>
              </div>

              {/* Monthly Card */}
              <div className="pricing-card-dark">
                <div className="pricing-card-dark-circle" />
                <span className="pricing-popular-badge">MOST POPULAR</span>
                <div className="pricing-card-icon white-alpha">📅</div>
                <h2>Monthly</h2>
                <p className="pricing-card-subtitle">Pay month by month, cancel anytime</p>
                <div className="pricing-price-wrap">
                  <span className="pricing-price-amount">BHD 3</span>
                  <span className="pricing-price-period"> / month</span>
                </div>
                <FeatureList dark features={[
                  { text: "Full system access", ok: true },
                  { text: "Unlimited staff accounts", ok: true },
                  { text: "Sales & expense tracking", ok: true },
                  { text: "Reports & analytics", ok: true },
                  { text: "Customize logo & layout", ok: false },
                  { text: "Add custom pages", ok: false },
                ]} />
                <div style={{
                  background: "rgba(255,255,255,0.08)",
                  borderRadius: "10px",
                  padding: "10px 14px",
                  marginTop: "16px",
                  fontSize: "12px",
                  color: "rgba(255,255,255,0.6)",
                  textAlign: "center",
                }}>
                  💡 Want a version of the system? Switch to <strong style={{ color: "#EFB036" }}>Full Purchase</strong> above and save long-term.
                </div>
                <button
                  onClick={() => choosePlan("subscription")}
                  className="pricing-card-btn white"
                  style={{ marginTop: "16px" }}
                  disabled={loading}
                >
                  {loading ? "Processing..." : <>Subscribe Now <FaArrowRight size={13} /></>}
                </button>
              </div>
            </motion.div>
          )}

          {/* FULL PURCHASE */}
          {plan === "full" && (
            <motion.div
              key="full"
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.4 }}
            >
              {/*  Dedicated Version Banner */}
              <div style={{
                background: "linear-gradient(135deg, #2F4157 0%, #1a2a3a 100%)",
                border: "1px solid rgba(239,176,54,0.3)",
                borderRadius: "16px",
                padding: "20px 28px",
                marginBottom: "28px",
                display: "flex",
                alignItems: "center",
                gap: "16px",
                color: "white",
              }}>
                <FaInfinity color="#EFB036" size={28} style={{ flexShrink: 0 }} />
                <div>
                  <p style={{ fontWeight: 700, fontSize: "16px", marginBottom: "4px" }}>
                    Pay once. Use it forever. No recurring fees.
                  </p>
                  <p style={{ fontSize: "13px", color: "rgba(255,255,255,0.6)", margin: 0 }}>
                    Get your own branded version of Hessabi — fully customize your logo, layout, and pages.
                  </p>
                </div>
              </div>

              {/* Payment Mode Toggle */}
              <div style={{
                display: "flex",
                gap: "12px",
                marginBottom: "24px",
              }}>
                <button
                  onClick={() => setPaymentMode("installment")}
                  style={{
                    flex: 1,
                    padding: "14px",
                    borderRadius: "12px",
                    border: paymentMode === "installment" ? "2px solid #EFB036" : "2px solid rgba(255,255,255,0.1)",
                    background: paymentMode === "installment" ? "rgba(239,176,54,0.1)" : "transparent",
                    color: paymentMode === "installment" ? "#EFB036" : "var(--color-text-secondary)",
                    fontWeight: 600,
                    fontSize: "14px",
                    cursor: "pointer",
                    transition: "all 0.2s",
                  }}
                >
                  Pay in Installments
                </button>
                <button
                  onClick={() => setPaymentMode("onetime")}
                  style={{
                    flex: 1,
                    padding: "14px",
                    borderRadius: "12px",
                    border: paymentMode === "onetime" ? "2px solid #EFB036" : "2px solid rgba(255,255,255,0.1)",
                    background: paymentMode === "onetime" ? "rgba(239,176,54,0.1)" : "transparent",
                    color: paymentMode === "onetime" ? "#EFB036" : "var(--color-text-secondary)",
                    fontWeight: 600,
                    fontSize: "14px",
                    cursor: "pointer",
                    transition: "all 0.2s",
                  }}
                >
                   Pay in Full — BHD {FULL_PRICE}
                </button>
              </div>

              {/* Installment Selector */}
              {paymentMode === "installment" && (
                <div className="pricing-installment-box">
                  <div className="pricing-installment-title">
                    <FaCrown color="#EFB036" size={20} />
                    <h3>Choose your payment plan</h3>
                  </div>
                  <p className="pricing-installment-subtitle">
                    Split the one-time cost into easy monthly payments. Longer plans = lower monthly rate.
                  </p>
                  <div className="pricing-installment-options">
                    {([3, 6, 9, 12] as const).map(m => (
                      <button
                        key={m}
                        onClick={() => setInstallment(m)}
                        className={`pricing-installment-btn ${installment === m ? "active" : "inactive"}`}
                      >
                        {m} months
                        {m === 12 && <span style={{ display: "block", fontSize: "10px", marginTop: "2px", color: "#EFB036" }}>Best deal</span>}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Price Breakdown */}
              <div className="pricing-breakdown-grid">
                <div className="pricing-card-dark">
                  <div className="pricing-card-dark-circle" />
                  <FaCrown color="#EFB036" size={28} style={{ marginBottom: "16px" }} />
                  <h2>Dedicated Version</h2>

                  {paymentMode === "onetime" ? (
                    <>
                      <p className="pricing-card-subtitle">One-time full payment</p>
                      <div className="pricing-price-wrap">
                        <span className="pricing-price-amount">BHD {FULL_PRICE}</span>
                        <br />
                        <span className="pricing-price-period">pay once, own forever</span>
                      </div>
                      <div style={{
                        background: "rgba(129,199,132,0.1)",
                        border: "1px solid rgba(129,199,132,0.3)",
                        borderRadius: "10px",
                        padding: "10px 14px",
                        marginTop: "16px",
                        fontSize: "13px",
                        color: "#81c784",
                        textAlign: "center",
                      }}>
                        ✅ No installments — pay once and you're done!
                      </div>
                      <button
                        onClick={() => choosePlan("full", undefined, true)}
                        className="pricing-card-btn gold"
                        style={{ marginTop: "20px" }}
                        disabled={loading}
                      >
                        {loading ? "Processing..." : <><FaCrown size={14} /> Pay BHD {FULL_PRICE} Now</>}
                      </button>
                    </>
                  ) : (
                    <>
                      <p className="pricing-card-subtitle">Pay over {installment} months</p>
                      <div className="pricing-price-wrap">
                        <span className="pricing-price-amount">BHD {currentPlan.total}</span>
                        <br />
                        <span className="pricing-price-period">total one-time cost</span>
                      </div>
                      <div className="pricing-monthly-badge">
                        ≈ <strong>BHD {fmt(currentPlan.monthly)}</strong> / month for {installment} months
                      </div>
                      <SavingsBadge months={installment} total={currentPlan.total} />
                      <div style={{
                        background: "rgba(255,255,255,0.06)",
                        borderRadius: "10px",
                        padding: "10px 14px",
                        marginTop: "16px",
                        fontSize: "12px",
                        color: "rgba(255,255,255,0.5)",
                      }}>
                        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "4px" }}>
                          <span>Monthly subscription × {installment}mo</span>
                          <span style={{ color: "rgba(255,255,255,0.4)", textDecoration: "line-through" }}>
                            BHD {fmt(installment * MONTHLY_PRICE)}
                          </span>
                        </div>
                        <div style={{ display: "flex", justifyContent: "space-between" }}>
                          <span style={{ color: "#EFB036" }}>Your Version Price</span>
                          <span style={{ color: "#81c784", fontWeight: 700 }}>BHD {fmt(currentPlan.total)}</span>
                        </div>
                        <div style={{ display: "flex", justifyContent: "space-between", marginTop: "6px", paddingTop: "6px", borderTop: "1px solid rgba(255,255,255,0.1)" }}>
                          <span style={{ color: "#EFB036" }}>First payment today</span>
                          <span style={{ color: "#81c784", fontWeight: 700 }}>BHD {fmt(currentPlan.monthly)}</span>
                        </div>
                      </div>
                      <button
                        onClick={() => choosePlan("full", installment, false)}
                        className="pricing-card-btn gold"
                        style={{ marginTop: "20px" }}
                        disabled={loading}
                      >
                        {loading ? "Processing..." : <><FaCrown size={14} /> Start with BHD {fmt(currentPlan.monthly)}</>}
                      </button>
                    </>
                  )}
                </div>

                {/* Features Card */}
                <div className="pricing-card">
                  <div className="pricing-full-features-header">
                    <FaStar color="#EFB036" />
                    <h3>Everything included — no limits, no monthly fees</h3>
                  </div>
                  <FeatureList features={[
                    { text: "Full system access", ok: true ,soon: true },
                    { text: "Unlimited staff accounts", ok: true, soon: true },
                    { text: "Sales & expense tracking", ok: true ,soon: true },
                    { text: "Reports & analytics", ok: true ,soon: true },
                    { text: "Customize your logo", ok: true ,soon: true },
                    { text: "Full branding control", ok: true ,soon: true },
                    { text: "No monthly fees — ever", ok: true ,soon: true },

                    { text: "Add custom pages", ok: true, soon: true },
                  ]} />
                  <div className="pricing-ownership-note">
                    <FaRocket color="#2F4157" size={16} style={{ marginTop: "2px", flexShrink: 0 }} />
                    <p>
                      Get your own branded version of Hessabi. This is a one-time cost —
                      no subscriptions, no renewals, no lock-in.
                    </p>
                  </div>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Comparison Table */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
          className="pricing-comparison"
        >
          <h2>Plan Comparison</h2>
          <div className="pricing-comparison-scroll">
            <table className="pricing-comparison-table">
              <thead>
                <tr>
                  <th>Feature</th>
                  <th className="col-free">Free Trial</th>
                  <th className="col-sub">Monthly</th>
                  <th className="col-full">👑 Your Version</th>
                </tr>
              </thead>
              <tbody>
                {[
                  ["Price",                    "BHD 0",   "BHD 3/mo", "BHD 50 one-time"],
                  ["Duration",                 "14 days", "Monthly",  "One-time"],
                  ["Sales & Expense Tracking", true,      true,       true],
                  ["Product Management",       true,      true,       true],
                  ["Staff Accounts",           "Up to 3", "Unlimited","Unlimited"],
                  ["Reports & Analytics",      true,      true,       true],
                  ["Customize Logo",           false,     false,      true],
                  ["Full Branding Control",    false,     false,      true],
                  ["Monthly Fees",             false,     true,       false],
                  ["Powered by Hessabi badge", true,      true,       false],
                ].map(([feature, trial, sub, full], i) => (
                  <tr key={i}>
                    <td>{feature}</td>
                    {[trial, sub, full].map((val, j) => (
                      <td key={j}>
                        {typeof val === "boolean" ? (
                          val
                            ? <FaCheck color="#4caf50" size={14} />
                            : <FaTimes color="#ccc" size={14} />
                        ) : (
                          <span className="pricing-comparison-value">{val}</span>
                        )}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </motion.div>

        {/* CTA */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
          className="pricing-cta"
        >
          <h2>Ready to get started?</h2>
          <p>Try Hessabi free for 14 days — no credit card required.</p>
          <button onClick={() => choosePlan("trial")} className="pricing-cta-btn">
            Start Free Trial <FaArrowRight size={14} />
          </button>
        </motion.div>
      </div>

      {/* Footer */}
      <footer className="pricing-footer">
        <a href="#">Terms of Service</a> | <a href="#">Privacy Policy</a>
        <span style={{ marginLeft: "16px" }}>©2026 Hessabi Inc</span>
      </footer>
    </div>
  );
};

export default PricingPage;