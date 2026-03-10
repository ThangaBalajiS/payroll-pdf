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
 * Parse CSV text into employee records with dynamic mapping
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

  // Find month string from first row
  let month = '';
  const firstLineText = lines[0].join(' ');
  const monthMatch = firstLineText.match(/FOR\s+(\w+['\-]?\d*)/i);
  if (monthMatch) {
    month = monthMatch[1];
  }

  // Find header row (contains "SL No" or "Emp ID")
  let headerIndex = -1;
  for (let i = 0; i < Math.min(10, lines.length); i++) {
    const rowText = lines[i].join(' ');
    if (rowText.includes('SL No') || rowText.includes('Sl No') || rowText.includes('Emp ID')) {
      headerIndex = i;
      break;
    }
  }

  if (headerIndex === -1) {
    throw new Error('Could not find header row in CSV. Expected a row containing "SL No" or "Emp ID".');
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

  const employees = [];

  // Parse data rows
  for (let i = headerIndex + 1; i < lines.length; i++) {
    const row = lines[i];
    if (!row || row.length === 0) continue;

    const rowMap = {};
    for (let j = 0; j < cleanHeaders.length; j++) {
      let val = row[j] || '';

      if (typeof val === 'string' && /^[\s\d,.-]+$/.test(val) && val.trim() !== '') {
        const num = cleanNumber(val);
        if (!isNaN(num)) val = num;
      }

      rowMap[cleanHeaders[j]] = val;
    }

    const slNoRaw = rowMap['SL No'] || rowMap['Sl No'] || row[0];
    const slNo = cleanNumber(slNoRaw);
    if (!slNo || slNo === 0) continue;

    const empName = cleanString(rowMap['Name']);
    if (!empName) continue;

    const employee = {
      slNo: slNo,
      empId: cleanString(rowMap['Emp ID']),
      name: empName,
      netPay: cleanNumber(rowMap['NET PAY'] || rowMap['Net Pay'] || rowMap['NET PAY_2']),
      csvData: rowMap,
    };

    employees.push(employee);
  }

  return { month, employees, headers: cleanHeaders };
}
