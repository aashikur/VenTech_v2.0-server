const express = require("express");
const app = express.Router();
const Mailbox = require("../models/Mailbox");
const router = express.Router();

// POST /api/public/mailbox
router.post("/", async (req, res) => {
  try {
    const { name, email, subject, message } = req.body;

    if (!name || !email || !subject || !message) {
      return res.status(400).json({ message: "All fields are required." });
    }

    const newMessage = new Mailbox({ name, email, subject, message });
    await newMessage.save();

    res.status(201).json({ message: "Message saved successfully.", data: newMessage });
  } catch (err) {
    console.error("Mailbox POST error:", err);
    res.status(500).json({ message: "Server error." });
  }
});

module.exports = app;
