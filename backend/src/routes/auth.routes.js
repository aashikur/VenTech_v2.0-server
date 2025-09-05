const express = require("express");
const User = require("../models/User");
const { requireAuth } = require("../middleware/auth");

const router = express.Router();

// Health check
router.get("/health", (_req, res) =>
  res.json({ ok: true })
);

// Sync user with DB
router.post("/auth/sync", requireAuth, async (req, res) => {
  const user = await User.findOne({ email: req.user.email }).select("-passwordHash").lean();
  res.json({ user, message: "User synced" });
});

// Get current user
router.get("/auth/me", requireAuth, (req, res) => {
  res.json({ user: req.user });
});

// Update profile
router.patch("/auth/update-profile", requireAuth, async (req, res) => {
  try {
    const updatedUser = await User.findOneAndUpdate(
      { email: req.user.email },
      req.body,
      { new: true, runValidators: true }
    );
    res.json(updatedUser);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});


// // POST /api/v1/auth/add-user
// app.post("/api/v1/auth/add-user", async (req, res) => {
//   try {
//     const { name, email, phone, role, status, shopDetails } = req.body;

//     const exists = await User.findOne({ email });
//     if (exists) return res.status(400).json({ error: "User already exists" });

//     const newUser = await User.create({
//       name,
//       email,
//       phone,
//       role: role || "customer",
//       status: status || "active",
//       shopDetails: shopDetails || null,
//       loginCount: 1,
//     });

//     res.status(201).json({ user: newUser, message: "User registered successfully" });
//   } catch (err) {
//     console.error("Add-user error:", err);
//     res.status(500).json({ error: "Server error" });
//   }
// });



module.exports = router;
