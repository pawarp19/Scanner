// functions/utils.js
const { MongoClient, ObjectId } = require('mongodb');
const express = require('express');
const { ImageAnnotatorClient } = require('@google-cloud/vision');
const cors = require('cors');
const axios = require('axios');
const moment = require('moment-timezone');
const router = express.Router();
require('dotenv').config();
router.use(cors());

const credentials = JSON.parse(Buffer.from(process.env.GOOGLE_APPLICATION_CREDENTIALS_JSON, 'base64').toString('utf-8'));
const visionClient = new ImageAnnotatorClient({
  credentials: {
    client_email: credentials.client_email,
    private_key: credentials.private_key,
  },
});

const uri = process.env.MONGODB_URI;
let db;

MongoClient.connect(uri, { useNewUrlParser: true, useUnifiedTopology: true })
  .then(client => {
    console.log('Connected to MongoDB');
    db = client.db('phonescanner');
  })
  .catch(err => console.error('Error connecting to MongoDB:', err));

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

const storeScheduledCalls = async (jobId, phoneNumbers, scheduledDateTime) => {
  const scheduledCallsCollection = db.collection('scheduledCalls');

  try {
    await scheduledCallsCollection.insertOne({
      jobId,
      phoneNumbers,
      scheduledDateTime: new Date(scheduledDateTime),
      status: 'Pending',
      message: 'Not attempted yet'
    });
    console.log('Scheduled calls stored in MongoDB');
  } catch (error) {
    console.error('Error storing scheduled calls:', error.message);
    throw error;
  }
};

const makeCall = async (phoneNumbers, scheduledDateTime) => {
  const apiId = process.env.BULKSMS_API_ID;
  const apiPassword = process.env.BULKSMS_API_PASSWORD;
  const voiceType = '9';
  const voiceMediasId = '6151';
  const timezoneId = '53';

  const params = new URLSearchParams();
  params.append('api_id', apiId);
  params.append('api_password', apiPassword);
  params.append('number', phoneNumbers.join(','));
  params.append('voice_type', voiceType);
  params.append('voice_medias_id', voiceMediasId);
  params.append('scheduled', '1');
  params.append('scheduled_datetime', Math.floor(scheduledDateTime.getTime() / 1000));
  params.append('timezone_id', timezoneId);

  try {
    const response = await axios.post('https://www.bulksmsplans.com/api/send_voice_note', params);
    console.log('Voice note sent:', response.data);

    if (response.data && response.data.code === 200) {
      return { success: true, data: response.data };
    } else {
      return { success: false, data: response.data };
    }
  } catch (error) {
    console.error('Error sending voice note:', error.message);
    return { success: false, error: error.message };
  }
};

const fetchBulkSmsBalance = async () => {
  try {
    const response = await axios.post('https://www.bulksmsplans.com/api/check_balance', null, {
      params: {
        api_id: process.env.BULKSMS_API_ID,
        api_password: process.env.BULKSMS_API_PASSWORD
      }
    });

    console.log('Balance check response:', response.data);

    if (response.data && response.data.code === 200 && response.data.data && response.data.data.length > 0) {
      const balance = parseFloat(response.data.data[0].BalanceAmount);
      return balance;
    } else {
      throw new Error('Unable to retrieve balance');
    }
  } catch (error) {
    console.error('Error checking balance:', error.message);
    throw error;
  }
};

module.exports = { googleVisionApi, extractPhoneNumbers, storeScheduledCalls, makeCall, fetchBulkSmsBalance };
