import { User } from "../models/User.js";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import axios from "axios";
import { OAuth2Client } from "google-auth-library";
import { Courses } from "../models/Courses.js";
import { Progress } from "../models/Progress.js";
import { Interview } from "../models/Interview.js";
import sendMail, {
  sendCallbackRequestMail,
  sendForgotMail,
} from "../middlewares/sendMail.js";
import TryCatch from "../middlewares/TryCatch.js";

const SMARTLEARN_KEYWORDS = [
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

const TEST_DOMAIN_LINKS = [
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

const logEvent = (level, event, meta = {}) => {
  const line = JSON.stringify({
    ts: new Date().toISOString(),
    level,
    event,
    ...meta,
  });
  if (level === "error") {
    console.error(line);
    return;
  }
  console.log(line);
};

const isSmartLearnScoped = (text = "") => {
  const q = text.toLowerCase();
  return SMARTLEARN_KEYWORDS.some((keyword) => q.includes(keyword));
};

const compactQuery = (text = "") =>
  text
    .toLowerCase()
    .replace(/[^a-z0-9\s.+-]/g, " ")
    .replace(/\s+/g, " ")
    .trim();

const buildCourseLinks = async (queryText) => {
  try {
    const q = compactQuery(queryText);
    const terms = q
      .split(" ")
      .filter((t) => t.length > 2 && !["course", "courses", "show", "list", "learn", "for", "about", "in"].includes(t))
      .slice(0, 4);

    const regex = terms.length > 0 ? new RegExp(terms.join("|"), "i") : null;
    const filter = regex ? { $or: [{ title: regex }, { category: regex }, { description: regex }] } : {};
    const courses = await Courses.find(filter).sort({ createdAt: -1 }).limit(5).select("_id title");

    return courses.map((course) => ({
      label: course.title,
      url: `/course/${course._id}`,
      type: "course",
    }));
  } catch (error) {
    return [];
  }
};

const buildTestLinks = (queryText) => {
  const q = compactQuery(queryText);
  const matched = TEST_DOMAIN_LINKS.filter(
    (d) => q.includes(d.id.replace("-", " ")) || q.includes(d.name.toLowerCase())
  );
  const source = matched.length > 0 ? matched : TEST_DOMAIN_LINKS;

  return source.slice(0, 5).map((d) => ({
    label: `${d.name} Test`,
    url: `/test/${d.id}`,
    type: "test",
  }));
};

const ensureCoursesEntryLink = (links) => {
  if (links.some((l) => l.url === "/courses")) return links;
  return [...links, { label: "Browse All Courses", url: "/courses", type: "course" }];
};

const CHAT_INTENTS = {
  COURSE_DISCOVERY: "course_discovery",
  TEST_DISCOVERY: "test_discovery",
  PROGRESS_HELP: "progress_help",
  PAYMENT_SUPPORT: "payment_support",
  GENERAL_SUPPORT: "general_support",
};

const GROQ_CHAT_COMPLETIONS_URL = "https://api.groq.com/openai/v1/chat/completions";
const CHAT_RESPONSE_CACHE = new Map();
const CHAT_RESPONSE_CACHE_TTL_MS = 2 * 60 * 1000;

const CHAT_SUGGESTED_QUESTIONS = {
  [CHAT_INTENTS.COURSE_DISCOVERY]: [
    "Suggest beginner friendly courses for web development",
    "Give me a 12-week roadmap for React",
    "Which top courses should I start first?",
  ],
  [CHAT_INTENTS.TEST_DISCOVERY]: [
    "Which test should I take for React?",
    "Suggest a test plan for backend interview prep",
    "How can I improve my score in assessments?",
  ],
  [CHAT_INTENTS.PROGRESS_HELP]: [
    "How to continue my course from where I left?",
    "How is my progress percentage calculated?",
    "Where can I see my recent test attempts?",
  ],
  [CHAT_INTENTS.PAYMENT_SUPPORT]: [
    "Payment failed in Razorpay test mode, what to do?",
    "How can I verify course purchase status?",
    "Which payment methods are supported?",
  ],
  [CHAT_INTENTS.GENERAL_SUPPORT]: [
    "Help me choose a course based on my goal",
    "Guide me to start with tests and roadmap",
    "How do I update my profile details?",
  ],
};

const CHAT_SUPPORT_PLAYBOOK = [
  {
    id: "payment_domestic_card",
    intent: CHAT_INTENTS.PAYMENT_SUPPORT,
    keywords: ["international", "card", "payment", "razorpay", "domestic"],
    answer:
      "Your card was not accepted in test mode.\nUse UPI test flow or a domestic test card.\nThen retry payment from the same course page.",
    links: [
      { label: "Browse Courses", url: "/courses", type: "course" },
      { label: "Open Account", url: "/account", type: "account" },
    ],
  },
  {
    id: "auth_forbidden",
    intent: CHAT_INTENTS.GENERAL_SUPPORT,
    keywords: ["403", "forbidden", "token", "unauthorized", "login", "session"],
    answer:
      "Your session has expired.\nLog out and log in again, then retry.\nIf it still fails, close the app and open it again.",
    links: [
      { label: "Open Login", url: "/login", type: "account" },
      { label: "Open Account", url: "/account", type: "account" },
    ],
  },
  {
    id: "lecture_not_visible",
    intent: CHAT_INTENTS.PROGRESS_HELP,
    keywords: ["lecture", "video", "not playing", "no lectures", "continue course"],
    answer:
      "Your course is active but lectures are not visible right now.\nRefresh the page and open the course again after a short wait.\nIf it still does not load, use Request Call Back from chat so support can fix it.",
    links: [
      { label: "Open Progress Dashboard", url: "/progress", type: "progress" },
      { label: "Browse My Courses", url: "/courses", type: "course" },
    ],
  },
  {
    id: "question_generation_parse_error",
    intent: CHAT_INTENTS.TEST_DISCOVERY,
    keywords: ["json", "parse", "question", "expected", "unterminated", "test"],
    answer:
      "The test could not load questions this time.\nRetry once with a fresh attempt.\nIf it repeats, switch domain once and try again.",
    links: [
      { label: "Open Test Domains", url: "/test", type: "test" },
      { label: "Open Progress Dashboard", url: "/progress", type: "progress" },
    ],
  },
];

const inferIntentHeuristic = (text = "") => {
  const q = String(text).toLowerCase();
  if (/\b(hi|hello|hey|help|support)\b/.test(q)) {
    return CHAT_INTENTS.GENERAL_SUPPORT;
  }
  if (/\b(course|courses|learn|class|roadmap|subject|stream)\b/.test(q)) {
    return CHAT_INTENTS.COURSE_DISCOVERY;
  }
  if (/\b(test|quiz|assessment|mcq|exam|questions?)\b/.test(q)) {
    return CHAT_INTENTS.TEST_DISCOVERY;
  }
  if (/\b(progress|completed|continue|dashboard|score|performance)\b/.test(q)) {
    return CHAT_INTENTS.PROGRESS_HELP;
  }
  if (/\b(payment|pay|checkout|razorpay|purchase|refund|upi|card)\b/.test(q)) {
    return CHAT_INTENTS.PAYMENT_SUPPORT;
  }
  return CHAT_INTENTS.GENERAL_SUPPORT;
};

const dedupeLinks = (links = []) => {
  const out = [];
  const seen = new Set();
  for (const link of links) {
    const label = String(link?.label || "").trim();
    const url = String(link?.url || "").trim();
    const type = String(link?.type || "link").trim();
    if (!label || !url) continue;
    const key = `${type}:${url}`;
    if (seen.has(key)) continue;
    seen.add(key);
    out.push({ label, url, type });
  }
  return out;
};

const getTokenFromRequest = (req) => {
  const headerToken = String(req.headers?.token || "").trim();
  if (headerToken) return headerToken;
  const auth = String(req.headers?.authorization || "").trim();
  if (!auth.toLowerCase().startsWith("bearer ")) return "";
  return auth.slice(7).trim();
};

const getOptionalAuthUserContext = async (req) => {
  const token = getTokenFromRequest(req);
  if (!token) return null;

  try {
    const decoded = jwt.verify(token, process.env.Jwt_Sec);
    const user = await User.findById(decoded?._id)
      .select("name email role subscription testHistory")
      .lean();
    if (!user) return null;

    const subscribedCourseIds = (user.subscription || []).map((id) => String(id));
    const subscribedCourses = subscribedCourseIds.length
      ? await Courses.find({ _id: { $in: subscribedCourseIds } })
          .select("_id title stream category")
          .limit(8)
          .lean()
      : [];

    const progressDocs = subscribedCourseIds.length
      ? await Progress.find({ user: user._id, course: { $in: subscribedCourseIds } })
          .select("course completedLectures")
          .lean()
      : [];

    const courseProgressMap = new Map();
    for (const p of progressDocs) {
      courseProgressMap.set(String(p.course), Array.isArray(p.completedLectures) ? p.completedLectures.length : 0);
    }

    const recentTests = Array.isArray(user.testHistory)
      ? [...user.testHistory]
          .sort((a, b) => new Date(b.completedAt) - new Date(a.completedAt))
          .slice(0, 5)
      : [];

    return {
      userId: String(user._id),
      name: String(user.name || "").trim(),
      role: String(user.role || "user"),
      subscribedCourses: subscribedCourses.map((course) => ({
        _id: String(course._id),
        title: String(course.title || "").trim(),
        stream: String(course.stream || course.category || "").trim(),
        completedLectures: courseProgressMap.get(String(course._id)) || 0,
      })),
      stats: {
        purchasedCourses: subscribedCourses.length,
        testsAttempted: Array.isArray(user.testHistory) ? user.testHistory.length : 0,
        recentAverage:
          recentTests.length > 0
            ? Math.round(
                (recentTests.reduce((sum, item) => sum + Number(item.percentage || 0), 0) /
                  recentTests.length) *
                  10
              ) / 10
            : 0,
      },
      recentTests: recentTests.map((x) => ({
        domain: String(x.domain || "").trim(),
        percentage: Number(x.percentage || 0),
      })),
    };
  } catch (error) {
    return null;
  }
};

const buildSupportLinksByQuestion = (question = "") => {
  const q = compactQuery(question);
  const links = [];
  if (/\b(payment|razorpay|checkout|upi|card)\b/.test(q)) {
    links.push({ label: "Browse Courses", url: "/courses", type: "course" });
    links.push({ label: "Open Account", url: "/account", type: "account" });
  }
  if (/\b(progress|continue|lecture|video|study)\b/.test(q)) {
    links.push({ label: "Open Progress Dashboard", url: "/progress", type: "progress" });
    links.push({ label: "My Courses", url: "/courses", type: "course" });
  }
  if (/\b(403|forbidden|401|unauthorized|token|login)\b/.test(q)) {
    links.push({ label: "Open Login", url: "/login", type: "account" });
    links.push({ label: "Open Account", url: "/account", type: "account" });
  }
  if (/\b(test|quiz|mcq|assessment)\b/.test(q)) {
    links.push({ label: "Open Test Domains", url: "/test", type: "test" });
  }
  if (/\b(help|support|callback|contact|human|call)\b/.test(q)) {
    links.push({ label: "Request Callback", url: "/reviews", type: "support" });
  }
  return dedupeLinks(links).slice(0, 6);
};

const getDefaultLinksForIntent = (intent, userContext) => {
  if (intent === CHAT_INTENTS.COURSE_DISCOVERY) {
    return dedupeLinks([
      { label: "Browse All Courses", url: "/courses", type: "course" },
      { label: "Open Roadmaps", url: "/roadmap/Web%20Development", type: "course" },
    ]);
  }
  if (intent === CHAT_INTENTS.TEST_DISCOVERY) {
    return dedupeLinks([
      { label: "Open Test Domains", url: "/test", type: "test" },
      { label: "Open Progress Dashboard", url: "/progress", type: "progress" },
    ]);
  }
  if (intent === CHAT_INTENTS.PAYMENT_SUPPORT) {
    return dedupeLinks([
      { label: "Browse Courses", url: "/courses", type: "course" },
      { label: "Open Account", url: "/account", type: "account" },
    ]);
  }
  if (intent === CHAT_INTENTS.PROGRESS_HELP) {
    const links = [
      { label: "Open Progress Dashboard", url: "/progress", type: "progress" },
      { label: "Open Account", url: "/account", type: "account" },
    ];
    if (userContext?.subscribedCourses?.[0]?._id) {
      links.unshift({
        label: `Continue ${userContext.subscribedCourses[0].title}`,
        url: `/course/study/${userContext.subscribedCourses[0]._id}`,
        type: "course",
      });
    }
    return dedupeLinks(links);
  }
  return dedupeLinks([
    { label: "Browse All Courses", url: "/courses", type: "course" },
    { label: "Open Test Domains", url: "/test", type: "test" },
    { label: "Request Callback", url: "/reviews", type: "support" },
  ]);
};

const findSupportPlaybookMatch = (question, intent) => {
  const q = compactQuery(question);
  let best = null;
  let bestScore = 0;
  for (const item of CHAT_SUPPORT_PLAYBOOK) {
    let score = item.intent === intent ? 0.5 : 0;
    for (const keyword of item.keywords) {
      if (q.includes(keyword)) score += 1;
    }
    if (score > bestScore) {
      best = item;
      bestScore = score;
    }
  }
  if (!best || bestScore < 2) return null;
  return { ...best, score: bestScore };
};

const buildSuggestedQuestions = ({ intent, question, toolContext, userContext }) => {
  const defaults = CHAT_SUGGESTED_QUESTIONS[intent] || CHAT_SUGGESTED_QUESTIONS[CHAT_INTENTS.GENERAL_SUPPORT];
  const suggestions = [...defaults];
  if (
    intent === CHAT_INTENTS.COURSE_DISCOVERY &&
    Array.isArray(toolContext?.courses) &&
    toolContext.courses[0]?.title
  ) {
    suggestions.unshift(`Give me a roadmap for ${toolContext.courses[0].title}`);
  }
  if (intent === CHAT_INTENTS.TEST_DISCOVERY) {
    suggestions.unshift(`Create a test strategy for ${String(question || "").trim() || "this topic"}`);
  }
  if (intent === CHAT_INTENTS.TEST_DISCOVERY && userContext?.stats?.testsAttempted > 0) {
    suggestions.unshift("Analyze my recent test weak areas");
  }
  if (intent === CHAT_INTENTS.PROGRESS_HELP && (userContext?.subscribedCourses || []).length > 0) {
    suggestions.unshift("Help me continue my purchased courses effectively");
  }
  return [...new Set(suggestions.map((x) => String(x).trim()).filter(Boolean))].slice(0, 3);
};

const buildFallbackAgentAnswer = ({ question, intent, playbookMatch, userContext }) => {
  if (playbookMatch?.answer) return playbookMatch.answer;
  if (intent === CHAT_INTENTS.COURSE_DISCOVERY) {
    const personalized = userContext?.name ? `${userContext.name}, ` : "";
    return `${personalized}I can help you choose the best SmartLearn courses for "${question}".\nStart with one core course, follow roadmap, and practice weekly with projects.\nUse the course links below to begin immediately.`;
  }
  if (intent === CHAT_INTENTS.TEST_DISCOVERY) {
    return `For "${question}", take one focused test first, review mistakes, then retake with higher difficulty.\nTrack score from Progress page and repeat weak topics.\nUse the suggested test links below.`;
  }
  if (intent === CHAT_INTENTS.PROGRESS_HELP) {
    return "Open Progress to continue your latest course and track completion.\nIf lectures are missing, refresh and reopen the course after a short wait.\nIf it still fails, use Request Call Back and share the course name.";
  }
  if (intent === CHAT_INTENTS.PAYMENT_SUPPORT) {
    return "For payment issues, retry checkout from the same course page.\nIn test mode, prefer UPI or domestic test card.\nIf it still fails, use Request Call Back and share the course name.";
  }
  return "I can help with courses, tests, roadmap, payments, and progress.\nTell me your goal (for example: become React developer in 3 months) and I will give a focused plan.";
};

const sanitizeChatAnswer = (rawText = "") => {
  const internalDetailPatterns = [
    /\badmin\b/i,
    /\bbackend\b/i,
    /\bdatabase\b/i,
    /\bserver logs?\b/i,
    /\bapi\b/i,
    /\bendpoint\b/i,
    /\bpayload\b/i,
    /\bjson\b/i,
    /\bmodel response\b/i,
    /\btoken pressure\b/i,
    /\bpaise\b/i,
  ];

  const text = String(rawText || "")
    .replace(/\r/g, "")
    .replace(/[ \t]+\n/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
  if (!text) return "";

  const lines = text
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean)
    .filter((line) => !internalDetailPatterns.some((pattern) => pattern.test(line)));
  const uniqueLines = [];
  const seen = new Set();
  for (const line of lines) {
    const key = line.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    uniqueLines.push(line);
  }

  const compact = uniqueLines.join("\n");
  return compact.length > 900 ? `${compact.slice(0, 900).trim()}...` : compact;
};

const callGroq = async ({ messages, temperature = 0.2, max_tokens = 260 }) => {
  const model = process.env.GROQ_MODEL || "llama-3.1-8b-instant";
  const response = await axios.post(
    GROQ_CHAT_COMPLETIONS_URL,
    {
      model,
      messages,
      max_tokens,
      temperature,
    },
    {
      headers: {
        Authorization: `Bearer ${process.env.GROQ_API_KEY}`,
        "Content-Type": "application/json",
      },
      timeout: 20000,
    }
  );
  return response?.data?.choices?.[0]?.message?.content || "";
};

const classifyIntentWithGroq = async ({ question, safeHistory }) => {
  const prompt = [
    {
      role: "system",
      content:
        "Classify user intent for SmartLearn. Return ONLY one token from: course_discovery, test_discovery, progress_help, payment_support, general_support.",
    },
    ...safeHistory,
    { role: "user", content: question },
  ];
  const output = (await callGroq({ messages: prompt, temperature: 0, max_tokens: 20 }))
    .trim()
    .toLowerCase();
  const valid = Object.values(CHAT_INTENTS);
  return valid.includes(output) ? output : inferIntentHeuristic(question);
};

const toolFindTopCourses = async () => {
  const courses = await Courses.find({ isTopCourse: true })
    .sort({ topPriority: 1, createdAt: -1 })
    .limit(4)
    .select("_id title stream category subjects level");
  return courses;
};

const toolFindCourses = async (queryText) => {
  const q = compactQuery(queryText);
  const terms = q
    .split(" ")
    .filter(
      (t) =>
        t.length > 2 &&
        ![
          "course",
          "courses",
          "show",
          "list",
          "learn",
          "for",
          "about",
          "in",
          "smartlearn",
        ].includes(t)
    )
    .slice(0, 5);
  const regex = terms.length > 0 ? new RegExp(terms.join("|"), "i") : null;
  const filter = regex
    ? {
        $or: [
          { title: regex },
          { category: regex },
          { stream: regex },
          { subjects: regex },
          { description: regex },
        ],
      }
    : {};
  return Courses.find(filter)
    .sort({ isTopCourse: -1, topPriority: 1, createdAt: -1 })
    .limit(6)
    .select("_id title stream category subjects level");
};

const buildAgentToolContext = async ({ intent, question, userContext }) => {
  const toolsUsed = [];
  const links = [];
  const context = { courses: [], testDomains: [], topCourses: [], user: userContext || null };

  if (intent === CHAT_INTENTS.COURSE_DISCOVERY) {
    toolsUsed.push("toolFindCourses");
    const courses = await toolFindCourses(question);
    const topCourses = await toolFindTopCourses();
    context.courses = courses;
    context.topCourses = topCourses;
    links.push(
      ...courses.map((course) => ({
        label: course.title,
        url: `/course/${course._id}`,
        type: "course",
      }))
    );
    links.push({ label: "Browse All Courses", url: "/courses", type: "course" });
  }

  if (intent === CHAT_INTENTS.TEST_DISCOVERY) {
    toolsUsed.push("toolBuildTestLinks");
    const testLinks = buildTestLinks(question);
    context.testDomains = testLinks.map((x) => x.label);
    links.push(...testLinks);
  }

  if (intent === CHAT_INTENTS.PROGRESS_HELP) {
    toolsUsed.push("toolProgressRoutes");
    links.push({ label: "Open Progress Dashboard", url: "/progress", type: "progress" });
    links.push({ label: "Open Account", url: "/account", type: "account" });
  }

  if (intent === CHAT_INTENTS.PAYMENT_SUPPORT) {
    toolsUsed.push("toolPaymentRoutes");
    links.push({ label: "Browse Courses", url: "/courses", type: "course" });
    links.push({ label: "Open Account", url: "/account", type: "account" });
  }

  if (userContext?.subscribedCourses?.[0]) {
    const firstCourse = userContext.subscribedCourses[0];
    links.push({
      label: `Continue ${firstCourse.title}`,
      url: `/course/study/${firstCourse._id}`,
      type: "course",
    });
  }

  const uniqueLinks = dedupeLinks(links);
  return { toolsUsed, context, links: ensureCoursesEntryLink(uniqueLinks).slice(0, 8) };
};

const composeAgentAnswer = async ({ question, safeHistory, intent, toolContext, playbookMatch, userContext }) => {
  const system = {
    role: "system",
    content:
      "You are SmartLearn support assistant.\nRules:\n1) Answer only about SmartLearn platform use cases.\n2) Be concrete, short, and non-repetitive.\n3) Do not add motivational or generic filler.\n4) Do not invent unavailable data.\n5) Never mention admin panels, backend internals, APIs, server logs, or technical implementation details.\n6) Keep response under 120 words.\nOutput format (plain text only):\nSummary: <one line>\nSteps:\n1. ...\n2. ...\n3. ...",
  };
  const toolMessage = {
    role: "system",
    content: `Agent intent: ${intent}\nTool context JSON:\n${JSON.stringify(toolContext).slice(
      0,
      3000
    )}\nUser context JSON:\n${JSON.stringify(userContext || {}).slice(0, 1500)}\nPlaybook hint:\n${playbookMatch?.answer || "none"}`,
  };
  const user = { role: "user", content: question };
  let answer = await callGroq({
    messages: [system, toolMessage, ...safeHistory, user],
    temperature: 0.1,
    max_tokens: 260,
  });
  answer = sanitizeChatAnswer(answer);
  return answer || "Summary: I can help with SmartLearn courses, tests, payments, and progress.\nSteps:\n1. Open the most relevant section using the links.\n2. Complete one focused action.\n3. Share what failed if you need deeper help.";
};

const extractJSONObjectString = (text = "") => {
  const clean = String(text || "")
    .replace(/^```json\s*/i, "")
    .replace(/^```\s*/i, "")
    .replace(/\s*```$/i, "")
    .trim();
  const start = clean.indexOf("{");
  const end = clean.lastIndexOf("}");
  if (start === -1 || end === -1 || end <= start) return null;
  return clean.slice(start, end + 1);
};

const getLanguageProfile = (topicRaw = "") => {
  const raw = String(topicRaw || "").toLowerCase().trim();
  const compact = compactQuery(topicRaw);
  const tokens = compact.split(" ").filter(Boolean);

  const match = (aliases) => aliases.some((alias) => raw.includes(alias) || compact.includes(alias));
  const hasToken = (token) => tokens.includes(token);

  if (match(["c++", "cpp", "c plus plus", "cplusplus"])) {
    return { canonical: "C++", key: "cpp" };
  }
  if (match(["c#", "c sharp", "csharp"])) {
    return { canonical: "C#", key: "csharp" };
  }
  if (match(["javascript"]) || hasToken("js")) {
    return { canonical: "JavaScript", key: "javascript" };
  }
  if (match(["typescript"]) || hasToken("ts")) {
    return { canonical: "TypeScript", key: "typescript" };
  }
  if (match(["python"]) || hasToken("py")) {
    return { canonical: "Python", key: "python" };
  }
  if (match(["java"]) && !match(["javascript"])) {
    return { canonical: "Java", key: "java" };
  }
  if (match(["golang", "go language"]) || hasToken("go")) {
    return { canonical: "Go", key: "go" };
  }
  if (match(["rust"])) {
    return { canonical: "Rust", key: "rust" };
  }
  if (match(["swift"])) {
    return { canonical: "Swift", key: "swift" };
  }
  if (match(["kotlin"])) {
    return { canonical: "Kotlin", key: "kotlin" };
  }
  if (match(["php"])) {
    return { canonical: "PHP", key: "php" };
  }
  if (match(["ruby"])) {
    return { canonical: "Ruby", key: "ruby" };
  }
  if (match(["c language", "c programming"]) || raw === "c") {
    return { canonical: "C", key: "c" };
  }

  return null;
};

const buildLanguageRoadmap = ({ topic, matchedCourses, profile }) => {
  const picks = matchedCourses.slice(0, 4);

  const baseTopics = {
    phase1: [
      { name: "Syntax + types", importance: "IMPORTANT", details: "Learn variables, primitive types, and basic language syntax." },
      { name: "Operators + control flow", details: "Master branching, loops, and conditionals." },
      { name: "Functions + scope", details: "Write functions, understand scope, and pass arguments safely." },
      { name: "Input/Output basics", details: "Read input, write output, and handle basic file I/O." },
      { name: "Tooling + build/run", details: "Set up the compiler/interpreter, run locally, and use a debugger." },
      { name: "Code style", details: "Follow naming, formatting, and basic conventions." },
    ],
    phase2: [
      { name: "Arrays + strings", importance: "IMPORTANT", details: "Work with indexed collections, string operations, and memory layout." },
      { name: "Pointers/references", details: "Understand references, addresses, and safe data access (if applicable)." },
      { name: "OOP fundamentals", importance: "IMPORTANT", details: "Classes, objects, encapsulation, inheritance, and polymorphism." },
      { name: "Error handling", details: "Use exceptions or error codes consistently." },
      { name: "Modules/packages", details: "Organize code across files and reuse components." },
      { name: "Data structures basics", details: "Lists, stacks, queues, and hash maps." },
    ],
    phase3: [
      { name: "Standard library collections", importance: "IMPORTANT", details: "Use built-in containers, maps, sets, and iterators." },
      { name: "Algorithms + complexity", details: "Sorting, searching, and Big-O reasoning." },
      { name: "File handling + serialization", details: "Read/write files and store structured data." },
      { name: "Regex + text processing", details: "Parse and validate text with patterns." },
      { name: "Date/time utilities", details: "Work with timestamps, formatting, and time zones." },
      { name: "CLI utilities", details: "Build basic command-line interfaces and argument parsing." },
    ],
    phase4: [
      { name: "Testing fundamentals", importance: "IMPORTANT", details: "Write unit tests and integration tests for core logic." },
      { name: "Debugging + logging", details: "Trace issues with logs and debugger tools." },
      { name: "Design patterns", details: "Apply common patterns like factory, strategy, and observer." },
      { name: "Documentation", details: "Write README and API docs for maintainability." },
      { name: "Dependency management", details: "Manage packages and versions responsibly." },
      { name: "Code review habits", details: "Refactor for readability and correctness." },
    ],
    phase5: [
      { name: "Performance profiling", importance: "IMPORTANT", details: "Measure hot paths and optimize bottlenecks." },
      { name: "Memory optimization", details: "Reduce allocations and manage resource lifecycles." },
      { name: "Concurrency/async", details: "Threads, async I/O, and synchronization primitives." },
      { name: "Networking basics", details: "HTTP clients, sockets, and API integration." },
      { name: "Security basics", details: "Input validation and safe defaults." },
      { name: "Packaging + deployment", details: "Ship a runnable build or distributable artifact." },
    ],
  };

  const languageExtras = {
    cpp: {
      phase2: [
        { name: "Pointers + references", importance: "IMPORTANT", details: "Stack vs heap, references, and pointer safety." },
        { name: "RAII + object lifetime", details: "Understand constructors, destructors, and resource ownership." },
      ],
      phase3: [
        { name: "STL containers", importance: "IMPORTANT", details: "vector, map, unordered_map, list, and their tradeoffs." },
        { name: "Templates + generics", details: "Write reusable code with templates and type inference." },
      ],
      phase5: [
        { name: "Move semantics", details: "Rule of 3/5/0, rvalue references, and efficient transfers." },
        { name: "CMake basics", details: "Structure builds and manage dependencies." },
      ],
      pitfalls: [
        "Undefined behavior from invalid memory access",
        "Mixing raw pointers and ownership assumptions",
      ],
    },
    java: {
      phase1: [{ name: "JVM + JDK setup", details: "Install JDK, configure PATH, and understand JVM basics." }],
      phase3: [
        { name: "Collections framework", importance: "IMPORTANT", details: "List, Set, Map, and performance tradeoffs." },
        { name: "Streams + lambdas", details: "Functional operations and clean pipelines." },
      ],
      phase5: [{ name: "JVM performance + GC", details: "Understand garbage collection and performance tuning." }],
    },
    python: {
      phase1: [{ name: "Virtual environments", details: "Use venv/pyenv and manage dependencies cleanly." }],
      phase3: [{ name: "Generators + iterators", details: "Lazy evaluation and efficient data handling." }],
      phase5: [{ name: "Asyncio basics", details: "Async/await and concurrency patterns." }],
    },
    javascript: {
      phase2: [{ name: "Functions + closures", importance: "IMPORTANT", details: "Scope, closures, and higher-order functions." }],
      phase3: [{ name: "Promises + async/await", details: "Handle async data and error flows." }],
      phase5: [{ name: "Event loop", details: "Task vs microtask queues and performance impact." }],
    },
    typescript: {
      phase1: [{ name: "Type system", importance: "IMPORTANT", details: "Basic types, unions, intersections, and inference." }],
      phase3: [{ name: "Generics + utility types", details: "Build reusable typed APIs." }],
      phase4: [{ name: "TS config + build", details: "tsconfig, strict modes, and build output." }],
    },
    go: {
      phase2: [{ name: "Interfaces", details: "Implicit interfaces and composition." }],
      phase5: [
        { name: "Goroutines + channels", importance: "IMPORTANT", details: "Concurrency patterns and synchronization." },
        { name: "Go modules", details: "Dependency management and module layout." },
      ],
    },
    rust: {
      phase2: [
        { name: "Ownership + borrowing", importance: "IMPORTANT", details: "Move, borrow, and lifetimes to ensure memory safety." },
        { name: "Traits + generics", details: "Build reusable abstractions." },
      ],
      phase4: [{ name: "Cargo + crates", details: "Project structure and dependency management." }],
    },
    csharp: {
      phase3: [{ name: "LINQ", importance: "IMPORTANT", details: "Query collections with expressive syntax." }],
      phase5: [{ name: "async/await", details: "Non-blocking I/O and task-based concurrency." }],
    },
  };

  const extras = languageExtras[profile?.key || ""] || {};

  const mergeTopics = (base, extra = [], max = 8) => {
    const seen = new Set();
    const out = [];
    const add = (item) => {
      if (!item || !item.name) return;
      const key = String(item.name).toLowerCase();
      if (seen.has(key)) return;
      seen.add(key);
      out.push(item);
    };
    extra.forEach(add);
    base.forEach(add);
    return out.slice(0, max);
  };

  const phasePitfalls = (base, extra = []) => [...extra, ...base].slice(0, 5);

  return {
    topic,
    summary: `A comprehensive, senior-level ${topic} roadmap covering language fundamentals, core CS concepts, tooling, performance, and production readiness.`,
    totalDurationWeeks: 16,
    phases: [
      {
        title: "Foundations + Tooling",
        durationWeeks: 3,
        phaseDescription: `Learn the syntax, core types, and toolchain for ${topic}. Establish a clean, repeatable workflow for writing and running code.`,
        topics: mergeTopics(baseTopics.phase1, extras.phase1),
        projects: [
          { name: "CLI Basics", explanation: `Build a small ${topic} CLI that reads input, processes it, and outputs results.`, techStack: [topic] },
          { name: "Mini Utilities Pack", explanation: "Create 3-4 small utilities (calculator, file parser, formatter) to practice basics.", techStack: [topic] },
        ],
        commonPitfalls: phasePitfalls(
          ["Skipping debugging practice", "Inconsistent code style", "Not understanding basic types"],
          extras.pitfalls
        ),
        checkpoints: ["Run and debug a simple app", "Explain variables, types, and scope", "Use the toolchain confidently"],
      },
      {
        title: "Core CS + OOP",
        durationWeeks: 4,
        phaseDescription: `Master arrays, strings, OOP, and fundamental data structures. Build confidence in structuring code cleanly.`,
        topics: mergeTopics(baseTopics.phase2, extras.phase2),
        projects: [
          { name: "Library Manager", explanation: "Build a CRUD console app using classes, validation, and structured data.", techStack: [topic] },
          { name: "DSA Practice Set", explanation: "Implement arrays, strings, stacks, and queues with tests.", techStack: [topic, "Tests"] },
        ],
        commonPitfalls: phasePitfalls(
          ["Tight coupling in OOP design", "Ignoring edge cases", "Weak understanding of memory/data flow"],
          extras.pitfalls
        ),
        checkpoints: ["Implement OOP with clean design", "Solve 10 array/string problems", "Explain memory/layout tradeoffs"],
      },
      {
        title: "Standard Library + Algorithms",
        durationWeeks: 3,
        phaseDescription: `Use the standard library effectively and apply common algorithms with proper complexity reasoning.`,
        topics: mergeTopics(baseTopics.phase3, extras.phase3),
        projects: [
          { name: "Log Analyzer", explanation: "Parse large text files, filter results, and generate reports.", techStack: [topic] },
          { name: "Data Processor", explanation: "Implement sorting, searching, and transformation pipelines.", techStack: [topic] },
        ],
        commonPitfalls: ["Reinventing standard library features", "Ignoring algorithmic complexity", "Poor error handling"],
        checkpoints: ["Use built-in collections correctly", "Explain time complexity of key operations", "Process files safely"],
      },
      {
        title: "Engineering Practices",
        durationWeeks: 3,
        phaseDescription: "Build reliable, testable code and follow engineering best practices expected in teams.",
        topics: mergeTopics(baseTopics.phase4, extras.phase4),
        projects: [
          { name: "Testing Upgrade", explanation: "Add unit and integration tests to previous projects.", techStack: [topic, "Tests"] },
          { name: "Refactor + Docs", explanation: "Refactor for readability, document APIs, and improve structure.", techStack: [topic] },
        ],
        commonPitfalls: ["Skipping tests", "Poor documentation", "Unclear module boundaries"],
        checkpoints: ["Write tests for core flows", "Document API usage", "Explain design decisions"],
      },
      {
        title: "Performance + Production",
        durationWeeks: 3,
        phaseDescription: `Optimize performance, handle concurrency safely, and prepare production-ready deliverables.`,
        topics: mergeTopics(baseTopics.phase5, extras.phase5),
        projects: [
          { name: "Performance Pass", explanation: "Profile and optimize a real project, documenting improvements.", techStack: [topic] },
          { name: "Capstone Project", explanation: "Build a production-style application with deployment notes and tests.", techStack: [topic, "Deploy"] },
        ],
        commonPitfalls: ["Premature optimization", "Unsafe concurrency", "Shipping without validation"],
        checkpoints: ["Demonstrate measurable optimizations", "Ship a deployed or packaged app", "Explain tradeoffs clearly"],
      },
    ],
    recommendedCourseIndexes: picks.map((_, idx) => idx),
    learningTips: [
      "Practice daily with small, focused exercises.",
      "Solve 8-12 DSA problems per week alongside language study.",
      "Keep a running notes doc of key concepts and mistakes.",
      "Build at least one project per phase.",
      "Explain concepts aloud to validate understanding.",
      "Use checkpoints as your real progress measure.",
    ],
  };
};

const buildRoadmapFallback = ({ topic, matchedCourses }) => {
  const picks = matchedCourses.slice(0, 4);
  return {
    topic,
    summary: `A practical, senior-level roadmap to master ${topic} with weekly progression, concrete outcomes, and production-style projects.`,
    totalDurationWeeks: 16,
    phases: [
      {
        title: "Foundations + Setup",
        durationWeeks: 3,
        phaseDescription: `Build strong fundamentals for ${topic} and establish a reliable development workflow.`,
        topics: [
          { name: "Core concepts", importance: "IMPORTANT", details: "Understand the primary syntax, data flow, and fundamental patterns." },
          { name: "Tooling + environment", details: "Install required tooling, configure linters/formatters, and set up a clean repo." },
          { name: "Version control", details: "Use Git effectively with branching, commits, and basic collaboration workflows." },
        ],
        projects: [
          { name: "Starter mini-project", explanation: `Build a small but complete ${topic} app that reads, transforms, and presents data.`, techStack: [topic, "Git"] }
        ],
        commonPitfalls: ["Skipping basics", "Copying without understanding", "No consistent practice routine"],
        checkpoints: ["Explain core concepts without notes", "Ship a small working app"],
      },
      {
        title: "Core Skills + Patterns",
        durationWeeks: 5,
        phaseDescription: `Develop intermediate implementation skills, structure code cleanly, and handle common scenarios.`,
        topics: [
          { name: "Common patterns", importance: "IMPORTANT", details: "Learn patterns and conventions used in real-world codebases." },
          { name: "State + data flow", details: "Manage data predictably, handle side effects, and reason about flow." },
          { name: "Debugging + profiling", details: "Trace issues, use tooling, and measure performance bottlenecks." },
          { name: "Testing basics", details: "Write unit/integration tests for core workflows." },
        ],
        projects: [
          { name: "Feature-rich app", explanation: `Create a multi-feature ${topic} project with CRUD, validation, and error states.`, techStack: [topic] },
          { name: "Testing upgrade", explanation: "Add tests that validate critical flows and edge cases.", techStack: ["Tests", topic] },
        ],
        commonPitfalls: ["Ignoring edge cases", "Tightly coupled modules", "Skipping tests"],
        checkpoints: ["Complete 2 real-world workflows", "Refactor one module for clarity"],
      },
      {
        title: "Advanced Concepts + Quality",
        durationWeeks: 4,
        phaseDescription: `Move to advanced concepts, architecture choices, and quality practices expected in teams.`,
        topics: [
          { name: "Architecture + scalability", importance: "IMPORTANT", details: "Choose modules, boundaries, and tradeoffs for maintainability." },
          { name: "Performance optimization", details: "Identify and fix slow paths and heavy operations." },
          { name: "Security + reliability", details: "Handle validation, safe defaults, and error recovery." },
        ],
        projects: [
          { name: "Optimization pass", explanation: `Improve performance and stability of the previous project with measurable wins.`, techStack: [topic] },
        ],
        commonPitfalls: ["Over-engineering", "Premature optimization", "Ignoring security basics"],
        checkpoints: ["Document tradeoffs", "Show performance improvements"],
      },
      {
        title: "Capstone + Career Readiness",
        durationWeeks: 4,
        phaseDescription: `Build a production-ready portfolio project and prepare for interviews or practical assessments.`,
        topics: [
          { name: "System design thinking", details: "Explain architecture, data flow, and scaling decisions clearly." },
          { name: "Deployment + monitoring", details: "Ship, observe, and troubleshoot a live app." },
          { name: "Interview prep", importance: "IMPORTANT", details: "Practice common questions and build concise explanations." },
        ],
        projects: [
          { name: "End-to-end capstone", explanation: `Build a production-style ${topic} capstone with documentation, tests, and deployment.`, techStack: [topic, "Deploy"] },
        ],
        commonPitfalls: ["Shipping without docs", "Skipping deployment practice"],
        checkpoints: ["Complete capstone", "Write README + deployment guide"],
      },
    ],
    recommendedCourseIndexes: picks.map((_, idx) => idx),
    learningTips: [
      "Practice daily in short focused sessions.",
      "Build at least one project per phase.",
      "Review weak areas every week.",
      "Write brief weekly retrospectives of what you learned.",
      "Explain concepts aloud to solidify understanding.",
      "Measure progress using checkpoints.",
    ],
  };
};

const computeCourseRelevance = (course, topic) => {
  const q = compactQuery(topic);
  const terms = q.split(" ").filter((t) => t.length > 1);
  const title = String(course.title || "").toLowerCase();
  const description = String(course.description || "").toLowerCase();
  const stream = String(course.stream || course.category || "").toLowerCase();
  const subjects = Array.isArray(course.subjects)
    ? course.subjects.join(" ").toLowerCase()
    : "";

  let score = 0;
  for (const term of terms) {
    if (title.includes(term)) score += 6;
    if (subjects.includes(term)) score += 4;
    if (stream.includes(term)) score += 3;
    if (description.includes(term)) score += 1;
  }

  if (course.isTopCourse) score += 1.5;
  if (Number(course.topPriority || 0) > 0) {
    score += Math.max(0, 1 - Number(course.topPriority || 0) * 0.05);
  }
  return score;
};

const normalizeTextItem = (value) => {
  if (value === null || value === undefined) return "";
  if (typeof value === "string" || typeof value === "number" || typeof value === "boolean") {
    return String(value).trim();
  }
  if (typeof value === "object") {
    const title = typeof value.title === "string" ? value.title.trim() : "";
    const name = typeof value.name === "string" ? value.name.trim() : "";
    const description =
      typeof value.description === "string" ? value.description.trim() : "";
    const link = typeof value.link === "string" ? value.link.trim() : "";
    const primary = title || name;
    if (primary && description) return `${primary}: ${description}`;
    if (primary && link) return `${primary} (${link})`;
    if (primary) return primary;
    if (description) return description;
    if (link) return link;
  }
  return "";
};

const normalizeTextList = (list, limit = 6) => {
  if (!Array.isArray(list)) return [];
  return list
    .map((item) => normalizeTextItem(item))
    .filter(Boolean)
    .slice(0, limit);
};

const normalizeRoadmapPhases = (rawPhases = []) => {
  const normalizeTopicItem = (item) => {
    if (item === null || item === undefined) return null;
    if (typeof item === "string" || typeof item === "number" || typeof item === "boolean") {
      return { name: String(item).trim() };
    }
    if (typeof item === "object") {
      const name =
        (typeof item.name === "string" && item.name.trim()) ||
        (typeof item.title === "string" && item.title.trim()) ||
        (typeof item.topic === "string" && item.topic.trim()) ||
        "";
      const details =
        (typeof item.details === "string" && item.details.trim()) ||
        (typeof item.description === "string" && item.description.trim()) ||
        "";
      const importance =
        typeof item.importance === "string" && item.importance.trim()
          ? item.importance.trim().toUpperCase()
          : "";
      if (!name && !details) return null;
      return { name: name || details, details, importance };
    }
    return null;
  };

  const normalizeProjectItem = (item) => {
    if (item === null || item === undefined) return null;
    if (typeof item === "string" || typeof item === "number" || typeof item === "boolean") {
      return String(item).trim();
    }
    if (typeof item === "object") {
      const name =
        (typeof item.name === "string" && item.name.trim()) ||
        (typeof item.title === "string" && item.title.trim()) ||
        "";
      const explanation =
        (typeof item.explanation === "string" && item.explanation.trim()) ||
        (typeof item.description === "string" && item.description.trim()) ||
        "";
      const techStack = Array.isArray(item.techStack)
        ? item.techStack.map((t) => String(t).trim()).filter(Boolean).slice(0, 6)
        : [];
      if (!name && !explanation) return null;
      return { name: name || "Project", explanation, techStack };
    }
    return null;
  };

  let runningWeek = 1;
  const phases = [];
  for (let i = 0; i < rawPhases.length; i += 1) {
    const phase = rawPhases[i] || {};
    const durationWeeks = Math.max(1, Number.parseInt(phase.durationWeeks, 10) || 2);
    const weekStart = runningWeek;
    const weekEnd = runningWeek + durationWeeks - 1;
    runningWeek = weekEnd + 1;

    const phaseDescription =
      normalizeTextItem(phase.phaseDescription) ||
      normalizeTextItem(phase.description) ||
      normalizeTextItem(phase.focus);

    const derivedTopics = Array.isArray(phase.topics)
      ? phase.topics.map(normalizeTopicItem).filter(Boolean).slice(0, 8)
      : [];

    const derivedProjects = Array.isArray(phase.projects)
      ? phase.projects.map(normalizeProjectItem).filter(Boolean).slice(0, 6)
      : [];

    const commonPitfalls = normalizeTextList(phase.commonPitfalls, 6);
    const checkpoints = normalizeTextList(phase.checkpoints, 8);

    const goals = normalizeTextList(phase.goals, 6);
    const skills = normalizeTextList(phase.skills, 8);
    const outcomes = normalizeTextList(phase.outcomes, 6);
    const resources = normalizeTextList(phase.resources, 6);

    const fallbackTopics = derivedTopics.length
      ? derivedTopics
      : [...skills, ...goals].slice(0, 8).map((t) => ({ name: t }));

    phases.push({
      title: String(phase.title || `Phase ${i + 1}`).trim(),
      focus: normalizeTextItem(phase.focus),
      durationWeeks,
      weekStart,
      weekEnd,
      phaseDescription,
      topics: fallbackTopics,
      projects: derivedProjects.length ? derivedProjects : normalizeTextList(phase.projects, 6),
      commonPitfalls,
      checkpoints,
      goals,
      skills,
      outcomes,
      resources,
    });
  }
  return phases;
};

const INTERVIEW_MIN_QUESTIONS = 5;
const INTERVIEW_MAX_QUESTIONS = 7;
const INTERVIEW_TARGET_QUESTIONS = 6;
const INTERVIEW_ALLOWED_DIFFICULTY = new Set(["beginner", "intermediate", "advanced"]);

const getInterviewDifficulty = (questionNumber) => {
  const q = Number(questionNumber || 1);
  if (q <= 2) return "beginner";
  if (q <= 4) return "intermediate";
  return "advanced";
};

const sanitizeInterviewHistory = (history = []) => {
  if (!Array.isArray(history)) return [];
  return history
    .slice(-12)
    .map((turn) => ({
      question: String(turn?.question || "").trim().slice(0, 500),
      answer: String(turn?.answer || "").trim().slice(0, 1800),
      difficulty: INTERVIEW_ALLOWED_DIFFICULTY.has(String(turn?.difficulty || "").toLowerCase())
        ? String(turn?.difficulty || "").toLowerCase()
        : "beginner",
      evaluation: {
        score: String(turn?.evaluation?.score || "").replace(/[^\d.]/g, "").slice(0, 4),
        strengths: String(turn?.evaluation?.strengths || "").trim().slice(0, 500),
        weaknesses: String(turn?.evaluation?.weaknesses || "").trim().slice(0, 500),
        feedback: String(turn?.evaluation?.feedback || "").trim().slice(0, 500),
      },
    }))
    .filter((turn) => turn.question && turn.answer);
};

const extractResumeSkills = (resumeText = "") => {
  const text = compactQuery(resumeText);
  const matched = POPULAR_SEARCH_TOPICS.filter((topic) =>
    text.includes(compactQuery(topic))
  );
  if (matched.length) return matched.slice(0, 8);

  const rawTokens = String(resumeText || "")
    .split(/[\n,|/]/g)
    .map((x) => x.trim())
    .filter((x) => x.length >= 2 && x.length <= 30);
  const unique = [];
  const seen = new Set();
  for (const token of rawTokens) {
    const normalized = token.toLowerCase();
    if (seen.has(normalized)) continue;
    seen.add(normalized);
    unique.push(token);
    if (unique.length >= 8) break;
  }
  return unique;
};

const normalizeInterviewEvaluation = (value = {}) => {
  const scoreRaw = String(value?.score ?? "").replace(/[^\d.]/g, "");
  const scoreNum = Number.parseFloat(scoreRaw);
  const score = Number.isFinite(scoreNum)
    ? String(Math.min(10, Math.max(1, Math.round(scoreNum))))
    : "5";

  return {
    score,
    strengths: String(value?.strengths || "").trim() || "Good attempt with relevant points.",
    weaknesses: String(value?.weaknesses || "").trim() || "Needs deeper technical details and real examples.",
    feedback: String(value?.feedback || "").trim() || "Add architecture choices, tradeoffs, and concrete implementation details.",
  };
};

const assessAnswerQuality = (answer = "") => {
  const text = String(answer || "").trim();
  const lower = text.toLowerCase();
  const words = text ? text.split(/\s+/).filter(Boolean) : [];
  const wordCount = words.length;
  const charCount = text.length;
  const reasons = [];
  let maxScore = 10;

  if (!text) {
    maxScore = 1;
    reasons.push("No answer provided.");
  } else if (wordCount < 8 || charCount < 40) {
    maxScore = 2;
    reasons.push("Answer is too short.");
  } else if (wordCount < 20 || charCount < 120) {
    maxScore = 4;
    reasons.push("Answer lacks detail.");
  } else if (wordCount < 40 || charCount < 220) {
    maxScore = 6;
    reasons.push("Needs more depth and concrete examples.");
  }

  if (/(don't know|dont know|no idea|not sure|skip|pass|idk)\b/.test(lower)) {
    maxScore = Math.min(maxScore, 3);
    reasons.push("Candidate indicated uncertainty.");
  }

  return { maxScore, reasons, wordCount, charCount };
};

const applyAnswerQualityToEvaluation = (evaluation, answer) => {
  const quality = assessAnswerQuality(answer);
  const scoreNum = Number.parseFloat(String(evaluation?.score || "").replace(/[^\d.]/g, ""));
  const baseScore = Number.isFinite(scoreNum) ? Math.round(scoreNum) : 5;
  const capped = Math.min(Math.max(1, baseScore), quality.maxScore);

  const updated = {
    ...evaluation,
    score: String(capped),
  };

  if (quality.reasons.length > 0) {
    const suffix = quality.reasons.join(" ");
    updated.weaknesses = `${String(updated.weaknesses || "").trim()} ${suffix}`.trim();
  }

  return { evaluation: updated, quality };
};

const normalizeInterviewStep = (raw = {}, defaults = {}) => {
  const difficultyRaw = String(raw?.difficulty || defaults?.difficulty || "beginner").toLowerCase();
  const difficulty = INTERVIEW_ALLOWED_DIFFICULTY.has(difficultyRaw)
    ? difficultyRaw
    : "beginner";

  return {
    question: String(raw?.question || defaults?.question || "").trim() || "Can you describe one relevant project from your resume and your exact contribution?",
    evaluation: normalizeInterviewEvaluation(raw?.evaluation || defaults?.evaluation || {}),
    difficulty,
    follow_up:
      String(raw?.follow_up || defaults?.follow_up || "").trim() ||
      "What tradeoffs did you consider while implementing this?",
  };
};

const buildInterviewFallbackQuestion = ({ resumeText, questionNumber, difficulty }) => {
  const skills = extractResumeSkills(resumeText);
  const primarySkill = skills[0] || "your primary tech stack";
  const secondarySkill = skills[1] || "system design";
  const hasProject = /\b(project|built|developed|implemented|deployed)\b/i.test(resumeText);

  if (questionNumber <= 1) {
    return `Let's start with ${primarySkill}. Can you explain it as if you are teaching a junior developer, and where you used it in practice?`;
  }
  if (questionNumber === 2) {
    return `In your work with ${primarySkill}, how do you debug a production issue step by step?`;
  }
  if (questionNumber === 3 && hasProject) {
    return "Pick one project from your resume. Explain architecture, your exact contribution, and one challenge you solved.";
  }
  if (difficulty === "intermediate") {
    return `How would you design and optimize a real feature using ${primarySkill} and ${secondarySkill}? Please include tradeoffs.`;
  }
  return `Assume this feature has 100k users. How would you scale reliability, performance, and observability for a ${primarySkill} based system?`;
};

const buildInterviewFallbackStep = ({
  resumeText,
  currentQuestion,
  candidateAnswer,
  questionNumber,
  difficulty,
}) => {
  const answerLength = String(candidateAnswer || "").trim().length;
  const score = answerLength >= 260 ? "8" : answerLength >= 140 ? "7" : answerLength >= 80 ? "6" : "5";
  const nextQuestion = buildInterviewFallbackQuestion({
    resumeText,
    questionNumber: questionNumber + 1,
    difficulty: getInterviewDifficulty(questionNumber + 1),
  });

  return normalizeInterviewStep(
    {
      question: nextQuestion,
      evaluation: {
        score,
        strengths: "Covered the core concept and attempted a structured response.",
        weaknesses:
          "Answer needs more concrete implementation details, edge cases, and measurable outcomes.",
        feedback:
          "In the next answer, include architecture decisions, debugging approach, and real production constraints.",
      },
      difficulty: getInterviewDifficulty(questionNumber + 1),
      follow_up: `Can you quantify impact for "${currentQuestion}" with metrics like latency, throughput, or failure rate?`,
    },
    {
      difficulty,
    }
  );
};

const parseAIJSONObject = (rawText = "") => {
  const candidate = extractJSONObjectString(rawText);
  if (!candidate) throw new Error("AI response does not contain JSON object");
  return JSON.parse(candidate);
};

const callInterviewAI = async ({
  resumeText,
  currentQuestion,
  candidateAnswer,
  history,
  questionNumber,
  nextDifficulty,
}) => {
  const trimmedResume = String(resumeText || "").slice(0, 7000);
  const compactHistory = (history || []).slice(-6).map((turn) => ({
    question: turn.question,
    answer: turn.answer,
    difficulty: turn.difficulty,
    score: turn.evaluation?.score || "",
  }));

  const isFirstStep = !currentQuestion && !candidateAnswer;
  const systemPrompt =
    "You are an experienced technical interviewer conducting a live AI interview.\n" +
    "Rules:\n" +
    "1. Ask exactly ONE question at a time.\n" +
    "2. Base questions on resume skills/projects/technologies.\n" +
    "3. Increase difficulty gradually: beginner -> intermediate -> advanced.\n" +
    "4. Be concise and professional.\n" +
    "5. Evaluate candidate answer on technical accuracy, depth, real-world understanding, communication clarity.\n" +
    "Return ONLY valid JSON with this exact shape:\n" +
    '{\n  "question": "Next interview question to ask",\n  "evaluation": {\n    "score": "number from 1-10",\n    "strengths": "what the candidate explained well",\n    "weaknesses": "missing concepts or incorrect explanation",\n    "feedback": "short advice for improvement"\n  },\n  "difficulty": "beginner | intermediate | advanced",\n  "follow_up": "a deeper question related to the previous topic"\n}';

  const userPrompt = isFirstStep
    ? `Resume:\n${trimmedResume}\n\nThis is the first interview step. Ask question #1 with difficulty beginner.`
    : `Resume:\n${trimmedResume}\n\nCurrent Question:\n${currentQuestion}\n\nCandidate Answer:\n${candidateAnswer}\n\nHistory JSON:\n${JSON.stringify(
        compactHistory
      )}\n\nGenerate the next interview question #${questionNumber + 1} with target difficulty "${nextDifficulty}".`;

  const output = await callGroq({
    messages: [
      { role: "system", content: systemPrompt },
      { role: "user", content: userPrompt },
    ],
    temperature: 0.25,
    max_tokens: 800,
  });

  const parsed = parseAIJSONObject(output);
  const defaults = isFirstStep
    ? {
        question: buildInterviewFallbackQuestion({
          resumeText,
          questionNumber: 1,
          difficulty: "beginner",
        }),
        difficulty: "beginner",
        follow_up: "Can you explain a real scenario where you applied this skill?",
        evaluation: {
          score: "0",
          strengths: "Interview started",
          weaknesses: "No answer yet",
          feedback: "Respond clearly with your practical experience.",
        },
      }
    : {
        question: buildInterviewFallbackQuestion({
          resumeText,
          questionNumber: questionNumber + 1,
          difficulty: nextDifficulty,
        }),
        difficulty: nextDifficulty,
        follow_up: "Can you explain tradeoffs and production constraints for this?",
      };

  return normalizeInterviewStep(parsed, defaults);
};

const callInterviewFinalReportAI = async ({ resumeText, fullHistory }) => {
  const trimmedResume = String(resumeText || "").slice(0, 7000);
  const compactHistory = (fullHistory || []).slice(-12).map((turn) => ({
    question: turn.question,
    answer: turn.answer,
    difficulty: turn.difficulty,
    evaluation: turn.evaluation,
  }));

  const systemPrompt =
    "Generate a technical interview final report. Return ONLY valid JSON with exact shape:\n" +
    '{\n  "technical_score": "score out of 10",\n  "communication_score": "score out of 10",\n  "confidence_score": "score out of 10",\n  "strengths": ["list candidate strengths"],\n  "weak_topics": ["topics candidate should improve"],\n  "recommendations": ["learning suggestions"]\n}';

  const userPrompt = `Resume:\n${trimmedResume}\n\nInterview history JSON:\n${JSON.stringify(
    compactHistory
  )}`;

  const output = await callGroq({
    messages: [
      { role: "system", content: systemPrompt },
      { role: "user", content: userPrompt },
    ],
    temperature: 0.2,
    max_tokens: 700,
  });
  const parsed = parseAIJSONObject(output);

  const parseScore = (value, fallback = "6") => {
    const num = Number.parseFloat(String(value || "").replace(/[^\d.]/g, ""));
    if (!Number.isFinite(num)) return fallback;
    return String(Math.max(1, Math.min(10, Math.round(num))));
  };

  return {
    technical_score: parseScore(parsed.technical_score, "6"),
    communication_score: parseScore(parsed.communication_score, "6"),
    confidence_score: parseScore(parsed.confidence_score, "6"),
    strengths: Array.isArray(parsed.strengths)
      ? parsed.strengths.map((x) => String(x).trim()).filter(Boolean).slice(0, 6)
      : ["Understood key fundamentals."],
    weak_topics: Array.isArray(parsed.weak_topics)
      ? parsed.weak_topics.map((x) => String(x).trim()).filter(Boolean).slice(0, 6)
      : ["Advanced implementation depth"],
    recommendations: Array.isArray(parsed.recommendations)
      ? parsed.recommendations.map((x) => String(x).trim()).filter(Boolean).slice(0, 6)
      : ["Practice project-based implementation and system design discussions."],
  };
};

const buildInterviewFinalReportFallback = (fullHistory = []) => {
  const scores = fullHistory
    .map((x) => Number.parseFloat(String(x?.evaluation?.score || "").replace(/[^\d.]/g, "")))
    .filter((x) => Number.isFinite(x));
  const avg = scores.length
    ? Math.round((scores.reduce((sum, x) => sum + x, 0) / scores.length) * 10) / 10
    : 6;
  const scoreText = String(Math.max(1, Math.min(10, Math.round(avg))));

  return {
    technical_score: scoreText,
    communication_score: String(Math.max(1, Math.min(10, Math.round(avg - 0.2)))),
    confidence_score: String(Math.max(1, Math.min(10, Math.round(avg - 0.1)))),
    strengths: ["Consistent participation", "Basic conceptual understanding", "Willingness to explain approach"],
    weak_topics: ["Advanced architecture tradeoffs", "Scalability decisions", "Production debugging depth"],
    recommendations: [
      "Practice answering with concrete project examples and metrics.",
      "Revise system design basics and optimization patterns.",
      "Run mock interviews and improve concise technical communication.",
    ],
  };
};

const computeAverageInterviewScore = (fullHistory = []) => {
  const scores = fullHistory
    .map((x) => Number.parseFloat(String(x?.evaluation?.score || "").replace(/[^\d.]/g, "")))
    .filter((x) => Number.isFinite(x));
  if (!scores.length) return 6;
  return Math.round((scores.reduce((sum, x) => sum + x, 0) / scores.length) * 10) / 10;
};

const clampInterviewScoreToBand = (value, avg) => {
  const num = Number.parseFloat(String(value || "").replace(/[^\d.]/g, ""));
  const base = Number.isFinite(num) ? Math.round(num) : Math.round(avg);
  const min = Math.max(1, Math.floor(avg - 2));
  const max = Math.min(10, Math.ceil(avg + 2));
  return String(Math.min(max, Math.max(min, base)));
};

const SEARCH_SUGGEST_CACHE = new Map();
const SEARCH_SUGGEST_TTL_MS = 5 * 60 * 1000;
const POPULAR_SEARCH_TOPICS = [
  "Full Stack Development",
  "Data Structures and Algorithms",
  "System Design",
  "React",
  "Node.js",
  "JavaScript",
  "TypeScript",
  "HTML",
  "CSS",
  "Tailwind CSS",
  "Bootstrap",
  "Python",
  "Java",
  "Golang",
  "Go Language",
  "C++",
  "C Programming",
  "C#",
  ".NET",
  "ASP.NET Core",
  "Swift",
  "Kotlin",
  "Rust",
  "PHP",
  "Laravel",
  "Django",
  "Flask",
  "Ruby on Rails",
  "Angular",
  "Vue.js",
  "Svelte",
  "AI and Machine Learning",
  "Data Science",
  "Deep Learning",
  "Generative AI",
  "LLM Engineering",
  "MERN Stack",
  "DevOps",
  "Kubernetes",
  "Docker",
  "AWS",
  "Azure",
  "Google Cloud",
  "Cloud Computing",
  "Cybersecurity",
  "Ethical Hacking",
  "UI UX Design",
  "Mobile App Development",
  "Web Development",
  "Frontend Development",
  "Backend Development",
  "Product Management",
  "Digital Marketing",
  "SQL and Databases",
  "MongoDB",
  "MySQL",
  "PostgreSQL",
  "Redis",
  "Prompt Engineering",
  "Interview Preparation",
  "Aptitude and Reasoning",
  "Spring Boot",
  "Next.js",
  "Flutter",
  "Android Development",
  "iOS Development",
];

const matchScore = (label, query) => {
  const l = String(label || "").toLowerCase();
  const q = compactQuery(query);
  if (!l) return 0;
  if (!q) return 1;
  if (l === q) return 120;
  if (l.startsWith(q)) return 95;
  if (l.includes(q)) return 75;
  const terms = q.split(" ").filter((x) => x.length > 1);
  const covered = terms.reduce((sum, term) => (l.includes(term) ? sum + 1 : sum), 0);
  return covered > 0 ? covered * 20 : 0;
};

const pushRankedSuggestion = (map, item) => {
  const label = String(item?.label || "").trim();
  if (!label) return;
  const key = label.toLowerCase();
  const existing = map.get(key);
  if (!existing || Number(item.score || 0) > Number(existing.score || 0)) {
    map.set(key, item);
  }
};

export const getSearchSuggestions = TryCatch(async (req, res) => {
  const query = String(req.query.q || "").trim().slice(0, 80);
  const limitParam = Number.parseInt(req.query.limit, 10);
  const limit = Math.min(12, Math.max(6, Number.isFinite(limitParam) ? limitParam : 10));
  const cacheKey = `${compactQuery(query)}::${limit}`;
  const now = Date.now();
  const cached = SEARCH_SUGGEST_CACHE.get(cacheKey);

  if (cached && cached.expiresAt > now) {
    return res.json({ suggestions: cached.value, cached: true });
  }

  const q = compactQuery(query);
  const terms = q.split(" ").filter((t) => t.length > 1).slice(0, 5);
  const regex = terms.length > 0 ? new RegExp(terms.join("|"), "i") : null;
  const courseFilter = regex
    ? {
        $or: [
          { title: regex },
          { stream: regex },
          { category: regex },
          { subjects: regex },
          { description: regex },
        ],
      }
    : {};

  const courses = await Courses.find(courseFilter)
    .sort({ isTopCourse: -1, topPriority: 1, createdAt: -1 })
    .limit(q ? 80 : 35)
    .select("_id title stream category subjects level isTopCourse topPriority");

  const ranked = new Map();

  for (const topic of POPULAR_SEARCH_TOPICS) {
    const score = matchScore(topic, q);
    if (q && score === 0) continue;
    pushRankedSuggestion(ranked, {
      label: topic,
      type: "topic",
      subtitle: "Popular learning topic",
      url: `/roadmap/${encodeURIComponent(topic)}`,
      score: score + 15,
    });
  }

  for (const course of courses) {
    const title = String(course.title || "").trim();
    const titleScore = matchScore(title, q);
    if (!q || titleScore > 0) {
      pushRankedSuggestion(ranked, {
        label: title,
        type: "course",
        subtitle: course.stream || course.category || "Course",
        url: `/course/${course._id}`,
        score: titleScore + (course.isTopCourse ? 12 : 0),
      });
    }

    const stream = String(course.stream || course.category || "").trim();
    const streamScore = matchScore(stream, q);
    if (stream && (!q || streamScore > 0)) {
      pushRankedSuggestion(ranked, {
        label: stream,
        type: "stream",
        subtitle: "Stream",
        url: `/roadmap/${encodeURIComponent(stream)}`,
        score: streamScore + 8,
      });
    }

    const level = String(course.level || "").trim();
    const levelScore = matchScore(level, q);
    if (level && (!q || levelScore > 0)) {
      pushRankedSuggestion(ranked, {
        label: level,
        type: "level",
        subtitle: "Skill level",
        url: `/courses`,
        score: levelScore + 5,
      });
    }

    if (Array.isArray(course.subjects)) {
      for (const subjectRaw of course.subjects.slice(0, 8)) {
        const subject = String(subjectRaw || "").trim();
        const subjectScore = matchScore(subject, q);
        if (!subject || (q && subjectScore === 0)) continue;
        pushRankedSuggestion(ranked, {
          label: subject,
          type: "subject",
          subtitle: "Subject",
          url: `/roadmap/${encodeURIComponent(subject)}`,
          score: subjectScore + 10,
        });
      }
    }
  }

  const minScore = q.length >= 6 ? 32 : q.length >= 4 ? 20 : 0;
  const suggestions = [...ranked.values()]
    .filter((item) => Number(item.score || 0) >= minScore)
    .sort((a, b) => b.score - a.score || a.label.localeCompare(b.label))
    .slice(0, limit)
    .map(({ score, ...rest }) => rest);

  SEARCH_SUGGEST_CACHE.set(cacheKey, {
    value: suggestions,
    expiresAt: now + SEARCH_SUGGEST_TTL_MS,
  });

  return res.json({ suggestions });
});

export const generateRoadmap = TryCatch(async (req, res) => {
  const startedAt = Date.now();
  const topicRaw = String(req.query.topic || req.body?.topic || "").trim();
  if (!topicRaw || topicRaw.length < 2) {
    return res.status(400).json({ message: "Topic is required" });
  }

  const topic = topicRaw.slice(0, 80);
  const languageProfile = getLanguageProfile(topicRaw);
  const escapeRegExp = (value) => String(value || "").replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const terms = compactQuery(topic)
    .split(" ")
    .filter((t) => t.length > 2)
    .slice(0, 5);
  const safeTerms = terms.map(escapeRegExp);
  const regexSource = safeTerms.length ? safeTerms.join("|") : escapeRegExp(topic);
  const regex = new RegExp(regexSource, "i");

  const matchedCourses = await Courses.find({
    $or: [
      { title: regex },
      { description: regex },
      { category: regex },
      { stream: regex },
      { subjects: regex },
    ],
  })
    .sort({ isTopCourse: -1, topPriority: 1, createdAt: -1 })
    .limit(40)
    .select("_id title description image createdBy duration price level stream category subjects isTopCourse topPriority createdAt");

  const normalizedTopic = compactQuery(topic);
  const topicTerms = normalizedTopic.split(" ").filter((t) => t.length > 2);
  const maxPopularScore = POPULAR_SEARCH_TOPICS.reduce(
    (max, popularTopic) => Math.max(max, matchScore(popularTopic, normalizedTopic)),
    0
  );

  if (topicTerms.length === 0) {
    return res.status(400).json({ message: "Please enter a specific topic." });
  }

  if (matchedCourses.length === 0 && maxPopularScore < 55) {
    return res.status(404).json({
      message:
        "No relevant roadmap found for this query. Try a specific topic like React, Golang, Swift, HTML, CSS, Node.js, or Python.",
    });
  }

  const sourceCourses =
    matchedCourses.length > 0
      ? matchedCourses
      : await Courses.find()
          .sort({ isTopCourse: -1, topPriority: 1, createdAt: -1 })
          .limit(40)
          .select("_id title description image createdBy duration price level stream category subjects isTopCourse topPriority createdAt");

  const rankedCourses = [...sourceCourses]
    .map((course) => ({ course, score: computeCourseRelevance(course, topic) }))
    .sort((a, b) => b.score - a.score || String(b.course.createdAt || "").localeCompare(String(a.course.createdAt || "")))
    .map((x) => x.course);

  let roadmap = languageProfile
    ? buildLanguageRoadmap({ topic: languageProfile.canonical || topic, matchedCourses: rankedCourses, profile: languageProfile })
    : buildRoadmapFallback({ topic, matchedCourses: rankedCourses });

  if (process.env.GROQ_API_KEY && !languageProfile) {
    const catalog = rankedCourses.map((c, index) => ({
      index,
      id: String(c._id),
      title: c.title,
      description: String(c.description || "").slice(0, 220),
      stream: c.stream || c.category || "",
      level: c.level || "All Levels",
      subjects: Array.isArray(c.subjects) ? c.subjects.slice(0, 5) : [],
    }));

    const roadmapPrompt = [
      {
        role: "system",
        content:
          "You are SmartLearn roadmap planner. Return ONLY valid JSON object with keys: topic, summary, totalDurationWeeks, phases, recommendedCourseIndexes, learningTips. phases must be an array of 4-6 items, each with: title (string), durationWeeks (number), phaseDescription (2-3 sentences), topics (array of 4-7 objects with {name, importance (optional string like 'IMPORTANT'), details (1-2 sentences)}), projects (array of 2-3 objects with {name, explanation (2-3 sentences), techStack (array of strings)}), commonPitfalls (array of 3-5 strings), checkpoints (array of 3-6 strings). Ensure roadmap is chronological from beginner to advanced. Use concrete, senior-level guidance, avoiding fluff. recommendedCourseIndexes must reference provided catalog indexes only.",
      },
      {
        role: "user",
        content: `Topic: ${topic}\nCourse catalog JSON:\n${JSON.stringify(catalog)}`,
      },
    ];

    let retries = 0;
    let aiSuccess = false;
    while (retries < 3 && !aiSuccess) {
      try {
        const output = await callGroq({
          messages: roadmapPrompt,
          temperature: 0.2 + (retries * 0.1),
          max_tokens: 2200,
        });
        const candidate = extractJSONObjectString(output);
        if (candidate) {
          const parsed = JSON.parse(candidate);
          if (Array.isArray(parsed.phases) && parsed.phases.length > 0) {
            roadmap = parsed;
            aiSuccess = true;
          }
        }
      } catch (error) {
        logEvent("error", "roadmap_generation_failed_groq", {
          retry: retries,
          message: error.message,
        });
      }
      retries++;
      if (!aiSuccess && retries < 3) {
        await new Promise((r) => setTimeout(r, 1200));
      }
    }
  }

  const recommendedIndexes = Array.isArray(roadmap.recommendedCourseIndexes)
    ? roadmap.recommendedCourseIndexes
        .map((x) => Number(x))
        .filter((n) => Number.isInteger(n) && n >= 0 && n < rankedCourses.length)
    : [];

  const recommendedCourses =
    recommendedIndexes.length > 0
      ? recommendedIndexes.map((idx) => rankedCourses[idx]).filter(Boolean)
      : rankedCourses.slice(0, 8);

  let phases = normalizeRoadmapPhases(
    Array.isArray(roadmap.phases) ? roadmap.phases.slice(0, 6) : []
  );
  if (!phases.length) {
    const fallback = buildRoadmapFallback({ topic, matchedCourses: rankedCourses });
    phases = normalizeRoadmapPhases(fallback.phases || []);
  }
  const totalDurationWeeks =
    phases.reduce((sum, phase) => sum + (phase.durationWeeks || 0), 0) ||
    Math.max(1, Number(roadmap.totalDurationWeeks) || 12);

  logEvent("info", "roadmap_generated", {
    topic,
    matchedCourses: rankedCourses.length,
    recommendedCourses: recommendedCourses.length,
    elapsedMs: Date.now() - startedAt,
  });

  return res.json({
    roadmap: {
      topic: roadmap.topic || topic,
      summary: roadmap.summary || `Roadmap for ${topic}`,
      totalDurationWeeks,
      phases,
      learningTips: normalizeTextList(roadmap.learningTips, 6),
    },
    recommendedCourses,
  });
});

export const runAIInterviewTurn = TryCatch(async (req, res) => {
  const startedAt = Date.now();
  const resumeText = String(req.body?.resumeText || "").trim();
  const currentQuestion = String(req.body?.currentQuestion || "").trim();
  const candidateAnswer = String(req.body?.candidateAnswer || "").trim();
  const forceEnd = Boolean(req.body?.forceEnd);
  const history = sanitizeInterviewHistory(req.body?.history || []);

  if (resumeText.length < 50) {
    return res
      .status(400)
      .json({ message: "Please provide your resume text (at least 50 characters)." });
  }

  const hasCurrentQuestion = currentQuestion.length > 0;
  const hasCandidateAnswer = candidateAnswer.length > 0;
  if (hasCurrentQuestion !== hasCandidateAnswer) {
    return res.status(400).json({
      message: "currentQuestion and candidateAnswer must be provided together.",
    });
  }

  const currentQuestionNumber = history.length + (hasCurrentQuestion ? 1 : 0);
  const nextDifficulty = getInterviewDifficulty(currentQuestionNumber + 1);

  if (!hasCurrentQuestion) {
    let firstTurn;
    if (process.env.GROQ_API_KEY) {
      try {
        firstTurn = await callInterviewAI({
          resumeText,
          currentQuestion: "",
          candidateAnswer: "",
          history,
          questionNumber: 0,
          nextDifficulty: "beginner",
        });
      } catch (error) {
        firstTurn = normalizeInterviewStep(
          {
            question: buildInterviewFallbackQuestion({
              resumeText,
              questionNumber: 1,
              difficulty: "beginner",
            }),
            difficulty: "beginner",
            follow_up: "Can you share where you applied this in a project?",
            evaluation: {
              score: "0",
              strengths: "Interview started",
              weaknesses: "No answer yet",
              feedback: "Answer clearly with real implementation details.",
            },
          },
          {}
        );
      }
    } else {
      firstTurn = normalizeInterviewStep(
        {
          question: buildInterviewFallbackQuestion({
            resumeText,
            questionNumber: 1,
            difficulty: "beginner",
          }),
          difficulty: "beginner",
          follow_up: "Can you share where you applied this in a project?",
          evaluation: {
            score: "0",
            strengths: "Interview started",
            weaknesses: "No answer yet",
            feedback: "Answer clearly with real implementation details.",
          },
        },
        {}
      );
    }

    logEvent("info", "ai_interview_started", {
      elapsedMs: Date.now() - startedAt,
      question: firstTurn.question,
    });
    return res.json({
      ...firstTurn,
      done: false,
      question_count: 1,
      completed_count: history.length,
      finalReport: null,
    });
  }

  let stepResult;
  if (process.env.GROQ_API_KEY) {
    try {
      stepResult = await callInterviewAI({
        resumeText,
        currentQuestion,
        candidateAnswer,
        history,
        questionNumber: currentQuestionNumber,
        nextDifficulty,
      });
    } catch (error) {
      stepResult = buildInterviewFallbackStep({
        resumeText,
        currentQuestion,
        candidateAnswer,
        questionNumber: currentQuestionNumber,
        difficulty: nextDifficulty,
      });
    }
  } else {
    stepResult = buildInterviewFallbackStep({
      resumeText,
      currentQuestion,
      candidateAnswer,
      questionNumber: currentQuestionNumber,
      difficulty: nextDifficulty,
    });
  }

  const normalizedEvaluation = normalizeInterviewEvaluation(stepResult.evaluation);
  const { evaluation: adjustedEvaluation } = applyAnswerQualityToEvaluation(
    normalizedEvaluation,
    candidateAnswer
  );

  const evaluatedTurn = {
    question: currentQuestion,
    answer: candidateAnswer,
    difficulty: getInterviewDifficulty(currentQuestionNumber),
    evaluation: adjustedEvaluation,
    follow_up: stepResult.follow_up,
  };
  const fullHistory = [...history, evaluatedTurn];

  const reachedTarget =
    fullHistory.length >= INTERVIEW_TARGET_QUESTIONS &&
    fullHistory.length >= INTERVIEW_MIN_QUESTIONS;
  const reachedMax = fullHistory.length >= INTERVIEW_MAX_QUESTIONS;
  const done = forceEnd || reachedMax || reachedTarget;

  let finalReport = null;
  if (done) {
    if (process.env.GROQ_API_KEY) {
      try {
        finalReport = await callInterviewFinalReportAI({
          resumeText,
          fullHistory,
        });
      } catch (error) {
        finalReport = buildInterviewFinalReportFallback(fullHistory);
      }
    } else {
      finalReport = buildInterviewFinalReportFallback(fullHistory);
    }

    const avgScore = computeAverageInterviewScore(fullHistory);
    finalReport = {
      ...finalReport,
      technical_score: clampInterviewScoreToBand(finalReport?.technical_score, avgScore),
      communication_score: clampInterviewScoreToBand(finalReport?.communication_score, avgScore),
      confidence_score: clampInterviewScoreToBand(finalReport?.confidence_score, avgScore),
    };

    stepResult.question = "Interview complete. Review your final report below.";
    stepResult.difficulty = getInterviewDifficulty(fullHistory.length);
    stepResult.follow_up = "Would you like a personalized 30-day preparation plan next?";

    if (req.user?._id) {
      try {
        await Interview.create({
          user: req.user._id,
          topic: "AI Interview",
          technical_score: Number(finalReport.technical_score) || 0,
          communication_score: Number(finalReport.communication_score) || 0,
          confidence_score: Number(finalReport.confidence_score) || 0,
          strengths: Array.isArray(finalReport.strengths) ? finalReport.strengths : [],
          weak_topics: Array.isArray(finalReport.weak_topics) ? finalReport.weak_topics : [],
          recommendations: Array.isArray(finalReport.recommendations) ? finalReport.recommendations : [],
        });
      } catch (err) {
        logEvent("error", "interview_save_failed", { message: err?.message });
      }
    }
  }

  logEvent("info", "ai_interview_turn_processed", {
    elapsedMs: Date.now() - startedAt,
    completedCount: fullHistory.length,
    done,
  });

  return res.json({
    question: stepResult.question,
    evaluation: adjustedEvaluation,
    difficulty: stepResult.difficulty,
    follow_up: stepResult.follow_up,
    done,
    question_count: done ? fullHistory.length : fullHistory.length + 1,
    completed_count: fullHistory.length,
    finalReport,
  });
});

export const register = TryCatch(async (req, res) => {
  const { email, name, password } = req.body;

  let user = await User.findOne({ email });

  if (user)
    return res.status(400).json({
      message: "User Already exists",
    });

  const hashPassword = await bcrypt.hash(password, 10);

  user = {
    name,
    email,
    password: hashPassword,
  };

  const otp = Math.floor(Math.random() * 1000000);

  const activationToken = jwt.sign(
    {
      user,
      otp,
    },
    process.env.Activation_Secret,
    {
      expiresIn: "5m",
    }
  );

  const data = {
    name,
    otp,
  };

  await sendMail(email, "E learning", data);

  res.status(200).json({
    message: "Otp send to your mail",
    activationToken,
  });
});

export const verifyUser = TryCatch(async (req, res) => {
  const { otp, activationToken } = req.body;

  const verify = jwt.verify(activationToken, process.env.Activation_Secret);

  if (!verify)
    return res.status(400).json({
      message: "Otp Expired",
    });

  if (verify.otp !== Number(otp))
    return res.status(400).json({
      message: "Wrong Otp",
    });

  await User.create({
    name: verify.user.name,
    email: verify.user.email,
    password: verify.user.password,
  });

  res.json({
    message: "User Registered",
  });
});

export const loginUser = TryCatch(async (req, res) => {
  const { email, password } = req.body;

  const user = await User.findOne({ email });

  if (!user)
    return res.status(400).json({
      message: "No User with this email",
    });

  const mathPassword = await bcrypt.compare(password, user.password);

  if (!mathPassword)
    return res.status(400).json({
      message: "wrong Password",
    });

  const token = jwt.sign({ _id: user._id }, process.env.Jwt_Sec, {
    expiresIn: "15d",
  });

  const safeUser = await User.findById(user._id).select("-password");

  res.json({
    message: `Welcome back ${user.name}`,
    token,
    user: safeUser,
  });
});

export const googleAuth = TryCatch(async (req, res) => {
  const { tokenId } = req.body;
  if (!tokenId) {
    return res.status(400).json({ message: "Google token is required" });
  }

  const client = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);
  
  const ticket = await client.verifyIdToken({
    idToken: tokenId,
    audience: process.env.GOOGLE_CLIENT_ID,
  });
  
  const { email, name, picture } = ticket.getPayload();
  
  let user = await User.findOne({ email });
  
  if (!user) {
    // Generate a random password for Google-authenticated users
    const password = await bcrypt.hash(email + process.env.Jwt_Sec + Date.now().toString(), 10);
    user = await User.create({
      name,
      email,
      photo: picture,
      password,
    });
  }
  
  const token = jwt.sign({ _id: user._id }, process.env.Jwt_Sec, {
    expiresIn: "15d",
  });
  
  const safeUser = await User.findById(user._id).select("-password");
  
  res.json({
    message: `Welcome ${user.name}`,
    token,
    user: safeUser,
  });
});

export const myProfile = TryCatch(async (req, res) => {
  const user = await User.findById(req.user._id).select("-password");

  res.json({ user });
});

export const updateMyProfile = TryCatch(async (req, res) => {
  const user = await User.findById(req.user._id);
  if (!user) {
    return res.status(404).json({ message: "User not found" });
  }

  const uploadedPhotoPath = req.file?.path
    ? String(req.file.path).replace(/\\/g, "/")
    : null;

  const payload = {
    name: typeof req.body.name === "string" ? req.body.name.trim() : user.name,
    photo: uploadedPhotoPath || user.photo,
    phone: typeof req.body.phone === "string" ? req.body.phone.trim() : user.phone,
    country:
      typeof req.body.country === "string" ? req.body.country.trim() : user.country,
    address:
      typeof req.body.address === "string" ? req.body.address.trim() : user.address,
    education:
      typeof req.body.education === "string"
        ? req.body.education.trim()
        : user.education,
  };

  if (!payload.name) {
    return res.status(400).json({ message: "Name is required" });
  }

  user.name = payload.name;
  user.photo = payload.photo;
  user.phone = payload.phone;
  user.country = payload.country;
  user.address = payload.address;
  user.education = payload.education;
  await user.save();

  const safeUser = await User.findById(user._id).select("-password");
  return res.json({
    message: "Profile updated successfully",
    user: safeUser,
  });
});

export const forgotPassword = TryCatch(async (req, res) => {
  const { email } = req.body;

  const user = await User.findOne({ email });

  if (!user)
    return res.status(404).json({
      message: "No User with this email",
    });

  const token = jwt.sign({ email }, process.env.Forgot_Secret, { expiresIn: "5m" });

  const data = { email, token };

  await sendForgotMail("E learning", data);

  user.resetPasswordExpire = Date.now() + 5 * 60 * 1000;

  await user.save();

  res.json({
    message: "Reset Password Link is send to you mail",
  });
});

export const resetPassword = TryCatch(async (req, res) => {
  const decodedData = jwt.verify(req.query.token, process.env.Forgot_Secret);

  const user = await User.findOne({ email: decodedData.email });

  if (!user)
    return res.status(404).json({
      message: "No user with this email",
    });

  if (user.resetPasswordExpire === null)
    return res.status(400).json({
      message: "Token Expired",
    });

  if (user.resetPasswordExpire < Date.now()) {
    return res.status(400).json({
      message: "Token Expired",
    });
  }

  const password = await bcrypt.hash(req.body.password, 10);

  user.password = password;

  user.resetPasswordExpire = null;

  await user.save();

  res.json({ message: "Password Reset" });
});

export const askChatbot = TryCatch(async (req, res) => {
  const startedAt = Date.now();
  const { question, history = [] } = req.body;

  if (!question || question.trim().length < 2) {
    return res.status(400).json({ message: "Question is required" });
  }
  if (!Array.isArray(history)) {
    return res.status(400).json({ message: "history must be an array" });
  }

  const normalizedQuestion = String(question).replace(/\s+/g, " ").trim().slice(0, 400);
  const heuristicIntent = inferIntentHeuristic(normalizedQuestion);

  if (!isSmartLearnScoped(normalizedQuestion)) {
    const onboardingLinks = dedupeLinks([
      { label: "Browse Courses", url: "/courses", type: "course" },
      { label: "Open Test Domains", url: "/test", type: "test" },
      { label: "Open Progress", url: "/progress", type: "progress" },
    ]);
    return res.json({
      answer:
        "I can help only with SmartLearn usage.\nTell me your learning goal, payment issue, test problem, or progress issue and I will give exact steps.",
      links: onboardingLinks,
      suggestedQuestions: CHAT_SUGGESTED_QUESTIONS[CHAT_INTENTS.GENERAL_SUPPORT].slice(0, 3),
      agent: {
        intent: CHAT_INTENTS.GENERAL_SUPPORT,
        toolsUsed: ["scoped_onboarding"],
      },
    });
  }

  try {
    const safeHistory = Array.isArray(history)
      ? history
          .slice(-6)
          .map((m) => ({
            role: m?.role === "assistant" ? "assistant" : "user",
            content: String(m?.content || "").slice(0, 500),
          }))
          .filter((m) => m.content.length > 0)
      : [];

    let intent = heuristicIntent;
    if (process.env.GROQ_API_KEY) {
      try {
        intent = await classifyIntentWithGroq({ question: normalizedQuestion, safeHistory });
      } catch (routingError) {
        intent = heuristicIntent;
      }
    }

    const authUserContext = await getOptionalAuthUserContext(req);

    const { toolsUsed, context, links } = await buildAgentToolContext({
      intent,
      question: normalizedQuestion,
      userContext: authUserContext,
    });
    const supportLinks = buildSupportLinksByQuestion(normalizedQuestion);
    const playbookMatch = findSupportPlaybookMatch(normalizedQuestion, intent);
    let mergedLinks = dedupeLinks([
      ...(playbookMatch?.links || []),
      ...(links || []),
      ...(supportLinks || []),
    ]).slice(0, 4);
    if (!mergedLinks.length) {
      mergedLinks = getDefaultLinksForIntent(intent, authUserContext).slice(0, 4);
    }
    const suggestedQuestions = buildSuggestedQuestions({
      intent,
      question: normalizedQuestion,
      toolContext: context,
      userContext: authUserContext,
    });

    const cacheKey = `${intent}:${compactQuery(normalizedQuestion)}:${authUserContext?.userId || "anon"}`;
    const now = Date.now();
    const cached = CHAT_RESPONSE_CACHE.get(cacheKey);
    if (cached && cached.expiresAt > now) {
      return res.json({
        ...cached.value,
        cached: true,
      });
    }

    let answer = "";
    if (playbookMatch?.answer) {
      answer = playbookMatch.answer;
    } else if (process.env.GROQ_API_KEY) {
      try {
        answer = await composeAgentAnswer({
          question: normalizedQuestion,
          safeHistory,
          intent,
          toolContext: context,
          playbookMatch,
          userContext: authUserContext,
        });
      } catch (composeError) {
        answer = buildFallbackAgentAnswer({
          question: normalizedQuestion,
          intent,
          playbookMatch,
          userContext: authUserContext,
        });
      }
    } else {
      answer = buildFallbackAgentAnswer({
        question: normalizedQuestion,
        intent,
        playbookMatch,
        userContext: authUserContext,
      });
    }
    answer = sanitizeChatAnswer(answer);
    if (!answer) {
      answer = buildFallbackAgentAnswer({
        question: normalizedQuestion,
        intent,
        playbookMatch,
        userContext: authUserContext,
      });
    }

    logEvent("info", "chatbot_answer_success", {
      intent,
      toolsUsed: [...toolsUsed, ...(playbookMatch ? ["support_playbook"] : [])],
      linksCount: mergedLinks.length,
      elapsedMs: Date.now() - startedAt,
    });

    const payload = {
      answer,
      links: mergedLinks,
      suggestedQuestions,
      agent: {
        intent,
        toolsUsed: [...toolsUsed, ...(playbookMatch ? ["support_playbook"] : [])],
      },
    };
    CHAT_RESPONSE_CACHE.set(cacheKey, {
      value: payload,
      expiresAt: now + CHAT_RESPONSE_CACHE_TTL_MS,
    });

    return res.json(payload);
  } catch (error) {
    logEvent("error", "chatbot_answer_failed", {
      status: error.response?.status || 500,
      message: error.message,
      elapsedMs: Date.now() - startedAt,
    });
    return res.status(200).json({
      answer:
        "Chatbot service is temporarily slow. You can still continue from quick actions below.",
      links: dedupeLinks([
        { label: "Browse Courses", url: "/courses", type: "course" },
        { label: "Open Tests", url: "/test", type: "test" },
        { label: "Open Progress", url: "/progress", type: "progress" },
      ]),
      suggestedQuestions: CHAT_SUGGESTED_QUESTIONS[CHAT_INTENTS.GENERAL_SUPPORT].slice(0, 3),
      agent: {
        intent: CHAT_INTENTS.GENERAL_SUPPORT,
        toolsUsed: ["graceful_fallback"],
      },
    });
  }
});

export const requestCallback = TryCatch(async (req, res) => {
  const { name, phone, email, message } = req.body;

  if (!name || !phone) {
    return res.status(400).json({ message: "Name and phone are required" });
  }

  await sendCallbackRequestMail({
    name: String(name).trim(),
    phone: String(phone).trim(),
    email: email ? String(email).trim() : "",
    message: message ? String(message).trim() : "",
  });

  res.json({ message: "Callback request sent to admin" });
});

export const addTestAttempt = TryCatch(async (req, res) => {
  const startedAt = Date.now();
  const { domain, score, totalQuestions, percentage, completedAt } = req.body;

  if (!domain || typeof score !== "number" || typeof totalQuestions !== "number") {
    return res.status(400).json({ message: "Invalid test attempt payload" });
  }

  const user = await User.findById(req.user._id);
  if (!user) return res.status(404).json({ message: "User not found" });

  user.testHistory.push({
    domain: String(domain),
    score,
    totalQuestions,
    percentage: typeof percentage === "number" ? percentage : 0,
    completedAt: completedAt ? new Date(completedAt) : new Date(),
  });

  if (user.testHistory.length > 300) {
    user.testHistory = user.testHistory.slice(-300);
  }

  await user.save();
  logEvent("info", "test_attempt_saved", {
    userId: String(req.user._id),
    domain,
    elapsedMs: Date.now() - startedAt,
  });
  res.status(201).json({ message: "Test attempt saved" });
});

export const getTestHistory = TryCatch(async (req, res) => {
  const startedAt = Date.now();
  const user = await User.findById(req.user._id).select("testHistory");
  if (!user) return res.status(404).json({ message: "User not found" });

  logEvent("info", "test_history_fetched", {
    userId: String(req.user._id),
    count: (user.testHistory || []).length,
    elapsedMs: Date.now() - startedAt,
  });
  res.json({
    attempts: (user.testHistory || []).sort(
      (a, b) => new Date(b.completedAt) - new Date(a.completedAt)
    ),
  });
});

export const getInterviewHistory = TryCatch(async (req, res) => {
  const interviews = await Interview.find({ user: req.user._id }).sort({ createdAt: -1 });
  res.json({
    interviews,
  });
});
