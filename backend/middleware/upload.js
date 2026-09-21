const multer = require("multer");
const path = require("path");
const fs = require("fs");

// Ensure upload dirs exist
["uploads/candidates", "uploads/voter-docs"].forEach((dir) => {
  const fullPath = path.join(__dirname, "..", dir);
  if (!fs.existsSync(fullPath)) fs.mkdirSync(fullPath, { recursive: true });
});

// Storage factory
const createStorage = (dest) =>
  multer.diskStorage({
    destination: (req, file, cb) => {
      cb(null, path.join(__dirname, "..", dest));
    },
    filename: (req, file, cb) => {
      const ext = path.extname(file.originalname).toLowerCase();
      const name = `${Date.now()}-${Math.random().toString(36).slice(2)}${ext}`;
      cb(null, name);
    },
  });

const imageFilter = (req, file, cb) => {
  const allowed = /jpeg|jpg|png|gif|webp/;
  if (allowed.test(path.extname(file.originalname).toLowerCase())) {
    cb(null, true);
  } else {
    cb(new Error("Only image files are allowed"));
  }
};

const docFilter = (req, file, cb) => {
  const allowed = /jpeg|jpg|png|gif|webp|pdf/;
  if (allowed.test(path.extname(file.originalname).toLowerCase())) {
    cb(null, true);
  } else {
    cb(new Error("Only image or PDF files are allowed"));
  }
};

// Candidate photo upload
const candidateUpload = multer({
  storage: createStorage("uploads/candidates"),
  fileFilter: imageFilter,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB
});

// Voter document upload
const voterDocUpload = multer({
  storage: createStorage("uploads/voter-docs"),
  fileFilter: docFilter,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB
});

// General image upload (memory storage for IPFS)
const memoryUpload = multer({
  storage: multer.memoryStorage(),
  fileFilter: imageFilter,
  limits: { fileSize: 5 * 1024 * 1024 },
});

module.exports = { candidateUpload, voterDocUpload, memoryUpload };