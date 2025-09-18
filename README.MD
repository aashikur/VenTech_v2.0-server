# 🛠️ VenTech Backend - Node.js + Express API

A **Node.js + Express backend** for the **VenTech Multi-Vendor Marketplace**, handling **authentication, user management, merchant onboarding, product management, categories, blogs (partial), mailbox support**, built with **Firebase Authentication**, **MongoDB (Mongoose)**, and **Zod validation** with **role-based access control** for **Customer, Merchant, and Admin**.

---

## 🚀 Features

### 🔑 Authentication & User Management
- Firebase Admin SDK for verifying ID tokens
- Automatic user creation on first login
- Role-based access control: Customer / Merchant / Admin
- Profile update support
- Track login count per user

### 🛒 Merchant Workflow
- Customers can request merchant role
- Admin approval/rejection for merchant accounts
- Pending merchant requests listing (admin only)
- Merchant-only restricted endpoints

### 📦 Products
- Product CRUD (Create, Read, Update, Delete)
- Merchant-only product creation
- Public & protected product listings
- Stock management: update / mark out of stock
- Request other merchant’s products

### 🗂️ Categories
- Create, read, update categories
- Public category listing

### 📰 Blog (Basic)
- Fetch all blogs or single blog
- Blog CRUD routes currently disabled

### 📬 Mailbox
- Save contact form messages
- Fetch messages via public API

### 🩺 Healthcheck
- `/api/v1/health` → server + DB status

---

## 📂 Project Structure

```bash
.
├── index.js          # Main backend entry point
├── admin-key.json    # Firebase Admin SDK credentials
├── .env              # Environment variables
├── package.json      # Dependencies
└── (models defined inside index.js for now)
```

---

## ⚙️ Tech Stack

- Node.js + Express
- MongoDB + Mongoose
- Firebase Admin SDK
- Zod validation
- dotenv, cors, path

---

## 🔑 Environment Variables

```env
PORT=3000
MONGODB_URI_PATH=mongodb+srv://your-user:password@cluster.mongodb.net/ventech_db
```

Also require **admin-key.json** from Firebase → Project Settings → Service Accounts → Generate Private Key.

---

## 🏃 Installation & Run

```bash
git clone https://github.com/aashikur/VenTech_v2.0-server.git
cd VenTech_v2.0-server
npm install
npm run start
```

With nodemon:

```bash
nodemon index.js
```

---

## 🔐 Authentication

Protected routes require **Firebase ID Token** in headers:

```http
Authorization: Bearer <firebase-id-token>
```

---

## 📡 API Endpoints

### Health
- `GET /api/v1/health` → Check server & DB status

### Auth
- `GET /api/v1/auth/me` → Get logged-in user
- `PATCH /api/v1/auth/update-profile` → Update profile
- `POST /api/v1/auth/request-merchant` → Request merchant role

### Admin
- `GET /api/v1/admin/pending-merchants` → List pending merchant requests
- `PATCH /api/v1/admin/approve-merchant/:id` → Approve merchant
- `PATCH /api/v1/admin/reject-merchant/:id` → Reject merchant

### Products
- `GET /api/v1/products/public` → List all products (public)
- `GET /api/v1/products` → List all products (protected)
- `POST /api/v1/products` → Add product (merchant only)
- `PATCH /api/v1/products/:id/edit` → Edit product (merchant/admin)
- `PATCH /api/v1/products/:id/update-stock` → Update stock
- `PATCH /api/v1/products/:id/stock-out` → Mark out of stock
- `DELETE /api/v1/products/:id` → Delete product (merchant/admin)
- `POST /api/v1/products/:id/request` → Request another merchant's product

### Categories
- `GET /api/v1/categories` → List categories
- `POST /api/v1/categories` → Create category
- `PATCH /api/v1/categories/:id` → Update category

### Blog
- `GET /api/v1/blogs` → Get all blogs
- `GET /api/v1/blogs/:id` → Get single blog

### Mailbox
- `POST /api/public/mailbox` → Save contact message
- `GET /api/public/mailbox` → Get all messages

### Request List
- `POST /api/v1/request-list` → Create request to another merchant
- `GET /api/v1/request-list` → List all requests

---

## ✅ Notes
- First login auto-creates a customer user
- Merchant requests stored in `roleRequest` until approved
- Admin approval required before merchant can add products
- `shopDetails` optional for merchants
- Blog CRUD disabled (fetch-only)

---

## 👨‍💻 Author

**VenTech Backend** – built with ❤️ by [Ashikur Rahaman](https://github.com/aashikur)
