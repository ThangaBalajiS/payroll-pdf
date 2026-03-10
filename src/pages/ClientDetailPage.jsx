import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { getClient, getPayrollMonths, createOrUpdatePayrollMonth, deletePayrollMonth } from '../lib/db';
import { parsePayrollCSV } from '../lib/csvParser';

export default function ClientDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const fileInputRef = useRef(null);

  const [client, setClient] = useState(null);
  const [payrollMonths, setPayrollMonths] = useState([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [toast, setToast] = useState(null);
  const [dragOver, setDragOver] = useState(false);
  const [monthInput, setMonthInput] = useState('');

  useEffect(() => {
    loadData();
  }, [id]);

  useEffect(() => {
    if (toast) {
      const timer = setTimeout(() => setToast(null), 3000);
      return () => clearTimeout(timer);
    }
  }, [toast]);

  function loadData() {
    try {
      const clientData = getClient(id);
      setClient(clientData);
      const months = getPayrollMonths(id);
      setPayrollMonths(months);
    } catch (err) {
      setToast({ type: 'error', message: err.message });
    } finally {
      setLoading(false);
    }
  }

  function handleUpload(file) {
    if (!file) return;
    setUploading(true);
    try {
      const reader = new FileReader();
      reader.onload = (e) => {
        try {
          const csvText = e.target.result;
          const { month: parsedMonth, employees, headers } = parsePayrollCSV(csvText);
          const finalMonth = monthInput || parsedMonth || 'Unknown';

          const result = createOrUpdatePayrollMonth(id, finalMonth, employees, headers);
          setToast({ type: 'success', message: result.message });
          setMonthInput('');
          // Reload client to get updated lastCsvHeaders
          setClient(getClient(id));
          setPayrollMonths(getPayrollMonths(id));
        } catch (err) {
          setToast({ type: 'error', message: err.message });
        } finally {
          setUploading(false);
        }
      };
      reader.onerror = () => {
        setToast({ type: 'error', message: 'Failed to read file' });
        setUploading(false);
      };
      reader.readAsText(file);
    } catch (err) {
      setToast({ type: 'error', message: err.message });
      setUploading(false);
    }
  }

  function handleDrop(e) {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files[0];
    if (file && file.name.endsWith('.csv')) {
      handleUpload(file);
    } else {
      setToast({ type: 'error', message: 'Please upload a CSV file' });
    }
  }

  function handleFileSelect(e) {
    const file = e.target.files[0];
    if (file) handleUpload(file);
    e.target.value = '';
  }

  function handleDeleteMonth(e, monthId) {
    e.preventDefault();
    e.stopPropagation();
    if (!confirm('Are you sure you want to delete this payroll month?')) return;
    try {
      deletePayrollMonth(monthId);
      setToast({ type: 'success', message: 'Payroll month deleted' });
      setPayrollMonths(getPayrollMonths(id));
    } catch (err) {
      setToast({ type: 'error', message: 'Failed to delete payroll month' });
    }
  }

  if (loading) {
    return (
      <div className="loading-screen">
        <div className="spinner"></div>
        <span>Loading client...</span>
      </div>
    );
  }

  if (!client) {
    return (
      <div className="empty-state">
        <div className="empty-icon">❌</div>
        <h3>Client not found</h3>
        <button className="btn btn-primary" onClick={() => navigate('/')}>Go Back</button>
      </div>
    );
  }

  return (
    <>
      {/* Breadcrumb */}
      <div className="breadcrumb">
        <Link to="/">Clients</Link>
        <span className="separator">›</span>
        <span className="current">{client.name}</span>
      </div>

      {/* Page Header */}
      <div className="page-header">
        <div>
          <h1>{client.name}</h1>
          <p className="subtitle">{client.address}</p>
        </div>
        <button className="btn btn-secondary" onClick={() => navigate(`/clients/${id}/edit`)}>
          ⚙️ Edit & Configure
        </button>
      </div>

      {/* Client Info Cards */}
      <div className="client-info">
        <div className="client-info-card">
          <div className="label">Company Name</div>
          <div className="value">{client.name}</div>
        </div>
        <div className="client-info-card">
          <div className="label">Address</div>
          <div className="value">{client.address}</div>
        </div>
        {client.bankName && (
          <div className="client-info-card">
            <div className="label">Bank Name</div>
            <div className="value">{client.bankName}</div>
          </div>
        )}
      </div>

      {/* Upload Section */}
      <div className="section">
        <div className="section-header">
          <h2>Upload Payroll CSV</h2>
        </div>

        <div style={{ marginBottom: 16 }}>
          <div className="form-group" style={{ maxWidth: 300 }}>
            <label>Month Name (optional, auto-detected from CSV)</label>
            <input
              type="text"
              className="form-control"
              placeholder="e.g. DECEMBER'25"
              value={monthInput}
              onChange={(e) => setMonthInput(e.target.value)}
            />
          </div>
        </div>

        <div
          className={`upload-zone ${dragOver ? 'dragover' : ''}`}
          onClick={() => fileInputRef.current?.click()}
          onDrop={handleDrop}
          onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
          onDragLeave={() => setDragOver(false)}
        >
          {uploading ? (
            <>
              <div className="spinner" style={{ width: 32, height: 32, margin: '0 auto 12px' }}></div>
              <div className="upload-text">Processing CSV...</div>
            </>
          ) : (
            <>
              <div className="upload-icon">📄</div>
              <div className="upload-text">Drop your CSV file here, or click to browse</div>
              <div className="upload-hint">Supports the standard payroll CSV format</div>
            </>
          )}
        </div>
        <input
          ref={fileInputRef}
          type="file"
          accept=".csv"
          style={{ display: 'none' }}
          onChange={handleFileSelect}
        />
      </div>

      {/* Payroll Months */}
      <div className="section">
        <div className="section-header">
          <h2>Payroll Months</h2>
          <span className="badge badge-accent">{payrollMonths.length} months</span>
        </div>

        {payrollMonths.length === 0 ? (
          <div className="empty-state">
            <div className="empty-icon">📋</div>
            <h3>No payroll data yet</h3>
            <p>Upload a CSV file above to get started.</p>
          </div>
        ) : (
          <div className="payroll-months-list">
            {payrollMonths.map((pm) => (
              <Link
                key={pm.id}
                to={`/clients/${id}/payroll/${pm.id}`}
                className="payroll-month-item"
              >
                <div className="payroll-month-info">
                  <div className="payroll-month-icon">📅</div>
                  <div>
                    <div className="payroll-month-name">{pm.month}</div>
                    <div className="payroll-month-meta">
                      {pm.employeeCount} employees • Uploaded {new Date(pm.createdAt).toLocaleDateString('en-IN', {
                        day: 'numeric', month: 'short', year: 'numeric',
                      })}
                    </div>
                  </div>
                </div>
                <div className="payroll-month-actions">
                  <button
                    className="btn-icon"
                    title="Delete month"
                    onClick={(e) => handleDeleteMonth(e, pm.id)}
                  >
                    🗑️
                  </button>
                  <span className="payroll-month-arrow">→</span>
                </div>
              </Link>
            ))}
          </div>
        )}
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
