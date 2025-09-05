const { PORT } = require("./config/env");
const connectDB = require("./config/db");
const app = require("./app");

// Connect DB
connectDB();

// Start server
app.listen(PORT, () => {
  console.log(`🚀 VenTech backend running at http://localhost:${PORT}`);
});
