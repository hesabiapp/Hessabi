import "./Style/OurStory.css";
import { FaInstagram, FaUserCircle } from "react-icons/fa";
import { FaGithub, FaLinkedin, FaX } from "react-icons/fa6";
import { Link } from "react-router-dom";
import { motion, cubicBezier } from "framer-motion";
import { useRef } from "react";
import React from "react";


const milestones = [
  {
    year: "The Problem",
    title: "A young women business, a notebook, and a lot of stress",
    text: "Growing up, I watched a young woman run her home business the hard way — tracking expenses in notebooks, losing invoices, and never really knowing if she was making a profit. she was great at what she did. The finances just got in the way.",
  },
  {
    year: "The Idea",
    title: "Why doesn't something like this exist?",
    text: "Every tool I found was built for companies with accountants and IT teams. Nothing was designed for the home business, the freelance designer, or the small boutique owner in Bahrain. That gap felt wrong — and fixable.",
  },
  {
    year: "The Build",
    title: "One student, one mission",
    text: "I started building Hessabi as a university project with a clear goal: make financial management so simple that anyone could do it, regardless of their background. Every feature was designed with real home business owners in mind.",
  },
  {
    year: "Today",
    title: "Hessabi — حسابي — My Accounts",
    text: "The name says it all. Hessabi is personal. It's your invoices, your inventory, your finances — finally in one place that makes sense. Built in Bahrain, for Bahrain.",
  },
];

const fadeUp = {
  hidden: { opacity: 0, y: 32 },
  visible: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: { delay: i * 0.15, duration: 0.6, ease: cubicBezier(0.22, 1, 0.36, 1) },
  }),
};

const Ourstory = () => {
const [dropdownOpen, setDropdownOpen] = React.useState(false);
const featuresRef = useRef<HTMLDivElement>(null);

  return (
    <div className="Story-container">

      {/*  HEADER */}
      <header className="Home-header">
        <div className="Home-logo">
          <Link to="/">
            <img src="images/HLogo.png" alt="Hessabi Logo" className="Home-logo-img" />
          </Link>
        </div>
        <div className="Home-right">
          <nav className="Home-menu">
            <Link to="/pricing"><span>Plan Pricing</span></Link>
            <span onClick={() => document.getElementById("Contact-us")?.scrollIntoView({ behavior: "smooth" })}>Contact Us</span>
            <Link to="/"><span>Home</span></Link>
          </nav>
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
            </header>

      {/* HERO */}
      <section className="Story-hero">
        <div className="Story-hero-bg" />
        <motion.div
          className="Story-hero-content"
          initial={{ opacity: 0, y: 28 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
        >
          <div className="Story-eyebrow">Our Story</div>
          <h1>Built from frustration.<br />Driven by purpose.</h1>
          <p>I built Hessabi after seeing how a young woman struggled to run her home businesses the hard way — notebooks, guesswork, and stress. I wanted to change that, one invoice at a time.</p>
        </motion.div>

        <div className="Story-hero-wave">
          <svg data-name="Layer 1" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1200 120" preserveAspectRatio="none">
            <path d="M985.66,92.83C906.67,72,823.78,31,743.84,14.19c-82.26-17.34-168.06-16.33-250.45.39-57.84,11.73-114,31.07-172,41.86A600.21,600.21,0,0,1,0,27.35V120H1200V95.8C1132.19,118.92,1055.71,111.31,985.66,92.83Z" className="wave-fill" />
          </svg>
        </div>
      </section>

      {/* TIMELINE */}
      <section className="Story-timeline-section">
        <div className="Story-timeline">
          {milestones.map((m, i) => (
            <motion.div
              className={`Story-milestone ${i % 2 === 0 ? "left" : "right"}`}
              key={i}
              custom={i}
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true, amount: 0.3 }}
              variants={fadeUp}
            >
              <div className="Story-milestone-card">
                <div className="Story-milestone-tag">{m.year}</div>
                <h3>{m.title}</h3>
                <p>{m.text}</p>
              </div>
              <div className="Story-milestone-dot" />
            </motion.div>
          ))}
          <div className="Story-timeline-line" />
        </div>
      </section>

      {/* QUOTE BREAK  */}
      <section className="Story-quote-section">
        <motion.blockquote
          initial={{ opacity: 0, scale: 0.97 }}
          whileInView={{ opacity: 1, scale: 1 }}
          viewport={{ once: true, amount: 0.5 }}
          transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
        >
          <span className="Story-quote-mark">"</span>
          Managing your money shouldn't require an accounting degree.
          <span className="Story-quote-mark">"</span>
        </motion.blockquote>
      </section>

      {/* VALUES */}
      <section className="Story-values-section">
        <div className="Story-section-header">
          <h2>What drives every decision</h2>
          <p>Three principles that shaped Hessabi from day one</p>
        </div>
        <div className="Story-values-grid">
          {[
            { emoji: "🎯", title: "Simplicity first", desc: "If it takes more than a minute to figure out, it's too complicated. Every screen, every feature is designed to be immediately clear." },
            { emoji: "🇧🇭", title: "Built for Bahrain", desc: "Hessabi isn't a generic global product. It's designed with the local home business owner in mind — their needs, their context, their language." },
            { emoji: "❤️", title: "People over profit", desc: "This started as a university project rooted in a real problem. The goal has always been to genuinely help people, not just build another app." },
          ].map((v, i) => (
            <motion.div
              className="Story-value-card"
              key={i}
              custom={i}
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true, amount: 0.3 }}
              variants={fadeUp}
              whileHover={{ y: -5 }}
            >
              <div className="Story-value-emoji">{v.emoji}</div>
              <h3>{v.title}</h3>
              <p>{v.desc}</p>
            </motion.div>
          ))}
        </div>
      </section>

      {/* ── CTA ── */}
      <section className="Story-cta-section">
        <motion.div
          className="Story-cta-card"
          initial={{ opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.4 }}
          transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
        >
          <h2>Ready to take control?</h2>
          <p>Join home businesses across Bahrain who manage their finances the simple way.</p>
          <Link to="/Auth?signup=true">
            <button className="Story-cta-btn">Get Started — It's Free</button>
          </Link>
        </motion.div>
      </section>

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
              <div className="social-icon" onClick={() => window.open("https://www.instagram.com/hessabi.app", "_blank")} style={{ cursor: "pointer" }}>
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

export default Ourstory;