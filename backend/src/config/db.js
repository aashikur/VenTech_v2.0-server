const mongoose = require("mongoose");
const { MONGODB_URI } = require("./env");

mongoose.set("strictQuery", true);

async function connectDB() {
  try {
    await mongoose.connect(MONGODB_URI, { dbName: "ventech_db" });
    console.log("✅ Connected to MongoDB");
  } catch (err) {
    console.error("❌ MongoDB connection error:", err);
    process.exit(1);
  }
}

module.exports = connectDB;
