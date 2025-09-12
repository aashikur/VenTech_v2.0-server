```markdown
# 🛠️ VenTech Backend

A **Node.js + Express backend** powered by **Firebase Authentication** and **MongoDB (Mongoose ORM)**.  
This backend handles **authentication, user management, merchant workflows, product management, categories, blogs, and mailbox support**.

---

## 🚀 Features

- **Authentication**
  - Firebase Admin for verifying ID tokens
  - Auto-create users on first login
  - Role-based access control (Customer, Merchant, Admin)

- **User Management**
  - Add / update users
  - Request merchant role
  - Approve / reject merchant role (Admin)
  - Admin can list / delete users

- **Merchant Workflow**
  - Merchant role request + approval flow
  - Restricted routes for merchants

- **Products**
  - CRUD operations for products
  - Merchant-only product creation
  - Stock management (update / stock out)
  - Request other merchant’s product
  - Public + private product endpoints

- **Categories**
  - CRUD operations for categories
  - Public category listing

- **Blog**
  - Fetch all blogs / single blog
  - (Create, update, delete routes exist but commented for now)

- **Mailbox**
  - Save contact form messages
  - Public API to fetch all messages

- **Healthcheck**
  - `/api/v1/health` endpoint for quick status check

---

## 📂 Project Structure

```

.
├── index.js              # Main entry point
├── admin-key.json        # Firebase Admin SDK credentials
├── models/               # (Schemas and models inside index.js)
├── .env                  # Environment variables
└── package.json          # Dependencies

````

---

## ⚙️ Tech Stack

- **Runtime**: Node.js + Express
- **Database**: MongoDB + Mongoose
- **Auth**: Firebase Admin SDK
- **Validation**: Zod
- **Other**: dotenv, cors, path

---

## 📦 Dependencies

Main dependencies used:

```json
"dependencies": {
  "cors": "^2.x",
  "dotenv": "^16.x",
  "express": "^4.x",
  "firebase-admin": "^12.x",
  "mongoose": "^7.x",
  "zod": "^3.x"
}
````

---

## 🔑 Environment Variables

Create a `.env` file in the project root:

```env
PORT=3000
MONGODB_URI_PATH=mongodb+srv://your-user:password@cluster.mongodb.net
```

You’ll also need **`admin-key.json`** from Firebase Console:

* Go to Firebase → Project Settings → Service Accounts → Generate Private Key

---

## 🏃 Installation & Running

Clone the repo and install dependencies:

```bash
git clone https://github.com/your-username/ventech-backend.git
cd ventech-backend
npm install
```

Start the development server:

```bash
npm run start
```

or with nodemon (if installed globally):

```bash
nodemon index.js
```

---

## 🔐 Authentication

All protected routes require a **Firebase ID Token** in the request headers:

```http
Authorization: Bearer <firebase-id-token>
```

Use Firebase client SDK in your frontend to get the token after login.

---

## 📡 API Endpoints

### Health

* `GET /api/v1/health` → Check server & DB connection

### Auth

* `GET /api/v1/auth/me` → Get logged-in user
* `POST /api/v1/auth/add-user` → Add or update user
* `POST /api/v1/auth/request-merchant` → Customer requests merchant role

### Admin

* `GET /api/v1/admin/users` → List all users (non-admins)
* `DELETE /api/v1/admin/users/:id` → Delete user
* `PATCH /api/v1/admin/approve-merchant/:id` → Approve merchant request
* `PATCH /api/v1/admin/reject-merchant/:id` → Reject merchant request
* `GET /api/v1/admin/pending-merchants` → List pending merchant requests

### Products

* `POST /api/v1/products` → Add product (merchant only)
* `GET /api/v1/products` → List all products (auth required)
* `GET /api/v1/products/public` → List all products (public)
* `GET /api/v1/products/:id` → Get single product
* `PATCH /api/v1/products/:id/edit` → Edit product (merchant or admin)
* `DELETE /api/v1/products/:id` → Delete product (merchant or admin)
* `PATCH /api/v1/products/:id/update-stock` → Update stock
* `PATCH /api/v1/products/:id/stock-out` → Mark as out-of-stock
* `POST /api/v1/products/:id/request` → Request another merchant’s product

### Categories

* `GET /api/v1/categories` → List categories
* `POST /api/v1/categories` → Add category
* `PATCH /api/v1/categories/:id` → Update category

### Blog

* `GET /api/v1/blogs` → List all blogs
* `GET /api/v1/blogs/:id` → Get single blog
* *(create, update, delete available but commented out)*

### Mailbox

* `POST /api/public/mailbox` → Save contact form message
* `GET /api/public/mailbox` → Fetch all messages

---

## 📖 Notes

* First login automatically creates a user with role `customer`.
* Merchant requests are stored in `roleRequest` field until approved by an Admin.
* `shopDetails` is optional for merchants.
* Default user avatar is set automatically.
* Blog CRUD is **disabled for now** (commented).

---

## ✅ Future Improvements

* Add refresh token + session management
* Enable full blog CRUD
* Add product search + filtering
* Implement product request persistence between merchants
* Improve validation layer with Zod on all routes

---

## 👨‍💻 Author

**VenTech Backend** – built with ❤️ by [Your Name](https://github.com/your-username)

