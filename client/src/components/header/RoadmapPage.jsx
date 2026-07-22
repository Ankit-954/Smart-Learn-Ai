import React, { useEffect, useMemo, useState } from "react";
import { useParams } from "react-router-dom";
import axios from "axios";
import { FaChevronDown, FaChevronUp, FaBookOpen, FaCode, FaExclamationTriangle, FaCheckCircle } from "react-icons/fa";
import "./roadmap.css";
import API from "../../utils/api.js";
const server = API.defaults.baseURL;
import CourseCard from "../coursecard/CourseCard";

const renderSafeText = (value) => {
  if (value === null || value === undefined) return "";
  if (typeof value === "string" || typeof value === "number" || typeof value === "boolean") {
    return String(value);
  }
  if (typeof value === "object") {
    const title = typeof value.title === "string" ? value.title : "";
    const description = typeof value.description === "string" ? value.description : "";
    const link = typeof value.link === "string" ? value.link : "";
    if (title && description) return `${title}: ${description}`;
    return title || description || link || "";
  }
  return "";
};

const RoadmapPage = () => {
  const { roadmapName } = useParams();
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [roadmap, setRoadmap] = useState(null);
  const [recommendedCourses, setRecommendedCourses] = useState([]);
  const [expandedPhase, setExpandedPhase] = useState(0); // Accordion state

  const topic = useMemo(() => decodeURIComponent(roadmapName || "").trim(), [roadmapName]);

  useEffect(() => {
    let active = true;
    const loadData = async () => {
      setLoading(true);
      setLoadError("");
      try {
        const { data } = await axios.get(`${server}/api/roadmap/generate`, {
          params: { topic },
        });
        if (!active) return;
        setRoadmap(data.roadmap || null);
        setRecommendedCourses(
          Array.isArray(data.recommendedCourses) ? data.recommendedCourses : []
        );
      } catch (error) {
        if (!active) return;
        setLoadError(error?.response?.data?.message || "Failed to generate roadmap.");
      } finally {
        if (active) setLoading(false);
      }
    };

    if (topic.length >= 2) {
      loadData();
    } else {
      setLoading(false);
      setLoadError("Please provide a valid topic.");
    }

    return () => {
      active = false;
    };
  }, [topic]);

  return (
    <div className="roadmap-page">
      <div className="roadmap-hero">
        <h2>{roadmap?.topic || topic} Roadmap</h2>
        <p>
          {roadmap?.summary ||
            "AI-generated learning path with detailed weekly phases and platform recommendations."}
        </p>
        <div className="roadmap-hero-meta">
          <span>Total Duration: {roadmap?.totalDurationWeeks || 0} weeks</span>
        </div>
      </div>

      {loading && <p className="roadmap-loading">Generating roadmap...</p>}
      {loadError && !loading && <p className="roadmap-error">{loadError}</p>}

      {!loading && roadmap && (
        <div id="roadmap-content" className="roadmap-content">
          <section className="roadmap-kpi-grid">
            <article className="roadmap-kpi-card">
              <span>Total Weeks</span>
              <strong>{roadmap.totalDurationWeeks || 0}</strong>
            </article>
            <article className="roadmap-kpi-card">
              <span>Phases</span>
              <strong>{Array.isArray(roadmap.phases) ? roadmap.phases.length : 0}</strong>
            </article>
            <article className="roadmap-kpi-card">
              <span>Recommended Courses</span>
              <strong>{recommendedCourses.length}</strong>
            </article>
          </section>

          <section className="roadmap-timeline-section">
            <h3>Learning Curriculum (Week-wise)</h3>
            <div className="roadmap-timeline">
              {(roadmap.phases || []).map((phase, idx) => {
                const isExpanded = expandedPhase === idx;

                return (
                  <article 
                    key={`${phase.title}-${idx}`} 
                    className={`timeline-node ${isExpanded ? "expanded" : ""}`}
                  >
                    {/* The glowing circle on the left timeline line */}
                    <div className="timeline-marker">{idx + 1}</div>

                    <div className="timeline-content">
                      {/* Accordion Header */}
                      <div 
                        className="timeline-header" 
                        onClick={() => setExpandedPhase(isExpanded ? null : idx)}
                      >
                        <div className="timeline-header-info">
                          <h4>{phase.title}</h4>
                          <span className="timeline-week-pill">
                            Week {phase.weekStart || 1}-{phase.weekEnd || phase.durationWeeks || 1}
                          </span>
                        </div>
                        <button className="accordion-btn">
                          {isExpanded ? <FaChevronUp /> : <FaChevronDown />}
                        </button>
                      </div>

                      {/* Accordion Body (Deep Context) */}
                      {isExpanded && (
                        <div className="timeline-body transition-reveal">
                          {phase.phaseDescription && (
                            <p className="phase-description">{phase.phaseDescription}</p>
                          )}

                          {/* Deep Topics */}
                          {(phase.topics || []).length > 0 && (
                            <div className="phase-struct-block">
                              <h5><FaBookOpen className="icon-blue" /> Core Topics</h5>
                              <ul className="struct-list">
                                {phase.topics.map((t, i) => {
                                  if (typeof t === "string") return <li key={`t-${i}`}><p>{t}</p></li>;
                                  return (
                                    <li key={`t-${i}`}>
                                      <strong>{t.name}</strong> 
                                      {t.importance && <span className="importance-badge">{t.importance}</span>}
                                      {t.details && <p>{t.details}</p>}
                                    </li>
                                  );
                                })}
                              </ul>
                            </div>
                          )}

                          {/* Hands-on Projects */}
                          {(phase.projects || []).length > 0 && (
                            <div className="phase-struct-block">
                              <h5><FaCode className="icon-purple" /> Hands-on Projects</h5>
                              <div className="project-grid">
                                {phase.projects.map((p, i) => {
                                  if (typeof p === "string") {
                                    return (
                                      <div className="advanced-project-card" key={`p-${i}`}>
                                        <h6>Project {i + 1}</h6>
                                        <p>{p}</p>
                                      </div>
                                    );
                                  }
                                  return (
                                    <div className="advanced-project-card" key={`p-${i}`}>
                                      {p.name && <h6>{p.name}</h6>}
                                      {p.explanation && <p>{p.explanation}</p>}
                                      {(p.techStack && p.techStack.length > 0) && (
                                        <div className="tech-stack-row">
                                          {p.techStack.map((tech, ti) => (
                                            <span key={`tech-${ti}`}>{tech}</span>
                                          ))}
                                        </div>
                                      )}
                                    </div>
                                  );
                                })}
                              </div>
                            </div>
                          )}

                          {/* Common Pitfalls */}
                          {(phase.commonPitfalls || []).length > 0 && (
                            <div className="phase-struct-block">
                              <h5><FaExclamationTriangle className="icon-orange" /> Common Pitfalls</h5>
                              <ul className="pitfall-list">
                                {phase.commonPitfalls.map((pitfall, i) => (
                                  <li key={`pit-${i}`}>{typeof pitfall === 'string' ? pitfall : renderSafeText(pitfall)}</li>
                                ))}
                              </ul>
                            </div>
                          )}

                          {/* Checkpoints */}
                          {(phase.checkpoints || []).length > 0 && (
                            <div className="phase-struct-block">
                              <h5><FaCheckCircle className="icon-green" /> Validation Checkpoints</h5>
                              <div className="checkpoint-chips">
                                {phase.checkpoints.map((cp, i) => (
                                  <span key={`cp-${i}`} className="checkpoint-chip">
                                    {typeof cp === 'string' ? cp : renderSafeText(cp)}
                                  </span>
                                ))}
                              </div>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  </article>
                );
              })}
            </div>
          </section>

          {(roadmap.learningTips || []).length > 0 && (
            <section className="roadmap-section">
              <h3>Execution Tips</h3>
              <div className="phase-chip-list phase-chip-list-accent">
                {roadmap.learningTips.map((tip, idx) => (
                  <span key={`${renderSafeText(tip)}-${idx}`}>{renderSafeText(tip)}</span>
                ))}
              </div>
            </section>
          )}

          <section className="roadmap-section">
            <h3>Recommended Courses On SmartLearn</h3>
            <div className="recommended-courses-cards">
              {recommendedCourses.length > 0 ? (
                recommendedCourses.map((course) => (
                  <CourseCard key={course._id} course={course} />
                ))
              ) : (
                <p>No matching platform courses found for this topic yet.</p>
              )}
            </div>
          </section>
        </div>
      )}
    </div>
  );
};

export default RoadmapPage;
