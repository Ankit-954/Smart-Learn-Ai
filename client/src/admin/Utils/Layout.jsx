import React from "react";
import Sidebar from "./Sidebar";
import "./common.css";

const Layout = ({ children }) => {
  return (
    <div className="dashboard-admin">
      <Sidebar />
      <div className="content">
        <div className="main-content">{children}</div>
      </div>
    </div>
  );
};

export default Layout;