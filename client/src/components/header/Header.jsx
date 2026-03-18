import React, { useEffect, useMemo, useRef, useState } from "react";
import axios from "axios";
import { FaSearch } from "react-icons/fa";
import { HiOutlineMenuAlt3 } from "react-icons/hi";
import { FiSun, FiMoon } from "react-icons/fi";
import { Link, NavLink, useLocation, useNavigate } from "react-router-dom";
import "./header.css";
import logos from "./logos.png";
import { CourseData } from "../../context/CourseContext";
import { useTheme } from "../../context/ThemeContext";
import { server } from "../../main";

const QUICK_TOPICS = [
  "Full Stack Development",
  "Data Structures and Algorithms",
  "System Design",
  "React",
  "Node.js",
  "JavaScript",
  "HTML",
  "CSS",
  "Tailwind CSS",
  "Bootstrap",
  "TypeScript",
  "Python",
  "Java",
  "Golang",
  "Swift",
  "Kotlin",
  "Angular",
  "Vue.js",
  "Web Development",
  "Frontend Development",
  "Backend Development",
  "DevOps",
  "AWS",
  "Docker",
  "Kubernetes",
  "Cloud Computing",
  "AI and Machine Learning",
  "Cybersecurity",
  "UI UX Design",
  "Digital Marketing",
  "Interview Preparation",
];

const getMatchScore = (label, query) => {
  const l = String(label || "").toLowerCase();
  const q = String(query || "").trim().toLowerCase();
  if (!l) return 0;
  if (!q) return 1;
  if (l === q) return 120;
  if (l.startsWith(q)) return 95;
  if (l.includes(q)) return 70;
  const words = q.split(" ").filter((w) => w.length > 1);
  const coverage = words.reduce((sum, word) => (l.includes(word) ? sum + 1 : sum), 0);
  return coverage > 0 ? coverage * 18 : 0;
};

const normalizeSuggestion = (raw) => {
  const label = String(raw?.label || raw || "").trim();
  if (!label) return null;
  return {
    label,
    type: String(raw?.type || "topic").trim() || "topic",
    subtitle: String(raw?.subtitle || "").trim(),
    url: typeof raw?.url === "string" && raw.url.trim() ? raw.url.trim() : "",
  };
};

const TopSearchBar = ({ courses }) => {
  const [searchQuery, setSearchQuery] = useState("");
  const [isSearchFocused, setIsSearchFocused] = useState(false);
  const [activeSuggestionIndex, setActiveSuggestionIndex] = useState(-1);
  const [debouncedQuery, setDebouncedQuery] = useState("");
  const [remoteSuggestions, setRemoteSuggestions] = useState([]);
  const [isLoadingSuggestions, setIsLoadingSuggestions] = useState(false);
  const searchWrapRef = useRef(null);
  const lastRequestRef = useRef(0);
  const navigate = useNavigate();
  const location = useLocation();

  const localSuggestionPool = useMemo(() => {
    const map = new Map();
    const upsert = (item) => {
      const normalized = normalizeSuggestion(item);
      if (!normalized) return;
      const key = normalized.label.toLowerCase();
      if (!map.has(key)) {
        map.set(key, normalized);
      }
    };

    QUICK_TOPICS.forEach((topic) =>
      upsert({
        label: topic,
        type: "topic",
        subtitle: "Popular topic",
        url: `/roadmap/${encodeURIComponent(topic)}`,
      })
    );

    (courses || []).forEach((course) => {
      if (course?._id && course?.title) {
        upsert({
          label: course.title,
          type: "course",
          subtitle: course.stream || course.category || "Course",
          url: `/course/${course._id}`,
        });
      }
      if (course?.stream) {
        upsert({
          label: course.stream,
          type: "stream",
          subtitle: "Stream",
          url: `/roadmap/${encodeURIComponent(course.stream)}`,
        });
      }
      if (course?.category) {
        upsert({
          label: course.category,
          type: "category",
          subtitle: "Category",
          url: `/roadmap/${encodeURIComponent(course.category)}`,
        });
      }
      if (course?.level) {
        upsert({
          label: course.level,
          type: "level",
          subtitle: "Skill level",
          url: "/courses",
        });
      }
      if (Array.isArray(course?.subjects)) {
        course.subjects.forEach((subject) =>
          upsert({
            label: subject,
            type: "subject",
            subtitle: "Subject",
            url: `/roadmap/${encodeURIComponent(subject)}`,
          })
        );
      }
    });
    return [...map.values()];
  }, [courses]);

  const localSuggestions = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    const source = localSuggestionPool || [];
    if (!query) {
      return source.slice(0, 8);
    }
    const matched = source
      .map((item) => ({
        ...item,
        score: getMatchScore(item.label, query) + (item.type === "course" ? 8 : 0),
      }))
      .filter((item) => item.score > 0);
    matched.sort((a, b) => b.score - a.score || a.label.localeCompare(b.label));
    return matched.slice(0, 8);
  }, [searchQuery, localSuggestionPool]);

  const suggestions = useMemo(() => {
    const merged = [];
    const seen = new Set();
    [...remoteSuggestions, ...localSuggestions].forEach((item) => {
      const normalized = normalizeSuggestion(item);
      if (!normalized) return;
      const key = `${normalized.label.toLowerCase()}::${normalized.type}`;
      if (seen.has(key)) return;
      seen.add(key);
      merged.push(normalized);
    });
    return merged.slice(0, 10);
  }, [remoteSuggestions, localSuggestions]);

  const runSearch = (value, selectedSuggestion = null) => {
    const sanitizedQuery = String(value || "").trim();
    setRemoteSuggestions([]);
    setIsLoadingSuggestions(false);
    setActiveSuggestionIndex(-1);
    setIsSearchFocused(false);

    if (selectedSuggestion?.url) {
      navigate(selectedSuggestion.url);
      setSearchQuery("");
      setDebouncedQuery("");
      return;
    }
    if (!sanitizedQuery) {
      navigate("/courses");
    } else {
      navigate(`/roadmap/${encodeURIComponent(sanitizedQuery)}`);
    }
    setSearchQuery("");
    setDebouncedQuery("");
  };

  const handleSearchKeyPress = (event) => {
    if (event.key === "ArrowDown") {
      event.preventDefault();
      setActiveSuggestionIndex((prev) => Math.min(prev + 1, suggestions.length - 1));
      return;
    }

    if (event.key === "ArrowUp") {
      event.preventDefault();
      setActiveSuggestionIndex((prev) => Math.max(prev - 1, 0));
      return;
    }

    if (event.key === "Escape") {
      setIsSearchFocused(false);
      setActiveSuggestionIndex(-1);
      return;
    }

    if (event.key === "Enter") {
      event.preventDefault();
      if (activeSuggestionIndex >= 0 && suggestions[activeSuggestionIndex]) {
        const selected = suggestions[activeSuggestionIndex];
        runSearch(selected.label, selected);
        return;
      }
      runSearch(searchQuery);
    }
  };

  useEffect(() => {
    const onPointerDown = (event) => {
      if (searchWrapRef.current && !searchWrapRef.current.contains(event.target)) {
        setIsSearchFocused(false);
        setActiveSuggestionIndex(-1);
      }
    };
    window.addEventListener("mousedown", onPointerDown);
    return () => window.removeEventListener("mousedown", onPointerDown);
  }, []);

  useEffect(() => {
    setActiveSuggestionIndex(-1);
  }, [searchQuery, suggestions.length]);

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedQuery(searchQuery);
    }, 140);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  useEffect(() => {
    const query = debouncedQuery.trim();
    if (!isSearchFocused || query.length < 1) {
      setRemoteSuggestions([]);
      setIsLoadingSuggestions(false);
      return;
    }

    const requestId = Date.now();
    lastRequestRef.current = requestId;
    setIsLoadingSuggestions(true);

    axios
      .get(`${server}/api/search/suggest`, {
        params: { q: query, limit: 10 },
        timeout: 5000,
      })
      .then(({ data }) => {
        if (lastRequestRef.current !== requestId) return;
        const incoming = Array.isArray(data?.suggestions)
          ? data.suggestions.map(normalizeSuggestion).filter(Boolean)
          : [];
        setRemoteSuggestions(incoming);
      })
      .catch(() => {
        if (lastRequestRef.current !== requestId) return;
        setRemoteSuggestions([]);
      })
      .finally(() => {
        if (lastRequestRef.current === requestId) {
          setIsLoadingSuggestions(false);
        }
      });
  }, [debouncedQuery, isSearchFocused]);

  useEffect(() => {
    setIsSearchFocused(false);
    setActiveSuggestionIndex(-1);
    setRemoteSuggestions([]);
    setIsLoadingSuggestions(false);
  }, [location.pathname, location.search]);

  return (
    <div className="search-box" ref={searchWrapRef}>
      <FaSearch className="search-icon" />
      <input
        type="text"
        placeholder="Search courses, skills, roadmaps..."
        value={searchQuery}
        onChange={(e) => {
          setSearchQuery(e.target.value);
          setIsSearchFocused(true);
        }}
        onFocus={() => setIsSearchFocused(true)}
        onKeyDown={handleSearchKeyPress}
      />
      {isSearchFocused && (suggestions.length > 0 || isLoadingSuggestions) && (
        <div className="search-suggestions">
          {isLoadingSuggestions && (
            <div className="search-suggestion-loading">Fetching suggestions...</div>
          )}
          {suggestions.map((suggestion, index) => (
            <button
              key={`${suggestion.type}-${suggestion.label}-${index}`}
              type="button"
              className={`search-suggestion-item ${
                index === activeSuggestionIndex ? "active" : ""
              }`}
              onMouseDown={(e) => {
                e.preventDefault();
                runSearch(suggestion.label, suggestion);
              }}
            >
              <span>{suggestion.label}</span>
              {suggestion.subtitle && (
                <span className="search-suggestion-meta">{suggestion.subtitle}</span>
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  );
};

const Header = ({ onToggleSidebar }) => {
  const { courses } = CourseData();
  const { theme, toggleTheme } = useTheme();
  const headerRef = useRef(null);

  useEffect(() => {
    const headerEl = headerRef.current;
    if (!headerEl) return;

    const syncHeaderHeight = () => {
      const height = Math.ceil(headerEl.getBoundingClientRect().height);
      document.documentElement.style.setProperty("--header-height", `${height}px`);
    };

    syncHeaderHeight();

    if (typeof ResizeObserver === "undefined") {
      window.addEventListener("resize", syncHeaderHeight);
      return () => {
        window.removeEventListener("resize", syncHeaderHeight);
      };
    }

    const observer = new ResizeObserver(() => {
      syncHeaderHeight();
    });

    observer.observe(headerEl);
    window.addEventListener("resize", syncHeaderHeight);

    return () => {
      observer.disconnect();
      window.removeEventListener("resize", syncHeaderHeight);
    };
  }, []);

  return (
    <header ref={headerRef}>
      <div className="logo">
        <Link to={"/"}>
          <img src={logos} alt="PathPro" className="logo-image" />
        </Link>
      </div>

      <TopSearchBar courses={courses} />

      <div className="link">
        <div className="nav-group">
          <NavLink to={"/"}>Home</NavLink>
          <NavLink to={"/courses"}>Courses</NavLink>
          <NavLink to={"/progress"}>Progress</NavLink>
          <NavLink to={"/test"}>Test</NavLink>
          <NavLink to={"/interview"}>Interview</NavLink>
          <NavLink to={"/reviews"}>Review</NavLink>
        </div>
        <span className="nav-divider" aria-hidden="true" />
        <div className="nav-group nav-group-secondary">
          <NavLink to={"/about"}>About Us</NavLink>
          <NavLink to={"/blog"}>Educational Blog</NavLink>
          <NavLink to={"/careers"}>Careers</NavLink>
        </div>
        <button
          type="button"
          className="theme-toggle-btn"
          onClick={toggleTheme}
          aria-label={theme === "dark" ? "Switch to light mode" : "Switch to dark mode"}
          title={theme === "dark" ? "Light mode" : "Dark mode"}
        >
          {theme === "dark" ? <FiSun /> : <FiMoon />}
        </button>
        <button
          type="button"
          className="menu-toggle-btn"
          onClick={onToggleSidebar}
          aria-label="Open menu"
        >
          <HiOutlineMenuAlt3 />
        </button>
      </div>
    </header>
  );
};

export default Header;
