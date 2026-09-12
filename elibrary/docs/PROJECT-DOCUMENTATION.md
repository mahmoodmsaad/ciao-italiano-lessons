# E-Library Management System — Project Documentation

Material for the FYP report. Copy each section into your university's template
and adjust the wording as needed.

---

## 1. Introduction

University libraries still often keep their records in registers or spreadsheets.
That causes three problems:

1. A student cannot tell whether a book is on the shelf without walking to the
   library.
2. The librarian records every loan and return by hand, which is slow and easy
   to get wrong.
3. Tracking overdue books and fines is difficult, and producing reports takes
   real effort.

The **E-Library Management System** is a web application that addresses all
three: the catalogue is online and searchable, lending is recorded digitally
with the arithmetic done automatically, and reports are one click away.

### 1.1 Objectives

- Provide an online, searchable catalogue of the library's holdings.
- Let students see their current loans, due dates and outstanding fines.
- Digitise borrowing and returning, keeping copy counts correct automatically.
- Calculate fines on late returns without manual work.
- Give the librarian a single panel for books, members and reports.

### 1.2 Scope

**In scope:** authentication with two roles, catalogue and search, borrow /
return / renew, fine calculation, student dashboard, admin panel (books,
members, lending desk), and reports.

**Out of scope (see Future Work):** reading e-books as PDFs, online fine
payment, email/SMS notifications, a reservation queue, and reviews or ratings.

---

## 2. Tools and Technologies

| Layer | Technology | Reason |
|-------|-----------|--------|
| Frontend | React 18 + Vite | Component based, fast development loop |
| Styling | Tailwind CSS 4 | Utility classes, straightforward responsive design |
| Routing | React Router 6 | Client-side pages and protected routes |
| HTTP | Axios | Interceptors make token handling simple |
| Backend | Node.js + Express 4 | One language across the stack, REST API |
| Database | MongoDB + Mongoose | Flexible schema, free hosting on Atlas |
| Auth | JWT + bcryptjs | Stateless sessions, hashed passwords |
| Validation | express-validator | Server-side input checking |
| Testing | Node.js built-in test runner | No extra test library needed |

---

## 3. System Design

### 3.1 Architecture

A standard three-tier architecture (client → server → database):

```
┌──────────────────────────┐
│   Presentation Layer     │   React SPA (browser)
│   pages / components     │
└────────────┬─────────────┘
             │  HTTPS + JWT (JSON)
┌────────────▼─────────────┐
│   Application Layer      │   Express REST API
│   routes → middleware    │   - auth and role checks
│         → controllers    │   - input validation
│                          │   - business rules (fines, limits)
└────────────┬─────────────┘
             │  Mongoose ODM
┌────────────▼─────────────┐
│      Data Layer          │   MongoDB
│   users · books · issues │
└──────────────────────────┘
```

### 3.2 Entity Relationship

There are three collections. `issues` is the join entity between `users` and
`books` — a many-to-many relationship carrying its own attributes.

```
┌─────────────────────┐          ┌─────────────────────┐
│        USER         │          │        BOOK         │
├─────────────────────┤          ├─────────────────────┤
│ _id          (PK)   │          │ _id          (PK)   │
│ name                │          │ title               │
│ email      (unique) │          │ author              │
│ password  (hashed)  │          │ isbn       (unique) │
│ role  student|admin │          │ category            │
│ rollNo              │          │ publisher           │
│ department          │          │ publishYear         │
│ phone               │          │ edition             │
│ isActive            │          │ shelfLocation       │
│ createdAt           │          │ totalCopies         │
└──────────┬──────────┘          │ availableCopies     │
           │                     └──────────┬──────────┘
           │ 1                            1 │
           │                                │
           │            ┌───────────────────┘
           │            │
         N │            │ N
      ┌────▼────────────▼─────┐
      │        ISSUE          │
      ├───────────────────────┤
      │ _id            (PK)   │
      │ student   (FK → USER) │
      │ book      (FK → BOOK) │
      │ issuedBy  (FK → USER) │
      │ issueDate             │
      │ dueDate               │
      │ returnDate            │
      │ renewCount            │
      │ fine                  │
      │ finePaid              │
      │ status issued|returned│
      └───────────────────────┘
```

**Relationships**

- One USER (student) has many ISSUE records — *one-to-many*
- One BOOK has many ISSUE records — *one-to-many*
- USER and BOOK are therefore *many-to-many* through ISSUE

**Key invariant:** `availableCopies` is never greater than `totalCopies` and
never below zero. It decreases by one on a loan and increases by one on a return.

### 3.3 Use cases

**Student**

1. Register and sign in
2. Search and filter the catalogue
3. View a book's details
4. Borrow a book
5. See current loans and due dates
6. Renew a loan
7. See outstanding fines
8. Update profile and password

**Admin**

1. Sign in
2. Add, edit and delete books
3. Lend a book to a student
4. Record a return
5. Mark a fine as paid
6. View members, block and unblock them
7. View a student's full history
8. View and print reports

### 3.4 Business rules

| # | Rule | Where it is implemented |
|---|------|-------------------------|
| R1 | A student may hold at most 3 books at a time | `issueController.issueBook` |
| R2 | Loan period is 14 days, then Rs 5 per day | `utils/fine.js`, `config/env.js` |
| R3 | The same book cannot be issued twice to one student | `issueController.issueBook` |
| R4 | A student with an overdue book cannot borrow another | `issueController.issueBook` |
| R5 | Overdue loans cannot be renewed; one renewal per loan | `issueController.renewBook` |
| R6 | A book with no available copy cannot be issued | `issueController.issueBook` (atomic update) |
| R7 | A book that is on loan cannot be deleted | `bookController.deleteBook` |
| R8 | A blocked student can neither sign in nor borrow | `middleware/auth.js` |
| R9 | Total copies cannot be set below the number on loan | `bookController.updateBook` |
| R10 | Registration always creates a student (admins come from the seed) | `authController.register` |

---

## 4. Security

| Concern | How it is handled |
|---------|-------------------|
| Passwords | Hashed with bcrypt (10 rounds); never stored or returned in plain text |
| Sessions | JWT, expiring after 7 days |
| Authorization | `protect` middleware on every protected route; `adminOnly` on admin routes |
| Role escalation | `/auth/register` ignores any role field and always creates a student |
| Input validation | express-validator on every POST and PUT |
| Injection | Mongoose schema types plus regex escaping on search input |
| Race conditions | Issuing a copy uses an atomic `findOneAndUpdate`, so two simultaneous requests can never push the count below zero |
| Error leakage | Stack traces are returned only in development mode |

---

## 5. Testing

`cd backend && npm test`

### 5.1 Unit tests — `tests/fine.test.js`

| # | Test | Expected |
|---|------|----------|
| 1 | Due date is today | Fine = 0 |
| 2 | Due date is in the future | Fine = 0 |
| 3 | Three days late | Fine = 3 × Rs 5 = Rs 15 |
| 4 | Due at 23:59, one day elapsed | Counted as 1 day late (time of day ignored) |
| 5 | `addDays` crosses a month boundary | 28 Jan + 5 = 2 Feb |
| 6 | Live fine on an open loan | Recalculated against today's date |
| 7 | Fine on a returned loan | The stored value is not changed |

### 5.2 API tests — `tests/api.test.js`

| # | Test | Expected |
|---|------|----------|
| 8 | `GET /api/health` | 200 plus the library rules |
| 9 | Unknown URL | 404 |
| 10 | Protected routes without a token | 401 |
| 11 | Invalid token | 401 |
| 12 | Empty register body | 400 with field errors |
| 13 | Password shorter than 6 characters | 400 |
| 14 | Login without a password | 400 |

### 5.3 Integration tests — `tests/integration.test.js`

`MONGO_URI=mongodb://127.0.0.1:27017/elibrary_test npm test`

| # | Test | Expected |
|---|------|----------|
| 15 | Student registers and signs in | 201, role = student, no password in the response |
| 16 | Duplicate email | 409 |
| 17 | Student tries to add a book | 403 (admin only) |
| 18 | Admin adds a book | 201, availableCopies set |
| 19 | Search by author | Finds the right book |
| 20 | Borrow a book | 201, availableCopies decreases by one |
| 21 | Second student borrows the last copy | 409 |
| 22 | Same book borrowed twice | 409 |
| 23 | Exceeding the borrowing limit | 409 |
| 24 | Fine after three days overdue | Rs 15, `isOverdue = true` |
| 25 | Student tries to record a return | 403 (admin only) |
| 26 | Admin records the return | 200, fine stored, copy freed |
| 27 | Deleting a book that is on loan | 409 |
| 28 | Reports summary | 200, figures correct |
| 29 | Blocked student signs in | 403 |

### 5.4 Manual test cases (for the demo and viva)

| # | Action | Expected |
|---|--------|----------|
| M1 | Sign in with a wrong password | "Incorrect email or password." |
| M2 | Search for "Cormen" | Only that author's books |
| M3 | Apply a category filter | Only books in that category |
| M4 | Tick "Show available books only" | Books with no copies disappear |
| M5 | Borrow an available book | Success plus a due date; copy count drops |
| M6 | Open a book with no copies left | The borrow button is disabled |
| M7 | Admin sets total copies below the number on loan | Error message |
| M8 | Admin deletes a book that is on loan | Error message |
| M9 | Admin blocks a student, then that student signs in | 403 |
| M10 | Click Print on the reports page | Print view, with navigation and buttons hidden |
| M11 | Open the app at phone width | Layout adapts, hamburger menu appears |

---

## 6. Future Work

Suitable content for the "Future Enhancements" section of the report:

1. **E-books** — upload PDFs and read them in the browser
2. **Reservations** — let a student join a queue for a book that is on loan
3. **Notifications** — email or SMS reminders before the due date
4. **Online fine payment** — JazzCash / EasyPaisa integration
5. **Reviews and ratings** — let students rate the books they have read
6. **Barcode / QR scanning** — faster processing at the lending desk
7. **Recommendations** — suggest titles from borrowing history (a natural place
   to introduce machine learning)

---

## 7. Screens (for report screenshots)

| # | Screen | URL |
|---|--------|-----|
| 1 | Login | `/login` |
| 2 | Register | `/register` |
| 3 | Book Catalogue | `/` |
| 4 | Book Detail | `/books/:id` |
| 5 | My Books | `/my-books` |
| 6 | Profile | `/profile` |
| 7 | Admin Dashboard | `/admin` |
| 8 | Manage Books | `/admin/books` |
| 9 | Lending Desk | `/admin/issues` |
| 10 | Members | `/admin/students` |
| 11 | Reports | `/admin/reports` |
