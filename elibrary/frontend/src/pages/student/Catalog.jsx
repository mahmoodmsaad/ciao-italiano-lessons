import { useCallback, useEffect, useState } from 'react';
import api, { errorMessage } from '../../api/client.js';
import BookCard from '../../components/BookCard.jsx';
import { Alert, EmptyState, PageLoader, Pagination } from '../../components/ui.jsx';

export default function Catalog() {
  const [books, setBooks] = useState([]);
  const [categories, setCategories] = useState([]);
  const [meta, setMeta] = useState({ page: 1, totalPages: 1, total: 0 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [search, setSearch] = useState('');
  const [filters, setFilters] = useState({ search: '', category: '', available: '', sort: 'newest', page: 1 });

  useEffect(() => {
    api.get('/books/categories').then((res) => setCategories(res.data.categories)).catch(() => {});
  }, []);

  // Wait 400ms after the user stops typing before sending the request.
  useEffect(() => {
    const timer = setTimeout(
      () => setFilters((f) => (f.search === search ? f : { ...f, search, page: 1 })),
      400
    );
    return () => clearTimeout(timer);
  }, [search]);

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const { data } = await api.get('/books', { params: { ...filters, limit: 12 } });
      setBooks(data.books);
      setMeta({ page: data.page, totalPages: data.totalPages, total: data.total });
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setLoading(false);
    }
  }, [filters]);

  useEffect(() => {
    load();
  }, [load]);

  const set = (field) => (e) => setFilters((f) => ({ ...f, [field]: e.target.value, page: 1 }));

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-bold text-slate-900">Book Catalog</h1>
        <p className="mt-1 text-sm text-slate-600">
          Browse the library collection and borrow the books you need.
        </p>
      </header>

      <div className="card grid gap-3 p-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="sm:col-span-2">
          <label className="label" htmlFor="search">Search</label>
          <input
            id="search"
            className="input"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by title, author or ISBN..."
          />
        </div>

        <div>
          <label className="label" htmlFor="category">Category</label>
          <select id="category" className="input" value={filters.category} onChange={set('category')}>
            <option value="">All categories</option>
            {categories.map((c) => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>
        </div>

        <div>
          <label className="label" htmlFor="sort">Sort by</label>
          <select id="sort" className="input" value={filters.sort} onChange={set('sort')}>
            <option value="newest">Newest first</option>
            <option value="title">Title (A-Z)</option>
            <option value="author">Author (A-Z)</option>
            <option value="year">Publish year</option>
          </select>
        </div>

        <label className="flex items-center gap-2 text-sm text-slate-700 sm:col-span-2 lg:col-span-4">
          <input
            type="checkbox"
            className="h-4 w-4 rounded border-slate-300"
            checked={filters.available === 'true'}
            onChange={(e) =>
              setFilters((f) => ({ ...f, available: e.target.checked ? 'true' : '', page: 1 }))
            }
          />
          Show available books only
        </label>
      </div>

      <Alert onClose={() => setError('')}>{error}</Alert>

      {loading ? (
        <PageLoader />
      ) : books.length === 0 ? (
        <EmptyState
          title="No books found"
          hint="Try a different search term or filter."
        />
      ) : (
        <>
          <p className="text-sm text-slate-500">{meta.total} books found</p>
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {books.map((book) => (
              <BookCard key={book._id} book={book} />
            ))}
          </div>
          <Pagination
            page={meta.page}
            totalPages={meta.totalPages}
            onChange={(page) => {
              setFilters((f) => ({ ...f, page }));
              window.scrollTo({ top: 0, behavior: 'smooth' });
            }}
          />
        </>
      )}
    </div>
  );
}
