import React from "react";
import { useRouteError, isRouteErrorResponse, Link } from "react-router-dom";

export default function ErrorBoundary() {
  const error = useRouteError();

  let message = "Something went wrong";
  let status = 500;

  if (isRouteErrorResponse(error)) {
    status = error.status;
    message = error.statusText || message;
  } else if (error instanceof Error) {
    message = error.message;
  }

  return (
    <div className="error-page">
      <div className="error-page-content">
        <h1>{status}</h1>
        <p>{message}</p>
        <Link to="/" className="error-home-link">
          Go back to home
        </Link>
      </div>
    </div>
  );
}
