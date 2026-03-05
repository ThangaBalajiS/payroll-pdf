import mongoose from 'mongoose';

const ClientSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Please provide a company name'],
    trim: true,
  },
  address: {
    type: String,
    required: [true, 'Please provide a company address'],
    trim: true,
  },
  bankName: {
    type: String,
    default: '',
    trim: true,
  },
  lastCsvHeaders: {
    type: [String],
    default: [],
  },
  payslipConfig: {
    details: {
      type: [{ label: String, csvHeader: String }],
      default: [
        { label: 'Employee Name', csvHeader: 'Name' },
        { label: 'Employee ID', csvHeader: 'Emp ID' },
        { label: 'Designation', csvHeader: 'Designation' },
        { label: 'Date of Joining', csvHeader: 'DOJ' },
        { label: 'Days Paid', csvHeader: 'attend' },
        { label: 'UAN NO', csvHeader: 'UAN Number' },
        { label: 'Loss of Pay', csvHeader: 'LOP' },
        { label: 'ESIC NO', csvHeader: 'ESIC Number' }
      ]
    },
    earnings: {
      type: [{ label: String, csvHeader: String }],
      default: [
        { label: 'Basic', csvHeader: 'Basic+DA_2' },
        { label: 'HRA', csvHeader: 'HRA_2' },
        { label: 'Transport Allowance', csvHeader: 'CONV_' },
        { label: 'Other Pay', csvHeader: 'OT' },
        { label: 'Incentive', csvHeader: 'FOOD ALLOWANCE' }
      ]
    },
    deductions: {
      type: [{ label: String, csvHeader: String }],
      default: [
        { label: 'Provident Fund', csvHeader: 'P_F_' },
        { label: 'ESI', csvHeader: 'E_S_I' },
        { label: 'Other Deduction', csvHeader: 'ADV' }
      ]
    }
  },
}, {
  timestamps: true,
});

export default mongoose.models.Client || mongoose.model('Client', ClientSchema);
