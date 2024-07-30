// functions/scheduledCalls.js
const express = require('express');
const { MongoClient, ObjectId } = require('mongodb');
const cors = require('cors');

const router = express.Router();

// Ensure you have access to the MongoDB database in this file
let db;
const uri = process.env.MONGODB_URI;

MongoClient.connect(uri, { useNewUrlParser: true, useUnifiedTopology: true })
  .then(client => {
    console.log('Connected to MongoDB');
    db = client.db('phonescanner'); // Replace with your database name
  })
  .catch(err => console.error('Error connecting to MongoDB:', err));

router.get('/scheduled-calls', async (req, res) => {
  try {
    const calls = await db.collection('scheduledCalls').find().toArray();
    res.json(calls);
  } catch (error) {
    console.error('Error fetching scheduled calls:', error);
    res.status(500).json({ error: 'Failed to fetch scheduled calls' });
  }router.use(cors());
});

module.exports = router;
