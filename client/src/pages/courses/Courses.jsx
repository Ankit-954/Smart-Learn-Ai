import React, { useMemo, useState } from "react";
import "./courses.css";
import { CourseData } from "../../context/CourseContext";
import CourseCard from "../../components/coursecard/CourseCard";
import { UserData } from "../../context/UserContext";
import { usePageSeo } from "../../utils/usePageSeo";
import { HiOutlineAdjustmentsHorizontal } from "react-icons/hi2";

const Courses = () => {
  const { courses } = CourseData();
  const { user, isAuth } = UserData();
  usePageSeo({
    title: "Courses",
    description: "Browse SmartLearn AI courses by stream, level, subject, and pricing to find the right path for your learning goals.",
    canonicalPath: "/courses",
  });
  const [query, setQuery] = useState("");
  const [streamFilter, setStreamFilter] = useState("all");
  const [levelFilter, setLevelFilter] = useState("all");
  const [subjectFilter, setSubjectFilter] = useState("all");
  const [pricingFilter, setPricingFilter] = useState("all");
  const [showFilters, setShowFilters] = useState(false);
  const [collapsed, setCollapsed] = useState({
    cart: false,
    free: false,
    paid: false,
  });

  const streams = useMemo(() => {
    const unique = new Set((courses || []).map((c) => c.stream || c.category).filter(Boolean));
    return ["all", ...Array.from(unique)];
  }, [courses]);

  const levels = useMemo(() => {
    const unique = new Set((courses || []).map((c) => c.level).filter(Boolean));
    return ["all", ...Array.from(unique)];
  }, [courses]);

  const subjects = useMemo(() => {
    const set = new Set();
    (courses || []).forEach((c) => {
      (c.subjects || []).forEach((s) => set.add(s));
    });
    return ["all", ...Array.from(set)];
  }, [courses]);

  const filteredCourses = useMemo(() => {
    const q = query.trim().toLowerCase();
    return (courses || []).filter((c) => {
      const streamValue = c.stream || c.category || "";
      const subjectList = Array.isArray(c.subjects) ? c.subjects : [];
      const searchable = `${c.title} ${c.description} ${c.createdBy} ${streamValue} ${subjectList.join(" ")}`.toLowerCase();

      const matchQuery = !q || searchable.includes(q);
      const matchStream = streamFilter === "all" || streamValue === streamFilter;
      const matchLevel = levelFilter === "all" || c.level === levelFilter;
      const matchSubject = subjectFilter === "all" || subjectList.includes(subjectFilter);
      const isFree = c.isFree || Number(c.price) <= 0;
      const matchPricing =
        pricingFilter === "all" ||
        (pricingFilter === "free" && isFree) ||
        (pricingFilter === "paid" && !isFree);

      return matchQuery && matchStream && matchLevel && matchSubject && matchPricing;
    });
  }, [courses, query, streamFilter, levelFilter, subjectFilter, pricingFilter]);

  const isEnrolled = (courseId) =>
    isAuth &&
    user &&
    user.role !== "admin" &&
    Array.isArray(user.subscription) &&
    user.subscription.includes(courseId);

  const myCartCourses = filteredCourses.filter((c) => isEnrolled(c._id));
  const freeCourses = filteredCourses.filter(
    (c) => c.isFree || Number(c.price) <= 0
  );
  const paidCourses = filteredCourses.filter(
    (c) => !isEnrolled(c._id) && !(c.isFree || Number(c.price) <= 0)
  );
  const activeFilterCount = [streamFilter, levelFilter, subjectFilter, pricingFilter].filter(
    (value) => value !== "all"
  ).length + (query.trim() ? 1 : 0);

  return (
    <div className="courses">
      <div className="courses-hero">
        <h2>Browse All Courses</h2>
        <p>Discover courses by stream, subject, and level.</p>
        <input
          type="text"
          placeholder="Search courses, instructors, skills..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          className="courses-search"
        />
      </div>

      <div className="courses-mobile-actions">
        <button
          type="button"
          className="courses-filter-toggle-btn"
          aria-expanded={showFilters}
          onClick={() => setShowFilters((prev) => !prev)}
        >
          <HiOutlineAdjustmentsHorizontal />
          <span>{showFilters ? "Hide Filters" : "Show Filters"}</span>
          {activeFilterCount > 0 && <strong>{activeFilterCount}</strong>}
        </button>
      </div>

      <div className="courses-layout">
        <aside className={`courses-filter ${showFilters ? "open" : ""}`}>
          <div className="courses-filter-head">
            <h3>Filters</h3>
            <button
              type="button"
              onClick={() => {
                setStreamFilter("all");
                setLevelFilter("all");
                setSubjectFilter("all");
                setPricingFilter("all");
                setQuery("");
                setShowFilters(false);
              }}
            >
              Clear all
            </button>
          </div>

          <label>Stream</label>
          <select value={streamFilter} onChange={(e) => setStreamFilter(e.target.value)}>
            {streams.map((s) => (
              <option value={s} key={s}>
                {s === "all" ? "All Streams" : s}
              </option>
            ))}
          </select>

          <label>Level</label>
          <select value={levelFilter} onChange={(e) => setLevelFilter(e.target.value)}>
            {levels.map((l) => (
              <option value={l} key={l}>
                {l === "all" ? "All Levels" : l}
              </option>
            ))}
          </select>

          <label>Subject</label>
          <select value={subjectFilter} onChange={(e) => setSubjectFilter(e.target.value)}>
            {subjects.map((s) => (
              <option value={s} key={s}>
                {s === "all" ? "All Subjects" : s}
              </option>
            ))}
          </select>

          <label>Pricing</label>
          <select value={pricingFilter} onChange={(e) => setPricingFilter(e.target.value)}>
            <option value="all">All</option>
            <option value="free">Free</option>
            <option value="paid">Paid</option>
          </select>
        </aside>

        <div className="courses-content">
          <div className="courses-result-bar">
            <span>{filteredCourses.length} courses found</span>
          </div>
          <section className="course-section">
            <div className="course-section-header">
              <div className="course-section-title">
                <h3>My Cart (Purchased)</h3>
                <span>{myCartCourses.length}</span>
              </div>
              <button
                type="button"
                className="course-section-toggle"
                aria-expanded={!collapsed.cart}
                onClick={() => setCollapsed((prev) => ({ ...prev, cart: !prev.cart }))}
              >
                {collapsed.cart ? "Show" : "Hide"}
              </button>
            </div>
            {!collapsed.cart && (
              <>
                {myCartCourses.length > 0 ? (
                  <div className="course-container">
                    {myCartCourses.map((e) => (
                      <CourseCard key={e._id} course={e} />
                    ))}
                  </div>
                ) : (
                  <p className="course-empty">
                    {isAuth
                      ? "No purchased courses match your filters."
                      : "Login to see your purchased courses."}
                  </p>
                )}
              </>
            )}
          </section>

          <section className="course-section">
            <div className="course-section-header">
              <div className="course-section-title">
                <h3>Free</h3>
                <span>{freeCourses.length}</span>
              </div>
              <button
                type="button"
                className="course-section-toggle"
                aria-expanded={!collapsed.free}
                onClick={() => setCollapsed((prev) => ({ ...prev, free: !prev.free }))}
              >
                {collapsed.free ? "Show" : "Hide"}
              </button>
            </div>
            {!collapsed.free && (
              <>
                {freeCourses.length > 0 ? (
                  <div className="course-container">
                    {freeCourses.map((e) => (
                      <CourseCard key={e._id} course={e} />
                    ))}
                  </div>
                ) : (
                  <p className="course-empty">No free courses match your filters.</p>
                )}
              </>
            )}
          </section>

          <section className="course-section">
            <div className="course-section-header">
              <div className="course-section-title">
                <h3>Paid</h3>
                <span>{paidCourses.length}</span>
              </div>
              <button
                type="button"
                className="course-section-toggle"
                aria-expanded={!collapsed.paid}
                onClick={() => setCollapsed((prev) => ({ ...prev, paid: !prev.paid }))}
              >
                {collapsed.paid ? "Show" : "Hide"}
              </button>
            </div>
            {!collapsed.paid && (
              <>
                {paidCourses.length > 0 ? (
                  <div className="course-container">
                    {paidCourses.map((e) => (
                      <CourseCard key={e._id} course={e} />
                    ))}
                  </div>
                ) : (
                  <p className="course-empty">No paid courses match your filters.</p>
                )}
              </>
            )}
          </section>
        </div>
      </div>
    </div>
  );
};

export default Courses;
