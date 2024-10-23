const express = require('express');
const multer = require('multer');
const sharp = require('sharp');
const fs = require('fs');
const { PDFDocument } = require('pdf-lib');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

// Serve static files (HTML, CSS, images)
app.use(express.static('public'));

// File storage configuration
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, 'uploads/');
  },
  filename: (req, file, cb) => {
    cb(null, Date.now() + path.extname(file.originalname));
  },
});

const upload = multer({ storage });

// Root route for rendering the upload form
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Handle compression for both images and PDFs
app.post('/compress', upload.single('file'), async (req, res) => {
  const { type, imageWidth, imageQuality, pdfSize } = req.body;
  const filePath = req.file.path;
  const compressedPath = `compressed/${Date.now()}-compressed-${req.file.originalname}`;

  try {
    if (type === 'image') {
      // Compress Image with sharp
      await sharp(filePath)
        .resize(parseInt(imageWidth)) // Custom width
        .jpeg({ quality: parseInt(imageQuality) }) // Custom quality
        .toFile(compressedPath);
    } else if (type === 'pdf') {
      // Compress PDF with pdf-lib
      const pdfBuffer = fs.readFileSync(filePath);
      const pdfDoc = await PDFDocument.load(pdfBuffer);
      pdfDoc.setCreator('Compressed PDF App');
      const compressedPdfBytes = await pdfDoc.save({ useObjectStreams: true });

      fs.writeFileSync(compressedPath, compressedPdfBytes);
    }

    res.download(compressedPath, () => {
      fs.unlinkSync(filePath); // Delete original
      fs.unlinkSync(compressedPath); // Delete compressed after download
    });
  } catch (err) {
    res.status(500).send('Error compressing file');
  }
});

// Ensure directories exist
if (!fs.existsSync('uploads')) fs.mkdirSync('uploads');
if (!fs.existsSync('compressed')) fs.mkdirSync('compressed');

// Start server
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
