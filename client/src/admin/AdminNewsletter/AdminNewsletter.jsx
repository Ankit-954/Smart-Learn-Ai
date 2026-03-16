import React, { useEffect, useMemo, useState } from "react";
import "./adminnewsletter.css";
import Layout from "../Utils/Layout";
import axios from "axios";
import toast from "react-hot-toast";
import { server } from "../../main";
import { AiOutlineMail, AiOutlineSearch, AiOutlineSend } from "react-icons/ai";

const AdminNewsletter = () => {
  const [subscribers, setSubscribers] = useState([]);
  const [summary, setSummary] = useState({ total: 0, active: 0, inactive: 0 });
  const [loading, setLoading] = useState(false);
  const [q, setQ] = useState("");
  const [status, setStatus] = useState("all");
  const [campaignOpen, setCampaignOpen] = useState(false);
  const [campaignSubject, setCampaignSubject] = useState("");
  const [campaignMessage, setCampaignMessage] = useState("");
  const [campaignLoading, setCampaignLoading] = useState(false);

  const token = useMemo(() => localStorage.getItem("token"), []);

  const fetchSubscribers = async (search = q, statusFilter = status) => {
    setLoading(true);
    try {
      const { data } = await axios.get(`${server}/api/admin/newsletter`, {
        params: { q: search, status: statusFilter },
        headers: { token },
      });
      setSubscribers(data.subscribers || []);
      setSummary(data.summary || { total: 0, active: 0, inactive: 0 });
    } catch (error) {
      toast.error(error.response?.data?.message || "Failed to load subscribers");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const timer = setTimeout(() => {
      fetchSubscribers();
    }, 250);
    return () => clearTimeout(timer);
  }, [q, status]);

  const updateSubscriber = async (subscriber) => {
    const nextStatus = !subscriber.isActive;
    try {
      await axios.put(
        `${server}/api/admin/newsletter/${subscriber._id}`,
        { isActive: nextStatus },
        { headers: { token } }
      );
      setSubscribers((prev) =>
        prev.map((item) =>
          item._id === subscriber._id ? { ...item, isActive: nextStatus } : item
        )
      );
      setSummary((prev) => ({
        ...prev,
        active: Math.max(0, prev.active + (nextStatus ? 1 : -1)),
        inactive: Math.max(0, prev.inactive + (nextStatus ? -1 : 1)),
      }));
      toast.success(nextStatus ? "Subscriber activated" : "Subscriber deactivated");
    } catch (error) {
      toast.error(error.response?.data?.message || "Failed to update subscriber");
    }
  };

  const deleteSubscriber = async (subscriber) => {
    if (!confirm(`Remove ${subscriber.email} from newsletter list?`)) return;
    try {
      await axios.delete(`${server}/api/admin/newsletter/${subscriber._id}`, {
        headers: { token },
      });
      setSubscribers((prev) => prev.filter((item) => item._id !== subscriber._id));
      setSummary((prev) => ({
        total: Math.max(0, prev.total - 1),
        active: subscriber.isActive ? Math.max(0, prev.active - 1) : prev.active,
        inactive: !subscriber.isActive ? Math.max(0, prev.inactive - 1) : prev.inactive,
      }));
      toast.success("Subscriber removed");
    } catch (error) {
      toast.error(error.response?.data?.message || "Failed to remove subscriber");
    }
  };

  const exportSubscribers = async () => {
    try {
      const { data } = await axios.get(`${server}/api/admin/newsletter/export`, {
        headers: { token },
        responseType: "blob",
      });

      const blobUrl = URL.createObjectURL(new Blob([data], { type: "text/csv;charset=utf-8;" }));
      const link = document.createElement("a");
      link.href = blobUrl;
      link.setAttribute("download", "newsletter-subscribers.csv");
      document.body.appendChild(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(blobUrl);
      toast.success("CSV exported");
    } catch (error) {
      toast.error(error.response?.data?.message || "Unable to export CSV");
    }
  };

  const sendCampaign = async () => {
    if (!campaignSubject.trim()) {
      toast.error("Campaign subject is required");
      return;
    }
    if (!campaignMessage.trim()) {
      toast.error("Campaign message is required");
      return;
    }

    setCampaignLoading(true);
    try {
      const { data } = await axios.post(
        `${server}/api/admin/newsletter/campaign`,
        { subject: campaignSubject, message: campaignMessage },
        { headers: { token } }
      );
      toast.success(data.message || "Campaign sent");
      setCampaignOpen(false);
      setCampaignSubject("");
      setCampaignMessage("");
    } catch (error) {
      toast.error(error.response?.data?.message || "Failed to send campaign");
    } finally {
      setCampaignLoading(false);
    }
  };

  return (
    <Layout>
      <div className="admin-newsletter">
        <div className="admin-newsletter-header">
          <div>
            <h1>Newsletter</h1>
            <p>Manage subscriber list and broadcast updates to active users.</p>
          </div>
          <div className="admin-newsletter-stats">
            <span>
              <AiOutlineMail />
              {summary.total} total
            </span>
            <span>{summary.active} active</span>
            <span>{summary.inactive} inactive</span>
          </div>
        </div>

        <div className="admin-newsletter-toolbar">
          <div className="admin-newsletter-search">
            <AiOutlineSearch />
            <input
              type="text"
              placeholder="Search by email..."
              value={q}
              onChange={(e) => setQ(e.target.value)}
            />
          </div>

          <select value={status} onChange={(e) => setStatus(e.target.value)}>
            <option value="all">All Status</option>
            <option value="active">Active</option>
            <option value="inactive">Inactive</option>
          </select>

          <button
            type="button"
            className="common-btn admin-newsletter-outline-btn"
            onClick={exportSubscribers}
          >
            Export CSV
          </button>
          <button type="button" className="common-btn" onClick={() => setCampaignOpen(true)}>
            <AiOutlineSend />
            <span>Send Campaign</span>
          </button>
          <button
            type="button"
            className="common-btn admin-newsletter-refresh"
            onClick={() => fetchSubscribers(q, status)}
            disabled={loading}
          >
            {loading ? "Loading..." : "Refresh"}
          </button>
        </div>

        <div className="admin-newsletter-table-wrap">
          <table>
            <thead>
              <tr>
                <th>Email</th>
                <th>Status</th>
                <th>Subscribed At</th>
                <th>Updated</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {subscribers.length === 0 ? (
                <tr>
                  <td colSpan="5" className="admin-newsletter-empty">
                    {loading ? "Loading..." : "No subscribers found"}
                  </td>
                </tr>
              ) : (
                subscribers.map((subscriber) => (
                  <tr key={subscriber._id}>
                    <td>{subscriber.email}</td>
                    <td>
                      <span
                        className={`newsletter-status-pill ${
                          subscriber.isActive ? "newsletter-status-active" : "newsletter-status-inactive"
                        }`}
                      >
                        {subscriber.isActive ? "Active" : "Inactive"}
                      </span>
                    </td>
                    <td>{new Date(subscriber.subscribedAt || subscriber.createdAt).toLocaleString()}</td>
                    <td>{new Date(subscriber.updatedAt || subscriber.createdAt).toLocaleString()}</td>
                    <td className="admin-newsletter-actions">
                      <button
                        type="button"
                        className="admin-newsletter-btn"
                        onClick={() => updateSubscriber(subscriber)}
                      >
                        {subscriber.isActive ? "Deactivate" : "Activate"}
                      </button>
                      <button
                        type="button"
                        className="admin-newsletter-btn admin-newsletter-btn-danger"
                        onClick={() => deleteSubscriber(subscriber)}
                      >
                        Delete
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {campaignOpen && (
        <div className="admin-newsletter-overlay">
          <div className="admin-newsletter-modal">
            <div className="admin-newsletter-modal-header">
              <h3>Send Newsletter Campaign</h3>
              <button type="button" onClick={() => setCampaignOpen(false)}>
                &times;
              </button>
            </div>
            <div className="admin-newsletter-modal-body">
              <label>Subject</label>
              <input
                type="text"
                value={campaignSubject}
                onChange={(e) => setCampaignSubject(e.target.value)}
                placeholder="e.g. New React Masterclass + Career Updates"
              />
              <label>Message</label>
              <textarea
                rows="8"
                value={campaignMessage}
                onChange={(e) => setCampaignMessage(e.target.value)}
                placeholder="Write your update. Use line breaks to format sections."
              />
            </div>
            <div className="admin-newsletter-modal-actions">
              <button
                type="button"
                className="common-btn admin-newsletter-outline-btn"
                onClick={() => setCampaignOpen(false)}
              >
                Cancel
              </button>
              <button
                type="button"
                className="common-btn"
                onClick={sendCampaign}
                disabled={campaignLoading}
              >
                {campaignLoading ? "Sending..." : "Send to Active Subscribers"}
              </button>
            </div>
          </div>
        </div>
      )}
    </Layout>
  );
};

export default AdminNewsletter;
