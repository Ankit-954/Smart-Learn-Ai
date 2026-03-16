import mongoose from "mongoose";
import dotenv from "dotenv";

dotenv.config();

const connectDb = async () => {
  try {
    await mongoose.connect(process.env.DB, {
      maxPoolSize: 10,                    // Max concurrent connections
      serverSelectionTimeoutMS: 5000,     // Fail fast if DB is unreachable
      socketTimeoutMS: 45000,             // Close sockets after 45s inactivity
    });
    console.log("Database connected successfully");
  } catch (error) {
    console.error("Database connection failed:", error.message);
    process.exit(1);
  }
};

export { connectDb };