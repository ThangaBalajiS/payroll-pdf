'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';

export default function EditClientPage() {
  const { id } = useParams();
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState(null);

  const [form, setForm] = useState({
    name: '',
    address: '',
    bankName: '',
    lastCsvHeaders: [],
    payslipConfig: {
      details: [],
      earnings: [],
      deductions: [],
    }
  });

  useEffect(() => {
    fetchClient();
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
      setForm({
        name: data.name || '',
        address: data.address || '',
        bankName: data.bankName || '',
        lastCsvHeaders: data.lastCsvHeaders || [],
        payslipConfig: data.payslipConfig || {
          details: [], earnings: [], deductions: []
        }
      });
    } catch (err) {
      setToast({ type: 'error', message: err.message });
    } finally {
      setLoading(false);
    }
  }

  async function handleSubmit(e) {
    if (e) e.preventDefault();
    setSaving(true);
    try {
      const res = await fetch(`/api/clients/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });
      if (!res.ok) throw new Error('Failed to update client');
      setToast({ type: 'success', message: 'Client configuration saved successfully!' });
      setTimeout(() => router.push(`/clients/${id}`), 1000);
    } catch (err) {
      setToast({ type: 'error', message: err.message });
    } finally {
      setSaving(false);
    }
  }

  function handleConfigChange(category, index, field, value) {
    const newConfig = { ...form.payslipConfig };
    newConfig[category][index][field] = value;
    setForm({ ...form, payslipConfig: newConfig });
  }

  function handleAddField(category) {
    const newConfig = { ...form.payslipConfig };
    newConfig[category].push({ label: '', csvHeader: '' });
    setForm({ ...form, payslipConfig: newConfig });
  }

  function handleRemoveField(category, index) {
    const newConfig = { ...form.payslipConfig };
    newConfig[category].splice(index, 1);
    setForm({ ...form, payslipConfig: newConfig });
  }

  function renderConfigSection(title, category, description) {
    const items = form.payslipConfig[category] || [];
    
    return (
      <div className="section" style={{ marginTop: 24 }}>
        <div className="section-header" style={{ marginBottom: 12 }}>
          <h3>{title}</h3>
        </div>
        <p className="subtitle" style={{ marginBottom: 16 }}>{description}</p>
        
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {items.map((item, idx) => (
            <div key={idx} style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
              <div style={{ flex: 1 }}>
                <input
                  type="text"
                  className="form-control"
                  placeholder="PDF Label (e.g. Basic Salary)"
                  value={item.label}
                  onChange={(e) => handleConfigChange(category, idx, 'label', e.target.value)}
                  required
                />
              </div>
              <div style={{ color: 'var(--text-muted)' }}>maps to</div>
              <div style={{ flex: 1 }}>
                {form.lastCsvHeaders && form.lastCsvHeaders.length > 0 ? (
                  <select
                    className="form-control"
                    value={item.csvHeader}
                    onChange={(e) => handleConfigChange(category, idx, 'csvHeader', e.target.value)}
                    required
                  >
                    <option value="" disabled>Select CSV Column</option>
                    {form.lastCsvHeaders.map(header => (
                      <option key={header} value={header}>{header}</option>
                    ))}
                    {/* Fallback if the saved header isn't in the newly uploaded list */}
                    {item.csvHeader && !form.lastCsvHeaders.includes(item.csvHeader) && (
                      <option value={item.csvHeader}>{item.csvHeader} (Missing)</option>
                    )}
                  </select>
                ) : (
                  <input
                    type="text"
                    className="form-control"
                    placeholder="CSV Column name"
                    value={item.csvHeader}
                    onChange={(e) => handleConfigChange(category, idx, 'csvHeader', e.target.value)}
                    required
                  />
                )}
              </div>
              <button
                type="button"
                className="btn-icon"
                onClick={() => handleRemoveField(category, idx)}
                title="Remove field"
                style={{ background: 'var(--bg-glass)', border: '1px solid var(--border-glass)' }}
              >
                🗑️
              </button>
            </div>
          ))}
          
          <button
            type="button"
            className="btn btn-secondary btn-sm"
            onClick={() => handleAddField(category)}
            style={{ alignSelf: 'flex-start', marginTop: 8 }}
          >
            + Add Field
          </button>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="loading-screen">
        <div className="spinner"></div>
        <span>Loading configuration...</span>
      </div>
    );
  }

  return (
    <>
      {/* Breadcrumb */}
      <div className="breadcrumb">
        <a href="/">Clients</a>
        <span className="separator">›</span>
        <a href={`/clients/${id}`}>{form.name || 'Client'}</a>
        <span className="separator">›</span>
        <span className="current">Edit & Configure</span>
      </div>

      <div className="page-header">
        <div>
          <h1>Configure Client</h1>
          <p className="subtitle">Update basic info and customize PDF payslip mappings</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} style={{ maxWidth: 800 }}>
        {/* Basic Info */}
        <div className="section">
          <h2>Basic Information</h2>
          <div className="form-group" style={{ marginTop: 16 }}>
            <label>Company Name *</label>
            <input
              type="text"
              className="form-control"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              required
            />
          </div>
          <div className="form-group">
            <label>Address *</label>
            <textarea
              className="form-control"
              value={form.address}
              onChange={(e) => setForm({ ...form, address: e.target.value })}
              required
            />
          </div>
          <div className="form-group">
            <label>Bank Name (Optional)</label>
            <input
              type="text"
              className="form-control"
              value={form.bankName}
              onChange={(e) => setForm({ ...form, bankName: e.target.value })}
            />
          </div>
        </div>

        {/* Payslip Configuration */}
        <div className="section" style={{ marginTop: 32 }}>
          <h2>Payslip Configurations</h2>
          <p className="subtitle">Map the columns from your uploaded CSV to the fields displayed on the generated PDF Payslip.</p>
          
          {renderConfigSection('Employee Details Grid', 'details', 'Shown at the top of the payslip grid (4 columns). Keep to an even number for best layout.')}
          
          {renderConfigSection('Earnings', 'earnings', 'Listed on the left side. These will be summed to calculate Total Gross Salary.')}
          
          {renderConfigSection('Deductions', 'deductions', 'Listed on the right side. These will be summed to calculate Total Deductions.')}
        </div>

        <div style={{ marginTop: 32, display: 'flex', gap: 16 }}>
          <button type="submit" className="btn btn-primary" disabled={saving}>
            {saving ? 'Saving...' : 'Save Configuration'}
          </button>
          <button type="button" className="btn btn-secondary" onClick={() => router.push(`/clients/${id}`)}>
            Cancel
          </button>
        </div>
      </form>

      {/* Toast */}
      {toast && (
        <div className={`toast toast-${toast.type}`}>
          {toast.message}
        </div>
      )}
    </>
  );
}
