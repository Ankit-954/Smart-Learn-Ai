import React, { useState, useEffect } from "react";
import axios from "axios";
import API from "../../utils/api.js";
const server = API.defaults.baseURL;
import { AiOutlineLoading3Quarters } from "react-icons/ai";
import * as Icons from "react-icons/fa"; // Import all FontAwesome icons for dynamic rendering
import "./about.css";
import { usePageSeo } from "../../utils/usePageSeo";

const About = () => {
  const [aboutData, setAboutData] = useState(null);
  const [loading, setLoading] = useState(true);

  usePageSeo({
    title: "About",
    description: "Learn about SmartLearn AI, our mission, our learning approach, and the team building practical AI-powered education.",
    canonicalPath: "/about",
  });

  useEffect(() => {
    fetchAboutData();
  }, []);

  const fetchAboutData = async () => {
    try {
      const { data } = await axios.get(`${server}/api/public/about`);
      if (data.success && data.data) {
        setAboutData(data.data);
      }
    } catch (error) {
      console.error("Failed to fetch about data", error);
    } finally {
      setLoading(false);
    }
  };

  // Helper function to dynamically render icons from string names
  const renderIcon = (iconName) => {
    const IconComponent = Icons[iconName] || Icons["FaStar"]; // Fallback to a star
    return <IconComponent />;
  };

  const resolveImage = (src) => {
    if (!src) return "";
    if (/^https?:\/\//i.test(src)) return src;
    return `${server}/${src}`;
  };

  if (loading) {
    return (
      <div className="about-loading">
        <AiOutlineLoading3Quarters className="spinner" size={50} />
      </div>
    );
  }

  if (!aboutData) {
    return <div className="about-error">Failed to load content. Please try again later.</div>;
  }

  const { hero, mission, vision, features, approach, team, stats } = aboutData;

  return (
    <div className="about-page">
      {/* 1. Hero Section */}
      <section className="about-hero">
        <div className="hero-content animation-fade-up">
          <h1>{hero?.title || "About SmartLearn AI"}</h1>
          <p className="hero-intro">{hero?.intro}</p>
          {hero?.tagline && <div className="hero-tagline glass-box">{hero.tagline}</div>}
        </div>
        {hero?.bannerImage && (
          <div className="hero-image-wrapper animation-scale-in">
            <img src={resolveImage(hero.bannerImage)} alt="Hero Banner" className="hero-banner" />
          </div>
        )}
      </section>

      {/* 2. Statistics Section */}
      {stats && stats.length > 0 && (
        <section className="about-stats animation-fade-up">
          <div className="stats-grid">
            {stats.map((stat, idx) => (
              <div key={stat.id || idx} className="stat-card card-3d">
                <div className="stat-icon">{renderIcon(stat.icon)}</div>
                <div className="stat-value">{stat.value}</div>
                <div className="stat-label">{stat.label}</div>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* 3. Mission & Vision Sections */}
      <section className="about-mission-vision">
        {(mission?.text || mission?.image) && (
          <div className="mv-row mission-row animation-slide-left">
            <div className="mv-text">
              <h2>Our Mission</h2>
              <p>{mission.text}</p>
            </div>
            {mission?.image && (
              <div className="mv-img">
                <img src={resolveImage(mission.image)} alt="Our Mission" />
              </div>
            )}
          </div>
        )}

        {(vision?.text || vision?.image) && (
          <div className="mv-row vision-row reverse-row animation-slide-right">
            <div className="mv-text">
              <h2>Our Vision</h2>
              <p>{vision.text}</p>
            </div>
            {vision?.image && (
              <div className="mv-img">
                <img src={resolveImage(vision.image)} alt="Our Vision" />
              </div>
            )}
          </div>
        )}
      </section>

      {/* 4. What We Offer (Features) */}
      {features && features.length > 0 && (
        <section className="about-features">
          <div className="section-header text-center animation-fade-up">
            <h2>What We Offer</h2>
            <p className="subtitle">Discover the tools and resources designed to accelerate your growth.</p>
          </div>
          <div className="features-grid">
            {features.map((feat, idx) => (
              <div key={feat.id || idx} className="feature-card glass-box card-3d animation-fade-up" style={{ animationDelay: `${idx * 0.1}s` }}>
                <div className="feature-icon">{renderIcon(feat.icon)}</div>
                <h3>{feat.title}</h3>
                <p>{feat.description}</p>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* 5. Our Learning Approach */}
      {(approach?.text || approach?.image) && (
        <section className="about-approach animation-fade-up">
          <div className="approach-container glass-box">
            <div className="approach-text">
              <h2>Our Learning Approach</h2>
              <p>{approach.text}</p>
            </div>
            {approach?.image && (
              <div className="approach-img">
                <img src={resolveImage(approach.image)} alt="Learning Approach" />
              </div>
            )}
          </div>
        </section>
      )}

      {/* 6. Our Team */}
      {team && team.length > 0 && (
        <section className="about-team">
          <div className="section-header text-center animation-fade-up">
            <h2>Meet Our Creator & Team</h2>
            <p className="subtitle">The passionate minds behind SmartLearn AI.</p>
          </div>
          <div className="team-grid">
            {team.map((member, idx) => (
              <div key={member.id || idx} className="team-card card-3d animation-fade-up" style={{ animationDelay: `${idx * 0.1}s` }}>
                <div className="team-img-wrapper">
                  {member.image ? (
                    <img src={resolveImage(member.image)} alt={member.name} />
                  ) : (
                    <div className="team-placeholder"><Icons.FaUserAlt /></div>
                  )}
                </div>
                <h3>{member.name}</h3>
                <h4 className="role">{member.role}</h4>
                <p>{member.description}</p>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* 7. Call To Action */}
      <section className="about-cta animation-scale-in">
        <div className="cta-content glass-box">
          <h2>Ready to transform your career?</h2>
          <p>Join thousands of learners mastering new skills with SmartLearn AI.</p>
          <button className="common-btn" onClick={() => window.location.href = '/courses'}>
            Start Your Learning Journey Today
          </button>
        </div>
      </section>

    </div>
  );
};

export default About;
