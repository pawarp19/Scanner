// functions/upload.js
const { ImageAnnotatorClient } = require('@google-cloud/vision');
const { Buffer } = require('buffer');
const busboy = require('busboy');
require('dotenv').config();

// Initialize Google Vision API client
const credentials = JSON.parse(Buffer.from(process.env.GOOGLE_APPLICATION_CREDENTIALS_JSON, 'base64').toString('utf-8'));
const visionClient = new ImageAnnotatorClient({
  credentials: {
    client_email: credentials.client_email,
    private_key: credentials.private_key,
  },
});

// Function to extract phone numbers from text
const extractPhoneNumbers = (text) => {
  const allNumbers = text.match(/\d{10}/g) || [];
  return allNumbers;
};

// Function to process the uploaded image
const googleVisionApi = async (buffer) => {
  try {
    const [result] = await visionClient.textDetection({ image: { content: buffer } });
    const detections = result.textAnnotations;
    if (detections.length > 0) {
      const parsedText = detections[0].description;
      console.log('Extracted Text:', parsedText);
      return extractPhoneNumbers(parsedText);
    } else {
      throw new Error('No text detected');
    }
  } catch (error) {
    console.error('Error during text detection:', error.message);
    throw error;
  }
};

// Netlify Function Handler
exports.handler = async (event) => {
  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      body: JSON.stringify({ message: 'Method Not Allowed' }),
    };
  }

  const busboyInstance = busboy({ headers: event.headers });
  const formData = {};

  return new Promise((resolve, reject) => {
    busboyInstance.on('file', (fieldname, file, filename, encoding, mimeType) => {
      const buffers = [];
      file.on('data', (data) => buffers.push(data));
      file.on('end', async () => {
        try {
          const buffer = Buffer.concat(buffers);
          const phoneNumbers = await googleVisionApi(buffer);
          if (phoneNumbers.length === 0) {
            return resolve({
              statusCode: 400,
              body: JSON.stringify({ message: 'No valid phone numbers found' }),
            });
          }
          return resolve({
            statusCode: 200,
            body: JSON.stringify({ phoneNumbers }),
          });
        } catch (error) {
          console.error('Error processing image:', error.message);
          return resolve({
            statusCode: 500,
            body: JSON.stringify({ message: 'Error processing the image', error: error.message }),
          });
        }
      });
    });

    busboyInstance.on('finish', () => {
      // Handle case when no file is uploaded
      if (!Object.keys(formData).length) {
        return resolve({
          statusCode: 400,
          body: JSON.stringify({ message: 'No file uploaded' }),
        });
      }
    });

    event.body.pipe(busboyInstance);
  });
};
