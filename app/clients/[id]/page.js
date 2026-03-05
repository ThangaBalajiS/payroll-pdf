'use client';

import { useState, useEffect, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';

export default function ClientDetailPage() {
  const { id } = useParams();
  const router = useRouter();
  const fileInputRef = useRef(null);
  
  const [client, setClient] = useState(null);
  const [payrollMonths, setPayrollMonths] = useState([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [toast, setToast] = useState(null);
  const [dragOver, setDragOver] = useState(false);
  const [monthInput, setMonthInput] = useState('');

  useEffect(() => {
    fetchClient();
    fetchPayrollMonths();
  }, [id]);

  useEffect(() => {
    if (toast) {
      const timer = setTimeout(() => setToast(null), 3000);
      return () => clearTimeout(timer);
    }
  }, [toast]);

  async function fetchClient() {
    try {
      const res = await fetch(`/api/clients/${id}`);
      if (!res.ok) throw new Error('Client not found');
      const data = await res.json();
      setClient(data);
    } catch (err) {
      setToast({ type: 'error', message: err.message });
    } finally {
      setLoading(false);
    }
  }

  async function fetchPayrollMonths() {
    try {
      const res = await fetch(`/api/clients/${id}/payroll`);
      const data = await res.json();
      setPayrollMonths(data);
    } catch (err) {
      console.error('Failed to fetch payroll months:', err);
    }
  }

  async function handleUpload(file) {
    if (!file) return;
    setUploading(true);
    try {
      const formData = new FormData();
      formData.append('file', file);
      if (monthInput) {
        formData.append('month', monthInput);
      }
      
      const res = await fetch(`/api/clients/${id}/payroll`, {
        method: 'POST',
        body: formData,
      });
      
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Upload failed');
      
      setToast({ type: 'success', message: data.message });
      setMonthInput('');
      fetchPayrollMonths();
    } catch (err) {
      setToast({ type: 'error', message: err.message });
    } finally {
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
        <button className="btn btn-primary" onClick={() => router.push('/')}>Go Back</button>
      </div>
    );
  }

  return (
    <>
      {/* Breadcrumb */}
      <div className="breadcrumb">
        <a href="/">Clients</a>
        <span className="separator">›</span>
        <span className="current">{client.name}</span>
      </div>

      {/* Page Header */}
      <div className="page-header">
        <div>
          <h1>{client.name}</h1>
          <p className="subtitle">{client.address}</p>
        </div>
        <button className="btn btn-secondary" onClick={() => router.push(`/clients/${id}/edit`)}>
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
              <a
                key={pm._id}
                href={`/clients/${id}/payroll/${pm._id}`}
                className="payroll-month-item"
              >
                <div className="payroll-month-info">
                  <div className="payroll-month-icon">📅</div>
                  <div>
                    <div className="payroll-month-name">{pm.month}</div>
                    <div className="payroll-month-meta">
                      {pm.employeeCount} employees • Uploaded {new Date(pm.createdAt).toLocaleDateString('en-IN', {
                        day: 'numeric', month: 'short', year: 'numeric'
                      })}
                    </div>
                  </div>
                </div>
                <div className="payroll-month-actions">
                  <button
                    className="btn-icon"
                    title="Delete month"
                    onClick={(e) => handleDeleteMonth(e, pm._id)}
                  >
                    🗑️
                  </button>
                  <span className="payroll-month-arrow">→</span>
                </div>
              </a>
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
