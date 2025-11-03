// server.js
require("dotenv").config();
const express = require("express");
const bodyParser = require("body-parser");
const cors = require("cors");
const nodemailer = require("nodemailer");

const app = express();
app.use(cors());
app.use(bodyParser.json());

// --------------------
// In-memory OTP store
// --------------------
const otps = new Map(); // email -> { otp, expiresAt }

// --------------------
// Generate 6-digit OTP
// --------------------
function generateOtp() {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

// --------------------
// Nodemailer setup
// --------------------
const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: process.env.SMTP_PORT,
  secure: process.env.SMTP_SECURE === "true",
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
});

// --------------------
// API: Send OTP
// --------------------
app.post("/api/send-otp", async (req, res) => {
  try {
    const { email } = req.body;
    if (!email) return res.status(400).json({ error: "Email is required" });

    const otp = generateOtp();
    const expiresAt = Date.now() + 5 * 60 * 1000; // 5 minutes

    // Save OTP in memory
    otps.set(email, { otp, expiresAt });

    // Send OTP email via Gmail
    await transporter.sendMail({
      from: process.env.FROM_EMAIL,
      to: email,
      subject: "Your OTP Code",
      html: `
        <div style="font-family: Arial, sans-serif; text-align: center;">
          <h2>OTP Verification</h2>
          <p>Your OTP code is:</p>
          <h1 style="color: #2d6cdf;">${otp}</h1>
          <p>This OTP will expire in 5 minutes.</p>
        </div>
      `,
    });

    console.log(`✅ OTP sent to ${email}`);
    res.json({ message: "OTP sent successfully" });
  } catch (err) {
    console.error("Error sending OTP:", err);
    res.status(500).json({ error: "Failed to send OTP" });
  }
});

// --------------------
// API: Verify OTP
// --------------------
app.post("/api/verify-otp", (req, res) => {
  const { email, otp } = req.body;
  if (!email || !otp)
    return res.status(400).json({ error: "Email and OTP are required" });

  const record = otps.get(email);
  if (!record)
    return res.status(400).json({ error: "No OTP sent to this email" });

  if (Date.now() > record.expiresAt) {
    otps.delete(email);
    return res.status(400).json({ error: "OTP expired" });
  }

  if (otp === record.otp) {
    otps.delete(email);
    return res.json({ message: "OTP verified successfully ✅" });
  } else {
    return res.status(400).json({ error: "Invalid OTP" });
  }
});

// --------------------
// Start server
// --------------------
const PORT = process.env.PORT || 4000;
app.listen(PORT, () => console.log(`✅ Server running on port ${PORT}`));
