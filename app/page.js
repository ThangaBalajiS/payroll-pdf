'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function HomePage() {
  const [clients, setClients] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [formData, setFormData] = useState({ name: '', address: '', bankName: '' });
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState(null);
  const router = useRouter();

  useEffect(() => {
    fetchClients();
  }, []);

  useEffect(() => {
    if (toast) {
      const timer = setTimeout(() => setToast(null), 3000);
      return () => clearTimeout(timer);
    }
  }, [toast]);

  async function fetchClients() {
    try {
      const res = await fetch('/api/clients');
      const data = await res.json();
      setClients(data);
    } catch (err) {
      setToast({ type: 'error', message: 'Failed to load clients' });
    } finally {
      setLoading(false);
    }
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setSaving(true);
    try {
      const res = await fetch('/api/clients', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });
      if (!res.ok) throw new Error('Failed to create client');
      setToast({ type: 'success', message: 'Client added successfully!' });
      setShowModal(false);
      setFormData({ name: '', address: '', bankName: '' });
      fetchClients();
    } catch (err) {
      setToast({ type: 'error', message: err.message });
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(e, clientId) {
    e.stopPropagation();
    if (!confirm('Are you sure you want to delete this client?')) return;
    try {
      await fetch(`/api/clients/${clientId}`, { method: 'DELETE' });
      setToast({ type: 'success', message: 'Client deleted' });
      fetchClients();
    } catch (err) {
      setToast({ type: 'error', message: 'Failed to delete client' });
    }
  }

  return (
    <>
      <div className="page-header">
        <div>
          <h1>Clients</h1>
          <p className="subtitle">Manage your payroll clients</p>
        </div>
        <button className="btn btn-primary" onClick={() => setShowModal(true)}>
          <span>＋</span> Add Client
        </button>
      </div>

      {loading ? (
        <div className="loading-screen">
          <div className="spinner"></div>
          <span>Loading clients...</span>
        </div>
      ) : clients.length === 0 ? (
        <div className="empty-state">
          <div className="empty-icon">🏢</div>
          <h3>No clients yet</h3>
          <p>Add your first client to get started with payroll processing.</p>
          <button className="btn btn-primary" onClick={() => setShowModal(true)}>
            <span>＋</span> Add Client
          </button>
        </div>
      ) : (
        <div className="cards-grid">
          {clients.map((client) => (
            <div
              key={client._id}
              className="card card-clickable"
              onClick={() => router.push(`/clients/${client._id}`)}
            >
              <div className="card-title">{client.name}</div>
              <div className="card-subtitle">{client.address}</div>
              {client.bankName && (
                <div className="card-subtitle" style={{ marginTop: 4, color: 'var(--accent-light)' }}>
                  🏦 {client.bankName}
                </div>
              )}
              <div className="card-meta">
                <div className="card-stat">
                  <span>Added</span>
                  <span className="value">
                    {new Date(client.createdAt).toLocaleDateString('en-IN', {
                      day: 'numeric', month: 'short', year: 'numeric'
                    })}
                  </span>
                </div>
                <div style={{ flex: 1 }} />
                <button
                  className="btn-icon"
                  title="Delete client"
                  onClick={(e) => handleDelete(e, client._id)}
                >
                  🗑️
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Add Client Modal */}
      {showModal && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <h2>Add New Client</h2>
            <form onSubmit={handleSubmit}>
              <div className="form-group">
                <label>Company Name *</label>
                <input
                  type="text"
                  className="form-control"
                  placeholder="e.g. Vanan Online Services Pvt., Ltd."
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  required
                  autoFocus
                />
              </div>
              <div className="form-group">
                <label>Address *</label>
                <textarea
                  className="form-control"
                  placeholder="Full company address"
                  value={formData.address}
                  onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                  required
                />
              </div>
              <div className="form-group">
                <label>Bank Name</label>
                <input
                  type="text"
                  className="form-control"
                  placeholder="e.g. HDFC Bank"
                  value={formData.bankName}
                  onChange={(e) => setFormData({ ...formData, bankName: e.target.value })}
                />
              </div>
              <div className="modal-actions">
                <button type="button" className="btn btn-secondary" onClick={() => setShowModal(false)}>
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary" disabled={saving}>
                  {saving ? (
                    <>
                      <div className="spinner" style={{ width: 16, height: 16 }}></div>
                      Saving...
                    </>
                  ) : (
                    'Add Client'
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Toast */}
      {toast && (
        <div className={`toast toast-${toast.type}`}>
          {toast.message}
        </div>
      )}
    </>
  );
}
