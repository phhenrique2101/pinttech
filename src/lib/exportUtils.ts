import * as XLSX from 'xlsx';

/**
 * Exports data to an Excel (.xlsx) file with clean headers and auto-adjusted column widths.
 */
export function exportJsonToExcel(
  data: Record<string, any>[],
  fileName: string,
  sheetName = 'Relatório'
) {
  if (!data || data.length === 0) {
    alert('Nenhum dado para exportar.');
    return;
  }

  // Create worksheet from json
  const ws = XLSX.utils.json_to_sheet(data);

  // Auto-calculate column widths
  const keys = Object.keys(data[0] || {});
  const colWidths = keys.map((key) => {
    let maxLen = key.length;
    data.forEach((row) => {
      const val = row[key];
      const strVal = val !== undefined && val !== null ? String(val) : '';
      if (strVal.length > maxLen) {
        maxLen = strVal.length;
      }
    });
    return { wch: Math.min(Math.max(maxLen + 3, 12), 50) };
  });
  ws['!cols'] = colWidths;

  // Create workbook and append sheet
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, sheetName.slice(0, 30));

  // Sanitize filename and save
  const cleanFileName = fileName.endsWith('.xlsx') ? fileName : `${fileName}.xlsx`;
  XLSX.writeFile(wb, cleanFileName);
}
