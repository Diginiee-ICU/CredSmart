const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { optionalAuth } = require('../middleware/auth');

const router = express.Router();

const uploadDir = path.join(__dirname, '../../uploads');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const bucket = req.params.bucket || 'general';
    const dest = path.join(uploadDir, bucket);
    if (!fs.existsSync(dest)) {
      fs.mkdirSync(dest, { recursive: true });
    }
    cb(null, dest);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
    const ext = path.extname(file.originalname);
    cb(null, `${uniqueSuffix}${ext}`);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 20 * 1024 * 1024 }, // 20 MB max
});

// POST /api/upload/:bucket
router.post('/upload/:bucket', optionalAuth, upload.single('file'), (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    const bucket = req.params.bucket;
    const filename = req.file.filename;
    const apiOrigin = process.env.API_BASE_URL || 'https://api.credsmart.online';
    const publicUrl = `${apiOrigin}/storage/v1/object/public/${bucket}/${filename}`;

    return res.json({
      path: filename,
      url: publicUrl,
      publicUrl,
      size: req.file.size,
      mimetype: req.file.mimetype,
    });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

// GET /storage/v1/object/public/:bucket/:filename
router.get('/storage/v1/object/public/:bucket/:filename', (req, res) => {
  const { bucket, filename } = req.params;
  const filePath = path.join(uploadDir, bucket, filename);

  if (!fs.existsSync(filePath)) {
    return res.status(404).json({ error: 'File not found' });
  }
  return res.sendFile(filePath);
});

module.exports = router;
