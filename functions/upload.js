// functions/upload.js
const multer = require('multer');
const { ImageAnnotatorClient } = require('@google-cloud/vision');
const { Buffer } = require('buffer');
require('dotenv').config();

const upload = multer({ storage: multer.memoryStorage() });
const visionClient = new ImageAnnotatorClient({
  credentials: JSON.parse(Buffer.from(process.env.GOOGLE_APPLICATION_CREDENTIALS_JSON, 'base64').toString('utf-8')),
});

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

const extractPhoneNumbers = (text) => {
  const allNumbers = text.match(/\d{10}/g) || [];
  return allNumbers;
};

exports.handler = async (event) => {
  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      body: JSON.stringify({ message: 'Method Not Allowed' }),
    };
  }

  const base64String = event.body;
  const buffer = Buffer.from(base64String, 'base64');

  try {
    const phoneNumbers = await googleVisionApi(buffer);
    if (phoneNumbers.length === 0) {
      throw new Error('No valid phone numbers found');
    }
    return {
      statusCode: 200,
      body: JSON.stringify({ phoneNumbers }),
    };
  } catch (error) {
    console.error('Error processing image:', error.message);
    return {
      statusCode: 500,
      body: JSON.stringify({ message: 'Error processing the image', error: error.message }),
    };
  }
};
