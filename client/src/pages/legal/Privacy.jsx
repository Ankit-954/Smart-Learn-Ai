import React from "react";
import "./legal.css";
import { usePageSeo } from "../../utils/usePageSeo";

const Privacy = () => {
  usePageSeo({
    title: "Privacy Policy",
    description: "Read the SmartLearn AI Privacy Policy to understand how personal data, account data, and AI interaction data are handled.",
    canonicalPath: "/privacy",
  });

  return (
    <div className="legal-page anim-fade-up">
      <div className="legal-container">
        <span className="legal-updated">Last Updated: October 2024</span>
        <h1>Privacy Policy</h1>
        
        <div className="legal-content">
          <p>At SmartLearn AI, we take your privacy seriously. This Privacy Policy explains how we collect, use, disclose, and safeguard your information when you visit our website and use our educational services.</p>
          
          <h2>1. Information We Collect</h2>
          <p>We may collect information about you in a variety of ways. The information we may collect includes:</p>
          <ul>
            <li><strong>Personal Data:</strong> Name, email address, and demographic information that you voluntarily give to us when you register.</li>
            <li><strong>Derivative Data:</strong> Information our servers automatically collect when you access the platform, such as your IP address, browser type, operating system, and access times.</li>
            <li><strong>AI Interaction Data:</strong> Transcripts of your mock interviews, chatbot conversations, and test scores to provide personalized feedback and roadmaps.</li>
          </ul>

          <h2>2. Use of Your Information</h2>
          <p>Having accurate information about you permits us to provide you with a smooth, efficient, and customized experience. We use information collected via the platform to:</p>
          <ul>
            <li>Create and manage your account.</li>
            <li>Generate personalized study roadmaps and course recommendations.</li>
            <li>Provide real-time feedback during AI mock interviews.</li>
            <li>Process payments and refunds securely.</li>
            <li>Send you functional and administrative emails.</li>
          </ul>

          <h2>3. Data Security</h2>
          <p>We use administrative, technical, and physical security measures to help protect your personal information. While we have taken reasonable steps to secure the personal information you provide to us, please be aware that despite our efforts, no security measures are perfect or impenetrable.</p>
          
          <div className="legal-contact-box">
            <h3>Questions about our privacy practices?</h3>
            <p>If you have any questions or comments about this Privacy Policy, please contact us at: <a href="mailto:privacy@smartlearn.ai">privacy@smartlearn.ai</a></p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Privacy;
