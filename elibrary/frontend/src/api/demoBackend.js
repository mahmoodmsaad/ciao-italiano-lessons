/**
 * The demo-mode backend, running entirely inside the browser.
 *
 * Its only purpose is to let the app run without Node or MongoDB, so a live
 * demo link can be shared (for a presentation or a viva, say). It mirrors the
 * real backend exactly - same endpoints, same rules, same error messages - and
 * differs only in keeping its data in the browser's localStorage.
 *
 * Build it with:  VITE_DEMO=true npm run build
 * The real project is untouched: a normal build never loads this file.
 */

const STORE_KEY = 'elibrary_demo_db';

export const RULES = {
  loanPeriodDays: 14,
  finePerDay: 5,
  maxBooksPerStudent: 3,
  maxRenewals: 1,
};

/* ------------------------------------------------------------------ helpers */

const oid = () =>
  [...crypto.getRandomValues(new Uint8Array(12))]
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');

const MS_DAY = 86400000;
const addDays = (date, days) => new Date(new Date(date).getTime() + days * MS_DAY).toISOString();
const startOfDay = (date) => new Date(date).setHours(0, 0, 0, 0);

function daysOverdue(dueDate, asOf = new Date()) {
  const diff = Math.floor((startOfDay(asOf) - startOfDay(dueDate)) / MS_DAY);
  return diff > 0 ? diff : 0;
}

const calculateFine = (dueDate, asOf) => daysOverdue(dueDate, asOf) * RULES.finePerDay;

const escapeRx = (text) => text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

/** An error the adapter turns into an HTTP response. */
class ApiError extends Error {
  constructor(status, message) {
    super(message);
    this.status = status;
  }
}

const notFound = (what) => new ApiError(404, `${what} not found.`);

/* --------------------------------------------------------------- seed data */

const SEED_USERS = [
  { name: 'Library Admin', email: 'admin@university.edu.pk', password: 'admin123', role: 'admin', rollNo: 'ADMIN-001', department: 'Library', phone: '0300-1234567' },
  { name: 'Ariba Tahir', email: 'ariba@university.edu.pk', password: 'student123', role: 'student', rollNo: 'BSCS-F21-001', department: 'Computer Science', phone: '0301-1111111' },
  { name: 'Hamza Khan', email: 'hamza@university.edu.pk', password: 'student123', role: 'student', rollNo: 'BSCS-F21-042', department: 'Computer Science', phone: '0302-2222222' },
  { name: 'Sana Malik', email: 'sana@university.edu.pk', password: 'student123', role: 'student', rollNo: 'BSSE-F22-017', department: 'Software Engineering', phone: '0303-3333333' },
];

const SEED_BOOKS = [
  ['Introduction to Algorithms', 'Thomas H. Cormen', '9780262046305', 'Computer Science', 'MIT Press', 2022, '4th', 'CS-A-01', 4, 'A comprehensive reference on sorting, graphs, dynamic programming and complexity analysis.'],
  ['Clean Code: A Handbook of Agile Software Craftsmanship', 'Robert C. Martin', '9780132350884', 'Software Engineering', 'Prentice Hall', 2008, '1st', 'SE-B-04', 3, 'Principles and worked examples for writing clean, readable, maintainable code.'],
  ['Database System Concepts', 'Abraham Silberschatz', '9780078022159', 'Database', 'McGraw-Hill', 2019, '7th', 'DB-C-02', 5, 'Relational model, SQL, normalization, transactions and query processing.'],
  ['Computer Networks', 'Andrew S. Tanenbaum', '9780132126953', 'Networking', 'Pearson', 2021, '6th', 'NW-D-03', 3, 'A detailed introduction to network layers, protocols, routing and network security.'],
  ['Operating System Concepts', 'Abraham Silberschatz', '9781119800361', 'Operating Systems', 'Wiley', 2021, '10th', 'OS-A-07', 4, 'Processes, threads, scheduling, memory management and file systems.'],
  ['Artificial Intelligence: A Modern Approach', 'Stuart Russell', '9780134610993', 'Artificial Intelligence', 'Pearson', 2020, '4th', 'AI-E-01', 2, 'Search, knowledge representation, machine learning and intelligent agents.'],
  ['Eloquent JavaScript', 'Marijn Haverbeke', '9781593279509', 'Web Development', 'No Starch Press', 2018, '3rd', 'WD-F-02', 3, 'JavaScript language, DOM, asynchronous programming and Node.js basics.'],
  ['Software Engineering', 'Ian Sommerville', '9780133943030', 'Software Engineering', 'Pearson', 2015, '10th', 'SE-B-01', 4, 'Requirements engineering, design, testing and project management.'],
  ['Discrete Mathematics and Its Applications', 'Kenneth H. Rosen', '9781259676512', 'Mathematics', 'McGraw-Hill', 2018, '8th', 'MT-G-05', 5, 'Logic, sets, relations, graph theory and combinatorics.'],
  ['The Pragmatic Programmer', 'Andrew Hunt', '9780135957059', 'Software Engineering', 'Addison-Wesley', 2019, '2nd', 'SE-B-09', 2, 'Practical tips and habits that make you a better developer.'],
  ['Head First Design Patterns', 'Eric Freeman', '9781492078005', 'Software Engineering', "O'Reilly", 2021, '2nd', 'SE-B-11', 3, 'Design patterns explained in an approachable, highly visual style.'],
  ['Cryptography and Network Security', 'William Stallings', '9780134444284', 'Information Security', 'Pearson', 2017, '7th', 'IS-H-02', 2, 'Encryption algorithms, key management and network security protocols.'],
];

function buildSeed() {
  const now = new Date();

  const users = SEED_USERS.map((u) => ({
    _id: oid(),
    ...u,
    isActive: true,
    createdAt: addDays(now, -120),
  }));

  const books = SEED_BOOKS.map(
    ([title, author, isbn, category, publisher, publishYear, edition, shelfLocation, totalCopies, description], i) => ({
      _id: oid(),
      title, author, isbn, category, publisher, publishYear, edition, shelfLocation,
      totalCopies,
      availableCopies: totalCopies,
      description,
      coverUrl: '',
      createdAt: addDays(now, -100 + i),
    })
  );

  const admin = users.find((u) => u.role === 'admin');
  const students = users.filter((u) => u.role === 'student');
  const issues = [];

  // Demo records: one on time, one overdue, another student's loan, one returned.
  const plans = [
    { student: students[0], book: books[0], issuedDaysAgo: 3 },   // on time
    { student: students[1], book: books[2], issuedDaysAgo: 25 },  // overdue
    { student: students[1], book: books[4], issuedDaysAgo: 6 },   // on time
    { student: students[2], book: books[1], issuedDaysAgo: 40, returnedDaysAgo: 30 },
  ];

  // Older activity so the reports chart is not empty.
  const history = [];
  for (let month = 5; month >= 1; month -= 1) {
    const count = [4, 9, 3, 11, 7][5 - month];
    for (let n = 0; n < count; n += 1) {
      const issuedDaysAgo = month * 30 + (n % 20);
      history.push({
        student: students[n % students.length],
        book: books[(month * 3 + n) % books.length],
        issuedDaysAgo,
        returnedDaysAgo: issuedDaysAgo - 10,
      });
    }
  }

  for (const plan of [...history, ...plans]) {
    const issueDate = addDays(now, -plan.issuedDaysAgo);
    const dueDate = addDays(issueDate, RULES.loanPeriodDays);
    const returnDate = plan.returnedDaysAgo ? addDays(now, -plan.returnedDaysAgo) : null;
    const fine = returnDate ? calculateFine(dueDate, returnDate) : 0;

    issues.push({
      _id: oid(),
      book: plan.book._id,
      student: plan.student._id,
      issuedBy: admin._id,
      issueDate,
      dueDate,
      returnDate,
      renewCount: 0,
      fine,
      finePaid: returnDate ? fine === 0 : false,
      status: returnDate ? 'returned' : 'issued',
      createdAt: issueDate,
    });

    if (!returnDate) plan.book.availableCopies -= 1;
  }

  return { users, books, issues };
}

/* ------------------------------------------------------------------- store */

let db = null;

function load() {
  if (db) return db;
  try {
    const saved = localStorage.getItem(STORE_KEY);
    if (saved) {
      db = JSON.parse(saved);
      return db;
    }
  } catch {
    // Private window or blocked storage - fall back to memory.
  }
  db = buildSeed();
  save();
  return db;
}

function save() {
  try {
    localStorage.setItem(STORE_KEY, JSON.stringify(db));
  } catch {
    // Keep working without storage; the data then lasts only for this session.
  }
}

/** Resets the demo data to its starting state. */
export function resetDemoData() {
  db = buildSeed();
  save();
  try {
    localStorage.removeItem('elibrary_token');
  } catch {
    /* ignore */
  }
}

/* ---------------------------------------------------------------- shaping */

const publicUser = (u) => ({
  _id: u._id,
  name: u.name,
  email: u.email,
  role: u.role,
  rollNo: u.rollNo,
  department: u.department,
  phone: u.phone,
  isActive: u.isActive,
  createdAt: u.createdAt,
});

const bookRef = (b) =>
  b && { _id: b._id, title: b.title, author: b.author, isbn: b.isbn, category: b.category, coverUrl: b.coverUrl };

const studentRef = (u) =>
  u && { _id: u._id, name: u.name, email: u.email, rollNo: u.rollNo, department: u.department, phone: u.phone };

/** Returns the record populated and with a live fine, just like the real API. */
function shapeIssue(issue) {
  const out = {
    ...issue,
    book: bookRef(db.books.find((b) => b._id === issue.book)),
    student: studentRef(db.users.find((u) => u._id === issue.student)),
  };

  if (issue.status === 'issued') {
    out.fine = calculateFine(issue.dueDate);
    out.daysOverdue = daysOverdue(issue.dueDate);
    out.isOverdue = out.daysOverdue > 0;
  } else {
    out.daysOverdue = daysOverdue(issue.dueDate, issue.returnDate || new Date());
    out.isOverdue = false;
  }
  return out;
}

const newest = (a, b) => new Date(b.createdAt) - new Date(a.createdAt);

/* --------------------------------------------------------------- auth glue */

const tokenFor = (user) => `demo.${user._id}`;

function currentUser(token) {
  if (!token?.startsWith('demo.')) throw new ApiError(401, 'Invalid or expired token.');

  const user = db.users.find((u) => u._id === token.slice(5));
  if (!user) throw new ApiError(401, 'This user no longer exists.');
  if (!user.isActive) throw new ApiError(403, 'Your account is blocked. Please contact the library admin.');

  return user;
}

const requireAdmin = (user) => {
  if (user.role !== 'admin') throw new ApiError(403, 'You are not allowed to perform this action.');
  return user;
};

/* ------------------------------------------------------------------ routes */

const routes = [
  /* ---------- auth ---------- */
  ['POST', /^\/auth\/register$/, (ctx) => {
    const { name, email, password, rollNo, department = '', phone = '' } = ctx.body;

    if (!name?.trim()) throw new ApiError(400, 'Name is required.');
    if (!email?.includes('@')) throw new ApiError(400, 'Enter a valid email address.');
    if (!password || password.length < 6) throw new ApiError(400, 'Password must be at least 6 characters.');
    if (!rollNo?.trim()) throw new ApiError(400, 'Roll number is required.');
    if (db.users.some((u) => u.email === email.toLowerCase())) {
      throw new ApiError(409, 'This email is already registered.');
    }

    // The role is always student - the admin exists only in the seed data.
    const user = {
      _id: oid(),
      name: name.trim(),
      email: email.toLowerCase().trim(),
      password,
      role: 'student',
      rollNo: rollNo.trim(),
      department,
      phone,
      isActive: true,
      createdAt: new Date().toISOString(),
    };
    db.users.push(user);
    save();

    return [201, { token: tokenFor(user), user: publicUser(user) }];
  }],

  ['POST', /^\/auth\/login$/, (ctx) => {
    const email = (ctx.body.email || '').toLowerCase().trim();
    const user = db.users.find((u) => u.email === email);

    if (!user || user.password !== ctx.body.password) {
      throw new ApiError(401, 'Incorrect email or password.');
    }
    if (!user.isActive) throw new ApiError(403, 'Your account is blocked. Please contact the library admin.');

    return [200, { token: tokenFor(user), user: publicUser(user) }];
  }],

  ['GET', /^\/auth\/me$/, (ctx) => [200, { user: publicUser(ctx.auth()) }]],

  ['PUT', /^\/auth\/profile$/, (ctx) => {
    const user = ctx.auth();
    ['name', 'department', 'phone'].forEach((field) => {
      if (ctx.body[field] !== undefined) user[field] = ctx.body[field];
    });
    save();
    return [200, { user: publicUser(user) }];
  }],

  ['PUT', /^\/auth\/password$/, (ctx) => {
    const user = ctx.auth();
    const { currentPassword, newPassword } = ctx.body;

    if (user.password !== currentPassword) throw new ApiError(401, 'Current password is incorrect.');
    if (!newPassword || newPassword.length < 6) {
      throw new ApiError(400, 'New password must be at least 6 characters.');
    }

    user.password = newPassword;
    save();
    return [200, { message: 'Password updated.' }];
  }],

  /* ---------- books ---------- */
  ['GET', /^\/books\/categories$/, (ctx) => {
    ctx.auth();
    const categories = [...new Set(db.books.map((b) => b.category).filter(Boolean))].sort();
    return [200, { categories }];
  }],

  ['GET', /^\/books$/, (ctx) => {
    ctx.auth();
    const { search = '', category = '', available = '', sort = 'newest' } = ctx.query;
    const page = Math.max(1, Number(ctx.query.page) || 1);
    const limit = Math.min(48, Math.max(1, Number(ctx.query.limit) || 12));

    let list = [...db.books];

    if (search.trim()) {
      const rx = new RegExp(escapeRx(search.trim()), 'i');
      list = list.filter((b) => rx.test(b.title) || rx.test(b.author) || rx.test(b.isbn) || rx.test(b.publisher || ''));
    }
    if (category.trim()) list = list.filter((b) => b.category === category.trim());
    if (available === 'true') list = list.filter((b) => b.availableCopies > 0);

    const sorters = {
      newest,
      title: (a, b) => a.title.localeCompare(b.title),
      author: (a, b) => a.author.localeCompare(b.author),
      year: (a, b) => (b.publishYear || 0) - (a.publishYear || 0),
    };
    list.sort(sorters[sort] || sorters.newest);

    const total = list.length;
    return [200, {
      books: list.slice((page - 1) * limit, page * limit),
      page,
      limit,
      total,
      totalPages: Math.max(1, Math.ceil(total / limit)),
    }];
  }],

  ['GET', /^\/books\/([a-f0-9]+)$/, (ctx) => {
    ctx.auth();
    const book = db.books.find((b) => b._id === ctx.params[0]);
    if (!book) throw notFound('Book');
    return [200, { book }];
  }],

  ['POST', /^\/books$/, (ctx) => {
    requireAdmin(ctx.auth());
    const { title, author, isbn, category } = ctx.body;

    if (!title?.trim()) throw new ApiError(400, 'Book title is required.');
    if (!author?.trim()) throw new ApiError(400, 'Author name is required.');
    if (!isbn?.trim()) throw new ApiError(400, 'ISBN is required.');
    if (!category?.trim()) throw new ApiError(400, 'Category is required.');
    if (db.books.some((b) => b.isbn === isbn.trim())) throw new ApiError(409, 'This isbn already exists.');

    const totalCopies = Number(ctx.body.totalCopies) || 1;
    const book = {
      _id: oid(),
      ...ctx.body,
      isbn: isbn.trim(),
      totalCopies,
      availableCopies: totalCopies,
      createdAt: new Date().toISOString(),
    };
    db.books.push(book);
    save();

    return [201, { book }];
  }],

  ['PUT', /^\/books\/([a-f0-9]+)$/, (ctx) => {
    requireAdmin(ctx.auth());
    const book = db.books.find((b) => b._id === ctx.params[0]);
    if (!book) throw notFound('Book');

    const issuedCount = book.totalCopies - book.availableCopies;

    ['title', 'author', 'isbn', 'category', 'publisher', 'publishYear', 'edition', 'description', 'coverUrl', 'shelfLocation']
      .forEach((field) => {
        if (ctx.body[field] !== undefined) book[field] = ctx.body[field];
      });

    if (ctx.body.totalCopies !== undefined) {
      const newTotal = Number(ctx.body.totalCopies);
      if (newTotal < issuedCount) {
        throw new ApiError(400, `Total copies cannot be less than ${issuedCount} - that many copies are currently issued.`);
      }
      book.totalCopies = newTotal;
      book.availableCopies = newTotal - issuedCount;
    }

    save();
    return [200, { book }];
  }],

  ['DELETE', /^\/books\/([a-f0-9]+)$/, (ctx) => {
    requireAdmin(ctx.auth());
    const index = db.books.findIndex((b) => b._id === ctx.params[0]);
    if (index === -1) throw notFound('Book');

    const active = db.issues.some((i) => i.book === ctx.params[0] && i.status === 'issued');
    if (active) throw new ApiError(409, 'This book is currently issued - process the return before deleting it.');

    db.books.splice(index, 1);
    save();
    return [200, { message: 'Book deleted.' }];
  }],

  /* ---------- issues ---------- */
  ['GET', /^\/issues\/my$/, (ctx) => {
    const user = ctx.auth();
    let list = db.issues.filter((i) => i.student === user._id);

    const { status } = ctx.query;
    if (status === 'issued' || status === 'returned') list = list.filter((i) => i.status === status);

    return [200, { issues: list.sort(newest).map(shapeIssue) }];
  }],

  ['GET', /^\/issues$/, (ctx) => {
    requireAdmin(ctx.auth());
    const { status, overdue, student } = ctx.query;
    let list = [...db.issues];

    if (status === 'issued' || status === 'returned') list = list.filter((i) => i.status === status);
    if (student) list = list.filter((i) => i.student === student);
    if (overdue === 'true') {
      list = list.filter((i) => i.status === 'issued' && startOfDay(i.dueDate) < startOfDay(new Date()));
    }

    return [200, { issues: list.sort(newest).slice(0, 300).map(shapeIssue) }];
  }],

  ['POST', /^\/issues$/, (ctx) => {
    const user = ctx.auth();
    const isAdmin = user.role === 'admin';
    const studentId = isAdmin ? ctx.body.studentId : user._id;

    if (!studentId) throw new ApiError(400, 'Please select a student.');

    const student = db.users.find((u) => u._id === studentId && u.role === 'student');
    if (!student) throw notFound('Student');
    if (!student.isActive) throw new ApiError(403, 'This student account is blocked.');

    const activeLoans = db.issues.filter((i) => i.student === studentId && i.status === 'issued');

    if (activeLoans.length >= RULES.maxBooksPerStudent) {
      throw new ApiError(409, `Borrowing limit reached - a student may hold only ${RULES.maxBooksPerStudent} books at a time.`);
    }
    if (activeLoans.some((i) => i.book === ctx.body.bookId)) {
      throw new ApiError(409, 'This book is already issued to you.');
    }
    if (activeLoans.some((i) => calculateFine(i.dueDate) > 0)) {
      throw new ApiError(409, 'You have an overdue book. Please return it before borrowing another.');
    }

    const book = db.books.find((b) => b._id === ctx.body.bookId);
    if (!book) throw notFound('Book');
    if (book.availableCopies <= 0) throw new ApiError(409, 'No copies of this book are available.');

    book.availableCopies -= 1;

    const issue = {
      _id: oid(),
      book: book._id,
      student: studentId,
      issuedBy: user._id,
      issueDate: new Date().toISOString(),
      dueDate: addDays(new Date(), RULES.loanPeriodDays),
      returnDate: null,
      renewCount: 0,
      fine: 0,
      finePaid: false,
      status: 'issued',
      createdAt: new Date().toISOString(),
    };
    db.issues.push(issue);
    save();

    return [201, { issue: shapeIssue(issue) }];
  }],

  ['PUT', /^\/issues\/([a-f0-9]+)\/renew$/, (ctx) => {
    const user = ctx.auth();
    const issue = db.issues.find((i) => i._id === ctx.params[0]);
    if (!issue) throw new ApiError(404, 'Issue record not found.');

    if (user.role !== 'admin' && issue.student !== user._id) {
      throw new ApiError(403, 'This record does not belong to you.');
    }
    if (issue.status === 'returned') throw new ApiError(409, 'A returned book cannot be renewed.');
    if (issue.renewCount >= RULES.maxRenewals) {
      throw new ApiError(409, `Renewal limit reached (max ${RULES.maxRenewals}).`);
    }
    if (calculateFine(issue.dueDate) > 0) {
      throw new ApiError(409, 'An overdue book cannot be renewed - please return it first.');
    }

    issue.dueDate = addDays(issue.dueDate, RULES.loanPeriodDays);
    issue.renewCount += 1;
    save();

    return [200, { issue: shapeIssue(issue), message: 'Due date extended.' }];
  }],

  ['PUT', /^\/issues\/([a-f0-9]+)\/return$/, (ctx) => {
    requireAdmin(ctx.auth());
    const issue = db.issues.find((i) => i._id === ctx.params[0]);
    if (!issue) throw new ApiError(404, 'Issue record not found.');
    if (issue.status === 'returned') throw new ApiError(409, 'This book has already been returned.');

    issue.returnDate = new Date().toISOString();
    issue.status = 'returned';
    issue.fine = calculateFine(issue.dueDate, issue.returnDate);
    if (issue.fine === 0) issue.finePaid = true;

    const book = db.books.find((b) => b._id === issue.book);
    if (book) book.availableCopies += 1;
    save();

    return [200, {
      issue: shapeIssue(issue),
      message: issue.fine > 0 ? `Book returned. Fine: Rs ${issue.fine}` : 'Book returned.',
    }];
  }],

  ['PUT', /^\/issues\/([a-f0-9]+)\/pay-fine$/, (ctx) => {
    requireAdmin(ctx.auth());
    const issue = db.issues.find((i) => i._id === ctx.params[0]);
    if (!issue) throw new ApiError(404, 'Issue record not found.');

    if (issue.status === 'issued') issue.fine = calculateFine(issue.dueDate);
    issue.finePaid = true;
    save();

    return [200, { issue: shapeIssue(issue), message: 'Fine marked as paid.' }];
  }],

  /* ---------- users ---------- */
  ['GET', /^\/users$/, (ctx) => {
    requireAdmin(ctx.auth());
    const { search = '', role = '' } = ctx.query;
    let list = [...db.users];

    if (search.trim()) {
      const rx = new RegExp(escapeRx(search.trim()), 'i');
      list = list.filter((u) => rx.test(u.name) || rx.test(u.email) || rx.test(u.rollNo || ''));
    }
    if (role === 'student' || role === 'admin') list = list.filter((u) => u.role === role);

    const users = list.sort(newest).map((u) => {
      const active = db.issues.filter((i) => i.student === u._id && i.status === 'issued');
      return {
        ...publicUser(u),
        activeLoans: active.length,
        pendingFine: active.reduce((sum, i) => sum + calculateFine(i.dueDate), 0),
      };
    });

    return [200, { users }];
  }],

  ['GET', /^\/users\/([a-f0-9]+)$/, (ctx) => {
    requireAdmin(ctx.auth());
    const user = db.users.find((u) => u._id === ctx.params[0]);
    if (!user) throw notFound('User');

    const issues = db.issues
      .filter((i) => i.student === user._id)
      .sort(newest)
      .map((i) => ({ ...i, book: bookRef(db.books.find((b) => b._id === i.book)) }));

    return [200, { user: publicUser(user), issues }];
  }],

  ['PUT', /^\/users\/([a-f0-9]+)\/status$/, (ctx) => {
    const me = requireAdmin(ctx.auth());
    const user = db.users.find((u) => u._id === ctx.params[0]);
    if (!user) throw notFound('User');
    if (user._id === me._id) throw new ApiError(400, 'You cannot block your own account.');

    user.isActive = !user.isActive;
    save();

    return [200, {
      user: publicUser(user),
      message: user.isActive ? 'Account activated.' : 'Account blocked.',
    }];
  }],

  ['DELETE', /^\/users\/([a-f0-9]+)$/, (ctx) => {
    const me = requireAdmin(ctx.auth());
    const index = db.users.findIndex((u) => u._id === ctx.params[0]);
    if (index === -1) throw notFound('User');
    if (ctx.params[0] === me._id) throw new ApiError(400, 'You cannot delete your own account.');

    const active = db.issues.some((i) => i.student === ctx.params[0] && i.status === 'issued');
    if (active) throw new ApiError(409, 'This student still has issued books - process the returns first.');

    db.users.splice(index, 1);
    save();
    return [200, { message: 'User deleted.' }];
  }],

  /* ---------- reports ---------- */
  ['GET', /^\/reports\/summary$/, (ctx) => {
    requireAdmin(ctx.auth());

    const active = db.issues.filter((i) => i.status === 'issued');
    const overdue = active.filter((i) => startOfDay(i.dueDate) < startOfDay(new Date()));
    const totalCopies = db.books.reduce((sum, b) => sum + b.totalCopies, 0);
    const availableCopies = db.books.reduce((sum, b) => sum + b.availableCopies, 0);

    const unpaidReturned = db.issues
      .filter((i) => i.status === 'returned' && !i.finePaid && i.fine > 0)
      .reduce((sum, i) => sum + i.fine, 0);

    return [200, {
      stats: {
        totalBooks: db.books.length,
        totalCopies,
        availableCopies,
        issuedCopies: totalCopies - availableCopies,
        totalStudents: db.users.filter((u) => u.role === 'student').length,
        blockedStudents: db.users.filter((u) => u.role === 'student' && !u.isActive).length,
        activeLoans: active.length,
        returnedCount: db.issues.filter((i) => i.status === 'returned').length,
        overdueCount: overdue.length,
        fineCollected: db.issues.filter((i) => i.finePaid && i.fine > 0).reduce((sum, i) => sum + i.fine, 0),
        pendingFine: overdue.reduce((sum, i) => sum + calculateFine(i.dueDate), 0) + unpaidReturned,
      },
    }];
  }],

  ['GET', /^\/reports\/popular$/, (ctx) => {
    requireAdmin(ctx.auth());
    const limit = Math.min(20, Math.max(1, Number(ctx.query.limit) || 5));

    const counts = new Map();
    db.issues.forEach((i) => counts.set(i.book, (counts.get(i.book) || 0) + 1));

    const books = [...counts.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, limit)
      .map(([bookId, issueCount]) => {
        const book = db.books.find((b) => b._id === bookId);
        return book && { _id: book._id, title: book.title, author: book.author, category: book.category, issueCount };
      })
      .filter(Boolean);

    return [200, { books }];
  }],

  ['GET', /^\/reports\/monthly$/, (ctx) => {
    requireAdmin(ctx.auth());
    const months = Math.min(12, Math.max(1, Number(ctx.query.months) || 6));

    const from = new Date();
    from.setMonth(from.getMonth() - (months - 1), 1);
    from.setHours(0, 0, 0, 0);

    const series = [];
    for (let i = 0; i < months; i += 1) {
      const d = new Date(from);
      d.setMonth(from.getMonth() + i);

      const inMonth = db.issues.filter((issue) => {
        const date = new Date(issue.issueDate);
        return date.getFullYear() === d.getFullYear() && date.getMonth() === d.getMonth();
      });

      series.push({
        label: d.toLocaleString('en', { month: 'short', year: '2-digit' }),
        issued: inMonth.length,
        returned: inMonth.filter((issue) => issue.status === 'returned').length,
      });
    }

    return [200, { series }];
  }],

  ['GET', /^\/reports\/categories$/, (ctx) => {
    requireAdmin(ctx.auth());

    const map = new Map();
    db.books.forEach((b) => {
      const row = map.get(b.category) || { category: b.category, books: 0, copies: 0 };
      row.books += 1;
      row.copies += b.totalCopies;
      map.set(b.category, row);
    });

    return [200, { categories: [...map.values()].sort((a, b) => b.books - a.books) }];
  }],

  ['GET', /^\/reports\/overdue$/, (ctx) => {
    requireAdmin(ctx.auth());

    const issues = db.issues
      .filter((i) => i.status === 'issued' && startOfDay(i.dueDate) < startOfDay(new Date()))
      .sort((a, b) => new Date(a.dueDate) - new Date(b.dueDate))
      .map(shapeIssue);

    return [200, { issues }];
  }],
];

/* ------------------------------------------------------------------ adapter */

/**
 * An axios adapter: instead of putting the request on the network it runs it
 * through the routes above, returning the same response shape axios would.
 */
export function demoAdapter(config) {
  load();

  return new Promise((resolve, reject) => {
    const method = (config.method || 'get').toUpperCase();
    const url = new URL(config.url, 'http://demo.local' + (config.baseURL || ''));
    const path = url.pathname.replace(/^\/api/, '') || '/';

    const query = { ...Object.fromEntries(url.searchParams), ...(config.params || {}) };
    let body = config.data;
    if (typeof body === 'string') {
      try {
        body = JSON.parse(body);
      } catch {
        body = {};
      }
    }

    const token = (config.headers?.Authorization || '').replace('Bearer ', '');
    const ctx = {
      body: body || {},
      query,
      params: [],
      auth: () => currentUser(token),
    };

    const done = (status, data) => {
      const response = { data, status, statusText: '', headers: {}, config, request: {} };
      // Reject on 4xx/5xx, the same way a real axios call does.
      if (status >= 400) {
        const err = new Error(data.message || 'Request failed.');
        err.response = response;
        err.config = config;
        err.isAxiosError = true;
        reject(err);
      } else {
        resolve(response);
      }
    };

    // A small delay so loading states behave like a real network call.
    setTimeout(() => {
      for (const [routeMethod, pattern, handler] of routes) {
        if (routeMethod !== method) continue;

        const match = path.match(pattern);
        if (!match) continue;

        ctx.params = match.slice(1);
        try {
          const [status, data] = handler(ctx);
          done(status, data);
        } catch (err) {
          if (err instanceof ApiError) done(err.status, { message: err.message });
          else done(500, { message: err.message || 'The demo backend hit an unexpected error.' });
        }
        return;
      }

      done(404, { message: `Route not found: ${method} ${path}` });
    }, 120);
  });
}
