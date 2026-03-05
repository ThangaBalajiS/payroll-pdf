import mongoose from 'mongoose';

const EmployeeSchema = new mongoose.Schema({
  payrollMonthId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'PayrollMonth',
    required: true,
  },
  // Basic summary fields for the UI listing
  slNo: Number,
  empId: { type: String, default: '' },
  name: { type: String, default: '' },
  netPay: { type: Number, default: 0 },
  // Dynamic CSV Object for all parsed columns
  csvData: {
    type: mongoose.Schema.Types.Mixed,
    default: {},
  },
}, {
  timestamps: true,
});

EmployeeSchema.index({ payrollMonthId: 1 });

export default mongoose.models.Employee || mongoose.model('Employee', EmployeeSchema);
