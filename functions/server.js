// functions/index.js
const express = require('express');
const uploadRoutes = require('./upload');
const scheduleRoutes = require('./schedule');
const balanceRoutes = require('./balance');
const scheduledCallsRoutes = require('./scheduledCalls');
const cors=require('cors');


const app = express();

app.use(cors());

app.use('/upload', uploadRoutes);
app.use('/schedule', scheduleRoutes);
app.use('/balance', balanceRoutes);
app.use('/scheduledCalls', scheduledCallsRoutes); // Use the route for scheduled calls

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
