import React from "react";
import "./legal.css";
import { usePageSeo } from "../../utils/usePageSeo";

const Terms = () => {
  usePageSeo({
    title: "Terms of Service",
    description: "Read the SmartLearn AI Terms of Service governing account usage, subscriptions, AI interactions, and platform rules.",
    canonicalPath: "/terms",
  });

  return (
    <div className="legal-page anim-fade-up">
      <div className="legal-container">
        <span className="legal-updated">Last Updated: October 2024</span>
        <h1>Terms of Service</h1>
        
        <div className="legal-content">
          <p>Welcome to SmartLearn AI. These Terms of Service outline the rules and regulations for the use of our educational platform.</p>
          
          <h2>1. Acceptance of Terms</h2>
          <p>By accessing this platform, we assume you accept these terms and conditions. Do not continue to use SmartLearn AI if you do not agree to take all of the terms and conditions stated on this page.</p>

          <h2>2. License to Use</h2>
          <p>Unless otherwise stated, SmartLearn AI and/or its licensors own the intellectual property rights for all material on the platform. You may access this from SmartLearn AI for your own personal educational use subjected to restrictions set in these terms.</p>
          <p>You must not:</p>
          <ul>
            <li>Republish material from SmartLearn AI without permission.</li>
            <li>Sell, rent, or sub-license material from SmartLearn AI.</li>
            <li>Reproduce, duplicate, or copy course contents or AI test patterns.</li>
          </ul>

          <h2>3. User Accounts & Subscriptions</h2>
          <p>If you create an account on the platform, you are responsible for maintaining the security of your account and you are fully responsible for all activities that occur under the account. We reserve the right to suspend or terminate accounts that violate our terms or engage in fraudulent activities regarding payments or course completions.</p>

          <h2>4. AI Interactions</h2>
          <p>Our mock interviews and chatbot use artificial intelligence. While we strive for high accuracy, the feedback provided is for educational purposes only and should not be considered absolute professional advice. You agree not to input malicious prompts or attempt to bypass the AI's safety restrictions.</p>
        </div>
      </div>
    </div>
  );
};

export default Terms;
