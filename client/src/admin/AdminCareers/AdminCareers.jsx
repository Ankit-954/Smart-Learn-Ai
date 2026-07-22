import React, { useState, useEffect, useRef } from "react";
import Layout from "../Utils/Layout";
import axios from "axios";
import API from "../../utils/api.js";
const server = API.defaults.baseURL;
import toast from "react-hot-toast";
import { FiBriefcase, FiSettings } from "react-icons/fi";
import { createPortal } from "react-dom";
import "./admincareers.css";

const AdminCareers = ({ user }) => {
  const [jobs, setJobs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  
  // Form State
  const [jobId, setJobId] = useState(null);
  const [title, setTitle] = useState("");
  const [department, setDepartment] = useState("");
  const [location, setLocation] = useState("");
  const [type, setType] = useState("Full-Time");
  const [description, setDescription] = useState("");
  const [applyLink, setApplyLink] = useState("");
  const [isActive, setIsActive] = useState(true);
  const modalBodyRef = useRef(null);

  const fetchJobs = async () => {
    try {
      const { data } = await axios.get(`${server}/api/jobs`, {
        headers: { token: localStorage.getItem("token") },
      });
      setJobs(data.jobs);
    } catch (error) {
      toast.error(error.response?.data?.message || "Failed to fetch jobs");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchJobs();
  }, []);

  useEffect(() => {
    if (!showModal) return;
    const id = requestAnimationFrame(() => {
      if (modalBodyRef.current) {
        modalBodyRef.current.scrollTop = 0;
      }
    });
    return () => cancelAnimationFrame(id);
  }, [showModal, jobId]);

  useEffect(() => {
    if (!showModal) return undefined;
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prevOverflow;
    };
  }, [showModal]);

  const resetForm = () => {
    setJobId(null);
    setTitle("");
    setDepartment("");
    setLocation("");
    setType("Full-Time");
    setDescription("");
    setApplyLink("");
    setIsActive(true);
    setShowModal(false);
  };

  const openCreateModal = () => {
    setJobId(null);
    setTitle("");
    setDepartment("");
    setLocation("");
    setType("Full-Time");
    setDescription("");
    setApplyLink("");
    setIsActive(true);
    setShowModal(true);
  };

  const handleEdit = (job) => {
    setJobId(job._id);
    setTitle(job.title);
    setDepartment(job.department);
    setLocation(job.location);
    setType(job.type);
    setDescription(job.description);
    setApplyLink(job.applyLink);
    setIsActive(job.isActive);
    setShowModal(true);
  };

  const handleDelete = async (id) => {
    if (confirm("Are you sure you want to delete this job position?")) {
      try {
        const { data } = await axios.delete(`${server}/api/job/${id}`, {
          headers: { token: localStorage.getItem("token") },
        });
        toast.success(data.message);
        fetchJobs();
      } catch (error) {
        toast.error(error.response?.data?.message || "Failed to delete job");
      }
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const payload = { title, department, location, type, description, applyLink, isActive };
      
      if (jobId) {
        // Update
        const { data } = await axios.put(`${server}/api/job/${jobId}`, payload, {
          headers: { token: localStorage.getItem("token") },
        });
        toast.success(data.message);
      } else {
        // Create
        const { data } = await axios.post(`${server}/api/job/new`, payload, {
          headers: { token: localStorage.getItem("token") },
        });
        toast.success(data.message);
      }
      
      fetchJobs();
      resetForm();
    } catch (error) {
      toast.error(error.response?.data?.message || "Operation failed");
    }
  };

  const toggleActive = async (id, currentStatus) => {
     try {
        const { data } = await axios.put(`${server}/api/job/${id}`, { isActive: !currentStatus }, {
          headers: { token: localStorage.getItem("token") },
        });
        toast.success("Status updated");
        fetchJobs();
      } catch (error) {
        toast.error(error.response?.data?.message || "Failed to update status");
      }
  };

  return (
    <Layout>
      <div className="admin-careers-container">
        <div className="careers-header-row">
          <h2>Manage Open Positions</h2>
          <button className="careers-add-job-btn" onClick={openCreateModal}>
            + Add New Position
          </button>
        </div>

        {loading ? (
          <p className="careers-jobs-loading">Loading jobs...</p>
        ) : (
          <div className="careers-table-wrap">
            <table className="jobs-table">
              <thead>
                <tr>
                  <th>Title</th>
                  <th>Department</th>
                  <th>Location</th>
                  <th>Type</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {jobs.map((job) => (
                  <tr key={job._id}>
                    <td>{job.title}</td>
                    <td>{job.department}</td>
                    <td>{job.location}</td>
                    <td>{job.type}</td>
                    <td>
                      <button 
                        className={`status-badge ${job.isActive ? "active" : "inactive"}`}
                        onClick={() => toggleActive(job._id, job.isActive)}
                      >
                        {job.isActive ? "Active" : "Closed"}
                      </button>
                    </td>
                    <td className="careers-actions-cell">
                      <button className="edit-btn" onClick={() => handleEdit(job)}>Edit</button>
                      <button className="delete-btn" onClick={() => handleDelete(job._id)}>Delete</button>
                    </td>
                  </tr>
                ))}
                {jobs.length === 0 && (
                  <tr>
                    <td colSpan="6" className="careers-empty-cell">No positions found.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}

        {showModal && typeof document !== "undefined"
          ? createPortal(
              <div className="job-modal-overlay" onMouseDown={(e) => e.target === e.currentTarget && resetForm()}>
                <div className="job-modal-content" role="dialog" aria-modal="true" aria-labelledby="career-modal-title">
                  <div className="careers-modal-head">
                    <div>
                      <h3 id="career-modal-title">{jobId ? "Edit Position" : "Add New Position"}</h3>
                      <p>{jobId ? "Update job details and visibility settings." : "Create a new opening visible on the Careers page."}</p>
                    </div>
                    <button type="button" className="careers-modal-close" onClick={resetForm} aria-label="Close position form">
                      &times;
                    </button>
                  </div>

                  <form onSubmit={handleSubmit} className="careers-job-form">
                    <div className="careers-modal-body" ref={modalBodyRef}>
                      <section className="careers-form-section">
                        <h4 className="careers-section-title">
                          <FiBriefcase />
                          <span>Position Details</span>
                        </h4>
                        <div className="careers-form-group">
                          <label>Job Title</label>
                          <input type="text" value={title} onChange={(e) => setTitle(e.target.value)} required />
                        </div>
                        <div className="careers-form-row">
                          <div className="careers-form-group">
                            <label>Department</label>
                            <input type="text" value={department} onChange={(e) => setDepartment(e.target.value)} required />
                          </div>
                          <div className="careers-form-group">
                            <label>Location</label>
                            <input type="text" value={location} onChange={(e) => setLocation(e.target.value)} required />
                          </div>
                        </div>
                        <div className="careers-form-row">
                          <div className="careers-form-group">
                            <label>Type</label>
                            <select value={type} onChange={(e) => setType(e.target.value)}>
                              <option value="Full-Time">Full-Time</option>
                              <option value="Part-Time">Part-Time</option>
                              <option value="Contract">Contract</option>
                              <option value="Internship">Internship</option>
                            </select>
                          </div>
                        </div>
                        <div className="careers-form-group">
                          <label>Description</label>
                          <textarea rows="5" value={description} onChange={(e) => setDescription(e.target.value)} required />
                        </div>
                      </section>

                      <section className="careers-form-section">
                        <h4 className="careers-section-title">
                          <FiSettings />
                          <span>Publishing</span>
                        </h4>
                        <div className="careers-form-row">
                          <div className="careers-form-group">
                            <label>Status</label>
                            <select value={isActive} onChange={(e) => setIsActive(e.target.value === "true")}>
                              <option value="true">Active (Visible)</option>
                              <option value="false">Closed (Hidden)</option>
                            </select>
                          </div>
                        </div>
                        <div className="careers-form-group">
                          <label>Apply Link</label>
                          <input type="url" value={applyLink} onChange={(e) => setApplyLink(e.target.value)} required placeholder="e.g. https://forms.gle/... or Workable link" />
                        </div>
                      </section>
                    </div>
                    <div className="careers-modal-actions">
                      <button type="button" className="careers-cancel-btn" onClick={resetForm}>Cancel</button>
                      <button type="submit" className="careers-submit-btn">{jobId ? "Update Position" : "Create Position"}</button>
                    </div>
                  </form>
                </div>
              </div>,
              document.body
            )
          : null}
      </div>
    </Layout>
  );
};

export default AdminCareers;
