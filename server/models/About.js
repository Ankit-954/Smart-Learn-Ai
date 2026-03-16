import mongoose from "mongoose";

const AboutSchema = new mongoose.Schema(
  {
    hero: {
      title: { type: String, default: "About SmartLearn AI" },
      intro: { type: String, default: "Empowering learners with cutting-edge AI-driven education." },
      bannerImage: { type: String, default: "" },
      tagline: { type: String, default: "Unlock your potential with interactive courses, real-time mock interviews, and personalized roadmaps." },
    },
    mission: {
      text: { type: String, default: "Our mission is to help students learn efficiently, build skills, and prepare for fulfilling careers." },
      image: { type: String, default: "" },
    },
    vision: {
      text: { type: String, default: "To become the global leader in AI-powered online education." },
      image: { type: String, default: "" },
    },
    features: [
      {
        id: { type: String, required: true },
        title: { type: String, required: true },
        icon: { type: String, required: true },
        description: { type: String, required: true },
      },
    ],
    approach: {
      text: { type: String, default: "We help students learn step-by-step through interactive courses, curated roadmaps, mock tests, and real-world projects." },
      image: { type: String, default: "" },
    },
    team: [
      {
        id: { type: String, required: true },
        name: { type: String, required: true },
        role: { type: String, required: true },
        description: { type: String, required: true },
        image: { type: String, default: "" },
      },
    ],
    stats: [
      {
        id: { type: String, required: true },
        label: { type: String, required: true },
        value: { type: String, required: true },
        icon: { type: String, required: true },
      },
    ],
  },
  { timestamps: true }
);

export const About = mongoose.model("About", AboutSchema);
