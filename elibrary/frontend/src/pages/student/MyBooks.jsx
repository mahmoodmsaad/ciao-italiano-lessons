import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import api, { errorMessage } from '../../api/client.js';
import {
  Alert, Badge, EmptyState, PageLoader, StatCard, formatDate, formatMoney,
} from '../../components/ui.jsx';

const TABS = [
  { key: 'issued', label: 'Abhi mere paas' },
  { key: 'returned', label: 'Wapas ki hui' },
  { key: '', label: 'Sab' },
];

export default function MyBooks() {
  const [issues, setIssues] = useState([]);
  const [tab, setTab] = useState('issued');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [busyId, setBusyId] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const { data } = await api.get('/issues/my', { params: tab ? { status: tab } : {} });
      setIssues(data.issues);
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setLoading(false);
    }
  }, [tab]);

  useEffect(() => {
    load();
  }, [load]);

  const renew = async (id) => {
    setBusyId(id);
    setError('');
    setMessage('');
    try {
      const { data } = await api.put(`/issues/${id}/renew`);
      setMessage(data.message);
      await load();
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setBusyId(null);
    }
  };

  const summary = useMemo(() => {
    const active = issues.filter((i) => i.status === 'issued');
    return {
      active: active.length,
      overdue: active.filter((i) => i.isOverdue).length,
      fine: issues.reduce((sum, i) => sum + (i.finePaid ? 0 : i.fine || 0), 0),
    };
  }, [issues]);

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-bold text-slate-900">My Books</h1>
        <p className="mt-1 text-sm text-slate-600">
          Aapki issue ki hui books, due dates aur fine ki tafseel.
        </p>
      </header>

      <div className="grid gap-4 sm:grid-cols-3">
        <StatCard label="Abhi mere paas" value={summary.active} />
        <StatCard
          label="Overdue books"
          value={summary.overdue}
          tone="red"
          hint={summary.overdue > 0 ? 'Jald wapas karein' : 'Sab time par hain'}
        />
        <StatCard
          label="Pending fine"
          value={formatMoney(summary.fine)}
          tone="amber"
          hint={summary.fine > 0 ? 'Library counter par jama karwayein' : 'Koi fine nahi'}
        />
      </div>

      <div className="flex flex-wrap gap-2">
        {TABS.map((t) => (
          <button
            key={t.key || 'all'}
            type="button"
            onClick={() => setTab(t.key)}
            className={`rounded-lg px-4 py-2 text-sm font-medium transition ${
              tab === t.key ? 'bg-brand-600 text-white' : 'bg-white text-slate-600 hover:bg-slate-50'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      <Alert type="success" onClose={() => setMessage('')}>{message}</Alert>
      <Alert onClose={() => setError('')}>{error}</Alert>

      {loading ? (
        <PageLoader />
      ) : issues.length === 0 ? (
        <EmptyState
          title="Yahan abhi kuch nahi hai"
          hint="Catalog se koi book issue karein, wo yahan nazar aayegi."
        />
      ) : (
        <div className="space-y-4">
          {issues.map((issue) => (
            <article key={issue._id} className="card p-5">
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    {issue.status === 'returned' ? (
                      <Badge tone="slate">Wapas ho gayi</Badge>
                    ) : issue.isOverdue ? (
                      <Badge tone="red">{issue.daysOverdue} din late</Badge>
                    ) : (
                      <Badge tone="green">Time par</Badge>
                    )}
                    {issue.renewCount > 0 && <Badge tone="brand">Renewed</Badge>}
                  </div>

                  <h3 className="mt-2 font-semibold text-slate-900">
                    {issue.book?.title || 'Book delete ho chuki hai'}
                  </h3>
                  <p className="text-sm text-slate-500">{issue.book?.author}</p>
                </div>

                {issue.status === 'issued' && (
                  <button
                    type="button"
                    className="btn-secondary btn-sm"
                    onClick={() => renew(issue._id)}
                    disabled={busyId === issue._id || issue.isOverdue}
                    title={issue.isOverdue ? 'Overdue book renew nahi hoti' : 'Due date barhayein'}
                  >
                    Renew
                  </button>
                )}
              </div>

              <dl className="mt-4 grid gap-3 border-t border-slate-100 pt-4 text-sm sm:grid-cols-4">
                <Field label="Issue date" value={formatDate(issue.issueDate)} />
                <Field label="Due date" value={formatDate(issue.dueDate)} />
                <Field label="Return date" value={formatDate(issue.returnDate)} />
                <Field
                  label="Fine"
                  value={
                    issue.fine > 0
                      ? `${formatMoney(issue.fine)}${issue.finePaid ? ' (paid)' : ''}`
                      : '-'
                  }
                  danger={issue.fine > 0 && !issue.finePaid}
                />
              </dl>
            </article>
          ))}
        </div>
      )}

      <p className="text-center text-sm text-slate-500">
        Nai book chahiye?{' '}
        <Link to="/" className="font-medium text-brand-600 hover:underline">
          Catalog dekhein
        </Link>
      </p>
    </div>
  );
}

function Field({ label, value, danger }) {
  return (
    <div>
      <dt className="text-xs uppercase tracking-wide text-slate-400">{label}</dt>
      <dd className={`mt-0.5 font-medium ${danger ? 'text-red-600' : 'text-slate-800'}`}>{value}</dd>
    </div>
  );
}
