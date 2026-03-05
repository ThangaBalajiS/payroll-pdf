import mongoose from 'mongoose';

const PayrollMonthSchema = new mongoose.Schema({
  clientId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Client',
    required: true,
  },
  month: {
    type: String,
    required: [true, 'Please provide the payroll month'],
    trim: true,
  },
}, {
  timestamps: true,
});

// Compound index to prevent duplicate months per client
PayrollMonthSchema.index({ clientId: 1, month: 1 }, { unique: true });

export default mongoose.models.PayrollMonth || mongoose.model('PayrollMonth', PayrollMonthSchema);
