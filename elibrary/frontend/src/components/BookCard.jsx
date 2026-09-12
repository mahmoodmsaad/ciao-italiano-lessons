import { Link } from 'react-router-dom';
import { Badge } from './ui.jsx';

/** Catalog grid ka ek card. */
export default function BookCard({ book }) {
  const available = book.availableCopies > 0;

  return (
    <Link
      to={`/books/${book._id}`}
      className="card flex flex-col overflow-hidden transition hover:-translate-y-0.5 hover:shadow-md"
    >
      <div className="flex h-40 items-center justify-center bg-gradient-to-br from-brand-50 to-slate-100">
        {book.coverUrl ? (
          <img src={book.coverUrl} alt={book.title} className="h-full w-full object-cover" />
        ) : (
          <span className="text-5xl">📖</span>
        )}
      </div>

      <div className="flex flex-1 flex-col gap-2 p-4">
        <h3 className="line-clamp-2 font-semibold leading-snug text-slate-900">{book.title}</h3>
        <p className="text-sm text-slate-500">{book.author}</p>

        <div className="mt-auto flex flex-wrap items-center gap-2 pt-2">
          <Badge tone="brand">{book.category}</Badge>
          <Badge tone={available ? 'green' : 'red'}>
            {available ? `${book.availableCopies} available` : 'Issued out'}
          </Badge>
        </div>
      </div>
    </Link>
  );
}
