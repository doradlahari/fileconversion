// const http = require('http');
// const fs = require('fs');
// const mongoose = require('mongoose');
// const { degrees, PDFDocument, rgb, StandardFonts } = require('pdf-lib');

// // Connect to MongoDB
// mongoose.connect('mongodb+srv://doradlahari:fileconversion@cluster0.cipoiru.mongodb.net/', { useNewUrlParser: true, useUnifiedTopology: true });
// const db = mongoose.connection;

// db.on('error', console.error.bind(console, 'MongoDB connection error:'));
// db.once('open', function() {
//   console.log('Connected to MongoDB for file conversions');
// });

// // Define a schema for the PDF data
// const pdfSchema = new mongoose.Schema({
//   data: Buffer,
//   created: { type: Date, default: Date.now },
// });

// // Define a model for the PDF data
// const Pdf = mongoose.model('Pdf', pdfSchema);

// // Create an HTTP server
// http.createServer((req, res) => {
//   if (req.method === 'POST' && req.url === '/convert') {
//     let body = '';
//     req.on('data', (chunk) => {
//       body += chunk;
//     });
//     req.on('end', async () => {
//       // Parse the incoming JSON data
//       const { imageData } = JSON.parse(body);

//       // Convert the JPG image to a PDF
//       const jpgData = Buffer.from(imageData, 'base64');
//       const pdfDoc = await PDFDocument.create();
//       const jpgImage = await pdfDoc.embedJpg(jpgData);
//       const jpgDims = jpgImage.scale(0.5);
//       const page = pdfDoc.addPage();
//       const { width, height } = page.getSize();
//       page.drawImage(jpgImage, {
//         x: 0,
//         y: 0,
//         width: jpgDims,
//         height: jpgDims.height,
//       });

//       const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
//       const fontSize = 25;
//       const text = 'Converted from JPG to PDF using Node.js';
//       const textWidth = font.widthOfTextAtSize(text, fontSize);
//       page.drawText(text, {
//         x: (width - textWidth) / 2,
//         y: height / 2 - fontSize,
//         size: fontSize,
//         font: font,
//         color: rgb(0, 0, 0),
//       });

//       const pdfBytes = await pdfDoc.save();

//       // Save the PDF to MongoDB
//       const pdf = new Pdf({ data: pdfBytes });
//       pdf.save((err, pdf) => {
//         if (err) {
//           console.error(err);
//           res.statusCode = 500;
//           res.end('Error saving PDF to MongoDB');
//         } else {
//           console.log('PDF saved to MongoDB');
//           res.setHeader('Content-Type', 'application/json');
//           res.statusCode = 200;
//           res.end(JSON.stringify({ id: pdf._id }));
//         }
//       });
//     });
//   }
// }).listen(3000, () => {
//   console.log('Server listening on port 3000');
// });


const express = require('express');
const multer = require('multer');
const mongoose = require('mongoose');
const fs = require('fs');
const sharp = require('sharp');
const path = require('path');

const app = express();
const upload = multer({ dest: 'uploads/' });

// MongoDB connection
mongoose.connect('mongodb+srv://doradlahari:fileconversion@cluster0.cipoiru.mongodb.net/file-conversion-db', { useNewUrlParser: true, useUnifiedTopology: true });
const db = mongoose.connection;

db.on('error', console.error.bind(console, 'MongoDB connection error:'));
db.once('open', function () {
  console.log('Connected to MongoDB');
});

// Define a schema for the PNG data
const pngSchema = new mongoose.Schema(
  {
    data: Buffer,
    created: { type: Date, default: Date.now },
  },
  { collection: 'my_custom_collection' } // can Set our desired collection name here
);

// Define a model for the PNG data
const Png = mongoose.model('Png', pngSchema);

// Create a directory for storing converted images
const storageDirectory = './converted-images/';

// Create the storage directory if it doesn't exist
if (!fs.existsSync(storageDirectory)) {
  fs.mkdirSync(storageDirectory);
}

// Route for converting and storing the image
app.post('/convert', upload.single('image'), async (req, res) => {
  try {
    // Check if file is uploaded
    if (!req.file) {
      res.status(400).json({ error: 'No file uploaded' });
      return;
    }

    // Read the uploaded file and convert it to PNG using sharp
    const image = sharp(req.file.path);
    const convertedImage = await image.png().toBuffer();

    // Save the converted PNG to MongoDB
    const png = new Png({ data: convertedImage });
    await png.save();

    // Generate a unique filename for the converted image
    const fileName = `${Date.now()}.png`;

    // Save the converted image to the storage directory
    const filePath = path.join(storageDirectory, fileName);
    fs.writeFileSync(filePath, convertedImage);

    res.status(200).json({ message: 'Image converted and stored successfully' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'An error occurred during file conversion' });
  }
});

// Start the server
app.listen(3000, () => {
  console.log('Server listening on port 3000');
});


