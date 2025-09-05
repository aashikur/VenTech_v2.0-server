require("dotenv").config();

const PORT = process.env.PORT || 3000;
const MONGODB_URI = process.env.MONGODB_URI_PATH;

if (!MONGODB_URI) {
  throw new Error("❌ Missing MONGODB_URI_PATH in .env");
}

module.exports = { PORT, MONGODB_URI };
