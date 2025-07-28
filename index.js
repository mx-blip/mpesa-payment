const express = require('express');
const cors = require('cors');
const axios = require('axios');

const app = express();
const port = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

// === Safaricom M-Pesa API Credentials ===
const consumerKey = "YOUR_CONSUMER_KEY";
const consumerSecret = "YOUR_CONSUMER_SECRET";
const shortcode = "8848834"; // Till or PayBill number
const passkey = "YOUR_PASSKEY";
const businessName = "KENDAL";

// === Safaricom API URLs ===
const authUrl = "https://sandbox.safaricom.co.ke/oauth/v1/generate?grant_type=client_credentials";
const stkUrl = "https://sandbox.safaricom.co.ke/mpesa/stkpush/v1/processrequest";

// === Helper function for timestamp ===
const getTimestamp = () => {
  const now = new Date();
  return now.getFullYear().toString()
    + String(now.getMonth() + 1).padStart(2, '0')
    + String(now.getDate()).padStart(2, '0')
    + String(now.getHours()).padStart(2, '0')
    + String(now.getMinutes()).padStart(2, '0')
    + String(now.getSeconds()).padStart(2, '0');
};

// === STK Push Payment Endpoint ===
app.post('/pay', async (req, res) => {
  const { phone, amount } = req.body;

  if (!phone || !amount) {
    return res.status(400).json({ success: false, message: "Phone and amount are required" });
  }

  const timestamp = getTimestamp();
  const password = Buffer.from(shortcode + passkey + timestamp).toString('base64');

  try {
    // Step 1: Get Access Token
    const authResponse = await axios.get(authUrl, {
      headers: {
        Authorization: 'Basic ' + Buffer.from(`${consumerKey}:${consumerSecret}`).toString('base64')
      }
    });

    const token = authResponse.data.access_token;

    // Step 2: Initiate STK Push
    const stkResponse = await axios.post(
      stkUrl,
      {
        BusinessShortCode: shortcode,
        Password: password,
        Timestamp: timestamp,
        TransactionType: "CustomerBuyGoodsOnline", // or "CustomerPayBillOnline"
        Amount: amount,
        PartyA: phone,
        PartyB: shortcode,
        PhoneNumber: phone,
        CallBackURL: "https://yourdomain.com/callback", // replace with your actual callback
        AccountReference: "KENDAL",
        TransactionDesc: `Payment to ${businessName}`,
      },
      {
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json"
        }
      }
    );

    res.status(200).json({
      success: true,
      message: "STK Push initiated",
      data: stkResponse.data
    });

  } catch (error) {
    console.error("STK Push error:", error.response?.data || error.message);
    res.status(500).json({
      success: false,
      error: error.response?.data || error.message
    });
  }
});

// === Root Endpoint ===
app.get("/", (req, res) => {
  res.send("✅ M-Pesa STK Backend is running");
});

// === Start Server ===
app.listen(port, () => console.log(`🚀 Server running on port ${port}`));
