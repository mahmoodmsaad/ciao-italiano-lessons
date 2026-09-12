import mongoose from 'mongoose';

const issueSchema = new mongoose.Schema(
  {
    book: { type: mongoose.Schema.Types.ObjectId, ref: 'Book', required: true },
    student: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    issuedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    issueDate: { type: Date, default: Date.now },
    dueDate: { type: Date, required: true },
    returnDate: { type: Date, default: null },
    renewCount: { type: Number, default: 0 },
    fine: { type: Number, default: 0 },
    finePaid: { type: Boolean, default: false },
    status: {
      type: String,
      enum: ['issued', 'returned'],
      default: 'issued',
    },
  },
  { timestamps: true }
);

issueSchema.index({ student: 1, status: 1 });
issueSchema.index({ book: 1, status: 1 });

export default mongoose.model('Issue', issueSchema);
