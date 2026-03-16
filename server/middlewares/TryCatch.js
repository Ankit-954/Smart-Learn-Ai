const TryCatch = (handler) => {
  return async (req, res, next) => {
    try {
      await handler(req, res, next);
    } catch (error) {
      // In production, never leak raw error messages to clients
      const message =
        process.env.NODE_ENV === "production"
          ? "Something went wrong. Please try again later."
          : error.message;
      res.status(error.status || 500).json({ message });
    }
  };
};

export default TryCatch;
