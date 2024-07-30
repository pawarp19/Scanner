// functions/upload.js
const express = require('express');
const multer = require('multer');
const { googleVisionApi, extractPhoneNumbers } = require('./utils');
const cors = require('cors');

const router = express.Router();
router.use(cors());
const upload = multer({ storage: multer.memoryStorage() });

router.post('/upload', upload.single('image'), async (req, res) => {
  if (!req.file) {
    console.error('No file uploaded');
    return res.status(400).json({ message: 'No file uploaded' });
  }

  try {
    let phoneNumbers = await googleVisionApi(req.file.buffer);
    if (phoneNumbers.length === 0) {
      throw new Error('No valid phone numbers found');
    }
    res.json({ phoneNumbers });
  } catch (error) {
    console.error('Error processing image:', error.message);
    res.status(500).json({ message: 'Error processing the image', error: error.message });
  }
});

module.exports = router;
