const express = require('express');
const paymentsRoute = require('./routes/payments');
const app = express();

app.use(express.json());

app.use('/api/payments', paymentsRoute);

// ... other routes, middleware

module.exports = app;