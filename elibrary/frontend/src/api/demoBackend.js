/**
 * Demo mode ka backend - poora browser ke andar chalta hai.
 *
 * Iska maqsad sirf ye hai ke app bina Node server aur bina MongoDB ke chal sake,
 * taake live demo link share ki ja sake (misal presentation ya viva ke liye).
 * Ye asli backend ke bilkul wohi endpoints, wohi rules aur wohi error messages
 * follow karta hai - farq sirf ye hai ke data browser ki localStorage mein rehta hai.
 *
 * Chalane ke liye:  VITE_DEMO=true npm run build
 * Asli project isse chhoota nahi - normal build mein ye file load hi nahi hoti.
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

/** Error jise adapter HTTP response mein badal deta hai. */
class ApiError extends Error {
  constructor(status, message) {
    super(message);
    this.status = status;
  }
}

const notFound = (what) => new ApiError(404, `${what} nahi mili.`);

/* --------------------------------------------------------------- seed data */

const SEED_USERS = [
  { name: 'Library Admin', email: 'admin@university.edu.pk', password: 'admin123', role: 'admin', rollNo: 'ADMIN-001', department: 'Library', phone: '0300-1234567' },
  { name: 'Ariba Tahir', email: 'ariba@university.edu.pk', password: 'student123', role: 'student', rollNo: 'BSCS-F21-001', department: 'Computer Science', phone: '0301-1111111' },
  { name: 'Hamza Khan', email: 'hamza@university.edu.pk', password: 'student123', role: 'student', rollNo: 'BSCS-F21-042', department: 'Computer Science', phone: '0302-2222222' },
  { name: 'Sana Malik', email: 'sana@university.edu.pk', password: 'student123', role: 'student', rollNo: 'BSSE-F22-017', department: 'Software Engineering', phone: '0303-3333333' },
];

const SEED_BOOKS = [
  ['Introduction to Algorithms', 'Thomas H. Cormen', '9780262046305', 'Computer Science', 'MIT Press', 2022, '4th', 'CS-A-01', 4, 'Algorithms ki comprehensive kitaab - sorting, graphs, dynamic programming aur complexity analysis.'],
  ['Clean Code: A Handbook of Agile Software Craftsmanship', 'Robert C. Martin', '9780132350884', 'Software Engineering', 'Prentice Hall', 2008, '1st', 'SE-B-04', 3, 'Saaf, readable aur maintainable code likhne ke usool aur practical examples.'],
  ['Database System Concepts', 'Abraham Silberschatz', '9780078022159', 'Database', 'McGraw-Hill', 2019, '7th', 'DB-C-02', 5, 'Relational model, SQL, normalization, transactions aur query processing.'],
  ['Computer Networks', 'Andrew S. Tanenbaum', '9780132126953', 'Networking', 'Pearson', 2021, '6th', 'NW-D-03', 3, 'Network layers, protocols, routing aur network security ka detailed taaruf.'],
  ['Operating System Concepts', 'Abraham Silberschatz', '9781119800361', 'Operating Systems', 'Wiley', 2021, '10th', 'OS-A-07', 4, 'Processes, threads, scheduling, memory management aur file systems.'],
  ['Artificial Intelligence: A Modern Approach', 'Stuart Russell', '9780134610993', 'Artificial Intelligence', 'Pearson', 2020, '4th', 'AI-E-01', 2, 'Search, knowledge representation, machine learning aur intelligent agents.'],
  ['Eloquent JavaScript', 'Marijn Haverbeke', '9781593279509', 'Web Development', 'No Starch Press', 2018, '3rd', 'WD-F-02', 3, 'JavaScript language, DOM, asynchronous programming aur Node.js basics.'],
  ['Software Engineering', 'Ian Sommerville', '9780133943030', 'Software Engineering', 'Pearson', 2015, '10th', 'SE-B-01', 4, 'Requirements engineering, design, testing aur project management.'],
  ['Discrete Mathematics and Its Applications', 'Kenneth H. Rosen', '9781259676512', 'Mathematics', 'McGraw-Hill', 2018, '8th', 'MT-G-05', 5, 'Logic, sets, relations, graph theory aur combinatorics.'],
  ['The Pragmatic Programmer', 'Andrew Hunt', '9780135957059', 'Software Engineering', 'Addison-Wesley', 2019, '2nd', 'SE-B-09', 2, 'Practical tips aur habits jo developer ko behtar banate hain.'],
  ['Head First Design Patterns', 'Eric Freeman', '9781492078005', 'Software Engineering', "O'Reilly", 2021, '2nd', 'SE-B-11', 3, 'Design patterns ko asaan visual tareeqe se samjhaya gaya hai.'],
  ['Cryptography and Network Security', 'William Stallings', '9780134444284', 'Information Security', 'Pearson', 2017, '7th', 'IS-H-02', 2, 'Encryption algorithms, key management aur network security protocols.'],
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

  // Demo records: ek normal, ek overdue, ek doosre student ka, ek returned.
  const plans = [
    { student: students[0], book: books[0], issuedDaysAgo: 3 },   // on time
    { student: students[1], book: books[2], issuedDaysAgo: 25 },  // overdue
    { student: students[1], book: books[4], issuedDaysAgo: 6 },   // on time
    { student: students[2], book: books[1], issuedDaysAgo: 40, returnedDaysAgo: 30 },
  ];

  // Purani activity taake reports ka chart khaali na lage.
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
    // Private window ya blocked storage - memory mein chala lete hain.
  }
  db = buildSeed();
  save();
  return db;
}

function save() {
  try {
    localStorage.setItem(STORE_KEY, JSON.stringify(db));
  } catch {
    // Storage na mile to bhi app chalti rahe - data sirf is session tak rahega.
  }
}

/** Demo data wapas shuru wali haalat par le aata hai. */
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

/** Issue record ko populated + live fine ke saath bhejta hai (asli API ki tarah). */
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
  if (!token?.startsWith('demo.')) throw new ApiError(401, 'Token invalid ya expire ho chuka hai.');

  const user = db.users.find((u) => u._id === token.slice(5));
  if (!user) throw new ApiError(401, 'User ab maujood nahi hai.');
  if (!user.isActive) throw new ApiError(403, 'Aapka account block hai. Admin se rabta karein.');

  return user;
}

const requireAdmin = (user) => {
  if (user.role !== 'admin') throw new ApiError(403, 'Is kaam ki ijazat nahi hai.');
  return user;
};

/* ------------------------------------------------------------------ routes */

const routes = [
  /* ---------- auth ---------- */
  ['POST', /^\/auth\/register$/, (ctx) => {
    const { name, email, password, rollNo, department = '', phone = '' } = ctx.body;

    if (!name?.trim()) throw new ApiError(400, 'Naam likhna zaroori hai.');
    if (!email?.includes('@')) throw new ApiError(400, 'Sahi email likhein.');
    if (!password || password.length < 6) throw new ApiError(400, 'Password kam se kam 6 characters ka ho.');
    if (!rollNo?.trim()) throw new ApiError(400, 'Roll number likhna zaroori hai.');
    if (db.users.some((u) => u.email === email.toLowerCase())) {
      throw new ApiError(409, 'Ye email pehle se register hai.');
    }

    // Role hamesha student - admin sirf seed data mein hota hai.
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
      throw new ApiError(401, 'Email ya password ghalat hai.');
    }
    if (!user.isActive) throw new ApiError(403, 'Aapka account block hai. Admin se rabta karein.');

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

    if (user.password !== currentPassword) throw new ApiError(401, 'Purana password ghalat hai.');
    if (!newPassword || newPassword.length < 6) {
      throw new ApiError(400, 'Naya password kam se kam 6 characters ka ho.');
    }

    user.password = newPassword;
    save();
    return [200, { message: 'Password update ho gaya.' }];
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

    if (!title?.trim()) throw new ApiError(400, 'Book ka title likhein.');
    if (!author?.trim()) throw new ApiError(400, 'Author ka naam likhein.');
    if (!isbn?.trim()) throw new ApiError(400, 'ISBN likhein.');
    if (!category?.trim()) throw new ApiError(400, 'Category select karein.');
    if (db.books.some((b) => b.isbn === isbn.trim())) throw new ApiError(409, 'Ye isbn pehle se mojood hai.');

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
        throw new ApiError(400, `Total copies ${issuedCount} se kam nahi ho sakti - itni copies abhi issued hain.`);
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
    if (active) throw new ApiError(409, 'Ye book abhi issued hai - pehle return karwayein, phir delete karein.');

    db.books.splice(index, 1);
    save();
    return [200, { message: 'Book delete ho gayi.' }];
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

    if (!studentId) throw new ApiError(400, 'Student select karein.');

    const student = db.users.find((u) => u._id === studentId && u.role === 'student');
    if (!student) throw notFound('Student');
    if (!student.isActive) throw new ApiError(403, 'Ye student account block hai.');

    const activeLoans = db.issues.filter((i) => i.student === studentId && i.status === 'issued');

    if (activeLoans.length >= RULES.maxBooksPerStudent) {
      throw new ApiError(409, `Limit poori ho gayi - ek waqt mein sirf ${RULES.maxBooksPerStudent} books issue ho sakti hain.`);
    }
    if (activeLoans.some((i) => i.book === ctx.body.bookId)) {
      throw new ApiError(409, 'Ye book pehle se aapke paas issued hai.');
    }
    if (activeLoans.some((i) => calculateFine(i.dueDate) > 0)) {
      throw new ApiError(409, 'Overdue book pending hai. Pehle wo return karein, phir nai book milegi.');
    }

    const book = db.books.find((b) => b._id === ctx.body.bookId);
    if (!book) throw notFound('Book');
    if (book.availableCopies <= 0) throw new ApiError(409, 'Is book ki koi copy available nahi hai.');

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
    if (!issue) throw new ApiError(404, 'Issue record nahi mila.');

    if (user.role !== 'admin' && issue.student !== user._id) {
      throw new ApiError(403, 'Ye record aapka nahi hai.');
    }
    if (issue.status === 'returned') throw new ApiError(409, 'Return ho chuki book renew nahi hoti.');
    if (issue.renewCount >= RULES.maxRenewals) {
      throw new ApiError(409, `Renew limit poori ho gayi (max ${RULES.maxRenewals} baar).`);
    }
    if (calculateFine(issue.dueDate) > 0) {
      throw new ApiError(409, 'Overdue book renew nahi ho sakti - pehle return karein.');
    }

    issue.dueDate = addDays(issue.dueDate, RULES.loanPeriodDays);
    issue.renewCount += 1;
    save();

    return [200, { issue: shapeIssue(issue), message: 'Due date barha di gayi.' }];
  }],

  ['PUT', /^\/issues\/([a-f0-9]+)\/return$/, (ctx) => {
    requireAdmin(ctx.auth());
    const issue = db.issues.find((i) => i._id === ctx.params[0]);
    if (!issue) throw new ApiError(404, 'Issue record nahi mila.');
    if (issue.status === 'returned') throw new ApiError(409, 'Ye book pehle hi return ho chuki hai.');

    issue.returnDate = new Date().toISOString();
    issue.status = 'returned';
    issue.fine = calculateFine(issue.dueDate, issue.returnDate);
    if (issue.fine === 0) issue.finePaid = true;

    const book = db.books.find((b) => b._id === issue.book);
    if (book) book.availableCopies += 1;
    save();

    return [200, {
      issue: shapeIssue(issue),
      message: issue.fine > 0 ? `Book return ho gayi. Fine: Rs ${issue.fine}` : 'Book return ho gayi.',
    }];
  }],

  ['PUT', /^\/issues\/([a-f0-9]+)\/pay-fine$/, (ctx) => {
    requireAdmin(ctx.auth());
    const issue = db.issues.find((i) => i._id === ctx.params[0]);
    if (!issue) throw new ApiError(404, 'Issue record nahi mila.');

    if (issue.status === 'issued') issue.fine = calculateFine(issue.dueDate);
    issue.finePaid = true;
    save();

    return [200, { issue: shapeIssue(issue), message: 'Fine paid mark ho gaya.' }];
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
    if (user._id === me._id) throw new ApiError(400, 'Apna hi account block nahi kar sakte.');

    user.isActive = !user.isActive;
    save();

    return [200, {
      user: publicUser(user),
      message: user.isActive ? 'Account activate ho gaya.' : 'Account block ho gaya.',
    }];
  }],

  ['DELETE', /^\/users\/([a-f0-9]+)$/, (ctx) => {
    const me = requireAdmin(ctx.auth());
    const index = db.users.findIndex((u) => u._id === ctx.params[0]);
    if (index === -1) throw notFound('User');
    if (ctx.params[0] === me._id) throw new ApiError(400, 'Apna hi account delete nahi kar sakte.');

    const active = db.issues.some((i) => i.student === ctx.params[0] && i.status === 'issued');
    if (active) throw new ApiError(409, 'Is student ke paas books issued hain - pehle return karwayein.');

    db.users.splice(index, 1);
    save();
    return [200, { message: 'User delete ho gaya.' }];
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
 * Axios adapter - HTTP request ko network par bhejne ke bajaye upar wale
 * routes se chala deta hai. Response ka shape bilkul axios jaisa hi hota hai.
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
      // Asli axios ki tarah 4xx/5xx par reject karte hain.
      if (status >= 400) {
        const err = new Error(data.message || 'Request fail ho gayi.');
        err.response = response;
        err.config = config;
        err.isAxiosError = true;
        reject(err);
      } else {
        resolve(response);
      }
    };

    // Thora sa delay taake loading states asli lagen.
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
          else done(500, { message: err.message || 'Demo backend mein masla aa gaya.' });
        }
        return;
      }

      done(404, { message: `Route nahi mila: ${method} ${path}` });
    }, 120);
  });
}
