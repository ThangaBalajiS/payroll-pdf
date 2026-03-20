/**
 * localStorage-backed data store
 * Replaces MongoDB with simple JSON persistence.
 */

import { autoConfigurePayslip } from './csvParser';

const STORAGE_KEY = 'asn_payslip_data';

function getData() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return JSON.parse(raw);
  } catch (e) {
    console.error('Failed to read localStorage:', e);
  }
  return { clients: [], payrollMonths: [], employees: [] };
}

function saveData(data) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
}

function genId() {
  return crypto.randomUUID();
}

// ========== CLIENTS ==========

export function getClients() {
  const data = getData();
  return data.clients.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
}

export function getClient(id) {
  const data = getData();
  return data.clients.find(c => c.id === id) || null;
}

export function createClient({ name, address, bankName }) {
  const data = getData();
  const client = {
    id: genId(),
    name: name.trim(),
    address: address.trim(),
    bankName: (bankName || '').trim(),
    signatureImage: null,
    lastCsvHeaders: [],
    amountColumns: [],
    payslipConfig: {
      details: [],
      earnings: [],
      deductions: [],
    },
    createdAt: new Date().toISOString(),
  };
  data.clients.push(client);
  saveData(data);
  return client;
}

export function updateClient(id, updates) {
  const data = getData();
  const idx = data.clients.findIndex(c => c.id === id);
  if (idx === -1) return null;
  data.clients[idx] = { ...data.clients[idx], ...updates };
  saveData(data);
  return data.clients[idx];
}

export function deleteClient(id) {
  const data = getData();
  // Delete associated payroll months and employees
  const monthIds = data.payrollMonths.filter(pm => pm.clientId === id).map(pm => pm.id);
  data.employees = data.employees.filter(e => !monthIds.includes(e.payrollMonthId));
  data.payrollMonths = data.payrollMonths.filter(pm => pm.clientId !== id);
  data.clients = data.clients.filter(c => c.id !== id);
  saveData(data);
}

// ========== PAYROLL MONTHS ==========

export function getPayrollMonths(clientId) {
  const data = getData();
  const months = data.payrollMonths
    .filter(pm => pm.clientId === clientId)
    .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

  // Attach employee count
  return months.map(pm => ({
    ...pm,
    employeeCount: data.employees.filter(e => e.payrollMonthId === pm.id).length,
  }));
}

export function getPayrollMonth(monthId) {
  const data = getData();
  return data.payrollMonths.find(pm => pm.id === monthId) || null;
}

export function createOrUpdatePayrollMonth(clientId, month, employees, headers) {
  const data = getData();

  // Update the client's lastCsvHeaders
  if (headers && headers.length > 0) {
    const clientIdx = data.clients.findIndex(c => c.id === clientId);
    if (clientIdx !== -1) {
      data.clients[clientIdx].lastCsvHeaders = headers;

      // Auto-configure payslipConfig if it's empty (first upload)
      const cfg = data.clients[clientIdx].payslipConfig || { details: [], earnings: [], deductions: [] };
      const isEmpty = (!cfg.details || cfg.details.length === 0)
        && (!cfg.earnings || cfg.earnings.length === 0)
        && (!cfg.deductions || cfg.deductions.length === 0);

      if (isEmpty) {
        const auto = autoConfigurePayslip(headers);
        data.clients[clientIdx].payslipConfig = auto.payslipConfig;
        data.clients[clientIdx].amountColumns = auto.amountColumns;
      }
    }
  }

  // Check if this month already exists
  let payrollMonth = data.payrollMonths.find(
    pm => pm.clientId === clientId && pm.month === month
  );

  if (payrollMonth) {
    // Remove existing employees for this month and update headers
    data.employees = data.employees.filter(e => e.payrollMonthId !== payrollMonth.id);
    if (headers && headers.length > 0) {
      payrollMonth.headers = headers;
    }
  } else {
    // Create new payroll month
    payrollMonth = {
      id: genId(),
      clientId,
      month,
      headers: headers || [],
      createdAt: new Date().toISOString(),
    };
    data.payrollMonths.push(payrollMonth);
  }

  // Insert new employees
  const newEmployees = employees.map(emp => ({
    ...emp,
    id: genId(),
    payrollMonthId: payrollMonth.id,
  }));
  data.employees.push(...newEmployees);

  saveData(data);

  return {
    payrollMonth,
    employeeCount: newEmployees.length,
    message: `${payrollMonth ? 'Updated' : 'Created'} ${month} with ${newEmployees.length} employees`,
  };
}

export function deletePayrollMonth(monthId) {
  const data = getData();
  data.employees = data.employees.filter(e => e.payrollMonthId !== monthId);
  data.payrollMonths = data.payrollMonths.filter(pm => pm.id !== monthId);
  saveData(data);
}

export function getEmployees(monthId) {
  const data = getData();
  return data.employees
    .filter(e => e.payrollMonthId === monthId)
    .sort((a, b) => (a.slNo || 0) - (b.slNo || 0));
}
