import { NextResponse } from 'next/server';
import dbConnect from '@/lib/db/mongodb';
import PayrollMonth from '@/lib/db/models/PayrollMonth';
import Employee from '@/lib/db/models/Employee';

// GET /api/clients/:id/payroll/:monthId - Get employees for a payroll month
export async function GET(request, { params }) {
  try {
    await dbConnect();
    const { id, monthId } = await params;
    
    const payrollMonth = await PayrollMonth.findOne({ _id: monthId, clientId: id });
    if (!payrollMonth) {
      return NextResponse.json({ error: 'Payroll month not found' }, { status: 404 });
    }
    
    const employees = await Employee.find({ payrollMonthId: monthId }).sort({ slNo: 1 });
    
    return NextResponse.json({
      payrollMonth,
      employees,
    });
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// DELETE /api/clients/:id/payroll/:monthId - Delete a payroll month and its employees
export async function DELETE(request, { params }) {
  try {
    await dbConnect();
    const { id, monthId } = await params;
    
    await Employee.deleteMany({ payrollMonthId: monthId });
    await PayrollMonth.findOneAndDelete({ _id: monthId, clientId: id });
    
    return NextResponse.json({ message: 'Payroll month deleted' });
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
