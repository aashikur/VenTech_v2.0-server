# 🩸 BloodAid Server - Blood Donation Platform API

## 🚀 Live API

- **API Base URL:** [https://blood-lagbe-server.vercel.app/](https://blood-lagbe-server.vercel.app/)

---

## 🌟 Project Overview

**BloodAid Server** is the backend RESTful API for the BloodAid blood donation platform.  
Built with Node.js, Express, MongoDB, Firebase Auth, and Stripe,  
it powers user management, blood donation requests, funding, blogs, and contact features.

---

## 🗂️ File Structure
src/ ├── index.js # Main server file ├── admin-key.json # Firebase Admin SDK credentials ├── .env # Environment variables └── ... (other config files)


---

## 🔑 Key Features

- **Authentication & Security**
  - Firebase Auth (JWT)
  - Role-based access (admin, volunteer, donor)
  - Block/unblock user, role change (admin only)
- **Donation Requests**
  - Create, view, edit, delete, respond to requests
  - Status: pending, inprogress, done, canceled
- **Donor Search**
  - Option-based and dynamic search (blood group, district, upazila, name)
- **Funding (Stripe)**
  - Create payment intent, save funding record, get all/total funding
- **Blog System**
  - Add, manage, publish/unpublish, delete blogs
- **Contact**
  - Save and view contact messages
- **Admin Dashboard Stats**
  - Total users, total requests, total funding

---

## 📝 API Endpoints

### **Authentication & User**
- `POST /add-user` — Add or update user (registration/login)
- `GET /get-user-role` — Get user role/status (JWT required)
- `GET /get-users` — Get all users (admin only)
- `GET /get-user-by-email` — Get user by email
- `GET /get-user/:id` — Get user by ID (admin)
- `PATCH /update-user` — Update user profile (JWT required)
- `PATCH /update-role` — Change user role (admin only)
- `PATCH /update-status` — Block/unblock user (admin only)

### **Donation Requests**
- `POST /donation-request` — Create new request (JWT required)
- `GET /my-donation-requests?email=...` — Get user's requests (with optional limit)
- `GET /all-donation-requests` — Get all requests (admin/volunteer)
- `GET /donation-request/:id` — Get request by ID
- `PATCH /donation-request/:id` — Edit request
- `DELETE /donation-request/:id` — Delete request (JWT required)
- `PATCH /donation-request/:id/respond` — Respond to request (mark as inprogress, JWT required)
- `GET /public-donation-requests` — Get all public requests (optionally exclude own)

### **Donor Search**
- `GET /search-donors?bloodGroup=...&district=...&upazila=...` — Option-based search
- `GET /search-donors-dynamic?query=...` — Dynamic search (name, blood group, district, upazila)

### **Blog**
- `POST /blogs` — Add blog
- `GET /blogs` — Get all blogs
- `PATCH /blogs/:id` — Edit blog
- `DELETE /blogs/:id` — Delete blog

### **Funding (Stripe)**
- `POST /create-payment-intent` — Create Stripe payment intent
- `POST /fundings` — Save funding record
- `GET /fundings?page=1&limit=10` — Get all fundings (pagination)
- `GET /fundings/total` — Get total funding

### **Contact**
- `POST /contacts` — Save contact message
- `GET /contacts` — Get all contact messages (admin/volunteer)

### **Admin Dashboard Stats**
- `GET /admin-dashboard-stats` — Get total users, total requests, total funding

---

## 📊 Data Structure

### **User**
```json
{
  "name": "Ashik Rahman",
  "email": "ashik@gmail.com",
  "avatar": "",
  "bloodGroup": "A+",
  "district": "Dhaka",
  "upazila": "Dhamrai",
  "status": "active",
  "role": "donor",
  "loginCount": 1,
  "displayName": "Ashik",
  "photoURL": "https://randomuser.me/api/portraits/men/11.jpg"
}

Donation Request

{
  "requesterName": "Ashik Rahman",
  "requesterEmail": "ashik@gmail.com",
  "recipientName": "Rafiq Rahman",
  "recipientDistrict": "Dhaka",
  "recipientUpazila": "Dhamrai",
  "hospitalName": "Dhaka Medical",
  "addressLine": "Dhamrai Main Road",
  "bloodGroup": "A+",
  "donationDate": "2024-06-01",
  "donationTime": "10:00",
  "requestMessage": "Need blood for surgery.",
  "donationStatus": "pending",
  "donorInfo": { "name": "Shila Akter", "email": "shila2@mailinator.com" }
}

Funding
{
  "userName": "Ashik Rahman",
  "userEmail": "ashik@gmail.com",
  "amount": 500,
  "fundingDate": "2024-06-01T12:34:56.000Z",
  "paymentId": "stripe_payment_id",
  "status": "succeeded"
}

Blog
{
  "title": "Why Donate Blood?",
  "thumbnail": "https://imgbb.com/your-image.png",
  "content": "Blood donation saves lives...",
  "author": "Ashik Rahman",
  "authorPhoto": "https://randomuser.me/api/portraits/men/11.jpg",
  "status": "published",
  "createdAt": "2024-06-01T12:34:56.000Z",
  "updatedAt": "2024-06-01T12:34:56.000Z"
}





Contact 
{
  "name": "Ashik Rahman",
  "email": "ashik@gmail.com",
  "subject": "General Query",
  "message": "How can I donate blood?",
  "createdAt": "2024-06-01T12:34:56.000Z"
}


🔐 Environment Variables
Create a .env file in the root directory with the following variables:
PORT=5000
MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/bloodaid_db
STRIPE_SECRET_KEY=your_stripe_secret_key
# Firebase Admin SDK credentials (see your admin-key.json)


🛠️ How to Run Locally

# Clone the repository
git clone https://github.com/your-username/blood-aid-server.git

# Navigate to project directory
cd blood-aid-server

# Install dependencies
npm install

# Create .env file and add your MongoDB, Stripe, Firebase config

# Start the development server
npm start
# or
node index.js

 Deployment
MongoDB Atlas account with database setup
Firebase project with Authentication enabled
Stripe account (test mode for dev)
Environment variables configured on hosting platform (Vercel, Render, etc.)
📢 Need Help?
For any feature, bug, or extension,
just ask your AI assistant with this README as context!
Example:
"How to add a new funding stat API?"
"How to add a new field to the donation request?"
"How to add admin-only access to a route?"
This README contains all the context, structure, and feature details needed for any AI model or developer to continue, extend, or debug the project without further explanation.

Live API: https://blood-lagbe-server.vercel.app/