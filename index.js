const http = require('http');
const fs = require('fs');
const mongoose = require('mongoose');
const { degrees, PDFDocument, rgb, StandardFonts } = require('pdf-lib');

// Connect to MongoDB
mongoose.connect('mongodb+srv://doradlahari:fileconversion@cluster0.cipoiru.mongodb.net/', { useNewUrlParser: true, useUnifiedTopology: true });
const db = mongoose.connection;

db.on('error', console.error.bind(console, 'MongoDB connection error:'));
db.once('open', function() {
  console.log('Connected to MongoDB for file conversions');
});

// Define a schema for the PDF data
const pdfSchema = new mongoose.Schema({
  data: Buffer,
  created: { type: Date, default: Date.now },
});

// Define a model for the PDF data
const Pdf = mongoose.model('Pdf', pdfSchema);

// Create an HTTP server
http.createServer((req, res) => {
  if (req.method === 'POST' && req.url === '/convert') {
    let body = '';
    req.on('data', (chunk) => {
      body += chunk;
    });
    req.on('end', async () => {
      // Parse the incoming JSON data
      const { imageData } = JSON.parse(body);

      // Convert the JPG image to a PDF
      const jpgData = Buffer.from(imageData, 'base64');
      const pdfDoc = await PDFDocument.create();
      const jpgImage = await pdfDoc.embedJpg(jpgData);
      const jpgDims = jpgImage.scale(0.5);
      const page = pdfDoc.addPage();
      const { width, height } = page.getSize();
      page.drawImage(jpgImage, {
        x: 0,
        y: 0,
        width: jpgDims,
        height: jpgDims.height,
      });

      const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
      const fontSize = 25;
      const text = 'Converted from JPG to PDF using Node.js';
      const textWidth = font.widthOfTextAtSize(text, fontSize);
      page.drawText(text, {
        x: (width - textWidth) / 2,
        y: height / 2 - fontSize,
        size: fontSize,
        font: font,
        color: rgb(0, 0, 0),
      });

      const pdfBytes = await pdfDoc.save();

      // Save the PDF to MongoDB
      const pdf = new Pdf({ data: pdfBytes });
      pdf.save((err, pdf) => {
        if (err) {
          console.error(err);
          res.statusCode = 500;
          res.end('Error saving PDF to MongoDB');
        } else {
          console.log('PDF saved to MongoDB');
          res.setHeader('Content-Type', 'application/json');
          res.statusCode = 200;
          res.end(JSON.stringify({ id: pdf._id }));
        }
      });
    });
  }
}).listen(3000, () => {
  console.log('Server listening on port 3000');
});
