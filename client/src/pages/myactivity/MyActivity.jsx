import React, { useEffect, useMemo, useState } from "react";
import axios from "axios";
import { Link } from "react-router-dom";
import { CourseData } from "../../context/CourseContext";
import { UserData } from "../../context/UserContext";
import { server } from "../../main";
import { getTestHistory } from "../../utils/testHistoryCache";
import CourseCard from "../../components/coursecard/CourseCard";
import "./myActivity.css";

const MyActivity = () => {
  const { mycourse, fetchMyCourse } = CourseData();
  const { isAuth } = UserData();
  const [testHistory, setTestHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;

    const loadActivity = async () => {
      setLoading(true);
      setError("");
      try {
        const token = localStorage.getItem("token");
        if (!token) throw new Error("Please login to view your activity.");

        const tests = await getTestHistory({ token, ttlMs: 60000 });
        if (active) {
          setTestHistory(Array.isArray(tests) ? tests : []);
        }

        if (typeof fetchMyCourse === "function") {
          await fetchMyCourse();
        }
      } catch (err) {
        if (!active) return;
        setError(err?.response?.data?.message || err.message || "Unable to load activity.");
      } finally {
        if (!active) return;
        setLoading(false);
      }
    };

    if (isAuth) {
      loadActivity();
    } else {
      setLoading(false);
      setError("Please login to view your activity.");
    }

    return () => {
      active = false;
    };
  }, [isAuth, fetchMyCourse]);

  const stats = useMemo(() => {
    const testsAttempted = testHistory.length;
    const testsPassed = testHistory.filter((t) => (Number(t.percentage) || 0) >= 60).length;
    const avgTestScore = testsAttempted
      ? Math.round(
          testHistory.reduce((sum, t) => sum + (Number(t.percentage) || 0), 0) / testsAttempted
        )
      : 0;
    const enrolledCourses = Array.isArray(mycourse) ? mycourse.length : 0;

    return {
      testsAttempted,
      testsPassed,
      avgTestScore,
      enrolledCourses,
    };
  }, [testHistory, mycourse]);

  if (loading) {
    return (
      <div className="my-activity-page">
        <div className="my-activity-shell">
          <p className="my-activity-loading">Loading your activity...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="my-activity-page">
        <div className="my-activity-shell">
          <p className="my-activity-error">{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="my-activity-page">
      <div className="my-activity-shell">
        <div className="my-activity-hero">
          <p className="my-activity-kicker">My Learning Hub</p>
          <h1>Tests and Enrolled Courses</h1>
          <p>One page to track your attempts and continue your courses.</p>
        </div>

        <div className="my-activity-metrics">
          <div className="my-activity-metric">
            <span>Tests Attempted</span>
            <strong>{stats.testsAttempted}</strong>
          </div>
          <div className="my-activity-metric">
            <span>Tests Passed</span>
            <strong>{stats.testsPassed}</strong>
          </div>
          <div className="my-activity-metric">
            <span>Average Test Score</span>
            <strong>{stats.avgTestScore}%</strong>
          </div>
          <div className="my-activity-metric">
            <span>Enrolled Courses</span>
            <strong>{stats.enrolledCourses}</strong>
          </div>
        </div>

        <div className="my-activity-grid">
          <section id="tests" className="my-activity-card">
            <div className="my-activity-card-head">
              <h2>Test Attempts</h2>
              <Link to="/test">Take New Test</Link>
            </div>
            {testHistory.length === 0 ? (
              <p className="my-activity-empty">No tests attempted yet.</p>
            ) : (
              <div className="my-activity-test-list">
                {[...testHistory].reverse().slice(0, 12).map((attempt) => (
                  <div
                    className="my-activity-test-item"
                    key={
                      attempt.id ||
                      `${attempt.domain}-${attempt.completedAt || ""}-${attempt.score}-${attempt.totalQuestions}`
                    }
                  >
                    <div>
                      <h4>{attempt.domain || "Test"}</h4>
                      <p>{attempt.completedAt ? new Date(attempt.completedAt).toLocaleString() : ""}</p>
                    </div>
                    <div className="my-activity-test-score">
                      <strong>{attempt.score}/{attempt.totalQuestions}</strong>
                      <span>{attempt.percentage}%</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>

          <section id="courses" className="my-activity-card">
            <div className="my-activity-card-head">
              <h2>Enrolled Courses</h2>
              <Link to="/courses">Explore Courses</Link>
            </div>
            {Array.isArray(mycourse) && mycourse.length > 0 ? (
              <div className="my-activity-course-grid">
                {mycourse.map((course) => (
                  <CourseCard key={course._id} course={course} />
                ))}
              </div>
            ) : (
              <p className="my-activity-empty">No courses enrolled yet.</p>
            )}
          </section>
        </div>
      </div>
    </div>
  );
};

export default MyActivity;
