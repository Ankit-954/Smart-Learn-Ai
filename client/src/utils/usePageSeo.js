import { useEffect } from "react";

const SITE_NAME = "SmartLearn AI";

const ensureMeta = (selector, attributes) => {
  let element = document.head.querySelector(selector);
  if (!element) {
    element = document.createElement("meta");
    document.head.appendChild(element);
  }
  Object.entries(attributes).forEach(([key, value]) => {
    element.setAttribute(key, value);
  });
  return element;
};

const ensureCanonical = () => {
  let link = document.head.querySelector('link[rel="canonical"]');
  if (!link) {
    link = document.createElement("link");
    link.setAttribute("rel", "canonical");
    document.head.appendChild(link);
  }
  return link;
};

export const usePageSeo = ({
  title,
  description,
  canonicalPath = "/",
  robots = "index, follow",
}) => {
  useEffect(() => {
    document.title = title ? `${title} | ${SITE_NAME}` : SITE_NAME;

    ensureMeta('meta[name="description"]', {
      name: "description",
      content: description || "SmartLearn AI helps learners grow with courses, AI tools, mock tests, and career-focused learning paths.",
    });

    ensureMeta('meta[name="robots"]', {
      name: "robots",
      content: robots,
    });

    const canonicalUrl = new URL(canonicalPath, window.location.origin).toString();
    ensureCanonical().setAttribute("href", canonicalUrl);
  }, [canonicalPath, description, robots, title]);
};

