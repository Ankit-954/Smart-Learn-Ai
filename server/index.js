import express from "express";
import dotenv from "dotenv";
import helmet from "helmet";
import compression from "compression";
import { connectDb } from "./database/db.js";
import Razorpay from "razorpay";
import cors from "cors";
import { initCronJobs } from "./cron/jobs.js";
import { globalLimiter, aiLimiter } from "./middlewares/rateLimiter.js";
import {
  TEST_DOMAINS,
  REQUIRED_ENV_VARS,
  DEFAULT_CORS_ORIGIN,
  REQUEST_LIMITS,
} from "./constants/index.js";
import { logEvent } from "./helpers/logger.js";
import {
  sleep,
  stripCodeFences,
  extractJSONArrayString,
  extractJSONObjectString,
  parseJSONArrayOrRepair,
  parseJSONObjectOrRepair,
  requestAIWithRetry,
  isRetryableOpenAIError,
} from "./helpers/aiHelpers.js";
import {
  normalizeDifficulty,
  shuffleArray,
  normalizeQuestionPayload,
  validateQuestionCount,
  validateDomain,
} from "./helpers/validation.js";

dotenv.config();

const RAZORPAY_KEY = process.env.Razorpay_Key || process.env.RAZORPAY_KEY_ID;
const RAZORPAY_SECRET = process.env.Razorpay_Secret || process.env.RAZORPAY_SECRET;

// Validate required environment variables
const missingEnvVars = REQUIRED_ENV_VARS
  .filter((names) => !names.some((name) => process.env[name]))
  .map((names) => names.join(" or "));
if (missingEnvVars.length > 0) {
  throw new Error(`Missing required env vars: ${missingEnvVars.join(", ")}`);
}

// Initialize Razorpay instance
export const instance = new Razorpay({
  key_id: RAZORPAY_KEY,
  key_secret: RAZORPAY_SECRET,
});

const app = express();
app.set("trust proxy", 1);

// Razorpay webhook must receive raw body for signature verification.
import { razorpayWebhook } from "./controllers/course.js";
app.post("/api/razorpay/webhook", express.raw({ type: "application/json" }), razorpayWebhook);

// CORS configuration — reads from env for production, falls back to localhost for dev
const allowedOrigins = (process.env.CORS_ORIGIN || DEFAULT_CORS_ORIGIN)
  .split(",")
  .map((origin) => origin.trim())
  .filter(Boolean);

const corsOptions = {
  origin(origin, callback) {
    // Reject null origins explicitly (security risk)
    if (!origin) {
      return callback(new Error("Null origin not allowed"));
    }
    
    if (allowedOrigins.includes(origin)) {
      callback(null, true);
      return;
    }
    callback(new Error(`CORS blocked for origin: ${origin}`));
  },
  methods: ["GET", "POST", "PUT", "DELETE"],
  allowedHeaders: ["Content-Type", "Authorization", "token"],
};

// Middleware — security + performance
app.use(helmet({
  crossOriginResourcePolicy: { policy: "cross-origin" },
}));                                   // Security headers
app.use(compression());                              // Gzip compression
app.use(express.json({ limit: REQUEST_LIMITS.JSON_SIZE }));              // JSON body with size limit
app.use(cors(corsOptions));
app.use(express.urlencoded({ extended: true, limit: REQUEST_LIMITS.URL_ENCODED_SIZE }));

// ─── Rate Limiting ──────────────────────────────────────────────
app.use(globalLimiter);

// AI request cache and request-dedupe store
const cache = new Map();
const inflight = new Map();

    } : {
      url: GROQ_CHAT_COMPLETIONS_URL,
      key: process.env.GROQ_API_KEY,
      model: process.env.GROQ_MODEL || "llama-3.1-8b-instant",
      name: "Groq",
    };
    
    // Fallback provider
    const secondaryConf = useGemini ? {
      url: GROQ_CHAT_COMPLETIONS_URL,
      key: process.env.GROQ_API_KEY,
      model: process.env.GROQ_MODEL || "llama-3.1-8b-instant",
      name: "Groq",
    } : {
      url: GEMINI_CHAT_COMPLETIONS_URL,
      key: process.env.GEMINI_API_KEY,
      model: process.env.GEMINI_MODEL || "gemini-2.5-flash",
      name: "Gemini",
    };

    const attemptConfigs = [primaryConf, secondaryConf];
    let requestFailed = true;

    for (const conf of attemptConfigs) {
      if (!conf.key) continue; // Skip if env key is missing for some reason
      
      try {
        const payload = { ...body, model: conf.model }; // override model
        const headers = {
          Authorization: `Bearer ${conf.key}`,
          "Content-Type": "application/json",
        };
        const response = await axios.post(conf.url, payload, { headers, timeout: 25000 });
        return response; // Success, immediately exit
      } catch (error) {
        lastError = error;
        console.warn(`${conf.name} API failed on try ${attempt + 1}: ${error.response?.status || error.message}`);
        
        // If it's a structural error (like 400 Bad Request) do not fallback to the other provider, throw immediately
        if (error.response?.status === 400) {
          throw error;
        }
      }
    }

    // Both providers failed or structural issue, calculate delay and retry
    if (!isRetryableOpenAIError(lastError) || attempt === maxRetries) {
      throw lastError;
    }

    const retryAfterHeader = Number(lastError?.response?.headers?.["retry-after"]);
    const retryAfterMs =
      Number.isFinite(retryAfterHeader) && retryAfterHeader > 0
        ? retryAfterHeader * 1000
        : baseDelayMs * 2 ** attempt;

    console.warn(`AI request retry ${attempt + 1}/${maxRetries} in ${retryAfterMs}ms`);
    await sleep(retryAfterMs);
  }

  throw lastError;
}

function shuffleArray(list) {
  const arr = [...list];
  for (let i = arr.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

function normalizeDifficulty(value) {
  const difficulty = String(value || "medium").toLowerCase();
  return VALID_DIFFICULTIES.has(difficulty) ? difficulty : "medium";
}

function normalizeQuestionPayload(rawQuestions, requestedDifficulty) {
  if (!Array.isArray(rawQuestions)) return [];

  const seen = new Set();
  const normalized = [];

  for (const q of rawQuestions) {
    const question = String(q?.question || "").trim();
    const options = Array.isArray(q?.options)
      ? q.options.map((opt) => String(opt).trim()).filter(Boolean)
      : [];
    const rawCorrectAnswer = String(q?.correctAnswer || "").trim();
    let correctAnswer = rawCorrectAnswer;
    const letterMatch = rawCorrectAnswer.match(/^[A-Ea-e]$/);
    if (letterMatch) {
      const idx = letterMatch[0].toUpperCase().charCodeAt(0) - 65;
      if (options[idx]) correctAnswer = options[idx];
    } else if (/^\d+$/.test(rawCorrectAnswer)) {
      const idx = Number(rawCorrectAnswer) - 1;
      if (options[idx]) correctAnswer = options[idx];
    }
    const difficulty = normalizeDifficulty(q?.difficulty || requestedDifficulty);
    const topic = String(q?.topic || "General Concepts").trim();
    const key = question.toLowerCase();

    if (!question || options.length < 2 || !correctAnswer || seen.has(key)) continue;

    seen.add(key);
    normalized.push({
      question,
      options,
      correctAnswer,
      difficulty,
      topic,
    });
  }

  return normalized;
}

app.get("/", (req, res) => {
  res.send("Server is running...");
});

// ✅ Optimized API to Generate MCQs with Caching
app.get("/api/domains", (req, res) => {
  res.json({ success: true, domains: testDomains });
});

app.post("/api/generate-questions", aiLimiter, async (req, res) => {
  const startedAt = Date.now();
  try {
    const { domain, numQuestions = 10 } = req.body;
    const difficulty = normalizeDifficulty(req.body?.difficulty);
    const fresh = Boolean(req.body?.fresh);
    const sessionId = String(req.body?.sessionId || Date.now());

    if (!domain || typeof domain !== "string" || domain.trim().length < 2) {
      return res.status(400).json({ error: "Invalid domain parameter" });
    }
    if (!Number.isInteger(numQuestions) || numQuestions < 1 || numQuestions > 30) {
      return res.status(400).json({ error: "numQuestions must be an integer between 1 and 30" });
    }

    const cacheKey = `${domain}-${difficulty}-${numQuestions}`;
    const now = Date.now();
    const cached = cache.get(cacheKey);
    if (!fresh && cached && cached.expiresAt > now) {
      console.log("Serving questions from cache...");
      const shuffledCached = shuffleArray(cached.value).map((q) => ({
        ...q,
        options: shuffleArray(q.options || []),
      }));
      return res.json({ success: true, questions: shuffledCached, fromCache: true });
    }

    const inflightKey = fresh ? `${cacheKey}-${sessionId}` : cacheKey;
    if (inflight.has(inflightKey)) {
      const sharedQuestions = await inflight.get(inflightKey);
      return res.json({ success: true, questions: sharedQuestions, shared: true });
    }

    const task = (async () => {
      const prompt = `Generate ${numQuestions} unique ${difficulty} MCQs about ${domain}. Seed: ${sessionId}.
      Avoid repeating common question phrasings from previous attempts.
      Return ONLY valid JSON object in this exact shape:
      {
        "questions": [
          {
            "question": "text",
            "options": ["a","b","c","d"],
            "correctAnswer": "exact option text",
            "difficulty": "easy/medium/hard",
            "topic": "short topic area"
          }
        ]
      }`;

      if (!process.env.GROQ_API_KEY) {
        // Return generic error in production, detailed only in development
        const errorMsg = process.env.NODE_ENV === "production" 
          ? "AI service temporarily unavailable" 
          : "GROQ_API_KEY is not configured";
        throw new Error(errorMsg);
      }

      const model = "llama-3.1-8b-instant"; // The load balancer overrides this
      const groqResponse = await requestAIWithRetry(
        {
          model,
          messages: [{ role: "user", content: prompt }],
          max_tokens: 4000,
          response_format: { type: "json_object" },
        },
        3,
        1000
      );

      const rawContent = groqResponse.data.choices?.[0]?.message?.content || "{}";
      const finishReason = groqResponse.data.choices?.[0]?.finish_reason || "unknown";
      if (finishReason !== "stop") {
        console.warn(`AI warning: LLM finished with reason: ${finishReason}`);
      }
      
      let parsedArray = [];
      try {
        const parsedObject = await parseJSONObjectOrRepair(rawContent);
        parsedArray = Array.isArray(parsedObject?.questions)
          ? parsedObject.questions
          : Array.isArray(parsedObject)
            ? parsedObject
            : [];
      } catch (err) {
        console.warn("Falling back to array parsing for response");
        try {
          parsedArray = await parseJSONArrayOrRepair(rawContent);
        } catch (err2) {
          throw err;
        }
      }
      
      const questions = normalizeQuestionPayload(parsedArray, difficulty);

      if (!Array.isArray(questions) || !questions[0]?.question) {
        throw new Error("Invalid question format from AI");
      }

      const shuffled = shuffleArray(questions).map((q) => ({
        ...q,
        options: shuffleArray(q.options || []),
      }));

      if (!fresh) {
        cache.set(cacheKey, { value: shuffled, expiresAt: now + CACHE_TTL_MS });
      }
      return shuffled;
    })();

    inflight.set(inflightKey, task);
    const questions = await task;
    logEvent("info", "generate_questions_success", {
      domain,
      difficulty,
      numQuestions,
      elapsedMs: Date.now() - startedAt,
      fresh,
    });

    res.json({ success: true, questions });
  } catch (error) {
    logEvent("error", "generate_questions_failed", {
      status: error.response?.status || 500,
      message: error.message,
      elapsedMs: Date.now() - startedAt,
    });
    res.status(error.response?.status || 503).json({
      error: "Failed to generate questions",
      details: error.response?.data?.error?.message || error.message,
    });
  } finally {
    const { domain, numQuestions = 10 } = req.body;
    const difficulty = normalizeDifficulty(req.body?.difficulty);
    const fresh = Boolean(req.body?.fresh);
    const sessionId = String(req.body?.sessionId || "");
    if (domain && typeof domain === "string") {
      const cacheKey = `${domain}-${difficulty}-${numQuestions}`;
      inflight.delete(fresh ? `${cacheKey}-${sessionId}` : cacheKey);
    }
  }
});

app.post("/api/analyze-test-performance", aiLimiter, async (req, res) => {
  const startedAt = Date.now();
  try {
    const { domain, score = 0, totalQuestions = 0, answers = [] } = req.body;
    if (!domain || typeof domain !== "string" || !Array.isArray(answers)) {
      return res.status(400).json({ error: "Invalid analysis payload" });
    }
    if (!Number.isFinite(score) || !Number.isFinite(totalQuestions) || totalQuestions <= 0) {
      return res.status(400).json({ error: "Invalid score payload" });
    }

    const wrongAnswers = answers.filter((a) => a && !a.isCorrect).slice(0, 8).map((a) => ({
      question: a.question,
      selectedAnswer: a.selectedAnswer,
      correctAnswer: a.correctAnswer,
      difficulty: a.difficulty,
      topic: a.topic,
    }));

    if (!process.env.GROQ_API_KEY) {
      // Return generic error in production, detailed only in development
      const errorMsg = process.env.NODE_ENV === "production" 
        ? "AI service temporarily unavailable" 
        : "GROQ_API_KEY is not configured";
      throw new Error(errorMsg);
    }

    const model = "llama-3.1-8b-instant";
    const prompt = `Analyze this test performance and provide concise learning feedback.
Domain: ${domain}
Score: ${score}/${totalQuestions}
Wrong answers: ${JSON.stringify(wrongAnswers)}

Respond as JSON only:
{
  "summary": "one short paragraph",
  "focusAreas": ["area1", "area2", "area3"],
  "practicePlan": "2-3 sentence practical plan"
}`;

    const aiResponse = await requestAIWithRetry(
      {
        model,
        messages: [{ role: "user", content: prompt }],
        max_tokens: 500,
        temperature: 0.3,
        response_format: { type: "json_object" },
      },
      2,
      800
    );

    const raw = aiResponse.data.choices?.[0]?.message?.content || "{}";
    const parsed = await parseJSONObjectOrRepair(raw);

    logEvent("info", "analyze_performance_success", {
      domain,
      totalQuestions,
      wrongAnswers: wrongAnswers.length,
      elapsedMs: Date.now() - startedAt,
    });

    return res.json({
      success: true,
      analysis: {
        summary: parsed.summary || "You are improving steadily. Keep practicing consistently.",
        focusAreas: Array.isArray(parsed.focusAreas) ? parsed.focusAreas.slice(0, 5) : [],
        practicePlan: parsed.practicePlan || "Build 2-3 small exercises around weak topics and review mistakes after each attempt.",
      },
    });
  } catch (error) {
    logEvent("error", "analyze_performance_failed", {
      status: error.response?.status || 500,
      message: error.message,
      elapsedMs: Date.now() - startedAt,
    });
    return res.status(error.response?.status || 503).json({
      error: "Failed to analyze performance",
      details: error.response?.data?.error?.message || error.message,
    });
  }
});

// Static files
app.use("/uploads", express.static("uploads"));

// Import routes
import userRoutes from "./routes/user.js";
import courseRoutes from "./routes/course.js";
import adminRoutes from "./routes/admin.js";
import reviewRoutes from "./routes/review.js";
import publicRoutes from "./routes/public.js";

// Apply routes
app.use("/api", userRoutes);
app.use("/api", courseRoutes);
app.use("/api", adminRoutes);
app.use("/api/reviews", reviewRoutes);
app.use("/api/public", publicRoutes);

// ─── Global Error Handler ───────────────────────────────────────
// Catches unhandled errors from any route and sends a safe response
app.use((err, _req, res, _next) => {
  const status = err.status || err.statusCode || 500;
  logEvent("error", "unhandled_error", { message: err.message, stack: err.stack?.split("\n")[0] });
  res.status(status).json({
    message: process.env.NODE_ENV === "production"
      ? "Something went wrong. Please try again later."
      : err.message || "Internal server error",
  });
});

// ─── Start Server (DB first, then listen) ───────────────────────
const port = process.env.PORT || 5000;

const startServer = async () => {
  await connectDb();  // Connect DB BEFORE accepting requests
  initCronJobs({ cache, inflight });  // Start scheduled tasks
  const server = app.listen(port, () => {
    console.log(`Server running at http://localhost:${port}`);
  });

  // Graceful shutdown — close connections cleanly on SIGTERM/SIGINT
  const shutdown = (signal) => {
    console.log(`\n${signal} received. Shutting down gracefully...`);
    server.close(() => {
      console.log("HTTP server closed.");
      process.exit(0);
    });
    // Force exit if shutdown takes too long
    setTimeout(() => { console.error("Forced shutdown."); process.exit(1); }, 10000);
  };
  process.on("SIGTERM", () => shutdown("SIGTERM"));
  process.on("SIGINT", () => shutdown("SIGINT"));
};

startServer().catch((err) => {
  console.error("Failed to start server:", err);
  process.exit(1);
});
