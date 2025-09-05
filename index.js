// index.js - Firebase-auth-aware backend for VenTech
require("dotenv").config();
const express = require("express");
const cors = require("cors");
const mongoose = require("mongoose");
const { z } = require("zod");
const admin = require("firebase-admin");
const path = require("path");
const PORT = process.env.PORT || 3000;
const MONGODB_URI = process.env.MONGODB_URI_PATH;

if (!MONGODB_URI) {
  throw new Error("Missing MONGODB_URI_PATH in .env");
}

// ----------------- Firebase Admin Init -----------------
try {
  const serviceAccount = require(path.join(__dirname, "admin-key.json")); // <-- load directly
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
  });
  console.log("✅ Firebase Admin initialized with admin-key.json");
} catch (err) {
  console.error("❌ Failed to load admin-key.json:", err);
  process.exit(1);
}

// ----------------- App + Middleware -----------------
const app = express();
app.use(cors());
app.use(express.json());

// ----------------- Mongoose Connect -----------------
mongoose.set("strictQuery", true);
mongoose
  .connect(MONGODB_URI, { dbName: "ventech_db" })
  .then(() => console.log("✅ Connected to MongoDB"))
  .catch((err) => {
    console.error("❌ MongoDB connect error:", err);
    process.exit(1);
  });

// ----------------- Schemas & Models -----------------
const { Schema, model } = mongoose;

const ShopDetailsSchema = new Schema(
  {
    shopName: { type: String, trim: true },
    shopNumber: { type: String, trim: true },
    shopAddress: { type: String, trim: true },
    tradeLicense: { type: String, trim: true },
  },
  { _id: false }
);


const UserSchema = new Schema(
  {
    name: { type: String, required: true, trim: true, minlength: 2 },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    phone: { type: String, default: null },
    photoURL: { type: String, default: null },
    passwordHash: { type: String, default: null }, // optional (firebase handles login)
    // roleRequest: { type: String, enum: ["merchant", "customer"], default: null }, // e.g., "merchant"
    roleRequest: {
      type: {
        type: String,
        enum: ["merchant", "customer"],
        default: null
      },
      status: {
        type: String,
        enum: ["pending", "approved", "rejected"],
        default: null
      },
      requestedAt: {
        type: Date,
        default: Date.now
      }
    },

    district: { type: String, default: null },
    role: { type: String, enum: ["admin", "merchant", "customer"], default: "customer" },
    status: { type: String, enum: ["active", "pending", "blocked"], default: "active" },
    shopDetails: { type: ShopDetailsSchema, default: null },
    loginCount: { type: Number, default: 0 },
  },
  { timestamps: true }
);

const User = model("User", UserSchema);

// ----------------- Zod Validator -----------------
const shopRequestSchema = z.object({
  shopDetails: z
    .object({
      shopName: z.string().min(2),
      shopNumber: z.string().min(1),
      shopAddress: z.string().min(3),
      tradeLicense: z.string().optional().nullable(),
    })
    .optional()
    .nullable(),
});

function validate(schema) {
  return (req, res, next) => {
    const parsed = schema.safeParse(req.body);
    if (!parsed.success) {
      const details = parsed.error.issues.map((i) => ({
        path: i.path.join("."),
        message: i.message,
      }));
      return res.status(400).json({ error: "Validation failed", details });
    }
    req.body = parsed.data;
    next();
  };
}

// ----------------- Auth Middleware -----------------
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
  if (req.user.role !== "merchant") {
    return res.status(403).json({ error: "Only merchants allowed" });
  }
  if (req.user.status !== "active") {
    return res.status(403).json({ error: "Merchant account not approved yet" });
  }
  next();
};

const requireAdmin = (req, res, next) => {
  if (!req.user) return res.status(401).json({ error: "Unauthorized" });
  if (req.user.role !== "admin") return res.status(403).json({ error: "Admin only" });
  next();
};

// ----------------- Routes -----------------
app.get("/api/v1/health", (_req, res) =>
  res.json({ ok: true, db: mongoose.connection.name })
);

// app.post("/api/v1/auth/sync", requireAuth, async (req, res) => {
//   try {
//     const user = await User.findOne({ email: req.user.email })
//       .select("-passwordHash")
//       .lean();
//     return res.json({ user, message: "User synced" });
//   } catch (err) {
//     console.error("Sync error:", err);
//     return res.status(500).json({ error: "Server error" });
//   }
// });

app.get("/api/v1/auth/me", requireAuth, async (req, res) => {
  res.json({ user: req.user });
});

// app.get("/get-user-by-email", async (req, res) => {
//   const { email } = req.query;
//   const user = await User.findOne({ email });
//   if (!user) return res.status(404).json({ message: "User not found" });
//   res.json(user);
// });

// // PATCH /update-profile
// app.patch("/api/v1/auth/update-profile", requireAuth, async (req, res) => {
//   try {
//     const email = req.user.email;
//     const { name, photoURL, phone, district, upazila, shopDetails } = req.body;

//     const updatedUser = await User.findOneAndUpdate(
//       { email },
//       { name, photoURL, phone, district, upazila, shopDetails },
//       { new: true, runValidators: true }
//     );

//     if (!updatedUser) return res.status(404).json({ message: "User not found" });

//     res.json(updatedUser);
//   } catch (err) {
//     res.status(500).json({ message: "Server error", error: err.message });
//   }
// });

app.post("/api/v1/auth/add-user", async (req, res) => {
  try {
    const {
      name,
      email,
      phone,
      role,
      status,
      roleRequest,
      loginCount,
      ventech_user,
      frontend_role,
      shopDetails,
    } = req.body;

    console.log("Incoming user data:", req.body);

    // Upsert: create new or update existing
    const updatedUser = await User.findOneAndUpdate(
      { email }, // filter by email
      {
        $set: {
          name,
        photoURL: "https://cdn-icons-png.flaticon.com/128/3135/3135715.png",
          phone: phone || null,
          role: role || "customer",
          status: status || "active",
          loginCount: loginCount || 1,
          ventech_user: ventech_user ?? true,
          frontend_role: frontend_role || role || "customer",
          roleRequest: roleRequest || null,
          shopDetails: shopDetails || null,
        },
      },
      { new: true, upsert: true } // new: return updated doc, upsert: create if not exists
    );

    res.status(201).json({ user: updatedUser, message: "User created or updated successfully" });
  } catch (err) {
    console.error("Add-user error:", err);
    res.status(500).json({ error: "Server error" });
  }
});



 // ------------------- Request Merchant Role (customar) -------------------
app.post("/api/v1/auth/request-merchant", requireAuth, async (req, res) => {
  try {
    const user = await User.findById(req.user._id);

    if (!user) return res.status(404).json({ message: "User not found" });

    if (user.roleRequest?.type === "merchant" && user.roleRequest?.status === "pending") {
      return res.status(400).json({ message: "Merchant request already pending" });
    }


    // Only update roleRequest and status
    // Update roleRequest as an object
    user.roleRequest = {
      type: "merchant",
      status: "pending",
      requestedAt: new Date(),
    };

    // Keep main account active while waiting
    user.status = "active";
    await user.save();

    res.json({ message: "Request sent successfully", user });
  } catch (err) {
    console.error("Merchant request error:", err);
    res.status(500).json({ message: "Server error" });
  }
});

// Request Merchant Rejected (customar) ------------------
// PATCH /api/v1/admin/reject-merchant/:id
app.patch("/api/v1/admin/reject-merchant/:id", requireAuth, requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;

    const user = await User.findById(id);
    if (!user) return res.status(404).json({ message: "User not found" });

    if (!user.roleRequest || user.roleRequest.type !== "merchant") {
      return res.status(400).json({ message: "No merchant request found" });
    }

    user.roleRequest.status = "rejected";
    user.role = "customer"; // revert role to customer
    await user.save();

    res.json({ message: "Merchant request rejected", user });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
});




























//  -------------------  Get All Users (Admin) -------------------


app.get("/api/v1/admin/users", requireAuth, requireAdmin, async (req, res, next) => {
  try {
    const users = await User.find({ role: { $ne: "admin" } }).sort({ createdAt: -1 });
    res.status(200).json(users);
  } catch (err) {
    next(err); // handled by global error handler
  }
});

// delete user (admin)
// DELETE a user by ID (Admin only)
app.delete("/api/v1/admin/users/:id", requireAuth, requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const user = await User.findByIdAndDelete(id);

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    res.json({ message: "User deleted successfully" });
  } catch (err) {
    console.error("Delete user error:", err);
    res.status(500).json({ message: "Server error" });
  }
});


// ------------------- Pending Merchant (Admin) -------------------
// GET /api/v1/admin/pending-merchants
app.get("/api/v1/admin/pending-merchants", requireAuth,  async (req, res) => {
  try {
    const pendingMerchants = await User.find({
      "roleRequest.type": "merchant",
      "roleRequest.status": "pending"
    }).sort({ "roleRequest.requestedAt": -1 });
    
    res.status(200).json(pendingMerchants);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
});

// ------------------- Approve Merchant (Admin) -------------------

// PATCH /api/v1/admin/approve-merchant/:id
app.patch("/api/v1/admin/approve-merchant/:id", requireAuth, requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;

    const user = await User.findById(id);
    if (!user) return res.status(404).json({ message: "User not found" });

    if (!user.roleRequest || user.roleRequest.type !== "merchant") {
      return res.status(400).json({ message: "No merchant request found" });
    }

    user.roleRequest.status = "approved";
    user.role = "merchant"; // Convert user role
    user.status = user.status === "pending" ? "active" : user.status; // activate if pending
    await user.save();

    res.json({ message: "Merchant approved", user });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
});


//  ------------------- Mailbox Routes -------------------
// ------------------- POST Mailbox -------------------
app.post("/api/public/mailbox", async (req, res) => {
  try {
    const { name, email, subject, message } = req.body;

    if (!name || !email || !subject || !message) {
      return res.status(400).json({ message: "All fields are required" });
    }

    const mailboxCollection = mongoose.connection.collection("mailbox");

    const result = await mailboxCollection.insertOne({
      name,
      email,
      subject,
      message,
      createdAt: new Date(),
    });

    res.status(201).json({ message: "Message saved successfully", id: result.insertedId });
  } catch (err) {
    console.error("Mailbox POST error:", err);
    res.status(500).json({ message: "Server error" });
  }
});
// ------------------- GET Mailbox -------------------
app.get("/api/public/mailbox", async (req, res) => {
  try {
    const mailboxCollection = mongoose.connection.collection("mailbox");

    const messages = await mailboxCollection.find({}).sort({ createdAt: -1 }).toArray();

    res.status(200).json(messages);
  } catch (err) {
    console.error("Mailbox GET error:", err);
    res.status(500).json({ message: "Server error" });
  }
});



// ----------------- Error Handler -----------------
app.use((err, _req, res, _next) => {
  console.error("Unhandled error:", err);
  res.status(500).json({ error: "Server error" });
});

// ----------------- Start Server -----------------
app.listen(PORT, () =>
  console.log(`🚀 VenTech server running at http://localhost:${PORT}`)
);
