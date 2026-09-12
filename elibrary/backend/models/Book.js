import mongoose from 'mongoose';

const bookSchema = new mongoose.Schema(
  {
    title: { type: String, required: true, trim: true },
    author: { type: String, required: true, trim: true },
    isbn: { type: String, required: true, unique: true, trim: true },
    category: { type: String, required: true, trim: true },
    publisher: { type: String, trim: true, default: '' },
    publishYear: { type: Number, min: 1450, max: 2100 },
    edition: { type: String, trim: true, default: '' },
    description: { type: String, trim: true, default: '' },
    coverUrl: { type: String, trim: true, default: '' },
    shelfLocation: { type: String, trim: true, default: '' },
    totalCopies: { type: Number, required: true, min: 0, default: 1 },
    availableCopies: { type: Number, required: true, min: 0, default: 1 },
  },
  { timestamps: true }
);

// Text index on title, author and isbn to support search
bookSchema.index({ title: 'text', author: 'text', isbn: 'text' });

bookSchema.virtual('isAvailable').get(function isAvailable() {
  return this.availableCopies > 0;
});

bookSchema.set('toJSON', { virtuals: true });

export default mongoose.model('Book', bookSchema);
