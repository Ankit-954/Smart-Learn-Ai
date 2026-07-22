/**
 * Validation Helper Functions
 * Utilities for input validation and normalization
 */

import { VALID_DIFFICULTIES, DEFAULT_DIFFICULTY } from "../constants/index.js";

/**
 * Normalize difficulty value to valid option
 * @param {string} value - Input difficulty value
 * @returns {string} Normalized difficulty
 */
export function normalizeDifficulty(value) {
  const difficulty = String(value || DEFAULT_DIFFICULTY).toLowerCase();
  return VALID_DIFFICULTIES.has(difficulty) ? difficulty : DEFAULT_DIFFICULTY;
}

/**
 * Validate MCQ question count
 * @param {number} numQuestions - Number of questions requested
 * @returns {{valid: boolean, error?: string}}
 */
export function validateQuestionCount(numQuestions) {
  if (!Number.isInteger(numQuestions)) {
    return { valid: false, error: "numQuestions must be an integer" };
  }
  if (numQuestions < 1 || numQuestions > 30) {
    return { valid: false, error: "numQuestions must be between 1 and 30" };
  }
  return { valid: true };
}

/**
 * Validate domain parameter
 * @param {string} domain - Domain name
 * @returns {{valid: boolean, error?: string}}
 */
export function validateDomain(domain) {
  if (!domain || typeof domain !== "string") {
    return { valid: false, error: "Domain is required" };
  }
  if (domain.trim().length < 2) {
    return { valid: false, error: "Domain must be at least 2 characters" };
  }
  return { valid: true, value: domain.trim() };
}

/**
 * Shuffle array using Fisher-Yates algorithm
 * @param {Array} list - Array to shuffle
 * @returns {Array} Shuffled array
 */
export function shuffleArray(list) {
  const arr = [...list];
  for (let i = arr.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

/**
 * Normalize and validate MCQ question data
 * @param {Array} rawQuestions - Raw questions from AI
 * @param {string} requestedDifficulty - Requested difficulty level
 * @returns {Array} Normalized questions
 */
export function normalizeQuestionPayload(rawQuestions, requestedDifficulty) {
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
    
    // Convert letter-based answers (A, B, C, D) to actual option text
    const letterMatch = rawCorrectAnswer.match(/^[A-Ea-e]$/);
    if (letterMatch) {
      const idx = letterMatch[0].toUpperCase().charCodeAt(0) - 65;
      if (options[idx]) correctAnswer = options[idx];
    } else if (/^\d+$/.test(rawCorrectAnswer)) {
      // Convert numeric index (1, 2, 3, 4) to actual option text
      const idx = Number(rawCorrectAnswer) - 1;
      if (options[idx]) correctAnswer = options[idx];
    }
    
    const difficulty = normalizeDifficulty(q?.difficulty || requestedDifficulty);
    const topic = String(q?.topic || "General Concepts").trim();
    const key = question.toLowerCase();

    // Skip invalid questions
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
