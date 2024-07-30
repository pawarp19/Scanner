// functions/schedule.js
const express = require('express');
const cron = require('node-cron');
const { storeScheduledCalls, makeCall } = require('./utils');
const cors = require('cors');
const router = express.Router();
router.use(cors());

router.post('/schedule', async (req, res) => {
  const { phoneNumbers, date, time, timezone } = req.body;

  // Combine date and time into a single string
  const dateTimeString = `${date} ${time}`;
  
  // Convert the combined date-time string to a moment object with the provided timezone
  const scheduledDateTime = moment.tz(dateTimeString, timezone);
  
  if (scheduledDateTime <= moment()) {
    return res.status(400).json({ message: 'Scheduled time must be in the future' });
  }

  // Adjust scheduledDateTime by subtracting 5 hours and 30 minutes
  scheduledDateTime.subtract(5, 'hours').subtract(30, 'minutes');

  // Generate the cron time based on the adjusted local time
  const cronTime = `${scheduledDateTime.minutes()} ${scheduledDateTime.hours()} ${scheduledDateTime.date()} ${scheduledDateTime.month() + 1} *`;

  console.log(`Cron time: ${cronTime}`);
  console.log(`Scheduled time: ${scheduledDateTime.toString()}`);

  const jobId = new ObjectId();

  try {
    await storeScheduledCalls(jobId, phoneNumbers, scheduledDateTime.toDate());
  } catch (error) {
    console.error('Error storing scheduled calls:', error.message);
    return res.status(500).json({ message: 'Failed to store scheduled calls' });
  }

  cron.schedule(cronTime, async () => {
    try {
      console.log(`Executing cron job at ${new Date().toISOString()}`);
      const result = await makeCall(phoneNumbers, scheduledDateTime.toDate());
      const statusMessage = result.success ? 'Success' : 'Failed';

      const scheduledCallsCollection = db.collection('scheduledCalls');
      await scheduledCallsCollection.updateOne(
        { jobId },
        { $set: { status: statusMessage, message: `Scheduled call at ${moment.tz(scheduledDateTime, timezone).format('LLLL')}: ${statusMessage}` } }
      );
      console.log(`Scheduled call at ${moment.tz(scheduledDateTime, timezone).format('LLLL')} for ${phoneNumbers.length} phone numbers: ${statusMessage}`);
    } catch (error) {
      console.error('Error executing cron job:', error.message);
    }
  });

  res.json({ message: 'Call scheduled successfully', jobId: jobId.toHexString() });
});

module.exports = router;
