import React from "react";
import { Link } from "react-router-dom";
import "./notfound.css";

const NotFound = () => {
  return (
    <div className="notfound-page">
      <div className="notfound-content">
        <h1 className="notfound-title">404</h1>
        <h2 className="notfound-subtitle">Page Not Found</h2>
        <p className="notfound-message">
          Oops! The page you're looking for doesn't exist or has been moved.
        </p>
        <Link to="/" className="notfound-home-btn">
          Go Back Home
        </Link>
      </div>
    </div>
  );
};

export default NotFound;
