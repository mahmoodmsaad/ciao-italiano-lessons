import { useCallback, useEffect, useState } from 'react';
import api, { errorMessage } from '../../api/client.js';
import {
  Alert, Badge, EmptyState, Modal, PageLoader, Spinner, formatDate, formatMoney,
} from '../../components/ui.jsx';

const FILTERS = [
  { key: 'issued', label: 'On loan', params: { status: 'issued' } },
  { key: 'overdue', label: 'Overdue', params: { overdue: 'true' } },
  { key: 'returned', label: 'Returned', params: { status: 'returned' } },
  { key: 'all', label: 'All records', params: {} },
];

export default function IssueReturn() {
  const [issues, setIssues] = useState([]);
  const [filter, setFilter] = useState('issued');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [busyId, setBusyId] = useState(null);
  const [issueOpen, setIssueOpen] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const params = FILTERS.find((f) => f.key === filter)?.params || {};
      const { data } = await api.get('/issues', { params });
      setIssues(data.issues);
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setLoading(false);
    }
  }, [filter]);

  useEffect(() => {
    load();
  }, [load]);

  const act = async (id, action) => {
    setBusyId(id);
    setError('');
    setMessage('');
    try {
      const { data } = await api.put(`/issues/${id}/${action}`);
      setMessage(data.message);
      await load();
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setBusyId(null);
    }
  };

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Issue / Return</h1>
          <p className="mt-1 text-sm text-slate-600">
            Lend books to students and record their returns.
          </p>
        </div>
        <button type="button" className="btn-primary" onClick={() => setIssueOpen(true)}>
          + Issue a book
        </button>
      </header>

      <div className="flex flex-wrap gap-2">
        {FILTERS.map((f) => (
          <button
            key={f.key}
            type="button"
            onClick={() => setFilter(f.key)}
            className={`rounded-lg px-4 py-2 text-sm font-medium transition ${
              filter === f.key ? 'bg-brand-600 text-white' : 'bg-white text-slate-600 hover:bg-slate-50'
            }`}
          >
            {f.label}
          </button>
        ))}
      </div>

      <Alert type="success" onClose={() => setMessage('')}>{message}</Alert>
      <Alert onClose={() => setError('')}>{error}</Alert>

      {loading ? (
        <PageLoader />
      ) : issues.length === 0 ? (
        <EmptyState icon="🗂️" title="No records found" hint="Try a different filter." />
      ) : (
        <div className="card overflow-x-auto">
          <table className="w-full min-w-[860px]">
            <thead className="border-b border-slate-200 bg-slate-50">
              <tr>
                <th className="table-th">Book</th>
                <th className="table-th">Student</th>
                <th className="table-th">Issue</th>
                <th className="table-th">Due</th>
                <th className="table-th">Status</th>
                <th className="table-th">Fine</th>
                <th className="table-th text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {issues.map((issue) => (
                <tr key={issue._id} className="hover:bg-slate-50">
                  <td className="table-td">
                    <p className="font-medium text-slate-900">{issue.book?.title || '(deleted)'}</p>
                    <p className="text-xs text-slate-500">{issue.book?.author}</p>
                  </td>
                  <td className="table-td">
                    <p className="font-medium text-slate-800">{issue.student?.name}</p>
                    <p className="text-xs text-slate-500">{issue.student?.rollNo}</p>
                  </td>
                  <td className="table-td whitespace-nowrap">{formatDate(issue.issueDate)}</td>
                  <td className="table-td whitespace-nowrap">{formatDate(issue.dueDate)}</td>
                  <td className="table-td">
                    {issue.status === 'returned' ? (
                      <Badge tone="slate">Returned {formatDate(issue.returnDate)}</Badge>
                    ) : issue.isOverdue ? (
                      <Badge tone="red">{issue.daysOverdue} days late</Badge>
                    ) : (
                      <Badge tone="green">Issued</Badge>
                    )}
                  </td>
                  <td className="table-td whitespace-nowrap">
                    {issue.fine > 0 ? (
                      <span className={issue.finePaid ? 'text-slate-500' : 'font-semibold text-red-600'}>
                        {formatMoney(issue.fine)}
                        {issue.finePaid ? ' (paid)' : ''}
                      </span>
                    ) : (
                      '-'
                    )}
                  </td>
                  <td className="table-td">
                    <div className="flex justify-end gap-2">
                      {issue.status === 'issued' && (
                        <button
                          type="button"
                          className="btn-primary btn-sm"
                          disabled={busyId === issue._id}
                          onClick={() => act(issue._id, 'return')}
                        >
                          Return
                        </button>
                      )}
                      {issue.fine > 0 && !issue.finePaid && (
                        <button
                          type="button"
                          className="btn-secondary btn-sm"
                          disabled={busyId === issue._id}
                          onClick={() => act(issue._id, 'pay-fine')}
                        >
                          Mark fine paid
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <IssueBookModal
        open={issueOpen}
        onClose={() => setIssueOpen(false)}
        onIssued={(text) => {
          setMessage(text);
          load();
        }}
      />
    </div>
  );
}

/** Lets an admin lend a book to a student. */
function IssueBookModal({ open, onClose, onIssued }) {
  const [students, setStudents] = useState([]);
  const [books, setBooks] = useState([]);
  const [form, setForm] = useState({ studentId: '', bookId: '' });
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!open) return;
    setForm({ studentId: '', bookId: '' });
    setError('');

    Promise.all([
      api.get('/users', { params: { role: 'student' } }),
      api.get('/books', { params: { available: 'true', limit: 48, sort: 'title' } }),
    ])
      .then(([u, b]) => {
        setStudents(u.data.users.filter((s) => s.isActive));
        setBooks(b.data.books);
      })
      .catch((err) => setError(errorMessage(err)));
  }, [open]);

  const submit = async (e) => {
    e.preventDefault();
    setBusy(true);
    setError('');

    try {
      const { data } = await api.post('/issues', form);
      onIssued(
        `"${data.issue.book.title}" issued to ${data.issue.student.name}. Due ${formatDate(data.issue.dueDate)}.`
      );
      onClose();
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setBusy(false);
    }
  };

  return (
    <Modal open={open} title="Issue a book" onClose={onClose}>
      <form onSubmit={submit} className="space-y-4">
        <Alert onClose={() => setError('')}>{error}</Alert>

        <div>
          <label className="label" htmlFor="i-student">Student *</label>
          <select
            id="i-student"
            className="input"
            value={form.studentId}
            onChange={(e) => setForm((f) => ({ ...f, studentId: e.target.value }))}
            required
          >
            <option value="">Select a student</option>
            {students.map((s) => (
              <option key={s._id} value={s._id}>
                {s.name} - {s.rollNo} ({s.activeLoans} books)
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="label" htmlFor="i-book">Book *</label>
          <select
            id="i-book"
            className="input"
            value={form.bookId}
            onChange={(e) => setForm((f) => ({ ...f, bookId: e.target.value }))}
            required
          >
            <option value="">Select an available book</option>
            {books.map((b) => (
              <option key={b._id} value={b._id}>
                {b.title} - {b.author} ({b.availableCopies} available)
              </option>
            ))}
          </select>
          {books.length === 0 && (
            <p className="mt-1.5 text-xs text-amber-700">No books are available right now.</p>
          )}
        </div>

        <div className="flex justify-end gap-3 pt-2">
          <button type="button" className="btn-secondary" onClick={onClose} disabled={busy}>
            Cancel
          </button>
          <button type="submit" className="btn-primary" disabled={busy}>
            {busy && <Spinner className="h-4 w-4 text-white" />}
            Issue book
          </button>
        </div>
      </form>
    </Modal>
  );
}
