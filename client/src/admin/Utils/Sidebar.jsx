import React from "react";
import "./common.css";
import { NavLink } from "react-router-dom";
import {
  AiFillHome,
  AiOutlineLogout,
  AiOutlineRead,
  AiOutlineInfoCircle,
  AiOutlineTeam,
  AiOutlineMail,
  AiOutlineNotification,
} from "react-icons/ai";
import { FaBook, FaUserAlt } from "react-icons/fa";
import { UserData } from "../../context/UserContext";

const Sidebar = () => {
  const { user } = UserData();
  return (
    <div className="sidebar">
      <div className="sidebar-brand">SmartLearn Admin</div>
      <ul>
        <li>
          <NavLink
            to={"/admin/dashboard"}
            className={({ isActive }) => (isActive ? "active-nav" : "")}
          >
            <div className="icon">
              <AiFillHome />
            </div>
            <span>Home</span>
          </NavLink>
        </li>

        <li>
          <NavLink
            to={"/admin/course"}
            className={({ isActive }) => (isActive ? "active-nav" : "")}
          >
            <div className="icon">
              <FaBook />
            </div>
            <span>Courses</span>
          </NavLink>
        </li>

        {user && user.mainrole === "superadmin" && (
          <li>
            <NavLink
              to={"/admin/users"}
              className={({ isActive }) => (isActive ? "active-nav" : "")}
            >
              <div className="icon">
                <FaUserAlt />
              </div>
              <span>Users</span>
            </NavLink>
          </li>
        )}

        {user && (user.role === "admin" || user.mainrole === "superadmin") && (
          <>
            <li>
              <NavLink
                to={"/admin/blogs"}
                className={({ isActive }) => (isActive ? "active-nav" : "")}
              >
                <div className="icon">
                  <AiOutlineRead />
                </div>
                <span>Blogs</span>
              </NavLink>
            </li>
            <li>
              <NavLink
                to={"/admin/about"}
                className={({ isActive }) => (isActive ? "active-nav" : "")}
              >
                <div className="icon">
                  <AiOutlineInfoCircle />
                </div>
                <span>About Page</span>
              </NavLink>
            </li>
            <li>
              <NavLink
                to={"/admin/careers"}
                className={({ isActive }) => (isActive ? "active-nav" : "")}
              >
                <div className="icon">
                  <AiOutlineTeam />
                </div>
                <span>Careers</span>
              </NavLink>
            </li>
            <li>
              <NavLink
                to={"/admin/contacts"}
                className={({ isActive }) => (isActive ? "active-nav" : "")}
              >
                <div className="icon">
                  <AiOutlineMail />
                </div>
                <span>Contacts</span>
              </NavLink>
            </li>
            <li>
              <NavLink
                to={"/admin/newsletter"}
                className={({ isActive }) => (isActive ? "active-nav" : "")}
              >
                <div className="icon">
                  <AiOutlineNotification />
                </div>
                <span>Newsletter</span>
              </NavLink>
            </li>
          </>
        )}

        <li>
          <NavLink to={"/account"}>
            <div className="icon">
              <AiOutlineLogout />
            </div>
            <span>Logout</span>
          </NavLink>
        </li>
      </ul>
    </div>
  );
};

export default Sidebar;
