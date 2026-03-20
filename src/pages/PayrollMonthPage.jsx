import { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { getClient, getPayrollMonth, getEmployees } from '../lib/db';
import { downloadPayslip } from '../lib/generatePayslip';

export default function PayrollMonthPage() {
  const { id, monthId } = useParams();
  const navigate = useNavigate();

  const [client, setClient] = useState(null);
  const [payrollMonth, setPayrollMonth] = useState(null);
  const [employees, setEmployees] = useState([]);
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState(null);
  const [downloadingAll, setDownloadingAll] = useState(false);

  useEffect(() => {
    loadData();
  }, [id, monthId]);

  useEffect(() => {
    if (toast) {
      const timer = setTimeout(() => setToast(null), 3000);
      return () => clearTimeout(timer);
    }
  }, [toast]);

  function loadData() {
    try {
      const clientData = getClient(id);
      const monthData = getPayrollMonth(monthId);
      const empData = getEmployees(monthId);

      setClient(clientData);
      setPayrollMonth(monthData);
      setEmployees(empData);
    } catch (err) {
      setToast({ type: 'error', message: err.message });
    } finally {
      setLoading(false);
    }
  }

  function handleDownloadPDF(employee) {
    try {
      downloadPayslip(employee, client, payrollMonth.month);
      setToast({ type: 'success', message: `Downloaded payslip for ${employee.name}` });
    } catch (err) {
      console.error('PDF generation error:', err);
      setToast({ type: 'error', message: 'Failed to generate PDF' });
    }
  }

  async function handleDownloadAll() {
    setDownloadingAll(true);
    try {
      for (let i = 0; i < employees.length; i++) {
        const emp = employees[i];
        if (emp.netPay <= 0) continue;
        downloadPayslip(emp, client, payrollMonth.month);
        await new Promise((resolve) => setTimeout(resolve, 300));
      }
      setToast({ type: 'success', message: `Downloaded ${employees.length} payslips` });
    } catch (err) {
      setToast({ type: 'error', message: 'Failed to download all payslips' });
    } finally {
      setDownloadingAll(false);
    }
  }

  function formatCurrency(num) {
    if (!num && num !== 0) return '₹0';
    const n = Math.round(Number(num));
    return '₹' + n.toLocaleString('en-IN');
  }

  function getVal(emp, key) {
    return emp.csvData?.[key] || 0;
  }

  /**
   * Determine which CSV headers to show as columns in the table.
   * Skip the first column (usually serial no) and the name column.
   * Only show columns that have at least one numeric value across employees.
   */
  function getDisplayColumns() {
    const headers = payrollMonth?.headers || [];
    if (headers.length === 0) return [];

    // Identify which headers are numeric (have at least one numeric value)
    return headers.filter((header) => {
      // Skip columns that seem like serial numbers or names
      const lower = header.toLowerCase().replace(/[\s_]/g, '');
      if (['slno', 'sno', 'column_0'].includes(lower)) return false;
      if (['name', 'empname', 'employeename'].includes(lower)) return false;
      if (['empid', 'employeeid', 'id'].includes(lower)) return false;

      return true;
    });
  }

  /**
   * Check if a column should be displayed as a currency amount
   */
  function isAmountColumn(header) {
    const amountCols = client?.amountColumns || [];
    return amountCols.includes(header);
  }

  if (loading) {
    return (
      <div className="loading-screen">
        <div className="spinner"></div>
        <span>Loading employee data...</span>
      </div>
    );
  }

  if (!client || !payrollMonth) {
    return (
      <div className="empty-state">
        <div className="empty-icon">❌</div>
        <h3>Data not found</h3>
        <button className="btn btn-primary" onClick={() => navigate('/')}>Go Back</button>
      </div>
    );
  }

  const displayColumns = getDisplayColumns();

  // For summary cards, pick columns marked as amounts
  const amountSummaryCols = displayColumns.filter(isAmountColumn);

  return (
    <>
      {/* Breadcrumb */}
      <div className="breadcrumb">
        <Link to="/">Clients</Link>
        <span className="separator">›</span>
        <Link to={`/clients/${id}`}>{client.name}</Link>
        <span className="separator">›</span>
        <span className="current">{payrollMonth.month}</span>
      </div>

      {/* Page Header */}
      <div className="page-header">
        <div>
          <h1>{payrollMonth.month}</h1>
          <p className="subtitle">{client.name} — {employees.length} employees</p>
        </div>
        <div style={{ display: 'flex', gap: 12 }}>
          <button
            className="btn btn-primary"
            onClick={handleDownloadAll}
            disabled={downloadingAll}
          >
            {downloadingAll ? (
              <>
                <div className="spinner" style={{ width: 16, height: 16 }}></div>
                Downloading...
              </>
            ) : (
              <>
                📥 Download All PDFs
              </>
            )}
          </button>
        </div>
      </div>

      {/* Employee Table */}
      <div className="table-container">
        <div className="table-header">
          <h3>Employees</h3>
          <span className="badge badge-success">{employees.length} records</span>
        </div>
        <div style={{ overflowX: 'auto' }}>
          <table>
            <thead>
              <tr>
                <th>S.No</th>
                {employees[0]?.empId && <th>Emp ID</th>}
                <th>Name</th>
                {displayColumns.map((col) => (
                  <th
                    key={col}
                    style={isAmountColumn(col) ? { textAlign: 'right' } : undefined}
                  >
                    {col.replace(/_/g, ' ')}
                  </th>
                ))}
                <th style={{ textAlign: 'right' }}>Net Pay</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {employees.map((emp) => (
                <tr key={emp.id}>
                  <td>{emp.slNo}</td>
                  {employees[0]?.empId && (
                    <td>
                      <span className="badge badge-accent">{emp.empId}</span>
                    </td>
                  )}
                  <td style={{ fontWeight: 500 }}>{emp.name}</td>
                  {displayColumns.map((col) => {
                    const val = getVal(emp, col);
                    const isNum = typeof val === 'number';
                    const isAmt = isAmountColumn(col);
                    return (
                      <td
                        key={col}
                        style={isAmt ? { textAlign: 'right' } : undefined}
                        className={isAmt ? 'amount' : undefined}
                      >
                        {isAmt && isNum ? formatCurrency(val) : val}
                      </td>
                    );
                  })}
                  <td style={{ textAlign: 'right' }} className="amount amount-positive">
                    <strong>{formatCurrency(emp.netPay)}</strong>
                  </td>
                  <td>
                    <button
                      className="btn btn-sm btn-secondary"
                      onClick={() => handleDownloadPDF(emp)}
                    >
                      📄 PDF
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Summary Cards — dynamic from numeric columns */}
      <div className="client-info" style={{ marginTop: 32 }}>
        {amountSummaryCols.slice(0, 6).map((col) => (
          <div className="client-info-card" key={col}>
            <div className="label">Total {col.replace(/_/g, ' ')}</div>
            <div className="value amount">
              {formatCurrency(employees.reduce((s, e) => s + (Number(getVal(e, col)) || 0), 0))}
            </div>
          </div>
        ))}
        <div className="client-info-card">
          <div className="label">Total Net Pay</div>
          <div className="value amount amount-positive">
            {formatCurrency(employees.reduce((s, e) => s + (e.netPay || 0), 0))}
          </div>
        </div>
      </div>

      {/* Toast */}
      {toast && (
        <div className={`toast toast-${toast.type}`}>
          {toast.message}
        </div>
      )}
    </>
  );
}
