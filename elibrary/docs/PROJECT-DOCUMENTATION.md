# E-Library Management System — Project Documentation

FYP report likhte waqt ye file kaam aayegi. Har section ko apni university ke
template ke mutabiq copy / adjust kar lein.

---

## 1. Introduction

University libraries mein books ka record ab bhi aksar registers ya Excel files
par rakha jata hai. Is se teen masail hote hain:

1. Student ko pata nahi hota ke koi book abhi available hai ya nahi — usay
   library tak jaana parta hai.
2. Librarian ko har issue / return manually likhna parta hai, jis mein
   ghalti ka imkaan rehta hai.
3. Overdue books aur fine ka hisaab lagana mushkil hai, aur reports banane
   mein waqt lagta hai.

**E-Library Management System** ek web application hai jo ye teeno masle hal
karti hai: catalog online hai, issue/return system khud hisaab rakhta hai, aur
reports ek click par ban jati hain.

### 1.1 Objectives

- Online searchable book catalog banana.
- Students ko apni issued books, due dates aur fine dekhne ki suhulat dena.
- Issue aur return ka process digital karna, copies ka hisaab khud-ba-khud rakhna.
- Late returns par fine khud calculate karna.
- Library admin ko books, students aur reports ka aik markazi panel dena.

### 1.2 Scope

**Shamil hai:** authentication (2 roles), book catalog + search, issue / return /
renew, fine calculation, student dashboard, admin panel (books, students,
issue counter), aur reports.

**Shamil nahi (future work):** e-book PDF reading, online fine payment,
email/SMS notifications, book reservation queue, aur reviews/ratings.

---

## 2. Tools & Technologies

| Layer | Technology | Kyun |
|-------|-----------|------|
| Frontend | React 18 + Vite | Component based, tez development |
| Styling | Tailwind CSS 4 | Utility classes, responsive design asaan |
| Routing | React Router 6 | Client-side pages aur protected routes |
| HTTP | Axios | Interceptors se token handling asaan |
| Backend | Node.js + Express 4 | JavaScript dono taraf, REST API |
| Database | MongoDB + Mongoose | Flexible schema, Atlas par free hosting |
| Auth | JWT + bcryptjs | Stateless sessions, hashed passwords |
| Validation | express-validator | Input checking server par |
| Testing | Node.js built-in test runner | Bina extra library ke tests |

---

## 3. System Design

### 3.1 Architecture

Teen tier architecture (client → server → database):

```
┌──────────────────────────┐
│   Presentation Layer     │   React SPA (browser)
│   pages / components     │
└────────────┬─────────────┘
             │  HTTPS + JWT (JSON)
┌────────────▼─────────────┐
│   Application Layer      │   Express REST API
│   routes → middleware    │   - auth & role check
│         → controllers    │   - validation
│                          │   - business rules (fine, limits)
└────────────┬─────────────┘
             │  Mongoose ODM
┌────────────▼─────────────┐
│      Data Layer          │   MongoDB
│   users · books · issues │
└──────────────────────────┘
```

### 3.2 Entity Relationship

Teen collections hain. `issues` beech ki table hai jo `users` aur `books`
ko jorti hai (many-to-many with attributes).

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
      ┌────▼────────────▼────┐
      │        ISSUE         │
      ├──────────────────────┤
      │ _id           (PK)   │
      │ student  (FK → USER) │
      │ book     (FK → BOOK) │
      │ issuedBy (FK → USER) │
      │ issueDate            │
      │ dueDate              │
      │ returnDate           │
      │ renewCount           │
      │ fine                 │
      │ finePaid             │
      │ status issued|returned│
      └──────────────────────┘
```

**Relationships:**
- Ek USER (student) ke kai ISSUE records ho sakte hain — *one-to-many*
- Ek BOOK ke kai ISSUE records ho sakte hain — *one-to-many*
- USER ↔ BOOK ka taalluq ISSUE ke zariye *many-to-many* ban jata hai

**Aham constraint:** `availableCopies` kabhi `totalCopies` se zyada nahi hota
aur kabhi 0 se kam nahi hota. Issue par 1 kam hoti hai, return par 1 barhti hai.

### 3.3 Use cases

**Student:**
1. Register / login karna
2. Books search aur filter karna
3. Book ki tafseel dekhna
4. Book issue karwana
5. Apni issued books aur due dates dekhna
6. Book renew karna
7. Apni fine dekhna
8. Profile / password update karna

**Admin:**
1. Login karna
2. Book add / edit / delete karna
3. Kisi student ko book issue karna
4. Book return process karna
5. Fine paid mark karna
6. Students dekhna, block / unblock karna
7. Kisi student ki poori history dekhna
8. Reports dekhna aur print karna

### 3.4 Business rules

| # | Rule | Kahan implement hua |
|---|------|---------------------|
| R1 | Ek student ek waqt mein zyada se zyada 3 books rakh sakta hai | `issueController.issueBook` |
| R2 | Loan period 14 din, uske baad Rs 5/din fine | `utils/fine.js`, `config/env.js` |
| R3 | Wohi book do baar issue nahi ho sakti ek hi student ko | `issueController.issueBook` |
| R4 | Overdue book pending ho to nai book nahi milti | `issueController.issueBook` |
| R5 | Overdue book renew nahi hoti; renew sirf 1 baar | `issueController.renewBook` |
| R6 | Available copy na ho to issue nahi hoti | `issueController.issueBook` (atomic update) |
| R7 | Issued book delete nahi ho sakti | `bookController.deleteBook` |
| R8 | Blocked student login ya borrow nahi kar sakta | `middleware/auth.js` |
| R9 | Total copies issued copies se kam set nahi ho sakti | `bookController.updateBook` |
| R10 | Register hamesha `student` role deta hai (admin sirf seed se) | `authController.register` |

---

## 4. Security

| Kya | Kaise |
|-----|-------|
| Password | bcrypt se hash (10 rounds), kabhi plain text mein save ya return nahi hota |
| Session | JWT token, 7 din baad expire |
| Authorization | Har protected route par `protect` middleware; admin routes par `adminOnly` |
| Role escalation | `/auth/register` role field ignore karta hai — hamesha student banata hai |
| Input validation | express-validator har POST/PUT par |
| Injection | Mongoose schema types + search regex escape |
| Race condition | Copy issue karte waqt atomic `findOneAndUpdate` — do requests ek saath aayen to bhi copies minus nahi hotin |
| Error leakage | Stack trace sirf development mode mein bhejta hai |

---

## 5. Testing

`cd backend && npm test`

### 5.1 Unit tests — `tests/fine.test.js`

| # | Test | Expected |
|---|------|----------|
| 1 | Due date aaj hai | Fine = 0 |
| 2 | Due date future mein | Fine = 0 |
| 3 | 3 din late | Fine = 3 × Rs 5 = Rs 15 |
| 4 | Due date raat 11:59 par, 1 din guzra | 1 din late (waqt ka farq ignore) |
| 5 | `addDays` month cross kare | 28 Jan + 5 = 2 Feb |
| 6 | Issued record ka live fine | Aaj ke hisaab se calculate hota hai |
| 7 | Returned record ka fine | Save shuda value badalti nahi |

### 5.2 API tests — `tests/api.test.js`

| # | Test | Expected |
|---|------|----------|
| 8 | `GET /api/health` | 200 + library rules |
| 9 | Ghalat URL | 404 |
| 10 | Protected routes bina token | 401 |
| 11 | Ghalat token | 401 |
| 12 | Khaali register body | 400 + field errors |
| 13 | 6 se chhota password | 400 |
| 14 | Login bina password | 400 |

### 5.3 Integration tests — `tests/integration.test.js`

`MONGO_URI=mongodb://127.0.0.1:27017/elibrary_test npm test`

| # | Test | Expected |
|---|------|----------|
| 15 | Student register + login | 201, role = student, password response mein nahi |
| 16 | Duplicate email | 409 |
| 17 | Student book add kare | 403 (sirf admin) |
| 18 | Admin book add kare | 201, availableCopies set |
| 19 | Author se search | Sahi book milti hai |
| 20 | Book borrow | 201, availableCopies 1 kam |
| 21 | Aakhri copy ke baad dusra student borrow kare | 409 |
| 22 | Wohi book dobara | 409 |
| 23 | Limit se zyada books | 409 |
| 24 | 3 din overdue par fine | Rs 15, `isOverdue = true` |
| 25 | Student return kare | 403 (sirf admin) |
| 26 | Admin return kare | 200, fine save, copy wapas |
| 27 | Issued book delete | 409 |
| 28 | Reports summary | 200, numbers sahi |
| 29 | Blocked student login | 403 |

### 5.4 Manual test cases (viva / demo ke liye)

| # | Kya karein | Expected |
|---|-----------|----------|
| M1 | Ghalat password se login | "Email ya password ghalat hai" |
| M2 | Search box mein "Cormen" likhein | Sirf us author ki books |
| M3 | Category filter lagayein | Sirf us category ki books |
| M4 | "Sirf available" tick karein | Issued out books gayab |
| M5 | Available book issue karein | Success + due date, copies 1 kam |
| M6 | Issued out book kholein | Button disabled |
| M7 | Admin: total copies issued se kam karein | Error message |
| M8 | Admin: issued book delete karein | Error message |
| M9 | Admin: student block karein, phir us se login karein | 403 |
| M10 | Reports par Print dabayein | Print view (navbar/buttons hide) |
| M11 | Mobile size par app kholein | Layout theek, hamburger menu |

---

## 6. Future Work

Ye cheezein report ke "Future Enhancements" section mein likhi ja sakti hain:

1. **E-books** — PDF upload aur browser mein padhne ki suhulat
2. **Reservation** — book issued ho to student queue mein lag jaye
3. **Notifications** — due date se pehle email / SMS reminder
4. **Online fine payment** — JazzCash / EasyPaisa integration
5. **Reviews & ratings** — students books par raye dein
6. **Barcode / QR scanning** — issue counter par tez processing
7. **Recommendation system** — borrowing history se suggestions (yahan AI/ML aa sakti hai)

---

## 7. Screens (report mein screenshots lagane ke liye)

| # | Screen | URL |
|---|--------|-----|
| 1 | Login | `/login` |
| 2 | Register | `/register` |
| 3 | Book Catalog | `/` |
| 4 | Book Detail | `/books/:id` |
| 5 | My Books | `/my-books` |
| 6 | Profile | `/profile` |
| 7 | Admin Dashboard | `/admin` |
| 8 | Manage Books | `/admin/books` |
| 9 | Issue / Return | `/admin/issues` |
| 10 | Students | `/admin/students` |
| 11 | Reports | `/admin/reports` |
