import mongoose from "mongoose";

const schema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    topic: { 
      type: String,
      default: "General Software Engineering"
    },
    technical_score: { type: Number, required: true },
    communication_score: { type: Number, required: true },
    confidence_score: { type: Number, required: true },
    strengths: [String],
    weak_topics: [String],
    recommendations: [String],
  },
  {
    timestamps: true,
  }
);

export const Interview = mongoose.model("Interview", schema);
