// functions/upload.js
const { googleVisionApi } = require('./utils');

exports.handler = async function(event, context) {
  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      body: JSON.stringify({ message: 'Method Not Allowed' })
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
      body: JSON.stringify({ phoneNumbers })
    };
  } catch (error) {
    return {
      statusCode: 500,
      body: JSON.stringify({ message: 'Error processing the image', error: error.message })
    };
  }
};
