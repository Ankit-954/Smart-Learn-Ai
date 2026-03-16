import TryCatch from "../middlewares/TryCatch.js";
import { Job } from "../models/Job.js";

export const createJob = TryCatch(async (req, res) => {
  const { title, department, location, type, description, applyLink, isActive } = req.body;

  const job = await Job.create({
    title,
    department,
    location,
    type,
    description,
    applyLink,
    isActive: isActive !== undefined ? isActive : true,
  });

  res.status(201).json({
    message: "Job Position Created Successfully",
    job,
  });
});

export const updateJob = TryCatch(async (req, res) => {
  const job = await Job.findById(req.params.id);

  if (!job) {
    return res.status(404).json({ message: "Job position not found" });
  }

  const { title, department, location, type, description, applyLink, isActive } = req.body;

  if (title) job.title = title;
  if (department) job.department = department;
  if (location) job.location = location;
  if (type) job.type = type;
  if (description) job.description = description;
  if (applyLink) job.applyLink = applyLink;
  if (isActive !== undefined) job.isActive = isActive;

  await job.save();

  res.status(200).json({
    message: "Job Position Updated Successfully",
    job,
  });
});

export const deleteJob = TryCatch(async (req, res) => {
  const job = await Job.findById(req.params.id);

  if (!job) {
    return res.status(404).json({ message: "Job position not found" });
  }

  await job.deleteOne();

  res.status(200).json({
    message: "Job Position Deleted",
  });
});

export const getAllJobsAdmin = TryCatch(async (req, res) => {
  const jobs = await Job.find().sort({ createdAt: -1 });

  res.status(200).json({
    jobs,
  });
});

export const getActiveJobs = TryCatch(async (req, res) => {
  const jobs = await Job.find({ isActive: true }).sort({ createdAt: -1 });

  res.status(200).json({
    jobs,
  });
});
