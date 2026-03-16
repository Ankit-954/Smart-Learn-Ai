import React, { useState } from "react";
import axios from "axios";
import "./contact.css";
import { server } from "../../main";
import { AiOutlineMail, AiOutlinePhone, AiOutlineEnvironment, AiOutlineLoading3Quarters } from "react-icons/ai";

const Contact = () => {
  const [formData, setFormData] = useState({ name: "", email: "", subject: "", message: "" });
  const [status, setStatus] = useState("idle"); // idle, loading, success, error
  const [errorMessage, setErrorMessage] = useState("");

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setStatus("loading");
    setErrorMessage("");
    try {
      // Connects to our new public route
      const { data } = await axios.post(`${server}/api/public/contact`, formData);
      if (data.success) {
        setStatus("success");
        setFormData({ name: "", email: "", subject: "", message: "" });
        setTimeout(() => setStatus("idle"), 6000);
      }
    } catch (error) {
      setStatus("error");
      setErrorMessage(error.response?.data?.error || "Failed to send message. Please try again.");
    }
  };

  return (
    <div className="contact-page">
      <div className="contact-hero anim-fade-up">
        <h1>Get in Touch</h1>
        <p>Have questions? We'd love to hear from you. Send us a message and we'll respond as soon as possible.</p>
      </div>

      <div className="contact-container anim-scale-in">
        <div className="contact-info">
          <h2>Contact Information</h2>
          <p>Fill up the form and our Team will get back to you within 24 hours.</p>

          <div className="info-items">
            <div className="info-item">
              <span className="info-icon"><AiOutlinePhone /></span>
              <div>
                <strong>Phone</strong>
                <p>+91 (800) 123-4567</p>
              </div>
            </div>
            
            <div className="info-item">
              <span className="info-icon"><AiOutlineMail /></span>
              <div>
                <strong>Email</strong>
                <p>support@smartlearn.ai</p>
              </div>
            </div>

            <div className="info-item">
              <span className="info-icon"><AiOutlineEnvironment /></span>
              <div>
                <strong>Office</strong>
                <p>Connaught Place, New Delhi<br />India 110001</p>
              </div>
            </div>
          </div>
        </div>

        <div className="contact-form-wrapper">
          {status === "success" ? (
            <div className="success-message-box anim-scale-in">
              <h3>Message Sent Successfully! 🎉</h3>
              <p>Thank you for reaching out. Our support team will contact you shortly.</p>
              <button className="common-btn mt-4" onClick={() => setStatus("idle")}>Send Another Message</button>
            </div>
          ) : (
            <form className="contact-form" onSubmit={handleSubmit}>
              {status === "error" && (
                <div style={{ color: "var(--danger)", marginBottom: "10px", fontSize: "0.9rem", padding: "10px", background: "rgba(239, 68, 68, 0.1)", borderRadius: "8px" }}>
                  {errorMessage}
                </div>
              )}
              
              <div className="form-row">
                <div className="input-group">
                  <label>Your Name</label>
                  <input type="text" name="name" value={formData.name} onChange={handleChange} placeholder="John Doe" required disabled={status === "loading"} />
                </div>
                <div className="input-group">
                  <label>Email Address</label>
                  <input type="email" name="email" value={formData.email} onChange={handleChange} placeholder="john@example.com" required disabled={status === "loading"} />
                </div>
              </div>
              
              <div className="input-group">
                <label>Subject</label>
                <input type="text" name="subject" value={formData.subject} onChange={handleChange} placeholder="How can we help?" required disabled={status === "loading"} />
              </div>

              <div className="input-group">
                <label>Message</label>
                <textarea name="message" value={formData.message} onChange={handleChange} rows="5" placeholder="Write your message here..." required disabled={status === "loading"}></textarea>
              </div>

              <button type="submit" className="common-btn send-btn" disabled={status === "loading"}>
                {status === "loading" ? <span style={{ display: "flex", alignItems: "center", gap: "8px" }}><AiOutlineLoading3Quarters className="spinner" /> Sending...</span> : "Send Message"}
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};

export default Contact;
