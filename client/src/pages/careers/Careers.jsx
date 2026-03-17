import React, { useState, useEffect } from "react";
import "./careers.css";
import { AiOutlineTeam, AiOutlineTrophy, AiOutlineRocket } from "react-icons/ai";
import axios from "axios";
import { server } from "../../main";
import { usePageSeo } from "../../utils/usePageSeo";

const Careers = () => {
  const [jobs, setJobs] = useState([]);
  const [loading, setLoading] = useState(true);

  usePageSeo({
    title: "Careers",
    description: "Explore open roles at SmartLearn AI and join the team shaping AI-powered learning experiences.",
    canonicalPath: "/careers",
  });

  useEffect(() => {
    const fetchActiveJobs = async () => {
      try {
        const { data } = await axios.get(`${server}/api/public/jobs`);
        setJobs(data.jobs);
      } catch (error) {
        console.error("Failed to fetch jobs:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchActiveJobs();
  }, []);
  return (
    <div className="careers-page">
      <div className="careers-hero anim-fade-up">
        <span className="careers-kicker">Join Our Mission</span>
        <h1>Shape the Future of Learning</h1>
        <p>At SmartLearn AI, we're building the most advanced, personalized education platform in the world. Come build it with us.</p>
        <button className="common-btn mt-4">View Open Roles</button>
      </div>

      <div className="careers-values anim-scale-in">
        <div className="value-card">
          <div className="value-icon"><AiOutlineTeam /></div>
          <h3>Collaborative Culture</h3>
          <p>We believe the best ideas come from diverse teams working together without ego.</p>
        </div>
        <div className="value-card">
          <div className="value-icon"><AiOutlineRocket /></div>
          <h3>Move Fast & Learn</h3>
          <p>We iterate quickly, embrace failure as a learning opportunity, and ship impactful features every week.</p>
        </div>
        <div className="value-card">
          <div className="value-icon"><AiOutlineTrophy /></div>
          <h3>Impact Driven</h3>
          <p>Every line of code you write directly helps thousands of students achieve their career dreams.</p>
        </div>
      </div>

      <div className="open-roles anim-fade-up">
        <h2>Open Positions</h2>
        <p className="roles-desc">Looking to make an impact? We're always looking for talented individuals to join our team.</p>
        
        <div className="roles-list">
          {loading ? (
            <p style={{ textAlign: "center", color: "var(--text-secondary)" }}>Loading open positions...</p>
          ) : jobs.length === 0 ? (
            <p style={{ textAlign: "center", color: "var(--text-secondary)" }}>No open positions currently available. Please check back later.</p>
          ) : (
            jobs.map((job) => (
              <div key={job._id} className="role-card">
                <div className="role-info">
                  <h3>{job.title}</h3>
                  <div className="role-meta">
                    <span className="role-dept">{job.department}</span>
                    <span className="role-bullet">•</span>
                    <span>{job.location}</span>
                    <span className="role-bullet">•</span>
                    <span>{job.type}</span>
                  </div>
                  {job.description && (
                    <p className="role-desc-text">{job.description}</p>
                  )}
                </div>
                {job.applyLink ? (
                  <a href={job.applyLink} target="_blank" rel="noopener noreferrer">
                    <button className="apply-btn">Apply Now</button>
                  </a>
                ) : (
                  <button className="apply-btn" disabled>Apply Now</button>
                )}
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};

export default Careers;
