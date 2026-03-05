import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';

/**
 * Format a number as Indian currency format (e.g. 1,23,456)
 */
function formatCurrency(num) {
  if (!num && num !== 0) return '0';
  const n = Math.round(Number(num));
  if (isNaN(n)) return '0';
  const s = n.toString();
  if (s.length <= 3) return s;
  // Indian numbering: last 3, then groups of 2
  let result = s.slice(-3);
  let remaining = s.slice(0, -3);
  while (remaining.length > 2) {
    result = remaining.slice(-2) + ',' + result;
    remaining = remaining.slice(0, -2);
  }
  if (remaining.length > 0) {
    result = remaining + ',' + result;
  }
  return result;
}

/**
 * Format month string like "DECEMBER'25" to "December 2025"
 */
function formatMonth(monthStr) {
  if (!monthStr) return '';
  const match = monthStr.match(/(\w+)['\-]?(\d{2,4})/);
  if (match) {
    const monthName = match[1].charAt(0).toUpperCase() + match[1].slice(1).toLowerCase();
    let year = match[2];
    if (year.length === 2) year = '20' + year;
    return `${monthName} ${year}`;
  }
  return monthStr;
}

/**
 * Helper to safely extract a value from the dynamic csvData map
 */
function getCsvVal(employee, headerKey) {
  if (!employee || !employee.csvData) return '';
  return employee.csvData[headerKey] || '';
}

/**
 * Generate a payslip PDF for an employee
 * @param {Object} employee - Employee data from the database
 * @param {Object} client - Client data (name, address, bankName, payslipConfig)
 * @param {string} month - Month string
 * @returns {jsPDF} PDF document
 */
export function generatePayslipPDF(employee, client, month) {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
  });

  const pageWidth = doc.internal.pageSize.getWidth();
  const margin = 15;
  const contentWidth = pageWidth - 2 * margin;
  let y = 15;

  // === HEADER: Company Name ===
  doc.setFontSize(16);
  doc.setFont('helvetica', 'bold');
  doc.text(client.name || 'Company Name', pageWidth / 2, y, { align: 'center' });
  y += 8;

  // === Address Box ===
  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  const address = client.address || '';
  
  doc.setDrawColor(0);
  doc.setLineWidth(0.3);
  doc.rect(margin, y - 4, contentWidth, 8);
  doc.text(address, pageWidth / 2, y, { align: 'center' });
  y += 10;

  // === Payslip Title ===
  doc.setFontSize(11);
  doc.setFont('helvetica', 'bold');
  const formattedMonth = formatMonth(month);
  doc.text(`Payslip - ${formattedMonth}`, pageWidth / 2, y, { align: 'center' });
  y += 8;

  const config = client.payslipConfig || { details: [], earnings: [], deductions: [] };

  // === Employee Details Table ===
  const detailsData = [];
  let currRow = [];
  
  config.details.forEach((cfg) => {
    currRow.push(cfg.label, String(getCsvVal(employee, cfg.csvHeader)));
    if (currRow.length === 4) {
      detailsData.push([...currRow]);
      currRow.length = 0;
    }
  });
  // Pad the last row if uneven
  if (currRow.length > 0) {
    while (currRow.length < 4) currRow.push('');
    detailsData.push([...currRow]);
  }

  // If client has no config yet, fallback
  if (detailsData.length === 0) {
    detailsData.push(['Employee Name', employee.name || '', 'Employee ID', employee.empId || '']);
  }

  autoTable(doc, {
    startY: y,
    body: detailsData,
    theme: 'grid',
    styles: {
      fontSize: 8,
      cellPadding: 2,
      lineColor: [0, 0, 0],
      lineWidth: 0.3,
    },
    columnStyles: {
      0: { fontStyle: 'bold', cellWidth: contentWidth * 0.2 },
      1: { cellWidth: contentWidth * 0.3 },
      2: { fontStyle: 'bold', cellWidth: contentWidth * 0.2 },
      3: { cellWidth: contentWidth * 0.3 },
    },
    margin: { left: margin, right: margin },
    tableWidth: contentWidth,
  });

  y = doc.lastAutoTable.finalY + 5;

  // === Earnings & Deductions ===
  const earningsItems = [];
  let totalGross = 0;
  
  config.earnings.forEach((cfg) => {
    const rawVal = getCsvVal(employee, cfg.csvHeader);
    const numVal = Number(rawVal) || 0;
    totalGross += numVal;
    earningsItems.push([cfg.label, formatCurrency(numVal)]);
  });

  const deductionsItems = [];
  let totalDeductions = 0;
  
  config.deductions.forEach((cfg) => {
    const rawVal = getCsvVal(employee, cfg.csvHeader);
    const numVal = Number(rawVal) || 0;
    totalDeductions += numVal;
    deductionsItems.push([cfg.label, formatCurrency(numVal)]);
  });

  // Calculate Net Pay
  const netPay = employee.netPay || (totalGross - totalDeductions);

  // Pad the arrays so they have the same length side-by-side
  const maxRows = Math.max(earningsItems.length, deductionsItems.length);
  const combinedData = [];

  // Table header
  combinedData.push([
    { content: 'EARNINGS', styles: { fontStyle: 'bold', halign: 'center' } },
    { content: 'AMOUNT', styles: { fontStyle: 'bold', halign: 'center' } },
    { content: 'DEDUCTIONS', styles: { fontStyle: 'bold', halign: 'center' } },
    { content: 'AMOUNT', styles: { fontStyle: 'bold', halign: 'center' } },
  ]);

  // Table rows
  for (let i = 0; i < maxRows; i++) {
    const earnArr = earningsItems[i] || ['', ''];
    const dedArr = deductionsItems[i] || ['', ''];
    combinedData.push([
      earnArr[0],
      { content: earnArr[1], styles: { halign: 'right' } },
      dedArr[0],
      { content: dedArr[1], styles: { halign: 'right' } },
    ]);
  }

  // Totals Row
  combinedData.push([
    { content: 'Gross Salary', styles: { fontStyle: 'bold' } },
    { content: formatCurrency(totalGross), styles: { fontStyle: 'bold', halign: 'right' } },
    { content: 'Total Deduction', styles: { fontStyle: 'bold' } },
    { content: formatCurrency(totalDeductions), styles: { fontStyle: 'bold', halign: 'right' } },
  ]);

  // Net Pay Row
  combinedData.push([
    { content: 'Net Pay', colSpan: 3, styles: { fontStyle: 'bold', halign: 'right' } },
    { content: formatCurrency(netPay), styles: { fontStyle: 'bold', halign: 'right' } },
  ]);

  autoTable(doc, {
    startY: y,
    body: combinedData,
    theme: 'grid',
    styles: {
      fontSize: 8,
      cellPadding: 2,
      lineColor: [0, 0, 0],
      lineWidth: 0.3,
    },
    columnStyles: {
      0: { cellWidth: contentWidth * 0.25 },
      1: { cellWidth: contentWidth * 0.25 },
      2: { cellWidth: contentWidth * 0.25 },
      3: { cellWidth: contentWidth * 0.25 },
    },
    margin: { left: margin, right: margin },
    tableWidth: contentWidth,
  });

  y = doc.lastAutoTable.finalY + 5;

  // === Bank Particulars ===
  doc.setFontSize(10);
  doc.setFont('helvetica', 'bold');
  doc.text('Bank Particulars', margin, y + 4);
  y += 6;

  // We look for common bank fields in the CSV instead of hardcoding
  const accNum = getCsvVal(employee, 'Account number') || '';
  const ifsc = getCsvVal(employee, 'IFSC Code') || '';

  const bankData = [
    [
      { content: 'Bank Name:', styles: { fontStyle: 'bold' } },
      { content: client.bankName || '' },
      { content: 'Date of Payment:', styles: { fontStyle: 'bold' } },
      { content: '' } // Leave blank
    ],
    [
      { content: 'A/c No:', styles: { fontStyle: 'bold' } },
      { content: accNum },
      { content: 'Net Pay:', styles: { fontStyle: 'bold' } },
      { content: formatCurrency(netPay) }
    ],
    [
      { content: 'IFSC Code:', styles: { fontStyle: 'bold' } },
      { content: ifsc },
      { content: '', styles: { fontStyle: 'bold' } },
      { content: '' }
    ],
  ];

  autoTable(doc, {
    startY: y,
    body: bankData,
    theme: 'grid',
    styles: {
      fontSize: 8,
      cellPadding: 2,
      lineColor: [0, 0, 0],
      lineWidth: 0.3,
    },
    columnStyles: {
      0: { cellWidth: contentWidth * 0.2 },
      1: { cellWidth: contentWidth * 0.3 },
      2: { cellWidth: contentWidth * 0.2 },
      3: { cellWidth: contentWidth * 0.3 },
    },
    margin: { left: margin, right: margin },
    tableWidth: contentWidth,
  });

  y = doc.lastAutoTable.finalY + 15;

  // === Footer Signature ===
  doc.setFontSize(8);
  doc.setFont('helvetica', 'normal');
  doc.text('This is system generated Payslip signature not required.', margin, y);

  doc.setFontSize(10);
  doc.setFont('helvetica', 'bold');
  doc.text('Employer Signature', pageWidth - margin, y, { align: 'right' });

  return doc;
}

/**
 * Convenience function to generate and save PDF
 */
export function downloadPayslip(employee, client, month) {
  const doc = generatePayslipPDF(employee, client, month);
  const safeName = (employee.name || 'Employee').replace(/[^a-z0-9]/gi, '_');
  const safeMonth = month.replace(/[^a-z0-9]/gi, '_');
  doc.save(`Payslip_${safeMonth}_${safeName}.pdf`);
}
