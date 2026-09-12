import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import api, { errorMessage } from '../../api/client.js';
import { useAuth } from '../../context/AuthContext.jsx';
import { Alert, Badge, PageLoader, Spinner } from '../../components/ui.jsx';

export default function BookDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { isAdmin } = useAuth();

  const [book, setBook] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [borrowing, setBorrowing] = useState(false);

  useEffect(() => {
    setLoading(true);
    api
      .get(`/books/${id}`)
      .then((res) => setBook(res.data.book))
      .catch((err) => setError(errorMessage(err)))
      .finally(() => setLoading(false));
  }, [id]);

  const borrow = async () => {
    setBorrowing(true);
    setError('');
    setSuccess('');

    try {
      const { data } = await api.post('/issues', { bookId: id });
      setBook((b) => ({ ...b, availableCopies: b.availableCopies - 1 }));
      setSuccess(
        `Book issue ho gayi. Wapas karne ki tareekh: ${new Date(data.issue.dueDate).toLocaleDateString('en-GB')}`
      );
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setBorrowing(false);
    }
  };

  if (loading) return <PageLoader />;
  if (!book) {
    return (
      <div className="space-y-4">
        <Alert>{error || 'Book nahi mili.'}</Alert>
        <button type="button" className="btn-secondary" onClick={() => navigate(-1)}>
          Wapas jayein
        </button>
      </div>
    );
  }

  const available = book.availableCopies > 0;

  const rows = [
    ['ISBN', book.isbn],
    ['Category', book.category],
    ['Publisher', book.publisher],
    ['Publish year', book.publishYear],
    ['Edition', book.edition],
    ['Shelf location', book.shelfLocation],
    ['Total copies', book.totalCopies],
    ['Available copies', book.availableCopies],
  ].filter(([, value]) => value !== undefined && value !== null && value !== '');

  return (
    <div className="space-y-6">
      <button type="button" onClick={() => navigate(-1)} className="text-sm text-brand-600 hover:underline">
        &larr; Wapas catalog par
      </button>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="card flex h-72 items-center justify-center overflow-hidden bg-gradient-to-br from-brand-50 to-slate-100">
          {book.coverUrl ? (
            <img src={book.coverUrl} alt={book.title} className="h-full w-full object-cover" />
          ) : (
            <span className="text-7xl">📖</span>
          )}
        </div>

        <div className="card space-y-5 p-6 lg:col-span-2">
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <Badge tone="brand">{book.category}</Badge>
              <Badge tone={available ? 'green' : 'red'}>
                {available ? `${book.availableCopies} copies available` : 'Abhi available nahi'}
              </Badge>
            </div>
            <h1 className="mt-3 text-2xl font-bold text-slate-900">{book.title}</h1>
            <p className="mt-1 text-slate-600">{book.author}</p>
          </div>

          {book.description && <p className="text-sm leading-relaxed text-slate-600">{book.description}</p>}

          <dl className="grid gap-x-6 gap-y-3 border-t border-slate-200 pt-5 sm:grid-cols-2">
            {rows.map(([label, value]) => (
              <div key={label} className="flex justify-between gap-4 text-sm">
                <dt className="text-slate-500">{label}</dt>
                <dd className="font-medium text-slate-800">{value}</dd>
              </div>
            ))}
          </dl>

          <Alert type="success" onClose={() => setSuccess('')}>{success}</Alert>
          <Alert onClose={() => setError('')}>{error}</Alert>

          {isAdmin ? (
            <Alert type="info">
              Admin account se borrow nahi hota. Students ko book dene ke liye{' '}
              <Link to="/admin/issues" className="font-medium underline">
                Issue / Return
              </Link>{' '}
              page use karein.
            </Alert>
          ) : (
            <div className="flex flex-wrap gap-3 border-t border-slate-200 pt-5">
              <button
                type="button"
                className="btn-primary"
                onClick={borrow}
                disabled={!available || borrowing}
              >
                {borrowing && <Spinner className="h-4 w-4 text-white" />}
                {available ? 'Ye book issue karein' : 'Available nahi'}
              </button>
              <Link to="/my-books" className="btn-secondary">
                Meri books dekhein
              </Link>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
