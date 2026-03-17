import React from "react";
import "./legal.css";
import { usePageSeo } from "../../utils/usePageSeo";

const Cookies = () => {
  usePageSeo({
    title: "Cookie Policy",
    description: "Read the SmartLearn AI Cookie Policy to understand how authentication, preferences, and performance-related data are stored.",
    canonicalPath: "/cookies",
  });

  return (
    <div className="legal-page anim-fade-up">
      <div className="legal-container">
        <span className="legal-updated">Last Updated: October 2024</span>
        <h1>Cookie Policy</h1>
        
        <div className="legal-content">
          <p>SmartLearn AI uses strictly necessary and performance cookies to ensure you get the best experience on our educational platform.</p>
          
          <h2>1. What Are Cookies?</h2>
          <p>Cookies are small text files that are placed on your computer or mobile device when you visit a website. They are widely used to make websites work more efficiently and provide information to the owners of the site.</p>

          <h2>2. How We Use Cookies</h2>
          <p>We use cookies for the following purposes:</p>
          <ul>
            <li><strong>Authentication & Security:</strong> To keep you logged in to your account securely across different pages. We use local storage for your <code>token</code> to remember your session.</li>
            <li><strong>Preferences:</strong> To remember your chosen theme (Light mode or Dark mode) via local storage so that your UI doesn't reset every time you refresh.</li>
            <li><strong>Performance:</strong> To understand how users interact with our courses, which helps us improve our curriculum and UI.</li>
          </ul>

          <h2>3. Managing Cookies</h2>
          <p>You can control and/or delete cookies as you wish. You can delete all cookies that are already on your computer, and you can set most browsers to prevent them from being placed. However, if you do this, you may have to manually adjust some preferences every time you visit a site, and some services and functionalities (like staying logged in) will not work.</p>
        </div>
      </div>
    </div>
  );
};

export default Cookies;
