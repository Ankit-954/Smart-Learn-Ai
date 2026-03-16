import mongoose from "mongoose";

const schema = new mongoose.Schema({
  title: {
    type: String,
    required: true,
  },
  description: {
    type: String,
    required: true,
  },

  image: {
    type: String,
    default: "",
  },
  price: {
    type: Number,
    required: true,
  },
  isFree: {
    type: Boolean,
    default: false,
  },
  duration: {
    type: Number,
    required: true,
  },
  durationUnit: {
    type: String,
    enum: ["day", "week", "month"],
    default: "week",
  },
  category: {
    type: String,
    required: true,
  },
  stream: {
    type: String,
    default: "",
  },
  level: {
    type: String,
    default: "All Levels",
  },
  subjects: {
    type: [String],
    default: [],
  },
  isTopCourse: {
    type: Boolean,
    default: false,
  },
  topPriority: {
    type: Number,
    default: 0,
  },
  createdBy: {
    type: String,
    required: true,
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

export const Courses = mongoose.model("Courses", schema);
