import React, { useEffect, useState } from "react";
import "./users.css";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import API from "../../utils/api.js";
const server = API.defaults.baseURL;
import Layout from "../Utils/Layout";
import toast from "react-hot-toast";
import { AiOutlineDownload, AiOutlineClose } from "react-icons/ai";

const AdminUsers = ({ user }) => {
  const navigate = useNavigate();

  if (user && user.mainrole !== "superadmin") return navigate("/");

  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [q, setQ] = useState("");
  const [roleFilter, setRoleFilter] = useState("all");
  const [page, setPage] = useState(1);
  const [limit] = useState(20);
  const [pagination, setPagination] = useState({
    page: 1,
    totalPages: 1,
    totalUsers: 0,
  });
  const [selectedUserIds, setSelectedUserIds] = useState([]);
  const [showExportModal, setShowExportModal] = useState(false);
  const [courses, setCourses] = useState([]);
  const [exportFilters, setExportFilters] = useState({ 
    role: "all", 
    dateRange: "all",
    courseId: "",
    hasTested: false,
    hasReviewed: false
  });

  async function fetchUsers() {
    setLoading(true);
    try {
      const { data } = await axios.get(`${server}/api/users`, {
        params: { q, role: roleFilter, page, limit },
        headers: {
          token: localStorage.getItem("token"),
        },
      });

      setUsers(data.users || []);
      setPagination(
        data.pagination || {
          page: 1,
          totalPages: 1,
          totalUsers: 0,
        }
      );
      setSelectedUserIds([]);
    } catch (error) {
      console.log(error);
      toast.error("Failed to load users");
    } finally {
      setLoading(false);
    }
  }

  async function fetchCourses() {
    try {
      const { data } = await axios.get(`${server}/api/course/all`);
      setCourses(data.courses || []);
    } catch (error) {
      console.log("Failed to load course list for filter", error);
    }
  }

  useEffect(() => {
    fetchUsers();
    fetchCourses();
  }, [q, roleFilter, page, limit]);

  const updateRole = async (id, currentRole) => {
    const nextRole = currentRole === "admin" ? "user" : "admin";
    if (confirm("are you sure you want to update this user role")) {
      try {
        const { data } = await axios.put(
          `${server}/api/user/${id}`,
          { role: nextRole },
          {
            headers: {
              token: localStorage.getItem("token"),
            },
          }
        );

        toast.success(data.message);
        fetchUsers();
      } catch (error) {
        toast.error(error.response.data.message);
      }
    }
  };

  const toggleSelectUser = (id) => {
    setSelectedUserIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  };

  const toggleSelectAllCurrentPage = () => {
    const currentPageIds = users.map((u) => u._id);
    const allSelected =
      currentPageIds.length > 0 &&
      currentPageIds.every((id) => selectedUserIds.includes(id));

    if (allSelected) {
      setSelectedUserIds((prev) =>
        prev.filter((id) => !currentPageIds.includes(id))
      );
      return;
    }

    setSelectedUserIds((prev) => Array.from(new Set([...prev, ...currentPageIds])));
  };

  const bulkUpdateRoles = async (role) => {
    if (!selectedUserIds.length) return;
    if (
      !confirm(
        `Update ${selectedUserIds.length} selected users to ${role}?`
      )
    )
      return;

    try {
      const { data } = await axios.put(
        `${server}/api/users/roles`,
        { userIds: selectedUserIds, role },
        {
          headers: {
            token: localStorage.getItem("token"),
          },
        }
      );
      toast.success(data.message);
      fetchUsers();
    } catch (error) {
      toast.error(error?.response?.data?.message || "Bulk update failed");
    }
  };

  const handleExportCSV = async () => {
    try {
      const params = { 
        role: exportFilters.role, 
        dateRange: exportFilters.dateRange,
        courseId: exportFilters.courseId,
        hasTested: exportFilters.hasTested,
        hasReviewed: exportFilters.hasReviewed
      };
      const response = await axios.get(`${server}/api/users/export`, {
        params,
        headers: { token: localStorage.getItem("token") },
        responseType: "blob", // Tell Axios to handle the binary file download
      });

      // Create a blob from the response and trigger browser download
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement("a");
      link.href = url;
      link.setAttribute("download", `users_export_${new Date().getTime()}.csv`);
      document.body.appendChild(link);
      link.click();
      
      // Cleanup
      link.parentNode.removeChild(link);
      window.URL.revokeObjectURL(url);
      
      toast.success("CSV file downloaded successfully!");
      setShowExportModal(false);
    } catch (error) {
      if (error.response && error.response.data) {
        if (error.response.data instanceof Blob) {
          error.response.data.text().then(text => {
            try {
              const errData = JSON.parse(text);
              toast.error(errData.message || "Failed to export users data");
            } catch {
              toast.error("Failed to export users data");
            }
          });
          return;
        } else if (error.response.data.message) {
          toast.error(error.response.data.message);
          return;
        }
      }
      toast.error("Failed to export users data");
    }
  };

  const allCurrentPageSelected =
    users.length > 0 && users.every((u) => selectedUserIds.includes(u._id));

  return (
    <Layout>
      <div className="users">
        <div className="users-header">
          <div>
            <h1>All Users</h1>
            <p>Manage platform roles and admin access.</p>
          </div>
          <button className="common-btn export-btn" onClick={() => setShowExportModal(true)}>
            <AiOutlineDownload size={20} /> Export CSV
          </button>
        </div>
        <div className="users-toolbar">
          <input
            type="text"
            placeholder="Search by name or email..."
            value={q}
            onChange={(e) => {
              setPage(1);
              setQ(e.target.value);
            }}
          />
          <select
            value={roleFilter}
            onChange={(e) => {
              setPage(1);
              setRoleFilter(e.target.value);
            }}
          >
            <option value="all">All roles</option>
            <option value="user">Users only</option>
            <option value="admin">Admins only</option>
          </select>
        </div>
        <div className="users-bulk-actions">
          <span>{selectedUserIds.length} selected</span>
          <button
            className="common-btn users-action-btn"
            onClick={() => bulkUpdateRoles("admin")}
            disabled={!selectedUserIds.length}
          >
            Make Admin
          </button>
          <button
            className="common-btn users-action-btn"
            onClick={() => bulkUpdateRoles("user")}
            disabled={!selectedUserIds.length}
          >
            Make User
          </button>
        </div>
        <div className="users-table-wrap">
          <table>
            <thead>
              <tr>
                <th>
                  <input
                    type="checkbox"
                    checked={allCurrentPageSelected}
                    onChange={toggleSelectAllCurrentPage}
                  />
                </th>
                <th>#</th>
                <th>Name</th>
                <th>Email</th>
                <th>Role</th>
                <th>Update Role</th>
              </tr>
            </thead>
            <tbody>
              {users &&
                users.map((e, i) => (
                  <tr key={e._id}>
                    <td>
                      <input
                        type="checkbox"
                        checked={selectedUserIds.includes(e._id)}
                        onChange={() => toggleSelectUser(e._id)}
                      />
                    </td>
                    <td>{(pagination.page - 1) * limit + i + 1}</td>
                    <td>{e.name}</td>
                    <td>{e.email}</td>
                    <td>{e.role}</td>
                    <td>
                      <button
                        onClick={() => updateRole(e._id, e.role)}
                        className="common-btn users-action-btn"
                      >
                        {e.role === "admin" ? "Make User" : "Make Admin"}
                      </button>
                    </td>
                  </tr>
                ))}
              {!loading && users.length === 0 && (
                <tr>
                  <td colSpan={7}>No users found</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
        <div className="users-pagination">
          <span>Total: {pagination.totalUsers}</span>
          <div className="users-pagination-actions">
            <button
              className="common-btn users-action-btn"
              disabled={page <= 1}
              onClick={() => setPage((prev) => Math.max(1, prev - 1))}
            >
              Prev
            </button>
            <span>
              Page {pagination.page} / {pagination.totalPages}
            </span>
            <button
              className="common-btn users-action-btn"
              disabled={page >= pagination.totalPages}
              onClick={() =>
                setPage((prev) => Math.min(pagination.totalPages, prev + 1))
              }
            >
              Next
            </button>
          </div>
        </div>
      </div>

      {showExportModal && (
        <div className="modal-overlay">
          <div className="export-modal animation-scale-in">
            <div className="modal-header">
              <h2>Export Users Data</h2>
              <button className="close-btn" onClick={() => setShowExportModal(false)}>
                <AiOutlineClose />
              </button>
            </div>
            
            <div className="modal-body">
              <div className="input-group">
                <label>Filter by Role</label>
                <select 
                  value={exportFilters.role} 
                  onChange={(e) => setExportFilters({ ...exportFilters, role: e.target.value })}
                >
                  <option value="all">All Roles</option>
                  <option value="user">Users / Students Only</option>
                  <option value="admin">Admins Only</option>
                </select>
              </div>

              <div className="input-group">
                <label>Filter by Joined Date</label>
                <select 
                  value={exportFilters.dateRange} 
                  onChange={(e) => setExportFilters({ ...exportFilters, dateRange: e.target.value })}
                >
                  <option value="all">All Time</option>
                  <option value="7">Last 7 Days</option>
                  <option value="30">Last 30 Days</option>
                  <option value="90">Last 90 Days</option>
                </select>
              </div>

              <div className="input-group">
                <label>Filter by Course Purchase</label>
                <select 
                  value={exportFilters.courseId} 
                  onChange={(e) => setExportFilters({ ...exportFilters, courseId: e.target.value })}
                >
                  <option value="">Any Course / Skip</option>
                  {courses.map(course => (
                    <option key={course._id} value={course._id}>{course.title}</option>
                  ))}
                </select>
              </div>

              <div className="export-checkbox-group">
                <label className="custom-checkbox-label">
                  <input 
                    type="checkbox" 
                    checked={exportFilters.hasTested}
                    onChange={(e) => setExportFilters({ ...exportFilters, hasTested: e.target.checked })}
                  />
                  <span>Has Attempted AI Tests</span>
                </label>
                
                <label className="custom-checkbox-label">
                  <input 
                    type="checkbox" 
                    checked={exportFilters.hasReviewed}
                    onChange={(e) => setExportFilters({ ...exportFilters, hasReviewed: e.target.checked })}
                  />
                  <span>Has Shared a Testimonial/Review</span>
                </label>
              </div>

              <p className="export-note">
                This will generate a CSV file compatible with Google Sheets and MS Excel containing name, email, role, and joined date.
              </p>
            </div>

            <div className="modal-actions">
              <button className="cancel-btn" onClick={() => setShowExportModal(false)}>Cancel</button>
              <button className="common-btn" onClick={handleExportCSV}>Download CSV</button>
            </div>
          </div>
        </div>
      )}
    </Layout>
  );
};

export default AdminUsers;

