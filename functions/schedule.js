const { MongoClient, ObjectId } = require('mongodb');
const moment = require('moment-timezone');
const axios = require('axios');
require('dotenv').config();

const uri = process.env.MONGODB_URI;
let db;

// Function to connect to the MongoDB database
const connectToDatabase = async () => {
  if (!db) {
    const client = await MongoClient.connect(uri, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    db = client.db('phonescanner');
  }
  return db;
};

// Function to store scheduled calls in MongoDB
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

// Function to make a call using the BulkSMS API
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

    if (response.data && response.data.code === 200) {
      console.log('Voice note sent successfully:', response.data);
      return { success: true, data: response.data };
    } else {
      console.error('Error in API response:', response.data);
      return { success: false, data: response.data };
    }
  } catch (error) {
    console.error('Error sending voice note:', error.message);
    return { success: false, error: error.message };
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

  const { phoneNumbers, date, time, timezone } = JSON.parse(event.body);
  const dateTimeString = `${date} ${time}`;
  const scheduledDateTime = moment.tz(dateTimeString, timezone);

  if (scheduledDateTime <= moment()) {
    return {
      statusCode: 400,
      body: JSON.stringify({ message: 'Scheduled time must be in the future' }),
    };
  }

  scheduledDateTime.subtract(5, 'hours').subtract(30, 'minutes');
  const jobId = new ObjectId();

  try {
    await connectToDatabase();
    await storeScheduledCalls(jobId, phoneNumbers, scheduledDateTime.toDate());

    // Respond to the client
    return {
      statusCode: 200,
      body: JSON.stringify({ message: 'Call scheduled successfully', jobId: jobId.toHexString() }),
    };
  } catch (error) {
    console.error('Error storing scheduled calls:', error.message);
    return {
      statusCode: 500,
      body: JSON.stringify({ message: 'Failed to store scheduled calls' }),
    };
  }
};
