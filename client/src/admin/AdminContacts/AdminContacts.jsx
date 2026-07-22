import React, { useEffect, useMemo, useState } from "react";
import "./admincontacts.css";
import Layout from "../Utils/Layout";
import axios from "axios";
import toast from "react-hot-toast";
import API from "../../utils/api.js";
const server = API.defaults.baseURL;
import { AiOutlineMail, AiOutlineSearch } from "react-icons/ai";
import { FiMoreVertical } from "react-icons/fi";
import { createPortal } from "react-dom";

const AdminContacts = ({ user }) => {
  const ACTION_MENU_WIDTH = 200;
  const ACTION_MENU_HEIGHT = 188;
  const [contacts, setContacts] = useState([]);
  const [loading, setLoading] = useState(false);
  const [q, setQ] = useState("");
  const [status, setStatus] = useState("all");
  const [replyTarget, setReplyTarget] = useState(null);
  const [replySubject, setReplySubject] = useState("");
  const [replyMessage, setReplyMessage] = useState("");
  const [replySending, setReplySending] = useState(false);
  const [openMenu, setOpenMenu] = useState(null);

  const token = useMemo(() => localStorage.getItem("token"), []);

  const fetchContacts = async (search = q, statusFilter = status) => {
    setLoading(true);
    try {
      const { data } = await axios.get(`${server}/api/admin/contacts`, {
        params: { q: search, status: statusFilter },
        headers: { token },
      });
      setContacts(data.contacts || []);
      setOpenMenu(null);
    } catch (error) {
      console.error(error);
      toast.error("Failed to load contact messages");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const t = setTimeout(() => fetchContacts(), 300);
    return () => clearTimeout(t);
  }, [q, status]);

  useEffect(() => {
    if (!openMenu) return;

    const handleOutside = (event) => {
      if (
        event.target instanceof Element &&
        (event.target.closest(".admin-actions-menu") || event.target.closest(".admin-actions-dropdown"))
      ) {
        return;
      }
      setOpenMenu(null);
    };

    const handleEscape = (event) => {
      if (event.key === "Escape") setOpenMenu(null);
    };

    document.addEventListener("mousedown", handleOutside);
    document.addEventListener("keydown", handleEscape);

    return () => {
      document.removeEventListener("mousedown", handleOutside);
      document.removeEventListener("keydown", handleEscape);
    };
  }, [openMenu]);

  const updateStatus = async (id, nextStatus) => {
    try {
      await axios.put(
        `${server}/api/admin/contacts/${id}`,
        { status: nextStatus },
        { headers: { token } }
      );
      setContacts((prev) =>
        prev.map((c) => (c._id === id ? { ...c, status: nextStatus } : c))
      );
      toast.success("Status updated");
    } catch (error) {
      toast.error("Failed to update status");
    }
  };

  const deleteContact = async (id) => {
    if (!confirm("Delete this message?")) return;
    try {
      await axios.delete(`${server}/api/admin/contacts/${id}`, {
        headers: { token },
      });
      setContacts((prev) => prev.filter((c) => c._id !== id));
      toast.success("Message deleted");
    } catch (error) {
      toast.error("Failed to delete message");
    }
  };

  const openReplyModal = (contact) => {
    setOpenMenu(null);
    setReplyTarget(contact);
    setReplySubject(`Re: ${contact.subject || "Support Request"}`);
    setReplyMessage("");
  };

  const toggleActionsMenu = (event, contactId) => {
    if (openMenu?.id === contactId) {
      setOpenMenu(null);
      return;
    }

    const rect = event.currentTarget.getBoundingClientRect();
    let left = rect.right - ACTION_MENU_WIDTH;
    left = Math.max(8, Math.min(left, window.innerWidth - ACTION_MENU_WIDTH - 8));

    let top = rect.bottom + 8;
    if (top + ACTION_MENU_HEIGHT > window.innerHeight - 8) {
      top = Math.max(8, rect.top - ACTION_MENU_HEIGHT - 8);
    }

    setOpenMenu({ id: contactId, top, left });
  };

  const closeReplyModal = () => {
    setReplyTarget(null);
    setReplySubject("");
    setReplyMessage("");
    setReplySending(false);
  };

  const sendReply = async () => {
    if (!replyTarget) return;
    if (!replyMessage.trim()) {
      toast.error("Reply message is required");
      return;
    }
    setReplySending(true);
    try {
      const { data } = await axios.post(
        `${server}/api/admin/contacts/${replyTarget._id}/reply`,
        {
          subject: replySubject,
          message: replyMessage,
        },
        { headers: { token } }
      );
      const updated = data?.contact;
      setContacts((prev) =>
        prev.map((c) => (c._id === replyTarget._id ? updated || { ...c, status: "replied" } : c))
      );
      toast.success("Reply sent");
      closeReplyModal();
    } catch (error) {
      toast.error(error.response?.data?.message || "Failed to send reply");
      setReplySending(false);
    }
  };

  const statusBadgeClass = (value) => {
    if (value === "read") return "status-read";
    if (value === "replied") return "status-replied";
    return "status-unread";
  };

  return (
    <Layout>
      <div className="admin-contacts">
        <div className="admin-contacts-header">
          <div>
            <h1>Contact Messages</h1>
            <p>Review and manage messages submitted from the contact form.</p>
          </div>
          <div className="admin-contacts-count">
            <AiOutlineMail />
            <span>{contacts.length} messages</span>
          </div>
        </div>

        <div className="admin-contacts-toolbar">
          <div className="admin-contacts-search">
            <AiOutlineSearch />
            <input
              type="text"
              placeholder="Search by name, email, subject..."
              value={q}
              onChange={(e) => setQ(e.target.value)}
            />
          </div>
          <select value={status} onChange={(e) => setStatus(e.target.value)}>
            <option value="all">All Status</option>
            <option value="unread">Unread</option>
            <option value="read">Read</option>
            <option value="replied">Replied</option>
          </select>
          <button
            type="button"
            className="common-btn admin-refresh-btn"
            onClick={() => fetchContacts(q, status)}
            disabled={loading}
          >
            {loading ? "Loading..." : "Refresh"}
          </button>
        </div>

        <div className="admin-contacts-table-wrap">
          <table>
            <thead>
              <tr>
                <th>From</th>
                <th>Subject</th>
                <th>Message</th>
                <th>Status</th>
                <th>Date</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {contacts.length === 0 ? (
                <tr>
                  <td colSpan="6" className="admin-empty">
                    {loading ? "Loading..." : "No messages found."}
                  </td>
                </tr>
              ) : (
                contacts.map((contact) => (
                  <tr key={contact._id}>
                    <td>
                      <div className="admin-contact-from">
                        <strong>{contact.name}</strong>
                        <span>{contact.email}</span>
                      </div>
                    </td>
                    <td>{contact.subject}</td>
                    <td title={contact.message}>
                      {String(contact.message || "").slice(0, 140)}
                      {String(contact.message || "").length > 140 ? "..." : ""}
                    </td>
                    <td>
                      <span className={`status-pill ${statusBadgeClass(contact.status)}`}>
                        {contact.status}
                      </span>
                    </td>
                    <td>{new Date(contact.createdAt).toLocaleString()}</td>
                    <td className="admin-actions-cell">
                      <div className="admin-actions-menu">
                        <button
                          type="button"
                          className="admin-kebab-btn"
                          aria-label={`Open actions for ${contact.name}`}
                          aria-haspopup="menu"
                          aria-expanded={openMenu?.id === contact._id}
                          aria-controls={`contact-actions-${contact._id}`}
                          onClick={(event) => toggleActionsMenu(event, contact._id)}
                        >
                          <FiMoreVertical />
                        </button>

                        {openMenu?.id === contact._id && typeof document !== "undefined"
                          ? createPortal(
                              <div
                                id={`contact-actions-${contact._id}`}
                                className="admin-actions-dropdown"
                                role="menu"
                                style={{ top: openMenu.top, left: openMenu.left }}
                              >
                                <button
                                  type="button"
                                  role="menuitem"
                                  className="admin-actions-item"
                                  onClick={() => {
                                    setOpenMenu(null);
                                    updateStatus(contact._id, "read");
                                  }}
                                  disabled={contact.status === "read"}
                                >
                                  Mark as Read
                                </button>
                                <button
                                  type="button"
                                  role="menuitem"
                                  className="admin-actions-item"
                                  onClick={() => {
                                    setOpenMenu(null);
                                    updateStatus(contact._id, "replied");
                                  }}
                                  disabled={contact.status === "replied"}
                                >
                                  Mark as Replied
                                </button>
                                <button
                                  type="button"
                                  role="menuitem"
                                  className="admin-actions-item"
                                  onClick={() => openReplyModal(contact)}
                                >
                                  Reply
                                </button>
                                <button
                                  type="button"
                                  role="menuitem"
                                  className="admin-actions-item admin-actions-item-danger"
                                  onClick={() => {
                                    setOpenMenu(null);
                                    deleteContact(contact._id);
                                  }}
                                >
                                  Delete
                                </button>
                              </div>,
                              document.body
                            )
                          : null}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {replyTarget && (
          <div className="admin-reply-overlay">
            <div className="admin-reply-modal">
              <div className="admin-reply-header">
                <div>
                  <h3>Reply to {replyTarget.name}</h3>
                  <p>{replyTarget.email}</p>
                </div>
                <button type="button" className="admin-reply-close" onClick={closeReplyModal}>
                  &times;
                </button>
              </div>
              <div className="admin-reply-body">
                <label>Subject</label>
                <input
                  type="text"
                  value={replySubject}
                  onChange={(e) => setReplySubject(e.target.value)}
                  placeholder="Subject"
                />
                <label>Message</label>
                <textarea
                  rows="6"
                  value={replyMessage}
                  onChange={(e) => setReplyMessage(e.target.value)}
                  placeholder="Write your reply..."
                />
              </div>
              <div className="admin-reply-actions">
                <button type="button" className="common-btn outline-btn" onClick={closeReplyModal}>
                  Cancel
                </button>
                <button
                  type="button"
                  className="common-btn"
                  onClick={sendReply}
                  disabled={replySending}
                >
                  {replySending ? "Sending..." : "Send Reply"}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </Layout>
  );
};

export default AdminContacts;

