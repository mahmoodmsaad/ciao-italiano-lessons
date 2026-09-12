# University E-Library Management System

A final year project: a web application that runs a university library online.
Students search and borrow books; the library admin manages the catalogue,
members, lending and fines.

**Stack:** MongoDB · Express · React · Node.js (MERN)

---

## Modules

| # | Module | What it does |
|---|--------|--------------|
| 1 | Authentication & Roles | Student sign-up and login, admin login, JWT sessions, two roles (student / admin) |
| 2 | Book Catalogue | Search by title / author / ISBN, category filter, sorting, pagination |
| 3 | Book Details | Full record, live availability, borrow button for students |
| 4 | Borrow & Return | Due dates, renewals, returns, borrowing limits, duplicate-loan guard |
| 5 | Fine Management | Automatic fine on late returns, admin marks fines as paid |
| 6 | Student Dashboard | Current loans, due dates, overdue warnings, outstanding fines, history |
| 7 | Admin Panel | Book CRUD, member management (block / unblock / delete), lending desk |
| 8 | Reports | Summary stats, monthly activity chart, category chart, most-borrowed titles, overdue list, print/PDF |

### Library rules (configurable in `backend/.env`)

| Rule | Default |
|------|---------|
| Loan period | 14 days |
| Fine | Rs 5 per day |
| Books per student at once | 3 |
| Renewals per loan | 1 |

---

## Getting started

### Prerequisites
- **Node.js 18+** — https://nodejs.org
- **MongoDB** — either installed locally, or a free **MongoDB Atlas** cloud
  database (https://www.mongodb.com/atlas). Atlas is the easier route: nothing
  to install.

### 1. Backend

```bash
cd elibrary/backend
npm install
cp .env.example .env     # Windows:  copy .env.example .env
```

Open `.env` and set `MONGO_URI`:

```env
# Local MongoDB
MONGO_URI=mongodb://127.0.0.1:27017/elibrary

# Or Atlas
# MONGO_URI=mongodb+srv://<user>:<password>@cluster0.xxxxx.mongodb.net/elibrary

JWT_SECRET=replace_this_with_a_long_random_string
```

Load the demo data and start the server:

```bash
npm run seed     # 12 books + 4 users + demo loan records
npm start        # http://localhost:5000
```

> `npm run seed` deletes all existing data first — it is meant for first-time setup.

### 2. Frontend (in a second terminal)

```bash
cd elibrary/frontend
npm install
npm run dev      # http://localhost:5173
```

Open **http://localhost:5173** in a browser.

### Demo accounts (created by the seed script)

| Role | Email | Password |
|------|-------|----------|
| Admin | `admin@university.edu.pk` | `admin123` |
| Student | `ariba@university.edu.pk` | `student123` |

> These are development-only credentials. Before submitting the project, change
> them in `utils/sampleData.js` and set a real `JWT_SECRET` in `.env`.

---

## Live demo build (no server required)

The app can also be built to run **entirely in the browser** — no Node server,
no MongoDB. This is useful for a presentation, a viva, or sharing a link.

```bash
cd elibrary/frontend
VITE_DEMO=true npm run build
```

This produces a `dist/` folder. Upload it to any static host (GitHub Pages,
Netlify, Vercel) or open `dist/index.html` directly.

How it works:

- `src/api/demoBackend.js` is an axios adapter that serves the **same endpoints,
  the same business rules and the same error messages** as the real API, from
  inside the browser.
- Data lives in the browser's `localStorage`, so it survives a page reload. The
  banner at the top has a "Reset data" action to restore the starting state.
- Demo builds use hash routing (`#/login`) so they work from any folder.
- **A normal build is unaffected** — `npm run build` drops all demo code from the
  bundle (verify with the bundle size, or `grep elibrary_demo_db dist/`).

> Demo mode is not a replacement for the backend. It exists to showcase the
> frontend; the real backend lives in `backend/`.

---

## Project structure

```
elibrary/
├── backend/                    Node + Express + MongoDB (REST API)
│   ├── config/
│   │   ├── env.js              reads .env, all settings in one place
│   │   └── db.js               MongoDB connection
│   ├── models/                 Mongoose schemas
│   │   ├── User.js             students + admins (hashed passwords)
│   │   ├── Book.js             book record and copy counts
│   │   └── Issue.js            which book is with which student
│   ├── controllers/            the actual logic for each feature
│   ├── routes/                 URL → controller mapping plus validation
│   ├── middleware/
│   │   ├── auth.js             JWT check and role check
│   │   ├── validate.js         input validation errors
│   │   └── error.js            central error handling
│   ├── utils/
│   │   ├── fine.js             fine calculation (unit tested)
│   │   ├── token.js            JWT signing
│   │   ├── sampleData.js       demo books and users
│   │   └── seed.js             npm run seed
│   ├── tests/                  automated tests
│   ├── app.js                  Express app
│   └── server.js               entry point
│
└── frontend/                   React + Vite + Tailwind CSS
    └── src/
        ├── api/
        │   ├── client.js       axios instance + token interceptor
        │   └── demoBackend.js  in-browser backend for demo builds
        ├── context/            AuthContext (session state)
        ├── components/         Layout, ProtectedRoute, charts, shared UI
        └── pages/
            ├── Login.jsx, Register.jsx
            ├── student/        Catalog, BookDetail, MyBooks, Profile
            └── admin/          Dashboard, ManageBooks, IssueReturn,
                                ManageStudents, Reports
```

---

## API endpoints

All routes are prefixed with `/api`. 🔒 = sign-in required, 👑 = admin only.

### Auth
| Method | Endpoint | Purpose |
|--------|----------|---------|
| POST | `/auth/register` | Create a student account |
| POST | `/auth/login` | Sign in and receive a token |
| GET | `/auth/me` 🔒 | Current user |
| PUT | `/auth/profile` 🔒 | Update profile |
| PUT | `/auth/password` 🔒 | Change password |

### Books
| Method | Endpoint | Purpose |
|--------|----------|---------|
| GET | `/books` 🔒 | List with search, filter and pagination |
| GET | `/books/categories` 🔒 | Categories for the filter dropdown |
| GET | `/books/:id` 🔒 | One book |
| POST | `/books` 👑 | Add a book |
| PUT | `/books/:id` 👑 | Edit a book |
| DELETE | `/books/:id` 👑 | Delete a book |

### Loans
| Method | Endpoint | Purpose |
|--------|----------|---------|
| POST | `/issues` 🔒 | Borrow a book (student for themselves, or admin for a student) |
| GET | `/issues/my` 🔒 | The signed-in student's loans |
| GET | `/issues` 👑 | All loan records (filter by status / overdue) |
| PUT | `/issues/:id/renew` 🔒 | Extend the due date |
| PUT | `/issues/:id/return` 👑 | Record a return |
| PUT | `/issues/:id/pay-fine` 👑 | Mark a fine as paid |

### Users
| Method | Endpoint | Purpose |
|--------|----------|---------|
| GET | `/users` 👑 | Students with current loans and outstanding fines |
| GET | `/users/:id` 👑 | One student plus their history |
| PUT | `/users/:id/status` 👑 | Block / unblock |
| DELETE | `/users/:id` 👑 | Delete |

### Reports
| Method | Endpoint | Purpose |
|--------|----------|---------|
| GET | `/reports/summary` 👑 | Dashboard figures |
| GET | `/reports/popular` 👑 | Most-borrowed titles |
| GET | `/reports/monthly` 👑 | Borrowed / returned per month |
| GET | `/reports/categories` 👑 | Breakdown by category |
| GET | `/reports/overdue` 👑 | Overdue loans with fines |

---

## Tests

```bash
cd elibrary/backend
npm test
```

- **`tests/fine.test.js`** — fine calculation logic (runs without a database)
- **`tests/api.test.js`** — routes, auth guards, validation (runs without a database)
- **`tests/integration.test.js`** — the full borrow/return flow. Needs a database:

```bash
MONGO_URI=mongodb://127.0.0.1:27017/elibrary_test npm test
```

> The integration suite wipes the database it connects to, so point it at a
> **separate test database**, never your real data.

---

## Troubleshooting

| Problem | Fix |
|---------|-----|
| `MongooseServerSelectionError` | MongoDB is not running, or `MONGO_URI` is wrong. On Atlas, check the IP allow-list (`0.0.0.0/0`). |
| "Could not reach the server" in the UI | The backend is not running — start it with `npm start` in a second terminal. |
| `Port 5000 already in use` | Change `PORT` in `.env` (and the proxy target in `vite.config.js`). |
| Sent back to the login page after signing in | `JWT_SECRET` changed — log out in the browser and sign in again. |
| No books after seeding | Make sure the server and the seed script use the **same** `MONGO_URI`. |
