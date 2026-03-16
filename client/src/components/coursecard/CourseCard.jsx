import React, { useEffect, useRef, useState } from "react";
import "./courseCard.css";
import { UserData } from "../../context/UserContext";
import { useLocation, useNavigate } from "react-router-dom";
import toast from "react-hot-toast";
import axios from "axios";
import { CourseData } from "../../context/CourseContext";
import { server } from "../../main";
import CourseThumbnail from "../coursethumbnail/CourseThumbnail";
import { FiChevronDown } from "react-icons/fi";

const formatCourseDuration = (duration, durationUnit) => {
  const numericDuration = Number(duration);
  const safeDuration = Number.isFinite(numericDuration) && numericDuration > 0 ? numericDuration : 0;
  const normalizedUnit = ["day", "week", "month"].includes(String(durationUnit || "").toLowerCase())
    ? String(durationUnit).toLowerCase()
    : "week";
  const unitLabel = safeDuration === 1 ? normalizedUnit : `${normalizedUnit}s`;

  return `${safeDuration} ${unitLabel}`;
};

const CourseCard = ({ course, onEdit }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, isAuth } = UserData();
  const { fetchCourses } = CourseData();
  const [actionsOpen, setActionsOpen] = useState(false);
  const actionsRef = useRef(null);
  const isAdminPanel = location.pathname.startsWith("/admin");
  const isEnrolled =
    isAuth &&
    user &&
    user.role !== "admin" &&
    Array.isArray(user.subscription) &&
    user.subscription.includes(course._id);

  const deleteHandler = async (id) => {
    if (confirm("Are you sure you want to delete this course")) {
      try {
        const { data } = await axios.delete(`${server}/api/course/${id}`, {
          headers: {
            token: localStorage.getItem("token"),
          },
        });

        toast.success(data.message);
        fetchCourses();
      } catch (error) {
        toast.error(error.response.data.message);
      }
    }
  };

  useEffect(() => {
    if (!actionsOpen) return undefined;

    const onClickOutside = (event) => {
      if (actionsRef.current && !actionsRef.current.contains(event.target)) {
        setActionsOpen(false);
      }
    };

    const onEscape = (event) => {
      if (event.key === "Escape") setActionsOpen(false);
    };

    document.addEventListener("mousedown", onClickOutside);
    document.addEventListener("keydown", onEscape);

    return () => {
      document.removeEventListener("mousedown", onClickOutside);
      document.removeEventListener("keydown", onEscape);
    };
  }, [actionsOpen]);

  return (
    <div className={`course-card card-3d ${actionsOpen ? "actions-open" : ""}`}>
      {course.isTopCourse && (
        <div className="top-course-badge">Top #{course.topPriority || 0}</div>
      )}
      {(course.isFree || Number(course.price) <= 0) && (
        <div className="free-course-badge">Free</div>
      )}
      <CourseThumbnail course={course} className="course-image" />
      <h3>{course.title}</h3>
      <p className="course-meta-line">
        <span>{course.stream || course.category}</span>
        <span>{course.level || "All Levels"}</span>
      </p>
      <p>Instructor- {course.createdBy}</p>
      <p>Duration- {formatCourseDuration(course.duration, course.durationUnit)}</p>
      {!isEnrolled && (
        <p>
          Price- {course.isFree || Number(course.price) <= 0 ? "Free" : `Rs ${course.price}`}
        </p>
      )}

      {Array.isArray(course.subjects) && course.subjects.length > 0 && (
        <div className="course-subject-tags">
          {course.subjects.slice(0, 3).map((subject) => (
            <span key={subject}>{subject}</span>
          ))}
        </div>
      )}

      {isAuth ? (
        <>
          {user && user.role !== "admin" ? (
            <>
              {isEnrolled ? (
                <button
                  type="button"
                  onClick={() => navigate(`/course/study/${course._id}`)}
                  className="common-btn"
                >
                  Continue
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => navigate(`/course/${course._id}`)}
                  className="common-btn"
                >
                  Get Started
                </button>
              )}
            </>
          ) : (
            <button
              type="button"
              onClick={() => navigate(`/course/study/${course._id}`)}
              className="common-btn"
            >
              Study
            </button>
          )}
        </>
      ) : (
        <button type="button" onClick={() => navigate("/login")} className="common-btn">
          Get Started
        </button>
      )}

      {user && user.role === "admin" && isAdminPanel && (
        <div className="admin-course-actions">
          <div className="admin-course-action-row" ref={actionsRef}>
            <button
              type="button"
              className="admin-actions-toggle"
              aria-haspopup="menu"
              aria-expanded={actionsOpen}
              onClick={() => setActionsOpen((prev) => !prev)}
            >
              <span>Manage</span>
              <FiChevronDown />
            </button>

            {actionsOpen && (
              <div className="admin-actions-menu" role="menu">
                {typeof onEdit === "function" && (
                  <button
                    type="button"
                    role="menuitem"
                    className="admin-action-item"
                    onClick={() => {
                      setActionsOpen(false);
                      onEdit(course);
                    }}
                  >
                    Edit Course
                  </button>
                )}
                <button
                  type="button"
                  role="menuitem"
                  className="admin-action-item admin-action-item-danger"
                  onClick={() => {
                    setActionsOpen(false);
                    deleteHandler(course._id);
                  }}
                >
                  Delete Course
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default CourseCard;
