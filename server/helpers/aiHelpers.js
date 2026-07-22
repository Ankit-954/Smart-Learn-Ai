/**
 * AI Helper Functions
 * Utilities for AI request handling, retry logic, and response parsing
 */

import axios from "axios";
import {
  GROQ_CHAT_COMPLETIONS_URL,
  GEMINI_CHAT_COMPLETIONS_URL,
  DEFAULT_GROQ_MODEL,
  DEFAULT_GEMINI_MODEL,
  AI_REQUEST_TIMEOUT_MS,
  MAX_AI_RETRIES,
  AI_BASE_DELAY_MS,
  RETRYABLE_OPENAI_STATUS,
} from "../constants/index.js";

/**
 * Sleep for a specified number of milliseconds
 * @param {number} ms - Milliseconds to sleep
 * @returns {Promise<void>}
 */
export const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

/**
 * Check if an error is retryable based on HTTP status
 * @param {Error} error - The error to check
 * @returns {boolean}
 */
export function isRetryableOpenAIError(error) {
  if (!axios.isAxiosError(error)) return false;
  const status = error.response?.status;
  return !status || RETRYABLE_OPENAI_STATUS.has(status);
}

/**
 * Strip markdown code fences from text
 * @param {string} text - Text to clean
 * @returns {string}
 */
export const stripCodeFences = (text = "") =>
  String(text)
    .replace(/^```json\s*/i, "")
    .replace(/^```\s*/i, "")
    .replace(/\s*```$/i, "")
    .trim();

/**
 * Extract JSON array from text
 * @param {string} text - Text containing JSON
 * @returns {string|null}
 */
export const extractJSONArrayString = (text = "") => {
  const clean = stripCodeFences(text);
  const start = clean.indexOf("[");
  const end = clean.lastIndexOf("]");
  if (start === -1 || end === -1 || end <= start) return null;
  return clean.slice(start, end + 1);
};

/**
 * Extract JSON object from text
 * @param {string} text - Text containing JSON
 * @returns {string|null}
 */
export const extractJSONObjectString = (text = "") => {
  const clean = stripCodeFences(text);
  const start = clean.indexOf("{");
  const end = clean.lastIndexOf("}");
  if (start === -1 || end === -1 || end <= start) return null;
  return clean.slice(start, end + 1);
};

/**
 * Repair invalid JSON using Groq AI
 * @param {string} invalidJSON - Invalid JSON string
 * @param {string} shape - Expected shape: "array" or "object"
 * @returns {Promise<string>}
 */
async function repairJSONWithGroq(invalidJSON, shape = "array") {
  const model = process.env.GROQ_MODEL || DEFAULT_GROQ_MODEL;
  const prompt = `Fix this invalid JSON and return ONLY valid ${shape === "array" ? "JSON array" : "JSON object"}.
Do not add comments or markdown.
Invalid JSON:
${invalidJSON}`;

  const response = await requestAIWithRetry(
    {
      model,
      messages: [{ role: "user", content: prompt }],
      max_tokens: 4000,
      temperature: 0,
    },
    1,
    700
  );

  return response?.data?.choices?.[0]?.message?.content || "";
}

/**
 * Parse JSON array with automatic repair on failure
 * @param {string} raw - Raw response text
 * @returns {Promise<Array>}
 */
export async function parseJSONArrayOrRepair(raw) {
  const candidate = extractJSONArrayString(raw);
  if (!candidate) throw new Error("AI response does not contain a JSON array");

  try {
    return JSON.parse(candidate);
  } catch (error) {
    const repaired = await repairJSONWithGroq(candidate, "array");
    const repairedCandidate = extractJSONArrayString(repaired);
    if (!repairedCandidate) throw new Error("Failed to repair AI JSON array");
    return JSON.parse(repairedCandidate);
  }
}

/**
 * Parse JSON object with automatic repair on failure
 * @param {string} raw - Raw response text
 * @returns {Promise<Object>}
 */
export async function parseJSONObjectOrRepair(raw) {
  const candidate = extractJSONObjectString(raw);
  if (!candidate) {
    console.error("AI response does not contain JSON object. Truncated Raw:", raw.slice(-100));
    throw new Error("AI response does not contain a JSON object");
  }

  try {
    return JSON.parse(candidate);
  } catch (error) {
    console.warn("Initial JSON parse failed, repairing. Candidate:", candidate);
    const repaired = await repairJSONWithGroq(candidate, "object");
    const repairedCandidate = extractJSONObjectString(repaired);
    if (!repairedCandidate) throw new Error("Failed to repair AI JSON object");
    return JSON.parse(repairedCandidate);
  }
}

/**
 * Make AI request with retry logic and provider fallback
 * @param {Object} body - Request body
 * @param {number} maxRetries - Maximum retry attempts
 * @param {number} baseDelayMs - Base delay between retries
 * @returns {Promise<AxiosResponse>}
 */
export async function requestAIWithRetry(body, maxRetries = MAX_AI_RETRIES, baseDelayMs = AI_BASE_DELAY_MS) {
  let lastError;

  for (let attempt = 0; attempt <= maxRetries; attempt += 1) {
    // Randomize primary provider for this attempt
    const useGemini = Math.random() > 0.5;
    const primaryConf = useGemini
      ? {
          url: GEMINI_CHAT_COMPLETIONS_URL,
          key: process.env.GEMINI_API_KEY,
          model: process.env.GEMINI_MODEL || DEFAULT_GEMINI_MODEL,
          name: "Gemini",
        }
      : {
          url: GROQ_CHAT_COMPLETIONS_URL,
          key: process.env.GROQ_API_KEY,
          model: process.env.GROQ_MODEL || DEFAULT_GROQ_MODEL,
          name: "Groq",
        };

    // Fallback provider
    const secondaryConf = useGemini
      ? {
          url: GROQ_CHAT_COMPLETIONS_URL,
          key: process.env.GROQ_API_KEY,
          model: process.env.GROQ_MODEL || DEFAULT_GROQ_MODEL,
          name: "Groq",
        }
      : {
          url: GEMINI_CHAT_COMPLETIONS_URL,
          key: process.env.GEMINI_API_KEY,
          model: process.env.GEMINI_MODEL || DEFAULT_GEMINI_MODEL,
          name: "Gemini",
        };

    const attemptConfigs = [primaryConf, secondaryConf];
    let requestFailed = true;

    for (const conf of attemptConfigs) {
      if (!conf.key) continue; // Skip if env key is missing

      try {
        const payload = { ...body, model: conf.model }; // override model
        const headers = {
          Authorization: `Bearer ${conf.key}`,
          "Content-Type": "application/json",
        };
        const response = await axios.post(conf.url, payload, {
          headers,
          timeout: AI_REQUEST_TIMEOUT_MS,
        });
        return response; // Success, immediately exit
      } catch (error) {
        lastError = error;
        console.warn(
          `${conf.name} API failed on try ${attempt + 1}: ${error.response?.status || error.message}`
        );

        // If it's a structural error (like 400 Bad Request) do not fallback, throw immediately
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
