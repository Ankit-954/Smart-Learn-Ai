import React, { useState } from "react";
import "./faq.css";
import { AiOutlinePlus, AiOutlineMinus } from "react-icons/ai";
import { usePageSeo } from "../../utils/usePageSeo";

const faqs = [
  {
    question: "How do the AI Mock Interviews work?",
    answer: "Our AI conducts a real-time voice and video interview simulating a human recruiter. It analyzes your audio, transcribed answers, and facial expressions to provide comprehensive feedback on your technical knowledge and communication skills."
  },
  {
    question: "Do I get a certificate after completing a course?",
    answer: "Yes! Upon successfully completing all modules and passing the final assessment in a course, you will receive a verified SmartLearn AI certificate that you can easily add to your LinkedIn profile."
  },
  {
    question: "Are the courses self-paced?",
    answer: "Absolutely. Once you enroll in a course, you have lifetime access to the materials. You can learn at your own pace, anytime and anywhere."
  },
  {
    question: "How is the learning roadmap personalized for me?",
    answer: "When you first sign up or use our Chatbot, we assess your current skill level, career goals, and available time. Our AI then generates a step-by-step roadmap tailored specifically to get you from where you are to where you want to be."
  },
  {
    question: "Can I take the mock tests multiple times?",
    answer: "Yes, you can take our domain-specific mock tests as many times as you want. Our question bank is extensive, so you'll likely see new questions on subsequent attempts to help you practice effectively."
  }
];

const FAQ = () => {
  const [activeIndex, setActiveIndex] = useState(null);

  usePageSeo({
    title: "FAQ",
    description: "Find answers about SmartLearn AI courses, certificates, mock interviews, tests, and personalized roadmaps.",
    canonicalPath: "/faq",
  });

  const toggleFAQ = (index) => {
    setActiveIndex(activeIndex === index ? null : index);
  };

  return (
    <div className="faq-page">
      <div className="faq-hero anim-fade-up">
        <h1>Frequently Asked Questions</h1>
        <p>Find answers to the most common questions about SmartLearn AI.</p>
      </div>

      <div className="faq-container anim-scale-in">
        {faqs.map((faq, index) => (
          <div 
            key={index} 
            className={`faq-item ${activeIndex === index ? "active" : ""}`}
            onClick={() => toggleFAQ(index)}
          >
            <div className="faq-question">
              <h3>{faq.question}</h3>
              <span className="faq-icon">
                {activeIndex === index ? <AiOutlineMinus /> : <AiOutlinePlus />}
              </span>
            </div>
            <div className="faq-answer">
              <p>{faq.answer}</p>
            </div>
          </div>
        ))}
      </div>

      <div className="faq-support anim-fade-up">
        <h2>Still have questions?</h2>
        <p>If you cannot find answer to your question in our FAQ, you can always contact us. We will answer to you shortly!</p>
        <a href="/contact" className="common-btn faq-btn">Contact Support</a>
      </div>
    </div>
  );
};

export default FAQ;
