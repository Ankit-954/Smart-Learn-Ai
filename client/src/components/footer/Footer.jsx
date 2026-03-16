import React, { useState } from "react";
import axios from "axios";
import "./footer.css";
import {
  AiFillFacebook,
  AiFillTwitterSquare,
  AiFillInstagram,
  AiFillLinkedin,
  AiFillYoutube,
  AiOutlineCheckCircle
} from "react-icons/ai";
import { Link } from "react-router-dom";
import { server } from "../../main";

const Footer = () => {
  const [email, setEmail] = useState("");
  const [subStatus, setSubStatus] = useState("idle"); // idle, loading, success, error
  const [subMsg, setSubMsg] = useState("");

  const handleSubscribe = async (e) => {
    e.preventDefault();
    if (!email) return;

    setSubStatus("loading");
    setSubMsg("");
    try {
      const { data } = await axios.post(`${server}/api/public/newsletter`, { email });
      if (data.success) {
        setSubStatus("success");
        setSubMsg(data.message || "Subscribed successfully!");
        setEmail("");
        setTimeout(() => setSubStatus("idle"), 5000);
      }
    } catch (error) {
      setSubStatus("error");
      setSubMsg(error.response?.data?.error || "Subscription failed.");
      setTimeout(() => setSubStatus("idle"), 5000);
    }
  };

  return (
    <footer className="advanced-footer">
      <div className="footer-top">
        <div className="footer-grid">
          {/* Brand & About Column */}
          <div className="footer-col brand-col">
            <h3 className="footer-logo">SmartLearn <span>AI</span></h3>
            <p className="footer-desc">
              Empowering learners with cutting-edge AI-driven education.
              Unlock your potential with interactive courses, real-time mock interviews, and personalized roadmaps.
            </p>
            <div className="social-links-advanced">
              <a href="#" aria-label="Facebook"><AiFillFacebook /></a>
              <a href="#" aria-label="Twitter"><AiFillTwitterSquare /></a>
              <a href="#" aria-label="Instagram"><AiFillInstagram /></a>
              <a href="#" aria-label="LinkedIn"><AiFillLinkedin /></a>
              <a href="#" aria-label="YouTube"><AiFillYoutube /></a>
            </div>
          </div>

          {/* Quick Links Column */}
          <div className="footer-col">
            <h4>Explore</h4>
            <ul>
              <li><Link to="/">Home</Link></li>
              <li><Link to="/courses">All Courses</Link></li>
              <li><Link to="/test">Mock Tests</Link></li>
              <li><Link to="/interview">AI Interviews</Link></li>
              <li><Link to="/roadmap/Web%20Development">Study Roadmaps</Link></li>
            </ul>
          </div>

          {/* Resources Column */}
          <div className="footer-col">
            <h4>Resources</h4>
            <ul>
              <li><Link to="/about">About Us</Link></li>
              <li><Link to="/contact">Contact Support</Link></li>
              <li><Link to="/faq">Help Center & FAQ</Link></li>
              <li><Link to="/blog">Educational Blog</Link></li>
              <li><Link to="/careers">Careers</Link></li>
            </ul>
          </div>

          {/* Newsletter Column */}
          <div className="footer-col newsletter-col">
            <h4>Stay Updated</h4>
            <p>Subscribe to our newsletter for the latest courses and tech news.</p>
            {subStatus === "success" ? (
              <div className="newsletter-success anim-fade-in" style={{ display: "flex", alignItems: "center", gap: "8px", color: "var(--success)", fontWeight: "600", fontSize: "0.95rem", background: "rgba(16,185,129,0.1)", padding: "12px", borderRadius: "8px" }}>
                <AiOutlineCheckCircle size={20} /> {subMsg}
              </div>
            ) : (
              <>
                <form className="footer-newsletter-form" onSubmit={handleSubscribe}>
                  <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="Enter your email" required disabled={subStatus === "loading"} />
                  <button type="submit" disabled={subStatus === "loading"}>
                    {subStatus === "loading" ? "..." : "Subscribe"}
                  </button>
                </form>
                {subStatus === "error" && (
                  <div style={{ color: "var(--danger)", fontSize: "0.85rem", marginTop: "8px" }}>{subMsg}</div>
                )}
              </>
            )}
          </div>
        </div>
      </div>

      <div className="footer-bottom">
        <div className="footer-bottom-inner">
          <p>
            &copy; {new Date().getFullYear()} SmartLearn AI. All rights reserved. 
            Created by <a href="https://github.com/ankitkmr19" target="_blank" rel="noreferrer">Ankit Kumar</a>.
          </p>
          <div className="footer-legal-links">
            <Link to="/privacy">Privacy Policy</Link>
            <Link to="/terms">Terms of Service</Link>
            <Link to="/cookies">Cookie Settings</Link>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
