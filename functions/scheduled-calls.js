// netlify/functions/scheduled-call.js
const { MongoClient, ObjectId } = require('mongodb');
const moment = require('moment-timezone');
const axios = require('axios');
require('dotenv').config();

const uri = process.env.MONGODB_URI;
let db;

const connectToMongoDB = async () => {
  if (!db) {
    try {
      const client = await MongoClient.connect(uri, { useNewUrlParser: true, useUnifiedTopology: true });
      db = client.db('phonescanner');
    } catch (err) {
      console.error('Error connecting to MongoDB:', err);
      throw err;
    }
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
    return { success: response.data.code === 200, data: response.data };
  } catch (error) {
    console.error('Error sending voice note:', error.message);
    return { success: false, error: error.message };
  }
};

exports.handler = async () => {
  await connectToMongoDB();

  const now = new Date();
  const scheduledCallsCollection = db.collection('scheduledCalls');

  // Find all calls that are scheduled to be executed now
  const calls = await scheduledCallsCollection.find({
    scheduledDateTime: { $lte: now },
    status: 'Pending'
  }).toArray();

  for (const call of calls) {
    try {
      const result = await makeCall(call.phoneNumbers, call.scheduledDateTime);
      const statusMessage = result.success ? 'Success' : 'Failed';

      await scheduledCallsCollection.updateOne(
        { _id: call._id },
        { $set: { status: statusMessage, message: `Scheduled call at ${moment(call.scheduledDateTime).format('LLLL')}: ${statusMessage}` } }
      );
      console.log(`Scheduled call at ${moment(call.scheduledDateTime).format('LLLL')} for ${call.phoneNumbers.length} phone numbers: ${statusMessage}`);
    } catch (error) {
      console.error('Error executing scheduled call:', error.message);
    }
  }

  return {
    statusCode: 200,
    body: JSON.stringify({ message: 'Scheduled function executed successfully' }),
  };
};
