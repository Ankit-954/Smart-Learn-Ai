import express from "express";
import { Contact } from "../models/Contact.js";
import { Newsletter } from "../models/Newsletter.js";
import { Blog } from "../models/Blog.js";
import { getAboutData } from "../controllers/about.js";
import { getActiveJobs } from "../controllers/job.js";
import mongoose from "mongoose";
import { sendContactMail } from "../middlewares/sendMail.js";

const router = express.Router();

// 1. Contact Us Submission
router.post("/contact", async (req, res) => {
  try {
    const { name, email, subject, message } = req.body;

    if (!name || !email || !subject || !message) {
      return res.status(400).json({ error: "All fields are required." });
    }

    const newContact = await Contact.create({
      name,
      email,
      subject,
      message,
    });

    sendContactMail({ name, email, subject, message }).catch(() => {});

    res.status(201).json({
      success: true,
      message: "Message sent successfully! Our team will get back to you soon.",
      contactId: newContact._id,
    });
  } catch (error) {
    console.error("Error processing contact form:", error);
    res.status(500).json({ error: "Failed to send message. Please try again later." });
  }
});

// 2. Newsletter Subscription
router.post("/newsletter", async (req, res) => {
  try {
    const { email } = req.body;

    if (!email || !/^\S+@\S+\.\S+$/.test(email)) {
      return res.status(400).json({ error: "Please provide a valid email address." });
    }

    const normalizedEmail = String(email).trim().toLowerCase();

    const existing = await Newsletter.findOne({ email: normalizedEmail });
    if (existing && existing.isActive) {
      return res.status(200).json({
        success: true,
        message: "You're already subscribed to the newsletter.",
      });
    }

    if (existing && !existing.isActive) {
      existing.isActive = true;
      existing.subscribedAt = new Date();
      await existing.save();
      return res.status(200).json({
        success: true,
        message: "Welcome back! Your newsletter subscription is active again.",
      });
    }

    await Newsletter.create({ email: normalizedEmail });

    res.status(201).json({
      success: true,
      message: "Successfully subscribed to the newsletter!",
    });
  } catch (error) {
    console.error("Error subscribing to newsletter:", error);
    res.status(500).json({ error: "Subscription failed. Please try again later." });
  }
});

// 3. Fetch Public Blog Posts
router.get("/blog", async (req, res) => {
  try {
    // Fetch only published posts, sorted by newest first
    const posts = await Blog.find({ isPublished: true })
      .sort({ publishedAt: -1 })
      .limit(20); // Limit to top 20 for performance

    res.json({
      success: true,
      posts,
    });
  } catch (error) {
    console.error("Error fetching blog posts:", error);
    res.status(500).json({ error: "Failed to load blog posts." });
  }
});

// 3b. Fetch Single Public Blog Post
router.get("/blog/:id", async (req, res) => {
  try {
    const { id } = req.params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ error: "Invalid blog id." });
    }

    const post = await Blog.findOne({ _id: id, isPublished: true });
    if (!post) {
      return res.status(404).json({ error: "Blog post not found." });
    }

    res.json({ success: true, post });
  } catch (error) {
    console.error("Error fetching blog post:", error);
    res.status(500).json({ error: "Failed to load blog post." });
  }
});

// 4. Fetch Dynamic About Us Page Data
router.get("/about", getAboutData);

// 5. Fetch Active Jobs
router.get("/jobs", getActiveJobs);

export default router;
