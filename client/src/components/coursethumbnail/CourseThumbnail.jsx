import React, { useEffect, useMemo, useState } from "react";
import API from "../../utils/api.js";
const server = API.defaults.baseURL;

const normalizeImagePath = (path) => path.replace(/\\/g, "/").replace(/^\/+/, "");
const escapeXml = (value = "") =>
  value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");

const resolveCourseImage = (imagePath) => {
  if (!imagePath || typeof imagePath !== "string") return "";

  const trimmed = imagePath.trim();
  if (!trimmed) return "";

  if (
    trimmed.startsWith("http://") ||
    trimmed.startsWith("https://") ||
    trimmed.startsWith("data:") ||
    trimmed.startsWith("blob:")
  ) {
    return trimmed;
  }

  return `${server}/${normalizeImagePath(trimmed)}`;
};

const buildFallbackThumbnail = (title = "Course") => {
  const safeTitle = title.trim() || "Course";
  const shortTitle =
    safeTitle.length > 24 ? `${safeTitle.slice(0, 24).trimEnd()}...` : safeTitle;
  const initials = safeTitle
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((word) => word[0].toUpperCase())
    .join("");

  const hue = [...safeTitle].reduce((acc, ch) => acc + ch.charCodeAt(0), 0) % 360;
  const start = `hsl(${hue} 70% 50%)`;
  const end = `hsl(${(hue + 40) % 360} 75% 42%)`;

  const svg = `
  <svg xmlns="http://www.w3.org/2000/svg" width="800" height="450" viewBox="0 0 800 450">
    <defs>
      <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0%" stop-color="${start}" />
        <stop offset="100%" stop-color="${end}" />
      </linearGradient>
    </defs>
    <rect width="800" height="450" fill="url(#bg)" />
    <circle cx="740" cy="-20" r="180" fill="rgba(255,255,255,0.12)" />
    <circle cx="80" cy="430" r="140" fill="rgba(255,255,255,0.16)" />
    <text x="400" y="225" text-anchor="middle" fill="white" font-size="132" font-family="Arial, sans-serif" font-weight="700">${escapeXml(initials || "C")}</text>
    <text x="400" y="300" text-anchor="middle" fill="rgba(255,255,255,0.95)" font-size="42" font-family="Arial, sans-serif">${escapeXml(shortTitle)}</text>
  </svg>`;

  return `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(svg)}`;
};

const CourseThumbnail = ({ course, className, width, height, alt }) => {
  const fallbackSrc = useMemo(
    () => buildFallbackThumbnail(course?.title || "Course"),
    [course?.title]
  );
  const resolvedSrc = useMemo(() => resolveCourseImage(course?.image), [course?.image]);
  const [src, setSrc] = useState(resolvedSrc || fallbackSrc);

  useEffect(() => {
    setSrc(resolvedSrc || fallbackSrc);
  }, [resolvedSrc, fallbackSrc]);

  return (
    <img
      src={src}
      alt={alt || `${course?.title || "Course"} thumbnail`}
      className={className}
      width={width}
      height={height}
      onError={() => {
        if (src !== fallbackSrc) {
          setSrc(fallbackSrc);
        }
      }}
    />
  );
};

export default CourseThumbnail;
