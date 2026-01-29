const express = require('express');
const axios = require('axios');
const router = express.Router();

router.post('/verify', async (req, res) => {
  const { reference } = req.body;
  if (!reference) {
    return res.status(400).json({ status: 'failed', message: 'No reference supplied' });
  }

  try {
    const paystackRes = await axios.get(
      `https://api.paystack.co/transaction/verify/${reference}`,
      { headers: { Authorization: `Bearer ${process.env.PAYSTACK_SECRET_KEY}` } }
    );

    if (paystackRes.data.data.status === 'success') {
      // ✅ Optionally update user/payment/order in DB here!

      return res.json({ status: 'success' });
    } else {
      return res.json({ status: 'failed', message: 'Payment not successful' });
    }
  } catch (err) {
    return res.status(500).json({ status: 'failed', message: 'Error contacting Paystack' });
  }
});

module.exports = router;