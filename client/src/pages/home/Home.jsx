import React, { useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import "./home.css";
import Testimonials from "../../components/testimonials/Testimonials";
import AOS from "aos";
import "aos/dist/aos.css";
import ChatbotWidget from "../../components/chatbot/ChatbotWidget";
import { CourseData } from "../../context/CourseContext";
import CourseCard from "../../components/coursecard/CourseCard";
import { FaArrowRightLong } from "react-icons/fa6";
import { usePageSeo } from "../../utils/usePageSeo";

const Home = () => {
  const navigate = useNavigate();
  const { courses } = CourseData();

  usePageSeo({
    title: "AI Learning Platform",
    description: "SmartLearn AI offers career-focused courses, AI mock interviews, domain tests, roadmaps, and guided learning for modern tech skills.",
    canonicalPath: "/",
  });

  const topCourses = useMemo(() => {
    const list = Array.isArray(courses) ? courses : [];
    const selected = list
      .filter((c) => c.isTopCourse)
      .sort((a, b) => {
        if ((a.topPriority || 0) !== (b.topPriority || 0)) {
          return (a.topPriority || 0) - (b.topPriority || 0);
        }
        return String(b.createdAt || "").localeCompare(String(a.createdAt || ""));
      })
      .slice(0, 4);

    if (selected.length === 4) return selected;

    const selectedIds = new Set(selected.map((c) => String(c._id)));
    const fallback = list
      .filter((c) => !selectedIds.has(String(c._id)))
      .sort((a, b) => String(b.createdAt || "").localeCompare(String(a.createdAt || "")))
      .slice(0, 4 - selected.length);

    return [...selected, ...fallback];
  }, [courses]);

  useEffect(() => {
    AOS.init({ duration: 1000 });
  }, []);

  return (
    <div>
      <div className="home">
        <div className="home-orb home-orb-1" />
        <div className="home-orb home-orb-2" />
        <div className="home-orb home-orb-3" />
        <div className="home-content" data-aos="fade-up">
          <h1>Welcome to our SmartLearn AI Platform</h1>
          <p>Learn, Grow, Excel</p>
          <button onClick={() => navigate("/courses")} className="common-btn">
            Get Started
          </button>
        </div>
      </div>
      <section className="home-top-courses">
        <div className="home-top-courses-head">
          <h2>Top Courses</h2>
          <p>Handpicked by admin in priority order.</p>
        </div>
        <div className="home-top-courses-grid">
          {topCourses.length > 0 ? (
            topCourses.map((course) => <CourseCard key={course._id} course={course} />)
          ) : (
            <p>No featured courses available.</p>
          )}
        </div>
        <div className="home-top-courses-footer">
          <button
            type="button"
            className="home-continue-btn"
            onClick={() => navigate("/courses")}
          >
            Continue <FaArrowRightLong />
          </button>
        </div>
      </section>
      <Testimonials />
      <ChatbotWidget />
    </div>
  );
};

export default Home;
