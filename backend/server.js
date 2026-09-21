require("dotenv").config();
const express = require("express");
const cors = require("cors");
const path = require("path");
const rateLimit = require("express-rate-limit");

// Route imports
const authRoutes = require("./routes/authRoutes");
const oauthRoutes = require("./routes/oauthRoutes");
const electionRoutes = require("./routes/electionRoutes");
const candidateRoutes = require("./routes/candidateRoutes");
const voterRoutes = require("./routes/voterRoutes");
const voteRoutes = require("./routes/voteRoutes");
const adminRoutes = require("./routes/adminRoutes");
const feedbackRoutes = require("./routes/feedbackRoutes");

const app = express();

// ─── CORS ─────────────────────────────────────────────────────────────────────
app.use(
  cors({
    origin: [
      process.env.FRONTEND_URL || "http://localhost:5173",
      "http://localhost:3000",
      "http://localhost:5174",
    ],
    credentials: true,
    methods: ["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
  })
);

// ─── BODY PARSING ─────────────────────────────────────────────────────────────
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true, limit: "10mb" }));

// ─── STATIC FILES ─────────────────────────────────────────────────────────────
app.use("/uploads", express.static(path.join(__dirname, "uploads")));

// ─── RATE LIMITING ────────────────────────────────────────────────────────────
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 200,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, message: "Too many requests, please try again later." },
});

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  message: { success: false, message: "Too many login attempts, please try again later." },
});

app.use(limiter);

// ─── ROUTES ───────────────────────────────────────────────────────────────────
app.use("/api/auth", authLimiter, authRoutes);
app.use("/api/oauth", oauthRoutes);
app.use("/api/elections", electionRoutes);
app.use("/api/candidates", candidateRoutes);
app.use("/api/voters", voterRoutes);
app.use("/api/votes", voteRoutes);
app.use("/api/admin", adminRoutes);
app.use("/api/feedback", feedbackRoutes);

// ─── HEALTH CHECK ─────────────────────────────────────────────────────────────
app.get("/api/health", (req, res) => {
  res.json({
    success: true,
    message: "Blockchain E-Voting API is running",
    timestamp: new Date().toISOString(),
    version: "1.0.0",
  });
});

// ─── 404 HANDLER ──────────────────────────────────────────────────────────────
app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: `Route ${req.method} ${req.originalUrl} not found`,
  });
});

// ─── GLOBAL ERROR HANDLER ─────────────────────────────────────────────────────
app.use((err, req, res, next) => {
  console.error("❌ Global Error:", err);

  if (err.code === "LIMIT_FILE_SIZE") {
    return res.status(400).json({ success: false, message: "File too large" });
  }

  if (err.name === "JsonWebTokenError") {
    return res.status(401).json({ success: false, message: "Invalid token" });
  }

  if (err.name === "TokenExpiredError") {
    return res.status(401).json({ success: false, message: "Token expired" });
  }

  res.status(err.status || 500).json({
    success: false,
    message: err.message || "Internal server error",
    ...(process.env.NODE_ENV === "development" && { stack: err.stack }),
  });
});

// ─── START ────────────────────────────────────────────────────────────────────
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`✅ Server running on http://localhost:${PORT}`);
  console.log(`🌐 Environment: ${process.env.NODE_ENV}`);
});

module.exports = app;