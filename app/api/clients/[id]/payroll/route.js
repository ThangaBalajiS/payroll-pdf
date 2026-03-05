import { NextResponse } from 'next/server';
import dbConnect from '@/lib/db/mongodb';
import PayrollMonth from '@/lib/db/models/PayrollMonth';
import Employee from '@/lib/db/models/Employee';
import Client from '@/lib/db/models/Client';
import { parsePayrollCSV } from '@/lib/csvParser';

// GET /api/clients/:id/payroll - List payroll months for a client
export async function GET(request, { params }) {
  try {
    await dbConnect();
    const { id } = await params;
    const payrollMonths = await PayrollMonth.find({ clientId: id }).sort({ createdAt: -1 });
    
    // Get employee count for each month
    const result = await Promise.all(
      payrollMonths.map(async (pm) => {
        const count = await Employee.countDocuments({ payrollMonthId: pm._id });
        return {
          ...pm.toObject(),
          employeeCount: count,
        };
      })
    );
    
    return NextResponse.json(result);
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// POST /api/clients/:id/payroll - Upload CSV and parse employee data
export async function POST(request, { params }) {
  try {
    await dbConnect();
    const { id } = await params;
    
    const formData = await request.formData();
    const file = formData.get('file');
    const monthName = formData.get('month');
    
    if (!file) {
      return NextResponse.json({ error: 'No file uploaded' }, { status: 400 });
    }
    
    // Read the CSV file content
    const csvText = await file.text();
    
    // Parse the CSV
    const { month: parsedMonth, employees, headers } = parsePayrollCSV(csvText);
    
    // Save the headers to the Client to power the CSV Header dropdown mapping UI
    if (headers && headers.length > 0) {
      await Client.findByIdAndUpdate(id, { lastCsvHeaders: headers });
    }
    
    // Use provided month name or the one parsed from CSV
    const finalMonth = monthName || parsedMonth || 'Unknown';
    
    // Check if this month already exists for this client
    const existing = await PayrollMonth.findOne({ clientId: id, month: finalMonth });
    if (existing) {
      // Delete existing employees and update
      await Employee.deleteMany({ payrollMonthId: existing._id });
      
      // Insert new employees
      const employeeDocs = employees.map(emp => ({
        ...emp,
        payrollMonthId: existing._id,
      }));
      await Employee.insertMany(employeeDocs);
      
      return NextResponse.json({
        payrollMonth: existing,
        employeeCount: employees.length,
        message: `Updated ${finalMonth} with ${employees.length} employees`,
      });
    }
    
    // Create new payroll month
    const payrollMonth = await PayrollMonth.create({
      clientId: id,
      month: finalMonth,
    });
    
    // Insert employees
    const employeeDocs = employees.map(emp => ({
      ...emp,
      payrollMonthId: payrollMonth._id,
    }));
    await Employee.insertMany(employeeDocs);
    
    return NextResponse.json({
      payrollMonth,
      employeeCount: employees.length,
      message: `Created ${finalMonth} with ${employees.length} employees`,
    }, { status: 201 });
    
  } catch (error) {
    console.error('Payroll upload error:', error);
    return NextResponse.json({ error: error.message }, { status: 400 });
  }
}
