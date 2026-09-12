import { useEffect, useState } from 'react';
import api, { errorMessage } from '../api/client.js';
import { Alert, Modal, Spinner } from './ui.jsx';

const EMPTY = {
  title: '', author: '', isbn: '', category: '', publisher: '',
  publishYear: '', edition: '', shelfLocation: '', totalCopies: 1,
  coverUrl: '', description: '',
};

/** Book add / edit karne ka form. book prop de dein to edit mode ho jata hai. */
export default function BookFormModal({ open, book, onClose, onSaved }) {
  const [form, setForm] = useState(EMPTY);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) return;
    setError('');
    setForm(book ? { ...EMPTY, ...book, publishYear: book.publishYear ?? '' } : EMPTY);
  }, [open, book]);

  const set = (field) => (e) => setForm((f) => ({ ...f, [field]: e.target.value }));

  const submit = async (e) => {
    e.preventDefault();
    setSaving(true);
    setError('');

    const payload = {
      ...form,
      totalCopies: Number(form.totalCopies),
      publishYear: form.publishYear === '' ? undefined : Number(form.publishYear),
    };

    try {
      if (book) await api.put(`/books/${book._id}`, payload);
      else await api.post('/books', payload);
      onSaved();
      onClose();
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal open={open} title={book ? 'Book edit karein' : 'Nai book add karein'} onClose={onClose} width="max-w-2xl">
      <form onSubmit={submit} className="space-y-4">
        <Alert onClose={() => setError('')}>{error}</Alert>

        <div className="grid gap-4 sm:grid-cols-2">
          <div className="sm:col-span-2">
            <label className="label" htmlFor="bf-title">Title *</label>
            <input id="bf-title" className="input" value={form.title} onChange={set('title')} required />
          </div>

          <div>
            <label className="label" htmlFor="bf-author">Author *</label>
            <input id="bf-author" className="input" value={form.author} onChange={set('author')} required />
          </div>

          <div>
            <label className="label" htmlFor="bf-isbn">ISBN *</label>
            <input id="bf-isbn" className="input" value={form.isbn} onChange={set('isbn')} required />
          </div>

          <div>
            <label className="label" htmlFor="bf-category">Category *</label>
            <input
              id="bf-category"
              className="input"
              value={form.category}
              onChange={set('category')}
              placeholder="misal: Computer Science"
              required
            />
          </div>

          <div>
            <label className="label" htmlFor="bf-copies">Total copies *</label>
            <input
              id="bf-copies"
              type="number"
              min="0"
              className="input"
              value={form.totalCopies}
              onChange={set('totalCopies')}
              required
            />
          </div>

          <div>
            <label className="label" htmlFor="bf-publisher">Publisher</label>
            <input id="bf-publisher" className="input" value={form.publisher} onChange={set('publisher')} />
          </div>

          <div>
            <label className="label" htmlFor="bf-year">Publish year</label>
            <input
              id="bf-year"
              type="number"
              min="1450"
              max="2100"
              className="input"
              value={form.publishYear}
              onChange={set('publishYear')}
            />
          </div>

          <div>
            <label className="label" htmlFor="bf-edition">Edition</label>
            <input id="bf-edition" className="input" value={form.edition} onChange={set('edition')} />
          </div>

          <div>
            <label className="label" htmlFor="bf-shelf">Shelf location</label>
            <input
              id="bf-shelf"
              className="input"
              value={form.shelfLocation}
              onChange={set('shelfLocation')}
              placeholder="misal: CS-A-01"
            />
          </div>

          <div className="sm:col-span-2">
            <label className="label" htmlFor="bf-cover">Cover image URL</label>
            <input id="bf-cover" className="input" value={form.coverUrl} onChange={set('coverUrl')} />
          </div>

          <div className="sm:col-span-2">
            <label className="label" htmlFor="bf-desc">Description</label>
            <textarea
              id="bf-desc"
              rows="3"
              className="input"
              value={form.description}
              onChange={set('description')}
            />
          </div>
        </div>

        <div className="flex justify-end gap-3 pt-2">
          <button type="button" className="btn-secondary" onClick={onClose} disabled={saving}>
            Cancel
          </button>
          <button type="submit" className="btn-primary" disabled={saving}>
            {saving && <Spinner className="h-4 w-4 text-white" />}
            {book ? 'Update karein' : 'Book add karein'}
          </button>
        </div>
      </form>
    </Modal>
  );
}
