// functions/scheduled-calls.js
const { MongoClient } = require('mongodb');
require('dotenv').config();

const uri = process.env.MONGODB_URI;
let db;

MongoClient.connect(uri, { useNewUrlParser: true, useUnifiedTopology: true })
  .then(client => {
    db = client.db('phonescanner');
  })
  .catch(err => console.error('Error connecting to MongoDB:', err));

exports.handler = async (event) => {
  if (event.httpMethod !== 'GET') {
    return {
      statusCode: 405,
      body: JSON.stringify({ message: 'Method Not Allowed' }),
    };
  }

  try {
    const calls = await db.collection('scheduledCalls').find().toArray();
    return {
      statusCode: 200,
      body: JSON.stringify(calls),
    };
  } catch (error) {
    console.error('Error fetching scheduled calls:', error.message);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: 'Failed to fetch scheduled calls' }),
    };
  }
};
