import express from "express";
import { isAdmin, isAuth } from "../middlewares/isAuth.js";
import {
  addLectures,
  createCourse,
  updateCourse,
  deleteCourse,
  deleteLecture,
  getAllStats,
  getAllUser,
  updateTopCoursePriority,
  updateRole,
  updateRolesBulk,
  createBlog,
  deleteBlog,
  getAllBlogsAdmin,
  exportUsersToCSV,
  getAllContactsAdmin,
  updateContactStatus,
  deleteContact,
  replyToContact,
  getAllNewsletterSubscribersAdmin,
  updateNewsletterSubscriberAdmin,
  deleteNewsletterSubscriberAdmin,
  exportNewsletterSubscribersAdmin,
  sendNewsletterCampaignAdmin,
} from "../controllers/admin.js";
import { updateAboutData, uploadAboutFile } from "../controllers/about.js";
import {
  createJob,
  deleteJob,
  getAllJobsAdmin,
  updateJob,
} from "../controllers/job.js";
import { uploadCourseImage, uploadLectureVideo, uploadBlogImage, uploadAboutImage } from "../middlewares/multer.js";

const router = express.Router();

router.post("/course/new", isAuth, isAdmin, uploadCourseImage, createCourse);
router.put("/course/:id", isAuth, isAdmin, uploadCourseImage, updateCourse);
router.post("/course/:id", isAuth, isAdmin, uploadLectureVideo, addLectures);
router.put("/course/:id/top", isAuth, isAdmin, updateTopCoursePriority);
router.delete("/course/:id", isAuth, isAdmin, deleteCourse);
router.delete("/lecture/:id", isAuth, isAdmin, deleteLecture);
router.get("/stats", isAuth, isAdmin, getAllStats);
router.put("/user/:id", isAuth, isAdmin, updateRole);
router.put("/users/roles", isAuth, isAdmin, updateRolesBulk);
router.get("/users/export", isAuth, isAdmin, exportUsersToCSV);
router.get("/users", isAuth, isAdmin, getAllUser);

// Job routes
router.post("/job/new", isAuth, isAdmin, createJob);
router.put("/job/:id", isAuth, isAdmin, updateJob);
router.delete("/job/:id", isAuth, isAdmin, deleteJob);
router.get("/jobs", isAuth, isAdmin, getAllJobsAdmin);

// Blog routes
router.get("/admin/blog", isAuth, isAdmin, getAllBlogsAdmin);
router.post("/admin/blog/new", isAuth, isAdmin, uploadBlogImage, createBlog);
router.delete("/admin/blog/:id", isAuth, isAdmin, deleteBlog);

// About routes
router.put("/admin/about", isAuth, isAdmin, updateAboutData);
router.post("/admin/about/image", isAuth, isAdmin, uploadAboutImage, uploadAboutFile);

// Contact routes
router.get("/admin/contacts", isAuth, isAdmin, getAllContactsAdmin);
router.put("/admin/contacts/:id", isAuth, isAdmin, updateContactStatus);
router.delete("/admin/contacts/:id", isAuth, isAdmin, deleteContact);
router.post("/admin/contacts/:id/reply", isAuth, isAdmin, replyToContact);

// Newsletter routes
router.get("/admin/newsletter", isAuth, isAdmin, getAllNewsletterSubscribersAdmin);
router.get("/admin/newsletter/export", isAuth, isAdmin, exportNewsletterSubscribersAdmin);
router.post("/admin/newsletter/campaign", isAuth, isAdmin, sendNewsletterCampaignAdmin);
router.put("/admin/newsletter/:id", isAuth, isAdmin, updateNewsletterSubscriberAdmin);
router.delete("/admin/newsletter/:id", isAuth, isAdmin, deleteNewsletterSubscriberAdmin);

export default router;
