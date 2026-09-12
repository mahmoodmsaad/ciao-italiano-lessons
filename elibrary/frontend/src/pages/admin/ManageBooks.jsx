import { useCallback, useEffect, useState } from 'react';
import api, { errorMessage } from '../../api/client.js';
import BookFormModal from '../../components/BookFormModal.jsx';
import {
  Alert, Badge, ConfirmDialog, EmptyState, PageLoader, Pagination,
} from '../../components/ui.jsx';

export default function ManageBooks() {
  const [books, setBooks] = useState([]);
  const [meta, setMeta] = useState({ page: 1, totalPages: 1, total: 0 });
  const [search, setSearch] = useState('');
  const [query, setQuery] = useState({ search: '', page: 1 });

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');

  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [deleting, setDeleting] = useState(null);
  const [deleteBusy, setDeleteBusy] = useState(false);

  useEffect(() => {
    const timer = setTimeout(
      () => setQuery((q) => (q.search === search ? q : { search, page: 1 })),
      400
    );
    return () => clearTimeout(timer);
  }, [search]);

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const { data } = await api.get('/books', { params: { ...query, limit: 15, sort: 'title' } });
      setBooks(data.books);
      setMeta({ page: data.page, totalPages: data.totalPages, total: data.total });
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setLoading(false);
    }
  }, [query]);

  useEffect(() => {
    load();
  }, [load]);

  const confirmDelete = async () => {
    setDeleteBusy(true);
    setError('');
    try {
      await api.delete(`/books/${deleting._id}`);
      setMessage(`"${deleting.title}" was deleted.`);
      setDeleting(null);
      await load();
    } catch (err) {
      setError(errorMessage(err));
      setDeleting(null);
    } finally {
      setDeleteBusy(false);
    }
  };

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Manage Books</h1>
          <p className="mt-1 text-sm text-slate-600">Add, edit and remove books from the collection.</p>
        </div>
        <button
          type="button"
          className="btn-primary"
          onClick={() => {
            setEditing(null);
            setFormOpen(true);
          }}
        >
          + Add new book
        </button>
      </header>

      <input
        className="input max-w-md"
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        placeholder="Search by title, author or ISBN..."
      />

      <Alert type="success" onClose={() => setMessage('')}>{message}</Alert>
      <Alert onClose={() => setError('')}>{error}</Alert>

      {loading ? (
        <PageLoader />
      ) : books.length === 0 ? (
        <EmptyState title="No books found" hint="Add a new book or change your search." />
      ) : (
        <>
          <p className="text-sm text-slate-500">{meta.total} books</p>

          <div className="card overflow-x-auto">
            <table className="w-full min-w-[720px]">
              <thead className="border-b border-slate-200 bg-slate-50">
                <tr>
                  <th className="table-th">Book</th>
                  <th className="table-th">Category</th>
                  <th className="table-th">ISBN</th>
                  <th className="table-th">Copies</th>
                  <th className="table-th">Shelf</th>
                  <th className="table-th text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {books.map((book) => (
                  <tr key={book._id} className="hover:bg-slate-50">
                    <td className="table-td">
                      <p className="font-medium text-slate-900">{book.title}</p>
                      <p className="text-xs text-slate-500">{book.author}</p>
                    </td>
                    <td className="table-td">{book.category}</td>
                    <td className="table-td font-mono text-xs">{book.isbn}</td>
                    <td className="table-td">
                      <Badge tone={book.availableCopies > 0 ? 'green' : 'red'}>
                        {book.availableCopies} / {book.totalCopies}
                      </Badge>
                    </td>
                    <td className="table-td">{book.shelfLocation || '-'}</td>
                    <td className="table-td">
                      <div className="flex justify-end gap-2">
                        <button
                          type="button"
                          className="btn-secondary btn-sm"
                          onClick={() => {
                            setEditing(book);
                            setFormOpen(true);
                          }}
                        >
                          Edit
                        </button>
                        <button
                          type="button"
                          className="btn-danger btn-sm"
                          onClick={() => setDeleting(book)}
                        >
                          Delete
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <Pagination
            page={meta.page}
            totalPages={meta.totalPages}
            onChange={(page) => setQuery((q) => ({ ...q, page }))}
          />
        </>
      )}

      <BookFormModal
        open={formOpen}
        book={editing}
        onClose={() => setFormOpen(false)}
        onSaved={() => {
          setMessage(editing ? 'Book updated.' : 'New book added.');
          load();
        }}
      />

      <ConfirmDialog
        open={Boolean(deleting)}
        title="Delete this book?"
        message={`"${deleting?.title}" will be permanently deleted. This cannot be undone.`}
        confirmText="Yes, delete"
        busy={deleteBusy}
        onConfirm={confirmDelete}
        onClose={() => setDeleting(null)}
      />
    </div>
  );
}
