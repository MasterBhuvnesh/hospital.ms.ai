const express = require("express");
const router = express.Router();
const nodemailer = require("nodemailer");

// transporter
const transporter = nodemailer.createTransport({
    service: "gmail",
    auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS
    }
});

// POST /send-email
router.post("/", async (req, res) => {
    const { to, subject, text } = req.body;

    try {
        const info = await transporter.sendMail({
            from: process.env.EMAIL_USER,
            to,
            subject,
            text
        });

        res.status(200).json({
            message: "Email sent successfully",
            info
        });

    } catch (error) {
        res.status(500).json({
            message: "Error sending email",
            error
        });
    }
});

module.exports = router;
