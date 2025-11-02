// server.js
require("dotenv").config();
const express = require("express");
const bodyParser = require("body-parser");
const cors = require("cors");
const { Resend } = require("resend");

const app = express();
app.use(cors());
app.use(bodyParser.json());

// Initialize Resend
const resend = new Resend(process.env.RESEND_API_KEY);

// Temporary in-memory store (for demo only)
const otps = new Map(); // key: email -> { otp, expiresAt, attempts }

// Generate 6-digit OTP
function generateOtp() {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

// ✅ Root route (for quick Render health check)
app.get("/", (req, res) => {
  res.send("✅ OTP Backend Server is running successfully!");
});

// API: Send OTP
app.post("/api/send-otp", async (req, res) => {
  try {
    const { email } = req.body;
    if (!email) return res.status(400).json({ error: "Email is required" });

    const otp = generateOtp();
    const expiresAt = Date.now() + 5 * 60 * 1000; // 5 minutes expiry

    otps.set(email, { otp, expiresAt, attempts: 0 });

    // Email content
    const htmlContent = `
      <div style="font-family:sans-serif;">
        <h2>🔐 Your OTP Code</h2>
        <p>Your OTP is <b>${otp}</b>. It will expire in <b>5 minutes</b>.</p>
      </div>
    `;

    // Send email using Resend API
    await resend.emails.send({
      from: process.env.FROM_EMAIL || "noreply@yourdomain.com",
      to: email,
      subject: "Your OTP Code",
      html: htmlContent,
    });

    console.log(`✅ OTP ${otp} sent to ${email}`);
    res.json({ message: "OTP sent successfully" });
  } catch (err) {
    console.error("❌ Error sending OTP:", err);
    res.status(500).json({ error: "Failed to send OTP" });
  }
});

// API: Verify OTP
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

  record.attempts += 1;
  if (record.attempts > 5) {
    otps.delete(email);
    return res.status(429).json({ error: "Too many attempts" });
  }

  if (otp === record.otp) {
    otps.delete(email);
    console.log(`✅ OTP verified for ${email}`);
    return res.json({ message: "OTP verified successfully ✅" });
  } else {
    return res.status(400).json({ error: "Invalid OTP" });
  }
});

// Start server
const PORT = process.env.PORT || 4000;
app.listen(PORT, () => console.log(`✅ Server running on port ${PORT}`));
