import TryCatch from "../middlewares/TryCatch.js";
import { Courses } from "../models/Courses.js";
import { Lecture } from "../models/Lecture.js";
import { rm } from "fs";
import { promisify } from "util";
import fs from "fs";
import { User } from "../models/User.js";
import { Blog } from "../models/Blog.js";
import { Newsletter } from "../models/Newsletter.js";
import mongoose from "mongoose";
import {
  sendRoleUpdateMail,
  sendContactReplyMail,
  sendNewsletterCampaignMail,
} from "../middlewares/sendMail.js";
import { Parser } from "json2csv";
import Review from "../models/Review.js";
import { Contact } from "../models/Contact.js";

const ALLOWED_DURATION_UNITS = ["day", "week", "month"];

export const createCourse = TryCatch(async (req, res) => {
  const {
    title,
    description,
    category,
    stream,
    level,
    subjects,
    isTopCourse,
    topPriority,
    createdBy,
    duration,
    durationUnit,
    price,
    isFree,
  } = req.body;

  const image = req.file;

  const normalizedImagePath = image?.path ? image.path.replace(/\\/g, "/") : "";
  const normalizedSubjects = String(subjects || "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);

  const normalizedIsFree = String(isFree) === "true";
  const normalizedPrice = normalizedIsFree ? 0 : Number(price);
  const normalizedDuration = Number(duration);
  const normalizedDurationUnit = String(durationUnit || "week").toLowerCase();

  if (!normalizedIsFree && (!Number.isFinite(normalizedPrice) || normalizedPrice <= 0)) {
    return res.status(400).json({ message: "Paid courses must have a valid price greater than 0" });
  }
  if (!Number.isFinite(normalizedDuration) || normalizedDuration <= 0) {
    return res.status(400).json({ message: "Duration must be a valid number greater than 0" });
  }
  if (!ALLOWED_DURATION_UNITS.includes(normalizedDurationUnit)) {
    return res.status(400).json({ message: "Duration unit must be day, week, or month" });
  }

  await Courses.create({
    title,
    description,
    category,
    stream: stream || category || "",
    level: level || "All Levels",
    subjects: normalizedSubjects,
    isTopCourse: String(isTopCourse) === "true",
    topPriority: Number(topPriority) || 0,
    createdBy,
    image: normalizedImagePath,
    duration: normalizedDuration,
    durationUnit: normalizedDurationUnit,
    price: normalizedPrice,
    isFree: normalizedIsFree,
  });

  res.status(201).json({
    message: "Course Created Successfully",
  });
});

export const updateCourse = TryCatch(async (req, res) => {
  const course = await Courses.findById(req.params.id);
  if (!course) {
    return res.status(404).json({ message: "Course not found" });
  }

  const {
    title,
    description,
    category,
    stream,
    level,
    subjects,
    isTopCourse,
    topPriority,
    createdBy,
    duration,
    durationUnit,
    price,
    isFree,
  } = req.body;

  const image = req.file;
  const normalizedImagePath = image?.path ? image.path.replace(/\\/g, "/") : "";
  const normalizedSubjects = typeof subjects === "string"
    ? subjects
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean)
    : Array.isArray(subjects)
      ? subjects
      : course.subjects;

  const normalizedIsFree =
    typeof isFree === "undefined" ? course.isFree : String(isFree) === "true";
  const normalizedPrice = normalizedIsFree
    ? 0
    : typeof price === "undefined"
      ? Number(course.price)
      : Number(price);

  if (!normalizedIsFree && (!Number.isFinite(normalizedPrice) || normalizedPrice <= 0)) {
    return res.status(400).json({ message: "Paid courses must have a valid price greater than 0" });
  }
  if (typeof duration !== "undefined") {
    const normalizedDuration = Number(duration);
    if (!Number.isFinite(normalizedDuration) || normalizedDuration <= 0) {
      return res.status(400).json({ message: "Duration must be a valid number greater than 0" });
    }
  }
  if (typeof durationUnit !== "undefined") {
    const normalizedDurationUnit = String(durationUnit).toLowerCase();
    if (!ALLOWED_DURATION_UNITS.includes(normalizedDurationUnit)) {
      return res.status(400).json({ message: "Duration unit must be day, week, or month" });
    }
  }

  course.title = title ?? course.title;
  course.description = description ?? course.description;
  course.category = category ?? course.category;
  course.stream = stream || course.stream || course.category;
  course.level = level || course.level || "All Levels";
  course.subjects = normalizedSubjects;
  course.isTopCourse = typeof isTopCourse === "undefined" ? course.isTopCourse : String(isTopCourse) === "true";
  course.topPriority = typeof topPriority === "undefined" ? course.topPriority : Number(topPriority) || 0;
  course.createdBy = createdBy ?? course.createdBy;
  course.duration = typeof duration === "undefined" ? course.duration : Number(duration);
  course.durationUnit =
    typeof durationUnit === "undefined"
      ? (course.durationUnit || "week")
      : String(durationUnit).toLowerCase();
  course.price = normalizedPrice;
  course.isFree = normalizedIsFree;
  if (normalizedImagePath) {
    course.image = normalizedImagePath;
  }

  await course.save();

  res.json({
    message: "Course Updated Successfully",
    course,
  });
});

export const getAllContactsAdmin = TryCatch(async (req, res) => {
  const { q, status } = req.query;
  const filter = {};

  if (status && status !== "all") {
    filter.status = status;
  }

  if (q) {
    const regex = new RegExp(String(q), "i");
    filter.$or = [
      { name: regex },
      { email: regex },
      { subject: regex },
      { message: regex },
    ];
  }

  const contacts = await Contact.find(filter).sort({ createdAt: -1 });
  res.json({ contacts });
});

export const updateContactStatus = TryCatch(async (req, res) => {
  const { id } = req.params;
  const { status } = req.body;
  const allowed = ["unread", "read", "replied"];

  if (!mongoose.Types.ObjectId.isValid(id)) {
    return res.status(400).json({ message: "Invalid contact id" });
  }
  if (!allowed.includes(status)) {
    return res.status(400).json({ message: "Invalid status" });
  }

  const contact = await Contact.findByIdAndUpdate(
    id,
    { status },
    { new: true }
  );
  if (!contact) {
    return res.status(404).json({ message: "Contact not found" });
  }

  res.json({ message: "Status updated", contact });
});

export const deleteContact = TryCatch(async (req, res) => {
  const { id } = req.params;
  if (!mongoose.Types.ObjectId.isValid(id)) {
    return res.status(400).json({ message: "Invalid contact id" });
  }
  const contact = await Contact.findByIdAndDelete(id);
  if (!contact) {
    return res.status(404).json({ message: "Contact not found" });
  }
  res.json({ message: "Contact deleted" });
});

export const replyToContact = TryCatch(async (req, res) => {
  const { id } = req.params;
  const { subject, message } = req.body;

  if (!mongoose.Types.ObjectId.isValid(id)) {
    return res.status(400).json({ message: "Invalid contact id" });
  }
  if (!message || String(message).trim().length < 2) {
    return res.status(400).json({ message: "Reply message is required" });
  }

  const contact = await Contact.findById(id);
  if (!contact) {
    return res.status(404).json({ message: "Contact not found" });
  }

  const replySubject = String(subject || `Re: ${contact.subject || "Support Request"}`).trim();
  const replyMessage = String(message || "").trim();

  await sendContactReplyMail({
    email: contact.email,
    name: contact.name,
    subject: replySubject,
    message: replyMessage,
  });

  contact.status = "replied";
  contact.replySubject = replySubject;
  contact.replyMessage = replyMessage;
  contact.repliedAt = new Date();
  contact.repliedBy = req.user?._id;
  await contact.save();

  res.json({ message: "Reply sent", contact });
});

export const getAllNewsletterSubscribersAdmin = TryCatch(async (req, res) => {
  const q = String(req.query.q || "").trim();
  const status = String(req.query.status || "all").toLowerCase();

  const searchFilter = {};
  if (q) {
    searchFilter.email = { $regex: q, $options: "i" };
  }

  const filter = { ...searchFilter };
  if (status === "active") {
    filter.isActive = true;
  } else if (status === "inactive") {
    filter.isActive = false;
  }

  const [subscribers, total, active, inactive] = await Promise.all([
    Newsletter.find(filter).sort({ createdAt: -1 }),
    Newsletter.countDocuments(searchFilter),
    Newsletter.countDocuments({ ...searchFilter, isActive: true }),
    Newsletter.countDocuments({ ...searchFilter, isActive: false }),
  ]);

  res.json({
    subscribers,
    summary: {
      total,
      active,
      inactive,
    },
  });
});

export const updateNewsletterSubscriberAdmin = TryCatch(async (req, res) => {
  const { id } = req.params;
  const { isActive } = req.body;

  if (!mongoose.Types.ObjectId.isValid(id)) {
    return res.status(400).json({ message: "Invalid subscriber id" });
  }
  if (typeof isActive !== "boolean") {
    return res.status(400).json({ message: "isActive must be boolean" });
  }

  const subscriber = await Newsletter.findByIdAndUpdate(
    id,
    { isActive },
    { new: true }
  );
  if (!subscriber) {
    return res.status(404).json({ message: "Subscriber not found" });
  }

  res.json({
    message: isActive ? "Subscriber activated" : "Subscriber deactivated",
    subscriber,
  });
});

export const deleteNewsletterSubscriberAdmin = TryCatch(async (req, res) => {
  const { id } = req.params;

  if (!mongoose.Types.ObjectId.isValid(id)) {
    return res.status(400).json({ message: "Invalid subscriber id" });
  }

  const subscriber = await Newsletter.findByIdAndDelete(id);
  if (!subscriber) {
    return res.status(404).json({ message: "Subscriber not found" });
  }

  res.json({ message: "Subscriber removed" });
});

export const exportNewsletterSubscribersAdmin = TryCatch(async (_req, res) => {
  const subscribers = await Newsletter.find().sort({ createdAt: -1 });

  if (!subscribers.length) {
    return res.status(404).json({ message: "No subscribers found" });
  }

  const fields = ["email", "isActive", "subscribedAt", "createdAt", "updatedAt"];
  const parser = new Parser({ fields });
  const csv = parser.parse(subscribers);

  res.header("Content-Type", "text/csv");
  res.attachment("newsletter-subscribers.csv");
  return res.send(csv);
});

export const sendNewsletterCampaignAdmin = TryCatch(async (req, res) => {
  const subject = String(req.body?.subject || "").trim();
  const message = String(req.body?.message || "").trim();

  if (subject.length < 3) {
    return res.status(400).json({ message: "Subject must be at least 3 characters" });
  }
  if (message.length < 10) {
    return res.status(400).json({ message: "Message must be at least 10 characters" });
  }

  const recipients = await Newsletter.find({ isActive: true }).select("email");
  if (!recipients.length) {
    return res.status(400).json({ message: "No active newsletter subscribers found" });
  }

  const CHUNK_SIZE = 20;
  let sent = 0;
  let failed = 0;
  const failedEmails = [];

  for (let i = 0; i < recipients.length; i += CHUNK_SIZE) {
    const chunk = recipients.slice(i, i + CHUNK_SIZE);
    const result = await Promise.allSettled(
      chunk.map((recipient) =>
        sendNewsletterCampaignMail({
          to: recipient.email,
          subject,
          body: message,
        })
      )
    );

    result.forEach((entry, index) => {
      if (entry.status === "fulfilled") {
        sent += 1;
      } else {
        failed += 1;
        if (failedEmails.length < 10) {
          failedEmails.push(chunk[index]?.email);
        }
      }
    });
  }

  res.json({
    message: `Newsletter campaign sent. Success: ${sent}, Failed: ${failed}`,
    sent,
    failed,
    total: recipients.length,
    failedSamples: failedEmails,
  });
});

export const updateTopCoursePriority = TryCatch(async (req, res) => {
  const course = await Courses.findById(req.params.id);
  if (!course) {
    return res.status(404).json({ message: "Course not found" });
  }

  const isTopCourse =
    typeof req.body?.isTopCourse === "boolean"
      ? req.body.isTopCourse
      : course.isTopCourse;
  const topPriority = Number.isFinite(Number(req.body?.topPriority))
    ? Number(req.body.topPriority)
    : course.topPriority;

  course.isTopCourse = isTopCourse;
  course.topPriority = Math.max(0, topPriority || 0);
  await course.save();

  return res.json({
    message: "Top course priority updated",
    course,
  });
});

export const addLectures = TryCatch(async (req, res) => {
  const course = await Courses.findById(req.params.id);

  if (!course)
    return res.status(404).json({
      message: "No Course with this id",
    });

  const { title, description } = req.body;

  const file = req.file;
  if (!file?.path) {
    return res.status(400).json({ message: "Lecture video file is required" });
  }
  const normalizedVideoPath = file.path.replace(/\\/g, "/");

  const lecture = await Lecture.create({
    title,
    description,
    video: normalizedVideoPath,
    course: course._id,
  });

  res.status(201).json({
    message: "Lecture Added",
    lecture,
  });
});

export const deleteLecture = TryCatch(async (req, res) => {
  const lecture = await Lecture.findById(req.params.id);

  rm(lecture.video, () => {
    console.log("Video deleted");
  });

  await lecture.deleteOne();

  res.json({ message: "Lecture Deleted" });
});

const unlinkAsync = promisify(fs.unlink);

export const deleteCourse = TryCatch(async (req, res) => {
  const course = await Courses.findById(req.params.id);

  const lectures = await Lecture.find({ course: course._id });

  await Promise.all(
    lectures.map(async (lecture) => {
      await unlinkAsync(lecture.video);
      console.log("video deleted");
    })
  );

  rm(course.image, () => {
    console.log("image deleted");
  });

  await Lecture.find({ course: req.params.id }).deleteMany();

  await course.deleteOne();

  await User.updateMany({}, { $pull: { subscription: req.params.id } });

  res.json({
    message: "Course Deleted",
  });
});

export const getAllStats = TryCatch(async (req, res) => {
  const totalCoures = (await Courses.find()).length;
  const totalLectures = (await Lecture.find()).length;
  const totalUsers = (await User.find()).length;

  const stats = {
    totalCoures,
    totalLectures,
    totalUsers,
  };

  res.json({
    stats,
  });
});

export const getAllUser = TryCatch(async (req, res) => {
  const page = Math.max(1, Number.parseInt(req.query.page, 10) || 1);
  const limit = Math.min(
    100,
    Math.max(1, Number.parseInt(req.query.limit, 10) || 20)
  );
  const q = String(req.query.q || "").trim();
  const role = String(req.query.role || "all").toLowerCase();

  const filter = { _id: { $ne: req.user._id } };

  if (q) {
    filter.$or = [
      { name: { $regex: q, $options: "i" } },
      { email: { $regex: q, $options: "i" } },
    ];
  }

  if (role === "admin" || role === "user") {
    filter.role = role;
  }

  const [users, totalUsers] = await Promise.all([
    User.find(filter)
      .select("-password")
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit),
    User.countDocuments(filter),
  ]);

  const totalPages = Math.max(1, Math.ceil(totalUsers / limit));

  res.json({
    users,
    pagination: {
      page,
      limit,
      totalUsers,
      totalPages,
      hasNextPage: page < totalPages,
      hasPrevPage: page > 1,
    },
  });
});

export const updateRole = TryCatch(async (req, res) => {
  if (req.user.mainrole !== "superadmin")
    return res.status(403).json({
      message: "This endpoint is assign to superadmin",
    });
  const user = await User.findById(req.params.id);
  if (!user) {
    return res.status(404).json({ message: "User not found" });
  }
  if (user.mainrole === "superadmin") {
    return res.status(400).json({ message: "Cannot update superadmin role" });
  }

  const requestedRole = String(req.body?.role || "").toLowerCase();
  const nextRole =
    requestedRole === "admin" || requestedRole === "user"
      ? requestedRole
      : user.role === "admin"
        ? "user"
        : "admin";

  user.role = nextRole;
  await user.save();

  if (user.email) {
    sendRoleUpdateMail({
      email: user.email,
      name: user.name,
      role: nextRole,
    }).catch((error) => {
      console.error("Role update email failed:", error?.message || error);
    });
  }

  return res.status(200).json({
    message: `Role updated to ${nextRole}`,
  });
});

export const updateRolesBulk = TryCatch(async (req, res) => {
  if (req.user.mainrole !== "superadmin") {
    return res.status(403).json({
      message: "This endpoint is assign to superadmin",
    });
  }

  const role = String(req.body?.role || "").toLowerCase();
  const rawUserIds = Array.isArray(req.body?.userIds) ? req.body.userIds : [];
  if (role !== "admin" && role !== "user") {
    return res.status(400).json({ message: "Invalid role" });
  }

  const userIds = rawUserIds
    .filter((id) => mongoose.Types.ObjectId.isValid(id))
    .map((id) => new mongoose.Types.ObjectId(id));

  if (!userIds.length) {
    return res.status(400).json({ message: "No valid users selected" });
  }

  const targetUsers = await User.find({
    _id: { $in: userIds, $ne: req.user._id },
    mainrole: { $ne: "superadmin" },
  }).select("_id name email role");

  const result = await User.updateMany(
    {
      _id: { $in: userIds, $ne: req.user._id },
      mainrole: { $ne: "superadmin" },
    },
    { $set: { role } }
  );

  const emailTasks = targetUsers
    .filter((u) => u.role !== role && u.email)
    .map((u) =>
      sendRoleUpdateMail({
        email: u.email,
        name: u.name,
        role,
      })
    );

  if (emailTasks.length) {
    Promise.allSettled(emailTasks).catch(() => {});
  }

  return res.status(200).json({
    message: `${result.modifiedCount} users updated to ${role}`,
    matchedCount: result.matchedCount,
    modifiedCount: result.modifiedCount,
  });
});

export const createBlog = TryCatch(async (req, res) => {
  const { title, category, excerpt, content, author, isPublished } = req.body;
  const image = req.file;

  if (!image?.path) {
    return res.status(400).json({ message: "Blog image is required" });
  }

  const normalizedImagePath = image.path.replace(/\\/g, "/");

  const newBlog = await Blog.create({
    title,
    category,
    excerpt,
    content,
    author: author || "SmartLearn Admin",
    image: normalizedImagePath,
    isPublished: isPublished === "true",
  });

  res.status(201).json({
    message: "Blog Post Created Successfully",
    blog: newBlog,
  });
});

export const deleteBlog = TryCatch(async (req, res) => {
  const blog = await Blog.findById(req.params.id);

  if (!blog) {
    return res.status(404).json({ message: "Blog not found" });
  }

  if (blog.image) {
    rm(blog.image, () => {
      console.log("Blog image deleted");
    });
  }

  await blog.deleteOne();

  res.json({ message: "Blog Post Deleted" });
});

export const getAllBlogsAdmin = TryCatch(async (req, res) => {
  const blogs = await Blog.find().sort({ createdAt: -1 });

  res.json({
    blogs,
  });
});

export const exportUsersToCSV = TryCatch(async (req, res) => {
  const role = String(req.query.role || "all").toLowerCase();
  const dateRange = String(req.query.dateRange || "all").toLowerCase();
  const courseId = req.query.courseId;
  const hasTested = String(req.query.hasTested) === "true";
  const hasReviewed = String(req.query.hasReviewed) === "true";

  const filter = {};

  if (role === "admin" || role === "user") {
    filter.role = role;
  }

  if (dateRange !== "all") {
    const rawDays = parseInt(dateRange, 10);
    const validDays = isNaN(rawDays) ? 0 : rawDays;
    
    if (validDays > 0) {
      const pastDate = new Date();
      pastDate.setDate(pastDate.getDate() - validDays);
      filter.createdAt = { $gte: pastDate };
    }
  }

  // Activity Filters
  if (courseId && mongoose.Types.ObjectId.isValid(courseId)) {
    filter.subscription = new mongoose.Types.ObjectId(courseId);
  }

  if (hasTested) {
    filter["testHistory.0"] = { $exists: true }; // Minimum 1 test
  }

  if (hasReviewed) {
    // Reviews don't explicitly store userId (based on Schema), instead they store `name`
    // Fetch all reviewers first and filter Users explicitly by their exact name
    const allReviews = await Review.find().select("name");
    const reviewerNames = allReviews.map((r) => r.name);
    if (reviewerNames.length > 0) {
      filter.name = { $in: reviewerNames };
    } else {
      // If nobody has left a review, the export target is definitely 0 users.
       return res.status(404).json({ message: "No users found matching these filters." });
    }
  }

  const targetUsers = await User.find(filter).sort({ createdAt: -1 });

  if (targetUsers.length === 0) {
    return res.status(404).json({ message: "No users found matching these filters." });
  }

  // Define fields for CSV
  const fields = ['_id', 'name', 'email', 'role', 'mainrole', 'createdAt'];
  const opts = { fields };

  try {
    const parser = new Parser(opts);
    const csv = parser.parse(targetUsers);

    res.header('Content-Type', 'text/csv');
    res.attachment('users-export.csv');
    return res.send(csv);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Failed to parse CSV string" });
  }
});


