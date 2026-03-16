import React, { useEffect, useMemo, useState } from "react";
import axios from "axios";
import { Link } from "react-router-dom";
import { server } from "../../main";
import { getTestHistory } from "../../utils/testHistoryCache";
import "./progress.css";

const Progress = ({ user }) => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [courseProgress, setCourseProgress] = useState([]);
  const [testHistory, setTestHistory] = useState([]);
  const [interviewHistory, setInterviewHistory] = useState([]);

  useEffect(() => {
    let active = true;

    const fetchProgress = async () => {
      try {
        const token = localStorage.getItem("token");
        if (!token) throw new Error("Please login to view progress.");

        const tests = await getTestHistory({ token, ttlMs: 60000 });

        const interviewRes = await axios.get(`${server}/api/user/interview-history`, {
          headers: { token },
        });
        const serverInterviews = Array.isArray(interviewRes?.data?.interviews)
          ? interviewRes.data.interviews
          : [];

        const { data } = await axios.get(`${server}/api/mycourse`, {
          headers: { token },
        });

        const courses = Array.isArray(data?.courses) ? data.courses : [];
        const progressRows = await Promise.all(
          courses.map(async (course) => {
            try {
              const progressRes = await axios.get(
                `${server}/api/user/progress?course=${course._id}`,
                { headers: { token } }
              );
              const completed = Number(progressRes?.data?.completedLectures || 0);
              const total = Number(progressRes?.data?.allLectures || 0);
              const percent = total > 0 ? Math.round((completed * 100) / total) : 0;
              return {
                ...course,
                completedLectures: completed,
                totalLectures: total,
                completionPercent: percent,
                remainingPercent: Math.max(0, 100 - percent),
              };
            } catch (err) {
              return {
                ...course,
                completedLectures: 0,
                totalLectures: 0,
                completionPercent: 0,
                remainingPercent: 100,
              };
            }
          })
        );

        if (!active) return;
        setTestHistory(Array.isArray(tests) ? tests : []);
        setInterviewHistory(serverInterviews);
        setCourseProgress(progressRows);
        setError("");
      } catch (err) {
        if (!active) return;
        setError(err.message || "Unable to load your progress.");
      } finally {
        if (!active) return;
        setLoading(false);
      }
    };

    fetchProgress();
    return () => {
      active = false;
    };
  }, []);

  const stats = useMemo(() => {
    const testsAttempted = testHistory.length;
    const testsPassed = testHistory.filter((t) => (Number(t.percentage) || 0) >= 60).length;
    const avgTestScore = testsAttempted
      ? Math.round(
          testHistory.reduce((sum, t) => sum + (Number(t.percentage) || 0), 0) / testsAttempted
        )
      : 0;

    const purchasedCourses = courseProgress.length;
    const averageCourseCompletion = purchasedCourses
      ? Math.round(
          courseProgress.reduce((sum, c) => sum + (Number(c.completionPercent) || 0), 0) /
            purchasedCourses
        )
      : 0;

    const interviewsAttempted = interviewHistory.length;
    const avgInterviewScore = interviewsAttempted
      ? Math.round(
          interviewHistory.reduce((sum, i) => sum + ((Number(i.technical_score) + Number(i.communication_score) + Number(i.confidence_score)) / 30 * 100), 0) / interviewsAttempted
        )
      : 0;

    return {
      testsAttempted,
      testsPassed,
      avgTestScore,
      purchasedCourses,
      averageCourseCompletion,
      interviewsAttempted,
      avgInterviewScore,
    };
  }, [testHistory, courseProgress, interviewHistory]);

  if (loading) {
    return (
      <div className="progress-page">
        <div className="progress-shell">
          <p className="progress-loading">Loading your learning progress...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="progress-page">
        <div className="progress-shell">
          <p className="progress-error">{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="progress-page">
      <div className="progress-shell">
        <div className="progress-hero">
          <p className="progress-kicker">Learner Insights</p>
          <h1>{user?.name ? `${user.name}'s Progress` : "Your Progress Dashboard"}</h1>
          <p>Track tests, purchased courses, and completion in one place.</p>
        </div>

        <div className="progress-metrics">
          <div className="metric-card">
            <p>Tests Attempted</p>
            <h3>{stats.testsAttempted}</h3>
          </div>
          <div className="metric-card">
            <p>Tests Passed (&gt;=60%)</p>
            <h3>{stats.testsPassed}</h3>
          </div>
          <div className="metric-card">
            <p>Average Test Score</p>
            <h3>{stats.avgTestScore}%</h3>
          </div>
          <div className="metric-card">
            <p>Mock Interviews</p>
            <h3>{stats.interviewsAttempted}</h3>
          </div>
          <div className="metric-card">
            <p>Avg Interview Score</p>
            <h3>{stats.avgInterviewScore}%</h3>
          </div>
          <div className="metric-card">
            <p>Purchased Courses</p>
            <h3>{stats.purchasedCourses}</h3>
          </div>
          <div className="metric-card">
            <p>Avg Course Completion</p>
            <h3>{stats.averageCourseCompletion}%</h3>
          </div>
        </div>

        <div className="progress-grid">
          <section id="courses" className="progress-card">
            <div className="progress-card-head">
              <h2>Course Progress</h2>
              <Link to="/courses">Explore Courses</Link>
            </div>
            {courseProgress.length === 0 ? (
              <p className="empty-row">No purchased courses yet.</p>
            ) : (
              <div className="course-list">
                {courseProgress.map((course) => (
                  <div className="course-item" key={course._id}>
                    <div className="course-item-head">
                      <h4>{course.title}</h4>
                      <span>{course.completionPercent}% completed</span>
                    </div>
                    <div className="course-track">
                      <span style={{ width: `${course.completionPercent}%` }}></span>
                    </div>
                    <div className="course-item-meta">
                      <p>
                        Completed: {course.completedLectures}/{course.totalLectures || "-"} lectures
                      </p>
                      <p>Remaining: {course.remainingPercent}%</p>
                    </div>
                    <Link className="course-link" to={`/course/study/${course._id}`}>
                      Continue Course
                    </Link>
                  </div>
                ))}
              </div>
            )}
          </section>

          <section id="tests" className="progress-card">
            <div className="progress-card-head">
              <h2>Recent Test Attempts</h2>
              <Link to="/test">Take New Test</Link>
            </div>
            {testHistory.length === 0 ? (
              <p className="empty-row">No tests attempted yet.</p>
            ) : (
              <div className="test-list">
                {[...testHistory].reverse().slice(0, 8).map((attempt) => (
                  <div
                    className="test-item"
                    key={
                      attempt.id ||
                      `${attempt.domain}-${attempt.completedAt || ""}-${attempt.score}-${attempt.totalQuestions}`
                    }
                  >
                    <div>
                      <h4>{attempt.domain}</h4>
                      <p>{new Date(attempt.completedAt).toLocaleString()}</p>
                    </div>
                    <div className="test-score">
                      <strong>{attempt.score}/{attempt.totalQuestions}</strong>
                      <span>{attempt.percentage}%</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>

          <section id="interviews" className="progress-card">
            <div className="progress-card-head">
              <h2>Recent Mock Interviews</h2>
              <Link to="/interview">Start Interview</Link>
            </div>
            {interviewHistory.length === 0 ? (
              <p className="empty-row">No mock interviews completed yet.</p>
            ) : (
              <div className="test-list">
                {interviewHistory.slice(0, 8).map((interview) => {
                  const avg = Math.round((Number(interview.technical_score) + Number(interview.communication_score) + Number(interview.confidence_score)) / 3 * 10);
                  return (
                    <div className="test-item" key={interview._id}>
                      <div>
                        <h4>{interview.topic || "AI Interview"}</h4>
                        <p>{new Date(interview.createdAt).toLocaleString()}</p>
                      </div>
                      <div className="test-score">
                        <strong>{Math.round(avg / 10)}/10</strong>
                        <span>{avg}%</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </section>
        </div>
      </div>
    </div>
  );
};

export default Progress;
