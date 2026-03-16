const multer = require('multer');
const path   = require('path');
const fs     = require('fs');

['uploads/candidates', 'uploads/voter-docs'].forEach(d => {
  if (!fs.existsSync(d)) fs.mkdirSync(d, { recursive: true });
});

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, file.fieldname === 'image' ? 'uploads/candidates' : 'uploads/voter-docs');
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname);
    cb(null, `${Date.now()}-${Math.random().toString(36).slice(2)}${ext}`);
  }
});

module.exports = multer({
  storage,
  fileFilter: (req, file, cb) => cb(null, /jpeg|jpg|png|webp|pdf/.test(path.extname(file.originalname).toLowerCase().slice(1))),
  limits: { fileSize: 10 * 1024 * 1024 },
});