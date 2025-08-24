// ==========================
// 1. Basic Setup & Imports
// ==========================
const dotenv = require("dotenv");
dotenv.config();
const express = require("express");
const cors = require("cors");
const stripe = require("stripe")(process.env.STRIPE_SECRET_KEY);
const { MongoClient, ServerApiVersion, ObjectId } = require("mongodb");
const admin = require("firebase-admin");
const serviceAccount = require("./admin-key.json");

// ==========================
// 2. Firebase Admin Setup
// ==========================
admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
});

// ==========================
// 3. Express App & Middleware
// ==========================
const app = express();
const PORT = process.env.PORT || 5000;
app.use(cors());
app.use(express.json());

// ==========================
// 4. MongoDB Connection
// ==========================
const client = new MongoClient(process.env.MONGODB_URI, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  },
});

// ==========================
// 5. Middleware: Firebase Token Verify
// ==========================
const verifyFirebaseToken = async (req, res, next) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return res.status(401).json({ message: "Unauthorized: No token provided" });
  }
  const idToken = authHeader.split(" ")[1];
  try {
    const decodedToken = await admin.auth().verifyIdToken(idToken);
    req.firebaseUser = decodedToken;
    next();
  } catch (error) {
    return res.status(401).json({ message: "Unauthorized: Invalid token" });
  }
};

// ==========================
// 6. Main App Logic
// ==========================
async function run() {
  try {
    // await client.connect();
    const db = client.db("bloodaid_db");
    const userCollection = db.collection("users");
    const donationRequestsCollection = db.collection("donationRequests");
    const blogsCollection = db.collection("blogs");
    const fundingsCollection = db.collection("fundings");
    const contactsCollection = db.collection("contacts");

    // ====================================================================================
    // ====================================================================================
    // ====================================================================================
    // ====================================================================================


    // ========== Admin Middleware ==========
    const verifyAdmin = async (req, res, next) => {
      const user = await userCollection.findOne({
        email: req.firebaseUser.email,
      });

      if (user.role === "admin") {
        next();
      } else {
        res.status(403).send({ msg: "unauthorized" });
      }
    };

    // ========== Contact Us API ========== 
    app.post("/contacts", async (req, res) => {
      const contact = req.body;
      contact.createdAt = new Date();
      const result = await contactsCollection.insertOne(contact);
      res.send(result);
    });

    app.get("/contacts", async (req, res) => {
      const contacts = await contactsCollection.find({}).sort({ createdAt: -1 }).toArray();
      res.send(contacts);
    });

    // ========== Donor Search APIs ==========
    // Option-based search (blood group, district, upazila)
    app.get("/search-donors", async (req, res) => {
      const { bloodGroup, district, upazila } = req.query;

      
      // Custom Fixed for (+/- issues)
      //------------------------------------------------------------
      let lastFixed = bloodGroup.slice(-1);
      const sym = (lastFixed == 'p') ? '+' : '-';
      let FixedBlood = bloodGroup.slice(0, -1) + sym;
      //------------------------------------------------------------
      // console.log( "✅ Fixed Custom:",FixedBlood, sym);


      const query = {
        bloodGroup: FixedBlood,
        district,
        upazila,
        status: "active",
        role: "donor"
      };
      const donors = await userCollection.find(query).toArray();
      console.log("Search Query:", query, "\nFound Donors:", donors.length);

      res.send(donors);
    });

    // Dynamic search (name, bloodGroup, district, upazila)
    app.get("/search-donors-dynamic", async (req, res) => {
      const { query } = req.query;
      const searchRegex = new RegExp(query, "i");
      const donors = await userCollection.find({
        $or: [
          { name: searchRegex },
          { bloodGroup: searchRegex },
          { district: searchRegex },
          { upazila: searchRegex }
        ],
        status: "active",
        role: "donor"
      }).toArray();
      res.send(donors);
    });

    // ========== User Routes ==========
    // Add or update user (on registration/login)
    app.post("/add-user", async (req, res) => {
      const userData = req.body;
      const find_result = await userCollection.findOne({ email: userData.email });
      if (find_result) {
        userCollection.updateOne(
          { email: userData.email },
          { $inc: { loginCount: 1 } }
        );
        res.send({ msg: "user already exist" });
      } else {
        const result = await userCollection.insertOne({ ...userData, status: "active" });
        res.send(result);
      }
    });

    // Get user role/status (for frontend auth)
    app.get("/get-user-role", verifyFirebaseToken, async (req, res) => {
      const user = await userCollection.findOne({
        email: req.firebaseUser.email,
      });
      res.send({ msg: "OOKK", role: user.role, status: user.status, UserCollection_Data: user });
    });

    // Get all users (admin only)
    app.get("/get-users", verifyFirebaseToken, verifyAdmin, async (req, res) => {
      const users = await userCollection
        .find({ email: { $ne: req.firebaseUser.email } })
        .toArray();
      res.send(users);
    });

    // Get user by email (for profile/dashboard)
    app.get("/get-user-by-email", async (req, res) => {
      const user = await userCollection.findOne({ email: req.query.email });
      res.send(user);
    });
// Update user by email (admin only)
app.patch("/user/:email", verifyFirebaseToken, verifyAdmin, async (req, res) => {
  const { email } = req.params;
  const updateData = req.body;
  try {
    const result = await userCollection.updateOne(
      { email },
      { $set: updateData }
    );
    res.send(result);
  } catch (err) {
    res.status(500).send({ error: "Failed to update user" });
  }
});
    // Get user by id (for admin view)
    app.get("/get-user/:id", async (req, res) => {
      const user = await userCollection.findOne({ _id: new ObjectId(req.params.id) });
      res.send(user);
    });
    // Delete a user by email (admin only)
    app.delete("/user/:email", verifyFirebaseToken, verifyAdmin, async (req, res) => {
      const { email } = req.params;
      try {
        const result = await userCollection.deleteOne({ email });
        res.send(result);
      } catch (err) {
        res.status(500).send({ error: "Failed to delete user" });
      }
    });
    // Update user profile (profile edit)
    app.patch("/update-user", verifyFirebaseToken, async (req, res) => {
      const updateData = req.body;
      const email = req.firebaseUser.email;
      try {
        const result = await userCollection.updateOne(
          { email },
          { $set: updateData }
        );
        const updatedUser = await userCollection.findOne({ email });
        res.send({ success: true, updatedUser, modifiedCount: result.modifiedCount });
      } catch (err) {
        res.status(500).send({ error: "Failed to update user" });
      }
    });

    // Update user role (admin only)
    app.patch("/update-role", verifyFirebaseToken, verifyAdmin, async (req, res) => {
      const { email, role } = req.body;
      const result = await userCollection.updateOne(
        { email },
        { $set: { role } }
      );
      res.send(result);
    });

    // Update user status (block/unblock)
    app.patch("/update-status", async (req, res) => {
      const { email, status } = req.body;
      const result = await userCollection.updateOne(
        { email },
        { $set: { status } }
      );
      res.send(result);
    });

    // ========== Blog Routes ==========
    app.post("/blogs", async (req, res) => {
      const blog = req.body;
      blog.status = "draft";
      blog.createdAt = new Date();
      blog.updatedAt = new Date();
      const result = await blogsCollection.insertOne(blog);
      res.send(result);
    });
    app.get("/blogs", async (req, res) => {
      const blogs = await blogsCollection.find({}).sort({ createdAt: -1 }).toArray();
      res.send(blogs);
    });
// Publish/Unpublish blog (admin only)
app.patch("/blogs/:id/publish", verifyFirebaseToken, verifyAdmin, async (req, res) => {
  const { id } = req.params;
  const { status } = req.body; // "published" or "draft"
  const result = await blogsCollection.updateOne(
    { _id: new ObjectId(id) },
    { $set: { status, updatedAt: new Date() } }
  );
  res.send(result);
});

// Delete blog (admin only)
app.delete("/blogs/:id", verifyFirebaseToken, verifyAdmin, async (req, res) => {
  const result = await blogsCollection.deleteOne({ _id: new ObjectId(req.params.id) });
  res.send(result);
});

    // ========== Donation Request Routes ==========
    // Public donation requests (all status)
    app.get("/public-donation-requests", async (req, res) => {
      const userEmail = req.query.email; // frontend থেকে পাঠাও (optional)
      let query = {};
      if (userEmail) {
        query.requesterEmail = { $ne: userEmail };
      }
      const requests = await donationRequestsCollection
        .find(query)
        .sort({ _id: -1 })
        .toArray();
      res.send(requests);
    });

    // Respond to a donation request (mark as in-progress)
    app.patch("/donation-request/:id/respond", verifyFirebaseToken, async (req, res) => {
      const { id } = req.params;
      const donorInfo = {
        name: req.firebaseUser.name || req.firebaseUser.displayName,
        email: req.firebaseUser.email,
      };
      const result = await donationRequestsCollection.updateOne(
        { _id: new ObjectId(id), donationStatus: "pending" },
        { $set: { donationStatus: "inprogress", donorInfo } }
      );
      res.send(result);
    });

    // Create a new donation request
    app.post("/donation-request", verifyFirebaseToken, async (req, res) => {
      const request = req.body;
      request.donationStatus = "pending"; // default
      const result = await donationRequestsCollection.insertOne(request);
      res.send(result);
    });

    // Admin/all user can see all requests
    app.get("/all-donation-requests", async (req, res) => {
      const requests = await donationRequestsCollection
        .find({})
        .sort({ _id: -1 })
        .toArray();
      res.send(requests);
    });

    // Get all donation requests for a user (with optional limit)
    app.get("/my-donation-requests", async (req, res) => {
      const { email, limit } = req.query;
      const query = { requesterEmail: email };
      let cursor = donationRequestsCollection.find(query).sort({ _id: -1 });
      if (limit) cursor = cursor.limit(parseInt(limit));
      const requests = await cursor.toArray();
      res.send(requests);
    });

    // Get a single donation request by id
    app.get("/donation-request/:id", async (req, res) => {
      const id = req.params.id;
      const request = await donationRequestsCollection.findOne({ _id: new ObjectId(id) });
      res.send(request);
    });

    // Update a donation request (edit)
    app.patch("/donation-request/:id", async (req, res) => {
      const { id } = req.params;
      const updateData = req.body;
      console.log("Update Data:", updateData);
      if (!ObjectId.isValid(id)) {
        return res.status(400).send({ error: "Invalid ObjectId format" });
      }
      try {
        const result = await donationRequestsCollection.updateOne(
          { _id: new ObjectId(id) },
          { $set: updateData }
        );
        console.log("Update Result:", result);
        res.send(result);
      } catch (err) {
        console.error("Update Error:", err);
        res.status(500).send({ error: "Failed to update donation request." });
      }
    });

    // // Delete a donation request
    // app.delete("/donation-request/:id", verifyFirebaseToken, async (req, res) => {
    //   const { id } = req.params;
    //   try {
    //     const result = await donationRequestsCollection.deleteOne({ _id: new ObjectId(id) });
    //     res.send(result);
    //   } catch (err) {
    //     res.status(500).send({ error: "Failed to delete donation request" });
    //   }
    // });

    // ========== Admin Dashboard Stats ==========
    app.get("/admin-dashboard-stats", async (req, res) => {
      const userCount = await userCollection.countDocuments();
      const requestCount = await donationRequestsCollection.countDocuments();
      
      const blogsCount = await blogsCollection.countDocuments();
      const blogsCountDraft = await blogsCollection.countDocuments({ status: "draft" });
      const blogsCountPublished = await blogsCollection.countDocuments({ status: "published" });

      const contactsCount = await contactsCollection.countDocuments();

      
      const fundingsCount = await fundingsCollection.countDocuments();
      const fundingTotalAmount = await fundingsCollection.aggregate([
        { $group: { _id: null, total: { $sum: "$amount" } } }
      ]).toArray();

      res.send({
        totalUsers: userCount,
        totalRequest: requestCount,
        totalBlogs: blogsCount,
        totalBlogsDraft: blogsCountDraft,
        totalBlogsPublished: blogsCountPublished,
        totalContacts: contactsCount,
        totalFundings: fundingsCount,
        totalFundingAmount: fundingTotalAmount[0]?.total || 0

      });
    });

    // Delete a donation request by id
    app.delete("/donation-request/:id", async (req, res) => {
      const { id } = req.params;
      try {
        const result = await donationRequestsCollection.deleteOne({ _id: new ObjectId(id) });
        res.send(result);
      } catch (err) {
        res.status(500).send({ error: "Failed to delete donation request" });
      }
    });

    // ========== Payment (Stripe) ==========
    app.post("/create-payment-intent", async (req, res) => {
      const { amount } = req.body;
      try {
        const paymentIntent = await stripe.paymentIntents.create({
          amount: amount * 100, // in cents
          currency: "usd",
          payment_method_types: ["card"],
        });
        res.send({
          clientSecret: paymentIntent.client_secret,
        });
      } catch (error) {
        res.status(500).json({ error: error.message });
      }
    });


    // ALL Funding Routes ===================================================
    // ======================================================================
    // ==========================
    // Funding API Routes
    // ==========================

    // 1. Save Funding Record (Stripe payment success হলে call করবে)
    app.post("/fundings", async (req, res) => {
      const funding = req.body;
      funding.fundingDate = new Date();
      const result = await fundingsCollection.insertOne(funding);
      console.log("Funding record saved:", result);
      console.log("Funding Data:", funding);
      res.send(result);
    });

    // 2. Get All Fundings (pagination support)
    app.get("/fundings", async (req, res) => {
      const page = parseInt(req.query.page) || 1;
      const limit = parseInt(req.query.limit) || 10;
      const skip = (page - 1) * limit;
      const fundings = await fundingsCollection.find({})
        .sort({ fundingDate: -1 })
        .skip(skip)
        .limit(limit)
        .toArray();
      const total = await fundingsCollection.countDocuments();
      res.send({ fundings, total });
    });

    // 3. Get Total Fundings (stat card/show total)
    app.get("/fundings/total", async (req, res) => {
      const result = await fundingsCollection.aggregate([
        { $group: { _id: null, total: { $sum: "$amount" } } }
      ]).toArray();
      res.send({ totalFunding: result[0]?.total || 0 });
    });




    console.log("connected to MongoDB");
  } finally {
    // Optional: cleanup
  }
}












run().catch(console.dir);

// ==========================
// 7. Root Route & Server Start
// ==========================
app.get("/", async (req, res) => {
  res.send({ msg: "VenTech ~ Server is Running Backend Technology" });
});

app.listen(PORT, () => {
  console.log(`Server is listening on port ${PORT}`);
});