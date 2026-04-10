const express = require("express");
const cors = require("cors");
require("dotenv").config();

const emailRoutes = require("./routes/email");

const app = express();

app.use(cors());
app.use(express.json());

app.use("/send-email", emailRoutes);

app.listen(process.env.PORT, () => {
    console.log(`Email service running on port ${process.env.PORT}`);
});
