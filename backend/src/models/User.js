const admin = require("../config/firebase");
const User = require("../models/User");

// 🔹 Verify Firebase token
const requireAuth = async (req, res, next) => {
  const token = req.headers.authorization?.split(" ")[1];
  if (!token) return res.status(401).json({ error: "No token provided" });

  try {
    const decoded = await admin.auth().verifyIdToken(token);
    const email = decoded.email;
    if (!email) return res.status(401).json({ error: "Token missing email" });

    let user = await User.findOne({ email }).lean();
    if (!user) {
      const nameGuess = decoded.name || email.split("@")[0];
      const created = await User.create({
        name: nameGuess,
        email,
        role: "customer",
        status: "active",
        loginCount: 1,
      });
      user = created.toObject();
    } else {
      await User.updateOne({ _id: user._id }, { $inc: { loginCount: 1 } });
      user = await User.findById(user._id).select("-passwordHash").lean();
    }

    req.user = user;
    req.firebaseAuth = decoded;
    next();
  } catch (err) {
    console.error("Token verify error:", err);
    return res.status(401).json({ error: "Invalid or expired token" });
  }
};

const requireMerchant = (req, res, next) => {
  if (!req.user) return res.status(401).json({ error: "Unauthorized" });
  if (req.user.role !== "merchant") return res.status(403).json({ error: "Only merchants allowed" });
  if (req.user.status !== "active") return res.status(403).json({ error: "Merchant account not approved yet" });
  next();
};

const requireAdmin = (req, res, next) => {
  if (!req.user) return res.status(401).json({ error: "Unauthorized" });
  if (req.user.role !== "admin") return res.status(403).json({ error: "Admin only" });
  next();
};

module.exports = { requireAuth, requireMerchant, requireAdmin };
