import jwt from "jsonwebtoken";
import { User } from "../models/User.js";

export const isAuth = async (req, res, next) => {
  try {
    // Support both standard Authorization header and legacy token header
    let token;
    
    // Check for standard Bearer token first
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
      token = authHeader.substring(7);
    } else {
      // Fallback to legacy token header for backward compatibility
      token = req.headers.token;
    }

    if (!token)
      return res.status(401).json({
        message: "Please Login",
      });

    const decodedData = jwt.verify(token, process.env.Jwt_Sec);

    req.user = await User.findById(decodedData._id);
    if (!req.user) {
      return res.status(401).json({ message: "Invalid session. Please login again." });
    }

    next();
  } catch (error) {
    res.status(401).json({
      message: "Invalid or expired token. Please login again.",
    });
  }
};

export const isAdmin = (req, res, next) => {
  try {
    if (req.user.role !== "admin")
      return res.status(403).json({
        message: "You are not admin",
      });

    next();
  } catch (error) {
    res.status(500).json({
      message: error.message,
    });
  }
};
