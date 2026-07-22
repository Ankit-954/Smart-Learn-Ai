import React, { useEffect, useMemo, useRef, useState } from "react";
import "./chatbotWidget.css";
import API from "../../utils/api.js";
const server = API.defaults.baseURL;
import { FaRobot, FaTimes } from "react-icons/fa";
import { IoSend } from "react-icons/io5";
import toast from "react-hot-toast";
import { useNavigate } from "react-router-dom";

const QUICK_PROMPTS = [
  "Suggest best courses for frontend developer",
  "I cannot complete payment in Razorpay test mode",
  "Video lecture not playing after purchase",
  "Recommend test for React interview prep",
];

const ChatbotWidget = () => {
  const navigate = useNavigate();

  // Simple markdown renderer for chatbot messages
  const renderMarkdown = (text) => {
    if (!text) return null;
    return text.split("\n").map((line, i) => {
      // Bold: **text**
      const parts = line.split(/(\*\*[^*]+\*\*)/g).map((part, j) => {
        if (part.startsWith("**") && part.endsWith("**")) {
          return <strong key={j}>{part.slice(2, -2)}</strong>;
        }
        return part;
      });
      // Bullet points
      const trimmed = line.trim();
      if (trimmed.startsWith("• ") || trimmed.startsWith("- ") || /^\d+[\.\)]\s/.test(trimmed)) {
        return <div key={i} style={{ paddingLeft: "8px", marginBottom: "3px" }}>{parts}</div>;
      }
      if (trimmed === "") return <br key={i} />;
      return <div key={i} style={{ marginBottom: "4px" }}>{parts}</div>;
    });
  };
  const [open, setOpen] = useState(false);
  const [tab, setTab] = useState("chat");
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [lastFailedQuestion, setLastFailedQuestion] = useState("");
  const [messages, setMessages] = useState([
    {
      from: "bot",
      text: "Hi, I am SmartLearn assistant. Ask me about courses, tests, progress, or payments.",
    },
  ]);
  const messagesRef = useRef(null);
  const [callbackForm, setCallbackForm] = useState({
    name: "",
    phone: "",
    email: "",
    message: "",
  });
  const [callbackLoading, setCallbackLoading] = useState(false);
  const quickPrompts = useMemo(() => QUICK_PROMPTS, []);

  const askQuestion = async (retryQuestion = "") => {
    const finalQuestion = retryQuestion || input;
    if (!finalQuestion.trim()) return;

    const question = finalQuestion.trim();
    const nextMessages = [...messages, { from: "user", text: question }];
    setMessages(nextMessages);
    if (!retryQuestion) setInput("");
    setLastFailedQuestion("");
    setLoading(true);

    try {
      const historyPayload = messages
        .slice(-8)
        .map((m) => ({
          role: m.from === "bot" ? "assistant" : "user",
          content: m.text,
        }));
      const token = localStorage.getItem("token");
      const headers = { "Content-Type": "application/json" };
      if (token) {
        headers.token = token;
      }

      const response = await fetch(`${server}/api/chatbot/ask`, {
        method: "POST",
        headers,
        body: JSON.stringify({ question, history: historyPayload }),
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.message || data.details || "Chatbot service unavailable");
      }

      setMessages((prev) => [
        ...prev,
        {
          from: "bot",
          text: data.answer || "I could not answer that right now.",
          links: Array.isArray(data.links) ? data.links : [],
          suggestedQuestions: Array.isArray(data.suggestedQuestions)
            ? data.suggestedQuestions
            : [],
        },
      ]);
    } catch (error) {
      setLastFailedQuestion(question);
      setMessages((prev) => [
        ...prev,
        { from: "bot", text: "Unable to connect right now. Please try again." },
      ]);
    } finally {
      setLoading(false);
    }
  };

  const submitCallbackRequest = async (e) => {
    e.preventDefault();
    if (!callbackForm.name.trim() || !callbackForm.phone.trim()) {
      toast.error("Name and phone are required");
      return;
    }

    setCallbackLoading(true);
    try {
      const response = await fetch(`${server}/api/callback-request`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(callbackForm),
      });
      const data = await response.json();
      if (!response.ok) {
        toast.error(data.message || "Request failed");
      } else {
        toast.success(data.message || "Request submitted");
        setCallbackForm({ name: "", phone: "", email: "", message: "" });
      }
    } catch (error) {
      toast.error("Unable to send request");
    } finally {
      setCallbackLoading(false);
    }
  };

  useEffect(() => {
    if (!messagesRef.current) return;
    messagesRef.current.scrollTop = messagesRef.current.scrollHeight;
  }, [messages, loading, open, tab]);

  return (
    <div className="chatbot-widget">
      {open && (
        <div className="chatbot-panel">
          <div className="chatbot-head">
            <div className="chatbot-title">
              <span className="chatbot-badge">
                <FaRobot />
              </span>
              SmartLearn Chatbot
            </div>
            <button className="chatbot-close-btn" onClick={() => setOpen(false)}>
              <FaTimes />
            </button>
          </div>

          <div className="chatbot-tabs">
            <button
              className={tab === "chat" ? "active" : ""}
              onClick={() => setTab("chat")}
            >
              Ask Question
            </button>
            <button
              className={tab === "callback" ? "active" : ""}
              onClick={() => setTab("callback")}
            >
              Request Call Back
            </button>
          </div>

          {tab === "chat" ? (
            <div className="chat-tab">
              <div className="chat-messages" ref={messagesRef}>
                <div className="chat-quick-prompts">
                  {quickPrompts.map((prompt) => (
                    <button
                      key={prompt}
                      type="button"
                      className="chat-quick-chip"
                      onClick={() => askQuestion(prompt)}
                      disabled={loading}
                    >
                      {prompt}
                    </button>
                  ))}
                </div>
                {messages.map((m, i) => (
                  <div
                    className={`chat-message ${m.from === "user" ? "user" : "bot"}`}
                    key={i}
                  >
                    <div>{m.from === "bot" ? renderMarkdown(m.text) : m.text}</div>
                    {m.from === "bot" && Array.isArray(m.links) && m.links.length > 0 && (
                      <div className="chat-link-list">
                        {m.links.map((link, idx) => (
                          <button
                            key={`${i}-${idx}`}
                            className={`chat-link-chip ${
                              link.type === "test"
                                ? "test"
                                : link.type === "support" || link.type === "account"
                                  ? "support"
                                  : "course"
                            }`}
                            onClick={() => {
                              navigate(link.url);
                              setOpen(false);
                            }}
                          >
                            {link.label}
                          </button>
                        ))}
                      </div>
                    )}
                    {m.from === "bot" &&
                      Array.isArray(m.suggestedQuestions) &&
                      m.suggestedQuestions.length > 0 && (
                        <div className="chat-suggestion-list">
                          {m.suggestedQuestions.map((suggestion, idx) => (
                            <button
                              key={`${i}-s-${idx}`}
                              type="button"
                              className="chat-suggestion-chip"
                              onClick={() => askQuestion(suggestion)}
                            >
                              {suggestion}
                            </button>
                          ))}
                        </div>
                      )}
                  </div>
                ))}
                {loading && <div className="chat-message bot">SmartLearn is typing...</div>}
              </div>
              {!!lastFailedQuestion && !loading && (
                <button
                  className="callback-submit-btn"
                  onClick={() => askQuestion(lastFailedQuestion)}
                >
                  Retry last question
                </button>
              )}
              <div className="chat-input-row">
                <input
                  type="text"
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  placeholder="Type your question..."
                  onKeyDown={(e) => e.key === "Enter" && askQuestion()}
                />
                <button onClick={() => askQuestion()} disabled={loading}>
                  <IoSend />
                </button>
              </div>
            </div>
          ) : (
            <form className="callback-form" onSubmit={submitCallbackRequest}>
              <input
                type="text"
                placeholder="Your Name *"
                value={callbackForm.name}
                onChange={(e) =>
                  setCallbackForm((prev) => ({ ...prev, name: e.target.value }))
                }
              />
              <input
                type="text"
                placeholder="Phone Number *"
                value={callbackForm.phone}
                onChange={(e) =>
                  setCallbackForm((prev) => ({ ...prev, phone: e.target.value }))
                }
              />
              <input
                type="email"
                placeholder="Email (optional)"
                value={callbackForm.email}
                onChange={(e) =>
                  setCallbackForm((prev) => ({ ...prev, email: e.target.value }))
                }
              />
              <textarea
                placeholder="Message (optional)"
                rows={3}
                value={callbackForm.message}
                onChange={(e) =>
                  setCallbackForm((prev) => ({ ...prev, message: e.target.value }))
                }
              />
              <button className="callback-submit-btn" disabled={callbackLoading}>
                {callbackLoading ? "Sending..." : "Request Call"}
              </button>
            </form>
          )}
        </div>
      )}

      <button className="chatbot-toggle-btn" onClick={() => setOpen((prev) => !prev)}>
        <FaRobot />
      </button>
    </div>
  );
};

export default ChatbotWidget;
