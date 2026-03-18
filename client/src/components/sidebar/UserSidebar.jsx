import React from "react";
import { Link, NavLink, useNavigate } from "react-router-dom";
import {
  AiFillHome,
  AiOutlineLogin,
  AiOutlineLogout,
  AiOutlineClose,
  AiOutlineQuestionCircle,
  AiOutlineMail,
  AiOutlineBook,
  AiOutlineRead,
} from "react-icons/ai";
import { FaUserAlt } from "react-icons/fa";
import { MdDashboard } from "react-icons/md";
import { RiRoadMapLine } from "react-icons/ri";
import { BiBarChartAlt2 } from "react-icons/bi";
import { TbClipboardText } from "react-icons/tb";
import { RiProfileLine } from "react-icons/ri";
import toast from "react-hot-toast";
import { UserData } from "../../context/UserContext";
import "./userSidebar.css";

const UserSidebar = ({ isOpen, onClose, isAuth, user }) => {
  const navigate = useNavigate();
  const { setIsAuth, setUser } = UserData();

  const logoutHandler = () => {
    localStorage.clear();
    setUser([]);
    setIsAuth(false);
    toast.success("Logged Out");
    onClose();
    navigate("/login");
  };

  const directLoginHandler = () => {
    localStorage.clear();
    setUser([]);
    setIsAuth(false);
    onClose();
    navigate("/login");
  };

  const navClass = () => "user-side-link";
  const testAttempts = Array.isArray(user?.testHistory) ? user.testHistory.length : 0;
  const purchasedCourses = Array.isArray(user?.subscription) ? user.subscription.length : 0;
  const recentTestAttempts = Array.isArray(user?.testHistory)
    ? user.testHistory.filter((t) => {
        const completedAt = new Date(t?.completedAt || 0).getTime();
        return completedAt > Date.now() - 7 * 24 * 60 * 60 * 1000;
      }).length
    : 0;
  const activityBasePath = "/progress";
  const testsPath = `${activityBasePath}#tests`;
  const coursesPath = `${activityBasePath}#courses`;
  const interviewsPath = `${activityBasePath}#interviews`;

  return (
    <>
      <div
        className={`user-side-overlay ${isOpen ? "open" : ""}`}
        onClick={onClose}
      />
      <aside className={`user-side-drawer ${isOpen ? "open" : ""}`}>
        <div className="user-side-head">
          <div className="user-side-user">
            <h3>{isAuth ? user?.name || "User" : "Guest"}</h3>
            {isAuth && <p>{user?.email || ""}</p>}
          </div>
          <button type="button" onClick={onClose} className="user-side-close-btn">
            <AiOutlineClose />
          </button>
        </div>

        <div className="user-side-body">
          <nav className="user-side-nav">
            <div className="user-side-section">
              <p className="user-side-section-title">Main</p>
              <NavLink to="/" end className={navClass} onClick={onClose}>
                <AiFillHome />
                <span>Home</span>
              </NavLink>
              <NavLink to="/courses" className={navClass} onClick={onClose}>
                <AiOutlineBook />
                <span>Courses</span>
              </NavLink>
              <NavLink to="/test" className={navClass} onClick={onClose}>
                <TbClipboardText />
                <span>Mock Tests</span>
              </NavLink>
              <NavLink to="/interview" className={navClass} onClick={onClose}>
                <FaUserAlt />
                <span>AI Interview</span>
              </NavLink>
              <NavLink to="/reviews" className={navClass} onClick={onClose}>
                <BiBarChartAlt2 />
                <span>Reviews</span>
              </NavLink>
              <Link to="/roadmap/Web%20Development" className={navClass()} onClick={onClose}>
                <RiRoadMapLine />
                <span>Roadmaps</span>
              </Link>
            </div>

            {isAuth && (
              <div className="user-side-section">
                <p className="user-side-section-title">Your Space</p>
                <NavLink to="/account" className={navClass} onClick={onClose}>
                  <RiProfileLine />
                  <span>My Profile</span>
                </NavLink>
                <NavLink to="/progress" className={navClass} onClick={onClose}>
                  <BiBarChartAlt2 />
                  <span>Progress</span>
                </NavLink>
                <NavLink to={`/${user?._id}/dashboard`} className={navClass} onClick={onClose}>
                  <MdDashboard />
                  <span>Dashboard</span>
                </NavLink>
                {user?.role === "admin" && (
                  <NavLink to="/admin/dashboard" className={navClass} onClick={onClose}>
                    <MdDashboard />
                    <span>Admin Panel</span>
                  </NavLink>
                )}
              </div>
            )}

            <div className="user-side-section">
              <p className="user-side-section-title">Support</p>
              <NavLink to="/about" className={navClass} onClick={onClose}>
                <AiOutlineRead />
                <span>About Us</span>
              </NavLink>
              <NavLink to="/blog" className={navClass} onClick={onClose}>
                <AiOutlineRead />
                <span>Educational Blog</span>
              </NavLink>
              <NavLink to="/careers" className={navClass} onClick={onClose}>
                <AiOutlineRead />
                <span>Careers</span>
              </NavLink>
              <NavLink to="/faq" className={navClass} onClick={onClose}>
                <AiOutlineQuestionCircle />
                <span>Help Center & FAQ</span>
              </NavLink>
              <NavLink to="/contact" className={navClass} onClick={onClose}>
                <AiOutlineMail />
                <span>Contact Support</span>
              </NavLink>
            </div>
          </nav>

          {isAuth && (
            <div className="user-side-stats">
              <Link
                to={testsPath}
                onClick={onClose}
                className="user-side-stat-card user-side-stat-link"
              >
                <span>Tests (7d)</span>
                <strong>{recentTestAttempts}</strong>
              </Link>
              <Link
                to={coursesPath}
                onClick={onClose}
                className="user-side-stat-card user-side-stat-link"
              >
                <span>Courses</span>
                <strong>{purchasedCourses}</strong>
              </Link>
              <Link
                to={interviewsPath}
                onClick={onClose}
                className="user-side-stat-card user-side-stat-link"
              >
                <span>Interviews</span>
                <strong>{Array.isArray(user?.interviewHistory) ? user.interviewHistory.length : 0}</strong>
              </Link>
              <Link
                to="/progress"
                onClick={onClose}
                className="user-side-stat-card user-side-stat-link"
              >
                <span>Total Tests</span>
                <strong>{testAttempts}</strong>
              </Link>
            </div>
          )}
        </div>

        <div className="user-side-actions">
          {isAuth ? (
            <button
              type="button"
              onClick={logoutHandler}
              className="user-side-action logout"
            >
              <AiOutlineLogout />
              Logout
            </button>
          ) : (
            <button
              type="button"
              onClick={directLoginHandler}
              className="user-side-action login"
            >
              <AiOutlineLogin />
              Login
            </button>
          )}
        </div>
      </aside>
    </>
  );
};

export default UserSidebar;
