const express = require("express");
const cors = require("cors");

// Routes
const authRoutes = require("./routes/auth.routes");
const adminRoutes = require("./routes/admin.routes");
const merchantRoutes = require("./routes/merchant.routes");

const app = express();
app.use(cors());
app.use(express.json());

// Mount routes
app.use("/api/v1", authRoutes);
app.use("/api/v1/admin", adminRoutes);
app.use("/api/v1/merchant", merchantRoutes);

// Error handler
app.use((err, _req, res, _next) => {
  console.error("Unhandled error:", err);
  res.status(500).json({ error: "Server error" });
});

module.exports = app;
