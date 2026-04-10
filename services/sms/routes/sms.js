const express = require("express");
const router = express.Router();
const twilio = require("twilio");

// POST /send-sms
router.post("/", async (req, res) => {
    const { to, message } = req.body;

    if (!to || !message) {
        return res.status(400).json({
            message: "Missing required fields: 'to' and 'message'"
        });
    }

    try {
        // Lazy-initialize client per request so server boots without crashing on missing credentials
        const client = twilio(
            process.env.TWILIO_SID,
            process.env.TWILIO_AUTH
        );

        const response = await client.messages.create({
            body: message,
            from: process.env.TWILIO_PHONE,
            to: to
        });

        res.status(200).json({
            message: "SMS sent successfully",
            sid: response.sid
        });

    } catch (error) {
        res.status(500).json({
            message: "Error sending SMS",
            error: error.message
        });
    }
});

module.exports = router;
