import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App.jsx";
import { UserContextProvider } from "./context/UserContext.jsx";
import { CourseContextProvider } from "./context/CourseContext.jsx";
import { ThemeProvider } from "./context/ThemeContext.jsx";

export const server = import.meta.env.VITE_SERVER_URL || "http://localhost:5000";

const container = document.getElementById("root");
if (!container) {
  throw new Error("Root container not found");
}

const existingRoot = container.__appRoot;
const root = existingRoot || ReactDOM.createRoot(container);
container.__appRoot = root;

root.render(
  <ThemeProvider>
    <UserContextProvider>
      <CourseContextProvider>
        <App />
      </CourseContextProvider>
    </UserContextProvider>
  </ThemeProvider>
);
