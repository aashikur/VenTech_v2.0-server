const admin = require("firebase-admin");
const path = require("path");

try {
  const serviceAccount = require(path.join(__dirname, "../../admin-key.json"));

  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
  });

  console.log("✅ Firebase Admin initialized");
} catch (err) {
  console.error("❌ Failed to initialize Firebase Admin:", err);
  process.exit(1);
}

module.exports = admin;
