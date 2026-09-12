import { useEffect, useState } from 'react';
import api, { errorMessage } from '../../api/client.js';
import { CategoryBars, MonthlyBarChart } from '../../components/charts.jsx';
import {
  Alert, EmptyState, PageLoader, StatCard, formatDate, formatMoney,
} from '../../components/ui.jsx';

export default function Reports() {
  const [months, setMonths] = useState(6);
  const [data, setData] = useState({ series: [], categories: [], popular: [], overdue: [], stats: null });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    setLoading(true);
    setError('');

    Promise.all([
      api.get('/reports/summary'),
      api.get('/reports/monthly', { params: { months } }),
      api.get('/reports/categories'),
      api.get('/reports/popular', { params: { limit: 10 } }),
      api.get('/reports/overdue'),
    ])
      .then(([s, m, c, p, o]) =>
        setData({
          stats: s.data.stats,
          series: m.data.series,
          categories: c.data.categories,
          popular: p.data.books,
          overdue: o.data.issues,
        })
      )
      .catch((err) => setError(errorMessage(err)))
      .finally(() => setLoading(false));
  }, [months]);

  if (loading) return <PageLoader />;

  const { stats, series, categories, popular, overdue } = data;

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-end justify-between gap-4 print:block">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Reports</h1>
          <p className="mt-1 text-sm text-slate-600">
            Library ki activity, categories aur overdue books ka khulasa.
          </p>
        </div>

        <div className="flex items-end gap-3 print:hidden">
          <div>
            <label className="label" htmlFor="months">Muddat</label>
            <select
              id="months"
              className="input"
              value={months}
              onChange={(e) => setMonths(Number(e.target.value))}
            >
              <option value={3}>Pichlay 3 mahine</option>
              <option value={6}>Pichlay 6 mahine</option>
              <option value={12}>Pichlay 12 mahine</option>
            </select>
          </div>
          <button type="button" className="btn-secondary" onClick={() => window.print()}>
            Print / PDF
          </button>
        </div>
      </header>

      <Alert onClose={() => setError('')}>{error}</Alert>

      {stats && (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <StatCard label="Total books" value={stats.totalBooks} hint={`${stats.totalCopies} copies`} />
          <StatCard label="Abhi issued" value={stats.activeLoans} tone="amber" />
          <StatCard label="Overdue" value={stats.overdueCount} tone="red" />
          <StatCard label="Fine collected" value={formatMoney(stats.fineCollected)} tone="green" />
        </div>
      )}

      <div className="grid gap-6 lg:grid-cols-5">
        <section className="card p-6 lg:col-span-3">
          <h2 className="font-semibold text-slate-900">Mahana activity</h2>
          <p className="mb-4 text-sm text-slate-500">Har mahine kitni books issue aur wapas huin.</p>
          <MonthlyBarChart data={series} labels={{ primary: 'Issued', secondary: 'Returned' }} />
        </section>

        <section className="card p-6 lg:col-span-2">
          <h2 className="font-semibold text-slate-900">Category wise books</h2>
          <p className="mb-4 text-sm text-slate-500">Har category mein kitni alag books hain.</p>
          <CategoryBars data={categories} />
        </section>
      </div>

      <section className="card overflow-hidden">
        <div className="border-b border-slate-200 px-6 py-4">
          <h2 className="font-semibold text-slate-900">Sab se zyada issue hone wali books</h2>
        </div>

        {popular.length === 0 ? (
          <p className="py-10 text-center text-sm text-slate-500">Abhi koi record nahi hai.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[560px]">
              <thead className="bg-slate-50">
                <tr>
                  <th className="table-th w-12">#</th>
                  <th className="table-th">Title</th>
                  <th className="table-th">Author</th>
                  <th className="table-th">Category</th>
                  <th className="table-th text-right">Kitni baar issue hui</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {popular.map((book, index) => (
                  <tr key={book._id}>
                    <td className="table-td text-slate-400">{index + 1}</td>
                    <td className="table-td font-medium text-slate-900">{book.title}</td>
                    <td className="table-td">{book.author}</td>
                    <td className="table-td">{book.category}</td>
                    <td className="table-td text-right font-semibold">{book.issueCount}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <section className="card overflow-hidden">
        <div className="flex items-center justify-between border-b border-slate-200 px-6 py-4">
          <h2 className="font-semibold text-slate-900">Overdue books</h2>
          <span className="text-sm text-slate-500">{overdue.length} records</span>
        </div>

        {overdue.length === 0 ? (
          <div className="p-6">
            <EmptyState icon="✅" title="Koi book overdue nahi hai" hint="Sab students time par wapas kar rahe hain." />
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[720px]">
              <thead className="bg-slate-50">
                <tr>
                  <th className="table-th">Student</th>
                  <th className="table-th">Roll no</th>
                  <th className="table-th">Book</th>
                  <th className="table-th">Due date</th>
                  <th className="table-th">Late</th>
                  <th className="table-th text-right">Fine</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {overdue.map((issue) => (
                  <tr key={issue._id}>
                    <td className="table-td">
                      <p className="font-medium text-slate-900">{issue.student?.name}</p>
                      <p className="text-xs text-slate-500">{issue.student?.phone || issue.student?.email}</p>
                    </td>
                    <td className="table-td">{issue.student?.rollNo}</td>
                    <td className="table-td">{issue.book?.title}</td>
                    <td className="table-td whitespace-nowrap">{formatDate(issue.dueDate)}</td>
                    <td className="table-td">{issue.daysOverdue} din</td>
                    <td className="table-td text-right font-semibold text-red-600">
                      {formatMoney(issue.fine)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}
