import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import api, { errorMessage } from '../../api/client.js';
import { Alert, PageLoader, StatCard, formatDate, formatMoney } from '../../components/ui.jsx';

export default function Dashboard() {
  const [stats, setStats] = useState(null);
  const [popular, setPopular] = useState([]);
  const [overdue, setOverdue] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    Promise.all([
      api.get('/reports/summary'),
      api.get('/reports/popular', { params: { limit: 5 } }),
      api.get('/reports/overdue'),
    ])
      .then(([s, p, o]) => {
        setStats(s.data.stats);
        setPopular(p.data.books);
        setOverdue(o.data.issues.slice(0, 5));
      })
      .catch((err) => setError(errorMessage(err)))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <PageLoader />;

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-bold text-slate-900">Admin Dashboard</h1>
        <p className="mt-1 text-sm text-slate-600">The current state of the library at a glance.</p>
      </header>

      <Alert onClose={() => setError('')}>{error}</Alert>

      {stats && (
        <>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <StatCard
              label="Total books"
              value={stats.totalBooks}
              hint={`${stats.totalCopies} copies`}
            />
            <StatCard
              label="On loan"
              value={stats.activeLoans}
              tone="amber"
              hint={`${stats.availableCopies} copies available`}
            />
            <StatCard
              label="Overdue"
              value={stats.overdueCount}
              tone="red"
              hint={stats.overdueCount > 0 ? 'Needs follow-up' : 'All clear'}
            />
            <StatCard
              label="Registered students"
              value={stats.totalStudents}
              tone="green"
              hint={`${stats.blockedStudents} blocked`}
            />
          </div>

          <div className="grid gap-4 sm:grid-cols-3">
            <StatCard label="Pending fine" value={formatMoney(stats.pendingFine)} tone="red" />
            <StatCard label="Fine collected" value={formatMoney(stats.fineCollected)} tone="green" />
            <StatCard label="Total returns" value={stats.returnedCount} />
          </div>
        </>
      )}

      <div className="grid gap-6 lg:grid-cols-2">
        <section className="card p-6">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="font-semibold text-slate-900">Most borrowed books</h2>
            <Link to="/admin/reports" className="text-sm text-brand-600 hover:underline">
              Reports
            </Link>
          </div>

          {popular.length === 0 ? (
            <p className="py-6 text-center text-sm text-slate-500">No records yet.</p>
          ) : (
            <ol className="space-y-3">
              {popular.map((book, index) => (
                <li key={book._id} className="flex items-center gap-3">
                  <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-brand-50 text-xs font-semibold text-brand-700">
                    {index + 1}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-slate-800">{book.title}</p>
                    <p className="truncate text-xs text-slate-500">{book.author}</p>
                  </div>
                  <span className="shrink-0 text-sm font-semibold text-slate-700">
                    {book.issueCount}x
                  </span>
                </li>
              ))}
            </ol>
          )}
        </section>

        <section className="card p-6">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="font-semibold text-slate-900">Overdue books</h2>
            <Link to="/admin/issues" className="text-sm text-brand-600 hover:underline">
              View all
            </Link>
          </div>

          {overdue.length === 0 ? (
            <p className="py-6 text-center text-sm text-slate-500">No books are overdue. 🎉</p>
          ) : (
            <ul className="space-y-3">
              {overdue.map((issue) => (
                <li key={issue._id} className="flex items-center gap-3">
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-slate-800">{issue.book?.title}</p>
                    <p className="truncate text-xs text-slate-500">
                      {issue.student?.name} · {issue.student?.rollNo} · due {formatDate(issue.dueDate)}
                    </p>
                  </div>
                  <span className="shrink-0 text-sm font-semibold text-red-600">
                    {formatMoney(issue.fine)}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </div>
  );
}
