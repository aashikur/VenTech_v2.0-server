/**
 * @fileoverview Main application entry point for VenTech Backend API
 * 
 * This file initializes the Express application, sets up middleware,
 * connects to MongoDB, and configures Firebase Admin. It serves as the
 * central hub for all API routes and core functionality.
 * 
 * Key Features:
 * - Express server setup with CORS and JSON parsing
 * - MongoDB connection with mongoose
 * - Firebase Admin initialization for authentication
 * - API routes for auth, products, orders, blogs etc.
 * - Error handling middleware
 */

require("dotenv").config();
const express = require("express");
const cors = require("cors");
const { connectDB } = require("./config/db.config");
const { initializeFirebase } = require("./config/firebase.config");

// Initialize express app
const app = express();
const PORT = process.env.PORT || 3000;

/**
 * Middleware Setup
 * - CORS: Enables cross-origin requests
 * - express.json(): Parses JSON request bodies
 */
app.use(cors());
app.use(json());

/**
 * Database Connection
 * Establishes connection to MongoDB using mongoose
 * Exits process on connection failure
 */
connectDB();

/**
 * Firebase Admin Initialization
 * Sets up Firebase Admin SDK for auth verification
 * Required for protected routes
 */
initializeFirebase();

/**
 * Route Imports & Setup
 * Modular routing system broken down by feature
 */
app.use("/api/v1/auth", require("./routes/auth.routes"));
app.use("/api/v1/admin", require("./routes/admin.routes"));
app.use("/api/v1/products", require("./routes/product.routes"));
app.use("/api/v1/orders", require("./routes/order.routes"));
app.use("/api/v1/blogs", require("./routes/blog.routes"));

/**
 * Health Check Endpoint
 * Simple route to verify API is running
 */
app.get("/api/v1/health", (_req, res) => {
  res.json({ status: "healthy", timestamp: new Date() });
});

/**
 * Global Error Handler
 * Catches any unhandled errors and sends appropriate response
 */
app.use((err, _req, res, _next) => {
  console.error("Unhandled error:", err);
  res.status(500).json({ 
    error: "Server error",
    message: process.env.NODE_ENV === "development" ? err.message : undefined
  });
});

// Comment out for Vercel deployment
// app.listen(PORT, () => console.log(`🚀 Server running on port ${PORT}`));

// Export for Vercel
module.exports = app;