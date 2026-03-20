import Papa from 'papaparse';

/**
 * Clean a numeric string by removing commas, spaces, and quotes
 */
export function cleanNumber(val) {
  if (!val && val !== 0) return 0;
  const cleaned = String(val).replace(/,/g, '').replace(/"/g, '').replace(/\s/g, '').replace(/₹/g, '');
  const num = parseFloat(cleaned);
  return isNaN(num) ? 0 : num;
}

function cleanString(val) {
  if (!val && val !== 0) return '';
  return String(val).replace(/"/g, '').trim();
}

/**
 * Detect if a row looks like a header row:
 * - Most cells are non-empty text (not purely numeric)
 * - At least 3 non-empty cells
 */
function isLikelyHeaderRow(row) {
  if (!row || row.length === 0) return false;
  const nonEmpty = row.filter(cell => cell && String(cell).trim() !== '');
  if (nonEmpty.length < 3) return false;

  let textCount = 0;
  for (const cell of nonEmpty) {
    const trimmed = String(cell).trim();
    // If it's not purely a number (with optional commas/dots), count as text
    if (!/^[\s\d,.\-]+$/.test(trimmed) || trimmed === '') {
      textCount++;
    }
  }

  // If more than half the non-empty cells are text, it's likely a header
  return textCount / nonEmpty.length > 0.5;
}

/**
 * Try to find a name-like column from the headers
 */
function findNameHeader(headers) {
  const candidates = ['Name', 'Employee Name', 'Emp Name', 'Employee_Name', 'Emp_Name', 'EmpName', 'EMPLOYEE NAME', 'NAME'];
  for (const candidate of candidates) {
    const normalizedCandidate = candidate.toLowerCase().replace(/[\s_]/g, '');
    for (const header of headers) {
      const normalizedHeader = header.toLowerCase().replace(/[\s_]/g, '');
      if (normalizedHeader === normalizedCandidate) return header;
    }
  }
  return null;
}

/**
 * Try to find a net pay column from the headers
 */
function findNetPayHeader(headers) {
  const candidates = ['NET PAY', 'Net Pay', 'Net_Pay', 'NETPAY', 'NetPay', 'Net Salary', 'Take Home', 'NET PAY_2'];
  for (const candidate of candidates) {
    const normalizedCandidate = candidate.toLowerCase().replace(/[\s_]/g, '');
    for (const header of headers) {
      const normalizedHeader = header.toLowerCase().replace(/[\s_]/g, '');
      if (normalizedHeader === normalizedCandidate) return header;
    }
  }
  return null;
}

/**
 * Parse CSV text into employee records with dynamic mapping.
 * Does NOT expect any fixed columns — works with whatever the CSV provides.
 * @param {string} csvText - Raw CSV file text
 * @returns {{ month: string, employees: Array, headers: string[] }} parsed data
 */
export function parsePayrollCSV(csvText) {
  const parsed = Papa.parse(csvText, {
    header: false,
    skipEmptyLines: true,
  });

  const lines = parsed.data;
  if (!lines || lines.length === 0) {
    throw new Error('CSV file is empty or invalid.');
  }

  // Try to find month string from early rows (look for "FOR MONTH" pattern)
  let month = '';
  let monthRowIndex = -1;
  for (let i = 0; i < Math.min(5, lines.length); i++) {
    const rowText = lines[i].join(' ');
    const monthMatch = rowText.match(/FOR\s+(\w+['\-]?\d*)/i);
    if (monthMatch) {
      month = monthMatch[1];
      monthRowIndex = i;
      break;
    }
  }

  // Find header row — the first row that looks like a header
  let headerIndex = -1;
  for (let i = 0; i < Math.min(10, lines.length); i++) {
    if (i === monthRowIndex) continue; // skip the month row
    if (isLikelyHeaderRow(lines[i])) {
      headerIndex = i;
      break;
    }
  }

  // Fallback: if no header detected, use row 0 (or row 1 if row 0 was month)
  if (headerIndex === -1) {
    headerIndex = monthRowIndex === 0 ? 1 : 0;
    if (headerIndex >= lines.length) {
      throw new Error('CSV does not have enough rows to detect headers.');
    }
  }

  // Process headers and deduplicate
  const rawHeaders = lines[headerIndex];
  const seenHeaders = {};
  const cleanHeaders = rawHeaders.map((h, i) => {
    let base = h ? String(h).trim().replace(/\./g, '_') : '';
    if (!base) base = `Column_${i}`;

    if (seenHeaders[base]) {
      let suffix = 2;
      while (seenHeaders[`${base}_${suffix}`]) suffix++;
      base = `${base}_${suffix}`;
    }
    seenHeaders[base] = true;
    return base;
  });

  // Find the name and net pay headers
  const nameHeader = findNameHeader(cleanHeaders);
  const netPayHeader = findNetPayHeader(cleanHeaders);

  const employees = [];

  // Parse data rows
  for (let i = headerIndex + 1; i < lines.length; i++) {
    const row = lines[i];
    if (!row || row.length === 0) continue;

    // Skip rows where all cells are empty
    const hasContent = row.some(cell => cell && String(cell).trim() !== '');
    if (!hasContent) continue;

    const rowMap = {};
    for (let j = 0; j < cleanHeaders.length; j++) {
      let val = row[j] || '';

      if (typeof val === 'string' && /^[\s\d,.\-]+$/.test(val) && val.trim() !== '') {
        const num = cleanNumber(val);
        if (!isNaN(num)) val = num;
      }

      rowMap[cleanHeaders[j]] = val;
    }

    // Try to get serial number from first column
    const slNo = cleanNumber(row[0]) || (employees.length + 1);

    // Try to get employee name
    let empName = '';
    if (nameHeader) {
      empName = cleanString(rowMap[nameHeader]);
    }
    // If no name found, skip rows that look like totals/summary
    // (a row with mostly numbers and no identifiable text in early columns)
    if (!empName) {
      // Try to find any text-like value in the first few columns as a name
      for (let j = 0; j < Math.min(5, cleanHeaders.length); j++) {
        const cellVal = row[j] || '';
        const trimmed = String(cellVal).trim();
        if (trimmed && !/^[\s\d,.\-]*$/.test(trimmed) && trimmed.length > 1) {
          empName = cleanString(trimmed);
          break;
        }
      }
    }

    // Skip rows that have no identifiable text (likely total/summary rows)
    if (!empName) continue;

    // Try common ID headers
    let empId = '';
    const idCandidates = ['Emp ID', 'Emp_ID', 'EmpID', 'Employee ID', 'Employee_ID', 'ID', 'SL No', 'Sl No', 'SL_No', 'Sl_No'];
    for (const candidate of idCandidates) {
      if (rowMap[candidate] !== undefined && rowMap[candidate] !== '') {
        empId = cleanString(String(rowMap[candidate]));
        break;
      }
    }

    const netPay = netPayHeader ? cleanNumber(rowMap[netPayHeader]) : 0;

    const employee = {
      slNo: slNo,
      empId: empId,
      name: empName,
      netPay: netPay,
      csvData: rowMap,
    };

    employees.push(employee);
  }

  if (employees.length === 0) {
    throw new Error('No employee data rows found in the CSV.');
  }

  return { month, employees, headers: cleanHeaders };
}

/**
 * Auto-configure payslip fields from CSV headers.
 * Returns { payslipConfig, amountColumns } with best-guess categorization.
 */
export function autoConfigurePayslip(headers) {
  const details = [];
  const earnings = [];
  const deductions = [];
  const amountColumns = [];

  // Keyword patterns for categorization
  const detailPatterns = [
    { pattern: /^name$/i, label: 'Employee Name' },
    { pattern: /emp.*name|employee.*name/i, label: 'Employee Name' },
    { pattern: /emp.*id|employee.*id/i, label: 'Employee ID' },
    { pattern: /design/i, label: 'Designation' },
    { pattern: /doj|date.*join|joining/i, label: 'Date of Joining' },
    { pattern: /dept|department/i, label: 'Department' },
    { pattern: /uan/i, label: 'UAN NO' },
    { pattern: /esic|esi.*no|esi.*num/i, label: 'ESIC NO' },
    { pattern: /pan/i, label: 'PAN' },
    { pattern: /location|branch|site/i, label: 'Location' },
    { pattern: /bank.*name/i, label: 'Bank Name' },
    { pattern: /acc.*num|account/i, label: 'A/C Number' },
    { pattern: /ifsc/i, label: 'IFSC Code' },
  ];

  const earningPatterns = [
    { pattern: /basic.*da|basic\+da/i, label: 'Basic + DA' },
    { pattern: /^basic$/i, label: 'Basic' },
    { pattern: /^da$/i, label: 'DA' },
    { pattern: /^hra$/i, label: 'HRA' },
    { pattern: /conv|transport/i, label: 'Transport Allowance' },
    { pattern: /special.*allow/i, label: 'Special Allowance' },
    { pattern: /food.*allow/i, label: 'Food Allowance' },
    { pattern: /medical/i, label: 'Medical Allowance' },
    { pattern: /wash/i, label: 'Washing Allowance' },
    { pattern: /^ot$|overtime/i, label: 'Overtime' },
    { pattern: /bonus/i, label: 'Bonus' },
    { pattern: /incentive/i, label: 'Incentive' },
    { pattern: /arrear/i, label: 'Arrears' },
    { pattern: /other.*pay|other.*earn/i, label: 'Other Pay' },
    { pattern: /allow/i, label: 'Allowance' },
  ];

  const deductionPatterns = [
    { pattern: /^p[\._\s]*f|provident|pf$/i, label: 'Provident Fund' },
    { pattern: /^e[\._\s]*s[\._\s]*i|^esi$/i, label: 'ESI' },
    { pattern: /prof.*tax|^pt$/i, label: 'Professional Tax' },
    { pattern: /^tds$|tax.*ded|income.*tax/i, label: 'TDS' },
    { pattern: /adv|advance/i, label: 'Advance' },
    { pattern: /loan/i, label: 'Loan' },
    { pattern: /other.*ded/i, label: 'Other Deduction' },
    { pattern: /canteen/i, label: 'Canteen' },
    { pattern: /uniform/i, label: 'Uniform' },
  ];

  // Fields that are numeric but NOT amounts (just counts)
  const nonAmountPatterns = [
    /attend|days.*work|working.*day|^days$/i,
    /lop|loss.*pay|absent|leave/i,
    /^sl[\s_]*no|^s[\s_]*no/i,
  ];

  // Skip patterns — columns we don't want in any config
  const skipPatterns = [
    /^column_\d+$/i,
    /^sl[\s_]*no$|^s[\s_]*no$/i,
    /^$/, // empty
  ];

  // Gross/Net patterns — these are totals, not individual items
  const totalPatterns = [
    /gross/i,
    /net.*pay|net.*sal|take.*home/i,
    /total/i,
  ];

  const used = new Set();

  for (const header of headers) {
    const normalized = header.replace(/_/g, ' ').replace(/\s+/g, ' ').trim();

    // Skip empty or column_N headers
    if (skipPatterns.some(p => p.test(normalized))) continue;

    // Skip total/gross/net columns from config (they're calculated)
    if (totalPatterns.some(p => p.test(normalized))) {
      // But still mark as amount columns for table display
      amountColumns.push(header);
      continue;
    }

    // Check details
    let matched = false;
    for (const { pattern, label } of detailPatterns) {
      if (pattern.test(normalized) && !used.has(label)) {
        details.push({ label, csvHeader: header });
        used.add(label);
        matched = true;
        break;
      }
    }
    if (matched) continue;

    // Check deductions (before earnings to avoid "ESI" matching earning patterns)
    for (const { pattern, label } of deductionPatterns) {
      if (pattern.test(normalized) && !used.has(label + '_ded')) {
        deductions.push({ label, csvHeader: header });
        amountColumns.push(header);
        used.add(label + '_ded');
        matched = true;
        break;
      }
    }
    if (matched) continue;

    // Check earnings
    for (const { pattern, label } of earningPatterns) {
      if (pattern.test(normalized) && !used.has(label + '_earn')) {
        earnings.push({ label, csvHeader: header });
        amountColumns.push(header);
        used.add(label + '_earn');
        matched = true;
        break;
      }
    }
    if (matched) continue;

    // Check if it's a non-amount number field (don't mark as amount)
    if (nonAmountPatterns.some(p => p.test(normalized))) {
      // Not an amount — skip adding to amountColumns
      continue;
    }
  }

  return {
    payslipConfig: { details, earnings, deductions },
    amountColumns,
  };
}
