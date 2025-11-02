import express from "express";
import bodyParser from "body-parser";
import dotenv from "dotenv";
import { Resend } from "resend";
import cors from "cors";

dotenv.config();

const app = express();
app.use(cors());
app.use(bodyParser.json());

const resend = new Resend(process.env.RESEND_API_KEY);

// Store OTPs temporarily in memory (for demo)
const otpStore = new Map();

app.post("/api/send-otp", async (req, res) => {
  try {
    const { email } = req.body;
    if (!email) return res.status(400).json({ error: "Email is required" });

    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    otpStore.set(email, otp);

    const { data, error } = await resend.emails.send({
      from: "OTP Service <onboarding@resend.dev>",
      to: email,
      subject: "Your OTP Code",
      html: `<p>Your OTP code is <b>${otp}</b>. It will expire in 10 minutes.</p>`,
    });

    if (error) return res.status(500).json({ error: error.message });

    console.log(`✅ OTP sent to ${email}: ${otp}`);
    res.json({ success: true });
  } catch (err) {
    console.error("Error sending OTP:", err);
    res.status(500).json({ error: "Failed to send OTP" });
  }
});

app.post("/api/verify-otp", (req, res) => {
  const { email, otp } = req.body;
  const validOtp = otpStore.get(email);
  if (validOtp && validOtp === otp) {
    otpStore.delete(email);
    return res.json({ success: true });
  }
  res.status(400).json({ success: false, error: "Invalid OTP" });
});

const PORT = process.env.PORT || 4000;
app.listen(PORT, () => console.log(`✅ Server running on port ${PORT}`));
