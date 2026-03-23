# RentIt

A peer-to-peer household item rental platform — a two-sided marketplace where **lenders** list items and **renters** book them.

## Tech Stack

| Layer    | Technology                                           |
|----------|------------------------------------------------------|
| Frontend | React 19 + Vite + Tailwind CSS + React Router v7     |
| Backend  | Express.js (Node.js) + morgan                        |
| Database | PostgreSQL                                           |
| Auth     | JWT (7-day expiry) + bcryptjs                        |
| Storage  | Local disk via multer (`/server/uploads/`)           |

---

## Project Structure

```
rental-platform/
├── client/                   # React + Tailwind frontend (Vite)
│   ├── src/
│   │   ├── api/axios.js      # Axios instance + JWT interceptor
│   │   ├── components/       # Shared UI components
│   │   ├── context/          # AuthContext (global auth state)
│   │   └── pages/            # Route-level page components
│   └── .env.example
├── server/                   # Express.js REST API
│   ├── db/
│   │   ├── schema.sql        # All table definitions
│   │   └── seed.sql          # Demo data (Tashkent themed)
│   ├── middleware/           # auth, adminOnly, upload
│   ├── routes/               # Feature routers
│   └── .env.example
└── README.md
```

---

## Quick Start

### Prerequisites

- Node.js >= 18
- PostgreSQL >= 14

### 1. Clone and install dependencies

```bash
git clone <repo-url>
cd rental-platform

# Backend
cd server && npm install

# Frontend (new terminal)
cd ../client && npm install
```

### 2. Configure environment variables

```bash
# Backend
cd server
cp .env.example .env
# Edit .env and fill in DATABASE_URL, JWT_SECRET, CLIENT_URL

# Frontend
cd ../client
cp .env.example .env
# VITE_API_URL is pre-filled as http://localhost:5000
```

### 3. Set up the database

```bash
# Create the database (replace "rentit" with your preferred name)
createdb rentit

# Load schema
psql rentit -f server/db/schema.sql

# Load demo seed data
psql rentit -f server/db/seed.sql
```

### 4. Run the development servers

```bash
# Terminal 1 — backend (http://localhost:5000)
cd server && npm start

# Terminal 2 — frontend (http://localhost:5173)
cd client && npm run dev
```

### Demo accounts

All demo accounts use the password **`password`**.

| Name             | Email                | Role  |
|------------------|----------------------|-------|
| Zafar Toshmatov  | zafar@example.com    | User  |
| Malika Yusupova  | malika@example.com   | User  |
| Jasur Karimov    | jasur@example.com    | User  |

> To create an admin account, set `is_admin = true` for a user directly in the database:
> `UPDATE users SET is_admin = true WHERE email = 'zafar@example.com';`

---

## Environment Variables

### `server/.env`

| Variable       | Description                                    | Example                                      |
|----------------|------------------------------------------------|----------------------------------------------|
| `PORT`         | Port for the Express server                    | `5000`                                       |
| `DATABASE_URL` | PostgreSQL connection string                   | `postgresql://user:pass@localhost:5432/rentit` |
| `JWT_SECRET`   | Secret used to sign JWT tokens                 | `change_me_in_production`                    |
| `CLIENT_URL`   | Frontend origin allowed by CORS                | `http://localhost:5173`                      |
| `NODE_ENV`     | Set to `production` to disable request logging | `development`                                |

### `client/.env`

| Variable        | Description                | Default                    |
|-----------------|----------------------------|----------------------------|
| `VITE_API_URL`  | Backend base URL           | `http://localhost:5000`    |

---

## API Endpoints

### Auth — `/api/auth`

| Method | Path       | Auth | Description                         |
|--------|------------|------|-------------------------------------|
| POST   | /register  | —    | Register a new user                 |
| POST   | /login     | —    | Login; returns JWT + user           |
| GET    | /me        | JWT  | Get current user profile            |

### Categories — `/api/categories`

| Method | Path | Auth | Description             |
|--------|------|------|-------------------------|
| GET    | /    | —    | List all categories     |

### Listings — `/api/listings`

| Method | Path                         | Auth      | Description                                  |
|--------|------------------------------|-----------|----------------------------------------------|
| GET    | /                            | —         | Browse listings (filter, paginate)            |
| GET    | /:id                         | —         | Get listing detail (images, rating)           |
| POST   | /                            | JWT       | Create listing                               |
| PUT    | /:id                         | JWT/owner | Update listing fields                        |
| DELETE | /:id                         | JWT/owner | Soft-delete (sets `is_active = false`)       |
| POST   | /:id/images                  | JWT/owner | Upload up to 5 images (multipart/form-data)  |
| DELETE | /:id/images/:imageId         | JWT/owner | Delete an image; auto-promotes new primary   |

**GET / query params:** `category`, `keyword`, `min_price`, `max_price`, `owner_id`, `page`, `limit`

### Bookings — `/api/bookings`

| Method | Path            | Auth      | Description                                            |
|--------|-----------------|-----------|--------------------------------------------------------|
| POST   | /               | JWT       | Create booking (validates overlap, calculates price)   |
| GET    | /my             | JWT       | Get my bookings (as renter or lender)                  |
| GET    | /:id            | JWT/party | Get booking detail                                     |
| PATCH  | /:id/status     | JWT/party | Transition status (accept/decline/cancel/complete)     |

### Messages — `/api/messages`

| Method | Path                          | Auth | Description                              |
|--------|-------------------------------|------|------------------------------------------|
| POST   | /                             | JWT  | Send a message                           |
| GET    | /conversations                | JWT  | List all conversations (one row each)    |
| GET    | /conversation/:userId/:listingId | JWT | Get thread; marks messages as read    |
| GET    | /unread-count                 | JWT  | Count of unread messages                 |

### Reviews — `/api/reviews`

| Method | Path             | Auth | Description                                       |
|--------|------------------|------|---------------------------------------------------|
| POST   | /                | JWT  | Submit review for a completed booking             |
| GET    | /user/:userId    | —    | Get reviews received by a user + aggregate stats  |

### Users — `/api/users`

| Method | Path             | Auth | Description                                 |
|--------|------------------|------|---------------------------------------------|
| GET    | /:id             | —    | Public profile (stats, listing count)       |
| PUT    | /me              | JWT  | Update own profile (name, bio, phone, avatar)|
| PUT    | /me/password     | JWT  | Change password (verifies current)          |

### Admin — `/api/admin` *(requires admin JWT)*

| Method | Path                       | Auth  | Description                      |
|--------|----------------------------|-------|----------------------------------|
| GET    | /listings                  | Admin | All listings paginated           |
| PATCH  | /listings/:id/activate     | Admin | Re-activate a listing            |
| PATCH  | /listings/:id/deactivate   | Admin | Deactivate a listing             |
| GET    | /users                     | Admin | All users paginated              |

---

## Frontend Routes

| Path                        | Component           | Auth     | Description                       |
|-----------------------------|---------------------|----------|-----------------------------------|
| `/`                         | HomePage            | —        | Hero, categories, featured items  |
| `/listings`                 | BrowseListingsPage  | —        | Filterable listings grid          |
| `/listings/new`             | CreateListingPage   | Required | 2-step: details + image upload    |
| `/listings/:id`             | ListingDetailPage   | —        | Gallery, booking form, reviews    |
| `/listings/:id/edit`        | EditListingPage     | Owner    | Edit details + image manager      |
| `/bookings`                 | MyBookingsPage      | Required | Renter & lender tabs, review modal|
| `/messages`                 | MessagesPage        | Required | Conversation list                 |
| `/messages/:userId/:listingId` | ConversationPage | Required | Chat thread with polling          |
| `/profile/:id`              | UserProfilePage     | —        | Public profile, listings, reviews |
| `/profile/me`               | MyProfilePage       | Required | Edit profile, change password     |
| `/admin`                    | AdminPage           | Admin    | Manage listings & users           |
| `/login`                    | LoginPage           | —        | JWT login form                    |
| `/register`                 | RegisterPage        | —        | Registration form                 |
| `*`                         | NotFoundPage        | —        | 404 catch-all                     |

---

## Screenshots

> _Add screenshots here once the app is running._

| Page                 | Screenshot |
|----------------------|------------|
| Home                 | _(pending)_ |
| Browse Listings      | _(pending)_ |
| Listing Detail       | _(pending)_ |
| My Bookings          | _(pending)_ |
| Messages             | _(pending)_ |
| Admin Dashboard      | _(pending)_ |

---

## Known Limitations / Next Steps

- Image upload stores files locally — use S3/Cloudinary for production.
- Messages use 15-second polling — replace with WebSockets for real-time delivery.
- No email notifications — add nodemailer or a transactional email service.
- No payment processing — integrate Stripe or Payme for real transactions.
- `avatar_url` accepts a URL — add file upload support for avatars.
