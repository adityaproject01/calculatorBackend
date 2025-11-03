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

// In-memory OTP store: email -> { otp, expiresAt }
const otps = new Map();

function generateOtp() {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

// --------------------
// Send OTP
// --------------------
app.post("/api/send-otp", async (req, res) => {
  try {
    const { email } = req.body;
    if (!email) return res.status(400).json({ error: "Email is required" });

    const otp = generateOtp();
    const expiresAt = Date.now() + 5 * 60 * 1000; // 5 min expiry

    otps.set(email, { otp, expiresAt });

    const emailInfo = await resend.emails.send({
      from: process.env.FROM_EMAIL,
      to: email,
      subject: "Your OTP Code",
      html: `<p>Your OTP code is <b>${otp}</b>. Expires in 5 minutes.</p>`,
    });

    console.log(`✅ OTP sent to ${email}`);
    res.json({ message: "OTP sent successfully" });
  } catch (err) {
    console.error("❌ Error sending OTP:", err);
    res.status(500).json({ error: "Failed to send OTP" });
  }
});

// --------------------
// Verify OTP
// --------------------
app.post("/api/verify-otp", (req, res) => {
  const { email, otp } = req.body;

  if (!email || !otp)
    return res.status(400).json({ error: "Email and OTP required" });

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
