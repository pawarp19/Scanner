// functions/balance.js
const axios = require('axios');
require('dotenv').config();

const fetchBulkSmsBalance = async () => {
  try {
    const response = await axios.post('https://www.bulksmsplans.com/api/check_balance', null, {
      params: {
        api_id: process.env.BULKSMS_API_ID,
        api_password: process.env.BULKSMS_API_PASSWORD
      }
    });

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

exports.handler = async (event) => {
  if (event.httpMethod !== 'GET') {
    return {
      statusCode: 405,
      body: JSON.stringify({ message: 'Method Not Allowed' }),
    };
  }

  try {
    const balance = await fetchBulkSmsBalance();
    return {
      statusCode: 200,
      body: JSON.stringify({ balance }),
    };
  } catch (error) {
    console.error('Failed to fetch balance:', error.message);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: 'Failed to fetch balance' }),
    };
  }
};
