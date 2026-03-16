import express from "express";
import {
  askChatbot,
  addTestAttempt,
  forgotPassword,
  getTestHistory,
  getSearchSuggestions,
  generateRoadmap,
  runAIInterviewTurn,
  loginUser,
  googleAuth,
  myProfile,
  updateMyProfile,
  requestCallback,
  register,
  resetPassword,
  verifyUser,
  getInterviewHistory,
} from "../controllers/user.js";
import { isAuth } from "../middlewares/isAuth.js";
import { authLimiter, aiLimiter, activityLimiter } from "../middlewares/rateLimiter.js";
import { addProgress, getYourProgress } from "../controllers/course.js";
import { uploadProfileImage } from "../middlewares/multer.js";

const router = express.Router();

router.post("/user/register", authLimiter, register);
router.post("/user/verify", authLimiter, verifyUser);
router.post("/user/login", authLimiter, loginUser);
router.post("/user/google", authLimiter, googleAuth);
router.post("/user/forgot", authLimiter, forgotPassword);
router.post("/user/reset", authLimiter, resetPassword);

// User routes
router.get("/user/me", isAuth, myProfile);
router.put("/user/me", isAuth, uploadProfileImage, updateMyProfile);
router.post("/user/progress", isAuth, addProgress);
router.get("/user/progress", isAuth, getYourProgress);
router.post("/user/test-history", isAuth, addTestAttempt);
router.get("/user/test-history", activityLimiter, isAuth, getTestHistory);
router.get("/user/interview-history", isAuth, getInterviewHistory);

// AI routes — moderate rate limit (30 req / 15 min)
router.post("/chatbot/ask", aiLimiter, askChatbot);
router.post("/interview/turn", aiLimiter, isAuth, runAIInterviewTurn);
router.get("/roadmap/generate", aiLimiter, generateRoadmap);

// Other routes
router.get("/search/suggest", getSearchSuggestions);
router.post("/callback-request", requestCallback);

export default router;
