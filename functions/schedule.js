// functions/schedule.js
const { storeScheduledCalls, makeCall } = require('./utils');
const moment = require('moment-timezone');
const { ObjectId } = require('mongodb');
const cron = require('node-cron');

exports.handler = async function(event, context) {
  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      body: JSON.stringify({ message: 'Method Not Allowed' })
    };
  }

  const { phoneNumbers, date, time, timezone } = JSON.parse(event.body);

  const dateTimeString = `${date} ${time}`;
  const scheduledDateTime = moment.tz(dateTimeString, timezone);

  if (scheduledDateTime <= moment()) {
    return {
      statusCode: 400,
      body: JSON.stringify({ message: 'Scheduled time must be in the future' })
    };
  }

  scheduledDateTime.subtract(5, 'hours').subtract(30, 'minutes');
  const cronTime = `${scheduledDateTime.minutes()} ${scheduledDateTime.hours()} ${scheduledDateTime.date()} ${scheduledDateTime.month() + 1} *`;

  const jobId = new ObjectId();

  try {
    await storeScheduledCalls(jobId, phoneNumbers, scheduledDateTime.toDate());

    cron.schedule(cronTime, async () => {
      try {
        const result = await makeCall(phoneNumbers, scheduledDateTime.toDate());
        const statusMessage = result.success ? 'Success' : 'Failed';

        const scheduledCallsCollection = db.collection('scheduledCalls');
        await scheduledCallsCollection.updateOne(
          { jobId },
          { $set: { status: statusMessage, message: `Scheduled call at ${moment.tz(scheduledDateTime, timezone).format('LLLL')}: ${statusMessage}` } }
        );
      } catch (error) {
        console.error('Error executing cron job:', error.message);
      }
    });

    return {
      statusCode: 200,
      body: JSON.stringify({ message: 'Call scheduled successfully', jobId: jobId.toHexString() })
    };
  } catch (error) {
    return {
      statusCode: 500,
      body: JSON.stringify({ message: 'Failed to store scheduled calls', error: error.message })
    };
  }
};
