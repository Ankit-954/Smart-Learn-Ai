/**
 * Application Constants
 * Centralized configuration and constant values
 */

// Valid test difficulties
export const VALID_DIFFICULTIES = new Set(["easy", "medium", "hard"]);

// Default difficulty for tests
export const DEFAULT_DIFFICULTY = "medium";

// Cache configuration
export const CACHE_TTL_MS = 10 * 60 * 1000; // 10 minutes
export const CHAT_RESPONSE_CACHE_TTL_MS = 2 * 60 * 1000; // 2 minutes

// AI Configuration
export const GROQ_CHAT_COMPLETIONS_URL = "https://api.groq.com/openai/v1/chat/completions";
export const GEMINI_CHAT_COMPLETIONS_URL = "https://generativelanguage.googleapis.com/v1beta/openai/chat/completions";
export const DEFAULT_GROQ_MODEL = "llama-3.1-8b-instant";
export const DEFAULT_GEMINI_MODEL = "gemini-2.5-flash";
export const AI_REQUEST_TIMEOUT_MS = 25000;
export const MAX_AI_RETRIES = 3;
export const AI_BASE_DELAY_MS = 1000;

// Retryable HTTP status codes for AI providers
export const RETRYABLE_OPENAI_STATUS = new Set([408, 409, 425, 429, 500, 502, 503, 504]);

// Test domains
export const TEST_DOMAINS = [
  { name: "Ethical Hacking", id: "ethical-hacking" },
  { name: "Backend Development", id: "backend" },
  { name: "Node.js", id: "nodejs" },
  { name: "React", id: "react" },
  { name: "Python", id: "python" },
  { name: "Data Science", id: "data-science" },
  { name: "Machine Learning", id: "machine-learning" },
  { name: "Cybersecurity", id: "cybersecurity" },
  { name: "Frontend Development", id: "frontend" },
  { name: "JavaScript", id: "javascript" },
  { name: "Web Development", id: "web-dev" },
  { name: "UI/UX Design", id: "ui-ux" },
  { name: "Android Development", id: "android" },
  { name: "iOS Development", id: "ios" },
  { name: "Cloud Computing", id: "cloud" },
  { name: "DevOps", id: "devops" },
  { name: "Artificial Intelligence", id: "ai" },
  { name: "Blockchain", id: "blockchain" },
  { name: "Internet of Things (IoT)", id: "iot" },
  { name: "Game Development", id: "game-dev" },
  { name: "Software Testing", id: "software-testing" },
  { name: "Database Management", id: "database" },
  { name: "Networking", id: "networking" },
  { name: "Linux", id: "linux" },
  { name: "Windows", id: "windows" },
  { name: "MacOS", id: "macos" },
  { name: "Mobile Development", id: "mobile-dev" },
  { name: "Web Design", id: "web-design" },
  { name: "SEO", id: "seo" },
  { name: "Digital Marketing", id: "digital-marketing" },
  { name: "Content Writing", id: "content-writing" },
  { name: "Graphic Design", id: "graphic-design" },
  { name: "Video Editing", id: "video-editing" },
  { name: "Photography", id: "photography" },
  { name: "Animation", id: "animation" },
  { name: "Music Production", id: "music-production" },
  { name: "Film Making", id: "film-making" },
  { name: "Business", id: "business" },
  { name: "Finance", id: "finance" },
  { name: "Accounting", id: "accounting" },
  { name: "Sales", id: "sales" },
  { name: "Marketing", id: "marketing" },
  { name: "Human Resources (HR)", id: "hr" },
  { name: "Project Management", id: "project-management" },
  { name: "Product Management", id: "product-management" },
  { name: "Customer Service", id: "customer-service" },
];

// Test domain links for navigation
export const TEST_DOMAIN_LINKS = [
  { id: "react", name: "React" },
  { id: "nodejs", name: "Node.js" },
  { id: "python", name: "Python" },
  { id: "javascript", name: "JavaScript" },
  { id: "backend", name: "Backend Development" },
  { id: "frontend", name: "Frontend Development" },
  { id: "machine-learning", name: "Machine Learning" },
  { id: "data-science", name: "Data Science" },
  { id: "cybersecurity", name: "Cybersecurity" },
  { id: "ethical-hacking", name: "Ethical Hacking" },
];

// SmartLearn keywords for chatbot scoping
export const SMARTLEARN_KEYWORDS = [
  "smartlearn",
  "course",
  "courses",
  "test",
  "quiz",
  "assessment",
  "dashboard",
  "progress",
  "review",
  "account",
  "login",
  "register",
  "lecture",
  "certificate",
  "payment",
  "subscription",
  "roadmap",
  "callback",
  "support",
  "react",
  "node",
  "python",
  "javascript",
  "frontend",
  "backend",
];

// MCQ Generation constraints
export const MCQ_CONFIG = {
  MIN_QUESTIONS: 1,
  MAX_QUESTIONS: 30,
  DEFAULT_QUESTIONS: 10,
  MAX_TOKENS: 4000,
};

// Environment variable mappings
export const ENV_MAPPING = {
  RAZORPAY_KEY: ["Razorpay_Key", "RAZORPAY_KEY_ID"],
  RAZORPAY_SECRET: ["Razorpay_Secret", "RAZORPAY_SECRET"],
};

// Required environment variables
export const REQUIRED_ENV_VARS = [
  ["GROQ_API_KEY"],
  ["GEMINI_API_KEY"],
  ["Razorpay_Key", "RAZORPAY_KEY_ID"],
  ["Razorpay_Secret", "RAZORPAY_SECRET"],
];

// CORS defaults
export const DEFAULT_CORS_ORIGIN = "http://localhost:5173";

// Express middleware limits
export const REQUEST_LIMITS = {
  JSON_SIZE: "5mb",
  URL_ENCODED_SIZE: "5mb",
};

// Chat intents
export const CHAT_INTENTS = {
  COURSE_DISCOVERY: "course_discovery",
  TEST_DISCOVERY: "test_discovery",
  PROGRESS_HELP: "progress_help",
  PAYMENT_SUPPORT: "payment_support",
  GENERAL_SUPPORT: "general_support",
};
