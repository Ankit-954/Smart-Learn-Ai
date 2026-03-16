import TryCatch from "../middlewares/TryCatch.js";
import { About } from "../models/About.js";

// @desc    Get the single About page configuration
// @route   GET /api/public/about
// @access  Public
export const getAboutData = TryCatch(async (req, res) => {
  let aboutData = await About.findOne();

  // If no document exists in the database yet, create an empty default one
  if (!aboutData) {
    aboutData = await About.create({});
  }

  res.status(200).json({
    success: true,
    data: aboutData,
  });
});

// @desc    Update the About page configuration
// @route   PUT /api/admin/about
// @access  Private (Admin)
export const updateAboutData = TryCatch(async (req, res) => {
  const { hero, mission, vision, features, approach, team, stats } = req.body;

  let aboutData = await About.findOne();
  if (!aboutData) {
    aboutData = new About();
  }

  if (hero) aboutData.hero = hero;
  if (mission) aboutData.mission = mission;
  if (vision) aboutData.vision = vision;
  if (features) aboutData.features = features;
  if (approach) aboutData.approach = approach;
  if (team) aboutData.team = team;
  if (stats) aboutData.stats = stats;

  await aboutData.save();

  res.status(200).json({
    success: true,
    message: "About page updated successfully",
    data: aboutData,
  });
});

// @desc    Upload an image for the About page (hero, mission, team, etc.)
// @route   POST /api/admin/about/image
// @access  Private (Admin)
export const uploadAboutFile = TryCatch(async (req, res) => {
  const file = req.file;
  if (!file?.path) {
    return res.status(400).json({ message: "Image file is required" });
  }

  const normalizedImagePath = file.path.replace(/\\/g, "/");

  res.status(200).json({
    success: true,
    message: "Image uploaded successfully",
    imageUrl: normalizedImagePath,
  });
});
