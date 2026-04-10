const express = require("express");
const cors = require("cors");
require("dotenv").config();

const smsRoutes = require("./routes/sms");

const app = express();

app.use(cors());
app.use(express.json());

app.use("/send-sms", smsRoutes);

// Health check endpoint for Docker
app.get("/health", (req, res) => {
    res.status(200).json({ status: "ok", service: "sms-service" });
});

app.listen(process.env.PORT, () => {
    console.log(`SMS service running on port ${process.env.PORT}`);
});
