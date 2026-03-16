import rateLimit from "express-rate-limit";

// Global rate limit — 200 requests per 15 min per IP
export const globalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: process.env.NODE_ENV === "production" ? 200 : 1000, // Higher limit for local development hot-reloads
  standardHeaders: true,
  legacyHeaders: false,
  skip: (req) => req.method === "GET" && req.path === "/api/user/test-history",
  message: { message: "Too many requests. Please try again later." },
});

// Stricter limit for auth endpoints (brute-force protection)
export const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 15,
  standardHeaders: true,
  legacyHeaders: false,
  message: { message: "Too many login attempts. Please try again in 15 minutes." },
});

// Stricter limit for AI endpoints (cost protection)
export const aiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 30,
  standardHeaders: true,
  legacyHeaders: false,
  message: { message: "AI request limit reached. Please try again in a few minutes." },
});

// Higher allowance for activity polling endpoints (front-end refresh)
export const activityLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 120,
  standardHeaders: true,
  legacyHeaders: false,
  message: { message: "Too many activity requests. Please wait a moment." },
});
