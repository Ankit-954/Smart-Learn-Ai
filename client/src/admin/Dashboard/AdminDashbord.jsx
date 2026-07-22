import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import Layout from "../Utils/Layout";
import axios from "axios";
import API from "../../utils/api.js";
const server = API.defaults.baseURL;
import "./dashboard.css";

const AdminDashbord = ({ user }) => {
  const navigate = useNavigate();

  if (user && user.role !== "admin") return navigate("/");

  const [stats, setStats] = useState([]);

  async function fetchStats() {
    try {
      const { data } = await axios.get(`${server}/api/stats`, {
        headers: {
          token: localStorage.getItem("token"),
        },
      });

      setStats(data.stats);
    } catch (error) {
      console.log(error);
    }
  }

  useEffect(() => {
    fetchStats();
  }, []);
  return (
    <Layout>
      <div className="admin-dashboard">
        <div className="admin-dashboard-header">
          <h1>Admin Overview</h1>
          <p>Track platform growth and learning activity in one place.</p>
        </div>

        <div className="stats-grid">
          <div className="stat-card">
            <p className="stat-label">Total Courses</p>
            <p className="stat-value">{stats.totalCoures || 0}</p>
          </div>
          <div className="stat-card">
            <p className="stat-label">Total Lectures</p>
            <p className="stat-value">{stats.totalLectures || 0}</p>
          </div>
          <div className="stat-card">
            <p className="stat-label">Total Users</p>
            <p className="stat-value">{stats.totalUsers || 0}</p>
          </div>
        </div>
      </div>
    </Layout>
  );
};

export default AdminDashbord;
