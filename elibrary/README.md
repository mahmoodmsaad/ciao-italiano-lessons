# University E-Library Management System

Final Year Project - ek web application jis se university library online chalti hai:
students books search aur issue karte hain, aur library admin books, students,
issue/return aur fines manage karta hai.

**Stack:** MongoDB · Express · React · Node.js (MERN)

---

## Modules

| # | Module | Kya karta hai |
|---|--------|---------------|
| 1 | Authentication & Roles | Student signup/login, admin login, JWT session, 2 roles (student / admin) |
| 2 | Book Catalog | Search (title / author / ISBN), category filter, sorting, pagination |
| 3 | Book Details | Poori maloomat, availability, student yahin se issue karta hai |
| 4 | Issue & Return | Due date, renew, return, borrowing limit, duplicate-issue rok |
| 5 | Fine Management | Late return par khud-ba-khud fine, admin "paid" mark karta hai |
| 6 | Student Dashboard | Meri books, due dates, overdue warning, pending fine, history |
| 7 | Admin Panel | Books ka CRUD, students manage (block/unblock/delete), issue/return counter |
| 8 | Reports | Stats, mahana activity chart, category chart, top books, overdue list, print/PDF |

### Library rules (`backend/.env` se badal sakti hain)

| Rule | Default |
|------|---------|
| Loan period | 14 din |
| Fine | Rs 5 / din |
| Ek student ek waqt mein | 3 books |
| Renew | 1 baar |

---

## Chalane ka tareeqa

### Zaroori cheezein
- **Node.js 18+** — https://nodejs.org
- **MongoDB** — ya to computer par install karein, ya **MongoDB Atlas** ka free cloud
  account banayein (https://www.mongodb.com/atlas) — Atlas asaan hai, kuch install
  nahi karna parta.

### 1. Backend

```bash
cd elibrary/backend
npm install
cp .env.example .env     # Windows par:  copy .env.example .env
```

Ab `.env` file kholein aur `MONGO_URI` set karein:

```env
# Local MongoDB
MONGO_URI=mongodb://127.0.0.1:27017/elibrary

# Ya Atlas
# MONGO_URI=mongodb+srv://<user>:<password>@cluster0.xxxxx.mongodb.net/elibrary

JWT_SECRET=koi_lamba_random_secret_yahan_likhein
```

Demo data daalein aur server chalayein:

```bash
npm run seed     # 12 books + 4 users + demo issue records
npm start        # http://localhost:5000
```

> `npm run seed` purana saara data delete kar deta hai — pehli baar chalane ke liye hai.

### 2. Frontend (nai terminal window mein)

```bash
cd elibrary/frontend
npm install
npm run dev      # http://localhost:5173
```

Browser mein **http://localhost:5173** kholein.

### Demo accounts (seed ke baad)

| Role | Email | Password |
|------|-------|----------|
| Admin | `admin@university.edu.pk` | `admin123` |
| Student | `ariba@university.edu.pk` | `student123` |

> Ye demo passwords sirf development ke liye hain. Project submit karne se pehle
> `utils/sampleData.js` mein inhe badal dein aur `.env` ka `JWT_SECRET` bhi.

---

## Project structure

```
elibrary/
├── backend/                    Node + Express + MongoDB (REST API)
│   ├── config/
│   │   ├── env.js              .env padhta hai, saari settings ek jagah
│   │   └── db.js               MongoDB connection
│   ├── models/                 Mongoose schemas
│   │   ├── User.js             student + admin (password hashed)
│   │   ├── Book.js             book + copies ka hisaab
│   │   └── Issue.js            kaunsi book kis student ke paas hai
│   ├── controllers/            har feature ki asli logic
│   ├── routes/                 URL -> controller mapping + validation
│   ├── middleware/
│   │   ├── auth.js             JWT check + role check
│   │   ├── validate.js         input validation errors
│   │   └── error.js            central error handling
│   ├── utils/
│   │   ├── fine.js             fine ka hisaab (unit tested)
│   │   ├── token.js            JWT banana
│   │   ├── sampleData.js       demo books aur users
│   │   └── seed.js             npm run seed
│   ├── tests/                  automated tests
│   ├── app.js                  Express app
│   └── server.js               entry point
│
└── frontend/                   React + Vite + Tailwind CSS
    └── src/
        ├── api/client.js       axios + token interceptor
        ├── context/            AuthContext (login state)
        ├── components/         Layout, ProtectedRoute, charts, common UI
        └── pages/
            ├── Login.jsx, Register.jsx
            ├── student/        Catalog, BookDetail, MyBooks, Profile
            └── admin/          Dashboard, ManageBooks, IssueReturn,
                                ManageStudents, Reports
```

---

## API endpoints

Sab `/api` se shuru hote hain. 🔒 = login zaroori, 👑 = sirf admin.

### Auth
| Method | Endpoint | Kaam |
|--------|----------|------|
| POST | `/auth/register` | Naya student account |
| POST | `/auth/login` | Login (token milta hai) |
| GET | `/auth/me` 🔒 | Apni maloomat |
| PUT | `/auth/profile` 🔒 | Profile update |
| PUT | `/auth/password` 🔒 | Password badalna |

### Books
| Method | Endpoint | Kaam |
|--------|----------|------|
| GET | `/books` 🔒 | List + search + filter + pagination |
| GET | `/books/categories` 🔒 | Filter dropdown ke liye categories |
| GET | `/books/:id` 🔒 | Ek book ki tafseel |
| POST | `/books` 👑 | Nai book |
| PUT | `/books/:id` 👑 | Book edit |
| DELETE | `/books/:id` 👑 | Book delete |

### Issues
| Method | Endpoint | Kaam |
|--------|----------|------|
| POST | `/issues` 🔒 | Book issue (student khud, ya admin kisi student ko) |
| GET | `/issues/my` 🔒 | Meri books |
| GET | `/issues` 👑 | Saare records (status / overdue filter) |
| PUT | `/issues/:id/renew` 🔒 | Due date barhana |
| PUT | `/issues/:id/return` 👑 | Book wapas |
| PUT | `/issues/:id/pay-fine` 👑 | Fine paid mark |

### Users
| Method | Endpoint | Kaam |
|--------|----------|------|
| GET | `/users` 👑 | Students ki list (active loans + fine ke saath) |
| GET | `/users/:id` 👑 | Ek student + uski history |
| PUT | `/users/:id/status` 👑 | Block / unblock |
| DELETE | `/users/:id` 👑 | Delete |

### Reports
| Method | Endpoint | Kaam |
|--------|----------|------|
| GET | `/reports/summary` 👑 | Dashboard ke numbers |
| GET | `/reports/popular` 👑 | Top books |
| GET | `/reports/monthly` 👑 | Mahana issued / returned |
| GET | `/reports/categories` 👑 | Category wise |
| GET | `/reports/overdue` 👑 | Overdue list + fine |

---

## Tests

```bash
cd elibrary/backend
npm test
```

- **`tests/fine.test.js`** — fine calculation ki logic (bina database ke chalte hain)
- **`tests/api.test.js`** — routes, auth guards, validation (bina database ke)
- **`tests/integration.test.js`** — poora issue/return flow. Iske liye database chahiye:

```bash
MONGO_URI=mongodb://127.0.0.1:27017/elibrary_test npm test
```

> Integration test apna database saaf karta hai — is liye **alag test database**
> use karein, apna asli data mat dein.

---

## Aam masail (troubleshooting)

| Masla | Hal |
|-------|-----|
| `MongooseServerSelectionError` | MongoDB chal nahi raha, ya `MONGO_URI` ghalat hai. Atlas par IP whitelist (`0.0.0.0/0`) check karein. |
| Frontend par "Server se rabta nahi ho paya" | Backend band hai — dusri terminal mein `npm start` chalayein. |
| `Port 5000 already in use` | `.env` mein `PORT` badal dein (aur frontend `vite.config.js` ka target bhi). |
| Login ke baad wapas login page | `JWT_SECRET` badal gaya hoga — browser se logout karke dobara login karein. |
| Seed ke baad bhi books nahi dikh rahin | Check karein ke backend aur seed dono **ek hi** `MONGO_URI` use kar rahe hain. |
