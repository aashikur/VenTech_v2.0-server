// index.js - Firebase-auth-aware backend for VenTech

// ---------------------------
// ENV & Imports
// ---------------------------
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

// ---------------------------
// Firebase Admin Initialization
// ---------------------------
try {
  const serviceAccount = require(path.join(__dirname, "admin-key.json"));
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
  });
  console.log("✅ Firebase Admin initialized with admin-key.json");
} catch (err) {
  console.error("❌ Failed to load admin-key.json:", err);
  process.exit(1);
}

// ---------------------------
// Express App & Middleware
// ---------------------------
const app = express();
app.use(cors());
app.use(express.json());

// ---------------------------
// MongoDB Connection
// ---------------------------
mongoose.set("strictQuery", true);
mongoose
  .connect(MONGODB_URI, { dbName: "ventech_db" })
  .then(() => console.log("✅ Connected to MongoDB"))
  .catch((err) => {
    console.error("❌ MongoDB connect error:", err);
    process.exit(1);
  });

// ---------------------------
// Schemas & Models
// ---------------------------
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
    passwordHash: { type: String, default: null },
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
      requestedAt: { type: Date, default: Date.now }
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

// ---------------------------
// Zod Validators
// ---------------------------
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

// ---------------------------
// Auth Middlewares
// ---------------------------
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
  if (req.user.role !== "merchant") return res.status(403).json({ error: "Only merchants allowed" });
  if (req.user.status !== "active") return res.status(403).json({ error: "Merchant account not approved yet" });
  next();
};

const requireAdmin = (req, res, next) => {
  if (!req.user) return res.status(401).json({ error: "Unauthorized" });
  if (req.user.role !== "admin") return res.status(403).json({ error: "Admin only" });
  next();
};

// ---------------------------
// Health Check
// ---------------------------
app.get("/api/v1/health", (_req, res) => res.json({ ok: true, db: mongoose.connection.name }));

// ---------------------------
// Auth Routes
// ---------------------------
app.get("/api/v1/auth/me", requireAuth, async (req, res) => {
  res.json({ user: req.user });
});

app.post("/api/v1/auth/add-user", async (req, res) => {
  try {
    const { name, email, phone, role, status, roleRequest, loginCount, ventech_user, frontend_role, shopDetails } = req.body;

    const updatedUser = await User.findOneAndUpdate(
      { email },
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
      { new: true, upsert: true }
    );

    res.status(201).json({ user: updatedUser, message: "User created or updated successfully" });
  } catch (err) {
    console.error("Add-user error:", err);
    res.status(500).json({ error: "Server error" });
  }
});

// ---------------------------
// Merchant Request Routes
// ---------------------------
app.post("/api/v1/auth/request-merchant", requireAuth, async (req, res) => {
  try {
    const user = await User.findById(req.user._id);
    if (!user) return res.status(404).json({ message: "User not found" });

    if (user.roleRequest?.type === "merchant" && user.roleRequest?.status === "pending") {
      return res.status(400).json({ message: "Merchant request already pending" });
    }

    user.roleRequest = { type: "merchant", status: "pending", requestedAt: new Date() };
    user.status = "active";
    await user.save();

    res.json({ message: "Request sent successfully", user });
  } catch (err) {
    console.error("Merchant request error:", err);
    res.status(500).json({ message: "Server error" });
  }
});

app.patch("/api/v1/admin/reject-merchant/:id", requireAuth, requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const user = await User.findById(id);
    if (!user) return res.status(404).json({ message: "User not found" });
    if (!user.roleRequest || user.roleRequest.type !== "merchant") return res.status(400).json({ message: "No merchant request found" });

    user.roleRequest.status = "rejected";
    user.role = "customer";
    await user.save();

    res.json({ message: "Merchant request rejected", user });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
});

app.patch("/api/v1/admin/approve-merchant/:id", requireAuth, requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const user = await User.findById(id);
    if (!user) return res.status(404).json({ message: "User not found" });
    if (!user.roleRequest || user.roleRequest.type !== "merchant") return res.status(400).json({ message: "No merchant request found" });

    user.roleRequest.status = "approved";
    user.role = "merchant";
    user.status = user.status === "pending" ? "active" : user.status;
    await user.save();

    res.json({ message: "Merchant approved", user });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
});

// ---------------------------
// Profile Update Route
// ---------------------------
app.patch("/api/v1/auth/update-profile", requireAuth , async (req, res) => {
  try {
    const { name, phone, district, shopDetails } = req.body;
    const user = await User.findById(req.user._id);
    if (!user) return res.status(404).json({ message: "User not found" });

    user.name = name || user.name;
    user.phone = phone || user.phone;
    user.district = district || user.district;
    user.shopDetails = shopDetails || user.shopDetails;

    await user.save();
    res.json({ message: "Profile updated successfully", user });
  } catch (err) {
    console.error("Update profile error:", err);
    res.status(500).json({ message: "Server error" });
  }
});

// ---------------------------
// Admin User Management Routes
// ---------------------------
app.get("/api/v1/admin/users", requireAuth, requireAdmin, async (req, res, next) => {
  try {
    const users = await User.find({ role: { $ne: "admin" } }).sort({ createdAt: -1 });
    res.status(200).json(users);
  } catch (err) {
    next(err);
  }
});

app.delete("/api/v1/admin/users/:id", requireAuth, requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const user = await User.findByIdAndDelete(id);
    if (!user) return res.status(404).json({ message: "User not found" });
    res.json({ message: "User deleted successfully" });
  } catch (err) {
    console.error("Delete user error:", err);
    res.status(500).json({ message: "Server error" });
  }
});

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

// ---------------------------
// Mailbox Routes
// ---------------------------
app.post("/api/public/mailbox", async (req, res) => {
  try {
    const { name, email, subject, message } = req.body;
    if (!name || !email || !subject || !message) return res.status(400).json({ message: "All fields are required" });

    const mailboxCollection = mongoose.connection.collection("mailbox");
    const result = await mailboxCollection.insertOne({ name, email, subject, message, createdAt: new Date() });

    res.status(201).json({ message: "Message saved successfully", id: result.insertedId });
  } catch (err) {
    console.error("Mailbox POST error:", err);
    res.status(500).json({ message: "Server error" });
  }
});

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

// ---------------------------
// Category Routes
// ---------------------------
const Category = mongoose.model(
  "Category",
  new mongoose.Schema({ name: { type: String, required: true }, image: { type: String } }),
  "categories"
);

app.get("/api/v1/categories", async (req, res) => {
  try {
    const categories = await Category.find({});
    res.json(categories);
  } catch (err) {
    console.error("Failed to fetch categories:", err);
    res.status(500).json({ message: "Failed to fetch categories" });
  }
});

app.post("/api/v1/categories", async (req, res) => {
  try {
    const { name, image } = req.body;
    if (!name) return res.status(400).json({ message: "Category name is required" });

    const newCategory = new Category({ name, image: image || null });
    await newCategory.save();

    res.status(201).json({ success: true, message: "Category created", category: newCategory });
  } catch (err) {
    console.error("Failed to add category:", err);
    res.status(500).json({ message: "Failed to add category" });
  }
});

app.patch("/api/v1/categories/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const { name, image } = req.body;

    const category = await Category.findById(id);
    if (!category) return res.status(404).json({ message: "Category not found" });

    if (name) category.name = name;
    if (image) category.image = image;

    await category.save();
    res.json({ success: true, message: "Category updated", category });
  } catch (err) {
    console.error("Failed to update category:", err);
    res.status(500).json({ message: "Failed to update category" });
  }
});

// ---------------------------
// Product Routes
// ---------------------------
const ProductSchema = new Schema(
  {
    title: { type: String, required: true, trim: true },
    description: { type: String, required: true },
    category: { type: String, required: true },
    categoryImage: { type: String, default: null },
    images: [{ type: String, required: true }],
    retailPrice: { type: Number, required: true },
    merchantPrice: { type: Number, required: true },
    quantity: { type: Number, required: true, min: 0 },
    stockStatus: { type: String, enum: ["in-stock", "out-of-stock"], default: "in-stock" },
    merchantId: { type: Schema.Types.ObjectId, ref: "User", required: true },
  },
  { timestamps: true }
);

const Product = model("Product", ProductSchema);

// Create Product
app.post("/api/v1/products", requireAuth, requireMerchant, async (req, res) => {
  try {
    const { title, description, category, categoryImage, images, retailPrice, merchantPrice, quantity } = req.body;
    const stockStatus = quantity > 0 ? "in-stock" : "out-of-stock";

    const newProduct = new Product({ title, description, category, categoryImage: categoryImage || null, images, retailPrice, merchantPrice, quantity, stockStatus, merchantId: req.user._id });
    await newProduct.save();

    res.status(201).json({ success: true, message: "Product added successfully", product: newProduct });
  } catch (err) {
    console.error("❌ Add Product Error:", err);
    res.status(500).json({ success: false, message: "Failed to add product", error: err.message });
  }
});

// Get Products (All)
app.get("/api/v1/products", requireAuth, async (req, res) => {
  try {
    const products = await Product.find();
    res.json(products);
  } catch (err) {
    console.error("Error fetching products:", err);
    res.status(500).json({ message: "Server Error" });
  }
});

// Public Products
app.get("/api/v1/products/public", async (req, res) => {
  try {
    const products = await Product.find();
    res.json(products);
  } catch (err) {
    console.error("Error fetching public products:", err);
    res.status(500).json({ message: "Failed to fetch products" });
  }
});

app.get("/api/v1/products/:id", async (req, res) => {
  try { 
    const product = await Product.findById(req.params.id);
    res.json(product);
  } catch (err) {
    console.error("Error fetching public products:", err);
    res.status(500).json({ message: "Failed to fetch products" });
  }
});

// Update Stock
app.patch("/api/v1/products/:id/update-stock", requireAuth, requireMerchant, async (req, res) => {
  try {
    const { quantity } = req.body;
    const product = await Product.findById(req.params.id);
    if (!product) 
      return res.status(404).json({ success: false, message: "Product not found" });

    if (product.merchantId.toString() !== req.user._id.toString())
      return res.status(403).json({ success: false, message: "Not authorized" });

    // Update quantity and stockStatus
    product.quantity = quantity;
    product.stockStatus = quantity > 0 ? "in-stock" : "out-of-stock";

    await product.save();

    res.json({ success: true, message: "Stock updated", product });
  } catch (err) {
    console.error("Update stock error:", err);
    res.status(500).json({ success: false, message: "Server Error" });
  }
});



// ----------------- Stock Out -----------------
app.patch(
  "/api/v1/products/:id/stock-out",
  requireAuth,
  requireMerchant,
  async (req, res) => {
    try {
      const product = await Product.findById(req.params.id);
      if (!product)
        return res
          .status(404)
          .json({ success: false, message: "Product not found" });

      if (product.merchantId.toString() !== req.user._id.toString())
        return res
          .status(403)
          .json({ success: false, message: "Not authorized" });

      product.quantity = 0;
      product.stockStatus = "out-of-stock";
      await product.save();

      res.json({
        success: true,
        message: "Product marked as out of stock",
        product,
      });
    } catch (err) {
      console.error(err);
      res.status(500).json({ success: false, message: "Server Error" });
    }
  }
);

// ----------------- Request Other Merchant Product -----------------
app.post(
  "/api/v1/products/:id/request",
  requireAuth,
  requireMerchant,
  async (req, res) => {
    try {
      const product = await Product.findById(req.params.id);
      if (!product)
        return res
          .status(404)
          .json({ success: false, message: "Product not found" });

      if (product.merchantId.toString() === req.user._id.toString())
        return res
          .status(400)
          .json({ success: false, message: "Cannot request your own product" });

      // Optionally: save request to DB here
      res.json({ success: true, message: "Product request sent" });
    } catch (err) {
      console.error(err);
      res.status(500).json({ success: false, message: "Server Error" });
    }
  }
);

// ----------------- Edit Product (Merchant or Admin) -----------------
app.patch("/api/v1/products/:id/edit", requireAuth, async (req, res) => {
  try {
    const { title, images, category, retailPrice, merchantPrice, quantity } =
      req.body;

    const product = await Product.findById(req.params.id);
    if (!product)
      return res
        .status(404)
        .json({ success: false, message: "Product not found" });

    // Only allow merchant owner or admin
    if (
      product.merchantId.toString() !== req.user._id.toString() &&
      req.user.role !== "admin"
    ) {
      return res
        .status(403)
        .json({ success: false, message: "Not authorized" });
    }

    if (title) product.title = title;
    if (images) product.images = images;
    if (category) product.category = category;
    if (retailPrice) product.retailPrice = retailPrice;
    if (merchantPrice) product.merchantPrice = merchantPrice;
    if (quantity !== undefined) {
      product.quantity = quantity;
      product.stockStatus = quantity > 0 ? "in-stock" : "out-of-stock";
    }

    await product.save();

    res.json({ success: true, message: "Product updated successfully", product });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: "Server Error" });
  }
});

// ----------------- Delete Product (Merchant or Admin) -----------------
app.delete("/api/v1/products/:id", requireAuth, async (req, res) => {
  try {
    const product = await Product.findById(req.params.id);
    if (!product)
      return res
        .status(404)
        .json({ success: false, message: "Product not found" });

    // Only allow merchant owner or admin
    if (
      product.merchantId.toString() !== req.user._id.toString() &&
      req.user.role !== "admin"
    ) {
      return res
        .status(403)
        .json({ success: false, message: "Not authorized" });
    }

    await product.deleteOne();
    res.json({ success: true, message: "Product deleted successfully" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: "Server Error" });
  }
});

// =============================== Blog ==================================

// ----------------- Blog Schema + Model -----------------
const blogSchema = new mongoose.Schema(
  {
    title: { type: String, required: true },
    thumbnail: { type: String },
    content: { type: String, required: true },
    author: { type: String },
    authorPhoto: { type: String },
    status: { type: String, enum: ["draft", "published"], default: "draft" },
    category: { type: String },
  },
  { timestamps: true }
);

const Blog = mongoose.model("Blog", blogSchema);

// ----------------- Blog Routes -----------------

// Get all blogs
app.get("/api/v1/blogs", async (req, res) => {
  try {
    const blogs = await Blog.find().sort({ createdAt: -1 });
    res.json(blogs);
  } catch (err) {
    res.status(500).json({ message: "Failed to fetch blogs" });
  }
});

// Get single blog by ID
app.get("/api/v1/blogs/:id", async (req, res) => {
  try {
    const blog = await Blog.findById(req.params.id);
    if (!blog) return res.status(404).json({ message: "Blog not found" });
    res.json(blog);
  } catch (err) {
    res.status(500).json({ message: "Failed to fetch blog" });
  }
});

// ----------------- Error Handler -----------------
app.use((err, _req, res, _next) => {
  console.error("Unhandled error:", err);
  res.status(500).json({ error: "Server error" });
});

// ----------------- Start Server -----------------
// app.listen(PORT, () =>
//   console.log(`🚀 VenTech server running at http://localhost:${PORT}`)
// );


 