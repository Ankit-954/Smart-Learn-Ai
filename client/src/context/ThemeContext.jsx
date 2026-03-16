import { createContext, useContext, useEffect, useState } from "react";

const ThemeContext = createContext();

export const ThemeProvider = ({ children }) => {
  const [theme, setTheme] = useState(() => {
    const saved = localStorage.getItem("smartlearn-theme");
    if (saved === "dark" || saved === "light") return saved;
    // Respect system preference
    if (window.matchMedia?.("(prefers-color-scheme: dark)").matches) return "dark";
    return "light";
  });

  useEffect(() => {
    const root = document.documentElement;
    // Add transitioning class for smooth animation
    document.body.classList.add("theme-transitioning");
    root.setAttribute("data-theme", theme);
    localStorage.setItem("smartlearn-theme", theme);
    // Remove transitioning class after animation completes
    const timer = setTimeout(() => {
      document.body.classList.remove("theme-transitioning");
    }, 400);
    return () => clearTimeout(timer);
  }, [theme]);

  const toggleTheme = () => setTheme((prev) => (prev === "light" ? "dark" : "light"));

  return (
    <ThemeContext.Provider value={{ theme, toggleTheme }}>
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = () => useContext(ThemeContext);
