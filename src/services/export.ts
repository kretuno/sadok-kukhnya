import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import 'jspdf-autotable';

export function exportToExcel(filename: string, sheetName: string, headers: string[], dataRows: any[][]) {
  const wsData = [headers, ...dataRows];
  const worksheet = XLSX.utils.aoa_to_sheet(wsData);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, sheetName);
  XLSX.writeFile(workbook, `${filename}.xlsx`);
}

export function exportToPDF(title: string, headers: string[], dataRows: any[][]) {
  const doc = new jsPDF();
  
  doc.setFontSize(16);
  doc.text(title, 14, 15);
  doc.setFontSize(10);
  doc.text(`Дата формирования: ${new Date().toLocaleDateString('ru-RU')}`, 14, 22);

  (doc as any).autoTable({
    head: [headers],
    body: dataRows,
    startY: 28,
    theme: 'grid',
    styles: { fontSize: 8, cellPadding: 2 },
    headStyles: { fillColor: [37, 99, 235], textColor: [255, 255, 255] }
  });

  doc.save(`${title.toLowerCase().replace(/\s+/g, '_')}.pdf`);
}
